import assert from 'node:assert/strict';
import test from 'node:test';

import { DECK_PACKS, getActiveDeckPacks, getDeckCatalogSections, getDeckPackById } from '../data/deckPacks';
import { ERRAND_DECK_CHALLENGE_BANK } from '../data/errandDeckChallengeBank';
import { HEATWAVE_CHALLENGE_BANK } from '../data/heatwaveChallengeBank';
import { JET_SETTER_CHALLENGE_BANK } from '../data/jetSetterChallengeBank';
import { SOCAL_SUMMER_CHALLENGE_BANK } from '../data/socalSummerChallengeBank';
import { getDeckAccess } from '../logic/deckAccess';
import { getEligibleDrawPool } from '../logic/deckLogic';
import { getMissionSubmissionContext, normalizeDeckSubtitleForEntry } from '../logic/missionSubmission';
import { resolveMissionById } from '../logic/missionResolver';
import { isCommunityFeedEligible } from '../logic/communityFeed';
import { getProofLogbookCounts } from '../logic/proofDistribution';
import { buildCanonicalProgress, getDeckProgress } from '../services/canonicalProgress';
import type { TripCard } from '../types/challenges';

const starterIds = ['starter-1', 'starter-2', 'starter-3'];
const errandPack = getDeckPackById('errand-deck')!;
const jetSetterPack = getDeckPackById('jet-setter')!;

function entry(challengeId: string, deckId: string, status: string) {
  return {
    id: `entry-${challengeId}-${status}`,
    entryId: `entry-${challengeId}-${status}`,
    uid: 'user-1',
    userId: 'user-1',
    displayName: 'Deck Tester',
    username: 'deck-tester',
    challengeId,
    missionId: challengeId,
    tripId: challengeId,
    deckId,
    status,
    imageUrl: 'https://example.com/proof.jpg',
    storagePath: `proofUploads/user-1/${challengeId}.jpg`,
    fieldNote: 'A useful field note.',
    createdAt: '2026-07-14T12:00:00.000Z',
    submittedAt: '2026-07-14T12:00:00.000Z',
    updatedAt: '2026-07-14T12:00:00.000Z',
  } as any;
}

function progressFor(entries: any[]) {
  return buildCanonicalProgress({
    userId: 'user-1',
    profile: { id: 'user-1' } as any,
    entries,
    pendingEntries: [],
  });
}

test('deck registry contains one canonical Errand Deck and the new Jet Setter deck', () => {
  assert.equal(DECK_PACKS.filter(pack => pack.packId === 'errand-deck').length, 1);
  assert.equal(DECK_PACKS.filter(pack => pack.packId === 'jet-setter').length, 1);
  assert.equal(DECK_PACKS.some(pack => pack.packId === 'errand-goblin-receipts'), false);
  assert.equal(getDeckPackById('errand-goblin-receipts')?.packId, 'errand-deck');
  assert.equal(errandPack.missionIds.length, 15);
  assert.equal(jetSetterPack.missionIds.length, 25);
});

test('deck catalog uses the requested sections and placements', () => {
  const byId = new Map(getDeckCatalogSections().map(section => [section.id, section]));
  assert.ok(byId.get('featured-seasonal')?.packs.some(pack => pack.packId === 'heatwave-receipts'));
  assert.ok(byId.get('always-on')?.packs.some(pack => pack.packId === 'errand-deck'));
  assert.ok(byId.get('travel')?.packs.some(pack => pack.packId === 'jet-setter'));
  assert.ok(byId.get('local-fieldtrips')?.packs.some(pack => pack.packId === 'socal-summer'));
  assert.ok(byId.get('starter-training')?.packs.some(pack => pack.packId === 'starter-signals'));
  assert.equal(getActiveDeckPacks()[0].packId, 'starter-signals');
});

test('Errand and Jet Setter remain locked until all three Starter Signals are approved', () => {
  for (const pack of [errandPack, jetSetterPack]) {
    assert.equal(getDeckAccess(pack, { userId: 'user-1', completedDeckIds: [] }).playable, false);
    assert.equal(getDeckAccess(pack, { userId: 'user-1', completedDeckIds: ['starter-signals'] }).playable, true);

    const lockedDraw = getEligibleDrawPool({
      missions: (pack.packId === 'errand-deck' ? ERRAND_DECK_CHALLENGE_BANK : JET_SETTER_CHALLENGE_BANK) as TripCard[],
      completedMissionIds: new Set(starterIds),
      pendingMissionIds: new Set(),
      needsMoreProofMissionIds: new Set(),
      rejectedMissionIds: new Set(),
      isOnboardingComplete: false,
      activePack: pack,
      isHeatwaveDeckUnlocked: false,
      isSocalSummerUnlocked: false,
      isAdmin: false,
    });
    assert.equal(lockedDraw.reason, 'starter_locked');
  }
});

test('Starter approval unlocks draws from Heatwave, Errand, and Jet Setter', () => {
  const cases = [
    {
      pack: getDeckPackById('heatwave-receipts')!,
      missions: HEATWAVE_CHALLENGE_BANK as TripCard[],
      heatwave: true,
    },
    { pack: errandPack, missions: ERRAND_DECK_CHALLENGE_BANK as TripCard[], heatwave: false },
    { pack: jetSetterPack, missions: JET_SETTER_CHALLENGE_BANK as TripCard[], heatwave: false },
  ];

  for (const item of cases) {
    const draw = getEligibleDrawPool({
      missions: item.missions,
      completedMissionIds: new Set(starterIds),
      pendingMissionIds: new Set(),
      needsMoreProofMissionIds: new Set(),
      rejectedMissionIds: new Set(),
      isOnboardingComplete: true,
      activePack: item.pack,
      isHeatwaveDeckUnlocked: item.heatwave,
      isSocalSummerUnlocked: false,
      isAdmin: false,
    });
    assert.ok(draw.eligibleMissions.length > 0, `${item.pack.packId} should have a drawable card`);
    assert.ok(draw.eligibleMissions.every(mission => mission.deckId === item.pack.packId));
  }
});

test('new deck progress starts at zero and only approved entries advance it', () => {
  const empty = progressFor([]);
  assert.deepEqual(
    [getDeckProgress(empty, 'errand-deck').label, getDeckProgress(empty, 'jet-setter').label],
    ['0/15', '0/25']
  );

  const mixed = progressFor([
    entry('errand-deck-01', 'errand-deck', 'approved'),
    entry('errand-deck-02', 'errand-deck', 'pending_review'),
    entry('errand-deck-03', 'errand-deck', 'rejected'),
    entry('errand-deck-04', 'errand-deck', 'needs_more_proof'),
    entry('jet-setter-01', 'jet-setter', 'approved'),
  ]);

  const errand = getDeckProgress(mixed, 'errand-deck');
  const jetSetter = getDeckProgress(mixed, 'jet-setter');
  assert.equal(errand.approvedCount, 1);
  assert.equal(errand.pendingCount, 1);
  assert.equal(errand.rejectedCount, 1);
  assert.equal(errand.needsMoreProofCount, 1);
  assert.equal(errand.percent, Math.round(100 / 15));
  assert.equal(jetSetter.approvedCount, 1);
  assert.equal(jetSetter.percent, 4);
});

test('admin-style status transition moves progress exactly once without cross-contamination', () => {
  const pending = entry('errand-deck-01', 'errand-deck', 'pending_review');
  assert.equal(getDeckProgress(progressFor([pending]), 'errand-deck').approvedCount, 0);

  const approved = { ...pending, status: 'approved', approvedAt: '2026-07-14T13:00:00.000Z' };
  const snapshot = progressFor([approved]);
  assert.equal(getDeckProgress(snapshot, 'errand-deck').approvedCount, 1);
  assert.equal(getDeckProgress(snapshot, 'jet-setter').approvedCount, 0);
  assert.equal(getDeckProgress(snapshot, 'heatwave-receipts').approvedCount, 0);
  assert.equal(getDeckProgress(snapshot, 'socal-summer').approvedCount, 0);
});

test('direct mission resolution and submission context preserve new deck metadata', () => {
  for (const missionId of ['errand-deck-01', 'jet-setter-01']) {
    const mission = resolveMissionById(missionId);
    assert.ok(mission, `${missionId} should resolve from a direct capture URL`);
    const context = getMissionSubmissionContext(mission!);
    assert.equal(context.missionId, missionId);
    assert.equal(context.challengeId, missionId);
    assert.equal(context.deckId, mission!.deckId);
    assert.equal(context.deckName, mission!.deckName);
    assert.equal(context.deckSubtitle, mission!.deckSubtitle);
    assert.equal(context.cardType, mission!.cardType);
  }
});

test('canonical Entry projection normalizes missing and null deck subtitles to undefined', () => {
  const contextWithoutSubtitle = getMissionSubmissionContext({
    id: 'subtitle-test',
    title: 'Subtitle Test',
    deckId: 'test-deck',
    deckName: 'Test Deck',
  });
  const canonicalProjection = {
    ...contextWithoutSubtitle,
    deckSubtitle: normalizeDeckSubtitleForEntry(contextWithoutSubtitle.deckSubtitle),
  };

  assert.equal(contextWithoutSubtitle.deckSubtitle, null);
  assert.equal(canonicalProjection.deckSubtitle, undefined);
  assert.equal(normalizeDeckSubtitleForEntry(undefined), undefined);
  assert.equal(normalizeDeckSubtitleForEntry('A real subtitle'), 'A real subtitle');
});

test('briefing data is complete for a drawn card from each new deck', () => {
  for (const mission of [ERRAND_DECK_CHALLENGE_BANK[0], JET_SETTER_CHALLENGE_BANK[0]]) {
    assert.ok(mission.title);
    assert.ok(mission.cardType);
    assert.ok(mission.trevorLine);
    assert.ok(mission.description);
    assert.ok(mission.proofRequired);
    assert.ok(mission.allowedProof?.length);
    assert.ok(mission.safetyNote);
    assert.ok(mission.fieldNotePrompt);
  }
});

test('Logbook statuses and Community Proof eligibility remain canonical for both decks', () => {
  const records = [
    { ...entry('errand-deck-01', 'errand-deck', 'approved'), approvedAt: '2026-07-14T13:00:00.000Z' },
    { ...entry('jet-setter-01', 'jet-setter', 'approved'), approvedAt: '2026-07-14T13:00:00.000Z' },
    entry('errand-deck-02', 'errand-deck', 'pending_review'),
    entry('jet-setter-02', 'jet-setter', 'rejected'),
    entry('jet-setter-03', 'jet-setter', 'needs_more_proof'),
  ];
  const counts = getProofLogbookCounts(records);
  assert.deepEqual(counts, {
    totalSubmitted: 5,
    pendingReview: 1,
    approvedVerified: 2,
    rejectedOrNeedsMoreProof: 2,
    communityEligible: 2,
  });
  assert.equal(isCommunityFeedEligible(records[0]), true);
  assert.equal(isCommunityFeedEligible(records[1]), true);
  assert.equal(isCommunityFeedEligible(records[2]), false);
  assert.equal(isCommunityFeedEligible(records[3]), false);
  assert.equal(isCommunityFeedEligible(records[4]), false);
});

test('SoCal Summer remains isolated in its local deck mission bank', () => {
  assert.ok(SOCAL_SUMMER_CHALLENGE_BANK.length > 0);
  assert.ok(SOCAL_SUMMER_CHALLENGE_BANK.every(mission => mission.deckId === 'socal-summer'));
  assert.equal(getDeckProgress(progressFor([entry('socal-summer-01', 'socal-summer', 'approved')]), 'errand-deck').approvedCount, 0);
});
