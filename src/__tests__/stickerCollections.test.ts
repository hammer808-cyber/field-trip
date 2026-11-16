import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  COLLECTION_META,
  COLLECTION_SHELF_ORDER,
  getAllStickers,
  getStickersByCollection,
  type StickerCollection,
  type StickerDefinition
} from '../data/stickers';
import { filterStickersByArchetype } from '../components/stickers/StickerGrid';

const EXPECTED_COUNTS: Readonly<Record<StickerCollection, number>> = {
  explorer: 18,
  adventure: 8,
  achievement: 12,
  social: 4,
  chaos: 0,
  limited_edition: 0
};

test('every sticker has exactly one valid collection and the counts match the Stage 3 mapping', () => {
  const stickers = getAllStickers();
  assert.equal(stickers.length, 42);
  const validCollections = new Set<string>(COLLECTION_SHELF_ORDER);
  for (const sticker of stickers) {
    assert.ok(validCollections.has(sticker.collection), `${sticker.id} has an unknown collection`);
  }
  for (const collection of COLLECTION_SHELF_ORDER) {
    assert.equal(
      getStickersByCollection(collection).length,
      EXPECTED_COUNTS[collection],
      `${collection} should have ${EXPECTED_COUNTS[collection]} stickers`
    );
  }
});

test('rarity is 3 levels: no uncommon remains', () => {
  const stickers = getAllStickers();
  assert.ok(stickers.every(sticker => ['common', 'rare', 'legendary'].includes(sticker.rarity)));
  assert.equal(stickers.filter(sticker => sticker.rarity === 'common').length, 26);
  assert.equal(stickers.filter(sticker => sticker.rarity === 'rare').length, 13);
  assert.equal(stickers.filter(sticker => sticker.rarity === 'legendary').length, 3);
});

test('displayOrder is unique within each collection and getStickersByCollection sorts by it', () => {
  for (const collection of COLLECTION_SHELF_ORDER) {
    const inCollection = getStickersByCollection(collection);
    const orders = inCollection.map(sticker => sticker.displayOrder);
    assert.equal(new Set(orders).size, orders.length, `${collection} has duplicate displayOrder values`);
    const sorted = [...orders].sort((a, b) => (a ?? Infinity) - (b ?? Infinity));
    assert.deepEqual(orders, sorted, `${collection} is not in displayOrder`);
  }
});

test('every catalog imageUrl resolves to a real file under public/', () => {
  for (const sticker of getAllStickers()) {
    assert.ok(sticker.imageUrl.startsWith('/assets/stickers/'), `${sticker.id} has an unexpected imageUrl`);
    const filePath = path.join('public', sticker.imageUrl);
    assert.ok(fs.existsSync(filePath), `${sticker.id} imageUrl does not resolve: ${filePath}`);
  }
});

test('collection metadata covers all six collections in the approved shelf order', () => {
  assert.deepEqual([...COLLECTION_SHELF_ORDER], [
    'explorer',
    'adventure',
    'achievement',
    'social',
    'chaos',
    'limited_edition'
  ]);
  for (const collection of COLLECTION_SHELF_ORDER) {
    const meta = COLLECTION_META[collection];
    assert.ok(meta.label.length > 0, `${collection} needs a label`);
    assert.ok(meta.tagline.length > 0, `${collection} needs a tagline`);
    assert.ok(meta.emptyState.length > 0, `${collection} needs empty-state copy`);
  }
  assert.equal(getStickersByCollection('chaos').length, 0);
  assert.equal(getStickersByCollection('limited_edition').length, 0);
});

test('a cross-pack sticker (no archetype) is never hidden by the archetype filter', () => {
  const crossPack: StickerDefinition = {
    id: 'cross_pack_example',
    name: 'Cross-Pack Example',
    collection: 'chaos',
    displayOrder: 1,
    imageUrl: '/assets/stickers/chaos/example.png',
    rarity: 'common',
    awardTrigger: 'mission_count_milestone',
    unlockReason: 'Example cross-pack sticker.',
    tags: []
  };
  const stickers = [...getAllStickers(), crossPack];
  for (const archetype of ['captainClipboard', 'mallRat', 'mascota', 'elondra', 'lostCamper', 'bigfoot'] as const) {
    const filtered = filterStickersByArchetype(stickers, archetype);
    assert.ok(
      filtered.some(sticker => sticker.id === 'cross_pack_example'),
      `cross-pack sticker should appear under the ${archetype} filter`
    );
  }
});
