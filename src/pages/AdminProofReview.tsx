import React, { useState, useEffect, useMemo } from 'react';
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
  getExplicitRatedCategories,
  getProofRubricScoring,
  getProofRubricScoringContextLabel,
  getProofRubricRecommendationLabel,
  isRubricFullyRated,
  PROOF_RUBRIC_CATEGORIES,
  type ProofRubricScoring,
  type ProofRubricRatings,
  type ProofRubricScore
} from '../logic/proofRubric';
import {
  calculateMissionScore,
  DEFAULT_FIELD_NOTE_TEXT,
  DEFAULT_HINT_PENALTY_PERCENT,
  resolveParticipationSignals,
  toScoringSnapshot,
  type ScoreCalculationResult,
  type ScoringSnapshot,
} from '../logic/missionScoring';
import { requestVoiceNoteTranscript } from '../services/voiceNoteTranscriptService';
import { ALL_CHALLENGE_CARDS } from '../data/allChallengeBanks';
import {
  aiConfidencePercent,
  extractAiAnalysis,
  extractAiTrust,
  suggestAiRubric,
  suggestedActionForAiSuggestion,
  type AiSuggestedRubric,
  type AiSuggestionResult,
} from '../logic/aiSuggestion';
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
import { subscribeToAdminLogs } from '../services/moderationService';
import {
  computeReviewVelocity,
  entryTimestampMillis,
  filterQueueRecordsBySearch,
  formatWaitAge,
  queueDepthLabel,
  visibleQueueItems,
  QUEUE_PAGE_SIZE,
  REVIEW_VELOCITY_LOG_LIMIT,
  type QueueSortDirection,
} from '../logic/adminQueueStats';
import type { QueueRepairReport } from '../services/proofLifecycleService';

type AdminReviewScoring = ProofRubricScoring & { missionScoring: ScoringSnapshot };

export default function AdminProofReview() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending_review' | 'approved' | 'rejected' | 'needs_more_proof'>('pending_review');
  const [viewMode, setViewMode] = useState<'swipe' | 'queue'>('swipe');
  // Oldest first by default: the item that has waited longest is reviewed
  // first. Plain component state — this page keeps no view prefs in
  // localStorage.
  const [sortDirection, setSortDirection] = useState<QueueSortDirection>('oldest');
  const [visibleCount, setVisibleCount] = useState(QUEUE_PAGE_SIZE);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQueueEntryId, setSelectedQueueEntryId] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<AdminReviewQueueDiagnostics | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  // Review velocity is computed from adminLogs (proof-review decisions in
  // the last 24h), never hardcoded. '—' until the first snapshot lands.
  const [velocity, setVelocity] = useState('—');
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [repairingQueue, setRepairingQueue] = useState(false);
  const [repairReport, setRepairReport] = useState<QueueRepairReport | null>(null);
  const [grantingBypass, setGrantingBypass] = useState(false);
  const [starterBypassReport, setStarterBypassReport] = useState<StarterBypassReport | null>(null);
  const [slottingOrphans, setSlottingOrphans] = useState(false);
  const [orphanSlotReport, setOrphanSlotReport] = useState<OrphanSlotReport | null>(null);

  const { isAdmin } = useTheme();
  const { profile } = useApp();
  const navigate = useNavigate();
  const isAdminAuthorized = isAdmin || profile?.role === 'admin' || (profile as any)?.isAdmin;
  const getActionId = (record: any) => String(record?.canonicalEntryResolved ? record?.entryId : '');

  useEffect(() => {
    if (!isAdminAuthorized) {
      setLoading(false);
      return;
    }

    // Proofs listener
    const unsub = subscribeToAdminPendingReviews(filter, (entries) => {
      setReviews(entries);
      setQueryError(null);
      setLoading(false);
    }, (error: any) => {
      console.error('[AdminProofReview] Reviews subscription denied:', error);
      setQueryError(error?.message || String(error));
      setLoading(false);
    }, setDiagnostics, { sortDirection });

    return () => {
      unsub();
    };
  }, [isAdminAuthorized, filter, sortDirection]);

  // Review velocity: proof-review decisions per hour over the last 24h,
  // counted from adminLogs. Refreshes live as new decision logs arrive.
  useEffect(() => {
    if (!isAdminAuthorized) return;
    const unsub = subscribeToAdminLogs(REVIEW_VELOCITY_LOG_LIMIT, (logs) => {
      setVelocity(computeReviewVelocity(logs, {
        limitReached: logs.length >= REVIEW_VELOCITY_LOG_LIMIT,
      }).display);
    });
    return () => {
      unsub();
    };
  }, [isAdminAuthorized]);

  useEffect(() => {
    if (reviews.length === 0) {
      setSelectedQueueEntryId(null);
      return;
    }
    if (!selectedQueueEntryId || !reviews.some(record => getActionId(record) === selectedQueueEntryId || record.id === selectedQueueEntryId)) {
      const firstResolvable = reviews.find(record => getActionId(record)) || reviews[0];
      setSelectedQueueEntryId(getActionId(firstResolvable) || firstResolvable.id || null);
    }
  }, [reviews, selectedQueueEntryId]);

  const handleAction = async (
    id: string,
    action: 'approve' | 'reject' | 'request_info',
    review?: { notes: string; rubric: ProofRubricScore; scoring: AdminReviewScoring; suggestedRubric?: AiSuggestedRubric | null; suggestedRubricApplied?: boolean; adminOverrideUsed: boolean; adminOverrideReason: string | null }
  ) => {
    if (!id) {
      alert('Missing source entry. This review record must be repaired or archived before it can be actioned.');
      return;
    }
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
      scoring: review.scoring,
      suggestedRubric: review.suggestedRubric ?? null,
      suggestedRubricApplied: review.suggestedRubricApplied === true
    };
    try {
      const record = reviews.find(item => String(item.entryId || '') === id || String(item.id || '') === id);
      const reviewContext = {
        reviewId: record?.reviewId || null,
        proofReviewId: record?.proofReviewId || null,
        proofId: record?.proofId || null,
        submissionId: record?.submissionId || null,
        sourcePath: record?.sourcePath || null,
        sourceCollection: record?.sourceCollection || null,
        idAliases: record?.idAliases || []
      };
      console.info('[AdminProofReview] Review action dispatch', {
        actionType: action,
        reviewId: record?.proofReviewId || record?.reviewId || null,
        canonicalEntryId: id,
        incomingIdAliases: record?.idAliases || [],
        sourcePath: record?.sourcePath || null,
        sourceCollection: record?.sourceCollection || null,
        canonicalEntryPath: record?.canonicalEntryPath || null,
        databaseId: 'ai-studio-6bdf91b5-28e9-46f3-ae49-89cf99e2d88a',
        userId: record?.userId || null,
      });
      if (action === 'approve') {
        await approveSubmission(id, notes, metadata, reviewContext);
      } else if (action === 'request_info') {
        await requestMoreProof(id, notes, metadata, reviewContext);
      } else {
        await rejectSubmission(id, notes, metadata, reviewContext);
      }
    } catch (err: any) {
      console.error('[AdminProofReview] Review action failed:', {
        actionType: action,
        canonicalEntryId: id,
        failureReason: err?.message || String(err),
        details: err?.details || null
      });
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

  // Search (Q10) filters the merged queue records BEFORE paging, so the
  // swipe view and the table view always render the same list. Clearing
  // the box returns the input unchanged, restoring the full list.
  const filteredReviews = useMemo(
    () => filterQueueRecordsBySearch(reviews, searchQuery),
    [reviews, searchQuery],
  );
  const hasActiveSearch = searchQuery.trim().length > 0;

  const selectedQueueEntry = filteredReviews.find(record => getActionId(record) === selectedQueueEntryId || record.id === selectedQueueEntryId) || filteredReviews[0];
  const hasQueueIntegrityWarning = !!diagnostics && diagnostics.reviewableButNotRendered.length > 0;
  const hasPermissionOrQueryFailure = !!queryError || !!diagnostics?.errors.length;
  // Unified queue numbers (same as the admin board, on every tab): the
  // merged reviewable pending count from diagnostics — never the
  // per-tab rendered length, which goes stale off the pending tab.
  const pendingCount = diagnostics?.pendingReviewCount ?? 0;
  const queueDepth = queueDepthLabel(pendingCount);
  const visibleReviews = visibleQueueItems(filteredReviews, visibleCount);

  const handleFilterChange = (next: typeof filter) => {
    setFilter(next);
    setVisibleCount(QUEUE_PAGE_SIZE);
  };

  const handleSortChange = (next: QueueSortDirection) => {
    setSortDirection(next);
    setVisibleCount(QUEUE_PAGE_SIZE);
  };

  const handleSearchChange = (next: string) => {
    setSearchQuery(next);
    setVisibleCount(QUEUE_PAGE_SIZE);
  };

  return (
    <AdminLayout 
      title="Proof Review Console" 
    >
      <div className="space-y-8">
        
        {/* Review Monitors (Stats) — every value is computed live:
            pending + depth from the merged diagnostics count (same number
            the board shows), velocity from adminLogs decisions. */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
           <MonitorCard title="Current Queue" value={pendingCount} icon={Shield} />
           <MonitorCard title="Review Velocity" value={velocity} icon={Zap} />
           <MonitorCard title="System Depth" value={queueDepth} status={queueDepth === 'Clear' ? 'green' : 'yellow'} icon={Activity} />
        </section>
        {diagnostics?.windowCapped && (
          <p className="font-mono text-[10px] font-black uppercase tracking-widest text-brand-orange">
            Queue window: oldest 500 records loaded — resolve items to bring newer ones into view.
          </p>
        )}

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
                  onClick={() => handleFilterChange(f)}
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
              <div className="flex bg-on-surface/5 p-1 rounded-xl" role="group" aria-label="Queue order">
                 <button
                  type="button"
                  onClick={() => handleSortChange('oldest')}
                  className={cn("px-3 py-2 rounded-lg font-mono text-[10px] font-black uppercase tracking-widest transition-all", sortDirection === 'oldest' ? "bg-white shadow-sm text-brand-orange" : "text-on-surface/40 hover:text-on-surface")}
                 >
                   Oldest first
                 </button>
                 <button
                  type="button"
                  onClick={() => handleSortChange('newest')}
                  className={cn("px-3 py-2 rounded-lg font-mono text-[10px] font-black uppercase tracking-widest transition-all", sortDirection === 'newest' ? "bg-white shadow-sm text-brand-orange" : "text-on-surface/40 hover:text-on-surface")}
                 >
                   Newest first
                 </button>
              </div>
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
                   value={searchQuery}
                   onChange={(event) => handleSearchChange(event.target.value)}
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
           ) : filteredReviews.length === 0 ? (
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
                      : hasActiveSearch
                        ? `No records match "${searchQuery.trim()}". Clear the search to see the full queue.`
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
	                entry={filteredReviews[0]} 
	                busy={actionBusyId === getActionId(filteredReviews[0])}
	                onAction={(action: any, review: any) => handleAction(getActionId(filteredReviews[0]), action, review)}
	              />
	           ) : (
              <div className="space-y-8">
                <QueueView
                  entries={visibleReviews}
                  total={filteredReviews.length}
                  visibleCount={visibleReviews.length}
                  onLoadMore={() => setVisibleCount(prev => Math.min(filteredReviews.length, prev + QUEUE_PAGE_SIZE))}
                  selectedId={selectedQueueEntryId}
                  onSelect={(entry: any) => setSelectedQueueEntryId(getActionId(entry) || entry.id)}
                />
                {selectedQueueEntry && (
                  <SwipeView
                    key={`${selectedQueueEntry.sourcePath || selectedQueueEntry.id}-${getActionId(selectedQueueEntry)}`}
                    entry={selectedQueueEntry}
                    busy={actionBusyId === getActionId(selectedQueueEntry)}
                    onAction={(action: any, review: any) => handleAction(getActionId(selectedQueueEntry), action, review)}
                  />
                )}
              </div>
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
          <DiagnosticRow label="Pending (reviewable, all tabs)" value={String(diagnostics?.pendingReviewCount ?? 0)} />
          <DiagnosticRow label="Oldest pending waiting" value={diagnostics?.oldestPendingAtMs ? formatWaitAge(diagnostics.oldestPendingAtMs) : '—'} />
          <DiagnosticRow label="Queue window" value={diagnostics?.windowCapped ? 'oldest 500 loaded — resolve items to bring newer ones into view' : 'all records loaded'} danger={!!diagnostics?.windowCapped} />
          <DiagnosticRow label="Records per status" value={statusRows} />
          <DiagnosticRow label="Failed/incomplete" value={String(diagnostics?.failedOrIncompleteCount ?? 0)} danger={(diagnostics?.failedOrIncompleteCount ?? 0) > 0} />
          <DiagnosticRow label="Missing required fields" value={String(diagnostics?.missingRequiredFieldsCount ?? 0)} danger={(diagnostics?.missingRequiredFieldsCount ?? 0) > 0} />
          <DiagnosticRow label="Missing image reference" value={String(diagnostics?.missingImageReferenceCount ?? 0)} danger={(diagnostics?.missingImageReferenceCount ?? 0) > 0} />
          <DiagnosticRow label="Missing linkage" value={String(diagnostics?.missingLinkageCount ?? 0)} danger={(diagnostics?.missingLinkageCount ?? 0) > 0} />
          <DiagnosticRow label="Unresolved canonical entries" value={String(diagnostics?.unresolvedCanonicalEntryCount ?? 0)} danger={(diagnostics?.unresolvedCanonicalEntryCount ?? 0) > 0} />
          <DiagnosticRow label="Invalid status values" value={String(diagnostics?.invalidStatusCount ?? 0)} danger={(diagnostics?.invalidStatusCount ?? 0) > 0} />
          <DiagnosticRow
            label="Reviewable not rendered"
            value={diagnostics?.reviewableButNotRendered.length ? diagnostics.reviewableButNotRendered.join(', ') : 'none'}
            danger={!!diagnostics?.reviewableButNotRendered.length}
          />
          {queryError && <DiagnosticRow label="Query error" value={queryError} danger />}
          {diagnostics?.unresolvedCanonicalEntries && diagnostics.unresolvedCanonicalEntries.length > 0 && (
            <div className="mt-2 rounded-xl border border-red-300 bg-red-50 p-3">
              <div className="font-black text-red-700">Missing source entry diagnostics</div>
              <div className="mt-2 max-h-36 overflow-y-auto space-y-1">
                {diagnostics.unresolvedCanonicalEntries.slice(0, 12).map(item => (
                  <div key={`${item.sourcePath}-${item.attemptedEntryId}`} className="break-all text-red-700">
                    reviewId={item.reviewId || 'unknown'} attemptedEntryId={item.attemptedEntryId || 'none'} userId={item.userId || 'unknown'} source={item.sourcePath} reason={item.reason}
                  </div>
                ))}
              </div>
            </div>
          )}
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

/**
 * The action the rubric leans toward. Every non-approval band means "don't
 * approve yet" — including 'needs_closer_review'. Returning null for that
 * band used to swallow the override (Q9): approving a 50-point default
 * rubric recorded no judgment at all. Aligned with
 * suggestedActionForAiSuggestion, which maps both non-approval bands to
 * request_info.
 */
function suggestedActionForRubric(score: ProofRubricScore): 'approve' | 'request_info' {
  if (score.recommendation === 'strong_approval_candidate' || score.recommendation === 'approve_with_judgment') return 'approve';
  return 'request_info';
}

function createReviewPayload(
  action: 'approve' | 'reject' | 'request_info',
  notes: string,
  score: ProofRubricScore,
  scoring: ProofRubricScoring,
  missionScoring: ScoreCalculationResult,
  aiSuggestion?: { available: AiSuggestedRubric | null; applied: AiSuggestedRubric | null }
) {
  // When the admin applied the AI suggestion, the action is measured against
  // the suggestion's recommendation band (both non-approval bands mean
  // "don't approve yet"). Otherwise the existing rubric-band check applies.
  const suggestedAction = aiSuggestion?.applied
    ? suggestedActionForAiSuggestion(aiSuggestion.applied.recommendation)
    : suggestedActionForRubric(score);
  const adminOverrideUsed = !!suggestedAction && suggestedAction !== action;
  return {
    notes,
    rubric: score,
    scoring: { ...scoring, missionScoring: toScoringSnapshot(missionScoring) },
    suggestedRubric: aiSuggestion?.available ?? null,
    suggestedRubricApplied: aiSuggestion?.applied != null,
    adminOverrideUsed,
    adminOverrideReason: adminOverrideUsed ? (notes.trim() || `Admin chose ${action} despite ${aiSuggestion?.applied ? 'the AI suggestion' : 'the rubric recommendation'}.`) : null,
  };
}

function RubricCard({
  ratings,
  ratedCategories,
  onChange,
  score,
  scoring,
  missionScoring,
  recommendationLabel,
  suggestionMarks,
}: {
  ratings: ProofRubricRatings;
  /** Q9: categories carrying an explicit judgment. Unrated categories show no selected button and "—/4" — the all-2s defaults are display placeholders, not ratings. */
  ratedCategories?: ReadonlySet<keyof ProofRubricRatings>;
  onChange: (key: keyof ProofRubricRatings, value: number) => void;
  score: ProofRubricScore;
  scoring: ProofRubricScoring;
  missionScoring: ScoreCalculationResult;
  recommendationLabel: string;
  /** Per-category AI suggestion state: 'suggested' (filled by the AI button) or 'adjusted' (admin changed it after). */
  suggestionMarks?: Partial<Record<keyof ProofRubricRatings, 'suggested' | 'adjusted'>>;
}) {
  const contextLabel = getProofRubricScoringContextLabel(scoring);
  const ratedCount = ratedCategories == null ? PROOF_RUBRIC_CATEGORIES.length : PROOF_RUBRIC_CATEGORIES.filter(category => ratedCategories.has(category.id)).length;
  const allRated = ratedCount === PROOF_RUBRIC_CATEGORIES.length;
  return (
    <div className="bg-white border-2 border-on-surface p-5 rounded-2xl shadow-[5px_5px_0px_black] space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="text-sm font-display font-black uppercase italic tracking-tight">Human Proof Rubric</h4>
          <p className="mt-1 text-[9px] font-mono font-black uppercase opacity-40">
            Score the receipt. The final call is still yours.
          </p>
          {ratedCategories != null && !allRated && (
            <p className="mt-2 font-mono text-[10px] font-black uppercase text-brand-orange">
              {ratedCount} of 5 rated — approve unlocks when all five are rated.
            </p>
          )}
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
                Base rubric ceiling is 225 XP before validated mission bonuses.
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-[9px] font-black opacity-45">Base Maximum</p>
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
                Weight {category.weight}% · {ratedCategories != null && !ratedCategories.has(category.id) ? '—' : ratings[category.id]}/4
                {ratedCategories != null && !ratedCategories.has(category.id) && (
                  <span className="ml-2 rounded-full bg-on-surface/10 px-2 py-0.5 text-on-surface/60">Not rated</span>
                )}
                {suggestionMarks?.[category.id] === 'suggested' && (
                  <span className="ml-2 rounded-full bg-brand-lime px-2 py-0.5 text-on-surface">AI suggested</span>
                )}
                {suggestionMarks?.[category.id] === 'adjusted' && (
                  <span className="ml-2 rounded-full bg-brand-orange px-2 py-0.5 text-white">Adjusted from AI</span>
                )}
              </p>
            </div>
            <div className="mt-3 grid grid-cols-5 gap-1.5">
              {category.ratings.map(rating => {
                const selected = (ratedCategories == null || ratedCategories.has(category.id)) && ratings[category.id] === rating.value;
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
          <p className="text-lg font-black text-brand-lime">{missionScoring.reviewerBaseScore} / {missionScoring.adjustedMaxScore}</p>
        </div>
        <div>
          <p className="opacity-45 font-black">Recommendation</p>
          <p className="text-sm font-black text-brand-lime">{recommendationLabel}</p>
        </div>
        <div>
          <p className="opacity-45 font-black">Base Maximum</p>
          <p className="text-sm font-black">{scoring.maxUiPotentialXp} XP</p>
        </div>
        <div className="sm:col-span-4 border-t border-white/10 pt-3 text-[9px] leading-relaxed opacity-75">
          Weighted score = mission match/4 x 40 + clarity/4 x 25 + trust/4 x 20 + note/4 x 10 + energy/4 x 5.
        </div>
      </div>

      <div className="rounded-xl border-2 border-brand-cyan/40 bg-brand-cyan/5 p-4">
        <h5 className="font-display text-sm font-black uppercase italic">Mission Scoring</h5>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 font-mono text-[9px] uppercase sm:grid-cols-4">
          <div><dt className="opacity-45">Original maximum</dt><dd className="mt-1 text-sm font-black">{missionScoring.baseMaxScore} XP</dd></div>
          <div><dt className="opacity-45">Hint used</dt><dd className="mt-1 text-sm font-black">{missionScoring.hintUsed ? 'Yes' : 'No'}</dd></div>
          <div><dt className="opacity-45">Hint adjustment</dt><dd className="mt-1 text-sm font-black">-{missionScoring.hintPenaltyPoints} XP</dd></div>
          <div><dt className="opacity-45">Reviewer maximum</dt><dd className="mt-1 text-sm font-black">{missionScoring.adjustedMaxScore} XP</dd></div>
          <div><dt className="opacity-45">Reviewer award</dt><dd className="mt-1 text-sm font-black">{missionScoring.reviewerBaseScore} XP</dd></div>
          <div><dt className="opacity-45">Photo subject layer</dt><dd className="mt-1 text-sm font-black">+{missionScoring.participationLayers.photoSubject} XP</dd></div>
          <div><dt className="opacity-45">Field note layer</dt><dd className="mt-1 text-sm font-black">+{missionScoring.participationLayers.fieldNote} XP</dd></div>
          <div><dt className="opacity-45">Location layer</dt><dd className="mt-1 text-sm font-black">+{missionScoring.participationLayers.location} XP</dd></div>
          <div><dt className="opacity-45">Eligible bonus</dt><dd className="mt-1 text-sm font-black">{missionScoring.appliedBonus?.label || 'None'}</dd></div>
          <div><dt className="opacity-45">Multiplier</dt><dd className="mt-1 text-sm font-black">{missionScoring.appliedMultiplier}×</dd></div>
          <div><dt className="opacity-45">Final awarded score</dt><dd className="mt-1 text-sm font-black text-brand-orange">{missionScoring.finalScore} XP</dd></div>
        </dl>
        {missionScoring.hintUsed && (
          <p className="mt-3 text-xs font-semibold text-brand-orange">
            The hint permanently reduced this attempt's reviewer maximum. The server enforces this cap again on save.
          </p>
        )}
      </div>

      <div className="rounded-xl border border-on-surface/15 bg-[#FAF8F5] p-4 text-xs leading-relaxed text-on-surface/70">
        <p><strong>Hints:</strong> A hint reduces that attempt's maximum base score. Score proof quality normally; the result cannot exceed the adjusted maximum.</p>
        <p className="mt-2"><strong>Bonuses:</strong> Review the base proof only. The server validates and applies the eligible multiplier after approval.</p>
        <p className="mt-2"><strong>Stacking:</strong> Hint penalties apply first. If several bonuses qualify, only the highest multiplier applies.</p>
      </div>
    </div>
  );
}

/** The client preview pipeline (rubric → awarded XP → hint/retry → layers → multiplier), shared by the live receipt and the AI-suggestion preview. */
function computePreviewMissionScoring(entry: any, scoring: ProofRubricScoring): ScoreCalculationResult {
  const attempt = entry.missionAttempt || {};
  return calculateMissionScore({
    baseMaxScore: scoring.maxAdminAwardableXp,
    reviewerBaseScore: scoring.awardedXp,
    hintUsed: attempt.hintUsed === true || entry.hintUsed === true,
    hintPenaltyPercent: Number(
      attempt.hintPenaltyPercent ?? (entry.hintUsed ? DEFAULT_HINT_PENALTY_PERCENT : 0),
    ),
    retryMultiplier: entry.isRetry === true ? Number(entry.retryPointMultiplier ?? 0.5) : 1,
    perkPoints: 0,
    participation: resolveParticipationSignals({
      photoSubjectVerified: (entry as any).participation?.photoSubjectVerified,
      aiAnalysisResult: (entry as any).aiAnalysisResult,
      proofCheckResult: (entry as any).proofCheckResult,
      fieldNoteRaw: (entry as any).fieldNoteRaw,
      fieldNote: (entry as any).fieldNote,
      note: (entry as any).note,
      voiceNotePresent: (entry as any).voiceNotePresent === true,
      locationVerified: (entry as any).locationVerified ?? (entry as any).participation?.locationVerified,
      latitude: (entry as any).latitude,
      longitude: (entry as any).longitude,
      // Crew layer: the entry doc carries crewContext (stamped by
      // AppContext.addEntry); the card is resolved from the registry by
      // the entry's trip/mission/challenge id.
      submittedAsCrewMember: (entry as any).crewContext?.submittedAsCrewMember === true,
      groupConfirmationCard: (
        ALL_CHALLENGE_CARDS.find(
          card => String(card.id) === String((entry as any).tripId ?? (entry as any).missionId ?? (entry as any).challengeId),
        )?.proofType || []
      ).includes('group-confirmation'),
    }),
    eligibleBonuses: Array.isArray(attempt.eligibleBonuses) ? attempt.eligibleBonuses : [],
  });
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

  // Voice-note text, Option A (Nov 20, 2026): the transcript lives on the
  // entry doc (server-written). Local state mirrors it so the button below
  // shows the result without waiting for the queue to refresh.
  const [transcript, setTranscript] = React.useState<string>(
    typeof entry.voiceNoteTranscript === 'string' ? entry.voiceNoteTranscript.trim() : ''
  );
  const [transcribing, setTranscribing] = React.useState(false);
  const [transcribeError, setTranscribeError] = React.useState<string | null>(null);

  const handleTranscribe = async () => {
    if (transcribing || !entry.id) return;
    setTranscribing(true);
    setTranscribeError(null);
    const result = await requestVoiceNoteTranscript(entry.id);
    setTranscribing(false);
    if (result) {
      setTranscript(result.transcript);
    } else {
      setTranscribeError('Transcription failed — the audio is still playable above. Nothing was saved.');
    }
  };

  // The swipe view reuses this component across entries (no key), so sync
  // the transcript when the entry changes; the queue view remounts per
  // entry via its key.
  React.useEffect(() => {
    setTranscript(typeof entry.voiceNoteTranscript === 'string' ? entry.voiceNoteTranscript.trim() : '');
    setTranscribeError(null);
    setTranscribing(false);
  }, [entry.id]);
  // The numeric ratings below start at the all-2s display defaults so the
  // live score updates as the admin rates, but the 2s are NOT judgments —
  // Approve stays disabled until all five categories are explicit. A stored
  // rubric counts as explicit: it was set by a prior human review. Applying
  // the AI suggestion marks the four mapped categories explicit, and
  // Fieldtrip Energy's current value counts as accepted with it.
  const [ratedCategories, setRatedCategories] = React.useState<Set<keyof ProofRubricRatings>>(
    () => getExplicitRatedCategories(existingRubric),
  );
  // analysis. Applying it fills the four mappable ratings and drafts the
  // note; Fieldtrip Energy stays manual. Changing a filled rating marks
  // that category "adjusted".
  const aiSuggestion = React.useMemo(() => suggestAiRubric(entry), [entry]);
  const [appliedSuggestion, setAppliedSuggestion] = React.useState<AiSuggestedRubric | null>(null);
  const [adjustedCategories, setAdjustedCategories] = React.useState<Set<keyof ProofRubricRatings>>(new Set());

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
    setRatedCategories(getExplicitRatedCategories(rubric));
    setAppliedSuggestion(null);
    setAdjustedCategories(new Set());
  }, [entry.id, entry.entryId, entry.rubric, entry.reviewNotes, entry.adminNotes]);

  const score = React.useMemo(() => calculateProofRubricScore(ratings), [ratings]);
  const scoring = React.useMemo(() => getProofRubricScoring(score, entry), [score, entry]);
  const missionScoring = React.useMemo(() => computePreviewMissionScoring(entry, scoring), [entry, scoring]);
  const recommendationLabel = getProofRubricRecommendationLabel(score.recommendation);

  // What the suggestion would pay if approved as-is (energy at its current
  // manual value). Runs the same preview pipeline as the live receipt.
  const suggestedScore = React.useMemo(() => {
    if (!aiSuggestion.available) return null;
    return calculateProofRubricScore({
      ...aiSuggestion.suggestion.ratings,
      fieldtripEnergy: ratings.fieldtripEnergy,
    });
  }, [aiSuggestion, ratings.fieldtripEnergy]);
  const suggestedScoring = React.useMemo(
    () => (suggestedScore ? getProofRubricScoring(suggestedScore, entry) : null),
    [suggestedScore, entry],
  );
  const suggestedMissionScoring = React.useMemo(
    () => (suggestedScoring ? computePreviewMissionScoring(entry, suggestedScoring) : null),
    [entry, suggestedScoring],
  );

  const applyAiSuggestion = () => {
    if (!aiSuggestion.available) return;
    const suggestion = aiSuggestion.suggestion;
    setRatings(prev => ({
      ...prev,
      missionMatch: suggestion.ratings.missionMatch,
      proofClarity: suggestion.ratings.proofClarity,
      authenticity: suggestion.ratings.authenticity,
      fieldNoteQuality: suggestion.ratings.fieldNoteQuality,
    }));
    setAppliedSuggestion(suggestion);
    setAdjustedCategories(new Set());
    // Applying the suggestion is an explicit judgment for the four mapped
    // categories. Fieldtrip Energy has no AI signal, but applying the
    // suggestion accepts its current value (default 2) — the admin still
    // sees it and can change it before approving.
    setRatedCategories(prev => {
      const next = new Set(prev);
      (Object.keys(suggestion.ratings) as Array<keyof typeof suggestion.ratings>).forEach(key => next.add(key));
      next.add('fieldtripEnergy');
      return next;
    });
    setReviewNote(suggestion.summary);
  };

  const handleRatingChange = (key: keyof ProofRubricRatings, value: number) => {
    setRatings(prev => ({ ...prev, [key]: value }));
    setRatedCategories(prev => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
    setAdjustedCategories(prev => {
      const next = new Set(prev);
      if (
        appliedSuggestion &&
        key in appliedSuggestion.ratings &&
        value !== appliedSuggestion.ratings[key as keyof typeof appliedSuggestion.ratings]
      ) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  };

  const suggestionMarks = React.useMemo(() => {
    if (!appliedSuggestion) return undefined;
    const marks: Partial<Record<keyof ProofRubricRatings, 'suggested' | 'adjusted'>> = {};
    (Object.keys(appliedSuggestion.ratings) as Array<keyof typeof appliedSuggestion.ratings>).forEach(key => {
      marks[key] = adjustedCategories.has(key) ? 'adjusted' : 'suggested';
    });
    return marks;
  }, [appliedSuggestion, adjustedCategories]);

  const entryResolved = entry.canonicalEntryResolved !== false && !!entry.entryId;
  // Q9: Approve unlocks only when every category carries an explicit
  // judgment (rated by hand, or filled + accepted via the AI suggestion).
  // Reject and Request info are never gated on the rubric — no award is at
  // stake there.
  const allRated = React.useMemo(() => isRubricFullyRated(ratedCategories), [ratedCategories]);
  const handleDecision = (action: 'approve' | 'reject' | 'request_info') => {
    if (!entryResolved) return;
    if (action === 'approve' && !allRated) return;
    onAction(action, createReviewPayload(action, reviewNote, score, scoring, missionScoring, {
      available: aiSuggestion.available ? aiSuggestion.suggestion : null,
      applied: appliedSuggestion,
    }));
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
             {(entry as any).voiceNoteUrl && (
               <div className="rounded-xl border-2 border-on-surface bg-white p-4">
                 <p className="font-mono text-[9px] font-black uppercase tracking-widest opacity-45">
                   Voice note ({(entry as any).voiceNoteDurationSec ?? '?'}s)
                 </p>
                 <audio controls src={(entry as any).voiceNoteUrl} className="mt-2 w-full" />
                 {(entry as any).voiceNotePresent === true && !transcript && (
                   <div className="mt-3 space-y-2">
                     <button
                       type="button"
                       onClick={handleTranscribe}
                       disabled={transcribing || !entry.id}
                       className="min-h-11 px-4 py-2 bg-on-surface text-brand-lime border-2 border-on-surface font-mono text-xs font-black uppercase tracking-widest shadow-[4px_4px_0px_black] active:shadow-none active:translate-y-1 transition-all disabled:opacity-50"
                     >
                       {transcribing ? 'Transcribing…' : 'Transcribe voice note'}
                     </button>
                     {transcribeError && (
                       <p className="font-mono text-xs font-bold text-red-700">{transcribeError}</p>
                     )}
                   </div>
                 )}
               </div>
             )}
             {!entryResolved && (
               <div className="rounded-2xl border-2 border-red-400 bg-red-50 p-5 font-mono text-[10px] uppercase text-red-700 shadow-[4px_4px_0px_rgba(0,0,0,0.35)]">
                 <div className="flex items-center gap-2 font-black">
                   <AlertCircle className="h-4 w-4" />
                   Missing source entry
                 </div>
                 <div className="mt-3 grid gap-1">
                   <div>reviewId: {entry.proofReviewId || entry.reviewId || 'unknown'}</div>
                   <div>attempted entryId: {entry.attemptedEntryId || entry.entryId || 'none'}</div>
                   <div>userId: {entry.userId || 'unknown'}</div>
                   <div>source: {entry.sourcePath || entry.sourceCollection || 'unknown'}</div>
                   <div>reason: {entry.canonicalEntryResolutionReason || 'unresolved'}</div>
                 </div>
                 <p className="mt-3 normal-case text-xs leading-relaxed">
                   This queue record is a review projection without a resolvable canonical entries document. Repair or archive it before approving so XP and mission state are not changed from the wrong source.
                 </p>
               </div>
             )}
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
                <div className="flex flex-wrap gap-2 pt-1 font-mono text-[9px] font-black uppercase tracking-wider">
                  <span className="border border-on-surface/20 bg-white px-2 py-1 text-on-surface/65">
                    {entry.deckName || entry.deckId || 'Unknown deck'}
                  </span>
                  <span className="border border-on-surface/20 bg-white px-2 py-1 text-on-surface/65">
                    ID: {entry.deckId || 'unknown'}
                  </span>
                  <span className="border border-brand-cyan/40 bg-brand-cyan/10 px-2 py-1 text-on-surface">
                    {entry.cardType || 'Signal'}
                  </span>
                  <span className="border border-brand-orange/30 bg-brand-orange/10 px-2 py-1 text-brand-orange">
                    {entry.status || entry.reviewStatus || 'pending_review'}
                  </span>
                </div>
             </div>

             <div className="bg-white border-2 border-on-surface p-6 rounded-2xl shadow-[6px_6px_0px_black]">
                {/* Voice-note text, Option A (Nov 20, 2026): this box used to
                    be headed "Field_Note_Transcription" while showing the
                    WRITTEN note — for voice-note-only entries that meant the
                    stamped default "A successful field trip entry." presented
                    as a transcription. Now the heading says what the text
                    actually is: the Gemini transcript when one exists, the
                    written field note otherwise, and neither is faked. */}
                <h4 className="text-[9px] font-mono font-black uppercase opacity-40 mb-3">
                  {transcript ? 'Voice_Note_Transcription' : 'Field_Note'}
                </h4>
                <p className="font-mono text-xs leading-relaxed italic border-l-4 border-brand-orange pl-4 bg-brand-orange/5 py-4">
                  "{transcript || (entry.fieldNote && entry.fieldNote !== DEFAULT_FIELD_NOTE_TEXT ? entry.fieldNote : 'No written note — voice note only.')}"
                </p>
             </div>

             <AiSuggestionCard
               entry={entry}
               suggestion={aiSuggestion}
               suggestedFinalXp={suggestedMissionScoring?.finalScore ?? null}
               suggestedWeighted={suggestedScore?.weightedScore ?? null}
               applied={appliedSuggestion != null}
               onApply={applyAiSuggestion}
             />

             <RubricCard
               ratings={ratings}
               ratedCategories={ratedCategories}
               onChange={handleRatingChange}
               score={score}
               scoring={scoring}
               missionScoring={missionScoring}
               recommendationLabel={recommendationLabel}
               suggestionMarks={suggestionMarks}
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
	                  disabled={busy || !entryResolved || !allRated}
                  className="col-span-2 py-6 bg-brand-lime text-on-surface border-4 border-on-surface shadow-[8px_8px_0px_black] flex flex-col items-center justify-center gap-2 group hover:shadow-[4px_4px_0px_black] active:translate-y-1 transition-all disabled:opacity-40 disabled:shadow-none"
                >
                   <Check className="w-8 h-8 group-hover:scale-125 transition-transform" />
                   <span className="font-display text-xl font-black uppercase italic tracking-tighter">{busy ? 'WORKING...' : 'APPROVE_PROTOCOL'}</span>
                </button>
	                <button 
	                  onClick={() => handleDecision('request_info')}
	                  disabled={busy || !entryResolved}
                  className="py-4 bg-[#FFDD00] text-on-surface border-4 border-on-surface shadow-[6px_6px_0px_black] flex items-center justify-center gap-2 font-display font-black uppercase italic text-sm hover:shadow-[2px_2px_0px_black] active:translate-y-1 transition-all"
                >
                   <Clock className="w-4 h-4" /> REQ_INFO
                </button>
	                <button 
	                  onClick={() => handleDecision('reject')}
	                  disabled={busy || !entryResolved}
                  className="py-4 bg-rose-500 text-white border-4 border-on-surface shadow-[6px_6px_0px_black] flex items-center justify-center gap-2 font-display font-black uppercase italic text-sm hover:shadow-[2px_2px_0px_black] active:translate-y-1 transition-all"
                >
                   <X className="w-4 h-4" /> REJECT
                </button>
             </div>
             {entryResolved && !allRated && (
               <p className="rounded-xl border-2 border-brand-orange/40 bg-brand-orange/5 p-3 font-mono text-[10px] font-black uppercase text-on-surface/70">
                 Rate all 5 categories — or apply the AI suggestion — to unlock Approve. Reject and Req Info don&apos;t need a rubric.
               </p>
             )}
          </div>
       </div>

       {/* Meta Strip */}
       <footer className="pt-8 border-t-2 border-on-surface/10 flex flex-wrap gap-8 text-[9px] font-mono font-black uppercase opacity-40">
          <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-on-surface rounded-full" /> UID: {entry.userId}</div>
          <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-on-surface rounded-full" /> Submitted: {entry.createdAt?.toDate ? format(entry.createdAt.toDate(), 'MM/dd HH:mm') : entry.submittedAt?.toDate ? format(entry.submittedAt.toDate(), 'MM/dd HH:mm') : 'Unknown'}</div>
          <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-brand-orange rounded-full" /> Waiting: {formatWaitAge(entryTimestampMillis(entry))}</div>
          <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-on-surface rounded-full" /> Confidence: {(() => { const pct = aiConfidencePercent(entry); return pct == null ? '—' : `${pct}%`; })()}</div>
       </footer>
    </div>
  );
}

/**
 * The AI read block (Option A): what Gemini already concluded about this
 * submission, plus a one-tap button that pre-fills the rubric from it.
 * The suggestion never submits anything — Approve / Request info / Reject
 * still require the admin's tap. Fieldtrip Energy is never suggested.
 */
function AiSuggestionCard({
  entry,
  suggestion,
  suggestedFinalXp,
  suggestedWeighted,
  applied,
  onApply,
}: {
  entry: any;
  suggestion: AiSuggestionResult;
  suggestedFinalXp: number | null;
  suggestedWeighted: number | null;
  applied: boolean;
  onApply: () => void;
}) {
  const analysis = extractAiAnalysis(entry);
  const trust = extractAiTrust(entry);
  const confidencePct = aiConfidencePercent(entry);
  const matchScore = suggestion.available
    ? suggestion.suggestion.source.missionMatchScore
    : (analysis?.missionMatchScore ?? entry?.verification?.missionMatchScore ?? null);
  const duplicate = trust.duplicateWarning ? String(trust.duplicateWarning).replace(/_/g, ' ') : 'none';
  const detectedItems = analysis?.detectedItems ?? [];
  const missingItems = analysis?.missingItems ?? [];

  return (
    <div className="bg-white border-2 border-on-surface p-5 rounded-2xl shadow-[5px_5px_0px_black] space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="text-sm font-display font-black uppercase italic tracking-tight">AI Read</h4>
          <p className="mt-1 text-[9px] font-mono font-black uppercase opacity-40">
            {suggestion.available
              ? `Gemini verdict · ${suggestion.suggestion.source.modelUsed || 'unknown model'}`
              : 'Gemini verdict'}
          </p>
        </div>
      </div>

      {!suggestion.available ? (
        <div className="rounded-xl border-2 border-brand-orange/40 bg-brand-orange/5 p-4">
          <p className="font-mono text-xs font-black uppercase">AI didn&apos;t look at this one — review manually.</p>
          <p className="mt-1 font-mono text-[10px] uppercase opacity-60">{suggestion.reason}</p>
        </div>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 font-mono text-[9px] uppercase sm:grid-cols-3">
            <div><dt className="opacity-45">Subject detected</dt><dd className="mt-1 text-sm font-black">{analysis?.detectedSubject === true ? 'Yes' : analysis?.detectedSubject === false ? 'No' : '—'}</dd></div>
            <div><dt className="opacity-45">Confidence</dt><dd className="mt-1 text-sm font-black">{confidencePct == null ? '—' : `${confidencePct}%`}</dd></div>
            <div><dt className="opacity-45">Mission match</dt><dd className="mt-1 text-sm font-black">{matchScore == null ? '—' : `${Math.round(matchScore)}/100`}</dd></div>
            <div><dt className="opacity-45">Trust / Risk</dt><dd className="mt-1 text-sm font-black">{trust.proofTrustScore == null && trust.aiRiskScore == null ? '—' : `${trust.proofTrustScore ?? '—'} / ${trust.aiRiskScore ?? '—'}`}</dd></div>
            <div><dt className="opacity-45">Duplicate</dt><dd className="mt-1 text-sm font-black">{duplicate}</dd></div>
            <div><dt className="opacity-45">Items found</dt><dd className="mt-1 text-sm font-black normal-case">{detectedItems.length > 0 ? detectedItems.join(', ') : 'none listed'}</dd></div>
            {missingItems.length > 0 && (
              <div className="col-span-2 sm:col-span-3"><dt className="opacity-45">Items missing</dt><dd className="mt-1 text-sm font-black normal-case">{missingItems.join(', ')}</dd></div>
            )}
          </dl>

          {suggestion.suggestion.flagged && (
            <div className="rounded-xl border-2 border-[#FFDD00] bg-[#FFDD00]/15 p-3">
              <p className="font-mono text-[10px] font-black uppercase">Flagged — check closely before approving</p>
              {suggestion.suggestion.flagReasons.map(reason => (
                <p key={reason} className="mt-1 font-mono text-[10px] uppercase opacity-70">· {reason}</p>
              ))}
            </div>
          )}

          <div className="rounded-xl border border-on-surface/15 bg-[#FAF8F5] p-4">
            <p className="font-mono text-[10px] font-black uppercase">
              Suggested: Mission Match {suggestion.suggestion.ratings.missionMatch} · Clarity {suggestion.suggestion.ratings.proofClarity} · Trust {suggestion.suggestion.ratings.authenticity} · Note {suggestion.suggestion.ratings.fieldNoteQuality}
            </p>
            <p className="mt-1 font-mono text-[10px] uppercase opacity-60">
              {suggestedWeighted != null ? `Suggested ${suggestedWeighted}/100` : 'Suggested score'}
              {suggestedFinalXp != null ? ` → ${suggestedFinalXp} XP if approved as-is` : ''}
              {' '}· Fieldtrip Energy stays manual.
            </p>
            <div className="mt-2 space-y-1">
              {(Object.keys(suggestion.suggestion.reasons) as Array<keyof typeof suggestion.suggestion.reasons>).map(key => (
                <p key={key} className="font-mono text-[9px] uppercase opacity-60">· {suggestion.suggestion.reasons[key]}</p>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={onApply}
            disabled={applied}
            className={cn(
              "w-full py-3 border-2 border-on-surface rounded-xl font-display text-base font-black uppercase italic tracking-tight transition-all",
              applied
                ? "bg-brand-lime text-on-surface opacity-70"
                : "bg-white text-on-surface shadow-[4px_4px_0px_black] hover:shadow-[2px_2px_0px_black] active:translate-y-0.5"
            )}
          >
            {applied ? 'AI suggestion applied' : 'Use AI suggestion'}
          </button>
          <p className="font-mono text-[9px] uppercase opacity-45">
            Fills the four ratings above and drafts the admin note. You can change any rating — changed ones are marked Adjusted from AI. Nothing is submitted until you tap Approve, Req Info, or Reject.
          </p>
        </>
      )}
    </div>
  );
}

function QueueView({
  entries,
  total,
  visibleCount,
  onLoadMore,
  selectedId,
  onSelect
}: {
  entries: any[];
  /** Total rows in the ordered queue (all pages). */
  total: number;
  /** Rows currently shown. */
  visibleCount: number;
  onLoadMore: () => void;
  selectedId: string | null;
  onSelect: (entry: any) => void;
}) {
  return (
    <div className="space-y-4">
    <div className="overflow-x-auto border-2 border-on-surface shadow-[8px_8px_0px_black] rounded-[2.5rem] bg-white">
       <table className="w-full text-left border-collapse">
          <thead>
             <tr className="bg-[#FAF8F5] border-b-2 border-on-surface text-[10px] font-mono font-black uppercase text-on-surface/50">
                <th className="py-4 px-6">Timestamp</th>
                <th className="py-4 px-6">Waiting</th>
                <th className="py-4 px-6">Agent</th>
                <th className="py-4 px-6">Mission</th>
                <th className="py-4 px-6">AI_Score</th>
                <th className="py-4 px-6 text-center">Protocol</th>
             </tr>
          </thead>
	          <tbody className="divide-y divide-on-surface/10 font-mono text-[10px] uppercase font-bold">
		             {entries.map((e) => {
	                  const entryResolved = e.canonicalEntryResolved !== false && !!e.entryId;
	                  const actionId = entryResolved ? e.entryId : '';
                  const selected = selectedId === actionId || selectedId === e.id;
	                  return (
		                <tr
                      key={`${e.sourcePath || e.sourceCollection || 'entry'}-${e.id}`}
                      onClick={() => onSelect(e)}
                      className={cn(
                        "hover:bg-on-surface/5 cursor-pointer transition-all",
                        selected && "bg-brand-orange/10"
                      )}
                    >
                   <td className="py-4 px-6 opacity-40 whitespace-nowrap">
                     {e.createdAt?.toDate ? format(e.createdAt.toDate(), 'MM/dd HH:mm') : e.submittedAt?.toDate ? format(e.submittedAt.toDate(), 'MM/dd HH:mm') : '---'}
                   </td>
                   <td className="py-4 px-6 font-black text-brand-orange whitespace-nowrap">
                     {formatWaitAge(entryTimestampMillis(e))}
                   </td>
                   <td className="py-4 px-6 font-black text-on-surface">
                     {e.displayName || 'Anon'}
                   </td>
	                   <td className="py-4 px-6 truncate max-w-[200px]">
	                     {e.tripTitle || e.missionTitle || 'Undefined'}
                       <div className="mt-1 text-[8px] text-on-surface/40">
                         {e.deckName || e.deckId || 'Unknown deck'} · {e.cardType || 'Signal'} · {e.status || e.reviewStatus || 'pending_review'}
                       </div>
                       {!entryResolved && (
                         <div className="mt-1 text-[9px] text-red-600 normal-case">
                           Missing source entry: {e.attemptedEntryId || 'none'}
                         </div>
                       )}
	                   </td>
                   <td className="py-4 px-6 font-black text-brand-orange">
                     {(() => { const pct = aiConfidencePercent(e); return pct == null ? 'N/A' : `${pct}%`; })()}
                   </td>
	                   <td className="py-4 px-6">
	                     <div className="flex items-center justify-center gap-2">
	                       <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onSelect(e);
                          }}
                          className={cn(
                            "px-3 py-2 border border-on-surface rounded font-black uppercase hover:bg-on-surface hover:text-white",
                            selected && "bg-on-surface text-white"
                          )}
                          title={entryResolved ? "Score this proof" : "Missing source entry"}
                        >
	                          <Eye className="inline-block w-3 h-3 mr-1" />
                            {entryResolved ? 'Score' : 'Inspect'}
	                       </button>
	                     </div>
	                   </td>
	                </tr>
                  );
                })}
          </tbody>
       </table>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 px-2">
      <p className="font-mono text-[10px] font-black uppercase tracking-widest text-on-surface/50">
        Showing {visibleCount} of {total} {total === 1 ? 'record' : 'records'}
      </p>
      {visibleCount < total && (
        <button
          type="button"
          onClick={onLoadMore}
          className="px-4 py-2 rounded-xl border-2 border-on-surface bg-white font-mono text-[10px] font-black uppercase tracking-widest shadow-[3px_3px_0px_black] hover:shadow-[1px_1px_0px_black] active:translate-y-0.5"
        >
          Load more ({Math.min(total - visibleCount, QUEUE_PAGE_SIZE)} more)
        </button>
      )}
    </div>
    </div>
  );
}
