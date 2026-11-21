import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { DECALS, hasEarnedDecal } from '../data/decals';
import { DecalShelf } from '../components/stickers/DecalShelf';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

test('decal shelf: the registry holds exactly the one decal that exists (Nov 20, 2026)', () => {
  assert.equal(DECALS.length, 1);
  const [decal] = DECALS;
  assert.equal(decal.id, 'proud-pulsator');
  assert.equal(decal.name, 'Proud Pulsator');
  assert.equal(decal.imageUrl, '/assets/decals/proud-pulsator.png');
  assert.match(decal.howToEarn, /5 actions/);
  // The art file is real and is a PNG.
  const art = readFileSync(join(repoRoot, 'public/assets/decals/proud-pulsator.png'));
  assert.deepEqual([...art.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
});

test('decal shelf: Proud Pulsator is earned by completing a Field Pulse week', () => {
  assert.equal(hasEarnedDecal(null, 'proud-pulsator'), false);
  assert.equal(hasEarnedDecal({}, 'proud-pulsator'), false);
  assert.equal(hasEarnedDecal({ fieldPulse: null }, 'proud-pulsator'), false);
  assert.equal(hasEarnedDecal({ fieldPulse: { pulseStreak: 0 } }, 'proud-pulsator'), false);
  assert.equal(hasEarnedDecal({ fieldPulse: { pulseStreak: 1 } }, 'proud-pulsator'), true);
  assert.equal(hasEarnedDecal({ fieldPulse: { pulseStreak: 0, lastPulseCompletedWeek: '2026-W47' } }, 'proud-pulsator'), true);
  // Unknown decal ids are never earned.
  assert.equal(hasEarnedDecal({ fieldPulse: { pulseStreak: 3 } }, 'no-such-decal'), false);
});

test('decal shelf: the shelf renders the decal locked and unlocked (Nov 20, 2026)', () => {
  const locked = renderToStaticMarkup(React.createElement(DecalShelf, { profile: null }));
  assert.match(locked, /Proud Pulsator/);
  assert.match(locked, /0 of 1 earned/);
  assert.match(locked, /Complete 5 actions in one Field Pulse week/);
  assert.match(locked, /grayscale brightness-0 opacity-20/);
  assert.match(locked, /Proud Pulsator, locked/);

  const unlocked = renderToStaticMarkup(
    React.createElement(DecalShelf, { profile: { fieldPulse: { pulseStreak: 2 } } }),
  );
  assert.match(unlocked, /1 of 1 earned/);
  assert.match(unlocked, /Proud Pulsator, unlocked/);
  assert.match(unlocked, /Earned/);
  assert.doesNotMatch(unlocked, /grayscale brightness-0 opacity-20/);
});

test('decal shelf: the Dex Stickers tab renders the shelf and counts decals in the hero (Nov 20, 2026)', () => {
  const collection = read('src/pages/Collection.tsx');
  assert.match(collection, /<DecalShelf profile=\{profile\} \/>/);
  assert.match(collection, /allSkins\.length \+ DECALS\.length/);
  assert.match(collection, /hasEarnedDecal\(profile, decal\.id\)/);
});
