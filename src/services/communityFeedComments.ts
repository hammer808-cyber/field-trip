/**
 * Community feed comments (Nov 21, 2026 — Option C).
 *
 * Comments live in the top-level `communityFeedComments` collection and
 * attach to a community receipt (entry). One subscription per open
 * receipt detail modal: the feed has no single scope like a crew, so
 * subscribing to the whole collection would be a firehose. Adds and
 * deletes go through the server endpoints (POST /api/community/comments,
 * DELETE /api/community/comments/:id) so the entry's commentCount stays
 * exact with a single writer and the photo owner's notification fans
 * out in the same call. No edits: a wrong comment is deleted and
 * re-posted.
 */
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { authenticatedFetch } from '../lib/api';

export interface CommunityFeedComment {
  id: string;
  entryId: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: any;
}

export function subscribeToCommunityComments(
  entryId: string,
  callback: (comments: CommunityFeedComment[]) => void,
  onError?: (error: unknown) => void,
): () => void {
  const q = query(
    collection(db, 'communityFeedComments'),
    where('entryId', '==', entryId),
    orderBy('createdAt', 'asc'),
    limit(100),
  );
  return onSnapshot(
    q,
    (snapshot) => {
      callback(
        snapshot.docs.map((docSnap) => {
          const data = docSnap.data() || {};
          return {
            id: docSnap.id,
            entryId: String(data.entryId || entryId),
            authorId: String(data.authorId || ''),
            authorName: String(data.authorName || 'Player'),
            text: String(data.text || ''),
            createdAt: data.createdAt ?? null,
          } as CommunityFeedComment;
        }),
      );
    },
    (error) => {
      console.error('[communityFeedComments] subscription failed:', error);
      onError?.(error);
      callback([]);
    },
  );
}

export async function addCommunityComment(
  entryId: string,
  text: string,
): Promise<CommunityFeedComment> {
  const response = await authenticatedFetch('/api/community/comments', {
    method: 'POST',
    body: JSON.stringify({ entryId, text }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'FAILED_TO_ADD_COMMENT');
  }
  const result = await response.json();
  return result.comment as CommunityFeedComment;
}

export async function deleteCommunityComment(commentId: string): Promise<void> {
  const response = await authenticatedFetch(`/api/community/comments/${commentId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'FAILED_TO_DELETE_COMMENT');
  }
}
