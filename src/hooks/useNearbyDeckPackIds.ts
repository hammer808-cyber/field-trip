import { useEffect, useState } from 'react';
import { getActiveDeckPacks } from '../data/deckPacks';
import { getNearbyDeckPackIds } from '../logic/nearbyDecks';

/**
 * Near You (option A, Nov 20, 2026): one-shot location read for the deck
 * list. On mount it takes a single `navigator.geolocation.getCurrentPosition`
 * reading (10s timeout, low accuracy, 5-minute cached position) and returns
 * the set of deck pack ids whose home region contains the player.
 *
 * - In-memory cache only (module-level, survives tab switches within the
 *   session). Nothing persisted, no coordinates stored anywhere, no
 *   continuous tracking.
 * - On denial, timeout, or an unsupported browser it falls back silently
 *   to an empty set: the deck list renders in its normal order. No error,
 *   no nag, no re-prompt loop — a failed read is cached as empty for the
 *   rest of the session.
 * - Returns null while the read has not resolved yet. Callers pass the
 *   result straight into `getDeckCatalogSections`, which treats null and
 *   an empty set the same (normal sort).
 */
let cachedNearbyPackIds: ReadonlySet<string> | null = null;

export function useNearbyDeckPackIds(): ReadonlySet<string> | null {
  const [nearbyPackIds, setNearbyPackIds] = useState<ReadonlySet<string> | null>(cachedNearbyPackIds);

  useEffect(() => {
    if (cachedNearbyPackIds) {
      setNearbyPackIds(cachedNearbyPackIds);
      return;
    }
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      position => {
        cachedNearbyPackIds = getNearbyDeckPackIds(
          position.coords.latitude,
          position.coords.longitude,
          getActiveDeckPacks()
        );
        setNearbyPackIds(cachedNearbyPackIds);
      },
      () => {
        // Silent fallback (see header): resolve to "no nearby decks" and
        // cache it, so a denied or failed read never re-prompts.
        cachedNearbyPackIds = new Set<string>();
        setNearbyPackIds(cachedNearbyPackIds);
      },
      { timeout: 10000, enableHighAccuracy: false, maximumAge: 300000 }
    );
  }, []);

  return nearbyPackIds;
}
