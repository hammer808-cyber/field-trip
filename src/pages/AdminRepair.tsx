import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Zap, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle, 
  Database,
  Search,
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
  RepairReport,
  DiagnosticsReport,
  StrandedStarterRepairReport
} from '../services/repairService';
import { cn } from '../lib/utils';

export default function AdminRepair() {
  const [activeTab, setActiveTab] = useState<'individual' | 'bulk' | 'diagnostics'>('individual');
  
  // Individual Repair State
  const [repairUid, setRepairUid] = useState('');
  const [individualDryRun, setIndividualDryRun] = useState(true);
  const [repairingIndividual, setRepairingIndividual] = useState(false);
  const [individualReport, setIndividualReport] = useState<RepairReport | null>(null);

  // Bulk Repair State
  const [bulkDryRun, setBulkDryRun] = useState(true);
  const [repairingBulk, setRepairingBulk] = useState(false);
  const [bulkReport, setBulkReport] = useState<any>(null);

  // Stranded Repair State
  const [repairingStranded, setRepairingStranded] = useState(false);
  const [strandedReport, setStrandedReport] = useState<StrandedStarterRepairReport | null>(null);

  // Diagnostics State
  const [diagnostics, setDiagnostics] = useState<DiagnosticsReport | null>(null);
  const [loadingDiagnostics, setLoadingDiagnostics] = useState(false);

  useEffect(() => {
    if (activeTab === 'diagnostics') {
      fetchDiagnostics();
    }
  }, [activeTab]);

  const fetchDiagnostics = async () => {
    setLoadingDiagnostics(true);
    try {
      const data = await getRepairDiagnostics();
      setDiagnostics(data);
    } catch (err) {
      console.error('Failed to fetch diagnostics:', err);
    } finally {
      setLoadingDiagnostics(false);
    }
  };

  const handleRepairIndividual = async () => {
    if (!repairUid.trim()) return;
    setRepairingIndividual(true);
    try {
      const report = await repairUserMissionState(repairUid, individualDryRun);
      setIndividualReport(report);
    } catch (err) {
      console.error('Individual repair failed:', err);
    } finally {
      setRepairingIndividual(false);
    }
  };

  const handleRepairBulk = async () => {
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

  const handleRepairStranded = async () => {
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

  return (
    <AdminLayout 
      title="System Repair Bay" 
      description="Mission control for internal database consistency and agent profile reconstruction."
    >
      <div className="flex flex-col gap-8">
        {/* Navigation Tabs */}
        <div className="flex border-b-2 border-on-surface/10 gap-8">
          <button 
            onClick={() => setActiveTab('individual')}
            className={cn(
              "pb-4 text-xs font-mono font-black uppercase tracking-widest transition-all relative",
              activeTab === 'individual' ? "text-brand-orange" : "text-on-surface/40 hover:text-on-surface"
            )}
          >
            Individual Repair
            {activeTab === 'individual' && <motion.div layoutId="repair-tab" className="absolute bottom-0 left-0 right-0 h-1 bg-brand-orange" />}
          </button>
          <button 
            onClick={() => setActiveTab('bulk')}
            className={cn(
              "pb-4 text-xs font-mono font-black uppercase tracking-widest transition-all relative",
              activeTab === 'bulk' ? "text-brand-orange" : "text-on-surface/40 hover:text-on-surface"
            )}
          >
            Bulk Operations
            {activeTab === 'bulk' && <motion.div layoutId="repair-tab" className="absolute bottom-0 left-0 right-0 h-1 bg-brand-orange" />}
          </button>
          <button 
            onClick={() => setActiveTab('diagnostics')}
            className={cn(
              "pb-4 text-xs font-mono font-black uppercase tracking-widest transition-all relative",
              activeTab === 'diagnostics' ? "text-brand-orange" : "text-on-surface/40 hover:text-on-surface"
            )}
          >
            System Diagnostics
            {activeTab === 'diagnostics' && <motion.div layoutId="repair-tab" className="absolute bottom-0 left-0 right-0 h-1 bg-brand-orange" />}
          </button>
        </div>

        {/* Individual Repair */}
        {activeTab === 'individual' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="p-8 border-2 border-on-surface shadow-[8px_8px_0px_black] space-y-6">
              <div className="flex items-center gap-3">
                <Shield className="w-6 h-6 text-brand-orange" />
                <h3 className="text-xl font-display font-black uppercase italic tracking-tight">Agent Re-Sync Protocol</h3>
              </div>
              <p className="text-xs font-mono text-on-surface/60 leading-relaxed uppercase">
                Reconstructs mission completion lists, XP totals, and deck unlocked states based on verified proof history.
              </p>
              
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono font-black uppercase opacity-40">Target Agent UID</label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface/30" />
                    <input 
                      type="text"
                      value={repairUid}
                      onChange={(e) => setRepairUid(e.target.value)}
                      placeholder="ENTER UID..."
                      className="w-full bg-[#FAF8F5] border-2 border-on-surface p-4 pl-12 font-mono text-sm uppercase font-black focus:outline-none focus:ring-2 ring-brand-orange/20 rounded-xl"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-on-surface/5 rounded-xl border border-on-surface/10 cursor-pointer" onClick={() => setIndividualDryRun(!individualDryRun)}>
                  <div className={cn(
                    "w-6 h-6 border-2 border-on-surface rounded-md flex items-center justify-center transition-colors",
                    individualDryRun ? "bg-brand-orange" : "bg-white"
                  )}>
                    {individualDryRun && <CheckCircle className="w-4 h-4 text-white" />}
                  </div>
                  <div>
                    <p className="text-[10px] font-mono font-black uppercase">Dry Run Mode</p>
                    <p className="text-[9px] opacity-40 uppercase">Simulation only. No changes will be persisted.</p>
                  </div>
                </div>

                <button 
                  onClick={handleRepairIndividual}
                  disabled={repairingIndividual || !repairUid.trim()}
                  className="w-full py-4 bg-brand-orange text-white font-display font-black uppercase italic tracking-widest text-lg shadow-[4px_4px_0px_black] active:translate-y-1 active:shadow-none transition-all disabled:opacity-50 rounded-xl"
                >
                  {repairingIndividual ? (
                    <span className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin" /> INJECTING...
                    </span>
                  ) : 'EXECUTE_REPAIR'}
                </button>
              </div>
            </Card>

            <Card className="p-8 border-2 border-on-surface shadow-[8px_8px_0px_black] bg-[#FAF8F5] relative overflow-hidden">
               <div className="absolute top-4 right-4 opacity-10">
                 <Database className="w-24 h-24" />
               </div>
               
               <h3 className="text-xl font-display font-black uppercase italic tracking-tight mb-6">Repair Receipt</h3>
               
               {!individualReport ? (
                 <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-on-surface/15 rounded-2xl opacity-40">
                   <p className="text-[10px] font-mono font-black uppercase tracking-widest">Waiting for target...</p>
                 </div>
               ) : (
                 <div className="space-y-4 font-mono text-[10px] uppercase font-bold">
                    <div className="flex justify-between border-b border-on-surface/10 pb-2">
                      <span className="opacity-40">Target UID:</span>
                      <span className="text-brand-orange">{individualReport.uid}</span>
                    </div>
                    <div className="flex justify-between border-b border-on-surface/10 pb-2">
                      <span className="opacity-40">Status:</span>
                      <span className={cn(individualReport.errors.length > 0 ? "text-rose-500" : "text-emerald-500")}>
                        {individualReport.errors.length > 0 ? 'FAILED' : 'SUCCESS'}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-on-surface/10 pb-2">
                      <span className="opacity-40">Proof History:</span>
                      <span>{individualReport.entriesCount} RECORDS</span>
                    </div>
                    <div className="flex justify-between border-b border-on-surface/10 pb-2">
                      <span className="opacity-40">Starter Pack:</span>
                      <span>{individualReport.isStarterPackComplete ? 'COMPLETE' : 'INCOMPLETE'} ({individualReport.starterApprovedCount}/3)</span>
                    </div>
                    <div className="flex justify-between border-b border-on-surface/10 pb-2">
                      <span className="opacity-40">Heatwave Access:</span>
                      <span>{individualReport.canUseHeatwaveDeck ? 'GRANTED' : 'RESTRICTED'}</span>
                    </div>
                    {individualReport.errors.length > 0 && (
                      <div className="p-3 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg">
                        {individualReport.errors[0]}
                      </div>
                    )}
                 </div>
               )}
            </Card>
          </div>
        )}

        {/* Bulk Repair */}
        {activeTab === 'bulk' && (
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

        {/* Diagnostics Monitor */}
        {activeTab === 'diagnostics' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="p-8 border-2 border-on-surface shadow-[8px_8px_0px_black] bg-white">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <Database className="w-6 h-6 text-brand-orange" />
                  <h3 className="text-xl font-display font-black uppercase italic tracking-tight">System Health Monitor</h3>
                </div>
                <button 
                  onClick={fetchDiagnostics}
                  disabled={loadingDiagnostics}
                  className="p-2 border-2 border-on-surface rounded-lg hover:bg-on-surface/5 transition-all"
                >
                  <RefreshCw className={cn("w-4 h-4", loadingDiagnostics && "animate-spin")} />
                </button>
              </div>

              {loadingDiagnostics ? (
                <div className="h-64 flex flex-col items-center justify-center">
                  <RefreshCw className="w-12 h-12 animate-spin text-brand-orange mb-4" />
                  <p className="text-[10px] font-mono font-black uppercase opacity-40">Probing infrastructure...</p>
                </div>
              ) : diagnostics ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <StatItem label="Firebase Link" value={diagnostics.firebaseConnectionStatus} status={diagnostics.firebaseConnectionStatus === 'ok' ? 'success' : 'error'} />
                  <StatItem label="App Check" value={diagnostics.appCheckStatus} status={diagnostics.appCheckStatus === 'active' ? 'success' : 'warning'} />
                  <StatItem label="Orphaned Submissions" value={diagnostics.countEntriesNoReviews} status={diagnostics.countEntriesNoReviews === 0 ? 'success' : 'warning'} />
                  <StatItem label="Orphaned Reviews" value={diagnostics.countReviewsNoEntries} status={diagnostics.countReviewsNoEntries === 0 ? 'success' : 'warning'} />
                  <StatItem label="Starter Drift" value={diagnostics.countUsersStarterMismatch} status={diagnostics.countUsersStarterMismatch === 0 ? 'success' : 'warning'} />
                  <StatItem label="Last Scan" value={new Date(diagnostics.lastRepairRunTimestamp).toLocaleTimeString()} status="neutral" />
                </div>
              ) : (
                <p className="text-center text-xs font-mono opacity-40 py-12">Run diagnostics to see system health.</p>
              )}
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function RepairActionReceipt({
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
