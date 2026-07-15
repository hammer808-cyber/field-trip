import {
  resolveTrevorAction,
  type ResolvedTrevorAction,
  type TrevorAction,
} from '../config/trevorActions';
import type { TrevorContext, TrevorProofRepairTarget } from './trevorContextService';
import {
  isRecommendationCoolingDown,
  type TrevorHistoryEntry,
} from './trevorHistoryService';

export type TrevorRecommendationCategory =
  | 'onboarding'
  | 'mission'
  | 'proof'
  | 'progression'
  | 'ranking'
  | 'voting'
  | 'crew'
  | 'profile'
  | 'zine'
  | 'discovery';

export type TrevorRecommendationTone = 'normal' | 'warning' | 'celebration' | 'stuck';

export type TrevorMessageKey =
  | 'legal_required'
  | 'classification_required'
  | 'proof_needs_more'
  | 'starter_retry'
  | 'starter_active'
  | 'starter_incomplete'
  | 'starter_pending'
  | 'active_mission'
  | 'voting_open'
  | 'starter_complete_unlock'
  | 'near_level'
  | 'weekly_rank'
  | 'crew_action'
  | 'profile_incomplete'
  | 'zine_gap'
  | 'proof_variety'
  | 'mission_discovery'
  | 'fallback_draw'
  | 'fallback_standings';

export interface TrevorRecommendation {
  id: string;
  priority: number;
  category: TrevorRecommendationCategory;
  messageKey: TrevorMessageKey;
  reason: string;
  primaryAction: TrevorAction;
  secondaryAction?: TrevorAction;
  cooldownHours?: number;
  tone?: TrevorRecommendationTone;
}

export interface ResolvedTrevorRecommendation extends Omit<TrevorRecommendation, 'primaryAction' | 'secondaryAction'> {
  primaryAction: ResolvedTrevorAction;
  secondaryAction?: ResolvedTrevorAction;
}

export interface TrevorRule {
  id: string;
  evaluate(context: TrevorContext): TrevorRecommendation | null;
}

interface RecommendationOptions {
  history?: readonly TrevorHistoryEntry[];
  now?: Date;
  rules?: readonly TrevorRule[];
}

const RESUMABLE_MISSION_STATUSES = new Set(['active', 'drawn', 'saved_for_later', 'available', 'in-progress']);

export const TREVOR_RULES: readonly TrevorRule[] = [
  {
    id: 'proof_needs_more',
    evaluate(context) {
      if (context.needsMoreProofCount <= 0) return null;
      return {
        id: 'proof_needs_more',
        priority: 1000,
        category: 'proof',
        messageKey: 'proof_needs_more',
        reason: context.proofNeedingMoreEvidence ? 'repairable_proof_found' : 'repairable_proof_not_loaded',
        primaryAction: context.proofNeedingMoreEvidence
          ? getProofRepairAction(context.proofNeedingMoreEvidence)
          : { id: 'open_logbook' },
        secondaryAction: context.proofNeedingMoreEvidence ? { id: 'open_logbook' } : undefined,
        tone: 'warning',
      };
    },
  },
  {
    id: 'required_onboarding',
    evaluate(context) {
      if (!context.legalComplete) {
        return {
          id: 'legal_required',
          priority: 950,
          category: 'onboarding',
          messageKey: 'legal_required',
          reason: 'legal_setup_incomplete',
          primaryAction: { id: 'finish_setup' },
          tone: 'warning',
        };
      }
      if (!context.fieldClassificationComplete) {
        return {
          id: 'classification_required',
          priority: 940,
          category: 'onboarding',
          messageKey: 'classification_required',
          reason: 'explorer_type_missing',
          primaryAction: { id: 'complete_classification' },
          tone: 'warning',
        };
      }
      if (context.starterComplete) return null;
      if (context.rejectedProof) {
        return {
          id: 'starter_retry',
          priority: 930,
          category: 'onboarding',
          messageKey: 'starter_retry',
          reason: 'starter_proof_rejected',
          primaryAction: getProofRepairAction(context.rejectedProof),
          secondaryAction: { id: 'open_logbook' },
          tone: 'warning',
        };
      }
      if (context.activeMission?.deckId === 'starter-signals' && isMissionResumable(context)) {
        return {
          id: 'starter_active',
          priority: 925,
          category: 'onboarding',
          messageKey: 'starter_active',
          reason: 'starter_mission_active',
          primaryAction: getResumeAction(context),
          secondaryAction: { id: 'open_logbook' },
        };
      }
      if (context.starterSubmittedCount >= context.starterRequiredCount && context.pendingProofCount > 0) {
        return {
          id: 'starter_pending',
          priority: 920,
          category: 'onboarding',
          messageKey: 'starter_pending',
          reason: 'starter_proofs_waiting_for_review',
          primaryAction: { id: 'open_logbook' },
        };
      }
      return {
        id: 'starter_incomplete',
        priority: 910,
        category: 'onboarding',
        messageKey: 'starter_incomplete',
        reason: 'starter_approvals_incomplete',
        primaryAction: { id: 'draw_starter' },
        secondaryAction: context.pendingProofCount > 0 ? { id: 'open_logbook' } : undefined,
      };
    },
  },
  {
    id: 'active_mission',
    evaluate(context) {
      if (!context.activeMission || !isMissionResumable(context)) return null;
      return {
        id: 'active_mission',
        priority: 850,
        category: 'mission',
        messageKey: 'active_mission',
        reason: 'resumable_active_mission',
        primaryAction: getResumeAction(context),
        secondaryAction: { id: 'open_logbook' },
        cooldownHours: 2,
      };
    },
  },
  {
    id: 'voting_open',
    evaluate(context) {
      if (context.votingPhase !== 'voting' || context.hasVotedThisCycle) return null;
      return {
        id: 'voting_open',
        priority: 800,
        category: 'voting',
        messageKey: 'voting_open',
        reason: 'weekly_vote_available',
        primaryAction: { id: 'open_voting' },
        secondaryAction: { id: 'open_standings' },
        cooldownHours: 2,
      };
    },
  },
  {
    id: 'starter_complete_unlock',
    evaluate(context) {
      if (!context.starterComplete || !context.hasUnseenStarterUnlock || context.experienceStage !== 'new_explorer') return null;
      return {
        id: 'starter_complete_unlock',
        priority: 750,
        category: 'discovery',
        messageKey: 'starter_complete_unlock',
        reason: 'starter_complete_new_explorer',
        primaryAction: getRecommendedMissionAction(context),
        secondaryAction: { id: 'open_level_progress' },
        cooldownHours: 72,
        tone: 'celebration',
      };
    },
  },
  {
    id: 'near_level',
    evaluate(context) {
      const threshold = Math.max(75, Math.floor(context.xpForNextLevel * 0.2));
      if (context.xpToNextLevel <= 0 || context.xpToNextLevel > threshold) return null;
      return {
        id: 'near_level',
        priority: 700,
        category: 'progression',
        messageKey: 'near_level',
        reason: 'xp_gap_within_twenty_percent',
        primaryAction: getRecommendedMissionAction(context),
        secondaryAction: { id: 'open_level_progress' },
        cooldownHours: 12,
      };
    },
  },
  {
    id: 'weekly_rank',
    evaluate(context) {
      if (!context.weeklyRank || !context.pointsToNextRank || context.pointsToNextRank > 250) return null;
      return {
        id: 'weekly_rank',
        priority: 650,
        category: 'ranking',
        messageKey: 'weekly_rank',
        reason: 'verified_nearby_weekly_rank_gap',
        primaryAction: getRecommendedMissionAction(context),
        secondaryAction: { id: 'open_standings' },
        cooldownHours: 12,
      };
    },
  },
  {
    id: 'crew_action',
    evaluate(context) {
      if (!context.crewHasOpenTasks || !context.crewUnlocked) return null;
      return {
        id: 'crew_action',
        priority: 600,
        category: 'crew',
        messageKey: 'crew_action',
        reason: 'canonical_crew_open_task',
        primaryAction: { id: 'open_crew' },
        secondaryAction: { id: 'open_logbook' },
        cooldownHours: 8,
      };
    },
  },
  {
    id: 'profile_incomplete',
    evaluate(context) {
      if (context.profileCompleteness >= 100 || context.missingProfileFields.length === 0) return null;
      return {
        id: 'profile_incomplete',
        priority: 550,
        category: 'profile',
        messageKey: 'profile_incomplete',
        reason: `missing_${context.missingProfileFields[0]}`,
        primaryAction: { id: 'open_profile' },
        secondaryAction: { id: 'open_logbook' },
        cooldownHours: 48,
      };
    },
  },
  {
    id: 'zine_gap',
    evaluate(context) {
      if (context.zineContentGaps.length === 0) return null;
      return {
        id: `zine_gap_${context.zineContentGaps[0]}`,
        priority: 500,
        category: 'zine',
        messageKey: 'zine_gap',
        reason: `zine_missing_${context.zineContentGaps[0]}`,
        primaryAction: getRecommendedMissionAction(context),
        secondaryAction: { id: 'open_zine' },
        cooldownHours: 24,
      };
    },
  },
  {
    id: 'proof_variety',
    evaluate(context) {
      if (!context.repeatedProofType) return null;
      return {
        id: `proof_variety_${context.repeatedProofType}`,
        priority: 450,
        category: 'discovery',
        messageKey: 'proof_variety',
        reason: `three_recent_${context.repeatedProofType}_proofs`,
        primaryAction: getRecommendedMissionAction(context),
        secondaryAction: { id: 'open_logbook' },
        cooldownHours: 24,
      };
    },
  },
  {
    id: 'mission_discovery',
    evaluate(context) {
      if (!context.recommendedDeckId || context.recentlyUsedDeckIds.includes(context.recommendedDeckId)) return null;
      return {
        id: `mission_discovery_${context.recommendedDeckId}`,
        priority: 400,
        category: 'discovery',
        messageKey: 'mission_discovery',
        reason: 'accessible_deck_not_recently_used',
        primaryAction: getRecommendedMissionAction(context),
        secondaryAction: { id: 'open_logbook' },
        cooldownHours: 18,
      };
    },
  },
  {
    id: 'fallback_draw',
    evaluate(context) {
      if (!context.recommendedDeckId) return null;
      return {
        id: 'fallback_draw',
        priority: 100,
        category: 'mission',
        messageKey: 'fallback_draw',
        reason: 'no_higher_priority_action',
        primaryAction: getRecommendedMissionAction(context),
        secondaryAction: { id: 'open_standings' },
        cooldownHours: 4,
      };
    },
  },
  {
    id: 'fallback_standings',
    evaluate(context) {
      if (!context.starterComplete) return null;
      return {
        id: 'fallback_standings',
        priority: 50,
        category: 'ranking',
        messageKey: 'fallback_standings',
        reason: 'no_mission_destination_available',
        primaryAction: { id: 'open_standings' },
        secondaryAction: { id: 'open_logbook' },
        cooldownHours: 4,
      };
    },
  },
] as const;

export function getTrevorRecommendation(
  context: TrevorContext,
  options: RecommendationOptions = {},
): ResolvedTrevorRecommendation | null {
  const history = options.history ?? [];
  const now = options.now ?? new Date();
  const candidates = (options.rules ?? TREVOR_RULES)
    .map(rule => rule.evaluate(context))
    .filter((recommendation): recommendation is TrevorRecommendation => recommendation !== null)
    .sort((left, right) => right.priority - left.priority);

  for (const recommendation of candidates) {
    if (isRecommendationCoolingDown(recommendation.id, recommendation.cooldownHours, history, now)) continue;

    const primaryAction = resolveTrevorAction(recommendation.primaryAction, context);
    if (!primaryAction) continue;
    const secondaryAction = recommendation.secondaryAction
      ? resolveTrevorAction(recommendation.secondaryAction, context)
      : null;
    const distinctSecondary = secondaryAction
      && secondaryAction.id !== primaryAction.id
      && (!secondaryAction.route || secondaryAction.route !== primaryAction.route)
      ? secondaryAction
      : undefined;

    return {
      ...recommendation,
      primaryAction,
      secondaryAction: distinctSecondary,
    };
  }
  return null;
}

function isMissionResumable(context: TrevorContext): boolean {
  return Boolean(context.activeMission && RESUMABLE_MISSION_STATUSES.has(context.activeMission.status));
}

function getResumeAction(context: TrevorContext): TrevorAction {
  return {
    id: 'resume_active_mission',
    params: {
      missionId: context.activeMission?.id || '',
      missionTitle: context.activeMission?.title || 'Mission',
    },
  };
}

function getProofRepairAction(target: TrevorProofRepairTarget): TrevorAction {
  return {
    id: 'open_proof_fix',
    params: {
      entryId: target.entryId,
      missionId: target.missionId,
      missionTitle: target.missionTitle || 'Proof',
      status: target.status,
    },
  };
}

function getRecommendedMissionAction(context: TrevorContext): TrevorAction {
  return {
    id: 'draw_recommended_mission',
    params: {
      deckId: context.recommendedDeckId || '',
      deckLabel: formatDeckLabel(context.recommendedDeckId),
    },
  };
}

function formatDeckLabel(deckId?: string): string {
  if (!deckId) return 'Missions';
  return deckId
    .split('-')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
