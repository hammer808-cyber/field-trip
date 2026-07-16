import { HEATWAVE_CHALLENGE_BANK } from '../data/heatwaveChallengeBank';
import { SOCAL_SUMMER_CHALLENGE_BANK } from '../data/socalSummerChallengeBank';
import { STARTER_MISSION_BANK } from '../data/starterMissionBank';
import { ERRAND_DECK_CHALLENGE_BANK } from '../data/errandDeckChallengeBank';
import { JET_SETTER_CHALLENGE_BANK } from '../data/jetSetterChallengeBank';
import { LAUNCH_MISSION, LAUNCH_MISSION_ID } from '../data/specialMissions';
import { TripCard } from '../types/challenges';

const MISSION_BANK: Partial<TripCard>[] = [
  ...STARTER_MISSION_BANK,
  ...HEATWAVE_CHALLENGE_BANK,
  ...SOCAL_SUMMER_CHALLENGE_BANK,
  ...ERRAND_DECK_CHALLENGE_BANK,
  ...JET_SETTER_CHALLENGE_BANK,
];

export function getBuiltInMissionCatalog(): Partial<TripCard>[] {
  return MISSION_BANK.map(mission => ({ ...mission }));
}

/**
 * Resolves a mission object by its ID from all available sources.
 * Sources: Special Missions (Launch), Challenge Bank, Fallback mocks.
 */
export function resolveMissionById(id?: string | null): TripCard | null {
  if (!id) return null;
  
  const rawId = id.trim().toLowerCase();

  // 1. Special Launch Mission Handling
  if (rawId === LAUNCH_MISSION_ID.toLowerCase() || 
      rawId === 'starter-starter') {
    return LAUNCH_MISSION;
  }

  // 2. Canonical local mission bank used by direct capture/briefing routes.
  const foundInBank = MISSION_BANK.find(t => t.id && t.id.toLowerCase() === rawId);
  if (foundInBank) return foundInBank as any;
  
  return null;
}
