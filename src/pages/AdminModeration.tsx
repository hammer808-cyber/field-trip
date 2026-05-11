import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, Eye, User, FileText, ExternalLink } from 'lucide-react';
import { subscribeToPendingReports, performModerationAction, updateReportStatus } from '../services/moderationService';
import { Report } from '../types/game';
import { Card, Sticker } from '../components/UI';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';

export default function AdminModerationPage() {
  const { user, isAdmin } = useApp();
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    return subscribeToPendingReports(setReports);
  }, [isAdmin]);

  const handleAction = async (action: 'remove' | 'suspend' | 'warn' | 'dismiss' | 'reject') => {
    if (!selectedReport || !user) return;
    setIsSubmitting(true);
    
    await performModerationAction(
      user.uid,
      selectedReport.targetId,
      selectedReport.targetType,
      action,
      selectedReport.reason,
      actionReason
    );

    await updateReportStatus(selectedReport.id, action === 'dismiss' ? 'dismissed' : 'resolved');
    
    setIsSubmitting(false);
    setSelectedReport(null);
    setActionReason('');
  };

  if (!isAdmin) return <div className="p-20 text-center">ACCESS_DENIED. Admin clearance required.</div>;

  return (
    <div className="pb-40 px-6 pt-12 max-w-6xl mx-auto space-y-12">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Sticker color="orange">ADMIN_PANEL</Sticker>
            <h1 className="font-display text-4xl uppercase tracking-tighter">Internal Affairs</h1>
          </div>
          <div className="text-right">
            <p className="micro-label opacity-40">PENDING_REPORTS</p>
            <p className="text-2xl font-display text-error">{reports.length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Report List */}
        <div className="md:col-span-1 space-y-4">
          <p className="micro-label">INCOMING_QUEUE</p>
          <div className="space-y-2">
            {reports.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-on-surface/10">
                <CheckCircle className="w-8 h-8 mx-auto opacity-20 mb-2" />
                <p className="text-[10px] uppercase font-bold tracking-widest opacity-40">Queue Clear</p>
              </div>
            ) : (
              reports.map((report) => (
                <button
                  key={report.id}
                  onClick={() => setSelectedReport(report)}
                  className={cn(
                    "w-full text-left p-4 border-2 transition-all group",
                    selectedReport?.id === report.id ? "border-on-surface bg-on-surface/5" : "border-on-surface/10 hover:border-on-surface/30"
                  )}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[8px] uppercase font-bold tracking-[0.2em] px-2 py-0.5 bg-error/10 text-error">
                      {report.targetType}
                    </span>
                    <span className="text-[8px] opacity-40 font-mono">
                      {report.createdAt.toDate().toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-[10px] uppercase font-bold truncate">{report.reason}</p>
                  <p className="text-[8px] opacity-40 font-mono mt-1">ID: ...{report.targetId.slice(-8)}</p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Details Area */}
        <div className="md:col-span-2">
          <AnimatePresence mode="wait">
            {!selectedReport ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex flex-col items-center justify-center p-12 border-2 border-dashed border-on-surface/10 opacity-40"
              >
                <Shield className="w-12 h-12 mb-4" />
                <p className="text-[10px] uppercase font-bold tracking-widest">Select a report to investigate</p>
              </motion.div>
            ) : (
              <motion.div
                key="details"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <Card className="p-8 space-y-8">
                  <div className="flex items-start justify-between border-b-2 border-on-surface/5 pb-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-error" />
                        <h2 className="font-display text-2xl uppercase tracking-tighter">Case File</h2>
                      </div>
                      <p className="text-[10px] uppercase font-bold tracking-widest">
                        REPORT_TYPE: <span className="text-error">{selectedReport.reason.toUpperCase()}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="micro-label">STATUS</p>
                      <Sticker color="black">{selectedReport.status.toUpperCase()}</Sticker>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <p className="micro-label">REPORTER_ID</p>
                        <p className="text-xs font-mono">{selectedReport.reporterId}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="micro-label">TARGET_ID</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-mono">{selectedReport.targetId}</p>
                          <button className="text-brand-orange hover:underline text-[10px] font-bold uppercase flex items-center gap-1">
                            VIEW <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <p className="micro-label">SUBMITTED_DETAILS</p>
                        <p className="text-xs opacity-80 leading-relaxed italic border-l-2 border-on-surface/10 pl-4">
                          "{selectedReport.details || 'No additional details provided.'}"
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-8 border-t-2 border-on-surface/5 space-y-6">
                    <h3 className="font-display text-lg uppercase tracking-tighter">Moderation Action</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <p className="micro-label">INTERNAL_NOTES</p>
                        <textarea
                          placeholder="Why are you taking this action? (Visible to other admins)"
                          value={actionReason}
                          onChange={(e) => setActionReason(e.target.value)}
                          className="w-full bg-on-surface/5 border-2 border-on-surface/10 p-4 text-xs font-mono focus:border-on-surface outline-none h-24"
                        />
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <button
                          onClick={() => handleAction('dismiss')}
                          className="bureau-btn bg-on-surface/10 text-on-surface hover:bg-on-surface hover:text-paper"
                        >
                          DISMISS
                        </button>
                        <button
                          onClick={() => handleAction('reject')}
                          className="bureau-btn bg-brand-orange/20 text-brand-orange border-brand-orange hover:bg-brand-orange hover:text-white"
                        >
                          REJECT
                        </button>
                        <button
                          onClick={() => handleAction('remove')}
                          className="bureau-btn bg-error/20 text-error border-error hover:bg-error hover:text-white"
                        >
                          REMOVE
                        </button>
                        <button
                          onClick={() => handleAction('suspend')}
                          className="bureau-btn bg-black text-white hover:bg-error"
                        >
                          SUSPEND
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
