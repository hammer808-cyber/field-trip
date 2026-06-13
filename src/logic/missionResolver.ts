import { HEATWAVE_CHALLENGE_BANK } from '../data/heatwaveChallengeBank';
import { LAUNCH_MISSION, LAUNCH_MISSION_ID } from '../data/specialMissions';
import { TripCard } from '../types/challenges';

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

  // 2. Global Challenge Bank
  const foundInBank = HEATWAVE_CHALLENGE_BANK.find(t => t.id && t.id.toLowerCase() === rawId);
  if (foundInBank) return foundInBank as any;

  // 3. Optional: Search in other banks if they exist
  
  return null;
}
