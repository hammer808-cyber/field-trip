import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { Entry } from '../types/game';
import { getStarterProgressFromEntries, STARTER_REQUIRED_APPROVALS } from './starterProgress';

export interface StarterCompletionState {
  starterApprovedCount: number;
  starterRequiredCount: number;
  starterComplete: boolean;
  pendingStarterCount: number;
  retryStarterCount: number;
  needsMoreProofStarterCount: number;
  submittedUniqueCount: number;
  submittedMissionIds: string[];
  needsMoreProofMissionId?: string | null;
  needsMoreProofEntryId?: string | null;
  rejectedMissionId?: string | null;
  rejectedEntryId?: string | null;
  nextStarterAction: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'PENDING_REVIEW' | 'NEEDS_MORE_PROOF' | 'REJECTED_RETRY_AVAILABLE' | 'COMPLETE';
}

function emptyStarterState(): StarterCompletionState {
  return {
    starterApprovedCount: 0,
    starterRequiredCount: STARTER_REQUIRED_APPROVALS,
    starterComplete: false,
    pendingStarterCount: 0,
    retryStarterCount: 0,
    needsMoreProofStarterCount: 0,
    submittedUniqueCount: 0,
    submittedMissionIds: [],
    needsMoreProofMissionId: null,
    needsMoreProofEntryId: null,
    rejectedMissionId: null,
    rejectedEntryId: null,
    nextStarterAction: 'Draw Starter Mission',
    status: 'NOT_STARTED'
  };
}

function toStarterCompletionState(progress: ReturnType<typeof getStarterProgressFromEntries>): StarterCompletionState {
  return {
    starterApprovedCount: progress.approvedCount,
    starterRequiredCount: progress.requiredApprovals,
    starterComplete: progress.isComplete,
    pendingStarterCount: progress.pendingCount,
    retryStarterCount: progress.rejectedCount,
    needsMoreProofStarterCount: progress.needsMoreProofCount,
    submittedUniqueCount: progress.submittedUniqueCount,
    submittedMissionIds: Array.from(new Set([
      ...progress.approvedIds,
      ...progress.pendingIds,
      ...progress.needsMoreProofIds,
      ...progress.rejectedIds
    ])),
    needsMoreProofMissionId: progress.needsMoreProofIds[0] || null,
    needsMoreProofEntryId: null,
    rejectedMissionId: progress.rejectedIds[0] || null,
    rejectedEntryId: null,
    nextStarterAction: progress.nextAction,
    status: progress.status
  };
}

/**
 * Pure calculator function to determine Starter Completion state from an entries array.
 * This now delegates starter identity and status precedence to the shared canonical selector.
 */
export function calculateStarterState(
  userId: string,
  entries: Entry[],
  activeMissionId?: string | null,
  activeSubmissionStatus?: string | null,
  starterResetVersion?: string | null,
  activeStarterDeckId?: string | null
): StarterCompletionState {
  if (!userId) return emptyStarterState();

  const progress = getStarterProgressFromEntries(userId, entries, {
    activeMissionId,
    starterResetVersion,
    activeStarterDeckId
  });

  return toStarterCompletionState(progress);
}

/**
 * Canonical Firestore accessor to get Starter Completion State.
 */
export async function getStarterCompletionState(userId: string): Promise<StarterCompletionState> {
  if (!userId) return emptyStarterState();

  try {
    const qUid = query(collection(db, 'entries'), where('uid', '==', userId));
    const qUserId = query(collection(db, 'entries'), where('userId', '==', userId));
    const [snapUid, snapUserId] = await Promise.all([getDocs(qUid), getDocs(qUserId)]);
    const entriesMap = new Map<string, Entry>();

    snapUid.docs.forEach(doc => {
      entriesMap.set(doc.id, { id: doc.id, ...doc.data() } as Entry);
    });
    snapUserId.docs.forEach(doc => {
      entriesMap.set(doc.id, { id: doc.id, ...doc.data() } as Entry);
    });

    const userDocRef = doc(db, 'users', userId);
    const gameConfigDocRef = doc(db, 'appConfig', 'game');
    const [userDocSnap, configDocSnap] = await Promise.all([
      getDoc(userDocRef),
      getDoc(gameConfigDocRef)
    ]);

    let activeMissionId = null;
    let activeSubmissionStatus = null;
    let starterResetVersion = null;
    let activeStarterDeckId = 'starter-signals';

    if (userDocSnap.exists()) {
      const uData = userDocSnap.data();
      activeMissionId = uData?.activeMissionId || uData?.activeTrip?.id || null;
      activeSubmissionStatus = uData?.activeSubmissionStatus || uData?.activeTrip?.status || null;
    }

    if (configDocSnap.exists()) {
      const cData = configDocSnap.data();
      starterResetVersion = cData?.starterResetVersion || null;
      activeStarterDeckId = cData?.activeStarterDeckId || 'starter-signals';
    }

    return calculateStarterState(
      userId,
      Array.from(entriesMap.values()),
      activeMissionId,
      activeSubmissionStatus,
      starterResetVersion,
      activeStarterDeckId
    );
  } catch (error) {
    console.error('Error in getStarterCompletionState:', error);
    return emptyStarterState();
  }
}
