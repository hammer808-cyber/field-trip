import { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  resolvePlayerGuidance,
  type PlayerGuidanceSnapshot,
} from '../logic/playerGuidance';

export function usePlayerGuidance(): PlayerGuidanceSnapshot {
  const {
    activeSubmissionStatus,
    activeTrip,
    canonicalProgress,
    currentWeekNumber,
    drawnMissionCards,
    entries,
    fieldClassificationComplete,
    hasCompletedFieldKitOnboarding,
    hasConfirmedLegal,
    hasSeenFieldTypeResults,
    isHeatwaveDeckUnlocked,
    isVotingWindowOpen,
    profile,
    trips,
    userVotes,
  } = useApp();

  return useMemo(() => resolvePlayerGuidance({
    canonicalProgress,
    entries,
    activeTrip,
    activeSubmissionStatus,
    drawnMissionCards,
    trips,
    legalComplete: hasConfirmedLegal,
    fieldClassificationComplete,
    hasSeenFieldTypeResults,
    hasCompletedFieldKitOnboarding,
    isHeatwaveDeckUnlocked,
    voteAvailable: isVotingWindowOpen(currentWeekNumber) && (userVotes?.length ?? 0) === 0,
    hasUnseenStarterUnlock: canonicalProgress.starter.starterComplete
      && (profile?.trevorSettings?.lastSeenApprovedCount ?? 0) < canonicalProgress.starter.starterRequiredCount,
  }), [
    activeSubmissionStatus,
    activeTrip,
    canonicalProgress,
    currentWeekNumber,
    drawnMissionCards,
    entries,
    fieldClassificationComplete,
    hasCompletedFieldKitOnboarding,
    hasConfirmedLegal,
    hasSeenFieldTypeResults,
    isHeatwaveDeckUnlocked,
    isVotingWindowOpen,
    profile?.trevorSettings?.lastSeenApprovedCount,
    trips,
    userVotes,
  ]);
}
