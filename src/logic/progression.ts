import { FieldTypeId, HEATWAVE_SEASON_START_DATE, HEATWAVE_SEASON_END_DATE } from '../constants';

// GAME CONFIGURATION
export const CONFIG = {
  PRE_SEASON_UNLOCK_DATE: HEATWAVE_SEASON_START_DATE,
  STAGING_UNLOCK_DATE: '2026-05-15T00:00:00Z', // For beta testers
  CREW_MODE_SOLO_REQUIRED: 3,
  FIELD_CHECK_MODE_POINTS_REQUIRED: 250,
  LEADERBOARD_VISIBILITY_POINTS: 50,
  ADMIN_EMAIL_WHITELIST: ['hammer808@gmail.com'], // Example
};

export interface GameState {
  userId: string | null;
  email: string | null;
  xp: number;
  points: number;
  soloTripsCount: number;
  completedCoreChallenges: number;
  onboardingComplete: boolean;
  fieldType: FieldTypeId | null;
  isAdmin: boolean;
  currentDate: Date;
}

/**
 * PATHWAY: Is the viewfinder locked?
 */
export function isViewfinderLocked(state: GameState): boolean {
  if (state.isAdmin) return false;
  const unlockDate = new Date(CONFIG.PRE_SEASON_UNLOCK_DATE);
  return state.currentDate < unlockDate;
}

/**
 * PATHWAY: Can user access Crew Mode?
 */
export function canAccessCrewMode(state: GameState): boolean {
  if (state.isAdmin) return true;
  return state.onboardingComplete;
}

/**
 * PATHWAY: Can user access Field Check Mode?
 */
export function canAccessFieldCheckMode(state: GameState): boolean {
  if (state.isAdmin) return true;
  return state.xp >= CONFIG.FIELD_CHECK_MODE_POINTS_REQUIRED;
}

/**
 * PATHWAY: Is leaderboard visible?
 */
export function isLeaderboardVisible(state: GameState): boolean {
  if (state.isAdmin) return true;
  return state.xp >= CONFIG.LEADERBOARD_VISIBILITY_POINTS;
}

/**
 * PATHWAY: User role identification
 */
export function getUserRole(state: GameState): 'admin' | 'field-agent' | 'recruit' {
  if (state.isAdmin) return 'admin';
  if (state.onboardingComplete) return 'field-agent';
  return 'recruit';
}

/**
 * PATHWAY: Next Milestone Description
 */
export function getNextMilestone(state: GameState): string | null {
  if (!state.onboardingComplete) return "Complete Onboarding to begin Field Ops.";
  if (state.completedCoreChallenges < CONFIG.CREW_MODE_SOLO_REQUIRED) {
    return `Complete ${CONFIG.CREW_MODE_SOLO_REQUIRED - state.completedCoreChallenges} more core challenges to unlock CREW_MODE.`;
  }
  if (state.xp < CONFIG.FIELD_CHECK_MODE_POINTS_REQUIRED) {
    return `Reach ${CONFIG.FIELD_CHECK_MODE_POINTS_REQUIRED} XP to unlock FIELD_CHECK_CAPABILITY.`;
  }
  return "All system nodes synchronized. Operation: Field Trip is full-scale.";
}

/**
 * PATHWAY: Is the Heatwave Deck active?
 * Date Range: June 6, 2026 to August 28, 2026 (inclusive).
 */
export function isHeatwaveDeckActive(currentDate: Date): boolean {
  const start = new Date(HEATWAVE_SEASON_START_DATE);
  const end = new Date(HEATWAVE_SEASON_END_DATE);
  return currentDate >= start && currentDate <= end;
}

/**
 * PATHWAY: Is the Heatwave Deck available/stabilized?
 * Rule: Unlocks 1 day after the season begins.
 */
export function isHeatwaveDeckStabilized(currentDate: Date): boolean {
  const start = new Date(HEATWAVE_SEASON_START_DATE);
  const stabilizedDate = new Date(start.getTime() + (24 * 60 * 60 * 1000));
  return currentDate >= stabilizedDate;
}
