import type { DeckHomeRegion, DeckPack } from '../types/deckPacks';

/**
 * Near You (option A, Nov 20, 2026): deck-level region matching.
 *
 * Pure helpers — no browser APIs, fully unit-testable. A deck's home region
 * is a bounding box (see `DeckHomeRegion`); a point inside it counts as
 * "near", and the deck floats to the top of its section with a "Near you"
 * badge. This is sorting only: it changes no points, awards, unlocks, or
 * scoring, and being outside a region never hides or locks a deck.
 */

/** A point on the region's edge counts as inside (inclusive bounds). */
export function isPointInRegion(lat: number, lng: number, region: DeckHomeRegion): boolean {
  return (
    lat >= region.minLat &&
    lat <= region.maxLat &&
    lng >= region.minLng &&
    lng <= region.maxLng
  );
}

/**
 * Pack ids whose home region contains the given point. Decks without a
 * home region are never boosted.
 */
export function getNearbyDeckPackIds(
  lat: number,
  lng: number,
  packs: readonly DeckPack[]
): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const pack of packs) {
    if (pack.homeRegion && isPointInRegion(lat, lng, pack.homeRegion)) {
      ids.add(pack.packId);
    }
  }
  return ids;
}
