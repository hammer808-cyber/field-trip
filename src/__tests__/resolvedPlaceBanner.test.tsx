import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { ResolvedPlaceBanner } from '../components/ResolvedPlaceBanner';
import type { ResolvedPlace } from '../logic/placeResolution';

const read = (rel: string) => readFileSync(rel, 'utf8');

function specificPlace(): ResolvedPlace {
  return {
    name: 'Starling Diner',
    placeId: 'ChIJstarling',
    lat: 33.77,
    lng: -118.19,
    tier: 1,
    label: 'near you in Belmont Heights',
    city: 'Long Beach',
    county: 'Los Angeles County',
    neighbourhood: 'Belmont Heights',
    drawLat: 33.77,
    drawLng: -118.19,
  };
}

function genericPlace(): ResolvedPlace {
  return {
    name: 'a transit station',
    placeId: null,
    lat: null,
    lng: null,
    tier: 'generic',
    label: 'anywhere you are',
    city: null,
    county: null,
    neighbourhood: null,
    drawLat: 33.77,
    drawLng: -118.19,
  };
}

test('banner renders the specific resolved place big and bold, on the card', () => {
  const html = renderToStaticMarkup(<ResolvedPlaceBanner resolvedPlace={specificPlace()} />);
  assert.match(html, /data-testid="resolved-place-banner"/);
  assert.match(html, /Starling Diner/);
  assert.match(html, /near you in Belmont Heights/i);
  assert.match(html, /GO HERE/i);
  // Big display type for the place name: Bebas, 30px, black weight.
  assert.match(html, /font-display text-3xl font-black uppercase italic/);
  // Lime band, ink text: the Field Manual treatment, no footnote grey.
  assert.match(html, /bg-brand-lime/);
  assert.doesNotMatch(html, /text-on-surface\/60/);
});

test('banner renders the generic fallback honestly, not as a fake specific place', () => {
  const html = renderToStaticMarkup(<ResolvedPlaceBanner resolvedPlace={genericPlace()} />);
  assert.match(html, /a transit station/i);
  assert.match(html, /anywhere you are/i);
  assert.doesNotMatch(html, /near you in/i);
});

test('a long place name wraps instead of clipping', () => {
  const long = {
    ...specificPlace(),
    name: 'The Very Long Named Diner And Grill House Of Belmont Heights California',
  };
  const html = renderToStaticMarkup(<ResolvedPlaceBanner resolvedPlace={long} />);
  assert.match(html, /The Very Long Named Diner And Grill House Of Belmont Heights California/);
  assert.match(html, /break-words/);
  assert.doesNotMatch(html, /truncate/);
  assert.doesNotMatch(html, /whitespace-nowrap/);
});

test('no resolved place renders nothing', () => {
  assert.equal(renderToStaticMarkup(<ResolvedPlaceBanner resolvedPlace={null} />), '');
  assert.equal(renderToStaticMarkup(<ResolvedPlaceBanner resolvedPlace={undefined} />), '');
  assert.equal(
    renderToStaticMarkup(<ResolvedPlaceBanner resolvedPlace={{ ...specificPlace(), name: null }} />),
    '',
  );
});

test('banner text stays at the 12px floor: no sub-12px labels', () => {
  const source = read('src/components/ResolvedPlaceBanner.tsx');
  assert.doesNotMatch(source, /text-\[1-9]px/);
  assert.doesNotMatch(source, /text-\[10px\]/);
  assert.doesNotMatch(source, /\/40|\/50/);
  assert.doesNotMatch(source, /#[0-9a-fA-F]{3,8}\b/);
});

test('Deck.tsx passes the place into the card and the below-card footnote is gone', () => {
  const deck = read('src/pages/Deck.tsx');
  assert.match(deck, /resolvedPlace=\{displayedResolvedPlace\}/);
  // The old footnote: small centered mono line under MissionDecodedCard.
  assert.doesNotMatch(deck, /mt-4 text-center font-mono text-xs/);
  assert.doesNotMatch(deck, /getTierLabel/);
  // Freeze lift recorded.
  assert.match(deck, /ONE-OFF LIFT \(Nov 23, 2026, Zach's word — Urban Recon location line\)/);
});

test('MissionBriefing.tsx passes the place into the card and its footnote is gone', () => {
  const briefing = read('src/pages/MissionBriefing.tsx');
  assert.match(briefing, /resolvedPlace=\{resolvedPlace\}/);
  assert.doesNotMatch(briefing, /mt-4 text-center font-mono text-xs/);
  assert.doesNotMatch(briefing, /getTierLabel/);
  assert.doesNotMatch(briefing, /text-center font-mono text-xs font-black uppercase/);
});

test('MissionDecodedCard renders the banner only for location-adaptive cards', () => {
  const card = read('src/components/MissionDecodedCard.tsx');
  assert.match(card, /resolvedPlace\?: ResolvedPlace \| null/);
  assert.match(card, /resolvedPlace && isLocationAdaptiveCard\(mission\) && \(/);
  assert.match(card, /<ResolvedPlaceBanner resolvedPlace=\{resolvedPlace\} \/>/);
});

test('MissionCard renders the banner only for location-adaptive cards', () => {
  const card = read('src/components/ChallengeCard.tsx');
  assert.match(card, /resolvedPlace\?: ResolvedPlace \| null/);
  assert.match(card, /resolvedPlace && isLocationAdaptiveCard\(challenge\) && \(/);
  assert.match(card, /<ResolvedPlaceBanner resolvedPlace=\{resolvedPlace\} className="-mx-6 border-y-4 px-6" \/>/);
});
