/**
 * Place resolver — server side (Urban Recon, Nov 21, 2026).
 * Google is stubbed: the tier ladder (5 / 15 / 35 mi), the top-rated
 * pick, the generic fallback (no match vs API failure), and the
 * handler's 400/503 codes are all pinned without a network call.
 * The import-closure guard mirrors the evaluate guard: the resolver
 * must never pull the client Firebase SDK into the server bundle.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  createResolvePlaceHandler,
  pickPlaceResult,
  resolvePlace,
} from '../server/placeResolver';

const GEOCODE_OK = {
  results: [
    {
      address_components: [
        { long_name: 'Belmont Shore', types: ['neighborhood', 'political'] },
        { long_name: 'Long Beach', types: ['locality', 'political'] },
        { long_name: 'Los Angeles County', types: ['administrative_area_level_2', 'political'] },
      ],
    },
  ],
};

type PlacesByRadius = Record<number, Array<{ displayName?: { text?: string }; id?: string; location?: { latitude?: number; longitude?: number }; rating?: number }>>;

function stubFetch(placesByRadius: PlacesByRadius, geocode: unknown = GEOCODE_OK, failSearch = false) {
  return async (url: string, init?: Record<string, unknown>) => {
    if (url.includes('geocode')) {
      return { ok: true, status: 200, json: async () => geocode };
    }
    if (failSearch) throw new Error('network down');
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    const radius =
      body?.locationRestriction?.circle?.radius ?? body?.locationBias?.circle?.radius ?? 0;
    const places = placesByRadius[radius] ?? [];
    return { ok: true, status: 200, json: async () => ({ places }) };
  };
}

const TACO = {
  displayName: { text: 'Tacos El Gallo' },
  id: 'ChIJ123',
  location: { latitude: 33.77, longitude: -118.17 },
  rating: 4.6,
};
const QUERY = { googleType: 'restaurant', keyword: 'taco truck' };

test('resolvePlace: tier 1 hit names the place with the neighbourhood label', async () => {
  const fetchImpl = stubFetch({ 8047: [TACO] });
  const result = await resolvePlace({ lat: 33.77, lng: -118.19, placeQuery: QUERY }, 'key', fetchImpl as never);
  assert.equal(result.reason, 'match');
  assert.equal(result.resolvedPlace.name, 'Tacos El Gallo');
  assert.equal(result.resolvedPlace.tier, 1);
  assert.equal(result.resolvedPlace.label, 'near you in Belmont Shore');
  assert.equal(result.resolvedPlace.city, 'Long Beach');
  assert.equal(result.resolvedPlace.drawLat, 33.77);
});

test('resolvePlace: empty tier 1 falls through to tier 2, then tier 3', async () => {
  const fetchImpl = stubFetch({ 8047: [], 24140: [TACO] });
  const tier2 = await resolvePlace({ lat: 33.77, lng: -118.19, placeQuery: QUERY }, 'key', fetchImpl as never);
  assert.equal(tier2.resolvedPlace.tier, 2);
  assert.equal(tier2.resolvedPlace.label, 'in Long Beach');

  const fetch3 = stubFetch({ 8047: [], 24140: [], 56327: [TACO] });
  const tier3 = await resolvePlace({ lat: 33.77, lng: -118.19, placeQuery: QUERY }, 'key', fetch3 as never);
  assert.equal(tier3.resolvedPlace.tier, 3);
  assert.equal(tier3.resolvedPlace.label, 'in Los Angeles County');
});

test('resolvePlace: no match anywhere degrades to generic (reason no_match)', async () => {
  const fetchImpl = stubFetch({ 8047: [], 24140: [], 56327: [] });
  const result = await resolvePlace({ lat: 33.77, lng: -118.19, placeQuery: QUERY }, 'key', fetchImpl as never);
  assert.equal(result.reason, 'no_match');
  assert.equal(result.resolvedPlace.tier, 'generic');
  assert.equal(result.resolvedPlace.name, null);
  assert.equal(result.resolvedPlace.drawLat, 33.77);
  assert.equal(result.resolvedPlace.city, 'Long Beach');
});

test('resolvePlace: a Google failure degrades to generic (reason api_error), never throws', async () => {
  const fetchImpl = stubFetch({}, GEOCODE_OK, true);
  const result = await resolvePlace({ lat: 33.77, lng: -118.19, placeQuery: QUERY }, 'key', fetchImpl as never);
  assert.equal(result.reason, 'api_error');
  assert.equal(result.resolvedPlace.tier, 'generic');
});

test('pickPlaceResult: nearest first by default, highest-rated when preferTopRated', () => {
  const places = [
    { displayName: { text: 'Near Low' }, rating: 3.1 },
    { displayName: { text: 'Far High' }, rating: 4.9 },
  ];
  assert.equal(pickPlaceResult(places)?.displayName?.text, 'Near Low');
  assert.equal(pickPlaceResult(places, true)?.displayName?.text, 'Far High');
  assert.equal(pickPlaceResult([]), null);
});

function mockRes() {
  const captured: { status?: number; body?: Record<string, unknown> } = {};
  const res = {
    status: (code: number) => ({
      json: (body: unknown) => {
        captured.status = code;
        captured.body = body as Record<string, unknown>;
      },
    }),
    json: (body: unknown) => {
      captured.status = 200;
      captured.body = body as Record<string, unknown>;
    },
  };
  return { res, captured };
}

test('handler: 400 on bad coords, 400 on a missing place query, 503 with no key', async () => {
  const handler = createResolvePlaceHandler({ getApiKey: () => 'key' });
  const badCoords = mockRes();
  await handler({ body: { lat: 200, lng: -118, placeQuery: QUERY } }, badCoords.res as never);
  assert.equal(badCoords.captured.status, 400);
  assert.equal(badCoords.captured.body?.error, 'INVALID_COORDS');

  const badQuery = mockRes();
  await handler({ body: { lat: 33.77, lng: -118.19, placeQuery: {} } }, badQuery.res as never);
  assert.equal(badQuery.captured.status, 400);
  assert.equal(badQuery.captured.body?.error, 'INVALID_PLACE_QUERY');

  const noKey = createResolvePlaceHandler({ getApiKey: () => null });
  const noKeyRes = mockRes();
  await noKey({ body: { lat: 33.77, lng: -118.19, placeQuery: QUERY } }, noKeyRes.res as never);
  assert.equal(noKeyRes.captured.status, 503);
  assert.equal(noKeyRes.captured.body?.error, 'PLACES_KEY_MISSING');
});

test('handler: 200 with the match, and the generic default applied on a generic tier', async () => {
  const originalFetch = globalThis.fetch;
  try {
    (globalThis as { fetch: unknown }).fetch = stubFetch({ 8047: [TACO] });
    const handler = createResolvePlaceHandler({ getApiKey: () => 'key' });
    const match = mockRes();
    await handler({ body: { lat: 33.77, lng: -118.19, placeQuery: QUERY, genericDefault: 'a food truck' } }, match.res as never);
    assert.equal(match.captured.status, 200);
    assert.equal(match.captured.body?.ok, true);
    assert.equal((match.captured.body?.resolvedPlace as { name?: string })?.name, 'Tacos El Gallo');

    (globalThis as { fetch: unknown }).fetch = stubFetch({ 8047: [], 24140: [], 56327: [] });
    const generic = mockRes();
    await handler({ body: { lat: 33.77, lng: -118.19, placeQuery: QUERY, genericDefault: 'a food truck' } }, generic.res as never);
    assert.equal(generic.captured.status, 200);
    assert.equal((generic.captured.body?.resolvedPlace as { name?: string })?.name, 'a food truck');
    assert.equal((generic.captured.body?.resolvedPlace as { tier?: string })?.tier, 'generic');
  } finally {
    (globalThis as { fetch: unknown }).fetch = originalFetch;
  }
});

test('guard: the server place-resolver import closure has no client Firebase SDK import', () => {
  const root = path.join(process.cwd(), 'src');
  const seen = new Set<string>();
  const queue = [path.join(root, 'server', 'placeResolver.ts')];
  const closure: string[] = [];
  while (queue.length > 0) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    closure.push(file);
    const text = fs.readFileSync(file, 'utf8');
    for (const line of text.split('\n')) {
      if (/^\s*import\s+type\b/.test(line) || /^\s*export\s+type\b/.test(line)) continue;
      const match = line.match(/from\s+['"](\.[^'"]+)['"]/);
      if (!match) continue;
      const resolved = match[1];
      const base = path.resolve(path.dirname(file), resolved);
      for (const candidate of [`${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')]) {
        if (fs.existsSync(candidate)) queue.push(candidate);
      }
    }
  }
  // Small closure by design: the resolver only pulls in the pure
  // placeResolution module (its other imports are type-only, erased).
  assert.ok(closure.length >= 2, `expected the resolver closure, got ${closure.join(', ')}`);
  const offenders = closure.filter((file) => {
    const text = fs.readFileSync(file, 'utf8');
    return /from\s+['"]firebase\//.test(text);
  });
  assert.deepEqual(offenders, [], 'client firebase/ imports must not reach the server place resolver');
});
