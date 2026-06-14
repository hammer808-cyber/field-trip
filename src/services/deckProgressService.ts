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
import { normalizeEntryStatus } from '../logic/entryLogic';
import { getDeckPackById } from '../data/deckPacks';
import {
  CANONICAL_STARTER_DECK_ID,
  STARTER_REQUIRED_APPROVALS,
  getStarterProgressFromEntries,
  isCanonicalStarterMissionId
} from '../utils/starterProgress';

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

function emptyProgress(deckId: string): DeckProgress {
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

async function getUserEntries(userId: string): Promise<any[]> {
  const entriesRef = collection(db, 'entries');
  const qUid = query(entriesRef, where('uid', '==', userId));
  const qUserId = query(entriesRef, where('userId', '==', userId));
  const [snapUid, snapUserId] = await Promise.all([getDocs(qUid), getDocs(qUserId)]);
  const entriesMap = new Map<string, any>();
  snapUid.docs.forEach(docSnap => entriesMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() }));
  snapUserId.docs.forEach(docSnap => entriesMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() }));
  return Array.from(entriesMap.values());
}

async function getStarterContext(userId: string): Promise<{ activeMissionId: string | null; starterResetVersion: string | null; activeStarterDeckId: string | null; activeTrip: any | null }> {
  const userRef = doc(db, 'users', userId);
  const configRef = doc(db, 'appConfig', 'game');
  const [userSnap, configSnap] = await Promise.all([
    getDoc(userRef).catch(() => null),
    getDoc(configRef).catch(() => null)
  ]);
  const profile = userSnap && userSnap.exists() ? userSnap.data() : null;
  const config = configSnap && configSnap.exists() ? configSnap.data() : null;
  return {
    activeMissionId: profile?.activeMissionId || profile?.activeTrip?.id || null,
    starterResetVersion: config?.starterResetVersion || null,
    activeStarterDeckId: config?.activeStarterDeckId || CANONICAL_STARTER_DECK_ID,
    activeTrip: profile?.activeTrip || null
  };
}

export async function getUserDeckProgress(userId: string, deckId: string): Promise<DeckProgress> {
  if (!userId) return emptyProgress(deckId);

  try {
    const deckPack = getDeckPackById(deckId);
    if (!deckPack) throw new Error(`Deck pack with id ${deckId} not found`);

    const entriesList = await getUserEntries(userId);
    const starterContext = await getStarterContext(userId);

    if (deckId === CANONICAL_STARTER_DECK_ID) {
      const starterProgress = getStarterProgressFromEntries(userId, entriesList, {
        activeMissionId: starterContext.activeMissionId,
        starterResetVersion: starterContext.starterResetVersion,
        activeStarterDeckId: starterContext.activeStarterDeckId
      });

      const active = starterContext.activeMissionId && starterProgress.starterMissionIds.includes(starterContext.activeMissionId.toLowerCase().trim()) && !starterProgress.approvedIds.includes(starterContext.activeMissionId.toLowerCase().trim()) && !starterProgress.pendingIds.includes(starterContext.activeMissionId.toLowerCase().trim())
        ? 1
        : 0;

      return {
        deckId,
        approved: starterProgress.approvedCount,
        pending: starterProgress.pendingCount,
        active,
        available: starterProgress.availableIds.length,
        hasNeedsMoreProof: starterProgress.needsMoreProofCount > 0,
        hasRejected: starterProgress.rejectedCount > 0,
        isComplete: starterProgress.isComplete,
        totalMissions: starterProgress.starterMissionIds.length,
        approvedIds: starterProgress.approvedIds,
        pendingIds: starterProgress.pendingIds
      };
    }

    const missionIds = (deckPack.missionIds || []).map(id => id.toLowerCase().trim());
    const totalMissions = missionIds.length;
    const approvedIds = new Set<string>();
    const pendingIds = new Set<string>();
    let activeNeedsMoreProof = false;
    let activeRejected = false;

    const deckEntriesList = entriesList.filter(e => {
      const eMissionId = (e.missionId || e.challengeId || e.tripId || '').toLowerCase().trim();
      return missionIds.includes(eMissionId);
    });

    deckEntriesList.forEach(e => {
      const eMissionId = (e.missionId || e.challengeId || e.tripId || '').toLowerCase().trim();
      const status = normalizeEntryStatus(e.status);
      if (status === 'approved') approvedIds.add(eMissionId);
      else if (status === 'pending_review') pendingIds.add(eMissionId);
    });

    approvedIds.forEach(id => pendingIds.delete(id));

    let active = 0;
    if (starterContext.activeTrip?.id) {
      const activeIdClean = starterContext.activeTrip.id.toLowerCase().trim();
      if (missionIds.includes(activeIdClean) && !approvedIds.has(activeIdClean) && !pendingIds.has(activeIdClean)) active = 1;
    }

    deckEntriesList.forEach(e => {
      const eMissionId = (e.missionId || e.challengeId || e.tripId || '').toLowerCase().trim();
      const status = normalizeEntryStatus(e.status);
      if (!approvedIds.has(eMissionId) && !pendingIds.has(eMissionId)) {
        if (status === 'needs_more_proof') activeNeedsMoreProof = true;
        if (status === 'rejected') activeRejected = true;
      }
    });

    const available = missionIds.filter(id => !approvedIds.has(id) && !pendingIds.has(id) && (!starterContext.activeTrip || starterContext.activeTrip.id.toLowerCase().trim() !== id)).length;

    return {
      deckId,
      approved: approvedIds.size,
      pending: pendingIds.size,
      active,
      available,
      hasNeedsMoreProof: activeNeedsMoreProof,
      hasRejected: activeRejected,
      isComplete: approvedIds.size >= totalMissions && totalMissions > 0,
      totalMissions,
      approvedIds: Array.from(approvedIds),
      pendingIds: Array.from(pendingIds)
    };
  } catch (err) {
    console.error(`[deckProgressService] Failure mapping progress for deck ${deckId}:`, err);
    return emptyProgress(deckId);
  }
}

export async function getStarterDeckProgress(userId: string): Promise<DeckProgress> {
  return getUserDeckProgress(userId, CANONICAL_STARTER_DECK_ID);
}

export function getDeckDisplayState(progress: DeckProgress): DeckDisplayState {
  const approved = progress.approved || 0;
  const pending = progress.pending || 0;
  const active = progress.active || 0;
  const available = progress.available || 0;
  const isComplete = approved >= STARTER_REQUIRED_APPROVALS;

  if (isComplete) {
    return {
      state: 'COMPLETE',
      uiLabel: 'Starter Complete',
      subtext: 'You have calibrated your sensors. Heatwave Receipts deck is unlocked.',
      primaryAction: 'Enter Heatwave Receipts',
      canUnlockSummer: true
    };
  }

  if (progress.hasNeedsMoreProof) {
    return {
      state: 'NEEDS_MORE_PROOF',
      uiLabel: 'More proof needed',
      subtext: 'One or more of your starter signals require additional evidence.',
      primaryAction: 'Add More Proof',
      canUnlockSummer: false
    };
  }

  if (progress.hasRejected) {
    return {
      state: 'REJECTED_RETRY_AVAILABLE',
      uiLabel: 'Rejected',
      subtext: 'This one did not pass review. Try again and earn retry points.',
      primaryAction: 'Retry Mission',
      canUnlockSummer: false
    };
  }

  if (approved === 0 && pending === 0 && active === 0) {
    return {
      state: 'NOT_STARTED',
      uiLabel: 'Draw your first Starter Signal',
      subtext: 'Initialize your connection to the Bureau.',
      primaryAction: 'Draw Starter Card',
      canUnlockSummer: false
    };
  }

  if (approved < STARTER_REQUIRED_APPROVALS && pending > 0 && available === 0) {
    return {
      state: 'PENDING_REVIEW',
      uiLabel: 'Starter proofs under review',
      progressLabel: `${approved} / ${STARTER_REQUIRED_APPROVALS} approved`,
      subtext: `${pending} signal${pending !== 1 ? 's' : ''} currently under review.`,
      primaryAction: 'Awaiting Assessment',
      canUnlockSummer: false
    };
  }

  return {
    state: 'IN_PROGRESS',
    uiLabel: 'Starter in progress',
    progressLabel: `${approved} / ${STARTER_REQUIRED_APPROVALS} approved`,
    subtext: 'Calibrate your sensors in the field.',
    primaryAction: 'Draw Starter Card',
    canUnlockSummer: false
  };
}

export async function canUnlockHeatwaveReceipts(userId: string): Promise<boolean> {
  const progress = await getStarterDeckProgress(userId);
  return progress.approved >= STARTER_REQUIRED_APPROVALS;
}

export async function retryMissionSubmission(userId: string, missionId: string): Promise<void> {
  if (!userId || !missionId) return;
  const missionIdClean = missionId.toLowerCase().trim();

  try {
    const batch = writeBatch(db);
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

    if (profile?.activeTrip && profile.activeTrip.id && profile.activeTrip.id.toLowerCase().trim() === missionIdClean) {
      updates.activeTrip = null;
    }

    batch.update(userRef, updates);

    const entriesRef = collection(db, 'entries');
    const qUid = query(entriesRef, where('uid', '==', userId), where('status', 'in', ['rejected', 'needs-more-proof', 'needs_more_proof']));
    const qUserId = query(entriesRef, where('userId', '==', userId), where('status', 'in', ['rejected', 'needs-more-proof', 'needs_more_proof']));
    const [snapUid, snapUserId] = await Promise.all([getDocs(qUid), getDocs(qUserId)]);
    const processedDocIds = new Set<string>();

    const updateEntryStatus = (docSnap: any) => {
      const eData = docSnap.data();
      const eMissionId = (eData.missionId || eData.challengeId || eData.tripId || '').toLowerCase().trim();
      if (eMissionId === missionIdClean && !processedDocIds.has(docSnap.id)) {
        processedDocIds.add(docSnap.id);
        batch.update(doc(db, 'entries', docSnap.id), { status: 'retried' });
      }
    };

    snapUid.docs.forEach(updateEntryStatus);
    snapUserId.docs.forEach(updateEntryStatus);
    await batch.commit();
    console.log(`[deckProgressService] Successfully reset retry submission for user: ${userId}, mission: ${missionIdClean}`);
  } catch (err) {
    console.error(`[deckProgressService] Failed to reset retry submission for user: ${userId}, mission: ${missionIdClean}`, err);
    throw err;
  }
}

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
  const userEntries = await getUserEntries(userId);
  const mEntries = userEntries.filter(e => {
    const eMid = (e.missionId || e.challengeId || e.tripId || '').toLowerCase().trim();
    return eMid === missionIdClean && e.archived !== true && e.countsTowardStarter !== false;
  });

  let status = 'unseen';
  if (mEntries.length > 0) {
    const hasApproved = mEntries.some(e => normalizeEntryStatus(e.status) === 'approved');
    const hasPending = mEntries.some(e => normalizeEntryStatus(e.status) === 'pending_review');
    const hasNeedsMore = mEntries.some(e => normalizeEntryStatus(e.status) === 'needs_more_proof');
    const hasRejected = mEntries.some(e => normalizeEntryStatus(e.status) === 'rejected');
    if (hasApproved) status = 'approved';
    else if (hasPending) status = 'pending_review';
    else if (hasNeedsMore) status = 'needs_more_proof';
    else if (hasRejected) status = 'rejected';
  }

  const isApproved = status === 'approved';
  const isPending = status === 'pending_review';
  const needsMoreProof = status === 'needs_more_proof';
  const isRejected = status === 'rejected';

  return {
    missionId,
    status,
    isApproved,
    isPending,
    needsMoreProof,
    isRejected,
    isRetryable: isRejected,
    isCompleted: isApproved,
    canSubmit: status === 'unseen' || status === 'needs_more_proof',
    canRetry: isRejected,
    canDrawAgain: false
  };
}

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

  const userEntries = await getUserEntries(userId);

  if (deckId === CANONICAL_STARTER_DECK_ID) {
    const starterContext = await getStarterContext(userId);
    const progress = getStarterProgressFromEntries(userId, userEntries, {
      activeMissionId: starterContext.activeMissionId,
      starterResetVersion: starterContext.starterResetVersion,
      activeStarterDeckId: starterContext.activeStarterDeckId
    });

    return {
      deckId,
      approvedCount: progress.approvedCount,
      pendingCount: progress.pendingCount,
      needsMoreProofCount: progress.needsMoreProofCount,
      rejectedRetryableCount: progress.rejectedCount,
      availableMissionCount: progress.availableIds.length,
      isExhausted: progress.isComplete,
      nextMissionId: progress.nextMissionId,
      nextAction: progress.nextAction
    };
  }

  let approvedCount = 0;
  let pendingCount = 0;
  let needsMoreProofCount = 0;
  let rejectedRetryableCount = 0;
  let availableMissionCount = 0;
  let nextMissionId: string | null = null;
  const missionStates = new Map<string, string>();

  missionIds.forEach(mId => {
    const mEntries = userEntries.filter(e => {
      const eMid = (e.missionId || e.challengeId || e.tripId || '').toLowerCase().trim();
      return eMid === mId && e.archived !== true;
    });
    let status = 'unseen';
    if (mEntries.length > 0) {
      const hasApproved = mEntries.some(e => normalizeEntryStatus(e.status) === 'approved');
      const hasPending = mEntries.some(e => normalizeEntryStatus(e.status) === 'pending_review');
      const hasNeedsMore = mEntries.some(e => normalizeEntryStatus(e.status) === 'needs_more_proof');
      const hasRejected = mEntries.some(e => normalizeEntryStatus(e.status) === 'rejected');
      if (hasApproved) status = 'approved';
      else if (hasPending) status = 'pending_review';
      else if (hasNeedsMore) status = 'needs_more_proof';
      else if (hasRejected) status = 'rejected';
    }

    missionStates.set(mId, status);
    if (status === 'approved') approvedCount++;
    else if (status === 'pending_review') pendingCount++;
    else if (status === 'needs_more_proof') needsMoreProofCount++;
    else if (status === 'rejected') rejectedRetryableCount++;
    else availableMissionCount++;
  });

  const isExhausted = availableMissionCount === 0 && pendingCount === 0 && needsMoreProofCount === 0 && rejectedRetryableCount === 0;
  nextMissionId = missionIds.find(mId => missionStates.get(mId) === 'unseen') || null;

  return {
    deckId,
    approvedCount,
    pendingCount,
    needsMoreProofCount,
    rejectedRetryableCount,
    availableMissionCount,
    isExhausted,
    nextMissionId,
    nextAction: isExhausted ? 'deck_exhausted' : 'draw_card'
  };
}
