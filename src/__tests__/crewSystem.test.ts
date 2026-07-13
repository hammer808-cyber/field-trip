import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CREW_SWITCH_COOLDOWN_DAYS,
  CREW_ZINE_PAGE_BLUEPRINT,
  addDays,
  buildCrewMemoryState,
  buildPersonalMemoryState,
  canApproveJoinRequest,
  canInviteToCrew,
  canPromoteCrewMember,
  canRemoveCrewCaptainRole,
  canRemoveCrewMember,
  getCrewMemoryExclusionReasons,
  getCrewJoinBlockReason,
  hasCrewOnboardingAccess,
  isCrewArchiveEligible,
  normalizeInviteStatus,
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

test('approved personal-only proof becomes a Personal Memory but not a Crew Memory', () => {
  const personal = buildPersonalMemoryState({
    userId: 'user-1',
    seasonId: 'heatwave-receipts',
    status: 'approved',
    submittedAt: afterJoin,
  });
  const crewReasons = getCrewMemoryExclusionReasons({
    entry: {
      userId: 'user-1',
      seasonId: 'heatwave-receipts',
      status: 'approved',
      submittedAt: afterJoin,
    },
    member: null,
    activeSeasonId: 'heatwave-receipts',
    starterComplete: true,
  });

  assert.equal(personal.isEligible, true);
  assert.equal(personal.archiveStatus, 'candidate');
  assert.ok(crewReasons.includes('missing_crew_context'));
  assert.ok(crewReasons.includes('missing_membership_snapshot'));
});

test('approved crew proof records archive and zine candidate state separately', () => {
  const crewMemory = buildCrewMemoryState({
    userId: 'user-1',
    crewId: 'crew-1',
    seasonId: 'heatwave-receipts',
    status: 'approved',
    submittedAt: afterJoin,
    weeklyAwardIds: ['best_photo_proof'],
  });

  assert.equal(crewMemory.isEligible, true);
  assert.equal(crewMemory.archiveStatus, 'featured');
  assert.equal(crewMemory.zineSelectionStatus, 'candidate');
  assert.equal(crewMemory.featuredBy, 'weekly_vote');
  assert.deepEqual(
    crewMemory.eligibilityReasons.filter(reason => reason === 'approved_crew_submission' || reason === 'weekly_vote_winner'),
    ['approved_crew_submission', 'weekly_vote_winner']
  );
});

test('user who leaves a crew after submitting keeps historical Crew archive eligibility', () => {
  assert.equal(
    isCrewArchiveEligible({
      entry: {
        userId: 'user-1',
        crewContext: {
          crewId: 'crew-1',
          crewNameSnapshot: 'Parking Lot Legends',
          crewMembershipId: 'crew-1_user-1',
          submittedAsCrewMember: true,
          crewSeasonId: 'heatwave-receipts',
          submittedAt: afterJoin,
        },
        seasonId: 'heatwave-receipts',
        deckId: 'heatwave-receipts',
        missionId: 'heatwave-1',
        status: 'approved',
        submittedAt: afterJoin,
      },
      member: { status: 'left', crewEligibleFrom: joinedAt },
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

test('Crew role permissions follow Founder, Captain, and Member rules', () => {
  const crew = { id: 'crew-1', status: 'active' as const, allowMemberInvites: false };
  const founder = { userId: 'founder', role: 'founder' as const, status: 'active' as const };
  const captain = { userId: 'captain', role: 'captain' as const, status: 'active' as const };
  const member = { userId: 'member', role: 'member' as const, status: 'active' as const };

  assert.equal(canInviteToCrew(founder, crew), true);
  assert.equal(canInviteToCrew(captain, crew), true);
  assert.equal(canInviteToCrew(member, crew), false);
  assert.equal(canInviteToCrew(member, { ...crew, allowMemberInvites: true }), true);
  assert.equal(canApproveJoinRequest(captain), true);

  assert.equal(canPromoteCrewMember(founder, member), true);
  assert.equal(canPromoteCrewMember(captain, member), false);
  assert.equal(canRemoveCrewCaptainRole(founder, captain), true);
  assert.equal(canRemoveCrewCaptainRole(captain, captain), false);
  assert.equal(canRemoveCrewMember(captain, founder), false);
  assert.equal(canRemoveCrewMember(captain, member), true);
  assert.equal(canRemoveCrewMember(captain, captain), false);
  assert.equal(canRemoveCrewMember(founder, captain), true);
  assert.equal(canRemoveCrewMember(member, captain), false);
});

test('Crew join eligibility blocks duplicate crews, capacity, cooldown, and archived crews', () => {
  const crew = { id: 'crew-1', status: 'active' as const, memberCount: 2, memberLimit: 8 };
  assert.equal(getCrewJoinBlockReason({ profile: { activeCrewId: 'crew-2' }, crew }), 'ALREADY_IN_ANOTHER_CREW');
  assert.equal(getCrewJoinBlockReason({ profile: { activeCrewId: 'crew-1' }, crew }), 'ALREADY_IN_THIS_CREW');
  assert.equal(getCrewJoinBlockReason({ profile: { crewCooldownUntil: { seconds: 2_000_000_000 } }, crew, now: new Date('2026-06-30T00:00:00Z') }), 'CREW_SWITCH_COOLDOWN_ACTIVE');
  assert.equal(getCrewJoinBlockReason({ profile: {}, crew: { ...crew, memberCount: 8, memberLimit: 8 } }), 'CREW_AT_CAPACITY');
  assert.equal(getCrewJoinBlockReason({ profile: {}, crew: { ...crew, status: 'archived' } }), 'CREW_NOT_ACTIVE');
  assert.equal(getCrewJoinBlockReason({ profile: {}, crew }), null);
});

test('invite status normalizes expired links without allowing legacy values for new writes', () => {
  assert.equal(normalizeInviteStatus('pending', { seconds: 1 }, new Date('2026-06-30T00:00:00Z')), 'expired');
  assert.equal(normalizeInviteStatus('revoked', { seconds: 4_000_000_000 }), 'revoked');
  assert.equal(normalizeInviteStatus('accepted', { seconds: 4_000_000_000 }), 'accepted');
});
