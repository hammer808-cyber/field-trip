import { TripCard as TripType } from '../types/challenges';
import { DeckPack } from '../types/deckPacks';
import { getCanonicalStarterMissionIds } from '../utils/starterProgress';

export type DrawPoolReason = 
  | 'onboarding_active' 
  | 'onboarding_complete' 
  | 'all_starters_submitted_waiting_review'
  | 'season_locked' 
  | 'pack_exhausted' 
  | 'loading' 
  | 'no_missions';

export interface EligibleDrawPoolResult {
  eligibleMissions: TripType[];
  reason: DrawPoolReason | null;
  excludedCards?: { id: string, reason: string }[];
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
    completedMissionIds: Array.from(completedMissionIds),
    pendingMissionIds: Array.from(pendingMissionIds),
    needsMoreProofMissionIds: Array.from(needsMoreProofMissionIds),
    rejectedMissionIds: Array.from(rejectedMissionIds),
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

  const onboardingIds = getCanonicalStarterMissionIds();
  let pool: TripType[] = [];
  let reason: DrawPoolReason | null = null;
  let packMissionIdsNormalized: Set<string> | null = null;

  if (activePack) {
    const packIdLower = activePack.packId.toLowerCase();
    const isHeatwavePack = packIdLower.includes('heatwave');
    const isSocalPack = packIdLower.includes('socal');

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
      const mid = (m.id || m.missionId || m.challengeId || '').toString().toLowerCase().trim();
      return packMissionIdsNormalized!.has(mid);
    });
    console.log(`[deckLogic] Active pack: ${activePack.packId} (${activePack.packName}). Found ${pool.length} missions in pool.`);
  } else if (!isOnboardingComplete && !isAdmin) {
    const starterMissions = missions.filter(m => onboardingIds.includes((m.id || '').toLowerCase().trim()));
    const nextStarter = starterMissions.find(m => {
      const mid = m.id.toLowerCase().trim();
      return !completedMissionIds.has(mid) && !pendingMissionIds.has(mid) && !needsMoreProofMissionIds.has(mid) && !rejectedMissionIds.has(mid);
    });

    pool = nextStarter ? [nextStarter] : starterMissions;
    reason = 'onboarding_active';
    console.log(`[deckLogic] Onboarding active. Next unsubmitted starter: ${nextStarter?.id}. Pool size: ${pool.length}`);
  } else {
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

  const isStarterPack = activePack?.packId?.toLowerCase() === 'starter-signals';
  const excludedCards: { id: string, reason: string }[] = [];

  const eligibleMissions = pool.filter(m => {
    const missionIdLower = (m.id || m.missionId || m.challengeId || '').toString().toLowerCase().trim();
    if (!missionIdLower) {
      excludedCards.push({ id: 'unknown', reason: 'missing_id' });
      return false;
    }

    const isCompleted = completedMissionIds.has(missionIdLower);
    const isPending = pendingMissionIds.has(missionIdLower);
    const isNeedsMoreProof = needsMoreProofMissionIds.has(missionIdLower);
    const isRejected = rejectedMissionIds.has(missionIdLower);
    const status = (m.status || 'available').toLowerCase();
    const isAllowedStatus = isStarterPack || ['available', 'approved', 'active', 'auto_approved', 'approved_by_admin'].includes(status);

    if (!isAllowedStatus) excludedCards.push({ id: m.id, reason: `disallowed_status:${status}` });
    else if (isCompleted) excludedCards.push({ id: m.id, reason: 'completed' });
    else if (isPending) excludedCards.push({ id: m.id, reason: 'pending' });
    else if (isNeedsMoreProof) excludedCards.push({ id: m.id, reason: 'needs_more_proof' });
    else if (isRejected) excludedCards.push({ id: m.id, reason: 'rejected' });

    return isAllowedStatus && !isCompleted && !isPending && !isNeedsMoreProof && !isRejected;
  });

  if (isStarterPack) {
    const starterRows = pool.map(m => {
      const id = (m.id || m.missionId || m.challengeId || '').toString().toLowerCase().trim();
      const isCompleted = completedMissionIds.has(id);
      const isPending = pendingMissionIds.has(id);
      const isNeedsMoreProof = needsMoreProofMissionIds.has(id);
      const isRejected = rejectedMissionIds.has(id);
      const finalEligible = !!id && !isCompleted && !isPending && !isNeedsMoreProof && !isRejected;
      let exclusionReason = 'eligible';
      if (!id) exclusionReason = 'missing_id';
      else if (isCompleted) exclusionReason = 'completed';
      else if (isPending) exclusionReason = 'pending';
      else if (isNeedsMoreProof) exclusionReason = 'needs_more_proof';
      else if (isRejected) exclusionReason = 'rejected';

      return {
        id: id || 'unknown',
        templateStatus: (m.status || 'available').toString(),
        isCompleted,
        isPending,
        isNeedsMoreProof,
        isRejected,
        finalEligible,
        exclusionReason
      };
    });
    console.table(starterRows);
    console.log('[StarterPool] eligible starter ids', eligibleMissions.map(m => m.id));
    console.log('[StarterPool] excluded starter cards', starterRows.filter(row => !row.finalEligible));
  }

  if (activePack?.packId === 'heatwave-receipts' || activePack?.packId === 'starter-signals') {
    console.log('[deckLogic] Deck Availability Summary:', {
      deckId: activePack.packId,
      availableCount: eligibleMissions.length,
      excludedCount: excludedCards.length,
      excludedDetails: excludedCards,
      approvedIds: Array.from(completedMissionIds).filter(id => packMissionIdsNormalized?.has(id)),
      pendingIds: Array.from(pendingMissionIds).filter(id => packMissionIdsNormalized?.has(id)),
      needsMoreIds: Array.from(needsMoreProofMissionIds).filter(id => packMissionIdsNormalized?.has(id)),
      rejectedIds: Array.from(rejectedMissionIds).filter(id => packMissionIdsNormalized?.has(id))
    });
  }

  console.log(`[deckLogic] Final eligible pool size: ${eligibleMissions.length}`);

  if (eligibleMissions.length === 0) {
    if (isStarterPack) {
      const allStarterApproved = onboardingIds.every(id => completedMissionIds.has(id));
      reason = allStarterApproved || isOnboardingComplete ? 'onboarding_complete' : 'all_starters_submitted_waiting_review';
      console.log('[StarterPool] final reason', reason);
    } else if (!isOnboardingComplete && !isAdmin) {
      reason = 'onboarding_complete';
      console.log('[deckLogic] Reason: onboarding_complete');
    } else {
      reason = 'pack_exhausted';
      console.log('[deckLogic] Reason: pack_exhausted');
    }
  } else if (isStarterPack) {
    console.log('[StarterPool] final reason', reason || 'starter_cards_available');
  }

  return { eligibleMissions, reason, excludedCards };
}
