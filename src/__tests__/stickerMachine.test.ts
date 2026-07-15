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
  assert.equal(stickers.length, 42);
  assert.deepEqual(
    STICKER_FILTER_OPTIONS.map(option => option.label),
    ['All', 'Captain Clipboard', 'Mall Rat', 'Mascota', 'Elondra', 'Lost Camper', 'Bigfoot']
  );
  assert.equal(filterStickersByArchetype(stickers, 'all').length, stickers.length);
});

test('each Field Type filter returns only its seven registered stickers', () => {
  const stickers = getAllStickers();
  for (const option of STICKER_FILTER_OPTIONS) {
    if (option.id === 'all') continue;
    const filtered = filterStickersByArchetype(stickers, option.id);
    assert.equal(filtered.length, 7, `${option.label} should have seven stickers`);
    assert.ok(filtered.every(sticker => sticker.archetype === option.id));
  }
});

test('profile featuring permits three stickers, rejects a fourth, and always permits removal', () => {
  assert.equal(MAX_FEATURED_STICKERS, 3);
  assert.equal(canSetStickerFeatured(2, false, true), true);
  assert.equal(canSetStickerFeatured(3, false, true), false);
  assert.equal(canSetStickerFeatured(3, true, true), true);
  assert.equal(canSetStickerFeatured(3, true, false), true);
});

