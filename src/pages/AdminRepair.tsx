import React, { useState, useEffect } from 'react';
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
  runBetaHardReset,
  resetUserState,
  lookupAdminUsers,
  RepairReport,
  DiagnosticsReport,
  StrandedStarterRepairReport,
  BetaHardResetReport,
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
  const [betaHardResetDryRun, setBetaHardResetDryRun] = useState(true);
  const [betaHardResetConfirm, setBetaHardResetConfirm] = useState(false);
  const [betaHardResetPhrase, setBetaHardResetPhrase] = useState('');
  const [betaHardResetRunning, setBetaHardResetRunning] = useState(false);
  const [betaHardResetReport, setBetaHardResetReport] = useState<BetaHardResetReport | null>(null);

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
        deployInfo: {
          commitSha: 'unknown',
          buildTime: 'unknown',
          cloudRunService: 'unknown',
          cloudRunRevision: 'unknown',
          cloudRunConfiguration: 'unknown'
        },
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

  const handleBetaHardReset = async () => {
    if (!betaHardResetDryRun && (!betaHardResetConfirm || betaHardResetPhrase !== 'RESET_FIELDTRIP_BETA')) return;
    setBetaHardResetRunning(true);
    setBetaHardResetReport(null);
    try {
      const report = await runBetaHardReset({
        dryRun: betaHardResetDryRun,
        confirmReset: !betaHardResetDryRun && betaHardResetConfirm,
        confirmationText: betaHardResetPhrase
      });
      setBetaHardResetReport(report);
      if (!report.dryRun) {
        setBetaHardResetConfirm(false);
        setBetaHardResetPhrase('');
      }
    } finally {
      setBetaHardResetRunning(false);
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
        <div className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto overflow-y-hidden border-b-2 border-on-surface/10">
          <div className="flex min-w-max gap-2 sm:gap-6 pb-1">
            {tabs.map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={cn(
                  "shrink-0 px-3 py-3 sm:px-1 sm:pb-4 text-[10px] sm:text-xs font-mono font-black uppercase tracking-widest transition-all relative whitespace-nowrap border-2 sm:border-0 rounded-xl sm:rounded-none",
                  activeTab === key
                    ? "text-on-surface bg-brand-orange/15 border-brand-orange sm:bg-transparent sm:text-brand-orange"
                    : "text-on-surface/50 border-on-surface/10 bg-white/60 hover:text-on-surface"
                )}
              >
                {label}
                {activeTab === key && <motion.div layoutId="repair-tab" className="absolute bottom-0 left-0 right-0 h-1 bg-brand-orange" />}
              </button>
            ))}
          </div>
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
                <button disabled className="py-4 bg-rose-600 text-white font-display font-black uppercase italic rounded-xl shadow-[4px_4px_0px_black] opacity-50 cursor-not-allowed">
                  <Trash2 className="w-4 h-4 inline mr-2" />HARD RESET COMING SOON
                </button>
              </div>
              <p className="text-[9px] font-mono font-black uppercase tracking-widest text-on-surface/40">
                Hard reset endpoint is intentionally disabled until the server workflow is implemented and reviewed.
              </p>
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
            <Card className="md:col-span-2 p-8 border-2 border-rose-600 bg-rose-50 shadow-[8px_8px_0px_black] space-y-6">
              <SectionTitle icon={AlertTriangle} title="Beta Hard Reset" description="Deletes stale gameplay roots, clears proof queues, and returns every user to clean Starter state. Firebase Auth and admin roles are preserved." />
              <ToggleRow checked={betaHardResetDryRun} onClick={() => setBetaHardResetDryRun(!betaHardResetDryRun)} title="Dry Run Mode" description="Leave this on first. Dry run counts records but writes nothing." />
              {!betaHardResetDryRun && (
                <>
                  <ToggleRow checked={betaHardResetConfirm} onClick={() => setBetaHardResetConfirm(!betaHardResetConfirm)} title="I understand this deletes beta gameplay data" description="Required for live reset. This cannot be undone from the app." />
                  <LabeledInput label="Live Reset Phrase" value={betaHardResetPhrase} onChange={setBetaHardResetPhrase} placeholder="type RESET_FIELDTRIP_BETA" />
                </>
              )}
              <button
                onClick={handleBetaHardReset}
                disabled={betaHardResetRunning || (!betaHardResetDryRun && (!betaHardResetConfirm || betaHardResetPhrase !== 'RESET_FIELDTRIP_BETA'))}
                className="w-full py-4 bg-rose-600 text-white font-display font-black uppercase italic rounded-xl shadow-[4px_4px_0px_black] disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4 inline mr-2" />
                {betaHardResetRunning ? 'RUNNING...' : betaHardResetDryRun ? 'DRY RUN BETA HARD RESET' : 'LIVE BETA HARD RESET'}
              </button>
              {betaHardResetReport && (
                <RepairActionReceipt
                  title={betaHardResetReport.dryRun ? 'Hard Reset Preview' : 'Hard Reset Complete'}
                  failed={!betaHardResetReport.success || betaHardResetReport.errors?.length > 0}
                  rows={[
                    ['Mode', betaHardResetReport.dryRun ? 'Dry Run' : 'Live Write'],
                    ['Users Scanned', betaHardResetReport.usersScanned || 0],
                    ['Users Reset', betaHardResetReport.usersReset || 0],
                    ['Root Docs Matched', sumResetCounts(betaHardResetReport.rootCollections, 'matched')],
                    ['Root Docs Deleted', sumResetCounts(betaHardResetReport.rootCollections, 'deleted')],
                    ['User Subdocs Matched', sumResetCounts(betaHardResetReport.userSubcollections, 'matched')],
                    ['User Subdocs Deleted', sumResetCounts(betaHardResetReport.userSubcollections, 'deleted')],
                    ['App Config Reset', betaHardResetReport.appConfigReset ? 'Yes' : 'No']
                  ]}
                  error={betaHardResetReport.errors?.[0] || betaHardResetReport.warnings?.join(' | ')}
                />
              )}
            </Card>
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
                <DeployStamp deployInfo={diagnostics.deployInfo} />
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

function sumResetCounts(collections: Record<string, { matched?: number; deleted?: number }> | undefined, key: 'matched' | 'deleted') {
  if (!collections) return 0;
  return Object.values(collections).reduce((sum, item) => sum + (Number(item?.[key]) || 0), 0);
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

function DeployStamp({ deployInfo }: { deployInfo?: DiagnosticsReport['deployInfo'] }) {
  const commitSha = deployInfo?.commitSha || 'unknown';
  const shortSha = commitSha === 'unknown' ? commitSha : commitSha.slice(0, 12);

  return (
    <div className="mt-8 border-t-2 border-dashed border-on-surface/10 pt-4 font-mono text-[9px] uppercase text-on-surface/45">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <span className="font-black tracking-widest text-on-surface/60">Deploy Stamp</span>
        <span>Commit: <strong>{shortSha}</strong></span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 break-all">
        <span>Build: {deployInfo?.buildTime || 'unknown'}</span>
        <span>Service: {deployInfo?.cloudRunService || 'unknown'}</span>
        <span>Revision: {deployInfo?.cloudRunRevision || 'unknown'}</span>
      </div>
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
