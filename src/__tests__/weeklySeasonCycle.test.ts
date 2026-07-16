import assert from 'node:assert/strict';
import test from 'node:test';
import { getDefaultWeeklyCatalystForWeek } from '../logic/weeklyCatalyst';
import { getSeasonTiming } from '../logic/weeklyLogic';
import {
  getWeeklyBallotEmptyCopy,
  getWeeklyBallotEmptyReason,
  getWeeklyBallotLookup,
  isWeeklyProofEligible,
  normalizeWeeklyCandidateCategories,
} from '../logic/weeklyVoting';
import type { Season } from '../types/game';
import { getSeasonCountdown } from '../utils/seasonCountdown';

function buildSeason(): Season {
  const start = new Date('2026-05-25T07:00:00.000Z');
  const end = new Date('2026-08-17T06:59:59.999Z');
  return {
    id: 'summer-fieldtrip',
    title: 'Summer Fieldtrip',
    description: 'Test season',
    status: 'active',
    startDate: start,
    endDate: end,
    weeks: Array.from({ length: 12 }, (_, index) => ({
      number: index + 1,
      startDate: new Date(start.getTime() + index * 7 * 24 * 60 * 60 * 1000),
      fieldChallengeId: `field-${index + 1}`,
      evidenceChallengeId: `evidence-${index + 1}`,
      crewChallengeId: `crew-${index + 1}`,
      chaosCardIds: [],
      sabotageCardIds: [],
    })),
    createdAt: start,
  } as unknown as Season;
}

test('season timing returns Week 0 before the configured season starts', () => {
  const timing = getSeasonTiming(buildSeason(), new Date('2026-05-24T20:00:00.000Z'));
  assert.equal(timing.status, 'upcoming');
  assert.equal(timing.weekNumber, 0);
  assert.equal(timing.weekId, null);
});

test('season timing derives a mid-season week from configured week starts', () => {
  const timing = getSeasonTiming(buildSeason(), new Date('2026-07-15T19:00:00.000Z'));
  assert.equal(timing.status, 'active');
  assert.equal(timing.weekNumber, 8);
  assert.equal(timing.weekId, 'summer-fieldtrip_w8');
  assert.equal(timing.weekStartsAt?.toISOString(), '2026-07-13T07:00:00.000Z');
  assert.equal(timing.weekEndsAt?.toISOString(), '2026-07-20T06:59:59.999Z');
});

test('season timing returns the final configured week after season end', () => {
  const timing = getSeasonTiming(buildSeason(), new Date('2026-08-20T12:00:00.000Z'));
  assert.equal(timing.status, 'ended');
  assert.equal(timing.weekNumber, 12);
  assert.equal(timing.weekId, 'summer-fieldtrip_w12');
});

test('season timing can derive week boundaries when explicit week rows are absent', () => {
  const season = { ...buildSeason(), weeks: [] } as unknown as Season;
  const timing = getSeasonTiming(season, new Date('2026-07-15T19:00:00.000Z'));
  assert.equal(timing.status, 'active');
  assert.equal(timing.weekNumber, 8);
});

test('season countdown uses the configured season end date', () => {
  const season = buildSeason();
  const countdown = getSeasonCountdown(season, new Date('2026-08-15T06:59:59.999Z'));
  assert.equal(countdown.status, 'active');
  assert.equal(countdown.endsAt?.toISOString(), '2026-08-17T06:59:59.999Z');
  assert.equal(countdown.hoursRemaining, 48);
  assert.match(countdown.label, /ends in 2d 0h/);
});

test('weekly Catalyst fallback follows the requested week instead of reverting to Week 1', () => {
  const weekOne = getDefaultWeeklyCatalystForWeek('summer-fieldtrip', 1);
  const weekEight = getDefaultWeeklyCatalystForWeek('summer-fieldtrip', 8);
  assert.ok(weekOne);
  assert.ok(weekEight);
  assert.equal(weekEight.weekNumber, 8);
  assert.equal(weekEight.id, 'summer-fieldtrip_8');
  assert.notEqual(weekEight.id, weekOne.id);
  assert.equal(weekEight.fallbackTemplateWeekNumber, 3);
});

test('weekly ballot lookup combines the season week with the current canonical cycle', () => {
  const lookup = getWeeklyBallotLookup('summer-fieldtrip', 8, new Date('2026-07-15T19:00:00.000Z'));
  assert.equal(lookup.seasonWeekNumber, 8);
  assert.equal(lookup.cycleId, '2026-W29');
  assert.equal(lookup.canonicalBallotId, '2026-W29_community_weekly');
  assert.equal(
    lookup.canonicalEntriesPath,
    'votingCycles/2026-W29/ballots/2026-W29_community_weekly/entries'
  );
  assert.equal(lookup.legacyBallotId, 'summer-fieldtrip_8');
});

test('missing ballots and nominees produce explicit empty-state copy', () => {
  const missingBallot = getWeeklyBallotEmptyReason({
    cycleStatus: 'voting_open',
    ballotExists: false,
    nomineeCount: 0,
  });
  assert.equal(missingBallot, 'ballot_not_generated');
  assert.match(getWeeklyBallotEmptyCopy(missingBallot).title, /not been generated/i);

  const missingNominees = getWeeklyBallotEmptyReason({
    cycleStatus: 'voting_open',
    ballotExists: true,
    nomineeCount: 0,
  });
  assert.equal(missingNominees, 'no_approved_nominees');
  assert.match(getWeeklyBallotEmptyCopy(missingNominees).title, /no approved nominees/i);
});

test('legacy category labels remain eligible without creating another category schema', () => {
  assert.deepEqual(
    normalizeWeeklyCandidateCategories(['Aesthetic Composition', 'Scientific Evidence']),
    [
      'best_field_note',
      'best_photo_proof',
      'most_legendary_errand',
      'goblin_energy_award',
      'cleanest_completion',
      'underdog_award',
    ]
  );
});

test('approved community proofs do not require a legacy visibility field to enter the ballot', () => {
  assert.equal(isWeeklyProofEligible({
    id: 'proof-1',
    userId: 'user-1',
    seasonId: 'summer-fieldtrip',
    status: 'approved',
    approvedAt: '2026-07-15T18:00:00.000Z',
    storagePath: 'proofs/proof-1.jpg',
  }, {
    seasonId: 'summer-fieldtrip',
    scope: 'community_weekly',
    submissionStartsAt: new Date('2026-07-13T07:00:00.000Z'),
    submissionEndsAt: new Date('2026-07-18T06:59:59.999Z'),
    ballotLocksAt: new Date('2026-07-18T07:00:00.000Z'),
  }), true);
});
