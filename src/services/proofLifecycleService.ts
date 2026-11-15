import {
  arrayRemove,
  arrayUnion,
  collectionGroup,
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
import { getProofRubricScoring, type ProofRubricScoring } from '../logic/proofRubric';
import type { AiSuggestedRubric } from '../logic/aiSuggestion';
import { authenticatedFetch } from '../lib/api';

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
  /** The AI-suggested rubric the review card offered (null when no trustworthy analysis was stored). */
  suggestedRubric?: AiSuggestedRubric | null;
  /** True when the admin applied the suggestion before acting. */
  suggestedRubricApplied?: boolean;
}

export interface QueueRepairEntryChange {
  id: string;
  changes: string[];
}

export interface QueueRepairAmbiguousRecord {
  id: string;
  source: 'entries';
  reasons: string[];
}

export interface QueueRepairOrphanProofReview {
  id: string;
  entryId: string;
}

/**
 * A proofReview the diagnostics counts as dirty (missing required fields
 * or an invalid status) but the repair does not fix: the repair only
 * validates and rewrites entries, so a flagged review is reported for a
 * human to look at, never silently rewritten.
 */
export interface QueueRepairFlaggedProofReview {
  id: string;
  entryId: string;
  reasons: string[];
}

export interface QueueRepairReport {
  dryRun: boolean;
  scannedEntries: number;
  scannedProofReviews: number;
  /** Entries read from the root `entries` collection. */
  scannedRootEntries: number;
  /** ProofReviews read from the root `proofReviews` collection. */
  scannedRootProofReviews: number;
  /** Entries read from subcollections (e.g. users/{uid}/entries). */
  scannedSubcollectionEntries: number;
  /** ProofReviews read from subcollections. */
  scannedSubcollectionProofReviews: number;
  /**
   * Docs without a createdAt timestamp. Diagnostics' collectionGroup
   * queries orderBy createdAt, which silently excludes these — so the
   * repair total minus this count is the diagnostics total (under the
   * 500-doc window). The repair deliberately scans without orderBy so
   * these docs are not invisible to it.
   */
  scannedEntriesWithoutCreatedAt: number;
  scannedProofReviewsWithoutCreatedAt: number;
  repairedEntries: QueueRepairEntryChange[];
  ambiguousRecords: QueueRepairAmbiguousRecord[];
  orphanProofReviews: QueueRepairOrphanProofReview[];
  flaggedProofReviews: QueueRepairFlaggedProofReview[];
}

export function createQueueRepairReport(dryRun = true): QueueRepairReport {
  return {
    dryRun,
    scannedEntries: 0,
    scannedProofReviews: 0,
    scannedRootEntries: 0,
    scannedRootProofReviews: 0,
    scannedSubcollectionEntries: 0,
    scannedSubcollectionProofReviews: 0,
    scannedEntriesWithoutCreatedAt: 0,
    scannedProofReviewsWithoutCreatedAt: 0,
    repairedEntries: [],
    ambiguousRecords: [],
    orphanProofReviews: [],
    flaggedProofReviews: []
  };
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

/**
 * Placeholder values writers have stored in an entryId field when no real
 * id existed yet: gameService's `id: entryId || 'TBD'` placeholder, and
 * proofService's `entryData.id || 'pending'` / `'pending_review'`
 * fallbacks. A real entry id is never one of these bare words (live ids
 * are `entry_<trip>_<user>_<ts>` or Firestore auto-ids), so they mean
 * "no link", not an id. Treating them as missing is what lets the repair
 * re-link the record and stops diagnostics showing a literal "TBD" as an
 * unrendered submission id.
 */
export const PLACEHOLDER_ENTRY_IDS = new Set(['tbd', 'pending', 'pending_review']);

export function isPlaceholderEntryId(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return PLACEHOLDER_ENTRY_IDS.has(value.toLowerCase().trim());
}

export function getCanonicalSubmissionId(data: any, fallbackId = ''): string {
  for (const candidate of [data?.entryId, data?.submissionId, data?.id]) {
    if (candidate && !isPlaceholderEntryId(candidate)) return candidate;
  }
  return fallbackId;
}

/**
 * The exact predicate the admin diagnostics uses for "missing required
 * fields" (submissionService emit): a record counts when it lacks a raw
 * status, an image reference, a user id, a challenge id, or a deck id.
 * Deliberately NOT the same as validateCanonicalSubmission, which also
 * requires submittedAt — a record missing only submittedAt is ambiguous
 * to the repair but is not counted missing by diagnostics. One function,
 * two consumers, so the two can never drift apart again.
 */
export function getDiagnosticsMissingFields(data: any): string[] {
  const missing: string[] = [];
  const rawStatus = data?.status || data?.reviewStatus || data?.submissionStatus || data?.proofStatus;
  if (!rawStatus) missing.push('status');
  if (!getCanonicalUserId(data)) missing.push('userId');
  if (!getCanonicalChallengeId(data)) missing.push('challengeId');
  if (!(data?.deckId || '').toString().trim()) missing.push('deckId');
  if (!getCanonicalImageUrl(data) && !getCanonicalStoragePath(data)) missing.push('photoUrl/storagePath');
  return missing;
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

export async function transitionProofReview(
  submissionId: string,
  nextStatus: ReviewableProofStatus,
  notes: string,
  metadata: ProofTransitionReviewMetadata = {}
): Promise<ProofTransitionResult> {
  const action = nextStatus === 'approved'
    ? 'approve'
    : nextStatus === 'needs_more_proof'
      ? 'request_info'
      : 'reject';
  const response = await authenticatedFetch('/api/admin/proof-review/action', {
    method: 'POST',
    body: JSON.stringify({
      entryId: submissionId,
      submissionId,
      action,
      notes,
      metadata,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error: any = new Error(payload.error || payload.message || 'REVIEW_ACTION_FAILED');
    error.details = payload.details || null;
    throw error;
  }
  return payload as ProofTransitionResult;
}

/**
 * Pure per-entry repair plan: normalize + validate + diff the stored
 * mirrors, exactly as the repair loop used to do inline. A record missing
 * a status is NOT ambiguous here — validation runs on the normalized
 * record, whose status always defaults to pending_review — it is repaired
 * via the status mirror instead (`status:missing->pending_review`).
 * A placeholder entryId ('TBD' / 'pending' / 'pending_review') counts as
 * missing: the normalized id falls back to the doc id and the change is
 * reported as an entryId mirror.
 */
export function planEntryRepair(docId: string, data: any): {
  normalized: Entry;
  validation: CanonicalSubmissionValidation;
  changes: string[];
} {
  const normalized = normalizeCanonicalSubmission(docId, data);
  const validation = validateCanonicalSubmission(normalized);
  const changes: string[] = [];

  if (!validation.valid) return { normalized, validation, changes };

  const currentStatus = data.status;
  if (currentStatus !== normalized.status) changes.push(`status:${currentStatus || 'missing'}->${normalized.status}`);
  if (data.reviewStatus !== normalized.status) changes.push('reviewStatus mirror');
  if (data.submissionStatus !== normalized.status) changes.push('submissionStatus mirror');
  if (data.proofStatus !== normalized.status) changes.push('proofStatus mirror');
  if ((data.entryId || '') !== normalized.entryId) changes.push('entryId mirror');
  if (!data.submissionVersion) changes.push('submissionVersion');
  if (!data.photoUrl && normalized.photoUrl) changes.push('photoUrl mirror');
  if (!data.storagePath && normalized.storagePath) changes.push('storagePath mirror');

  return { normalized, validation, changes };
}

/**
 * Pure per-review repair classification. The repair never rewrites a
 * proofReview — it only reports it. A review is an orphan when its entry
 * link is missing, a placeholder, or points at no scanned entry; it is
 * flagged when the diagnostics predicate (same fields diagnostics counts)
 * finds it dirty or its status is present but unknown.
 */
export function classifyRepairReview(
  docId: string,
  data: any,
  entryIds: Set<string>
): {
  orphan: QueueRepairOrphanProofReview | null;
  flagged: QueueRepairFlaggedProofReview | null;
} {
  const entryId = getCanonicalSubmissionId(data, '');
  const orphan =
    !entryId || !entryIds.has(entryId)
      ? { id: docId, entryId: entryId || 'missing' }
      : null;
  const reasons = getDiagnosticsMissingFields(data);
  const rawStatus = data?.status || data?.reviewStatus || data?.submissionStatus || data?.proofStatus;
  if (rawStatus && !isKnownProofStatusValue(rawStatus)) {
    reasons.push(`invalid status: ${String(rawStatus)}`);
  }
  const flagged =
    reasons.length > 0 ? { id: docId, entryId: entryId || 'missing', reasons } : null;
  return { orphan, flagged };
}

export async function repairCanonicalProofQueue(dryRun = true): Promise<QueueRepairReport> {
  const report = createQueueRepairReport(dryRun);

  // Aligned scan (Nov 15): collectionGroup over BOTH collections, matching
  // the diagnostics' query paths (entries, proofReviews, **/entries,
  // **/proofReviews). The old root-only scan missed every subcollection
  // record — the 5 live records diagnostics flags are not root entries,
  // which is why dry-run reported 0 repairs while diagnostics counted 5
  // missing fields and 5 invalid statuses.
  //
  // Deliberately NO orderBy and NO limit here, unlike diagnostics: an
  // orderBy on createdAt silently excludes docs that lack createdAt
  // (~38 root proofReviews live are invisible to diagnostics for exactly
  // this reason), and the repair must see those too. A plain
  // collectionGroup read needs no Firestore index. The scanned totals can
  // therefore exceed the diagnostics' windowed totals; the without-
  // createdAt counters below are the reconciliation (repair total minus
  // without-createdAt equals the diagnostics total, under the 500 window).
  const [entriesSnap, reviewsSnap] = await Promise.all([
    getDocs(collectionGroup(db, 'entries')),
    getDocs(collectionGroup(db, 'proofReviews'))
  ]);

  report.scannedEntries = entriesSnap.size;
  report.scannedProofReviews = reviewsSnap.size;

  const entryIds = new Set<string>();
  entriesSnap.docs.forEach(entryDoc => {
    const path = entryDoc.ref.path;
    const isRoot = path === `entries/${entryDoc.id}`;
    if (isRoot) report.scannedRootEntries += 1;
    else report.scannedSubcollectionEntries += 1;
    if (!entryDoc.data().createdAt) report.scannedEntriesWithoutCreatedAt += 1;
    entryIds.add(entryDoc.id);
  });
  reviewsSnap.docs.forEach(reviewDoc => {
    const path = reviewDoc.ref.path;
    const isRoot = path === `proofReviews/${reviewDoc.id}`;
    if (isRoot) report.scannedRootProofReviews += 1;
    else report.scannedSubcollectionProofReviews += 1;
    if (!reviewDoc.data().createdAt) report.scannedProofReviewsWithoutCreatedAt += 1;
  });

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
    const { normalized, validation, changes } = planEntryRepair(entryDoc.id, data);

    if (!validation.valid) {
      report.ambiguousRecords.push({ id: entryDoc.id, source: 'entries', reasons: validation.missingFields });
      continue;
    }

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
    const { orphan, flagged } = classifyRepairReview(reviewDoc.id, reviewDoc.data(), entryIds);
    if (orphan) report.orphanProofReviews.push(orphan);
    if (flagged) report.flaggedProofReviews.push(flagged);
  });

  await commitIfNeeded();
  return report;
}
