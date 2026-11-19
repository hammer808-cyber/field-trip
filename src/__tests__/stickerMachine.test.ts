import assert from 'node:assert/strict';
import test from 'node:test';
import { getAllStickers } from '../data/stickers';
import {
  canSetStickerFeatured,
  MAX_FEATURED_STICKERS
} from '../services/stickerService';
import {
  filterStickersByArchetype
} from '../components/stickers/StickerGrid';
import { STICKER_FILTER_OPTIONS } from '../components/stickers/StickerFilterTabs';

test('Sticker Machine exposes all required filters and every registry sticker', () => {
  const stickers = getAllStickers();
  assert.equal(stickers.length, 81);
  assert.deepEqual(
    STICKER_FILTER_OPTIONS.map(option => option.label),
    ['All', 'Captain Clipboard', 'Mall Rat', 'Mascota', 'Elondra', 'Lost Camper', 'Bigfoot']
  );
  assert.equal(filterStickersByArchetype(stickers, 'all').length, stickers.length);
});

test('each Field Type filter returns its registered stickers plus the cross-pack set', () => {
  const stickers = getAllStickers();
  const crossPack = stickers.filter(sticker => sticker.archetype === undefined);
  // Mall Rat grew from 7 to 15 with the Nov 18 sticker pack (Zach's call:
  // REPLACE 03 + 09, ADD the rest as new). Elondra grew from 7 to 17 with
  // the Nov 18 Elondra pack (Zach's call: ADD all ten as new). Every other
  // archetype still has 7.
  const expectedArchetypeCounts: Readonly<Record<string, number>> = {
    mallRat: 15,
    captainClipboard: 7,
    mascota: 7,
    elondra: 17,
    lostCamper: 7,
    bigfoot: 7
  };
  for (const option of STICKER_FILTER_OPTIONS) {
    if (option.id === 'all') continue;
    const expected = expectedArchetypeCounts[option.id] ?? 7;
    const filtered = filterStickersByArchetype(stickers, option.id);
    assert.equal(filtered.length, expected + crossPack.length, `${option.label} should have ${expected} stickers plus the cross-pack set`);
    assert.ok(filtered.every(sticker => sticker.archetype === option.id || sticker.archetype === undefined));
    assert.equal(
      filtered.filter(sticker => sticker.archetype === option.id).length,
      expected,
      `${option.label} should have exactly ${expected} archetype stickers`
    );
  }
});

test('profile featuring permits three stickers, rejects a fourth, and always permits removal', () => {
  assert.equal(MAX_FEATURED_STICKERS, 3);
  assert.equal(canSetStickerFeatured(2, false, true), true);
  assert.equal(canSetStickerFeatured(3, false, true), false);
  assert.equal(canSetStickerFeatured(3, true, true), true);
  assert.equal(canSetStickerFeatured(3, true, false), true);
});

