import assert from 'node:assert/strict';
import test from 'node:test';
import { Timestamp } from 'firebase/firestore';
import type { TripCard } from '../types/challenges';
import type { Entry, Vote } from '../types/game';
import type { Observation } from '../types/observations';
import type { UserProfile } from '../services/userService';
import { buildCanonicalProgress } from '../services/canonicalProgress';
import {
  buildBasecampViewModel,
  type BuildBasecampViewModelInput,
} from '../logic/basecampViewModel';

const NOW = new Date('2026-07-16T18:00:00.000Z');

function entry(overrides: Partial<Entry> = {}): Entry {
  const id = overrides.id || overrides.entryId || 'entry-1';
  return {
    id,
    entryId: id,
    uid: 'basecamp-user',
    userId: 'basecamp-user',
    displayName: 'Field Player',
    username: 'field-player',
    challengeId: 'heat-1',
    deckId: 'heatwave-receipts',
    status: 'pending_review',
    imageUrl: '/proof.jpg',
    storagePath: null,
    fieldNote: 'A real field note.',
    xpValue: 100,
    xpAwarded: false,
    createdAt: Timestamp.fromDate(new Date('2026-07-16T15:00:00.000Z')),
    updatedAt: Timestamp.fromDate(new Date('2026-07-16T15:00:00.000Z')),
    ...overrides,
  };
}

function trip(overrides: Partial<TripCard> = {}): TripCard {
  return {
    id: 'heat-1',
    title: 'Find the Coolest Shadow',
    category: 'Field Challenge',
    lane: 'seasonal',
    description: 'Find and photograph a useful patch of shade.',
    difficulty: 'easy',
    estimatedTimeMinutes: 15,
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
    type: 'Field Challenge',
    theAsk: 'Find shade.',
    basePoints: 100,
    levels: {
      Standard: { points: 100, description: 'Clear proof.' },
      Advanced: { points: 150, description: 'Strong proof.' },
      Certified: { points: 200, description: 'Excellent proof.' },
    },
    image: '/assets/decks/heatwave-receipts.jpg',
    requiredProof: ['photo'],
    status: 'active',
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
    id: 'basecamp-user',
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

function input(overrides: Partial<BuildBasecampViewModelInput> = {}): BuildBasecampViewModelInput {
  const entries = overrides.entries ? [...overrides.entries] : [];
  const currentProfile = overrides.profile === undefined ? profile() : overrides.profile;
  const trips = overrides.trips ? [...overrides.trips] : [];
  return {
    canonicalProgress: overrides.canonicalProgress || buildCanonicalProgress({
      userId: 'basecamp-user',
      profile: currentProfile,
      entries,
      trips,
      activeMissionId: overrides.activeTrip?.id || null,
    }),
    entries,
    activeTrip: overrides.activeTrip || null,
    activeSubmissionStatus: overrides.activeSubmissionStatus || null,
    drawnMissionCards: overrides.drawnMissionCards || [],
    trips,
    profile: currentProfile,
    badgeProgress: overrides.badgeProgress || [],
    observations: overrides.observations || [],
    userVotes: overrides.userVotes || [],
    currentDate: overrides.currentDate || NOW,
    isHeatwaveDeckUnlocked: overrides.isHeatwaveDeckUnlocked ?? false,
    isVotingOpen: overrides.isVotingOpen ?? false,
  };
}

test('a new player receives the canonical Starter Signals next action', () => {
  const model = buildBasecampViewModel(input({ profile: profile({ onboardingCompleted: false }) }));
  assert.equal(model.nextAction.title, 'Finish Starter Signals');
  assert.equal(model.nextAction.action.href, '/missions?pack=starter-signals');
  assert.equal(model.progress.starterApprovedCount, 0);
  assert.equal(model.recentActivity.length, 0);
});

test('an active mission is surfaced with a direct continuation action', () => {
  const active = trip({ status: 'in-progress' });
  const model = buildBasecampViewModel(input({
    entries: starterApprovals(),
    activeTrip: active,
    activeSubmissionStatus: null,
    trips: [active],
    isHeatwaveDeckUnlocked: true,
  }));
  assert.equal(model.nextAction.mission?.id, 'heat-1');
  assert.equal(model.nextAction.mission?.status, 'active');
  assert.equal(model.nextAction.action.label, 'Continue Mission');
  assert.equal(model.nextAction.action.href, '/capture?id=heat-1');
});

test('a drawn mission opens its briefing before capture', () => {
  const drawn = trip({ status: 'available' });
  const model = buildBasecampViewModel(input({
    entries: starterApprovals(),
    drawnMissionCards: [{
      id: 'basecamp-user_heat-1',
      uid: 'basecamp-user',
      missionId: 'heat-1',
      challengeId: 'heat-1',
      deckId: 'heatwave-receipts',
      missionTitle: drawn.title,
      missionSummary: drawn.description,
      drawnAt: Timestamp.fromDate(NOW),
      status: 'drawn',
      isActive: true,
    }],
    trips: [drawn],
    isHeatwaveDeckUnlocked: true,
  }));
  assert.equal(model.nextAction.mission?.status, 'drawn');
  assert.equal(model.nextAction.action.label, 'Open Briefing');
  assert.equal(model.nextAction.action.href, '/mission-briefing?id=heat-1');
});

test('an active mission pending review routes to status without blocking future play copy', () => {
  const pendingMission = trip({ status: 'submitted' });
  const model = buildBasecampViewModel(input({
    entries: starterApprovals(),
    activeTrip: pendingMission,
    activeSubmissionStatus: 'pending_review',
    trips: [pendingMission],
    isHeatwaveDeckUnlocked: true,
  }));
  assert.equal(model.nextAction.mission?.status, 'pending_review');
  assert.equal(model.nextAction.action.href, '/profile?tab=logbook');
  assert.match(model.nextAction.description, /does not stop you from drawing another mission/i);
});

test('a proof needing more evidence becomes the next repair action', () => {
  const records = [
    ...starterApprovals(),
    entry({
      id: 'needs-proof-entry',
      entryId: 'needs-proof-entry',
      challengeId: 'heat-1',
      missionId: 'heat-1',
      missionTitle: 'Find the Coolest Shadow',
      status: 'needs_more_proof',
      reviewerNote: 'Show the full shadow and its surroundings.',
    }),
  ];
  const model = buildBasecampViewModel(input({ entries: records, isHeatwaveDeckUnlocked: true }));
  assert.equal(model.attention.actionableCount, 1);
  assert.equal(model.attention.item?.entryId, 'needs-proof-entry');
  assert.equal(model.nextAction.action.intent, 'retry-proof');
  assert.equal(model.nextAction.action.missionId, 'heat-1');
  assert.equal(model.nextAction.deckId, 'heatwave-receipts');
});

test('a pending proof remains visible but does not block another mission', () => {
  const records = [
    ...starterApprovals(),
    entry({ id: 'pending-entry', entryId: 'pending-entry', status: 'pending_review' }),
  ];
  const model = buildBasecampViewModel(input({ entries: records, isHeatwaveDeckUnlocked: true }));
  assert.equal(model.attention.pendingCount, 1);
  assert.equal(model.attention.item, null);
  assert.equal(model.nextAction.action.href, '/missions?pack=heatwave-receipts');
});

test('progress uses canonical XP and deck completion data', () => {
  const records = [
    ...starterApprovals(),
    entry({ id: 'approved-heat', entryId: 'approved-heat', status: 'approved', challengeId: 'heatwave-01', missionId: 'heatwave-01' }),
  ];
  const currentProfile = profile({ xp: 700 });
  const currentInput = input({ entries: records, profile: currentProfile, isHeatwaveDeckUnlocked: true });
  const model = buildBasecampViewModel(currentInput);
  assert.equal(model.progress.xp, 700);
  assert.equal(model.progress.level, 3);
  assert.equal(model.progress.starterApprovedCount, 3);
  assert.equal(model.progress.activeDeckApprovedCount, 1);
  assert.ok(model.progress.levelProgressPercent >= 0 && model.progress.levelProgressPercent <= 100);
});

test('crew presence is derived from the profile and the user entry snapshot only', () => {
  const crewEntry = entry({
    id: 'crew-entry',
    entryId: 'crew-entry',
    crewContext: {
      crewId: 'crew-1',
      crewNameSnapshot: 'Parking Lot Oracles',
      crewMembershipId: 'crew-1_basecamp-user',
      submittedAsCrewMember: true,
      crewSeasonId: 'summer-2026',
      submittedAt: Timestamp.fromDate(NOW),
    },
  });
  const model = buildBasecampViewModel(input({
    entries: [crewEntry],
    profile: profile({ activeCrewId: 'crew-1', crewRole: 'member' }),
  }));
  assert.equal(model.crew.hasCrew, true);
  assert.equal(model.crew.crewName, 'Parking Lot Oracles');
  assert.equal(model.crew.roleLabel, 'member');
});

test('recent activity combines only personal AppContext-backed event types in timestamp order', () => {
  const proof = entry({
    id: 'approved-entry',
    entryId: 'approved-entry',
    status: 'approved',
    approvedAt: Timestamp.fromDate(new Date('2026-07-16T17:00:00.000Z')),
  });
  const observation: Observation = {
    id: 'observation-1',
    userId: 'basecamp-user',
    observationText: 'Your field notes are getting suspiciously specific.',
    observationType: 'Playful',
    createdAt: '2026-07-16T15:00:00.000Z',
    expiresAt: '2026-07-19T15:00:00.000Z',
    visibility: 'private',
    isDismissed: false,
  };
  const vote: Vote = {
    id: 'vote-1',
    userId: 'basecamp-user',
    entryId: 'candidate-1',
    weekNumber: 1,
    seasonId: 'summer-2026',
    category: 'best_photo_proof',
    createdAt: Timestamp.fromDate(new Date('2026-07-16T14:00:00.000Z')),
  };
  const model = buildBasecampViewModel(input({
    entries: [proof],
    badgeProgress: [{
      badgeId: 'first-mission',
      userId: 'basecamp-user',
      fragmentCount: 1,
      isUnlocked: true,
      unlockedAt: '2026-07-16T16:00:00.000Z',
    }],
    observations: [observation],
    userVotes: [vote],
  }));
  assert.deepEqual(model.recentActivity.map(item => item.kind), ['proof', 'badge', 'observation', 'vote']);
  assert.ok(model.recentActivity.every(item => item.timestamp > 0));
});
