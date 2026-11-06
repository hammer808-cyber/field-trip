import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { TEXAS_CHALLENGE_BANK } from '../data/texasChallengeBank';
import { getMissionImage } from '../utils/missionImages';

/**
 * Texas example photos: every card in the Texas deck carries a real,
 * human-verified example photo (Wikimedia Commons, CC-licensed — credits
 * in docs/EXAMPLE_PHOTOS.md), and the card art function actually uses it.
 *
 * Each photo was checked by eye before wiring: it must show the card's
 * required subjects (a taco truck, the Lone Star flag, a smoker — not a
 * lookalike). Three first picks failed that check (a scanned document, a
 * welcome sign with no "y'all", a green flag that wasn't the Texas flag)
 * and were replaced.
 */
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

test('every Texas card has an example photo that exists on disk', () => {
  assert.equal(TEXAS_CHALLENGE_BANK.length, 15, 'expected 15 Texas cards');
  for (const card of TEXAS_CHALLENGE_BANK) {
    const image = (card as { image?: string }).image;
    assert.ok(image, `${card.id} has no image field`);
    assert.match(
      image as string,
      /^\/assets\/challenges\/texas-\d+\.jpg$/,
      `${card.id} image path is not a Texas challenge asset: ${image}`,
    );
    const onDisk = join(REPO_ROOT, 'public', (image as string).replace(/^\//, ''));
    assert.ok(existsSync(onDisk), `${card.id} image missing on disk: ${onDisk}`);
    assert.ok(readFileSync(onDisk).length > 20000, `${card.id} image is suspiciously small`);
  }
});

test('getMissionImage returns a supplied example photo unchanged', () => {
  assert.equal(getMissionImage('texas-01', 'Field Challenge', '/assets/challenges/texas-01.jpg'), '/assets/challenges/texas-01.jpg');
});

test('getMissionImage still generates badge art when no photo is supplied', () => {
  const art = getMissionImage('socal-01', 'Field Challenge');
  assert.ok(art.startsWith('data:image/svg+xml;base64,'), `expected generated SVG art, got ${art.slice(0, 40)}`);
  assert.equal(getMissionImage('socal-01', 'Field Challenge', undefined), art);
});
