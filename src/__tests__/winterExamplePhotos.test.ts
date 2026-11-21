import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { WINTER_CHALLENGE_BANK } from '../data/winterChallengeBank';
import { getMissionImage } from '../utils/missionImages';

/**
 * Winter example photos: every card in the Winter deck carries a real,
 * human-verified example photo (Wikimedia Commons, CC-licensed — credits
 * in docs/EXAMPLE_PHOTOS.md), and the card art function actually uses it.
 *
 * Each photo was checked by eye before wiring: it must show the card's
 * required subjects (paper snowflakes, a steaming bowl of soup, a
 * snowball fight in progress — not a lookalike). First picks that failed
 * that check were replaced; see docs/EXAMPLE_PHOTOS.md for the list.
 */
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

test('every Winter card has an example photo that exists on disk', () => {
  assert.equal(WINTER_CHALLENGE_BANK.length, 20, 'expected 20 Winter cards');
  for (const card of WINTER_CHALLENGE_BANK) {
    const image = (card as { image?: string }).image;
    assert.ok(image, `${card.id} has no image field`);
    assert.match(
      image as string,
      /^\/assets\/challenges\/winter-\d+\.jpg$/,
      `${card.id} image path is not a Winter challenge asset: ${image}`,
    );
    const onDisk = join(REPO_ROOT, 'public', (image as string).replace(/^\//, ''));
    assert.ok(existsSync(onDisk), `${card.id} image missing on disk: ${onDisk}`);
    assert.ok(readFileSync(onDisk).length > 20000, `${card.id} image is suspiciously small`);
  }
});

test('getMissionImage returns a supplied example photo unchanged', () => {
  assert.equal(getMissionImage('winter-01', 'Field Challenge', '/assets/challenges/winter-01.jpg'), '/assets/challenges/winter-01.jpg');
});

test('getMissionImage still generates badge art when no photo is supplied', () => {
  // holiday-01 (Gobble & Glow) carries no example photo by design, so the
  // generated badge is still the fallback.
  const art = getMissionImage('holiday-01', 'Field Challenge');
  assert.ok(art.startsWith('data:image/svg+xml;base64,'), `expected generated SVG art, got ${art.slice(0, 40)}`);
  assert.equal(getMissionImage('holiday-01', 'Field Challenge', undefined), art);
});
