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
  resetUserState,
  lookupAdminUsers,
  RepairReport,
  DiagnosticsReport,
  StrandedStarterRepairReport,
  UserResetReport,
  AdminUserLookupResult
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


  // User Reset State
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
    try {
      const report = await repairAllUserOrphans(bulkDryRun);
      setBulkReport(report);
    } catch (err) {
      console.error('Bulk repair failed:', err);
    } finally {
      setRepairingBulk(false);
    }
  };

  const handleRepairStranded = async () => {
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
      const report = await resetUserState({
        ...target,
        mode,
        confirmReset: resetConfirm,
        confirmationText: mode === 'hard' ? hardResetPhrase : undefined
      });
      setResetReport(report);
    } catch (err: any) {
      setResetReport({
        success: false,
        mode,
        userId: resetTarget,
        username: resetTarget,
        archivedCounts: {},
        errors: [err.message || String(err)]
      });
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
      if (results.length === 0) {
        setUserLookupError('No matching users found.');
      }
    } catch (err: any) {
      setUserLookupResults([]);
      setUserLookupError(err.message || String(err));
    } finally {
      setUserLookupLoading(false);
    }
  };

  const selectLookupUser = (result: AdminUserLookupResult, destination: 'reset' | 'repair') => {
    if (destination === 'repair') {
      setRepairUid(result.uid);
      setActiveTab('individual');
      return;
    }

    setResetTarget(result.uid);
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

        {/* User Resets */}
        {activeTab === 'resets' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="p-8 border-2 border-on-surface shadow-[8px_8px_0px_black] space-y-6">
              <div className="flex items-center gap-3">
                <UserX className="w-6 h-6 text-brand-orange" />
                <h3 className="text-xl font-display font-black uppercase italic tracking-tight">Targeted User Reset</h3>
              </div>
              <p className="text-xs font-mono text-on-surface/60 leading-relaxed uppercase">
                Soft reset preserves account identity and onboarding. Hard reset returns the user to first-run state while keeping the login record.
              </p>

              <div className="p-4 bg-white/70 border-2 border-on-surface/10 rounded-xl space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-mono font-black uppercase tracking-widest text-brand-orange">Find User</p>
                    <p className="text-[9px] font-mono uppercase opacity-40">Search by username, email, display name, or UID.</p>
                  </div>
                  <button
                    onClick={handleUserLookup}
                    disabled={userLookupLoading || !userSearchTerm.trim()}
                    className="px-4 py-2 bg-on-surface text-white rounded-lg text-[10px] font-mono font-black uppercase disabled:opacity-40"
                  >
                    {userLookupLoading ? 'Searching...' : 'Lookup'}
                  </button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface/30" />
                  <input
                    type="text"
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleUserLookup();
                    }}
                    placeholder="username, email, display name, or UID"
                    className="w-full bg-[#FAF8F5] border border-on-surface/20 p-3 pl-10 font-mono text-xs font-black focus:outline-none focus:ring-2 ring-brand-orange/20 rounded-lg"
                  />
                </div>
                {userLookupError && (
                  <p className="text-[10px] font-mono font-bold text-rose-600">{userLookupError}</p>
                )}
                {userLookupResults.length > 0 && (
                  <div className="space-y-2 max-h-56 overflow-auto">
                    {userLookupResults.map(result => (
                      <div key={result.uid} className="p-3 bg-[#FAF8F5] border border-on-surface/10 rounded-lg">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-display font-black uppercase italic truncate">{result.username || result.displayName || 'Unnamed agent'}</p>
                            <p className="text-[9px] font-mono opacity-50 truncate">{result.email || 'no email'}</p>
                            <p className="text-[9px] font-mono text-brand-orange truncate">UID: {result.uid}</p>
                          </div>
                          <div className="flex flex-col gap-2 shrink-0">
                            <button
                              onClick={() => selectLookupUser(result, 'reset')}
                              className="px-3 py-1.5 bg-brand-orange text-white rounded-md text-[9px] font-mono font-black uppercase"
                            >
                              Use for Reset
                            </button>
                            <button
                              onClick={() => selectLookupUser(result, 'repair')}
                              className="px-3 py-1.5 bg-on-surface text-white rounded-md text-[9px] font-mono font-black uppercase"
                            >
                              Use for Repair
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono font-black uppercase opacity-40">UID, Username, or Email</label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface/30" />
                    <input
                      type="text"
                      value={resetTarget}
                      onChange={(e) => setResetTarget(e.target.value)}
                      placeholder="TARGET AGENT..."
                      className="w-full bg-[#FAF8F5] border-2 border-on-surface p-4 pl-12 font-mono text-sm font-black focus:outline-none focus:ring-2 ring-brand-orange/20 rounded-xl"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-on-surface/5 rounded-xl border border-on-surface/10 cursor-pointer" onClick={() => setResetConfirm(!resetConfirm)}>
                  <div className={cn(
                    "w-6 h-6 border-2 border-on-surface rounded-md flex items-center justify-center transition-colors",
                    resetConfirm ? "bg-brand-orange" : "bg-white"
                  )}>
                    {resetConfirm && <CheckCircle className="w-4 h-4 text-white" />}
                  </div>
                  <div>
                    <p className="text-[10px] font-mono font-black uppercase">Confirm target reset</p>
                    <p className="text-[9px] opacity-40 uppercase">Required before either reset button is enabled.</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono font-black uppercase opacity-40">Hard reset phrase</label>
                  <input
                    type="text"
                    value={hardResetPhrase}
                    onChange={(e) => setHardResetPhrase(e.target.value)}
                    placeholder="Type HARD RESET for hard reset"
                    className="w-full bg-white border-2 border-rose-200 p-3 font-mono text-xs font-black focus:outline-none focus:ring-2 ring-rose-500/20 rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => handleUserReset('soft')}
                    disabled={!!resettingMode || !resetTarget.trim() || !resetConfirm}
                    className="py-4 bg-brand-orange text-white font-display font-black uppercase italic tracking-widest text-sm shadow-[4px_4px_0px_black] active:translate-y-1 active:shadow-none transition-all disabled:opacity-50 rounded-xl"
                  >
                    {resettingMode === 'soft' ? 'RESETTING...' : 'SOFT RESET USER'}
                  </button>
                  <button
                    onClick={() => handleUserReset('hard')}
                    disabled={!!resettingMode || !resetTarget.trim() || !resetConfirm || hardResetPhrase.trim() !== 'HARD RESET'}
                    className="py-4 bg-rose-600 text-white font-display font-black uppercase italic tracking-widest text-sm shadow-[4px_4px_0px_black] active:translate-y-1 active:shadow-none transition-all disabled:opacity-50 rounded-xl"
                  >
                    <Trash2 className="w-4 h-4 inline mr-2" />
                    {resettingMode === 'hard' ? 'WIPING...' : 'HARD RESET USER'}
                  </button>
                </div>
              </div>
            </Card>

            <Card className="p-8 border-2 border-on-surface shadow-[8px_8px_0px_black] bg-[#FAF8F5] relative overflow-hidden">
              <div className="absolute top-4 right-4 opacity-10">
                <Database className="w-24 h-24" />
              </div>
              <h3 className="text-xl font-display font-black uppercase italic tracking-tight mb-6">Reset Receipt</h3>
              {!resetReport ? (
                <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-on-surface/15 rounded-2xl opacity-40">
                  <p className="text-[10px] font-mono font-black uppercase tracking-widest">No reset run yet.</p>
                </div>
              ) : (
                <div className="space-y-4 font-mono text-[10px] uppercase font-bold">
                  <div className="flex justify-between border-b border-on-surface/10 pb-2">
                    <span className="opacity-40">Mode:</span>
                    <span className={resetReport.mode === 'hard' ? "text-rose-600" : "text-brand-orange"}>{resetReport.mode}</span>
                  </div>
                  <div className="flex justify-between border-b border-on-surface/10 pb-2">
                    <span className="opacity-40">Target:</span>
                    <span>{resetReport.username || resetReport.userId}</span>
                  </div>
                  <div className="flex justify-between border-b border-on-surface/10 pb-2">
                    <span className="opacity-40">Status:</span>
                    <span className={resetReport.success ? "text-emerald-500" : "text-rose-500"}>{resetReport.success ? 'SUCCESS' : 'FAILED'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(resetReport.archivedCounts || {}).map(([collectionName, count]) => (
                      <div key={collectionName} className="p-2 bg-white/70 border border-on-surface/10 rounded-lg flex justify-between">
                        <span className="opacity-40">{collectionName}</span>
                        <span>{String(count)}</span>
                      </div>
                    ))}
                  </div>
                  {resetReport.errors?.length > 0 && (
                    <div className="p-3 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg">
                      {resetReport.errors[0]}
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
