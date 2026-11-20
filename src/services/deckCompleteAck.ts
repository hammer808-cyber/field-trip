import { arrayUnion, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

/**
 * Persist acknowledgement that the player has seen the Trevor celebration
 * for finishing a deck (DECK_COMPLETE, Nov 20, 2026).
 *
 * Field written:
 *   users/{uid}.trevorSettings.seenDeckCompletions += deckId
 *
 * Guidance treats a finished deck as unseen when its id is not in this
 * set, so each deck pops Trevor once and never re-pops on later opens.
 * arrayUnion keeps the set append-only without a read-modify-write.
 *
 * When the finished deck is the Starter, the existing Starter one-shot is
 * preserved too: users/{uid}.trevorSettings.lastSeenApprovedCount is set
 * to the Starter approved count, so isUnseenStarterUnlock flips false
 * exactly as acknowledgeStarterUnlockSeen did.
 *
 * This is preference/acknowledgement only — it does not change canonical
 * deck completion, scoring, or unlock eligibility. Uses a dotted-path
 * update so other trevorSettings keys are not clobbered.
 */
export async function acknowledgeDeckCompleteSeen(
  uid: string,
  deckId: string,
  starterApprovedCount?: number,
): Promise<void> {
  const normalizedDeckId = String(deckId || '').trim();
  if (!uid || !normalizedDeckId) return;
  const isStarter = normalizedDeckId === 'starter-signals' || normalizedDeckId === 'starter';
  const userRef = doc(db, 'users', uid);
  const updates: Record<string, unknown> = {
    'trevorSettings.seenDeckCompletions': arrayUnion(normalizedDeckId),
    updatedAt: serverTimestamp(),
  };
  if (isStarter && Number.isFinite(starterApprovedCount) && (starterApprovedCount as number) > 0) {
    updates['trevorSettings.lastSeenApprovedCount'] = Math.floor(starterApprovedCount as number);
  }
  await updateDoc(userRef, updates);
}
