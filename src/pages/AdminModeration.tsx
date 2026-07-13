import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, Eye, User, FileText, ExternalLink, Trophy, Zap, Search, ShieldCheck, ClipboardList, Clock } from 'lucide-react';
import { subscribeToPendingReports, performModerationAction, updateReportStatus, subscribeToAdminLogs, fetchPendingSusReports, resolveSusReport, escalateSusReportToTribunal, previewTribunalDiagnostics, applyTribunalDiagnosticsRepair, previewCommunityFeedDiagnostics, repairCommunityFeedDistribution } from '../services/moderationService';
import { subscribeToAllOpenFieldChecks } from '../services/fieldCheckService';
import { resolveFieldCheck } from '../services/gameService';
import { finalizeVoteWinners } from '../services/voteService';
import { Report, FieldCheck } from '../types/game';
import { Card, FieldBadge } from '../components/UI';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { cn, formatSafeTimeOnly, formatSafeDateOnly } from '../lib/utils';
import { getDisplayLabel } from '../utils/labelUtils';
import { useLocation } from 'react-router-dom';

type AdminModerationView = 'reports' | 'sus' | 'fieldChecks' | 'communityFeedDiagnostics' | 'tribunalDiagnostics' | 'audit';

const getRequestedView = (search: string): AdminModerationView => {
  const requestedView = new URLSearchParams(search).get('view');
  return requestedView === 'tribunalDiagnostics' || requestedView === 'tribunal'
    ? 'tribunalDiagnostics'
    : 'reports';
};

export default function AdminModerationPage() {
  const { user, isAdmin, currentWeekNumber, activeSeason } = useApp();
  const location = useLocation();
  const [reports, setReports] = useState<Report[]>([]);
  const [susReports, setSusReports] = useState<any[]>([]);
  const [fieldChecks, setFieldChecks] = useState<FieldCheck[]>([]);
  const [adminLogs, setAdminLogs] = useState<any[]>([]);
  const [view, setView] = useState<AdminModerationView>(() => getRequestedView(location.search));
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [selectedSusReport, setSelectedSusReport] = useState<any | null>(null);
  const [selectedFieldCheck, setSelectedFieldCheck] = useState<FieldCheck | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinalizingVotes, setIsFinalizingVotes] = useState(false);
  const [tribunalPreview, setTribunalPreview] = useState<any | null>(null);
  const [tribunalRepairResult, setTribunalRepairResult] = useState<any | null>(null);
  const [tribunalConfirmation, setTribunalConfirmation] = useState('');
  const [isScanningTribunal, setIsScanningTribunal] = useState(false);
  const [isRepairingTribunal, setIsRepairingTribunal] = useState(false);
  const [communityFeedDiagnostics, setCommunityFeedDiagnostics] = useState<any | null>(null);
  const [communityFeedRepairResult, setCommunityFeedRepairResult] = useState<any | null>(null);
  const [communityFeedTargetUserId, setCommunityFeedTargetUserId] = useState('');
  const [isScanningCommunityFeed, setIsScanningCommunityFeed] = useState(false);
  const [isRepairingCommunityFeed, setIsRepairingCommunityFeed] = useState(false);

  useEffect(() => {
    setView(getRequestedView(location.search));
  }, [location.search]);

  useEffect(() => {
    if (!isAdmin) return;
    const unsubReports = subscribeToPendingReports(setReports);
    const unsubChecks = subscribeToAllOpenFieldChecks(setFieldChecks);
    const unsubLogs = subscribeToAdminLogs(50, setAdminLogs);
    fetchPendingSusReports().then(setSusReports).catch(err => console.warn("[AdminModeration] Sus reports unavailable:", err));
    return () => {
      unsubReports();
      unsubChecks();
      unsubLogs();
    };
  }, [isAdmin]);

  const handleAction = async (action: 'remove' | 'suspend' | 'warn' | 'dismiss' | 'reject') => {
    if (!selectedReport || !user) return;
    setIsSubmitting(true);
    
    try {
      await performModerationAction(
        user.uid,
        selectedReport.targetId,
        selectedReport.targetType,
        action,
        selectedReport.reason,
        actionReason
      );

      await updateReportStatus(selectedReport.id, action === 'dismiss' ? 'dismissed' : 'resolved');
      setSelectedReport(null);
      setActionReason('');
    } catch (err: any) {
      console.error("Moderation action failed:", err);
      alert(`BUREAU_ERROR: Action failed. ${err.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const refreshSusReports = async () => {
    try {
      setSusReports(await fetchPendingSusReports());
    } catch (err) {
      console.error("Failed to refresh Sus reports:", err);
    }
  };

  const handleSusAction = async (action: 'dismissed' | 'resolved' | 'request_clarification' | 'tribunal') => {
    if (!selectedSusReport) return;
    if (actionReason.trim().length < 5) {
      alert('BUREAU_ERROR: Add a short private admin reason first.');
      return;
    }
    setIsSubmitting(true);
    try {
      if (action === 'tribunal') {
        await escalateSusReportToTribunal(
          selectedSusReport,
          activeSeason?.id || selectedSusReport.seasonId || 'heatwave-receipts',
          currentWeekNumber || selectedSusReport.weekNumber || 1,
          actionReason.trim()
        );
      } else {
        await resolveSusReport(selectedSusReport.id, action, actionReason.trim());
      }
      setSelectedSusReport(null);
      setActionReason('');
      await refreshSusReports();
    } catch (err: any) {
      console.error("Sus action failed:", err);
      alert(`BUREAU_ERROR: Sus action failed. ${err.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolveFieldCheck = async (resolution: 'reviewed' | 'action_needed' | 'dismissed') => {
    if (!selectedFieldCheck) return;
    setIsSubmitting(true);
    try {
      await resolveFieldCheck(selectedFieldCheck.id, resolution, actionReason);
      setSelectedFieldCheck(null);
      setActionReason('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalizeVotes = async () => {
    if (!window.confirm(`Force finalize vote winners for Week ${currentWeekNumber}? Points will be awarded.`)) return;
    const reason = window.prompt('Reason for finalizing weekly voting results?');
    if (!reason || reason.trim().length < 5) {
      alert('BUREAU_ERROR: Finalization requires a reason.');
      return;
    }
    setIsFinalizingVotes(true);
    try {
      await finalizeVoteWinners(currentWeekNumber, reason.trim());
      alert(`BUREAU_SUCCESS: Week ${currentWeekNumber} accolades distributed.`);
    } catch (err) {
      alert(`BUREAU_ERROR: Failed to distribute accolades.`);
    } finally {
      setIsFinalizingVotes(false);
    }
  };

  const handlePreviewTribunalDiagnostics = async () => {
    setIsScanningTribunal(true);
    setTribunalRepairResult(null);
    try {
      setTribunalPreview(await previewTribunalDiagnostics());
    } catch (err: any) {
      alert(`BUREAU_ERROR: Tribunal preview failed. ${err.message || 'Unknown error'}`);
    } finally {
      setIsScanningTribunal(false);
    }
  };

  const handleApplyTribunalRepairs = async () => {
    if (tribunalConfirmation.trim() !== 'REPAIR TRIBUNAL DATA') {
      alert('BUREAU_ERROR: Type REPAIR TRIBUNAL DATA to apply repairs.');
      return;
    }
    setIsRepairingTribunal(true);
    try {
      const result = await applyTribunalDiagnosticsRepair(tribunalConfirmation.trim());
      setTribunalRepairResult(result);
      setTribunalPreview({ success: true, mode: 'post_repair', readOnly: true, report: result.after });
    } catch (err: any) {
      alert(`BUREAU_ERROR: Tribunal repair failed. ${err.message || 'Unknown error'}`);
    } finally {
      setIsRepairingTribunal(false);
    }
  };

  const handlePreviewCommunityFeedDiagnostics = async () => {
    setIsScanningCommunityFeed(true);
    try {
      setCommunityFeedDiagnostics(await previewCommunityFeedDiagnostics(communityFeedTargetUserId.trim() || undefined));
    } catch (err: any) {
      alert(`BUREAU_ERROR: Community Feed diagnostics failed. ${err.message || 'Unknown error'}`);
    } finally {
      setIsScanningCommunityFeed(false);
    }
  };

  const handleRepairCommunityFeedDistribution = async (dryRun: boolean) => {
    setIsRepairingCommunityFeed(true);
    try {
      const result = await repairCommunityFeedDistribution({
        userId: communityFeedTargetUserId.trim() || undefined,
        dryRun
      });
      setCommunityFeedRepairResult(result);
      if (!dryRun) {
        setCommunityFeedDiagnostics(await previewCommunityFeedDiagnostics(communityFeedTargetUserId.trim() || undefined));
      }
    } catch (err: any) {
      alert(`BUREAU_ERROR: Community Feed repair failed. ${err.message || 'Unknown error'}`);
    } finally {
      setIsRepairingCommunityFeed(false);
    }
  };

  if (!isAdmin) return <div className="p-20 text-center uppercase font-mono text-error">ACCESS_DENIED. Admin clearance required.</div>;

  return (
    <div className="pb-40 px-6 pt-12 max-w-6xl mx-auto space-y-12">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <FieldBadge variant="sticker" color="orange">{getDisplayLabel('ADMIN_PANEL')}</FieldBadge>
            <h1 className="font-display text-4xl uppercase tracking-tighter">Internal Affairs</h1>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={handleFinalizeVotes}
              disabled={isFinalizingVotes}
              className="px-4 py-2 bg-mustard text-black font-display uppercase tracking-widest text-[10px] flex items-center gap-2 hover:bg-on-surface hover:text-mustard transition-all border-2 border-on-surface"
            >
              <Trophy className={cn("w-3 h-3", isFinalizingVotes && "animate-bounce")} />
              {isFinalizingVotes ? 'FINALIZING...' : getDisplayLabel('FINALIZE_WEEK_VOTES')}
            </button>
            <div className="flex gap-1 border-2 border-on-surface p-1">
               <button 
                onClick={() => { setView('reports'); setSelectedFieldCheck(null); setSelectedSusReport(null); }}
                className={cn("px-4 py-1 text-[10px] font-bold uppercase tracking-widest", view === 'reports' ? "bg-on-surface text-paper" : "hover:bg-on-surface/5")}
               >
                 Reports ({reports.length})
               </button>
               <button
                onClick={() => { setView('sus'); setSelectedReport(null); setSelectedFieldCheck(null); }}
                className={cn("px-4 py-1 text-[10px] font-bold uppercase tracking-widest", view === 'sus' ? "bg-on-surface text-paper" : "hover:bg-on-surface/5")}
               >
                 Sus ({susReports.length})
               </button>
               <button 
                onClick={() => { setView('fieldChecks'); setSelectedReport(null); setSelectedSusReport(null); }}
                className={cn("px-4 py-1 text-[10px] font-bold uppercase tracking-widest", view === 'fieldChecks' ? "bg-on-surface text-paper" : "hover:bg-on-surface/5")}
               >
                 Field Checks ({fieldChecks.length})
               </button>
               <button
                onClick={() => { setView('tribunalDiagnostics'); setSelectedReport(null); setSelectedSusReport(null); setSelectedFieldCheck(null); }}
                className={cn("px-4 py-1 text-[10px] font-bold uppercase tracking-widest", view === 'tribunalDiagnostics' ? "bg-on-surface text-paper" : "hover:bg-on-surface/5")}
               >
                 Tribunal Data
               </button>
               <button
                onClick={() => { setView('communityFeedDiagnostics'); setSelectedReport(null); setSelectedSusReport(null); setSelectedFieldCheck(null); }}
                className={cn("px-4 py-1 text-[10px] font-bold uppercase tracking-widest", view === 'communityFeedDiagnostics' ? "bg-on-surface text-paper" : "hover:bg-on-surface/5")}
               >
                 Community Feed
               </button>
               <button 
                onClick={() => { setView('audit'); setSelectedReport(null); setSelectedSusReport(null); setSelectedFieldCheck(null); }}
                className={cn("px-4 py-1 text-[10px] font-bold uppercase tracking-widest", view === 'audit' ? "bg-on-surface text-paper" : "hover:bg-on-surface/5")}
               >
                 Audit Log
               </button>
            </div>
          </div>
        </div>
      </div>

      {view === 'tribunalDiagnostics' ? (
        <TribunalDiagnosticsPanel
          preview={tribunalPreview}
          repairResult={tribunalRepairResult}
          confirmation={tribunalConfirmation}
          isScanning={isScanningTribunal}
          isRepairing={isRepairingTribunal}
          onConfirmationChange={setTribunalConfirmation}
          onPreview={handlePreviewTribunalDiagnostics}
          onRepair={handleApplyTribunalRepairs}
        />
      ) : view === 'communityFeedDiagnostics' ? (
        <CommunityFeedDiagnosticsPanel
          diagnostics={communityFeedDiagnostics}
          repairResult={communityFeedRepairResult}
          targetUserId={communityFeedTargetUserId}
          isScanning={isScanningCommunityFeed}
          isRepairing={isRepairingCommunityFeed}
          onTargetUserIdChange={setCommunityFeedTargetUserId}
          onPreview={handlePreviewCommunityFeedDiagnostics}
          onRepair={handleRepairCommunityFeedDistribution}
        />
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* List View */}
        <div className={cn(view === 'audit' ? "md:col-span-3" : "md:col-span-1", "space-y-4")}>
          <p className="micro-label">{view === 'audit' ? getDisplayLabel('ADMIN_ACTION_LOG') : getDisplayLabel('INCOMING_QUEUE')}</p>
          <div className={cn("space-y-2 max-h-[600px] overflow-y-auto pr-2", view === 'audit' && "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 space-y-0")}>
            {view === 'reports' ? (
              reports.length === 0 ? (
                <EmptyQueue icon={<CheckCircle className="w-8 h-8 opacity-20" />} />
              ) : (
                reports.map((report) => (
                  <QueueItem 
                    key={report.id} 
                    isSelected={selectedReport?.id === report.id}
                    onClick={() => { setSelectedReport(report); setSelectedFieldCheck(null); }}
                    title={report.reason}
                    subtitle={`ID: ...${report.targetId.slice(-8)}`}
                    tag={report.targetType}
                    time={formatSafeTimeOnly(report.createdAt)}
                  />
                ))
              )
            ) : view === 'sus' ? (
              susReports.length === 0 ? (
                <EmptyQueue icon={<ShieldCheck className="w-8 h-8 opacity-20" />} />
              ) : (
                susReports.map((report) => (
                  <QueueItem
                    key={report.id}
                    isSelected={selectedSusReport?.id === report.id}
                    onClick={() => { setSelectedSusReport(report); setSelectedReport(null); setSelectedFieldCheck(null); }}
                    title={report.reason || 'suspicious_proof'}
                    subtitle={`Entry: ...${String(report.entryId || '').slice(-8)}`}
                    tag="sus_report"
                    time={formatSafeTimeOnly(report.createdAt)}
                  />
                ))
              )
            ) : view === 'fieldChecks' ? (
              fieldChecks.length === 0 ? (
                <EmptyQueue icon={<ShieldCheck className="w-8 h-8 opacity-20" />} />
              ) : (
                fieldChecks.map((check) => (
                  <QueueItem 
                    key={check.id} 
                    isSelected={selectedFieldCheck?.id === check.id}
                    onClick={() => { setSelectedFieldCheck(check); setSelectedReport(null); }}
                    title={check.reason}
                    subtitle={`Entry: ...${check.submissionId.slice(-8)}`}
                    tag="field_check"
                    time={formatSafeTimeOnly(check.createdAt)}
                  />
                ))
              )
            ) : (
              adminLogs.length === 0 ? (
                <div className="col-span-full">
                  <EmptyQueue icon={<ClipboardList className="w-8 h-8 opacity-20" />} />
                </div>
              ) : (
                adminLogs.map((log) => (
                  <AuditLogItem key={log.id} log={log} />
                ))
              )
            )}
          </div>
        </div>

        {/* Details Area */}
        {view !== 'audit' && (
          <div className="md:col-span-2">
            <AnimatePresence mode="wait">
              {!selectedReport && !selectedSusReport && !selectedFieldCheck ? (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-[500px] flex flex-col items-center justify-center p-12 border-2 border-dashed border-on-surface/10 opacity-40"
                >
                  <Shield className="w-12 h-12 mb-4" />
                  <p className="text-[10px] uppercase font-bold tracking-widest text-center">Select an item from the queue to investigate and resolve</p>
                </motion.div>
              ) : selectedReport ? (
                <ReportDetails 
                  report={selectedReport} 
                  actionReason={actionReason} 
                  onActionReasonChange={setActionReason}
                  onAction={handleAction}
                />
              ) : selectedSusReport ? (
                <SusReportDetails
                  report={selectedSusReport}
                  actionReason={actionReason}
                  onActionReasonChange={setActionReason}
                  onAction={handleSusAction}
                />
              ) : (
                <FieldCheckDetails 
                  check={selectedFieldCheck!} 
                  actionReason={actionReason} 
                  onActionReasonChange={setActionReason}
                  onResolve={handleResolveFieldCheck}
                />
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
      )}
    </div>
  );
}

function AuditLogItem({ log }: { log: any, key?: any }) {
  return (
    <div className="p-4 border-2 border-on-surface/10 bg-on-surface/[0.02] space-y-3">
      <div className="flex justify-between items-start">
        <span className="text-[7px] font-bold uppercase tracking-widest bg-on-surface/10 px-1 border border-on-surface/10">
          {log.targetType} // {log.action}
        </span>
        <div className="text-right">
          <p className="text-[6px] opacity-40 font-mono font-bold leading-none">{formatSafeDateOnly(log.createdAt)}</p>
          <p className="text-[8px] opacity-40 font-mono">{formatSafeTimeOnly(log.createdAt)}</p>
        </div>
      </div>
      
      <div className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-tighter">Target: <span className="opacity-40">{log.targetId}</span></p>
        <p className="text-[8px] opacity-40 font-mono">Agent: {log.adminId.slice(-8)}</p>
      </div>

      {(log.reason || log.notes || log.status || log.newStatus || log.settings) && (
        <div className="pt-2 border-t border-dashed border-on-surface/10">
          <p className="text-[8px] opacity-60 italic font-serif">
            {log.reason || log.notes || log.status || log.newStatus || (log.settings ? 'Config updated' : '')}
          </p>
        </div>
      )}
    </div>
  );
}

function EmptyQueue({ icon }: { icon: React.ReactNode }) {
  return (
    <div className="p-8 text-center border-2 border-dashed border-on-surface/10">
      <div className="mx-auto mb-2 flex justify-center">{icon}</div>
      <p className="text-[10px] uppercase font-bold tracking-widest opacity-40">Queue Clear</p>
    </div>
  );
}

function QueueItem({ isSelected, onClick, title, subtitle, tag, time }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-4 border-2 transition-all group",
        isSelected ? "border-on-surface bg-on-surface/5" : "border-on-surface/10 hover:border-on-surface/30"
      )}
    >
      <div className="flex justify-between items-start mb-2">
        <span className={cn(
          "text-[8px] uppercase font-bold tracking-[0.2em] px-2 py-0.5",
           tag === 'field_check' ? "bg-brand-orange/10 text-brand-orange" : "bg-error/10 text-error"
        )}>
          {tag}
        </span>
        <span className="text-[8px] opacity-40 font-mono">
          {time}
        </span>
      </div>
      <p className="text-[10px] uppercase font-bold truncate">{title}</p>
      <p className="text-[8px] opacity-40 font-mono mt-1">{subtitle}</p>
    </button>
  );
}

function ReportDetails({ report, actionReason, onActionReasonChange, onAction }: any) {
  return (
    <motion.div
      key="report-details"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <Card className="p-8 space-y-8">
        <div className="flex items-start justify-between border-b-2 border-on-surface/5 pb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-error" />
              <h2 className="font-display text-2xl uppercase tracking-tighter leading-none italic">System Report Case</h2>
            </div>
            <p className="text-[10px] uppercase font-bold tracking-widest opacity-60">
              REASON: <span className="text-error">{report.reason.toUpperCase()}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="micro-label">STATUS</p>
            <FieldBadge variant="sticker" color="black">{report.status.toUpperCase()}</FieldBadge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="micro-label">REPORTER_ID</p>
              <p className="text-xs font-mono">{report.reporterId}</p>
            </div>
            <div className="space-y-1">
              <p className="micro-label">TARGET_ID</p>
              <div className="flex items-center gap-2">
                <p className="text-xs font-mono">{report.targetId}</p>
                <button className="text-brand-orange hover:underline text-[10px] font-bold uppercase flex items-center gap-1">
                  VIEW <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="micro-label">SUBMITTED_DETAILS</p>
              <p className="text-xs opacity-80 leading-relaxed italic border-l-2 border-on-surface/10 pl-4 bg-on-surface/[0.02] p-2">
                "{report.details || 'No additional details provided.'}"
              </p>
            </div>
          </div>
        </div>

        <ActionControls 
          value={actionReason} 
          onChange={onActionReasonChange} 
          onAction={onAction} 
          type="report" 
        />
      </Card>
    </motion.div>
  );
}

function CommunityFeedDiagnosticsPanel({ diagnostics, repairResult, targetUserId, isScanning, isRepairing, onTargetUserIdChange, onPreview, onRepair }: any) {
  const report = diagnostics?.report;
  const rows = [
    ['Total submitted logs', report?.logbook?.totalSubmitted],
    ['Pending review', report?.logbook?.pendingReview],
    ['Approved / verified', report?.logbook?.approvedVerified],
    ['Rejected / needs proof', report?.logbook?.rejectedOrNeedsMoreProof],
    ['Eligible feed entries', report?.eligibleFeedEntries],
    ['Current crew eligible', report?.logbook?.currentCrewEligible],
    ['No crew, general eligible', report?.logbook?.noCrewButGeneralEligible],
    ['Excluded approved entries', report?.excludedApprovedEntries],
    ['Missing image paths', report?.missingImagePaths],
    ['Orphaned users', report?.orphanedUsers],
    ['Invalid visibility flags', report?.invalidPublicVisibilityFlags],
    ['Duplicate likes', report?.duplicateLikes],
    ['Feed query failures', report?.feedQueryFailures],
    ['Non-approved visible entries', report?.nonApprovedVisibleFeedEntries],
  ];
  const sampleGroups = [
    ['Eligible samples', report?.samples?.eligible],
    ['Excluded approved samples', report?.samples?.excludedApproved],
    ['Missing image samples', report?.samples?.missingImages],
    ['Orphaned user samples', report?.samples?.orphanedUsers],
    ['Invalid visibility samples', report?.samples?.invalidVisibility],
    ['Duplicate like samples', report?.samples?.duplicateLikes],
    ['Non-approved visible samples', report?.samples?.nonApprovedVisible],
    ['Approved exclusion reasons', report?.samples?.approvedExclusions],
  ];

  return (
    <Card className="p-8 space-y-6 border-2 border-on-surface">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-brand-orange">
            <Eye className="w-5 h-5" />
            <p className="text-[10px] font-black uppercase tracking-[0.28em]">Admin Only // Read-Only Feed Scan</p>
          </div>
          <h2 className="font-display text-3xl uppercase tracking-tighter mt-2">Community Feed Diagnostics</h2>
          <p className="text-sm opacity-60 max-w-2xl mt-2">
            Scans canonical entries and likes for public feed eligibility, missing images, orphaned identities, invalid visibility, duplicate Hype records, and non-approved feed leaks.
          </p>
        </div>
        <div className="space-y-3 min-w-[280px]">
          <input
            value={targetUserId}
            onChange={event => onTargetUserIdChange(event.target.value)}
            placeholder="Optional userId / UID"
            className="w-full border-2 border-on-surface bg-white px-3 py-2 font-mono text-xs"
          />
          <div className="flex flex-wrap gap-2 justify-end">
            <button
              onClick={onPreview}
              disabled={isScanning}
              className="bureau-btn-sm bg-on-surface text-paper hover:bg-brand-orange"
            >
              {isScanning ? 'SCANNING...' : 'PREVIEW_SCAN'}
            </button>
            <button
              onClick={() => onRepair(true)}
              disabled={isRepairing}
              className="bureau-btn-sm bg-white text-on-surface"
            >
              PREVIEW_REPAIR
            </button>
            <button
              onClick={() => {
                if (window.confirm('Apply safe Community Feed repairs? This will not overwrite explicit private or hidden entries.')) onRepair(false);
              }}
              disabled={isRepairing || !repairResult?.dryRun}
              className="bureau-btn-sm bg-brand-lime text-on-surface"
            >
              {isRepairing ? 'REPAIRING...' : 'APPLY_REPAIR'}
            </button>
          </div>
        </div>
      </div>

      {!report ? (
        <div className="border-2 border-dashed border-on-surface/15 p-10 text-center">
          <p className="font-mono text-xs uppercase tracking-widest opacity-50">Run Preview Scan to inspect the Community Feed.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {rows.map(([label, value]) => (
              <div key={label} className="border-2 border-on-surface/10 p-4 bg-on-surface/[0.02]">
                <p className="micro-label">{label}</p>
                <p className="font-display text-4xl uppercase italic leading-none mt-2">{Number(value || 0)}</p>
              </div>
            ))}
          </div>

          {repairResult && (
            <div className="border-2 border-on-surface/10 p-4 bg-brand-lime/10">
              <p className="text-[10px] font-black uppercase tracking-widest mb-2">Repair Preview / Result</p>
              <pre className="bg-white border border-on-surface/10 p-3 text-[10px] font-mono whitespace-pre-wrap break-all">
                {JSON.stringify({
                  dryRun: repairResult.dryRun,
                  scanned: repairResult.scanned,
                  repairedCount: repairResult.repairedCount,
                  skippedCount: repairResult.skippedCount,
                  repaired: repairResult.repaired,
                  skipped: repairResult.skipped
                }, null, 2)}
              </pre>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sampleGroups.map(([label, samples]) => (
              <div key={label} className="border border-on-surface/10 p-4 bg-white">
                <p className="text-[10px] font-black uppercase tracking-widest mb-3">{label}</p>
                {!samples || samples.length === 0 ? (
                  <p className="text-xs font-mono opacity-40">none</p>
                ) : (
                  <div className="space-y-2">
                    {samples.map((sample: any, index: number) => (
                      <pre key={`${label}-${index}`} className="bg-on-surface/[0.03] border border-on-surface/10 p-3 text-[10px] font-mono whitespace-pre-wrap break-all">
                        {typeof sample === 'string' ? sample : JSON.stringify(sample, null, 2)}
                      </pre>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function TribunalDiagnosticsPanel({
  preview,
  repairResult,
  confirmation,
  isScanning,
  isRepairing,
  onConfirmationChange,
  onPreview,
  onRepair
}: any) {
  const report = preview?.report;
  const canRepair = !!report && report.canApplyRepairs && confirmation.trim() === 'REPAIR TRIBUNAL DATA' && !isRepairing;
  const categories = [
    {
      key: 'publicCasesWithForbiddenFields',
      label: 'Forbidden public case fields',
      description: 'Private reporter/source fields found on public tribunalCases.'
    },
    {
      key: 'legacyVotes',
      label: 'Legacy vote values',
      description: 'tribunalVotes still using agree/disagree instead of valid/sus.'
    },
    {
      key: 'closedCasesMissingResults',
      label: 'Missing result snapshots',
      description: 'Closed cases missing tribunalResults/{caseId}.'
    },
    {
      key: 'cannotSafelyRepair',
      label: 'Manual review required',
      description: 'Records missing enough canonical data for automatic repair.'
    }
  ];

  return (
    <div className="space-y-6">
      <Card className="p-8 space-y-6 border-2 border-on-surface">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-brand-orange">
              <ShieldCheck className="w-5 h-5" />
              <p className="text-[10px] font-black uppercase tracking-[0.28em]">Admin Only // Preview Before Write</p>
            </div>
            <h2 className="font-display text-3xl uppercase tracking-tighter mt-2">Tribunal Diagnostics</h2>
            <p className="text-sm opacity-60 max-w-2xl mt-2">
              Preview scans are read-only. Repairs are server-authorized, idempotent, logged, and require typed confirmation.
            </p>
          </div>
          <button
            onClick={onPreview}
            disabled={isScanning || isRepairing}
            className="bureau-btn-sm bg-on-surface text-paper hover:bg-brand-orange"
          >
            {isScanning ? 'SCANNING...' : 'PREVIEW_SCAN'}
          </button>
        </div>

        {!report ? (
          <div className="border-2 border-dashed border-on-surface/15 p-10 text-center">
            <p className="font-mono text-xs uppercase tracking-widest opacity-50">Run Preview Scan before applying any repair.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {categories.map(category => (
                <div key={category.key} className="border-2 border-on-surface/10 p-4 bg-on-surface/[0.02]">
                  <p className="micro-label">{category.label}</p>
                  <p className="font-display text-4xl uppercase italic leading-none mt-2">
                    {Number(report.counts?.[category.key] || 0)}
                  </p>
                  <p className="text-[10px] opacity-55 mt-2 leading-snug">{category.description}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categories.map(category => (
                <div key={`${category.key}-samples`} className="border border-on-surface/10 p-4 bg-white">
                  <p className="text-[10px] font-black uppercase tracking-widest mb-3">{category.label} Samples</p>
                  {(report.samples?.[category.key] || []).length === 0 ? (
                    <p className="text-xs font-mono opacity-40">none</p>
                  ) : (
                    <div className="space-y-2">
                      {report.samples[category.key].map((issue: any) => (
                        <div key={`${category.key}-${issue.id}`} className="bg-on-surface/[0.03] border border-on-surface/10 p-3">
                          <p className="text-xs font-mono font-bold">{issue.id}</p>
                          {issue.fields?.length ? <p className="text-[10px] mt-1 opacity-60">fields: {issue.fields.join(', ')}</p> : null}
                          {issue.vote ? <p className="text-[10px] mt-1 opacity-60">vote: {issue.vote}</p> : null}
                          <p className="text-[10px] mt-2 uppercase tracking-wider">{issue.proposedAction}</p>
                          {!issue.repairable ? <p className="text-[10px] mt-1 text-error font-black">manual: {issue.reason || 'unsafe automatic repair'}</p> : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="border-2 border-on-surface p-5 space-y-4 bg-paper">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="micro-label">Critical Failures</p>
                  <p className={cn("font-display text-3xl uppercase italic leading-none", report.criticalFailures === 0 ? "text-brand-green" : "text-error")}>
                    {report.criticalFailures === 0 ? 'PASS' : `${report.criticalFailures} FAIL`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="micro-label">Repair Availability</p>
                  <p className="text-xs font-mono uppercase">{report.canApplyRepairs ? 'repairable_records_found' : 'no_safe_repairs_available'}</p>
                </div>
              </div>
              <div className="grid md:grid-cols-[1fr_auto] gap-3 items-end">
                <div>
                  <p className="micro-label">TYPE_CONFIRMATION</p>
                  <input
                    value={confirmation}
                    onChange={(e) => onConfirmationChange(e.target.value)}
                    placeholder="REPAIR TRIBUNAL DATA"
                    className="w-full border-2 border-on-surface/20 bg-white px-4 py-3 font-mono text-xs uppercase focus:border-on-surface outline-none"
                  />
                </div>
                <button
                  onClick={onRepair}
                  disabled={!canRepair}
                  className={cn(
                    "bureau-btn-sm px-6 py-3",
                    canRepair ? "bg-brand-orange text-white border-brand-orange hover:bg-on-surface" : "bg-on-surface/10 text-on-surface/35 cursor-not-allowed"
                  )}
                >
                  {isRepairing ? 'REPAIRING...' : 'APPLY_REPAIRS'}
                </button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {repairResult ? (
        <Card className="p-6 border-2 border-on-surface space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="micro-label">Post Repair Verification</p>
              <h3 className={cn("font-display text-3xl uppercase italic", repairResult.verification?.pass ? "text-brand-green" : "text-error")}>
                {repairResult.verification?.pass ? 'PASS' : 'FAIL'}
              </h3>
            </div>
            <div className="text-right text-xs font-mono">
              <p>pass_count={repairResult.verification?.passCount ?? 0}</p>
              <p>fail_count={repairResult.verification?.failCount ?? 0}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs font-mono">
            <div className="bg-on-surface/[0.03] p-3">public_cases={repairResult.repaired?.publicCases ?? 0}</div>
            <div className="bg-on-surface/[0.03] p-3">legacy_votes={repairResult.repaired?.legacyVotes ?? 0}</div>
            <div className="bg-on-surface/[0.03] p-3">result_snapshots={repairResult.repaired?.resultSnapshots ?? 0}</div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function SusReportDetails({ report, actionReason, onActionReasonChange, onAction }: any) {
  return (
    <motion.div
      key="sus-report-details"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <Card className="p-8 space-y-8">
        <div className="flex items-start justify-between border-b-2 border-on-surface/5 pb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-brand-orange" />
              <h2 className="font-display text-2xl uppercase tracking-tighter leading-none italic">Private Sus Report</h2>
            </div>
            <p className="text-[10px] uppercase font-bold tracking-widest opacity-60">
              PRIVATE_ADMIN_REVIEW // REPORTER ID IS NOT PUBLIC
            </p>
          </div>
          <div className="text-right">
            <p className="micro-label">STATUS</p>
            <FieldBadge variant="sticker" color="orange">{String(report.status || 'pending').toUpperCase()}</FieldBadge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="micro-label">REPORTER_ID</p>
              <p className="text-xs font-mono">{report.reporterId}</p>
            </div>
            <div className="space-y-1">
              <p className="micro-label">TARGET_USER_ID</p>
              <p className="text-xs font-mono">{report.targetUserId}</p>
            </div>
            <div className="space-y-1">
              <p className="micro-label">ENTRY_ID</p>
              <p className="text-xs font-mono">{report.entryId}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="micro-label">SUS_REASON</p>
              <p className="text-xs font-mono uppercase text-brand-orange">{report.reason || 'suspicious_proof'}</p>
            </div>
            <div className="space-y-1">
              <p className="micro-label">DETAILS</p>
              <p className="text-xs opacity-80 leading-relaxed italic border-l-2 border-on-surface/10 pl-4 bg-on-surface/[0.02] p-2">
                "{report.details || 'No additional details provided.'}"
              </p>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t-2 border-on-surface/5 space-y-6">
          <h3 className="font-display text-lg uppercase tracking-tighter">Sus Determination</h3>
          <div className="space-y-2">
            <p className="micro-label">ADMIN_NOTES</p>
            <textarea
              placeholder="Private admin note..."
              value={actionReason}
              onChange={(e) => onActionReasonChange(e.target.value)}
              className="w-full bg-on-surface/5 border-2 border-on-surface/10 p-4 text-xs font-mono focus:border-on-surface outline-none h-24"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <button onClick={() => onAction('dismissed')} className="bureau-btn-sm bg-on-surface/10 text-on-surface hover:bg-on-surface hover:text-paper">DISMISS</button>
            <button onClick={() => onAction('resolved')} className="bureau-btn-sm bg-brand-green/20 text-brand-green border-brand-green hover:bg-brand-green hover:text-white">CLEAR_PRIVATE</button>
            <button onClick={() => onAction('request_clarification')} className="bureau-btn-sm bg-brand-blue/20 text-brand-blue border-brand-blue hover:bg-brand-blue hover:text-white">REQUEST_PROOF</button>
            <button onClick={() => onAction('tribunal')} className="bureau-btn-sm bg-brand-orange/20 text-brand-orange border-brand-orange hover:bg-brand-orange hover:text-white">ESCALATE_TRIBUNAL</button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function FieldCheckDetails({ check, actionReason, onActionReasonChange, onResolve }: any) {
  return (
    <motion.div
      key="check-details"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <Card className="p-8 space-y-8">
        <div className="flex items-start justify-between border-b-2 border-on-surface/5 pb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-brand-orange" />
              <h2 className="font-display text-2xl uppercase tracking-tighter leading-none italic">Field Check Audit</h2>
            </div>
            <p className="text-[10px] uppercase font-bold tracking-widest opacity-60">
              {getDisplayLabel('ALLEGATION')}: <span className="text-brand-orange">{getDisplayLabel(check.reason)}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="micro-label">{getDisplayLabel('STATUS')}</p>
            <FieldBadge variant="sticker" color="orange">{getDisplayLabel(check.status)}</FieldBadge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="micro-label">{getDisplayLabel('SNITCH_REPORTER')}</p>
              <p className="text-xs font-mono">{check.reporterUid === check.reportedUserId ? getDisplayLabel('CONFESSION_SELF') : check.reporterUid}</p>
            </div>
            <div className="space-y-1">
              <p className="micro-label">{getDisplayLabel('TARGET_ENTRY')}</p>
              <div className="flex items-center gap-2">
                <p className="text-xs font-mono">{check.submissionId}</p>
                <button className="text-brand-orange hover:underline text-[10px] font-bold uppercase flex items-center gap-1">
                  {getDisplayLabel('OPEN_EVIDENCE')} <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="micro-label">{getDisplayLabel('ACCUSATION_DETAILS')}</p>
              <p className="text-xs opacity-80 leading-relaxed italic border-l-2 border-on-surface/20 pl-4 bg-brand-orange/[0.02] p-2">
                "{check.note || 'No details.'}"
              </p>
            </div>
          </div>
        </div>

        <ActionControls 
          value={actionReason} 
          onChange={onActionReasonChange} 
          onAction={onResolve} 
          type="field_check" 
        />
      </Card>
    </motion.div>
  );
}

function ActionControls({ value, onChange, onAction, type }: any) {
  return (
    <div className="pt-8 border-t-2 border-on-surface/5 space-y-6">
      <h3 className="font-display text-lg uppercase tracking-tighter">Bureau Determination</h3>
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="micro-label">AUDIT_LOG_REASON</p>
          <textarea
            placeholder="Official reasoning for this action..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-on-surface/5 border-2 border-on-surface/10 p-4 text-xs font-mono focus:border-on-surface outline-none h-24"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {type === 'report' ? (
            <>
              <button onClick={() => onAction('dismiss')} className="bureau-btn-sm bg-on-surface/10 text-on-surface hover:bg-on-surface hover:text-paper">DISMISS</button>
              <button onClick={() => onAction('reject')} className="bureau-btn-sm bg-brand-orange/20 text-brand-orange border-brand-orange hover:bg-brand-orange hover:text-white">REJECT</button>
              <button onClick={() => onAction('remove')} className="bureau-btn-sm bg-error/20 text-error border-error hover:bg-error hover:text-white">REMOVE</button>
              <button onClick={() => onAction('suspend')} className="bureau-btn-sm bg-black text-white hover:bg-error">SUSPEND</button>
            </>
          ) : (
            <>
              <button onClick={() => onAction('dismissed')} className="bureau-btn-sm bg-on-surface/10 text-on-surface hover:bg-on-surface hover:text-paper">DISMISS</button>
              <button onClick={() => onAction('reviewed')} className="bureau-btn-sm bg-brand-green/20 text-brand-green border-brand-green hover:bg-brand-green hover:text-white">MARK_REVIEWED</button>
              <button onClick={() => onAction('action_needed')} className="bureau-btn-sm bg-brand-orange/20 text-brand-orange border-brand-orange hover:bg-brand-orange hover:text-white">NEEDS_ACTION</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
