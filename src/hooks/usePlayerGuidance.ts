import { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  isUnseenStarterUnlock,
  resolvePlayerGuidance,
  type PlayerGuidanceSnapshot,
} from '../logic/playerGuidance';
import { useNearbyDeckPackIds } from './useNearbyDeckPackIds';
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

  // Trevor nearby suggestion (Nov 20, 2026): the location hook reads
  // silently with fallback (option A) — null until resolved. The set is
  // cached per session, so every guidance consumer shares one read.
  const nearbyPackIds = useNearbyDeckPackIds();

  return useMemo(() => {
    const starter = getStarterProgress(canonicalProgress);
    return resolvePlayerGuidance({
      canonicalProgress,
      entries,
      activeTrip,
      activeSubmissionStatus,
      drawnMissionCards,
      trips,
      nearbyDeckIds: nearbyPackIds ? [...nearbyPackIds] : undefined,
      legalComplete: hasConfirmedLegal,
      fieldClassificationComplete,
      hasSeenFieldTypeResults,
      hasCompletedFieldKitOnboarding,
      isHeatwaveDeckUnlocked,
      tripProgress: profile?.tripProgress,
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
    profile?.tripProgress,
    trips,
    userVotes,
    nearbyPackIds,
  ]);
}
