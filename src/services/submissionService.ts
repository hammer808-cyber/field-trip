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
import { normalizeEntryStatus } from '../logic/entryLogic';
import { ProofScoringSelections } from '../utils/proofScoring';

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

function resolveAdminImageFields(entryData: any = {}, reviewData: any = {}) {
  const entryUrl = firstString(
    entryData.photoUrl,
    entryData.imageUrl,
    entryData.mediaUrl,
    entryData.proofImageUrl,
    entryData.proofImage,
    Array.isArray(entryData.imageUrls) ? entryData.imageUrls[0] : ''
  );
  const reviewUrl = firstString(
    reviewData.photoUrl,
    reviewData.imageUrl,
    reviewData.mediaUrl,
    reviewData.proofImageUrl,
    reviewData.proofImage,
    Array.isArray(reviewData.imageUrls) ? reviewData.imageUrls[0] : ''
  );
  const entryPath = firstString(
    entryData.storagePath,
    entryData.imageStoragePath,
    entryData.photoStoragePath,
    entryData.proofImageRef,
    entryData.proofStoragePath
  );
  const reviewPath = firstString(
    reviewData.storagePath,
    reviewData.imageStoragePath,
    reviewData.photoStoragePath,
    reviewData.proofImageRef,
    reviewData.proofStoragePath
  );
  const photoUrl = entryUrl || reviewUrl;
  const storagePath = entryPath || reviewPath;
  const source = entryUrl || entryPath
    ? (reviewData?.id || reviewData?.entryId ? 'entry + proofReview' : 'entry')
    : reviewUrl || reviewPath
      ? 'orphaned proofReview'
      : 'missing';
  return {
    photoUrl,
    imageUrl: photoUrl,
    mediaUrl: photoUrl,
    proofImage: photoUrl,
    proofImageUrl: photoUrl,
    storagePath,
    imageStoragePath: storagePath,
    photoStoragePath: storagePath,
    adminQueueSource: source,
    imageResolutionSource: source,
    imageDiagnosticLabel: source === 'entry + proofReview'
      ? 'Source: entry + proofReview'
      : source === 'entry'
        ? 'Source: entry'
        : source === 'orphaned proofReview'
          ? 'Source: orphaned proofReview'
          : 'Image missing from review; checked linked entry'
  };
}

function makeReviewLookupKeys(review: any): string[] {
  return [
    review.entryId,
    review.id,
    typeof review.id === 'string' ? review.id.replace(/^rev_/, '') : '',
    review.reviewId,
  ].filter(Boolean);
}

function getEntryMissionKey(entry: any): string {
  return String(entry?.tripId || entry?.missionId || entry?.challengeId || '').toLowerCase().trim();
}

function getReviewMissionKey(review: any): string {
  return String(review?.tripId || review?.missionId || review?.challengeId || '').toLowerCase().trim();
}

function getEntryUserKey(entry: any): string {
  return String(entry?.userId || entry?.uid || entry?.firebaseUid || '').toLowerCase().trim();
}

function getReviewUserKey(review: any): string {
  return String(review?.userId || review?.uid || review?.firebaseUid || '').toLowerCase().trim();
}

function findReviewForEntry(entry: any, reviews: any[]): any | null {
  const entryId = entry.id;
  const proofCheckId = entry.proofCheckId;
  const directMatch = reviews.find(review => {
    const keys = makeReviewLookupKeys(review);
    return keys.includes(entryId) || (!!proofCheckId && keys.includes(proofCheckId));
  });
  if (directMatch) return directMatch;

  const entryMissionKey = getEntryMissionKey(entry);
  const entryUserKey = getEntryUserKey(entry);
  if (!entryMissionKey || !entryUserKey) return null;

  return reviews.find(review => {
    return getReviewMissionKey(review) === entryMissionKey && getReviewUserKey(review) === entryUserKey;
  }) || null;
}

function getReviewQueueStatus(review: any): string {
  const reviewStatus = review?.reviewStatus;
  if (reviewStatus && reviewStatus !== 'completed') return reviewStatus;

  const aiRecommendation = review?.aiRecommendation;
  if (aiRecommendation && aiRecommendation !== 'completed') return aiRecommendation;

  if (review?.needsManualReview === true) return 'pending_review';

  return review?.status || reviewStatus || aiRecommendation || '';
}

function hasProofMedia(record: any): boolean {
  return !!firstString(
    record?.photoUrl,
    record?.imageUrl,
    record?.mediaUrl,
    record?.proofImageUrl,
    record?.proofImage,
    record?.originalImageUrl,
    Array.isArray(record?.imageUrls) ? record.imageUrls[0] : '',
    record?.storagePath,
    record?.imageStoragePath,
    record?.photoStoragePath,
    record?.proofImageRef,
    record?.proofStoragePath
  );
}

function isXpAwarded(record: any): boolean {
  if (record?.xpAwarded === true) return true;
  if (record?.pointsAwarded === true) return true;
  if (typeof record?.pointsAwarded === 'number' && record.pointsAwarded > 0) return true;
  if (typeof record?.awardedXP === 'number' && record.awardedXP > 0) return true;
  if (typeof record?.awardedPoints === 'number' && record.awardedPoints > 0) return true;
  return false;
}

function isExplicitFinalStatus(status: unknown): boolean {
  const s = typeof status === 'string' ? status.toLowerCase().trim() : '';
  return [
    'approved',
    'approved_by_admin',
    'auto_approved',
    'verified',
    'rejected',
    'denied',
    'auto_rejected',
    'needs_more_proof',
    'needs-more-proof',
    'needs_more_proof_requested',
    'resubmit_requested',
    'awaiting_purge',
    'purged',
    'archived'
  ].includes(s);
}

function shouldShowAsPendingUnawardedProof(entry: any, linkedReview: any | null): boolean {
  if (entry?.archived === true) return false;
  if (isXpAwarded(entry) || isXpAwarded(linkedReview)) return false;

  const entryStatusRaw = entry?.status;
  const reviewStatusRaw = linkedReview ? getReviewQueueStatus(linkedReview) : '';
  if (isExplicitFinalStatus(entryStatusRaw) || isExplicitFinalStatus(reviewStatusRaw)) return false;

  return hasProofMedia(entry) || hasProofMedia(linkedReview);
}

function getStatusSummary(records: any[], label: 'entry' | 'proofReview'): Record<string, number> {
  return records.reduce((summary, record) => {
    const rawStatus = label === 'proofReview' ? getReviewQueueStatus(record) : record?.status;
    const key = `${String(rawStatus || 'missing')} -> ${normalizeEntryStatus(rawStatus)}`;
    summary[key] = (summary[key] || 0) + 1;
    return summary;
  }, {} as Record<string, number>);
}

function hydrateAdminQueueEntry(entry: any, linkedReview: any | null): any {
  const imageFields = resolveAdminImageFields(entry, linkedReview || {});
  const normalizedEntryStatus = normalizeEntryStatus(entry.status);
  const normalizedReviewStatus = linkedReview ? normalizeEntryStatus(getReviewQueueStatus(linkedReview)) : null;
  return {
    ...entry,
    status: normalizedReviewStatus || normalizedEntryStatus,
    entryStatus: normalizedEntryStatus,
    reviewStatus: normalizedReviewStatus || entry.reviewStatus || normalizedEntryStatus,
    proofReview: linkedReview || null,
    proofReviewId: linkedReview?.id || null,
    reviewId: linkedReview?.id || null,
    reviewNotes: linkedReview?.reviewNotes || entry.adminNotes || entry.reviewNotes || '',
    confidenceScore: linkedReview?.confidenceScore || entry.confidenceScore || entry.aiScore || 100,
    aiAnalysisResult: entry.aiAnalysisResult || linkedReview?.aiAnalysisResult || null,
    missingRequirements: entry.missingRequirements || linkedReview?.missingRequirements || linkedReview?.aiAnalysisResult?.missingItems || [],
    ...imageFields
  };
}

function hydrateOrphanedProofReview(review: any): any {
  const entryId = review.entryId || (typeof review.id === 'string' ? review.id.replace(/^rev_/, '') : review.id);
  const normalizedStatus = normalizeEntryStatus(getReviewQueueStatus(review));
  const imageFields = resolveAdminImageFields({}, review);
  return {
    ...review,
    ...imageFields,
    id: entryId || review.id,
    entryId: entryId || review.entryId || review.id,
    status: normalizedStatus,
    entryStatus: null,
    reviewStatus: normalizedStatus,
    proofReview: review,
    proofReviewId: review.id,
    reviewId: review.id,
    adminQueueSource: 'orphaned proofReview',
    reviewNotes: review.reviewNotes || review.adminNotes || '',
    confidenceScore: review.confidenceScore || review.aiScore || 100,
    aiAnalysisResult: review.aiAnalysisResult || null,
    missingRequirements: review.missingRequirements || review.aiAnalysisResult?.missingItems || []
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

export async function approveSubmission(submissionId: string, notes: string, scoringSelections?: ProofScoringSelections) {
  logDev(`Approving submission ${submissionId}`);
  return reviewSubmission(submissionId, 'approved', notes, scoringSelections);
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
  logDev(`Subscribing to administrative entries queue for normalized status: ${statusFilter}`);

  console.log('[AdminQueue] entries source-of-truth query started');
  console.log('[AdminQueue] normalized status filter', statusFilter);
  const q = query(collection(db, ENTRIES_COLLECTION), orderBy('createdAt', 'desc'), limit(500));

  return onSnapshot(q, async (snap) => {
    const rawEntries = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Entry));
    console.log('[AdminQueue] entry documents returned', rawEntries.length);
    console.log('[AdminQueue] entry status summary', getStatusSummary(rawEntries, 'entry'));

    let proofReviewDocs: any[] = [];
    try {
      const reviewQuery = query(collection(db, REVIEWS_COLLECTION), orderBy('createdAt', 'desc'), limit(1000));
      const reviewSnap = await getDocs(reviewQuery);
      proofReviewDocs = reviewSnap.docs.map(reviewDoc => ({ id: reviewDoc.id, ...reviewDoc.data() } as any));
      console.log('[AdminQueue] proofReview metadata documents returned', proofReviewDocs.length);
      console.log('[AdminQueue] proofReview status summary', getStatusSummary(proofReviewDocs, 'proofReview'));
    } catch (err: any) {
      console.warn('[AdminQueue] proofReview metadata join skipped:', err.message || err);
    }

    let filteredOutCount = 0;
    let unawardedProofRescueCount = 0;
    const entries = rawEntries.filter(e => {
      const linkedReview = findReviewForEntry(e, proofReviewDocs);
      const isArchived = e.archived === true;
      const entryStatus = normalizeEntryStatus(e.status);
      const linkedReviewStatus = linkedReview ? normalizeEntryStatus(getReviewQueueStatus(linkedReview)) : null;
      const shouldRescuePending = statusFilter === 'pending_review' && shouldShowAsPendingUnawardedProof(e, linkedReview);
      const isStatusMatch = entryStatus === statusFilter || linkedReviewStatus === statusFilter || shouldRescuePending;
      if (shouldRescuePending && entryStatus !== statusFilter && linkedReviewStatus !== statusFilter) {
        unawardedProofRescueCount++;
      }
      if (isArchived || !isStatusMatch) {
        filteredOutCount++;
      }
      return !isArchived && isStatusMatch;
    });

    const hydratedEntries = entries.map(entry => {
      const linkedReview = findReviewForEntry(entry, proofReviewDocs);
      return hydrateAdminQueueEntry(entry, linkedReview);
    });

    const orphanedProofReviews = proofReviewDocs.filter(review => {
      const hasLinkedEntry = rawEntries.some(entry => findReviewForEntry(entry, [review]));
      return !hasLinkedEntry && normalizeEntryStatus(getReviewQueueStatus(review)) === statusFilter;
    });

    if (orphanedProofReviews.length > 0) {
      console.warn('[AdminQueue] orphaned proofReviews included as review-backed queue items', orphanedProofReviews.map(r => ({ id: r.id, entryId: r.entryId, status: getReviewQueueStatus(r) })));
    }

    const queueEntries = [
      ...hydratedEntries,
      ...orphanedProofReviews.map(hydrateOrphanedProofReview)
    ];

    console.log('[AdminQueue] filtered out entry count', filteredOutCount);
    console.log('[AdminQueue] unawarded proof rescue count', unawardedProofRescueCount);
    logDev(`Admin queue snapshot loaded. Size: ${queueEntries.length}`);
    callback(queueEntries);
  }, (err) => {
    console.error('[SUBMISSION_PIPELINE] Error loading admin entries queue:', err);
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
