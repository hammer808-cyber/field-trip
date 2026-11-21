import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ALL_CHALLENGE_CARDS } from '../data/allChallengeBanks';
import { PLAIN_CARD_COPY } from '../data/plainCardCopy';
import {
  getFrankieTitle,
  getFrankieDescription,
  getFrankieDirectionsArray,
  getFrankieFieldNotePrompt,
} from '../logic/frankieModeLogic';
import type { TripCard } from '../types/challenges';

// Reads the canonical registry, so any future deck is covered automatically.
const ALL_BANKS = [...ALL_CHALLENGE_CARDS] as TripCard[];

const ON = { frankieMode: true };
const OFF = { frankieMode: false };

test('every playable card has a plain-language entry', () => {
  assert.equal(ALL_BANKS.length, 113, `expected 113 playable cards, got ${ALL_BANKS.length}`);
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

test('Missions page: the Simple Words switch is a slim row at the bottom, visible in both states', () => {
  // Nov 20, 2026 (Zach's call): the switch used to sit above the deck and
  // only render while off, so turning it on made it vanish and it could
  // only be turned back off from Settings. It now lives at the very
  // bottom as one slim row, always rendered.
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const deckSource = fs.readFileSync(path.join(__dirname, '../pages/Deck.tsx'), 'utf8');
  assert.ok(deckSource.includes('<FrankieModeCard slim />'), 'expected the slim switch at the bottom of the Missions page');
  assert.ok(!deckSource.includes('{!frankieMode && ('), 'the switch must not hide when Simple Words is on');
  const cardSource = fs.readFileSync(path.join(__dirname, '../components/FrankieModeCard.tsx'), 'utf8');
  assert.ok(cardSource.includes('slim'), 'expected a slim variant on FrankieModeCard');
});
