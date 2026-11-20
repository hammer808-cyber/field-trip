/**
 * Crew chat (Nov 20, 2026 — crew clubhouse).
 *
 * One channel per crew (crews cap at 8 — channels would be empty rooms),
 * in `crews/{crewId}/messages`. Sends go through the server endpoint
 * (POST /api/crew/chat/messages) so @-mentions fan notifications out in
 * the same call; deletes are direct Firestore writes, allowed by the
 * rules for the author or the captain. The unread signal is per-device:
 * the Chat tab shows a dot for messages newer than the last time this
 * device opened the chat.
 */
import {
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { authenticatedFetch } from '../lib/api';
import { crewChatLastSeenKey } from '../logic/crewSocial';
import type { CrewChatMessage } from '../types/crew';

export function subscribeToCrewMessages(
  crewId: string,
  callback: (messages: CrewChatMessage[]) => void,
): () => void {
  const q = query(
    collection(db, 'crews', crewId, 'messages'),
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
            crewId: String(data.crewId || crewId),
            authorId: String(data.authorId || ''),
            authorName: String(data.authorName || 'Crewmate'),
            text: String(data.text || ''),
            mentions: Array.isArray(data.mentions) ? data.mentions.map(String) : [],
            createdAt: data.createdAt ?? null,
          } as CrewChatMessage;
        }),
      );
    },
    (error) => {
      console.error('[crewChat] subscription failed:', error);
      callback([]);
    },
  );
}

export async function sendCrewChatMessage(
  crewId: string,
  text: string,
): Promise<CrewChatMessage> {
  const response = await authenticatedFetch('/api/crew/chat/messages', {
    method: 'POST',
    body: JSON.stringify({ crewId, text }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'FAILED_TO_SEND_MESSAGE');
  }
  const result = await response.json();
  return result.message as CrewChatMessage;
}

export async function deleteCrewChatMessage(crewId: string, messageId: string): Promise<void> {
  await deleteDoc(doc(db, 'crews', crewId, 'messages', messageId));
}

/** Milliseconds since epoch when this device last opened the crew chat (0 = never). */
export function getCrewChatLastSeen(crewId: string): number {
  try {
    const raw = window.localStorage.getItem(crewChatLastSeenKey(crewId));
    const value = raw ? Number(raw) : 0;
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

/** Mark the crew chat seen as of now (or the given time). */
export function markCrewChatSeen(crewId: string, at: number = Date.now()): void {
  try {
    window.localStorage.setItem(crewChatLastSeenKey(crewId), String(at));
  } catch {
    // Private mode / blocked storage: the dot just stays until next load.
  }
}
