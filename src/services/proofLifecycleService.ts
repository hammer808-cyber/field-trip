import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Entry } from '../types/game';
import { normalizeEntryStatus } from '../logic/entryLogic';
import { awardSubmissionPointsOnce } from './submission-utils';
import { getProofRubricScoring, type ProofRubricScoring } from '../logic/proofRubric';
import { authenticatedFetch } from '../lib/api';
import firebaseConfig from '../../firebase-applet-config.json';

export type CanonicalProofStatus = 'draft' | 'uploading' | 'pending_review' | 'approved' | 'needs_more_proof' | 'rejected' | 'submission_failed' | 'upload_incomplete';
export type ReviewableProofStatus = 'pending_review' | 'approved' | 'needs_more_proof' | 'rejected';

export interface CanonicalSubmissionValidation {
  valid: boolean;
  missingFields: string[];
  hasImageReference: boolean;
}

export interface ProofTransitionResult {
  success: boolean;
  status: ReviewableProofStatus;
  points?: number;
  reason?: string;
}

export interface ProofReviewRubricInput {
  version: 'v1';
  missionMatch: number;
  proofClarity: number;
  authenticity: number;
  fieldNoteQuality: number;
  fieldtripEnergy: number;
  rawScore: number;
  normalizedScore: number;
  weightedScore: number;
  recommendation: 'strong_approval_candidate' | 'approve_with_judgment' | 'needs_closer_review' | 'likely_insufficient';
  adminOverrideUsed?: boolean;
  adminOverrideReason?: string | null;
}

export interface ProofTransitionReviewMetadata {
  rubric?: ProofReviewRubricInput;
  scoring?: ProofRubricScoring;
}

export const REVIEWABLE_STATUSES: ReviewableProofStatus[] = ['pending_review', 'approved', 'needs_more_proof', 'rejected'];
const KNOWN_PROOF_STATUS_VALUES = new Set([
  'draft',
  'uploading',
  'pending_review',
  'pending-review',
  'submitted_pending_review',
  'resubmitted_pending_review',
  'awaiting_review',
  'needs_review',
  'checking',
  'under_field_check',
  'submitted',
  'pending',
  'resubmitted',
  'retry-submitted',
  'pending_upload',
  'approved',
  'verified',
  'approved_by_admin',
  'auto_approved',
  'completed',
  'retry-approved',
  'needs-more-proof',
  'needsmoreproof',
  'needs_more_proof',
  'resubmit_requested',
  'needs-fix',
  'needs_fix',
  'denied',
  'rejected',
  'auto_rejected',
  'submission_failed',
  'upload_incomplete'
]);

export function normalizeProofStatus(status: unknown): ReviewableProofStatus {
  return normalizeEntryStatus(typeof status === 'string' ? status : undefined);
}

export function isKnownProofStatusValue(status: unknown): boolean {
  if (typeof status !== 'string' || !status.trim()) return false;
  return KNOWN_PROOF_STATUS_VALUES.has(status.toLowerCase().trim());
}

export function isAllowedProofTransition(from: CanonicalProofStatus | undefined, to: ReviewableProofStatus): boolean {
  const current = from || 'draft';
  if (to === 'pending_review') {
    return current === 'draft' || current === 'uploading' || current === 'needs_more_proof' || current === 'submission_failed' || current === 'upload_incomplete';
  }
  if (to === 'approved' || to === 'needs_more_proof' || to === 'rejected') {
    return current === 'pending_review' || current === 'approved' || current === 'needs_more_proof' || current === 'rejected';
  }
  return false;
}

export function getCanonicalSubmissionId(data: any, fallbackId = ''): string {
  return data?.entryId || data?.submissionId || data?.id || fallbackId;
}

function cleanReviewId(value: any): string {
  return String(value || '').trim();
}

function pathTail(value: any): string {
  const raw = cleanReviewId(value);
  if (!raw) return '';
  return raw.split('/').filter(Boolean).pop() || raw;
}

function uniqueIds(values: any[]): string[] {
  return Array.from(new Set(values.map(cleanReviewId).filter(Boolean)));
}

function collectReviewActionAliases(submissionId: string, reviewData: any = {}): string[] {
  const reviewDocId = cleanReviewId(reviewData.reviewId || reviewData.id);
  const aliases = [
    submissionId,
    reviewData.entryId,
    reviewData.sourceEntryId,
    reviewData.canonicalEntryId,
    reviewData.entryRef,
    reviewData.entryPath,
    reviewData.review?.entryId,
    reviewData.proof?.entryId,
    reviewData.submissionId,
    reviewData.proofId,
  ].map(pathTail);

  if (cleanReviewId(reviewData.id) && cleanReviewId(reviewData.id) !== reviewDocId) {
    aliases.push(reviewData.id);
  }

  return uniqueIds(aliases);
}

interface CanonicalEntryResolution {
  entryId: string;
  entryPath: string;
  reviewId: string | null;
  reviewPath: string | null;
  aliases: string[];
  resolvedFrom: 'direct_entry' | 'proof_review_alias';
}

export function getCanonicalChallengeId(data: any): string {
  return (data?.challengeId || data?.missionId || data?.tripId || '').toString().toLowerCase().trim();
}

export function getCanonicalUserId(data: any): string {
  return (data?.userId || data?.uid || data?.firebaseUid || '').toString().trim();
}

export function getCanonicalImageUrl(data: any): string {
  return (data?.photoUrl || data?.imageUrl || data?.proofImage || data?.mediaUrl || data?.proofUrl || '').toString().trim();
}

export function getCanonicalStoragePath(data: any): string {
  return (data?.storagePath || data?.photoStoragePath || data?.imageStoragePath || data?.proofImageRef || '').toString().trim();
}

export function validateCanonicalSubmission(data: any): CanonicalSubmissionValidation {
  const missingFields: string[] = [];
  if (!getCanonicalUserId(data)) missingFields.push('userId');
  if (!getCanonicalChallengeId(data)) missingFields.push('challengeId');
  if (!(data?.deckId || '').toString().trim()) missingFields.push('deckId');
  if (!getCanonicalImageUrl(data) && !getCanonicalStoragePath(data)) missingFields.push('photoUrl/storagePath');
  if (!data?.submittedAt) missingFields.push('submittedAt');
  if (!data?.status) missingFields.push('status');

  return {
    valid: missingFields.length === 0,
    missingFields,
    hasImageReference: !!(getCanonicalImageUrl(data) || getCanonicalStoragePath(data))
  };
}

export function normalizeCanonicalSubmission(docId: string, data: any): Entry {
  const challengeId = getCanonicalChallengeId(data);
  const userId = getCanonicalUserId(data);
  const photoUrl = getCanonicalImageUrl(data);
  const storagePath = getCanonicalStoragePath(data);
  const status = normalizeProofStatus(data?.status || data?.reviewStatus || data?.submissionStatus || data?.proofStatus);

  return {
    ...data,
    id: docId,
    entryId: getCanonicalSubmissionId(data, docId),
    userId,
    uid: data?.uid || userId,
    challengeId,
    missionId: data?.missionId || challengeId,
    tripId: data?.tripId || challengeId,
    deckId: data?.deckId || 'starter-signals',
    seasonId: data?.seasonId || null,
    status,
    reviewStatus: status,
    photoUrl,
    imageUrl: data?.imageUrl || photoUrl,
    proofImage: data?.proofImage || photoUrl,
    storagePath,
    fieldNote: data?.fieldNote || data?.note || data?.caption || '',
    submissionVersion: data?.submissionVersion || 'canonical-entry-v1'
  } as Entry;
}

export async function markCanonicalSubmissionPending(entryRefPathId: string, data: any) {
  const validation = validateCanonicalSubmission({ ...data, status: 'pending_review' });
  if (!validation.valid) {
    throw new Error(`CANONICAL_SUBMISSION_INVALID: ${validation.missingFields.join(', ')}`);
  }

  const entryRef = doc(db, 'entries', entryRefPathId);
  await updateDoc(entryRef, {
    status: 'pending_review',
    reviewStatus: 'pending_review',
    submissionStatus: 'pending_review',
    proofStatus: 'pending_review',
    submissionVersion: 'canonical-entry-v1',
    submissionValidatedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

async function resolveCanonicalEntryForReviewAction(submissionId: string): Promise<CanonicalEntryResolution> {
  const incomingId = cleanReviewId(submissionId);
  const directEntry = incomingId ? await getDoc(doc(db, 'entries', incomingId)) : null;
  if (directEntry?.exists()) {
    return {
      entryId: incomingId,
      entryPath: `entries/${incomingId}`,
      reviewId: null,
      reviewPath: null,
      aliases: [incomingId],
      resolvedFrom: 'direct_entry'
    };
  }

  const reviewSnap = incomingId ? await getDoc(doc(db, 'proofReviews', incomingId)) : null;
  if (reviewSnap?.exists()) {
    const reviewData = reviewSnap.data() || {};
    const aliases = collectReviewActionAliases(incomingId, { ...reviewData, id: reviewSnap.id });
    const matches: string[] = [];
    for (const alias of aliases) {
      const candidateSnap = await getDoc(doc(db, 'entries', alias));
      if (candidateSnap.exists()) matches.push(alias);
    }
    const uniqueMatches = uniqueIds(matches);
    if (uniqueMatches.length === 1) {
      return {
        entryId: uniqueMatches[0],
        entryPath: `entries/${uniqueMatches[0]}`,
        reviewId: reviewSnap.id,
        reviewPath: `proofReviews/${reviewSnap.id}`,
        aliases,
        resolvedFrom: 'proof_review_alias'
      };
    }
    const error: any = new Error(uniqueMatches.length > 1 ? 'ENTRY_AMBIGUOUS' : 'ENTRY_NOT_RESOLVED');
    error.details = {
      actionType: 'review_transition',
      reviewId: reviewSnap.id,
      canonicalEntryId: null,
      incomingSubmissionId: incomingId,
      incomingIdAliases: aliases,
      resolvedFirestorePath: null,
      databaseId: firebaseConfig.firestoreDatabaseId,
      projectId: firebaseConfig.projectId,
      userId: getCanonicalUserId(reviewData),
      failureReason: uniqueMatches.length > 1 ? `multiple_alias_matches:${uniqueMatches.join(',')}` : 'missing_source_entry'
    };
    throw error;
  }

  const error: any = new Error('ENTRY_NOT_RESOLVED');
  error.details = {
    actionType: 'review_transition',
    reviewId: null,
    canonicalEntryId: null,
    incomingSubmissionId: incomingId,
    incomingIdAliases: incomingId ? [incomingId] : [],
    resolvedFirestorePath: null,
    databaseId: firebaseConfig.firestoreDatabaseId,
    projectId: firebaseConfig.projectId,
    userId: null,
    failureReason: 'no_entry_or_review_document_for_incoming_id'
  };
  throw error;
}

export async function transitionProofReview(
  submissionId: string,
  nextStatus: ReviewableProofStatus,
  notes: string,
  metadata: ProofTransitionReviewMetadata = {}
): Promise<ProofTransitionResult> {
  const resolution = await resolveCanonicalEntryForReviewAction(submissionId);
  const canonicalEntryId = resolution.entryId;
  const entryRef = doc(db, 'entries', canonicalEntryId);
  const reviewerId = auth.currentUser?.uid || 'system';
  const baseDiagnostic = {
    actionType: nextStatus,
    reviewId: resolution.reviewId,
    canonicalEntryId,
    incomingSubmissionId: submissionId,
    incomingIdAliases: resolution.aliases,
    resolvedFirestorePath: resolution.entryPath,
    databaseId: firebaseConfig.firestoreDatabaseId,
    projectId: firebaseConfig.projectId,
    reviewerId
  };
  console.info('[ProofLifecycle] Review action resolved canonical entry', baseDiagnostic);
  const rubric = metadata.rubric
    ? {
        ...metadata.rubric,
        adminOverrideUsed: metadata.rubric.adminOverrideUsed === true,
        adminOverrideReason: metadata.rubric.adminOverrideReason || null,
        reviewerId,
        reviewedAt: serverTimestamp(),
      }
    : null;
  const rubricSummary = metadata.rubric
    ? {
        version: metadata.rubric.version,
        weightedScore: metadata.rubric.weightedScore,
        normalizedScore: metadata.rubric.normalizedScore,
        recommendation: metadata.rubric.recommendation,
        reviewerId,
        reviewedAt: serverTimestamp(),
      }
    : null;
  let scoringForPersist: ProofRubricScoring | null = null;

  if (nextStatus === 'approved') {
    await runTransaction(db, async (transaction) => {
      const entrySnap = await transaction.get(entryRef);
      if (!entrySnap.exists()) {
        console.error('[ProofLifecycle] Review action failed after resolution', { ...baseDiagnostic, failureReason: 'resolved_entry_missing_at_transaction_read' });
        throw new Error('ENTRY_NOT_FOUND');
      }
      const data = entrySnap.data();
      scoringForPersist = metadata.rubric ? getProofRubricScoring(metadata.rubric, data) : null;
      const currentStatus = normalizeProofStatus(data.status || data.reviewStatus);
      if (!isAllowedProofTransition(currentStatus, nextStatus)) {
        throw new Error(`INVALID_PROOF_TRANSITION: ${currentStatus} -> ${nextStatus}`);
      }
      const entryUpdate: any = {
        status: 'approved',
        reviewStatus: 'approved',
        submissionStatus: 'approved',
        proofStatus: 'approved',
        reviewDecision: 'approved',
        reviewNotes: notes,
        adminNotes: notes,
        reviewedAt: serverTimestamp(),
        reviewedBy: reviewerId,
        updatedAt: serverTimestamp()
      };
      if (rubric) entryUpdate.rubric = rubricSummary;
      if (scoringForPersist) {
        entryUpdate.scoring = scoringForPersist;
        entryUpdate.awardedXP = scoringForPersist.totalXpAwarded;
        entryUpdate.pointsAwarded = scoringForPersist.totalXpAwarded;
        entryUpdate.xpValue = scoringForPersist.totalXpAwarded;
      }
      transaction.update(entryRef, entryUpdate);
    });
    if (rubric) await persistProofReviewRubric(canonicalEntryId, nextStatus, notes, reviewerId, rubric, scoringForPersist);
    const awardResult = await awardSubmissionPointsOnce(canonicalEntryId, notes);
    await persistCrewArchiveSnapshot(canonicalEntryId).catch(err => {
      console.warn('[ProofLifecycle] Crew archive snapshot failed:', err);
    });
    return { success: awardResult.success, status: 'approved', points: awardResult.points, reason: awardResult.reason };
  }

  const transitionResult = await runTransaction(db, async (transaction) => {
    const entrySnap = await transaction.get(entryRef);
    if (!entrySnap.exists()) {
      console.error('[ProofLifecycle] Review action failed after resolution', { ...baseDiagnostic, failureReason: 'resolved_entry_missing_at_transaction_read' });
      throw new Error('ENTRY_NOT_FOUND');
    }
    const data = entrySnap.data();
    scoringForPersist = metadata.rubric ? getProofRubricScoring(metadata.rubric, data) : null;
    const currentStatus = normalizeProofStatus(data.status || data.reviewStatus);
    if (!isAllowedProofTransition(currentStatus, nextStatus)) {
      throw new Error(`INVALID_PROOF_TRANSITION: ${currentStatus} -> ${nextStatus}`);
    }

    const userId = getCanonicalUserId(data);
    const challengeId = getCanonicalChallengeId(data);
    const userRef = userId && challengeId ? doc(db, 'users', userId) : null;
    const userSnap = userRef ? await transaction.get(userRef) : null;

    const entryUpdate: any = {
      status: nextStatus,
      reviewStatus: nextStatus,
      submissionStatus: nextStatus,
      proofStatus: nextStatus,
      reviewDecision: nextStatus,
      reviewNotes: notes,
      adminNotes: notes,
      retryAvailable: true,
      retryPointMultiplier: nextStatus === 'rejected' ? 0.5 : null,
      reviewedAt: serverTimestamp(),
      reviewedBy: reviewerId,
      updatedAt: serverTimestamp()
    };
    if (rubric) entryUpdate.rubric = rubricSummary;
    if (scoringForPersist) entryUpdate.scoring = scoringForPersist;
    transaction.update(entryRef, entryUpdate);

    if (userRef && userSnap?.exists()) {
      const userUpdates: any = {
        submittedChallengeIds: arrayRemove(challengeId),
        submittedPendingChallengeIds: arrayRemove(challengeId),
        updatedAt: serverTimestamp()
      };
      if (nextStatus === 'needs_more_proof') {
        userUpdates.needsMoreProofChallengeIds = arrayUnion(challengeId);
      }
      if (nextStatus === 'rejected') {
        userUpdates.rejectedChallengeIds = arrayUnion(challengeId);
        userUpdates.retryableChallengeIds = arrayUnion(challengeId);
      }
      transaction.update(userRef, userUpdates);
    }

    return {
      success: true,
      status: nextStatus,
      reason: userRef && !userSnap?.exists() ? 'USER_PROFILE_NOT_FOUND' : undefined
    };
  });
  if (rubric) await persistProofReviewRubric(canonicalEntryId, nextStatus, notes, reviewerId, rubric, scoringForPersist);
  return transitionResult;
}

async function persistProofReviewRubric(
  canonicalEntryId: string,
  status: ReviewableProofStatus,
  notes: string,
  reviewerId: string,
  rubric: any,
  scoring: ProofRubricScoring | null = null
) {
  const batch = writeBatch(db);
  const directReviewRef = doc(db, 'proofReviews', canonicalEntryId);
  const entrySnap = await getDoc(doc(db, 'entries', canonicalEntryId));
  const entryData = entrySnap.exists() ? entrySnap.data() : {};
  const projectionBase = {
    entryId: canonicalEntryId,
    userId: getCanonicalUserId(entryData),
    uid: getCanonicalUserId(entryData),
    challengeId: getCanonicalChallengeId(entryData),
    missionId: getCanonicalChallengeId(entryData),
    deckId: entryData.deckId || 'starter-signals',
    photoUrl: getCanonicalImageUrl(entryData),
    imageUrl: getCanonicalImageUrl(entryData),
    storagePath: getCanonicalStoragePath(entryData) || null,
    fieldNote: entryData.fieldNote || entryData.note || '',
  };
  batch.set(directReviewRef, {
    ...projectionBase,
    status,
    reviewStatus: status,
    reviewNotes: notes,
    adminNotes: notes,
    rubric,
    ...(scoring ? { scoring } : {}),
    reviewedAt: serverTimestamp(),
    reviewedBy: reviewerId,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  const linkedReviews = await getDocs(query(collection(db, 'proofReviews'), where('entryId', '==', canonicalEntryId)));
  linkedReviews.docs.forEach(reviewDoc => {
    batch.set(reviewDoc.ref, {
      ...projectionBase,
      status,
      reviewStatus: status,
      reviewNotes: notes,
      adminNotes: notes,
      rubric,
      ...(scoring ? { scoring } : {}),
      reviewedAt: serverTimestamp(),
      reviewedBy: reviewerId,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  });

  await batch.commit();
}

async function persistCrewArchiveSnapshot(canonicalEntryId: string) {
  const response = await authenticatedFetch('/api/zines/sync-entry', {
    method: 'POST',
    body: JSON.stringify({ entryId: canonicalEntryId }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || payload.error || `Zine archive sync failed with HTTP ${response.status}`);
  return payload;
}

export interface QueueRepairReport {
  dryRun: boolean;
  scannedEntries: number;
  scannedProofReviews: number;
  repairedEntries: Array<{ id: string; changes: string[] }>;
  ambiguousRecords: Array<{ id: string; source: string; reasons: string[] }>;
  orphanProofReviews: Array<{ id: string; entryId: string }>;
}

export async function repairCanonicalProofQueue(dryRun = true): Promise<QueueRepairReport> {
  const report: QueueRepairReport = {
    dryRun,
    scannedEntries: 0,
    scannedProofReviews: 0,
    repairedEntries: [],
    ambiguousRecords: [],
    orphanProofReviews: []
  };

  const [entriesSnap, reviewsSnap] = await Promise.all([
    getDocs(collection(db, 'entries')),
    getDocs(collection(db, 'proofReviews'))
  ]);

  report.scannedEntries = entriesSnap.size;
  report.scannedProofReviews = reviewsSnap.size;

  const entryIds = new Set(entriesSnap.docs.map(entryDoc => entryDoc.id));
  let batch = writeBatch(db);
  let batchCount = 0;

  const commitIfNeeded = async () => {
    if (!dryRun && batchCount > 0) {
      await batch.commit();
      batch = writeBatch(db);
      batchCount = 0;
    }
  };

  for (const entryDoc of entriesSnap.docs) {
    const data = entryDoc.data();
    const normalized = normalizeCanonicalSubmission(entryDoc.id, data);
    const validation = validateCanonicalSubmission(normalized);
    const changes: string[] = [];

    if (!validation.valid) {
      report.ambiguousRecords.push({ id: entryDoc.id, source: 'entries', reasons: validation.missingFields });
      continue;
    }

    const currentStatus = data.status;
    if (currentStatus !== normalized.status) changes.push(`status:${currentStatus || 'missing'}->${normalized.status}`);
    if (data.reviewStatus !== normalized.status) changes.push('reviewStatus mirror');
    if (data.submissionStatus !== normalized.status) changes.push('submissionStatus mirror');
    if (data.proofStatus !== normalized.status) changes.push('proofStatus mirror');
    if (!data.entryId) changes.push('entryId mirror');
    if (!data.submissionVersion) changes.push('submissionVersion');
    if (!data.photoUrl && normalized.photoUrl) changes.push('photoUrl mirror');
    if (!data.storagePath && normalized.storagePath) changes.push('storagePath mirror');

    if (changes.length > 0) {
      report.repairedEntries.push({ id: entryDoc.id, changes });
      if (!dryRun) {
        batch.set(entryDoc.ref, {
          entryId: normalized.entryId,
          userId: normalized.userId,
          uid: normalized.uid,
          challengeId: normalized.challengeId,
          missionId: normalized.missionId,
          tripId: normalized.tripId,
          deckId: normalized.deckId,
          status: normalized.status,
          reviewStatus: normalized.status,
          submissionStatus: normalized.status,
          proofStatus: normalized.status,
          photoUrl: normalized.photoUrl,
          imageUrl: normalized.imageUrl,
          proofImage: normalized.proofImage,
          storagePath: normalized.storagePath,
          submissionVersion: (normalized as any).submissionVersion,
          queueReindexedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true });
        batchCount++;
        if (batchCount >= 450) await commitIfNeeded();
      }
    }
  }

  reviewsSnap.docs.forEach(reviewDoc => {
    const entryId = getCanonicalSubmissionId(reviewDoc.data(), '');
    if (!entryId || !entryIds.has(entryId)) {
      report.orphanProofReviews.push({ id: reviewDoc.id, entryId: entryId || 'missing' });
    }
  });

  await commitIfNeeded();
  return report;
}
