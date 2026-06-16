import { TripCard as TripType } from '../types/challenges';
import { DeckPack } from '../types/deckPacks';

export type DrawPoolReason = 
  | 'onboarding_active' 
  | 'onboarding_complete' 
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
      const mid = (m.id || m.missionId || m.challengeId || '').toString().toLowerCase().trim();
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

  const excludedCards: { id: string, reason: string }[] = [];

  // Filter out completed missions, pending missions, and ensure available status
  const eligibleMissions = pool.filter(m => {
    const missionIdLower = (m.id || m.missionId || m.challengeId || '').toString().toLowerCase().trim();
    if (!missionIdLower) {
      excludedCards.push({ id: 'unknown', reason: 'missing_id' });
      return false;
    }
    const isStarterMission = ONBOARDING_IDS.includes(missionIdLower);
    
    const isCompleted = completedMissionIds.has(missionIdLower);
    const isPending = pendingMissionIds.has(missionIdLower);
    const isNeedsMoreProof = needsMoreProofMissionIds.has(missionIdLower);
    const isRejected = rejectedMissionIds.has(missionIdLower);
    
    // Status normalization: Treat all active/available/approved as drawable
    const status = (m.status || 'available').toLowerCase();
    const isAllowedStatus = ['available', 'approved', 'active', 'auto_approved', 'approved_by_admin'].includes(status);
    
    if (!isAllowedStatus) excludedCards.push({ id: m.id, reason: `disallowed_status:${status}` });
    else if (isCompleted) excludedCards.push({ id: m.id, reason: 'completed' });
    else if (isPending) excludedCards.push({ id: m.id, reason: 'pending' });
    else if (isNeedsMoreProof) excludedCards.push({ id: m.id, reason: 'needs_more_proof' });
    else if (isRejected && !isStarterMission) excludedCards.push({ id: m.id, reason: 'rejected' });

    // Core Rules:
    // 1. Must be an allowed status
    // 2. Must NOT be already completed (Approved)
    // 3. Must NOT be currently pending review
    // 4. Must NOT be in "Needs More Proof" or "Rejected" state (handled via Logbook)
    // EXCEPTION: Rejected starter missions can be redrawn/retried.
    let ok = isAllowedStatus && !isCompleted && !isPending && !isNeedsMoreProof;
    if (isRejected) {
      if (isStarterMission) {
        ok = true; // Allow retry
      } else {
        ok = false;
      }
    }

    return ok;
  });

  if (activePack?.packId === 'heatwave-receipts') {
    console.log('[deckLogic] Heatwave Receipts Availability Summary:', {
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
    if (!isOnboardingComplete && !isAdmin) {
      reason = 'onboarding_complete'; // Should trigger progression update
      console.log('[deckLogic] Reason: onboarding_complete');
    } else {
      reason = 'pack_exhausted';
      console.log('[deckLogic] Reason: pack_exhausted');
    }
  }

  return { eligibleMissions, reason, excludedCards };
}
