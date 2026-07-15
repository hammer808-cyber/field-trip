import { 
  collection, 
  collectionGroup, 
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
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { authenticatedFetch } from '../lib/api';
import firebaseConfig from '../../firebase-applet-config.json';
import { Entry } from '../constants';
import { ProofReview, ProofStatus } from '../types/proof';
import { uploadBase64Image } from './storageService';
import { evaluateProof } from './proofService';
import {
  getCanonicalChallengeId,
  getCanonicalImageUrl,
  getCanonicalStoragePath,
  getCanonicalUserId,
  isKnownProofStatusValue,
  normalizeProofStatus,
  normalizeCanonicalSubmission,
  markCanonicalSubmissionPending,
  transitionProofReview,
  repairCanonicalProofQueue,
  type ProofTransitionReviewMetadata,
  type QueueRepairReport
} from './proofLifecycleService';
import { getMissionSubmissionContext, normalizeDeckSubtitleForEntry } from '../logic/missionSubmission';

// COLLECTION NAMES
const ENTRIES_COLLECTION = 'entries';
const REVIEWS_COLLECTION = 'proofReviews';
const USERS_COLLECTION = 'users';

export interface AdminReviewQueueDiagnostics {
  projectId: string;
  environment: string;
  queryPaths: string[];
  statusFilter: 'pending_review' | 'approved' | 'rejected' | 'needs_more_proof';
  entriesTotalBeforeFiltering: number;
  proofReviewsTotalBeforeFiltering: number;
  mergedTotalAfterFiltering: number;
  failedOrIncompleteCount: number;
  missingRequiredFieldsCount: number;
  missingImageReferenceCount: number;
  missingLinkageCount: number;
  unresolvedCanonicalEntryCount: number;
  invalidStatusCount: number;
  statusCounts: Record<'pending_review' | 'approved' | 'rejected' | 'needs_more_proof', number>;
  excluded: Array<{ id: string; source: 'entry' | 'proofReview'; status: string; normalizedStatus: string; reason: string }>;
  unresolvedCanonicalEntries: Array<{
    reviewId: string;
    attemptedEntryId: string;
    userId: string;
    sourcePath: string;
    sourceCollection: 'entries' | 'proofReviews';
    aliases: string[];
    reason: string;
  }>;
  reviewableButNotRendered: string[];
  errors: Array<{ source: 'entries' | 'proofReviews' | 'collectionGroup'; message: string; code?: string }>;
  updatedAt: string;
}

export interface StarterBypassReport {
  success: boolean;
  targetUid: string;
  starterApprovedCount: number;
  unlocked: string[];
  message: string;
}

export interface OrphanSlotReport {
  success: boolean;
  dryRun: boolean;
  scannedProofReviews: number;
  createdEntries: Array<{ id: string; reviewId: string; userId: string; challengeId: string; status: string }>;
  linkedReviews: Array<{ reviewId: string; entryId: string }>;
  skippedExisting: Array<{ reviewId: string; entryId: string }>;
  ambiguousRecords: Array<{ reviewId: string; entryId: string; reasons: string[] }>;
}

export interface AdminProofReviewActionContext {
  reviewId?: string | null;
  proofReviewId?: string | null;
  proofId?: string | null;
  submissionId?: string | null;
  sourcePath?: string | null;
  sourceCollection?: string | null;
  idAliases?: string[];
}

function createEmptyDiagnostics(
  statusFilter: AdminReviewQueueDiagnostics['statusFilter']
): AdminReviewQueueDiagnostics {
  return {
    projectId: firebaseConfig.projectId || 'unknown',
    environment: import.meta.env.MODE || (import.meta.env.DEV ? 'development' : 'production'),
    queryPaths: [ENTRIES_COLLECTION, REVIEWS_COLLECTION, `**/${ENTRIES_COLLECTION}`, `**/${REVIEWS_COLLECTION}`],
    statusFilter,
    entriesTotalBeforeFiltering: 0,
    proofReviewsTotalBeforeFiltering: 0,
    mergedTotalAfterFiltering: 0,
    failedOrIncompleteCount: 0,
    missingRequiredFieldsCount: 0,
    missingImageReferenceCount: 0,
    missingLinkageCount: 0,
    unresolvedCanonicalEntryCount: 0,
    invalidStatusCount: 0,
    statusCounts: {
      pending_review: 0,
      approved: 0,
      rejected: 0,
      needs_more_proof: 0
    },
    excluded: [],
    unresolvedCanonicalEntries: [],
    reviewableButNotRendered: [],
    errors: [],
    updatedAt: new Date().toISOString()
  };
}

function timestampMillis(value: any): number {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function sortNewestFirst<T extends Record<string, any>>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => timestampMillis(b.createdAt || b.submittedAt || b.updatedAt) - timestampMillis(a.createdAt || a.submittedAt || a.updatedAt)
  );
}

function cleanId(value: any): string {
  return String(value || '').trim();
}

function pathTail(value: any): string {
  const raw = cleanId(value);
  if (!raw) return '';
  return raw.split('/').filter(Boolean).pop() || raw;
}

function uniqueIds(values: any[]): string[] {
  return Array.from(new Set(values.map(cleanId).filter(Boolean)));
}

function collectReviewEntryAliases(docId: string, data: any, source: 'entry' | 'proofReview'): string[] {
  const explicitAliases = [
    data.entryId,
    data.sourceEntryId,
    data.canonicalEntryId,
    data.entryRef,
    data.entryPath,
    data.review?.entryId,
    data.proof?.entryId,
  ].map(pathTail);

  if (source === 'entry') {
    explicitAliases.push(docId, data.id, data.submissionId);
  } else {
    explicitAliases.push(data.submissionId, data.proofId);
    // proofReviews often mirror their own review id into `id`, so only use it
    // as an entry alias when it is not just the review document id.
    if (cleanId(data.id) && cleanId(data.id) !== docId && cleanId(data.id) !== cleanId(data.reviewId)) {
      explicitAliases.push(data.id);
    }
  }

  return uniqueIds(explicitAliases);
}

function buildRootEntryIndex(records: any[]): Map<string, any> {
  const index = new Map<string, any>();
  records.forEach(record => {
    const sourcePath = cleanId(record.__path) || `entries/${record.id}`;
    if (sourcePath !== `entries/${record.id}`) return;
    index.set(cleanId(record.id), record);
    if (cleanId(record.entryId)) index.set(cleanId(record.entryId), record);
  });
  return index;
}

function resolveQueueEntryLink(
  docId: string,
  data: any,
  source: 'entry' | 'proofReview',
  rootEntryIndex: Map<string, any>
) {
  const aliases = collectReviewEntryAliases(docId, data, source);
  const matchingEntries = new Map<string, any>();
  aliases.forEach(alias => {
    const match = rootEntryIndex.get(alias);
    if (match) matchingEntries.set(cleanId(match.id), match);
  });

  const sourcePath = cleanId(data.__path) || `${source === 'entry' ? 'entries' : 'proofReviews'}/${docId}`;
  if (source === 'entry' && sourcePath === `entries/${docId}`) {
    return {
      resolved: true,
      entryId: docId,
      entryPath: sourcePath,
      aliases: uniqueIds([docId, ...aliases]),
      reason: 'root_entry_source'
    };
  }

  if (matchingEntries.size === 1) {
    const [entryId] = Array.from(matchingEntries.keys());
    return {
      resolved: true,
      entryId,
      entryPath: `entries/${entryId}`,
      aliases,
      reason: 'single_alias_match'
    };
  }

  return {
    resolved: false,
    entryId: aliases[0] || '',
    entryPath: '',
    aliases,
    reason: matchingEntries.size > 1
      ? `ambiguous_entry_aliases:${Array.from(matchingEntries.keys()).join(',')}`
      : source === 'entry'
        ? `non_root_or_missing_entry_path:${sourcePath}`
        : 'missing_source_entry'
  };
}

function normalizeReviewQueueRecord(
  docId: string,
  data: any,
  source: 'entry' | 'proofReview',
  rootEntryIndex: Map<string, any>
): Entry {
  const resolution = resolveQueueEntryLink(docId, data, source, rootEntryIndex);
  const reviewId = source === 'proofReview' ? (data.reviewId || data.id || docId) : (data.proofReviewId || data.proofCheckId || '');
  const entryId = resolution.entryId;
  return {
    ...data,
    id: entryId || `${source}:${docId}`,
    entryId,
    reviewId,
    proofReviewId: reviewId,
    sourceDocumentId: docId,
    sourcePath: data.__path || `${source === 'proofReview' ? REVIEWS_COLLECTION : ENTRIES_COLLECTION}/${docId}`,
    sourceCollection: source === 'proofReview' ? REVIEWS_COLLECTION : ENTRIES_COLLECTION,
    idAliases: resolution.aliases,
    canonicalEntryResolved: resolution.resolved,
    canonicalEntryPath: resolution.entryPath || null,
    canonicalEntryResolutionReason: resolution.reason,
    attemptedEntryId: entryId || resolution.aliases[0] || '',
    userId: data.userId || data.uid || '',
    uid: data.uid || data.userId || '',
    displayName: data.displayName || data.userName || data.username || 'Unknown scout',
    userName: data.userName || data.displayName || data.username || 'Unknown scout',
    missionId: data.missionId || data.challengeId || data.tripId || '',
    challengeId: data.challengeId || data.missionId || data.tripId || '',
    tripId: data.tripId || data.missionId || data.challengeId || '',
    missionTitle: data.missionTitle || data.challengeTitle || data.tripTitle || 'Untitled adventure',
    tripTitle: data.tripTitle || data.missionTitle || data.challengeTitle || 'Untitled adventure',
    photoUrl: data.photoUrl || data.imageUrl || data.proofImage || data.mediaUrl || '',
    imageUrl: data.imageUrl || data.photoUrl || data.proofImage || data.mediaUrl || '',
    proofImage: data.proofImage || data.photoUrl || data.imageUrl || data.mediaUrl || '',
    fieldNote: data.fieldNote || data.note || data.caption || '',
    status: normalizeProofStatus(data.status),
    reviewStatus: normalizeProofStatus(data.reviewStatus || data.status),
    queueSource: source
  } as Entry;
}

function mergeReviewQueueRecords(entries: Entry[], reviews: Entry[]): Entry[] {
  const byEntryId = new Map<string, Entry>();

  entries.forEach(entry => {
    byEntryId.set(((entry as any).entryId || entry.id) as string, entry);
  });

  reviews.forEach(review => {
    const key = ((review as any).entryId || review.id) as string;
    const existing = byEntryId.get(key);
    if (existing) {
      byEntryId.set(key, { ...review, ...existing, proofReviewId: (review as any).proofReviewId || (existing as any).proofReviewId } as Entry);
    }
  });

  return sortNewestFirst(Array.from(byEntryId.values()));
}

// Log message only in development
function logDev(message: string, ...args: any[]) {
  if (import.meta.env.DEV) {
    console.log(`[SUBMISSION_PIPELINE] ${message}`, ...args);
  }
}

async function readAdminResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || payload.error || fallbackMessage);
  }
  return payload as T;
}

export async function grantStarterSignalsBypass(targetUid: string, reason = 'Admin Starter Signals bypass.'): Promise<StarterBypassReport> {
  const response = await authenticatedFetch('/api/admin/grant-starter-bypass', {
    method: 'POST',
    body: JSON.stringify({ targetUid, reason })
  });
  return readAdminResponse<StarterBypassReport>(response, `Starter bypass failed with HTTP ${response.status}`);
}

export async function slotOrphanProofReviews(dryRun = true): Promise<OrphanSlotReport> {
  const response = await authenticatedFetch('/api/admin/slot-orphan-proof-reviews', {
    method: 'POST',
    body: JSON.stringify({ dryRun })
  });
  return readAdminResponse<OrphanSlotReport>(response, `Orphan proof slotting failed with HTTP ${response.status}`);
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
  trip: {
    id: string;
    title: string;
    basePoints?: number;
    theAsk?: string;
    deckId?: string;
    deckName?: string;
    deckSubtitle?: string;
    cardType?: 'Signal' | 'Proof' | 'Crew' | 'Receipt' | 'Lore';
  },
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
    deckName?: string;
    deckSubtitle?: string;
    cardType?: 'Signal' | 'Proof' | 'Crew' | 'Receipt' | 'Lore';
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
  const submissionContext = getMissionSubmissionContext(trip as any, {
    deckId: entryData.deckId || trip.deckId || 'starter-signals',
    deckName: entryData.deckName || trip.deckName || trip.deckId || 'Starter Signals',
    deckSubtitle: entryData.deckSubtitle || trip.deckSubtitle,
    cardType: entryData.cardType || trip.cardType,
  });
  
  // Set initial document
  const canonicalEntry: Entry = {
    id: entryId,
    entryId: entryId,
    userId: userId,
    uid: userId, 
    displayName: userName,
    username: userName, // snapshot
    ...submissionContext,
    deckSubtitle: normalizeDeckSubtitleForEntry(submissionContext.deckSubtitle),
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
  await markCanonicalSubmissionPending(entryId, canonicalEntry);
  console.log("[NewUserSubmit] entry created");
  logDev(`Canonical entry written once to Firestore under ID: ${entryId}`);

  // AI analysis and proofReviews are projections only. The canonical entry above
  // is already persisted and validated, so these can never decide queue visibility.
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

    console.log("[NewUserSubmit] proofReview audit create started");
    try {
      await createAdminReview(aiReview.id, entryId, {
        userId,
        challengeId: trip.id,
        missionId: trip.id,
        deckId: canonicalEntry.deckId,
        deckName: canonicalEntry.deckName,
        deckSubtitle: canonicalEntry.deckSubtitle,
        cardType: canonicalEntry.cardType,
        missionTitle: trip.title,
        challengeTitle: trip.title,
        tripTitle: trip.title,
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
      console.log("[NewUserSubmit] proofReview audit created");
    } catch (reviewErr) {
      console.warn('[SUBMISSION_PIPELINE] proofReviews audit write failed; canonical entry remains reviewable:', reviewErr);
    }
    console.log("[NewUserSubmit] status saved");
    console.log("[NewUserSubmit] photoUrl saved");

  } catch (err: any) {
    console.error('[SUBMISSION_PIPELINE] Non-blocking AI evaluation failure:', err);
    await updateDoc(docRef, {
      proofCheckId: `entry_${entryId}_manual_review`,
      aiRecommendation: 'pending_review',
      aiAnalysisStatus: 'failed',
      adminNotes: 'AI offline. Defaulting directly to admin queue.',
      updatedAt: serverTimestamp()
    });

    // Create backup proofReview document if AI service fails. This is not required
    // for the admin queue; entries remains the canonical queue source.
    const backupReviewId = `rev_fail_${Date.now()}`;
    
    console.log("[NewUserSubmit] proofReview fallback audit create started");
    try {
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
      console.log("[NewUserSubmit] proofReview fallback audit created");
    } catch (reviewErr) {
      console.warn('[SUBMISSION_PIPELINE] fallback proofReviews audit write failed; canonical entry remains reviewable:', reviewErr);
    }
    console.log("[NewUserSubmit] status saved");
    console.log("[NewUserSubmit] photoUrl saved");
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
  notes?: string,
  metadata?: ProofTransitionReviewMetadata
) {
  logDev(`Updating submission ${submissionId} to status: ${status}. Notes: ${notes}`);
  return transitionProofReview(submissionId, status, notes || '', metadata);
}

import { awardSubmissionPointsOnce } from './submission-utils';
export { awardSubmissionPointsOnce };

async function submitAdminProofReviewAction(
  submissionId: string,
  action: 'approve' | 'request_info' | 'reject',
  notes: string,
  metadata?: ProofTransitionReviewMetadata,
  context: AdminProofReviewActionContext = {}
) {
  const response = await authenticatedFetch('/api/admin/proof-review/action', {
    method: 'POST',
    body: JSON.stringify({
      entryId: submissionId,
      submissionId,
      proofId: context.proofId || null,
      reviewId: context.reviewId || context.proofReviewId || null,
      sourcePath: context.sourcePath || null,
      sourceCollection: context.sourceCollection || null,
      aliases: context.idAliases || [],
      action,
      notes,
      metadata: metadata || {}
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err: any = new Error(payload?.error || payload?.message || `REVIEW_ACTION_FAILED_${response.status}`);
    err.details = payload?.details || null;
    throw err;
  }
  return payload;
}

/**
 * 6. Approve submission wrapper.
 */
export async function approveSubmission(
  submissionId: string,
  notes: string,
  metadata?: ProofTransitionReviewMetadata,
  context?: AdminProofReviewActionContext
) {
  logDev(`Approving submission ${submissionId}`);
  return submitAdminProofReviewAction(submissionId, 'approve', notes, metadata, context);
}

/**
 * 7. Request more proof wrapper.
 */
export async function requestMoreProof(
  submissionId: string,
  notes: string,
  metadata?: ProofTransitionReviewMetadata,
  context?: AdminProofReviewActionContext
) {
  logDev(`Requesting more proof for ${submissionId}`);
  return submitAdminProofReviewAction(submissionId, 'request_info', notes, metadata, context);
}

/**
 * 8. Reject submission wrapper.
 */
export async function rejectSubmission(
  submissionId: string,
  notes: string,
  metadata?: ProofTransitionReviewMetadata,
  context?: AdminProofReviewActionContext
) {
  logDev(`Rejecting submission ${submissionId}`);
  return submitAdminProofReviewAction(submissionId, 'reject', notes, metadata, context);
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
  onError?: (err: any) => void,
  onDiagnostics?: (diagnostics: AdminReviewQueueDiagnostics) => void
) {
  logDev(`Subscribing to canonical administrative proof queue for filtered status: ${statusFilter}`);
  console.log("[AdminQueue] canonical collection-group query started", { statusFilter, projectId: firebaseConfig.projectId });

  let rawEntriesForQueue: any[] = [];
  let rawReviewsForQueue: any[] = [];
  let monitorEntriesForDiagnostics: any[] = [];
  let rawReviewsForDiagnostics: any[] = [];
  let entriesReady = false;
  let monitorReady = false;
  let reviewsReady = false;
  let rawEntriesCount = 0;
  let monitorEntriesCount = 0;
  let rawReviewsCount = 0;
  const errors: AdminReviewQueueDiagnostics['errors'] = [];
  const excluded = new Map<string, AdminReviewQueueDiagnostics['excluded'][number]>();

  const emit = () => {
    if (!entriesReady || !reviewsReady || !monitorReady) return;
    const rootEntryIndex = buildRootEntryIndex(monitorEntriesForDiagnostics);
    const latestEntries = rawEntriesForQueue.map(entry => normalizeReviewQueueRecord(entry.id, entry, 'entry', rootEntryIndex));
    const latestReviews = rawReviewsForQueue.map(review => normalizeReviewQueueRecord(review.id, review, 'proofReview', rootEntryIndex));
    const merged = mergeReviewQueueRecords(latestEntries, latestReviews);
    const renderedIds = new Set(merged.map(item => String((item as any).entryId || item.id)));
    const diagnostics = createEmptyDiagnostics(statusFilter);
    diagnostics.entriesTotalBeforeFiltering = monitorEntriesCount || rawEntriesCount;
    diagnostics.proofReviewsTotalBeforeFiltering = rawReviewsCount;
    diagnostics.mergedTotalAfterFiltering = merged.length;
    diagnostics.errors = [...errors];
    diagnostics.excluded = Array.from(excluded.values()).slice(0, 80);
    [...monitorEntriesForDiagnostics, ...rawReviewsForDiagnostics].forEach(record => {
      if (record?.archived === true) return;
      const rawStatus = (record as any).status || (record as any).reviewStatus || (record as any).submissionStatus || (record as any).proofStatus;
      const status = normalizeProofStatus(rawStatus);
      const rawStatusText = String(rawStatus || '').toLowerCase().trim();
      diagnostics.statusCounts[status] += 1;
      if (rawStatusText === 'submission_failed' || rawStatusText === 'upload_incomplete' || rawStatusText === 'uploading' || rawStatusText === 'draft') {
        diagnostics.failedOrIncompleteCount += 1;
      }
      if (!isKnownProofStatusValue(rawStatus)) {
        diagnostics.invalidStatusCount += 1;
      }
      if (!getCanonicalImageUrl(record) && !getCanonicalStoragePath(record)) {
        diagnostics.missingImageReferenceCount += 1;
      }
      if (!getCanonicalUserId(record) || !getCanonicalChallengeId(record) || !(record as any).deckId) {
        diagnostics.missingLinkageCount += 1;
      }
      const source = (record as any).__path?.includes('/proofReviews/') || (record as any).__path?.startsWith('proofReviews/') ? 'proofReview' : 'entry';
      const resolution = resolveQueueEntryLink(String((record as any).id || ''), record, source, rootEntryIndex);
      if (!resolution.resolved) {
        diagnostics.unresolvedCanonicalEntryCount += 1;
        if (diagnostics.unresolvedCanonicalEntries.length < 40) {
          diagnostics.unresolvedCanonicalEntries.push({
            reviewId: String((record as any).reviewId || (source === 'proofReview' ? (record as any).id : (record as any).proofReviewId) || ''),
            attemptedEntryId: resolution.entryId || resolution.aliases[0] || '',
            userId: getCanonicalUserId(record),
            sourcePath: String((record as any).__path || `${source === 'proofReview' ? REVIEWS_COLLECTION : ENTRIES_COLLECTION}/${(record as any).id}`),
            sourceCollection: source === 'proofReview' ? 'proofReviews' : 'entries',
            aliases: resolution.aliases,
            reason: resolution.reason
          });
        }
      }
      if (!rawStatus || (!getCanonicalImageUrl(record) && !getCanonicalStoragePath(record)) || !getCanonicalUserId(record) || !getCanonicalChallengeId(record) || !(record as any).deckId) {
        diagnostics.missingRequiredFieldsCount += 1;
      }
      const entryId = String((record as any).entryId || (record as any).id || '');
      if (status === statusFilter && entryId && !renderedIds.has(entryId)) {
        diagnostics.reviewableButNotRendered.push(entryId);
      }
    });
    console.log("[AdminQueue] merged documents returned", merged.length);
    console.log("[AdminQueue] diagnostics", diagnostics);
    onDiagnostics?.(diagnostics);
    callback(merged);
  };

  // Do not filter the admin queue by raw Firestore status. Older/mobile
  // submission paths have used variants such as pendingReview or
  // submitted_pending_review; the queue must use the canonical normalizer.
  const entryQuery = query(
    collectionGroup(db, ENTRIES_COLLECTION),
    limit(500)
  );

  const monitorEntryQuery = query(
    collectionGroup(db, ENTRIES_COLLECTION),
    limit(500)
  );

  const reviewQuery = query(
    collectionGroup(db, REVIEWS_COLLECTION),
    limit(500)
  );

  const unsubEntries = onSnapshot(entryQuery, (snap) => {
    const rawEntries = snap.docs.map(doc => ({ ...doc.data(), id: doc.id, __path: doc.ref.path } as unknown as Entry));
    rawEntriesCount = rawEntries.length;
    console.log("[AdminQueue] canonical entry-group docs returned", rawEntries.length);

    rawEntriesForQueue = rawEntries.filter(e => {
      const normalizedStatus = normalizeProofStatus((e as any).status || (e as any).reviewStatus);
      const isArchived = e.archived === true;
      if (isArchived) {
        excluded.set(`entry:${e.id}:archived`, {
          id: e.id,
          source: 'entry',
          status: String((e as any).status || 'missing'),
          normalizedStatus,
          reason: 'archived'
        });
        return false;
      }
      if (normalizedStatus !== statusFilter) {
        excluded.set(`entry:${e.id}:status`, {
          id: e.id,
          source: 'entry',
          status: String((e as any).status || 'missing'),
          normalizedStatus,
          reason: `status ${normalizedStatus} does not match active tab ${statusFilter}`
        });
        return false;
      }
      return true;
    });

    entriesReady = true;
    emit();
  }, (err) => {
    entriesReady = true;
    console.error('[SUBMISSION_PIPELINE] Error loading admin entry reviews:', err);
    errors.push({ source: 'collectionGroup', message: `entries: ${err?.message || String(err)}`, code: err?.code });
    if (onError) onError(err);
    emit();
  });

  const unsubMonitorEntries = onSnapshot(monitorEntryQuery, (snap) => {
    monitorEntriesForDiagnostics = snap.docs.map(doc => ({ ...doc.data(), id: doc.id, __path: doc.ref.path }));
    monitorEntriesCount = monitorEntriesForDiagnostics.length;
    monitorReady = true;
    emit();
  }, (err) => {
    monitorReady = true;
    console.error('[SUBMISSION_PIPELINE] Error loading admin queue monitor:', err);
    errors.push({ source: 'collectionGroup', message: `entries monitor: ${err?.message || String(err)}`, code: err?.code });
    emit();
  });

  const unsubReviews = onSnapshot(reviewQuery, (snap) => {
    const rawReviews = snap.docs.map(doc => ({ ...doc.data(), id: doc.id, __path: doc.ref.path }));
    rawReviewsForDiagnostics = rawReviews;
    rawReviewsCount = rawReviews.length;
    rawReviewsForQueue = rawReviews
      .filter(review => {
        const normalizedStatus = normalizeProofStatus((review as any).status || (review as any).reviewStatus);
        if ((review as any).archived === true) {
          excluded.set(`proofReview:${review.id}:archived`, {
            id: review.id,
            source: 'proofReview',
            status: String((review as any).status || (review as any).reviewStatus || 'missing'),
            normalizedStatus,
            reason: 'archived'
          });
          return false;
        }
        if (normalizedStatus !== statusFilter) {
          excluded.set(`proofReview:${review.id}:status`, {
            id: review.id,
            source: 'proofReview',
            status: String((review as any).status || (review as any).reviewStatus || 'missing'),
            normalizedStatus,
            reason: `status ${normalizedStatus} does not match active tab ${statusFilter}`
          });
          return false;
        }
        return true;
      });
    console.log("[AdminQueue] proofReviews returned", rawReviewsForQueue.length);
    reviewsReady = true;
    emit();
  }, (err) => {
    reviewsReady = true;
    console.error('[SUBMISSION_PIPELINE] Error loading proofReviews queue:', err);
    errors.push({ source: 'collectionGroup', message: `proofReviews: ${err?.message || String(err)}`, code: err?.code });
    if (onError) onError(err);
    emit();
  });

  return () => {
    unsubEntries();
    unsubMonitorEntries();
    unsubReviews();
  };
}

export async function runCanonicalProofQueueRepair(dryRun = true): Promise<QueueRepairReport> {
  return repairCanonicalProofQueue(dryRun);
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
