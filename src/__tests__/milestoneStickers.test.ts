import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { getAllStickers, getStickerById, getStickersByCollection } from '../data/stickers';

/**
 * MILESTONE / CHAOS — batch 2 (Nov 18, 2026). The ZIP
 * (fieldtrip_milestone_stickers_26_64ju.zip) held five PNGs, but four
 * name stickers that already exist from the FIRST OFFENSES batch. Only
 * the genuinely new one — On a Roll — is registered here. These tests
 * pin that decision so a future merge cannot silently swap art or
 * register a duplicate display name.
 */
test('milestone: On a Roll is registered as the first Chaos sticker', () => {
  const sticker = getStickerById('chaos_on_a_roll');
  assert.ok(sticker, 'chaos_on_a_roll is registered');
  assert.equal(sticker.name, 'On a Roll');
  assert.equal(sticker.collection, 'chaos');
  assert.equal(sticker.archetype, undefined, 'On a Roll is cross-pack (no archetype)');
  assert.equal(sticker.displayOrder, 1);
  assert.equal(sticker.imageUrl, '/assets/stickers/chaos/on_a_roll.png');
  assert.equal(sticker.awardTrigger, 'admin_grant', 'no streak trigger exists yet — grantable only');
  assert.ok(sticker.tags.includes('milestone'));
  assert.ok(sticker.tags.includes('trigger-pending'), 'trigger needs Zach to define what counts as a roll');
  assert.ok(sticker.unlockReason.length > 0);

  const chaos = getStickersByCollection('chaos');
  assert.equal(chaos.length, 1, 'Chaos goes from 0 to 1 sticker');
  assert.equal(getAllStickers().length, 52);
});

test('milestone: the On a Roll image resolves to the supplied PNG', () => {
  const filePath = path.join('public', 'assets', 'stickers', 'chaos', 'on_a_roll.png');
  assert.ok(fs.existsSync(filePath), `On a Roll image missing: ${filePath}`);
  assert.ok(fs.statSync(filePath).size > 0);
});

test('milestone: no two stickers share a display name', () => {
  const names = getAllStickers().map(sticker => sticker.name.toLowerCase());
  assert.equal(new Set(names).size, names.length, 'duplicate display names would confuse the Dex');
});

test('milestone: the four batch-2 conflicts were NOT imported over batch 1', () => {
  // The batch-2 files are different renders of the same art (higher
  // resolution, name baked in as a title banner). Existing assets and
  // ownership records are preserved — the batch-1 entries still point
  // at the batch-1 files, and the batch-2 filenames were never copied
  // into the asset library.
  const stillBatchOne: ReadonlyArray<[string, string]> = [
    ['first_offenses_outside_person', '/assets/stickers/achievement/06_outside_person.png'],
    ['first_offenses_repeat_offender', '/assets/stickers/achievement/07_repeat_offender.png'],
    ['first_offenses_level_up', '/assets/stickers/achievement/08_level_up.png'],
    ['first_offenses_certified_menace', '/assets/stickers/achievement/09_certified_menace.png']
  ];
  for (const [id, imageUrl] of stillBatchOne) {
    assert.equal(getStickerById(id)?.imageUrl, imageUrl, `${id} must keep its batch-1 art`);
  }
  for (const file of ['outside_person.png', 'repeat_offender.png', 'level_up.png', 'certified_menace.png']) {
    assert.ok(!fs.existsSync(path.join('public', 'assets', 'stickers', 'chaos', file)), `batch-2 file ${file} must not sit in stickers/chaos`);
    assert.ok(!fs.existsSync(path.join('public', 'assets', 'stickers', 'achievement', file)), `batch-2 file ${file} must not sit in stickers/achievement`);
  }
});

test('milestone: firestore.rules whitelists the new id', () => {
  const rules = fs.readFileSync('firestore.rules', 'utf8');
  assert.ok(rules.includes("'chaos_on_a_roll'"));
});
