import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  countRepairDiagnostics,
  getCanonicalReviewEntryId,
  type RepairDiagnosticsDoc
} from '../server/repairDiagnostics';

const entry = (id: string, data: any = {}): RepairDiagnosticsDoc => ({ id, data });
const review = (id: string, data: any = {}): RepairDiagnosticsDoc => ({ id, data });

test('getCanonicalReviewEntryId: entryId wins, then submissionId, then id', () => {
  assert.equal(getCanonicalReviewEntryId({ entryId: 'entry-1', submissionId: 'entry-2', id: 'entry-3' }), 'entry-1');
  assert.equal(getCanonicalReviewEntryId({ submissionId: 'entry-2', id: 'entry-3' }), 'entry-2');
  assert.equal(getCanonicalReviewEntryId({ id: 'entry-3' }), 'entry-3');
});

test('getCanonicalReviewEntryId: placeholder links are skipped, empty when unlinked', () => {
  assert.equal(getCanonicalReviewEntryId({ entryId: 'TBD', submissionId: 'pending', id: 'pending_review' }), '');
  assert.equal(getCanonicalReviewEntryId({ entryId: '  Pending  ', id: 'entry-9' }), 'entry-9');
  assert.equal(getCanonicalReviewEntryId({}), '');
  assert.equal(getCanonicalReviewEntryId(null), '');
});

test('countRepairDiagnostics: a review named review_<entryId> with a matching entryId field is NOT a ghost (Nov 20, 2026 regression)', () => {
  const counts = countRepairDiagnostics(
    [entry('entry-1')],
    [review('review_entry-1', { entryId: 'entry-1', status: 'approved' })]
  );
  assert.equal(counts.reviewsWithoutEntries, 0);
  assert.equal(counts.entriesWithoutReviews, 0);
});

test('countRepairDiagnostics: a review whose entry link names no entry is a ghost; a review with no link at all is a ghost', () => {
  const counts = countRepairDiagnostics(
    [entry('entry-1')],
    [
      review('review_entry-2', { entryId: 'entry-2', status: 'approved' }),
      review('review_entry-1', { status: 'approved' })
    ]
  );
  assert.equal(counts.reviewsWithoutEntries, 2);
  // entry-1 has no review linking it (the second review links nothing).
  assert.equal(counts.entriesWithoutReviews, 1);
});

test('countRepairDiagnostics: archived reviews are never ghosts, but still cover their entry', () => {
  const counts = countRepairDiagnostics(
    [entry('entry-1'), entry('entry-2')],
    [
      review('review_entry-1', { entryId: 'entry-1', status: 'pending_review', archived: true }),
      review('review_ghost', { entryId: 'entry-9', status: 'approved', archived: true })
    ]
  );
  assert.equal(counts.reviewsWithoutEntries, 0);
  assert.equal(counts.pendingProofReviews, 0);
  assert.equal(counts.entriesWithoutReviews, 1); // only entry-2 is uncovered
});

test('countRepairDiagnostics: pending statuses count, approved does not, archived pending does not', () => {
  const counts = countRepairDiagnostics(
    [entry('entry-1'), entry('entry-2'), entry('entry-3'), entry('entry-4'), entry('entry-5'), entry('entry-6')],
    [
      review('r1', { entryId: 'entry-1', status: 'pending_review' }),
      review('r2', { entryId: 'entry-2', status: 'pending' }),
      review('r3', { entryId: 'entry-3', status: 'checking' }),
      review('r4', { entryId: 'entry-4', status: 'awaiting_review' }),
      review('r5', { entryId: 'entry-5', status: 'needs_review' }),
      review('r6', { entryId: 'entry-6', status: 'approved' })
    ]
  );
  assert.equal(counts.pendingProofReviews, 5);
  assert.equal(counts.reviewsWithoutEntries, 0);
  assert.equal(counts.entriesWithoutReviews, 0);
});

test('countRepairDiagnostics: an entry with no review at all is orphaned', () => {
  const counts = countRepairDiagnostics([entry('entry-1'), entry('entry-2')], [review('r1', { entryId: 'entry-1', status: 'approved' })]);
  assert.equal(counts.entriesWithoutReviews, 1);
  assert.equal(counts.reviewsWithoutEntries, 0);
});

test('wiring: the repair-diagnostics endpoint counts via countRepairDiagnostics over collectionGroup (Nov 20, 2026)', () => {
  const server = readFileSync(new URL('../../server.ts', import.meta.url), 'utf8');
  const handlerAt = server.indexOf('/api/admin/repair-diagnostics');
  assert.ok(handlerAt > -1, 'endpoint exists');
  const handler = server.slice(handlerAt, handlerAt + 8000);
  assert.match(handler, /collectionGroup\('entries'\)/);
  assert.match(handler, /collectionGroup\('proofReviews'\)/);
  assert.match(handler, /countRepairDiagnostics\(/);
  assert.doesNotMatch(handler, /reviewIds\.has/);
  assert.doesNotMatch(handler, /entryIds\.has\(d\.id\)/);
});
