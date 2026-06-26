import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { Entry } from '../types/game';
import { countsTowardStarterProgress, normalizeEntryStatus } from '../logic/entryLogic';

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
  canonical?: {
    sourceById: Record<string, string>;
    statusById: Record<string, string>;
  };
}

/**
 * Pure calculator function to determine Starter Completion state from an entries array.
 * Used for fast, synchronous, real-time React updates with ZERO flicker.
 */
export function calculateStarterState(
  userId: string,
  entries: Entry[],
  activeMissionId?: string | null,
  activeSubmissionStatus?: string | null,
  starterResetVersion?: string | null,
  activeStarterDeckId?: string | null
): StarterCompletionState {
  if (!userId) {
    return {
      starterApprovedCount: 0,
      starterRequiredCount: 3,
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

  // Clean IDs used for comparison
  const targetDeckId = (activeStarterDeckId || 'starter-signals').toLowerCase().trim();
  const STARTER_MISSION_IDS = ["starter-1", "starter-2", "starter-3", "starter-signals", "onboarding-mission", "starter-mission"];
  const STARTER_MISSION_IDS_SET = new Set(STARTER_MISSION_IDS.map(id => id.toLowerCase()));

  // 1. Filter submissions belonging to the user
  const userEntries = entries.filter(e => {
    const eUid = e.userId || e.uid;
    return eUid === userId;
  });

  // 2. Evaluate unique Starter Deck submissions ("Approved", "Pending", "Rejected", "Needs more proof")
  const approvedStarterMissions = new Set<string>();
  const pendingStarterMissions = new Set<string>();
  const rejectedStarterMissions = new Map<string, string>(); // missionId -> entryId
  const needsMoreProofMissions = new Map<string, string>(); // missionId -> entryId
  const allSubmittedMissions = new Set<string>();

  userEntries.forEach(e => {
    // If the submission is archived or explicitly marked as not counting toward starter progress, skip it.
    if (!countsTowardStarterProgress(e)) return;

    // Check reset version if specified
    if (starterResetVersion && e.starterResetVersion !== starterResetVersion) return;

    const deckIdLower = (e.deckId || '').toLowerCase().trim();
    const mid = (e.missionId || e.challengeId || e.tripId || '').toLowerCase().trim();
    const eid = e.id;
    
    // Check if it's a known starter mission ID
    const isStarterMissionId = STARTER_MISSION_IDS_SET.has(mid);

    // Deck ID must belong to starter OR mission ID must be a starter mission
    const isStarter = deckIdLower === 'starter' || 
                      deckIdLower === 'starter-signals' || 
                      deckIdLower === 'onboarding' ||
                      deckIdLower === targetDeckId ||
                      isStarterMissionId;
                      
    if (!isStarter) return;
    if (!mid) return;

    // Clean normalized status
    const status = normalizeEntryStatus(e.status);

    if (status === 'approved') {
      approvedStarterMissions.add(mid);
      allSubmittedMissions.add(mid);
    } else if (status === 'pending_review') {
      pendingStarterMissions.add(mid);
      allSubmittedMissions.add(mid);
    } else if (status === 'rejected') {
      rejectedStarterMissions.set(mid, eid);
      allSubmittedMissions.add(mid);
    } else if (status === 'needs_more_proof') {
      needsMoreProofMissions.set(mid, eid);
      allSubmittedMissions.add(mid);
    }
  });

  // Calculate unique approved:
  const starterApprovedCount = approvedStarterMissions.size;
  const starterRequiredCount = 3;
  const starterComplete = starterApprovedCount >= starterRequiredCount;

  // Subtract already approved from pending/rejected/needs_more_proof to avoid duplicates
  pendingStarterMissions.forEach(m => {
    if (approvedStarterMissions.has(m)) pendingStarterMissions.delete(m);
  });
  rejectedStarterMissions.forEach((eid, m) => {
    if (approvedStarterMissions.has(m) || pendingStarterMissions.has(m)) rejectedStarterMissions.delete(m);
  });
  needsMoreProofMissions.forEach((eid, m) => {
    if (approvedStarterMissions.has(m) || pendingStarterMissions.has(m) || rejectedStarterMissions.has(m)) needsMoreProofMissions.delete(m);
  });

  const pendingStarterCount = pendingStarterMissions.size;
  const retryStarterCount = rejectedStarterMissions.size;
  const needsMoreProofStarterCount = needsMoreProofMissions.size;
  const submittedUniqueCount = allSubmittedMissions.size;

  const needsMoreProofMissionId = Array.from(needsMoreProofMissions.keys())[0] || null;
  const needsMoreProofEntryId = needsMoreProofMissions.get(needsMoreProofMissionId || '') || null;
  const rejectedMissionId = Array.from(rejectedStarterMissions.keys())[0] || null;
  const rejectedEntryId = rejectedStarterMissions.get(rejectedMissionId || '') || null;

  // Determine categorical status for UI logic
  let status: StarterCompletionState['status'] = 'NOT_STARTED';
  if (starterComplete) {
    status = 'COMPLETE';
  } else if (needsMoreProofStarterCount > 0) {
    status = 'NEEDS_MORE_PROOF';
  } else if (retryStarterCount > 0) {
    status = 'REJECTED_RETRY_AVAILABLE';
  } else if (submittedUniqueCount >= 3 && starterApprovedCount < 3) {
    status = 'PENDING_REVIEW';
  } else if (starterApprovedCount === 0 && pendingStarterCount === 0 && !activeMissionId) {
    status = 'NOT_STARTED';
  } else {
    status = 'IN_PROGRESS';
  }

  return {
    starterApprovedCount,
    starterRequiredCount,
    starterComplete,
    pendingStarterCount,
    retryStarterCount,
    needsMoreProofStarterCount,
    submittedUniqueCount,
    submittedMissionIds: Array.from(allSubmittedMissions),
    needsMoreProofMissionId,
    needsMoreProofEntryId,
    rejectedMissionId,
    rejectedEntryId,
    nextStarterAction: 'Draw Starter Mission', // Simplified for return
    status
  };
}

/**
 * Canonical Firestore accessor to get Starter Completion State.
 * This satisfies the technical guideline: getStarterCompletionState(userId)
 */
export async function getStarterCompletionState(userId: string): Promise<StarterCompletionState> {
  if (!userId) {
    return {
      starterApprovedCount: 0,
      starterRequiredCount: 3,
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

  try {
    // 1. Query by canonical uid (new entries)
    const qUid = query(
      collection(db, 'entries'),
      where('uid', '==', userId)
    );
    // 2. Query by legacy userId (old entries)
    const qUserId = query(
      collection(db, 'entries'),
      where('userId', '==', userId)
    );

    const [snapUid, snapUserId] = await Promise.all([getDocs(qUid), getDocs(qUserId)]);
    const entriesMap = new Map<string, Entry>();

    snapUid.docs.forEach(doc => {
      entriesMap.set(doc.id, { id: doc.id, ...doc.data() } as Entry);
    });
    snapUserId.docs.forEach(doc => {
      entriesMap.set(doc.id, { id: doc.id, ...doc.data() } as Entry);
    });

    const entries = Array.from(entriesMap.values());

    // Retrieve active profile state and game configuration in parallel
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
      entries, 
      activeMissionId, 
      activeSubmissionStatus,
      starterResetVersion,
      activeStarterDeckId
    );
  } catch (error) {
    console.error("Error in getStarterCompletionState:", error);
    return {
      starterApprovedCount: 0,
      starterRequiredCount: 3,
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
}
