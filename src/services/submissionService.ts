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
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Entry } from '../constants';
import { uploadBase64Image } from './storageService';
import { evaluateProof } from './proofService';
import { reviewSubmission } from './adminReviewService';
import { awardSubmissionPointsOnce } from './submission-utils';

export { awardSubmissionPointsOnce, reviewSubmission };

const ENTRIES_COLLECTION = 'entries';
const REVIEWS_COLLECTION = 'proofReviews';
const USERS_COLLECTION = 'users';

function logDev(message: string, ...args: any[]) {
  if (import.meta.env.DEV) {
    console.log(`[SUBMISSION_PIPELINE] ${message}`, ...args);
  }
}

function firstString(...values: any[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return '';
}

function resolveAdminImageFields(reviewData: any = {}, entryData: any = {}) {
  const reviewUrl = firstString(
    reviewData.photoUrl,
    reviewData.imageUrl,
    reviewData.mediaUrl,
    reviewData.proofImageUrl,
    reviewData.proofImage,
    Array.isArray(reviewData.imageUrls) ? reviewData.imageUrls[0] : ''
  );
  const entryUrl = firstString(
    entryData.photoUrl,
    entryData.imageUrl,
    entryData.mediaUrl,
    entryData.proofImageUrl,
    entryData.proofImage,
    Array.isArray(entryData.imageUrls) ? entryData.imageUrls[0] : ''
  );
  const reviewPath = firstString(
    reviewData.storagePath,
    reviewData.imageStoragePath,
    reviewData.photoStoragePath,
    reviewData.proofImageRef,
    reviewData.proofStoragePath
  );
  const entryPath = firstString(
    entryData.storagePath,
    entryData.imageStoragePath,
    entryData.photoStoragePath,
    entryData.proofImageRef,
    entryData.proofStoragePath
  );
  const photoUrl = reviewUrl || entryUrl;
  const storagePath = reviewPath || entryPath;
  const source = reviewUrl || reviewPath ? 'proofReview' : entryUrl || entryPath ? 'linkedEntry' : 'missing';
  return {
    photoUrl,
    imageUrl: photoUrl,
    mediaUrl: photoUrl,
    proofImage: photoUrl,
    proofImageUrl: photoUrl,
    storagePath,
    imageStoragePath: storagePath,
    photoStoragePath: storagePath,
    imageResolutionSource: source,
    imageDiagnosticLabel: source === 'linkedEntry'
      ? 'Image resolved from linked entry'
      : source === 'proofReview'
        ? 'Image resolved from review'
        : 'Image missing from review; checked linked entry'
  };
}

export async function uploadSubmissionPhoto(userId: string, missionId: string, base64Image: string): Promise<{ url: string; path: string }> {
  logDev(`Uploading photo for mission: ${missionId}, user: ${userId}`);
  const filename = `proof_${missionId}_${Date.now()}.jpg`;
  const result = await uploadBase64Image(userId, 'proofs/processed', filename, base64Image);
  logDev(`Photo upload complete. Url: ${result.url.substring(0, 50)}... Path: ${result.path}`);
  return result;
}

export async function createAdminReview(reviewId: string, entryId: string, reviewData: any) {
  logDev(`Creating admin review doc. Review ID: ${reviewId}, Entry ID: ${entryId}`);
  const reviewRef = doc(db, REVIEWS_COLLECTION, reviewId);
  const canonicalFields = resolveAdminImageFields(reviewData, reviewData);

  const data = {
    reviewId,
    entryId,
    id: reviewId,
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
  logDev('Admin review doc created.');
  return reviewId;
}

export async function createSubmission(
  userId: string,
  userName: string,
  trip: { id: string; title: string; basePoints?: number; theAsk?: string },
  entryData: {
    proofImage?: string;
    photoUrl?: string;
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
  console.log('[NewUserSubmit] userId', userId);
  logDev(`Creating entry submission for user ${userName} (${userId}) on mission ${trip.id}`);

  if (!entryData.proofImage && !entryData.photoUrl) {
    throw new Error('MISSING_PROOF_IMAGE: An evidence image is mandatory.');
  }

  let finalUrl = entryData.photoUrl || entryData.imageUrl || entryData.proofImage || '';
  let finalPath = entryData.photoStoragePath || entryData.imageStoragePath || entryData.storagePath || '';
  const needsUpload = !finalUrl || finalUrl.length > 500 || finalUrl.startsWith('data:') || finalUrl.startsWith('blob:') || finalUrl.startsWith('file:') || finalUrl.startsWith('capacitor:');

  if (needsUpload) {
    try {
      const filename = `proof_${trip.id}_${Date.now()}.jpg`;
      const uploadRes = await uploadBase64Image(userId, 'proofUploads', filename, finalUrl);
      finalUrl = uploadRes.url;
      finalPath = uploadRes.path;
      logDev(`Internal submission upload successful: ${finalUrl.substring(0, 40)}...`);
    } catch (err) {
      console.warn('[SUBMISSION_PIPELINE] Internal upload failed:', err);
      if (finalUrl.startsWith('blob:')) throw new Error('STORAGE_FAULT: Could not stabilize temporary image.');
    }
  }

  const entryId = `entry_${trip.id.toLowerCase()}_${userId}_${Date.now()}`;
  const docRef = doc(db, ENTRIES_COLLECTION, entryId);
  const basePoints = trip.basePoints || 100;
  const canonicalEntry: Entry = {
    id: entryId,
    entryId,
    userId,
    uid: userId,
    displayName: userName,
    username: userName,
    challengeId: trip.id,
    deckId: entryData.deckId || 'starter-signals',
    status: 'pending_review',
    photoUrl: finalUrl,
    imageUrl: finalUrl,
    proofImage: finalUrl,
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
    userName,
    missionId: trip.id
  };

  console.log('[NewUserSubmit] entry create started');
  await setDoc(docRef, canonicalEntry);
  console.log('[NewUserSubmit] entry created');
  logDev(`Canonical entry written once to Firestore under ID: ${entryId}`);

  try {
    const aiReview = await evaluateProof(userId, trip.id, trip.title, trip.theAsk || '', { ...canonicalEntry, id: entryId, note: entryData.fieldNote }, finalUrl);
    logDev(`AI evaluation response status: ${aiReview.status}`);
    await updateDoc(docRef, {
      proofCheckId: aiReview.id,
      aiRecommendation: aiReview.status,
      adminNotes: aiReview.reviewNotes,
      updatedAt: serverTimestamp()
    });

    console.log('[NewUserSubmit] proofReview create started');
    await createAdminReview(aiReview.id, entryId, {
      userId,
      challengeId: trip.id,
      missionId: trip.id,
      deckId: canonicalEntry.deckId,
      status: 'pending_review',
      imageUrl: canonicalEntry.imageUrl,
      photoUrl: canonicalEntry.photoUrl,
      mediaUrl: canonicalEntry.mediaUrl,
      proofImage: canonicalEntry.proofImage,
      storagePath: canonicalEntry.storagePath,
      imageStoragePath: canonicalEntry.imageStoragePath,
      photoStoragePath: canonicalEntry.photoStoragePath,
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
        riskLevel: 'low',
        riskReasons: [],
        duplicateStatus: 'none',
        imageHash: '',
        perceptualHash: '',
        missionMatchScore: aiReview.confidenceScore || 70
      }
    });
  } catch (err: any) {
    console.error('[SUBMISSION_PIPELINE] Non-blocking AI evaluation failure:', err);
    const backupReviewId = `rev_fail_${Date.now()}`;
    console.log('[NewUserSubmit] proofReview create started');
    await createAdminReview(backupReviewId, entryId, {
      userId,
      challengeId: trip.id,
      missionId: trip.id,
      deckId: canonicalEntry.deckId,
      status: 'pending_review',
      imageUrl: canonicalEntry.imageUrl,
      photoUrl: canonicalEntry.photoUrl,
      mediaUrl: canonicalEntry.mediaUrl,
      proofImage: canonicalEntry.proofImage,
      storagePath: canonicalEntry.storagePath,
      imageStoragePath: canonicalEntry.imageStoragePath,
      photoStoragePath: canonicalEntry.photoStoragePath,
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
        riskLevel: 'low',
        riskReasons: [],
        duplicateStatus: 'none',
        imageHash: '',
        perceptualHash: '',
        missionMatchScore: 50
      }
    });

    await updateDoc(docRef, {
      proofCheckId: backupReviewId,
      aiRecommendation: 'pending_review',
      adminNotes: 'AI offline. Defaulting directly to admin queue.',
      updatedAt: serverTimestamp()
    });
  }

  return canonicalEntry;
}

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

export async function approveSubmission(submissionId: string, notes: string) {
  logDev(`Approving submission ${submissionId}`);
  return reviewSubmission(submissionId, 'approved', notes);
}

export async function requestMoreProof(submissionId: string, notes: string) {
  logDev(`Requesting more proof for ${submissionId}`);
  return reviewSubmission(submissionId, 'needs_more_proof', notes);
}

export async function rejectSubmission(submissionId: string, notes: string) {
  logDev(`Rejecting submission ${submissionId}`);
  return reviewSubmission(submissionId, 'rejected', notes);
}

export async function getUserSubmissions(userId: string) {
  logDev(`Fetching live entries for user: ${userId}`);
  const q = query(collection(db, ENTRIES_COLLECTION), where('userId', '==', userId), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Entry)).filter(e => e.archived !== true && e.countsTowardLiveStats !== false);
}

export function subscribeToAdminPendingReviews(
  statusFilter: 'pending_review' | 'approved' | 'rejected' | 'needs_more_proof',
  callback: (submissions: Entry[]) => void
) {
  logDev(`Subscribing to administrative entries queue for filtered status: ${statusFilter}`);
  const statusVariants: string[] = [statusFilter];
  if (statusFilter === 'pending_review') {
    statusVariants.push('pending', 'checking', 'awaiting_review', 'needs_review', 'manual_review_required');
  }

  console.log('[AdminQueue] query started');
  console.log('[AdminQueue] statuses included', statusVariants);
  const q = query(collection(db, ENTRIES_COLLECTION), where('status', 'in', statusVariants), orderBy('createdAt', 'desc'), limit(200));

  return onSnapshot(q, async (snap) => {
    const rawEntries = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Entry));
    console.log('[AdminQueue] entry documents returned', rawEntries.length);
    let filteredOutCount = 0;
    const entries = rawEntries.filter(e => {
      const isArchived = e.archived === true;
      if (isArchived) {
        filteredOutCount++;
        console.log('[AdminQueue] reason filtered out', `Entry ${e.id} matches query but is filtered out because it is archived.`);
      }
      return !isArchived;
    });

    const entryMap = new Map<string, Entry>();
    entries.forEach(entry => {
      const imageFields = resolveAdminImageFields({}, entry);
      entryMap.set(entry.id, {
        ...entry,
        ...imageFields,
        proofReview: (entry as any).proofReview || null
      } as any);
    });

    try {
      const reviewQuery = query(collection(db, REVIEWS_COLLECTION), where('status', 'in', statusVariants), limit(200));
      const reviewSnap = await getDocs(reviewQuery);
      const reviewDocs = reviewSnap.docs.map(reviewDoc => ({ id: reviewDoc.id, ...reviewDoc.data() } as any));
      console.log('[AdminQueue] proofReview documents returned', reviewDocs.length);

      await Promise.all(reviewDocs.map(async (review) => {
        const linkedEntryId = review.entryId || review.id;
        let linkedEntry: any = null;

        if (linkedEntryId) {
          const existing = entryMap.get(linkedEntryId);
          if (existing) {
            linkedEntry = existing;
          } else {
            try {
              const entrySnap = await getDoc(doc(db, ENTRIES_COLLECTION, linkedEntryId));
              if (entrySnap.exists()) {
                linkedEntry = { id: entrySnap.id, ...entrySnap.data() };
              }
            } catch (err: any) {
              console.warn('[AdminQueue] linked entry fetch failed', linkedEntryId, err.message || err);
            }
          }
        }

        const imageFields = resolveAdminImageFields(review, linkedEntry || {});
        const mergedEntry = {
          ...(linkedEntry || {}),
          id: linkedEntry?.id || linkedEntryId || review.id,
          entryId: linkedEntry?.id || linkedEntryId || review.entryId || review.id,
          userId: linkedEntry?.userId || linkedEntry?.uid || review.userId || '',
          uid: linkedEntry?.uid || linkedEntry?.userId || review.userId || '',
          userName: linkedEntry?.userName || linkedEntry?.displayName || review.userName || review.displayName || 'Agent',
          displayName: linkedEntry?.displayName || linkedEntry?.userName || review.displayName || review.userName || 'Agent',
          missionId: linkedEntry?.missionId || linkedEntry?.tripId || linkedEntry?.challengeId || review.missionId || review.challengeId || '',
          challengeId: linkedEntry?.challengeId || linkedEntry?.missionId || linkedEntry?.tripId || review.challengeId || review.missionId || '',
          tripId: linkedEntry?.tripId || linkedEntry?.missionId || linkedEntry?.challengeId || review.missionId || review.challengeId || '',
          deckId: linkedEntry?.deckId || review.deckId || 'starter-signals',
          status: linkedEntry?.status || review.status || statusFilter,
          fieldNote: linkedEntry?.fieldNote || linkedEntry?.note || review.fieldNote || review.reviewNotes || '',
          note: linkedEntry?.fieldNote || linkedEntry?.note || review.fieldNote || review.reviewNotes || '',
          createdAt: linkedEntry?.createdAt || review.createdAt || review.submittedAt,
          submittedAt: linkedEntry?.submittedAt || review.submittedAt || review.createdAt,
          proofCheckId: linkedEntry?.proofCheckId || review.id,
          proofReview: review,
          ...imageFields
        } as Entry;

        if (mergedEntry.archived === true) return;
        entryMap.set(mergedEntry.id, mergedEntry);
      }));
    } catch (err: any) {
      console.warn('[AdminQueue] proofReviews fallback query skipped:', err.message || err);
    }

    console.log('[AdminQueue] filtered out count', filteredOutCount);
    logDev(`Admin queue snapshot loaded. Size: ${entryMap.size}`);
    callback(Array.from(entryMap.values()));
  }, (err) => {
    console.error('[SUBMISSION_PIPELINE] Error loading admin reviews:', err);
  });
}

export function subscribeToApprovedCommunityFeed(callback: (submissions: Entry[]) => void) {
  logDev('Subscribing to community feed (approved items only)');
  const q = query(collection(db, ENTRIES_COLLECTION), where('status', '==', 'approved'), orderBy('createdAt', 'desc'), limit(100));
  return onSnapshot(q, (snap) => {
    const entries = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Entry)).filter(e => e.archived !== true && e.countsTowardFeed !== false);
    logDev(`Feed snapshot loaded. Size: ${entries.length}`);
    callback(entries);
  }, (err) => {
    console.error('[SUBMISSION_PIPELINE] Feed subscription error:', err);
  });
}

export async function getStarterProgress(userId: string) {
  logDev(`Calculating starter signals progress for user ${userId}`);
  const q = query(collection(db, ENTRIES_COLLECTION), where('userId', '==', userId), where('status', '==', 'approved'));
  const snap = await getDocs(q);
  const STARTER_MISSION_IDS = ['template_03_ignored_place', 'starter-2', 'starter-3', 'starter-signals'];
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

export async function getLeaderboardStats(pageSize = 25) {
  logDev(`Fetching leaderboard. Limit: ${pageSize}`);
  const q = query(collection(db, USERS_COLLECTION), orderBy('xp', 'desc'), limit(pageSize));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
