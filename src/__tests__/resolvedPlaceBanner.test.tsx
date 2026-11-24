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
  assert.match(card, /<ResolvedPlaceBanner resolvedPlace=\{resolvedPlace\} onRetryPlace=\{onRetryPlace\} \/>/);
});

test('MissionCard renders the banner only for location-adaptive cards', () => {
  const card = read('src/components/ChallengeCard.tsx');
  assert.match(card, /resolvedPlace\?: ResolvedPlace \| null/);
  assert.match(card, /resolvedPlace && isLocationAdaptiveCard\(challenge\) && \(/);
  assert.match(card, /<ResolvedPlaceBanner resolvedPlace=\{resolvedPlace\} onRetryPlace=\{onRetryPlace\} className="-mx-6 border-y-4 px-6" \/>/);
});

test('retry button appears only on a generic banner that has a retry callback', () => {
  const retry = () => {};
  const generic = renderToStaticMarkup(
    <ResolvedPlaceBanner resolvedPlace={genericPlace()} onRetryPlace={retry} />,
  );
  assert.match(generic, /data-testid="retry-place-button"/);
  assert.match(generic, /Find a place/);
  // A resolved place never offers the retry, even with a callback.
  const specific = renderToStaticMarkup(
    <ResolvedPlaceBanner resolvedPlace={specificPlace()} onRetryPlace={retry} />,
  );
  assert.doesNotMatch(specific, /retry-place-button/);
  assert.doesNotMatch(specific, /Find a place/);
  // A generic banner with no callback has nothing to tap.
  const noCallback = renderToStaticMarkup(<ResolvedPlaceBanner resolvedPlace={genericPlace()} />);
  assert.doesNotMatch(noCallback, /retry-place-button/);
});

test('retry that finds a place swaps the banner: generic shows the button, resolved shows the place', () => {
  const retry = () => {};
  const before = renderToStaticMarkup(
    <ResolvedPlaceBanner resolvedPlace={genericPlace()} onRetryPlace={retry} />,
  );
  assert.match(before, /a transit station/i);
  assert.match(before, /Find a place/);
  // The live subscription re-renders the banner with the new place.
  const after = renderToStaticMarkup(
    <ResolvedPlaceBanner resolvedPlace={specificPlace()} onRetryPlace={retry} />,
  );
  assert.match(after, /Starling Diner/);
  assert.doesNotMatch(after, /Find a place/);
  assert.doesNotMatch(after, /retry-place-button/);
});

test('retry that stays generic keeps the honest wording', () => {
  const retry = () => {};
  const html = renderToStaticMarkup(
    <ResolvedPlaceBanner resolvedPlace={genericPlace()} onRetryPlace={retry} />,
  );
  assert.match(html, /a transit station/i);
  assert.match(html, /anywhere you are/i);
  assert.doesNotMatch(html, /near you in/i);
});

test('resolving state reads "Looking nearby" and disables the button', () => {
  const source = read('src/components/ResolvedPlaceBanner.tsx');
  assert.match(source, /Looking nearby/);
  assert.match(source, /disabled=\{resolving\}/);
  // The resolving label is set from state, not a second button.
  assert.doesNotMatch(source, /data-testid="retry-place-resolving"/);
});

test('retry copy has no em dash', () => {
  const retry = () => {};
  const html = renderToStaticMarkup(
    <ResolvedPlaceBanner resolvedPlace={genericPlace()} onRetryPlace={retry} />,
  );
  assert.doesNotMatch(html, /—/);
});

test('Deck.tsx wires the retry into the revealed card and records the lift', () => {
  const deck = read('src/pages/Deck.tsx');
  assert.match(deck, /retryPlaceResolution/);
  assert.match(deck, /onRetryPlace=\{displayedMission \? \(\) => retryPlaceResolution\(displayedMission\) : undefined\}/);
  assert.match(deck, /ONE-OFF LIFT \(Nov 23, 2026, Zach's word — Urban Recon place retry\)/);
});

test('MissionBriefing.tsx wires the retry into the briefing card', () => {
  const briefing = read('src/pages/MissionBriefing.tsx');
  assert.match(briefing, /retryPlaceResolution/);
  assert.match(briefing, /onRetryPlace=\{\(\) => retryPlaceResolution\(mission\)\}/);
});
