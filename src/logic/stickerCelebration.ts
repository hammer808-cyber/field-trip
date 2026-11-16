/**
 * Sticker celebration helpers (Stage 5).
 *
 * Pure functions only — no Firestore, no React — so the watcher diff,
 * the rarity mapping, and the once-per-device keys are unit-testable
 * without the app running. The AppContext watcher and the legacy award
 * path both call into this module.
 */
import { RewardIntensity } from '../types/feedback';

/** The 3-level rarity scale (collapsed from 4 levels, Nov 15). */
export type CanonicalStickerRarity = 'common' | 'rare' | 'legendary';

/**
 * Pre-collapse rarity values still carried by the legacy discovery
 * stickers (`discoveryStickers.ts`) and badges (`types/badges.ts`).
 * `secret` is the legacy sticker top tier; `bureau-secret` is the badge
 * system's top tier.
 */
export type LegacyRarity =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'secret'
  | 'bureau-secret';

/**
 * Collapse a legacy 4-level rarity onto the 3-level scale.
 * `uncommon` folds into `common` (the Nov 15 collapse); the secret
 * tiers fold into `rare` — never `legendary`, which is a canonical
 * sticker-registry concept, not a legacy/badge tier.
 */
export function normalizeLegacyRarity(rarity: LegacyRarity): CanonicalStickerRarity {
  switch (rarity) {
    case 'common':
      return 'common';
    case 'uncommon':
      return 'common';
    case 'rare':
      return 'rare';
    case 'secret':
    case 'bureau-secret':
      return 'rare';
  }
}

/**
 * Rarity decides the celebration: legendary gets the full-screen modal,
 * rare gets the medium toast, common gets the small toast. Accepts both
 * canonical and legacy rarities; legacy values are normalized first.
 */
export function celebrationIntensityForRarity(
  rarity: CanonicalStickerRarity | LegacyRarity,
): RewardIntensity {
  const normalized: CanonicalStickerRarity =
    rarity === 'common' || rarity === 'rare' || rarity === 'legendary'
      ? rarity
      : normalizeLegacyRarity(rarity);
  switch (normalized) {
    case 'legendary':
      return RewardIntensity.MAJOR_REVEAL;
    case 'rare':
      return RewardIntensity.MEDIUM_REWARD;
    case 'common':
      return RewardIntensity.MICRO_FEEDBACK;
  }
}

/**
 * Once-per-device key for a sticker celebration. `queueReward` skips any
 * reward whose persistentKey is already set in localStorage, and
 * `dismissReward` sets it on dismiss — so a celebration can never
 * re-fire on this device, without any server state or rules change.
 */
export function celebrationPersistentKey(userId: string, stickerId: string): string {
  return `sticker-celebration:${userId}:${stickerId}`;
}

/**
 * Session-limit key for `queueReward`. Keyed by reward type plus the
 * sticker id when the reward is a sticker, so two *distinct* legendaries
 * in one session each get their modal, while a repeated queue of the
 * *same* sticker in one session still downgrades to a toast.
 */
export function sessionLimitKey(type: string, stickerId?: string): string {
  return stickerId ? `${type}:${stickerId}` : type;
}

/** Minimal sticker-doc shape the watcher diff works on (Firestore-free). */
export interface WatcherStickerDoc {
  stickerId: string;
  /** True once the player has viewed the sticker's detail modal in the Dex. */
  seen: boolean;
  /** `unlockedAt` as epoch ms, or null when the timestamp is missing. */
  unlockedAtMs: number | null;
}

function byUnlockedAt(a: WatcherStickerDoc, b: WatcherStickerDoc): number {
  return (a.unlockedAtMs ?? Infinity) - (b.unlockedAtMs ?? Infinity);
}

/**
 * Docs in `current` that were not in the attach-time `baseline`, in
 * unlock order (oldest first; docs with no timestamp last). These are
 * the fresh awards the watcher celebrates.
 */
export function filterNewStickerDocs(
  baseline: ReadonlySet<string>,
  current: WatcherStickerDoc[],
): WatcherStickerDoc[] {
  return current.filter((doc) => !baseline.has(doc.stickerId)).sort(byUnlockedAt);
}

/**
 * Legendary-only catch-up for awards that landed while the player was
 * away: owned stickers that are legendary and still unseen, in unlock
 * order. Common/rare stickers from while away get no on-load celebration
 * — they show as "New" in the Dex. At most 3 can ever match (only 3
 * legendaries exist). `rarityOf` resolves a sticker id through the
 * registry; unknown ids resolve to `undefined` and are skipped.
 */
export function unseenLegendaryCatchUpDocs(
  docs: WatcherStickerDoc[],
  rarityOf: (stickerId: string) => CanonicalStickerRarity | undefined,
): WatcherStickerDoc[] {
  return docs
    .filter((doc) => !doc.seen && rarityOf(doc.stickerId) === 'legendary')
    .sort(byUnlockedAt);
}
