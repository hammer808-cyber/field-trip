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
  calculateProofRubricScore,
  DEFAULT_PROOF_RUBRIC_RATINGS,
  getProofRubricScoring,
  getProofRubricScoringContextLabel,
  getProofRubricRecommendationLabel,
  PROOF_RUBRIC_CATEGORIES,
  type ProofRubricScoring,
  type ProofRubricRatings,
  type ProofRubricScore
} from '../logic/proofRubric';
import {
  approveSubmission,
  grantStarterSignalsBypass,
  rejectSubmission,
  requestMoreProof,
  runCanonicalProofQueueRepair,
  slotOrphanProofReviews,
  subscribeToAdminPendingReviews,
  AdminReviewQueueDiagnostics,
  StarterBypassReport,
  OrphanSlotReport
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
  const [grantingBypass, setGrantingBypass] = useState(false);
  const [starterBypassReport, setStarterBypassReport] = useState<StarterBypassReport | null>(null);
  const [slottingOrphans, setSlottingOrphans] = useState(false);
  const [orphanSlotReport, setOrphanSlotReport] = useState<OrphanSlotReport | null>(null);
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

  const getActionId = (record: any) => String(record?.entryId || record?.submissionId || record?.id || '');

  const handleAction = async (
    id: string,
    action: 'approve' | 'reject' | 'request_info',
    review?: { notes: string; rubric: ProofRubricScore; scoring: ProofRubricScoring; adminOverrideUsed: boolean; adminOverrideReason: string | null }
  ) => {
    if (!review?.rubric) {
      alert('Score the rubric in card view before issuing a final review decision.');
      return;
    }
    const notes = review.notes.trim() || defaultReviewNote(action);
    setActionBusyId(id);
    const metadata = {
      rubric: {
        ...review.rubric,
        adminOverrideUsed: review.adminOverrideUsed,
        adminOverrideReason: review.adminOverrideReason,
      },
      scoring: review.scoring
    };
    try {
      if (action === 'approve') {
        await approveSubmission(id, notes, metadata);
      } else if (action === 'request_info') {
        await requestMoreProof(id, notes, metadata);
      } else {
        await rejectSubmission(id, notes, metadata);
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

  const handleGrantStarterBypass = async () => {
    const targetUid = window.prompt('User UID to unlock past Starter Signals');
    if (!targetUid) return;
    const reason = window.prompt('Reason for bypass', 'Admin bypass: stale pending/review records are blocking Starter Signals.') || 'Admin Starter Signals bypass.';
    setGrantingBypass(true);
    try {
      setStarterBypassReport(await grantStarterSignalsBypass(targetUid.trim(), reason));
    } catch (err: any) {
      console.error('[AdminProofReview] Starter bypass failed:', err);
      alert(`Starter bypass failed: ${err?.message || err}`);
    } finally {
      setGrantingBypass(false);
    }
  };

  const handleSlotOrphans = async (dryRun: boolean) => {
    setSlottingOrphans(true);
    try {
      setOrphanSlotReport(await slotOrphanProofReviews(dryRun));
    } catch (err: any) {
      console.error('[AdminProofReview] Orphan slotting failed:', err);
      alert(`Orphan slotting failed: ${err?.message || err}`);
    } finally {
      setSlottingOrphans(false);
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
          grantingBypass={grantingBypass}
          starterBypassReport={starterBypassReport}
          slottingOrphans={slottingOrphans}
          orphanSlotReport={orphanSlotReport}
          onRepair={handleRepairQueue}
          onGrantStarterBypass={handleGrantStarterBypass}
          onSlotOrphans={handleSlotOrphans}
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
                busy={actionBusyId === getActionId(reviews[0])}
                onAction={(action: any, review: any) => handleAction(getActionId(reviews[0]), action, review)}
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
  grantingBypass,
  starterBypassReport,
  slottingOrphans,
  orphanSlotReport,
  onRepair,
  onGrantStarterBypass,
  onSlotOrphans
}: {
  diagnostics: AdminReviewQueueDiagnostics | null;
  queryError: string | null;
  repairReport: QueueRepairReport | null;
  repairing: boolean;
  grantingBypass: boolean;
  starterBypassReport: StarterBypassReport | null;
  slottingOrphans: boolean;
  orphanSlotReport: OrphanSlotReport | null;
  onRepair: (dryRun: boolean) => void;
  onGrantStarterBypass: () => void;
  onSlotOrphans: (dryRun: boolean) => void;
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
            <button
              type="button"
              disabled={grantingBypass}
              onClick={onGrantStarterBypass}
              className="px-3 py-2 rounded-lg border-2 border-on-surface bg-brand-lime text-on-surface font-black uppercase disabled:opacity-50"
            >
              {grantingBypass ? 'Granting...' : 'Grant Starter Bypass'}
            </button>
            <button
              type="button"
              disabled={slottingOrphans}
              onClick={() => onSlotOrphans(true)}
              className="px-3 py-2 rounded-lg border-2 border-on-surface bg-white font-black uppercase disabled:opacity-50"
            >
              {slottingOrphans ? 'Checking...' : 'Dry Run Slot Orphans'}
            </button>
            <button
              type="button"
              disabled={slottingOrphans}
              onClick={() => onSlotOrphans(false)}
              className="px-3 py-2 rounded-lg border-2 border-on-surface bg-red-500 text-white font-black uppercase disabled:opacity-50"
            >
              {slottingOrphans ? 'Slotting...' : 'Slot Orphans Into Entries'}
            </button>
          </div>
          {starterBypassReport && (
            <div className="mt-3 rounded-xl bg-brand-lime/20 p-3 space-y-1">
              <DiagnosticRow label="Starter bypass" value={starterBypassReport.message || 'granted'} />
              <DiagnosticRow label="Target UID" value={starterBypassReport.targetUid} />
              <DiagnosticRow label="Starter approved count" value={String(starterBypassReport.starterApprovedCount)} />
              <DiagnosticRow label="Unlocked" value={(starterBypassReport.unlocked || []).join(', ')} />
            </div>
          )}
          {orphanSlotReport && (
            <div className="mt-3 rounded-xl bg-on-surface/5 p-3 space-y-1">
              <DiagnosticRow label="Orphan slot mode" value={orphanSlotReport.dryRun ? 'dry run' : 'live write'} />
              <DiagnosticRow label="ProofReviews scanned" value={String(orphanSlotReport.scannedProofReviews)} />
              <DiagnosticRow label="Entries created" value={String(orphanSlotReport.createdEntries.length)} danger={!orphanSlotReport.dryRun && orphanSlotReport.createdEntries.length > 0} />
              <DiagnosticRow label="Reviews linked" value={String(orphanSlotReport.linkedReviews.length)} />
              <DiagnosticRow label="Already had entries" value={String(orphanSlotReport.skippedExisting.length)} />
              <DiagnosticRow label="Ambiguous orphans" value={String(orphanSlotReport.ambiguousRecords.length)} danger={orphanSlotReport.ambiguousRecords.length > 0} />
              {orphanSlotReport.createdEntries.length > 0 && (
                <DiagnosticRow
                  label="Created entry IDs"
                  value={orphanSlotReport.createdEntries.slice(0, 8).map(item => item.id).join(', ')}
                />
              )}
              {orphanSlotReport.ambiguousRecords.length > 0 && (
                <DiagnosticRow
                  label="Ambiguous review IDs"
                  value={orphanSlotReport.ambiguousRecords.slice(0, 8).map(item => `${item.reviewId}: ${item.reasons.join('|')}`).join(', ')}
                  danger
                />
              )}
            </div>
          )}
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

function defaultReviewNote(action: 'approve' | 'reject' | 'request_info') {
  if (action === 'approve') return 'Approved from Admin Proof Review.';
  if (action === 'request_info') return 'Trevor needs one more little receipt.';
  return 'Rejected from Admin Proof Review.';
}

function suggestedActionForRubric(score: ProofRubricScore): 'approve' | 'request_info' | 'reject' | null {
  if (score.recommendation === 'strong_approval_candidate' || score.recommendation === 'approve_with_judgment') return 'approve';
  if (score.recommendation === 'likely_insufficient') return 'request_info';
  return null;
}

function createReviewPayload(
  action: 'approve' | 'reject' | 'request_info',
  notes: string,
  score: ProofRubricScore,
  scoring: ProofRubricScoring
) {
  const suggestedAction = suggestedActionForRubric(score);
  const adminOverrideUsed = !!suggestedAction && suggestedAction !== action;
  return {
    notes,
    rubric: score,
    scoring,
    adminOverrideUsed,
    adminOverrideReason: adminOverrideUsed ? (notes.trim() || `Admin chose ${action} despite rubric recommendation.`) : null,
  };
}

function RubricCard({
  ratings,
  onChange,
  score,
  scoring,
  recommendationLabel,
}: {
  ratings: ProofRubricRatings;
  onChange: (key: keyof ProofRubricRatings, value: number) => void;
  score: ProofRubricScore;
  scoring: ProofRubricScoring;
  recommendationLabel: string;
}) {
  const contextLabel = getProofRubricScoringContextLabel(scoring);
  return (
    <div className="bg-white border-2 border-on-surface p-5 rounded-2xl shadow-[5px_5px_0px_black] space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="text-sm font-display font-black uppercase italic tracking-tight">Human Proof Rubric</h4>
          <p className="mt-1 text-[9px] font-mono font-black uppercase opacity-40">
            Score the receipt. The final call is still yours.
          </p>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-mono font-black uppercase opacity-40">Weighted</p>
          <p className="text-3xl font-display font-black italic text-brand-orange leading-none">{score.weightedScore}</p>
        </div>
      </div>

      <div className="rounded-xl border-2 border-brand-orange/30 bg-brand-orange/5 p-4 font-mono uppercase">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] font-black text-brand-orange">{contextLabel}</p>
            {scoring.scoringMode === 'starter' ? (
              <p className="mt-1 text-[9px] font-black text-on-surface/55">Up to 100 XP can be awarded.</p>
            ) : (
              <p className="mt-1 text-[9px] font-black text-on-surface/55">
                Up to 225 XP is currently awardable. 25 XP remains classified for future bonus conditions.
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-[9px] font-black opacity-45">Mission Potential</p>
            <p className="text-2xl font-display font-black italic leading-none">{scoring.maxUiPotentialXp} XP</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {PROOF_RUBRIC_CATEGORIES.map(category => (
          <div key={category.id} className="rounded-xl border border-on-surface/10 bg-[#FAF8F5] p-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-mono font-black uppercase">{category.label}</p>
                <p className="text-[9px] font-mono uppercase opacity-45">{category.description}</p>
              </div>
              <p className="text-[9px] font-mono font-black uppercase text-brand-orange">
                Weight {category.weight}% · {ratings[category.id]}/4
              </p>
            </div>
            <div className="mt-3 grid grid-cols-5 gap-1.5">
              {category.ratings.map(rating => {
                const selected = ratings[category.id] === rating.value;
                return (
                  <button
                    type="button"
                    key={rating.value}
                    onClick={() => onChange(category.id, rating.value)}
                    className={cn(
                      "min-h-16 rounded-lg border-2 px-1.5 py-2 text-center font-mono text-[8px] font-black uppercase leading-tight transition-all",
                      selected
                        ? "border-on-surface bg-brand-orange text-white shadow-[2px_2px_0px_black]"
                        : "border-on-surface/15 bg-white text-on-surface/55 hover:border-brand-orange hover:text-on-surface"
                    )}
                  >
                    <span className="block text-sm leading-none">{rating.value}</span>
                    <span>{rating.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-3 rounded-xl border-2 border-on-surface bg-on-surface text-white p-4 font-mono text-[10px] uppercase sm:grid-cols-4">
        <div>
          <p className="opacity-45 font-black">Raw</p>
          <p className="text-lg font-black">{score.rawScore} / 20</p>
        </div>
        <div>
          <p className="opacity-45 font-black">Rubric Quality</p>
          <p className="text-lg font-black">{score.normalizedScore} / 100</p>
        </div>
        <div>
          <p className="opacity-45 font-black">Admin Awardable XP</p>
          <p className="text-lg font-black text-brand-lime">{scoring.awardedXp} / {scoring.maxAdminAwardableXp}</p>
        </div>
        <div>
          <p className="opacity-45 font-black">Reserved Potential</p>
          <p className="text-lg font-black">{scoring.reservedPotentialXp} XP</p>
        </div>
        <div>
          <p className="opacity-45 font-black">Recommendation</p>
          <p className="text-sm font-black text-brand-lime">{recommendationLabel}</p>
        </div>
        <div>
          <p className="opacity-45 font-black">Mission Potential</p>
          <p className="text-sm font-black">{scoring.maxUiPotentialXp} XP</p>
        </div>
        <div className="sm:col-span-4 border-t border-white/10 pt-3 text-[9px] leading-relaxed opacity-75">
          Weighted score = mission match/4 x 40 + clarity/4 x 25 + trust/4 x 20 + note/4 x 10 + energy/4 x 5.
          {scoring.reservedPotentialXp > 0 && (
            <span className="block mt-2 text-brand-lime">
              The classified {scoring.reservedPotentialXp} XP is reserved potential, not a missing review field.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function SwipeView({ entry, onAction, busy }: any) {
  const existingRubric = entry.rubric || {};
  const [ratings, setRatings] = React.useState<ProofRubricRatings>(() => ({
    missionMatch: Number.isFinite(existingRubric.missionMatch) ? existingRubric.missionMatch : DEFAULT_PROOF_RUBRIC_RATINGS.missionMatch,
    proofClarity: Number.isFinite(existingRubric.proofClarity) ? existingRubric.proofClarity : DEFAULT_PROOF_RUBRIC_RATINGS.proofClarity,
    authenticity: Number.isFinite(existingRubric.authenticity) ? existingRubric.authenticity : DEFAULT_PROOF_RUBRIC_RATINGS.authenticity,
    fieldNoteQuality: Number.isFinite(existingRubric.fieldNoteQuality) ? existingRubric.fieldNoteQuality : DEFAULT_PROOF_RUBRIC_RATINGS.fieldNoteQuality,
    fieldtripEnergy: Number.isFinite(existingRubric.fieldtripEnergy) ? existingRubric.fieldtripEnergy : DEFAULT_PROOF_RUBRIC_RATINGS.fieldtripEnergy,
  }));
  const [reviewNote, setReviewNote] = React.useState(entry.reviewNotes || entry.adminNotes || '');

  React.useEffect(() => {
    const rubric = entry.rubric || {};
    setRatings({
      missionMatch: Number.isFinite(rubric.missionMatch) ? rubric.missionMatch : DEFAULT_PROOF_RUBRIC_RATINGS.missionMatch,
      proofClarity: Number.isFinite(rubric.proofClarity) ? rubric.proofClarity : DEFAULT_PROOF_RUBRIC_RATINGS.proofClarity,
      authenticity: Number.isFinite(rubric.authenticity) ? rubric.authenticity : DEFAULT_PROOF_RUBRIC_RATINGS.authenticity,
      fieldNoteQuality: Number.isFinite(rubric.fieldNoteQuality) ? rubric.fieldNoteQuality : DEFAULT_PROOF_RUBRIC_RATINGS.fieldNoteQuality,
      fieldtripEnergy: Number.isFinite(rubric.fieldtripEnergy) ? rubric.fieldtripEnergy : DEFAULT_PROOF_RUBRIC_RATINGS.fieldtripEnergy,
    });
    setReviewNote(entry.reviewNotes || entry.adminNotes || '');
  }, [entry.id, entry.entryId, entry.rubric, entry.reviewNotes, entry.adminNotes]);

  const score = React.useMemo(() => calculateProofRubricScore(ratings), [ratings]);
  const scoring = React.useMemo(() => getProofRubricScoring(score, entry), [score, entry]);
  const recommendationLabel = getProofRubricRecommendationLabel(score.recommendation);
  const handleDecision = (action: 'approve' | 'reject' | 'request_info') => {
    onAction(action, createReviewPayload(action, reviewNote, score, scoring));
  };

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

             <RubricCard
               ratings={ratings}
               onChange={(key, value) => setRatings(prev => ({ ...prev, [key]: value }))}
               score={score}
               scoring={scoring}
               recommendationLabel={recommendationLabel}
             />

             <div className="bg-white border-2 border-on-surface p-5 rounded-2xl shadow-[5px_5px_0px_black] space-y-3">
                <h4 className="text-[9px] font-mono font-black uppercase opacity-40">Admin Review Note</h4>
                <textarea
                  value={reviewNote}
                  onChange={(event) => setReviewNote(event.target.value)}
                  placeholder="Leave a useful note for the player, future admins, or the training label archive."
                  className="w-full min-h-24 resize-y rounded-xl border-2 border-on-surface/20 bg-[#FAF8F5] p-3 font-mono text-xs outline-none focus:border-brand-orange"
                />
             </div>

             {/* Action Grid */}
             <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => handleDecision('approve')}
                  disabled={busy}
                  className="col-span-2 py-6 bg-brand-lime text-on-surface border-4 border-on-surface shadow-[8px_8px_0px_black] flex flex-col items-center justify-center gap-2 group hover:shadow-[4px_4px_0px_black] active:translate-y-1 transition-all"
                >
                   <Check className="w-8 h-8 group-hover:scale-125 transition-transform" />
                   <span className="font-display text-xl font-black uppercase italic tracking-tighter">{busy ? 'WORKING...' : 'APPROVE_PROTOCOL'}</span>
                </button>
                <button 
                  onClick={() => handleDecision('request_info')}
                  disabled={busy}
                  className="py-4 bg-[#FFDD00] text-on-surface border-4 border-on-surface shadow-[6px_6px_0px_black] flex items-center justify-center gap-2 font-display font-black uppercase italic text-sm hover:shadow-[2px_2px_0px_black] active:translate-y-1 transition-all"
                >
                   <Clock className="w-4 h-4" /> REQ_INFO
                </button>
                <button 
                  onClick={() => handleDecision('reject')}
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
                         disabled={busyId === (e.entryId || e.submissionId || e.id)}
                         onClick={() => onAction(e.entryId || e.submissionId || e.id, 'approve')}
                         className="p-2 border border-on-surface rounded bg-brand-lime hover:bg-on-surface hover:text-white disabled:opacity-40"
                         title="Approve"
                       >
                          <Check className="w-3 h-3" />
                       </button>
                       <button
                         disabled={busyId === (e.entryId || e.submissionId || e.id)}
                         onClick={() => onAction(e.entryId || e.submissionId || e.id, 'request_info')}
                         className="p-2 border border-on-surface rounded bg-[#FFDD00] hover:bg-on-surface hover:text-white disabled:opacity-40"
                         title="Needs more proof"
                       >
                          <Clock className="w-3 h-3" />
                       </button>
                       <button
                         disabled={busyId === (e.entryId || e.submissionId || e.id)}
                         onClick={() => onAction(e.entryId || e.submissionId || e.id, 'reject')}
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
