import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  limit,
  deleteDoc,
  doc,
  getDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { SnitchEvent } from '../logic/snitchLogic';

const COLLECTION = 'snitchEvents';

export async function sendSnitch(event: Omit<SnitchEvent, 'id' | 'createdAt'>) {
  try {
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...event,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    return handleFirestoreError(error, OperationType.CREATE, COLLECTION);
  }
}

/**
 * REALTIME: Only listen to current user's incoming snitches.
 * Limit 5 to keep costs low.
 */
export function subscribeToIncomingSnitches(userId: string, callback: (events: SnitchEvent[]) => void) {
  const q = query(
    collection(db, COLLECTION),
    where('targetId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(5)
  );

  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SnitchEvent)));
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, COLLECTION);
  });
}

/**
 * FETCH: Get recent snitch history for zine.
 * Not realtime to save reads.
 */
export function subscribeToSnitchHistory(callback: (events: SnitchEvent[]) => void, count = 10) {
  const q = query(
    collection(db, COLLECTION),
    orderBy('createdAt', 'desc'),
    limit(count)
  );

  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SnitchEvent)));
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, COLLECTION);
  });
}

export async function deleteSnitch(snitchId: string) {
  try {
    await deleteDoc(doc(db, COLLECTION, snitchId));
  } catch (error) {
    return handleFirestoreError(error, OperationType.DELETE, COLLECTION);
  }
}
