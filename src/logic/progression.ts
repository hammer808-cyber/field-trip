import { PersonaId } from '../constants';

// GAME CONFIGURATION
export const CONFIG = {
  PRE_SEASON_UNLOCK_DATE: '2026-05-25T00:00:00Z',
  STAGING_UNLOCK_DATE: '2026-05-15T00:00:00Z', // For beta testers
  CREW_MODE_SOLO_REQUIRED: 3,
  SNITCH_MODE_POINTS_REQUIRED: 250,
  LEADERBOARD_VISIBILITY_POINTS: 50,
  ADMIN_EMAIL_WHITELIST: ['hammer808@gmail.com'], // Example
};

export interface GameState {
  userId: string | null;
  email: string | null;
  points: number;
  soloCount: number;
  onboardingComplete: boolean;
  persona: PersonaId | null;
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
  return state.soloCount >= CONFIG.CREW_MODE_SOLO_REQUIRED;
}

/**
 * PATHWAY: Can user access Snitch Mode?
 */
export function canAccessSnitchMode(state: GameState): boolean {
  if (state.isAdmin) return true;
  return state.points >= CONFIG.SNITCH_MODE_POINTS_REQUIRED;
}

/**
 * PATHWAY: Is leaderboard visible?
 */
export function isLeaderboardVisible(state: GameState): boolean {
  if (state.isAdmin) return true;
  return state.points >= CONFIG.LEADERBOARD_VISIBILITY_POINTS;
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
  if (state.soloCount < CONFIG.CREW_MODE_SOLO_REQUIRED) {
    return `Complete ${CONFIG.CREW_MODE_SOLO_REQUIRED - state.soloCount} more solo missions to unlock CREW_MODE.`;
  }
  if (state.points < CONFIG.SNITCH_MODE_POINTS_REQUIRED) {
    return `Reach ${CONFIG.SNITCH_MODE_POINTS_REQUIRED} points to unlock SNITCH_CAPABILITY.`;
  }
  return "All system nodes synchronized. Operation: Field Trip is full-scale.";
}
