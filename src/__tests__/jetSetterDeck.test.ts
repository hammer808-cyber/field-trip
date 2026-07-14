import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { getDeckPackById } from '../data/deckPacks';
import {
  JET_SETTER_CHALLENGE_BANK,
  JET_SETTER_DECK_ID,
  JET_SETTER_DECK_NAME,
  JET_SETTER_DECK_SUBTITLE,
  JET_SETTER_SAFETY_NOTE,
  JET_SETTER_SEASON,
} from '../data/jetSetterChallengeBank';
import { getDeckAccess } from '../logic/deckAccess';
import { getEligibleDrawPool } from '../logic/deckLogic';
import { buildCanonicalProgress, getDeckProgress } from '../services/canonicalProgress';
import { Entry } from '../types/game';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const jetSetterDeck = getDeckPackById(JET_SETTER_DECK_ID);

function starterEntry(missionId: string, status: Entry['status']): Entry {
  return {
    id: `entry-${missionId}`,
    entryId: `entry-${missionId}`,
    uid: 'user-1',
    userId: 'user-1',
    displayName: 'Jet Setter Tester',
    username: 'jet-setter-tester',
    challengeId: missionId,
    missionId,
    tripId: missionId,
    deckId: 'starter-signals',
    status,
    createdAt: null as any,
    updatedAt: null as any,
  } as Entry;
}

test('Jet Setter deck metadata and artwork are registered', () => {
  assert.ok(jetSetterDeck);
  assert.equal(jetSetterDeck.deckId, JET_SETTER_DECK_ID);
  assert.equal(jetSetterDeck.deckName, JET_SETTER_DECK_NAME);
  assert.equal(jetSetterDeck.packName, JET_SETTER_DECK_NAME);
  assert.equal(jetSetterDeck.deckSubtitle, JET_SETTER_DECK_SUBTITLE);
  assert.equal(jetSetterDeck.season, JET_SETTER_SEASON);
  assert.equal(jetSetterDeck.status, 'active');
  assert.equal(jetSetterDeck.deckType, 'evergreen-travel');
  assert.equal(jetSetterDeck.requiredUnlock, 'starter-complete');
  assert.equal(jetSetterDeck.requiredStarterApprovals, 3);
  assert.equal(jetSetterDeck.totalCards, 25);
  assert.deepEqual(jetSetterDeck.requiredCompletedDeckIds, ['starter-signals']);
  assert.equal(jetSetterDeck.missionIds.length, 25);

  const artworkPath = path.join(root, 'public', 'assets', 'decks', 'jet-setter.jpg');
  assert.ok(fs.existsSync(artworkPath));
  assert.ok(fs.statSync(artworkPath).size > 50_000);
});

test('Jet Setter has 25 unique cards in the required branded distribution', () => {
  assert.equal(JET_SETTER_CHALLENGE_BANK.length, 25);
  assert.equal(new Set(JET_SETTER_CHALLENGE_BANK.map(card => card.id)).size, 25);

  const counts = JET_SETTER_CHALLENGE_BANK.reduce<Record<string, number>>((result, card) => {
    result[String(card.cardType)] = (result[String(card.cardType)] || 0) + 1;
    return result;
  }, {});

  assert.deepEqual(counts, {
    Signal: 6,
    Proof: 5,
    Crew: 5,
    Receipt: 5,
    Lore: 4,
  });
});

test('every Jet Setter card exposes the canonical mission and safety fields', () => {
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

  JET_SETTER_CHALLENGE_BANK.forEach(card => {
    requiredStringFields.forEach(field => {
      assert.equal(typeof card[field], 'string', `${card.id}.${field} must be a string`);
      assert.ok(String(card[field]).trim(), `${card.id}.${field} must not be empty`);
    });
    assert.equal(card.deckId, JET_SETTER_DECK_ID);
    assert.equal(card.deckName, JET_SETTER_DECK_NAME);
    assert.equal(card.deckSubtitle, JET_SETTER_DECK_SUBTITLE);
    assert.equal(card.season, JET_SETTER_SEASON);
    assert.equal(card.safetyNote, JET_SETTER_SAFETY_NOTE);
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

test('pending Starter submissions do not unlock Jet Setter', () => {
  assert.ok(jetSetterDeck);
  const pendingProgress = buildCanonicalProgress({
    userId: 'user-1',
    profile: { id: 'user-1' } as any,
    entries: ['starter-1', 'starter-2', 'starter-3'].map(id => starterEntry(id, 'pending_review')),
    pendingEntries: [],
  });
  const starterProgress = getDeckProgress(pendingProgress, 'starter-signals');
  assert.equal(starterProgress.approvedCount, 0);

  const access = getDeckAccess(jetSetterDeck, {
    userId: 'user-1',
    profile: { id: 'user-1' },
    completedDeckIds: [],
  });
  assert.equal(access.visible, true);
  assert.equal(access.playable, false);

  const pool = getEligibleDrawPool({
    missions: JET_SETTER_CHALLENGE_BANK as any[],
    completedMissionIds: new Set(),
    pendingMissionIds: new Set(['starter-1', 'starter-2', 'starter-3']),
    isOnboardingComplete: pendingProgress.starter.starterComplete,
    activePack: jetSetterDeck,
    isHeatwaveDeckUnlocked: false,
    isSocalSummerUnlocked: false,
    isAdmin: false,
  });
  assert.equal(pool.reason, 'starter_locked');
  assert.equal(pool.eligibleMissions.length, 0);
});

test('three approved Starter Signals unlock all 25 Jet Setter cards', () => {
  assert.ok(jetSetterDeck);
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

  const access = getDeckAccess(jetSetterDeck, {
    userId: 'user-1',
    profile: { id: 'user-1' },
    completedDeckIds,
  });
  assert.equal(approvedProgress.starter.starterComplete, true);
  assert.equal(access.playable, true);

  const pool = getEligibleDrawPool({
    missions: JET_SETTER_CHALLENGE_BANK as any[],
    completedMissionIds: new Set(),
    pendingMissionIds: new Set(),
    isOnboardingComplete: approvedProgress.starter.starterComplete,
    activePack: jetSetterDeck,
    isHeatwaveDeckUnlocked: false,
    isSocalSummerUnlocked: false,
    isAdmin: false,
  });
  assert.equal(pool.reason, null);
  assert.equal(pool.eligibleMissions.length, 25);
});
