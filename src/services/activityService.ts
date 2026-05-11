import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot,
  where
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ScoreEvent } from '../types/game';

export function subscribeToRecentScoreEvents(limitCount: number, callback: (events: ScoreEvent[]) => void) {
  const q = query(
    collection(db, 'scoreEvents'),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );

  return onSnapshot(q, (snap) => {
    const events = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ScoreEvent[];
    callback(events);
  });
}

export function subscribeToUserScoreEvents(userId: string, limitCount: number, callback: (events: ScoreEvent[]) => void) {
  const q = query(
    collection(db, 'scoreEvents'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );

  return onSnapshot(q, (snap) => {
    const events = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ScoreEvent[];
    callback(events);
  });
}
