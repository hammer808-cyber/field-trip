/**
 * Crew feed comments (Nov 20, 2026 — crew clubhouse).
 *
 * Comments live in the top-level `crewFeedComments` collection and attach
 * to a crew archive entry. One subscription per crew (not per entry):
 * the feed groups them by entryId client-side. Adds go through the
 * server endpoint (POST /api/crew/feed/comments) so the photo owner's
 * notification fans out in the same call; deletes are direct Firestore
 * writes, allowed by the rules for the author or the captain.
 */
import {
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { authenticatedFetch } from '../lib/api';
import type { CrewFeedComment } from '../types/crew';

export function subscribeToCrewComments(
  crewId: string,
  callback: (comments: CrewFeedComment[]) => void,
): () => void {
  const q = query(
    collection(db, 'crewFeedComments'),
    where('crewId', '==', crewId),
    orderBy('createdAt', 'asc'),
    limit(200),
  );
  return onSnapshot(
    q,
    (snapshot) => {
      callback(
        snapshot.docs.map((docSnap) => {
          const data = docSnap.data() || {};
          return {
            id: docSnap.id,
            crewId: String(data.crewId || crewId),
            entryId: String(data.entryId || ''),
            authorId: String(data.authorId || ''),
            authorName: String(data.authorName || 'Crewmate'),
            text: String(data.text || ''),
            createdAt: data.createdAt ?? null,
          } as CrewFeedComment;
        }),
      );
    },
    (error) => {
      console.error('[crewFeedComments] subscription failed:', error);
      callback([]);
    },
  );
}

export async function addCrewFeedComment(
  crewId: string,
  entryId: string,
  text: string,
): Promise<CrewFeedComment> {
  const response = await authenticatedFetch('/api/crew/feed/comments', {
    method: 'POST',
    body: JSON.stringify({ crewId, entryId, text }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'FAILED_TO_ADD_COMMENT');
  }
  const result = await response.json();
  return result.comment as CrewFeedComment;
}

export async function deleteCrewFeedComment(commentId: string): Promise<void> {
  await deleteDoc(doc(db, 'crewFeedComments', commentId));
}
