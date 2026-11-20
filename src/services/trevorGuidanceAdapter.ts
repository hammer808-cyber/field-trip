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
  DECK_COMPLETE: 'deck_complete',
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
  DECK_COMPLETE: 'discovery',
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
    : guidance.state === 'DECK_COMPLETE'
      ? 'celebration'
      : 'normal';

  // Trevor nearby suggestion (Nov 20, 2026): a DRAW_MISSION whose deck was
  // chosen for proximity speaks the nearby_deck line instead of the generic
  // fallback_draw line. Every other state maps exactly as before.
  const messageKey = guidance.state === 'DRAW_MISSION' && guidance.deckIdIsNearby
    ? 'nearby_deck'
    : STATE_TO_MESSAGE_KEY[guidance.state];

  // Trevor deck-complete chooser (Nov 20, 2026): the 2nd and 3rd ranked
  // next decks ride as additional actions; the top-ranked deck stays the
  // primary action. No other state carries additional actions.
  const additionalActions = guidance.state === 'DECK_COMPLETE'
    ? (guidance.nextDeckIds ?? []).slice(1).map((deckId, index) => ({
      id: 'draw_recommended_mission' as const,
      label: `Draw from ${guidance.nextDeckNames?.[index + 1] || deckId}`,
      route: `/missions?pack=${encodeURIComponent(deckId)}`,
      analyticsEventName: 'trevor_guidance_additional',
    }))
    : undefined;

  return {
    id: `guidance_${guidance.state.toLowerCase()}`,
    priority: guidance.priority,
    category: STATE_TO_CATEGORY[guidance.state],
    messageKey,
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
    ...(additionalActions && additionalActions.length > 0 ? { additionalActions } : {}),
  };
}
