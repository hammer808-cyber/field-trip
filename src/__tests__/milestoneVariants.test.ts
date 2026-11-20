import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { getAllStickers, getStickerById, getStickersByTrigger } from '../data/stickers';
import { evaluateAdminApprovalStickers } from '../logic/stickerEvaluator';
import type { StickerUnlockResult } from '../services/stickerService';

const USER_ID = 'milestone-variant-player';

/**
 * Earn-audit fix #2b (Nov 20, 2026): only TWO archetype_milestone
 * stickers existed — Mall Rat Sunglasses and Tree Hideout — so Mascota,
 * Elondra, Captain Clipboard, and Gobbler players earned nothing per
 * approval. Four variants close the gap. There is no 'theGobbler'
 * sticker archetype (StickerArchetype has no such value and the
 * field-type map sends theGobbler to lostCamper), so the fourth variant
 * is a Lost Camper sticker — Gobbler-persona players earn it through
 * that mapping, the same way they earn the Compass on challenge_approved.
 * All four are rare, achievement collection, generated in-house (not
 * from a ZIP), 400x400 RGBA PNGs with the background keyed out.
 */

interface FakeUnlockCall {
  userId: string;
  stickerIds: string[];
  source: string;
  trigger: string;
}

function makeFakeUnlock() {
  const calls: FakeUnlockCall[] = [];
  const awarded = new Set<string>();
  const unlock = async (
    userId: string,
    stickerIds: string[],
    source: string,
    trigger: string
  ): Promise<StickerUnlockResult[]> => {
    calls.push({ userId, stickerIds: [...stickerIds], source, trigger });
    return stickerIds.map((stickerId) => {
      if (awarded.has(stickerId)) {
        return { stickerId, status: 'already_unlocked' as const, unlocked: false };
      }
      awarded.add(stickerId);
      return { stickerId, status: 'unlocked' as const, unlocked: true };
    });
  };
  return { calls, unlock, awarded };
}

/** Minimal profile shape for the snapshot: only the approval caches matter. */
function makeProfile(approvedIds: string[]) {
  return {
    id: USER_ID,
    fieldType: 'captainClipboard',
    approvedCompletedChallengeIds: [...approvedIds],
    completedChallengeIds: [...approvedIds],
    completedMissionIds: [...approvedIds],
    xp: 0,
    points: 0,
    onboardingCompleted: true
  } as any;
}

const callsForTrigger = (calls: FakeUnlockCall[], trigger: string) =>
  calls.filter((call) => call.trigger === trigger);

const VARIANTS: ReadonlyArray<{
  fieldType: string;
  archetype: string;
  id: string;
  name: string;
  imagePath: string;
}> = [
  { fieldType: 'mascota', archetype: 'mascota', id: 'mascota_mascot_trophy', name: 'Mascot Trophy', imagePath: 'public/assets/stickers/mascota/mascot-trophy.png' },
  { fieldType: 'elondra', archetype: 'elondra', id: 'elondra_tiara', name: 'Elondra Tiara', imagePath: 'public/assets/stickers/elondra/tiara.png' },
  { fieldType: 'captainClipboard', archetype: 'captainClipboard', id: 'captain_clipboard_golden_clipboard', name: 'Golden Clipboard', imagePath: 'public/assets/stickers/captainClipboard/golden-clipboard.png' },
  { fieldType: 'theGobbler', archetype: 'lostCamper', id: 'lost_camper_starry_tent', name: 'Starry Tent', imagePath: 'public/assets/stickers/lostCamper/starry-tent.png' }
];

test('milestone variants: every sticker archetype has exactly one archetype_milestone sticker', () => {
  const milestones = getStickersByTrigger('archetype_milestone');
  assert.equal(milestones.length, 6, 'mallRat + bigfoot + the 4 new variants');
  const byArchetype = new Map(milestones.map((sticker) => [sticker.archetype, sticker.id]));
  assert.deepEqual(
    [...byArchetype.keys()].sort(),
    ['bigfoot', 'captainClipboard', 'elondra', 'lostCamper', 'mallRat', 'mascota']
  );
  assert.equal(getAllStickers().length, 108);
});

for (const variant of VARIANTS) {
  test(`milestone variants: ${variant.name} is registered as a rare achievement milestone`, () => {
    const sticker = getStickerById(variant.id);
    assert.ok(sticker, `${variant.id} is registered`);
    assert.equal(sticker.name, variant.name);
    assert.equal(sticker.archetype, variant.archetype);
    assert.equal(sticker.collection, 'achievement');
    assert.equal(sticker.rarity, 'rare');
    assert.equal(sticker.awardTrigger, 'archetype_milestone');
    assert.equal(sticker.imageUrl, `/assets/stickers/${variant.imagePath.split('/').slice(3).join('/')}`);
    assert.ok(sticker.tags.includes('milestone'));
    assert.ok(sticker.unlockReason.length > 0);

    const filePath = path.join('public', variant.imagePath.split('public/')[1]);
    assert.ok(fs.existsSync(filePath), `${variant.name} image missing: ${filePath}`);
    const bytes = fs.readFileSync(filePath);
    assert.ok(bytes.length > 0);
    // PNG signature + 400x400 RGBA (IHDR: width/height at bytes 16-23, color type 6 at byte 25).
    assert.deepEqual([...bytes.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 'not a PNG');
    assert.equal(bytes.readUInt32BE(16), 400, 'sticker art must be 400x400');
    assert.equal(bytes.readUInt32BE(20), 400, 'sticker art must be 400x400');
    assert.equal(bytes[25], 6, 'sticker art must be RGBA (transparent background)');
  });

  test(`milestone variants: the 5th approval awards ${variant.name} for a ${variant.fieldType} player`, async () => {
    const fake = makeFakeUnlock();
    await evaluateAdminApprovalStickers({
      userId: USER_ID,
      entry: { tripId: 'mission-e' },
      source: 'proof_approval:e1',
      fieldType: variant.fieldType,
      profile: makeProfile(['mission-a', 'mission-b', 'mission-c', 'mission-d']),
      unlock: fake.unlock
    });
    assert.deepEqual(
      callsForTrigger(fake.calls, 'archetype_milestone').flatMap((call) => call.stickerIds),
      [variant.id]
    );
  });
}
