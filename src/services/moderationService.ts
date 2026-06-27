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
import { authenticatedFetch } from '../lib/api';

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

export async function submitSusReport(entryId: string, reason = 'suspicious_proof', details = '') {
  const response = await authenticatedFetch('/api/reports/sus', {
    method: 'POST',
    body: JSON.stringify({ entryId, reason, details })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'FAILED_TO_SUBMIT_SUS_REPORT');
  }
  return response.json();
}

export async function getSusReportStatus(entryId: string): Promise<{ canReport: boolean; alreadyReported: boolean; isOwnProof: boolean }> {
  const response = await authenticatedFetch(`/api/reports/sus/${encodeURIComponent(entryId)}/status`);
  if (!response.ok) {
    return { canReport: false, alreadyReported: false, isOwnProof: false };
  }
  const data = await response.json();
  return {
    canReport: data.canReport === true,
    alreadyReported: data.alreadyReported === true,
    isOwnProof: data.isOwnProof === true
  };
}

export async function fetchPendingSusReports() {
  const response = await authenticatedFetch('/api/admin/sus-reports?status=pending');
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'FAILED_TO_FETCH_SUS_REPORTS');
  }
  const data = await response.json();
  return data.reports || [];
}

export async function resolveSusReport(reportId: string, status: 'dismissed' | 'resolved' | 'request_clarification', adminNotes = '') {
  const response = await authenticatedFetch(`/api/admin/sus-reports/${encodeURIComponent(reportId)}/resolve`, {
    method: 'POST',
    body: JSON.stringify({ status, adminNotes })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'FAILED_TO_RESOLVE_SUS_REPORT');
  }
  return response.json();
}

export async function escalateSusReportToTribunal(report: any, seasonId: string, weekNumber: number, adminReason: string) {
  const response = await authenticatedFetch('/api/admin/tribunal/cases', {
    method: 'POST',
    body: JSON.stringify({
      reportId: report.id,
      entryId: report.entryId,
      seasonId,
      weekNumber,
      status: 'open',
      adminReason
    })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'FAILED_TO_ESCALATE_SUS_REPORT');
  }
  return response.json();
}

export async function previewTribunalDiagnostics() {
  const response = await authenticatedFetch('/api/admin/tribunal/diagnostics');
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'FAILED_TO_PREVIEW_TRIBUNAL_DIAGNOSTICS');
  }
  return response.json();
}

export async function applyTribunalDiagnosticsRepair(confirmation: string) {
  const response = await authenticatedFetch('/api/admin/tribunal/diagnostics/repair', {
    method: 'POST',
    body: JSON.stringify({ confirmation })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'FAILED_TO_REPAIR_TRIBUNAL_DIAGNOSTICS');
  }
  return response.json();
}

export async function previewCommunityFeedDiagnostics() {
  const response = await authenticatedFetch('/api/admin/community-feed/diagnostics');
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'FAILED_TO_PREVIEW_COMMUNITY_FEED_DIAGNOSTICS');
  }
  return response.json();
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
