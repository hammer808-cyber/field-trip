import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { STARTER_MISSION_BANK } from '../data/starterMissionBank';
import { getMissionImage } from '../utils/missionImages';

/**
 * Starter Signals example photos: every starter card carries a real,
 * human-verified example photo (Wikimedia Commons, CC-licensed — credits
 * in docs/EXAMPLE_PHOTOS-starter.md), and the card art function actually
 * uses it. These are the first three missions every new player sees, so
 * the photos matter most here.
 *
 * Each photo was checked by eye before wiring: it must show the card's
 * required subjects (a vibrant flower against blue sky, a summer snack,
 * a shady park bench — not a lookalike). Two first picks failed that
 * check (a shady bench shot dominated by a brick apartment block, and an
 * ice-cream-cone shot that centered on a young girl rather than the snack)
 * and were replaced.
 */
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

test('every starter card has an example photo that exists on disk', () => {
  assert.equal(STARTER_MISSION_BANK.length, 3, 'expected 3 starter cards');
  for (const card of STARTER_MISSION_BANK) {
    const image = (card as { image?: string }).image;
    assert.ok(image, `${card.id} has no image field`);
    assert.match(
      image as string,
      /^\/assets\/challenges\/starter-\d+\.jpg$/,
      `${card.id} image path is not a starter challenge asset: ${image}`,
    );
    const onDisk = join(REPO_ROOT, 'public', (image as string).replace(/^\//, ''));
    assert.ok(existsSync(onDisk), `${card.id} image missing on disk: ${onDisk}`);
    assert.ok(readFileSync(onDisk).length > 20000, `${card.id} image is suspiciously small`);
  }
});

test('getMissionImage returns a supplied example photo unchanged', () => {
  assert.equal(getMissionImage('starter-1', 'Onboarding', '/assets/challenges/starter-1.jpg'), '/assets/challenges/starter-1.jpg');
});

test('getMissionImage still generates badge art when no photo is supplied', () => {
  const art = getMissionImage('socal-01', 'Field Challenge');
  assert.ok(art.startsWith('data:image/svg+xml;base64,'), `expected generated SVG art, got ${art.slice(0, 40)}`);
  assert.equal(getMissionImage('socal-01', 'Field Challenge', undefined), art);
});
