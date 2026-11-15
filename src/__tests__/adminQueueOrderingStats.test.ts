import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  computeReviewVelocity,
  entryTimestampMillis,
  formatWaitAge,
  queueDepthLabel,
  sortReviewQueue,
  visibleQueueItems,
  QUEUE_PAGE_SIZE,
} from '../logic/adminQueueStats';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

const NOW = Date.parse('2026-11-15T12:00:00Z');
const hoursAgo = (h: number) => ({ createdAt: { toMillis: () => NOW - h * 3600 * 1000 } });
const daysAgo = (d: number, extraHours = 0) => ({
  createdAt: { toMillis: () => NOW - (d * 24 + extraHours) * 3600 * 1000 },
});

test('Q7: the queue sorts oldest-first by default and the toggle flips it', () => {
  const items = [hoursAgo(1), hoursAgo(26), hoursAgo(5)];
  const oldest = sortReviewQueue(items, 'oldest');
  assert.deepEqual(
    oldest.map((item) => entryTimestampMillis(item)),
    [NOW - 26 * 3600 * 1000, NOW - 5 * 3600 * 1000, NOW - 1 * 3600 * 1000],
  );
  const newest = sortReviewQueue(items, 'newest');
  assert.deepEqual(
    newest.map((item) => entryTimestampMillis(item)),
    [NOW - 1 * 3600 * 1000, NOW - 5 * 3600 * 1000, NOW - 26 * 3600 * 1000],
  );
  // Default is oldest-first.
  assert.deepEqual(
    sortReviewQueue(items).map((item) => entryTimestampMillis(item)),
    oldest.map((item) => entryTimestampMillis(item)),
  );
  // A record with no usable timestamp sorts as oldest (needs attention;
  // its age shows as "—") and the order is deterministic on ties.
  const withMissing: any[] = [{ id: 'b' }, { id: 'a' }, hoursAgo(1)];
  assert.deepEqual(
    sortReviewQueue(withMissing, 'oldest').map((item) => item.id),
    ['a', 'b', undefined],
  );
});

test('Q7: the age indicator formats waiting time and never invents one', () => {
  assert.equal(formatWaitAge(NOW - 3 * 24 * 3600 * 1000 - 4 * 3600 * 1000, NOW), '3d 4h');
  assert.equal(formatWaitAge(NOW - 2 * 3600 * 1000 - 15 * 60 * 1000, NOW), '2h 15m');
  assert.equal(formatWaitAge(NOW - 45 * 60 * 1000, NOW), '45m');
  assert.equal(formatWaitAge(NOW - 30 * 1000, NOW), '<1m');
  assert.equal(formatWaitAge(null, NOW), '—');
  assert.equal(formatWaitAge(undefined, NOW), '—');
  assert.equal(formatWaitAge(0, NOW), '—');
  // A timestamp in the future (clock skew) is unknown, not negative.
  assert.equal(formatWaitAge(NOW + 3600 * 1000, NOW), '—');
  // createdAt || submittedAt || updatedAt fallback chain.
  assert.equal(entryTimestampMillis({ submittedAt: { toMillis: () => 123 } }), 123);
  assert.equal(entryTimestampMillis({}), 0);
});

test('Q7: client paging is a growing prefix — pages never duplicate or skip', () => {
  const items = Array.from({ length: 60 }, (_, i) => ({ id: `e${i}` }));
  const page1 = visibleQueueItems(items, QUEUE_PAGE_SIZE);
  const page2 = visibleQueueItems(items, QUEUE_PAGE_SIZE * 2);
  const page3 = visibleQueueItems(items, QUEUE_PAGE_SIZE * 3);
  assert.equal(page1.length, 25);
  assert.equal(page2.length, 50);
  assert.equal(page3.length, 60);
  // Concatenating the newly revealed slice of each page rebuilds the list.
  assert.deepEqual(
    [...page1, ...page2.slice(page1.length), ...page3.slice(page2.length)],
    items,
  );
  assert.equal(new Set(items.map((item) => item.id)).size, items.length);
});

test('Q7: the queue queries order by createdAt so the 500 window is the oldest 500', () => {
  const service = read('src/services/submissionService.ts');
  const subscribeStart = service.indexOf('export function subscribeToAdminPendingReviews');
  const subscribeSource = service.slice(subscribeStart);
  // All three collectionGroup queries order ascending by createdAt.
  assert.equal((subscribeSource.match(/orderBy\('createdAt', 'asc'\)/g) || []).length, 3);
  assert.match(subscribeSource, /limit\(500\)/);
  // The merge defaults to oldest-first.
  assert.match(service, /function mergeReviewQueueRecords\(entries: Entry\[\], reviews: Entry\[\], direction: QueueSortDirection = 'oldest'\)/);
  // The page exposes the toggle and Load more, and the swipe view starts
  // on the first item of the chosen order (reviews[0] of the sorted list).
  const page = read('src/pages/AdminProofReview.tsx');
  assert.match(page, /Oldest first/);
  assert.match(page, /Newest first/);
  assert.match(page, /Load more/);
  assert.match(page, /Showing \{visibleCount\} of \{total\}/);
  assert.match(page, /entry=\{reviews\[0\]\}/);
  // Age indicator on the review card and in the table.
  assert.match(page, /Waiting: \{formatWaitAge\(entryTimestampMillis\(entry\)\)\}/);
  assert.match(page, /formatWaitAge\(entryTimestampMillis\(e\)\)/);
});

test('Q8: review velocity is computed from adminLogs, and zero is zero', () => {
  const logs: any[] = [];
  const empty = computeReviewVelocity(logs, { nowMs: NOW });
  assert.equal(empty.decisions, 0);
  assert.equal(empty.perHour, 0);
  assert.equal(empty.display, '0.0 p/h');

  const twelve = Array.from({ length: 12 }, () => ({
    actionType: 'proof_review_action',
    createdAt: { toMillis: () => NOW - 3600 * 1000 },
  }));
  assert.equal(computeReviewVelocity(twelve, { nowMs: NOW }).display, '0.5 p/h');

  // Decisions older than the 24h window don't count; moderation log
  // entries (no actionType) are not review decisions.
  const mixed = [
    ...twelve,
    { actionType: 'proof_review_action', createdAt: { toMillis: () => NOW - 25 * 3600 * 1000 } },
    { actionType: 'proof_review_action', createdAt: { toMillis: () => NOW - 48 * 3600 * 1000 } },
    { action: 'remove', createdAt: { toMillis: () => NOW - 3600 * 1000 } },
  ];
  assert.equal(computeReviewVelocity(mixed, { nowMs: NOW }).decisions, 12);

  // The log read cap binds only when the oldest returned log is still
  // inside the window — then the display says the count is a lower bound.
  const capped = computeReviewVelocity(twelve, { nowMs: NOW, limitReached: true });
  assert.equal(capped.capped, true);
  assert.equal(capped.display, '≥0.5 p/h');
  const uncapped = computeReviewVelocity(
    [...twelve, { actionType: 'proof_review_action', createdAt: { toMillis: () => NOW - 30 * 3600 * 1000 } }],
    { nowMs: NOW, limitReached: true },
  );
  assert.equal(uncapped.capped, false);
  assert.equal(uncapped.display, '0.5 p/h');
});

test('Q8: the queue count is one merged number on every tab and on the board', () => {
  const service = read('src/services/submissionService.ts');
  // Diagnostics carries the unified count + oldest-waiting age + window flag.
  assert.match(service, /pendingReviewCount: number;/);
  assert.match(service, /oldestPendingAtMs: number \| null;/);
  assert.match(service, /windowCapped: boolean;/);
  // The console reads it (not the per-tab rendered length).
  const page = read('src/pages/AdminProofReview.tsx');
  assert.match(page, /diagnostics\?\.pendingReviewCount/);
  assert.doesNotMatch(page, /velocity: '2\.4 p\/h'/);
  // The board reads the same diagnostics field through the same
  // subscription — its old root-entries raw-status query is gone.
  const board = read('src/pages/AdminBoard.tsx');
  assert.match(board, /diagnostics\.pendingReviewCount/);
  assert.match(board, /subscribeToAdminPendingReviews\(/);
  assert.doesNotMatch(board, /where\('status', 'in'/);
  assert.doesNotMatch(board, /collection\(db, 'entries'\)/);
  // Depth bands are unchanged (20/50).
  assert.equal(queueDepthLabel(0), 'Clear');
  assert.equal(queueDepthLabel(20), 'Clear');
  assert.equal(queueDepthLabel(21), 'Congested');
  assert.equal(queueDepthLabel(51), 'Critical');
});

test('Q8: no hardcoded stat literals remain in the admin pages', () => {
  const gone = [
    '2.4',
    '99.998%',
    '4.2GB',
    '42ms',
    '88%_CAPACITY',
    'STABILITY 100%',
    'ACTIVE: 32',
    'DRAFT: 8',
    '0ms Latency',
    'V1.2.4',
    '3_OPS_IN_THE_LOOP',
    'Next Auto-Purge: 3d',
    "totalMissions: 42",
  ];
  for (const rel of ['src/pages/AdminProofReview.tsx', 'src/pages/AdminBoard.tsx', 'src/components/admin/AdminShared.tsx']) {
    const source = read(rel);
    for (const literal of gone) {
      assert.ok(!source.includes(literal), `${rel} still contains hardcoded stat: ${literal}`);
    }
  }
  // And the replacements are real: velocity from adminLogs, latency from
  // a live /api/health probe, deck counts from the registries.
  const page = read('src/pages/AdminProofReview.tsx');
  assert.match(page, /subscribeToAdminLogs\(REVIEW_VELOCITY_LOG_LIMIT/);
  assert.match(page, /computeReviewVelocity\(logs/);
  const shared = read('src/components/admin/AdminShared.tsx');
  assert.match(shared, /fetch\('\/api\/health'/);
  assert.doesNotMatch(shared, /DEX_LOAD/);
  const board = read('src/pages/AdminBoard.tsx');
  assert.match(board, /DECK_PACKS\.length/);
  assert.match(board, /ALL_CHALLENGE_CARDS\.length/);
  assert.match(board, /OLDEST_WAITING/);
  assert.match(board, /LAST_SYNC/);
});
