import type { PlayerGuidanceSnapshot } from '../logic/playerGuidance';
import type { ResolvedTrevorRecommendation } from './trevorRecommendationEngine';

const STATE_TO_MESSAGE_KEY: Record<PlayerGuidanceSnapshot['state'], ResolvedTrevorRecommendation['messageKey']> = {
  COMPLETE_ONBOARDING: 'classification_required',
  REPAIR_PROOF: 'proof_needs_more',
  RETRY_REJECTED_PROOF: 'starter_retry',
  RESUME_ACTIVE_MISSION: 'active_mission',
  DRAW_STARTER_MISSION: 'starter_incomplete',
  DRAW_NEXT_STARTER: 'starter_incomplete',
  WAITING_FOR_STARTER_REVIEW: 'starter_pending',
  STARTER_COMPLETE: 'starter_complete_unlock',
  DRAW_MISSION: 'fallback_draw',
  VOTE_AVAILABLE: 'voting_open',
  NO_URGENT_ACTION: 'fallback_draw',
};

const STATE_TO_CATEGORY: Record<PlayerGuidanceSnapshot['state'], ResolvedTrevorRecommendation['category']> = {
  COMPLETE_ONBOARDING: 'onboarding',
  REPAIR_PROOF: 'proof',
  RETRY_REJECTED_PROOF: 'onboarding',
  RESUME_ACTIVE_MISSION: 'mission',
  DRAW_STARTER_MISSION: 'onboarding',
  DRAW_NEXT_STARTER: 'onboarding',
  WAITING_FOR_STARTER_REVIEW: 'onboarding',
  STARTER_COMPLETE: 'discovery',
  DRAW_MISSION: 'mission',
  VOTE_AVAILABLE: 'voting',
  NO_URGENT_ACTION: 'mission',
};

/**
 * Trevor may add personality, but his primary destination must match the
 * shared player-guidance snapshot. He does not independently choose a
 * competing next action.
 */
export function buildTrevorRecommendationFromGuidance(
  guidance: PlayerGuidanceSnapshot,
): ResolvedTrevorRecommendation {
  const tone = guidance.urgency === 'critical'
    ? 'warning'
    : guidance.state === 'STARTER_COMPLETE'
      ? 'celebration'
      : 'normal';

  return {
    id: `guidance_${guidance.state.toLowerCase()}`,
    priority: guidance.priority,
    category: STATE_TO_CATEGORY[guidance.state],
    messageKey: STATE_TO_MESSAGE_KEY[guidance.state],
    reason: `player_guidance_${guidance.state}`,
    tone,
    primaryAction: {
      id: guidance.state === 'REPAIR_PROOF' || guidance.state === 'RETRY_REJECTED_PROOF'
        ? 'open_proof_fix'
        : guidance.state === 'VOTE_AVAILABLE'
          ? 'open_voting'
          : guidance.state === 'RESUME_ACTIVE_MISSION'
            ? 'resume_active_mission'
            : 'draw_recommended_mission',
      label: guidance.primaryActionLabel,
      route: guidance.primaryActionDestination,
      analyticsEventName: 'trevor_guidance_primary',
    },
    secondaryAction: guidance.secondaryAction
      ? {
          id: 'open_logbook',
          label: guidance.secondaryAction.label,
          route: guidance.secondaryAction.destination,
          analyticsEventName: 'trevor_guidance_secondary',
        }
      : undefined,
  };
}
