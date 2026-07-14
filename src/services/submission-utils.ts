import {
  collection,
  getDocs,
  query,
  runTransaction,
  where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Entry } from '../types/game';
import { isArchivedEntry, normalizeEntryStatus } from '../logic/entryLogic';
import { authenticatedFetch } from '../lib/api';

/**
 * Fetches approved submissions for a user and validates each canonical entry
 * in a transaction before returning it.
 */
export async function getApprovedSubmissionsForUser(userId: string): Promise<Entry[]> {
  const uidQuery = query(collection(db, 'entries'), where('uid', '==', userId));
  const userIdQuery = query(collection(db, 'entries'), where('userId', '==', userId));
  const [uidSnapshot, userIdSnapshot] = await Promise.all([
    getDocs(uidQuery),
    getDocs(userIdQuery),
  ]);
  const uniqueEntries = new Map<string, any>();
  uidSnapshot.docs.forEach(entryDoc => uniqueEntries.set(entryDoc.id, entryDoc.ref));
  userIdSnapshot.docs.forEach(entryDoc => uniqueEntries.set(entryDoc.id, entryDoc.ref));
  if (uniqueEntries.size === 0) return [];

  return runTransaction(db, async transaction => {
    const results: Entry[] = [];
    for (const entryRef of uniqueEntries.values()) {
      const entrySnapshot = await transaction.get(entryRef);
      if (!entrySnapshot.exists()) continue;
      const entry = entrySnapshot.data() as Entry;
      if (!isArchivedEntry(entry) && normalizeEntryStatus(entry.status) === 'approved') {
        results.push({ ...entry, id: entrySnapshot.id });
      }
    }
    return results;
  });
}

/**
 * Compatibility surface for callers that approve a proof by entry ID. The
 * server owns the status transition, XP ledger, and idempotency transaction.
 */
export async function awardSubmissionPointsOnce(
  submissionId: string,
  notes = '',
): Promise<{ success: boolean; points?: number; reason?: string }> {
  const response = await authenticatedFetch('/api/admin/proof-review/action', {
    method: 'POST',
    body: JSON.stringify({
      entryId: submissionId,
      submissionId,
      action: 'approve',
      notes,
      metadata: {},
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || payload.message || 'REVIEW_ACTION_FAILED');
  }
  return {
    success: payload.success !== false,
    points: Number(payload.points || 0),
    reason: payload.reason,
  };
}
