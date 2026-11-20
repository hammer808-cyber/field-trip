import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { SOCAL_SUMMER_CHALLENGE_BANK } from '../data/socalSummerChallengeBank';
import { getMissionImage } from '../utils/missionImages';

/**
 * SoCal Summer example photos: every card in the SoCal Summer deck carries
 * a real, human-verified example photo (Wikimedia Commons, CC-licensed —
 * credits in docs/EXAMPLE_PHOTOS-socal.md), and the card art function
 * actually uses it.
 *
 * Each photo was checked by eye before wiring: it must show the card's
 * required subjects (an ice cream cone on a boardwalk, a Little Free
 * Library, a lighthouse — not a lookalike). Six first picks failed that
 * check and were replaced: a sealed 85C cup with no iced coffee visible
 * for Cold Brew Trail, an observatory building for Extreme Shadows, a
 * night street scene whose long shadow falls under a streetlight for
 * Extreme Shadows, a Pattaya beachfront street scene whose shadows were
 * incidental for Extreme Shadows, a backlit rickshaw silhouette (no cast
 * shadow) for Extreme Shadows, and the LA beach bike path shot dominated
 * by a power plant for The Bike Path Scout.
 */
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

test('every SoCal Summer card has an example photo that exists on disk', () => {
  assert.equal(SOCAL_SUMMER_CHALLENGE_BANK.length, 15, 'expected 15 SoCal Summer cards');
  for (const card of SOCAL_SUMMER_CHALLENGE_BANK) {
    const image = (card as { image?: string }).image;
    assert.ok(image, `${card.id} has no image field`);
    assert.match(
      image as string,
      /^\/assets\/challenges\/socal-\d+\.jpg$/,
      `${card.id} image path is not a SoCal Summer challenge asset: ${image}`,
    );
    const onDisk = join(REPO_ROOT, 'public', (image as string).replace(/^\//, ''));
    assert.ok(existsSync(onDisk), `${card.id} image missing on disk: ${onDisk}`);
    assert.ok(readFileSync(onDisk).length > 20000, `${card.id} image is suspiciously small`);
  }
});

test('getMissionImage returns a supplied SoCal Summer example photo unchanged', () => {
  assert.equal(getMissionImage('socal-01', 'Field Challenge', '/assets/challenges/socal-01.jpg'), '/assets/challenges/socal-01.jpg');
});
