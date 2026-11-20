import assert from 'node:assert/strict';
import test from 'node:test';
import { getActiveDeckPacks, getDeckPackById } from '../data/deckPacks';
import type {
  CanonicalDeckProgress,
  CanonicalProgressSnapshot
} from '../services/canonicalProgress';
import type { StickerUnlockResult } from '../services/stickerService';
import { evaluateCountRule, evaluateStickerTriggers } from '../logic/stickerEvaluator';

const USER_ID = 'user-1';

interface FakeUnlockCall {
  userId: string;
  stickerIds: string[];
  source: string;
  trigger: string;
}

/** Stateful fake writer mirroring the unlock transaction's already_unlocked dedupe. */
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

function makeSnapshot(opts: {
  approved?: string[];
  deckProgress?: Record<string, CanonicalDeckProgress>;
} = {}): CanonicalProgressSnapshot {
  return {
    approvedCompletedChallengeIds: new Set((opts.approved ?? []).map((id) => id.toLowerCase())),
    submittedPendingChallengeIds: new Set<string>(),
    needsMoreProofChallengeIds: new Set<string>(),
    rejectedChallengeIds: new Set<string>(),
    deckProgressById: opts.deckProgress ?? {}
  } as unknown as CanonicalProgressSnapshot;
}

function deckProgress(packId: string, totalCards: number, approvedCount: number): CanonicalDeckProgress {
  return {
    deckId: packId,
    deckName: packId,
    totalCards,
    approvedCount,
    pendingCount: 0,
    needsMoreProofCount: 0,
    rejectedCount: 0,
    remainingCount: totalCards - approvedCount,
    eligibleCount: totalCards - approvedCount,
    exhausted: false,
    label: `${approvedCount}/${totalCards}`,
    percent: totalCards > 0 ? Math.round((approvedCount / totalCards) * 100) : 0
  };
}

/** First active non-starter deck + its mission ids, read from the real catalog. */
function realNonStarterDeck(): { packId: string; missionIds: string[] } {
  const pack = getActiveDeckPacks().find((candidate) => candidate.packId !== 'starter-signals');
  assert.ok(pack, 'expected an active non-starter deck');
  const missionIds = (getDeckPackById(pack.packId)?.missionIds ?? []).map((id) => String(id).toLowerCase());
  assert.ok(missionIds.length >= 2, 'test deck needs at least 2 missions');
  return { packId: pack.packId, missionIds };
}

function callsForTrigger(calls: FakeUnlockCall[], trigger: string): FakeUnlockCall[] {
  return calls.filter((call) => call.trigger === trigger);
}

test('first_approval awards the player archetype variant, not the hardcoded default', async () => {
  const fake = makeFakeUnlock();
  await evaluateStickerTriggers({
    event: { type: 'first_approval', source: 'proof_approval:e1' },
    userId: USER_ID,
    fieldType: 'elondra',
    unlock: fake.unlock
  });
  assert.deepEqual(
    callsForTrigger(fake.calls, 'first_approval').flatMap((call) => call.stickerIds),
    ['elondra_glam_pose']
  );
});

test('first_approval falls back to the default when the archetype has no variant', async () => {
  const fake = makeFakeUnlock();
  await evaluateStickerTriggers({
    event: { type: 'first_approval', source: 'proof_approval:e1' },
    userId: USER_ID,
    fieldType: 'mascota',
    unlock: fake.unlock
  });
  assert.deepEqual(
    callsForTrigger(fake.calls, 'first_approval').flatMap((call) => call.stickerIds),
    ['captain_clipboard_checkmark_seal']
  );
});

test('first_approval with no field type falls back to the default', async () => {
  const fake = makeFakeUnlock();
  await evaluateStickerTriggers({
    event: { type: 'first_approval', source: 'proof_approval:e1' },
    userId: USER_ID,
    unlock: fake.unlock
  });
  assert.deepEqual(
    callsForTrigger(fake.calls, 'first_approval').flatMap((call) => call.stickerIds),
    ['captain_clipboard_checkmark_seal']
  );
});

test('event rules archetype-match across triggers', async () => {
  // Cross-pack FIRST OFFENSES stickers ride along with the archetype
  // variant (or the default) on their trigger: Fresh Meat on
  // first_submission, Democracy Is Messy on weekly_vote_cast, Accomplice
  // on crew_joined. Triggers with no cross-pack sticker are unchanged.
  const cases: Array<{ trigger: Parameters<typeof evaluateStickerTriggers>[0]['event']['type']; fieldType: string; expected: string[] }> = [
    { trigger: 'first_submission', fieldType: 'lostCamper', expected: ['lost_camper_nervous_camper', 'first_offenses_fresh_meat'] },
    { trigger: 'first_submission', fieldType: 'captainClipboard', expected: ['mall_rat_receipt_curl', 'first_offenses_fresh_meat'] },
    { trigger: 'field_note_added', fieldType: 'bigfoot', expected: ['bigfoot_campfire_snack'] },
    { trigger: 'field_note_added', fieldType: 'mallRat', expected: ['captain_clipboard_pen_sparkle'] },
    { trigger: 'photo_proof_added', fieldType: 'mallRat', expected: ['mall_rat_food_court_tray'] },
    { trigger: 'photo_proof_added', fieldType: 'elondra', expected: ['mall_rat_food_court_tray'] },
    { trigger: 'weekly_vote_cast', fieldType: 'bigfoot', expected: ['mascota_foam_finger', 'first_offenses_democracy_is_messy'] },
    { trigger: 'crew_created', fieldType: 'mallRat', expected: ['captain_clipboard_whistle_lanyard'] },
    { trigger: 'crew_joined', fieldType: 'lostCamper', expected: ['lost_camper_trail_sign', 'first_offenses_accomplice'] },
    { trigger: 'crew_joined', fieldType: 'mallRat', expected: ['bigfoot_peace_sign', 'first_offenses_accomplice'] },
    { trigger: 'zine_page_added', fieldType: 'elondra', expected: ['elondra_purse'] },
    { trigger: 'zine_page_added', fieldType: 'bigfoot', expected: ['captain_clipboard_flying_papers'] }
  ];
  for (const { trigger, fieldType, expected } of cases) {
    const fake = makeFakeUnlock();
    await evaluateStickerTriggers({
      event: { type: trigger, source: `test:${trigger}` },
      userId: USER_ID,
      fieldType,
      unlock: fake.unlock
    });
    assert.deepEqual(
      callsForTrigger(fake.calls, trigger).flatMap((call) => call.stickerIds),
      expected,
      `${trigger} for ${fieldType} should award ${expected.join(', ')}`
    );
  }
});

test('challenge_approved fires only for non-starter approvals, with the archetype variant', async () => {
  const fake = makeFakeUnlock();
  await evaluateStickerTriggers({
    event: {
      type: 'first_approval',
      entry: { tripId: 'heatwave-1' },
      source: 'proof_approval:e1'
    },
    userId: USER_ID,
    fieldType: 'elondra',
    unlock: fake.unlock
  });
  assert.deepEqual(
    callsForTrigger(fake.calls, 'challenge_approved').flatMap((call) => call.stickerIds),
    ['elondra_glam_shoe']
  );

  const starterFake = makeFakeUnlock();
  await evaluateStickerTriggers({
    event: {
      type: 'first_approval',
      entry: { tripId: 'starter-1' },
      source: 'proof_approval:e2'
    },
    userId: USER_ID,
    fieldType: 'elondra',
    unlock: starterFake.unlock
  });
  assert.equal(callsForTrigger(starterFake.calls, 'challenge_approved').length, 0);

  const noEntryFake = makeFakeUnlock();
  await evaluateStickerTriggers({
    event: { type: 'first_approval', source: 'proof_approval:e3' },
    userId: USER_ID,
    fieldType: 'elondra',
    unlock: noEntryFake.unlock
  });
  assert.equal(callsForTrigger(noEntryFake.calls, 'challenge_approved').length, 0);
});

test('evaluateCountRule: archetype_milestone is catch-up (>= 5), mission_count_milestone stays exact-match', () => {
  const archetypeIds = (count: number) =>
    evaluateCountRule('archetype_milestone', count).map((s) => s.id);
  assert.deepEqual(archetypeIds(4), []);
  assert.ok(archetypeIds(5).length > 0, '5th approval must fire the milestone');
  assert.ok(archetypeIds(6).length > 0, '6th approval must catch up, not miss');
  assert.ok(archetypeIds(12).length > 0, '12th approval must still catch up');

  const missionIds = (count: number) =>
    evaluateCountRule('mission_count_milestone', count).map((s) => s.id);
  assert.ok(missionIds(3).length > 0, '3 fires Repeat Offender');
  assert.deepEqual(missionIds(4), [], '4 is past a threshold — exact-match stays silent');
  assert.ok(missionIds(5).length > 0, '5 re-attempts at its threshold');
  assert.deepEqual(missionIds(6), [], '6 is past a threshold — exact-match stays silent');
  assert.ok(missionIds(10).length > 0, '10 re-attempts at its threshold');
});

test('archetype_milestone fires at the 5th approved proof, catches up after it, and not before the 5th', async () => {
  const atCount = async (approvedInSnapshot: string[], entryMissionId: string) => {
    const fake = makeFakeUnlock();
    const results = await evaluateStickerTriggers({
      event: {
        type: 'first_approval',
        entry: { tripId: entryMissionId },
        source: 'proof_approval:e1'
      },
      userId: USER_ID,
      snapshot: makeSnapshot({ approved: approvedInSnapshot }),
      fieldType: 'mallRat',
      unlock: fake.unlock
    });
    return { fake, results };
  };

  const fourth = await atCount(['mission-a', 'mission-b', 'mission-c'], 'mission-d');
  assert.equal(callsForTrigger(fourth.fake.calls, 'archetype_milestone').length, 0);

  const fifth = await atCount(['mission-a', 'mission-b', 'mission-c', 'mission-d'], 'mission-e');
  const fifthCalls = callsForTrigger(fifth.fake.calls, 'archetype_milestone');
  assert.equal(fifthCalls.length, 1);
  assert.deepEqual(fifthCalls[0].stickerIds, ['mall_rat_sunglasses']);
  assert.ok(
    fifth.results.some((result) => result.stickerId === 'mall_rat_sunglasses' && result.status === 'unlocked')
  );

  // Re-evaluation at the threshold re-attempts the award; the transaction dedupes.
  const repeat = await evaluateStickerTriggers({
    event: {
      type: 'first_approval',
      entry: { tripId: 'mission-e' },
      source: 'proof_approval:e1'
    },
    userId: USER_ID,
    snapshot: makeSnapshot({ approved: ['mission-a', 'mission-b', 'mission-c', 'mission-d'] }),
    fieldType: 'mallRat',
    unlock: fifth.fake.unlock
  });
  assert.ok(
    repeat.some((result) => result.stickerId === 'mall_rat_sunglasses' && result.status === 'already_unlocked')
  );

  // Catch-up (audit fix #2): past 5, the milestone fires on the next
  // approval instead of never — a player already past 5 when this ships
  // earns it on their 6th approval. The unlock dedupes re-evaluation.
  const sixth = await atCount(
    ['mission-a', 'mission-b', 'mission-c', 'mission-d', 'mission-e'],
    'mission-f'
  );
  const sixthCalls = callsForTrigger(sixth.fake.calls, 'archetype_milestone');
  assert.equal(sixthCalls.length, 1);
  assert.deepEqual(sixthCalls[0].stickerIds, ['mall_rat_sunglasses']);
  assert.ok(
    sixth.results.some((result) => result.stickerId === 'mall_rat_sunglasses' && result.status === 'unlocked')
  );
});

test('archetype_milestone awards nothing for an archetype with no milestone sticker', async () => {
  const fake = makeFakeUnlock();
  await evaluateStickerTriggers({
    event: {
      type: 'first_approval',
      entry: { tripId: 'mission-e' },
      source: 'proof_approval:e1'
    },
    userId: USER_ID,
    snapshot: makeSnapshot({ approved: ['mission-a', 'mission-b', 'mission-c', 'mission-d'] }),
    fieldType: 'captainClipboard',
    unlock: fake.unlock
  });
  assert.equal(callsForTrigger(fake.calls, 'archetype_milestone').length, 0);
});

test('season_milestone awards both season stickers when a non-starter deck is complete', async () => {
  const { packId, missionIds } = realNonStarterDeck();
  const fake = makeFakeUnlock();
  await evaluateStickerTriggers({
    event: {
      type: 'first_approval',
      entry: { tripId: missionIds[0] },
      source: 'proof_approval:e1'
    },
    userId: USER_ID,
    snapshot: makeSnapshot({
      approved: missionIds,
      deckProgress: { [packId]: deckProgress(packId, missionIds.length, missionIds.length) }
    }),
    fieldType: 'captainClipboard',
    unlock: fake.unlock
  });
  const seasonCalls = callsForTrigger(fake.calls, 'season_milestone');
  assert.equal(seasonCalls.length, 1);
  assert.deepEqual(
    [...seasonCalls[0].stickerIds].sort(),
    ['elondra_arrival_pose', 'mall_rat_escalator_pose']
  );
});

test('season_milestone fires on the approval that completes the deck', async () => {
  const { packId, missionIds } = realNonStarterDeck();
  const approvedSoFar = missionIds.slice(0, -1);
  const lastMissionId = missionIds[missionIds.length - 1];
  const fake = makeFakeUnlock();
  await evaluateStickerTriggers({
    event: {
      type: 'first_approval',
      entry: { tripId: lastMissionId },
      source: 'proof_approval:e1'
    },
    userId: USER_ID,
    snapshot: makeSnapshot({
      approved: approvedSoFar,
      deckProgress: { [packId]: deckProgress(packId, missionIds.length, missionIds.length - 1) }
    }),
    fieldType: 'captainClipboard',
    unlock: fake.unlock
  });
  assert.equal(callsForTrigger(fake.calls, 'season_milestone').length, 1);
});

test('season_milestone awards nothing when no non-starter deck is complete', async () => {
  const { packId, missionIds } = realNonStarterDeck();
  const fake = makeFakeUnlock();
  await evaluateStickerTriggers({
    event: {
      type: 'first_approval',
      entry: { tripId: missionIds[0] },
      source: 'proof_approval:e1'
    },
    userId: USER_ID,
    snapshot: makeSnapshot({
      approved: missionIds.slice(0, 1),
      deckProgress: { [packId]: deckProgress(packId, missionIds.length, 1) }
    }),
    fieldType: 'captainClipboard',
    unlock: fake.unlock
  });
  assert.equal(callsForTrigger(fake.calls, 'season_milestone').length, 0);
});

test('mission_count_milestone awards Repeat Offender on the 3rd approval, and only there', async () => {
  const atCount = async (approvedInSnapshot: string[], entryMissionId: string) => {
    const fake = makeFakeUnlock();
    await evaluateStickerTriggers({
      event: {
        type: 'first_approval',
        entry: { tripId: entryMissionId },
        source: 'proof_approval:e1'
      },
      userId: USER_ID,
      snapshot: makeSnapshot({ approved: approvedInSnapshot }),
      fieldType: 'mallRat',
      unlock: fake.unlock
    });
    return fake;
  };

  // Not on the 2nd or the 4th.
  for (const count of [2, 4]) {
    const approved = Array.from({ length: count - 1 }, (_, index) => `mission-${index}`);
    const fake = await atCount(approved, `mission-${count - 1}`);
    assert.equal(callsForTrigger(fake.calls, 'mission_count_milestone').length, 0, `no award at count ${count}`);
  }

  // On the 3rd: exactly Repeat Offender, awarded once.
  const third = await atCount(['mission-a', 'mission-b'], 'mission-c');
  const thirdCalls = callsForTrigger(third.calls, 'mission_count_milestone');
  assert.equal(thirdCalls.length, 1);
  assert.deepEqual(thirdCalls[0].stickerIds, ['first_offenses_repeat_offender']);

  // Re-evaluation at 5/10 re-attempts the award; the transaction dedupes.
  const fifth = await atCount(['mission-a', 'mission-b', 'mission-c', 'mission-d'], 'mission-e');
  const fifthCalls = callsForTrigger(fifth.calls, 'mission_count_milestone');
  assert.equal(fifthCalls.length, 1);
  assert.deepEqual(fifthCalls[0].stickerIds, ['first_offenses_repeat_offender']);
  const repeat = await evaluateStickerTriggers({
    event: {
      type: 'first_approval',
      entry: { tripId: 'mission-e' },
      source: 'proof_approval:e1'
    },
    userId: USER_ID,
    snapshot: makeSnapshot({ approved: ['mission-a', 'mission-b', 'mission-c', 'mission-d'] }),
    fieldType: 'mallRat',
    unlock: fifth.unlock
  });
  assert.ok(
    repeat.some((result) => result.stickerId === 'first_offenses_repeat_offender' && result.status === 'already_unlocked')
  );
});

test('level_up awards the Level Up sticker on a level-up event, for any archetype', async () => {
  for (const fieldType of ['elondra', 'mallRat', undefined] as const) {
    const fake = makeFakeUnlock();
    await evaluateStickerTriggers({
      event: { type: 'level_up', source: 'level_up:event-1' },
      userId: USER_ID,
      ...(fieldType ? { fieldType } : {}),
      unlock: fake.unlock
    });
    assert.deepEqual(
      callsForTrigger(fake.calls, 'level_up').flatMap((call) => call.stickerIds),
      ['first_offenses_level_up']
    );
  }
});

test('starter_pack, weekly_winner, and admin_grant are never client-evaluated', async () => {
  for (const trigger of ['starter_pack', 'weekly_winner', 'admin_grant'] as const) {
    const fake = makeFakeUnlock();
    await evaluateStickerTriggers({
      event: { type: trigger, source: `test:${trigger}` },
      userId: USER_ID,
      fieldType: 'mascota',
      unlock: fake.unlock
    });
    assert.equal(fake.calls.length, 0, `${trigger} should not award anything`);
  }
});

test('an unknown trigger awards nothing', async () => {
  const fake = makeFakeUnlock();
  await evaluateStickerTriggers({
    event: { type: 'not_a_trigger' as never, source: 'test:unknown' },
    userId: USER_ID,
    fieldType: 'mascota',
    unlock: fake.unlock
  });
  assert.equal(fake.calls.length, 0);
});
