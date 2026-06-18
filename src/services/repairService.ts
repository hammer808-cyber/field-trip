import { authenticatedFetch } from '../lib/api';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface StarterResetLog {
  id: string;
  adminUid: string;
  action: string;
  timestamp: any;
  results: {
    usersUpdated: number;
    submissionsArchived: number;
    activeMissionsCleared: number;
    proofReviewsUpdated: number;
    xpReduced: boolean;
    totalSubtractions: number;
  };
}

export interface RepairReport {
  uid: string;
  entriesCount: number;
  reviewsCount: number;
  approvedCount: number;
  pendingCount: number;
  needsMoreCount: number;
  rejectedCount: number;
  orphansFixed: number;
  starterApprovedCount: number;
  isStarterPackComplete: boolean;
  canUseHeatwaveDeck: boolean;
  errors: string[];
  warnings: string[];
  dryRun?: boolean;
}

export interface StrandedStarterRepairReport {
  success: boolean;
  totalUsersScanned: number;
  strandedDetected: number;
  usersRepaired: number;
  entriesUpdated: number;
  warnings: string[];
  errors: string[];
  dryRun: boolean;
}

export interface DiagnosticsReport {
  firebaseConnectionStatus: string;
  currentAdminUid: string;
  adminPermissionStatus: string;
  appCheckStatus: string;
  firestoreTestStatus: string;
  storageTestStatus: string;
  countPendingProofReviews: number;
  countEntriesNoReviews: number;
  countReviewsNoEntries: number;
  countUsersStarterMismatch: number;
  lastRepairRunTimestamp: string;
}

export interface OrphanReviewCleanupReport {
  success: boolean;
  dryRun: boolean;
  reviewsScanned: number;
  orphanedDetected: number;
  reviewsArchived: number;
  sampleReviewIds: string[];
  warnings: string[];
  errors: string[];
}

/**
 * Repairs the mission state for a specific user using the secure backend utility.
 */
export async function repairUserMissionState(uid: string, dryRun: boolean = false): Promise<RepairReport> {
  try {
    const response = await authenticatedFetch('/api/admin/repair-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUid: uid, dryRun })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || errData.error || `HTTP error ${response.status}`);
    }

    const raw = await response.json();
    return {
      uid: raw.uid,
      dryRun: raw.dryRun,
      entriesCount: raw.recordsScanned,
      reviewsCount: raw.recordsScanned,
      approvedCount: raw.deckProgressRecalculated?.starterApprovedCount || 0,
      pendingCount: 0, 
      needsMoreCount: 0,
      rejectedCount: 0,
      orphansFixed: raw.missingRecordsRebuilt || 0,
      starterApprovedCount: raw.deckProgressRecalculated?.starterApprovedCount || 0,
      isStarterPackComplete: raw.deckProgressRecalculated?.isStarterPackComplete || false,
      canUseHeatwaveDeck: raw.deckProgressRecalculated?.canUseHeatwaveDeck || false,
      errors: raw.errors || [],
      warnings: raw.warnings || []
    };
  } catch (err: any) {
    console.error(`[repairUserMissionState] failed:`, err);
    return {
      uid,
      entriesCount: 0,
      reviewsCount: 0,
      approvedCount: 0,
      pendingCount: 0,
      needsMoreCount: 0,
      rejectedCount: 0,
      orphansFixed: 0,
      starterApprovedCount: 0,
      isStarterPackComplete: false,
      canUseHeatwaveDeck: false,
      errors: [err.message || String(err)],
      warnings: [],
      dryRun
    };
  }
}

/**
 * Global repair for all users who have entries (Bulk System Sync).
 */
export async function repairAllUserOrphans(dryRun: boolean = true): Promise<{ 
  successCount: number; 
  totalUsersScanned: number;
  totalSubmissionsScanned: number;
  proofReviewsCreated: number;
  entriesLinked: number;
  usersRepaired: number;
  skippedRecords: number;
  warnings: string[];
  errors: string[];
  dryRun: boolean;
}> {
  try {
    const response = await authenticatedFetch('/api/admin/bulk-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dryRun })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || errData.error || `HTTP error ${response.status}`);
    }

    const raw = await response.json();
    return {
      successCount: (raw.totalUsersScanned || 0) - (raw.skippedRecords || 0),
      totalUsersScanned: raw.totalUsersScanned || 0,
      totalSubmissionsScanned: raw.totalSubmissionsScanned || 0,
      proofReviewsCreated: raw.proofReviewsCreated || 0,
      entriesLinked: raw.entriesLinked || 0,
      usersRepaired: raw.usersRepaired || 0,
      skippedRecords: raw.skippedRecords || 0,
      warnings: raw.warnings || [],
      errors: raw.errors || [],
      dryRun: raw.dryRun
    };
  } catch (err: any) {
    console.error(`[repairAllUserOrphans] failed:`, err);
    return {
      successCount: 0,
      totalUsersScanned: 0,
      totalSubmissionsScanned: 0,
      proofReviewsCreated: 0,
      entriesLinked: 0,
      usersRepaired: 0,
      skippedRecords: 0,
      warnings: [],
      errors: [err.message || String(err)],
      dryRun
    };
  }
}

/**
 * Automatically detects stranded starter users and repairs them.
 */
export async function repairStrandedStarterUsers(dryRun: boolean = true): Promise<StrandedStarterRepairReport> {
  try {
    const response = await authenticatedFetch('/api/admin/repair-stranded-starter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dryRun })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || errData.error || `HTTP error ${response.status}`);
    }

    return response.json();
  } catch (err: any) {
    console.error(`[repairStrandedStarterUsers] failed:`, err);
    return {
      success: false,
      totalUsersScanned: 0,
      strandedDetected: 0,
      usersRepaired: 0,
      entriesUpdated: 0,
      warnings: [],
      errors: [err.message || String(err)],
      dryRun
    };
  }
}

export async function archiveOrphanedProofReviews(dryRun: boolean = true): Promise<OrphanReviewCleanupReport> {
  try {
    const response = await authenticatedFetch('/api/admin/archive-orphan-proof-reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dryRun })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || errData.error || `Orphan review cleanup failed with HTTP ${response.status}`);
    }

    return response.json();
  } catch (err: any) {
    console.error('[archiveOrphanedProofReviews] failed:', err);
    return {
      success: false,
      dryRun,
      reviewsScanned: 0,
      orphanedDetected: 0,
      reviewsArchived: 0,
      sampleReviewIds: [],
      warnings: [],
      errors: [err.message || String(err)]
    };
  }
}

/**
 * Fetches real live diagnostic telemetry from the server.
 */
export async function getRepairDiagnostics(): Promise<DiagnosticsReport> {
  const response = await authenticatedFetch('/api/admin/repair-diagnostics', {
    method: 'GET'
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || errData.error || `HTTP error ${response.status}`);
  }

  return response.json();
}

/**
 * Fetches the latest global starter deck reset action log.
 */
export async function getLatestStarterResetLog(): Promise<StarterResetLog | null> {
  try {
    const q = query(
      collection(db, 'adminRepairLogs'),
      where('action', '==', 'resetStarterDeck'),
      orderBy('timestamp', 'desc'),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const docSnap = snap.docs[0];
    const data = docSnap.data();
    return {
      id: docSnap.id,
      adminUid: data.adminUid,
      action: data.action,
      timestamp: data.timestamp,
      results: data.results || {
        usersUpdated: 0,
        submissionsArchived: 0,
        activeMissionsCleared: 0,
        proofReviewsUpdated: 0,
        xpReduced: false,
        totalSubtractions: 0
      }
    };
  } catch (err) {
    console.error('Failed to fetch latest starter reset log:', err);
    return null;
  }
}
