import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  writeBatch,
  arrayRemove,
  deleteField
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { countsTowardStarterProgress, isArchivedEntry, normalizeEntryStatus } from '../logic/entryLogic';
import { getDeckPackById } from '../data/deckPacks';

export interface DeckProgress {
  deckId: string;
  approved: number;
  pending: number;
  active: number;
  available: number;
  hasNeedsMoreProof: boolean;
  hasRejected: boolean;
  isComplete: boolean;
  totalMissions: number;
  approvedIds: string[];
  pendingIds: string[];
}

export interface DeckDisplayState {
  state: 'NOT_STARTED' | 'IN_PROGRESS' | 'PENDING_REVIEW' | 'NEEDS_MORE_PROOF' | 'REJECTED_RETRY_AVAILABLE' | 'COMPLETE';
  uiLabel: string;
  subtext?: string;
  progressLabel?: string;
  primaryAction: string;
  canUnlockSummer: boolean;
}

/**
 * Resolves user's progress for a specific deck from the canonical 'entries' Firestore collection.
 */
export async function getUserDeckProgress(userId: string, deckId: string): Promise<DeckProgress> {
  if (!userId) {
    return {
      deckId,
      approved: 0,
      pending: 0,
      active: 0,
      available: 0,
      hasNeedsMoreProof: false,
      hasRejected: false,
      isComplete: false,
      totalMissions: 0,
      approvedIds: [],
      pendingIds: []
    };
  }

  try {
    // 1. Fetch user profile to read activeTrip state
    const profileRef = doc(db, 'users', userId);
    const profileSnap = await getDoc(profileRef);
    const profile = profileSnap.exists() ? profileSnap.data() : null;
    const activeTrip = profile?.activeTrip || null;

    // 2. Fetch deck config
    const deckPack = getDeckPackById(deckId);
    if (!deckPack) {
      throw new Error(`Deck pack with id ${deckId} not found`);
    }

    const missionIds = (deckPack.missionIds || []).map(id => id.toLowerCase().trim());
    const totalMissions = missionIds.length;

    // 3. Query all user entries (handling both 'uid' and 'userId' fields for compatibility)
    const entriesRef = collection(db, 'entries');
    const qUid = query(entriesRef, where('uid', '==', userId));
    const qUserId = query(entriesRef, where('userId', '==', userId));

    const [snapUid, snapUserId] = await Promise.all([
      getDocs(qUid),
      getDocs(qUserId)
    ]);

    // Merge distinct entry documents by document ID
    const entriesMap = new Map<string, any>();
    snapUid.docs.forEach(docSnap => entriesMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() }));
    snapUserId.docs.forEach(docSnap => entriesMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() }));
    const entriesList = Array.from(entriesMap.values());

    // Fetch game config to get active starter version for starter deck
    let activeResetVersion: string | null = null;
    if (deckId === 'starter-signals') {
      try {
        const configSnap = await getDoc(doc(db, 'appConfig', 'game'));
        if (configSnap.exists()) {
          activeResetVersion = configSnap.data()?.starterResetVersion || null;
        }
      } catch (_) {}
    }

    // 4. Map entries that belong to this deck
    const approvedIds = new Set<string>();
    const pendingIds = new Set<string>();
    const deckEntriesList = entriesList.filter(e => {
      if (isArchivedEntry(e)) {
        return false;
      }
      if (deckId === 'starter-signals') {
        if (!countsTowardStarterProgress(e)) {
          return false;
        }
        if (activeResetVersion && e.starterResetVersion !== activeResetVersion) {
          return false;
        }
      }
      const eMissionId = (e.missionId || e.challengeId || e.tripId || '').toLowerCase().trim();
      return missionIds.includes(eMissionId);
    });

    deckEntriesList.forEach(e => {
      const eMissionId = (e.missionId || e.challengeId || e.tripId || '').toLowerCase().trim();
      const status = normalizeEntryStatus(e.status);

      if (status === 'approved') {
        approvedIds.add(eMissionId);
      } else if (status === 'pending_review') {
        pendingIds.add(eMissionId);
      }
    });

    // Deduplicate: if approved, it's not pending anymore
    approvedIds.forEach(id => pendingIds.delete(id));

    // Calculate active trip count (if current active trip is in this deck's missions and not yet submitted/approved)
    let active = 0;
    if (activeTrip && activeTrip.id) {
      const activeIdClean = activeTrip.id.toLowerCase().trim();
      if (
        missionIds.includes(activeIdClean) && 
        !approvedIds.has(activeIdClean) && 
        !pendingIds.has(activeIdClean)
      ) {
        active = 1;
      }
    }

    const approvedCount = approvedIds.size;
    const pendingCount = pendingIds.size;
    const isComplete = approvedCount >= 3; // Gated at 3 approved starter missions

    // Calculate available: other missions in this deck not approved, pending, nor currently active
    const availableMissions = missionIds.filter(id => 
      !approvedIds.has(id) && 
      !pendingIds.has(id) &&
      (!activeTrip || activeTrip.id.toLowerCase().trim() !== id)
    );
    const available = availableMissions.length;

    // Check specific problematic statuses (needs_more_proof or rejected) for missions we have not yet approved or have pending
    let activeNeedsMoreProof = false;
    let activeRejected = false;

    deckEntriesList.forEach(e => {
      const eMissionId = (e.missionId || e.challengeId || e.tripId || '').toLowerCase().trim();
      const status = normalizeEntryStatus(e.status);
      if (!approvedIds.has(eMissionId) && !pendingIds.has(eMissionId)) {
        if (status === 'needs_more_proof') {
          activeNeedsMoreProof = true;
        }
        if (status === 'rejected') {
          activeRejected = true;
        }
      }
    });

    return {
      deckId,
      approved: approvedCount,
      pending: pendingCount,
      active,
      available,
      hasNeedsMoreProof: activeNeedsMoreProof,
      hasRejected: activeRejected,
      isComplete,
      totalMissions,
      approvedIds: Array.from(approvedIds),
      pendingIds: Array.from(pendingIds)
    };
  } catch (err) {
    console.error(`[deckProgressService] Failure mapping progress for deck ${deckId}:`, err);
    return {
      deckId,
      approved: 0,
      pending: 0,
      active: 0,
      available: 0,
      hasNeedsMoreProof: false,
      hasRejected: false,
      isComplete: false,
      totalMissions: 0,
      approvedIds: [],
      pendingIds: []
    };
  }
}

/**
 * Resolves user's progress for the Starter Signals deck ('starter-signals').
 */
export async function getStarterDeckProgress(userId: string): Promise<DeckProgress> {
  return getUserDeckProgress(userId, 'starter-signals');
}

/**
 * Resolves the display state, primary labels, and actions for a deck.
 */
export function getDeckDisplayState(progress: DeckProgress): DeckDisplayState {
  const approved = progress.approved || 0;
  const pending = progress.pending || 0;
  const active = progress.active || 0;
  const available = progress.available || 0;
  const isComplete = approved >= 3;

  // Rule 6: COMPLETE (Only if approved >= 3)
  if (isComplete) {
    return {
      state: 'COMPLETE',
      uiLabel: 'Starter Complete',
      subtext: 'You finished the Starter Signals. Heatwave Receipts is now open for tiny chaos.',
      primaryAction: 'Enter Heatwave Receipts',
      canUnlockSummer: true
    };
  }

  // Rule 4: NEEDS_MORE_PROOF
  if (progress.hasNeedsMoreProof) {
    return {
      state: 'NEEDS_MORE_PROOF',
      uiLabel: 'More proof needed',
      subtext: 'One or more of your starter signals require additional evidence.',
      primaryAction: 'Add More Proof',
      canUnlockSummer: false
    };
  }

  // Rule 5: REJECTED_RETRY_AVAILABLE (If any rejected and not completed)
  if (progress.hasRejected) {
    return {
      state: 'REJECTED_RETRY_AVAILABLE',
      uiLabel: 'Rejected',
      subtext: 'This one did not pass review. Try again and earn retry points.',
      primaryAction: 'Retry Mission',
      canUnlockSummer: false
    };
  }

  // Rule 1: NOT_STARTED
  if (approved === 0 && pending === 0 && active === 0) {
    return {
      state: 'NOT_STARTED',
      uiLabel: 'Draw your first Starter Signal',
      subtext: 'Initialize your connection to the Bureau.',
      primaryAction: 'Draw Starter Card',
      canUnlockSummer: false
    };
  }

  // Rule 3: PENDING_REVIEW
  // Condition: approved < 3 and pending > 0 and no drawable starter missions currently available
  if (approved < 3 && pending > 0 && available === 0) {
    return {
      state: 'PENDING_REVIEW',
      uiLabel: 'Starter proofs under review',
      progressLabel: `${approved} / 3 approved`,
      subtext: `${pending} signal${pending !== 1 ? 's' : ''} currently under review.`,
      primaryAction: 'Awaiting Assessment',
      canUnlockSummer: false
    };
  }

  // Rule 2: IN_PROGRESS
  // Condition: approved < 3 and we still have available missions left to draw
  return {
    state: 'IN_PROGRESS',
    uiLabel: 'Starter in progress',
    progressLabel: `${approved} / 3 approved`,
    subtext: 'Go find the thing, snap a pic, and tell Trevor what happened.',
    primaryAction: 'Draw Starter Card',
    canUnlockSummer: false
  };
}

/**
 * Checks if the user is eligible to unlock the Heatwave Receipts deck.
 * Guaranteed to never unlock unless approved >= 3.
 */
export async function canUnlockHeatwaveReceipts(userId: string): Promise<boolean> {
  const progress = await getStarterDeckProgress(userId);
  return progress.approved >= 3;
}

/**
 * Resets a rejected or failed starter mission submission, clearing its blocked states in user profile and entries.
 */
export async function retryMissionSubmission(userId: string, missionId: string): Promise<void> {
  if (!userId || !missionId) return;

  const missionIdClean = missionId.toLowerCase().trim();

  try {
    const batch = writeBatch(db);

    // 1. Fetch user profile to check activeTrip status and arrays
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    const profile = userSnap.exists() ? userSnap.data() : null;

    const updates: any = {
      submittedChallengeIds: arrayRemove(missionIdClean),
      submittedPendingChallengeIds: arrayRemove(missionIdClean),
      rejectedChallengeIds: arrayRemove(missionIdClean),
      needsMoreProofChallengeIds: arrayRemove(missionIdClean),
      [`tripProgress.${missionIdClean}`]: deleteField()
    };

    // Clear activeTrip if it matches the rejected mission
    if (profile?.activeTrip && profile.activeTrip.id && profile.activeTrip.id.toLowerCase().trim() === missionIdClean) {
      updates.activeTrip = null;
    }

    batch.update(userRef, updates);

    // 2. Query and update all matching 'entries' collection documents for this user and mission
    const entriesRef = collection(db, 'entries');
    
    const qUid = query(
      entriesRef, 
      where('uid', '==', userId), 
      where('status', 'in', ['rejected', 'needs-more-proof', 'needs_more_proof'])
    );
    const qUserId = query(
      entriesRef, 
      where('userId', '==', userId), 
      where('status', 'in', ['rejected', 'needs-more-proof', 'needs_more_proof'])
    );

    const [snapUid, snapUserId] = await Promise.all([
      getDocs(qUid),
      getDocs(qUserId)
    ]);

    const processedDocIds = new Set<string>();

    const updateEntryStatus = (docSnap: any) => {
      const eData = docSnap.data();
      const eMissionId = (eData.missionId || eData.challengeId || eData.tripId || '').toLowerCase().trim();
      if (eMissionId === missionIdClean && !processedDocIds.has(docSnap.id)) {
        processedDocIds.add(docSnap.id);
        const entryDocRef = doc(db, 'entries', docSnap.id);
        batch.update(entryDocRef, { status: 'retried' });
      }
    };

    snapUid.docs.forEach(updateEntryStatus);
    snapUserId.docs.forEach(updateEntryStatus);

    // 3. Commit the batch
    await batch.commit();

    console.log(`[deckProgressService] Successfully reset retry submission for user: ${userId}, mission: ${missionIdClean}`);
  } catch (err) {
    console.error(`[deckProgressService] Failed to reset retry submission for user: ${userId}, mission: ${missionIdClean}`, err);
    throw err;
  }
}

/**
 * Resolves availability state for a single mission under a user.
 */
export async function getMissionAvailabilityState(userId: string, missionId: string) {
  if (!userId || !missionId) {
    return {
      missionId,
      status: 'unseen',
      isApproved: false,
      isPending: false,
      needsMoreProof: false,
      isRejected: false,
      isRetryable: false,
      isCompleted: false,
      canSubmit: true,
      canRetry: false,
      canDrawAgain: false
    };
  }

  const missionIdClean = missionId.toLowerCase().trim();

  // Fetch all user entries
  const entriesRef = collection(db, 'entries');
  const qUid = query(entriesRef, where('uid', '==', userId));
  const qUserId = query(entriesRef, where('userId', '==', userId));
  const [snapUid, snapUserId] = await Promise.all([
    getDocs(qUid),
    getDocs(qUserId)
  ]);

  const entriesMap = new Map<string, any>();
  snapUid.docs.forEach(docSnap => entriesMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() }));
  snapUserId.docs.forEach(docSnap => entriesMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() }));
  const userEntries = Array.from(entriesMap.values());

  const mEntries = userEntries.filter(e => {
    const eMid = (e.missionId || e.challengeId || e.tripId || '').toLowerCase().trim();
    return eMid === missionIdClean && countsTowardStarterProgress(e);
  });

  let status = 'unseen';
  if (mEntries.length > 0) {
    const hasApproved = mEntries.some(e => normalizeEntryStatus(e.status) === 'approved');
    const hasPending = mEntries.some(e => normalizeEntryStatus(e.status) === 'pending_review');
    const hasNeedsMore = mEntries.some(e => normalizeEntryStatus(e.status) === 'needs_more_proof');
    const hasRejected = mEntries.some(e => normalizeEntryStatus(e.status) === 'rejected');

    if (hasApproved) {
      status = 'approved';
    } else if (hasPending) {
      status = 'pending_review';
    } else if (hasNeedsMore) {
      status = 'needs_more_proof';
    } else if (hasRejected) {
      status = 'rejected';
    }
  }

  const isApproved = status === 'approved';
  const isPending = status === 'pending_review';
  const needsMoreProof = status === 'needs_more_proof';
  const isRejected = status === 'rejected';
  
  const isRetryable = isRejected;
  const isCompleted = isApproved;
  const canSubmit = status === 'unseen' || status === 'needs_more_proof';
  const canRetry = isRejected;
  const canDrawAgain = false;

  return {
    missionId,
    status,
    isApproved,
    isPending,
    needsMoreProof,
    isRejected,
    isRetryable,
    isCompleted,
    canSubmit,
    canRetry,
    canDrawAgain
  };
}

/**
 * Resolves availability and progress states for an entire deck under a user.
 */
export async function getDeckAvailabilityState(userId: string, deckId: string) {
  const deckPack = getDeckPackById(deckId);
  const missionIds = (deckPack?.missionIds || []).map(id => id.toLowerCase().trim());

  if (!userId) {
    return {
      deckId,
      approvedCount: 0,
      pendingCount: 0,
      needsMoreProofCount: 0,
      rejectedRetryableCount: 0,
      availableMissionCount: missionIds.length,
      isExhausted: false,
      nextMissionId: missionIds[0] || null,
      nextAction: 'draw_starter_mission'
    };
  }

  // Fetch all user entries
  const entriesRef = collection(db, 'entries');
  const qUid = query(entriesRef, where('uid', '==', userId));
  const qUserId = query(entriesRef, where('userId', '==', userId));
  const [snapUid, snapUserId] = await Promise.all([
    getDocs(qUid),
    getDocs(qUserId)
  ]);

  const entriesMap = new Map<string, any>();
  snapUid.docs.forEach(docSnap => entriesMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() }));
  snapUserId.docs.forEach(docSnap => entriesMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() }));
  const userEntries = Array.from(entriesMap.values());

  let approvedCount = 0;
  let pendingCount = 0;
  let needsMoreProofCount = 0;
  let rejectedRetryableCount = 0;
  let availableMissionCount = 0;

  let nextMissionId: string | null = null;
  let nextAction = 'draw_starter_mission';

  const missionStates = new Map<string, string>();

  missionIds.forEach(mId => {
    const mEntries = userEntries.filter(e => {
      const eMid = (e.missionId || e.challengeId || e.tripId || '').toLowerCase().trim();
      return eMid === mId && countsTowardStarterProgress(e);
    });

    let status = 'unseen';
    if (mEntries.length > 0) {
      const hasApproved = mEntries.some(e => normalizeEntryStatus(e.status) === 'approved');
      const hasPending = mEntries.some(e => normalizeEntryStatus(e.status) === 'pending_review');
      const hasNeedsMore = mEntries.some(e => normalizeEntryStatus(e.status) === 'needs_more_proof');
      const hasRejected = mEntries.some(e => normalizeEntryStatus(e.status) === 'rejected');

      if (hasApproved) {
        status = 'approved';
      } else if (hasPending) {
        status = 'pending_review';
      } else if (hasNeedsMore) {
        status = 'needs_more_proof';
      } else if (hasRejected) {
        status = 'rejected';
      }
    }

    missionStates.set(mId, status);

    if (status === 'approved') {
      approvedCount++;
    } else if (status === 'pending_review') {
      pendingCount++;
    } else if (status === 'needs_more_proof') {
      needsMoreProofCount++;
    } else if (status === 'rejected') {
      rejectedRetryableCount++;
    } else {
      availableMissionCount++;
    }
  });

  let isExhausted = false;
  if (deckId === 'starter-signals') {
    isExhausted = approvedCount >= 3;
  } else {
    const totalCount = missionIds.length;
    // FIX: Deck is only exhausted if there are literally zero missions that can be drawn or acted upon.
    // If there are available missions, it's NOT exhausted even if some are pending.
    isExhausted = (availableMissionCount === 0 && pendingCount === 0 && needsMoreProofCount === 0 && rejectedRetryableCount === 0);
    
    if (import.meta.env.DEV) {
      console.log(`[DeckExhaustCheck] ${deckId}:`, {
        totalCount,
        approvedCount,
        pendingCount,
        available: availableMissionCount,
        isExhausted,
        missionIdsCount: missionIds.length
      });
    }
  }

  if (deckId === 'starter-signals') {
    if (approvedCount < 3) {
      const needsMoreMissionId = missionIds.find(mId => missionStates.get(mId) === 'needs_more_proof');
      const rejectedMissionId = missionIds.find(mId => missionStates.get(mId) === 'rejected');
      const pendingMissionId = missionIds.find(mId => missionStates.get(mId) === 'pending_review');
      const unseenMissionId = missionIds.find(mId => missionStates.get(mId) === 'unseen');

      // Fetch active user profile
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef).catch(() => null);
      const profile = userSnap && userSnap.exists() ? userSnap.data() : null;
      const activeMid = (profile?.activeMissionId || profile?.activeTrip?.id || '').toLowerCase().trim();

      if (activeMid && missionIds.includes(activeMid)) {
        const activeStatus = missionStates.get(activeMid) || 'unseen';
        nextMissionId = activeMid;
        if (activeStatus === 'needs_more_proof') {
          nextAction = 'add_more_proof';
        } else if (activeStatus === 'rejected') {
          nextAction = 'retry_rejected_mission';
        } else if (activeStatus === 'pending_review') {
          nextAction = 'wait_for_review';
        } else {
          nextAction = 'start_starter_mission';
        }
      } else if (needsMoreMissionId) {
        nextMissionId = needsMoreMissionId;
        nextAction = 'add_more_proof';
      } else if (rejectedMissionId) {
        nextMissionId = rejectedMissionId;
        nextAction = 'retry_rejected_mission';
      } else if (unseenMissionId) {
        nextMissionId = unseenMissionId;
        nextAction = 'start_starter_mission';
      } else if (pendingMissionId) {
        nextMissionId = pendingMissionId;
        nextAction = 'wait_for_review';
      }
    } else {
      nextAction = 'starter_complete';
    }
  } else {
    nextAction = isExhausted ? 'deck_exhausted' : 'draw_card';
  }

  return {
    deckId,
    approvedCount,
    pendingCount,
    needsMoreProofCount,
    rejectedRetryableCount,
    availableMissionCount,
    isExhausted,
    nextMissionId,
    nextAction
  };
}
