import assert from 'node:assert/strict';
import test from 'node:test';
import { Timestamp } from 'firebase/firestore';
import type { TripCard } from '../types/challenges';
import type { DrawnMissionCard, Entry } from '../types/game';
import type { UserProfile } from '../services/userService';
import { buildCanonicalProgress } from '../services/canonicalProgress';
import {
  GUIDANCE_PRIORITY,
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
      drawnMissionCards: overrides.drawnMissionCards || [],
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
    activeSubmissionStatus: null,
    drawnMissionCards: [drawnCard()],
    trips: [published],
  });
  assert.ok(lifecycle);
  assert.notEqual(lifecycle?.status, 'approved');
  assert.ok(lifecycle?.status === 'drawn' || lifecycle?.status === 'active');

  const snapshot = resolvePlayerGuidance(input({
    entries: starterApprovals(),
    activeTrip: published,
    drawnMissionCards: [drawnCard()],
    trips: [published],
    isHeatwaveDeckUnlocked: true,
  }));
  assert.equal(snapshot.state, 'RESUME_ACTIVE_MISSION');
  assert.match(snapshot.primaryActionLabel, /Resume|Continue|Beverage/i);
  assert.doesNotMatch(snapshot.title, /cleared/i);
  assert.doesNotMatch(snapshot.primaryActionLabel, /cleared/i);
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
