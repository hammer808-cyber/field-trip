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
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Entry } from '../constants';

const COLLECTION = 'entries';

export async function addEntryToFirestore(entry: Omit<Entry, 'id' | 'createdAt'>) {
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
}

/**
 * PAGINATION: Get user entries in batches.
 */
export async function getUserEntriesPage(userId: string, pageSize = 10, lastVisible?: QueryDocumentSnapshot<DocumentData>) {
  let q = query(
    collection(db, COLLECTION),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(pageSize)
  );

  if (lastVisible) {
    q = query(q, startAfter(lastVisible));
  }

  try {
    const snapshot = await getDocs(q);
    return {
      docs: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Entry)),
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
  let q = query(
    collection(db, COLLECTION),
    where('status', '==', 'approved'),
    orderBy('createdAt', 'desc'),
    limit(pageSize)
  );

  if (lastVisible) {
    q = query(q, startAfter(lastVisible));
  }

  try {
    const snapshot = await getDocs(q);
    return {
      docs: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Entry)),
      lastVisible: snapshot.docs[snapshot.docs.length - 1]
    };
  } catch (error) {
    return handleFirestoreError(error, OperationType.LIST, COLLECTION);
  }
}

/**
 * REALTIME: Subscribe to just the latest few for "Live" vibes.
 */
export function subscribeToLatestGlobalEntries(callback: (entries: Entry[]) => void, count = 5) {
  const q = query(
    collection(db, COLLECTION),
    where('status', '==', 'approved'),
    orderBy('createdAt', 'desc'),
    limit(count)
  );

  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Entry)));
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, COLLECTION);
  });
}
