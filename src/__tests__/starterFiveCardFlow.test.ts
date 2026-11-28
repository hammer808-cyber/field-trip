import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { STARTER_MISSION_BANK } from '../data/starterMissionBank';
import { getDeckPackById } from '../data/deckPacks';
import {
  STARTER_SIGNAL_IDS,
  STARTER_REQUIRED_APPROVALS,
  FIRST_STARTER_CARD_ID,
  shouldForceFirstStarterDraw,
  buildCanonicalStarterDeckState,
} from '../logic/starterDeckState';
import { isUnseenStarterUnlock } from '../logic/playerGuidance';
import type { Entry } from '../types/game';
import { buildCanonicalProgress, canAccessFeature } from '../services/canonicalProgress';
import { calculateStarterState } from '../utils/starterHelper';
import { buildPostSubmitStarterGuidance } from '../logic/postSubmitStarterGuidance';
import type { TripCard } from '../types/challenges';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const readSource = (relativePath: string) => readFileSync(join(repoRoot, relativePath), 'utf8');

const starterCards = STARTER_MISSION_BANK as TripCard[];
const starterPack = getDeckPackById('starter-signals');
if (!starterPack) {
  throw new Error('starter-signals deck pack must exist');
}

function approvedEntry(missionId: string): Entry {
  return {
    id: `entry-${missionId}`,
    entryId: `entry-${missionId}`,
    uid: 'user-1',
    userId: 'user-1',
    displayName: 'Tester',
    username: 'tester',
    challengeId: missionId,
    missionId,
    tripId: missionId,
    deckId: 'starter-signals',
    status: 'approved',
    createdAt: null as any,
    updatedAt: null as any,
  } as Entry;
}

test('starter deck has five cards and the gate needs one approval', () => {
  assert.deepEqual([...STARTER_SIGNAL_IDS], ['starter-1', 'starter-2', 'starter-3', 'starter-4', 'starter-5']);
  assert.equal(STARTER_REQUIRED_APPROVALS, 1);
  assert.equal(STARTER_MISSION_BANK.length, 5);
  assert.deepEqual([...starterPack.missionIds], [...STARTER_SIGNAL_IDS]);
  assert.deepEqual(starterPack.difficultyRange, ['easy']);
});

test('all five starter cards are easy difficulty', () => {
  for (const card of starterCards) {
    assert.equal(card.difficulty, 'easy', `${card.id} must be easy`);
  }
});

test('starter-1 is the "picture of what is around you" card', () => {
  const first = starterCards.find(card => card.id === 'starter-1');
  assert.ok(first, 'starter-1 must exist');
  assert.equal(first.title, "What's Around You");
  assert.match(first.description || '', /whatever is around you/i);
  assert.match(first.theAsk || '', /what'?s around you/i);
  assert.match(first.shortPrompt || '', /what'?s around you/i);
  assert.deepEqual(first.proofType, ['photo']);
});

test('the other four starter cards are simple photo missions', () => {
  const rest = starterCards.filter(card => card.id !== 'starter-1');
  assert.deepEqual(rest.map(card => card.id), ['starter-2', 'starter-3', 'starter-4', 'starter-5']);
  assert.deepEqual(rest.map(card => card.title), ['Snack Evidence', 'Personal Oasis', 'Shadow Check', 'Color Pop']);
  for (const card of rest) {
    // Every one starts with a photo; none asks for audio, video, or a
    // group confirmation. starter-3 keeps its photo+note shape from
    // the old bank (the note is the standing submit requirement).
    assert.ok(card.proofType.includes('photo'), `${card.id} must ask for a photo`);
    assert.ok(!card.proofType.includes('audio'), `${card.id} must not ask for audio`);
    assert.ok(!card.proofType.includes('video'), `${card.id} must not ask for video`);
    assert.ok(!card.proofType.includes('group-confirmation'), `${card.id} must not ask for a group confirmation`);
  }
});

test('fresh players always force-draw starter-1, and only the first draw is forced', () => {
  const fresh = {
    isStarterPackDraw: true,
    submittedStarterIds: [],
    activeDrawnStarterIds: [],
    drawnStarterIds: [],
  };
  assert.equal(shouldForceFirstStarterDraw(fresh), true);
  assert.equal(FIRST_STARTER_CARD_ID, 'starter-1');

  // Any starter history means the first draw already happened.
  assert.equal(shouldForceFirstStarterDraw({ ...fresh, submittedStarterIds: ['starter-1'] }), false);
  assert.equal(shouldForceFirstStarterDraw({ ...fresh, activeDrawnStarterIds: ['starter-1'] }), false);
  assert.equal(shouldForceFirstStarterDraw({ ...fresh, drawnStarterIds: ['starter-1'] }), false);
  // A different starter drawn before also burns the forced first draw.
  assert.equal(shouldForceFirstStarterDraw({ ...fresh, drawnStarterIds: ['starter-2'] }), false);
  // Non-starter draws never force starter-1.
  assert.equal(shouldForceFirstStarterDraw({ ...fresh, isStarterPackDraw: false }), false);
});

test('one approved starter submission completes the starter (canonical + legacy)', () => {
  const oneApproved = buildCanonicalStarterDeckState({
    userId: 'user-1',
    entries: [approvedEntry('starter-1')],
    profile: undefined,
    drawnMissionCards: [],
  });
  assert.equal(oneApproved.starterApprovedCount, 1);
  assert.equal(oneApproved.starterComplete, true);

  const legacyOne = calculateStarterState('user-1', [approvedEntry('starter-1')]);
  assert.equal(legacyOne.starterApprovedCount, 1);
  assert.equal(legacyOne.starterComplete, true);
  assert.equal(legacyOne.status, 'COMPLETE');

  const noneApproved = buildCanonicalStarterDeckState({
    userId: 'user-1',
    entries: [],
    profile: undefined,
    drawnMissionCards: [],
  });
  assert.equal(noneApproved.starterApprovedCount, 0);
  assert.equal(noneApproved.starterComplete, false);

  const legacyNone = calculateStarterState('user-1', []);
  assert.equal(legacyNone.starterComplete, false);
  assert.equal(legacyNone.status, 'NOT_STARTED');
});

test('one approval unlocks the gated areas (canonical progress + feature gate)', () => {
  const snapshot = buildCanonicalProgress({
    userId: 'user-1',
    profile: {
      id: 'user-1',
      approvedCompletedChallengeIds: ['starter-1'],
      completedChallengeIds: ['starter-1'],
      onboardingCompleted: true,
    } as any,
    entries: [approvedEntry('starter-1')],
    pendingEntries: [],
  });

  assert.equal(snapshot.starter.starterApprovedCount, 1);
  assert.equal(snapshot.starter.starterComplete, true);
  assert.equal(canAccessFeature(snapshot, 'memories', { isAdmin: false }), true);
  assert.equal(canAccessFeature(snapshot, 'crew', { isAdmin: false }), true);

  const locked = buildCanonicalProgress({
    userId: 'user-1',
    profile: { id: 'user-1', approvedCompletedChallengeIds: [], completedChallengeIds: [] } as any,
    entries: [],
    pendingEntries: [],
  });
  assert.equal(locked.starter.starterComplete, false);
  assert.equal(canAccessFeature(locked, 'memories', { isAdmin: false }), false);
});

test('existing 3/3-approved players stay complete under the new rule', () => {
  const snapshot = buildCanonicalProgress({
    userId: 'user-1',
    profile: {
      id: 'user-1',
      approvedCompletedChallengeIds: ['starter-1', 'starter-2', 'starter-3'],
      completedChallengeIds: ['starter-1', 'starter-2', 'starter-3'],
      onboardingCompleted: true,
    } as any,
    entries: ['starter-1', 'starter-2', 'starter-3'].map(approvedEntry),
    pendingEntries: [],
  });
  assert.equal(snapshot.starter.starterApprovedCount, 3);
  assert.equal(snapshot.starter.starterComplete, true);
});

test('admin starter bypass grants completion under the new rule (source)', () => {
  const serverSource = readSource('server.ts');
  const bypass = serverSource.slice(serverSource.indexOf('grant-starter-bypass'));
  assert.match(bypass, /const starterIds = \["starter-1", "starter-2", "starter-3", "starter-4", "starter-5"\];/);
  assert.match(bypass, /starterApprovedCount: 5,/);
  assert.match(bypass, /"starterState\.starterApprovedCount": 5/);
});

test('the starter unlock celebration clears after one seen approval (not five)', () => {
  // The ack writes the approved count (1 after the first approval) and
  // the unlock fires at 1 approval. If the comparison used the 5-card
  // deck size, the celebration would keep firing until all 5 were
  // approved.
  assert.equal(isUnseenStarterUnlock({
    starterComplete: true,
    starterApprovedCount: 1,
    lastSeenApprovedCount: 0,
  }), true);
  assert.equal(isUnseenStarterUnlock({
    starterComplete: true,
    starterApprovedCount: 1,
    lastSeenApprovedCount: 1,
  }), false);
  assert.equal(isUnseenStarterUnlock({
    starterComplete: false,
    starterApprovedCount: 0,
    lastSeenApprovedCount: 0,
  }), false);
});

test('post-unlock guidance sends the player to pick a deck', () => {
  const guidance = buildPostSubmitStarterGuidance({
    starter: {
      starterApprovedCount: 1,
      starterRequiredCount: 5,
      starterComplete: true,
      retryStarterCount: 0,
      needsMoreProofStarterCount: 0,
      submittedUniqueCount: 1,
      submittedMissionIds: ['starter-1'],
      needsMoreProofMissionId: null,
      rejectedMissionId: null,
      status: 'COMPLETE',
    },
    currentMissionId: 'starter-1',
    reviewStatus: 'approved',
  });
  assert.equal(guidance.status, 'COMPLETE');
  assert.equal(guidance.primaryHref, '/dex/decks');
  assert.equal(guidance.primaryLabel, 'Pick a deck →');
});

test('Basecamp carries a permanent "Pick a deck" button to the Dex decks shelf (source)', () => {
  const basecampSource = readSource('src/pages/Basecamp.tsx');
  assert.match(basecampSource, />Pick a deck</);
  assert.match(basecampSource, /navigate\('\/dex\/decks'\)/);
  assert.match(basecampSource, /aria-label="Pick a deck\. Open the Dex decks shelf\."/);
});

test('the locked-feature panel names the 1-mission gate (source)', () => {
  const gatedSource = readSource('src/components/GatedFeaturePanel.tsx');
  assert.match(gatedSource, /Finish 1 starter mission to open this\./);
  assert.match(gatedSource, /const required = STARTER_REQUIRED_APPROVALS;/);
  assert.doesNotMatch(gatedSource, /Finish 3 starter missions/);
});

test('the Basecamp progress panel reads unlock from starterComplete, not the deck size (source)', () => {
  const panelSource = readSource('src/components/basecamp/BasecampProgressPanel.tsx');
  assert.match(panelSource, /model\.starterComplete \? 'unlocked' : 'working toward unlock'/);
  assert.doesNotMatch(panelSource, /starterApprovedCount >= model\.starterRequiredCount/);
});

test('Trevor counts approvals left to finish the Starter, not cards left in the deck (source)', () => {
  const dialogueSource = readSource('src/content/trevorDialogue.ts');
  assert.match(dialogueSource, /STARTER_REQUIRED_APPROVALS - context\.starterApprovedCount/);
  assert.match(dialogueSource, /Starter progress is \{starterApprovedCount\}\/\{starterApprovalsToComplete\}/);
  assert.doesNotMatch(dialogueSource, /context\.starterRequiredCount - context\.starterApprovedCount/);
});

test('the Dex decks route is the real decks view (source)', () => {
  const collectionSource = readSource('src/pages/Collection.tsx');
  assert.match(collectionSource, /dex\/decks/);
  assert.match(collectionSource, /activeTab.*'decks'|setActiveTab\('decks'\)/);
});
