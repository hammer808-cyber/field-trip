import assert from 'node:assert/strict';
import test from 'node:test';

import { STARTER_MISSION_BANK } from '../data/starterMissionBank';
import { SOCAL_SUMMER_CHALLENGE_BANK } from '../data/socalSummerChallengeBank';
import { HEATWAVE_CHALLENGE_BANK } from '../data/heatwaveChallengeBank';
import { JET_SETTER_CHALLENGE_BANK } from '../data/jetSetterChallengeBank';
import { ERRAND_DECK_CHALLENGE_BANK } from '../data/errandDeckChallengeBank';
import { PLAIN_CARD_COPY } from '../data/plainCardCopy';
import {
  getFrankieTitle,
  getFrankieDescription,
  getFrankieDirectionsArray,
  getFrankieFieldNotePrompt,
} from '../logic/frankieModeLogic';
import type { TripCard } from '../types/challenges';

const ALL_BANKS = [
  ...STARTER_MISSION_BANK,
  ...SOCAL_SUMMER_CHALLENGE_BANK,
  ...HEATWAVE_CHALLENGE_BANK,
  ...JET_SETTER_CHALLENGE_BANK,
  ...ERRAND_DECK_CHALLENGE_BANK,
] as TripCard[];

const ON = { frankieMode: true };
const OFF = { frankieMode: false };

test('every playable card has a plain-language entry', () => {
  assert.equal(ALL_BANKS.length, 83, `expected 83 playable cards, got ${ALL_BANKS.length}`);
  for (const card of ALL_BANKS) {
    const copy = PLAIN_CARD_COPY[card.id as string];
    assert.ok(copy, `missing plain copy for ${card.id} (${card.title})`);
    assert.ok(copy.plainTitle.trim().length > 0, `${card.id}: empty plainTitle`);
    assert.ok(copy.plainDescription.trim().length > 0, `${card.id}: empty plainDescription`);
    assert.ok(copy.plainFieldNotePrompt.trim().length > 0, `${card.id}: empty plainFieldNotePrompt`);
    const steps = copy.plainDirections.split('\n').filter(Boolean);
    assert.equal(steps.length, 3, `${card.id}: plainDirections must be 3 steps, got ${steps.length}`);
  }
});

test('registry has no orphan entries', () => {
  const ids = new Set(ALL_BANKS.map(c => c.id as string));
  for (const id of Object.keys(PLAIN_CARD_COPY)) {
    assert.ok(ids.has(id), `plain copy exists for unknown card ${id}`);
  }
});

test('frankie mode returns plain copy; normal mode returns flavor copy', () => {
  for (const card of ALL_BANKS) {
    const copy = PLAIN_CARD_COPY[card.id as string];
    assert.equal(getFrankieTitle(card, ON), copy.plainTitle, `${card.id}: title`);
    assert.equal(getFrankieDescription(card, ON), copy.plainDescription, `${card.id}: description`);
    assert.deepEqual(getFrankieDirectionsArray(card, ON), copy.plainDirections.split('\n'), `${card.id}: directions`);
    assert.equal(getFrankieFieldNotePrompt(card, ON), copy.plainFieldNotePrompt, `${card.id}: note prompt`);
    assert.equal(getFrankieTitle(card, OFF), card.title, `${card.id}: flavor title when off`);
  }
});

test('plain titles stay short and concrete (max 6 words)', () => {
  for (const [id, copy] of Object.entries(PLAIN_CARD_COPY)) {
    const words = copy.plainTitle.trim().split(/\s+/);
    assert.ok(words.length <= 6, `${id}: plainTitle "${copy.plainTitle}" has ${words.length} words`);
  }
});
