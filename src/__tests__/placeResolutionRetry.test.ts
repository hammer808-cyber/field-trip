/**
 * Urban Recon place retry (Nov 23, 2026, Zach's report): a card stuck
 * on the generic fallback ("anywhere you are") had no way back to a
 * real place, because resolution ran once per draw and the server's
 * reason was dropped by the client. Covers the outcome the resolver
 * now returns (place + reason + GPS flag), the single-flight retry
 * guard, and the wiring that persists the diagnosis on the drawn card
 * doc next to the place.
 *
 * The service test stubs navigator.geolocation and global fetch; the
 * Firebase auth path is inert in Node (no signed-in user, no App
 * Check), so authenticatedFetch just calls the stubbed fetch.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createPlaceRetryRunner } from '../components/ResolvedPlaceBanner';
import { resolvePlaceForDraw } from '../services/placeResolutionService';
import type { ChallengeCard } from '../types/challenges';

const read = (rel: string) => readFileSync(rel, 'utf8');

const slottedCard = {
  id: 'urban-02',
  mission: 'Photograph the holiday lights on {place}.',
  description: 'Find the building doing the most.',
  shortPrompt: 'Photograph the lights on {place}.',
  locationAdaptive: {
    action: 'Photograph the lights',
    token: 'lights',
    genericDefault: 'the brightest building nearby',
    placeQuery: { googleType: 'tourist_attraction' },
  },
} as unknown as Partial<ChallengeCard>;

const unslottedCard = {
  id: 'urban-05',
  locationAdaptive: {
    action: 'Catch the rush',
    token: 'rush',
    genericDefault: 'a transit stop',
  },
} as unknown as Partial<ChallengeCard>;

const originalNavigator = globalThis.navigator;
const originalFetch = globalThis.fetch;

function stubGps(lat = 33.77, lng = -118.19): void {
  Object.defineProperty(globalThis, 'navigator', {
    value: {
      geolocation: {
        getCurrentPosition: (ok: (pos: { coords: { latitude: number; longitude: number } }) => void) =>
          ok({ coords: { latitude: lat, longitude: lng } }),
      },
    },
    configurable: true,
    writable: true,
  });
}

function stubNoGps(): void {
  Object.defineProperty(globalThis, 'navigator', {
    value: {},
    configurable: true,
    writable: true,
  });
}

function stubFetch(body: unknown, ok = true): void {
  (globalThis as { fetch: unknown }).fetch = async () => ({
    ok,
    json: async () => body,
  });
}

function stubFetchThrows(): void {
  (globalThis as { fetch: unknown }).fetch = async () => {
    throw new Error('network down');
  };
}

function restore(): void {
  Object.defineProperty(globalThis, 'navigator', {
    value: originalNavigator,
    configurable: true,
    writable: true,
  });
  globalThis.fetch = originalFetch;
}

test('GPS denied: generic place, reason gps_unavailable, gps flag false', async () => {
  stubNoGps();
  try {
    const outcome = await resolvePlaceForDraw(slottedCard);
    assert.ok(outcome);
    assert.equal(outcome.resolvedPlace.tier, 'generic');
    assert.equal(outcome.resolvedPlace.name, 'the brightest building nearby');
    assert.equal(outcome.reason, 'gps_unavailable');
    assert.equal(outcome.gpsAvailable, false);
    assert.equal(outcome.resolvedPlace.drawLat, null);
  } finally {
    restore();
  }
});

test('server match: real place, reason match, gps flag true', async () => {
  stubGps();
  stubFetch({
    ok: true,
    resolvedPlace: {
      name: 'Long Beach Convention Center',
      placeId: 'ChIJlbcc',
      lat: 33.76,
      lng: -118.18,
      tier: 1,
      label: 'near you in Downtown Long Beach',
      city: 'Long Beach',
      county: 'Los Angeles County',
      neighbourhood: 'Downtown Long Beach',
      drawLat: 33.77,
      drawLng: -118.19,
    },
    reason: 'match',
  });
  try {
    const outcome = await resolvePlaceForDraw(slottedCard);
    assert.ok(outcome);
    assert.equal(outcome.resolvedPlace.name, 'Long Beach Convention Center');
    assert.equal(outcome.resolvedPlace.tier, 1);
    assert.equal(outcome.reason, 'match');
    assert.equal(outcome.gpsAvailable, true);
  } finally {
    restore();
  }
});

test('server no_match: generic place, reason no_match kept, gps flag true', async () => {
  stubGps();
  stubFetch({
    ok: true,
    resolvedPlace: {
      name: 'the brightest building nearby',
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
    },
    reason: 'no_match',
  });
  try {
    const outcome = await resolvePlaceForDraw(slottedCard);
    assert.ok(outcome);
    assert.equal(outcome.resolvedPlace.tier, 'generic');
    assert.equal(outcome.resolvedPlace.name, 'the brightest building nearby');
    assert.equal(outcome.reason, 'no_match');
    assert.equal(outcome.gpsAvailable, true);
    assert.equal(outcome.resolvedPlace.drawLat, 33.77);
  } finally {
    restore();
  }
});

test('server api_error: generic place, reason api_error kept', async () => {
  stubGps();
  stubFetch({
    ok: true,
    resolvedPlace: {
      name: 'the brightest building nearby',
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
    },
    reason: 'api_error',
  });
  try {
    const outcome = await resolvePlaceForDraw(slottedCard);
    assert.ok(outcome);
    assert.equal(outcome.reason, 'api_error');
    assert.equal(outcome.resolvedPlace.tier, 'generic');
  } finally {
    restore();
  }
});

test('request never comes back: generic place, reason request_failed, gps flag true', async () => {
  stubGps();
  stubFetchThrows();
  try {
    const outcome = await resolvePlaceForDraw(slottedCard);
    assert.ok(outcome);
    assert.equal(outcome.resolvedPlace.tier, 'generic');
    assert.equal(outcome.reason, 'request_failed');
    assert.equal(outcome.gpsAvailable, true);
  } finally {
    restore();
  }
});

test('unslotted cards still resolve to null, no outcome at all', async () => {
  stubGps();
  try {
    assert.equal(await resolvePlaceForDraw(unslottedCard), null);
    assert.equal(await resolvePlaceForDraw(null), null);
  } finally {
    restore();
  }
});

test('retry guard: a second tap while resolving does not start a second run', async () => {
  const guard = createPlaceRetryRunner();
  assert.equal(guard.tryStart(), true);
  assert.equal(guard.tryStart(), false);
  assert.equal(guard.tryStart(), false);
  guard.finish();
  assert.equal(guard.tryStart(), true);
  guard.finish();
});

test('retry guard: a tap after the run settles can start again', async () => {
  let runs = 0;
  const guard = createPlaceRetryRunner();
  const run = async () => {
    if (!guard.tryStart()) return;
    runs += 1;
    await new Promise((resolve) => setTimeout(resolve, 0));
    guard.finish();
  };
  await Promise.all([run(), run(), run()]);
  assert.equal(runs, 1);
  await run();
  assert.equal(runs, 2);
});

test('the draw and the retry persist the diagnosis next to the place', () => {
  const appContext = read('src/context/AppContext.tsx');
  // One shared helper writes place + reason + GPS flag; the draw and
  // the retry both go through it, so a fresh generic is diagnosable
  // without waiting for a retry.
  assert.match(appContext, /const resolveAndStorePlace = async \(card: TripType\)/);
  assert.match(appContext, /resolvedPlace: outcome\.resolvedPlace,/);
  assert.match(appContext, /placeResolutionReason: outcome\.reason,/);
  assert.match(appContext, /placeResolutionGpsAvailable: outcome\.gpsAvailable,/);
  assert.match(appContext, /const retryPlaceResolution = async \(card: TripType\)/);
  assert.match(appContext, /await resolveAndStorePlace\(card\);/);
  assert.match(appContext, /retryPlaceResolution: \(card: TripType\) => Promise<void>;/);
  assert.match(appContext, /retryPlaceResolution,/);
});

test('DrawnMissionCard carries the diagnosis fields', () => {
  const game = read('src/types/game.ts');
  assert.match(game, /placeResolutionReason\?: import\('\.\.\/logic\/placeResolution'\)\.PlaceResolutionReason \| null;/);
  assert.match(game, /placeResolutionGpsAvailable\?: boolean \| null;/);
});

test('the reason type covers every failure the client can see', () => {
  const logic = read('src/logic/placeResolution.ts');
  assert.match(
    logic,
    /export type PlaceResolutionReason = 'match' \| 'no_match' \| 'api_error' \| 'gps_unavailable' \| 'request_failed';/,
  );
});
