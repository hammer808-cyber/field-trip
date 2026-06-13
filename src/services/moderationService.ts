import { 
  collection, 
  addDoc, 
  setDoc, 
  doc, 
  serverTimestamp, 
  query, 
  where, 
  getDocs,
  onSnapshot,
  deleteDoc,
  updateDoc,
  orderBy,
  limit
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { Report, ReportTargetType, ReportStatus, ModerationAudit } from '../types/game';

// 1. Reporting
export async function createReport(
  reporterId: string, 
  reporterName: string,
  targetId: string, 
  targetType: ReportTargetType, 
  reason: string, 
  details: string
) {
  try {
    const report: Omit<Report, 'id'> = {
      reporterId,
      reporterName,
      targetId,
      targetType,
      reason,
      details,
      status: 'pending',
      createdAt: serverTimestamp() as any
    };
    await addDoc(collection(db, 'reports'), report);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'reports');
  }
}

// 2. Blocking
export async function blockUser(userId: string, blockedUserId: string) {
  try {
    const blockRef = doc(db, 'users', userId, 'blocks', blockedUserId);
    await setDoc(blockRef, {
      userId,
      blockedUserId,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/blocks`);
  }
}

export async function unblockUser(userId: string, blockedUserId: string) {
  try {
    const blockRef = doc(db, 'users', userId, 'blocks', blockedUserId);
    await deleteDoc(blockRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/blocks`);
  }
}

export function subscribeToBlocks(userId: string, callback: (blockedIds: string[]) => void) {
  const q = collection(db, 'users', userId, 'blocks');
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(doc => doc.id));
  }, (error) => {
    console.warn("[ModerationService] Block subscription status unavailable:", error.message);
    callback([]);
  });
}

// 3. Admin Moderation
export async function updateReportStatus(reportId: string, status: ReportStatus) {
  try {
    const docRef = doc(db, 'reports', reportId);
    await updateDoc(docRef, { status, updatedAt: serverTimestamp() });
    
    if (auth.currentUser) {
      await logAdminAction(auth.currentUser.uid, reportId, 'report', 'update_status', { status });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'reports');
  }
}

export async function logAdminAction(
  adminId: string,
  targetId: string,
  targetType: string,
  action: string,
  metadata: any = {}
) {
  try {
    await addDoc(collection(db, 'adminLogs'), {
      adminId,
      targetId,
      targetType,
      action,
      ...metadata,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('[AdminLog] Failed to write log:', error);
  }
}

export function subscribeToAdminLogs(limitCount: number = 50, callback: (logs: any[]) => void) {
  const q = query(
    collection(db, 'adminLogs'), 
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }, (error) => {
    console.warn("[ModerationService] Admin Logs subscription skipped (likely missing admin permissions):", error.message);
    callback([]);
  });
}

export async function performModerationAction(
  adminId: string,
  targetId: string,
  targetType: string,
  action: 'remove' | 'suspend' | 'warn' | 'dismiss' | 'reject',
  reason: string,
  notes: string = ''
) {
  try {
    // 1. Create Audit Log
    const auditRef = await addDoc(collection(db, 'moderationAudit'), {
      adminId,
      targetId,
      targetType,
      action,
      reason,
      notes,
      createdAt: serverTimestamp()
    });

    // 2. Apply Action based on type
    if (targetType === 'entry') {
      const entryRef = doc(db, 'entries', targetId);
      if (action === 'remove' || action === 'reject') {
        await updateDoc(entryRef, { status: action === 'remove' ? 'removed' : 'rejected' });
      }
    } else if (targetType === 'user') {
      const userRef = doc(db, 'users', targetId);
      if (action === 'suspend') {
        await updateDoc(userRef, { status: 'suspended', suspendedAt: serverTimestamp() });
      }
    }

    return auditRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'moderationAudit');
  }
}

export function subscribeToPendingReports(callback: (reports: Report[]) => void) {
  const q = query(collection(db, 'reports'), where('status', 'in', ['pending', 'under_review']));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Report)));
  }, (error) => {
    console.warn("[ModerationService] Pending Reports subscription skipped:", error.message);
    callback([]);
  });
}
