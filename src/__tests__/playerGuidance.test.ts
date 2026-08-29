import assert from 'node:assert/strict';
import test from 'node:test';
import { Timestamp } from 'firebase/firestore';
import type { TripCard } from '../types/challenges';
import type { DrawnMissionCard, Entry } from '../types/game';
import type { UserProfile } from '../services/userService';
import { buildCanonicalProgress } from '../services/canonicalProgress';
import {
  GUIDANCE_PRIORITY,
  isUnseenStarterUnlock,
  resolveMissionsGuidancePrimaryAction,
  resolvePlayerGuidance,
  resolvePlayerMissionLifecycle,
  type ResolvePlayerGuidanceInput,
} from '../logic/playerGuidance';

const NOW = new Date('2026-08-29T18:00:00.000Z');

function entry(overrides: Partial<Entry> = {}): Entry {
  const id = overrides.id || overrides.entryId || 'entry-1';
  return {
    id,
    entryId: id,
    uid: 'guide-user',
    userId: 'guide-user',
    displayName: 'Field Player',
    username: 'field-player',
    challengeId: 'heatwave-18',
    deckId: 'heatwave-receipts',
    status: 'pending_review',
    imageUrl: '/proof.jpg',
    storagePath: null,
    fieldNote: 'A real field note.',
    xpValue: 100,
    xpAwarded: false,
    createdAt: Timestamp.fromDate(NOW),
    updatedAt: Timestamp.fromDate(NOW),
    ...overrides,
  };
}

function trip(overrides: Partial<TripCard> = {}): TripCard {
  return {
    id: 'heatwave-18',
    title: 'Emotional Support Beverage',
    category: 'Evidence Challenge',
    lane: 'seasonal',
    description: 'Capture the drink helping someone continue.',
    difficulty: 'easy',
    estimatedTimeMinutes: 5,
    baseXP: 100,
    personaAffinity: [],
    repeatable: false,
    zineEligible: true,
    snitchEligible: false,
    active: true,
    proofType: ['photo'],
    boostTags: [],
    slowDownTags: [],
    tags: [],
    type: 'Evidence Challenge',
    theAsk: 'Capture the drink.',
    basePoints: 100,
    levels: {
      Standard: { points: 100, description: 'Identify beverage.' },
      Advanced: { points: 125, description: 'Define role.' },
      Certified: { points: 150, description: 'Trevor stamp of approval.' },
    },
    image: '/assets/decks/heatwave-receipts.jpg',
    requiredProof: ['photo'],
    status: 'approved',
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    mode: 'solo',
    safetyRules: [],
    deckId: 'heatwave-receipts',
    deckName: 'Heatwave Receipts',
    ...overrides,
  };
}

function profile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'guide-user',
    name: 'Field Player',
    email: 'field@example.com',
    fieldType: null,
    fieldTypeName: null,
    fieldClassificationComplete: true,
    onboardingCompleted: true,
    crewModeUnlocked: true,
    crewModeSeen: true,
    xp: 0,
    soloTripsCount: 0,
    completedCoreChallenges: 0,
    boldTripsCount: 0,
    crewTripsCount: 0,
    rerollsAvailable: 0,
    activeTrip: null,
    lastSnitchDate: null,
    ...overrides,
  };
}

function starterApprovals(): Entry[] {
  return ['starter-1', 'starter-2', 'starter-3'].map((missionId, index) => entry({
    id: `starter-entry-${index + 1}`,
    entryId: `starter-entry-${index + 1}`,
    challengeId: missionId,
    missionId,
    deckId: 'starter-signals',
    status: 'approved',
    approvedAt: Timestamp.fromDate(new Date(`2026-07-0${index + 1}T12:00:00.000Z`)),
  }));
}

function drawnCard(overrides: Partial<DrawnMissionCard> = {}): DrawnMissionCard {
  return {
    id: 'guide-user_heatwave-18',
    uid: 'guide-user',
    missionId: 'heatwave-18',
    challengeId: 'heatwave-18',
    deckId: 'heatwave-receipts',
    missionTitle: 'Emotional Support Beverage',
    missionSummary: 'Capture the drink helping someone continue.',
    drawnAt: Timestamp.fromDate(NOW),
    status: 'drawn',
    isActive: true,
    ...overrides,
  };
}

function input(overrides: Partial<ResolvePlayerGuidanceInput> & { profile?: UserProfile } = {}): ResolvePlayerGuidanceInput {
  const currentProfile = overrides.profile === undefined ? profile() : overrides.profile;
  const entries = overrides.entries ? [...overrides.entries] : [];
  const trips = overrides.trips ? [...overrides.trips] : [];
  return {
    canonicalProgress: overrides.canonicalProgress || buildCanonicalProgress({
      userId: 'guide-user',
      profile: currentProfile,
      entries,
      trips,
      activeMissionId: overrides.activeTrip?.id || null,
      activeSubmissionStatus: overrides.activeSubmissionStatus || null,
      drawnMissionCards: overrides.drawnMissionCards ? [...overrides.drawnMissionCards] : [],
    }),
    entries,
    activeTrip: overrides.activeTrip || null,
    activeSubmissionStatus: overrides.activeSubmissionStatus,
    drawnMissionCards: overrides.drawnMissionCards || [],
    trips,
    legalComplete: overrides.legalComplete ?? true,
    fieldClassificationComplete: overrides.fieldClassificationComplete ?? true,
    hasSeenFieldTypeResults: overrides.hasSeenFieldTypeResults ?? true,
    hasCompletedFieldKitOnboarding: overrides.hasCompletedFieldKitOnboarding ?? true,
    isHeatwaveDeckUnlocked: overrides.isHeatwaveDeckUnlocked ?? false,
    voteAvailable: overrides.voteAvailable ?? false,
    hasUnseenStarterUnlock: overrides.hasUnseenStarterUnlock ?? false,
  };
}

test('1. onboarding incomplete is the highest-priority guidance', () => {
  const snapshot = resolvePlayerGuidance(input({
    profile: profile({ onboardingCompleted: false, fieldClassificationComplete: false }),
    fieldClassificationComplete: false,
  }));
  assert.equal(snapshot.state, 'COMPLETE_ONBOARDING');
  assert.equal(snapshot.priority, GUIDANCE_PRIORITY.COMPLETE_ONBOARDING);
  assert.equal(snapshot.primaryActionDestination, '/classification');
  assert.equal(snapshot.navigationTarget, null);
});

test('2. Starter with no missions submitted asks the player to draw', () => {
  const snapshot = resolvePlayerGuidance(input({
    profile: profile({ onboardingCompleted: false }),
  }));
  assert.equal(snapshot.state, 'DRAW_STARTER_MISSION');
  assert.equal(snapshot.primaryActionLabel, 'Draw a Mission');
  assert.match(snapshot.primaryActionDestination, /starter-signals/);
  assert.equal(snapshot.navigationTarget, 'missions');
});

test('3. Starter 1/3 pending with next mission available stays on draw-next', () => {
  const snapshot = resolvePlayerGuidance(input({
    profile: profile({ onboardingCompleted: false }),
    entries: [entry({
      id: 'starter-1-entry',
      entryId: 'starter-1-entry',
      challengeId: 'starter-1',
      missionId: 'starter-1',
      deckId: 'starter-signals',
      status: 'pending_review',
    })],
  }));
  assert.equal(snapshot.state, 'DRAW_NEXT_STARTER');
  assert.equal(snapshot.primaryActionLabel, 'Draw Next Mission');
  assert.equal(snapshot.secondaryAction?.label, 'View Proof Status');
  assert.ok(snapshot.priority > GUIDANCE_PRIORITY.WAITING_FOR_STARTER_REVIEW);
});

test('4. Starter 3/3 pending makes proof review primary', () => {
  const snapshot = resolvePlayerGuidance(input({
    profile: profile({ onboardingCompleted: false }),
    entries: ['starter-1', 'starter-2', 'starter-3'].map((missionId, index) => entry({
      id: `pending-${index}`,
      entryId: `pending-${index}`,
      challengeId: missionId,
      missionId,
      deckId: 'starter-signals',
      status: 'pending_review',
    })),
  }));
  assert.equal(snapshot.state, 'WAITING_FOR_STARTER_REVIEW');
  assert.equal(snapshot.primaryActionLabel, 'View Proof Status');
  assert.equal(snapshot.primaryActionDestination, '/profile?tab=logbook');
});

test('5. Starter needs more proof is repair everywhere', () => {
  const snapshot = resolvePlayerGuidance(input({
    profile: profile({ onboardingCompleted: false }),
    entries: [entry({
      id: 'repair-starter',
      entryId: 'repair-starter',
      challengeId: 'starter-1',
      missionId: 'starter-1',
      missionTitle: 'First Signal',
      deckId: 'starter-signals',
      status: 'needs_more_proof',
    })],
  }));
  assert.equal(snapshot.state, 'REPAIR_PROOF');
  assert.equal(snapshot.primaryActionLabel, 'Add More Proof');
  assert.match(snapshot.primaryActionDestination, /mode=addMoreProof/);
  assert.equal(snapshot.autoOpenTrevor, true);
  assert.equal(snapshot.navigationTarget, 'missions');
});

test('6. Starter rejected is retry everywhere', () => {
  const snapshot = resolvePlayerGuidance(input({
    profile: profile({ onboardingCompleted: false }),
    entries: [entry({
      id: 'reject-starter',
      entryId: 'reject-starter',
      challengeId: 'starter-2',
      missionId: 'starter-2',
      missionTitle: 'Second Signal',
      deckId: 'starter-signals',
      status: 'rejected',
    })],
  }));
  assert.equal(snapshot.state, 'RETRY_REJECTED_PROOF');
  assert.equal(snapshot.primaryActionLabel, 'Retry Mission');
  assert.equal(snapshot.autoOpenTrevor, true);
});

test('7. Starter complete with no active mission celebrates unlock', () => {
  const snapshot = resolvePlayerGuidance(input({
    entries: starterApprovals(),
    isHeatwaveDeckUnlocked: true,
    hasUnseenStarterUnlock: true,
  }));
  assert.equal(snapshot.state, 'STARTER_COMPLETE');
  assert.equal(snapshot.primaryActionLabel, 'Draw a Mission');
  assert.match(snapshot.primaryActionDestination, /heatwave-receipts/);
});

test('8. Normal active drawn mission is resume, not cleared', () => {
  const active = trip({ status: 'in-progress' });
  const snapshot = resolvePlayerGuidance(input({
    entries: starterApprovals(),
    activeTrip: active,
    trips: [active],
    isHeatwaveDeckUnlocked: true,
  }));
  assert.equal(snapshot.state, 'RESUME_ACTIVE_MISSION');
  assert.match(snapshot.primaryActionLabel, /Resume Emotional Support Beverage/);
  assert.notEqual(snapshot.title.toLowerCase().includes('cleared'), true);
});

test('9. Normal pending proof + missions still available continues play', () => {
  const snapshot = resolvePlayerGuidance(input({
    entries: [
      ...starterApprovals(),
      entry({ id: 'pending-heat', entryId: 'pending-heat', status: 'pending_review' }),
    ],
    isHeatwaveDeckUnlocked: true,
  }));
  assert.equal(snapshot.state, 'DRAW_MISSION');
  assert.equal(snapshot.primaryActionLabel, 'Draw Another Mission');
  assert.equal(snapshot.secondaryAction?.label, 'View Proof Status');
  assert.equal(snapshot.secondaryAction?.destination, '/profile?tab=logbook');
});

test('10. Approved player entry is completed, not resume', () => {
  const approved = trip({ status: 'approved' });
  const snapshot = resolvePlayerGuidance(input({
    entries: [
      ...starterApprovals(),
      entry({
        id: 'approved-heat',
        entryId: 'approved-heat',
        status: 'approved',
        challengeId: 'heatwave-18',
        missionId: 'heatwave-18',
      }),
    ],
    activeTrip: approved,
    activeSubmissionStatus: 'approved',
    trips: [approved],
    isHeatwaveDeckUnlocked: true,
  }));
  assert.notEqual(snapshot.state, 'RESUME_ACTIVE_MISSION');
  assert.ok(
    snapshot.state === 'DRAW_MISSION'
    || snapshot.state === 'STARTER_COMPLETE'
    || snapshot.state === 'NO_URGENT_ACTION'
    || snapshot.state === 'VOTE_AVAILABLE',
  );
});

test('11. Vote available is primary only when nothing higher is active', () => {
  const snapshot = resolvePlayerGuidance(input({
    entries: starterApprovals(),
    isHeatwaveDeckUnlocked: true,
    voteAvailable: true,
  }));
  assert.equal(snapshot.state, 'VOTE_AVAILABLE');
  assert.equal(snapshot.navigationTarget, 'voting');
  assert.equal(snapshot.primaryActionDestination, '/voting');
});

test('12. locked destination cannot become the attention target', () => {
  const snapshot = resolvePlayerGuidance(input({
    profile: profile({ onboardingCompleted: false }),
    voteAvailable: true,
  }));
  assert.notEqual(snapshot.navigationTarget, 'voting');
  assert.notEqual(snapshot.state, 'VOTE_AVAILABLE');
});

test('13. definition status approved + drawn mission + no entry is resume, not cleared', () => {
  const published = trip({ status: 'approved' });
  const lifecycle = resolvePlayerMissionLifecycle({
    canonicalProgress: buildCanonicalProgress({
      userId: 'guide-user',
      profile: profile(),
      entries: starterApprovals(),
      trips: [published],
      activeMissionId: published.id,
      drawnMissionCards: [drawnCard()],
    }),
    activeTrip: published,
    // Simulates the old AppContext leak: activeTrip.status copied into submission status.
    activeSubmissionStatus: 'approved',
    drawnMissionCards: [drawnCard()],
    trips: [published],
  });
  assert.ok(lifecycle);
  assert.notEqual(lifecycle?.status, 'approved');
  assert.ok(lifecycle?.status === 'drawn' || lifecycle?.status === 'active');

  const snapshot = resolvePlayerGuidance(input({
    entries: starterApprovals(),
    activeTrip: published,
    activeSubmissionStatus: 'approved',
    drawnMissionCards: [drawnCard()],
    trips: [published],
    isHeatwaveDeckUnlocked: true,
  }));
  assert.equal(snapshot.state, 'RESUME_ACTIVE_MISSION');
  assert.match(snapshot.primaryActionLabel, /Resume|Continue|Beverage/i);
  assert.doesNotMatch(snapshot.title, /cleared/i);
  assert.doesNotMatch(snapshot.primaryActionLabel, /cleared/i);
  assert.doesNotMatch(snapshot.mission?.statusLabel || '', /approved|cleared/i);
});

test('14. interruption/resume uses persisted drawn mission state', () => {
  const snapshot = resolvePlayerGuidance(input({
    entries: starterApprovals(),
    drawnMissionCards: [drawnCard({ status: 'drawn', isActive: true })],
    trips: [trip({ status: 'approved' })],
    isHeatwaveDeckUnlocked: true,
  }));
  assert.equal(snapshot.state, 'RESUME_ACTIVE_MISSION');
  assert.equal(snapshot.relevantMissionId, 'heatwave-18');
  assert.match(snapshot.primaryActionDestination, /mission-briefing|capture/);
});

test('priority collision: active mission + vote available resumes the mission', () => {
  const snapshot = resolvePlayerGuidance(input({
    entries: starterApprovals(),
    activeTrip: trip({ status: 'approved' }),
    drawnMissionCards: [drawnCard()],
    trips: [trip({ status: 'approved' })],
    isHeatwaveDeckUnlocked: true,
    voteAvailable: true,
  }));
  assert.equal(snapshot.state, 'RESUME_ACTIVE_MISSION');
  assert.equal(snapshot.navigationTarget, 'missions');
  assert.ok(snapshot.priority > GUIDANCE_PRIORITY.VOTE_AVAILABLE);
});

test('priority collision: repair outranks vote and draw', () => {
  const snapshot = resolvePlayerGuidance(input({
    entries: [
      ...starterApprovals(),
      entry({
        id: 'needs-more',
        entryId: 'needs-more',
        status: 'needs_more_proof',
        missionTitle: 'Emotional Support Beverage',
      }),
    ],
    isHeatwaveDeckUnlocked: true,
    voteAvailable: true,
  }));
  assert.equal(snapshot.state, 'REPAIR_PROOF');
  assert.ok(snapshot.priority > GUIDANCE_PRIORITY.VOTE_AVAILABLE);
  assert.ok(snapshot.priority > GUIDANCE_PRIORITY.DRAW_MISSION);
});

test('priority collision: pending starter with another available outranks vote', () => {
  const snapshot = resolvePlayerGuidance(input({
    profile: profile({ onboardingCompleted: false }),
    entries: [entry({
      id: 'starter-1-entry',
      entryId: 'starter-1-entry',
      challengeId: 'starter-1',
      missionId: 'starter-1',
      deckId: 'starter-signals',
      status: 'pending_review',
    })],
    voteAvailable: true,
  }));
  assert.equal(snapshot.state, 'DRAW_NEXT_STARTER');
  assert.notEqual(snapshot.navigationTarget, 'voting');
});

test('superseded rejected proof does not stay primary after retry pending', () => {
  const snapshot = resolvePlayerGuidance(input({
    profile: profile({ onboardingCompleted: false }),
    entries: [
      entry({
        id: 'old-reject',
        entryId: 'old-reject',
        challengeId: 'starter-1',
        missionId: 'starter-1',
        missionTitle: 'The Initial Signal',
        deckId: 'starter-signals',
        status: 'rejected',
        createdAt: Timestamp.fromDate(new Date('2026-08-29T16:00:00.000Z')),
        updatedAt: Timestamp.fromDate(new Date('2026-08-29T16:00:00.000Z')),
      }),
      entry({
        id: 'retry-pending',
        entryId: 'retry-pending',
        challengeId: 'starter-1',
        missionId: 'starter-1',
        missionTitle: 'The Initial Signal',
        deckId: 'starter-signals',
        status: 'pending_review',
        createdAt: Timestamp.fromDate(new Date('2026-08-29T17:00:00.000Z')),
        updatedAt: Timestamp.fromDate(new Date('2026-08-29T17:00:00.000Z')),
      }),
      entry({
        id: 'starter-2-entry',
        entryId: 'starter-2-entry',
        challengeId: 'starter-2',
        missionId: 'starter-2',
        deckId: 'starter-signals',
        status: 'pending_review',
      }),
      entry({
        id: 'starter-3-entry',
        entryId: 'starter-3-entry',
        challengeId: 'starter-3',
        missionId: 'starter-3',
        deckId: 'starter-signals',
        status: 'pending_review',
      }),
    ],
  }));
  assert.equal(snapshot.state, 'WAITING_FOR_STARTER_REVIEW');
  assert.equal(snapshot.primaryActionLabel, 'View Proof Status');
  assert.notEqual(snapshot.state, 'RETRY_REJECTED_PROOF');
});

function withDeckEligibility(
  base: ResolvePlayerGuidanceInput,
  eligibility: Record<string, number>,
): ResolvePlayerGuidanceInput {
  const deckProgressById = { ...base.canonicalProgress.deckProgressById };
  for (const [deckId, eligibleCount] of Object.entries(eligibility)) {
    const existing = deckProgressById[deckId];
    if (!existing) continue;
    deckProgressById[deckId] = {
      ...existing,
      eligibleCount,
      remainingCount: eligibleCount,
    };
  }
  return {
    ...base,
    canonicalProgress: {
      ...base.canonicalProgress,
      deckProgressById,
    },
  };
}

test('fix1: rejected → retry pending supersedes rejection', () => {
  const snapshot = resolvePlayerGuidance(input({
    entries: [
      ...starterApprovals().filter(e => e.missionId !== 'starter-1'),
      entry({
        id: 'reject-1',
        entryId: 'reject-1',
        challengeId: 'heatwave-18',
        missionId: 'heatwave-18',
        status: 'retried' as any,
        createdAt: Timestamp.fromDate(new Date('2026-08-29T16:00:00.000Z')),
        updatedAt: Timestamp.fromDate(new Date('2026-08-29T16:30:00.000Z')),
      }),
      entry({
        id: 'pending-retry',
        entryId: 'pending-retry',
        challengeId: 'heatwave-18',
        missionId: 'heatwave-18',
        status: 'pending_review',
        createdAt: Timestamp.fromDate(new Date('2026-08-29T17:00:00.000Z')),
        updatedAt: Timestamp.fromDate(new Date('2026-08-29T17:00:00.000Z')),
      }),
      entry({
        id: 'starter-1-ok',
        entryId: 'starter-1-ok',
        challengeId: 'starter-1',
        missionId: 'starter-1',
        deckId: 'starter-signals',
        status: 'approved',
      }),
    ],
    isHeatwaveDeckUnlocked: true,
  }));
  assert.notEqual(snapshot.state, 'RETRY_REJECTED_PROOF');
  assert.ok(snapshot.state === 'DRAW_MISSION' || snapshot.state === 'VOTE_AVAILABLE' || snapshot.state === 'NO_URGENT_ACTION' || snapshot.state === 'STARTER_COMPLETE');
});

test('fix1: rejected → retry rejected again keeps newest rejection actionable', () => {
  const snapshot = resolvePlayerGuidance(input({
    entries: [
      ...starterApprovals(),
      entry({
        id: 'old-reject',
        entryId: 'old-reject',
        challengeId: 'heatwave-18',
        missionId: 'heatwave-18',
        missionTitle: 'Emotional Support Beverage',
        status: 'retried' as any,
        createdAt: Timestamp.fromDate(new Date('2026-08-29T15:00:00.000Z')),
        updatedAt: Timestamp.fromDate(new Date('2026-08-29T16:00:00.000Z')),
      }),
      entry({
        id: 'new-reject',
        entryId: 'new-reject',
        challengeId: 'heatwave-18',
        missionId: 'heatwave-18',
        missionTitle: 'Emotional Support Beverage',
        status: 'rejected',
        createdAt: Timestamp.fromDate(new Date('2026-08-29T17:00:00.000Z')),
        updatedAt: Timestamp.fromDate(new Date('2026-08-29T18:00:00.000Z')),
      }),
    ],
    isHeatwaveDeckUnlocked: true,
  }));
  assert.equal(snapshot.state, 'RETRY_REJECTED_PROOF');
  assert.equal(snapshot.primaryActionLabel, 'Retry Mission');
  assert.match(snapshot.primaryActionDestination, /originalEntryId=new-reject/);
});

test('fix1: needs-more → repair pending supersedes needs-more', () => {
  const snapshot = resolvePlayerGuidance(input({
    entries: [
      ...starterApprovals(),
      entry({
        id: 'needs-old',
        entryId: 'needs-old',
        challengeId: 'heatwave-18',
        missionId: 'heatwave-18',
        status: 'retried' as any,
        createdAt: Timestamp.fromDate(new Date('2026-08-29T15:00:00.000Z')),
        updatedAt: Timestamp.fromDate(new Date('2026-08-29T16:00:00.000Z')),
      }),
      entry({
        id: 'repair-pending',
        entryId: 'repair-pending',
        challengeId: 'heatwave-18',
        missionId: 'heatwave-18',
        status: 'pending_review',
        createdAt: Timestamp.fromDate(new Date('2026-08-29T17:00:00.000Z')),
      }),
    ],
    isHeatwaveDeckUnlocked: true,
  }));
  assert.notEqual(snapshot.state, 'REPAIR_PROOF');
});

test('fix1: needs-more → repair needs-more again keeps newest repair actionable', () => {
  const snapshot = resolvePlayerGuidance(input({
    entries: [
      ...starterApprovals(),
      entry({
        id: 'needs-old',
        entryId: 'needs-old',
        challengeId: 'heatwave-18',
        missionId: 'heatwave-18',
        missionTitle: 'Emotional Support Beverage',
        status: 'retried' as any,
        createdAt: Timestamp.fromDate(new Date('2026-08-29T15:00:00.000Z')),
        updatedAt: Timestamp.fromDate(new Date('2026-08-29T16:00:00.000Z')),
      }),
      entry({
        id: 'needs-new',
        entryId: 'needs-new',
        challengeId: 'heatwave-18',
        missionId: 'heatwave-18',
        missionTitle: 'Emotional Support Beverage',
        status: 'needs_more_proof',
        createdAt: Timestamp.fromDate(new Date('2026-08-29T17:00:00.000Z')),
        updatedAt: Timestamp.fromDate(new Date('2026-08-29T18:00:00.000Z')),
      }),
    ],
    isHeatwaveDeckUnlocked: true,
  }));
  assert.equal(snapshot.state, 'REPAIR_PROOF');
  assert.match(snapshot.primaryActionDestination, /entryId=needs-new/);
});

test('fix1: older retried marker + newer rejected keeps Retry primary', () => {
  const snapshot = resolvePlayerGuidance(input({
    entries: [
      ...starterApprovals(),
      entry({
        id: 'marker',
        entryId: 'marker',
        challengeId: 'heatwave-08',
        missionId: 'heatwave-08',
        status: 'retried' as any,
        updatedAt: Timestamp.fromDate(new Date('2026-08-29T19:00:00.000Z')),
      }),
      entry({
        id: 'latest-reject',
        entryId: 'latest-reject',
        challengeId: 'heatwave-08',
        missionId: 'heatwave-08',
        missionTitle: 'Main Character Checkpoint',
        status: 'rejected',
        createdAt: Timestamp.fromDate(new Date('2026-08-29T18:00:00.000Z')),
        updatedAt: Timestamp.fromDate(new Date('2026-08-29T18:30:00.000Z')),
      }),
    ],
    isHeatwaveDeckUnlocked: true,
  }));
  // Newest meaningful attempt is rejected even if the retried marker has a later updatedAt.
  assert.equal(snapshot.state, 'RETRY_REJECTED_PROOF');
});

test('fix2: unseen starter unlock → STARTER_COMPLETE; acknowledged → not STARTER_COMPLETE', () => {
  assert.equal(isUnseenStarterUnlock({
    starterComplete: true,
    starterApprovedCount: 3,
    starterRequiredCount: 3,
    lastSeenApprovedCount: 0,
  }), true);
  assert.equal(isUnseenStarterUnlock({
    starterComplete: true,
    starterApprovedCount: 3,
    starterRequiredCount: 3,
    lastSeenApprovedCount: 3,
  }), false);

  const unseen = resolvePlayerGuidance(input({
    entries: starterApprovals(),
    isHeatwaveDeckUnlocked: true,
    hasUnseenStarterUnlock: true,
  }));
  assert.equal(unseen.state, 'STARTER_COMPLETE');
  assert.equal(unseen.autoOpenTrevor, true);

  const seen = resolvePlayerGuidance(input({
    entries: starterApprovals(),
    isHeatwaveDeckUnlocked: true,
    hasUnseenStarterUnlock: false,
    voteAvailable: true,
  }));
  assert.notEqual(seen.state, 'STARTER_COMPLETE');
  assert.equal(seen.autoOpenTrevor, false);
});

test('fix2: after acknowledgement, active mission resumes and vote can win when idle', () => {
  const resume = resolvePlayerGuidance(input({
    entries: starterApprovals(),
    activeTrip: trip({ status: 'approved' }),
    drawnMissionCards: [drawnCard()],
    trips: [trip({ status: 'approved' })],
    isHeatwaveDeckUnlocked: true,
    hasUnseenStarterUnlock: false,
    voteAvailable: true,
  }));
  assert.equal(resume.state, 'RESUME_ACTIVE_MISSION');

  const vote = resolvePlayerGuidance(withDeckEligibility(input({
    entries: starterApprovals(),
    isHeatwaveDeckUnlocked: true,
    hasUnseenStarterUnlock: false,
    voteAvailable: true,
  }), { 'heatwave-receipts': 0, 'starter-signals': 0 }));
  assert.equal(vote.state, 'VOTE_AVAILABLE');
});

test('fix3: STARTER_COMPLETE primary action draws the post-Starter pack, not starter-signals', () => {
  const snapshot = resolvePlayerGuidance(input({
    entries: starterApprovals(),
    isHeatwaveDeckUnlocked: true,
    hasUnseenStarterUnlock: true,
  }));
  const action = resolveMissionsGuidancePrimaryAction(snapshot);
  assert.equal(action.kind, 'draw-pack');
  if (action.kind === 'draw-pack') {
    assert.equal(action.packId, 'heatwave-receipts');
    assert.match(action.destination, /pack=heatwave-receipts/);
    assert.notEqual(action.packId, 'starter-signals');
  }
});

test('fix3 interaction: after unlock ack, DRAW_MISSION still targets a playable pack', () => {
  const snapshot = resolvePlayerGuidance(input({
    entries: starterApprovals(),
    isHeatwaveDeckUnlocked: true,
    hasUnseenStarterUnlock: false,
  }));
  assert.equal(snapshot.state, 'DRAW_MISSION');
  const action = resolveMissionsGuidancePrimaryAction(snapshot);
  assert.equal(action.kind, 'draw-pack');
  if (action.kind === 'draw-pack') {
    assert.equal(action.packId, 'heatwave-receipts');
    assert.notEqual(action.packId, 'starter-signals');
  }
});

test('fix4: Heatwave unlocked + eligibleCount > 0 → Draw Mission', () => {
  const snapshot = resolvePlayerGuidance(withDeckEligibility(input({
    entries: starterApprovals(),
    isHeatwaveDeckUnlocked: true,
    hasUnseenStarterUnlock: false,
  }), { 'heatwave-receipts': 5 }));
  assert.equal(snapshot.state, 'DRAW_MISSION');
});

test('fix4: Heatwave unlocked + all eligibleCount === 0 → NOT Draw Mission', () => {
  const base = input({
    entries: starterApprovals(),
    isHeatwaveDeckUnlocked: true,
    hasUnseenStarterUnlock: false,
  });
  const zeroed = Object.fromEntries(
    Object.keys(base.canonicalProgress.deckProgressById).map(id => [id, 0]),
  );
  const snapshot = resolvePlayerGuidance(withDeckEligibility(base, zeroed));
  assert.notEqual(snapshot.state, 'DRAW_MISSION');
  assert.equal(snapshot.state, 'NO_URGENT_ACTION');
});

test('fix4: one deck exhausted + another eligible → Draw Mission', () => {
  const base = input({
    entries: starterApprovals(),
    isHeatwaveDeckUnlocked: true,
    hasUnseenStarterUnlock: false,
  });
  const zeroed = Object.fromEntries(
    Object.keys(base.canonicalProgress.deckProgressById).map(id => [id, 0]),
  );
  const synthetic = withDeckEligibility(base, zeroed);
  synthetic.canonicalProgress.deckProgressById['extra-deck'] = {
    deckId: 'extra-deck',
    deckName: 'Extra',
    totalCards: 3,
    approvedCount: 0,
    pendingCount: 0,
    needsMoreProofCount: 0,
    rejectedCount: 0,
    remainingCount: 3,
    eligibleCount: 3,
    exhausted: false,
    label: '0/3',
    percent: 0,
  };
  const snapshot = resolvePlayerGuidance(synthetic);
  assert.equal(snapshot.state, 'DRAW_MISSION');
  assert.match(snapshot.primaryActionDestination, /pack=extra-deck/);
});

test('fix4: all decks exhausted + vote available → Vote primary', () => {
  const base = input({
    entries: starterApprovals(),
    isHeatwaveDeckUnlocked: true,
    hasUnseenStarterUnlock: false,
    voteAvailable: true,
  });
  const zeroed = Object.fromEntries(
    Object.keys(base.canonicalProgress.deckProgressById).map(id => [id, 0]),
  );
  const snapshot = resolvePlayerGuidance(withDeckEligibility(base, zeroed));
  assert.equal(snapshot.state, 'VOTE_AVAILABLE');
});

test('fix4: all decks exhausted + nothing urgent → No Urgent Action', () => {
  const base = input({
    entries: starterApprovals(),
    isHeatwaveDeckUnlocked: true,
    hasUnseenStarterUnlock: false,
    voteAvailable: false,
  });
  const zeroed = Object.fromEntries(
    Object.keys(base.canonicalProgress.deckProgressById).map(id => [id, 0]),
  );
  const snapshot = resolvePlayerGuidance(withDeckEligibility(base, zeroed));
  assert.equal(snapshot.state, 'NO_URGENT_ACTION');
});

test('fix4 interaction: profile completed IDs cover paginated entry gaps', async () => {
  // Client entry pages are small; exhaust approvals may live only on the profile cache.
  const { DECK_PACKS } = await import('../data/deckPacks');
  const completedChallengeIds = DECK_PACKS.flatMap((pack) => {
    const id = pack.packId || pack.id;
    if (!id) return [];
    return (pack.missionIds || []).filter(Boolean);
  });

  const snapshot = resolvePlayerGuidance(input({
    profile: profile({
      completedChallengeIds,
      approvedCompletedChallengeIds: completedChallengeIds,
    } as any),
    entries: starterApprovals(), // sparse page — not the full approval history
    isHeatwaveDeckUnlocked: true,
    hasUnseenStarterUnlock: false,
    voteAvailable: false,
  }));
  assert.notEqual(snapshot.state, 'DRAW_MISSION');
  assert.equal(snapshot.state, 'NO_URGENT_ACTION');
});
