import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc,
  setDoc,
  getDoc,
  doc,
  serverTimestamp,
  Timestamp,
  limit,
  orderBy,
  increment,
  writeBatch,
  deleteField,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { logAdminAction } from './moderationService';
import { ProofRequirement, ProofReview, ProofStatus, ProofCheck, AIAnalysis } from '../types/proof';
import { analyzeSubmissionImage } from './geminiService';
import { guardedCall } from './guardedService';
import { getGlobalConfig } from './configService';
import { getServerDate } from './timeService';
import { MOCK_TRIPS } from '../constants';
import { Entry } from '../types/game';
import { calculateSubmissionPoints } from '../logic/scoringLogic';
import { promoteEntryToBallotCandidate } from './voteService';
import { applyFieldTypeModifier } from '../logic/challengeLogic';
import { awardPoints } from './scoringService';
import { addMemory } from './memoryService';
import { authenticatedFetch } from '../lib/api';
import { getActiveWeeklyBonus, hasUserEarnedWeeklyBonusThisWeek, calculateWeeklyBonusReward } from './weeklyBonusService';
import { getCatalystForWeek, evaluateProofForCatalyst, awardCatalystRewardsIfEligible } from './weeklyCatalystService';
import { calculateAverageHash, calculateHammingDistance } from '../utils/hashUtils';

const REQUIREMENTS_COLLECTION = 'proofRequirements';
const REVIEWS_COLLECTION = 'proofReviews';
const ENTRIES_COLLECTION = 'entries';
const CHECKS_COLLECTION = 'proofChecks';

/**
 * Generate a SHA-256 hash of a string
 */
async function hashString(str: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generates a cache key based on the inputs for a proof check
 */
async function generateCacheKey(
  challengeId: string, 
  userId: string, 
  base64Image: string | undefined, 
  note: string, 
  level: string,
  requirement: ProofRequirement | null
): Promise<{ key: string; inputs: ProofCheck['inputs'] }> {
  const imageHash = base64Image ? await hashString(base64Image) : 'no-image';
  const reqVersion = requirement?.version || 'v1';
  const requirementsHash = await hashString(JSON.stringify(requirement?.objectKeywords || []) + "_" + reqVersion);
  
  const rawKey = `${challengeId}_${userId}_${imageHash}_${note}_${level}_${requirementsHash}`;
  const key = await hashString(rawKey);
  
  return {
    key,
    inputs: {
      imageHash,
      fieldNote: note,
      level,
      requirementsHash
    }
  };
}

/**
 * Checks if a user has exceeded their daily proof check quota.
 */
async function checkDailyProofQuota(userId: string): Promise<boolean> {
  const config = getGlobalConfig();
  const today = getServerDate();
  today.setHours(0, 0, 0, 0);

  const q = query(
    collection(db, REVIEWS_COLLECTION),
    where('userId', '==', userId),
    where('reviewedAt', '>=', today),
    limit(config.maxDailyProofChecksPerUser)
  );

  const snapshot = await getDocs(q);
  return snapshot.size >= config.maxDailyProofChecksPerUser;
}

export async function getProofRequirement(challengeId: string): Promise<ProofRequirement | null> {
  try {
    const q = query(
      collection(db, REQUIREMENTS_COLLECTION),
      where('challengeId', '==', challengeId),
      limit(1)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as ProofRequirement;
  } catch (error) {
    console.error('Error fetching proof requirement:', error);
    return null;
  }
}

export async function evaluateProof(
    userId: string, 
    challengeId: string, 
    challengeTitle: string,
    challengeInstructions: string,
    entryData: any, 
    base64Image?: string,
    options: { bypassCache?: boolean } = {}
): Promise<ProofReview> {
  const config = getGlobalConfig();
  
  if (!config.proofChecksEnabled) {
    throw new Error('PROOF_CHECKS_DISABLED: The Evidence Department is currently offline for maintenance.');
  }

  return guardedCall(`proof_${userId}`, async () => {
    // 1. Quota Enforcement
    const quotaExceeded = await checkDailyProofQuota(userId);
    if (quotaExceeded) {
      throw new Error(`DAILY_LIMIT: You have reached your limit of ${config.maxDailyProofChecksPerUser} proof checks for today.`);
    }

    const requirement = await getProofRequirement(challengeId);
    
    // 2. Cache Lookup
    const { key: cacheKey, inputs } = await generateCacheKey(
      challengeId, 
      userId, 
      base64Image, 
      entryData.fieldNote || (entryData as any).note || '', 
      entryData.selectedLevel || (entryData as any).level || 'Standard',
      requirement
    );

    if (!options.bypassCache) {
      try {
        const cacheDoc = await getDoc(doc(db, CHECKS_COLLECTION, cacheKey));
        if (cacheDoc.exists()) {
          const cachedData = cacheDoc.data() as ProofCheck;
          console.log('[PROOF_CHECK] Using cached result for key:', cacheKey);
          
          // Reconstruct ProofReview from cache
          const review: any = {
            entryId: entryData.id || 'pending',
            userId,
            challengeId,
            status: cachedData.status,
            confidenceScore: cachedData.confidenceScore,
            missingRequirements: cachedData.missingRequirements,
            reviewNotes: (cachedData.imageAnalysis?.reason || "Bureau review confirmed") + " (AUTHENTICATED FROM CACHE)",
            reviewedAt: getServerDate().toISOString()
          };

          return { id: 'cached_' + cacheKey, ...review } as ProofReview;
        }
      } catch (error) {
        console.warn('[PROOF_CHECK] Cache lookup failed, proceeding to AI:', error);
      }
    }

    const missingRequirements: string[] = [];
    let confidenceScore = 100;
    let status: ProofStatus = 'approved';
    let reviewNotes = 'Evidence processed. Proceed with archival.';
    let aiAnalysisResult: AIAnalysis | null = null;

    // A. Multi-Signal Trust System Fields
    let perceptualHash = '';
    if (base64Image) {
      try {
        perceptualHash = await calculateAverageHash(base64Image);
      } catch (e) {
        console.warn('[PROOF_CHECK] Could not calculate perceptual hash:', e);
      }
    }

    const imageHash = inputs.imageHash || '';
    let duplicateWarning: 'exact_duplicate' | 'near_duplicate' | null = null;
    let duplicateReusedDesc: string | null = null;
    
    // Duplicate detection (exactly & near-duplicate checks)
    if (imageHash && imageHash !== 'no-image') {
      try {
        const qExact = query(collection(db, 'entries'), where('imageHash', '==', imageHash), limit(5));
        const snapExact = await getDocs(qExact);
        const otherExact = snapExact.docs.filter(d => d.id !== entryData.id && d.data().userId !== userId);
        if (otherExact.length > 0) {
          duplicateWarning = 'exact_duplicate';
          duplicateReusedDesc = `Image matches exactly with a submission by User: ${otherExact[0].data().displayName || otherExact[0].data().userId}`;
        } else {
          const otherExactSameUser = snapExact.docs.filter(d => d.id !== entryData.id && d.data().userId === userId);
          if (otherExactSameUser.length > 0) {
            duplicateWarning = 'exact_duplicate';
            duplicateReusedDesc = `Self-duplicate: You already submitted this exact image for mission: ${otherExactSameUser[0].data().challengeTitle || otherExactSameUser[0].data().tripId}`;
          }
        }
      } catch (err) {
        console.warn('[PROOF_CHECK] Exact duplicate query failed:', err);
      }
    }

    if (!duplicateWarning && perceptualHash) {
      try {
        const qAll = query(collection(db, 'entries'), limit(100)); // check last 100 entries for near duplicates
        const snapAll = await getDocs(qAll);
        for (const d of snapAll.docs) {
          if (d.id === entryData.id) continue;
          const otherPId = d.data().perceptualHash;
          if (otherPId) {
            const dist = calculateHammingDistance(perceptualHash, otherPId);
            if (dist <= 4) {
              duplicateWarning = 'near_duplicate';
              const sameUser = d.data().userId === userId;
              duplicateReusedDesc = `Near-duplicate detected (similarity distance ${dist}/64) with entry ${d.id}${sameUser ? ' by yourself' : ` by user ${d.data().displayName || d.data().userId}`}`;
              break;
            }
          }
        }
      } catch (err) {
        console.warn('[PROOF_CHECK] Near duplicate check failed:', err);
      }
    }

    // 1. Basic Policy Checks
    if (requirement) {
      // Photo Check
      const photoCount = entryData.proofImage || base64Image ? 1 : 0;
      if (photoCount < (requirement.minimumPhotoCount || 1)) {
        missingRequirements.push('Minimum photo count not met.');
        confidenceScore -= 40;
      }

      // Field Note Check
      if (requirement.requiresFieldNote && (!entryData.note && !entryData.fieldNote || (entryData.fieldNote || entryData.note || '').trim().length < 5)) {
        missingRequirements.push('Explicit field note required.');
        confidenceScore -= 30;
      }

      // Receipts Mode: Anti-Loophole strictness
      if (entryData.receiptsMode && (!entryData.note && !entryData.fieldNote || (entryData.fieldNote || entryData.note || '').trim().length < 50)) {
         missingRequirements.push('Receipts Mode Active: Evidence insufficient. Field journal needs more detail (min 50 chars).');
         confidenceScore -= 50;
      }

      // Time Window Check
      if (requirement.requiresTimeWindow && requirement.startTime && requirement.endTime) {
        const now = getServerDate();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        
        const [startH, startM] = requirement.startTime.split(':').map(Number);
        const [endH, endM] = requirement.endTime.split(':').map(Number);
        
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;
  
        const isWithinBatch = startMinutes <= endMinutes 
          ? (currentMinutes >= startMinutes && currentMinutes <= endMinutes)
          : (currentMinutes >= startMinutes || currentMinutes <= endMinutes);
  
        if (!isWithinBatch) {
          missingRequirements.push(`Outside of mission time window (${requirement.startTime} - ${requirement.endTime}).`);
          confidenceScore -= 20;
        }
      }
    }

    // Challenge check variables
    const challengeCode = entryData.proofChallengeCode || null;
    const challengeType = entryData.proofChallengeType || null;
    const challengeText = entryData.proofChallengeText || null;
    const challengeInstructionsAndTarget = challengeText ? `${challengeInstructions}. Trevor's side quest: make sure "${challengeText}" is clearly visible.` : challengeInstructions;

    // 2. AI Analysis (Gemini) - If image is provided and required
    if (base64Image && (requirement?.requiresObjectDetection || true)) {
      const analysis = await analyzeSubmissionImage(
        base64Image,
        challengeTitle,
        challengeInstructionsAndTarget,
        requirement?.objectKeywords || []
      );

      aiAnalysisResult = analysis;
      confidenceScore = Math.min(confidenceScore, analysis.confidence);
      
      if (!analysis.detectedSubject && (requirement?.requiresObjectDetection)) {
        missingRequirements.push(`Subject detection failure: ${analysis.missingItems?.join(', ') || 'unknown'}`);
        confidenceScore -= 30;
      }

      if (analysis.confidence < 50) {
        missingRequirements.push("Image clarity or relevance is below mission standards.");
      }

      reviewNotes = analysis.reason || 'Evidence processed by AI.';
    }

    // Receipt challenge result
    let receiptChallengeResult: 'matched_in_note' | 'matched_by_ai' | 'missing' | 'unverified' = 'unverified';
    const fieldJournalNote = (entryData.fieldNote || entryData.note || '').trim();

    if (challengeCode) {
      if (challengeType === 'code' && fieldJournalNote) {
        if (fieldJournalNote.toUpperCase().includes(challengeCode.toUpperCase())) {
          receiptChallengeResult = 'matched_in_note';
        }
      }
      
      if (receiptChallengeResult !== 'matched_in_note' && aiAnalysisResult) {
        const lowerReason = (aiAnalysisResult.reason || '').toLowerCase();
        const lowerTitle = (aiAnalysisResult.displayTitle || '').toLowerCase();
        const lowerDetail = (aiAnalysisResult.displayDetail || '').toLowerCase();
        const codeClean = challengeText ? challengeText.toLowerCase() : challengeCode.toLowerCase();
        
        const isMatchedByAi = lowerReason.includes(codeClean) || 
                              lowerTitle.includes(codeClean) || 
                              lowerDetail.includes(codeClean) || 
                              aiAnalysisResult.detectedItems?.some(it => it.toLowerCase().includes(codeClean));
                              
        if (isMatchedByAi) {
          receiptChallengeResult = 'matched_by_ai';
        } else {
          receiptChallengeResult = 'missing';
        }
      }
    }

    // Compute Multi-Signal Scores
    let proofTrustScore = 50;
    let aiRiskScore = 20;
    const riskReasons: string[] = [];

    // 1. Capture source check
    const source = entryData.uploadSource || 'camera';
    if (source === 'camera') {
      aiRiskScore -= 10;
      proofTrustScore += 20;
    } else {
      aiRiskScore += 25;
      proofTrustScore -= 15;
      riskReasons.push('Media supplied from local gallery instead of live in-app camera capture');
    }

    // Screenshot detection
    const originalFileName = entryData.originalFileName || '';
    const isScreenshot = originalFileName.toLowerCase().includes('screenshot') || 
                         (entryData.software && entryData.software.toLowerCase().includes('screenshot')) ||
                         (entryData.editingSoftware && entryData.editingSoftware.toLowerCase().includes('screenshot'));
    if (isScreenshot) {
      aiRiskScore += 45;
      proofTrustScore -= 30;
      riskReasons.push('Image identified as screenshot or design export instead of raw capture');
    }

    // 2. Metadata checks
    const metadataStatus = entryData.metadataStatus || 'unverified';
    if (metadataStatus === 'missing' && source !== 'camera') {
      aiRiskScore += 15;
      proofTrustScore -= 15;
      riskReasons.push('EXIF image headers are completely missing (common with screenshots/edited assets)');
    } else if (metadataStatus === 'verified') {
      proofTrustScore += 10;
    }

    // Make and Model
    const make = entryData.make || entryData.cameraMake || null;
    const model = entryData.model || entryData.cameraModel || null;
    if (make || model) {
      proofTrustScore += 15;
      aiRiskScore -= 10;
    } else if (source !== 'camera') {
      aiRiskScore += 10;
      riskReasons.push('Missing camera capture hardware metrics (unknown camera model)');
    }

    // Timestamps
    const photoTakenAt = entryData.photoTakenAt || null;
    if (photoTakenAt) {
      proofTrustScore += 10;
    }

    // Forbidden Editing software check
    const software = entryData.software || entryData.editingSoftware || null;
    if (software) {
      const lowerSoft = software.toLowerCase();
      const forbiddenTools = ["photoshop", "lightroom", "canva", "picsart", "fotor", "snapseed", "gimp", "paint", "creator"];
      if (forbiddenTools.some(tool => lowerSoft.includes(tool))) {
        aiRiskScore += 45;
        proofTrustScore -= 35;
        riskReasons.push(`Image processed with forbidden software: ${software}`);
      }
    }

    // Drawn temporal check
    let missionDrawnAt: Date | null = null;
    try {
      const drawnCardRef = doc(db, 'users', userId, 'drawnMissionCards', challengeId);
      const drawnCardSnap = await getDoc(drawnCardRef);
      if (drawnCardSnap.exists()) {
        const drawnData = drawnCardSnap.data();
        if (drawnData.drawnAt) {
          missionDrawnAt = drawnData.drawnAt?.toDate ? drawnData.drawnAt.toDate() : new Date(drawnData.drawnAt);
        }
      }
    } catch (err) {
      console.warn('[PROOF_CHECK] Could not fetch drawn card timing:', err);
    }

    if (photoTakenAt && missionDrawnAt) {
      const takenDate = new Date(photoTakenAt);
      const diffMs = takenDate.getTime() - missionDrawnAt.getTime();
      if (diffMs < -5 * 60 * 1000) {
        const diffHrs = Math.abs(diffMs) / (1000 * 60 * 60);
        aiRiskScore += 50;
        proofTrustScore -= 40;
        riskReasons.push(`Chronological anomaly: Image taken ${diffHrs.toFixed(1)} hours before drawing this objective card`);
      }
    }

    // Challenge check contribution
    if (challengeCode) {
      if (receiptChallengeResult === 'matched_in_note') {
        aiRiskScore -= 20;
        proofTrustScore += 25;
      } else if (receiptChallengeResult === 'matched_by_ai') {
        aiRiskScore -= 25;
        proofTrustScore += 30;
      } else {
        aiRiskScore += 25;
        proofTrustScore -= 20;
        riskReasons.push(`Challenge verification failed: could not verify target code/gesture "${challengeText || challengeCode}"`);
      }
    }

    // Duplicate detection contribution
    if (duplicateWarning === 'exact_duplicate') {
      aiRiskScore = 100;
      proofTrustScore = 0;
      riskReasons.push('Critical Match: Identical visual asset reused in other submission');
    } else if (duplicateWarning === 'near_duplicate') {
      aiRiskScore = Math.max(aiRiskScore, 90);
      proofTrustScore = Math.min(proofTrustScore, 10);
      riskReasons.push('Near-duplicate asset reuse flag: photo shares extremely high similarity metrics');
    }

    // Context match contribution
    const matchScore = aiAnalysisResult?.missionMatchScore !== undefined ? aiAnalysisResult.missionMatchScore : 100;
    if (matchScore < 50) {
      aiRiskScore += 40;
      proofTrustScore -= 30;
      riskReasons.push(`Goal relevance mismatch: Subject relevance matches only ${matchScore}% of target criteria`);
    } else if (matchScore >= 80) {
      aiRiskScore -= 15;
      proofTrustScore += 15;
    }

    // Clamp
    aiRiskScore = Math.min(100, Math.max(0, aiRiskScore));
    proofTrustScore = Math.min(100, Math.max(0, proofTrustScore));

    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (aiRiskScore >= 70 || duplicateWarning || software) {
      riskLevel = 'high';
    } else if (aiRiskScore >= 40) {
      riskLevel = 'medium';
    }

    const metadataSummary = `Captured: ${photoTakenAt ? new Date(photoTakenAt).toLocaleString() : 'Live Stream'} | Handset Make: ${make || 'Unknown'} | Hardware Model: ${model || 'Unknown'} | Software Engine: ${software || 'Stock Camera Binary'}`;

    // 3. Status Determination
    // Heartbeat check: AI model error or manual review required should NOT fail the proof
    if (aiAnalysisResult?.status === 'error' || aiAnalysisResult?.status === 'manual_review_required') {
      status = 'pending_review';
      reviewNotes = aiAnalysisResult.displayDetail || 'AI analysis skipped or failed. Manual verification scheduled.';
    } else if (missingRequirements.length > 0 || riskLevel === 'high') {
      status = 'needs_more_proof';
      if (confidenceScore < 30 || duplicateWarning) {
        status = 'rejected';
      }
    }

    const review: any = {
      entryId: entryData.id || 'pending_review',
      userId,
      challengeId,
      status: status as ProofStatus,
      confidenceScore,
      missingRequirements,
      findingType: entryData.findingType || entryData.selectedCategory || null,
      reviewNotes: missingRequirements.length > 0 && !base64Image
        ? `The Evidence Department requires more documentation: ${missingRequirements.join(' ')}` 
        : reviewNotes,
      reviewedAt: getServerDate().toISOString(),
      
      // Verification pipeline signals added for UI & backend persistence
      proofTrustScore,
      aiRiskScore,
      riskLevel,
      riskReasons,
      metadataSummary,
      duplicateWarning,
      duplicateReusedDesc,
      receiptChallengeResult,
      imageHash,
      perceptualHash,
      cameraMake: make,
      cameraModel: model,
      editingSoftware: software,
      missionMatchScore: matchScore,

      // Nested schema fields requested by user (Requirement: Sync permanent FB Storage URL)
      deckId: entryData.deckId || 'starter-signals',
      photoUrl: entryData.photoUrl || entryData.imageUrl || entryData.proofImage || '',
      imageUrl: entryData.imageUrl || entryData.photoUrl || entryData.proofImage || '',
      storagePath: entryData.storagePath || entryData.imageStoragePath || entryData.photoStoragePath || entryData.proofImageRef || null,
      fieldNote: (entryData.fieldNote || entryData.note || '').trim(),
      missionDrawnAt: missionDrawnAt ? missionDrawnAt.toISOString() : (entryData.missionDrawnAt || null),
      capturedAt: photoTakenAt ? new Date(photoTakenAt).toISOString() : (entryData.capturedAt || null),
      uploadedAt: entryData.submittedAt || new Date().toISOString(),
      captureSource: source === 'camera' ? 'camera' : 'gallery',
      proofChallengeCode: challengeCode || null,
      proofChallengeInstruction: challengeInstructions || null,
      proofChallengeConfirmed: (receiptChallengeResult === 'matched_in_note' || receiptChallengeResult === 'matched_by_ai'),
      metadata: {
        hasExif: metadataStatus === 'verified',
        cameraMake: make,
        cameraModel: model,
        createdAt: photoTakenAt ? new Date(photoTakenAt).toISOString() : null,
        editingSoftware: software,
        gpsPresent: (entryData.latitude != null && entryData.longitude != null) || (entryData.gpsPresent === true),
        width: entryData.width || 3024,
        height: entryData.height || 4032
      },
      verification: {
        aiRiskScore,
        proofTrustScore,
        riskLevel,
        riskReasons,
        duplicateStatus: duplicateWarning || 'none',
        imageHash: imageHash || 'no-image',
        perceptualHash: perceptualHash || '',
        missionMatchScore: matchScore
      },
      xpAwarded: entryData.xpAwarded || false
    };

    // 4. Persistence & Caching
    try {
      // Save Review (legacy/stat log)
      const docRef = await addDoc(collection(db, REVIEWS_COLLECTION), {
        ...review,
        reviewedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Save Cache Entry if AI was used
      if (aiAnalysisResult) {
        const checkRecord: ProofCheck = {
          cacheKey,
          submissionId: entryData.id || 'pending',
          challengeId,
          userId,
          imageAnalysis: aiAnalysisResult,
          confidenceScore,
          status,
          missingRequirements,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          inputs
        };

        await setDoc(doc(db, CHECKS_COLLECTION, cacheKey), checkRecord);
      }

      return { id: docRef.id, ...review } as ProofReview;
    } catch (error) {
      console.error('Error saving proof results:', error);
      return { id: 'error', ...review } as ProofReview;
    }
  }, { cooldownMs: 5000 }); // 5s cooldown per user proof check (beta-tuned)
}

/**
 * Ensures points are awarded exactly once for an entry submission.
 */
export async function adminOverrideReview(
  reviewId: string,
  entryId: string,
  newStatus: ProofStatus,
  notes: string,
) {
  const action = newStatus === 'approved'
    ? 'approve'
    : newStatus === 'needs_more_proof'
      ? 'request_info'
      : 'reject';
  const response = await authenticatedFetch('/api/admin/proof-review/action', {
    method: 'POST',
    body: JSON.stringify({ entryId, reviewId, action, notes, metadata: {} }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || payload.message || 'REVIEW_ACTION_FAILED');
  }
  return payload;
}

export async function toggleLikeEntry(entryId: string, uid: string, isLiked: boolean) {
    console.log(`[Like_Protocol] Toggling like for Entry: ${entryId}, User: ${uid}, CurrentIsLiked: ${isLiked}`);

    try {
        const response = await authenticatedFetch('/api/community/hype', {
            method: 'POST',
            body: JSON.stringify({
                entryId,
                liked: !isLiked
            })
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || 'FAILED_TO_UPDATE_HYPE');
        }
        const result = await response.json();
        console.log(`[Hype_Success] Entry ${entryId} hype=${result.liked} count=${result.likeCount}`);
        return result;
    } catch (err: any) {
        console.error(`[Hype_Error] Entry ${entryId}: ${err.code || err.message}`);
        throw err;
    }
}

/**
 * CHECK IF LIKED: Verify if user has already liked an entry.
 */
export async function checkIfLiked(entryId: string, uid: string): Promise<boolean> {
    try {
        const likeId = `${entryId}_${uid}`;
        const snap = await getDoc(doc(db, 'likes', likeId));
        return snap.exists();
    } catch (err) {
        console.warn("[proofService] checkIfLiked failed:", err);
        return false;
    }
}
