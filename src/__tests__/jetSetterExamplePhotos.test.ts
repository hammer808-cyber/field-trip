import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { JET_SETTER_CHALLENGE_BANK } from '../data/jetSetterChallengeBank';
import { getMissionImage } from '../utils/missionImages';

/**
 * Jet Setter example photos: every card in the Jet Setter deck carries a
 * real, human-verified example photo (Wikimedia Commons, CC-licensed —
 * credits in docs/EXAMPLE_PHOTOS.md), and the card art function actually
 * uses it.
 *
 * Each photo was checked by eye before wiring: it must show the card's
 * required subjects (a towel-guarding dog, a pool ringed with lounge
 * chairs, sunscreen going on a face — not a lookalike). Thirteen first
 * picks failed that check and were replaced: a scanned FBI document page
 * for Vacation Behavior Detected, a "Country Lawyer" book cover for Pool
 * Chair Politics, a blank red book cover for Beach Episode Unlocked, a
 * Morro Bay beach-cleanup crew for SPF Witness Statement, a pool table in
 * a library for Main Character at the Pool Bar, a blank red book cover for
 * Snack Council, a "Forest Friends" book cover illustration for Group Chat
 * on Island Time, a "Pool of Flame" book cover for Lounging Committee, a
 * flat vector illustration of a family with suitcases for Luggage of
 * Consequences, a photography color-checker card for Room Key to the
 * Kingdom, a "Woman of Thirty" book cover for Frozen Drink Documentation,
 * a "Vagabond in the Caucasus" book cover for Travel Snack Manifest, and a
 * "Church on Wheels" book cover for The Itinerary Has Left the Chat.
 */
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

test('every Jet Setter card has an example photo that exists on disk', () => {
  assert.equal(JET_SETTER_CHALLENGE_BANK.length, 25, 'expected 25 Jet Setter cards');
  for (const card of JET_SETTER_CHALLENGE_BANK) {
    const image = (card as { image?: string }).image;
    assert.ok(image, `${card.id} has no image field`);
    assert.match(
      image as string,
      /^\/assets\/challenges\/jet-setter-\d+\.jpg$/,
      `${card.id} image path is not a Jet Setter challenge asset: ${image}`,
    );
    const onDisk = join(REPO_ROOT, 'public', (image as string).replace(/^\//, ''));
    assert.ok(existsSync(onDisk), `${card.id} image missing on disk: ${onDisk}`);
    assert.ok(readFileSync(onDisk).length > 20000, `${card.id} image is suspiciously small`);
  }
});

test('getMissionImage returns a supplied Jet Setter example photo unchanged', () => {
  assert.equal(getMissionImage('jet-setter-01', 'Field Challenge', '/assets/challenges/jet-setter-01.jpg'), '/assets/challenges/jet-setter-01.jpg');
});
