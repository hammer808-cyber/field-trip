import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  COLLECTION_META,
  COLLECTION_SHELF_ORDER,
  getAllStickers,
  getStickerById,
  getStickersByCollection,
  type StickerDefinition
} from '../data/stickers';

function md5(filePath: string): string {
  return createHash('md5').update(fs.readFileSync(filePath)).digest('hex');
}

function pngSignature(filePath: string): Buffer {
  return fs.readFileSync(filePath).subarray(0, 8);
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * SIDE QUESTS — new collection (Nov 18, 2026; Zach's call: new Side
 * Quests collection over mixing them into Adventure/Chaos/Social).
 * The side-quests ZIP (fieldtrip_side_quests_12_transparent_png_44_9l2i.zip)
 * held 12 PNGs numbered 13–24 — a SEPARATE set, not the 3 missing FIRST
 * OFFENSES (those would be 10, 11, 12 and are still outstanding). 11 of
 * the 12 land here; 18_mall_rat is LEFT OUT by Zach's call (it collides
 * three ways: Mall Rat is an Explorer persona, a 7-entry mall_rat_*
 * series already exists, and the art is the Escalator Pose + Shopping
 * Bags stickers combined). It is not in the registry, not in any folder,
 * not in alternates/.
 *
 * All 11 are trigger-pending (admin_grant): no existing event fits a
 * side quest. Rarity is Zach's call: Hidden Gem, Full Send, Plot Twist,
 * and Sasquatch Sighting are rare; the other seven are common.
 *
 * 21_full_send ships AS-IS with a non-transparent top-right corner (a
 * flame touches the edge) — do not crop or regenerate without Zach's call.
 */
const SIDE_QUESTS: ReadonlyArray<{
  id: string;
  name: string;
  file: string;
  rarity: 'common' | 'rare';
  displayOrder: number;
  md5: string;
}> = [
  { id: 'side_quests_retail_therapy', name: 'Retail Therapy', file: '13_retail_therapy.png', rarity: 'common', displayOrder: 1, md5: '69e8d3ea2b6f11f509c8ef6ee841dd70' },
  { id: 'side_quests_snack_attack', name: 'Snack Attack', file: '14_snack_attack.png', rarity: 'common', displayOrder: 2, md5: 'a4cd2760d0f7119231b0d8207f784888' },
  { id: 'side_quests_detour', name: 'Detour', file: '15_detour.png', rarity: 'common', displayOrder: 3, md5: 'e22c32d75baaa87b6fc6219e4eb320eb' },
  { id: 'side_quests_night_owl', name: 'Night Owl', file: '16_night_owl.png', rarity: 'common', displayOrder: 4, md5: '97a23d1b13527199846dfa0e5ead0941' },
  { id: 'side_quests_hidden_gem', name: 'Hidden Gem', file: '17_hidden_gem.png', rarity: 'rare', displayOrder: 5, md5: '5f6a87146473539d5c2e93af5e742025' },
  { id: 'side_quests_good_company', name: 'Good Company', file: '19_good_company.png', rarity: 'common', displayOrder: 6, md5: '6f36d3d27041d19f1bac3ff989e6347b' },
  { id: 'side_quests_roadside_weird', name: 'Roadside Weird', file: '20_roadside_weird.png', rarity: 'common', displayOrder: 7, md5: '0972967a5e36013044bb7b7799d57cef' },
  { id: 'side_quests_full_send', name: 'Full Send', file: '21_full_send.png', rarity: 'rare', displayOrder: 8, md5: '5028ff483c99088d41b0711b08400b2a' },
  { id: 'side_quests_after_hours', name: 'After Hours', file: '22_after_hours.png', rarity: 'common', displayOrder: 9, md5: '0fdf7a3a764cee0ca37d6825d4f8f110' },
  { id: 'side_quests_plot_twist', name: 'Plot Twist', file: '23_plot_twist.png', rarity: 'rare', displayOrder: 10, md5: '75949fe28928dcb55c9ae3f2ea70892d' },
  { id: 'side_quests_sasquatch_sighting', name: 'Sasquatch Sighting', file: '24_sasquatch_sighting.png', rarity: 'rare', displayOrder: 11, md5: '77372122306f0bb663e261a12a8754b0' }
];

test('side quests: all eleven are registered as cross-pack Side Quests stickers', () => {
  const all = getAllStickers();
  assert.equal(all.length, 63);
  const ids = new Set(all.map(sticker => sticker.id));
  assert.equal(ids.size, all.length, 'sticker ids must be unique');

  const series = getStickersByCollection('side_quests');
  assert.equal(series.length, 11, 'the collection holds 11 of the 12 supplied stickers — 18_mall_rat is left out');

  for (const expected of SIDE_QUESTS) {
    const sticker: StickerDefinition | undefined = getStickerById(expected.id);
    assert.ok(sticker, `${expected.id} is registered`);
    assert.equal(sticker.name, expected.name);
    assert.equal(sticker.collection, 'side_quests');
    assert.equal(sticker.archetype, undefined, `${expected.id} is cross-pack (no archetype)`);
    assert.equal(sticker.rarity, expected.rarity);
    assert.equal(sticker.displayOrder, expected.displayOrder);
    assert.equal(sticker.awardTrigger, 'admin_grant', `${expected.id} has no wired trigger — grantable only`);
    assert.equal(sticker.imageUrl, `/assets/stickers/sideQuests/${expected.file}`);
    assert.ok(sticker.unlockReason.length > 0, `${expected.id} needs how-to-earn copy`);
    assert.ok(sticker.tags.includes('side-quests'));
    assert.ok(sticker.tags.includes('trigger-pending'), `${expected.id} needs Zach to define what earns it`);
  }

  // Display order is unique inside Side Quests (1–11).
  const orders = series.map(sticker => sticker.displayOrder);
  assert.equal(new Set(orders).size, orders.length);
  assert.deepEqual(orders, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);

  // Rarity split is Zach's call: 4 rare, 7 common.
  assert.equal(series.filter(sticker => sticker.rarity === 'rare').length, 4);
  assert.equal(series.filter(sticker => sticker.rarity === 'common').length, 7);
});

test('side quests: every catalog image is the supplied PNG, byte-identical to the ZIP', () => {
  for (const expected of SIDE_QUESTS) {
    const filePath = path.join('public', 'assets', 'stickers', 'sideQuests', expected.file);
    assert.ok(fs.existsSync(filePath), `${expected.id} image missing: ${filePath}`);
    assert.ok(pngSignature(filePath).equals(PNG_SIGNATURE), `${expected.file} must be a real PNG (signature bytes)`);
    assert.equal(md5(filePath), expected.md5, `${expected.file} must be byte-identical to the ZIP`);
  }
});

test('side quests: 18_mall_rat is nowhere — not registered, not on disk in the collection', () => {
  assert.equal(getStickerById('side_quests_mall_rat'), undefined, '18_mall_rat must not be registered');
  assert.ok(
    !getAllStickers().some(sticker => sticker.id.includes('mall_rat') && sticker.tags.includes('side-quests')),
    'no side-quests entry may carry a mall_rat id'
  );
  assert.ok(
    !fs.existsSync(path.join('public', 'assets', 'stickers', 'sideQuests', '18_mall_rat.png')),
    '18_mall_rat.png must not sit in stickers/sideQuests'
  );
});

test('side quests: the collection is wired into the shelf order and metadata', () => {
  assert.ok(COLLECTION_SHELF_ORDER.includes('side_quests'), 'side_quests must be on the Dex shelf order');
  assert.deepEqual(
    [...COLLECTION_SHELF_ORDER],
    ['explorer', 'adventure', 'side_quests', 'achievement', 'social', 'chaos', 'limited_edition'],
    'Side Quests sits after Adventure, before Achievement'
  );
  const meta = COLLECTION_META.side_quests;
  assert.equal(meta.label, 'Side Quests');
  assert.ok(meta.tagline.length > 0, 'side_quests needs a tagline');
  assert.ok(meta.emptyState.length > 0, 'side_quests needs empty-state copy');
});

test('side quests: firestore.rules whitelists the eleven new ids', () => {
  const rules = fs.readFileSync('firestore.rules', 'utf8');
  for (const expected of SIDE_QUESTS) {
    assert.ok(rules.includes(`'${expected.id}'`), `rules must whitelist ${expected.id}`);
  }
  assert.ok(!rules.includes("'side_quests_mall_rat'"), 'rules must not whitelist the left-out 18_mall_rat');
});
