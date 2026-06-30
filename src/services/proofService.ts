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
export async function awardSubmissionPointsOnce(
  entryId: string,
  userName: string,
  scoreEvents: any[],
  ftBonus: number,
  ftText: string,
  userId: string,
  crewId?: string,
  userAvatar?: any,
  tripId?: string
): Promise<boolean> {
  // Fetch current entry from Firestore for canonical status check
  const entryRef = doc(db, 'entries', entryId);
  const snap = await getDoc(entryRef);
  if (!snap.exists()) {
    console.error(`[awardSubmissionPointsOnce] Entry ${entryId} does not exist.`);
    return false;
  }
  
  const currentEntry = snap.data();
  const hasAlreadyAwarded = 
    (currentEntry.pointsAwarded !== undefined && typeof currentEntry.pointsAwarded === 'number' && currentEntry.pointsAwarded > 0) ||
    (currentEntry.finalPointsAwarded !== undefined && typeof currentEntry.finalPointsAwarded === 'number' && currentEntry.finalPointsAwarded > 0) ||
    currentEntry.status === 'approved' ||
    currentEntry.reviewStatus === 'approved';

  if (hasAlreadyAwarded) {
    console.log(`[awardSubmissionPointsOnce] Idempotency safety triggered for entryId: ${entryId}. Points already awarded.`);
    return false;
  }

  // Award points
  for (const event of scoreEvents) {
    try {
      console.log(`[awardSubmissionPointsOnce] Awarding ${event.points} pts to ${userId} for ${event.type}`);
      await awardPoints(userId, userName, event.points, event.type as any, {
        ...event,
        crewId,
        userAvatar
      });
    } catch (awardErr: any) {
      console.warn(`[awardSubmissionPointsOnce_Error] (Non-fatal) ${awardErr.code || awardErr.message}`);
    }
  }

  // Field Type Modifier
  if (ftBonus > 0) {
    try {
      console.log(`[awardSubmissionPointsOnce] Awarding FT Perk ${ftBonus} to ${userId}`);
      await awardPoints(userId, userName, ftBonus, 'field_type_perk', {
        entryId,
        tripId,
        description: ftText,
        crewId,
        userAvatar
      });
    } catch (awardErr: any) {
      console.warn(`[awardSubmissionPointsOnce_Error_FT] (Non-fatal) ${awardErr.code || awardErr.message}`);
    }
  }

  return true;
}

export async function adminOverrideReview(reviewId: string, entryId: string, newStatus: ProofStatus, notes: string) {
    const adminUid = auth.currentUser?.uid;
    const adminEmail = auth.currentUser?.email;
    
    console.log(`[Admin_Override_Protocol] [INITIATED]`, {
        adminUid,
        adminEmail,
        reviewId,
        entryId,
        targetStatus: newStatus,
        timestamp: new Date().toISOString()
    });

    try {
        console.log(`[proofService] adminOverrideReview started. reviewId: ${reviewId}, entryId: ${entryId}, newStatus: ${newStatus}`);
        const ref = doc(db, REVIEWS_COLLECTION, reviewId);
        let entryRef = doc(db, ENTRIES_COLLECTION, entryId);
        
        let entrySnap = await getDoc(entryRef);
        
        // Setup a tracking variable to see if lookup has resolved
        let entryFound = entrySnap.exists();
        if (entryFound) {
            console.log(`[proofService] Direct entry lookup succeeded for entryId: ${entryId}`);
            if (import.meta.env.DEV) {
                console.log(`[proofService] [DIRECT_LOOKUP_SUCCESS] Direct entryId lookup succeeded immediately for entryId: ${entryId}`);
            }
        }
        
        let resolvedUserId: string | null = null;
        let resolvedChallengeId: string | null = null;

        // Try to get review doc (either from proofReviews or proofChecks) to resolve userId and challengeId
        const reviewSnap = await getDoc(ref);
        if (reviewSnap.exists()) {
            const data = reviewSnap.data();
            resolvedUserId = data?.userId || null;
            resolvedChallengeId = data?.challengeId || null;
            console.log(`[proofService] Resolved from review document: user=${resolvedUserId}, challenge=${resolvedChallengeId}`);
            if (data?.entryId && data.entryId !== 'pending' && data.entryId !== entryId && !entryFound) {
                // If the review has a real entryId, let's try it!
                const directRef = doc(db, ENTRIES_COLLECTION, data.entryId);
                const directSnap = await getDoc(directRef);
                if (directSnap.exists()) {
                    entrySnap = directSnap;
                    entryId = data.entryId;
                    entryRef = directSnap.ref;
                    entryFound = true;
                    console.log(`[proofService] Successfully located entry via reviewDoc entryId: ${entryId}`);
                    if (import.meta.env.DEV) {
                        console.log(`[proofService] [DIRECT_LOOKUP_SUCCESS] Direct entryId lookup succeeded via review document entryId mapping: ${entryId}`);
                    }
                }
            }
        }

        // If not found, check cached / proofChecks
        if (!entryFound && (!resolvedUserId || !resolvedChallengeId)) {
            let cacheKey = reviewId;
            if (reviewId.startsWith('cached_')) {
                cacheKey = reviewId.substring('cached_'.length);
            }
            const checkRef = doc(db, CHECKS_COLLECTION, cacheKey);
            const checkSnap = await getDoc(checkRef);
            if (checkSnap.exists()) {
                const data = checkSnap.data();
                resolvedUserId = data?.userId || null;
                resolvedChallengeId = data?.challengeId || null;
                console.log(`[proofService] Resolved from cached checks: user=${resolvedUserId}, challenge=${resolvedChallengeId}`);
                if (data?.submissionId && data.submissionId !== 'pending' && data.submissionId !== entryId && !entryFound) {
                    const directRef = doc(db, ENTRIES_COLLECTION, data.submissionId);
                    const directSnap = await getDoc(directRef);
                    if (directSnap.exists()) {
                        entrySnap = directSnap;
                        entryId = data.submissionId;
                        entryRef = directSnap.ref;
                        entryFound = true;
                        console.log(`[proofService] Successfully located entry via proofCheck submissionId: ${entryId}`);
                        if (import.meta.env.DEV) {
                            console.log(`[proofService] [DIRECT_LOOKUP_SUCCESS] Direct entryId lookup succeeded via proofCheck submissionId mapping: ${entryId}`);
                        }
                    }
                }
            }
        }

        if (!entryFound) {
            if (import.meta.env.DEV) {
                console.log(`[proofService] [FALLBACK_LOOKUP_USED] Direct entryId lookup failed, activating fallback lookup stages...`);
            }
        }

        const { query, collection, where, limit, getDocs } = await import('firebase/firestore');

        // STAGE 1.5: Query entry where proofCheckId == reviewId or matches stripping/adding cached_ prefix
        if (!entryFound) {
            const searchIds = [reviewId];
            if (reviewId.startsWith('cached_')) {
                searchIds.push(reviewId.substring('cached_'.length));
            } else {
                searchIds.push('cached_' + reviewId);
            }
            console.log(`[proofService] Querying entries by proofCheckId variants: ${searchIds.join(', ')}`);
            for (const sId of searchIds) {
                if (entryFound) break;
                const qProof = query(
                    collection(db, ENTRIES_COLLECTION),
                    where('proofCheckId', '==', sId),
                    limit(1)
                );
                const snapProof = await getDocs(qProof);
                if (!snapProof.empty) {
                    entrySnap = snapProof.docs[0];
                    entryId = entrySnap.id;
                    entryRef = entrySnap.ref;
                    entryFound = true;
                    console.log(`[proofService] Located entry via proofCheckId == ${sId}: ${entryId}`);
                }
            }
        }

        // STAGE 2: Try querying entries via proofCheckId (1:1 direct link matching review ID)
        if (!entryFound) {
            let searchReviewId = reviewId;
            if (reviewId.startsWith('cached_')) {
                searchReviewId = reviewId.substring('cached_'.length);
            }
            console.log(`[proofService] Entry not resolved yet. Querying entries where proofCheckId == '${searchReviewId}'...`);
            const qProof = query(
                collection(db, ENTRIES_COLLECTION),
                where('proofCheckId', '==', searchReviewId),
                limit(1)
            );
            const snapProof = await getDocs(qProof);
            if (!snapProof.empty) {
                entrySnap = snapProof.docs[0];
                entryId = entrySnap.id;
                entryRef = entrySnap.ref;
                entryFound = true;
                console.log(`[proofService] Located entry via proofCheckId == searchReviewId: ${entryId}`);
            }
        }

        // STAGE 3: If we extracted a userId and challengeId but haven't found the entry yet, try querying entries collection
        if (!entryFound && resolvedUserId && resolvedChallengeId) {
            console.log(`[proofService] Found metadata: user=${resolvedUserId}, challenge=${resolvedChallengeId}. Querying entries collection...`);
            
            // Query by tripId first (this is the standard field name for field trips)
            const q1 = query(
                collection(db, ENTRIES_COLLECTION),
                where('userId', '==', resolvedUserId),
                where('tripId', '==', resolvedChallengeId),
                limit(1)
            );
            const snap1 = await getDocs(q1);
            if (!snap1.empty) {
                entrySnap = snap1.docs[0];
                entryId = entrySnap.id;
                entryRef = entrySnap.ref;
                entryFound = true;
                console.log(`[proofService] Entry successfully located by tripId: ${entryId}`);
            } else {
                // Try missionId fallback
                const q2 = query(
                    collection(db, ENTRIES_COLLECTION),
                    where('userId', '==', resolvedUserId),
                    where('missionId', '==', resolvedChallengeId),
                    limit(1)
                );
                const snap2 = await getDocs(q2);
                if (!snap2.empty) {
                    entrySnap = snap2.docs[0];
                    entryId = entrySnap.id;
                    entryRef = entrySnap.ref;
                    entryFound = true;
                    console.log(`[proofService] Entry successfully located by missionId: ${entryId}`);
                } else {
                    // Try challengeId fallback
                    const q3 = query(
                        collection(db, ENTRIES_COLLECTION),
                        where('userId', '==', resolvedUserId),
                        where('challengeId', '==', resolvedChallengeId),
                        limit(1)
                    );
                    const snap3 = await getDocs(q3);
                    if (!snap3.empty) {
                        entrySnap = snap3.docs[0];
                        entryId = entrySnap.id;
                        entryRef = snap3.docs[0].ref;
                        entryFound = true;
                        console.log(`[proofService] Entry successfully located by challengeId: ${entryId}`);
                    }
                }
            }
        }

        // STAGE 4: Robust User Entries scan fallback (handles casing mismatches or missing fields)
        if (!entryFound && resolvedUserId) {
            console.log(`[proofService] Entry not found yet. Querying all user's entries count for '${resolvedUserId}' as fallback...`);
            const qUser = query(
                collection(db, ENTRIES_COLLECTION),
                where('userId', '==', resolvedUserId)
            );
            const userSnap = await getDocs(qUser);
            if (!userSnap.empty) {
                // Find by proofCheckId first in memory
                let matchedDoc = userSnap.docs.find(d => {
                    const data = d.data();
                    const pcId = data.proofCheckId;
                    return pcId === reviewId || 
                           (reviewId.startsWith('cached_') && pcId === reviewId.substring('cached_'.length)) ||
                           (pcId && pcId.startsWith('cached_') && pcId.substring('cached_'.length) === reviewId);
                });
                
                // If not found, find by case-insensitive challengeId matching
                if (!matchedDoc && resolvedChallengeId) {
                    const cleanChallengeId = resolvedChallengeId.toLowerCase().trim();
                    matchedDoc = userSnap.docs.find(d => {
                        const data = d.data();
                        const tId = (data.tripId || '').toLowerCase().trim();
                        const cId = (data.challengeId || '').toLowerCase().trim();
                        const mId = (data.missionId || '').toLowerCase().trim();
                        return tId === cleanChallengeId || cId === cleanChallengeId || mId === cleanChallengeId;
                    });
                }

                // If still not found, find by pending/submitted statuses
                if (!matchedDoc) {
                    matchedDoc = userSnap.docs.find(d => {
                        const status = d.data().status || '';
                        return ['pending', 'submitted', 'under_field_check', 'needs_review', 'retry-submitted', 'pending_upload'].includes(status);
                    });
                }

                // If still not found, pick the single most recent entry
                if (!matchedDoc) {
                    const sorted = [...userSnap.docs].sort((a, b) => {
                        const ta = a.data().createdAt?.seconds || a.data().submittedAt?.seconds || 0;
                        const tb = b.data().createdAt?.seconds || b.data().submittedAt?.seconds || 0;
                        return tb - ta;
                    });
                    matchedDoc = sorted[0];
                }
                
                if (matchedDoc) {
                    entrySnap = matchedDoc;
                    entryId = entrySnap.id;
                    entryRef = entrySnap.ref;
                    entryFound = true;
                    console.log(`[proofService] Located entry in user documents fallback match: ${entryId}`);
                }
            }
        }

        // STAGE 4.5: whole-collection scanning for pending entry of matching trip
        if (!entryFound && resolvedChallengeId) {
            const cleanChallengeId = resolvedChallengeId.toLowerCase().trim();
            console.log(`[proofService] Querying entries by challengeId casing for unresolved manual action: ${cleanChallengeId}`);
            const qAll = query(collection(db, ENTRIES_COLLECTION));
            const allSnap = await getDocs(qAll);
            const matchedDoc = allSnap.docs.find(d => {
                const data = d.data();
                const status = data.status || '';
                const isPending = ['pending', 'submitted', 'under_field_check', 'needs_review', 'retry-submitted', 'pending_upload'].includes(status);
                if (!isPending) return false;
                
                const tId = (data.tripId || '').toLowerCase().trim();
                const cId = (data.challengeId || '').toLowerCase().trim();
                const mId = (data.missionId || '').toLowerCase().trim();
                return tId === cleanChallengeId || cId === cleanChallengeId || mId === cleanChallengeId;
            });
            if (matchedDoc) {
                entrySnap = matchedDoc;
                entryId = entrySnap.id;
                entryRef = entrySnap.ref;
                entryFound = true;
                console.log(`[proofService] Located entry in whole collection scan for matching trip: ${entryId}`);
            }
        }

        // STAGE 4.7: whole-collection scanning for ANY pending entries as absolute last resort
        if (!entryFound) {
            console.log(`[proofService] Absolute last-resort scan for any pending entries in entries collection`);
            const qAll = query(collection(db, ENTRIES_COLLECTION));
            const allSnap = await getDocs(qAll);
            const pendingDocs = allSnap.docs.filter(d => {
                const status = d.data().status || '';
                return ['pending', 'submitted', 'under_field_check', 'needs_review', 'retry-submitted', 'pending_upload'].includes(status);
            });
            if (pendingDocs.length > 0) {
                const sortedPending = pendingDocs.sort((a, b) => {
                    const ta = a.data().createdAt?.seconds || a.data().submittedAt?.seconds || 0;
                    const tb = b.data().createdAt?.seconds || b.data().submittedAt?.seconds || 0;
                    return tb - ta;
                });
                entrySnap = sortedPending[0];
                entryId = entrySnap.id;
                entryRef = entrySnap.ref;
                entryFound = true;
                console.log(`[proofService] Located entry via absolute last-resort pending entries scan: ${entryId}`);
            }
        }

        // Final legacy lookup attempt just in case entry snaps are still empty
        if (!entryFound) {
           console.warn(`[proofService] Standard lookup and metadata resolution failed. Trying fallback 1 (reviewId as entryId).`);
           const altRef = doc(db, ENTRIES_COLLECTION, reviewId);
           const altSnap = await getDoc(altRef);
           if (altSnap.exists()) {
             entrySnap = altSnap;
             entryId = reviewId;
             entryRef = altSnap.ref;
             entryFound = true;
           }
        }

        if (!entryFound && resolvedUserId && resolvedChallengeId) {
            console.log(`[proofService] Self-healing fallback: Creating entry placeholder for user: ${resolvedUserId}, challenge: ${resolvedChallengeId}`);
            const placeholderId = entryId && entryId !== 'pending' ? entryId : `fallback_${resolvedUserId}_${resolvedChallengeId}`;
            const placeholderRef = doc(db, ENTRIES_COLLECTION, placeholderId);
            const placeholderData = {
                userId: resolvedUserId,
                userName: 'Agent',
                tripId: resolvedChallengeId,
                tripTitle: 'Field Trip Mission',
                status: 'pending',
                pointsAwarded: 0,
                createdAt: serverTimestamp(),
                submittedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                proofImage: 'https://images.unsplash.com/photo-1541339907198-e08756ebafe3?auto=format&fit=crop&q=80&w=800',
                fieldNote: notes || 'Autogenerated backup entry.'
            };
            await setDoc(placeholderRef, placeholderData, { merge: true });
            const freshSnap = await getDoc(placeholderRef);
            if (freshSnap.exists()) {
                entrySnap = freshSnap;
                entryId = placeholderId;
                entryRef = placeholderRef;
                entryFound = true;
                console.log(`[proofService] Self-healing complete. Re-routed to placeholder entry: ${placeholderId}`);
            }
        }

        if (!entryFound || !entrySnap || !entrySnap.exists()) {
            if (import.meta.env.DEV) {
                console.error(`[proofService] [FALLBACK_FAILED] Fallback lookup chain failed to locate or self-heal entryId: ${entryId}, reviewId: ${reviewId}. Throwing 'Entry not found for audit.'`);
            }
            throw new Error("Entry not found for audit.");
        }

        const entry = { id: entrySnap.id, ...entrySnap.data() } as Entry;
        const isApproving = newStatus === 'approved';
        const isRejected = newStatus === 'rejected';
        const isNeedsMoreProof = newStatus === 'needs_more_proof' || (newStatus as string) === 'needs-more-proof' || (newStatus as string) === 'needsMoreProof';
        const isPendingReview = newStatus === 'pending_review' || (newStatus as string) === 'pending' || (newStatus as string) === 'pendingReview' || (newStatus as string) === 'submitted_pending_review' || (newStatus as string) === 'resubmitted_pending_review';
        const scoringTotal = Number((entry as any).scoring?.totalXpAwarded);
        const totalPointsToAward = (Number.isFinite(scoringTotal) && scoringTotal >= 0 ? scoringTotal : 0) ||
          entry.estimatedPoints ||
          entry.pointsAwarded ||
          entry.awardedPoints ||
          100;
        
        const updateStatusValue = isApproving ? 'approved' : isRejected ? 'rejected' : isNeedsMoreProof ? 'needs_more_proof' : 'pending_review';

        const reviewUpdateData: any = {
            status: updateStatusValue,
            reviewStatus: updateStatusValue,
            reviewNotes: notes,
            reviewedAt: serverTimestamp()
        };

        try {
          if (reviewSnap.exists()) {
            const reviewData = reviewSnap.data();
            if (reviewData?.entryId === 'pending' || !reviewData?.entryId) {
               console.log(`[proofService] Self-healing reviewDoc's pending entryId to: ${entryId}`);
               reviewUpdateData.entryId = entryId;
            }
            console.log(`[Admin_Override_Step_1] Attempting write to proofReviews/${reviewId}`, reviewUpdateData);
            await updateDoc(ref, reviewUpdateData);
            console.log(`[Admin_Override_Step_1_Success] proofReviews/${reviewId} updated.`);
          } else {
            // Create placeholder review for manual dashboard approvals
            console.log(`[Admin_Override_Step_1_New] Attempting setDoc to proofReviews/${reviewId}`, reviewUpdateData);
            await setDoc(ref, {
              ...reviewUpdateData,
              userId: entry.userId || entry.uid,
              challengeId: entry.missionId || entry.challengeId || entry.tripId,
              entryId: entryId,
              confidenceScore: 100,
              manualOverride: true
            });
            console.log(`[Admin_Override_Step_1_New_Success] proofReviews/${reviewId} created.`);
          }
        } catch (ruleErr: any) {
          console.error(`[Admin_Override_Auth_Error_Step_1] Write failed to proofReviews/${reviewId}. Err: ${ruleErr.code || ruleErr.message}. Admin: ${auth.currentUser?.uid}`);
          throw ruleErr;
        }

        // Audit Log
        if (auth.currentUser) {
            await logAdminAction(
                auth.currentUser.uid,
                reviewId,
                'proofReview',
                'override_status',
                {
                    entryId,
                    targetUserId: entry.userId || entry.uid,
                    previousStatus: entrySnap.data()?.status,
                    newStatus: updateStatusValue,
                    notes
                }
            );
        }

        // Update entry status with canonical mirrors
        const entryUpdate: any = {
            status: updateStatusValue,
            reviewStatus: updateStatusValue,
            awardedXP: isApproving ? (totalPointsToAward || 0) : 0,
            awardedPoints: isApproving ? (totalPointsToAward || 0) : 0, // Legacy
            pointsAwarded: isApproving ? (totalPointsToAward || 0) : 0, // Legacy
            adminNotes: notes,
            reviewNotes: notes,
            reviewNote: notes,
            rejectionReason: isRejected ? notes : null,
            reviewedBy: auth.currentUser?.uid || 'admin-system', // Legacy
            reviewerId: auth.currentUser?.uid || 'admin-system', // Canonical
            reviewedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            showInCommunityFeed: isApproving,
            isPublic: isApproving,
            communityVisible: isApproving,
            approvedAt: isApproving ? serverTimestamp() : null
        };

        if (isApproving) {
            console.log(`[PROOF_APPROVED] entryId: ${entryId}, userId: ${entry.userId || entry.uid}, awardedXP: ${totalPointsToAward || 0}`);
        }

        if (isRejected) {
            const now = getServerDate();
            const purgeDate = getServerDate();
            purgeDate.setDate(now.getDate() + 14);
            
            entryUpdate.rejectedAt = serverTimestamp();
            entryUpdate.purgeEligibleAt = Timestamp.fromDate(purgeDate);
            entryUpdate.retryAvailable = true;
            entryUpdate.retryPointMultiplier = 0.5;
        }

        if (!isApproving) {
            const userRef = doc(db, 'users', entry.userId || entry.uid);
            const tripIdClean = (entry.missionId || entry.challengeId || entry.tripId || '').toLowerCase().trim();
            if (tripIdClean) {
                const updates: any = {
                    submittedChallengeIds: arrayRemove(tripIdClean),
                    submittedPendingChallengeIds: arrayRemove(tripIdClean),
                    updatedAt: serverTimestamp()
                };

                if (updateStatusValue === 'rejected') {
                    updates.rejectedChallengeIds = arrayUnion(tripIdClean);
                    updates.retryableChallengeIds = arrayUnion(tripIdClean);
                    updates.needsMoreProofChallengeIds = arrayRemove(tripIdClean);
                    updates.completedChallengeIds = arrayRemove(tripIdClean);
                } else if (updateStatusValue === 'needs_more_proof') {
                    updates.needsMoreProofChallengeIds = arrayUnion(tripIdClean);
                    updates.rejectedChallengeIds = arrayRemove(tripIdClean);
                    updates.completedChallengeIds = arrayRemove(tripIdClean);
                } else if (updateStatusValue === 'pending_review') {
                    updates.submittedChallengeIds = arrayUnion(tripIdClean);
                    updates.submittedPendingChallengeIds = arrayUnion(tripIdClean);
                    updates.rejectedChallengeIds = arrayRemove(tripIdClean);
                    updates.needsMoreProofChallengeIds = arrayRemove(tripIdClean);
                    updates.completedChallengeIds = arrayRemove(tripIdClean);
                }

                await updateDoc(userRef, updates);
                if (import.meta.env.DEV) {
                    console.log(`[Admin] [PENDING_STATE_CLEARED] Removed/Restored challenge ${tripIdClean} on non-approval to state: ${updateStatusValue}`);
                }
            }
        }

        // SCORING LOGIC for CORE-05
        let isIdempotencySkipped = false;
        if (isApproving) {
            const isAlreadyAwarded = entrySnap.data()?.xpAwarded === true;
            const isAlreadyApprovedStatus = entry.status === 'approved';
            
            if (isAlreadyAwarded || isAlreadyApprovedStatus) {
                isIdempotencySkipped = true;
                console.log(`[proofService] Idempotency safety triggered. Skipping points/XP awarding for entryId: ${entryId}`);
            }
        }

        const batch = writeBatch(db);

        if (isApproving && !isIdempotencySkipped) {
            const rawMissionId = (entry.missionId || entry.challengeId || entry.tripId || '').toLowerCase().trim();
            const trip = MOCK_TRIPS.find(t => t.id.toLowerCase() === rawMissionId);
            if (trip) {
                const userId = entry.userId || entry.uid;
                if (!userId) {
                    console.error("[proofService] CRITICAL: Attempted to award points but no userId/uid found in entry", entry.id);
                    return;
                }
                const userRef = doc(db, 'users', userId);
                const userSnap = await getDoc(userRef);
                const userData = userSnap.exists() ? userSnap.data() : null;
                const fieldType = userData?.fieldType || null;
                const userName = userData?.name || 'Agent';

                // Check for duplicate completion reward attempts (non-repeatable challenges)
                const completedInProfile = new Set<string>(
                    (userData?.completedChallengeIds || []).map((id: string) => id.toLowerCase())
                );
                const isRepeatable = trip.repeatable || (trip as any).isRepeatableTemplate;
                
                if (completedInProfile.has(trip.id.toLowerCase()) && !isRepeatable) {
                    console.log(`[proofService] Duplicate prevented: Challenge ${trip.id} is already completed.`);
                    
                    // Mark this specific submission as approved, but award 0 points to prevent duplicate payout
                    entryUpdate.pointsAwarded = 0;
                    entryUpdate.xpAwarded = true; // Mark as awarded (0 points)
                    batch.update(entryRef, {
                        ...entryUpdate,
                        adminNotes: notes + " (Duplicate completed challenge prevented double awarding)"
                    });
                    await batch.commit();
                    return;
                }

                const config = getGlobalConfig() as any;
                const effectsEnabled = config?.featureFlags?.fieldTypeEffectsEnabled ?? true;

                let tripToPass = trip;
                let entryToPass = entry;

                if (entry.fastFindAttempt && entry.fastFindAttempt.mode === 'fastFind') {
                    const resolvedIntensity = (() => {
                        const intensity = entry.fastFindAttempt.selectedIntensity;
                        if (!intensity) return 'Standard';
                        const lower = intensity.toLowerCase();
                        if (lower === 'standard') return 'Standard';
                        if (lower === 'advanced') return 'Advanced';
                        if (lower === 'certified') return 'Certified';
                        return intensity;
                    })();

                    tripToPass = {
                        ...trip,
                        baseXP: entry.fastFindAttempt.lockedBasePoints,
                        basePoints: entry.fastFindAttempt.lockedBasePoints,
                        levels: undefined as any
                    };
                    entryToPass = {
                        ...entry,
                        selectedLevel: resolvedIntensity
                    };
                }

                const activeWeekNum = trip.weekNumber || 1;
                const seasonId = entry.seasonId || (trip as any).seasonId || 'dev-season-2026';
                const catalyst = await getCatalystForWeek(seasonId, activeWeekNum);

                const weeklyBonus = getActiveWeeklyBonus(activeWeekNum);
                const bonusAlreadyClaimed = await hasUserEarnedWeeklyBonusThisWeek(entry.userId, activeWeekNum, weeklyBonus.id);
                const isOncePerWeek = weeklyBonus?.rule?.oncePerWeek ?? false;
                const skipWeeklyBonus = isOncePerWeek && bonusAlreadyClaimed;

                const scoring = calculateSubmissionPoints(
                    entryToPass,
                    tripToPass,
                    {
                        isFirstSubmission: (userData?.approvedEntriesCount || 0) === 0,
                        daysLate: 0,
                        hintUsed: !!entry.hintUsed,
                        weekNumber: activeWeekNum,
                        skipWeeklyBonus,
                        catalyst: catalyst || undefined
                    }
                );

                const ftResult = applyFieldTypeModifier(tripToPass, fieldType, effectsEnabled, !!entry.crewId);
                let ftBonus = ftResult?.bonus || 0;
                const ftText = ftResult?.text || '';

                let totalPointsToAward = scoring.totalPoints;
                if (entry.isRetry || entry.retryPointMultiplier) {
                    const multiplier = entry.retryPointMultiplier || 0.5;
                    totalPointsToAward = Math.round(totalPointsToAward * multiplier);
                    ftBonus = Math.round(ftBonus * multiplier);
                    
                    if (scoring.scoreEvents && scoring.scoreEvents.length > 0) {
                        for (const evt of scoring.scoreEvents) {
                            evt.points = Math.round(evt.points * multiplier);
                        }
                    }
                }

                const finalTotalXP = totalPointsToAward + ftBonus;

                const rewardDetails = calculateWeeklyBonusReward(
                    weeklyBonus.id,
                    entryToPass,
                    tripToPass,
                    scoring.scoreEvents.find(e => e.type === 'trip_approved')?.points || 100,
                    (userData?.approvedEntriesCount || 0) === 0
                );
                const bonusApplied = rewardDetails.applied && !skipWeeklyBonus;

                entryUpdate.pointsAwarded = totalPointsToAward;
                entryUpdate.awardedXP = finalTotalXP;
                entryUpdate.awardedPoints = finalTotalXP;
                entryUpdate.xpAwarded = true;
                entryUpdate.isRetry = entry.isRetry || false;
                entryUpdate.retryPointMultiplier = entry.retryPointMultiplier || null;
                entryUpdate.retryAwarded = true;

                // Catalyst Meta
                entryUpdate.catalystId = catalyst ? catalyst.id : null;
                entryUpdate.catalystTitle = catalyst ? catalyst.title : null;
                entryUpdate.catalystType = catalyst ? catalyst.catalystType : null;
                const evResult = catalyst ? evaluateProofForCatalyst(entry, catalyst, {
                    challengeTags: tripToPass.tags || [],
                    challengeTitle: tripToPass.title || '',
                    challengeDescription: tripToPass.description || ''
                }) : { qualified: false, reason: 'No active catalyst' };
                entryUpdate.catalystQualified = evResult.qualified;
                entryUpdate.catalystMultiplier = evResult.qualified ? catalyst!.multiplier : 1.0;
                entryUpdate.catalystReason = evResult.reason;

                // Weekly Bonus Meta
                entryUpdate.weeklyBonusId = weeklyBonus.id;
                entryUpdate.weeklyBonusTitle = weeklyBonus.title;
                entryUpdate.weeklyBonusApplied = bonusApplied;
                entryUpdate.weeklyBonusPoints = bonusApplied ? rewardDetails.points : 0;
                entryUpdate.weeklyBonusXP = bonusApplied ? rewardDetails.xp : 0;
                entryUpdate.weeklyBonusTokens = bonusApplied ? rewardDetails.tokens : 0;
                entryUpdate.weeklyBonusMultiplier = bonusApplied ? rewardDetails.multiplier : 1.0;
                entryUpdate.finalPointsAwarded = totalPointsToAward;
                entryUpdate.finalXPAwarded = finalTotalXP;
                entryUpdate.finalTokensAwarded = bonusApplied ? rewardDetails.tokens : 0;
                entryUpdate.awardedAt = serverTimestamp();
                entryUpdate.weekNumber = activeWeekNum;
                entryUpdate.seasonId = seasonId;

                // Create scoreEvents for every scoring event
                const scoreEventId = doc(collection(db, 'scoreEvents')).id;
                entryUpdate.scoreEventId = scoreEventId;
                
                // 1. Primary Reward (Mission Approved)
                const mainScoreEventRef = doc(db, 'scoreEvents', scoreEventId);
                batch.set(mainScoreEventRef, {
                    userId,
                    userName,
                    proofId: reviewId,
                    entryId: entryId,
                    missionId: trip.id,
                    challengeId: trip.id,
                    deckId: entry.deckId || 'starter-signals',
                    type: 'mission_approved',
                    points: finalTotalXP,
                    xp: finalTotalXP,
                    description: `Bureau HQ Approval: ${trip.title}`,
                    createdAt: serverTimestamp()
                });

                // 2. Breakdown Events (Extra detail for history)
                if (scoring.scoreEvents && scoring.scoreEvents.length > 0) {
                    for (const subEvent of scoring.scoreEvents) {
                        const subRef = doc(collection(db, 'scoreEvents'));
                        batch.set(subRef, {
                            userId,
                            userName,
                            entryId,
                            missionId: trip.id,
                            type: subEvent.type,
                            points: subEvent.points,
                            xp: subEvent.points,
                            description: subEvent.description,
                            createdAt: serverTimestamp()
                        });
                    }
                }

                // 3. Field Type Perk
                if (ftBonus > 0) {
                    const ftRef = doc(collection(db, 'scoreEvents'));
                    batch.set(ftRef, {
                        userId,
                        userName,
                        entryId,
                        missionId: trip.id,
                        type: 'field_type_perk',
                        points: ftBonus,
                        xp: ftBonus,
                        description: ftText,
                        createdAt: serverTimestamp()
                    });
                }

                // Update User Profile with new requested logic
                const userUpdates: any = {
                    xp: increment(finalTotalXP),
                    totalXP: increment(finalTotalXP), // Requested specific field
                    seasonXP: increment(finalTotalXP), // Requested specific field
                    approvedMissionCount: increment(1), // Requested specific field
                    approvedEntriesCount: increment(1), // Legacy consistency
                    lastApprovedAt: serverTimestamp(),
                    fieldTokens: increment(bonusApplied ? rewardDetails.tokens : 0),
                    completedChallengeIds: arrayUnion(trip.id.toLowerCase()),
                    submittedChallengeIds: arrayRemove(trip.id.toLowerCase()),
                    submittedPendingChallengeIds: arrayRemove(trip.id.toLowerCase()),
                    rejectedChallengeIds: arrayRemove(trip.id.toLowerCase()),
                    needsMoreProofChallengeIds: arrayRemove(trip.id.toLowerCase()),
                    updatedAt: serverTimestamp()
                };

                const deckIdLower = (entry.deckId || '').toLowerCase().trim();
                if (deckIdLower === 'starter' || deckIdLower === 'starter-signals') {
                    userUpdates.starterApprovedCount = increment(1);
                }

                // Reward & Badge Unlocks (Stickers/Badges)
                const currentStickers = new Set<string>(userData?.unlockedRewards?.stickers || []);
                const currentBadges = new Set<string>(userData?.unlockedRewards?.badges || []);
                const newStickers: string[] = [];
                const newBadges: string[] = [];

                if (!currentBadges.has('first-approved-mission')) newBadges.push('first-approved-mission');
                if (!currentStickers.has('heatwave-starter')) newStickers.push('heatwave-starter');
                if (entry.fieldNote && entry.fieldNote.trim().length >= 5 && !currentStickers.has('first-field-note')) {
                    newStickers.push('first-field-note');
                }

                // catalyst rewards
                if (catalyst && evResult.qualified) {
                    if (catalyst.stickerRewardId && !currentStickers.has(catalyst.stickerRewardId)) {
                        newStickers.push(catalyst.stickerRewardId);
                    }
                    if (catalyst.badgeRewardId && !currentBadges.has(catalyst.badgeRewardId)) {
                        newBadges.push(catalyst.badgeRewardId);
                    }
                }

                if (newStickers.length > 0) userUpdates['unlockedRewards.stickers'] = arrayUnion(...newStickers);
                if (newBadges.length > 0) userUpdates['unlockedRewards.badges'] = arrayUnion(...newBadges);

                // Active Trip Check
                const activeTripMatch = userData?.activeTrip && (
                    (typeof userData.activeTrip === 'string' && userData.activeTrip.toLowerCase() === trip.id.toLowerCase()) ||
                    (typeof userData.activeTrip === 'object' && userData.activeTrip.id?.toString().toLowerCase() === trip.id.toLowerCase())
                );
                if (activeTripMatch) userUpdates.activeTrip = null;

                batch.update(userRef, userUpdates);

                // Add to zine memory
                try {
                    const memoryId = doc(collection(db, 'users', userId, 'memories')).id;
                    const memoryRef = doc(db, 'users', userId, 'memories', memoryId);
                    batch.set(memoryRef, {
                        userId,
                        missionId: trip.id,
                        seasonId,
                        title: trip.title,
                        category: trip.category || 'field',
                        lane: trip.lane || 'heatwave',
                        fieldNote: entry.fieldNote || '',
                        evidenceUrl: entry.proofImage || '',
                        pointsEarned: finalTotalXP,
                        rewardsEarned: (newStickers.length > 0 || newBadges.length > 0) ? {
                            stickers: newStickers,
                            badges: newBadges
                        } : null,
                        zineEligible: trip.zineEligible !== false,
                        zinePageSeedGenerated: true,
                        createdAt: serverTimestamp()
                    });
                } catch (memLogErr) {
                    console.warn("[Memory_Sync_Minor_Error]", memLogErr);
                }

                // Final entry update
                batch.update(entryRef, entryUpdate);

                // PROMOTE TO BALLOT CANDIDATE
                try {
                    const candidateRef = doc(db, 'ballotCandidates', entryId);
                    batch.set(candidateRef, {
                        id: entryId,
                        entryId,
                        userId,
                        userName,
                        tripId: trip.id,
                        tripTitle: trip.title,
                        proofImage: entry.proofImage || '',
                        fieldNote: entry.fieldNote || '',
                        weekNumber: activeWeekNum,
                        seasonId,
                        addedAt: serverTimestamp()
                    });
                } catch (ballotErr) {
                    console.warn("[Ballot_Sync_Minor_Error]", ballotErr);
                }

                console.log(`[Admin_Override_Protocol] COMMITTING BATCH for ${entryId}`);
                await batch.commit();
                console.log(`[Admin_Override_Protocol] SUCCESS: XP Awarded and status approved synchronously.`);
                
                // ASYNC: Promote to the deeper ballot subcollections
                try {
                  const entryFinalSnap = await getDoc(entryRef);
                  if (entryFinalSnap.exists()) {
                    await promoteEntryToBallotCandidate(entryId, entryFinalSnap.data());
                  }
                } catch (ballAsyncErr) {
                  console.warn("[Ballot_Sync_Async_Error]", ballAsyncErr);
                }
                
                return;
            }
        } else if (isApproving && isIdempotencySkipped) {
            // Just update status if already awarded
            batch.update(entryRef, {
                status: 'approved',
                reviewStatus: 'approved',
                updatedAt: serverTimestamp()
            });
            await batch.commit();
            return;
        }

        // NON-APPROVAL case (Reject, Needs More Proof)
        console.log(`[Admin_Override_Protocol] NON-APPROVAL: Updating ${entryId} to ${updateStatusValue}`);
        batch.update(entryRef, entryUpdate);

        try {
          if (reviewSnap.exists()) {
            batch.update(ref, reviewUpdateData);
          } else {
            batch.set(ref, {
              ...reviewUpdateData,
              userId: entry.userId || entry.uid,
              challengeId: entry.missionId || entry.challengeId || entry.tripId,
              entryId: entryId,
              confidenceScore: 100,
              manualOverride: true
            });
          }
        } catch (revErr) { console.warn("[Review_Update_Error]", revErr); }

        await batch.commit();
        console.log(`[Admin_Override_Protocol] SUCCESS: Status updated to ${updateStatusValue}`);
    } catch (error: any) {
        if (import.meta.env.DEV) {
            console.error(`[Admin] [ADMIN_WRITE_FAILED] adminOverrideReview failed for entryId: ${entryId}. Error:`, error.message || error);
        }
        console.error('Error in admin override:', error.message || error);
        throw error;
    }
}

/**
 * TOGGLE LIKE: Optimistic like/unlike pattern for Community Feed.
 */
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
