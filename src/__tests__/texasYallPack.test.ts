import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { COLLECTION_META, COLLECTION_SHELF_ORDER, getAllStickers, getStickerById } from '../data/stickers';

function md5(filePath: string): string {
  return createHash('md5').update(fs.readFileSync(filePath)).digest('hex');
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function assertPng(filePath: string): void {
  assert.ok(fs.existsSync(filePath), `sticker image missing: ${filePath}`);
  const bytes = fs.readFileSync(filePath);
  assert.ok(bytes.length > 20000, `${filePath} is suspiciously small (${bytes.length} bytes)`);
  assert.ok(
    bytes.subarray(0, 8).equals(PNG_SIGNATURE),
    `${filePath} does not start with PNG signature bytes`
  );
  // IHDR bit depth lives at byte 24, color type at byte 25: 6 = truecolor
  // with alpha (RGBA). (Byte 26 is the compression method, always 0.)
  assert.equal(bytes[25], 6, `${filePath} must be RGBA (color type 6), got ${bytes[25]}`);
}

/**
 * TEXAS Y'ALL PACK (Nov 20, 2026; design approved, docs/sticker-texas-yall-design.md).
 * The first deck-specific pack: 10 stickers for deck FT-06 "Get It, Y'all"
 * (pack id texas-get-it-yall, 15 missions texas-01..texas-15). Every entry
 * carries deckId 'texas-get-it-yall'; 8 mission stickers also carry the
 * missionId they unlock on. 01 fires on the first approved Texas proof,
 * 06 (Texas Gold, the 4th legendary) on completing the whole Texas deck.
 *
 * Art: the ZIP (fieldtrip_texas_yall_10_transparent_pngs_71_sgor.zip) held
 * 10 RGBA PNGs with neighboring-sheet bleed at the edges. Trimmed by
 * connected-component analysis (design §9): foreign slivers removed,
 * sticker art untouched. The md5s below pin the POST-TRIM files; the
 * pre-trim ZIP is untouched in the user's files.
 */
const TEXAS_YALL_PACK: ReadonlyArray<{
  id: string;
  name: string;
  file: string;
  collection: 'texas_yall';
  displayOrder: number;
  rarity: 'common' | 'rare' | 'legendary';
  trigger: 'first_approval' | 'challenge_approved' | 'season_milestone';
  missionId?: string;
  md5: string;
  width: number;
  height: number;
}> = [
  { id: 'texas_yall_01', name: 'Texas Y\'all', file: '01_texas_yall_sign.png', collection: 'texas_yall', displayOrder: 1, rarity: 'common', trigger: 'first_approval', md5: '7d6293cfdc14995831a3ff3e5c0fc733', width: 422, height: 385 },
  { id: 'texas_yall_02', name: 'Big Mood Longhorn', file: '02_big_mood_longhorn.png', collection: 'texas_yall', displayOrder: 2, rarity: 'rare', trigger: 'challenge_approved', missionId: 'texas-08', md5: '62daaf653aef0a2108e41235484800c3', width: 595, height: 384 },
  { id: 'texas_yall_03', name: 'These Boots', file: '03_these_boots.png', collection: 'texas_yall', displayOrder: 3, rarity: 'common', trigger: 'challenge_approved', missionId: 'texas-03', md5: 'c740df89d6e0abc1d141bdcce4369a67', width: 450, height: 410 },
  { id: 'texas_yall_04', name: 'Prickly Personality', file: '04_prickly_personality.png', collection: 'texas_yall', displayOrder: 4, rarity: 'rare', trigger: 'challenge_approved', missionId: 'texas-13', md5: 'ba5cac977c7b48d8f2ca24117e355c3c', width: 376, height: 400 },
  { id: 'texas_yall_05', name: 'Lone Star State', file: '05_lone_star_state.png', collection: 'texas_yall', displayOrder: 5, rarity: 'common', trigger: 'challenge_approved', missionId: 'texas-10', md5: 'a79e97a8f8681ffc3336ea3abfc6d2bb', width: 422, height: 355 },
  { id: 'texas_yall_06', name: 'Texas Gold', file: '06_texas_gold.png', collection: 'texas_yall', displayOrder: 6, rarity: 'legendary', trigger: 'season_milestone', md5: 'e9127dc85b25eca2fb737e346e5d76ee', width: 566, height: 355 },
  { id: 'texas_yall_07', name: 'Smoke Show', file: '07_smoke_show.png', collection: 'texas_yall', displayOrder: 7, rarity: 'common', trigger: 'challenge_approved', missionId: 'texas-06', md5: '4e5aceb89c8be64cc3b6db65a38394a4', width: 470, height: 370 },
  { id: 'texas_yall_08', name: 'Taco Detour', file: '08_taco_detour.png', collection: 'texas_yall', displayOrder: 8, rarity: 'common', trigger: 'challenge_approved', missionId: 'texas-02', md5: '9f0bf6b2be6640b32b54278f81c39683', width: 475, height: 334 },
  { id: 'texas_yall_09', name: 'Armadillo After Hours', file: '09_armadillo_after_hours.png', collection: 'texas_yall', displayOrder: 9, rarity: 'rare', trigger: 'challenge_approved', missionId: 'texas-12', md5: '9b22214f17e4251a58f253600c5d9f90', width: 610, height: 335 },
  { id: 'texas_yall_10', name: 'Lone Star Refreshment', file: '10_lone_star_refreshment.png', collection: 'texas_yall', displayOrder: 10, rarity: 'common', trigger: 'challenge_approved', missionId: 'texas-11', md5: 'cf0701cc6b47fff8c1888d451e618dbd', width: 491, height: 339 }
];

test('texas y\'all pack: all ten are registered as deck-scoped Texas stickers with the right collection, order, rarity, trigger and mission', () => {
  const all = getAllStickers();
  assert.equal(all.length, 118, '108 before the Texas Y\'all pack + 10 new entries');

  const texas = all.filter(sticker => sticker.collection === 'texas_yall');
  assert.equal(texas.length, 10, 'Texas Y\'all holds exactly its 10 pack entries');

  for (const expected of TEXAS_YALL_PACK) {
    const sticker = getStickerById(expected.id);
    assert.ok(sticker, `${expected.id} is not registered`);
    assert.equal(sticker.name, expected.name);
    assert.equal(sticker.archetype, undefined, `${expected.id} is cross-pack (no archetype)`);
    assert.equal(sticker.collection, expected.collection);
    assert.equal(sticker.displayOrder, expected.displayOrder);
    assert.equal(sticker.rarity, expected.rarity);
    assert.equal(sticker.imageUrl, `/assets/stickers/texas_yall/${expected.file}`);
    assert.equal(sticker.awardTrigger, expected.trigger);
    assert.equal(sticker.deckId, 'texas-get-it-yall', `${expected.id} must be deck-scoped to Texas`);
    assert.equal(sticker.missionId, expected.missionId, `${expected.id} missionId`);
    assert.equal(sticker.secret, undefined, `${expected.id} is not secret`);
    assert.ok(sticker.unlockReason.length > 0);
  }
});

test('texas y\'all pack: the ten images are the trimmed PNGs (RGBA, pinned md5 and dimensions)', () => {
  for (const expected of TEXAS_YALL_PACK) {
    const filePath = path.join('public', 'assets', 'stickers', 'texas_yall', expected.file);
    assertPng(filePath);
    const bytes = fs.readFileSync(filePath);
    // Trimmed files land ~208–375 KB.
    assert.ok(bytes.length > 100000, `${expected.file} is suspiciously small (${bytes.length} bytes)`);
    assert.ok(bytes.length < 400000, `${expected.file} is suspiciously large (${bytes.length} bytes)`);
    // IHDR width/height are big-endian uint32 at bytes 16-19 / 20-23.
    assert.equal(bytes.readUInt32BE(16), expected.width, `${expected.file} width`);
    assert.equal(bytes.readUInt32BE(20), expected.height, `${expected.file} height`);
    assert.equal(md5(filePath), expected.md5, `${expected.file} md5`);
  }
});

test('texas y\'all pack: firestore.rules whitelists the ten new ids', () => {
  const rules = fs.readFileSync('firestore.rules', 'utf8');
  for (const expected of TEXAS_YALL_PACK) {
    assert.ok(rules.includes(`'${expected.id}'`), `rules must whitelist ${expected.id}`);
  }
});

test('texas y\'all pack: Texas Y\'all is a deck collection in the Dex grouping', () => {
  const meta = COLLECTION_META.texas_yall;
  assert.ok(meta, 'texas_yall needs collection metadata');
  assert.equal(meta.isDeckCollection, true, 'texas_yall must be flagged as a deck collection');
  assert.ok(
    COLLECTION_SHELF_ORDER.includes('texas_yall'),
    'texas_yall must be in the shelf order so its shelf renders'
  );
});

test('texas y\'all pack: Texas Gold is the fourth legendary', () => {
  const legendaries = getAllStickers().filter(sticker => sticker.rarity === 'legendary');
  assert.equal(legendaries.length, 4);
  assert.ok(legendaries.some(sticker => sticker.id === 'texas_yall_06'));
});
