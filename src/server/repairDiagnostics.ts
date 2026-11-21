/**
 * Pure counting logic for GET /api/admin/repair-diagnostics.
 *
 * Fixed Nov 20, 2026: the endpoint used to compare review DOC ids against
 * entry ids (`reviewIds.has(entry.id)` / `entryIds.has(review.id)`). Review
 * docs are named `review_<entryId>` (and some carry bare uuids), so doc-id
 * equality can never link them — every live review counted as a ghost
 * (16 on Nov 20, while the client repair correctly reported 0 orphans).
 * The counts below match reviews to entries by the review's entry link
 * FIELD, resolved exactly the way the client repair does
 * (proofLifecycleService.getCanonicalSubmissionId): first non-placeholder
 * of entryId, submissionId, id. The doc id is deliberately never consulted.
 */

export const PLACEHOLDER_ENTRY_LINK_VALUES = new Set(['tbd', 'pending', 'pending_review']);

export function isPlaceholderEntryLink(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return PLACEHOLDER_ENTRY_LINK_VALUES.has(value.toLowerCase().trim());
}

/**
 * The entry a proofReview claims to review. '' when the review is unlinked
 * (no usable entryId / submissionId / id field).
 */
export function getCanonicalReviewEntryId(data: any): string {
  for (const candidate of [data?.entryId, data?.submissionId, data?.id]) {
    if (candidate && !isPlaceholderEntryLink(candidate)) return String(candidate);
  }
  return '';
}

export interface RepairDiagnosticsDoc {
  id: string;
  data: any;
}

export interface RepairDiagnosticsCounts {
  /** Non-archived reviews in a pending status. */
  pendingProofReviews: number;
  /** Entries no review's entry link names (archived reviews still count as a link). */
  entriesWithoutReviews: number;
  /** Non-archived reviews whose entry link is missing or names no scanned entry. */
  reviewsWithoutEntries: number;
}

const PENDING_REVIEW_STATUSES = new Set([
  'pending_review',
  'pending',
  'checking',
  'awaiting_review',
  'needs_review'
]);

export function countRepairDiagnostics(
  entries: RepairDiagnosticsDoc[],
  reviews: RepairDiagnosticsDoc[]
): RepairDiagnosticsCounts {
  const entryIds = new Set(entries.map((entry) => entry.id));
  // An entry is covered when any review's entry link names it — archived
  // reviews included, since the doc still exists. Ghost/pending counting
  // below skips archived reviews, as before.
  const reviewedEntryIds = new Set<string>();
  let pendingProofReviews = 0;
  let reviewsWithoutEntries = 0;

  for (const review of reviews) {
    const data = review.data ?? {};
    const entryId = getCanonicalReviewEntryId(data);
    if (entryId) reviewedEntryIds.add(entryId);
    if (data.archived === true) continue;
    const status = (data.status || '').toString().toLowerCase().trim();
    if (PENDING_REVIEW_STATUSES.has(status)) pendingProofReviews += 1;
    if (!entryId || !entryIds.has(entryId)) {
      reviewsWithoutEntries += 1;
    }
  }

  const entriesWithoutReviews = entries.filter((entry) => !reviewedEntryIds.has(entry.id)).length;
  return { pendingProofReviews, entriesWithoutReviews, reviewsWithoutEntries };
}
