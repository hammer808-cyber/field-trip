import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { getAllStickers, getStickerById, getStickersByCollection } from '../data/stickers';
import { resolveEventStickers } from '../logic/stickerEvaluator';

/**
 * Earn-audit fix #4 (Nov 20, 2026 — shape A): three new
 * `challenge_approved` variants, one per archetype that had none.
 *
 * Before this, only Mascot Jump (mascota), Glam Shoe (elondra), and
 * Compass (lostCamper) existed, so Captain Clipboard, Mall Rat, and
 * Bigfoot players earned NOTHING on their first non-starter approval
 * (`challenge_approved` has no default entry, and the unlock dedupes,
 * so the trigger fires once per player — on that first approval).
 *
 * The three new stickers close the set the achievement collection's
 * first six imply (each archetype gets a first_approval AND a
 * challenge_approved sticker). Art is generated in-house, die-cut
 * style, 400x400 RGBA, same treatment as the fix #2b milestone
 * variants. Rarity mirrors the existing set (two rare, one common —
 * the wild archetypes earn common, the rest rare). Registry 105 → 108,
 * achievement 25 → 28 (displayOrder 26–28).
 *
 * Source generations live in ~/workspace/fieldtrip-challenge-variants/.
 */

function md5(filePath: string): string {
  return createHash('md5').update(fs.readFileSync(filePath)).digest('hex');
}

function pngSignature(filePath: string): Buffer {
  return fs.readFileSync(filePath).subarray(0, 8);
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const VARIANTS: ReadonlyArray<{
  id: string;
  name: string;
  archetype: 'captainClipboard' | 'mallRat' | 'bigfoot';
  file: string;
  rarity: 'common' | 'rare';
  displayOrder: number;
  md5: string;
}> = [
  { id: 'captain_clipboard_gold_star', name: 'Gold Star', archetype: 'captainClipboard', file: 'gold-star.png', rarity: 'rare', displayOrder: 26, md5: 'aecae1ee17455d111e09fcec8dfdc296' },
  { id: 'mall_rat_shopping_spree', name: 'Shopping Spree', archetype: 'mallRat', file: 'shopping-spree.png', rarity: 'rare', displayOrder: 27, md5: 'e28a26e12a137acdf746e22fad3721d0' },
  { id: 'bigfoot_tracks', name: 'Bigfoot Tracks', archetype: 'bigfoot', file: 'tracks.png', rarity: 'common', displayOrder: 28, md5: 'a410aab56134539214e0515010253067' }
];

test('fix #4 registry: three new challenge_approved variants close the set', () => {
  assert.equal(getAllStickers().length, 108);
  for (const expected of VARIANTS) {
    const sticker = getStickerById(expected.id);
    assert.ok(sticker, `${expected.id} is registered`);
    assert.equal(sticker.name, expected.name);
    assert.equal(sticker.archetype, expected.archetype);
    assert.equal(sticker.collection, 'achievement');
    assert.equal(sticker.displayOrder, expected.displayOrder);
    assert.equal(sticker.rarity, expected.rarity);
    assert.equal(sticker.awardTrigger, 'challenge_approved');
    assert.equal(sticker.unlockReason, 'Earned when an eligible challenge is approved.');
    assert.ok(!sticker.tags.includes('trigger-pending'));
  }
  // The achievement collection is now 1–28 contiguous.
  const achievement = getStickersByCollection('achievement');
  assert.equal(achievement.length, 28);
  assert.deepEqual(
    achievement.map((s) => s.displayOrder),
    Array.from({ length: 28 }, (_, i) => i + 1)
  );
});

test('fix #4 art: every variant PNG is the processed 400x400 RGBA file', () => {
  for (const expected of VARIANTS) {
    const dir =
      expected.archetype === 'captainClipboard'
        ? 'captainClipboard'
        : expected.archetype === 'mallRat'
          ? 'mallRat'
          : 'bigfoot';
    const filePath = path.join('public', 'assets', 'stickers', dir, expected.file);
    assert.ok(fs.existsSync(filePath), `${expected.id} image missing: ${filePath}`);
    assert.ok(pngSignature(filePath).equals(PNG_SIGNATURE), `${expected.file} must be a real PNG (signature bytes)`);
    assert.equal(md5(filePath), expected.md5, `${expected.file} must be the processed PNG`);
  }
});

test('fix #4: every archetype now earns a variant on its first non-starter approval', () => {
  const expected: Readonly<Record<string, string>> = {
    captainClipboard: 'captain_clipboard_gold_star',
    mallRat: 'mall_rat_shopping_spree',
    mascota: 'mascota_mascot_jump',
    elondra: 'elondra_glam_shoe',
    lostCamper: 'lost_camper_compass',
    bigfoot: 'bigfoot_tracks'
  };
  for (const [archetype, stickerId] of Object.entries(expected)) {
    assert.deepEqual(
      resolveEventStickers('challenge_approved', archetype as any).map((s) => s.id),
      [stickerId],
      `${archetype} should earn ${stickerId} on challenge_approved`
    );
  }
});

test('fix #4: first_approval variants are unchanged by the new stickers', () => {
  assert.deepEqual(
    resolveEventStickers('first_approval', 'captainClipboard').map((s) => s.id),
    ['captain_clipboard_checkmark_seal']
  );
  assert.deepEqual(
    resolveEventStickers('first_approval', 'mallRat').map((s) => s.id),
    ['side_quests_retail_therapy']
  );
  assert.deepEqual(
    resolveEventStickers('first_approval', 'bigfoot').map((s) => s.id),
    ['captain_clipboard_checkmark_seal']
  );
});
