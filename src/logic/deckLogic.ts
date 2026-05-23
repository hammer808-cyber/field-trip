import { TripCard as TripType } from '../types/challenges';
import { DeckPack } from '../types/deckPacks';

export type DrawPoolReason = 
  | 'onboarding_active' 
  | 'onboarding_complete' 
  | 'season_locked' 
  | 'pack_exhausted' 
  | 'loading' 
  | 'no_missions';

export interface EligibleDrawPoolResult {
  eligibleMissions: TripType[];
  reason: DrawPoolReason | null;
}

/**
 * The canonical source of truth for which missions a user can currently draw.
 */
export function getEligibleDrawPool({
  missions,
  completedMissionIds,
  isOnboardingComplete,
  activePack,
  isSummerDeckUnlocked,
  isAdmin,
}: {
  missions: TripType[];
  completedMissionIds: Set<string>;
  isOnboardingComplete: boolean;
  activePack: DeckPack | null;
  isSummerDeckUnlocked: boolean;
  isAdmin: boolean;
}): EligibleDrawPoolResult {
  if (!missions || missions.length === 0) {
    return { eligibleMissions: [], reason: 'loading' };
  }

  const ONBOARDING_IDS = ["starter-1", "starter-2", "starter-3"];
  let pool: TripType[] = [];
  let reason: DrawPoolReason | null = null;

  // 1. Onboarding Priority
  if (!isOnboardingComplete && !isAdmin) {
    pool = missions.filter(m => ONBOARDING_IDS.includes(m.id.toLowerCase()));
    reason = 'onboarding_active';
  } 
  // 2. Post-Onboarding Active Pack
  else if (activePack) {
    // Check if pack is seasonal and locked
    const isSeasonalPack = activePack.packId.toLowerCase().includes('summer');
    if (isSeasonalPack && !isSummerDeckUnlocked && !isAdmin) {
      return { eligibleMissions: [], reason: 'season_locked' };
    }

    pool = missions.filter(m => activePack.missionIds.includes(m.id));
  } 
  // 3. Default: Unlocked bank (Fallback)
  else {
    pool = missions.filter(m => {
      if (m.lane === 'seasonal') return isSummerDeckUnlocked || isAdmin;
      return true;
    });
  }

  // Filter out completed missions and ensure available status
  const eligibleMissions = pool.filter(m => {
    const isCompleted = completedMissionIds.has(m.id.toLowerCase());
    const isAllowedStatus = m.status === 'available' || m.status === 'approved' || m.status === 'active';
    return isAllowedStatus && !isCompleted;
  });

  if (eligibleMissions.length === 0) {
    if (!isOnboardingComplete && !isAdmin) {
      reason = 'onboarding_complete'; // Should trigger progression update
    } else {
      reason = 'pack_exhausted';
    }
  }

  return { eligibleMissions, reason };
}
