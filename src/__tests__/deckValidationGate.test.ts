import assert from 'node:assert/strict';
import test from 'node:test';

import { ALL_CHALLENGE_CARDS } from '../data/allChallengeBanks';
import { getMissionBaseMaxScore } from '../logic/missionScoring';
import { isStarterScoringMission } from '../logic/proofRubric';

/**
 * The deck validation gate: every playable card must carry the full
 * canonical shape, so a deck can never again ship half-wired the way the
 * pre-Texas decks did (68 cards with no proofRequirements, 68 with no
 * shortPrompt, 3 starters with no mission/tags).
 *
 * This test reads the canonical registry (ALL_CHALLENGE_CARDS), so it
 * covers every deck — including any deck added later — with no edits.
 */
const CARDS = [...ALL_CHALLENGE_CARDS];

test('registry holds 98 unique cards across the six decks', () => {
  assert.equal(CARDS.length, 98, `expected 98 cards, got ${CARDS.length}`);
  const ids = CARDS.map(card => String(card.id));
  assert.equal(new Set(ids).size, ids.length, 'duplicate card ids in registry');
  const decks = new Set(CARDS.map(card => String(card.deckId)));
  assert.equal(decks.size, 6, `expected 6 decks, got ${[...decks].join(', ')}`);
});

test('every card carries the full canonical shape', () => {
  for (const card of CARDS) {
    const id = String(card.id);
    for (const field of ['title', 'description', 'shortPrompt', 'mission'] as const) {
      assert.ok(
        typeof card[field] === 'string' && (card[field] as string).trim().length > 0,
        `${id}: missing or empty ${field}`,
      );
    }
    assert.ok(Array.isArray(card.tags) && card.tags.length > 0, `${id}: missing tags`);
    assert.ok(
      ['easy', 'medium', 'hard'].includes(String(card.difficulty)),
      `${id}: bad difficulty ${String(card.difficulty)}`,
    );
    assert.ok(
      Number.isFinite(Number(card.baseXP)) && Number(card.baseXP) > 0,
      `${id}: missing or invalid baseXP`,
    );
    assert.ok(Array.isArray(card.proofType) && card.proofType.length > 0, `${id}: missing proofType`);
    assert.ok(
      card.status === 'approved' || card.status === 'active',
      `${id}: unexpected status ${String(card.status)}`,
    );
    assert.equal(card.active, true, `${id}: not active`);
  }
});

test('every card has proofRequirements the AI check can actually use', () => {
  for (const card of CARDS) {
    const id = String(card.id);
    const reqs = card.proofRequirements;
    assert.ok(reqs, `${id}: missing proofRequirements`);
    assert.ok(
      Array.isArray(reqs!.requiredSubjects) && reqs!.requiredSubjects.length > 0,
      `${id}: proofRequirements.requiredSubjects is empty`,
    );
    assert.ok(
      typeof reqs!.minConfidence === 'number' && reqs!.minConfidence > 0 && reqs!.minConfidence <= 1,
      `${id}: bad minConfidence ${String(reqs!.minConfidence)}`,
    );
    assert.equal(typeof reqs!.requireLocation, 'boolean', `${id}: requireLocation not a boolean`);
    assert.equal(typeof reqs!.requireTimestamp, 'boolean', `${id}: requireTimestamp not a boolean`);
  }
});

test('no card carries the retired lowercase point twins', () => {
  // baseXp / bonusXp were Heatwave-era duplicates: the live readers only
  // ever used baseXP, so the twins could be edited without changing a
  // thing. Jet Setter / Errand builder inputs are not card fields and
  // are unaffected by this check.
  for (const card of CARDS) {
    const keys = Object.keys(card as Record<string, unknown>);
    assert.ok(!keys.includes('baseXp'), `${String(card.id)}: retired baseXp field present`);
    assert.ok(!keys.includes('bonusXp'), `${String(card.id)}: retired bonusXp field present`);
  }
});

test('card-face points stay on the sane scale (multiples of 25, 100–250)', () => {
  for (const card of CARDS) {
    const xp = Number(card.baseXP);
    assert.ok(xp >= 100 && xp <= 250 && xp % 25 === 0, `${String(card.id)}: odd baseXP ${xp}`);
  }
});

test('live award rule is documented: starter 100, everything else 225', () => {
  // The live award path (missionScoring.getMissionBaseMaxScore, used by
  // both the pending estimate and the final approval in gameService)
  // awards a FLAT max by starter-vs-standard — it does not read the
  // card's baseXP. Card-face baseXP is display-only until that rule is
  // deliberately changed. This test pins the rule so a change is a
  // conscious decision, not an accident.
  for (const card of CARDS) {
    const expected = isStarterScoringMission(card as any) ? 100 : 225;
    assert.equal(
      getMissionBaseMaxScore(card as any),
      expected,
      `${String(card.id)}: live max should be ${expected}`,
    );
  }
  const starters = CARDS.filter(card => isStarterScoringMission(card as any));
  assert.equal(starters.length, 3, `expected 3 starter cards, got ${starters.length}`);
});
