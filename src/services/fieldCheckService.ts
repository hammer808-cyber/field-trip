import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs,
  onSnapshot, 
  updateDoc, 
  doc, 
  serverTimestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import { db, auth, logFirestoreError, handleFirestoreError, OperationType } from '../lib/firebase';
import { logAdminAction } from './moderationService';
import { FieldCheck, FieldCheckStatus } from '../types/game';

const COLLECTION = 'fieldChecks';

/**
 * Create a new field check (report) for a submission.
 */
export const createFieldCheck = async (input: Omit<FieldCheck, 'id' | 'createdAt' | 'updatedAt' | 'reporterUid' | 'status'>) => {
  if (!auth.currentUser) throw new Error('AUTH_REQUIRED');

  try {
    // Check for duplicate reports from the same reporter on the same submission
    const duplicateQuery = query(
      collection(db, COLLECTION),
      where('reporterUid', '==', auth.currentUser.uid),
      where('submissionId', '==', input.submissionId),
      limit(1)
    );
    const duplicateSnapshot = await getDocs(duplicateQuery);
    if (!duplicateSnapshot.empty) {
      throw new Error('DUPLICATE_REPORT: You have already filed a check for this entry.');
    }

    const docRef = await addDoc(collection(db, COLLECTION), {
      ...input,
      reporterUid: auth.currentUser.uid,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return docRef.id;
  } catch (error: any) {
    if (error.message.includes('DUPLICATE_REPORT')) throw error;
    handleFirestoreError(error, OperationType.WRITE, COLLECTION);
    throw error;
  }
};

/**
 * Get all pending field checks for admin review.
 */
export const getPendingFieldChecks = (callback: (checks: FieldCheck[]) => void) => {
  const q = query(
    collection(db, COLLECTION),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const checks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as FieldCheck[];
    callback(checks);
  }, (error) => {
    logFirestoreError(error, OperationType.LIST, COLLECTION);
  });
};

/**
 * Update the status of a field check.
 */
export const updateFieldCheckStatus = async (checkId: string, status: FieldCheckStatus, adminNote?: string) => {
  if (!auth.currentUser) throw new Error('AUTH_REQUIRED');

  try {
    const docRef = doc(db, COLLECTION, checkId);
    await updateDoc(docRef, {
      status,
      adminNote: adminNote || '',
      reviewedBy: auth.currentUser.uid,
      reviewedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    await logAdminAction(auth.currentUser.uid, checkId, 'fieldCheck', 'update_status', { 
      status,
      adminNote
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION}/${checkId}`);
    throw error;
  }
};

// Legacy support and compatibility
export const submitFieldCheck = createFieldCheck;
export const resolveFieldCheck = updateFieldCheckStatus;
export const fetchPendingFieldChecks = getPendingFieldChecks;

export const subscribeToIncomingFieldChecks = (userId: string, callback: (checks: FieldCheck[]) => void) => {
  const q = query(
    collection(db, COLLECTION),
    where('reportedUserId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const checks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as FieldCheck[];
    callback(checks);
  }, (error) => {
    logFirestoreError(error, OperationType.LIST, COLLECTION);
  });
};

export const subscribeToAllOpenFieldChecks = (callback: (checks: FieldCheck[]) => void) => {
  const q = query(
    collection(db, COLLECTION),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const checks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as FieldCheck[];
    callback(checks);
  }, (error) => {
    logFirestoreError(error, OperationType.LIST, COLLECTION);
  });
};
