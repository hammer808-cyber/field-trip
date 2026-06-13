import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { normalizeEntryStatus } from '../logic/entryLogic';
import { getDeckPackById } from '../data/deckPacks';

export interface StarterProgress {
  starterApprovedCount: number;
  starterPendingCount: number;
  starterNeedsMoreProofCount: number;
  starterRejectedCount: number;
  starterComplete: boolean;
}

/**
 * Shared selector for Starter Deck progress across Basecamp, Missions, and Gates.
 * Consolidates profile-level IDs and real-time entry scans.
 */
export async function getStarterProgress(userId: string): Promise<StarterProgress> {
  if (!userId) {
    return {
      starterApprovedCount: 0,
      starterPendingCount: 0,
      starterNeedsMoreProofCount: 0,
      starterRejectedCount: 0,
      starterComplete: false
    };
  }

  // 1. Fetch User Profile for canonical persistence
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  const profile = userSnap.exists() ? userSnap.data() : {};

  const profileApproved = new Set<string>((profile.completedChallengeIds || []).map((id: string) => id.toLowerCase().trim()));
  const profilePending = new Set<string>((profile.submittedChallengeIds || []).map((id: string) => id.toLowerCase().trim()));

  // 2. Fetch all entries for this user to catch any missed states in profile sets
  // We query both uid and userId for compatibility
  const entriesRef = collection(db, 'entries');
  const qUid = query(entriesRef, where('uid', '==', userId));
  const qUserId = query(entriesRef, where('userId', '==', userId));
  
  const [snap1, snap2] = await Promise.all([getDocs(qUid), getDocs(qUserId)]);
  const allEntries = [...snap1.docs, ...snap2.docs].map(d => ({ id: d.id, ...d.data() }));

  const STARTER_MISSION_IDS = ["template_03_ignored_place", "starter-2", "starter-3", "starter-signals"];
  
  const approved = new Set<string>(profileApproved);
  const pending = new Set<string>(profilePending);
  const needsMore = new Set<string>();
  const rejected = new Set<string>();

  allEntries.forEach((e: any) => {
    const mid = (e.missionId || e.challengeId || e.tripId || '').toLowerCase().trim();
    if (!mid) return;
    
    // Check if it's a starter mission
    const isStarter = STARTER_MISSION_IDS.includes(mid) || mid.startsWith('starter-') || e.deckId === 'starter-signals';
    if (!isStarter) return;

    const status = normalizeEntryStatus(e.status);
    if (status === 'approved') {
      approved.add(mid);
    } else if (status === 'pending_review') {
      pending.add(mid);
    } else if (status === 'needs_more_proof') {
      needsMore.add(mid);
    } else if (status === 'rejected') {
      rejected.add(mid);
    }
  });

  // Deduplicate
  approved.forEach(id => {
    pending.delete(id);
    needsMore.delete(id);
    rejected.delete(id);
  });
  pending.forEach(id => {
    needsMore.delete(id);
    rejected.delete(id);
  });

  // Filter ONLY starter IDs for final counts
  const finalApproved = Array.from(approved).filter(id => STARTER_MISSION_IDS.includes(id) || id.startsWith('starter-'));
  const finalPending = Array.from(pending).filter(id => STARTER_MISSION_IDS.includes(id) || id.startsWith('starter-'));
  const finalNeedsMore = Array.from(needsMore).filter(id => STARTER_MISSION_IDS.includes(id) || id.startsWith('starter-'));
  const finalRejected = Array.from(rejected).filter(id => STARTER_MISSION_IDS.includes(id) || id.startsWith('starter-'));

  const starterApprovedCount = finalApproved.length;
  const starterComplete = starterApprovedCount >= 3;

  return {
    starterApprovedCount,
    starterPendingCount: finalPending.length,
    starterNeedsMoreProofCount: finalNeedsMore.length,
    starterRejectedCount: finalRejected.length,
    starterComplete
  };
}

/**
 * Shared selector for Deck progress.
 * Fixes "Deck Exhausted" bug by ensuring accurate available card counts.
 */
export async function getDeckProgress(userId: string, deckId: string) {
  const deckPack = getDeckPackById(deckId);
  const missionIds = (deckPack?.missionIds || []).map(id => id.toLowerCase().trim());

  if (!userId) {
    return {
      approvedCount: 0,
      pendingCount: 0,
      totalCards: missionIds.length,
      availableCards: missionIds,
      isExhausted: missionIds.length === 0
    };
  }

  // Fetch entries
  const entriesRef = collection(db, 'entries');
  const qUid = query(entriesRef, where('uid', '==', userId));
  const qUserId = query(entriesRef, where('userId', '==', userId));
  const [snap1, snap2] = await Promise.all([getDocs(qUid), getDocs(qUserId)]);
  const allEntries = [...snap1.docs, ...snap2.docs].map(d => ({ id: d.id, ...d.data() }));

  const approved = new Set<string>();
  const pending = new Set<string>();
  const needsMore = new Set<string>();
  const rejected = new Set<string>();

  const missionIdsNormalized = new Set(missionIds.map(id => id.toLowerCase()));

  allEntries.forEach((e: any) => {
    const mid = (e.missionId || e.challengeId || e.tripId || '').toLowerCase().trim();
    if (!missionIdsNormalized.has(mid)) return;

    const status = normalizeEntryStatus(e.status);
    if (status === 'approved') approved.add(mid);
    else if (status === 'pending_review') pending.add(mid);
    else if (status === 'needs_more_proof') needsMore.add(mid);
    else if (status === 'rejected') rejected.add(mid);
  });

  // Deduplicate
  approved.forEach(id => {
    pending.delete(id);
    needsMore.delete(id);
    rejected.delete(id);
  });

  const availableCards = missionIds.filter(id => 
    !approved.has(id) && 
    !pending.has(id) && 
    !needsMore.has(id) && 
    !rejected.has(id)
  );

  return {
    approvedCount: approved.size,
    pendingCount: pending.size,
    needsMoreProofCount: needsMore.size,
    rejectedCount: rejected.size,
    totalCards: missionIds.length,
    availableCards,
    isExhausted: availableCards.length === 0 && pending.size === 0 && needsMore.size === 0 && rejected.size === 0 && approved.size < missionIds.length
  };
}
