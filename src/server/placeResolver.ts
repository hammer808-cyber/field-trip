/**
 * Urban Recon place resolution (Nov 21, 2026) — server side.
 *
 * `POST /api/places/resolve` is the single funnel for filling a
 * skeleton card's {place} slot: the client posts one-shot GPS + the
 * skeleton's placeQuery, the server reverse-geocodes once, then runs a
 * tiered Places search (5 / 15 / 35 mi — decided Nov 21) and returns
 * the first tier with a match. No match anywhere, no GPS, a Google
 * outage: the card degrades to its generic default, never an error to
 * the player. The key never leaves the server.
 *
 * Provider: Google Places API (New) primary — Zach's pick, Nov 21.
 * `placeQuery` also carries `osmTags` for the documented no-key
 * alternative (OpenStreetMap Nominatim + Overpass); only the Google
 * path is implemented — the resolver is written provider-neutral so
 * OSM can be added without touching the call sites.
 *
 * Key: `GOOGLE_PLACES_API_KEY` on Render, same class of secret as
 * `GEMINI_API_KEY`. API-restricted to Places API (New) + Geocoding
 * API; IP-restricted to Render's outbound IPs (a referrer restriction
 * would break server calls, which send no referrer).
 */

import {
  RESOLVER_TIERS,
  type PlaceQuery,
  type ResolvedPlace,
} from '../logic/placeResolution';

export interface ResolvePlaceInput {
  lat: number;
  lng: number;
  placeQuery: PlaceQuery;
}

export interface ResolvePlaceResult {
  resolvedPlace: ResolvedPlace;
  /** 'match' | 'no_match' (generic fallback) | 'api_error' (generic fallback, Google failed). */
  reason: 'match' | 'no_match' | 'api_error';
}

type FetchFn = (url: string, init?: Record<string, unknown>) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}>;

interface GooglePlace {
  displayName?: { text?: string };
  id?: string;
  location?: { latitude?: number; longitude?: number };
  rating?: number;
}

const PLACES_FIELD_MASK = 'places.displayName,places.id,places.location,places.rating';

/** Pick the result to name: nearest (first) unless the card wants top-rated. */
export function pickPlaceResult(places: GooglePlace[], preferTopRated?: boolean): GooglePlace | null {
  if (!places || places.length === 0) return null;
  if (!preferTopRated) return places[0];
  let best: GooglePlace | null = null;
  for (const p of places) {
    const rating = typeof p.rating === 'number' ? p.rating : -1;
    const bestRating = best && typeof best.rating === 'number' ? best.rating : -1;
    if (!best || rating > bestRating) best = p;
  }
  return best;
}

interface AddressParts {
  city: string | null;
  county: string | null;
  neighbourhood: string | null;
}

function parseAddressParts(geocodeJson: unknown): AddressParts {
  const parts: AddressParts = { city: null, county: null, neighbourhood: null };
  const results = (geocodeJson as { results?: Array<{ address_components?: Array<{ long_name?: string; types?: string[] }> }> })?.results;
  const first = Array.isArray(results) ? results[0] : undefined;
  const components = first?.address_components ?? [];
  for (const c of components) {
    const types = c.types ?? [];
    const name = c.long_name ?? null;
    if (!name) continue;
    if (!parts.city && (types.includes('locality') || types.includes('postal_town'))) parts.city = name;
    if (!parts.county && types.includes('administrative_area_level_2')) parts.county = name;
    if (!parts.neighbourhood && (types.includes('neighborhood') || types.includes('sublocality') || types.includes('sublocality_level_1'))) parts.neighbourhood = name;
  }
  return parts;
}

async function reverseGeocode(lat: number, lng: number, apiKey: string, fetchImpl: FetchFn): Promise<AddressParts> {
  const empty: AddressParts = { city: null, county: null, neighbourhood: null };
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${encodeURIComponent(`${lat},${lng}`)}&key=${encodeURIComponent(apiKey)}`;
    const res = await fetchImpl(url);
    if (!res.ok) return empty;
    return parseAddressParts(await res.json());
  } catch {
    return empty;
  }
}

async function searchPlaces(
  lat: number,
  lng: number,
  radiusMeters: number,
  placeQuery: PlaceQuery,
  apiKey: string,
  fetchImpl: FetchFn,
): Promise<GooglePlace[]> {
  const center = { latitude: lat, longitude: lng };
  const headers = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': apiKey,
    'X-Goog-FieldMask': PLACES_FIELD_MASK,
  };
  const body: Record<string, unknown> = { maxResultCount: 10 };
  let url: string;
  if (placeQuery.keyword) {
    // Text search: the keyword is the query (e.g. "taco truck"), the
    // type narrows it when one fits.
    url = 'https://places.googleapis.com/v1/places:searchText';
    body.textQuery = placeQuery.keyword;
    if (placeQuery.googleType) body.includedType = placeQuery.googleType;
    body.locationBias = { circle: { center, radius: radiusMeters } };
  } else if (placeQuery.googleType) {
    url = 'https://places.googleapis.com/v1/places:searchNearby';
    body.includedType = placeQuery.googleType;
    body.locationRestriction = { circle: { center, radius: radiusMeters } };
  } else {
    return [];
  }
  const res = await fetchImpl(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Places search failed: ${res.status}`);
  const json = (await res.json()) as { places?: GooglePlace[] };
  return Array.isArray(json.places) ? json.places : [];
}

/**
 * Resolve a place for one draw. The fetch is injectable so tests can
 * stub Google; production passes the global fetch. A Google failure in
 * any step degrades to the generic default (reason 'api_error') — the
 * draw never fails because the resolver did.
 */
export async function resolvePlace(
  input: ResolvePlaceInput,
  apiKey: string,
  fetchImpl: FetchFn = globalThis.fetch as unknown as FetchFn,
): Promise<ResolvePlaceResult> {
  const { lat, lng, placeQuery } = input;
  let address: AddressParts = { city: null, county: null, neighbourhood: null };
  let apiFailed = false;
  try {
    address = await reverseGeocode(lat, lng, apiKey, fetchImpl);
  } catch {
    apiFailed = true;
  }
  for (const tier of RESOLVER_TIERS) {
    let places: GooglePlace[] = [];
    try {
      places = await searchPlaces(lat, lng, tier.radiusMeters, placeQuery, apiKey, fetchImpl);
    } catch {
      apiFailed = true;
      break;
    }
    const picked = pickPlaceResult(places, placeQuery.preferTopRated);
    if (picked?.displayName?.text && typeof picked.location?.latitude === 'number' && typeof picked.location?.longitude === 'number') {
      const label =
        tier.tier === 1 && address.neighbourhood
          ? `near you in ${address.neighbourhood}`
          : tier.tier === 2 && address.city
            ? `in ${address.city}`
            : tier.tier === 3 && address.county
              ? `in ${address.county}`
              : 'near you';
      return {
        resolvedPlace: {
          name: picked.displayName.text,
          placeId: picked.id ?? null,
          lat: picked.location.latitude,
          lng: picked.location.longitude,
          tier: tier.tier,
          label,
          city: address.city,
          county: address.county,
          neighbourhood: address.neighbourhood,
          drawLat: lat,
          drawLng: lng,
        },
        reason: 'match',
      };
    }
  }
  return {
    resolvedPlace: {
      name: null,
      placeId: null,
      lat: null,
      lng: null,
      tier: 'generic',
      label: 'anywhere you are',
      city: address.city,
      county: address.county,
      neighbourhood: address.neighbourhood,
      drawLat: lat,
      drawLng: lng,
    },
    reason: apiFailed ? 'api_error' : 'no_match',
  };
}

export interface ResolvePlaceHandlerDeps {
  getApiKey: () => string | null;
}

export type ResolvePlaceRequest = {
  user?: { uid?: string };
  body?: {
    lat?: unknown;
    lng?: unknown;
    placeQuery?: unknown;
    genericDefault?: unknown;
  };
};

export type ResolvePlaceResponse = {
  status: (code: number) => { json: (body: unknown) => void };
  json: (body: unknown) => void;
};

/**
 * Express handler for POST /api/places/resolve. Auth is the caller's
 * own session (authenticate middleware); the resolve is for the
 * caller's own draw, so no ownership check beyond auth. The generic
 * default comes from the bank card via the request body — the server
 * never hard-codes card copy.
 */
export function createResolvePlaceHandler(deps: ResolvePlaceHandlerDeps) {
  return async (req: ResolvePlaceRequest, res: ResolvePlaceResponse): Promise<void> => {
    const body = req.body ?? {};
    const lat = typeof body.lat === 'number' ? body.lat : Number(body.lat);
    const lng = typeof body.lng === 'number' ? body.lng : Number(body.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      res.status(400).json({ ok: false, error: 'INVALID_COORDS' });
      return;
    }
    const placeQuery = body.placeQuery as PlaceQuery | null | undefined;
    if (
      !placeQuery ||
      typeof placeQuery !== 'object' ||
      (typeof placeQuery.googleType !== 'string' && typeof placeQuery.keyword !== 'string')
    ) {
      res.status(400).json({ ok: false, error: 'INVALID_PLACE_QUERY' });
      return;
    }
    const apiKey = deps.getApiKey();
    if (!apiKey) {
      res.status(503).json({ ok: false, error: 'PLACES_KEY_MISSING' });
      return;
    }
    try {
      const result = await resolvePlace({ lat, lng, placeQuery }, apiKey);
      const genericDefault = typeof body.genericDefault === 'string' && body.genericDefault.trim() ? body.genericDefault.trim() : null;
      if (result.resolvedPlace.tier === 'generic' && genericDefault) {
        result.resolvedPlace.name = genericDefault;
      }
      res.json({ ok: true, resolvedPlace: result.resolvedPlace, reason: result.reason });
    } catch (err) {
      console.error('[PLACES_RESOLVE] Error:', err);
      res.status(500).json({ ok: false, error: 'RESOLVE_FAILED' });
    }
  };
}
