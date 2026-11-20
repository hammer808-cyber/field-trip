import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { getAllStickers, getStickerById } from '../data/stickers';

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
}

/**
 * MALL RAT PACK (Nov 18, 2026; Zach's call: REPLACE 03 + 09, ADD the
 * rest as new). The ZIP (mall_rat_stickers_01-10_transparent_45_5ubn.zip)
 * held 10 PNGs in the batch-1 style: 6 brand-new scenes + 4 same-theme
 * re-renders of existing concepts. 03_escalator_cruise and 09_mall_directory
 * REPLACE the art on mall_rat_escalator_pose and mall_rat_mall_map — the
 * replacement fixes two assets that didn't match their names (the escalator
 * art was a human girl with pink hair, not the raccoon; the map was a tiny
 * receipt-like slip). The other 8 land as new entries. All 8 new entries
 * are trigger-pending (admin_grant); do NOT give new entries
 * awardTrigger 'starter_pack' — unlockStarterPackForArchetype grants all
 * starter_pack entries at quiz time with no backfill for existing players.
 *
 * 18_mall_rat (Side Quests ZIP) is LEFT OUT by Zach's call and is nowhere
 * in this pack or the registry: 03 covers its exact scene.
 */
test('mall rat pack: the 8 new entries are registered with the right collection, order, rarity and trigger', () => {
  const expected: ReadonlyArray<{
    id: string;
    name: string;
    collection: 'explorer' | 'adventure';
    displayOrder: number;
    imageUrl: string;
    rarity: 'common' | 'rare';
  }> = [
    { id: 'mall_rat_mascot', name: 'Mall Rat Mascot', collection: 'explorer', displayOrder: 19, imageUrl: '/assets/stickers/mallRat/01_mall_rat_mascot.png', rarity: 'rare' },
    { id: 'mall_rat_bag_lounge', name: 'Bag Lounge', collection: 'explorer', displayOrder: 20, imageUrl: '/assets/stickers/mallRat/02_shopping_bag_lounge.png', rarity: 'common' },
    { id: 'mall_rat_food_court_feast', name: 'Food Court Feast', collection: 'adventure', displayOrder: 9, imageUrl: '/assets/stickers/mallRat/04_food_court_feast.png', rarity: 'common' },
    { id: 'mall_rat_shopping_cart_haul', name: 'Shopping Cart Haul', collection: 'adventure', displayOrder: 10, imageUrl: '/assets/stickers/mallRat/05_shopping_cart_haul.png', rarity: 'common' },
    { id: 'mall_rat_chunky_sneaker', name: 'Chunky Sneaker', collection: 'adventure', displayOrder: 11, imageUrl: '/assets/stickers/mallRat/06_chunky_sneaker.png', rarity: 'common' },
    { id: 'mall_rat_mirror_selfie', name: 'Mirror Selfie', collection: 'adventure', displayOrder: 12, imageUrl: '/assets/stickers/mallRat/07_mirror_selfie.png', rarity: 'common' },
    { id: 'mall_rat_mall_arcade', name: 'Mall Arcade', collection: 'adventure', displayOrder: 13, imageUrl: '/assets/stickers/mallRat/08_mall_arcade.png', rarity: 'rare' },
    { id: 'mall_rat_pretzel_and_iced_coffee', name: 'Pretzel and Iced Coffee', collection: 'adventure', displayOrder: 14, imageUrl: '/assets/stickers/mallRat/10_pretzel_and_iced_coffee.png', rarity: 'common' }
  ];
  for (const entry of expected) {
    const sticker = getStickerById(entry.id);
    assert.ok(sticker, `${entry.id} is registered`);
    assert.equal(sticker.name, entry.name);
    assert.equal(sticker.archetype, 'mallRat', `${entry.id} follows the existing series archetype`);
    assert.equal(sticker.collection, entry.collection);
    assert.equal(sticker.displayOrder, entry.displayOrder);
    assert.equal(sticker.imageUrl, entry.imageUrl);
    assert.equal(sticker.rarity, entry.rarity);
    assert.equal(sticker.awardTrigger, 'admin_grant', `${entry.id} is trigger-pending — no invented trigger`);
    assert.ok(sticker.tags.includes('trigger-pending'));
    assert.ok(sticker.unlockReason.length > 0);
  }

  const mallRatIds = getAllStickers().filter(sticker => sticker.id.startsWith('mall_rat_'));
  assert.equal(mallRatIds.length, 16, '7 original Mall Rat stickers + 8 new pack entries + 1 challenge-approved variant');
  assert.equal(getAllStickers().length, 108, '105 before the Nov 20 challenge-approved variants + 3 new variant entries');
});

test('mall rat pack: the 8 new images are the supplied PNGs, byte-identical to the ZIP', () => {
  const expectedMd5: ReadonlyArray<[string, string]> = [
    ['01_mall_rat_mascot.png', '87c4171b97443322db6aa71de053bfab'],
    ['02_shopping_bag_lounge.png', '492ec9c48b8ab8b4c85e24bf676890fe'],
    ['04_food_court_feast.png', '30f2724374facae71d048eb3a89051e1'],
    ['05_shopping_cart_haul.png', 'cec152ade0978a1a8ed0af96f17c2f59'],
    ['06_chunky_sneaker.png', '0f8b6363c4b64196b13668f47aa320c8'],
    ['07_mirror_selfie.png', '7866bdb4f68ba6938e37ddbc0bdb5030'],
    ['08_mall_arcade.png', 'fc0f70532ee666db2ef5957aabb7e44e'],
    ['10_pretzel_and_iced_coffee.png', 'f8e11ab88f3224162f38b7dbbb5565b7']
  ];
  for (const [file, expected] of expectedMd5) {
    const filePath = path.join('public', 'assets', 'stickers', 'mallRat', file);
    assertPng(filePath);
    assert.equal(md5(filePath), expected, `${file} must be byte-identical to the ZIP`);
  }
});

test('mall rat pack: 03 + 09 replaced art at the same registry paths, old art preserved in alternates/ (Zach\'s call, Nov 18)', () => {
  // Registry paths are unchanged — same imageUrl values, same sticker
  // IDs, same triggers, collections and orders. Only the file bytes changed.
  const escalator = getStickerById('mall_rat_escalator_pose');
  assert.ok(escalator);
  assert.equal(escalator.imageUrl, '/assets/stickers/mallRat/escalator-pose.png');
  assert.equal(escalator.awardTrigger, 'season_milestone', 'replacement keeps its trigger');
  assert.equal(escalator.collection, 'achievement');
  assert.equal(escalator.displayOrder, 11);
  assert.equal(escalator.rarity, 'rare');

  const map = getStickerById('mall_rat_mall_map');
  assert.ok(map);
  assert.equal(map.imageUrl, '/assets/stickers/mallRat/mall-map.png');
  assert.equal(map.awardTrigger, 'starter_pack', 'replacement keeps its trigger');
  assert.equal(map.collection, 'explorer');
  assert.equal(map.displayOrder, 6);
  assert.equal(map.rarity, 'common');

  // The files at those paths are the new renders, pinned by md5.
  assert.equal(
    md5(path.join('public', 'assets', 'stickers', 'mallRat', 'escalator-pose.png')),
    '20c86f4742df2966d408b84d29dbddb9',
    'escalator-pose.png is now the raccoon cruise, not the human girl'
  );
  assert.equal(
    md5(path.join('public', 'assets', 'stickers', 'mallRat', 'mall-map.png')),
    '09f167f5d78c32f3c954908e1830833f',
    'mall-map.png is now the directory sign, not the receipt slip'
  );

  // The old art is preserved byte-identical in alternates/ (Nov 17
  // batch-2 swap pattern), not deleted.
  assert.equal(
    md5(path.join('public', 'assets', 'stickers', 'mallRat', 'alternates', 'escalator-pose.png')),
    '14b6a4b33032fc8814e2d52851b0f51a',
    'old escalator art preserved in alternates/'
  );
  assert.equal(
    md5(path.join('public', 'assets', 'stickers', 'mallRat', 'alternates', 'mall-map.png')),
    '163a64c557e399eed4927bb342c47d0f',
    'old map art preserved in alternates/'
  );
});

test('mall rat pack: 18_mall_rat is nowhere in the registry (Zach\'s call: leave it out)', () => {
  assert.equal(getStickerById('side_quests_mall_rat'), undefined);
  assert.equal(getStickerById('mall_rat_escalator'), undefined);
  const ids = getAllStickers().map(sticker => sticker.id);
  assert.ok(!ids.some(id => id.includes('18_mall_rat')), 'no 18_mall_rat id');
  const imageUrls = getAllStickers().map(sticker => sticker.imageUrl);
  assert.ok(!imageUrls.some(url => url.includes('18_mall_rat')), 'no 18_mall_rat image');
});
