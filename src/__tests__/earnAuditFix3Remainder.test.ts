/**
 * Earn-audit fix #3 — remainder (Nov 20, 2026, Zach's red pen).
 *
 * The first three (Retail Therapy, Good Company, Plot Twist) shipped in
 * `earnAuditFix3.test.ts`. This file pins the rest, all built from Zach's
 * answers to Q1–Q11:
 *
 * - Q1 On a Roll: 5 approved proofs on 5 consecutive days, rare.
 * - Q2 Scene Starter: separate `first_draw` event.
 * - Q3 The Instigator: `crew_created`, stacking with Whistle Lanyard.
 * - Q4 Outside Person: `location_verified`, location-tagged missions only.
 * - Q6 Night Owl / After Hours: `late_night_submission`, 9 PM–midnight /
 *   midnight–5 AM local (the submitting device's hour).
 * - Q7 Roadside Weird: `first_approval` deck-scoped to Texas. Detour and
 *   Hidden Gem stay admin-grant (my call, accepted by Zach).
 * - Q8 Sasquatch Sighting: Bigfoot's `first_approval` variant.
 * - Q9 mix (D): Desert Alien Encounter gets its rule (Q10); the other 27
 *   pack stickers stay admin-grant.
 * - Q10 Desert Alien Encounter: `desert_state_approval` on a desert-state
 *   tag (AZ, NV, NM, UT) — no such mission exists yet, so the rule is
 *   built but cannot fire.
 * - Q11 Accomplice: the bar is the crew still existing a week after it
 *   was created (`crew_survived_week`, checked at crew-membership
 *   reconciliation and on join).
 * - Q5 Certified Menace: fires automatically the first time any Chaos
 *   sticker is granted (server-side, at grant time).
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { getAllStickers, getStickerById, getStickersByTrigger } from '../data/stickers';
import { buildCanonicalProgress, type CanonicalProgressSnapshot } from '../services/canonicalProgress';
import { evaluateStickerTriggers, resolveEventStickers } from '../logic/stickerEvaluator';
import { getMissionLocationTag, isDesertStateTag } from '../logic/locationTags';
import { crewCreatedAtDate, crewSurvivedWeek } from '../services/crewService';
import {
  CERTIFIED_MENACE_STICKER_ID,
  grantStickerServer,
  type StickerGrantStore,
  type StickerGrantWriteResult
} from '../server/stickerGrants';
import type { StickerUnlockResult } from '../services/stickerService';

const USER_ID = 'user-1';

function makeFakeUnlock() {
  const calls: Array<{ userId: string; stickerIds: string[]; source: string; trigger: string }> = [];
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

function awardedIds(fake: ReturnType<typeof makeFakeUnlock>): string[] {
  return fake.calls.flatMap((call) => call.stickerIds);
}

function makeSnapshot(opts: { approved?: string[]; approvalStreakDays?: number } = {}): CanonicalProgressSnapshot {
  return {
    approvedCompletedChallengeIds: new Set((opts.approved ?? []).map((id) => id.toLowerCase())),
    submittedPendingChallengeIds: new Set<string>(),
    submittedChallengeIds: new Set<string>(),
    needsMoreProofChallengeIds: new Set<string>(),
    rejectedChallengeIds: new Set<string>(),
    archivedChallengeIds: new Set<string>(),
    deckProgressById: {},
    approvalStreakDays: opts.approvalStreakDays ?? 0,
    timestamps: { lastDrawAt: null, lastSubmissionAt: null }
  } as unknown as CanonicalProgressSnapshot;
}

// ---------------------------------------------------------------------------
// Registry pins
// ---------------------------------------------------------------------------

test('fix #3 remainder: registry still 118, admin-grant down to 42', () => {
  const all = getAllStickers();
  assert.equal(all.length, 118);
  assert.equal(new Set(all.map((s) => s.id)).size, 118);
  const adminGrant = all.filter((s) => s.awardTrigger === 'admin_grant');
  assert.equal(adminGrant.length, 42);
  // Desert Alien Encounter left admin_grant but has no live path yet —
  // it is not in the 42 (its trigger is desert_state_approval).
  assert.ok(!adminGrant.some((s) => s.id === 'elondra_desert_alien_encounter'));
  // The trigger-pending tag now marks only the 41 that still need a
  // definition: Certified Menace lost it (its earning is defined —
  // first Chaos grant — even though its trigger stays admin_grant).
  assert.equal(all.filter((s) => s.tags.includes('trigger-pending')).length, 41);
  assert.ok(!getStickerById('first_offenses_certified_menace')!.tags.includes('trigger-pending'));
  // Rarity moved one: On a Roll went common -> rare.
  assert.equal(all.filter((s) => s.rarity === 'common').length, 77);
  assert.equal(all.filter((s) => s.rarity === 'rare').length, 37);
  assert.equal(all.filter((s) => s.rarity === 'legendary').length, 4);
  // Archetype moved one: Sasquatch Sighting went cross-pack -> bigfoot.
  assert.equal(all.filter((s) => s.archetype === 'bigfoot').length, 9);
  assert.equal(all.filter((s) => !s.archetype).length, 39);
});

test('fix #3 remainder: the rewired stickers carry their new triggers', () => {
  const expected: Array<[string, string]> = [
    ['first_offenses_scene_starter', 'first_draw'],
    ['first_offenses_the_instigator', 'crew_created'],
    ['first_offenses_outside_person', 'location_verified'],
    ['first_offenses_accomplice', 'crew_survived_week'],
    ['chaos_on_a_roll', 'approval_streak'],
    ['side_quests_night_owl', 'late_night_submission'],
    ['side_quests_after_hours', 'late_night_submission'],
    ['side_quests_roadside_weird', 'first_approval'],
    ['side_quests_sasquatch_sighting', 'first_approval'],
    ['elondra_desert_alien_encounter', 'desert_state_approval']
  ];
  for (const [id, trigger] of expected) {
    const sticker = getStickerById(id);
    assert.ok(sticker, `${id} is registered`);
    assert.equal(sticker.awardTrigger, trigger, `${id} trigger`);
    assert.ok(!sticker.tags.includes('trigger-pending'), `${id} is no longer trigger-pending`);
  }
  assert.equal(getStickerById('chaos_on_a_roll')!.rarity, 'rare');
  assert.equal(getStickerById('side_quests_sasquatch_sighting')!.archetype, 'bigfoot');
  assert.equal(getStickerById('side_quests_roadside_weird')!.deckId, 'texas-get-it-yall');
  assert.deepEqual(getStickerById('side_quests_night_owl')!.hourWindow, [21, 24]);
  assert.deepEqual(getStickerById('side_quests_after_hours')!.hourWindow, [0, 5]);
  // The ones Zach left as grants stay put.
  for (const id of ['side_quests_detour', 'side_quests_hidden_gem', 'side_quests_snack_attack', 'side_quests_full_send']) {
    assert.equal(getStickerById(id)!.awardTrigger, 'admin_grant', `${id} stays admin-grant`);
    assert.ok(getStickerById(id)!.tags.includes('trigger-pending'));
  }
  for (const id of ['chaos_runaway_cart', 'chaos_melting_cone', 'chaos_disco_explosion']) {
    assert.equal(getStickerById(id)!.awardTrigger, 'admin_grant');
  }
  assert.equal(getStickerById('first_offenses_certified_menace')!.awardTrigger, 'admin_grant');
});

test('fix #3 remainder: new triggers resolve to exactly their stickers', () => {
  assert.deepEqual(
    getStickersByTrigger('first_draw').map((s) => s.id),
    ['first_offenses_scene_starter']
  );
  assert.deepEqual(
    getStickersByTrigger('location_verified').map((s) => s.id),
    ['first_offenses_outside_person']
  );
  assert.deepEqual(
    getStickersByTrigger('desert_state_approval').map((s) => s.id),
    ['elondra_desert_alien_encounter']
  );
  assert.deepEqual(
    getStickersByTrigger('approval_streak').map((s) => s.id),
    ['chaos_on_a_roll']
  );
  assert.deepEqual(
    getStickersByTrigger('crew_survived_week').map((s) => s.id),
    ['first_offenses_accomplice']
  );
  assert.deepEqual(
    getStickersByTrigger('late_night_submission').map((s) => s.id).sort(),
    ['side_quests_after_hours', 'side_quests_night_owl']
  );
});

// ---------------------------------------------------------------------------
// Resolver: the new events
// ---------------------------------------------------------------------------

test('fix #3 remainder: first_draw awards Scene Starter for any archetype', () => {
  for (const archetype of ['captainClipboard', 'mallRat', 'mascota', 'elondra', 'lostCamper', 'bigfoot'] as const) {
    const resolved = resolveEventStickers('first_draw', archetype);
    assert.deepEqual(resolved.map((s) => s.id), ['first_offenses_scene_starter']);
  }
});

test('fix #3 remainder: crew_created awards Whistle Lanyard + The Instigator', () => {
  const resolved = resolveEventStickers('crew_created', 'captainClipboard');
  assert.deepEqual(
    resolved.map((s) => s.id).sort(),
    ['captain_clipboard_whistle_lanyard', 'first_offenses_the_instigator'].sort()
  );
});

test('fix #3 remainder: Bigfoot first approval earns Sasquatch Sighting, not the Checkmark Seal', () => {
  const resolved = resolveEventStickers('first_approval', 'bigfoot');
  assert.ok(resolved.some((s) => s.id === 'side_quests_sasquatch_sighting'));
  assert.ok(!resolved.some((s) => s.id === 'captain_clipboard_checkmark_seal'));
});

test('fix #3 remainder: first Texas approval stacks Roadside Weird with the Texas 01', () => {
  const texas = resolveEventStickers('first_approval', 'captainClipboard', 'texas-get-it-yall', 'texas-08');
  assert.ok(texas.some((s) => s.id === 'side_quests_roadside_weird'));
  assert.ok(texas.some((s) => s.id === 'texas_yall_01'));
  assert.ok(texas.some((s) => s.id === 'captain_clipboard_checkmark_seal'));
  // A non-Texas first approval earns neither Texas sticker.
  const socal = resolveEventStickers('first_approval', 'captainClipboard', 'socal-summer', 'socal-01');
  assert.ok(!socal.some((s) => s.id === 'side_quests_roadside_weird'));
  assert.ok(!socal.some((s) => s.id === 'texas_yall_01'));
  assert.ok(socal.some((s) => s.id === 'captain_clipboard_checkmark_seal'));
});

test('fix #3 remainder: late-night stickers filter by the submitting hour', () => {
  assert.deepEqual(
    resolveEventStickers('late_night_submission', null, null, null, 22).map((s) => s.id),
    ['side_quests_night_owl']
  );
  assert.deepEqual(
    resolveEventStickers('late_night_submission', null, null, null, 2).map((s) => s.id),
    ['side_quests_after_hours']
  );
  // Window edges: 21 is Night Owl, 0 is After Hours, 5 is neither.
  assert.ok(resolveEventStickers('late_night_submission', null, null, null, 21).some((s) => s.id === 'side_quests_night_owl'));
  assert.ok(resolveEventStickers('late_night_submission', null, null, null, 0).some((s) => s.id === 'side_quests_after_hours'));
  assert.deepEqual(resolveEventStickers('late_night_submission', null, null, null, 5), []);
  assert.deepEqual(resolveEventStickers('late_night_submission', null, null, null, 14), []);
  // No hour, no award — there is no evidence it was night.
  assert.deepEqual(resolveEventStickers('late_night_submission', null), []);
});

test('fix #3 remainder: crew_joined no longer awards Accomplice; crew_survived_week does', () => {
  const joined = resolveEventStickers('crew_joined', null);
  assert.ok(joined.some((s) => s.id === 'side_quests_good_company'));
  assert.ok(!joined.some((s) => s.id === 'first_offenses_accomplice'));
  assert.deepEqual(
    resolveEventStickers('crew_survived_week', null).map((s) => s.id),
    ['first_offenses_accomplice']
  );
});

test('fix #3 remainder: location_verified and desert_state_approval resolve by archetype', () => {
  assert.deepEqual(
    resolveEventStickers('location_verified', 'mascota').map((s) => s.id),
    ['first_offenses_outside_person']
  );
  assert.deepEqual(
    resolveEventStickers('desert_state_approval', 'elondra').map((s) => s.id),
    ['elondra_desert_alien_encounter']
  );
  // Desert Alien is an Elondra pack sticker — other archetypes get nothing.
  assert.deepEqual(resolveEventStickers('desert_state_approval', 'mascota'), []);
  assert.deepEqual(resolveEventStickers('desert_state_approval', null), []);
});

// ---------------------------------------------------------------------------
// Bundle: a first Texas approval, and a non-Texas one
// ---------------------------------------------------------------------------

test('fix #3 remainder: first Texas approval awards Roadside Weird + Outside Person', async () => {
  const fake = makeFakeUnlock();
  await evaluateStickerTriggers({
    event: {
      type: 'first_approval',
      entry: { missionId: 'texas-08', deckId: 'texas-get-it-yall' },
      source: 'test:texas-approval'
    },
    userId: USER_ID,
    snapshot: makeSnapshot(),
    fieldType: 'mallrat',
    unlock: fake.unlock
  });
  const awarded = awardedIds(fake);
  assert.ok(awarded.includes('side_quests_roadside_weird'), 'Roadside Weird (first Texas approval)');
  assert.ok(awarded.includes('first_offenses_outside_person'), 'Outside Person (location-tagged mission)');
  assert.ok(awarded.includes('texas_yall_01'), 'Texas Y\'all 01 (same moment)');
  assert.ok(awarded.includes('side_quests_retail_therapy'), 'Retail Therapy (Mall Rat first approval)');
  assert.ok(awarded.includes('mall_rat_shopping_spree'), 'Shopping Spree (Mall Rat challenge_approved)');
  assert.ok(awarded.includes('texas_yall_02'), 'Big Mood Longhorn (texas-08)');
  // Desert Alien does not fire: Texas is not a desert state.
  assert.ok(!awarded.includes('elondra_desert_alien_encounter'));
});

test('fix #3 remainder: a non-Texas approval awards neither Texas nor location stickers', async () => {
  const fake = makeFakeUnlock();
  await evaluateStickerTriggers({
    event: {
      type: 'first_approval',
      entry: { missionId: 'socal-01' },
      source: 'test:socal-approval'
    },
    userId: USER_ID,
    snapshot: makeSnapshot(),
    fieldType: 'mascota',
    unlock: fake.unlock
  });
  const awarded = awardedIds(fake);
  assert.ok(!awarded.includes('side_quests_roadside_weird'));
  assert.ok(!awarded.includes('texas_yall_01'));
  assert.ok(!awarded.includes('first_offenses_outside_person'));
  assert.ok(!awarded.includes('elondra_desert_alien_encounter'));
});

// ---------------------------------------------------------------------------
// Streak: On a Roll fires at 5, not at 4
// ---------------------------------------------------------------------------

test('fix #3 remainder: approval streak of 5 earns On a Roll; 4 does not', async () => {
  const atFive = makeFakeUnlock();
  await evaluateStickerTriggers({
    event: {
      type: 'first_approval',
      entry: { missionId: 'socal-01' },
      source: 'test:streak-5'
    },
    userId: USER_ID,
    snapshot: makeSnapshot({ approvalStreakDays: 5 }),
    fieldType: 'mascota',
    unlock: atFive.unlock
  });
  assert.ok(awardedIds(atFive).includes('chaos_on_a_roll'));

  const atFour = makeFakeUnlock();
  await evaluateStickerTriggers({
    event: {
      type: 'first_approval',
      entry: { missionId: 'socal-01' },
      source: 'test:streak-4'
    },
    userId: USER_ID,
    snapshot: makeSnapshot({ approvalStreakDays: 4 }),
    fieldType: 'mascota',
    unlock: atFour.unlock
  });
  assert.ok(!awardedIds(atFour).includes('chaos_on_a_roll'));
});

test('fix #3 remainder: snapshot carries the streak from the profile', () => {
  const withStreak = buildCanonicalProgress({
    userId: USER_ID,
    profile: { approvalStreakDays: 3 } as never
  });
  assert.equal(withStreak.approvalStreakDays, 3);
  const withoutStreak = buildCanonicalProgress({ userId: USER_ID, profile: {} as never });
  assert.equal(withoutStreak.approvalStreakDays, 0);
});

// ---------------------------------------------------------------------------
// Location tags + desert states
// ---------------------------------------------------------------------------

test('fix #3 remainder: mission location tags resolve from the bank', () => {
  assert.deepEqual(getMissionLocationTag('texas-01'), { kind: 'state', state: 'TX' });
  assert.equal(getMissionLocationTag('socal-01'), null);
  assert.equal(getMissionLocationTag('nope-99'), null);
  assert.equal(getMissionLocationTag(null), null);
  assert.ok(isDesertStateTag({ kind: 'state', state: 'AZ' }));
  assert.ok(isDesertStateTag({ kind: 'state', state: 'NV' }));
  assert.ok(isDesertStateTag({ kind: 'state', state: 'NM' }));
  assert.ok(isDesertStateTag({ kind: 'state', state: 'UT' }));
  assert.ok(!isDesertStateTag({ kind: 'state', state: 'TX' }));
  assert.ok(!isDesertStateTag(null));
});

// ---------------------------------------------------------------------------
// Crew bar: the week check
// ---------------------------------------------------------------------------

test('fix #3 remainder: crewSurvivedWeek needs a full week', () => {
  const now = new Date('2026-11-20T12:00:00Z');
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const justUnder = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000 - 1000));
  assert.ok(crewSurvivedWeek(sevenDaysAgo, now));
  assert.ok(!crewSurvivedWeek(justUnder, now));
  assert.ok(!crewSurvivedWeek(new Date(now.getTime() + 1000), now));
  // Every shape the doc carries.
  assert.ok(crewSurvivedWeek({ toDate: () => sevenDaysAgo } as never, now));
  assert.ok(crewSurvivedWeek(sevenDaysAgo.toISOString(), now));
  assert.ok(crewSurvivedWeek(sevenDaysAgo.getTime(), now));
  assert.ok(!crewSurvivedWeek(null, now));
  assert.ok(!crewSurvivedWeek(undefined, now));
  assert.ok(!crewSurvivedWeek('not-a-date', now));
  assert.deepEqual(crewCreatedAtDate(null), null);
});

// ---------------------------------------------------------------------------
// Certified Menace: auto-fire at grant time
// ---------------------------------------------------------------------------

class FakeGrantStore implements StickerGrantStore {
  users = new Set<string>();
  owned = new Map<string, Set<string>>();
  writes: Array<{ targetUid: string; stickerId: string; reason: string }> = [];

  async getUser(uid: string) {
    return this.users.has(uid) ? { uid } : null;
  }

  async writeGrant(input: {
    targetUid: string;
    stickerId: string;
    stickerName: string;
    stickerRarity: string | null;
    adminUid: string;
    reason: string;
  }): Promise<StickerGrantWriteResult> {
    if (!this.users.has(input.targetUid)) return { applied: false, reason: 'user-not-found' };
    const owned = this.owned.get(input.targetUid) ?? new Set<string>();
    if (owned.has(input.stickerId)) return { applied: false, reason: 'already-unlocked' };
    owned.add(input.stickerId);
    this.owned.set(input.targetUid, owned);
    this.writes.push({ targetUid: input.targetUid, stickerId: input.stickerId, reason: input.reason });
    return { applied: true };
  }
}

test('fix #3 remainder: granting a Chaos sticker also awards Certified Menace', async () => {
  const store = new FakeGrantStore();
  store.users.add(USER_ID);
  const result = await grantStickerServer(store, {
    adminUid: 'admin-1',
    targetUid: USER_ID,
    stickerId: 'chaos_melting_cone',
    reason: 'melted down gloriously'
  });
  assert.ok(result.ok && result.awarded);
  assert.deepEqual(
    store.writes.map((w) => w.stickerId),
    ['chaos_melting_cone', CERTIFIED_MENACE_STICKER_ID]
  );
  assert.ok(store.writes[1].reason.startsWith('Auto: first Chaos achievement'));
});

test('fix #3 remainder: granting a non-Chaos sticker awards nothing extra', async () => {
  const store = new FakeGrantStore();
  store.users.add(USER_ID);
  const result = await grantStickerServer(store, {
    adminUid: 'admin-1',
    targetUid: USER_ID,
    stickerId: 'side_quests_snack_attack',
    reason: 'snack stop'
  });
  assert.ok(result.ok && result.awarded);
  assert.deepEqual(store.writes.map((w) => w.stickerId), ['side_quests_snack_attack']);
});

test('fix #3 remainder: Certified Menace catch-up fires on the next Chaos grant', async () => {
  const store = new FakeGrantStore();
  store.users.add(USER_ID);
  // Player already holds a Chaos sticker from before this shipped.
  store.owned.set(USER_ID, new Set(['chaos_runaway_cart']));
  const result = await grantStickerServer(store, {
    adminUid: 'admin-1',
    targetUid: USER_ID,
    stickerId: 'chaos_disco_explosion',
    reason: 'disco night'
  });
  assert.ok(result.ok && result.awarded);
  assert.ok(store.writes.some((w) => w.stickerId === CERTIFIED_MENACE_STICKER_ID));
});

test('fix #3 remainder: granting Certified Menace itself never double-fires', async () => {
  const store = new FakeGrantStore();
  store.users.add(USER_ID);
  const result = await grantStickerServer(store, {
    adminUid: 'admin-1',
    targetUid: USER_ID,
    stickerId: CERTIFIED_MENACE_STICKER_ID,
    reason: 'direct grant'
  });
  assert.ok(result.ok && result.awarded);
  assert.deepEqual(store.writes.map((w) => w.stickerId), [CERTIFIED_MENACE_STICKER_ID]);
});
