
/**
 * Logic for handling reward unlocks and duplicate prevention.
 */

export interface UnlockedRewards {
  stickers: string[];
  badges: string[];
}

export interface NewRewards {
  stickers: string[];
  badges: string[];
}

/**
 * Compares challenge rewards against user's existing collection to find what's new.
 * Returns the net new rewards and the updated full collection.
 */
export function calculateNewRewards(
  existing: UnlockedRewards | null | undefined,
  challengeRewards: { stickers?: string[]; badges?: string[] }
): { newRewards: NewRewards; updatedRewards: UnlockedRewards } {
  const current = existing || { stickers: [], badges: [] };
  const currentStickers = new Set(current.stickers || []);
  const currentBadges = new Set(current.badges || []);

  const newStickers: string[] = [];
  const newBadges: string[] = [];

  if (challengeRewards.stickers) {
    challengeRewards.stickers.forEach(s => {
      if (!currentStickers.has(s)) {
        newStickers.push(s);
      }
    });
  }

  if (challengeRewards.badges) {
    challengeRewards.badges.forEach(b => {
      if (!currentBadges.has(b)) {
        newBadges.push(b);
      }
    });
  }

  return {
    newRewards: {
      stickers: newStickers,
      badges: newBadges
    },
    updatedRewards: {
      stickers: [...(current.stickers || []), ...newStickers],
      badges: [...(current.badges || []), ...newBadges]
    }
  };
}
