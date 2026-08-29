/**
 * Pure presentation helpers for bottom-nav Dex states.
 * Does not change guidance resolution — only maps route/unlock/attention
 * into the Phase 4 CURRENT / NEXT / LOCKED / NORMAL visual contract.
 */

export type BottomNavVisualState = 'current' | 'attention' | 'locked' | 'normal';

export interface DexNavPresentation {
  state: BottomNavVisualState;
  /** Raised Dex personality treatment — only current or the single attention target. */
  special: boolean;
  showHere: boolean;
  showNow: boolean;
  showLocked: boolean;
  markerLabel: 'Here' | 'Now' | 'Locked' | null;
}

export function resolveDexNavPresentation(input: {
  dexUnlocked: boolean;
  isActive: boolean;
  isAttentionTarget: boolean;
}): DexNavPresentation {
  if (!input.dexUnlocked) {
    return {
      state: 'locked',
      special: false,
      showHere: false,
      showNow: false,
      showLocked: true,
      markerLabel: 'Locked',
    };
  }

  if (input.isActive) {
    return {
      state: 'current',
      special: true,
      showHere: true,
      showNow: false,
      showLocked: false,
      markerLabel: 'Here',
    };
  }

  if (input.isAttentionTarget) {
    return {
      state: 'attention',
      special: true,
      showHere: false,
      showNow: true,
      showLocked: false,
      markerLabel: 'Now',
    };
  }

  return {
    state: 'normal',
    special: false,
    showHere: false,
    showNow: false,
    showLocked: false,
    markerLabel: null,
  };
}

/**
 * Player-facing recovery copy after Save for later.
 * Verified recovery surface: /missions guidance strip primary CTA "Resume {title}".
 * DeckShelfPanel does not list saved mission cards.
 */
export const SAVE_FOR_LATER_RECOVERY_HINT =
  'Tap Resume on Missions when you are ready.';

export const SAVE_FOR_LATER_RECOVERY_NOTICE =
  `Saved for later. ${SAVE_FOR_LATER_RECOVERY_HINT}`;
