import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, Eye, User, FileText, ExternalLink, Trophy, Zap, Search, ShieldCheck, ClipboardList, Clock } from 'lucide-react';
import { subscribeToPendingReports, performModerationAction, updateReportStatus, subscribeToAdminLogs, fetchPendingSusReports, resolveSusReport, escalateSusReportToTribunal } from '../services/moderationService';
import { subscribeToAllOpenFieldChecks } from '../services/fieldCheckService';
import { resolveFieldCheck } from '../services/gameService';
import { finalizeVoteWinners } from '../services/voteService';
import { Report, FieldCheck } from '../types/game';
import { Card, FieldBadge } from '../components/UI';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { cn, formatSafeTimeOnly, formatSafeDateOnly } from '../lib/utils';
import { getDisplayLabel } from '../utils/labelUtils';

export default function AdminModerationPage() {
  const { user, isAdmin, currentWeekNumber, activeSeason } = useApp();
  const [reports, setReports] = useState<Report[]>([]);
  const [susReports, setSusReports] = useState<any[]>([]);
  const [fieldChecks, setFieldChecks] = useState<FieldCheck[]>([]);
  const [adminLogs, setAdminLogs] = useState<any[]>([]);
  const [view, setView] = useState<'reports' | 'sus' | 'fieldChecks' | 'audit'>('reports');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [selectedSusReport, setSelectedSusReport] = useState<any | null>(null);
  const [selectedFieldCheck, setSelectedFieldCheck] = useState<FieldCheck | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinalizingVotes, setIsFinalizingVotes] = useState(false);

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
                onClick={() => { setView('audit'); setSelectedReport(null); setSelectedSusReport(null); setSelectedFieldCheck(null); }}
                className={cn("px-4 py-1 text-[10px] font-bold uppercase tracking-widest", view === 'audit' ? "bg-on-surface text-paper" : "hover:bg-on-surface/5")}
               >
                 Audit Log
               </button>
            </div>
          </div>
        </div>
      </div>

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
