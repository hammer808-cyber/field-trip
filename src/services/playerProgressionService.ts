import {
  collection,
  onSnapshot,
  query,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { authenticatedFetch } from '../lib/api';

export interface PlayerLevelUpEvent {
  id: string;
  userId: string;
  sourceEventId: string;
  fromLevel: number;
  toLevel: number;
  unlockedLevels: number[];
  newTitle: string;
  defaultTitle: string;
  unlockedRewards: string[];
  acknowledged: boolean;
  acknowledgedAt?: unknown;
  createdAt?: unknown;
}

function timestampMillis(value: any): number {
  return value?.toMillis?.() || (Number(value?.seconds) * 1000) || 0;
}

function toLevelUpEvent(snapshot: QueryDocumentSnapshot<DocumentData>): PlayerLevelUpEvent {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    userId: String(data.userId || ''),
    sourceEventId: String(data.sourceEventId || ''),
    fromLevel: Number(data.fromLevel || 1),
    toLevel: Number(data.toLevel || 1),
    unlockedLevels: Array.isArray(data.unlockedLevels) ? data.unlockedLevels.map(Number) : [],
    newTitle: String(data.newTitle || data.defaultTitle || ''),
    defaultTitle: String(data.defaultTitle || data.newTitle || ''),
    unlockedRewards: Array.isArray(data.unlockedRewards) ? data.unlockedRewards.map(String) : [],
    acknowledged: data.acknowledged === true,
    acknowledgedAt: data.acknowledgedAt,
    createdAt: data.createdAt,
  };
}

export function subscribeToPendingLevelUpEvents(
  userId: string,
  callback: (events: PlayerLevelUpEvent[]) => void,
): () => void {
  const levelEventsQuery = query(
    collection(db, 'levelUpEvents'),
    where('userId', '==', userId),
  );
  return onSnapshot(levelEventsQuery, snapshot => {
    const events = snapshot.docs
      .map(toLevelUpEvent)
      .filter(event => !event.acknowledged)
      .sort((a, b) => timestampMillis(a.createdAt) - timestampMillis(b.createdAt));
    callback(events);
  }, error => {
    console.warn('[PlayerProgression] Level-up event subscription failed:', error);
    callback([]);
  });
}

export async function acknowledgeLevelUpEvent(eventId: string): Promise<void> {
  const response = await authenticatedFetch(`/api/progression/level-up-events/${encodeURIComponent(eventId)}/acknowledge`, {
    method: 'POST',
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'LEVEL_UP_ACKNOWLEDGEMENT_FAILED');
  }
}
