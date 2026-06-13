import { collection, query, where, onSnapshot, setDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface EntryReaction {
  id: string;
  entryId: string;
  userId: string;
  emoji: string;
  createdAt?: any;
}

/**
 * Add an emoji reaction to a specific memory entry.
 */
export async function addReaction(entryId: string, userId: string, emoji: string) {
  // Use a deterministic structure for doc id to prevent same user multiple identical emojis
  const reactionId = `${entryId}_${userId}_${encodeURIComponent(emoji)}`;
  const ref = doc(db, 'reactions', reactionId);
  await setDoc(ref, {
    entryId,
    userId,
    emoji,
    createdAt: serverTimestamp()
  });
}

/**
 * Remove an emoji reaction from a specific memory entry.
 */
export async function removeReaction(entryId: string, userId: string, emoji: string) {
  const reactionId = `${entryId}_${userId}_${encodeURIComponent(emoji)}`;
  const ref = doc(db, 'reactions', reactionId);
  await deleteDoc(ref);
}

/**
 * Subscribe to all reactions for a specific entry.
 */
export function subscribeToReactions(entryId: string, callback: (reactions: EntryReaction[]) => void) {
  const q = query(collection(db, 'reactions'), where('entryId', '==', entryId));
  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as EntryReaction));
    callback(list);
  }, (error) => {
    console.error(`Error subscribing to reactions for entry ${entryId}:`, error);
  });
}

/**
 * Subscribe to all reactions for a list of entries (batches of max 30)
 */
export function subscribeToAllReactions(entryIds: string[], callback: (reactions: EntryReaction[]) => void) {
  if (!entryIds || entryIds.length === 0) {
    callback([]);
    return () => {};
  }

  // Firestore allows 'in' queries up to 30 elements
  const slicedIds = entryIds.slice(0, 30);
  const q = query(collection(db, 'reactions'), where('entryId', 'in', slicedIds));
  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as EntryReaction));
    callback(list);
  }, (error) => {
    console.error(`Error subscribing to mass reactions:`, error);
  });
}
