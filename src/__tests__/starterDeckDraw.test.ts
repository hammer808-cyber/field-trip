import test from 'node:test';
import assert from 'node:assert/strict';
import { getEligibleDrawPool } from '../logic/deckLogic';
import { calculateStarterState } from '../utils/starterHelper';
import { buildCanonicalProgress, getChallengeStatus, getDeckProgress } from '../services/canonicalProgress';
import { STARTER_MISSION_BANK } from '../data/starterMissionBank';
import { getDeckPackById } from '../data/deckPacks';
import { TripCard } from '../types/challenges';
import { Entry } from '../types/game';

const starterPack = getDeckPackById('starter-signals');
const heatwavePack = getDeckPackById('heatwave-receipts');
const starterMissions = STARTER_MISSION_BANK as TripCard[];
const starterIds = ['starter-1', 'starter-2', 'starter-3'];

function pool(params: {
  approved?: string[];
  pending?: string[];
  missions?: TripCard[];
  activeMissionId?: string | null;
  isOnboardingComplete?: boolean;
}) {
  return getEligibleDrawPool({
    missions: params.missions || starterMissions,
    completedMissionIds: new Set(params.approved || []),
    pendingMissionIds: new Set(params.pending || []),
    needsMoreProofMissionIds: new Set(),
    rejectedMissionIds: new Set(),
    activeMissionId: params.activeMissionId || null,
    isOnboardingComplete: params.isOnboardingComplete || false,
    activePack: starterPack,
    isHeatwaveDeckUnlocked: false,
    isSocalSummerUnlocked: false,
    isAdmin: false
  });
}

function approvedEntry(id: string): Entry {
  return {
    id: `entry-${id}`,
    entryId: `entry-${id}`,
    uid: 'user-1',
    userId: 'user-1',
    displayName: 'Tester',
    username: 'tester',
    challengeId: id,
    missionId: id,
    tripId: id,
    deckId: 'starter-signals',
    status: 'approved',
    createdAt: null as any,
    updatedAt: null as any
  } as Entry;
}

test('fresh user can draw starter-1', () => {
  const result = pool({});
  assert.equal(result.reason, null);
  assert.ok(result.eligibleMissions.some(card => card.id === 'starter-1'));
});

test('after starter-1 is pending, user can draw starter-2', () => {
  const result = pool({ pending: ['starter-1'] });
  assert.ok(result.eligibleMissions.some(card => card.id === 'starter-2'));
  assert.ok(!result.eligibleMissions.some(card => card.id === 'starter-1'));
});

test('after starter-1 and starter-2 are pending, user can draw starter-3', () => {
  const result = pool({ pending: ['starter-1', 'starter-2'] });
  assert.deepEqual(result.eligibleMissions.map(card => card.id), ['starter-3']);
});

test('after all 3 starters are pending, no further starter cards draw and gated decks remain locked', () => {
  const result = pool({ pending: starterIds });
  assert.equal(result.eligibleMissions.length, 0);
  assert.equal(result.reason, 'all_starter_signals_pending_review');

  const heatwave = getEligibleDrawPool({
    missions: starterMissions,
    completedMissionIds: new Set(),
    pendingMissionIds: new Set(starterIds),
    needsMoreProofMissionIds: new Set(),
    rejectedMissionIds: new Set(),
    isOnboardingComplete: false,
    activePack: heatwavePack,
    isHeatwaveDeckUnlocked: false,
    isSocalSummerUnlocked: false,
    isAdmin: false
  });
  assert.equal(heatwave.reason, 'season_locked');
});

test('after admin approves only 1 or 2 starter cards, gated decks remain locked', () => {
  for (const approved of [['starter-1'], ['starter-1', 'starter-2']]) {
    const starterState = calculateStarterState('user-1', approved.map(approvedEntry));
    assert.equal(starterState.starterComplete, false);
    assert.equal(starterState.status, 'IN_PROGRESS');
  }
});

test('after admin approves all 3 unique starter cards, starter state completes and gates can unlock', () => {
  const starterState = calculateStarterState('user-1', starterIds.map(approvedEntry));
  assert.equal(starterState.starterApprovedCount, 3);
  assert.equal(starterState.starterComplete, true);
  assert.equal(starterState.status, 'COMPLETE');
});

test('draft starter cards are diagnosed without false pack exhaustion', () => {
  const draftMissions = starterMissions.map(card => (
    card.id === 'starter-2' || card.id === 'starter-3'
      ? { ...card, status: 'draft' as any }
      : card
  ));
  const result = pool({ pending: ['starter-1'], missions: draftMissions });
  assert.equal(result.eligibleMissions.length, 0);
  assert.equal(result.reason, 'unpublished_cards_blocked');
  assert.ok(result.analysis?.some(item => item.cardId === 'starter-2' && item.exclusionReason === 'disallowed_status:draft'));
});

test('legacy submitted profile arrays do not burn starter cards without active entries', () => {
  const snapshot = buildCanonicalProgress({
    userId: 'user-1',
    profile: {
      id: 'user-1',
      submittedChallengeIds: ['starter-1'],
      submittedPendingChallengeIds: ['starter-2'],
      approvedCompletedChallengeIds: []
    } as any,
    entries: [],
    pendingEntries: []
  });

  assert.equal(snapshot.starter.starterApprovedCount, 0);
  assert.equal(snapshot.submittedChallengeIds.size, 0);
  assert.equal(snapshot.submittedPendingChallengeIds.size, 0);
  assert.equal(getChallengeStatus(snapshot, 'starter-1'), 'available');
  assert.equal(getChallengeStatus(snapshot, 'starter-2'), 'available');

  const starterProgress = getDeckProgress(snapshot, 'starter-signals');
  assert.equal(starterProgress.approvedCount, 0);
  assert.equal(starterProgress.pendingCount, 0);
  assert.equal(starterProgress.remainingCount, 3);
});

test('legacy approved starter profile arrays complete canonical progress when canonical entry links are missing', () => {
  const snapshot = buildCanonicalProgress({
    userId: 'user-1',
    profile: {
      id: 'user-1',
      approvedCompletedChallengeIds: ['starter-1', 'starter-2', 'starter-3'],
      completedChallengeIds: ['starter-1', 'starter-2', 'starter-3'],
      onboardingCompleted: true
    } as any,
    entries: [],
    pendingEntries: []
  });

  assert.equal(snapshot.starter.starterApprovedCount, 3);
  assert.equal(snapshot.starter.starterComplete, true);
  assert.deepEqual(starterIds.filter(id => snapshot.approvedCompletedChallengeIds.has(id)), starterIds);
  assert.equal(getDeckProgress(snapshot, 'starter-signals').approvedCount, 3);
});

test('one missing legacy starter approval does not complete canonical progress', () => {
  const snapshot = buildCanonicalProgress({
    userId: 'user-1',
    profile: {
      id: 'user-1',
      approvedCompletedChallengeIds: ['starter-1', 'starter-2'],
      completedChallengeIds: ['starter-1', 'starter-2'],
      onboardingCompleted: true
    } as any,
    entries: [],
    pendingEntries: []
  });

  assert.equal(snapshot.starter.starterApprovedCount, 2);
  assert.equal(snapshot.starter.starterComplete, false);
});

test('pending and rejected starter entries do not unlock canonical progress', () => {
  const pendingSnapshot = buildCanonicalProgress({
    userId: 'user-1',
    profile: { id: 'user-1' } as any,
    entries: [
      { ...approvedEntry('starter-1'), status: 'pending_review' },
      { ...approvedEntry('starter-2'), status: 'rejected' },
      approvedEntry('starter-3')
    ],
    pendingEntries: []
  });

  assert.equal(pendingSnapshot.starter.starterApprovedCount, 1);
  assert.equal(pendingSnapshot.starter.starterComplete, false);
  assert.equal(getChallengeStatus(pendingSnapshot, 'starter-1'), 'pending_review');
  assert.equal(getChallengeStatus(pendingSnapshot, 'starter-2'), 'rejected');
});

test('pending starter state comes from a real pending entry, not stale profile arrays', () => {
  const snapshot = buildCanonicalProgress({
    userId: 'user-1',
    profile: {
      id: 'user-1',
      submittedChallengeIds: ['starter-3'],
      submittedPendingChallengeIds: ['starter-3'],
      approvedCompletedChallengeIds: []
    } as any,
    entries: [{
      ...approvedEntry('starter-1'),
      id: 'entry-starter-1-pending',
      entryId: 'entry-starter-1-pending',
      status: 'pending_review'
    } as Entry],
    pendingEntries: []
  });

  assert.equal(getChallengeStatus(snapshot, 'starter-1'), 'pending_review');
  assert.equal(getChallengeStatus(snapshot, 'starter-3'), 'available');
  assert.equal(snapshot.starter.starterApprovedCount, 0);

  const starterProgress = getDeckProgress(snapshot, 'starter-signals');
  assert.equal(starterProgress.pendingCount, 1);
  assert.equal(starterProgress.remainingCount, 2);
});
