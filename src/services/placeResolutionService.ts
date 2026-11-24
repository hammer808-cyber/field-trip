/**
 * Urban Recon place resolution — client side (Nov 21, 2026).
 *
 * The draw-time helper: one-shot GPS, one POST to /api/places/resolve,
 * and the resolved place (or the generic fallback) comes back. Nothing
 * here ever throws and nothing here ever blocks a draw — a failure at
 * any step degrades to the generic default, and an unslotted card
 * never calls the server at all.
 */

import { authenticatedFetch } from '../lib/api';
import {
  getGenericResolvedPlace,
  getPlaceQuery,
  isSlottedCard,
  type PlaceResolutionReason,
  type ResolvedPlace,
} from '../logic/placeResolution';
import type { ChallengeCard } from '../types/challenges';

export interface PlaceResolutionResponse {
  resolvedPlace: ResolvedPlace;
  reason: 'match' | 'no_match' | 'api_error';
}

/** POST /api/places/resolve. Returns null on any failure (caller falls back to generic). */
export async function requestPlaceResolution(
  lat: number,
  lng: number,
  placeQuery: { googleType?: string; keyword?: string; osmTags?: string; preferTopRated?: boolean },
  genericDefault?: string,
): Promise<PlaceResolutionResponse | null> {
  try {
    const res = await authenticatedFetch('/api/places/resolve', {
      method: 'POST',
      body: JSON.stringify({ lat, lng, placeQuery, genericDefault: genericDefault ?? null }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { ok?: boolean; resolvedPlace?: ResolvedPlace; reason?: PlaceResolutionResponse['reason'] };
    if (!data || data.ok !== true || !data.resolvedPlace) return null;
    return { resolvedPlace: data.resolvedPlace, reason: data.reason ?? 'match' };
  } catch {
    return null;
  }
}

/** One-shot GPS read with a timeout. Null when unavailable, denied, or timed out. */
export function getOneShotPosition(timeoutMs = 8000): Promise<{ lat: number; lng: number } | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolve) => {
    let done = false;
    const finish = (value: { lat: number; lng: number } | null) => {
      if (done) return;
      done = true;
      resolve(value);
    };
    const timer = setTimeout(() => finish(null), timeoutMs);
    try {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(timer);
          const lat = pos?.coords?.latitude;
          const lng = pos?.coords?.longitude;
          finish(typeof lat === 'number' && typeof lng === 'number' ? { lat, lng } : null);
        },
        () => {
          clearTimeout(timer);
          finish(null);
        },
        { timeout: timeoutMs, maximumAge: 60_000 },
      );
    } catch {
      clearTimeout(timer);
      finish(null);
    }
  });
}

/**
 * Resolve the place for one drawn card. Unslotted cards return null
 * (nothing to resolve). Slotted cards ALWAYS return an outcome: the
 * server's match, or the generic fallback when GPS, the network, or
 * Google fails — plus the reason, so a generic card can be diagnosed
 * instead of guessed at (Nov 23, 2026: the reason used to be dropped
 * here, which is why a stuck-generic card had no story). The caller
 * stores the place and the reason on the drawn card doc.
 */
export interface PlaceResolutionOutcome {
  resolvedPlace: ResolvedPlace;
  reason: PlaceResolutionReason;
  /** False only when the phone gave no position at all. */
  gpsAvailable: boolean;
}

export async function resolvePlaceForDraw(
  card: Partial<ChallengeCard> | null | undefined,
): Promise<PlaceResolutionOutcome | null> {
  if (!isSlottedCard(card)) return null;
  const placeQuery = getPlaceQuery(card);
  if (!placeQuery) return null;
  const genericDefault = (card as { locationAdaptive?: { genericDefault?: string } }).locationAdaptive?.genericDefault;
  const pos = await getOneShotPosition();
  if (!pos) {
    return {
      resolvedPlace: getGenericResolvedPlace(card, null, {}),
      reason: 'gps_unavailable',
      gpsAvailable: false,
    };
  }
  const result = await requestPlaceResolution(pos.lat, pos.lng, placeQuery, genericDefault);
  if (!result) {
    return {
      resolvedPlace: getGenericResolvedPlace(card, pos, {}),
      reason: 'request_failed',
      gpsAvailable: true,
    };
  }
  return { resolvedPlace: result.resolvedPlace, reason: result.reason, gpsAvailable: true };
}
