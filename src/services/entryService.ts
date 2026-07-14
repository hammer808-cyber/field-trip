import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  limit,
  getDocs,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, logFirestoreError } from '../lib/firebase';
import { Entry } from '../constants';
import { guardedCall } from './guardedService';
import { isArchivedEntry } from '../logic/entryLogic';
import { COMMUNITY_FEED_QUERY_STATUSES, dedupeCommunityFeedProofs, isCommunityFeedEligible } from '../logic/communityFeed';

const COLLECTION = 'entries';

export async function addEntryToFirestore(entry: Omit<Entry, 'id' | 'createdAt'>) {
  return guardedCall(`entry_submit_${entry.userId}`, async () => {
    try {
      const docRef = await addDoc(collection(db, COLLECTION), {
        ...entry,
        createdAt: serverTimestamp(),
        status: 'submitted'
      });
      return docRef.id;
    } catch (error) {
      return handleFirestoreError(error, OperationType.CREATE, COLLECTION);
    }
  }, { cooldownMs: 2000 }); // 2s cooldown between entries
}

export interface UserEntriesPageCursor {
  uidLastVisible?: QueryDocumentSnapshot<DocumentData>;
  userIdLastVisible?: QueryDocumentSnapshot<DocumentData>;
  uidExhausted?: boolean;
  userIdExhausted?: boolean;
  uidInitialized?: boolean;
  userIdInitialized?: boolean;
  bufferedDocs?: Entry[];
}

function entryTimestamp(entry: Entry): number {
  const value = entry.createdAt || entry.submittedAt;
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value?.seconds === 'number') return value.seconds * 1000;
  if (typeof value === 'string' || typeof value === 'number') return new Date(value).getTime() || 0;
  return 0;
}

async function getEntriesByOwnerAlias(params: {
  alias: 'uid' | 'userId';
  userId: string;
  pageSize: number;
  lastVisible?: QueryDocumentSnapshot<DocumentData>;
  exhausted?: boolean;
}) {
  if (params.exhausted) {
    return { docs: [] as Entry[], lastVisible: params.lastVisible, exhausted: true };
  }

  let ownerQuery = query(
    collection(db, COLLECTION),
    where(params.alias, '==', params.userId),
    orderBy('createdAt', 'desc'),
    limit(params.pageSize),
  );
  if (params.lastVisible) ownerQuery = query(ownerQuery, startAfter(params.lastVisible));

  const snapshot = await getDocs(ownerQuery);
  return {
    docs: snapshot.docs
      .map(entryDoc => ({ id: entryDoc.id, ...entryDoc.data() } as Entry))
      .filter(entry => !isArchivedEntry(entry) && entry.showInUserLogbook !== false),
    lastVisible: snapshot.docs[snapshot.docs.length - 1] || params.lastVisible,
    exhausted: snapshot.docs.length < params.pageSize,
  };
}

/**
 * PAGINATION: Get user entries in batches across canonical and legacy owner aliases.
 * Missing showInUserLogbook is intentionally treated as visible for older proofs.
 */
export async function getUserEntriesPage(userId: string, pageSize = 10, cursor: UserEntriesPageCursor = {}) {
  try {
    const [uidPage, userIdPage] = await Promise.all([
      getEntriesByOwnerAlias({
        alias: 'uid',
        userId,
        pageSize,
        lastVisible: cursor.uidLastVisible,
        exhausted: cursor.uidExhausted,
      }),
      getEntriesByOwnerAlias({
        alias: 'userId',
        userId,
        pageSize,
        lastVisible: cursor.userIdLastVisible,
        exhausted: cursor.userIdExhausted,
      }),
    ]);

    const unique = new Map<string, Entry>();
    [...(cursor.bufferedDocs || []), ...uidPage.docs, ...userIdPage.docs]
      .forEach(entry => unique.set(entry.id, entry));
    const ordered = Array.from(unique.values()).sort((a, b) => entryTimestamp(b) - entryTimestamp(a));
    const docs = ordered.slice(0, pageSize);
    const bufferedDocs = ordered.slice(pageSize);
    const hasMore = bufferedDocs.length > 0 || !uidPage.exhausted || !userIdPage.exhausted;

    return {
      docs,
      lastVisible: {
        uidLastVisible: uidPage.lastVisible,
        userIdLastVisible: userIdPage.lastVisible,
        uidExhausted: uidPage.exhausted,
        userIdExhausted: userIdPage.exhausted,
        uidInitialized: true,
        userIdInitialized: true,
        bufferedDocs,
      } satisfies UserEntriesPageCursor,
      hasMore,
    };
  } catch (error) {
    return handleFirestoreError(error, OperationType.LIST, COLLECTION);
  }
}

/**
 * PAGINATION: Global approved entries.
 */
export async function getGlobalEntriesPage(pageSize = 10, lastVisible?: QueryDocumentSnapshot<DocumentData>) {
  let q = query(
    collection(db, COLLECTION),
    where('status', 'in', COMMUNITY_FEED_QUERY_STATUSES),
    orderBy('createdAt', 'desc'),
    limit(pageSize)
  );

  if (lastVisible) {
    q = query(q, startAfter(lastVisible));
  }

  try {
    const snapshot = await getDocs(q);
    const docs = dedupeCommunityFeedProofs(snapshot.docs
      .map(doc => ({ ...doc.data(), id: doc.id, sourceDocumentId: doc.id } as unknown as Entry))
      .filter(isCommunityFeedEligible));
    return {
      docs,
      lastVisible: snapshot.docs[snapshot.docs.length - 1]
    };
  } catch (error) {
    return handleFirestoreError(error, OperationType.LIST, COLLECTION);
  }
}

export function subscribeToLatestGlobalEntries(callback: (entries: Entry[]) => void, count = 5) {
  const q = query(
    collection(db, COLLECTION),
    where('status', 'in', COMMUNITY_FEED_QUERY_STATUSES),
    orderBy('createdAt', 'desc'),
    limit(count)
  );

  return onSnapshot(q, (snapshot) => {
    const entries = dedupeCommunityFeedProofs(snapshot.docs
      .map(doc => ({ ...doc.data(), id: doc.id, sourceDocumentId: doc.id } as unknown as Entry))
      .filter(isCommunityFeedEligible));
    callback(entries);
  }, (error) => {
    logFirestoreError(error, OperationType.LIST, COLLECTION);
  });
}

/**
 * Shared selector/helper querying Firestore for approved submissions for a user.
 */
export async function getApprovedSubmissionsForUser(userId: string): Promise<Entry[]> {
  const approvedStatuses = ['approved', 'approved_by_admin', 'auto_approved', 'completed', 'verified', 'retry-approved', 'archived'];
  const qByUserId = query(
    collection(db, COLLECTION),
    where('userId', '==', userId),
    where('status', 'in', approvedStatuses)
  );
  try {
    const snapshot = await getDocs(qByUserId);
    return snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as Entry))
      .filter(e => !isArchivedEntry(e));
  } catch (error) {
    console.error(`[getApprovedSubmissionsForUser] Error querying approved submissions for user ${userId}:`, error);
    return [];
  }
}
