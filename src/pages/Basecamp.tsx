import React from 'react';
import { Compass, Grid3X3, Settings, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BasecampAttentionPanel } from '../components/basecamp/BasecampAttentionPanel';
import { BasecampBoard } from '../components/basecamp/BasecampBoard';
import { BasecampCrewSummary } from '../components/basecamp/BasecampCrewSummary';
import { BasecampNextActionPanel } from '../components/basecamp/BasecampNextActionPanel';
import { BasecampProgressPanel } from '../components/basecamp/BasecampProgressPanel';
import { BasecampQuickLinks } from '../components/basecamp/BasecampQuickLinks';
import { BasecampRecentActivity } from '../components/basecamp/BasecampRecentActivity';
import { FieldPageHero } from '../components/FieldPageHero';
import { IOSHomeScreenPrompt } from '../components/profile/IOSHomeScreenPrompt';
import { useApp } from '../context/AppContext';
import { FIELD_TYPES } from '../constants';
import { getDeckPackById } from '../data/deckPacks';
import {
  buildBasecampViewModel,
  type BasecampPrimaryAction,
} from '../logic/basecampViewModel';

export default function Basecamp() {
  const {
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
    currentDate,
    isHeatwaveDeckUnlocked,
    isVotingOpen: isVotingWindowOpen(currentWeekNumber),
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
  ]);

  const fieldTypeName = fieldType ? FIELD_TYPES[fieldType]?.name : null;
  const activePack = getDeckPackById(viewModel.nextAction.deckId);

  React.useEffect(() => {
    if (!import.meta.env.DEV || !(profile?.id || user?.uid)) return;
    console.log('[DEV_LOG] [Basecamp] Canonical board ready:', {
      sourceCollection: 'AppContext canonical state',
      userId: profile?.id || user?.uid,
      approvedCount: canonicalProgress.approvedCompletedChallengeIds.size,
      starter: canonicalProgress.starter.label,
      activeMissionId: viewModel.nextAction.mission?.id || null,
      proofAttentionCount: viewModel.attention.actionableCount,
      personalActivityCount: viewModel.recentActivity.length,
    });
  }, [canonicalProgress, profile?.id, user?.uid, viewModel]);

  const runAction = React.useCallback(async (action: BasecampPrimaryAction) => {
    if (action.intent === 'retry-proof' && action.missionId) {
      await retryMissionSubmission(action.missionId);
    }
    navigate(action.href);
  }, [navigate, retryMissionSubmission]);

  return (
    <div className="skin-page skin-basecamp page-scroll min-h-screen bg-[var(--skin-background)] pb-32 text-[var(--skin-text)] [background-image:var(--skin-background-texture)]">
      <FieldPageHero
        variant="editorial"
        eyebrow="FIELD_START"
        title="BASECAMP"
        subtitle="Your next move, proof status, and field progress."
        backgroundIcon={<Compass className="h-64 w-64" />}
        infoCardLabel="TOTAL_XP"
        infoCardValue={viewModel.progress.xp.toLocaleString()}
        infoCardSubtext={`LEVEL ${viewModel.progress.level} // ${fieldTypeName || viewModel.progress.levelTitle}`}
        infoCardAccent="lime"
      />

      <div className="mx-auto flex w-full max-w-7xl flex-wrap justify-end gap-3 px-4 pt-5 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => navigate('/loteria')}
          className="skin-button inline-flex min-h-11 items-center gap-2 border-2 border-[var(--skin-border)] bg-[var(--skin-accent)] px-4 py-2 font-mono text-[9px] font-black uppercase tracking-widest text-[var(--skin-on-accent)] shadow-[3px_3px_0_var(--skin-border)] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[var(--skin-focus)]"
        >
          <Grid3X3 size={16} aria-hidden="true" />
          Loteria Board
        </button>
        <button
          type="button"
          onClick={() => navigate('/settings')}
          className="skin-button inline-flex min-h-11 items-center gap-2 border-2 border-[var(--skin-border)] bg-[var(--skin-surface)] px-4 py-2 font-mono text-[9px] font-black uppercase tracking-widest text-[var(--skin-text)] shadow-[3px_3px_0_var(--skin-border)] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[var(--skin-focus)]"
        >
          <Settings size={16} aria-hidden="true" />
          Settings
        </button>
        {isAdmin && (
          <button
            type="button"
            onClick={() => navigate('/admin')}
            className="skin-button inline-flex min-h-11 items-center gap-2 border-2 border-[var(--skin-border)] bg-[var(--skin-text)] px-4 py-2 font-mono text-[9px] font-black uppercase tracking-widest text-[var(--skin-surface)] shadow-[3px_3px_0_var(--skin-secondary)] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[var(--skin-focus)]"
          >
            <Shield size={16} aria-hidden="true" />
            Admin Console
          </button>
        )}
      </div>

      <BasecampBoard
        main={(
          <>
            <BasecampNextActionPanel
              model={viewModel.nextAction}
              pack={activePack}
              onAction={() => void runAction(viewModel.nextAction.action)}
            />
            <BasecampAttentionPanel
              model={viewModel.attention}
              onAction={() => {
                if (viewModel.attention.item) void runAction(viewModel.attention.item.action);
              }}
            />
          </>
        )}
        sidebar={(
          <>
            <BasecampProgressPanel model={viewModel.progress} onOpenProfile={() => navigate('/profile')} />
            <BasecampCrewSummary model={viewModel.crew} onOpenCrew={() => navigate('/crew')} />
            <BasecampRecentActivity items={viewModel.recentActivity} />
          </>
        )}
        quickLinks={<BasecampQuickLinks links={viewModel.quickLinks} onOpen={navigate} />}
      />

      <IOSHomeScreenPrompt />
    </div>
  );
}
