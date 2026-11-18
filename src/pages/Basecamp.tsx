import React from 'react';
import { Compass, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BasecampAttentionPanel } from '../components/basecamp/BasecampAttentionPanel';
import { BasecampBoard } from '../components/basecamp/BasecampBoard';
import { BasecampCrewSummary } from '../components/basecamp/BasecampCrewSummary';
import { BasecampNextActionPanel } from '../components/basecamp/BasecampNextActionPanel';
import { BasecampNotifications } from '../components/basecamp/BasecampNotifications';
import { BasecampProgressPanel } from '../components/basecamp/BasecampProgressPanel';
import { BasecampQuickLinks } from '../components/basecamp/BasecampQuickLinks';
import { FieldPageHero } from '../components/FieldPageHero';
import { IOSHomeScreenPrompt } from '../components/profile/IOSHomeScreenPrompt';
import { useApp } from '../context/AppContext';
import { FIELD_TYPES } from '../constants';
import { getDeckPackById } from '../data/deckPacks';
import {
  buildBasecampViewModel,
  type BasecampNotificationItem,
  type BasecampPrimaryAction,
} from '../logic/basecampViewModel';
import { acknowledgeStarterUnlockSeen } from '../services/starterUnlockAck';
import { getSeasonCountdown } from '../utils/seasonCountdown';
import './Basecamp.css';

export default function Basecamp() {
  const {
    activeSeason,
    activeSubmissionStatus,
    activeTrip,
    badgeProgress,
    canonicalProgress,
    currentDate,
    currentWeekNumber,
    drawnMissionCards,
    entries,
    fieldType,
    isAdmin,
    isHeatwaveDeckUnlocked,
    isVotingWindowOpen,
    observations,
    profile,
    retryMissionSubmission,
    trips,
    user,
    userVotes,
    notifications,
    crewGraph,
  } = useApp();
  const navigate = useNavigate();

  const viewModel = React.useMemo(() => buildBasecampViewModel({
    canonicalProgress,
    entries,
    activeTrip,
    activeSubmissionStatus,
    drawnMissionCards,
    trips,
    profile,
    badgeProgress,
    observations,
    userVotes,
    notifications,
    currentDate,
    isHeatwaveDeckUnlocked,
    isVotingOpen: isVotingWindowOpen(currentWeekNumber),
    crewGraph: {
      acceptedCount: crewGraph?.acceptedCount || 0,
      incomingCount: crewGraph?.incomingCount || 0,
    },
  }), [
    activeSubmissionStatus,
    activeTrip,
    badgeProgress,
    canonicalProgress,
    currentDate,
    currentWeekNumber,
    drawnMissionCards,
    entries,
    isHeatwaveDeckUnlocked,
    isVotingWindowOpen,
    observations,
    profile,
    trips,
    userVotes,
    notifications,
    crewGraph,
  ]);

  const fieldTypeName = fieldType ? FIELD_TYPES[fieldType]?.name : null;
  const activePack = getDeckPackById(viewModel.nextAction.deckId);

  // The deck info lives here now (Nov 17, 2026): Missions is bare — deck,
  // draw, card — so Basecamp carries the active deck and the season
  // countdown, linking out to the shelf in DEX.
  // The season countdown lives in the header now (Nov 17, 2026): the same
  // fact shown once — it used to sit in the Active Deck row below.
  const seasonCountdown = activeSeason
    ? getSeasonCountdown(activeSeason, currentDate)
    : null;
  const headerSeasonLine = seasonCountdown
    ? seasonCountdown.status === 'active'
      ? `${seasonCountdown.label} · Week ${currentWeekNumber}`
      : seasonCountdown.label
    : null;

  React.useEffect(() => {
    if (!import.meta.env.DEV || !(profile?.id || user?.uid)) return;
    console.log('[DEV_LOG] [Basecamp] Canonical board ready:', {
      sourceCollection: 'AppContext canonical state',
      userId: profile?.id || user?.uid,
      approvedCount: canonicalProgress.approvedCompletedChallengeIds.size,
      starter: canonicalProgress.starter.label,
      activeMissionId: viewModel.nextAction.mission?.id || null,
      proofAttentionCount: viewModel.attention.actionableCount,
    });
  }, [canonicalProgress, profile?.id, user?.uid, viewModel]);

  // The Starter draw lives on Missions now: Basecamp's next action only
  // navigates (or retries a proof). Basecamp itself never draws.
  const runAction = React.useCallback(async (action: BasecampPrimaryAction) => {
    if (
      viewModel.guidance.state === 'STARTER_COMPLETE'
      && (profile?.id || user?.uid)
      && canonicalProgress.starter.starterComplete
    ) {
      try {
        await acknowledgeStarterUnlockSeen(
          profile?.id || user!.uid,
          canonicalProgress.starter.starterApprovedCount,
        );
      } catch (error) {
        console.warn('[Basecamp] Failed to acknowledge Starter unlock:', error);
      }
    }
    if (action.intent === 'retry-proof' && action.missionId) {
      await retryMissionSubmission(action.missionId);
    }
    navigate(action.href);
  }, [
    navigate,
    retryMissionSubmission,
    viewModel.guidance.state,
    profile?.id,
    user?.uid,
    canonicalProgress.starter.starterComplete,
    canonicalProgress.starter.starterApprovedCount,
  ]);

  // Notification rows open their destination (Nov 17, 2026): sticker awards
  // go to the Dex stickers tab; decisions and submissions go to the
  // Logbook, where the entry lives; a live Power Hour goes to Missions.
  // The Updates section was removed Nov 18, 2026 — Notifications is the
  // only feed on Basecamp now.
  const openNotification = React.useCallback((item: BasecampNotificationItem) => {
    if (item.href.startsWith('#')) {
      document.getElementById(item.href.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    navigate(item.href);
  }, [navigate]);

  return (
    <div className="skin-page skin-basecamp page-scroll min-h-screen bg-[var(--skin-background)] pb-32 text-[var(--skin-text)] [background-image:var(--skin-background-texture)]">
      <FieldPageHero
        variant="editorial"
        compact
        eyebrow="FIELD_START"
        title="BASECAMP"
        subtitle="What matters today."
        seasonLine={headerSeasonLine ?? undefined}
        backgroundIcon={<Compass className="h-64 w-64" />}
        infoCardLabel="TOTAL_XP"
        infoCardValue={viewModel.progress.xp.toLocaleString()}
        infoCardSubtext={`LEVEL ${viewModel.progress.level} // ${fieldTypeName || viewModel.progress.levelTitle}`}
        infoCardAccent="lime"
      />

      {/* Nov 17, 2026: the utility row holds only the admin-only console
          button, so it renders for admins only — for everyone else it was
          12px of empty padding above the board. */}
      {isAdmin && (
        <div className={`basecamp-utility mx-auto w-full max-w-7xl px-4 pt-3 sm:px-6 lg:px-8 ${viewModel.nextAction.urgency === 'critical' || viewModel.nextAction.urgency === 'high' ? 'basecamp-secondary-quiet' : ''}`}>
          <button
            type="button"
            onClick={() => navigate('/admin')}
            className="skin-button inline-flex items-center gap-2 border-2 border-[var(--skin-border)] bg-[var(--skin-text)] px-3 py-2 font-mono font-black uppercase tracking-widest text-[var(--skin-surface)] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[var(--skin-focus)]"
          >
            <Shield size={14} aria-hidden="true" />
            Admin Console
          </button>
        </div>
      )}

      <BasecampBoard
        main={(
          <>
            <BasecampNextActionPanel
              model={viewModel.nextAction}
              pack={activePack}
              onAction={() => void runAction(viewModel.nextAction.action)}
              onSecondaryAction={viewModel.nextAction.secondaryAction
                ? () => void runAction(viewModel.nextAction.secondaryAction!)
                : undefined}
            />
            {/* Active deck row (Nov 17, 2026): the deck info moved here from
                Missions. One slim line — deck, progress — tapping it opens
                the shelf in DEX. The season countdown lives in the header
                now, not here: the same fact once, not stacked. */}
            <button
              type="button"
              onClick={() => navigate('/dex')}
              aria-label={`Active deck ${viewModel.progress.activeDeckName}. Open the deck shelf.`}
              className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 border-2 border-[var(--skin-border)] bg-[var(--skin-surface)] px-4 py-3 text-left shadow-[4px_4px_0_var(--skin-border)] transition-all hover:shadow-[6px_6px_0_var(--skin-border)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            >
              <span className="font-mono text-[8px] font-black uppercase tracking-[0.22em] text-[var(--skin-text-muted)]">Active deck</span>
              <span className="font-display text-base font-black uppercase italic leading-none tracking-normal text-[var(--skin-text)]">{viewModel.progress.activeDeckName}</span>
              <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-[var(--skin-text-muted)]">
                {viewModel.progress.activeDeckApprovedCount}/{viewModel.progress.activeDeckTotalCount} approved
                {viewModel.progress.activeDeckPendingCount > 0 && ` · ${viewModel.progress.activeDeckPendingCount} pending`}
              </span>
              <span className="ml-auto font-mono text-[9px] font-black uppercase tracking-widest text-[var(--skin-text)]">Deck shelf →</span>
            </button>
            <BasecampAttentionPanel
              model={viewModel.attention}
              onAction={() => {
                if (viewModel.attention.item) void runAction(viewModel.attention.item.action);
              }}
            />
            {/* Notifications (Nov 17, 2026): the full list, newest-first —
                the place to see a notice after its toast is gone. */}
            <div className={viewModel.nextAction.urgency === 'critical' || viewModel.nextAction.urgency === 'high' ? 'basecamp-secondary-quiet' : ''}>
              <BasecampNotifications items={viewModel.notifications} onOpen={openNotification} />
            </div>
          </>
        )}
        sidebar={(
          <div className="space-y-5">
            <BasecampProgressPanel model={viewModel.progress} onOpenProfile={() => navigate('/profile')} />
            <BasecampCrewSummary
              model={viewModel.crew}
              onOpenCrew={() => navigate(viewModel.crew.acceptedCount === 0 && !viewModel.crew.crewId ? '/crew#find-players' : '/crew')}
            />
          </div>
        )}
        quickLinks={(
          <div className={`space-y-4 ${viewModel.nextAction.urgency === 'critical' || viewModel.nextAction.urgency === 'high' ? 'basecamp-secondary-quiet' : ''}`}>
            <BasecampQuickLinks
              links={viewModel.quickLinks}
              onOpen={navigate}
              extraActions={[
                { id: 'settings', label: 'Settings', href: '/settings', icon: 'settings' },
              ]}
            />
          </div>
        )}
      />

      <IOSHomeScreenPrompt />
    </div>
  );
}
