export interface OnboardingDestinationState {
  hasConfirmedLegal: boolean;
  fieldClassificationComplete: boolean;
  hasSeenFieldTypeResults: boolean;
  onboardingCompleted: boolean;
  starterApprovedCount: number;
  activeSubmissionStatus?: string | null;
}

export function resolveOnboardingDestination(state: OnboardingDestinationState): string {
  if (!state.hasConfirmedLegal) return '/';
  if (!state.fieldClassificationComplete) return '/classification';
  if (!state.hasSeenFieldTypeResults) return '/field-type';
  // A proof needing more work is repaired on Missions (capture), whether
  // the Starter set is done or not — the deck is the pre-Starter home.
  if (state.activeSubmissionStatus === 'needs_more_proof') {
    return '/missions';
  }
  // Pre-Starter players land on the deck: flip the card, do the mission,
  // repeat three times. Basecamp unlocks once the Starter set is approved.
  if (!state.onboardingCompleted || state.starterApprovedCount < 3) return '/missions';
  return '/basecamp';
}

/**
 * Pre-Starter players live on Missions: Basecamp stays locked until the
 * three Starter missions are approved. Admins bypass the lock. A redirect
 * here never strands a player — /missions is the deck, and the Starter
 * draw happens there.
 */
export function shouldRedirectPreStarterToMissions(input: {
  pathname: string;
  starterComplete: boolean;
  isAdmin: boolean;
}): boolean {
  if (input.isAdmin || input.starterComplete) return false;
  const path = input.pathname || '';
  return path === '/basecamp';
}

/**
 * Step 3 (App.tsx): while onboarding isn't complete, only these pages stay
 * reachable — everything else bounces to /missions, the pre-Starter home.
 * The mission briefing is on the list because a drawn mission resumes
 * through it: without it, RESUME MISSION navigates to /mission-briefing
 * and the guard sends the player straight back, so the tap looks dead
 * (Nov 16, 2026). Keep this in sync with the route list it mirrors.
 */
export function isAllowedPreStarterPage(pathname: string): boolean {
  const path = pathname || '';
  return path === '/deck'
    || path.startsWith('/missions')
    || path.startsWith('/capture')
    || path === '/profile'
    || path === '/big-board'
    || path === '/field-type'
    || path === '/persona'
    || path === '/basecamp'
    || path.startsWith('/crew')
    || path.startsWith('/collection')
    || path.startsWith('/dex')
    || path.startsWith('/memories')
    || path.startsWith('/voting')
    || path.startsWith('/loteria')
    || path === '/mission-briefing';
}
