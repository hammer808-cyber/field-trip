import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildRootEntryIndex,
  computeReviewableButNotRendered,
  isRootQueueEntryRecord,
  mergeReviewQueueRecords,
  normalizeReviewQueueRecord,
} from '../services/submissionService';

/**
 * Admin queue dedup (Nov 27, 2026 — Zach's report: "the admin q says
 * there's eight but there really is the same one, like I clicked approve
 * and it didn't approve").
 *
 * Root causes, proven by the probe this file replaces:
 * 1. The merge was last-write-wins by entry id, so a stale subcollection
 *    mirror (users/{uid}/entries/...) of an already-approved root entry
 *    shadowed the root row: the row kept showing pending after Approve,
 *    and the count disagreed with the rows whenever the mirror and the
 *    root had different createdAt order in the two merge inputs.
 * 2. Legacy subcollection entries with their own ids became extra,
 *    unresolvable rows that could never be approved, inflating the count
 *    with lookalikes of the same submission.
 *
 * The fix: only the canonical root `entries/{id}` doc is a queue row.
 * The server only ever acts on the root doc, so the queue must too.
 * Unresolved subcollection records stay visible in diagnostics
 * (unresolvedCanonicalEntries) for the repair tools.
 */

function rootEntry(overrides: Record<string, any> = {}): any {
  return {
    id: 'entryRoot1',
    __path: 'entries/entryRoot1',
    userId: 'user-1',
    displayName: 'Scout One',
    missionId: 'starter-1',
    challengeId: 'starter-1',
    tripId: 'starter-1',
    missionTitle: 'First Signals',
    deckId: 'starter-signals',
    photoUrl: 'https://example.invalid/photo.jpg',
    fieldNote: 'Did the thing.',
    status: 'pending_review',
    createdAt: { toMillis: () => 1000 },
    ...overrides,
  };
}

function subcollectionEntry(overrides: Record<string, any> = {}): any {
  return {
    id: 'entryRoot1',
    __path: 'users/user-1/entries/entryRoot1',
    userId: 'user-1',
    displayName: 'Scout One',
    missionId: 'starter-1',
    challengeId: 'starter-1',
    tripId: 'starter-1',
    missionTitle: 'First Signals',
    deckId: 'starter-signals',
    photoUrl: 'https://example.invalid/photo.jpg',
    fieldNote: 'Did the thing.',
    status: 'pending_review',
    createdAt: { toMillis: () => 2000 },
    entryId: 'entryRoot1',
    ...overrides,
  };
}

function reviewDoc(overrides: Record<string, any> = {}): any {
  return {
    id: 'review_entryRoot1',
    __path: 'proofReviews/review_entryRoot1',
    reviewId: 'review_entryRoot1',
    entryId: 'entryRoot1',
    userId: 'user-1',
    missionId: 'starter-1',
    challengeId: 'starter-1',
    missionTitle: 'First Signals',
    deckId: 'starter-signals',
    photoUrl: 'https://example.invalid/photo.jpg',
    status: 'pending_review',
    createdAt: { toMillis: () => 1500 },
    ...overrides,
  };
}

function normalizeAll(entries: any[], reviews: any[]) {
  const index = buildRootEntryIndex(entries);
  const latestEntries = entries.map((e) => normalizeReviewQueueRecord(e.id, e, 'entry', index));
  const latestReviews = reviews.map((r) => normalizeReviewQueueRecord(r.id, r, 'proofReview', index));
  return { latestEntries, latestReviews };
}

test('queue: one root entry + one linked review merges to one row', () => {
  const { latestEntries, latestReviews } = normalizeAll([rootEntry()], [reviewDoc()]);
  const merged = mergeReviewQueueRecords(latestEntries as any, latestReviews as any);
  assert.equal(merged.length, 1);
  assert.equal((merged[0] as any).entryId, 'entryRoot1');
});

test('queue: one root entry + eight linked review siblings merges to one row', () => {
  const reviews = Array.from({ length: 8 }, (_, i) =>
    reviewDoc({
      id: i === 0 ? 'review_entryRoot1' : `review_entryRoot1_${1000 + i}`,
      __path: `proofReviews/review_entryRoot1${i === 0 ? '' : `_${1000 + i}`}`,
    }),
  );
  const { latestEntries, latestReviews } = normalizeAll([rootEntry()], reviews);
  const merged = mergeReviewQueueRecords(latestEntries as any, latestReviews as any);
  assert.equal(merged.length, 1);
});

test('queue: a stale subcollection mirror never shadows the root entry', () => {
  // Root already approved; the mirror still says pending and has the later
  // createdAt, so the old last-write-wins merge showed a pending row that
  // no approve could ever move. The merged row must be the root doc.
  const root = rootEntry({ status: 'approved' });
  const mirror = subcollectionEntry({ status: 'pending_review' });
  const { latestEntries } = normalizeAll([root, mirror], []);
  const merged = mergeReviewQueueRecords(latestEntries as any, []);
  assert.equal(merged.length, 1);
  assert.equal((merged[0] as any).status, 'approved');
  assert.equal((merged[0] as any).sourcePath, 'entries/entryRoot1');
});

test('queue: a legacy subcollection entry with its own id is not a queue row', () => {
  const legacy = subcollectionEntry({
    id: 'legacySub1',
    __path: 'users/user-1/entries/legacySub1',
    entryId: 'entry_starter-1_user-1_1700000000000',
    submissionId: 'entry_starter-1_user-1_1700000000000',
    status: 'pending_review',
  });
  const { latestEntries } = normalizeAll([rootEntry(), legacy], []);
  const merged = mergeReviewQueueRecords(latestEntries as any, []);
  assert.equal(merged.length, 1);
  assert.equal((merged[0] as any).entryId, 'entryRoot1');
  assert.equal(isRootQueueEntryRecord((merged[0] as any)), true);
  assert.equal(isRootQueueEntryRecord(normalizeReviewQueueRecord(legacy.id, legacy, 'entry', buildRootEntryIndex([rootEntry(), legacy]))), false);
});

test('queue: approving the root entry removes its row from the pending merge', () => {
  const pending = normalizeAll([rootEntry({ status: 'pending_review' })], [reviewDoc()]);
  const before = mergeReviewQueueRecords(pending.latestEntries as any, pending.latestReviews as any);
  assert.equal(before.length, 1);
  const approved = normalizeAll([rootEntry({ status: 'approved' })], [reviewDoc({ status: 'approved' })]);
  const after = mergeReviewQueueRecords(approved.latestEntries as any, approved.latestReviews as any);
  assert.equal(after.filter((item: any) => item.status === 'pending_review').length, 0);
});

test('queue: count and rows agree — the pending count is the merged pending rows', () => {
  const { latestEntries, latestReviews } = normalizeAll(
    [rootEntry(), rootEntry({ id: 'entryRoot2', __path: 'entries/entryRoot2', entryId: 'entryRoot2', createdAt: { toMillis: () => 3000 } })],
    [reviewDoc()],
  );
  const merged = mergeReviewQueueRecords(latestEntries as any, latestReviews as any);
  const pendingCount = merged.filter((item: any) => item.status === 'pending_review').length;
  assert.equal(merged.length, 2);
  assert.equal(pendingCount, 2);
});

test('queue: reviewable-not-rendered skips non-root entries but still flags orphan reviews', () => {
  const legacy = subcollectionEntry({
    id: 'legacySub1',
    __path: 'users/user-1/entries/legacySub1',
    entryId: 'entry_starter-1_user-1_1700000000000',
    submissionId: 'entry_starter-1_user-1_1700000000000',
    status: 'pending_review',
  });
  const orphan = reviewDoc({
    id: 'review_orphan1',
    __path: 'proofReviews/review_orphan1',
    entryId: 'entryMissing',
    submissionId: 'entryMissing',
  });
  const { latestEntries, latestReviews } = normalizeAll([rootEntry(), legacy], [reviewDoc(), orphan]);
  const merged = mergeReviewQueueRecords(latestEntries as any, latestReviews as any);
  const reviewable = computeReviewableButNotRendered(
    latestEntries as any,
    latestReviews as any,
    merged as any,
    'pending_review',
  );
  assert.deepEqual(reviewable.ids, ['entryMissing']);
  assert.equal(reviewable.total, 1);
});
