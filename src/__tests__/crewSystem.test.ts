import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CREW_SWITCH_COOLDOWN_DAYS,
  CREW_ZINE_PAGE_BLUEPRINT,
  addDays,
  hasCrewOnboardingAccess,
  isCrewArchiveEligible,
  normalizeCrewSlug,
} from '../logic/crewSystem';

const joinedAt = { seconds: 1_800_000_000 };
const afterJoin = { seconds: 1_800_000_100 };
const beforeJoin = { seconds: 1_799_999_900 };

test('users can access Crew onboarding before Starter completion after legal/profile/classification gates', () => {
  assert.equal(
    hasCrewOnboardingAccess({
      id: 'user-1',
      accessStatus: 'approved',
      fieldClassificationComplete: true,
    }, true),
    true
  );
});

test('Crew onboarding is blocked without current legal consent or field classification', () => {
  assert.equal(
    hasCrewOnboardingAccess({ id: 'user-1', accessStatus: 'approved', fieldClassificationComplete: true }, false),
    false
  );
  assert.equal(
    hasCrewOnboardingAccess({ id: 'user-1', accessStatus: 'approved' }, true),
    false
  );
});

test('Starter receipts never enter the Crew archive', () => {
  assert.equal(
    isCrewArchiveEligible({
      entry: {
        userId: 'user-1',
        crewId: 'crew-1',
        seasonId: 'heatwave-receipts',
        deckId: 'starter-signals',
        missionId: 'starter-1',
        status: 'approved',
        submittedAt: afterJoin,
      },
      member: { status: 'active', crewEligibleFrom: joinedAt },
      activeSeasonId: 'heatwave-receipts',
      starterComplete: true,
    }),
    false
  );
});

test('approved seasonal receipts submitted after joining are Crew archive eligible', () => {
  assert.equal(
    isCrewArchiveEligible({
      entry: {
        userId: 'user-1',
        crewId: 'crew-1',
        seasonId: 'heatwave-receipts',
        deckId: 'heatwave-receipts',
        missionId: 'heatwave-1',
        status: 'approved',
        submittedAt: afterJoin,
      },
      member: { status: 'active', crewEligibleFrom: joinedAt },
      activeSeasonId: 'heatwave-receipts',
      starterComplete: true,
    }),
    true
  );
});

test('Crew archive rejects pre-membership, pending, rejected, and pre-Starter-complete receipts', () => {
  const baseEntry = {
    userId: 'user-1',
    crewId: 'crew-1',
    seasonId: 'heatwave-receipts',
    deckId: 'heatwave-receipts',
    missionId: 'heatwave-1',
    status: 'approved',
    submittedAt: afterJoin,
  };
  const member = { status: 'active', crewEligibleFrom: joinedAt };

  assert.equal(isCrewArchiveEligible({ entry: { ...baseEntry, submittedAt: beforeJoin }, member, activeSeasonId: 'heatwave-receipts', starterComplete: true }), false);
  assert.equal(isCrewArchiveEligible({ entry: { ...baseEntry, status: 'pending_review' }, member, activeSeasonId: 'heatwave-receipts', starterComplete: true }), false);
  assert.equal(isCrewArchiveEligible({ entry: { ...baseEntry, status: 'rejected' }, member, activeSeasonId: 'heatwave-receipts', starterComplete: true }), false);
  assert.equal(isCrewArchiveEligible({ entry: baseEntry, member, activeSeasonId: 'heatwave-receipts', starterComplete: false }), false);
});

test('Crew switch cooldown is seven days and zine blueprint keeps the 16-page shell', () => {
  const start = new Date('2026-06-29T12:00:00.000Z');
  assert.equal(addDays(start, CREW_SWITCH_COOLDOWN_DAYS).toISOString(), '2026-07-06T12:00:00.000Z');
  assert.equal(CREW_ZINE_PAGE_BLUEPRINT.length, 16);
});

test('Crew slugs are normalized for stable server-created IDs', () => {
  assert.equal(normalizeCrewSlug(' The Parking Lot Legends!! '), 'the-parking-lot-legends');
});
