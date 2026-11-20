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
 * CAPTAIN CLIPBOARD PACK (Nov 19, 2026; Zach's call: ADD all ten as new,
 * 02 + 03 rare). The ZIP (captain_clipboard_10_unique_stickers_68_wdru.zip)
 * held 10 PNGs in a flat-vector burgundy + gold + cream badge-backing
 * style, object-only (no Captain Clipboard likeness). All 10 are entirely
 * new scenes — no replacements, no re-renders, no byte-identical matches
 * to anything on disk. The existing 7 all match their names — there is no
 * defect to fix — so all 10 land as NEW entries and the old art stays put;
 * 09 (Rules Stamp) sits alongside the Checkmark Seal as a distinct
 * sticker (stamp tool + prohibition vs green seal + checkmark). All 10 are
 * trigger-pending (admin_grant); do NOT give new entries awardTrigger
 * 'starter_pack' — unlockStarterPackForArchetype grants all starter_pack
 * entries at quiz time with no backfill for existing players.
 *
 * Files are 1024x1024, 104–156 KB each — batch-1 size class, imported
 * byte-identical to the ZIP, no shrink needed. Originals live in the ZIP,
 * not in the repo.
 */
const CAPTAIN_CLIPBOARD_PACK: ReadonlyArray<{
  id: string;
  name: string;
  file: string;
  collection: 'explorer';
  displayOrder: number;
  rarity: 'common' | 'rare';
  md5: string;
  width: number;
  height: number;
}> = [
  { id: 'captain_clipboard_cat_eye_glasses', name: 'Cat Eye Glasses', file: '01_cat_eye_glasses.png', collection: 'explorer', displayOrder: 30, rarity: 'common', md5: 'be040e0250be5f74c139f47b5092e735', width: 1024, height: 1024 },
  { id: 'captain_clipboard_rule_enforcer_gavel', name: 'Rule Enforcer Gavel', file: '02_rule_enforcer_gavel.png', collection: 'explorer', displayOrder: 31, rarity: 'rare', md5: 'ede1a13fe90c6a6ec2c91c385bcbf042', width: 1024, height: 1024 },
  { id: 'captain_clipboard_chess_queen', name: 'Chess Queen', file: '03_chess_queen.png', collection: 'explorer', displayOrder: 32, rarity: 'rare', md5: 'd89c941dc36ab841a1b947af27bfea18', width: 1024, height: 1024 },
  { id: 'captain_clipboard_sideline_megaphone', name: 'Sideline Megaphone', file: '04_sideline_megaphone.png', collection: 'explorer', displayOrder: 33, rarity: 'common', md5: '758a2c835f7e7ec2203bf59b0339e4ba', width: 1024, height: 1024 },
  { id: 'captain_clipboard_color_coded_organizer', name: 'Color Coded Organizer', file: '05_color_coded_organizer.png', collection: 'explorer', displayOrder: 34, rarity: 'common', md5: 'bc4cccd79356cf377c4d32ebaf38f279', width: 1024, height: 1024 },
  { id: 'captain_clipboard_velvet_rope_checkpoint', name: 'Velvet Rope Checkpoint', file: '06_velvet_rope_checkpoint.png', collection: 'explorer', displayOrder: 35, rarity: 'common', md5: '55c72416bb1f7e9d874e418bb977d55d', width: 1024, height: 1024 },
  { id: 'captain_clipboard_perfect_lunchbox', name: 'Perfect Lunchbox', file: '07_perfect_lunchbox.png', collection: 'explorer', displayOrder: 36, rarity: 'common', md5: 'f2ec40e232bebe7c4a5e4ea014b20b6f', width: 1024, height: 1024 },
  { id: 'captain_clipboard_minivan_keychain', name: 'Minivan Keychain', file: '08_minivan_keychain.png', collection: 'explorer', displayOrder: 37, rarity: 'common', md5: 'fe5261cc301c7b98dbf476ebcfbb5543', width: 1024, height: 1024 },
  { id: 'captain_clipboard_rules_stamp', name: 'Rules Stamp', file: '09_rules_stamp.png', collection: 'explorer', displayOrder: 38, rarity: 'common', md5: '95d633c2daa380904fd6e8d795599eb4', width: 1024, height: 1024 },
  { id: 'captain_clipboard_precision_measuring_tape', name: 'Precision Measuring Tape', file: '10_precision_measuring_tape.png', collection: 'explorer', displayOrder: 39, rarity: 'common', md5: '1e393b17cf9141741ceea161a360c17d', width: 1024, height: 1024 }
];

test('captain clipboard pack: all ten are registered as new Captain Clipboard stickers with the right collection, order, rarity and trigger', () => {
  const all = getAllStickers();
  assert.equal(all.length, 118, '108 before the Texas Y\'all pack + 10 new entries');

  const captainClipboard = all.filter(sticker => sticker.archetype === 'captainClipboard');
  assert.equal(captainClipboard.length, 19, '7 original Captain Clipboard stickers + 10 new pack entries + 1 milestone variant + 1 challenge-approved variant');

  for (const expected of CAPTAIN_CLIPBOARD_PACK) {
    const sticker = getStickerById(expected.id);
    assert.ok(sticker, `${expected.id} is not registered`);
    assert.equal(sticker.name, expected.name);
    assert.equal(sticker.archetype, 'captainClipboard');
    assert.equal(sticker.collection, expected.collection);
    assert.equal(sticker.displayOrder, expected.displayOrder);
    assert.equal(sticker.rarity, expected.rarity);
    assert.equal(sticker.imageUrl, `/assets/stickers/captainClipboard/${expected.file}`);
    assert.equal(sticker.awardTrigger, 'admin_grant');
    assert.ok(sticker.tags.includes('trigger-pending'), `${expected.id} must be tagged trigger-pending`);
    assert.ok(sticker.unlockReason.length > 0);
  }
});

test('captain clipboard pack: the ten images are the supplied PNGs, byte-identical to the ZIP', () => {
  for (const expected of CAPTAIN_CLIPBOARD_PACK) {
    const filePath = path.join('public', 'assets', 'stickers', 'captainClipboard', expected.file);
    assertPng(filePath);
    const bytes = fs.readFileSync(filePath);
    // IHDR width/height are big-endian uint32 at bytes 16-19 / 20-23.
    assert.equal(bytes.readUInt32BE(16), expected.width, `${expected.file} width`);
    assert.equal(bytes.readUInt32BE(20), expected.height, `${expected.file} height`);
    assert.equal(md5(filePath), expected.md5, `${expected.file} md5`);
  }
});

test('captain clipboard pack: firestore.rules whitelists the ten new ids', () => {
  const rules = fs.readFileSync('firestore.rules', 'utf8');
  for (const expected of CAPTAIN_CLIPBOARD_PACK) {
    assert.ok(rules.includes(`'${expected.id}'`), `rules must whitelist ${expected.id}`);
  }
});

test('captain clipboard pack: the original seven Captain Clipboard entries are untouched (Zach\'s call: add all ten as new)', () => {
  const ORIGINAL: ReadonlyArray<{
    id: string;
    file: string;
    collection: 'explorer' | 'achievement' | 'adventure' | 'social';
    displayOrder: number;
    rarity: 'common' | 'rare' | 'legendary';
    trigger: string;
    md5: string;
  }> = [
    { id: 'captain_clipboard_clipboard_character', file: 'clipboard-character.png', collection: 'explorer', displayOrder: 1, rarity: 'rare', trigger: 'starter_pack', md5: 'ac7d08a6e88f5b334d580a52890838a5' },
    { id: 'captain_clipboard_checklist_badge', file: 'checklist-badge.png', collection: 'explorer', displayOrder: 2, rarity: 'common', trigger: 'starter_pack', md5: '5939c595e975a0bf21c4c8b9ab3eecf1' },
    { id: 'captain_clipboard_checkmark_seal', file: 'checkmark-seal.png', collection: 'achievement', displayOrder: 1, rarity: 'common', trigger: 'first_approval', md5: '68c1c2fe568b438cf6630ad982366262' },
    { id: 'captain_clipboard_pen_sparkle', file: 'pen-sparkle.png', collection: 'adventure', displayOrder: 3, rarity: 'common', trigger: 'field_note_added', md5: '221aac56a00cf5e97692b701332163fa' },
    { id: 'captain_clipboard_flying_papers', file: 'flying-papers.png', collection: 'adventure', displayOrder: 7, rarity: 'rare', trigger: 'zine_page_added', md5: '71fa370c09a827abceef4f6965e439b4' },
    { id: 'captain_clipboard_whistle_lanyard', file: 'whistle-lanyard.png', collection: 'social', displayOrder: 2, rarity: 'legendary', trigger: 'crew_created', md5: '654b86d55172118f4f413e702ccacc65' },
    { id: 'captain_clipboard_field_notes', file: 'field-notes.png', collection: 'explorer', displayOrder: 3, rarity: 'common', trigger: 'starter_pack', md5: '548173a8d557a3de63c67784f08a8856' }
  ];
  for (const expected of ORIGINAL) {
    const sticker = getStickerById(expected.id);
    assert.ok(sticker, `${expected.id} must still be registered`);
    assert.equal(sticker.collection, expected.collection, `${expected.id} collection`);
    assert.equal(sticker.displayOrder, expected.displayOrder, `${expected.id} displayOrder`);
    assert.equal(sticker.rarity, expected.rarity, `${expected.id} rarity`);
    assert.equal(sticker.awardTrigger, expected.trigger, `${expected.id} trigger`);
    assert.equal(
      md5(path.join('public', 'assets', 'stickers', 'captainClipboard', expected.file)),
      expected.md5,
      `${expected.file} art must be unchanged`
    );
  }
});
