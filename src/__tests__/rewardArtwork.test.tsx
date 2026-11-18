import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { fileURLToPath } from 'node:url';
import { RewardArtwork } from '../components/RewardFeedback';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');

const FALLBACK = <span className="fallback-icon">icon</span>;

test('RewardArtwork renders the sticker art when an imageUrl is present', () => {
  const html = renderToStaticMarkup(
    <RewardArtwork
      imageUrl="/assets/stickers/mascota/victory-flag.png"
      alt="Victory Flag"
      imgClassName="h-28 w-28 object-contain"
      fallback={FALLBACK}
    />,
  );
  assert.match(html, /<img/);
  assert.match(html, /src="\/assets\/stickers\/mascota\/victory-flag\.png"/);
  assert.match(html, /alt="Victory Flag"/);
  assert.doesNotMatch(html, /fallback-icon/);
});

test('RewardArtwork falls back to the icon when there is no imageUrl', () => {
  const html = renderToStaticMarkup(
    <RewardArtwork alt="Victory Flag" imgClassName="h-28 w-28 object-contain" fallback={FALLBACK} />,
  );
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /fallback-icon/);
});

test('Proud Pulsator decal: the Field Pulse reward carries real art', () => {
  // Nov 17, 2026: the Pulsator modal showed a plain lime square + Activity
  // icon because the reward was queued with no imageUrl — the "weird little
  // square" from the test profile. The decal now has art, and the reward
  // must point at it, or the modal regresses to the square.
  const context = fs.readFileSync(path.join(root, 'src/context/AppContext.tsx'), 'utf8');
  assert.match(context, /rewardText: "PROUD PULSATOR DECAL UNLOCKED"/);
  assert.match(context, /imageUrl: '\/assets\/decals\/proud-pulsator\.png'/);
  const art = fs.readFileSync(path.join(root, 'public/assets/decals/proud-pulsator.png'));
  assert.ok(art.length > 20000, 'decal art missing or suspiciously small');
  // PNG signature + real transparency (RGBA, transparent corners) — the
  // check that would have caught a flat white-background export.
  assert.deepEqual([...art.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.equal(art[25], 6, 'decal must be RGBA (color type 6) so the lime shows around the die-cut');
});
