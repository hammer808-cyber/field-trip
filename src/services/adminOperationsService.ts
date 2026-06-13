import { doc, updateDoc, deleteField, serverTimestamp, collection, query, where, getDocs, writeBatch } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { logAdminAction } from "./moderationService";

/**
 * Resets a specific user's Starter Signal progress.
 * This clears approvedStarterCount and allows them to re-do onboarding or starter missions.
 */
export async function resetUserStarterProgress(userId: string, dryRun: boolean = false) {
  if (!userId) throw new Error("Missing userId");

  const userRef = doc(db, "users", userId);
  
  if (!dryRun) {
    await updateDoc(userRef, {
      "starterState.starterApprovedCount": 0,
      "starterState.starterComplete": false,
      "starterState.starterSignalsCompleted": [],
      "starterState.lastResetAt": serverTimestamp(),
      // We don't delete entries, just reset the count/completion flag
      isOnboardingComplete: false
    });

    if (auth.currentUser) {
      await logAdminAction(auth.currentUser.uid, userId, 'user', 'reset_starter_progress', { userId });
    }
  }

  return { success: true, dryRun };
}

/**
 * Marks a season as archived/inactive.
 */
export async function archiveSeason(seasonId: string, dryRun: boolean = false) {
  const seasonRef = doc(db, "seasons", seasonId);
  
  if (!dryRun) {
    await updateDoc(seasonRef, {
      status: 'archived',
      archivedAt: serverTimestamp()
    });

    if (auth.currentUser) {
      await logAdminAction(auth.currentUser.uid, seasonId, 'season', 'archive', { seasonId });
    }
  }

  return { success: true, dryRun };
}

/**
 * Marks a deck as archived/inactive.
 */
export async function archiveDeck(deckId: string, dryRun: boolean = false) {
  const deckRef = doc(db, "decks", deckId);
  
  if (!dryRun) {
    await updateDoc(deckRef, {
      status: 'archived',
      archivedAt: serverTimestamp()
    });

    if (auth.currentUser) {
      await logAdminAction(auth.currentUser.uid, deckId, 'deck', 'archive', { deckId });
    }
  }

  return { success: true, dryRun };
}

/**
 * Robust repair tool that syncs a user's completed counts from their entries.
 */
export async function auditAndRepairUserCounts(userId: string, dryRun: boolean = false) {
  const entriesRef = collection(db, "entries");
  const q = query(entriesRef, where("userId", "==", userId), where("status", "==", "approved"));
  const snapshot = await getDocs(q);
  
  const approvedEntries = snapshot.docs.map(d => d.data());
  const starterEntries = approvedEntries.filter(e => e.deckId === 'starter-signals' || e.isStarter);
  
  const userRef = doc(db, "users", userId);
  
  const repairData = {
    "starterState.starterApprovedCount": starterEntries.length,
    "starterState.starterComplete": starterEntries.length >= 3,
    "stats.totalApproved": approvedEntries.length,
    lastAuditAt: serverTimestamp()
  };

  if (!dryRun) {
    await updateDoc(userRef, repairData);
    
    if (auth.currentUser) {
      await logAdminAction(auth.currentUser.uid, userId, 'user', 'audit_repair_counts', { 
        userId, 
        starterCount: starterEntries.length, 
        totalApproved: approvedEntries.length 
      });
    }
  }

  return {
    scanned: snapshot.size,
    starterCount: starterEntries.length,
    totalApproved: approvedEntries.length,
    dryRun
  };
}

/**
 * Executes a single-user soft reset via secure backend proxy.
 */
export async function softResetUser(params: { targetUserId?: string; targetUsername?: string; confirmReset: boolean }) {
  const { authenticatedFetch } = await import('../lib/api');
  
  const response = await authenticatedFetch('/api/admin/soft-reset-user', {
    method: 'POST',
    body: JSON.stringify(params)
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.message || result.error || 'SOFT_RESET_FAILED');
  }
  
  if (auth.currentUser) {
    await logAdminAction(auth.currentUser.uid, params.targetUserId || params.targetUsername || 'unknown', 'user', 'single_user_soft_reset', result.report);
  }

  return result;
}
