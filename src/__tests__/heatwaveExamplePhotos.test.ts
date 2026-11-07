import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { HEATWAVE_CHALLENGE_BANK } from '../data/heatwaveChallengeBank';
import { getMissionImage } from '../utils/missionImages';

/**
 * Heatwave example photos: every card in the Heatwave Receipts deck carries
 * a real, human-verified example photo (Wikimedia Commons, CC-licensed —
 * credits in docs/EXAMPLE_PHOTOS.md), and the card art function actually
 * uses it.
 *
 * Each photo was checked by eye before wiring: it must show the card's
 * required subjects (a wilted sunflower, a store receipt, dogs at a
 * window — not a lookalike). Nine first picks failed that check and were
 * replaced: a scanned bacteria book page for Heat Signature, a palace
 * facade for Proof of Brief Existence, a paper mill for Tiny Victory
 * Receipt, a book cover scan for Snack Council Minutes, a 17th-century
 * painting for Tiny Witness, a street scene shot from the sidewalk for
 * Passenger Seat Prophecy, a scanned book of speeches for The Quick Stop
 * Lied, a traffic-model diagram for The Plot Has Thickened, and a USDA
 * document cover for Aftermath Exhibit A.
 */
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

test('every Heatwave card has an example photo that exists on disk', () => {
  assert.equal(HEATWAVE_CHALLENGE_BANK.length, 25, 'expected 25 Heatwave cards');
  for (const card of HEATWAVE_CHALLENGE_BANK) {
    const image = (card as { image?: string }).image;
    assert.ok(image, `${card.id} has no image field`);
    assert.match(
      image as string,
      /^\/assets\/challenges\/heatwave-\d+\.jpg$/,
      `${card.id} image path is not a Heatwave challenge asset: ${image}`,
    );
    const onDisk = join(REPO_ROOT, 'public', (image as string).replace(/^\//, ''));
    assert.ok(existsSync(onDisk), `${card.id} image missing on disk: ${onDisk}`);
    assert.ok(readFileSync(onDisk).length > 20000, `${card.id} image is suspiciously small`);
  }
});

test('getMissionImage returns a supplied Heatwave example photo unchanged', () => {
  assert.equal(getMissionImage('heatwave-01', 'Field Challenge', '/assets/challenges/heatwave-01.jpg'), '/assets/challenges/heatwave-01.jpg');
});
