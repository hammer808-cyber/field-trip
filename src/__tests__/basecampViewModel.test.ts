import assert from 'node:assert/strict';
import test from 'node:test';
import { Timestamp } from 'firebase/firestore';
import type { TripCard } from '../types/challenges';
import type { Entry, Vote } from '../types/game';
import type { Observation } from '../types/observations';
import type { PlayerNotification, PowerHourLiveNotification, ProofReviewNotification, ProofSubmittedNotification, StickerAwardedNotification } from '../logic/playerNotifications';
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
    notifications: overrides.notifications || [],
    currentDate: overrides.currentDate || NOW,
    isHeatwaveDeckUnlocked: overrides.isHeatwaveDeckUnlocked ?? false,
    isVotingOpen: overrides.isVotingOpen ?? false,
    crewGraph: overrides.crewGraph,
  };
}

test('a new player receives the canonical Starter Signals next action', () => {
  const model = buildBasecampViewModel(input({ profile: profile({ onboardingCompleted: false }) }));
  assert.equal(model.nextAction.guidanceState, 'DRAW_STARTER_MISSION');
  assert.equal(model.nextAction.action.href, '/missions?pack=starter-signals');
  assert.equal(model.nextAction.action.intent, 'navigate');
  assert.equal(model.progress.starterApprovedCount, 0);
  assert.equal(model.notifications.length, 0);
});

test('the Missions quick link is always present — the deck is home pre-Starter', () => {
  const preStarter = buildBasecampViewModel(input({ profile: profile({ onboardingCompleted: false }) }));
  assert.equal(preStarter.quickLinks.some(link => link.id === 'missions'), true);
  assert.equal(preStarter.quickLinks[0].id, 'missions');
  const postStarter = buildBasecampViewModel(input({ entries: starterApprovals() }));
  assert.equal(postStarter.quickLinks.some(link => link.id === 'missions'), true);
  assert.equal(postStarter.quickLinks[0].id, 'missions');
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
  // Nov 17, 2026: no tripProgress was supplied, so the label is
  // 'Do this mission' (unknown reads as no-progress). The action is still
  // a direct continuation to capture.
  assert.equal(model.nextAction.action.label, 'Do this mission');
  assert.match(model.nextAction.action.href, /capture\?id=heat-1/);
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
  assert.equal(model.nextAction.guidanceState, 'RESUME_ACTIVE_MISSION');
  assert.match(model.nextAction.action.href, /mission-briefing\?id=heat-1/);
});

test('an active mission pending review keeps drawing as the primary action', () => {
  const pendingMission = trip({ status: 'submitted' });
  const model = buildBasecampViewModel(input({
    entries: starterApprovals(),
    activeTrip: pendingMission,
    activeSubmissionStatus: 'pending_review',
    trips: [pendingMission],
    isHeatwaveDeckUnlocked: true,
  }));
  assert.equal(model.nextAction.mission?.status, 'pending_review');
  assert.equal(model.nextAction.guidanceState, 'DRAW_MISSION');
  assert.match(model.nextAction.action.href, /missions/);
  assert.equal(model.nextAction.secondaryAction?.href, '/profile?tab=logbook');
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
  assert.equal(model.nextAction.guidanceState, 'REPAIR_PROOF');
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

test('empty 1:1 Crew stays empty and can surface incoming request attention without changing guidance', () => {
  const empty = buildBasecampViewModel(input());
  assert.equal(empty.crew.acceptedCount, 0);
  assert.equal(empty.crew.crewName, 'Your Crew is empty');
  const withRequest = buildBasecampViewModel(input({
    crewGraph: { acceptedCount: 0, incomingCount: 1 },
  }));
  assert.equal(withRequest.crew.incomingCount, 1);
  assert.equal(withRequest.nextAction.guidanceState, empty.nextAction.guidanceState);
});

test('a published challenge definition status of approved does not mark a drawn mission cleared', () => {
  const published = trip({ id: 'heatwave-18', status: 'approved', title: 'Emotional Support Beverage' });
  const model = buildBasecampViewModel(input({
    entries: starterApprovals(),
    activeTrip: published,
    drawnMissionCards: [{
      id: 'basecamp-user_heatwave-18',
      uid: 'basecamp-user',
      missionId: 'heatwave-18',
      challengeId: 'heatwave-18',
      deckId: 'heatwave-receipts',
      missionTitle: published.title,
      missionSummary: published.description,
      drawnAt: Timestamp.fromDate(NOW),
      status: 'drawn',
      isActive: true,
    }],
    trips: [published],
    isHeatwaveDeckUnlocked: true,
  }));
  assert.notEqual(model.nextAction.mission?.status, 'approved');
  assert.equal(model.nextAction.guidanceState, 'RESUME_ACTIVE_MISSION');
  assert.doesNotMatch(model.nextAction.title, /cleared/i);
  assert.doesNotMatch(model.nextAction.action.label, /cleared/i);
  assert.equal(model.quickLinks[0].description, model.nextAction.action.label);
});

function notification(overrides: Partial<ProofReviewNotification> = {}): ProofReviewNotification {
  return {
    id: 'notif-1',
    type: 'proof_review_decision',
    decision: 'approve',
    status: 'approved',
    entryId: 'entry-1',
    reviewId: 'review-1',
    challengeId: 'heat-1',
    missionTitle: 'Find the Coolest Shadow',
    awardedXp: 75,
    adminNote: '',
    reviewerId: 'admin-1',
    read: false,
    createdAt: new Date('2026-07-16T17:00:00.000Z').getTime(),
    ...overrides,
  };
}

test('Q11: a decided entry row lives only in Notifications', () => {
  // Nov 18, 2026 (Updates removed): the decision shows once — in
  // Notifications, tappable to the Logbook where the entry lives. There is
  // no second feed for it to duplicate into.
  const model = buildBasecampViewModel(input({
    entries: [entry({ status: 'approved' })],
    notifications: [notification()],
  }));
  assert.equal(model.notifications.length, 1);
  assert.equal(model.notifications[0].kind, 'decision');
  assert.equal(model.notifications[0].title, 'Proof approved');
  assert.equal(model.notifications[0].detail, 'Find the Coolest Shadow · +75 XP');
  assert.equal(model.notifications[0].href, '/profile?tab=logbook');
});

test('Q11: a decision shows once in Notifications', () => {
  const model = buildBasecampViewModel(input({
    entries: [entry({ status: 'approved' })],
    notifications: [notification()],
  }));
  const rows = model.notifications.filter(item => item.kind === 'decision');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].detail, 'Find the Coolest Shadow · +75 XP');
});

test('Q11: an entry without a notification has no decision row in Notifications', () => {
  const model = buildBasecampViewModel(input({
    entries: [entry({ status: 'approved' })],
    notifications: [notification({ entryId: 'some-other-entry' })],
  }));
  // Only the other entry's decision renders — exactly one row.
  assert.equal(model.notifications.length, 1);
  assert.equal(model.notifications[0].kind, 'decision');
});

test('Q11: a rejection notification in Notifications carries the admin note', () => {
  const model = buildBasecampViewModel(input({
    entries: [entry({ status: 'rejected' })],
    notifications: [notification({
      decision: 'reject',
      status: 'rejected',
      adminNote: 'Photo shows the wrong street.',
    })],
  }));
  const rows = model.notifications.filter(item => item.kind === 'decision');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].title, 'Proof review closed');
  assert.equal(rows[0].detail, 'Find the Coolest Shadow · Photo shows the wrong street.');
  assert.equal(rows[0].href, '/profile?tab=logbook');
});

function submittedNotification(overrides: Partial<ProofSubmittedNotification> = {}): ProofSubmittedNotification {
  return {
    id: 'notif-submitted-1',
    type: 'proof_submitted',
    entryId: 'entry-1',
    challengeId: 'heat-1',
    missionTitle: 'Find the Coolest Shadow',
    read: false,
    createdAt: new Date('2026-07-16T15:30:00.000Z').getTime(),
    ...overrides,
  };
}

function powerHourNotification(overrides: Partial<PowerHourLiveNotification> = {}): PowerHourLiveNotification {
  return {
    id: 'notif-power-hour-1',
    type: 'power_hour_live',
    localDate: '2026-07-16',
    timezone: 'America/Los_Angeles',
    startHour: 12,
    endHourExclusive: 15,
    multiplier: 1.5,
    read: false,
    createdAt: new Date('2026-07-16T12:05:00.000Z').getTime(),
    ...overrides,
  };
}

test('Notifications split: submissions and Power Hour render in Notifications', () => {
  const model = buildBasecampViewModel(input({
    entries: [entry({ status: 'pending_review' })],
    notifications: [submittedNotification(), powerHourNotification()],
  }));
  // Notifications carries both new types, newest-first.
  assert.equal(model.notifications.length, 2);
  assert.equal(model.notifications[0].kind, 'submission');
  assert.equal(model.notifications[0].title, 'Proof submitted');
  assert.equal(model.notifications[0].detail, 'Find the Coolest Shadow · Waiting for review.');
  assert.equal(model.notifications[0].href, '/profile?tab=logbook');
  assert.equal(model.notifications[1].kind, 'power_hour');
  assert.equal(model.notifications[1].title, 'Power Hour is live');
  assert.equal(model.notifications[1].detail, 'Start a mission before 3:00 PM for 1.5x XP.');
  assert.equal(model.notifications[1].href, '/missions');
});

test('Notifications split: a Power Hour approval notes the multiplier on the decision row', () => {
  const model = buildBasecampViewModel(input({
    entries: [entry({ status: 'approved' })],
    notifications: [notification({ powerHour: true, powerHourMultiplier: 1.5 })],
  }));
  assert.equal(model.notifications.length, 1);
  assert.equal(model.notifications[0].detail, 'Find the Coolest Shadow · +75 XP · Power Hour 1.5x');
});

function stickerNotification(overrides: Partial<StickerAwardedNotification> = {}): StickerAwardedNotification {
  return {
    id: 'notif-sticker-1',
    type: 'sticker_awarded',
    stickerId: 'first_offenses_fresh_meat',
    stickerName: 'Fresh Meat',
    stickerRarity: 'common',
    discoveryKey: 'first_submission',
    read: false,
    createdAt: new Date('2026-07-16T17:30:00.000Z').getTime(),
    ...overrides,
  };
}

test('Notifications section lists decisions and sticker awards, newest-first', () => {
  const model = buildBasecampViewModel(input({
    entries: [entry({ status: 'approved' })],
    notifications: [notification(), stickerNotification()],
  }));
  assert.equal(model.notifications.length, 2);
  // Sticker (17:30) is newer than the decision (17:00).
  assert.equal(model.notifications[0].kind, 'sticker');
  assert.equal(model.notifications[0].title, 'Sticker unlocked');
  assert.equal(model.notifications[0].detail, 'Fresh Meat · common');
  assert.equal(model.notifications[0].href, '/dex/stickers');
  assert.equal(model.notifications[0].unread, true);
  assert.equal(model.notifications[1].kind, 'decision');
  assert.equal(model.notifications[1].title, 'Proof approved');
  assert.equal(model.notifications[1].href, '/profile?tab=logbook');
  assert.equal(model.notifications[1].unread, true);
});

test('Notifications section has no 5-item cap, and read rows are not unread', () => {
  const many = Array.from({ length: 6 }, (_, i) => notification({
    id: `notif-${i}`,
    entryId: `entry-${i}`,
    createdAt: new Date(`2026-07-16T1${i}:00:00.000Z`).getTime(),
    read: i === 0,
  }));
  const model = buildBasecampViewModel(input({
    entries: [entry({ status: 'approved' })],
    notifications: [...many, stickerNotification()],
  }));
  assert.equal(model.notifications.length, 7);
  const readRow = model.notifications.find(item => item.id === 'notification-notif-0');
  assert.equal(readRow?.unread, false);
});

test('sticker awards render only in Notifications', () => {
  // Nov 18, 2026 (Updates removed): stickers get their signal from the
  // Notifications section — the only feed on Basecamp now.
  const model = buildBasecampViewModel(input({
    entries: [],
    notifications: [stickerNotification()],
  }));
  assert.equal(model.notifications.length, 1);
});
