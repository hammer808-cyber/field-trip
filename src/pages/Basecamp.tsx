import React from 'react';
import { Compass, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BasecampAttentionPanel } from '../components/basecamp/BasecampAttentionPanel';
import { BasecampBoard } from '../components/basecamp/BasecampBoard';
import { BasecampCompanionBlock } from '../components/basecamp/BasecampCompanionBlock';
import { BasecampCrewSummary } from '../components/basecamp/BasecampCrewSummary';
import { BasecampNextActionPanel } from '../components/basecamp/BasecampNextActionPanel';
import { BasecampNotifications } from '../components/basecamp/BasecampNotifications';
import { NotificationDetailModal } from '../components/basecamp/NotificationDetailModal';
import { StreakChip } from '../components/StreakChip';
import { BasecampProgressPanel } from '../components/basecamp/BasecampProgressPanel';
import { BasecampQuickLinks } from '../components/basecamp/BasecampQuickLinks';
import { TrevorsLogCard, type TrevorsLogEntry } from '../components/basecamp/TrevorsLogCard';
import { normalizeEntryStatus } from '../logic/entryLogic';
import { safeToDate } from '../lib/utils';
import { FieldDoodles } from '../components/FieldDoodles';
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
import { acknowledgeDeckCompleteSeen } from '../services/deckCompleteAck';
import { markNotificationRead } from '../services/playerNotificationService';
import { getCalendarSeasonHeader } from '../utils/seasonCountdown';
import { getSeasonWeekNumber } from '../data/seasons';
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
    deckPacks,
    drawnMissionCards,
    entries,
    fieldType,
    getDeckAccessForPack,
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

  // Deck-complete ranking (Nov 20, 2026): accessible decks in deck sort
  // order, so Basecamp's next action and Trevor agree on the next deck.
  const accessibleDeckIds = React.useMemo(() => deckPacks
    .filter(deck => getDeckAccessForPack(deck).playable)
    .sort((left, right) => left.sortOrder - right.sortOrder || left.packName.localeCompare(right.packName))
    .map(deck => deck.packId || deck.deckId || deck.id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0),
  [deckPacks, getDeckAccessForPack]);

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
    accessibleDeckIds,
    seasonalDeckId: activeSeason?.id,
    crewGraph: {
      acceptedCount: crewGraph?.acceptedCount || 0,
      incomingCount: crewGraph?.incomingCount || 0,
    },
  }), [
    activeSeason?.id,
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
    accessibleDeckIds,
  ]);

  const fieldTypeName = fieldType ? FIELD_TYPES[fieldType]?.name : null;
  const activePack = getDeckPackById(viewModel.nextAction.deckId);

  // Trevor's Log (Nov 21, 2026): the latest approved proof, newest first
  // by createdAt. Title resolution follows the Logbook's pattern
  // (tripTitle / challengeTitle / missionTitle); no fake entry is ever
  // invented — with no approved proof the card renders its empty state.
  const latestApprovedLogEntry = React.useMemo<TrevorsLogEntry | null>(() => {
    const approved = entries.filter(
      (entry) => normalizeEntryStatus(entry.status) === 'approved',
    );
    if (approved.length === 0) return null;
    const latest = [...approved].sort((a, b) => {
      const aTime = safeToDate(a.createdAt)?.getTime() ?? 0;
      const bTime = safeToDate(b.createdAt)?.getTime() ?? 0;
      return bTime - aTime;
    })[0];
    const date = safeToDate(latest.createdAt);
    return {
      photoUrl: latest.photoUrl ?? null,
      note: latest.note ?? null,
      missionTitle:
        latest.tripTitle || latest.challengeTitle || latest.missionTitle || 'Field Mission',
      dateLabel: date
        ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'Undated',
    };
  }, [entries]);

  // The deck info lives here now (Nov 17, 2026): Missions is bare — deck,
  // draw, card — so Basecamp carries the active deck and the season
  // countdown, linking out to the shelf in DEX.
  // The season countdown lives in the header now (Nov 17, 2026): the same
  // fact shown once — it used to sit in the Active Deck row below.
  // Calendar-backed (Nov 21, 2026): the meteorological calendar is the
  // authority for what the header says — the Firestore activeSeason doc
  // no longer decides it. Same shape as before, plus the next season.
  const seasonHeader = getCalendarSeasonHeader(currentDate);
  // The week number is the calendar season's week number (Zach, Nov 21,
  // 2026) — not the Firestore season doc's week. currentWeekNumber stays
  // the voting-cycle week for the voting window and ballot mechanics.
  const headerSeasonLine = `${seasonHeader.label} · Week ${getSeasonWeekNumber(currentDate)}`;

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
      viewModel.guidance.state === 'DECK_COMPLETE'
      && (profile?.id || user?.uid)
      && viewModel.guidance.finishedDeckId
    ) {
      try {
        await acknowledgeDeckCompleteSeen(
          profile?.id || user!.uid,
          viewModel.guidance.finishedDeckId,
          canonicalProgress.starter.starterApprovedCount,
        );
      } catch (error) {
        console.warn('[Basecamp] Failed to acknowledge deck completion:', error);
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
  // Notification detail card (Nov 20, 2026, Zach's call): tapping a row
  // opens the notification big instead of navigating straight to the
  // destination — the card carries the "Take me there" button. Opening
  // marks it read (server endpoint), so the red dot clears once seen.
  const [selectedNotification, setSelectedNotification] = React.useState<BasecampNotificationItem | null>(null);
  const openNotification = React.useCallback((item: BasecampNotificationItem) => {
    if (item.href.startsWith('#')) {
      document.getElementById(item.href.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (item.unread) void markNotificationRead(item.notificationId);
    setSelectedNotification(item);
  }, []);

  return (
    <div className="skin-page skin-basecamp relative page-scroll min-h-screen bg-[var(--skin-background)] pb-32 text-[var(--skin-text)] [background-image:var(--skin-background-texture)]">
      <FieldDoodles
        pageKey="basecamp"
        stamps={[
          // Both labels name cards that render on this page: the
          // MISSION LOG ticket card and TREVOR'S LOG, below.
          { label: 'MISSION LOG', tone: 'primary' },
          { label: "TREVOR'S LOG", tone: 'text' },
        ]}
      />
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

      {/* Daily approval streak (P3-8, Nov 21, 2026): the return-hook
          home shows the streak beside the season countdown above. */}
      <div className="mx-auto w-full max-w-7xl px-4 pt-3 sm:px-6 lg:px-8">
        <StreakChip streakDays={canonicalProgress.approvalStreakDays} />
      </div>

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
            {/* Persona companion (Tier 1, Nov 20, 2026): the quiz persona as
                a companion block beside the next action — the home-screen
                presence; the Trevor panel/launcher cover the other pages. */}
            <BasecampCompanionBlock fieldType={fieldType} onOpen={() => navigate('/profile?tab=overview')} />
            <BasecampNextActionPanel
              model={viewModel.nextAction}
              pack={activePack}
              onAction={() => void runAction(viewModel.nextAction.action)}
              onSecondaryAction={viewModel.nextAction.secondaryAction
                ? () => void runAction(viewModel.nextAction.secondaryAction!)
                : undefined}
            />
            {/* Trevor's Log (Nov 21, 2026): the latest approved proof as a
                journal entry — taped polaroid + field note — under the next
                action, not stacked with the guidance message above it. */}
            <TrevorsLogCard latestApproved={latestApprovedLogEntry} />
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
              <span className="font-mono text-xs font-black uppercase tracking-[0.22em] text-[var(--skin-text-muted)]">Active deck</span>
              <span className="font-display text-base font-black uppercase italic leading-none tracking-normal text-[var(--skin-text)]">{viewModel.progress.activeDeckName}</span>
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--skin-text-muted)]">
                {viewModel.progress.activeDeckApprovedCount}/{viewModel.progress.activeDeckTotalCount} approved
                {viewModel.progress.activeDeckPendingCount > 0 && ` · ${viewModel.progress.activeDeckPendingCount} pending`}
              </span>
              <span className="ml-auto font-mono text-xs font-black uppercase tracking-widest text-[var(--skin-text)]">Deck shelf →</span>
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
              <NotificationDetailModal
                item={selectedNotification}
                onClose={() => setSelectedNotification(null)}
                onTakeMeThere={item => {
                  setSelectedNotification(null);
                  navigate(item.href);
                }}
              />
            </div>
          </>
        )}
        sidebar={(
          <div className="space-y-5">
            <BasecampProgressPanel model={viewModel.progress} onOpenProfile={() => navigate('/profile')} markerStickerId={profile?.preferences?.selectedMarkerStickerId} />
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
