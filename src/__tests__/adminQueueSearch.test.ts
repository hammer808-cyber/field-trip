import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { filterQueueRecordsBySearch } from '../logic/adminQueueStats';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

const records = [
  {
    id: 'entry-aaa',
    entryId: 'entry-aaa',
    userId: 'oae0GwP7mpcUX7i93AeDGd22VNu2',
    uid: 'oae0GwP7mpcUX7i93AeDGd22VNu2',
    displayName: 'Zacking_off',
    userName: 'Zacking_off',
    missionTitle: 'Snack Council Minutes',
    challengeTitle: 'Snack Council Minutes',
    tripTitle: 'Snack Council Minutes',
  },
  {
    id: 'entry-bbb',
    entryId: 'entry-bbb',
    userId: 'ap05XX3Wl5gQzsYWhRWnlHTogWf2',
    uid: 'ap05XX3Wl5gQzsYWhRWnlHTogWf2',
    displayName: 'mexmax73',
    userName: 'mexmax73',
    missionTitle: 'The Initial Signal',
    challengeTitle: 'The Initial Signal',
    tripTitle: 'The Initial Signal',
  },
  {
    id: 'entry-ccc',
    entryId: 'entry-ccc',
    userId: 'oae0GwP7mpcUX7i93AeDGd22VNu2',
    uid: 'oae0GwP7mpcUX7i93AeDGd22VNu2',
    displayName: 'Zacking_off',
    userName: 'Zacking_off',
    missionTitle: 'Heat Signature',
    challengeTitle: 'Heat Signature',
    tripTitle: 'Heat Signature',
  },
];

test('Q10: search filters by agent ID (userId substring, case-insensitive)', () => {
  assert.deepEqual(
    filterQueueRecordsBySearch(records, 'OAE0GWP7').map(r => r.id),
    ['entry-aaa', 'entry-ccc'],
  );
  assert.deepEqual(
    filterQueueRecordsBySearch(records, 'ap05xx3w').map(r => r.id),
    ['entry-bbb'],
  );
});

test('Q10: search filters by display name', () => {
  assert.deepEqual(
    filterQueueRecordsBySearch(records, 'mexmax').map(r => r.id),
    ['entry-bbb'],
  );
  assert.deepEqual(
    filterQueueRecordsBySearch(records, 'ZACKING').map(r => r.id),
    ['entry-aaa', 'entry-ccc'],
  );
});

test('Q10: search filters by mission title and entry ID', () => {
  assert.deepEqual(
    filterQueueRecordsBySearch(records, 'heat signature').map(r => r.id),
    ['entry-ccc'],
  );
  assert.deepEqual(
    filterQueueRecordsBySearch(records, 'entry-bbb').map(r => r.id),
    ['entry-bbb'],
  );
});

test('Q10: blank query returns the full list unchanged; clearing restores it', () => {
  assert.strictEqual(filterQueueRecordsBySearch(records, ''), records);
  assert.strictEqual(filterQueueRecordsBySearch(records, '   '), records);
  const narrowed = filterQueueRecordsBySearch(records, 'mexmax');
  assert.equal(narrowed.length, 1);
  // Clearing the box (empty query) restores the full list.
  assert.strictEqual(filterQueueRecordsBySearch(records, ''), records);
});

test('Q10: a query with no matches returns an empty list, not a stale list', () => {
  assert.deepEqual(filterQueueRecordsBySearch(records, 'no-such-agent'), []);
});

test('Q10: the console wires the box to the filtered list in both views', () => {
  const page = read('src/pages/AdminProofReview.tsx');
  // The input is controlled: typing updates the query.
  assert.ok(page.includes('value={searchQuery}'), 'search input must be controlled');
  assert.ok(
    page.includes('onChange={(event) => handleSearchChange(event.target.value)}'),
    'search input must update the query on change',
  );
  // The filter applies to the merged records before paging, and both views
  // render from the filtered list — not from the raw subscription.
  assert.ok(page.includes('filterQueueRecordsBySearch(reviews, searchQuery)'));
  assert.ok(page.includes('entry={filteredReviews[0]}'), 'swipe view must use the filtered list');
  assert.ok(page.includes('total={filteredReviews.length}'), 'table view must count the filtered list');
  assert.ok(
    page.includes('No records match'),
    'a query with no matches must show the empty state, not a stale list',
  );
  // The placeholder text and styling are unchanged.
  assert.ok(page.includes('placeholder="SEARCH_BY_AGENT_ID..."'));
});
