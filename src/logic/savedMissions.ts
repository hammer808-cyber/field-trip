import type { DrawnMissionCard } from '../types/game';

/**
 * Saved-missions list (Option A, Nov 20, 2026): the Dex "Saved" tab shows
 * only the missions the player put aside with Save for later. The
 * subscription already drops `archived` cards, so this filters on status
 * alone. Done missions leave the list on their own when their status
 * becomes `approved` (or `pending_review` / `rejected`); the Logbook
 * covers those.
 */
export function getSavedMissionCards(cards: readonly DrawnMissionCard[]): DrawnMissionCard[] {
  return cards.filter(card => card.status === 'saved_for_later');
}
