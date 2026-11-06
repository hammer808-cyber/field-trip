/**
 * Location tags — the "tags earn the points" rule.
 *
 * A card may carry a locationTag. The deck stays open everywhere and the
 * card can always be played, but the +25% location layer only pays out
 * when the GPS on the submission matches the tag:
 *
 *   - { kind: 'state', state: 'TX' } — the photo was taken inside Texas.
 *     This is the Texas deck's tag: its rule is "unmistakably Texas,
 *     photographable anywhere in the state", so no card needs one
 *     specific place.
 *   - { kind: 'place', latitude, longitude, radiusMeters } — the photo
 *     was taken within radiusMeters of one spot (a future card like
 *     "photograph the Alamo" would use this).
 *
 * Cards without a locationTag keep the old behavior: any captured
 * location earns the layer. The tag never gates the submit itself —
 * it only decides the location layer. (A modified client could lie
 * about its GPS; the check runs in the app at capture/submit time,
 * same trust boundary as the location layer has always had.)
 */

export type LocationTag =
  | { kind: 'state'; state: 'TX'; label?: string }
  | {
      kind: 'place';
      latitude: number;
      longitude: number;
      radiusMeters: number;
      label: string;
    };

export interface LatLng {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_METERS = 6_371_000;

/** Great-circle distance between two points, in meters. */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

/**
 * Simplified Texas border, [lng, lat] pairs, clockwise from El Paso.
 * Accurate to a few miles — good enough for a points layer, not for
 * surveying. Border towns right on the line may flip either way.
 */
const TEXAS_POLYGON: ReadonlyArray<readonly [number, number]> = [
  [-106.55, 31.78], // El Paso (Rio Grande)
  [-106.48, 32.0], // up to the New Mexico line
  [-103.06, 32.0], // east along 32°N to 103°W
  [-103.06, 36.5], // north to the panhandle top
  [-100.0, 36.5], // east along 36.5°N to the 100th meridian
  [-100.0, 34.2], // south along 100°W
  [-99.0, 33.9], // Red River jog
  [-97.8, 33.9],
  [-96.9, 33.75],
  [-96.0, 33.85],
  [-95.2, 33.85],
  [-94.6, 33.55],
  [-94.04, 33.02], // NE corner
  [-94.04, 32.0], // south along the Sabine
  [-93.8, 31.0],
  [-93.7, 30.0],
  [-93.85, 29.68], // Sabine Lake
  [-94.6, 29.45], // Gulf coast
  [-95.6, 28.9],
  [-96.6, 28.3],
  [-97.15, 27.6],
  [-97.2, 26.9],
  [-97.45, 26.1], // Brownsville area
  [-97.5, 26.2], // Rio Grande turns NW
  [-98.5, 26.4],
  [-99.4, 26.4],
  [-100.1, 26.7],
  [-100.9, 27.4],
  [-101.6, 28.4],
  [-102.2, 29.2],
  [-103.0, 29.75],
  [-103.6, 29.3], // Big Bend dip
  [-104.1, 29.6],
  [-104.8, 30.2],
  [-105.6, 30.7],
  [-106.2, 31.3],
];

/** Ray-casting point-in-polygon (even-odd rule). */
export function isInTexas(latitude: number, longitude: number): boolean {
  const x = longitude;
  const y = latitude;
  let inside = false;
  for (let i = 0, j = TEXAS_POLYGON.length - 1; i < TEXAS_POLYGON.length; j = i++) {
    const [xi, yi] = TEXAS_POLYGON[i];
    const [xj, yj] = TEXAS_POLYGON[j];
    const crosses =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

/** True when the captured GPS satisfies the card's location tag. */
export function matchesLocationTag(coords: LatLng, tag: LocationTag): boolean {
  if (!Number.isFinite(coords.latitude) || !Number.isFinite(coords.longitude)) {
    return false;
  }
  if (tag.kind === 'state') {
    if (tag.state === 'TX') return isInTexas(coords.latitude, coords.longitude);
    return false;
  }
  return (
    haversineMeters(coords, {
      latitude: tag.latitude,
      longitude: tag.longitude,
    }) <= tag.radiusMeters
  );
}

/** Short human label for a tag, for the capture checklist ("Drop a Pin — Texas"). */
export function getLocationTagLabel(tag: LocationTag): string {
  if (tag.kind === 'state') {
    return tag.label ?? (tag.state === 'TX' ? 'Texas' : tag.state);
  }
  return tag.label;
}

/**
 * First candidate that actually carries numeric coordinates. Accepts the
 * shapes the app already produces: { latitude, longitude } (photo
 * metadata) and { lat, lng }. Returns null when nothing usable exists.
 */
export function pickCoords(
  ...candidates: Array<unknown>
): LatLng | null {
  for (const c of candidates) {
    if (!c || typeof c !== 'object') continue;
    const o = c as Record<string, unknown>;
    const lat =
      typeof o.latitude === 'number'
        ? o.latitude
        : typeof o.lat === 'number'
          ? o.lat
          : undefined;
    const lng =
      typeof o.longitude === 'number'
        ? o.longitude
        : typeof o.lng === 'number'
          ? o.lng
          : undefined;
    if (typeof lat === 'number' && typeof lng === 'number') {
      return { latitude: lat, longitude: lng };
    }
  }
  return null;
}
