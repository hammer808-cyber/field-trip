import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  updateDoc, 
  doc, 
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { logAdminAction } from './moderationService';
import { FieldCheck } from '../types/game';

const COLLECTION = 'fieldChecks';

export const submitFieldCheck = async (check: Partial<FieldCheck>) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...check,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      status: 'open'
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, COLLECTION);
    throw error;
  }
};

export const subscribeToIncomingFieldChecks = (userId: string, callback: (checks: FieldCheck[]) => void) => {
  // Checks targeting this user's submissions
  const q = query(
    collection(db, COLLECTION),
    where('targetUserId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const checks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as FieldCheck[];
    callback(checks);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, COLLECTION);
  });
};

export const subscribeToAllOpenFieldChecks = (callback: (checks: FieldCheck[]) => void) => {
  const q = query(
    collection(db, COLLECTION),
    where('status', '==', 'open'),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const checks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as FieldCheck[];
    callback(checks);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, COLLECTION);
  });
};

export const resolveFieldCheck = async (checkId: string, status: 'approved' | 'rejected' | 'dismissed') => {
  try {
    const docRef = doc(db, COLLECTION, checkId);
    await updateDoc(docRef, {
      status,
      updatedAt: serverTimestamp()
    });

    if (auth.currentUser) {
      await logAdminAction(auth.currentUser.uid, checkId, 'fieldCheck', 'resolve', { status });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION}/${checkId}`);
    throw error;
  }
};

export const submitDefense = async (checkId: string, defense: string) => {
  try {
    const docRef = doc(db, COLLECTION, checkId);
    await updateDoc(docRef, {
      defense,
      defenseSubmittedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION}/${checkId}`);
    throw error;
  }
};
