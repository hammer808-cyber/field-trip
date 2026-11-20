import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { ERRAND_DECK_CHALLENGE_BANK } from '../data/errandDeckChallengeBank';
import { getMissionImage } from '../utils/missionImages';

/**
 * Errand Deck example photos: every card in the Errand Deck carries a real,
 * human-verified example photo (Wikimedia Commons, CC-licensed — credits
 * in docs/EXAMPLE_PHOTOS-errand.md), and the card art function actually uses it.
 *
 * Each photo was checked by eye before wiring: it must show the card's
 * required subjects (a supermarket aisle, carts littered across a parking
 * lot, a receipt — not a lookalike). Two first picks failed that check (a
 * shopping cart mislabeled as a market basket for One Thing, Allegedly, and
 * a stack of empty red baskets for the same card) and were replaced.
 */
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

test('every Errand Deck card has an example photo that exists on disk', () => {
  assert.equal(ERRAND_DECK_CHALLENGE_BANK.length, 15, 'expected 15 Errand Deck cards');
  for (const card of ERRAND_DECK_CHALLENGE_BANK) {
    const image = (card as { image?: string }).image;
    assert.ok(image, `${card.id} has no image field`);
    assert.match(
      image as string,
      /^\/assets\/challenges\/errand-deck-\d+\.jpg$/,
      `${card.id} image path is not an Errand Deck challenge asset: ${image}`,
    );
    const onDisk = join(REPO_ROOT, 'public', (image as string).replace(/^\//, ''));
    assert.ok(existsSync(onDisk), `${card.id} image missing on disk: ${onDisk}`);
    assert.ok(readFileSync(onDisk).length > 20000, `${card.id} image is suspiciously small`);
  }
});

test('getMissionImage returns a supplied example photo unchanged', () => {
  assert.equal(getMissionImage('errand-deck-01', 'Field Challenge', '/assets/challenges/errand-deck-01.jpg'), '/assets/challenges/errand-deck-01.jpg');
});

test('getMissionImage still generates badge art when no photo is supplied', () => {
  const art = getMissionImage('socal-01', 'Field Challenge');
  assert.ok(art.startsWith('data:image/svg+xml;base64,'), `expected generated SVG art, got ${art.slice(0, 40)}`);
  assert.equal(getMissionImage('socal-01', 'Field Challenge', undefined), art);
});
