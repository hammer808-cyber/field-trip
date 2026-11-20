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
  // IHDR bit depth lives at byte 24, color type at byte 25: 6 = truecolor
  // with alpha (RGBA). (Byte 26 is the compression method, always 0.)
  assert.equal(bytes[25], 6, `${filePath} must be RGBA (color type 6), got ${bytes[25]}`);
}

/**
 * ELONDRA PACK (Nov 18, 2026; Zach's call: ADD all ten as new). The ZIP
 * (Elondra_10_Transparent_Stickers_65_4g50.zip) held 10 PNGs in a neon
 * desert-glam style, object-only (no Elondra likeness): 8 brand-new scenes
 * + 2 same-theme re-renders of existing concepts (05 Platform Loafers vs
 * the Glam Shoe stiletto; 09 Glamour Kit vanity set vs the Compact Mirror).
 * Unlike the Mall Rat pack, the existing 7 all match their names — there is
 * no defect to fix — so all 10 land as NEW entries and the old art stays
 * put. All 10 are trigger-pending (admin_grant); do NOT give new entries
 * awardTrigger 'starter_pack' — unlockStarterPackForArchetype grants all
 * starter_pack entries at quiz time with no backfill for existing players.
 *
 * Files were 1.2–2.2 MB each (1254x1254, 01 portrait 1024x1536); shrunk to
 * ~400px max dimension with PIL (LANCZOS, RGBA, transparency kept) before
 * import — 01 stays portrait (267x400) and letterboxes on the square shelf.
 * Originals live in the ZIP, not in the repo.
 */
const ELONDRA_PACK: ReadonlyArray<{
  id: string;
  name: string;
  file: string;
  collection: 'explorer' | 'adventure';
  displayOrder: number;
  rarity: 'common' | 'rare';
  md5: string;
  width: number;
  height: number;
}> = [
  { id: 'elondra_neon_cactus_cooler', name: 'Neon Cactus Cooler', file: '01_neon_cactus_cooler.png', collection: 'explorer', displayOrder: 21, rarity: 'common', md5: '7f3a2b9a70710b9f4ac1ff1ae5fff784', width: 267, height: 400 },
  { id: 'elondra_starstruck_sunglasses', name: 'Starstruck Sunglasses', file: '02_starstruck_sunglasses.png', collection: 'explorer', displayOrder: 22, rarity: 'common', md5: '91e236e006e781dca03227b1c14fe712', width: 400, height: 400 },
  { id: 'elondra_bedazzled_phone', name: 'Bedazzled Phone', file: '03_bedazzled_phone.png', collection: 'explorer', displayOrder: 23, rarity: 'common', md5: 'e9a495102ff2768c292a3817ff207ede', width: 400, height: 400 },
  { id: 'elondra_art_kit', name: 'Art Kit', file: '04_art_kit.png', collection: 'explorer', displayOrder: 24, rarity: 'common', md5: '844eea145239f2db70177d05775ca858', width: 400, height: 400 },
  { id: 'elondra_platform_loafers', name: 'Platform Loafers', file: '05_platform_loafers.png', collection: 'explorer', displayOrder: 25, rarity: 'common', md5: '45ea2792e5a715816f7bfbbf4bbeeb77', width: 400, height: 400 },
  { id: 'elondra_cosmic_charm_bracelet', name: 'Cosmic Charm Bracelet', file: '06_cosmic_charm_bracelet.png', collection: 'explorer', displayOrder: 26, rarity: 'common', md5: 'f2e13fc6d3d4913454ccb9ac1abda50b', width: 400, height: 400 },
  { id: 'elondra_center_stage_microphone', name: 'Center Stage Microphone', file: '07_center_stage_microphone.png', collection: 'explorer', displayOrder: 27, rarity: 'rare', md5: '15a98a82c7506c4beb2e6837a8aeaa4f', width: 400, height: 400 },
  { id: 'elondra_desert_alien_encounter', name: 'Desert Alien Encounter', file: '08_desert_alien_encounter.png', collection: 'adventure', displayOrder: 15, rarity: 'rare', md5: '9610d63d70684a7b4ef4d8e6705665d2', width: 400, height: 400 },
  { id: 'elondra_glamour_kit', name: 'Glamour Kit', file: '09_glamour_kit.png', collection: 'explorer', displayOrder: 28, rarity: 'common', md5: 'f17304464e14248cb4e01001bff025e1', width: 400, height: 400 },
  { id: 'elondra_cosmic_shopping_bags', name: 'Cosmic Shopping Bags', file: '10_cosmic_shopping_bags.png', collection: 'explorer', displayOrder: 29, rarity: 'common', md5: 'c3bbc918bb8ccb01a2aa6eb426c00395', width: 400, height: 400 }
];

test('elondra pack: all ten are registered as new Elondra stickers with the right collection, order, rarity and trigger', () => {
  const all = getAllStickers();
  assert.equal(all.length, 108, '105 before the Nov 20 challenge-approved variants + 3 new variant entries');

  const elondra = all.filter(sticker => sticker.archetype === 'elondra');
  assert.equal(elondra.length, 18, '7 original Elondra stickers + 10 new pack entries + 1 milestone variant');

  for (const expected of ELONDRA_PACK) {
    const sticker = getStickerById(expected.id);
    assert.ok(sticker, `${expected.id} is not registered`);
    assert.equal(sticker.name, expected.name);
    assert.equal(sticker.archetype, 'elondra');
    assert.equal(sticker.collection, expected.collection);
    assert.equal(sticker.displayOrder, expected.displayOrder);
    assert.equal(sticker.rarity, expected.rarity);
    assert.equal(sticker.imageUrl, `/assets/stickers/elondra/${expected.file}`);
    assert.equal(sticker.awardTrigger, 'admin_grant');
    assert.ok(sticker.tags.includes('trigger-pending'), `${expected.id} must be tagged trigger-pending`);
    assert.ok(sticker.unlockReason.length > 0);
  }
});

test('elondra pack: the ten images are the supplied PNGs, shrunk to ~400px with transparency kept', () => {
  for (const expected of ELONDRA_PACK) {
    const filePath = path.join('public', 'assets', 'stickers', 'elondra', expected.file);
    assertPng(filePath);
    const bytes = fs.readFileSync(filePath);
    // IHDR width/height are big-endian uint32 at bytes 16-19 / 20-23.
    assert.equal(bytes.readUInt32BE(16), expected.width, `${expected.file} width`);
    assert.equal(bytes.readUInt32BE(20), expected.height, `${expected.file} height`);
    assert.equal(md5(filePath), expected.md5, `${expected.file} md5`);
  }
});

test('elondra pack: firestore.rules whitelists the ten new ids', () => {
  const rules = fs.readFileSync('firestore.rules', 'utf8');
  for (const expected of ELONDRA_PACK) {
    assert.ok(rules.includes(`'${expected.id}'`), `rules must whitelist ${expected.id}`);
  }
});

test('elondra pack: the original seven Elondra entries are untouched (Zach\'s call: add all ten as new)', () => {
  const ORIGINAL: ReadonlyArray<{
    id: string;
    file: string;
    collection: 'explorer' | 'achievement' | 'adventure';
    displayOrder: number;
    rarity: 'common' | 'rare' | 'legendary';
    trigger: string;
    md5: string;
  }> = [
    { id: 'elondra_crown', file: 'crown.png', collection: 'explorer', displayOrder: 10, rarity: 'rare', trigger: 'starter_pack', md5: '302a1ef4b4ba4ec48131f8a10e2e59a4' },
    { id: 'elondra_compact_mirror', file: 'compact-mirror.png', collection: 'explorer', displayOrder: 11, rarity: 'common', trigger: 'starter_pack', md5: 'fa5e28f6a367e0fcd7304d2ee579611a' },
    { id: 'elondra_sparkle_burst', file: 'sparkle-burst.png', collection: 'explorer', displayOrder: 12, rarity: 'common', trigger: 'starter_pack', md5: '10962fc4499d466c8d3b336f82604cd0' },
    { id: 'elondra_glam_pose', file: 'glam-pose.png', collection: 'achievement', displayOrder: 2, rarity: 'common', trigger: 'first_approval', md5: '0aeec4f37382b095be4a836c903b47ff' },
    { id: 'elondra_glam_shoe', file: 'glam-shoe.png', collection: 'achievement', displayOrder: 5, rarity: 'rare', trigger: 'challenge_approved', md5: 'cd0bfbfe74dc8ab12114e5cdb683371f' },
    { id: 'elondra_purse', file: 'purse.png', collection: 'adventure', displayOrder: 8, rarity: 'common', trigger: 'zine_page_added', md5: 'dd5199460af363f68c90cf3b66f13e8c' },
    { id: 'elondra_arrival_pose', file: 'arrival-pose.png', collection: 'achievement', displayOrder: 12, rarity: 'legendary', trigger: 'season_milestone', md5: '819644a54e93daf49d491ccbe4eb6d77' }
  ];
  for (const expected of ORIGINAL) {
    const sticker = getStickerById(expected.id);
    assert.ok(sticker, `${expected.id} must still be registered`);
    assert.equal(sticker.collection, expected.collection, `${expected.id} collection`);
    assert.equal(sticker.displayOrder, expected.displayOrder, `${expected.id} displayOrder`);
    assert.equal(sticker.rarity, expected.rarity, `${expected.id} rarity`);
    assert.equal(sticker.awardTrigger, expected.trigger, `${expected.id} trigger`);
    assert.equal(
      md5(path.join('public', 'assets', 'stickers', 'elondra', expected.file)),
      expected.md5,
      `${expected.file} art must be unchanged`
    );
  }
});
