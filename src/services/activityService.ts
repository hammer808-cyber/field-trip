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
import { COMMUNITY_FEED_QUERY_STATUSES, dedupeCommunityFeedProofs, getCommunityFeedApprovedTime, isCommunityFeedEligible } from '../logic/communityFeed';

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
  const fetchLimit = Math.max(limitCount, Math.min(limitCount * 4, 120));
  const q = query(
    collection(db, 'entries'),
    where('status', 'in', COMMUNITY_FEED_QUERY_STATUSES),
    where('feedVisibility', '==', 'public_discovery'),
    limit(fetchLimit)
  );

  return onSnapshot(q, (snap) => {
    const entries = dedupeCommunityFeedProofs(snap.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        sourceDocumentId: doc.id
      };
    })
      .filter(isCommunityFeedEligible)
    )
      .sort((a: any, b: any) => getCommunityFeedApprovedTime(b) - getCommunityFeedApprovedTime(a))
      .slice(0, limitCount);
    callback(entries);
  }, (error) => {
    console.error("[ActivityService] Public proof subscription failed:", error);
    callback([]);
  });
}

export function subscribeToSocialProofs(
  viewerUserId: string,
  activeCrewId: string | null,
  limitCount: number,
  callback: (entries: any[], errors: string[]) => void,
  acceptedCrewUserIds: readonly string[] = []
) {
  const results = new Map<string, any[]>();
  const errors = new Set<string>();
  const subscriptions: Array<() => void> = [];
  const publish = () => callback(
    dedupeCommunityFeedProofs(Array.from(results.values()).flat().filter(isCommunityFeedEligible))
      .sort((a, b) => getCommunityFeedApprovedTime(b) - getCommunityFeedApprovedTime(a))
      .slice(0, limitCount),
    Array.from(errors)
  );
  const listen = (key: string, constraints: Array<ReturnType<typeof where>>) => {
    const q = query(
      collection(db, 'entries'),
      where('status', 'in', COMMUNITY_FEED_QUERY_STATUSES),
      ...constraints,
      limit(Math.max(limitCount, 24))
    );
    subscriptions.push(onSnapshot(q, snap => {
      results.set(key, snap.docs.map(item => ({ ...item.data(), id: item.id, sourceDocumentId: item.id })));
      errors.delete(key);
      publish();
    }, error => {
      console.warn(`[ActivityService] ${key} feed subscription failed:`, error.message);
      errors.add(`${key}:${error.code || error.message}`);
      results.set(key, []);
      publish();
    }));
  };
  listen('own', [where('userId', '==', viewerUserId)]);
  const crewVisible = ['crew_only', 'followers_only', 'public_discovery'] as const;
  const uniquePeers = Array.from(new Set(acceptedCrewUserIds.filter(id => id && id !== viewerUserId)));
  for (let index = 0; index < uniquePeers.length; index += 10) {
    const chunk = uniquePeers.slice(index, index + 10);
    listen(`crew-people-${index}`, [where('userId', 'in', chunk), where('feedVisibility', 'in', crewVisible)]);
  }
  if (activeCrewId) {
    listen('crew-company', [where('crewId', '==', activeCrewId), where('feedVisibility', 'in', crewVisible)]);
  }
  listen('public-discovery', [where('feedVisibility', '==', 'public_discovery')]);
  return () => subscriptions.forEach(unsubscribe => unsubscribe());
}
