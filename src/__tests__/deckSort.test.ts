import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { DECK_PACK_SORTS, isDeckPackSort, sortDeckPacks } from '../logic/deckSort';
import type { DeckPack } from '../types/deckPacks';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

function pack(packId: string, packName: string, sortOrder = 0): DeckPack {
  return {
    packId,
    packName,
    shortName: packId,
    description: '',
    missionIds: [],
    unlockRule: 'immediate',
    visibility: 'public' as DeckPack['visibility'],
    isActive: true,
    fallbackIcon: '📦',
    sortOrder,
  };
}

test('deck sort: the four sort options are catalog, name, most and least complete', () => {
  assert.deepEqual(
    DECK_PACK_SORTS.map((option) => option.id),
    ['catalog', 'name', 'progress-desc', 'progress-asc'],
  );
  assert.equal(isDeckPackSort('catalog'), true);
  assert.equal(isDeckPackSort('name'), true);
  assert.equal(isDeckPackSort('bogus'), false);
  assert.equal(isDeckPackSort(null), false);
});

test('deck sort: catalog order returns the packs untouched, in the order they arrived', () => {
  const packs = [pack('b', 'Beta', 2), pack('a', 'Alpha', 1)];
  assert.deepEqual(sortDeckPacks(packs, 'catalog').map((p) => p.packId), ['b', 'a']);
  // The input is never mutated.
  assert.deepEqual(packs.map((p) => p.packId), ['b', 'a']);
});

test('deck sort: name sorts A–Z', () => {
  const packs = [pack('texas', 'Texas, Y\u2019all'), pack('socal', 'SoCal Summer'), pack('starter', 'Starter Signals')];
  assert.deepEqual(sortDeckPacks(packs, 'name').map((p) => p.packId), ['socal', 'starter', 'texas']);
});

test('deck sort: most complete first, ties by name; missing progress counts as 0%', () => {
  const packs = [pack('a', 'Alpha'), pack('b', 'Beta'), pack('c', 'Gamma'), pack('d', 'Delta')];
  const progress = { a: 50, b: 100, c: 50 };
  assert.deepEqual(
    sortDeckPacks(packs, 'progress-desc', progress).map((p) => p.packId),
    ['b', 'a', 'c', 'd'],
  );
});

test('deck sort: least complete first, ties by name', () => {
  const packs = [pack('a', 'Alpha'), pack('b', 'Beta'), pack('c', 'Gamma'), pack('d', 'Delta')];
  const progress = { a: 50, b: 100, c: 50 };
  assert.deepEqual(
    sortDeckPacks(packs, 'progress-asc', progress).map((p) => p.packId),
    ['d', 'a', 'c', 'b'],
  );
});

test('deck sort: sorting never drops a pack', () => {
  const packs = [pack('a', 'Alpha'), pack('b', 'Beta')];
  for (const sort of ['catalog', 'name', 'progress-desc', 'progress-asc'] as const) {
    assert.equal(sortDeckPacks(packs, sort, { a: 10, b: 90 }).length, 2);
  }
});

test('deck sort: the Dex Decks tab wires the sort control to the helper (Nov 20, 2026)', () => {
  const collection = read('src/pages/Collection.tsx');
  assert.match(collection, /id="dex-deck-sort"/);
  assert.match(collection, /DECK_PACK_SORTS\.map/);
  assert.match(collection, /sortDeckPacks\(section\.packs, deckSort, deckProgressById\)/);
  assert.match(collection, /localStorage\.getItem\('dex-deck-sort'\)/);
  assert.match(collection, /localStorage\.setItem\('dex-deck-sort', value\)/);
  // The sort reorders within sections — the catalog sections function
  // itself is untouched, so the Missions deck chooser keeps its order.
  const selector = read('src/components/DeckPackSelector.tsx');
  assert.doesNotMatch(selector, /deckSort|sortDeckPacks/);
});
