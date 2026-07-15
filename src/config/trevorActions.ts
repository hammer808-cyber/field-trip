import type { TrevorContext } from '../services/trevorContextService';

export type TrevorActionId =
  | 'finish_setup'
  | 'complete_classification'
  | 'draw_starter'
  | 'draw_recommended_mission'
  | 'resume_active_mission'
  | 'open_proof_fix'
  | 'open_logbook'
  | 'open_level_progress'
  | 'open_standings'
  | 'open_voting'
  | 'open_crew'
  | 'open_profile'
  | 'open_zine'
  | 'dismiss';

export interface TrevorAction {
  id: TrevorActionId;
  params?: Record<string, string>;
}

export interface ResolvedTrevorAction extends TrevorAction {
  label: string;
  route?: string;
  analyticsEventName: string;
}

interface TrevorActionDefinition {
  label: string | ((context: TrevorContext, params: Readonly<Record<string, string>>) => string);
  analyticsEventName: string;
  isAvailable: (context: TrevorContext, params: Readonly<Record<string, string>>) => boolean;
  buildRoute?: (context: TrevorContext, params: Readonly<Record<string, string>>) => string;
  safeFallback?: TrevorActionId;
}

export const TREVOR_ACTION_REGISTRY: Readonly<Record<TrevorActionId, TrevorActionDefinition>> = {
  finish_setup: {
    label: 'Finish Setup',
    analyticsEventName: 'trevor_finish_setup',
    isAvailable: context => !context.legalComplete,
    buildRoute: () => '/',
    safeFallback: 'open_profile',
  },
  complete_classification: {
    label: 'Choose Explorer Type',
    analyticsEventName: 'trevor_complete_classification',
    isAvailable: context => !context.fieldClassificationComplete,
    buildRoute: () => '/classification',
    safeFallback: 'open_profile',
  },
  draw_starter: {
    label: context => context.starterSubmittedCount === 0 ? 'Start First Signal' : 'Open Starter Signals',
    analyticsEventName: 'trevor_open_starter_deck',
    isAvailable: context => !context.starterComplete && context.accessibleDeckIds.includes('starter-signals'),
    buildRoute: () => '/missions/decks?pack=starter-signals',
    safeFallback: 'open_logbook',
  },
  draw_recommended_mission: {
    label: (_context, params) => params.deckLabel ? `Open ${params.deckLabel}` : 'Find a Mission',
    analyticsEventName: 'trevor_open_recommended_deck',
    isAvailable: (context, params) => {
      const deckId = params.deckId || context.recommendedDeckId;
      return Boolean(deckId && context.accessibleDeckIds.includes(deckId));
    },
    buildRoute: (context, params) => {
      const deckId = params.deckId || context.recommendedDeckId || context.accessibleDeckIds[0];
      return `/missions/decks?pack=${encodeURIComponent(deckId)}`;
    },
    safeFallback: 'open_logbook',
  },
  resume_active_mission: {
    label: (_context, params) => params.missionTitle ? `Resume ${params.missionTitle}` : 'Resume Mission',
    analyticsEventName: 'trevor_resume_active_mission',
    isAvailable: (context, params) => Boolean(params.missionId || context.activeMission?.id),
    buildRoute: (context, params) => {
      const missionId = params.missionId || context.activeMission?.id || '';
      return `/mission-briefing?id=${encodeURIComponent(missionId)}`;
    },
    safeFallback: 'draw_recommended_mission',
  },
  open_proof_fix: {
    label: (_context, params) => params.missionTitle ? `Fix ${params.missionTitle}` : 'Fix Proof',
    analyticsEventName: 'trevor_open_proof_fix',
    isAvailable: (_context, params) => Boolean(params.entryId && params.missionId),
    buildRoute: (_context, params) => {
      const query = new URLSearchParams({ id: params.missionId });
      if (params.status === 'rejected') {
        query.set('isRetry', 'true');
        query.set('originalEntryId', params.entryId);
      } else {
        query.set('mode', 'addMoreProof');
        query.set('entryId', params.entryId);
      }
      return `/capture?${query.toString()}`;
    },
    safeFallback: 'open_logbook',
  },
  open_logbook: {
    label: 'Open Logbook',
    analyticsEventName: 'trevor_open_logbook',
    isAvailable: () => true,
    buildRoute: () => '/profile?tab=logbook',
  },
  open_level_progress: {
    label: 'Check Level Progress',
    analyticsEventName: 'trevor_open_level_progress',
    isAvailable: context => context.starterComplete,
    buildRoute: () => '/profile?tab=overview',
    safeFallback: 'open_profile',
  },
  open_standings: {
    label: 'Check Standings',
    analyticsEventName: 'trevor_open_standings',
    isAvailable: context => context.starterComplete,
    buildRoute: () => '/big-board',
    safeFallback: 'open_logbook',
  },
  open_voting: {
    label: 'Vote Now',
    analyticsEventName: 'trevor_open_weekly_voting',
    isAvailable: context => context.starterComplete && context.votingPhase === 'voting',
    buildRoute: () => '/voting',
    safeFallback: 'open_standings',
  },
  open_crew: {
    label: context => context.crewId ? 'Open Crew Home' : 'Find a Crew',
    analyticsEventName: 'trevor_open_crew',
    isAvailable: context => context.starterComplete && context.crewUnlocked,
    buildRoute: () => '/crew',
    safeFallback: 'draw_recommended_mission',
  },
  open_profile: {
    label: 'Open Profile',
    analyticsEventName: 'trevor_open_profile',
    isAvailable: () => true,
    buildRoute: () => '/profile?tab=settings',
  },
  open_zine: {
    label: 'Open Zines',
    analyticsEventName: 'trevor_open_zines',
    isAvailable: context => context.starterComplete,
    buildRoute: () => '/dex/zines',
    safeFallback: 'open_logbook',
  },
  dismiss: {
    label: 'Hide for This Session',
    analyticsEventName: 'trevor_session_suppressed',
    isAvailable: () => true,
  },
};

export function resolveTrevorAction(
  action: TrevorAction,
  context: TrevorContext,
): ResolvedTrevorAction | null {
  const definition = TREVOR_ACTION_REGISTRY[action.id];
  const params = action.params ?? {};
  if (!definition.isAvailable(context, params)) return null;
  return {
    ...action,
    label: typeof definition.label === 'function'
      ? definition.label(context, params)
      : definition.label,
    route: definition.buildRoute?.(context, params),
    analyticsEventName: definition.analyticsEventName,
  };
}

export function resolveTrevorActionWithFallback(
  action: TrevorAction,
  context: TrevorContext,
): ResolvedTrevorAction | null {
  const direct = resolveTrevorAction(action, context);
  if (direct) return direct;
  const fallbackId = TREVOR_ACTION_REGISTRY[action.id].safeFallback;
  return fallbackId ? resolveTrevorAction({ id: fallbackId }, context) : null;
}
