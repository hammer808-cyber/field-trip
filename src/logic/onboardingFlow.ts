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
