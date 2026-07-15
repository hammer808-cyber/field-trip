import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addZineStickerPlacement,
  createZineStickerPlacement,
  getInvalidZineStickerIds,
  getZinePageStickerPlacements,
  MAX_ZINE_PAGE_STICKERS,
  normalizeZineStickerPlacements,
  removeZineStickerPlacement
} from '../logic/zineStickerPlacements';

const UNLOCKED_STICKER_ID = 'captain_clipboard_checkmark_seal';
const LOCKED_STICKER_ID = 'bigfoot_blurry_polaroid';

test('zine placements store registry IDs and numeric placement data, never image URLs', () => {
  const placements = normalizeZineStickerPlacements([{
    stickerId: UNLOCKED_STICKER_ID,
    x: 24,
    y: 76,
    rotation: -8,
    scale: 1.1,
    imageUrl: 'https://should-not-be-stored.example/sticker.png'
  }]);

  assert.deepEqual(placements, [{
    stickerId: UNLOCKED_STICKER_ID,
    x: 24,
    y: 76,
    rotation: -8,
    scale: 1.1
  }]);
  assert.equal('imageUrl' in placements[0], false);
});

test('legacy stickerIds remain readable but explicit empty placements stay empty', () => {
  const legacy = getZinePageStickerPlacements({ stickerIds: [UNLOCKED_STICKER_ID] });
  assert.equal(legacy.length, 1);
  assert.equal(legacy[0].stickerId, UNLOCKED_STICKER_ID);

  const explicitlyEmpty = getZinePageStickerPlacements({
    stickers: [],
    stickerIds: [UNLOCKED_STICKER_ID]
  });
  assert.deepEqual(explicitlyEmpty, []);
});

test('locked and unknown stickers fail canonical zine eligibility validation', () => {
  const placements = [
    createZineStickerPlacement(UNLOCKED_STICKER_ID, 0),
    createZineStickerPlacement(LOCKED_STICKER_ID, 1),
    createZineStickerPlacement('unknown_sticker', 2)
  ];
  const invalid = getInvalidZineStickerIds(placements, new Set([UNLOCKED_STICKER_ID]));
  assert.deepEqual(invalid, [LOCKED_STICKER_ID, 'unknown_sticker']);
});

test('tap-to-add prevents duplicates, enforces the page limit, and supports removal', () => {
  let placements = addZineStickerPlacement([], UNLOCKED_STICKER_ID);
  placements = addZineStickerPlacement(placements, UNLOCKED_STICKER_ID);
  assert.equal(placements.length, 1);

  for (let index = 1; index < MAX_ZINE_PAGE_STICKERS + 3; index += 1) {
    placements = addZineStickerPlacement(placements, `test_sticker_${index}`);
  }
  assert.equal(placements.length, MAX_ZINE_PAGE_STICKERS);
  assert.equal(removeZineStickerPlacement(placements, UNLOCKED_STICKER_ID).length, MAX_ZINE_PAGE_STICKERS - 1);
});

