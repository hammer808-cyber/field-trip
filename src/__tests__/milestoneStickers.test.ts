import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { getAllStickers, getStickerById, getStickersByCollection } from '../data/stickers';

function md5(filePath: string): string {
  return createHash('md5').update(fs.readFileSync(filePath)).digest('hex');
}

/**
 * MILESTONE / CHAOS — batch 2 (Nov 18, 2026). The ZIP
 * (fieldtrip_milestone_stickers_26_64ju.zip) held five PNGs, but four
 * name stickers that already exist from the FIRST OFFENSES batch. Only
 * the genuinely new one — On a Roll — was registered here.
 *
 * SWAP (Zach's call, Nov 17, 2026): the four batch-2 renders replaced
 * the batch-1 art at the SAME registry paths (same imageUrl values,
 * same sticker IDs — only the file bytes changed). The batch-1 renders
 * were preserved under stickers/achievement/alternates/ for reuse
 * elsewhere. Only Repeat Offender was trimmed: the batch-2 crop
 * carried an 11px solid strip of a neighbouring sticker down its
 * left edge, cropped off (570 -> 559 wide); the other three carry
 * small edge slivers that could not be trimmed without cutting the
 * sticker art, and ship as-is per Zach's swap decision.
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
  assert.equal(getAllStickers().length, 71);
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

test('milestone: the four batch-2 renders replaced batch-1 art at the same paths (Zach\'s call, Nov 17)', () => {
  // Registry paths are unchanged — same imageUrl values, same sticker
  // IDs. Only the file bytes changed.
  const stillSamePath: ReadonlyArray<[string, string]> = [
    ['first_offenses_outside_person', '/assets/stickers/achievement/06_outside_person.png'],
    ['first_offenses_repeat_offender', '/assets/stickers/achievement/07_repeat_offender.png'],
    ['first_offenses_level_up', '/assets/stickers/achievement/08_level_up.png'],
    ['first_offenses_certified_menace', '/assets/stickers/achievement/09_certified_menace.png']
  ];
  for (const [id, imageUrl] of stillSamePath) {
    assert.equal(getStickerById(id)?.imageUrl, imageUrl, `${id} must keep its registry path`);
  }

  // The files at those paths are the batch-2 renders, pinned by md5.
  // 06/08/09 are byte-identical to the ZIP; 07 is the ZIP render with
  // an 11px neighbour strip cropped off its left edge (570 -> 559).
  const batchTwoMd5: ReadonlyArray<[string, string]> = [
    ['06_outside_person.png', '9410b0a2663b9c52f8cef60c11cef8f7'],
    ['07_repeat_offender.png', 'a9bea7313f2118b64872843d0f3a1364'],
    ['08_level_up.png', '4114af217a507b94c9cd6b2a8f59262b'],
    ['09_certified_menace.png', 'fa062bf14b7a1646f4a5b180c8d9014d']
  ];
  for (const [file, expected] of batchTwoMd5) {
    const filePath = path.join('public', 'assets', 'stickers', 'achievement', file);
    assert.equal(md5(filePath), expected, `${file} must be the batch-2 render`);
  }

  // The batch-1 renders were preserved for reuse, byte-identical.
  const batchOneMd5: ReadonlyArray<[string, string]> = [
    ['06_outside_person.png', '5eb3720324597dfc83921df71341b5e4'],
    ['07_repeat_offender.png', '8ddff86152962a8082748dd839c99ca6'],
    ['08_level_up.png', 'b1ae1d076c1b4bd09efebfa0e42a33a6'],
    ['09_certified_menace.png', 'e9e7b5b9100d3e7eccb97a890a1caba5']
  ];
  for (const [file, expected] of batchOneMd5) {
    const filePath = path.join('public', 'assets', 'stickers', 'achievement', 'alternates', file);
    assert.equal(md5(filePath), expected, `alternates/${file} must be the preserved batch-1 render`);
  }

  // The batch-2 standalone filenames were never copied into the
  // library — the renders live under the batch-1 filenames only.
  for (const file of ['outside_person.png', 'repeat_offender.png', 'level_up.png', 'certified_menace.png']) {
    assert.ok(!fs.existsSync(path.join('public', 'assets', 'stickers', 'chaos', file)), `batch-2 file ${file} must not sit in stickers/chaos`);
    assert.ok(!fs.existsSync(path.join('public', 'assets', 'stickers', 'achievement', file)), `batch-2 file ${file} must not sit in stickers/achievement`);
  }
});

test('milestone: firestore.rules whitelists the new id', () => {
  const rules = fs.readFileSync('firestore.rules', 'utf8');
  assert.ok(rules.includes("'chaos_on_a_roll'"));
});
