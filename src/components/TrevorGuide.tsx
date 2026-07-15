import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { renderTrevorDialogue } from '../content/trevorDialogue';
import {
  buildTrevorContext,
  isTrevorFocusedRoute,
} from '../services/trevorContextService';
import {
  getTrevorRecommendation,
  type ResolvedTrevorRecommendation,
} from '../services/trevorRecommendationEngine';
import {
  isTrevorSuppressedForSession,
  readTrevorHistory,
  recordTrevorRecommendation,
  suppressTrevorForSession,
} from '../services/trevorHistoryService';
import type { ResolvedTrevorAction } from '../config/trevorActions';
import { reduceTrevorPanelState, TrevorGuideView } from './TrevorGuideView';

export function TrevorGuide() {
  const app = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const previousRecommendationId = useRef<string | null>(null);
  const [hasNewState, setHasNewState] = useState(false);
  const [panelState, dispatchPanelEvent] = useReducer(reduceTrevorPanelState, {
    isExpanded: false,
    isSuppressed: false,
  });

  const accessibleDecks = useMemo(
    () => app.deckPacks.filter(deck => app.getDeckAccessForPack(deck).playable),
    [app.deckPacks, app.getDeckAccessForPack],
  );

  const trevorContext = useMemo(() => buildTrevorContext({
    userId: app.user?.uid,
    currentRoute: location.pathname,
    profile: app.profile,
    entries: app.entries,
    trips: app.trips,
    activeTrip: app.activeTrip,
    activeSubmissionStatus: app.activeSubmissionStatus,
    drawnMissionCards: app.drawnMissionCards,
    memories: app.memories,
    accessibleDecks,
    standings: app.standings,
    userVotes: app.userVotes,
    currentDate: app.currentDate,
    legalComplete: app.hasConfirmedLegal,
    fieldClassificationComplete: app.fieldClassificationComplete,
    onboardingComplete: app.onboardingCompleted,
    starterApprovedCount: app.starterApprovedCount,
    starterRequiredCount: app.starterState.starterRequiredCount,
    starterSubmittedCount: app.starterState.submittedUniqueCount,
    starterComplete: app.starterState.starterComplete,
    pendingProofCount: app.submittedPendingChallengeIds.size,
    needsMoreProofCount: app.needsMoreProofChallengeIds.size,
    approvedProofCount: app.approvedEntriesCount,
    currentXp: app.xp,
    crewUnlocked: app.crewUnlocked,
    // The shell has no canonical open-crew-task source yet. Keep this false
    // instead of inferring an action from crew membership alone.
    crewHasOpenTasks: false,
  }), [
    accessibleDecks,
    app.activeSubmissionStatus,
    app.activeTrip,
    app.approvedEntriesCount,
    app.crewUnlocked,
    app.currentDate,
    app.drawnMissionCards,
    app.entries,
    app.fieldClassificationComplete,
    app.hasConfirmedLegal,
    app.memories,
    app.needsMoreProofChallengeIds,
    app.onboardingCompleted,
    app.profile,
    app.standings,
    app.starterApprovedCount,
    app.starterState,
    app.submittedPendingChallengeIds,
    app.trips,
    app.user?.uid,
    app.userVotes,
    app.xp,
    location.pathname,
  ]);

  const history = useMemo(
    () => readTrevorHistory(trevorContext.userId),
    [trevorContext.userId, location.pathname],
  );
  const recommendation = useMemo(
    () => getTrevorRecommendation(trevorContext, { history, now: app.currentDate }),
    [app.currentDate, history, trevorContext],
  );
  const message = recommendation
    ? renderTrevorDialogue(recommendation, trevorContext, history)
    : '';

  useEffect(() => {
    dispatchPanelEvent('collapse');
  }, [location.pathname]);

  useEffect(() => {
    if (!recommendation) return;
    if (previousRecommendationId.current && previousRecommendationId.current !== recommendation.id) {
      setHasNewState(true);
      const timer = window.setTimeout(() => setHasNewState(false), 3000);
      previousRecommendationId.current = recommendation.id;
      return () => window.clearTimeout(timer);
    }
    previousRecommendationId.current = recommendation.id;
  }, [recommendation?.id]);

  useEffect(() => {
    if (!panelState.isExpanded) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dispatchPanelEvent('collapse');
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [panelState.isExpanded]);

  const userDisabledTrevor = app.profile?.fieldGuideAssistEnabled === false
    || app.profile?.trevorSettings?.enabled === false;
  const sessionSuppressed = panelState.isSuppressed
    || isTrevorSuppressedForSession(trevorContext.userId);

  if (
    !app.fieldGuideAssistEnabled
    || userDisabledTrevor
    || sessionSuppressed
    || !app.user
    || !recommendation
    || isTrevorFocusedRoute(location.pathname)
  ) {
    return null;
  }

  const handleOpen = () => {
    dispatchPanelEvent('open');
    recordTrevorRecommendation(trevorContext.userId, recommendation.id, app.currentDate);
  };

  const handleAction = (action: ResolvedTrevorAction) => {
    emitTrevorActionEvent(recommendation, action);
    if (action.route) navigate(action.route);
    dispatchPanelEvent('collapse');
  };

  const handleSuppress = () => {
    suppressTrevorForSession(trevorContext.userId);
    emitTrevorActionEvent(recommendation, {
      id: 'dismiss',
      label: 'Hide for This Session',
      analyticsEventName: 'trevor_session_suppressed',
    });
    dispatchPanelEvent('suppress');
  };

  return (
    <TrevorGuideView
      recommendation={recommendation}
      message={message}
      isExpanded={panelState.isExpanded}
      hasNewState={hasNewState}
      onOpen={handleOpen}
      onCollapse={() => dispatchPanelEvent('collapse')}
      onAction={handleAction}
      onSuppress={handleSuppress}
    />
  );
}

function emitTrevorActionEvent(
  recommendation: ResolvedTrevorRecommendation,
  action: ResolvedTrevorAction,
): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('fieldtrip:trevor-action', {
    detail: {
      recommendationId: recommendation.id,
      category: recommendation.category,
      actionId: action.id,
      analyticsEventName: action.analyticsEventName,
      route: action.route || null,
    },
  }));
  if (import.meta.env.DEV) {
    console.info('[TrevorGuide]', {
      recommendationId: recommendation.id,
      reason: recommendation.reason,
      actionId: action.id,
      route: action.route || null,
    });
  }
}
