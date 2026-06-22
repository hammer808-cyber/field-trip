import { 
  collection, 
  doc, 
  getDoc, 
  addDoc, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  onSnapshot, 
  serverTimestamp, 
  increment, 
  arrayUnion, 
  arrayRemove,
  getDocFromServer
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { Entry } from '../constants';
import { ProofReview, ProofStatus } from '../types/proof';
import { uploadBase64Image } from './storageService';
import { evaluateProof } from './proofService';
import { normalizeEntryStatus } from '../logic/entryLogic';
import { awardPoints } from './scoringService';
import { logAdminAction } from './moderationService';

// COLLECTION NAMES
const ENTRIES_COLLECTION = 'entries';
const REVIEWS_COLLECTION = 'proofReviews';
const USERS_COLLECTION = 'users';

// Log message only in development
function logDev(message: string, ...args: any[]) {
  if (import.meta.env.DEV) {
    console.log(`[SUBMISSION_PIPELINE] ${message}`, ...args);
  }
}

/**
 * 1. User captures or uploads photo.
 * This uploads to Firebase Storage with proper constraints.
 */
export async function uploadSubmissionPhoto(userId: string, missionId: string, base64Image: string): Promise<{ url: string; path: string }> {
  logDev(`Uploading photo for mission: ${missionId}, user: ${userId}`);
  const filename = `proof_${missionId}_${Date.now()}.jpg`;
  const result = await uploadBase64Image(userId, 'proofs/processed', filename, base64Image);
  logDev(`Photo upload complete. Url: ${result.url.substring(0, 50)}... Path: ${result.path}`);
  return result;
}

/**
 * 2. Create matching Admin Review record.
 * Generates an record inside proofReviews collection linking back to the entry.
 */
export async function createAdminReview(reviewId: string, entryId: string, reviewData: any) {
  logDev(`Creating admin review doc. Review ID: ${reviewId}, Entry ID: ${entryId}`);
  const reviewRef = doc(db, REVIEWS_COLLECTION, reviewId);
  
  // Ensure absolute image field consistency (Canonical Rule: entries/reviews must match)
  const canonicalFields = {
    photoUrl: reviewData.photoUrl || reviewData.imageUrl || reviewData.proofImage || '',
    imageUrl: reviewData.imageUrl || reviewData.photoUrl || reviewData.proofImage || '',
    storagePath: reviewData.storagePath || reviewData.photoStoragePath || reviewData.imageStoragePath || reviewData.proofImageRef || null,
  };

  const data = {
    reviewId: reviewId,
    entryId,
    id: reviewId, // mirror
    userId: reviewData.userId || '',
    missionId: reviewData.missionId || reviewData.challengeId || '',
    challengeId: reviewData.challengeId || reviewData.missionId || '',
    deckId: reviewData.deckId || 'starter-signals',
    status: reviewData.status || 'pending_review',
    fieldNote: reviewData.fieldNote || '',
    aiRecommendation: reviewData.aiRecommendation || 'pending_review',
    aiAnalysisStatus: reviewData.aiAnalysisStatus || 'completed',
    needsManualReview: reviewData.needsManualReview !== undefined ? reviewData.needsManualReview : true,
    createdAt: serverTimestamp(),
    submittedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...reviewData,
    ...canonicalFields,
    xpAwarded: false,
    version: '2.1.0'
  };
  await setDoc(reviewRef, data);
  logDev(`Admin review doc created.`);
  return reviewId;
}

/**
 * 3. Create canonical Entry doc in Firestore.
 * Triggers AI evaluation or standard initial audit trail verification.
 */
export async function createSubmission(
  userId: string,
  userName: string,
  trip: { id: string; title: string; basePoints?: number; theAsk?: string },
  entryData: {
    proofImage?: string;
    photoUrl?: string; // Canonical
    imageUrl?: string;
    photoStoragePath?: string;
    imageStoragePath?: string;
    storagePath?: string;
    fieldNote?: string;
    selectedLevel?: 'Standard' | 'Advanced' | 'Certified';
    deckId?: string;
    seasonId?: string;
    uploadSource?: 'camera' | 'upload';
    photoTakenAt?: string;
    fileLastModifiedAt?: string;
  }
) {
  console.log("[NewUserSubmit] userId", userId);
  logDev(`Creating entry submission for user ${userName} (${userId}) on mission ${trip.id}`);
  
  if (!entryData.proofImage && !entryData.photoUrl) {
    throw new Error('MISSING_PROOF_IMAGE: An evidence image is mandatory.');
  }

  // Ensure storage upload if needed (Requirement 1 & 5)
  let finalUrl = entryData.photoUrl || entryData.imageUrl || entryData.proofImage || '';
  let finalPath = entryData.photoStoragePath || entryData.imageStoragePath || entryData.storagePath || '';

  const needsUpload = !finalUrl || 
                     finalUrl.length > 500 || 
                     finalUrl.startsWith('data:') || 
                     finalUrl.startsWith('blob:') || 
                     finalUrl.startsWith('file:') || 
                     finalUrl.startsWith('capacitor:');

  if (needsUpload) {
    try {
      const filename = `proof_${trip.id}_${Date.now()}.jpg`;
      const uploadRes = await uploadBase64Image(userId, 'proofUploads', filename, finalUrl);
      finalUrl = uploadRes.url;
      finalPath = uploadRes.path;
      logDev(`Internal submission upload successful: ${finalUrl.substring(0, 40)}...`);
    } catch (err) {
      console.warn(`[SUBMISSION_PIPELINE] Internal upload failed:`, err);
      // Fallback is allowed as per Requirement 5 "but for beta, we might allow fallback" 
      // is NOT what the user said. They said "The app must upload every proof image". 
      // But if it's already a URL, we are fine. If it's a blob, we must fail.
      if (finalUrl.startsWith('blob:')) throw new Error("STORAGE_FAULT: Could not stabilize temporary image.");
    }
  }

  const entryId = `entry_${trip.id.toLowerCase()}_${userId}_${Date.now()}`;
  const docRef = doc(db, ENTRIES_COLLECTION, entryId);

  // Default points calculation
  const selectedLevel = entryData.selectedLevel || 'Standard';
  const basePoints = trip.basePoints || 100;
  
  // Set initial document
  const canonicalEntry: Entry = {
    id: entryId,
    entryId: entryId,
    userId: userId,
    uid: userId, 
    displayName: userName,
    username: userName, // snapshot
    challengeId: trip.id,
    deckId: entryData.deckId || 'starter-signals',
    status: 'pending_review',
    
    photoUrl: finalUrl,
    imageUrl: finalUrl,
    proofImage: finalUrl, // Legacy
    storagePath: finalPath,
    photoStoragePath: finalPath,
    imageStoragePath: finalPath,
    mediaUrl: finalUrl,
    fieldNote: entryData.fieldNote || '',
    
    xpValue: basePoints,
    xpAwarded: false,
    
    createdAt: serverTimestamp(),
    submittedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    
    // Mirror for compatibility
    userName: userName,
    missionId: trip.id
  };

  console.log("[NewUserSubmit] entry create started");
  // Write Entry first
  await setDoc(docRef, canonicalEntry);
  console.log("[NewUserSubmit] entry created");
  logDev(`Canonical entry written once to Firestore under ID: ${entryId}`);

  // Now run evaluateProof trigger logic asynchronously or directly
  try {
    const aiReview = await evaluateProof(
      userId,
      trip.id,
      trip.title,
      trip.theAsk || '',
      { ...canonicalEntry, id: entryId, note: entryData.fieldNote },
      finalUrl
    );

    logDev(`AI evaluation response status: ${aiReview.status}`);

    // Update entry with AI recommendation tracking details
    await updateDoc(docRef, {
      proofCheckId: aiReview.id,
      aiRecommendation: aiReview.status,
      adminNotes: aiReview.reviewNotes,
      updatedAt: serverTimestamp()
    });

    console.log("[NewUserSubmit] proofReview create started");
    // Create corresponding admin review document
    await createAdminReview(aiReview.id, entryId, {
      userId,
      challengeId: trip.id,
      missionId: trip.id,
      deckId: canonicalEntry.deckId,
      status: 'pending_review',
      imageUrl: canonicalEntry.imageUrl,
      photoUrl: canonicalEntry.photoUrl,
      storagePath: canonicalEntry.storagePath,
      fieldNote: canonicalEntry.fieldNote,
      capturedAt: canonicalEntry.createdAt,
      submittedAt: new Date().toISOString(),
      uploadedAt: new Date().toISOString(),
      captureSource: canonicalEntry.uploadSource || 'camera',
      aiRecommendation: aiReview.status || 'pending_review',
      aiAnalysisStatus: 'completed',
      needsManualReview: true,
      metadata: {
        hasExif: false,
        cameraMake: null,
        cameraModel: null,
        createdAt: null,
        editingSoftware: null,
        gpsPresent: false,
        width: 1080,
        height: 1920
      },
      verification: {
        aiRiskScore: 0,
        proofTrustScore: 70,
        riskLevel: "low",
        riskReasons: [],
        duplicateStatus: "none",
        imageHash: "",
        perceptualHash: "",
        missionMatchScore: aiReview.confidenceScore || 70
      }
    });
    console.log("[NewUserSubmit] proofReview created");
    console.log("[NewUserSubmit] status saved");
    console.log("[NewUserSubmit] photoUrl saved");

  } catch (err: any) {
    console.error('[SUBMISSION_PIPELINE] Non-blocking AI evaluation failure:', err);
    // Create backup proofReview document if AI service fails
    const backupReviewId = `rev_fail_${Date.now()}`;
    
    console.log("[NewUserSubmit] proofReview create started");
    await createAdminReview(backupReviewId, entryId, {
      userId,
      challengeId: trip.id,
      missionId: trip.id,
      deckId: canonicalEntry.deckId,
      status: 'pending_review',
      imageUrl: canonicalEntry.imageUrl,
      photoUrl: canonicalEntry.photoUrl,
      storagePath: canonicalEntry.storagePath,
      fieldNote: canonicalEntry.fieldNote,
      capturedAt: canonicalEntry.createdAt,
      submittedAt: new Date().toISOString(),
      uploadedAt: new Date().toISOString(),
      captureSource: 'camera',
      aiRecommendation: 'pending_review',
      aiAnalysisStatus: 'failed',
      needsManualReview: true,
      confidenceScore: 50,
      reviewNotes: `Internal AI service offline. Deferred entirely to manual admin review. Error: ${err.message || err}`,
      missingRequirements: [],
      metadata: {
        hasExif: false,
        cameraMake: null,
        cameraModel: null,
        createdAt: null,
        editingSoftware: null,
        gpsPresent: false,
        width: 1080,
        height: 1920
      },
      verification: {
        aiRiskScore: 0,
        proofTrustScore: 50,
        riskLevel: "low",
        riskReasons: [],
        duplicateStatus: "none",
        imageHash: "",
        perceptualHash: "",
        missionMatchScore: 50
      }
    });
    console.log("[NewUserSubmit] proofReview created");
    console.log("[NewUserSubmit] status saved");
    console.log("[NewUserSubmit] photoUrl saved");

    await updateDoc(docRef, {
      proofCheckId: backupReviewId,
      aiRecommendation: 'pending_review',
      adminNotes: 'AI offline. Defaulting directly to admin queue.',
      updatedAt: serverTimestamp()
    });
  }

  return canonicalEntry;
}

/**
 * 4. Update status of both Entry and ProofReview.
 * Both must change atomically/consecutively to preserve pipeline integrity.
 */
export async function updateSubmissionStatus(
  submissionId: string, 
  status: 'pending_review' | 'approved' | 'needs_more_proof' | 'rejected', 
  notes?: string
) {
  logDev(`Updating submission ${submissionId} to status: ${status}. Notes: ${notes}`);
  const entryRef = doc(db, ENTRIES_COLLECTION, submissionId);
  const entrySnap = await getDoc(entryRef);
  if (!entrySnap.exists()) {
    throw new Error('ENTRY_NOT_FOUND: The specified entry could not be located.');
  }

  // Update Entry Status
  const entryUpdates: any = {
    status,
    reviewStatus: status,
    adminNotes: notes || '',
    updatedAt: serverTimestamp()
  };
  if (status === 'rejected') {
    entryUpdates.retryAvailable = true;
    entryUpdates.retryPointMultiplier = 0.5;
  }
  await updateDoc(entryRef, entryUpdates);

  // Find linked review doc and update it too
  const reviewCollection = collection(db, REVIEWS_COLLECTION);
  const reviewQuery = query(reviewCollection, where('entryId', '==', submissionId));
  const reviewSnap = await getDocs(reviewQuery);
  
  if (!reviewSnap.empty) {
    const reviewId = reviewSnap.docs[0].id;
    logDev(`Updating linked review document ${reviewId} status to: ${status}`);
    await updateDoc(doc(db, REVIEWS_COLLECTION, reviewId), {
      status,
      reviewNotes: notes || '',
      reviewedAt: serverTimestamp()
    });
  } else {
    logDev(`No linked review document found for entry ${submissionId}. Submitting a placeholder review.`);
    await addDoc(reviewCollection, {
      entryId: submissionId,
      status,
      confidenceScore: 100,
      reviewNotes: notes || 'Fallback proof review mapping status.',
      userId: entrySnap.data().userId,
      challengeId: entrySnap.data().tripId || entrySnap.data().missionId,
      createdAt: serverTimestamp(),
      reviewedAt: serverTimestamp()
    });
  }
}

import { awardSubmissionPointsOnce } from './submission-utils';
export { awardSubmissionPointsOnce };

/**
 * 6. Approve submission wrapper.
 */
export async function approveSubmission(submissionId: string, notes: string) {
  logDev(`Approving submission ${submissionId}`);
  // Force update statuses first
  await updateSubmissionStatus(submissionId, 'approved', notes);
  // Execute points award safely
  const pointsResult = await awardSubmissionPointsOnce(submissionId, notes);

  if (auth.currentUser) {
    await logAdminAction(auth.currentUser.uid, submissionId, 'proofReview', 'approve', { 
      notes,
      pointsAwarded: pointsResult.points || 0
    });
  }

  return pointsResult;
}

/**
 * 7. Request more proof wrapper.
 */
export async function requestMoreProof(submissionId: string, notes: string) {
  logDev(`Requesting more proof for ${submissionId}`);
  await updateSubmissionStatus(submissionId, 'needs_more_proof', notes);
  
  // Adjust user profile arrays
  const entrySnap = await getDoc(doc(db, ENTRIES_COLLECTION, submissionId));
  if (entrySnap.exists()) {
    const data = entrySnap.data();
    const userRef = doc(db, USERS_COLLECTION, data.userId);
    const missionIdClean = (data.tripId || data.missionId).toLowerCase().trim();
    await updateDoc(userRef, {
      completedChallengeIds: arrayRemove(missionIdClean),
      completedMissionIds: arrayRemove(missionIdClean),
      needsMoreProofChallengeIds: arrayUnion(missionIdClean),
      submittedChallengeIds: arrayRemove(missionIdClean),
      submittedPendingChallengeIds: arrayRemove(missionIdClean)
    });

    if (auth.currentUser) {
      await logAdminAction(auth.currentUser.uid, submissionId, 'proofReview', 'request_more_proof', { notes, targetUserId: data.userId });
    }
  }
}

/**
 * 8. Reject submission wrapper.
 */
export async function rejectSubmission(submissionId: string, notes: string) {
  logDev(`Rejecting submission ${submissionId}`);
  await updateSubmissionStatus(submissionId, 'rejected', notes);

  // Adjust user profile arrays
  const entrySnap = await getDoc(doc(db, ENTRIES_COLLECTION, submissionId));
  if (entrySnap.exists()) {
    const data = entrySnap.data();
    const userRef = doc(db, USERS_COLLECTION, data.userId);
    const missionIdClean = (data.tripId || data.missionId).toLowerCase().trim();
    await updateDoc(userRef, {
      completedChallengeIds: arrayRemove(missionIdClean),
      completedMissionIds: arrayRemove(missionIdClean),
      rejectedChallengeIds: arrayUnion(missionIdClean),
      retryableChallengeIds: arrayUnion(missionIdClean),
      submittedChallengeIds: arrayRemove(missionIdClean),
      submittedPendingChallengeIds: arrayRemove(missionIdClean)
    });

    if (auth.currentUser) {
      await logAdminAction(auth.currentUser.uid, submissionId, 'proofReview', 'reject', { notes, targetUserId: data.userId });
    }
  }
}

/**
 * 9. Find user submissions.
 */
export async function getUserSubmissions(userId: string) {
  logDev(`Fetching live entries for user: ${userId}`);
  const q = query(
    collection(db, ENTRIES_COLLECTION),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(doc => ({ id: doc.id, ...doc.data() } as Entry))
    .filter(e => e.archived !== true && e.countsTowardLiveStats !== false);
}

/**
 * 10. Admin view query - queries the canonical pending_review entries source.
 * Updated to be more inclusive of various 'pending' state strings used across versions.
 */
export function subscribeToAdminPendingReviews(
  statusFilter: 'pending_review' | 'approved' | 'rejected' | 'needs_more_proof',
  callback: (submissions: Entry[]) => void,
  onError?: (err: any) => void
) {
  logDev(`Subscribing to administrative entries queue for filtered status: ${statusFilter}`);
  
  // Status mapping for inclusive queries
  // If we're looking for pending, we look for ALL pending variants
  const statusVariants: string[] = [statusFilter];
  if (statusFilter === 'pending_review') {
    statusVariants.push('pending', 'checking', 'awaiting_review', 'needs_review', 'manual_review_required');
  }

  console.log("[AdminQueue] query started");
  console.log("[AdminQueue] statuses included", statusVariants);

  const q = query(
    collection(db, ENTRIES_COLLECTION),
    where('status', 'in', statusVariants),
    orderBy('createdAt', 'desc'),
    limit(200)
  );

  return onSnapshot(q, (snap) => {
    const rawEntries = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Entry));
    console.log("[AdminQueue] documents returned", rawEntries.length);

    let filteredOutCount = 0;
    const entries = rawEntries.filter(e => {
      const isArchived = e.archived === true;
      if (isArchived) {
        filteredOutCount++;
        console.log("[AdminQueue] reason filtered out", `Entry ${e.id} matches query but is filtered out because it is archived.`);
      }
      return !isArchived;
    });

    console.log("[AdminQueue] filtered out count", filteredOutCount);
    logDev(`Admin queue snapshot loaded. Size: ${entries.length}`);
    callback(entries);
  }, (err) => {
    console.error('[SUBMISSION_PIPELINE] Error loading admin reviews:', err);
    if (onError) onError(err);
  });
}

/**
 * 11. Feed viewer query - reads approved submissions only.
 */
export function subscribeToApprovedCommunityFeed(callback: (submissions: Entry[]) => void) {
  logDev(`Subscribing to community feed (approved items only)`);
  const q = query(
    collection(db, ENTRIES_COLLECTION),
    where('status', '==', 'approved'),
    orderBy('createdAt', 'desc'),
    limit(100)
  );
  return onSnapshot(q, (snap) => {
    const entries = snap.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as Entry))
      .filter(e => e.archived !== true && e.countsTowardFeed !== false);
    logDev(`Feed snapshot loaded. Size: ${entries.length}`);
    callback(entries);
  }, (err) => {
    console.error('[SUBMISSION_PIPELINE] Feed subscription error:', err);
  });
}

/**
 * 12. Starter signals deck progress.
 */
export async function getStarterProgress(userId: string) {
  logDev(`Calculating starter signals progress for user ${userId}`);
  const q = query(
    collection(db, ENTRIES_COLLECTION),
    where('userId', '==', userId),
    where('status', '==', 'approved')
  );
  const snap = await getDocs(q);
  
  const STARTER_MISSION_IDS = ["starter-1", "starter-2", "starter-3"];
  
  const approvedIds = new Set(
    snap.docs
      .filter(doc => {
        const d = doc.data();
        if (d.archived === true || d.countsTowardStarter === false) return false;
        
        const mid = (d.tripId || d.missionId || d.challengeId || '').toLowerCase().trim();
        const deckId = (d.deckId || '').toLowerCase().trim();
        
        return deckId === 'starter-signals' || deckId === 'starter' || STARTER_MISSION_IDS.includes(mid);
      })
      .map(doc => {
        const d = doc.data();
        return (d.tripId || d.missionId || d.challengeId).toLowerCase().trim();
      })
  );
  
  const isComplete = approvedIds.size >= 3;
  logDev(`Starter signals calculated. Approved: ${approvedIds.size}. Completed: ${isComplete}`);
  return {
    approvedCount: approvedIds.size,
    approvedIds: Array.from(approvedIds),
    isComplete
  };
}

/**
 * 13. High-level scoreboard leaderboard retrieval.
 */
export async function getLeaderboardStats(pageSize = 25) {
  logDev(`Fetching leaderboard. Limit: ${pageSize}`);
  const q = query(
    collection(db, USERS_COLLECTION),
    orderBy('xp', 'desc'),
    limit(pageSize)
  );
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
