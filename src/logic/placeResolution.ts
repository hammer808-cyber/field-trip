/**
 * Location-adaptive place resolution (Urban Recon, Nov 21, 2026).
 *
 * Pure client/server-shared logic: no firebase, no fetch, no geolocation
 * here — the server resolver (src/server/placeResolver.ts) and the draw
 * wiring (AppContext) both build on these shapes.
 *
 * A skeleton card carries `locationAdaptive` (see TripCard): an action,
 * a token, a generic default, and an optional placeQuery. At draw time
 * the resolver fills the {place} slot with a real named place near the
 * player and stores the result as a ResolvedPlace on the drawn card.
 * When resolution finds nothing — no GPS, no match, no signal — the
 * card renders its generic default instead and never blocks.
 */

import type { LocationTag } from './locationTags';
import type { ChallengeCard } from '../types/challenges';

/** What the resolver is allowed to search for. */
export interface PlaceQuery {
  /** Google Places (New) type, e.g. 'library', 'park', 'city_hall'. */
  googleType?: string;
  /** Keyword for text search, e.g. 'taco truck', 'downtown'. */
  keyword?: string;
  /** OpenStreetMap tags for the documented no-key alternative. */
  osmTags?: string;
  /** Pick the highest-rated result instead of the nearest. */
  preferTopRated?: boolean;
}

/** Which search tier produced the match, or the generic fallback. */
export type PlaceTier = 1 | 2 | 3 | 'generic';

/**
 * Why the stored resolvedPlace is what it is (Urban Recon, Nov 23,
 * 2026 — a card stuck on the generic fallback used to be undiagnosable
 * because the reason was dropped). 'match' = a real place came back.
 * 'no_match' = the server searched all three tiers and found nothing.
 * 'api_error' = Google Places failed server-side. 'gps_unavailable' =
 * the phone gave no position (denied, unavailable, or timed out).
 * 'request_failed' = the resolve request never came back (network,
 * non-OK, or malformed). Dev-facing only; the banner never shows it.
 */
export type PlaceResolutionReason = 'match' | 'no_match' | 'api_error' | 'gps_unavailable' | 'request_failed';

/**
 * The resolution stored on the drawn card (and copied onto the entry at
 * submit). `name` is the display name for the {place} slot — for the
 * generic tier it is the skeleton's generic default. lat/lng are null
 * on the generic tier; drawLat/drawLng always record where the draw
 * happened, so the generic location layer can be checked without a
 * second reverse-geocode.
 */
export interface ResolvedPlace {
  name: string | null;
  placeId: string | null;
  lat: number | null;
  lng: number | null;
  tier: PlaceTier;
  /** Player-visible tier label, e.g. "near you in Belmont Shore". */
  label: string;
  city: string | null;
  county: string | null;
  neighbourhood: string | null;
  drawLat: number | null;
  drawLng: number | null;
}

/** Radius tiers, decided Nov 21, 2026: 5 / 15 / 35 miles. */
export const RESOLVER_TIERS: ReadonlyArray<{ tier: 1 | 2 | 3; radiusMiles: number; radiusMeters: number }> = [
  { tier: 1, radiusMiles: 5, radiusMeters: 8047 },
  { tier: 2, radiusMiles: 15, radiusMeters: 24140 },
  { tier: 3, radiusMiles: 35, radiusMeters: 56327 },
];

export const TIER_RADIUS_METERS: Record<1 | 2 | 3, number> = {
  1: 8047,
  2: 24140,
  3: 56327,
};

/** Generic-tier location layer radius: within 35 mi of the draw point. */
export const GENERIC_FALLBACK_RADIUS_METERS = 56327;

/** True when the card is an Urban Recon skeleton at all. */
export function isLocationAdaptiveCard(card: Partial<ChallengeCard> | null | undefined): boolean {
  return !!card && typeof (card as { locationAdaptive?: unknown }).locationAdaptive === 'object' && (card as { locationAdaptive?: unknown }).locationAdaptive !== null;
}

/** True when the card has a place slot the resolver must fill. */
export function isSlottedCard(card: Partial<ChallengeCard> | null | undefined): card is Partial<ChallengeCard> {
  if (!isLocationAdaptiveCard(card)) return false;
  const q = (card as { locationAdaptive?: { placeQuery?: PlaceQuery } }).locationAdaptive?.placeQuery;
  return !!q && (typeof q.googleType === 'string' || typeof q.keyword === 'string');
}

/** The skeleton's place query, or null for unslotted / non-adaptive cards. */
export function getPlaceQuery(card: Partial<ChallengeCard> | null | undefined): PlaceQuery | null {
  if (!isSlottedCard(card)) return null;
  return (card as { locationAdaptive: { placeQuery: PlaceQuery } }).locationAdaptive.placeQuery;
}

/** The generic fallback resolution: no named place, just the default. */
export function getGenericResolvedPlace(
  card: Partial<ChallengeCard>,
  draw: { lat: number; lng: number } | null,
  address?: { city?: string | null; county?: string | null; neighbourhood?: string | null },
): ResolvedPlace {
  const genericDefault = (card as { locationAdaptive?: { genericDefault?: string } }).locationAdaptive?.genericDefault ?? 'a place near you';
  return {
    name: genericDefault,
    placeId: null,
    lat: null,
    lng: null,
    tier: 'generic',
    label: 'anywhere you are',
    city: address?.city ?? null,
    county: address?.county ?? null,
    neighbourhood: address?.neighbourhood ?? null,
    drawLat: draw?.lat ?? null,
    drawLng: draw?.lng ?? null,
  };
}

/** Player-visible tier label for a resolved place. */
export function getTierLabel(place: ResolvedPlace | null | undefined): string {
  if (!place) return 'anywhere you are';
  if (place.label) return place.label;
  if (place.tier === 1 && place.neighbourhood) return `near you in ${place.neighbourhood}`;
  if (place.tier === 2 && place.city) return `in ${place.city}`;
  if (place.tier === 3 && place.county) return `in ${place.county}`;
  if (place.tier === 'generic') return 'anywhere you are';
  return 'near you';
}

/**
 * Render a card's text with the {place} slot filled: the resolved name,
 * or the skeleton's generic default when there is no resolution (or the
 * card is unslotted — its text carries no slot). Returns fresh strings;
 * the bank card itself is never mutated.
 */
export function renderCardText(
  card: Partial<ChallengeCard>,
  resolvedPlace: ResolvedPlace | null | undefined,
): { mission: string; description: string; shortPrompt: string } {
  const fallback = (card as { locationAdaptive?: { genericDefault?: string } }).locationAdaptive?.genericDefault ?? '';
  const placeName = resolvedPlace?.name ?? fallback;
  const fill = (text: string | undefined | null): string => {
    if (!text) return '';
    if (!text.includes('{place}')) return text;
    return text.split('{place}').join(placeName || fallback);
  };
  return {
    mission: fill((card as { mission?: string }).mission),
    description: fill(card.description),
    shortPrompt: fill(card.shortPrompt),
  };
}

/**
 * The location tag for a resolved place, for the +25% location layer
 * (matchesLocationTag). Tier 1–3: within that tier's radius of the
 * named place. Generic: within 35 mi of the draw point — the documented
 * approximation of "same city/county as the draw" (the spec's deviation
 * note, Nov 21, 2026). Null when there is nothing to check against
 * (no resolution and no draw point) — the caller then keeps the old
 * behavior of any captured location earning the layer.
 */
export function getResolvedPlaceTag(resolvedPlace: ResolvedPlace | null | undefined): LocationTag | null {
  if (!resolvedPlace) return null;
  if (resolvedPlace.tier !== 'generic') {
    if (typeof resolvedPlace.lat !== 'number' || typeof resolvedPlace.lng !== 'number') return null;
    return {
      kind: 'place',
      latitude: resolvedPlace.lat,
      longitude: resolvedPlace.lng,
      radiusMeters: TIER_RADIUS_METERS[resolvedPlace.tier],
      label: resolvedPlace.name ?? 'Resolved place',
    };
  }
  if (typeof resolvedPlace.drawLat !== 'number' || typeof resolvedPlace.drawLng !== 'number') return null;
  return {
    kind: 'place',
    latitude: resolvedPlace.drawLat,
    longitude: resolvedPlace.drawLng,
    radiusMeters: GENERIC_FALLBACK_RADIUS_METERS,
    label: resolvedPlace.city ?? 'Draw area',
  };
}

/** The resolved place on a drawn card doc, if it has one. */
export function getDrawnCardResolvedPlace(
  drawnCard: { resolvedPlace?: ResolvedPlace | null } | null | undefined,
): ResolvedPlace | null {
  return drawnCard?.resolvedPlace ?? null;
}
