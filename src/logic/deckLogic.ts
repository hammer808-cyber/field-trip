import { TripCard as TripType } from '../types/challenges';
import { DeckPack } from '../types/deckPacks';
import { STARTER_SIGNAL_IDS, type CanonicalStarterDeckState } from './starterDeckState';

const isDevEnv = Boolean(import.meta.env?.DEV);

export type DrawPoolReason = 
  | 'onboarding_active' 
  | 'onboarding_complete' 
  | 'season_locked' 
  | 'pack_exhausted' 
  | 'unpublished_cards_blocked'
  | 'active_mission_in_progress'
  | 'all_starter_signals_pending_review'
  | 'no_eligible_cards'
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
  diagnostics?: {
    canonicalSubmittedIds?: string[];
    pendingIds?: string[];
    approvedIds?: string[];
    rejectedIds?: string[];
    needsMoreProofIds?: string[];
    activeDrawnIds?: string[];
    eligibleBeforeSelection?: string[];
    eligibleAfterStatusFilter?: string[];
    nullReason?: string | null;
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
  activeMissionId = null,
  isOnboardingComplete,
  activePack,
  isHeatwaveDeckUnlocked,
  isSocalSummerUnlocked,
  isAdmin,
  canonicalStarterState,
}: {
  missions: TripType[];
  completedMissionIds: Set<string>;
  pendingMissionIds?: Set<string>;
  needsMoreProofMissionIds?: Set<string>;
  rejectedMissionIds?: Set<string>;
  activeMissionId?: string | null;
  isOnboardingComplete: boolean;
  activePack: DeckPack | null;
  isHeatwaveDeckUnlocked: boolean;
  isSocalSummerUnlocked: boolean;
  isAdmin: boolean;
  canonicalStarterState?: CanonicalStarterDeckState | null;
}): EligibleDrawPoolResult {
  if (isDevEnv) {
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
  }

  if (!missions || missions.length === 0) {
    if (isDevEnv) console.log('[deckLogic] missions empty, returning loading');
    return { eligibleMissions: [], reason: 'loading' };
  }

  const ONBOARDING_IDS = [...STARTER_SIGNAL_IDS];
  const STARTER_CARD_IDS = new Set<string>(ONBOARDING_IDS);
  let pool: TripType[] = [];
  let reason: DrawPoolReason | null = null;
  let starterAvailableIds: Set<string> | null = null;
  const diagnostics: EligibleDrawPoolResult['diagnostics'] = {
    canonicalSubmittedIds: canonicalStarterState?.submittedIds || undefined,
    pendingIds: canonicalStarterState?.pendingIds || Array.from(pendingMissionIds),
    approvedIds: canonicalStarterState?.approvedIds || Array.from(completedMissionIds),
    rejectedIds: canonicalStarterState?.rejectedIds || Array.from(rejectedMissionIds),
    needsMoreProofIds: canonicalStarterState?.needsMoreProofIds || Array.from(needsMoreProofMissionIds),
    activeDrawnIds: canonicalStarterState?.activeDrawnIds || undefined,
    nullReason: null,
  };

  let packMissionIdsNormalized: Set<string> | null = null;

  // 1. Post-Onboarding or Specific Active Pack Selection
  if (activePack) {
    // Check if pack is seasonal and locked
    const packIdLower = activePack.packId.toLowerCase();
    const isHeatwavePack = packIdLower.includes('heatwave');
    const isSocalPack = packIdLower.includes('socal');

    // Rule: Seasonal decks are unlocked if the season is active OR if the user is already playing it
    if (isHeatwavePack && !isHeatwaveDeckUnlocked && !isAdmin) {
      if (isDevEnv) console.log('[deckLogic] Heatwave pack locked.');
      return { eligibleMissions: [], reason: 'season_locked' };
    }

    if (isSocalPack && !isSocalSummerUnlocked && !isAdmin) {
      if (isDevEnv) console.log('[deckLogic] SoCal Summer pack locked.');
      return { eligibleMissions: [], reason: 'season_locked' }; 
    }

    packMissionIdsNormalized = new Set(activePack.missionIds.map(id => id.toString().toLowerCase().trim()));
    pool = missions.filter(m => {
      const mid = (m.id || (m as any).missionId || (m as any).challengeId || '').toString().toLowerCase().trim();
      return packMissionIdsNormalized!.has(mid);
    });

    if (activePack.packId === 'starter-signals' && canonicalStarterState) {
      starterAvailableIds = new Set(canonicalStarterState.availableIds);
    }
    
    if (isDevEnv) console.log(`[deckLogic] Active pack: ${activePack.packId} (${activePack.packName}). Found ${pool.length} missions in pool.`);
  } 
  // 2. Sequential Onboarding (Fallthrough if no active seasonal pack selected)
  else if (!isOnboardingComplete && !isAdmin) {
    const starterMissions = missions.filter(m => ONBOARDING_IDS.includes(m.id.toLowerCase() as any));
    if (canonicalStarterState) {
      starterAvailableIds = new Set(canonicalStarterState.availableIds);
    }
    
    // Find the first starter mission that isn't completed or pending
    const nextStarter = starterMissions.find(m => {
      const mid = m.id.toLowerCase();
      return starterAvailableIds ? starterAvailableIds.has(mid) : !completedMissionIds.has(mid) && !pendingMissionIds.has(mid);
    });

    if (nextStarter) {
      pool = [nextStarter];
    } else {
      pool = starterMissions; 
    }
    
    reason = 'onboarding_active';
    if (isDevEnv) console.log(`[deckLogic] Onboarding active. Next sequential starter: ${nextStarter?.id}. Pool size: ${pool.length}`);
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
    if (isDevEnv) console.log(`[deckLogic] No specific active pack. Fallback pool size: ${pool.length}`);
  }

  const analysis: ExclusionAnalysis[] = [];
  const eligibleMissions: TripType[] = [];

  // If we are in an active pack, ensure we account for ALL missions in the pack even if they are missing from the trips bank
  const analyzedIds = new Set<string>();

  const processMission = (m: TripType) => {
    const missionIdLower = (m.id || (m as any).missionId || (m as any).challengeId || '').toString().toLowerCase().trim();
    if (!missionIdLower) return;
    
    analyzedIds.add(missionIdLower);

    const isStarterMission = STARTER_CARD_IDS.has(missionIdLower);
    const isApproved = canonicalStarterState && isStarterMission ? canonicalStarterState.approvedIds.includes(missionIdLower) : completedMissionIds.has(missionIdLower);
    const isPending = canonicalStarterState && isStarterMission ? canonicalStarterState.pendingIds.includes(missionIdLower) : pendingMissionIds.has(missionIdLower);
    const isNeedsMoreProof = canonicalStarterState && isStarterMission ? canonicalStarterState.needsMoreProofIds.includes(missionIdLower) : needsMoreProofMissionIds.has(missionIdLower);
    const isRejected = canonicalStarterState && isStarterMission ? canonicalStarterState.rejectedIds.includes(missionIdLower) : rejectedMissionIds.has(missionIdLower);
    const isActiveMission = !!activeMissionId && missionIdLower === activeMissionId.toLowerCase().trim();
    const isAlreadySubmitted = isApproved || isPending || isNeedsMoreProof || isRejected;
    
    const status = (m.status || 'available').toLowerCase();
    const isAllowedStatus = isStarterMission
      ? status === 'active'
      : ['published', 'available', 'approved', 'active', 'auto_approved', 'approved_by_admin'].includes(status);
    
    let isDrawable = isAllowedStatus && !isApproved && !isPending && !isNeedsMoreProof && !isActiveMission;
    let exclusionReason: string | null = null;

    if (!isAllowedStatus) exclusionReason = `disallowed_status:${status}`;
    else if (isApproved) exclusionReason = 'approved';
    else if (isPending) exclusionReason = 'pending';
    else if (isNeedsMoreProof) exclusionReason = 'needs_more_proof';
    else if (isActiveMission) exclusionReason = 'active_mission_in_progress';
    else if (isRejected) {
      isDrawable = false;
      exclusionReason = isStarterMission ? 'rejected_retry_path_required' : 'rejected';
    } else if (starterAvailableIds && isStarterMission && !starterAvailableIds.has(missionIdLower)) {
      isDrawable = false;
      exclusionReason = 'starter_not_available';
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

  if (isDevEnv && activePack?.packId === 'heatwave-receipts') {
    console.log('[deckLogic] Heatwave Receipts Availability Summary:', {
      availableCount: eligibleMissions.length,
      analysisCount: analysis.length,
      analysisSummary: analysis.map(a => `${a.cardId}: ${a.isDrawable ? 'DRAWABLE' : 'BLOCKED (' + a.exclusionReason + ')'}`),
    });
  }

  if (eligibleMissions.length === 0) {
    const isStarterPack = activePack?.packId === 'starter-signals' || (!activePack && !isOnboardingComplete && !isAdmin);
    if (isStarterPack) {
      const starterAnalysis = analysis.filter(a => STARTER_CARD_IDS.has(a.cardId));
      const activeStarterCards = starterAnalysis.filter(a => a.status === 'active');
      const draftStarterCards = starterAnalysis.filter(a => a.status === 'draft' || a.exclusionReason === 'disallowed_status:draft');
      const pendingStarterCards = starterAnalysis.filter(a => a.isPending);
      const approvedStarterCards = starterAnalysis.filter(a => a.isApproved);
      const activeMissionStarterCards = starterAnalysis.filter(a => a.exclusionReason === 'active_mission_in_progress');

      if (draftStarterCards.length > 0 || activeStarterCards.length < ONBOARDING_IDS.length) {
        reason = 'unpublished_cards_blocked';
      } else if (pendingStarterCards.length >= ONBOARDING_IDS.length && approvedStarterCards.length < ONBOARDING_IDS.length) {
        reason = 'all_starter_signals_pending_review';
      } else if (activeMissionStarterCards.length > 0) {
        reason = 'active_mission_in_progress';
      } else if (!isOnboardingComplete && !isAdmin) {
        reason = 'onboarding_complete';
      } else {
        reason = 'no_eligible_cards';
      }
    } else {
      reason = 'pack_exhausted';
    }
    diagnostics.nullReason = `no_eligible_missions:${reason}`;
  }

  diagnostics.eligibleBeforeSelection = pool.map(m => m.id);
  diagnostics.eligibleAfterStatusFilter = eligibleMissions.map(m => m.id);

  return { 
    eligibleMissions, 
    reason, 
    excludedCards: analysis.filter(a => !a.isDrawable).map(a => ({ id: a.cardId, reason: a.exclusionReason || 'unknown' })),
    analysis,
    diagnostics
  };
}
