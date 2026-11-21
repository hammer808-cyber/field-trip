import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getActiveDeckPacks, getDeckPackById } from '../data/deckPacks';
import { evaluateAdminApprovalStickers } from '../logic/stickerEvaluator';
import type { StickerUnlockResult } from '../services/stickerService';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

const USER_ID = 'admin-review-player';

/**
 * Milestone bundle fix #1 (Nov 19, 2026): the count/set re-checks ran only
 * inside the `first_approval` bundle when a snapshot was passed, and the
 * only snapshot-carrying call site — AppContext's immediate-approval branch
 * — never runs because `submitTripEntry` always returns `pending_review`.
 * The two admin review paths evaluated `first_approval` with no snapshot,
 * so the 5 milestone stickers had no live award path. The fix funnels both
 * admin paths through `evaluateAdminApprovalStickers`, which builds the
 * snapshot from the player's profile doc (the server maintains the
 * profile's approval caches on every approval).
 *
 * These tests pin the helper end to end: profile → snapshot → bundle.
 * The fake unlock mirrors the unlock transaction's already_unlocked
 * dedupe. Exact-5 stays exact for mission_count_milestone (audit fix
 * #2, NOT this change) — the last test pins that on purpose.
 * archetype_milestone is a catch-up rule instead (audit fix #2a, Nov 20,
 * 2026): it fires at 5 and on any later approval, so players already
 * past 5 still earn it.
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

const callsForTrigger = (calls: FakeUnlockCall[], trigger: string) =>
  calls.filter((call) => call.trigger === trigger);

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

/** First active non-starter deck + its mission ids, read from the real catalog. */
function realNonStarterDeck(): { packId: string; missionIds: string[] } {
  const pack = getActiveDeckPacks().find((candidate) => candidate.packId !== 'starter-signals');
  assert.ok(pack, 'expected an active non-starter deck');
  const missionIds = (getDeckPackById(pack.packId)?.missionIds ?? []).map((id) => String(id).toLowerCase());
  assert.ok(missionIds.length >= 2, 'test deck needs at least 2 missions');
  return { packId: pack.packId, missionIds };
}

test('admin approval: the 3rd approval awards Repeat Offender (mission_count_milestone)', async () => {
  const fake = makeFakeUnlock();
  const results = await evaluateAdminApprovalStickers({
    userId: USER_ID,
    entry: { tripId: 'mission-c' },
    source: 'proof_approval:e1',
    fieldType: 'captainClipboard',
    profile: makeProfile(['mission-a', 'mission-b']),
    unlock: fake.unlock
  });
  const calls = callsForTrigger(fake.calls, 'mission_count_milestone');
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].stickerIds, ['first_offenses_repeat_offender']);
  assert.ok(
    results.some((result) => result.stickerId === 'first_offenses_repeat_offender' && result.status === 'unlocked')
  );
});

test('admin approval: the 5th approval awards the archetype milestone sticker', async () => {
  const fake = makeFakeUnlock();
  const results = await evaluateAdminApprovalStickers({
    userId: USER_ID,
    entry: { tripId: 'mission-e' },
    source: 'proof_approval:e1',
    fieldType: 'mallRat',
    profile: makeProfile(['mission-a', 'mission-b', 'mission-c', 'mission-d']),
    unlock: fake.unlock
  });
  const calls = callsForTrigger(fake.calls, 'archetype_milestone');
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].stickerIds, ['mall_rat_sunglasses']);
  assert.ok(
    results.some((result) => result.stickerId === 'mall_rat_sunglasses' && result.status === 'unlocked')
  );
});

test('admin approval: completing a non-starter deck awards both season stickers', async () => {
  const { missionIds } = realNonStarterDeck();
  const approvedSoFar = missionIds.slice(0, -1);
  const lastMissionId = missionIds[missionIds.length - 1];
  const fake = makeFakeUnlock();
  await evaluateAdminApprovalStickers({
    userId: USER_ID,
    entry: { tripId: lastMissionId },
    source: 'proof_approval:e1',
    fieldType: 'captainClipboard',
    profile: makeProfile(approvedSoFar),
    unlock: fake.unlock
  });
  const calls = callsForTrigger(fake.calls, 'season_milestone');
  assert.equal(calls.length, 1);
  assert.deepEqual(
    [...calls[0].stickerIds].sort(),
    ['elondra_arrival_pose', 'mall_rat_escalator_pose']
  );
});

test('admin approval: no profile read means the bundle is skipped (old degradation path, not the only path)', async () => {
  const fake = makeFakeUnlock();
  await evaluateAdminApprovalStickers({
    userId: USER_ID,
    entry: { tripId: 'mission-c' },
    source: 'proof_approval:e1',
    fieldType: 'captainClipboard',
    profile: null,
    unlock: fake.unlock
  });
  // The event rule still evaluates (first_approval awards its default),
  // but no milestone rule runs without a snapshot.
  assert.equal(callsForTrigger(fake.calls, 'first_approval').length, 1);
  assert.equal(callsForTrigger(fake.calls, 'mission_count_milestone').length, 0);
  assert.equal(callsForTrigger(fake.calls, 'archetype_milestone').length, 0);
  assert.equal(callsForTrigger(fake.calls, 'season_milestone').length, 0);
});

test('admin approval: a profile that already includes the triggering mission does not double-count it', async () => {
  // The snapshot is built after the server commit, so the profile's caches
  // usually already contain the just-approved mission. The evaluator's
  // stale-by-one handling must not count it twice: 3 in the caches with the
  // triggering mission among them is still the 3rd approval, not the 4th.
  const fake = makeFakeUnlock();
  await evaluateAdminApprovalStickers({
    userId: USER_ID,
    entry: { tripId: 'mission-c' },
    source: 'proof_approval:e1',
    fieldType: 'captainClipboard',
    profile: makeProfile(['mission-a', 'mission-b', 'mission-c']),
    unlock: fake.unlock
  });
  const calls = callsForTrigger(fake.calls, 'mission_count_milestone');
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].stickerIds, ['first_offenses_repeat_offender']);
});

test('admin approval: archetype_milestone catches up past 5 (audit fix #2)', async () => {
  const fake = makeFakeUnlock();
  const results = await evaluateAdminApprovalStickers({
    userId: USER_ID,
    entry: { tripId: 'mission-f' },
    source: 'proof_approval:e1',
    fieldType: 'mallRat',
    profile: makeProfile(['mission-a', 'mission-b', 'mission-c', 'mission-d', 'mission-e']),
    unlock: fake.unlock
  });
  // 6th approval: the archetype milestone fires (catch-up — a player
  // already past 5 earns it on their next approval), while the
  // mission-count rule stays exact-match: 6 is past its thresholds
  // (3, 5, 10), so no mission-count milestone fires here.
  const calls = callsForTrigger(fake.calls, 'archetype_milestone');
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].stickerIds, ['mall_rat_sunglasses']);
  assert.ok(
    results.some((result) => result.stickerId === 'mall_rat_sunglasses' && result.status === 'unlocked')
  );
  assert.equal(callsForTrigger(fake.calls, 'mission_count_milestone').length, 0);
});

test('wiring: both admin review paths post first_approval to the server evaluate endpoint', () => {
  // Option B (Nov 20, 2026): the review paths no longer run the evaluator
  // client-side. They post a first_approval event; the server reads the
  // entry + profile, runs evaluateAdminApprovalStickers, and writes the
  // award + notification in one transaction.
  for (const rel of ['src/services/proofService.ts', 'src/services/submissionService.ts']) {
    const source = read(rel);
    assert.ok(
      source.includes('requestStickerEvaluation'),
      `${rel} must post the approval to the server evaluate endpoint`
    );
    assert.ok(
      source.includes("eventType: 'first_approval'"),
      `${rel} must post a first_approval event`
    );
    assert.ok(
      !source.includes('evaluateAdminApprovalStickers'),
      `${rel} must not run the evaluator client-side anymore`
    );
    assert.ok(
      !source.includes("re-check on the player's next AppContext approval"),
      `${rel} must not carry the stale comment about a next AppContext approval that never comes`
    );
    assert.ok(
      !source.includes('No snapshot is available here'),
      `${rel} must not claim no snapshot is available`
    );
  }
  assert.ok(
    read('src/logic/stickerEvaluator.ts').includes('export async function evaluateAdminApprovalStickers'),
    'stickerEvaluator must export the admin-approval helper'
  );
  assert.ok(
    read('src/server/stickerEvaluate.ts').includes("db.collection('users').doc(uid).get()"),
    'the server evaluate module must read the player profile for the milestone snapshot'
  );
});
