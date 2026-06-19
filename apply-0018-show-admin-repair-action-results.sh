#!/usr/bin/env bash
set -euo pipefail

python3 <<'PY'
from pathlib import Path

def replace_once(path: Path, old: str, new: str):
    text = path.read_text()
    if new in text:
        return
    if old not in text:
        raise SystemExit(f"Anchor not found in {path}: {old[:220]!r}")
    path.write_text(text.replace(old, new, 1))

admin_repair = Path("src/pages/AdminRepair.tsx")

replace_once(
    admin_repair,
    """  const handleRepairBulk = async () => {
    setRepairingBulk(true);
    try {
      const report = await repairAllUserOrphans(bulkDryRun);
      setBulkReport(report);
    } catch (err) {
      console.error('Bulk repair failed:', err);
    } finally {
      setRepairingBulk(false);
    }
  };
""",
    """  const handleRepairBulk = async () => {
    setRepairingBulk(true);
    setBulkReport(null);
    try {
      const report = await repairAllUserOrphans(bulkDryRun);
      setBulkReport(report);
    } catch (err: any) {
      console.error('Bulk repair failed:', err);
      setBulkReport({
        dryRun: bulkDryRun,
        successCount: 0,
        totalUsersScanned: 0,
        totalSubmissionsScanned: 0,
        proofReviewsCreated: 0,
        entriesLinked: 0,
        usersRepaired: 0,
        skippedRecords: 0,
        warnings: [],
        errors: [err.message || String(err)]
      });
    } finally {
      setRepairingBulk(false);
    }
  };
"""
)

replace_once(
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
    """  const handleRepairStranded = async () => {
    setRepairingStranded(true);
    setStrandedReport(null);
    try {
      const report = await repairStrandedStarterUsers(false);
      setStrandedReport(report);
    } catch (err: any) {
      console.error('Stranded repair failed:', err);
      setStrandedReport({
        success: false,
        totalUsersScanned: 0,
        strandedDetected: 0,
        usersRepaired: 0,
        entriesUpdated: 0,
        warnings: [],
        errors: [err.message || String(err)],
        dryRun: false
      });
    } finally {
      setRepairingStranded(false);
    }
  };
"""
)

replace_once(
    admin_repair,
    """        {activeTab === 'bulk' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <ModuleCard 
                title="Bulk System Sync"
                description="Scans all users and reconstructs missing proofReview links for orphaned entries."
                icon={RefreshCw}
                status="neutral"
                primaryAction={{
                  label: repairingBulk ? "SYNCING..." : "START_SYNC",
                  onClick: handleRepairBulk,
                }}
              />
              <ModuleCard 
                title="Stranded Starter Patch"
                description="Fixes users stuck in onboarding because of legacy starter deck mission ID mismatches."
                icon={Shield}
                status="yellow"
                primaryAction={{
                  label: repairingStranded ? "PATCHING..." : "APPLY_PATCH",
                  onClick: handleRepairStranded,
                }}
              />
            </div>
          </div>
        )}
""",
    """        {activeTab === 'bulk' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <ModuleCard 
                title="Bulk System Sync"
                description="Scans all users and reconstructs missing proofReview links for orphaned entries."
                icon={RefreshCw}
                status={bulkReport?.errors?.length ? "red" : bulkReport ? "green" : "neutral"}
                statusLabel={bulkReport?.errors?.length ? "FAILED" : bulkReport ? "COMPLETE" : "READY"}
                primaryAction={{
                  label: repairingBulk ? "SYNCING..." : bulkDryRun ? "DRY_RUN_SYNC" : "START_SYNC",
                  onClick: handleRepairBulk,
                  loading: repairingBulk,
                  disabled: repairingBulk,
                }}
                secondaryAction={{
                  label: bulkDryRun ? "Switch to Live Write" : "Switch to Dry Run",
                  onClick: () => setBulkDryRun(!bulkDryRun),
                  disabled: repairingBulk
                }}
              >
                {bulkReport && (
                  <RepairActionReceipt
                    title="Bulk Sync Receipt"
                    failed={bulkReport.errors?.length > 0}
                    rows={[
                      ['Mode', bulkReport.dryRun ? 'Dry Run' : 'Live Write'],
                      ['Users Scanned', bulkReport.totalUsersScanned || 0],
                      ['Submissions Scanned', bulkReport.totalSubmissionsScanned || 0],
                      ['Reviews Created', bulkReport.proofReviewsCreated || 0],
                      ['Entries Linked', bulkReport.entriesLinked || 0],
                      ['Users Repaired', bulkReport.usersRepaired || 0],
                      ['Skipped', bulkReport.skippedRecords || 0]
                    ]}
                    error={bulkReport.errors?.[0]}
                  />
                )}
              </ModuleCard>
              <ModuleCard 
                title="Stranded Starter Patch"
                description="Fixes users stuck in onboarding because of legacy starter deck mission ID mismatches."
                icon={Shield}
                status={strandedReport?.errors?.length ? "red" : strandedReport ? "green" : "yellow"}
                statusLabel={strandedReport?.errors?.length ? "FAILED" : strandedReport ? "COMPLETE" : "READY"}
                primaryAction={{
                  label: repairingStranded ? "PATCHING..." : "APPLY_PATCH",
                  onClick: handleRepairStranded,
                  loading: repairingStranded,
                  disabled: repairingStranded,
                }}
              >
                {strandedReport && (
                  <RepairActionReceipt
                    title="Starter Patch Receipt"
                    failed={strandedReport.errors?.length > 0 || strandedReport.success === false}
                    rows={[
                      ['Mode', strandedReport.dryRun ? 'Dry Run' : 'Live Write'],
                      ['Users Scanned', strandedReport.totalUsersScanned || 0],
                      ['Stranded Detected', strandedReport.strandedDetected || 0],
                      ['Users Repaired', strandedReport.usersRepaired || 0],
                      ['Entries Updated', strandedReport.entriesUpdated || 0]
                    ]}
                    error={strandedReport.errors?.[0]}
                  />
                )}
              </ModuleCard>
            </div>
          </div>
        )}
"""
)

replace_once(
    admin_repair,
    """function StatItem({ label, value, status }: { label: string, value: string | number, status: 'success' | 'warning' | 'error' | 'neutral' }) {
""",
    """function RepairActionReceipt({
  title,
  rows,
  failed,
  error
}: {
  title: string;
  rows: Array<[string, string | number]>;
  failed?: boolean;
  error?: string;
}) {
  return (
    <div className={cn(
      "mt-4 p-4 border rounded-xl font-mono text-[10px] uppercase font-bold space-y-2",
      failed ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"
    )}>
      <p className="font-black tracking-widest">{title}</p>
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-3 border-t border-current/10 pt-2">
          <span className="opacity-60">{label}</span>
          <span>{String(value)}</span>
        </div>
      ))}
      {error && (
        <div className="mt-3 p-3 bg-white/70 border border-current/20 rounded-lg normal-case break-words">
          {error}
        </div>
      )}
    </div>
  );
}

function StatItem({ label, value, status }: { label: string, value: string | number, status: 'success' | 'warning' | 'error' | 'neutral' }) {
"""
)

print("Admin repair action result feedback patch applied.")
PY

npm run build
