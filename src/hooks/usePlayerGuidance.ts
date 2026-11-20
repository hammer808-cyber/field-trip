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
    activeSeason,
    activeSubmissionStatus,
    activeTrip,
    canonicalProgress,
    currentWeekNumber,
    deckPacks,
    drawnMissionCards,
    entries,
    fieldClassificationComplete,
    getDeckAccessForPack,
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

  // Trevor deck-complete ranking (Nov 20, 2026): accessible decks in deck
  // sort order (sortOrder, then pack name) — the rotation tiebreak for the
  // next-deck ranking. Same playable filter TrevorGuide uses for context.
  const accessibleDeckIds = useMemo(() => deckPacks
    .filter(deck => getDeckAccessForPack(deck).playable)
    .sort((left, right) => left.sortOrder - right.sortOrder || left.packName.localeCompare(right.packName))
    .map(deck => deck.packId || deck.deckId || deck.id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0),
  [deckPacks, getDeckAccessForPack]);

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
      seenDeckCompletions: profile?.trevorSettings?.seenDeckCompletions,
      accessibleDeckIds,
      seasonalDeckId: activeSeason?.id,
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
    profile?.trevorSettings?.seenDeckCompletions,
    profile?.tripProgress,
    trips,
    userVotes,
    nearbyPackIds,
    accessibleDeckIds,
    activeSeason?.id,
  ]);
}
