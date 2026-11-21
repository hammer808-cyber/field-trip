/**
 * Place resolution — pure logic (Urban Recon, Nov 21, 2026).
 * Covers the tier radii (5 / 15 / 35 mi), the {place} substitution
 * (named place, generic default, unslotted passthrough), tier labels,
 * and the dynamic location tag (tier radius, or 35 mi around the draw
 * point for the generic tier).
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  GENERIC_FALLBACK_RADIUS_METERS,
  getGenericResolvedPlace,
  getPlaceQuery,
  getResolvedPlaceTag,
  getTierLabel,
  isLocationAdaptiveCard,
  isSlottedCard,
  renderCardText,
  RESOLVER_TIERS,
  TIER_RADIUS_METERS,
  type ResolvedPlace,
} from '../logic/placeResolution';
import type { ChallengeCard } from '../types/challenges';

const slottedCard = {
  id: 'urban-14',
  mission: '“Grab a specialty drink at {place} with some friends.”',
  description: 'Grab a specialty drink at {place} — the drink is the token.',
  shortPrompt: 'Grab a specialty drink at {place} with some friends.',
  locationAdaptive: {
    action: 'Grab a specialty drink, with friends',
    token: "the drink + the truck's name",
    genericDefault: 'a food truck',
    placeQuery: { googleType: 'restaurant', keyword: 'taco truck' },
  },
} as unknown as Partial<ChallengeCard>;

const unslottedCard = {
  id: 'urban-05',
  mission: '“Catch the rush at any transit stop near you.”',
  description: 'Any stop counts.',
  shortPrompt: 'Catch the rush at any transit stop near you.',
  locationAdaptive: {
    action: 'Catch the rush',
    token: 'the departure board at its peak',
    genericDefault: 'a transit stop',
  },
} as unknown as Partial<ChallengeCard>;

const namedPlace: ResolvedPlace = {
  name: 'Tacos El Gallo',
  placeId: 'ChIJ123',
  lat: 33.77,
  lng: -118.17,
  tier: 1,
  label: 'near you in Belmont Shore',
  city: 'Long Beach',
  county: 'Los Angeles County',
  neighbourhood: 'Belmont Shore',
  drawLat: 33.77,
  drawLng: -118.19,
};

test('tiers: 5 / 15 / 35 miles, in meters', () => {
  assert.deepEqual(RESOLVER_TIERS.map((t) => t.radiusMiles), [5, 15, 35]);
  assert.deepEqual(TIER_RADIUS_METERS, { 1: 8047, 2: 24140, 3: 56327 });
  assert.equal(GENERIC_FALLBACK_RADIUS_METERS, 56327);
});

test('isSlottedCard: slotted cards resolve, unslotted and plain cards do not', () => {
  assert.equal(isLocationAdaptiveCard(slottedCard), true);
  assert.equal(isSlottedCard(slottedCard), true);
  assert.equal(isLocationAdaptiveCard(unslottedCard), true);
  assert.equal(isSlottedCard(unslottedCard), false);
  assert.equal(isSlottedCard({ id: 'texas-01' } as Partial<ChallengeCard>), false);
  assert.equal(isSlottedCard(null), false);
});

test('getPlaceQuery: returns the skeleton query, null for unslotted cards', () => {
  assert.deepEqual(getPlaceQuery(slottedCard), { googleType: 'restaurant', keyword: 'taco truck' });
  assert.equal(getPlaceQuery(unslottedCard), null);
});

test('renderCardText: named place fills every {place} slot', () => {
  const text = renderCardText(slottedCard, namedPlace);
  assert.equal(text.mission, '“Grab a specialty drink at Tacos El Gallo with some friends.”');
  assert.equal(text.description, 'Grab a specialty drink at Tacos El Gallo — the drink is the token.');
  assert.equal(text.shortPrompt, 'Grab a specialty drink at Tacos El Gallo with some friends.');
});

test('renderCardText: no resolution renders the generic default, never the raw placeholder', () => {
  const text = renderCardText(slottedCard, null);
  assert.ok(!text.mission.includes('{place}'), 'raw placeholder must never render');
  assert.equal(text.mission, '“Grab a specialty drink at a food truck with some friends.”');
  const generic = getGenericResolvedPlace(slottedCard, { lat: 33.77, lng: -118.19 }, {});
  assert.equal(generic.name, 'a food truck');
  assert.equal(generic.tier, 'generic');
  assert.equal(renderCardText(slottedCard, generic).mission, '“Grab a specialty drink at a food truck with some friends.”');
});

test('renderCardText: unslotted cards pass through untouched, and the bank card is never mutated', () => {
  const before = JSON.stringify(slottedCard);
  const text = renderCardText(unslottedCard, namedPlace);
  assert.equal(text.mission, '“Catch the rush at any transit stop near you.”');
  assert.equal(JSON.stringify(slottedCard), before);
});

test('getGenericResolvedPlace: carries the draw point and address parts for the generic layer', () => {
  const generic = getGenericResolvedPlace(
    slottedCard,
    { lat: 33.77, lng: -118.19 },
    { city: 'Long Beach', county: 'Los Angeles County', neighbourhood: 'Belmont Shore' },
  );
  assert.deepEqual(
    { tier: generic.tier, label: generic.label, city: generic.city, county: generic.county, drawLat: generic.drawLat, drawLng: generic.drawLng },
    { tier: 'generic', label: 'anywhere you are', city: 'Long Beach', county: 'Los Angeles County', drawLat: 33.77, drawLng: -118.19 },
  );
  assert.equal(generic.lat, null);
  assert.equal(generic.lng, null);
});

test('getTierLabel: neighbourhood / city / county / generic', () => {
  assert.equal(getTierLabel(namedPlace), 'near you in Belmont Shore');
  assert.equal(getTierLabel({ ...namedPlace, tier: 2, label: '' }), 'in Long Beach');
  assert.equal(getTierLabel({ ...namedPlace, tier: 3, label: '' }), 'in Los Angeles County');
  assert.equal(getTierLabel({ ...namedPlace, tier: 'generic', label: '' }), 'anywhere you are');
  assert.equal(getTierLabel(null), 'anywhere you are');
});

test('getResolvedPlaceTag: tier radius around the named place', () => {
  assert.deepEqual(getResolvedPlaceTag(namedPlace), {
    kind: 'place',
    latitude: 33.77,
    longitude: -118.17,
    radiusMeters: 8047,
    label: 'Tacos El Gallo',
  });
  const tier2 = getResolvedPlaceTag({ ...namedPlace, tier: 2 });
  assert.ok(tier2 && tier2.kind === 'place');
  assert.equal(tier2.radiusMeters, 24140);
  const tier3 = getResolvedPlaceTag({ ...namedPlace, tier: 3 });
  assert.ok(tier3 && tier3.kind === 'place');
  assert.equal(tier3.radiusMeters, 56327);
});

test('getResolvedPlaceTag: generic tier checks within 35 mi of the draw point', () => {
  const generic = getGenericResolvedPlace(slottedCard, { lat: 33.77, lng: -118.19 }, { city: 'Long Beach' });
  assert.deepEqual(getResolvedPlaceTag(generic), {
    kind: 'place',
    latitude: 33.77,
    longitude: -118.19,
    radiusMeters: 56327,
    label: 'Long Beach',
  });
  assert.equal(getResolvedPlaceTag(null), null);
  assert.equal(getResolvedPlaceTag(getGenericResolvedPlace(slottedCard, null, {})), null);
});
