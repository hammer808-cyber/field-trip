export const BASE_DECK_PLACEHOLDER = "/assets/decks/base-deck-placeholder.png";

export function getDeckCoverImage(deck: any): string {
  return (
    deck?.coverImage ||
    deck?.artworkUrl ||
    deck?.imageUrl ||
    BASE_DECK_PLACEHOLDER
  );
}
