#!/usr/bin/env bash
set -euo pipefail

python3 <<'PY'
from pathlib import Path

def insert_after(path: Path, marker: str, block: str):
    text = path.read_text()
    if block.strip() in text:
        return
    if marker not in text:
        raise SystemExit(f"Marker not found in {path}: {marker[:200]!r}")
    path.write_text(text.replace(marker, marker + block, 1))

def insert_before(path: Path, marker: str, block: str):
    text = path.read_text()
    if block.strip() in text:
        return
    if marker not in text:
        raise SystemExit(f"Marker not found in {path}: {marker[:200]!r}")
    path.write_text(text.replace(marker, block + marker, 1))

def replace_once(path: Path, old: str, new: str):
    text = path.read_text()
    if new in text:
        return
    if old not in text:
        raise SystemExit(f"Anchor not found in {path}: {old[:200]!r}")
    path.write_text(text.replace(old, new, 1))

admin_repair = Path("src/pages/AdminRepair.tsx")
deck_logic = Path("src/logic/deckLogic.ts")
deck_page = Path("src/pages/Deck.tsx")
server = Path("server.ts")

admin_repair.write_text(r'''import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Database,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  UserX,
  Wrench
} from 'lucide-react';
import { motion } from 'framer-motion';
import { AdminLayout, StatusLight, ModuleCard } from '../components/admin/AdminShared';
import { Card } from '../components/UI';
import {
  repairUserMissionState,
  repairAllUserOrphans,
  repairStrandedStarterUsers,
  getRepairDiagnostics,
  archiveOrphanedProofReviews,
  resetUserState,
  lookupAdminUsers,
  RepairReport,
  DiagnosticsReport,
  StrandedStarterRepairReport,
  UserResetReport,
  AdminUserLookupResult
} from '../services/repairService';
import { cn } from '../lib/utils';

type TabKey = 'individual' | 'users' | 'bulk' | 'diagnostics';

export default function AdminRepair() {
  const [activeTab, setActiveTab] = useState<TabKey>('individual');
  const [repairUid, setRepairUid] = useState('');
  const [individualDryRun, setIndividualDryRun] = useState(true);
  const [repairingIndividual, setRepairingIndividual] = useState(false);
  const [individualReport, setIndividualReport] = useState<RepairReport | null>(null);

  const [bulkDryRun, setBulkDryRun] = useState(true);
  const [repairingBulk, setRepairingBulk] = useState(false);
  const [bulkReport, setBulkReport] = useState<any>(null);

  const [repairingStranded, setRepairingStranded] = useState(false);
  const [strandedReport, setStrandedReport] = useState<StrandedStarterRepairReport | null>(null);

  const [diagnostics, setDiagnostics] = useState<DiagnosticsReport | null>(null);
  const [loadingDiagnostics, setLoadingDiagnostics] = useState(false);
  const [cleaningOrphanReviews, setCleaningOrphanReviews] = useState(false);
  const [orphanCleanupReport, setOrphanCleanupReport] = useState<any>(null);

  const [resetTarget, setResetTarget] = useState('');
  const [resetConfirm, setResetConfirm] = useState(false);
  const [hardResetPhrase, setHardResetPhrase] = useState('');
  const [resettingMode, setResettingMode] = useState<'soft' | 'hard' | null>(null);
  const [resetReport, setResetReport] = useState<UserResetReport | null>(null);

  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userLookupLoading, setUserLookupLoading] = useState(false);
  const [userLookupResults, setUserLookupResults] = useState<AdminUserLookupResult[]>([]);
  const [userLookupError, setUserLookupError] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === 'diagnostics') fetchDiagnostics();
  }, [activeTab]);

  const fetchDiagnostics = async () => {
    setLoadingDiagnostics(true);
    try {
      setDiagnostics(await getRepairDiagnostics());
    } catch (err: any) {
      setDiagnostics({
        firebaseConnectionStatus: 'error',
        currentAdminUid: '',
        adminPermissionStatus: 'unknown',
        appCheckStatus: 'unknown',
        firestoreTestStatus: err.message || 'failed',
        storageTestStatus: 'unknown',
        countPendingProofReviews: 0,
        countEntriesNoReviews: 0,
        countReviewsNoEntries: 0,
        countUsersStarterMismatch: 0,
        lastRepairRunTimestamp: new Date().toISOString()
      });
    } finally {
      setLoadingDiagnostics(false);
    }
  };

  const handleRepairIndividual = async () => {
    if (!repairUid.trim()) return;
    setRepairingIndividual(true);
    setIndividualReport(null);
    try {
      setIndividualReport(await repairUserMissionState(repairUid.trim(), individualDryRun));
    } finally {
      setRepairingIndividual(false);
    }
  };

  const handleRepairBulk = async () => {
    setRepairingBulk(true);
    setBulkReport(null);
    try {
      setBulkReport(await repairAllUserOrphans(bulkDryRun));
    } finally {
      setRepairingBulk(false);
    }
  };

  const handleRepairStranded = async () => {
    setRepairingStranded(true);
    setStrandedReport(null);
    try {
      setStrandedReport(await repairStrandedStarterUsers(false));
    } finally {
      setRepairingStranded(false);
    }
  };

  const getResetTargetPayload = () => {
    const value = resetTarget.trim();
    if (!value) return null;
    if (value.includes('@')) return { targetEmail: value };
    if (value.length > 20 && !value.includes(' ')) return { targetUserId: value };
    return { targetUsername: value };
  };

  const handleUserReset = async (mode: 'soft' | 'hard') => {
    const target = getResetTargetPayload();
    if (!target || !resetConfirm) return;
    setResettingMode(mode);
    setResetReport(null);
    try {
      setResetReport(await resetUserState({
        ...target,
        mode,
        confirmReset: true,
        confirmationText: mode === 'hard' ? hardResetPhrase : undefined
      }));
    } finally {
      setResettingMode(null);
    }
  };

  const handleUserLookup = async () => {
    if (!userSearchTerm.trim()) return;
    setUserLookupLoading(true);
    setUserLookupError(null);
    try {
      const results = await lookupAdminUsers(userSearchTerm);
      setUserLookupResults(results);
      if (results.length === 0) setUserLookupError('No matching users found.');
    } catch (err: any) {
      setUserLookupResults([]);
      setUserLookupError(err.message || String(err));
    } finally {
      setUserLookupLoading(false);
    }
  };

  const selectLookupUser = (result: AdminUserLookupResult, destination: 'repair' | 'reset') => {
    if (destination === 'repair') {
      setRepairUid(result.uid);
      setActiveTab('individual');
    } else {
      setResetTarget(result.uid);
      setActiveTab('users');
    }
  };

  const handleArchiveOrphanReviews = async () => {
    setCleaningOrphanReviews(true);
    setOrphanCleanupReport(null);
    try {
      const report = await archiveOrphanedProofReviews(false);
      setOrphanCleanupReport(report);
      await fetchDiagnostics();
    } finally {
      setCleaningOrphanReviews(false);
    }
  };

  const tabs: Array<[TabKey, string]> = [
    ['individual', 'Individual Repair'],
    ['users', 'User Lookup + Resets'],
    ['bulk', 'Bulk Operations'],
    ['diagnostics', 'System Diagnostics']
  ];

  return (
    <AdminLayout
      title="System Repair Bay"
      description="Functional repair console for users, proof records, deck drift, and reset workflows."
    >
      <div className="flex flex-col gap-8">
        <div className="flex border-b-2 border-on-surface/10 gap-8 overflow-x-auto">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                "pb-4 text-xs font-mono font-black uppercase tracking-widest transition-all relative whitespace-nowrap",
                activeTab === key ? "text-brand-orange" : "text-on-surface/40 hover:text-on-surface"
              )}
            >
              {label}
              {activeTab === key && <motion.div layoutId="repair-tab" className="absolute bottom-0 left-0 right-0 h-1 bg-brand-orange" />}
            </button>
          ))}
        </div>

        {activeTab === 'individual' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="p-8 border-2 border-on-surface shadow-[8px_8px_0px_black] space-y-6">
              <SectionTitle icon={Shield} title="Agent Re-Sync Protocol" description="Reconstruct mission completion lists, XP totals, and deck unlock state from verified proof history." />
              <LabeledInput label="Target Agent UID" value={repairUid} onChange={setRepairUid} placeholder="paste UID or use lookup tab" />
              <ToggleRow checked={individualDryRun} onClick={() => setIndividualDryRun(!individualDryRun)} title="Dry Run Mode" description="Simulation only. Turn off to write changes." />
              <button onClick={handleRepairIndividual} disabled={repairingIndividual || !repairUid.trim()} className="w-full py-4 bg-brand-orange text-white font-display font-black uppercase italic tracking-widest text-lg shadow-[4px_4px_0px_black] disabled:opacity-50 rounded-xl">
                {repairingIndividual ? 'REPAIRING...' : individualDryRun ? 'DRY RUN REPAIR' : 'EXECUTE REPAIR'}
              </button>
            </Card>
            <Card className="p-8 border-2 border-on-surface shadow-[8px_8px_0px_black] bg-[#FAF8F5]">
              <h3 className="text-xl font-display font-black uppercase italic tracking-tight mb-6">Repair Receipt</h3>
              {individualReport ? (
                <RepairActionReceipt
                  title={individualReport.errors.length ? 'Repair Failed' : 'Repair Complete'}
                  failed={individualReport.errors.length > 0}
                  rows={[
                    ['Target UID', individualReport.uid],
                    ['Mode', individualReport.dryRun ? 'Dry Run' : 'Live Write'],
                    ['Proof History', individualReport.entriesCount],
                    ['Starter Approved', individualReport.starterApprovedCount],
                    ['Heatwave Access', individualReport.canUseHeatwaveDeck ? 'Granted' : 'Restricted']
                  ]}
                  error={individualReport.errors[0]}
                />
              ) : <EmptyReceipt text="Run a repair to see results." />}
            </Card>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <Card className="p-8 border-2 border-on-surface shadow-[8px_8px_0px_black] space-y-6">
              <SectionTitle icon={Search} title="Find User" description="Search by username, email, display name, or UID. Use a result for repair or reset." />
              <div className="flex gap-3">
                <input value={userSearchTerm} onChange={(e) => setUserSearchTerm(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleUserLookup()} placeholder="username, email, display name, or UID" className="flex-1 bg-[#FAF8F5] border-2 border-on-surface p-4 font-mono text-sm font-black rounded-xl" />
                <button onClick={handleUserLookup} disabled={userLookupLoading || !userSearchTerm.trim()} className="px-6 bg-on-surface text-white font-mono font-black uppercase rounded-xl disabled:opacity-50">
                  {userLookupLoading ? '...' : 'Lookup'}
                </button>
              </div>
              {userLookupError && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 font-mono text-xs font-bold rounded-xl">{userLookupError}</div>}
              <div className="space-y-3 max-h-[460px] overflow-auto">
                {userLookupResults.map(result => (
                  <div key={result.uid} className="p-4 border border-on-surface/10 bg-white rounded-xl">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-display font-black uppercase italic truncate">{result.username || result.displayName || 'Unnamed Agent'}</p>
                        <p className="font-mono text-[10px] opacity-50 truncate">{result.email || 'no email'}</p>
                        <p className="font-mono text-[10px] text-brand-orange break-all">UID: {result.uid}</p>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        <button onClick={() => selectLookupUser(result, 'repair')} className="px-3 py-2 bg-on-surface text-white rounded-lg font-mono text-[10px] font-black uppercase">Use for Repair</button>
                        <button onClick={() => selectLookupUser(result, 'reset')} className="px-3 py-2 bg-brand-orange text-white rounded-lg font-mono text-[10px] font-black uppercase">Use for Reset</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-8 border-2 border-on-surface shadow-[8px_8px_0px_black] space-y-6">
              <SectionTitle icon={UserX} title="Soft / Hard User Reset" description="Soft reset archives gameplay and keeps onboarding. Hard reset returns the user to first-run onboarding state." />
              <LabeledInput label="Target UID, Username, or Email" value={resetTarget} onChange={setResetTarget} placeholder="select user or paste target" />
              <ToggleRow checked={resetConfirm} onClick={() => setResetConfirm(!resetConfirm)} title="Confirm Target Reset" description="Required before reset buttons are enabled." />
              <LabeledInput label="Hard Reset Phrase" value={hardResetPhrase} onChange={setHardResetPhrase} placeholder="type HARD RESET for hard reset" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button onClick={() => handleUserReset('soft')} disabled={!!resettingMode || !resetTarget.trim() || !resetConfirm} className="py-4 bg-brand-orange text-white font-display font-black uppercase italic rounded-xl shadow-[4px_4px_0px_black] disabled:opacity-50">
                  {resettingMode === 'soft' ? 'RESETTING...' : 'SOFT RESET USER'}
                </button>
                <button onClick={() => handleUserReset('hard')} disabled={!!resettingMode || !resetTarget.trim() || !resetConfirm || hardResetPhrase.trim() !== 'HARD RESET'} className="py-4 bg-rose-600 text-white font-display font-black uppercase italic rounded-xl shadow-[4px_4px_0px_black] disabled:opacity-50">
                  <Trash2 className="w-4 h-4 inline mr-2" />{resettingMode === 'hard' ? 'WIPING...' : 'HARD RESET USER'}
                </button>
              </div>
              {resetReport && (
                <RepairActionReceipt
                  title="Reset Receipt"
                  failed={!resetReport.success || resetReport.errors.length > 0}
                  rows={[
                    ['Mode', resetReport.mode],
                    ['Target', resetReport.username || resetReport.userId],
                    ['Archived Groups', Object.keys(resetReport.archivedCounts || {}).length]
                  ]}
                  error={resetReport.errors[0]}
                />
              )}
            </Card>
          </div>
        )}

        {activeTab === 'bulk' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <ModuleCard title="Bulk System Sync" description="Scans all users and repairs orphaned entry/review links." icon={RefreshCw} status={bulkReport?.errors?.length ? 'red' : bulkReport ? 'green' : 'neutral'} statusLabel={bulkReport?.errors?.length ? 'FAILED' : bulkReport ? 'COMPLETE' : 'READY'} primaryAction={{ label: repairingBulk ? 'SYNCING...' : bulkDryRun ? 'DRY RUN SYNC' : 'LIVE SYNC', onClick: handleRepairBulk, loading: repairingBulk, disabled: repairingBulk }} secondaryAction={{ label: bulkDryRun ? 'Switch To Live Write' : 'Switch To Dry Run', onClick: () => setBulkDryRun(!bulkDryRun), disabled: repairingBulk }}>
              {bulkReport && <RepairActionReceipt title="Bulk Sync Receipt" failed={bulkReport.errors?.length > 0} rows={[['Mode', bulkReport.dryRun ? 'Dry Run' : 'Live Write'], ['Users Scanned', bulkReport.totalUsersScanned || 0], ['Submissions Scanned', bulkReport.totalSubmissionsScanned || 0], ['Reviews Created', bulkReport.proofReviewsCreated || 0], ['Entries Linked', bulkReport.entriesLinked || 0], ['Users Repaired', bulkReport.usersRepaired || 0]]} error={bulkReport.errors?.[0]} />}
            </ModuleCard>
            <ModuleCard title="Stranded Starter Patch" description="Repairs users stuck because starter statuses drifted." icon={Shield} status={strandedReport?.errors?.length ? 'red' : strandedReport ? 'green' : 'yellow'} statusLabel={strandedReport?.errors?.length ? 'FAILED' : strandedReport ? 'COMPLETE' : 'READY'} primaryAction={{ label: repairingStranded ? 'PATCHING...' : 'APPLY PATCH', onClick: handleRepairStranded, loading: repairingStranded, disabled: repairingStranded }}>
              {strandedReport && <RepairActionReceipt title="Starter Patch Receipt" failed={strandedReport.errors?.length > 0 || strandedReport.success === false} rows={[['Mode', strandedReport.dryRun ? 'Dry Run' : 'Live Write'], ['Users Scanned', strandedReport.totalUsersScanned || 0], ['Stranded Detected', strandedReport.strandedDetected || 0], ['Users Repaired', strandedReport.usersRepaired || 0], ['Entries Updated', strandedReport.entriesUpdated || 0]]} error={strandedReport.errors?.[0]} />}
            </ModuleCard>
          </div>
        )}

        {activeTab === 'diagnostics' && (
          <Card className="p-8 border-2 border-on-surface shadow-[8px_8px_0px_black] bg-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <SectionTitle icon={Database} title="System Health Monitor" description="Live admin diagnostics with direct cleanup actions." />
              <div className="flex gap-3">
                <button onClick={handleArchiveOrphanReviews} disabled={cleaningOrphanReviews || !diagnostics || diagnostics.countReviewsNoEntries === 0} className="px-4 py-2 bg-brand-orange text-white border-2 border-on-surface rounded-lg text-[10px] font-mono font-black uppercase disabled:opacity-40 shadow-[3px_3px_0px_black]">
                  {cleaningOrphanReviews ? 'Archiving...' : 'Archive Orphan Reviews'}
                </button>
                <button onClick={fetchDiagnostics} disabled={loadingDiagnostics} className="p-2 border-2 border-on-surface rounded-lg hover:bg-on-surface/5">
                  <RefreshCw className={cn("w-4 h-4", loadingDiagnostics && "animate-spin")} />
                </button>
              </div>
            </div>
            {loadingDiagnostics ? <EmptyReceipt text="Loading diagnostics..." /> : diagnostics ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <StatItem label="Firebase Link" value={diagnostics.firebaseConnectionStatus} status={diagnostics.firebaseConnectionStatus === 'ok' ? 'success' : 'error'} />
                  <StatItem label="App Check" value={diagnostics.appCheckStatus} status={diagnostics.appCheckStatus === 'active' ? 'success' : 'warning'} />
                  <StatItem label="Orphaned Submissions" value={diagnostics.countEntriesNoReviews} status={diagnostics.countEntriesNoReviews === 0 ? 'success' : 'warning'} />
                  <StatItem label="Orphaned Reviews" value={diagnostics.countReviewsNoEntries} status={diagnostics.countReviewsNoEntries === 0 ? 'success' : 'warning'} />
                  <StatItem label="Starter Drift" value={diagnostics.countUsersStarterMismatch} status={diagnostics.countUsersStarterMismatch === 0 ? 'success' : 'warning'} />
                  <StatItem label="Last Scan" value={new Date(diagnostics.lastRepairRunTimestamp).toLocaleTimeString()} status="neutral" />
                </div>
                {orphanCleanupReport && <RepairActionReceipt title="Orphan Review Cleanup" failed={!orphanCleanupReport.success || orphanCleanupReport.errors?.length > 0} rows={[['Detected', orphanCleanupReport.orphanedDetected || 0], ['Archived', orphanCleanupReport.reviewsArchived || 0], ['Scanned', orphanCleanupReport.reviewsScanned || 0]]} error={orphanCleanupReport.errors?.[0]} />}
              </>
            ) : <EmptyReceipt text="Run diagnostics to see system health." />}
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}

function SectionTitle({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-6 h-6 text-brand-orange shrink-0" />
      <div>
        <h3 className="text-xl font-display font-black uppercase italic tracking-tight">{title}</h3>
        <p className="text-xs font-mono text-on-surface/60 leading-relaxed uppercase">{description}</p>
      </div>
    </div>
  );
}

function LabeledInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-mono font-black uppercase opacity-40">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-[#FAF8F5] border-2 border-on-surface p-4 font-mono text-sm font-black rounded-xl" />
    </div>
  );
}

function ToggleRow({ checked, onClick, title, description }: { checked: boolean; onClick: () => void; title: string; description: string }) {
  return (
    <div className="flex items-center gap-3 p-4 bg-on-surface/5 rounded-xl border border-on-surface/10 cursor-pointer" onClick={onClick}>
      <div className={cn("w-6 h-6 border-2 border-on-surface rounded-md flex items-center justify-center", checked ? "bg-brand-orange" : "bg-white")}>
        {checked && <CheckCircle className="w-4 h-4 text-white" />}
      </div>
      <div>
        <p className="text-[10px] font-mono font-black uppercase">{title}</p>
        <p className="text-[9px] opacity-40 uppercase">{description}</p>
      </div>
    </div>
  );
}

function EmptyReceipt({ text }: { text: string }) {
  return <div className="h-64 flex items-center justify-center border-2 border-dashed border-on-surface/15 rounded-2xl opacity-40 text-[10px] font-mono font-black uppercase tracking-widest">{text}</div>;
}

function RepairActionReceipt({ title, rows, failed, error }: { title: string; rows: Array<[string, string | number]>; failed?: boolean; error?: string }) {
  return (
    <div className={cn("mt-4 p-4 border rounded-xl font-mono text-[10px] uppercase font-bold space-y-2", failed ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-emerald-50 border-emerald-200 text-emerald-700")}>
      <p className="font-black tracking-widest">{title}</p>
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-3 border-t border-current/10 pt-2">
          <span className="opacity-60">{label}</span>
          <span>{String(value)}</span>
        </div>
      ))}
      {error && <div className="mt-3 p-3 bg-white/70 border border-current/20 rounded-lg normal-case break-words">{error}</div>}
    </div>
  );
}

function StatItem({ label, value, status }: { label: string; value: string | number; status: 'success' | 'warning' | 'error' | 'neutral' }) {
  return (
    <div className="p-4 border border-on-surface/10 bg-[#FAF8F5] rounded-xl flex items-center justify-between">
      <span className="text-[9px] font-mono font-black uppercase opacity-40">{label}</span>
      <div className="flex items-center gap-2">
        <StatusLight state={status === 'success' ? 'green' : status === 'warning' ? 'yellow' : status === 'error' ? 'red' : 'blue'} />
        <span className="text-sm font-mono font-black text-on-surface uppercase">{value}</span>
      </div>
    </div>
  );
}
''')

# Add missing backend routes if a refactor removed them.
server_text = server.read_text()
if 'app.get("/api/admin/user-lookup"' not in server_text:
    insert_before(server, '  app.get("/api/health", async (req, res) => {', r'''  app.get("/api/admin/user-lookup", authenticate, async (req: any, res) => {
    if (!dbAdmin) return res.status(500).json({ error: "DB_ADMIN_NOT_READY" });
    const isAdminUser = await checkIsAdmin(req.user);
    if (!isAdminUser) return res.status(403).json({ error: "ADMIN_ONLY" });

    try {
      assertAdminCredentialsReady();
      const rawQuery = String(req.query.q || '').trim();
      const normalizedQuery = rawQuery.toLowerCase();
      if (!normalizedQuery) return res.json({ users: [] });

      const results = new Map<string, any>();
      const maybeDoc = await dbAdmin.collection('users').doc(rawQuery).get();
      if (maybeDoc.exists) {
        const data = maybeDoc.data() || {};
        results.set(maybeDoc.id, { uid: maybeDoc.id, username: data.username || data.name || null, displayName: data.displayName || data.name || null, email: data.email || null, role: data.role || null, accessStatus: data.accessStatus || null });
      }

      const userSnap = await dbAdmin.collection('users').limit(500).get();
      userSnap.docs.forEach(doc => {
        const data = doc.data() || {};
        const searchable = [doc.id, data.username, data.name, data.displayName, data.email].filter(Boolean).join(' ').toLowerCase();
        if (searchable.includes(normalizedQuery)) {
          results.set(doc.id, { uid: doc.id, username: data.username || data.name || null, displayName: data.displayName || data.name || null, email: data.email || null, role: data.role || null, accessStatus: data.accessStatus || null });
        }
      });

      res.json({ users: Array.from(results.values()).slice(0, 25) });
    } catch (error: any) {
      console.error("[USER_LOOKUP] Error:", error);
      res.status(500).json({ error: "USER_LOOKUP_FAILED", message: error.message });
    }
  });

''')

server_text = server.read_text()
if 'app.post("/api/admin/hard-reset-user"' not in server_text:
    insert_before(server, '  app.get("/api/health", async (req, res) => {', r'''  app.post("/api/admin/hard-reset-user", authenticate, async (req: any, res) => {
    if (!dbAdmin) return res.status(500).json({ error: "DB_ADMIN_NOT_READY" });
    const isAdminUser = await checkIsAdmin(req.user);
    if (!isAdminUser) return res.status(403).json({ error: "ADMIN_ONLY" });

    const { targetUserId, targetUsername, targetEmail, confirmReset, confirmationText } = req.body;
    const adminUid = req.user.uid;
    if (!confirmReset || String(confirmationText || '').trim() !== 'HARD RESET') {
      return res.status(400).json({ error: "CONFIRMATION_REQUIRED", message: "Type HARD RESET to confirm the hard reset action." });
    }

    try {
      assertAdminCredentialsReady();
      let userId = targetUserId;
      let userRef: FirebaseFirestore.DocumentReference | null = null;
      let userData: any = null;

      if (userId) {
        userRef = dbAdmin.collection('users').doc(userId);
        const userSnap = await userRef.get();
        if (!userSnap.exists) return res.status(404).json({ error: "USER_NOT_FOUND" });
        userData = userSnap.data();
      } else if (targetUsername) {
        const snap = await dbAdmin.collection('users').where('username', '==', targetUsername).limit(1).get();
        if (snap.empty) return res.status(404).json({ error: "USER_NOT_FOUND_BY_USERNAME" });
        userRef = snap.docs[0].ref;
        userId = snap.docs[0].id;
        userData = snap.docs[0].data();
      } else if (targetEmail) {
        const snap = await dbAdmin.collection('users').where('email', '==', targetEmail).limit(1).get();
        if (snap.empty) return res.status(404).json({ error: "USER_NOT_FOUND_BY_EMAIL" });
        userRef = snap.docs[0].ref;
        userId = snap.docs[0].id;
        userData = snap.docs[0].data();
      }

      if (!userRef || !userData || !userId) return res.status(400).json({ error: "MISSING_TARGET_USER" });

      const archiveCollections = ['entries', 'proofReviews', 'proofs', 'proofChecks', 'scoreEvents', 'badgeProgress', 'weeklyBallots', 'weeklySummaries', 'activityEvents', 'crewArtifacts'];
      const report: any = { userId, username: userData.username || userData.name, email: userData.email || null, mode: 'hard', archivedCounts: {} };

      for (const colName of archiveCollections) {
        const colRef = dbAdmin.collection(colName);
        const [a, b] = await Promise.all([colRef.where('userId', '==', userId).get(), colRef.where('uid', '==', userId).get()]);
        const docMap = new Map<string, any>();
        a.docs.forEach(doc => docMap.set(doc.ref.path, doc));
        b.docs.forEach(doc => docMap.set(doc.ref.path, doc));
        const docs = Array.from(docMap.values());
        report.archivedCounts[colName] = docs.length;
        for (let i = 0; i < docs.length; i += 500) {
          const batch = dbAdmin.batch();
          docs.slice(i, i + 500).forEach(doc => batch.set(doc.ref, { archived: true, archivedAt: FieldValue.serverTimestamp(), archiveReason: "single_user_hard_reset", excludedFromProgress: true }, { merge: true }));
          await batch.commit();
        }
      }

      await userRef.update({
        xp: 0, points: 0, totalXP: 0, seasonXP: 0, weeklyXP: 0,
        approvedMissionCount: 0, approvedEntriesCount: 0,
        starterDeckComplete: false, onboardingComplete: false, onboardingCompleted: false,
        fieldClassificationComplete: false, firstMissionTourComplete: false,
        fieldType: null, personaType: null, personalityType: null,
        starterApprovedCount: 0, starterPendingCount: 0,
        completedMissionIds: [], completedChallengeIds: [], approvedCompletedChallengeIds: [],
        submittedChallengeIds: [], submittedPendingChallengeIds: [], rejectedChallengeIds: [],
        retryableChallengeIds: [], needsMoreProofChallengeIds: [],
        activeMissionId: null, activeTripId: null, activeTrip: null, activeMissionCard: null,
        drawnMissionCards: [], activeDeckId: "starter-signals", currentDeckId: "starter-signals", selectedDeckId: "starter-signals",
        hasUnlockedHeatwave: false, hasUnlockedSeasonal: false, lastDrawnMissionId: null,
        soloTripsCount: 0, crewTripsCount: 0, boldTripsCount: 0, completedCoreChallenges: 0,
        unlockedRewards: { stickers: [], badges: [], skins: ['classic'] },
        discoveryEvents: {}, completedDiscoveryGroups: [], stickerUnlockHistory: [],
        hardResetAt: FieldValue.serverTimestamp(), hardResetBy: adminUid, updatedAt: FieldValue.serverTimestamp(),
        "starterState.starterApprovedCount": 0, "starterState.pendingStarterCount": 0, "starterState.starterComplete": false,
        "starterState.starterSignalsCompleted": [], "stats.totalApproved": 0, "stats.approvedMissionCount": 0, "stats.totalXP": 0, "stats.weeklyXP": 0, "stats.seasonXP": 0
      });

      await dbAdmin.collection('adminRepairLogs').add({ action: "single_user_hard_reset", targetUserId: userId, targetUsername: userData.username || userData.name, targetEmail: userData.email || null, performedBy: adminUid, countsArchived: report.archivedCounts, timestamp: FieldValue.serverTimestamp() });
      res.json({ success: true, report });
    } catch (error: any) {
      console.error("[HARD_RESET] Error:", error);
      res.status(500).json({ error: "HARD_RESET_FAILED", message: error.message });
    }
  });

''')

server_text = server.read_text()
if 'app.post("/api/admin/archive-orphan-proof-reviews"' not in server_text:
    insert_before(server, '  app.post("/api/admin/repair-stranded-starter", authenticate, async (req: any, res) => {', r'''  app.post("/api/admin/archive-orphan-proof-reviews", authenticate, async (req: any, res) => {
    if (!dbAdmin) return res.status(500).json({ error: "DB_ADMIN_NOT_READY" });
    const isAdminUser = await checkIsAdmin(req.user);
    if (!isAdminUser) return res.status(403).json({ error: "ADMIN_REQUIRED" });

    const { dryRun = true } = req.body;
    try {
      assertAdminCredentialsReady();
      const [entriesSnap, reviewsSnap] = await Promise.all([dbAdmin.collection('entries').get(), dbAdmin.collection('proofReviews').get()]);
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
        const candidates = [docSnap.id, data.entryId, data.submissionId, data.proofId, data.sourceEntryId, data.linkedEntryId].filter(Boolean).map(String);
        return candidates.length === 0 || candidates.every(id => !activeEntryIds.has(id));
      });
      if (!dryRun) {
        for (let i = 0; i < orphanReviews.length; i += 500) {
          const batch = dbAdmin.batch();
          orphanReviews.slice(i, i + 500).forEach(docSnap => batch.set(docSnap.ref, { archived: true, excludedFromProgress: true, archivedAt: FieldValue.serverTimestamp(), archiveReason: "orphan_review_cleanup" }, { merge: true }));
          await batch.commit();
        }
      }
      res.json({ success: true, dryRun, reviewsScanned: reviewsSnap.size, orphanedDetected: orphanReviews.length, reviewsArchived: dryRun ? 0 : orphanReviews.length, sampleReviewIds: orphanReviews.slice(0, 25).map(docSnap => docSnap.id), warnings: [], errors: [] });
    } catch (error: any) {
      console.error("[ORPHAN_REVIEW_CLEANUP] Error:", error);
      res.status(500).json({ error: "ORPHAN_REVIEW_CLEANUP_FAILED", message: error.message, warnings: [], errors: [error.message || String(error)] });
    }
  });

''')

# Restore canonical deck runtime resolver if missing.
if 'export function getDeckRuntimeState' not in deck_logic.read_text():
    insert_after(deck_logic, 'export interface EligibleDrawPoolResult {\n  eligibleMissions: TripType[];\n  reason: DrawPoolReason | null;\n  excludedCards?: { id: string, reason: string }[];\n  analysis?: ExclusionAnalysis[];\n}\n', r'''

export type DeckDisplayState = 'LOCKED' | 'COMPLETE' | 'LIMIT_REACHED' | 'READY' | 'RETRY_AVAILABLE' | 'NEEDS_MORE_PROOF' | 'PENDING_REVIEW' | 'EXHAUSTED' | 'EMPTY';

export interface DeckRuntimeCardAnalysis {
  cardId: string;
  status: 'approved' | 'pending_review' | 'needs_more_proof' | 'rejected' | 'unplayed';
  drawable: boolean;
  retryable: boolean;
  reasons: string[];
}

export interface DeckRuntimeState {
  deckId: string;
  deckTitle: string;
  totalCards: number;
  approvedCount: number;
  pendingCount: number;
  needsMoreProofCount: number;
  rejectedCount: number;
  unplayedCount: number;
  drawableCount: number;
  retryableCount: number;
  isDeckComplete: boolean;
  isLocked: boolean;
  isBlocked: boolean;
  blockReason: string | null;
  displayState: DeckDisplayState;
  primaryButtonLabel: string;
  primaryButtonEnabled: boolean;
  nextDrawableCardIds: string[];
  retryableCardIds: string[];
  perCardAnalysis: DeckRuntimeCardAnalysis[];
}

const cleanDeckId = (value: unknown) => String(value || '').toLowerCase().trim();

const idsFrom = (value?: Set<string> | string[]) => new Set(Array.from(value || []).map(cleanDeckId).filter(Boolean));

export function getDeckRuntimeState({
  deckId,
  deckTitle,
  deckCards,
  userProgress,
  appConfig = {}
}: {
  deckId: string;
  deckTitle?: string;
  deckCards: TripType[];
  userProgress?: {
    completedMissionIds?: Set<string> | string[];
    approvedIds?: Set<string> | string[];
    pendingMissionIds?: Set<string> | string[];
    needsMoreProofMissionIds?: Set<string> | string[];
    rejectedMissionIds?: Set<string> | string[];
  };
  appConfig?: { isLocked?: boolean; lockReason?: string; drawLimitReached?: boolean; drawLimitReason?: string };
}): DeckRuntimeState {
  const approved = new Set([...idsFrom(userProgress?.completedMissionIds), ...idsFrom(userProgress?.approvedIds)]);
  const pending = idsFrom(userProgress?.pendingMissionIds);
  const needsMore = idsFrom(userProgress?.needsMoreProofMissionIds);
  const rejected = idsFrom(userProgress?.rejectedMissionIds);
  const cardIds = deckCards.map(card => cleanDeckId((card as any).id || (card as any).missionId || (card as any).challengeId)).filter(Boolean);

  approved.forEach(id => { pending.delete(id); needsMore.delete(id); rejected.delete(id); });
  needsMore.forEach(id => { pending.delete(id); rejected.delete(id); });
  rejected.forEach(id => pending.delete(id));

  const perCardAnalysis = cardIds.map(cardId => {
    let status: DeckRuntimeCardAnalysis['status'] = 'unplayed';
    let drawable = true;
    let retryable = false;
    const reasons: string[] = [];

    if (approved.has(cardId)) {
      status = 'approved'; drawable = false; reasons.push('approved_complete');
    } else if (pending.has(cardId)) {
      status = 'pending_review'; drawable = false; reasons.push('pending_temporarily_unavailable');
    } else if (needsMore.has(cardId)) {
      status = 'needs_more_proof'; drawable = false; retryable = true; reasons.push('needs_more_proof_retryable');
    } else if (rejected.has(cardId)) {
      status = 'rejected'; drawable = false; retryable = true; reasons.push('rejected_retryable');
    } else {
      reasons.push('unplayed_drawable');
    }

    if (appConfig.isLocked) {
      drawable = false; retryable = false; reasons.push(`deck_locked:${appConfig.lockReason || 'locked'}`);
    }

    return { cardId, status, drawable, retryable, reasons };
  });

  const nextDrawableCardIds = perCardAnalysis.filter(card => card.drawable).map(card => card.cardId);
  const retryableCardIds = perCardAnalysis.filter(card => card.retryable).map(card => card.cardId);
  const approvedCount = perCardAnalysis.filter(card => card.status === 'approved').length;
  const pendingCount = perCardAnalysis.filter(card => card.status === 'pending_review').length;
  const needsMoreProofCount = perCardAnalysis.filter(card => card.status === 'needs_more_proof').length;
  const rejectedCount = perCardAnalysis.filter(card => card.status === 'rejected').length;
  const unplayedCount = perCardAnalysis.filter(card => card.status === 'unplayed').length;
  const totalCards = cardIds.length;
  const isDeckComplete = totalCards > 0 && approvedCount === totalCards;

  let displayState: DeckDisplayState = totalCards === 0 ? 'EMPTY' : 'READY';
  let primaryButtonLabel = 'Start Mission';
  let primaryButtonEnabled = nextDrawableCardIds.length > 0;
  let blockReason: string | null = null;

  if (appConfig.isLocked) {
    displayState = 'LOCKED'; primaryButtonLabel = 'Locked'; primaryButtonEnabled = false; blockReason = appConfig.lockReason || 'deck_locked';
  } else if (isDeckComplete) {
    displayState = 'COMPLETE'; primaryButtonLabel = 'Deck Complete'; primaryButtonEnabled = false; blockReason = 'deck_complete';
  } else if (appConfig.drawLimitReached) {
    displayState = 'LIMIT_REACHED'; primaryButtonLabel = 'Limit Reached'; primaryButtonEnabled = false; blockReason = appConfig.drawLimitReason || 'draw_limit_reached';
  } else if (retryableCardIds.length > 0) {
    displayState = needsMoreProofCount > 0 ? 'NEEDS_MORE_PROOF' : 'RETRY_AVAILABLE'; primaryButtonLabel = needsMoreProofCount > 0 ? 'Fix Proof' : 'Retry Mission'; primaryButtonEnabled = true;
  } else if (nextDrawableCardIds.length > 0) {
    displayState = 'READY';
  } else if (pendingCount > 0) {
    displayState = 'PENDING_REVIEW'; primaryButtonLabel = 'Pending Review'; primaryButtonEnabled = false; blockReason = 'all_remaining_cards_pending_review';
  } else {
    displayState = 'EXHAUSTED'; primaryButtonLabel = 'Deck Exhausted'; primaryButtonEnabled = false; blockReason = 'all_cards_unavailable';
  }

  return {
    deckId: cleanDeckId(deckId),
    deckTitle: deckTitle || deckId,
    totalCards,
    approvedCount,
    pendingCount,
    needsMoreProofCount,
    rejectedCount,
    unplayedCount,
    drawableCount: nextDrawableCardIds.length,
    retryableCount: retryableCardIds.length,
    isDeckComplete,
    isLocked: appConfig.isLocked === true,
    isBlocked: !primaryButtonEnabled,
    blockReason,
    displayState,
    primaryButtonLabel,
    primaryButtonEnabled,
    nextDrawableCardIds,
    retryableCardIds,
    perCardAnalysis
  };
}
''')

# Surgical deck page fixes: remove false pending limit, use complete label, and avoid blocking draw when unplayed cards exist.
replace_once(deck_page, "  const isPendingReviewLimit = !isStarter && !isDeckCompleted && eligiblePool.length > 0 && pendingDeckChallengesCount >= maxSeasonalPending;", "  const isPendingReviewLimit = false; // Only a real daily/weekly draw cap should set LIMIT_REACHED.")
replace_once(deck_page, "           isPendingReviewLimit ? \"LIMIT REACHED\" : ", "           isDeckCompleted ? \"DECK COMPLETE\" :\n           isPendingReviewLimit ? \"LIMIT REACHED\" : ")
replace_once(deck_page, "    status: starterHasNeedsMoreProof || starterHasRejected || isPendingReviewLimit || isWaitingForReview ? \"PENDING\" : (isExhausted ? \"EXHAUSTED\" : \"READY\")", "    status: isDeckCompleted ? \"COMPLETE\" : (starterHasNeedsMoreProof || starterHasRejected || isPendingReviewLimit || isWaitingForReview ? \"PENDING\" : (isExhausted ? \"EXHAUSTED\" : \"READY\"))")

print("0020 stabilize admin and decks applied.")
PY

npm run build
