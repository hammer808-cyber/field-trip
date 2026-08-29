import { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  isUnseenStarterUnlock,
  resolvePlayerGuidance,
  type PlayerGuidanceSnapshot,
} from '../logic/playerGuidance';
import { getStarterProgress } from '../services/canonicalProgress';

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

  return useMemo(() => {
    const starter = getStarterProgress(canonicalProgress);
    return resolvePlayerGuidance({
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
      hasUnseenStarterUnlock: isUnseenStarterUnlock({
        starterComplete: starter.starterComplete,
        starterApprovedCount: starter.starterApprovedCount,
        starterRequiredCount: starter.starterRequiredCount,
        lastSeenApprovedCount: profile?.trevorSettings?.lastSeenApprovedCount,
      }),
    });
  }, [
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
