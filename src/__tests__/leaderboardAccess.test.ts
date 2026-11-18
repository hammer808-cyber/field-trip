import assert from 'node:assert/strict';
import test from 'node:test';
import { Timestamp } from 'firebase/firestore';
import type { Entry } from '../types/game';
import type { UserProfile } from '../services/userService';
import { buildCanonicalProgress, canAccessFeature } from '../services/canonicalProgress';

const NOW = new Date('2026-07-16T18:00:00.000Z');

function profile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'board-user',
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

function starterApprovalEntry(missionId: string, index: number): Entry {
  return {
    id: `starter-entry-${index}`,
    entryId: `starter-entry-${index}`,
    uid: 'board-user',
    userId: 'board-user',
    displayName: 'Field Player',
    username: 'field-player',
    challengeId: missionId,
    missionId,
    deckId: 'starter-signals',
    status: 'approved',
    imageUrl: '/proof.jpg',
    storagePath: null,
    fieldNote: 'A real field note.',
    xpValue: 100,
    xpAwarded: true,
    createdAt: Timestamp.fromDate(new Date(`2026-07-0${index}T12:00:00.000Z`)),
    updatedAt: Timestamp.fromDate(new Date(`2026-07-0${index}T12:00:00.000Z`)),
  };
}

function starterCompleteSnapshot() {
  return buildCanonicalProgress({
    userId: 'board-user',
    profile: profile(),
    entries: ['starter-1', 'starter-2', 'starter-3'].map((id, i) => starterApprovalEntry(id, i + 1)),
    trips: [],
  });
}

function freshSnapshot() {
  return buildCanonicalProgress({
    userId: 'board-user',
    profile: profile(),
    entries: [],
    trips: [],
  });
}

test('Big Board opens for a non-admin at 3/3 starters', () => {
  // Nov 17, 2026: the board borrowed Voting's kill-switch key, so parking
  // Voting locked it for every non-admin even with the bar full at 3/3.
  const snapshot = starterCompleteSnapshot();
  assert.equal(snapshot.starter.starterComplete, true, 'fixture must be 3/3 starters');
  assert.equal(canAccessFeature(snapshot, 'leaderboard'), true);
});

test('Big Board stays locked before the starters are complete', () => {
  assert.equal(canAccessFeature(freshSnapshot(), 'leaderboard'), false);
});

test('Voting stays blocked while parked, even at 3/3 starters', () => {
  // The board's fix must not leak into Voting: parking Voting still bars it.
  const snapshot = starterCompleteSnapshot();
  assert.equal(canAccessFeature(snapshot, 'voting'), false);
  assert.equal(canAccessFeature(snapshot, 'leaderboard'), true);
});

test('admins bypass both gates', () => {
  assert.equal(canAccessFeature(freshSnapshot(), 'leaderboard', { isAdmin: true }), true);
  assert.equal(canAccessFeature(freshSnapshot(), 'voting', { isAdmin: true }), true);
});
