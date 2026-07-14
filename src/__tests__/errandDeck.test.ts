import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { DECK_PACKS, getDeckPackById, normalizeDeckPackId } from '../data/deckPacks';
import {
  ERRAND_DECK_CHALLENGE_BANK,
  ERRAND_DECK_ID,
  ERRAND_DECK_NAME,
  ERRAND_DECK_SAFETY_NOTE,
  ERRAND_DECK_SEASON,
  ERRAND_DECK_SUBTITLE,
} from '../data/errandDeckChallengeBank';
import { getDeckAccess } from '../logic/deckAccess';
import { getEligibleDrawPool } from '../logic/deckLogic';
import { buildCanonicalProgress, getDeckProgress } from '../services/canonicalProgress';
import { Entry } from '../types/game';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const errandDeck = getDeckPackById(ERRAND_DECK_ID);

function starterEntry(missionId: string, status: Entry['status']): Entry {
  return {
    id: `entry-${missionId}`,
    entryId: `entry-${missionId}`,
    uid: 'user-1',
    userId: 'user-1',
    displayName: 'Errand Deck Tester',
    username: 'errand-deck-tester',
    challengeId: missionId,
    missionId,
    tripId: missionId,
    deckId: 'starter-signals',
    status,
    createdAt: null as any,
    updatedAt: null as any,
  } as Entry;
}

test('The Errand Deck replaces the retired placeholder with canonical metadata', () => {
  assert.ok(errandDeck);
  assert.equal(errandDeck.packId, ERRAND_DECK_ID);
  assert.equal(errandDeck.deckId, ERRAND_DECK_ID);
  assert.equal(errandDeck.title, ERRAND_DECK_NAME);
  assert.equal(errandDeck.packName, ERRAND_DECK_NAME);
  assert.equal(errandDeck.deckName, ERRAND_DECK_NAME);
  assert.equal(errandDeck.deckSubtitle, ERRAND_DECK_SUBTITLE);
  assert.equal(errandDeck.season, ERRAND_DECK_SEASON);
  assert.equal(errandDeck.status, 'active');
  assert.equal(errandDeck.deckType, 'evergreen');
  assert.equal(errandDeck.requiredUnlock, 'starter-complete');
  assert.equal(errandDeck.requiredStarterApprovals, 3);
  assert.equal(errandDeck.totalCards, 15);
  assert.deepEqual(errandDeck.requiredCompletedDeckIds, ['starter-signals']);
  assert.equal(errandDeck.missionIds.length, 15);
  assert.equal(DECK_PACKS.some(deck => deck.packId === 'errand-runs'), false);
  assert.equal(DECK_PACKS.some(deck => deck.packName === 'Errand Goblin Receipts'), false);

  const artworkPath = path.join(root, 'public', 'assets', 'decks', 'errand-deck.jpg');
  assert.ok(fs.existsSync(artworkPath));
  assert.ok(fs.statSync(artworkPath).size > 20_000);
});

test('retired Errand deck IDs resolve to the one canonical deck', () => {
  assert.equal(normalizeDeckPackId('errand-runs'), ERRAND_DECK_ID);
  assert.equal(normalizeDeckPackId('errand-runner'), ERRAND_DECK_ID);
  assert.equal(normalizeDeckPackId('errand-goblin-receipts'), ERRAND_DECK_ID);
  assert.equal(getDeckPackById('errand-runs')?.packId, ERRAND_DECK_ID);
  assert.equal(getDeckPackById('errand-runner')?.packId, ERRAND_DECK_ID);
});

test('The Errand Deck has 15 unique cards in the requested distribution', () => {
  assert.equal(ERRAND_DECK_CHALLENGE_BANK.length, 15);
  assert.equal(new Set(ERRAND_DECK_CHALLENGE_BANK.map(card => card.id)).size, 15);

  const counts = ERRAND_DECK_CHALLENGE_BANK.reduce<Record<string, number>>((result, card) => {
    result[String(card.cardType)] = (result[String(card.cardType)] || 0) + 1;
    return result;
  }, {});

  assert.deepEqual(counts, {
    Signal: 3,
    Proof: 3,
    Crew: 3,
    Receipt: 4,
    Lore: 2,
  });

  assert.deepEqual(
    ERRAND_DECK_CHALLENGE_BANK.map(card => card.title),
    [
      'Aisle Oracle',
      'Parking Lot Ecology',
      'Impulse Portal',
      'Errand Goblin Sighting',
      'One Thing, Allegedly',
      'Checkout Face, Optional',
      'Errand Chaperone',
      'Cart Council',
      'Waiting Area Weather',
      'Bag of Consequences',
      'Receipt Archaeology',
      'Emotional Support Beverage',
      'The Second Stop',
      'The Errand Fought Back',
      'Add It to the Errand Lore',
    ]
  );
});

test('every Errand card exposes the required mission, reward, and safety fields', () => {
  const requiredStringFields = [
    'id',
    'deckId',
    'deckName',
    'deckSubtitle',
    'season',
    'cardType',
    'title',
    'trevorLine',
    'mission',
    'proofRequired',
    'fieldNotePrompt',
    'bonusPrompt',
    'safetyNote',
  ] as const;

  ERRAND_DECK_CHALLENGE_BANK.forEach(card => {
    requiredStringFields.forEach(field => {
      assert.equal(typeof card[field], 'string', `${card.id}.${field} must be a string`);
      assert.ok(String(card[field]).trim(), `${card.id}.${field} must not be empty`);
    });
    assert.equal(card.deckId, ERRAND_DECK_ID);
    assert.equal(card.deckName, ERRAND_DECK_NAME);
    assert.equal(card.deckSubtitle, ERRAND_DECK_SUBTITLE);
    assert.equal(card.season, ERRAND_DECK_SEASON);
    assert.equal(card.safetyNote, ERRAND_DECK_SAFETY_NOTE);
    assert.equal(card.baseXp, 100);
    assert.equal(card.bonusXp, 25);
    assert.equal(card.baseXP, 100);
    assert.equal(card.isActive, true);
    assert.equal(card.active, true);
    assert.equal(card.status, 'approved');
    assert.ok(Array.isArray(card.allowedProof) && card.allowedProof.length > 0);
    assert.ok(Array.isArray(card.tags) && card.tags.length > 0);
  });
});

test('pending Starter submissions do not unlock The Errand Deck', () => {
  assert.ok(errandDeck);
  const pendingProgress = buildCanonicalProgress({
    userId: 'user-1',
    profile: { id: 'user-1' } as any,
    entries: ['starter-1', 'starter-2', 'starter-3'].map(id => starterEntry(id, 'pending_review')),
    pendingEntries: [],
  });
  assert.equal(getDeckProgress(pendingProgress, 'starter-signals').approvedCount, 0);

  const access = getDeckAccess(errandDeck, {
    userId: 'user-1',
    profile: { id: 'user-1' },
    completedDeckIds: [],
  });
  assert.equal(access.visible, true);
  assert.equal(access.playable, false);

  const pool = getEligibleDrawPool({
    missions: ERRAND_DECK_CHALLENGE_BANK as any[],
    completedMissionIds: new Set(),
    pendingMissionIds: new Set(['starter-1', 'starter-2', 'starter-3']),
    isOnboardingComplete: pendingProgress.starter.starterComplete,
    activePack: errandDeck,
    isHeatwaveDeckUnlocked: false,
    isSocalSummerUnlocked: false,
    isAdmin: false,
  });
  assert.equal(pool.reason, 'starter_locked');
  assert.equal(pool.eligibleMissions.length, 0);
});

test('three approved Starter Signals unlock all 15 Errand cards', () => {
  assert.ok(errandDeck);
  const approvedProgress = buildCanonicalProgress({
    userId: 'user-1',
    profile: { id: 'user-1' } as any,
    entries: ['starter-1', 'starter-2', 'starter-3'].map(id => starterEntry(id, 'approved')),
    pendingEntries: [],
  });
  const starterProgress = getDeckProgress(approvedProgress, 'starter-signals');
  const completedDeckIds = starterProgress.approvedCount === starterProgress.totalCards
    ? ['starter-signals']
    : [];

  assert.equal(approvedProgress.starter.starterComplete, true);
  assert.equal(getDeckAccess(errandDeck, {
    userId: 'user-1',
    profile: { id: 'user-1' },
    completedDeckIds,
  }).playable, true);

  const pool = getEligibleDrawPool({
    missions: ERRAND_DECK_CHALLENGE_BANK as any[],
    completedMissionIds: new Set(),
    pendingMissionIds: new Set(),
    isOnboardingComplete: approvedProgress.starter.starterComplete,
    activePack: errandDeck,
    isHeatwaveDeckUnlocked: false,
    isSocalSummerUnlocked: false,
    isAdmin: false,
  });
  assert.equal(pool.reason, null);
  assert.equal(pool.eligibleMissions.length, 15);
});
