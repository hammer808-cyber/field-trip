#!/usr/bin/env bash
set -euo pipefail

python3 <<'PY'
from pathlib import Path

def replace_once(path: Path, old: str, new: str):
    text = path.read_text()
    if new in text:
        return
    if old not in text:
        raise SystemExit(f"Anchor not found in {path}: {old[:180]!r}")
    path.write_text(text.replace(old, new, 1))

def insert_before(path: Path, marker: str, block: str):
    text = path.read_text()
    if block.strip() in text:
        return
    if marker not in text:
        raise SystemExit(f"Marker not found in {path}: {marker[:180]!r}")
    path.write_text(text.replace(marker, block + marker, 1))

def insert_after(path: Path, marker: str, block: str):
    text = path.read_text()
    if block.strip() in text:
        return
    if marker not in text:
        raise SystemExit(f"Marker not found in {path}: {marker[:180]!r}")
    path.write_text(text.replace(marker, marker + block, 1))

repair_service = Path("src/services/repairService.ts")
admin_repair = Path("src/pages/AdminRepair.tsx")
server = Path("server.ts")

replace_once(
    repair_service,
    """export interface DiagnosticsReport {
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
""",
    """export interface DiagnosticsReport {
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
"""
)

insert_before(
    repair_service,
    """/**
 * Fetches real live diagnostic telemetry from the server.
 */
""",
    """export async function archiveOrphanedProofReviews(dryRun: boolean = true): Promise<OrphanReviewCleanupReport> {
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

"""
)

replace_once(
    admin_repair,
    """  repairStrandedStarterUsers,
  getRepairDiagnostics,
""",
    """  repairStrandedStarterUsers,
  getRepairDiagnostics,
  archiveOrphanedProofReviews,
"""
)

insert_after(
    admin_repair,
    """  const [diagnostics, setDiagnostics] = useState<DiagnosticsReport | null>(null);
  const [loadingDiagnostics, setLoadingDiagnostics] = useState(false);
""",
    """
  const [cleaningOrphanReviews, setCleaningOrphanReviews] = useState(false);
  const [orphanCleanupReport, setOrphanCleanupReport] = useState<any>(null);
"""
)

insert_after(
    admin_repair,
    """  const handleRepairStranded = async () => {
    setRepairingStranded(true);
    try {
      const report = await repairStrandedStarterUsers(false);
      setStrandedReport(report);
    } catch (err) {
      console.error('Stranded repair failed:', err);
    } finally {
      setRepairingStranded(false);
    }
  };
""",
    """

  const handleArchiveOrphanReviews = async () => {
    setCleaningOrphanReviews(true);
    setOrphanCleanupReport(null);
    try {
      const report = await archiveOrphanedProofReviews(false);
      setOrphanCleanupReport(report);
      await fetchDiagnostics();
    } catch (err: any) {
      setOrphanCleanupReport({
        success: false,
        errors: [err.message || String(err)]
      });
    } finally {
      setCleaningOrphanReviews(false);
    }
  };
"""
)

replace_once(
    admin_repair,
    """                <button 
                  onClick={fetchDiagnostics}
                  disabled={loadingDiagnostics}
                  className="p-2 border-2 border-on-surface rounded-lg hover:bg-on-surface/5 transition-all"
                >
                  <RefreshCw className={cn("w-4 h-4", loadingDiagnostics && "animate-spin")} />
                </button>
""",
    """                <div className="flex items-center gap-3">
                  <button
                    onClick={handleArchiveOrphanReviews}
                    disabled={cleaningOrphanReviews || !diagnostics || diagnostics.countReviewsNoEntries === 0}
                    className="px-4 py-2 bg-brand-orange text-white border-2 border-on-surface rounded-lg text-[10px] font-mono font-black uppercase disabled:opacity-40 shadow-[3px_3px_0px_black]"
                  >
                    {cleaningOrphanReviews ? 'Archiving...' : 'Archive Orphan Reviews'}
                  </button>
                  <button 
                    onClick={fetchDiagnostics}
                    disabled={loadingDiagnostics}
                    className="p-2 border-2 border-on-surface rounded-lg hover:bg-on-surface/5 transition-all"
                  >
                    <RefreshCw className={cn("w-4 h-4", loadingDiagnostics && "animate-spin")} />
                  </button>
                </div>
"""
)

insert_after(
    admin_repair,
    """                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <StatItem label="Firebase Link" value={diagnostics.firebaseConnectionStatus} status={diagnostics.firebaseConnectionStatus === 'ok' ? 'success' : 'error'} />
                  <StatItem label="App Check" value={diagnostics.appCheckStatus} status={diagnostics.appCheckStatus === 'active' ? 'success' : 'warning'} />
                  <StatItem label="Orphaned Submissions" value={diagnostics.countEntriesNoReviews} status={diagnostics.countEntriesNoReviews === 0 ? 'success' : 'warning'} />
                  <StatItem label="Orphaned Reviews" value={diagnostics.countReviewsNoEntries} status={diagnostics.countReviewsNoEntries === 0 ? 'success' : 'warning'} />
                  <StatItem label="Starter Drift" value={diagnostics.countUsersStarterMismatch} status={diagnostics.countUsersStarterMismatch === 0 ? 'success' : 'warning'} />
                  <StatItem label="Last Scan" value={new Date(diagnostics.lastRepairRunTimestamp).toLocaleTimeString()} status="neutral" />
                </div>
""",
    """                {orphanCleanupReport && (
                  <div className={cn(
                    "mt-6 p-4 border rounded-xl font-mono text-[10px] uppercase font-bold",
                    orphanCleanupReport.success ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-rose-50 border-rose-200 text-rose-700"
                  )}>
                    <p className="font-black mb-2">Orphan Review Cleanup</p>
                    {orphanCleanupReport.success ? (
                      <p>
                        Archived {orphanCleanupReport.reviewsArchived} orphaned reviews out of {orphanCleanupReport.orphanedDetected} detected.
                      </p>
                    ) : (
                      <p>{orphanCleanupReport.errors?.[0] || 'Cleanup failed.'}</p>
                    )}
                  </div>
                )}
"""
)

insert_before(
    server,
    """  app.post("/api/admin/repair-stranded-starter", authenticate, async (req: any, res) => {
""",
    """  app.post("/api/admin/archive-orphan-proof-reviews", authenticate, async (req: any, res) => {
    if (!dbAdmin) return res.status(500).json({ error: "DB_ADMIN_NOT_READY" });

    const isAdminUser = await checkIsAdmin(req.user);
    if (!isAdminUser) {
      return res.status(403).json({ error: "ADMIN_REQUIRED" });
    }

    const { dryRun = true } = req.body;
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      assertAdminCredentialsReady();

      const [entriesSnap, reviewsSnap] = await Promise.all([
        dbAdmin.collection('entries').get(),
        dbAdmin.collection('proofReviews').get()
      ]);

      const activeEntryIds = new Set<string>();
      entriesSnap.docs.forEach(docSnap => {
        const data = docSnap.data() || {};
        if (data.archived === true || data.excludedFromProgress === true) return;
        activeEntryIds.add(docSnap.id);
        if (data.entryId) activeEntryIds.add(String(data.entryId));
        if (data.submissionId) activeEntryIds.add(String(data.submissionId));
        if (data.proofId) activeEntryIds.add(String(data.proofId));
      });

      const orphanReviews = reviewsSnap.docs.filter(docSnap => {
        const data = docSnap.data() || {};
        if (data.archived === true || data.excludedFromProgress === true) return false;
        const candidates = [
          docSnap.id,
          data.entryId,
          data.submissionId,
          data.proofId,
          data.sourceEntryId,
          data.linkedEntryId
        ].filter(Boolean).map(String);

        return candidates.length === 0 || candidates.every(id => !activeEntryIds.has(id));
      });

      if (!dryRun) {
        for (let i = 0; i < orphanReviews.length; i += 500) {
          const batch = dbAdmin.batch();
          orphanReviews.slice(i, i + 500).forEach(docSnap => {
            batch.set(docSnap.ref, {
              archived: true,
              excludedFromProgress: true,
              archivedAt: FieldValue.serverTimestamp(),
              archiveReason: "orphan_review_cleanup"
            }, { merge: true });
          });
          await batch.commit();
        }

        await dbAdmin.collection('adminRepairLogs').add({
          actionType: 'archive_orphan_proof_reviews',
          adminUid: req.user.uid,
          timestamp: FieldValue.serverTimestamp(),
          dryRun: false,
          countsChanged: {
            reviewsScanned: reviewsSnap.size,
            orphanedDetected: orphanReviews.length,
            reviewsArchived: orphanReviews.length
          },
          sampleReviewIds: orphanReviews.slice(0, 25).map(docSnap => docSnap.id),
          warnings,
          errors
        });
      }

      res.json({
        success: true,
        dryRun,
        reviewsScanned: reviewsSnap.size,
        orphanedDetected: orphanReviews.length,
        reviewsArchived: dryRun ? 0 : orphanReviews.length,
        sampleReviewIds: orphanReviews.slice(0, 25).map(docSnap => docSnap.id),
        warnings,
        errors
      });
    } catch (error: any) {
      console.error("[ORPHAN_REVIEW_CLEANUP] Error:", error);
      res.status(500).json({
        error: "ORPHAN_REVIEW_CLEANUP_FAILED",
        message: error.message,
        warnings,
        errors: [error.message || String(error)]
      });
    }
  });

"""
)

print("Orphan proof review cleanup patch applied.")
PY

npm run build
