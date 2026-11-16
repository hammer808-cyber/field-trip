import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { RewardArtwork } from '../components/RewardFeedback';

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
