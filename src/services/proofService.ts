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
  orderBy
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { ProofRequirement, ProofReview, ProofStatus, ProofCheck, AIAnalysis } from '../types/proof';
import { analyzeSubmissionImage } from './geminiService';
import { guardedCall } from './guardedService';
import { getGlobalConfig } from './configService';
import { getServerDate } from './timeService';

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
      entryData.selectedLevel || (entryData as any).level || 'Scout',
      requirement
    );

    if (!options.bypassCache) {
      try {
        const cacheDoc = await getDoc(doc(db, CHECKS_COLLECTION, cacheKey));
        if (cacheDoc.exists()) {
          const cachedData = cacheDoc.data() as ProofCheck;
          console.log('[PROOF_CHECK] Using cached result for key:', cacheKey);
          
          // Reconstruct ProofReview from cache
          const review: Omit<ProofReview, 'id'> = {
            entryId: entryData.id || 'pending',
            userId,
            challengeId,
            status: cachedData.status,
            confidenceScore: cachedData.confidenceScore,
            missingRequirements: cachedData.missingRequirements,
            reviewNotes: cachedData.imageAnalysis.reason + " (AUTHENTICATED FROM CACHE)",
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

    // 1. Basic Policy Checks
    if (requirement) {
      // Photo Check
      const photoCount = entryData.proofImage || base64Image ? 1 : 0;
      if (photoCount < requirement.minimumPhotoCount) {
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

    // 2. AI Analysis (Gemini) - If image is provided and required
    if (base64Image && (requirement?.requiresObjectDetection || true)) {
      const analysis = await analyzeSubmissionImage(
        base64Image,
        challengeTitle,
        challengeInstructions,
        requirement?.objectKeywords || []
      );

      aiAnalysisResult = analysis;
      confidenceScore = Math.min(confidenceScore, analysis.confidence);
      
      if (!analysis.contains_required_subject && (requirement?.requiresObjectDetection)) {
        missingRequirements.push(`Subject detection failure: ${analysis.missing_evidence.join(', ')}`);
        confidenceScore -= 30;
      }

      if (analysis.confidence < 50) {
        missingRequirements.push("Image clarity or relevance is below mission standards.");
      }

      reviewNotes = analysis.reason;
    }

    // 3. Status Determination
    if (missingRequirements.length > 0) {
      status = 'needsMoreProof';
      if (confidenceScore < 30) {
        status = 'rejected';
      }
    }

    const review: Omit<ProofReview, 'id'> = {
      entryId: entryData.id || 'pending',
      userId,
      challengeId,
      status,
      confidenceScore,
      missingRequirements,
      reviewNotes: missingRequirements.length > 0 && !base64Image
        ? `The Evidence Department requires more documentation: ${missingRequirements.join(' ')}` 
        : reviewNotes,
      reviewedAt: getServerDate().toISOString()
    };

    // 4. Persistence & Caching
    try {
      // Save Review (legacy/stat log)
      const docRef = await addDoc(collection(db, REVIEWS_COLLECTION), {
        ...review,
        reviewedAt: serverTimestamp()
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
  }, { cooldownMs: 15000 }); // 15s cooldown per user proof check to prevent hammering AI
}

export async function adminOverrideReview(reviewId: string, entryId: string, newStatus: ProofStatus, notes: string) {
    try {
        const ref = doc(db, REVIEWS_COLLECTION, reviewId);
        const isRejected = newStatus === 'rejected';
        
        const updateData: any = {
            status: newStatus,
            reviewNotes: notes,
            reviewedAt: serverTimestamp()
        };

        if (isRejected) {
            const now = getServerDate();
            const purgeDate = getServerDate();
            purgeDate.setDate(now.getDate() + 14); // 14 days later
            
            updateData.rejectedAt = serverTimestamp();
            updateData.purgeEligibleAt = Timestamp.fromDate(purgeDate);
        }

        await updateDoc(ref, updateData);

        // Also update entry status
        const entryRef = doc(db, ENTRIES_COLLECTION, entryId);
        const entryUpdate: any = {
            status: newStatus === 'approved' ? 'approved' : 'rejected',
            adminNotes: notes
        };

        if (isRejected) {
            const now = getServerDate();
            const purgeDate = getServerDate();
            purgeDate.setDate(now.getDate() + 14);
            
            entryUpdate.rejectedAt = serverTimestamp();
            entryUpdate.purgeEligibleAt = Timestamp.fromDate(purgeDate);
        }

        await updateDoc(entryRef, entryUpdate);
    } catch (error) {
        console.error('Error in admin override:', error);
    }
}
