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
  // A proof needing more work is repaired from Basecamp while the Starter
  // set is unfinished; only a post-Starter player is sent to Missions.
  if (state.activeSubmissionStatus === 'needs_more_proof') {
    return state.onboardingCompleted ? '/missions' : '/basecamp';
  }
  if (!state.onboardingCompleted || state.starterApprovedCount < 3) return '/basecamp';
  return '/basecamp';
}

/**
 * Pre-Starter players stay on Basecamp: the Missions/Deck pages open only
 * once the three Starter missions are approved. Admins bypass the lock.
 * The Starter draw itself happens on Basecamp (guidance intent 'draw-starter'),
 * so a redirect here never strands a player without a next action.
 */
export function shouldRedirectPreStarterToBasecamp(input: {
  pathname: string;
  starterComplete: boolean;
  isAdmin: boolean;
}): boolean {
  if (input.isAdmin || input.starterComplete) return false;
  const path = input.pathname || '';
  return path === '/deck' || path.startsWith('/missions');
}

/**
 * Step 3 (App.tsx): while onboarding isn't complete, only these pages stay
 * reachable — everything else bounces to /basecamp. The mission briefing
 * is on the list because a drawn mission resumes through it: without it,
 * RESUME MISSION navigates to /mission-briefing and the guard sends the
 * player straight back to Basecamp, so the tap looks dead (Nov 16, 2026).
 * Keep this in sync with the route list it mirrors.
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
