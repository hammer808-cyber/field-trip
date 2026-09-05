import React from 'react';
import { Compass, Shield } from 'lucide-react';
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
import { acknowledgeStarterUnlockSeen } from '../services/starterUnlockAck';
import './Basecamp.css';

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
    crewGraph,
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

  return (
    <div className="skin-page skin-basecamp page-scroll min-h-screen bg-[var(--skin-background)] pb-32 text-[var(--skin-text)] [background-image:var(--skin-background-texture)]">
      <FieldPageHero
        variant="editorial"
        eyebrow="FIELD_START"
        title="BASECAMP"
        subtitle="What matters today."
        backgroundIcon={<Compass className="h-64 w-64" />}
        infoCardLabel="TOTAL_XP"
        infoCardValue={viewModel.progress.xp.toLocaleString()}
        infoCardSubtext={`LEVEL ${viewModel.progress.level} // ${fieldTypeName || viewModel.progress.levelTitle}`}
        infoCardAccent="lime"
      />

      <div className={`basecamp-utility mx-auto w-full max-w-7xl px-4 pt-3 sm:px-6 lg:px-8 ${viewModel.nextAction.urgency === 'critical' || viewModel.nextAction.urgency === 'high' ? 'basecamp-secondary-quiet' : ''}`}>
        {isAdmin && (
          <button
            type="button"
            onClick={() => navigate('/admin')}
            className="skin-button inline-flex items-center gap-2 border-2 border-[var(--skin-border)] bg-[var(--skin-text)] px-3 py-2 font-mono font-black uppercase tracking-widest text-[var(--skin-surface)] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[var(--skin-focus)]"
          >
            <Shield size={14} aria-hidden="true" />
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
              onSecondaryAction={viewModel.nextAction.secondaryAction
                ? () => void runAction(viewModel.nextAction.secondaryAction!)
                : undefined}
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
          <div className="space-y-5">
            <BasecampProgressPanel model={viewModel.progress} onOpenProfile={() => navigate('/profile')} />
            <BasecampCrewSummary
              model={viewModel.crew}
              onOpenCrew={() => navigate(viewModel.crew.acceptedCount === 0 && !viewModel.crew.crewId ? '/crew#find-players' : '/crew')}
            />
            <div className={viewModel.nextAction.urgency === 'critical' || viewModel.nextAction.urgency === 'high' ? 'basecamp-secondary-quiet' : ''}>
              <BasecampRecentActivity items={viewModel.recentActivity} />
            </div>
          </div>
        )}
        quickLinks={(
          <div className={`space-y-4 ${viewModel.nextAction.urgency === 'critical' || viewModel.nextAction.urgency === 'high' ? 'basecamp-secondary-quiet' : ''}`}>
            <BasecampQuickLinks
              links={viewModel.quickLinks}
              onOpen={navigate}
              extraActions={[
                { id: 'loteria', label: 'Loteria Board', href: '/loteria', icon: 'loteria' },
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
