import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  getLocationTagLabel,
  haversineMeters,
  isInTexas,
  matchesLocationTag,
  pickCoords,
} from '../logic/locationTags';
import { TEXAS_CHALLENGE_BANK } from '../data/texasChallengeBank';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');

test('haversine: NYC to LA is ~3,944 km, same point is 0', () => {
  const nyc = { latitude: 40.7128, longitude: -74.006 };
  const la = { latitude: 34.0522, longitude: -118.2437 };
  const d = haversineMeters(nyc, la);
  assert.ok(d > 3_900_000 && d < 4_000_000, `NYC-LA ${d}`);
  assert.equal(haversineMeters(nyc, nyc), 0);
});

test('isInTexas: Texas cities in, neighbors out', () => {
  // Clearly inside the state.
  assert.equal(isInTexas(29.7604, -95.3698), true, 'Houston');
  assert.equal(isInTexas(30.2672, -97.7431), true, 'Austin');
  assert.equal(isInTexas(32.7767, -96.797), true, 'Dallas');
  assert.equal(isInTexas(35.222, -101.8313), true, 'Amarillo');
  assert.equal(isInTexas(27.8006, -97.3964), true, 'Corpus Christi');
  // Outside: California, Oklahoma, New Mexico, Louisiana.
  assert.equal(isInTexas(33.7701, -118.1937), false, 'Long Beach CA');
  assert.equal(isInTexas(35.4676, -97.5164), false, 'Oklahoma City');
  assert.equal(isInTexas(35.687, -105.9378), false, 'Santa Fe');
  assert.equal(isInTexas(29.9511, -90.0715), false, 'New Orleans');
  assert.equal(isInTexas(32.5252, -93.7502), false, 'Shreveport');
});

test('matchesLocationTag: state tag is the Texas border, place tag is a radius', () => {
  const texas = { kind: 'state', state: 'TX' } as const;
  assert.equal(
    matchesLocationTag({ latitude: 29.7604, longitude: -95.3698 }, texas),
    true,
    'Houston matches TX',
  );
  assert.equal(
    matchesLocationTag({ latitude: 33.7701, longitude: -118.1937 }, texas),
    false,
    'Long Beach does not match TX',
  );
  assert.equal(
    matchesLocationTag({ latitude: NaN, longitude: -95.3698 }, texas),
    false,
    'NaN coords never match',
  );

  const alamo = {
    kind: 'place',
    latitude: 29.4257,
    longitude: -98.4861,
    radiusMeters: 500,
    label: 'The Alamo',
  } as const;
  assert.equal(
    matchesLocationTag({ latitude: 29.4265, longitude: -98.4861 }, alamo),
    true,
    '~90m from the Alamo matches',
  );
  assert.equal(
    matchesLocationTag({ latitude: 29.4707, longitude: -98.4861 }, alamo),
    false,
    '~5km from the Alamo does not match',
  );
});

test('pickCoords: takes the first usable coords, in any of the app shapes', () => {
  assert.deepEqual(
    pickCoords({ latitude: 29.76, longitude: -95.37 }, null),
    { latitude: 29.76, longitude: -95.37 },
  );
  assert.deepEqual(pickCoords(null, { lat: 30.27, lng: -97.74 }), {
    latitude: 30.27,
    longitude: -97.74,
  });
  assert.equal(pickCoords(null, {}, { latitude: 'nope' }), null);
  assert.equal(getLocationTagLabel({ kind: 'state', state: 'TX' }), 'Texas');
  assert.equal(
    getLocationTagLabel({
      kind: 'place',
      latitude: 0,
      longitude: 0,
      radiusMeters: 1,
      label: 'The Alamo',
    }),
    'The Alamo',
  );
});

test('Texas deck: all 15 cards carry the TX state tag', () => {
  assert.equal(TEXAS_CHALLENGE_BANK.length, 15);
  for (const card of TEXAS_CHALLENGE_BANK) {
    assert.deepEqual(
      (card as any).locationTag,
      { kind: 'state', state: 'TX' },
      `${card.id}: missing the TX location tag`,
    );
  }
});

test('Capture: the location LAYER is tag-aware, the submit gate is not', () => {
  const src = readFileSync(join(root, 'src/pages/Capture.tsx'), 'utf8');
  // All three scoring uses (live meter, submit scoring, entry payload)
  // feed the tag-aware value into locationVerified.
  const layerUses = src.match(/locationVerified: isLocationLayerEarned,/g) ?? [];
  assert.equal(layerUses.length, 3, `expected 3 tag-aware scoring uses, got ${layerUses.length}`);
  assert.ok(
    !/locationVerified: isLocationFulfilled/.test(src),
    'no scoring use may still pass the un-tagged isLocationFulfilled',
  );
  // The evidence row is the submit gate: it keeps isLocationFulfilled,
  // so a tag can never block a submit — it only decides the layer.
  assert.ok(
    /key: 'location', label: locationRowLabel, fulfilled: isLocationFulfilled/.test(src),
    'location evidence row must still gate on isLocationFulfilled',
  );
  // The row tells the player what earns the layer.
  assert.ok(
    /locationRowLabel/.test(src) && /getLocationTagLabel\(locationTag\)/.test(src),
    'location row label must name the tag',
  );
});
