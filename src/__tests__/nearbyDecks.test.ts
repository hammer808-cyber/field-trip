import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DECK_PACKS,
  getActiveDeckPacks,
  getDeckCatalogSections,
  getDeckPackById
} from '../data/deckPacks';
import { getNearbyDeckPackIds, isPointInRegion } from '../logic/nearbyDecks';
import type { DeckHomeRegion, DeckPack } from '../types/deckPacks';

// Near You (option A, Nov 20, 2026): deck-level region matching. A point
// inside a deck's home-region bounding box counts as "near" — the deck
// floats to the top of its section with a "Near you" badge. Sorting only:
// no points, awards, unlocks, or scoring change.

const TEXAS_REGION: DeckHomeRegion = {
  minLat: 25.84,
  maxLat: 36.5,
  minLng: -106.65,
  maxLng: -93.51,
  label: 'Texas'
};

const SOCAL_REGION: DeckHomeRegion = {
  minLat: 32.53,
  maxLat: 34.35,
  minLng: -120.65,
  maxLng: -117.0,
  label: 'SoCal coast'
};

test('region containment: inside, outside, and edges are inclusive', () => {
  assert.equal(isPointInRegion(32.75, -97.0, TEXAS_REGION), true); // Grand Prairie
  assert.equal(isPointInRegion(30.27, -97.74, TEXAS_REGION), true); // Austin
  assert.equal(isPointInRegion(25.84, -100.0, TEXAS_REGION), true); // south edge
  assert.equal(isPointInRegion(36.5, -100.0, TEXAS_REGION), true); // north edge
  assert.equal(isPointInRegion(30.0, -106.65, TEXAS_REGION), true); // west edge
  assert.equal(isPointInRegion(30.0, -93.51, TEXAS_REGION), true); // east edge
  assert.equal(isPointInRegion(25.84, -106.65, TEXAS_REGION), true); // corner
  assert.equal(isPointInRegion(25.83, -100.0, TEXAS_REGION), false); // just south
  assert.equal(isPointInRegion(36.51, -100.0, TEXAS_REGION), false); // just north
  assert.equal(isPointInRegion(30.0, -106.66, TEXAS_REGION), false); // just west
  assert.equal(isPointInRegion(30.0, -93.5, TEXAS_REGION), false); // just east
  assert.equal(isPointInRegion(40.71, -74.0, TEXAS_REGION), false); // New York
});

test('region data: Texas and SoCal carry exactly the design-table boxes, and no other deck has a region', () => {
  assert.deepEqual(getDeckPackById('texas-get-it-yall')?.homeRegion, TEXAS_REGION);
  assert.deepEqual(getDeckPackById('socal-summer')?.homeRegion, SOCAL_REGION);
  const withRegion = DECK_PACKS.filter(pack => pack.homeRegion).map(pack => pack.packId).sort();
  assert.deepEqual(withRegion, ['socal-summer', 'texas-get-it-yall']);
});

test('nearby decks: Grand Prairie boosts Texas only, Long Beach boosts SoCal only, New York boosts nothing', () => {
  const packs = getActiveDeckPacks();
  assert.deepEqual([...getNearbyDeckPackIds(32.75, -97.0, packs)], ['texas-get-it-yall']);
  assert.deepEqual([...getNearbyDeckPackIds(33.77, -118.19, packs)], ['socal-summer']);
  assert.deepEqual([...getNearbyDeckPackIds(40.71, -74.0, packs)], []);
  // A point in the other region's box is outside this one — the boxes do
  // not overlap, so a player is never "near" both at once.
  assert.equal(getNearbyDeckPackIds(32.75, -97.0, packs).has('socal-summer'), false);
  assert.equal(getNearbyDeckPackIds(33.77, -118.19, packs).has('texas-get-it-yall'), false);
});

test('nearby decks: decks without a home region are never boosted', () => {
  const packs = getActiveDeckPacks();
  const noRegion = packs.filter(pack => !pack.homeRegion);
  assert.ok(noRegion.length > 0, 'expected decks without a region in the catalog');
  for (const latLng of [[32.75, -97.0], [33.77, -118.19], [0, 0]] as const) {
    const nearby = getNearbyDeckPackIds(latLng[0], latLng[1], packs);
    for (const pack of noRegion) {
      assert.equal(nearby.has(pack.packId), false, `${pack.packId} must never boost`);
    }
  }
});

function makePack(overrides: Partial<DeckPack> & { packId: string }): DeckPack {
  return {
    packName: overrides.packId,
    shortName: overrides.packId,
    description: 'test deck',
    missionIds: ['m1'],
    unlockRule: 'immediate',
    visibility: 'public',
    isActive: true,
    fallbackIcon: 'Zap',
    sortOrder: 1,
    ...overrides
  };
}

test('sort float: a boosted deck leads its own section even with a worse sortOrder, unboosted order unchanged', () => {
  const packs = [
    makePack({ packId: 'early-deck', packName: 'Early Deck', sortOrder: 1, catalogSection: 'local-fieldtrips' }),
    makePack({ packId: 'texas-get-it-yall', packName: "Get It, Y'all", sortOrder: 2, catalogSection: 'local-fieldtrips', homeRegion: TEXAS_REGION }),
    makePack({ packId: 'socal-summer', packName: 'Summer SoCal', sortOrder: 2, catalogSection: 'local-fieldtrips', homeRegion: SOCAL_REGION })
  ];
  const plain = getDeckCatalogSections(packs).find(s => s.id === 'local-fieldtrips')!.packs.map(p => p.packId);
  assert.deepEqual(plain, ['early-deck', 'texas-get-it-yall', 'socal-summer']);

  const inTexas = getDeckCatalogSections(packs, new Set(['texas-get-it-yall']))
    .find(s => s.id === 'local-fieldtrips')!.packs.map(p => p.packId);
  assert.deepEqual(inTexas, ['texas-get-it-yall', 'early-deck', 'socal-summer']);

  const inSocal = getDeckCatalogSections(packs, new Set(['socal-summer']))
    .find(s => s.id === 'local-fieldtrips')!.packs.map(p => p.packId);
  assert.deepEqual(inSocal, ['socal-summer', 'early-deck', 'texas-get-it-yall']);

  // Null / omitted nearby means the normal sort.
  assert.deepEqual(
    getDeckCatalogSections(packs, null).find(s => s.id === 'local-fieldtrips')!.packs.map(p => p.packId),
    plain
  );
});

test('sort float: boosted packs sort among themselves by sortOrder then name', () => {
  const packs = [
    makePack({ packId: 'b-deck', packName: 'B Deck', sortOrder: 2, catalogSection: 'local-fieldtrips', homeRegion: TEXAS_REGION }),
    makePack({ packId: 'a-deck', packName: 'A Deck', sortOrder: 2, catalogSection: 'local-fieldtrips', homeRegion: TEXAS_REGION }),
    makePack({ packId: 'c-deck', packName: 'C Deck', sortOrder: 1, catalogSection: 'local-fieldtrips', homeRegion: TEXAS_REGION })
  ];
  const boosted = getDeckCatalogSections(packs, new Set(['a-deck', 'b-deck', 'c-deck']))
    .find(s => s.id === 'local-fieldtrips')!.packs.map(p => p.packId);
  assert.deepEqual(boosted, ['c-deck', 'a-deck', 'b-deck']);
});

test('sort float: section order is unchanged when a later section holds the boosted deck', () => {
  const packs = [
    makePack({ packId: 'always-deck', packName: 'Always Deck', sortOrder: 1, catalogSection: 'always-on' }),
    makePack({ packId: 'texas-get-it-yall', packName: "Get It, Y'all", sortOrder: 2, catalogSection: 'local-fieldtrips', homeRegion: TEXAS_REGION })
  ];
  const sections = getDeckCatalogSections(packs, new Set(['texas-get-it-yall']));
  assert.deepEqual(sections.map(s => s.id), ['always-on', 'local-fieldtrips']);
  assert.deepEqual(
    sections.find(s => s.id === 'local-fieldtrips')!.packs.map(p => p.packId),
    ['texas-get-it-yall']
  );
});

test('sort float: a locked deck can still be boosted — sorting never considers lock state', () => {
  const packs = [
    makePack({ packId: 'early-deck', packName: 'Early Deck', sortOrder: 1, catalogSection: 'local-fieldtrips' }),
    makePack({ packId: 'future-deck', packName: 'Future Deck', sortOrder: 3, catalogSection: 'local-fieldtrips', isFutureDrop: true, homeRegion: TEXAS_REGION })
  ];
  const boosted = getDeckCatalogSections(packs, new Set(['future-deck']))
    .find(s => s.id === 'local-fieldtrips')!.packs.map(p => p.packId);
  assert.deepEqual(boosted, ['future-deck', 'early-deck']);
});
