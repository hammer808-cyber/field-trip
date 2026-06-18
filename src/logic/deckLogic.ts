import { TripCard as TripType } from '../types/challenges';
import { DeckPack } from '../types/deckPacks';

export type DrawPoolReason = 
  | 'onboarding_active' 
  | 'onboarding_complete' 
  | 'season_locked' 
  | 'pack_exhausted' 
  | 'loading' 
  | 'no_missions';

export interface ExclusionAnalysis {
  cardId: string;
  deckId: string;
  isApproved: boolean;
  isPending: boolean;
  isRejected: boolean;
  isNeedsMoreProof: boolean;
  isAlreadySubmitted: boolean;
  isDrawable: boolean;
  exclusionReason: string | null;
  status: string;
}

export interface EligibleDrawPoolResult {
  eligibleMissions: TripType[];
  reason: DrawPoolReason | null;
  excludedCards?: { id: string, reason: string }[];
  analysis?: ExclusionAnalysis[];
}


export type DeckDisplayState = 'LOCKED' | 'COMPLETE' | 'LIMIT_REACHED' | 'READY' | 'RETRY_AVAILABLE' | 'NEEDS_MORE_PROOF' | 'PENDING_REVIEW' | 'EXHAUSTED' | 'EMPTY';

export interface DeckRuntimeCardAnalysis {
  cardId: string;
  status: 'approved' | 'pending_review' | 'needs_more_proof' | 'rejected' | 'unplayed';
  drawable: boolean;
  retryable: boolean;
  reasons: string[];
}

export interface DeckRuntimeState {
  deckId: string;
  deckTitle: string;
  totalCards: number;
  approvedCount: number;
  pendingCount: number;
  needsMoreProofCount: number;
  rejectedCount: number;
  unplayedCount: number;
  drawableCount: number;
  retryableCount: number;
  isDeckComplete: boolean;
  isLocked: boolean;
  isBlocked: boolean;
  blockReason: string | null;
  displayState: DeckDisplayState;
  primaryButtonLabel: string;
  primaryButtonEnabled: boolean;
  nextDrawableCardIds: string[];
  retryableCardIds: string[];
  perCardAnalysis: DeckRuntimeCardAnalysis[];
}

const cleanDeckId = (value: unknown) => String(value || '').toLowerCase().trim();

const idsFrom = (value?: Set<string> | string[]) => new Set(Array.from(value || []).map(cleanDeckId).filter(Boolean));

export function getDeckRuntimeState({
  deckId,
  deckTitle,
  deckCards,
  userProgress,
  appConfig = {}
}: {
  deckId: string;
  deckTitle?: string;
  deckCards: TripType[];
  userProgress?: {
    completedMissionIds?: Set<string> | string[];
    approvedIds?: Set<string> | string[];
    pendingMissionIds?: Set<string> | string[];
    needsMoreProofMissionIds?: Set<string> | string[];
    rejectedMissionIds?: Set<string> | string[];
  };
  appConfig?: { isLocked?: boolean; lockReason?: string; drawLimitReached?: boolean; drawLimitReason?: string };
}): DeckRuntimeState {
  const approved = new Set([...idsFrom(userProgress?.completedMissionIds), ...idsFrom(userProgress?.approvedIds)]);
  const pending = idsFrom(userProgress?.pendingMissionIds);
  const needsMore = idsFrom(userProgress?.needsMoreProofMissionIds);
  const rejected = idsFrom(userProgress?.rejectedMissionIds);
  const cardIds = deckCards.map(card => cleanDeckId((card as any).id || (card as any).missionId || (card as any).challengeId)).filter(Boolean);

  approved.forEach(id => { pending.delete(id); needsMore.delete(id); rejected.delete(id); });
  needsMore.forEach(id => { pending.delete(id); rejected.delete(id); });
  rejected.forEach(id => pending.delete(id));

  const perCardAnalysis = cardIds.map(cardId => {
    let status: DeckRuntimeCardAnalysis['status'] = 'unplayed';
    let drawable = true;
    let retryable = false;
    const reasons: string[] = [];

    if (approved.has(cardId)) {
      status = 'approved'; drawable = false; reasons.push('approved_complete');
    } else if (pending.has(cardId)) {
      status = 'pending_review'; drawable = false; reasons.push('pending_temporarily_unavailable');
    } else if (needsMore.has(cardId)) {
      status = 'needs_more_proof'; drawable = false; retryable = true; reasons.push('needs_more_proof_retryable');
    } else if (rejected.has(cardId)) {
      status = 'rejected'; drawable = false; retryable = true; reasons.push('rejected_retryable');
    } else {
      reasons.push('unplayed_drawable');
    }

    if (appConfig.isLocked) {
      drawable = false; retryable = false; reasons.push(`deck_locked:${appConfig.lockReason || 'locked'}`);
    }

    return { cardId, status, drawable, retryable, reasons };
  });

  const nextDrawableCardIds = perCardAnalysis.filter(card => card.drawable).map(card => card.cardId);
  const retryableCardIds = perCardAnalysis.filter(card => card.retryable).map(card => card.cardId);
  const approvedCount = perCardAnalysis.filter(card => card.status === 'approved').length;
  const pendingCount = perCardAnalysis.filter(card => card.status === 'pending_review').length;
  const needsMoreProofCount = perCardAnalysis.filter(card => card.status === 'needs_more_proof').length;
  const rejectedCount = perCardAnalysis.filter(card => card.status === 'rejected').length;
  const unplayedCount = perCardAnalysis.filter(card => card.status === 'unplayed').length;
  const totalCards = cardIds.length;
  const isDeckComplete = totalCards > 0 && approvedCount === totalCards;

  let displayState: DeckDisplayState = totalCards === 0 ? 'EMPTY' : 'READY';
  let primaryButtonLabel = 'Start Mission';
  let primaryButtonEnabled = nextDrawableCardIds.length > 0;
  let blockReason: string | null = null;

  if (appConfig.isLocked) {
    displayState = 'LOCKED'; primaryButtonLabel = 'Locked'; primaryButtonEnabled = false; blockReason = appConfig.lockReason || 'deck_locked';
  } else if (isDeckComplete) {
    displayState = 'COMPLETE'; primaryButtonLabel = 'Deck Complete'; primaryButtonEnabled = false; blockReason = 'deck_complete';
  } else if (appConfig.drawLimitReached) {
    displayState = 'LIMIT_REACHED'; primaryButtonLabel = 'Limit Reached'; primaryButtonEnabled = false; blockReason = appConfig.drawLimitReason || 'draw_limit_reached';
  } else if (retryableCardIds.length > 0) {
    displayState = needsMoreProofCount > 0 ? 'NEEDS_MORE_PROOF' : 'RETRY_AVAILABLE'; primaryButtonLabel = needsMoreProofCount > 0 ? 'Fix Proof' : 'Retry Mission'; primaryButtonEnabled = true;
  } else if (nextDrawableCardIds.length > 0) {
    displayState = 'READY';
  } else if (pendingCount > 0) {
    displayState = 'PENDING_REVIEW'; primaryButtonLabel = 'Pending Review'; primaryButtonEnabled = false; blockReason = 'all_remaining_cards_pending_review';
  } else {
    displayState = 'EXHAUSTED'; primaryButtonLabel = 'Deck Exhausted'; primaryButtonEnabled = false; blockReason = 'all_cards_unavailable';
  }

  return {
    deckId: cleanDeckId(deckId),
    deckTitle: deckTitle || deckId,
    totalCards,
    approvedCount,
    pendingCount,
    needsMoreProofCount,
    rejectedCount,
    unplayedCount,
    drawableCount: nextDrawableCardIds.length,
    retryableCount: retryableCardIds.length,
    isDeckComplete,
    isLocked: appConfig.isLocked === true,
    isBlocked: !primaryButtonEnabled,
    blockReason,
    displayState,
    primaryButtonLabel,
    primaryButtonEnabled,
    nextDrawableCardIds,
    retryableCardIds,
    perCardAnalysis
  };
}

/**
 * The canonical source of truth for which missions a user can currently draw.
 */
export function getEligibleDrawPool({
  missions,
  completedMissionIds,
  pendingMissionIds = new Set(),
  needsMoreProofMissionIds = new Set(),
  rejectedMissionIds = new Set(),
  isOnboardingComplete,
  activePack,
  isHeatwaveDeckUnlocked,
  isSocalSummerUnlocked,
  isAdmin,
}: {
  missions: TripType[];
  completedMissionIds: Set<string>;
  pendingMissionIds?: Set<string>;
  needsMoreProofMissionIds?: Set<string>;
  rejectedMissionIds?: Set<string>;
  isOnboardingComplete: boolean;
  activePack: DeckPack | null;
  isHeatwaveDeckUnlocked: boolean;
  isSocalSummerUnlocked: boolean;
  isAdmin: boolean;
}): EligibleDrawPoolResult {
  console.log('[deckLogic] getEligibleDrawPool input:', {
    missionsCount: missions?.length,
    completedMissionIdsSize: completedMissionIds.size,
    pendingMissionIdsSize: pendingMissionIds.size,
    needsMoreProofMissionIdsSize: needsMoreProofMissionIds.size,
    rejectedMissionIdsSize: rejectedMissionIds.size,
    isOnboardingComplete,
    activePackId: activePack?.packId,
    isHeatwaveDeckUnlocked,
    isSocalSummerUnlocked,
    isAdmin
  });

  if (!missions || missions.length === 0) {
    console.log('[deckLogic] missions empty, returning loading');
    return { eligibleMissions: [], reason: 'loading' };
  }

  const ONBOARDING_IDS = ["starter-1", "starter-2", "starter-3"];
  let pool: TripType[] = [];
  let reason: DrawPoolReason | null = null;

  let packMissionIdsNormalized: Set<string> | null = null;

  // 1. Post-Onboarding or Specific Active Pack Selection
  if (activePack) {
    // Check if pack is seasonal and locked
    const packIdLower = activePack.packId.toLowerCase();
    const isHeatwavePack = packIdLower.includes('heatwave');
    const isSocalPack = packIdLower.includes('socal');

    // Rule: Seasonal decks are unlocked if the season is active OR if the user is already playing it
    if (isHeatwavePack && !isHeatwaveDeckUnlocked && !isAdmin) {
      console.log('[deckLogic] Heatwave pack locked.');
      return { eligibleMissions: [], reason: 'season_locked' };
    }

    if (isSocalPack && !isSocalSummerUnlocked && !isAdmin) {
      console.log('[deckLogic] SoCal Summer pack locked.');
      return { eligibleMissions: [], reason: 'season_locked' }; 
    }

    packMissionIdsNormalized = new Set(activePack.missionIds.map(id => id.toString().toLowerCase().trim()));
    pool = missions.filter(m => {
      const mid = (m.id || (m as any).missionId || (m as any).challengeId || '').toString().toLowerCase().trim();
      return packMissionIdsNormalized!.has(mid);
    });
    
    console.log(`[deckLogic] Active pack: ${activePack.packId} (${activePack.packName}). Found ${pool.length} missions in pool.`);
  } 
  // 2. Sequential Onboarding (Fallthrough if no active seasonal pack selected)
  else if (!isOnboardingComplete && !isAdmin) {
    const starterMissions = missions.filter(m => ONBOARDING_IDS.includes(m.id.toLowerCase()));
    
    // Find the first starter mission that isn't completed or pending
    const nextStarter = starterMissions.find(m => {
      const mid = m.id.toLowerCase();
      return !completedMissionIds.has(mid) && !pendingMissionIds.has(mid);
    });

    if (nextStarter) {
      pool = [nextStarter];
    } else {
      pool = starterMissions; 
    }
    
    reason = 'onboarding_active';
    console.log(`[deckLogic] Onboarding active. Next sequential starter: ${nextStarter?.id}. Pool size: ${pool.length}`);
  } 
  // 3. Default: Unlocked bank (Fallback)
  else {
    pool = missions.filter(m => {
      const isHeatwaveMission = (m.deckId || '').toLowerCase() === 'heatwave-receipts';
      const isSocalMission = (m.deckId || '').toLowerCase() === 'socal-summer';
      
      if (isHeatwaveMission) return isHeatwaveDeckUnlocked || isAdmin;
      if (isSocalMission) return isSocalSummerUnlocked || isAdmin;
      
      if (m.lane === 'seasonal') return isHeatwaveDeckUnlocked || isSocalSummerUnlocked || isAdmin;
      return true;
    });
    console.log(`[deckLogic] No specific active pack. Fallback pool size: ${pool.length}`);
  }

  const analysis: ExclusionAnalysis[] = [];
  const eligibleMissions: TripType[] = [];

  // If we are in an active pack, ensure we account for ALL missions in the pack even if they are missing from the trips bank
  const analyzedIds = new Set<string>();

  const processMission = (m: TripType) => {
    const missionIdLower = (m.id || (m as any).missionId || (m as any).challengeId || '').toString().toLowerCase().trim();
    if (!missionIdLower) return;
    
    analyzedIds.add(missionIdLower);

    const isStarterMission = ONBOARDING_IDS.includes(missionIdLower);
    const isApproved = completedMissionIds.has(missionIdLower);
    const isPending = pendingMissionIds.has(missionIdLower);
    const isNeedsMoreProof = needsMoreProofMissionIds.has(missionIdLower);
    const isRejected = rejectedMissionIds.has(missionIdLower);
    const isAlreadySubmitted = isApproved || isPending || isNeedsMoreProof || isRejected;
    
    const status = (m.status || 'available').toLowerCase();
    const isAllowedStatus = ['available', 'approved', 'active', 'auto_approved', 'approved_by_admin'].includes(status);
    
    let isDrawable = isAllowedStatus && !isApproved && !isPending && !isNeedsMoreProof;
    let exclusionReason: string | null = null;

    if (!isAllowedStatus) exclusionReason = `disallowed_status:${status}`;
    else if (isApproved) exclusionReason = 'approved';
    else if (isPending) exclusionReason = 'pending';
    else if (isNeedsMoreProof) exclusionReason = 'needs_more_proof';
    else if (isRejected) {
      if (isStarterMission) {
        isDrawable = true;
        exclusionReason = null; // Re-drawable
      } else {
        isDrawable = false;
        exclusionReason = 'rejected';
      }
    }

    if (isDrawable) {
      eligibleMissions.push(m);
    }

    analysis.push({
      cardId: m.id,
      deckId: m.deckId || 'unknown',
      isApproved,
      isPending,
      isRejected,
      isNeedsMoreProof,
      isAlreadySubmitted,
      isDrawable,
      exclusionReason,
      status
    });
  };

  pool.forEach(processMission);

  // If we have an active pack, check if any of its missionIds are missing from the trips bank
  if (packMissionIdsNormalized) {
    packMissionIdsNormalized.forEach(id => {
      if (!analyzedIds.has(id)) {
        analysis.push({
          cardId: id,
          deckId: activePack?.packId || 'unknown',
          isApproved: completedMissionIds.has(id),
          isPending: pendingMissionIds.has(id),
          isRejected: rejectedMissionIds.has(id),
          isNeedsMoreProof: needsMoreProofMissionIds.has(id),
          isAlreadySubmitted: completedMissionIds.has(id) || pendingMissionIds.has(id) || rejectedMissionIds.has(id) || needsMoreProofMissionIds.has(id),
          isDrawable: false,
          exclusionReason: 'missing_from_missions_bank',
          status: 'missing'
        });
      }
    });
  }

  if (activePack?.packId === 'heatwave-receipts') {
    console.log('[deckLogic] Heatwave Receipts Availability Summary:', {
      availableCount: eligibleMissions.length,
      analysisCount: analysis.length,
      analysisSummary: analysis.map(a => `${a.cardId}: ${a.isDrawable ? 'DRAWABLE' : 'BLOCKED (' + a.exclusionReason + ')'}`),
    });
  }

  if (eligibleMissions.length === 0) {
    if (!isOnboardingComplete && !isAdmin) {
      reason = 'onboarding_complete';
    } else {
      reason = 'pack_exhausted';
    }
  }

  return { 
    eligibleMissions, 
    reason, 
    excludedCards: analysis.filter(a => !a.isDrawable).map(a => ({ id: a.cardId, reason: a.exclusionReason || 'unknown' })),
    analysis 
  };
}

