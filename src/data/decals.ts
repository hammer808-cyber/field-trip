/**
 * Decal registry (Nov 20, 2026).
 *
 * Decals are a small collectible set, separate from stickers: one art
 * file each, earned by a named deed. Today there is exactly one —
 * Proud Pulsator, awarded when a Field Pulse week hits 5 actions
 * (AppContext, fieldPulse). The Dex shelf maps over this registry, so
 * a future decal only needs an entry here plus its award rule below.
 */

export interface DecalDefinition {
  id: string;
  name: string;
  imageUrl: string;
  /** One-line flavor shown on the shelf card. */
  tagline: string;
  /** Plain words for how the decal is earned. */
  howToEarn: string;
}

export const DECALS: readonly DecalDefinition[] = [
  {
    id: 'proud-pulsator',
    name: 'Proud Pulsator',
    imageUrl: '/assets/decals/proud-pulsator.png',
    tagline: 'The campfire kept crackling all week.',
    howToEarn: 'Complete 5 actions in one Field Pulse week.',
  },
];

/** The only profile shape the ownership rules need. */
export interface DecalProfile {
  fieldPulse?: {
    pulseStreak?: number;
    lastPulseCompletedWeek?: string;
  } | null;
}

/**
 * Has this player earned this decal? Proud Pulsator is earned the first
 * time a Field Pulse week completes (pulseStreak increments at the same
 * moment lastPulseCompletedWeek is set), so either signal counts.
 * Unknown decal ids are never earned.
 */
export function hasEarnedDecal(
  profile: DecalProfile | null | undefined,
  decalId: string,
): boolean {
  if (decalId !== 'proud-pulsator') return false;
  const pulse = profile?.fieldPulse;
  if (!pulse) return false;
  return (pulse.pulseStreak ?? 0) > 0 || Boolean(pulse.lastPulseCompletedWeek);
}
