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
  if (state.activeSubmissionStatus === 'needs_more_proof') return '/missions';
  if (!state.onboardingCompleted || state.starterApprovedCount < 3) return '/missions';
  return '/basecamp';
}
