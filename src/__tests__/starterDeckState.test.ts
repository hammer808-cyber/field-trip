import { STARTER_MISSION_BANK } from '../data/starterMissionBank';
import { getDeckPackById } from '../data/deckPacks';
import { getEligibleDrawPool } from '../logic/deckLogic';
import {
  buildCanonicalStarterDeckState,
  toStarterProfileMirrors,
  type StarterStateEntryLike,
  type StarterStateProfileLike,
} from '../logic/starterDeckState';
import type { TripCard } from '../types/challenges';

const missions = STARTER_MISSION_BANK as TripCard[];
const starterPack = getDeckPackById('starter-signals');

if (!starterPack) {
  throw new Error('starter-signals deck pack must exist');
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function sameIds(actual: string[], expected: string[], message: string) {
  const sortedActual = [...actual].sort();
  const sortedExpected = [...expected].sort();
  assert(
    JSON.stringify(sortedActual) === JSON.stringify(sortedExpected),
    `${message}. Expected ${sortedExpected.join(',')}; got ${sortedActual.join(',')}`
  );
}

function canonical(entries: StarterStateEntryLike[] = [], profile?: StarterStateProfileLike) {
  return buildCanonicalStarterDeckState({
    userId: 'user-1',
    entries,
    profile,
    drawnMissionCards: [],
  });
}

function eligibleStarterIds(entries: StarterStateEntryLike[] = [], profile?: StarterStateProfileLike) {
  const state = canonical(entries, profile);
  const result = getEligibleDrawPool({
    missions,
    completedMissionIds: new Set(state.approvedIds),
    pendingMissionIds: new Set(state.pendingIds),
    needsMoreProofMissionIds: new Set(state.needsMoreProofIds),
    rejectedMissionIds: new Set(state.rejectedIds),
    isOnboardingComplete: state.starterComplete,
    activePack: starterPack,
    isHeatwaveDeckUnlocked: state.starterComplete,
    isSocalSummerUnlocked: false,
    isAdmin: false,
    canonicalStarterState: state,
  });

  return result.eligibleMissions.map(mission => mission.id);
}

console.log('RUNNING_STARTER_DECK_STATE_TESTS...');

sameIds(
  eligibleStarterIds(),
  ['starter-1', 'starter-2', 'starter-3'],
  'brand-new user should be able to draw starter missions, including starter-1'
);

sameIds(
  eligibleStarterIds([{ userId: 'user-1', missionId: 'starter-1', deckId: 'starter-signals', status: 'pending_review' }]),
  ['starter-2', 'starter-3'],
  'one pending Starter mission should not block drawing other unsubmitted Starter missions'
);

sameIds(
  eligibleStarterIds([
    { userId: 'user-1', missionId: 'starter-1', deckId: 'starter-signals', status: 'pending_review' },
    { userId: 'user-1', missionId: 'starter-2', deckId: 'starter-signals', status: 'pending_review' },
  ]),
  ['starter-3'],
  'two pending Starter missions should leave the third drawable'
);

sameIds(
  eligibleStarterIds([
    { userId: 'user-1', missionId: 'starter-1', deckId: 'starter-signals', status: 'pending_review' },
    { userId: 'user-1', missionId: 'starter-2', deckId: 'starter-signals', status: 'pending_review' },
    { userId: 'user-1', missionId: 'starter-3', deckId: 'starter-signals', status: 'pending_review' },
  ]),
  [],
  'three pending Starter missions should not be redrawable'
);

{
  const approvedState = canonical([
    { userId: 'user-1', missionId: 'starter-1', deckId: 'starter-signals', status: 'approved' },
    { userId: 'user-1', missionId: 'starter-2', deckId: 'starter-signals', status: 'approved' },
    { userId: 'user-1', missionId: 'starter-3', deckId: 'starter-signals', status: 'approved' },
  ]);
  const mirrors = toStarterProfileMirrors(approvedState);

  assert(approvedState.starterComplete === true, 'three approved Starter missions should complete Starter Signals');
  assert(mirrors.activePlayableDeckId === 'heatwave-receipts', 'three approved Starter missions should unlock next deck');
}

sameIds(
  eligibleStarterIds([{ userId: 'user-1', missionId: 'starter-1', deckId: 'starter-signals', status: 'rejected' }]),
  ['starter-2', 'starter-3'],
  'rejected Starter mission should be excluded from normal draw and left to retry path'
);

{
  const staleState = canonical(
    [{ userId: 'user-1', missionId: 'starter-1', deckId: 'starter-signals', status: 'rejected' }],
    {
      submittedChallengeIds: ['starter-1', 'starter-2', 'starter-3'],
      submittedPendingChallengeIds: ['starter-1', 'starter-2', 'starter-3'],
      rejectedChallengeIds: [],
    }
  );
  const mirrors = toStarterProfileMirrors(staleState);

  sameIds(staleState.rejectedIds, ['starter-1'], 'entry rejection should override stale pending profile array');
  sameIds(staleState.pendingIds, ['starter-2', 'starter-3'], 'profile fallback should only fill Starter IDs not backed by entries');
  sameIds(mirrors.submittedPendingChallengeIds, ['starter-2', 'starter-3'], 'repair mirrors should rebuild pending Starter IDs from canonical state');
  sameIds(mirrors.rejectedChallengeIds, ['starter-1'], 'repair mirrors should preserve canonical rejected Starter IDs');
}

console.log('STARTER_DECK_STATE_TESTS_COMPLETE. ALL_TESTS_PASSED.');
