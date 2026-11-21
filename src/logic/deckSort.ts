/**
 * Dex Decks-tab sort (Nov 20, 2026).
 *
 * The deck catalog already orders packs inside each section (nearby first,
 * then sortOrder, then name — see getDeckCatalogSections). That catalog
 * order is the default. The sort control below it reorders packs WITHIN
 * each section so big collections stay findable; sections keep their
 * fixed order, and sorting never hides, locks, or unlocks anything.
 * An explicit sort wins exactly — the nearby boost only applies in
 * catalog order, so "Name A–Z" really is A–Z.
 */

import type { DeckPack } from '../types/deckPacks';

export type DeckPackSort = 'catalog' | 'name' | 'progress-desc' | 'progress-asc';

export const DECK_PACK_SORTS: { id: DeckPackSort; label: string }[] = [
  { id: 'catalog', label: 'Catalog order' },
  { id: 'name', label: 'Name A–Z' },
  { id: 'progress-desc', label: 'Most complete' },
  { id: 'progress-asc', label: 'Least complete' },
];

export function isDeckPackSort(value: unknown): value is DeckPackSort {
  return DECK_PACK_SORTS.some((option) => option.id === value);
}

/** Percent complete per pack id (0–100). Packs missing from the map count as 0%. */
export type DeckPackProgressById = Record<string, number | undefined>;

export function sortDeckPacks(
  packs: readonly DeckPack[],
  sort: DeckPackSort,
  progressById: DeckPackProgressById = {},
): DeckPack[] {
  const copy = [...packs];
  if (sort === 'catalog') return copy;
  const percentOf = (pack: DeckPack): number => {
    const value = progressById[pack.packId];
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  };
  if (sort === 'name') {
    return copy.sort((a, b) => a.packName.localeCompare(b.packName));
  }
  if (sort === 'progress-desc') {
    return copy.sort(
      (a, b) => percentOf(b) - percentOf(a) || a.packName.localeCompare(b.packName),
    );
  }
  return copy.sort(
    (a, b) => percentOf(a) - percentOf(b) || a.packName.localeCompare(b.packName),
  );
}
