import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

/**
 * Persist acknowledgement that the player has seen the Starter unlock celebration.
 *
 * Field written:
 *   users/{uid}.trevorSettings.lastSeenApprovedCount = starterApprovedCount
 *
 * Guidance treats unlock as unseen when:
 *   starterComplete && lastSeenApprovedCount < starterRequiredCount
 *
 * This is preference/acknowledgement only — it does not change canonical Starter
 * completion, scoring, or unlock eligibility. Uses a dotted-path update so other
 * trevorSettings keys are not clobbered.
 */
export async function acknowledgeStarterUnlockSeen(
  uid: string,
  starterApprovedCount: number,
): Promise<void> {
  if (!uid || !Number.isFinite(starterApprovedCount) || starterApprovedCount <= 0) return;
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    'trevorSettings.lastSeenApprovedCount': Math.floor(starterApprovedCount),
    updatedAt: serverTimestamp(),
  });
}
