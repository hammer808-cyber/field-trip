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
  }, (error) => {
    console.warn("[ActivityService] Recent score events subscription skipped:", error.message);
    callback([]);
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
  }, (error) => {
    console.warn("[ActivityService] User score events subscription skipped:", error.message);
    callback([]);
  });
}

export function subscribeToPublicProofs(limitCount: number, callback: (entries: any[]) => void) {
  const approvedStatuses = ['approved', 'approved_by_admin', 'auto_approved', 'completed'];

  const q = query(
    collection(db, 'entries'),
    where('status', 'in', approvedStatuses),
    where('showInCommunityFeed', '==', true),
    orderBy('approvedAt', 'desc'),
    limit(limitCount)
  );

  return onSnapshot(q, (snap) => {
    const entries = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(entries);
  }, (error) => {
    console.error("[ActivityService] Public proof subscription failed:", error);
    callback([]);
  });
}
