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

/**
 * PAGINATION: Get user entries in batches.
 */
export async function getUserEntriesPage(userId: string, pageSize = 10, lastVisible?: QueryDocumentSnapshot<DocumentData>) {
  let q = query(
    collection(db, COLLECTION),
    where('userId', '==', userId),
    where('showInUserLogbook', '==', true),
    orderBy('createdAt', 'desc'),
    limit(pageSize)
  );

  if (lastVisible) {
    q = query(q, startAfter(lastVisible));
  }

  try {
    const snapshot = await getDocs(q);
    const docs = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as Entry))
      .filter(e => e.archived !== true);
    return {
      docs,
      lastVisible: snapshot.docs[snapshot.docs.length - 1]
    };
  } catch (error) {
    return handleFirestoreError(error, OperationType.LIST, COLLECTION);
  }
}

/**
 * PAGINATION: Global approved entries.
 */
export async function getGlobalEntriesPage(pageSize = 10, lastVisible?: QueryDocumentSnapshot<DocumentData>) {
  const approvedStatuses = ['approved', 'approved_by_admin', 'auto_approved', 'completed'];
  
  let q = query(
    collection(db, COLLECTION),
    where('status', 'in', approvedStatuses),
    where('showInCommunityFeed', '==', true),
    orderBy('createdAt', 'desc'),
    limit(pageSize)
  );

  if (lastVisible) {
    q = query(q, startAfter(lastVisible));
  }

  try {
    const snapshot = await getDocs(q);
    const docs = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as Entry))
      .filter(e => e.archived !== true && e.countsTowardLiveStats !== false);
    return {
      docs,
      lastVisible: snapshot.docs[snapshot.docs.length - 1]
    };
  } catch (error) {
    return handleFirestoreError(error, OperationType.LIST, COLLECTION);
  }
}

export function subscribeToLatestGlobalEntries(callback: (entries: Entry[]) => void, count = 5) {
  const approvedStatuses = ['approved', 'approved_by_admin', 'auto_approved', 'completed'];

  const q = query(
    collection(db, COLLECTION),
    where('status', 'in', approvedStatuses),
    where('showInCommunityFeed', '==', true),
    orderBy('createdAt', 'desc'),
    limit(count)
  );

  return onSnapshot(q, (snapshot) => {
    const entries = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as Entry))
      .filter(e => e.archived !== true && e.countsTowardLiveStats !== false);
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
