import { TripCard } from '../types/challenges';
import { DeckPack } from '../types/deckPacks';
import { drawChallenge } from '../logic/challengeLogic';
import { getEligibleDrawPool, ExclusionAnalysis, EligibleDrawPoolResult } from '../logic/deckLogic';

export interface DeckDiagnosticsInput {
  missions: TripCard[];
  completedMissionIds: Set<string>;
  pendingMissionIds: Set<string>;
  needsMoreProofMissionIds: Set<string>;
  rejectedMissionIds: Set<string>;
  activeMissionId?: string | null;
  isOnboardingComplete: boolean;
  activePack: DeckPack | null;
  isHeatwaveDeckUnlocked: boolean;
  isSocalSummerUnlocked: boolean;
  isAdmin: boolean;
  previousMissionId?: string | null;
}

export interface DeckDrawSimulation {
  deckId: string;
  rawDeckCards: Array<{
    id: string;
    title: string;
    status: string;
    deckId: string;
    presentInMissionBank: boolean;
  }>;
  filtersApplied: string[];
  removedByFilter: Record<string, string[]>;
  canonicalPool: EligibleDrawPoolResult;
  eligibleBeforeRepeatFilter: TripCard[];
  finalEligibleCards: TripCard[];
  selectedCard: TripCard | null;
  failureReason: string | null;
}

function normalizeId(id: string | null | undefined) {
  return (id || '').toString().toLowerCase().trim();
}

function pushRemoval(bucket: Record<string, string[]>, reason: string, cardId: string) {
  const key = reason || 'unknown';
  if (!bucket[key]) bucket[key] = [];
  bucket[key].push(cardId);
}

export function simulateDeckDraw(input: DeckDiagnosticsInput): DeckDrawSimulation {
  const deckId = input.activePack?.packId || 'unscoped';
  const missionById = new Map(
    input.missions.map(mission => [normalizeId(mission.id || mission.missionId || mission.challengeId), mission])
  );
  const packMissionIds = input.activePack?.missionIds?.map(normalizeId) || input.missions.map(m => normalizeId(m.id));

  const rawDeckCards = packMissionIds.map(id => {
    const mission = missionById.get(id);
    return {
      id,
      title: mission?.title || '(missing from mission bank)',
      status: (mission?.status || 'available').toString().toLowerCase(),
      deckId: mission?.deckId || input.activePack?.packId || 'unknown',
      presentInMissionBank: !!mission
    };
  });

  const canonicalPool = getEligibleDrawPool({
    missions: input.missions,
    completedMissionIds: input.completedMissionIds,
    pendingMissionIds: input.pendingMissionIds,
    needsMoreProofMissionIds: input.needsMoreProofMissionIds,
    rejectedMissionIds: input.rejectedMissionIds,
    activeMissionId: input.activeMissionId,
    isOnboardingComplete: input.isOnboardingComplete,
    activePack: input.activePack,
    isHeatwaveDeckUnlocked: input.isHeatwaveDeckUnlocked,
    isSocalSummerUnlocked: input.isSocalSummerUnlocked,
    isAdmin: input.isAdmin
  });

  const removedByFilter: Record<string, string[]> = {};
  (canonicalPool.analysis || []).forEach((item: ExclusionAnalysis) => {
    if (!item.isDrawable) {
      pushRemoval(removedByFilter, item.exclusionReason || 'not_drawable', item.cardId);
    }
  });

  const eligibleBeforeRepeatFilter = canonicalPool.eligibleMissions;
  const previousMissionId = normalizeId(input.previousMissionId || null);
  let finalEligibleCards = eligibleBeforeRepeatFilter.filter(card => {
    const cardId = normalizeId(card.id || card.missionId || card.challengeId);
    if (eligibleBeforeRepeatFilter.length > 1 && previousMissionId && cardId === previousMissionId) {
      pushRemoval(removedByFilter, 'previous_or_active_mission_avoidance', cardId);
      return false;
    }
    return true;
  });

  if (finalEligibleCards.length === 0 && eligibleBeforeRepeatFilter.length > 0) {
    finalEligibleCards = eligibleBeforeRepeatFilter;
  }

  const selectedCard = finalEligibleCards.length > 0 ? drawChallenge(finalEligibleCards) : null;
  const failureReason = selectedCard
    ? null
    : canonicalPool.reason || (rawDeckCards.length === 0 ? 'deck_has_no_cards' : 'no_eligible_cards_after_filters');

  return {
    deckId,
    rawDeckCards,
    filtersApplied: [
      'deck_membership',
      'season_or_unlock_gate',
      'mission_status',
      'approvedCompletedChallengeIds',
      'submittedPendingChallengeIds',
      'needsMoreProofChallengeIds',
      'rejectedChallengeIds',
      'previous_or_active_mission_avoidance'
    ],
    removedByFilter,
    canonicalPool,
    eligibleBeforeRepeatFilter,
    finalEligibleCards,
    selectedCard,
    failureReason
  };
}
