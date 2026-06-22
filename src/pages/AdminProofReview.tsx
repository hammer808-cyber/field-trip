import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Zap, 
  Search, 
  Filter, 
  Check, 
  X, 
  AlertCircle, 
  Clock, 
  LayoutGrid, 
  Table as TableIcon,
  ChevronRight,
  MoreVertical,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Eye,
  Activity
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { AdminLayout, StatusLight, ModuleCard } from '../components/admin/AdminShared';
import { Card } from '../components/UI';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import {
  approveSubmission,
  rejectSubmission,
  requestMoreProof,
  runCanonicalProofQueueRepair,
  subscribeToAdminPendingReviews,
  AdminReviewQueueDiagnostics
} from '../services/submissionService';
import type { QueueRepairReport } from '../services/proofLifecycleService';

export default function AdminProofReview() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending_review' | 'approved' | 'rejected' | 'needs_more_proof'>('pending_review');
  const [viewMode, setViewMode] = useState<'swipe' | 'queue'>('swipe');
  const [diagnostics, setDiagnostics] = useState<AdminReviewQueueDiagnostics | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [repairingQueue, setRepairingQueue] = useState(false);
  const [repairReport, setRepairReport] = useState<QueueRepairReport | null>(null);
  const [stats, setStats] = useState({
    pending: 0,
    velocity: '2.4 p/h',
    queueDepth: 'Normal'
  });

  const { isAdmin } = useTheme();
  const { profile } = useApp();
  const navigate = useNavigate();
  const isAdminAuthorized = isAdmin || profile?.role === 'admin' || (profile as any)?.isAdmin;

  useEffect(() => {
    if (!isAdminAuthorized) {
      setLoading(false);
      return;
    }

    // Proofs listener
    const unsub = subscribeToAdminPendingReviews(filter, (entries) => {
      setReviews(entries);
      setQueryError(null);
      if (filter === 'pending_review') {
        setStats(prev => ({
          ...prev,
          pending: entries.length,
          queueDepth: entries.length > 50 ? 'Critical' : entries.length > 20 ? 'Congested' : 'Clear'
        }));
      }
      setLoading(false);
    }, (error: any) => {
      console.error('[AdminProofReview] Reviews subscription denied:', error);
      setQueryError(error?.message || String(error));
      setLoading(false);
    }, setDiagnostics);

    return () => {
      unsub();
    };
  }, [isAdminAuthorized, filter]);

  const handleAction = async (id: string, action: 'approve' | 'reject' | 'request_info') => {
    const notes = window.prompt(
      action === 'approve'
        ? 'Approval note'
        : action === 'request_info'
          ? 'What should the player fix or add?'
          : 'Rejection note',
      action === 'approve' ? 'Approved from Admin Proof Review.' : ''
    );
    if (notes === null) return;

    setActionBusyId(id);
    try {
      if (action === 'approve') {
        await approveSubmission(id, notes || 'Approved from Admin Proof Review.');
      } else if (action === 'request_info') {
        await requestMoreProof(id, notes || 'Trevor needs one more little receipt.');
      } else {
        await rejectSubmission(id, notes || 'Rejected from Admin Proof Review.');
      }
    } catch (err: any) {
      console.error('[AdminProofReview] Review action failed:', err);
      alert(`Review action failed: ${err?.message || err}`);
    } finally {
      setActionBusyId(null);
    }
  };

  const handleRepairQueue = async (dryRun: boolean) => {
    setRepairingQueue(true);
    try {
      setRepairReport(await runCanonicalProofQueueRepair(dryRun));
    } catch (err: any) {
      console.error('[AdminProofReview] Queue repair failed:', err);
      alert(`Queue repair failed: ${err?.message || err}`);
    } finally {
      setRepairingQueue(false);
    }
  };

  const hasQueueIntegrityWarning = !!diagnostics && diagnostics.reviewableButNotRendered.length > 0;
  const hasPermissionOrQueryFailure = !!queryError || !!diagnostics?.errors.length;

  return (
    <AdminLayout 
      title="Proof Review Console" 
    >
      <div className="space-y-8">
        
        {/* Review Monitors (Stats) */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
           <MonitorCard title="Current Queue" value={stats.pending} icon={Shield} />
           <MonitorCard title="Review Velocity" value={stats.velocity} icon={Zap} />
           <MonitorCard title="System Depth" value={stats.queueDepth} status={stats.queueDepth === 'Clear' ? 'green' : 'yellow'} icon={Activity} />
        </section>

        <QueueDiagnosticsPanel
          diagnostics={diagnostics}
          queryError={queryError}
          repairReport={repairReport}
          repairing={repairingQueue}
          onRepair={handleRepairQueue}
        />

        {/* Control Toolbar */}
        <Card className="p-6 border-2 border-on-surface shadow-[6px_6px_0px_black] bg-white flex flex-col md:flex-row justify-between items-center gap-6">
           <div className="flex bg-on-surface/5 p-1 rounded-xl w-full md:w-auto">
              {(['pending_review', 'approved', 'rejected', 'needs_more_proof'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "flex-1 px-4 py-2 rounded-lg font-mono text-[10px] font-black uppercase tracking-widest transition-all",
                    filter === f ? "bg-white shadow-sm text-brand-orange" : "text-on-surface/40 hover:text-on-surface"
                  )}
                >
                  {f.replace('_', ' ')}
                </button>
              ))}
           </div>

           <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="flex bg-on-surface p-1 rounded-lg">
                 <button 
                  onClick={() => setViewMode('swipe')}
                  className={cn("p-2 rounded transition-all", viewMode === 'swipe' ? "bg-brand-orange text-white" : "text-white/40")}
                 >
                    <LayoutGrid className="w-4 h-4" />
                 </button>
                 <button 
                  onClick={() => setViewMode('queue')}
                  className={cn("p-2 rounded transition-all", viewMode === 'queue' ? "bg-brand-orange text-white" : "text-white/40")}
                 >
                    <TableIcon className="w-4 h-4" />
                 </button>
              </div>
              <div className="flex-1 md:flex-none relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-30" />
                 <input 
                   type="text" 
                   placeholder="SEARCH_BY_AGENT_ID..." 
                   className="pl-9 pr-4 py-2.5 bg-on-surface/5 border border-on-surface/10 rounded-xl font-mono text-[10px] uppercase w-full md:w-48 placeholder:opacity-30 outline-none focus:border-brand-orange transition-all"
                 />
              </div>
           </div>
        </Card>

        {/* Main View Area */}
        <div className="min-h-[400px]">
           {loading ? (
             <div className="h-64 flex flex-col items-center justify-center space-y-4">
                <RefreshCw className="w-10 h-10 animate-spin text-brand-orange opacity-20" />
                <p className="font-mono text-[10px] uppercase font-black tracking-widest opacity-30">Connecting to proof feed...</p>
             </div>
           ) : reviews.length === 0 ? (
             <div className={cn(
                "min-h-64 flex flex-col items-center justify-center space-y-4 bg-white border-2 border-dashed rounded-3xl p-8 text-center",
                hasPermissionOrQueryFailure || hasQueueIntegrityWarning ? "border-red-300 bg-red-50" : "border-on-surface/10"
             )}>
                <Shield className={cn("w-12 h-12", hasPermissionOrQueryFailure || hasQueueIntegrityWarning ? "text-red-500" : "text-on-surface/10")} />
                <p className="font-mono text-[10px] uppercase font-black tracking-[0.2em] opacity-70">
                  {hasPermissionOrQueryFailure
                    ? 'Could not load review queue. See diagnostics above.'
                    : hasQueueIntegrityWarning
                      ? 'Queue may be incomplete. Diagnostics found reviewable records that are not rendering.'
                      : 'No proof is waiting for review.'}
                </p>
                {hasQueueIntegrityWarning && (
                  <p className="font-mono text-[10px] text-red-700 max-w-xl">
                    Affected submission IDs: {diagnostics?.reviewableButNotRendered.slice(0, 8).join(', ')}
                  </p>
                )}
             </div>
           ) : viewMode === 'swipe' ? (
              <SwipeView 
                entry={reviews[0]} 
                busy={actionBusyId === reviews[0].id}
                onAction={(action: any) => handleAction(reviews[0].id, action)} 
              />
           ) : (
              <QueueView entries={reviews} busyId={actionBusyId} onAction={handleAction} />
           )}
        </div>

      </div>
    </AdminLayout>
  );
}

function MonitorCard({ title, value, status = 'neutral', icon: Icon }: any) {
  return (
    <Card className="p-6 border-2 border-on-surface shadow-[4px_4px_0px_black] bg-white flex items-center justify-between">
      <div className="space-y-1">
        <p className="text-[9px] font-mono font-black uppercase opacity-40">{title}</p>
        <p className="text-3xl font-display font-black uppercase italic text-on-surface leading-none">{value}</p>
      </div>
      <div className="flex flex-col items-end gap-2">
        <Icon className="w-6 h-6 text-on-surface/20" />
        <StatusLight state={status} pulse={status !== 'green' && status !== 'neutral'} />
      </div>
    </Card>
  );
}

function QueueDiagnosticsPanel({
  diagnostics,
  queryError,
  repairReport,
  repairing,
  onRepair
}: {
  diagnostics: AdminReviewQueueDiagnostics | null;
  queryError: string | null;
  repairReport: QueueRepairReport | null;
  repairing: boolean;
  onRepair: (dryRun: boolean) => void;
}) {
  const statusRows = diagnostics
    ? Object.entries(diagnostics.statusCounts).map(([status, count]) => `${status}: ${count}`).join(' / ')
    : 'waiting for query...';
  const hasWarning = !!diagnostics?.reviewableButNotRendered.length || !!queryError || !!diagnostics?.errors.length;

  return (
    <Card className={cn("p-4 border-2 bg-white/80", hasWarning ? "border-red-400" : "border-on-surface/20")}>
      <details open={hasWarning}>
        <summary className="cursor-pointer font-mono text-[10px] font-black uppercase tracking-widest text-on-surface/60 flex items-center gap-2">
          <Activity className="w-4 h-4 text-brand-orange" />
          Admin Proof Queue Diagnostics
          {queryError && <span className="text-red-600">QUERY ERROR</span>}
          {diagnostics && diagnostics.reviewableButNotRendered.length > 0 && <span className="text-red-600">QUEUE WARNING</span>}
        </summary>
        <div className="mt-4 grid gap-2 text-[10px] font-mono uppercase text-on-surface/70">
          <DiagnosticRow label="Firebase project" value={diagnostics?.projectId || 'unknown'} />
          <DiagnosticRow label="Environment" value={diagnostics?.environment || 'unknown'} />
          <DiagnosticRow label="Query paths" value={diagnostics?.queryPaths.join(', ') || 'entries, proofReviews'} />
          <DiagnosticRow label="Active filter" value={diagnostics?.statusFilter || 'pending_review'} />
          <DiagnosticRow label="Entries before filtering" value={String(diagnostics?.entriesTotalBeforeFiltering ?? 0)} />
          <DiagnosticRow label="ProofReviews before filtering" value={String(diagnostics?.proofReviewsTotalBeforeFiltering ?? 0)} />
          <DiagnosticRow label="Merged records after filtering" value={String(diagnostics?.mergedTotalAfterFiltering ?? 0)} />
          <DiagnosticRow label="Records per status" value={statusRows} />
          <DiagnosticRow label="Failed/incomplete" value={String(diagnostics?.failedOrIncompleteCount ?? 0)} danger={(diagnostics?.failedOrIncompleteCount ?? 0) > 0} />
          <DiagnosticRow label="Missing required fields" value={String(diagnostics?.missingRequiredFieldsCount ?? 0)} danger={(diagnostics?.missingRequiredFieldsCount ?? 0) > 0} />
          <DiagnosticRow label="Missing image reference" value={String(diagnostics?.missingImageReferenceCount ?? 0)} danger={(diagnostics?.missingImageReferenceCount ?? 0) > 0} />
          <DiagnosticRow label="Missing linkage" value={String(diagnostics?.missingLinkageCount ?? 0)} danger={(diagnostics?.missingLinkageCount ?? 0) > 0} />
          <DiagnosticRow label="Invalid status values" value={String(diagnostics?.invalidStatusCount ?? 0)} danger={(diagnostics?.invalidStatusCount ?? 0) > 0} />
          <DiagnosticRow
            label="Reviewable not rendered"
            value={diagnostics?.reviewableButNotRendered.length ? diagnostics.reviewableButNotRendered.join(', ') : 'none'}
            danger={!!diagnostics?.reviewableButNotRendered.length}
          />
          {queryError && <DiagnosticRow label="Query error" value={queryError} danger />}
          {diagnostics?.errors.map((err, index) => (
            <DiagnosticRow key={`${err.source}-${index}`} label={`${err.source} error`} value={`${err.code || 'error'}: ${err.message}`} danger />
          ))}
          <div className="mt-2">
            <div className="font-black text-on-surface/50">Excluded records and reasons</div>
            {diagnostics && diagnostics.excluded.length > 0 ? (
              <div className="mt-2 max-h-44 overflow-y-auto rounded-xl bg-on-surface/5 p-3 space-y-1">
                {diagnostics.excluded.slice(0, 30).map((item) => (
                  <div key={`${item.source}-${item.id}-${item.reason}`} className="break-all">
                    {item.source}/{item.id}: {item.status} -&gt; {item.normalizedStatus} / {item.reason}
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-1 opacity-40">No excluded records reported.</div>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={repairing}
              onClick={() => onRepair(true)}
              className="px-3 py-2 rounded-lg border-2 border-on-surface bg-white font-black uppercase disabled:opacity-50"
            >
              {repairing ? 'Checking...' : 'Dry Run Repair'}
            </button>
            <button
              type="button"
              disabled={repairing}
              onClick={() => onRepair(false)}
              className="px-3 py-2 rounded-lg border-2 border-on-surface bg-brand-orange text-white font-black uppercase disabled:opacity-50"
            >
              {repairing ? 'Repairing...' : 'Repair / Reindex Queue'}
            </button>
          </div>
          {repairReport && (
            <div className="mt-3 rounded-xl bg-on-surface/5 p-3 space-y-1">
              <DiagnosticRow label="Repair mode" value={repairReport.dryRun ? 'dry run' : 'live write'} />
              <DiagnosticRow label="Entries scanned" value={String(repairReport.scannedEntries)} />
              <DiagnosticRow label="ProofReviews scanned" value={String(repairReport.scannedProofReviews)} />
              <DiagnosticRow label="Entries repaired" value={String(repairReport.repairedEntries.length)} />
              <DiagnosticRow label="Ambiguous records" value={String(repairReport.ambiguousRecords.length)} danger={repairReport.ambiguousRecords.length > 0} />
              <DiagnosticRow label="Orphan proofReviews" value={String(repairReport.orphanProofReviews.length)} danger={repairReport.orphanProofReviews.length > 0} />
            </div>
          )}
        </div>
      </details>
    </Card>
  );
}

function DiagnosticRow({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className={cn("grid gap-1 sm:grid-cols-[180px_1fr] border-b border-on-surface/5 pb-1", danger && "text-red-600")}>
      <span className="font-black opacity-50">{label}</span>
      <span className="break-words">{value}</span>
    </div>
  );
}

function SwipeView({ entry, onAction, busy }: any) {
  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in zoom-in-95 duration-300">
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Proof Visual */}
          <div className="relative group">
             <div className="absolute inset-0 bg-brand-orange opacity-0 group-hover:opacity-10 transition-all blur-xl duration-500 rounded-full" />
             <div className="relative border-4 border-on-surface p-4 bg-white shadow-[12px_12px_0px_black] rounded-[2.5rem]">
                <img 
                  src={entry.photoUrl || entry.imageUrl || entry.proofImage} 
                  alt="Proof" 
                  className="w-full aspect-[4/5] object-cover rounded-[1.8rem] border-2 border-on-surface"
                />
                
                {/* Meta Overlay */}
                <div className="absolute bottom-10 left-10 right-10 flex justify-between items-end">
                   <div className="bg-on-surface text-white px-3 py-1 rounded font-mono text-[8px] font-black uppercase tracking-widest bg-opacity-80 backdrop-blur-sm">
                      IMG_SOURCE: {entry.id.slice(0,8)}
                   </div>
                </div>
             </div>
          </div>

          {/* Details & Controls */}
          <div className="space-y-8 pt-4">
             <div className="space-y-2">
                <div className="flex items-center gap-3">
                   <div className="w-2 h-2 bg-brand-orange" />
                   <h2 className="text-4xl font-display font-black uppercase italic tracking-tighter leading-tight">
                     {entry.displayName || 'Anonymous_Agent'}
                   </h2>
                </div>
                <p className="text-[10px] font-mono font-black uppercase tracking-widest text-on-surface/40">
                   Mission: <span className="text-on-surface">{entry.tripTitle || entry.missionTitle || 'Undefined'}</span>
                </p>
             </div>

             <div className="bg-white border-2 border-on-surface p-6 rounded-2xl shadow-[6px_6px_0px_black]">
                <h4 className="text-[9px] font-mono font-black uppercase opacity-40 mb-3">Field_Note_Transcription</h4>
                <p className="font-mono text-xs leading-relaxed italic border-l-4 border-brand-orange pl-4 bg-brand-orange/5 py-4">
                  "{entry.fieldNote || 'No verbal identification provided.'}"
                </p>
             </div>

             {/* Action Grid */}
             <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => onAction('approve')}
                  disabled={busy}
                  className="col-span-2 py-6 bg-brand-lime text-on-surface border-4 border-on-surface shadow-[8px_8px_0px_black] flex flex-col items-center justify-center gap-2 group hover:shadow-[4px_4px_0px_black] active:translate-y-1 transition-all"
                >
                   <Check className="w-8 h-8 group-hover:scale-125 transition-transform" />
                   <span className="font-display text-xl font-black uppercase italic tracking-tighter">{busy ? 'WORKING...' : 'APPROVE_PROTOCOL'}</span>
                </button>
                <button 
                  onClick={() => onAction('request_info')}
                  disabled={busy}
                  className="py-4 bg-[#FFDD00] text-on-surface border-4 border-on-surface shadow-[6px_6px_0px_black] flex items-center justify-center gap-2 font-display font-black uppercase italic text-sm hover:shadow-[2px_2px_0px_black] active:translate-y-1 transition-all"
                >
                   <Clock className="w-4 h-4" /> REQ_INFO
                </button>
                <button 
                  onClick={() => onAction('reject')}
                  disabled={busy}
                  className="py-4 bg-rose-500 text-white border-4 border-on-surface shadow-[6px_6px_0px_black] flex items-center justify-center gap-2 font-display font-black uppercase italic text-sm hover:shadow-[2px_2px_0px_black] active:translate-y-1 transition-all"
                >
                   <X className="w-4 h-4" /> REJECT
                </button>
             </div>
          </div>
       </div>

       {/* Meta Strip */}
       <footer className="pt-8 border-t-2 border-on-surface/10 flex flex-wrap gap-8 text-[9px] font-mono font-black uppercase opacity-40">
          <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-on-surface rounded-full" /> UID: {entry.userId}</div>
          <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-on-surface rounded-full" /> Submitted: {entry.createdAt?.toDate ? format(entry.createdAt.toDate(), 'MM/dd HH:mm') : entry.submittedAt?.toDate ? format(entry.submittedAt.toDate(), 'MM/dd HH:mm') : 'Unknown'}</div>
          <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-on-surface rounded-full" /> Confidence: {(entry.aiScore || 100)}%</div>
       </footer>
    </div>
  );
}

function QueueView({ entries, busyId, onAction }: { entries: any[]; busyId: string | null; onAction: (id: string, action: 'approve' | 'reject' | 'request_info') => void }) {
  return (
    <div className="overflow-x-auto border-2 border-on-surface shadow-[8px_8px_0px_black] rounded-[2.5rem] bg-white">
       <table className="w-full text-left border-collapse">
          <thead>
             <tr className="bg-[#FAF8F5] border-b-2 border-on-surface text-[10px] font-mono font-black uppercase text-on-surface/50">
                <th className="py-4 px-6">Timestamp</th>
                <th className="py-4 px-6">Agent</th>
                <th className="py-4 px-6">Mission</th>
                <th className="py-4 px-6">AI_Score</th>
                <th className="py-4 px-6 text-center">Protocol</th>
             </tr>
          </thead>
          <tbody className="divide-y divide-on-surface/10 font-mono text-[10px] uppercase font-bold">
             {entries.map((e) => (
                <tr key={e.id} className="hover:bg-on-surface/5 cursor-pointer transition-all">
                   <td className="py-4 px-6 opacity-40 whitespace-nowrap">
                     {e.createdAt?.toDate ? format(e.createdAt.toDate(), 'MM/dd HH:mm') : e.submittedAt?.toDate ? format(e.submittedAt.toDate(), 'MM/dd HH:mm') : '---'}
                   </td>
                   <td className="py-4 px-6 font-black text-on-surface">
                     {e.displayName || 'Anon'}
                   </td>
                   <td className="py-4 px-6 truncate max-w-[200px]">
                     {e.tripTitle || e.missionTitle || 'Undefined'}
                   </td>
                   <td className="py-4 px-6 font-black text-brand-orange">
                     {e.aiScore || 'N/A'}%
                   </td>
                   <td className="py-4 px-6">
                     <div className="flex items-center justify-center gap-2">
                       <button
                         disabled={busyId === e.id}
                         onClick={() => onAction(e.id, 'approve')}
                         className="p-2 border border-on-surface rounded bg-brand-lime hover:bg-on-surface hover:text-white disabled:opacity-40"
                         title="Approve"
                       >
                          <Check className="w-3 h-3" />
                       </button>
                       <button
                         disabled={busyId === e.id}
                         onClick={() => onAction(e.id, 'request_info')}
                         className="p-2 border border-on-surface rounded bg-[#FFDD00] hover:bg-on-surface hover:text-white disabled:opacity-40"
                         title="Needs more proof"
                       >
                          <Clock className="w-3 h-3" />
                       </button>
                       <button
                         disabled={busyId === e.id}
                         onClick={() => onAction(e.id, 'reject')}
                         className="p-2 border border-on-surface rounded bg-rose-500 text-white hover:bg-on-surface disabled:opacity-40"
                         title="Reject"
                       >
                          <X className="w-3 h-3" />
                       </button>
                       <button className="p-2 border border-on-surface rounded hover:bg-on-surface hover:text-white" title="View">
                          <Eye className="w-3 h-3" />
                       </button>
                     </div>
                   </td>
                </tr>
             ))}
          </tbody>
       </table>
    </div>
  );
}
