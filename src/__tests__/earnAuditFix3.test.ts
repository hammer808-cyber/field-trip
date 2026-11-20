import assert from 'node:assert/strict';
import test from 'node:test';
import { getStickerById } from '../data/stickers';
import {
  evaluateAdminApprovalStickers,
  resolveEventStickers
} from '../logic/stickerEvaluator';
import {
  isNeedsMoreReviewForMission
} from '../services/stickerService';
import type { StickerUnlockResult } from '../services/stickerService';

/**
 * Earn-audit fix #3 (Nov 20, 2026): the three clear ones — the Side
 * Quests stickers with an honest mechanical trigger.
 *
 * - Retail Therapy → `first_approval` as Mall Rat (the Mall Rat
 *   first-approval variant; Mall Rat had none and fell back to the
 *   Checkmark Seal default).
 * - Good Company → `crew_joined`, alongside Accomplice (cross-pack, so it
 *   rides along on every crew join).
 * - Plot Twist → new `repair_approved` trigger: the approval is a repair
 *   (the mission was sent back for more proof and came back approved).
 *   The admin call sites set `wasRepair` from the proof-review history
 *   (`wasMissionSentBackForMoreProof`); the bundle awards it even when
 *   the profile read failed, because it needs no snapshot.
 *
 * The other 8 Side Quests stay admin_grant — see
 * docs/earn-audit-fix-3-trigger-definitions.md.
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
  return { calls, unlock };
}

const callsForTrigger = (calls: FakeUnlockCall[], trigger: string) =>
  calls.filter((call) => call.trigger === trigger);

test('fix #3 registry: Retail Therapy is the Mall Rat first-approval variant', () => {
  const sticker = getStickerById('side_quests_retail_therapy');
  assert.ok(sticker);
  assert.equal(sticker.awardTrigger, 'first_approval');
  assert.equal(sticker.archetype, 'mallRat');
  assert.equal(sticker.collection, 'side_quests');
  assert.equal(sticker.rarity, 'common');
  assert.ok(!sticker.tags.includes('trigger-pending'), 'no longer trigger-pending');
  assert.ok(sticker.unlockReason.length > 0);
});

test('fix #3 registry: Good Company rides crew_joined, Plot Twist rides repair_approved', () => {
  const goodCompany = getStickerById('side_quests_good_company');
  assert.ok(goodCompany);
  assert.equal(goodCompany.awardTrigger, 'crew_joined');
  assert.equal(goodCompany.archetype, undefined, 'cross-pack — rides along on every crew join');
  assert.ok(!goodCompany.tags.includes('trigger-pending'));

  const plotTwist = getStickerById('side_quests_plot_twist');
  assert.ok(plotTwist);
  assert.equal(plotTwist.awardTrigger, 'repair_approved');
  assert.equal(plotTwist.archetype, undefined, 'cross-pack — any player can have a plot twist');
  assert.equal(plotTwist.rarity, 'rare');
  assert.ok(!plotTwist.tags.includes('trigger-pending'));
});

test('fix #3: a Mall Rat first approval awards Retail Therapy, not the Checkmark Seal default', () => {
  const awarded = resolveEventStickers('first_approval', 'mallRat').map((s) => s.id);
  assert.deepEqual(awarded, ['side_quests_retail_therapy']);
});

test('fix #3: other archetypes keep their first-approval variant (no regression)', () => {
  assert.deepEqual(
    resolveEventStickers('first_approval', 'elondra').map((s) => s.id),
    ['elondra_glam_pose']
  );
  assert.deepEqual(
    resolveEventStickers('first_approval', 'captainClipboard').map((s) => s.id),
    ['captain_clipboard_checkmark_seal']
  );
});

test('fix #3: a crew join awards Accomplice + Good Company (+ the bigfoot default)', () => {
  const awarded = resolveEventStickers('crew_joined', 'elondra').map((s) => s.id);
  assert.ok(awarded.includes('first_offenses_accomplice'), 'Accomplice still fires');
  assert.ok(awarded.includes('side_quests_good_company'), 'Good Company rides along');
  assert.ok(awarded.includes('bigfoot_peace_sign'), 'the crew_joined default still fires');
});

test('fix #3: a repair approval awards Plot Twist', async () => {
  const fake = makeFakeUnlock();
  await evaluateAdminApprovalStickers({
    userId: 'fix3-player',
    entry: { missionId: 'socal-09' },
    source: 'fix3:repair',
    fieldType: 'mallRat',
    profile: null,
    wasRepair: true,
    unlock: fake.unlock
  });
  const repair = callsForTrigger(fake.calls, 'repair_approved');
  assert.equal(repair.length, 1, 'one repair_approved award');
  assert.deepEqual(repair[0].stickerIds, ['side_quests_plot_twist']);
  // The same approval also awards the first-approval variant (Retail Therapy).
  const first = callsForTrigger(fake.calls, 'first_approval');
  assert.deepEqual(first[0].stickerIds, ['side_quests_retail_therapy']);
});

test('fix #3: a non-repair approval does NOT award Plot Twist', async () => {
  const fake = makeFakeUnlock();
  await evaluateAdminApprovalStickers({
    userId: 'fix3-player',
    entry: { missionId: 'socal-09' },
    source: 'fix3:fresh',
    fieldType: 'mallRat',
    profile: null,
    wasRepair: false,
    unlock: fake.unlock
  });
  assert.equal(callsForTrigger(fake.calls, 'repair_approved').length, 0);
});

test('fix #3: Plot Twist fires even when the profile read failed (no snapshot needed)', async () => {
  const fake = makeFakeUnlock();
  // profile: null is the failed-read degradation path — the bundle's
  // snapshot rules are skipped, but the repair check runs anyway.
  await evaluateAdminApprovalStickers({
    userId: 'fix3-player',
    entry: { missionId: 'socal-09' },
    source: 'fix3:repair-no-profile',
    fieldType: null,
    profile: null,
    wasRepair: true,
    unlock: fake.unlock
  });
  const repair = callsForTrigger(fake.calls, 'repair_approved');
  assert.deepEqual(repair[0].stickerIds, ['side_quests_plot_twist']);
});

test('fix #3: isNeedsMoreReviewForMission matches the mission, not just any needs-more', () => {
  const needsMore = { status: 'needs_more_proof', challengeId: 'SOCAL-09' };
  assert.equal(isNeedsMoreReviewForMission(needsMore, 'socal-09'), true, 'challengeId match, case-insensitive');
  assert.equal(
    isNeedsMoreReviewForMission({ status: 'needs_more_proof', missionId: 'socal-09' }, 'socal-09'),
    true,
    'missionId fallback when challengeId is absent'
  );
  assert.equal(isNeedsMoreReviewForMission(needsMore, 'texas-01'), false, 'a different mission is not a repair');
  assert.equal(
    isNeedsMoreReviewForMission({ status: 'approved', challengeId: 'socal-09' }, 'socal-09'),
    false,
    'an approved review is not a needs-more'
  );
  assert.equal(isNeedsMoreReviewForMission(needsMore, null), false, 'no mission, no match');
  assert.equal(isNeedsMoreReviewForMission({}, 'socal-09'), false, 'an empty review doc matches nothing');
});
