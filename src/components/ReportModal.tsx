import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, Sticker } from './UI';
import { AlertCircle, X, ShieldAlert, CheckCircle2, ChevronRight } from 'lucide-react';
import { ReportTargetType } from '../types/game';
import { createReport } from '../services/moderationService';
import { useApp } from '../context/AppContext';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: string;
  targetType: ReportTargetType;
  targetName?: string;
}

const REASONS = [
  { id: 'unsafe', label: 'Unsafe Activity', description: 'Trespassing, dangerous stunts, illegal areas' },
  { id: 'harassment', label: 'Harassment or Bullying', description: 'Targeted attacks, humiliation, threats' },
  { id: 'hate', label: 'Hate or Abusive Content', description: 'Slurs, discriminatory language' },
  { id: 'privacy', label: 'Privacy Issue', description: 'Personal info or photos without consent' },
  { id: 'sexual', label: 'Sexual or Graphic Content', description: 'Explicit or inappropriate imagery' },
  { id: 'spam', label: 'Spam/Fake Submission', description: 'Low quality or misleading' },
  { id: 'other', label: 'Other', description: 'Something else that violates rules' }
];

export function ReportModal({ isOpen, onClose, targetId, targetType, targetName }: ReportModalProps) {
  const { user } = useApp();
  const [step, setStep] = useState<'reason' | 'details' | 'success'>('reason');
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || !selectedReason) return;
    setIsSubmitting(true);
    await createReport(user.uid, targetId, targetType, selectedReason, details);
    setIsSubmitting(false);
    setStep('success');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
      <AnimatePresence mode="wait">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-paper w-full max-w-sm border-2 border-on-surface shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 border-b-2 border-on-surface bg-on-surface/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-error" />
              <h2 className="font-display text-sm uppercase tracking-tighter">Report Content</h2>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-black/10 rounded-full"><X className="w-4 h-4" /></button>
          </div>

          <div className="p-6">
            {step === 'reason' && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="micro-label">PROTOCOL_REPORT</p>
                  <p className="text-xs opacity-60">Why are you reporting this {targetType}?</p>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                  {REASONS.map((reason) => (
                    <button
                      key={reason.id}
                      onClick={() => {
                        setSelectedReason(reason.id);
                        setStep('details');
                      }}
                      className="w-full text-left p-3 border border-on-surface/10 hover:border-brand-orange hover:bg-brand-orange/5 transition-all group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold tracking-widest">{reason.label}</span>
                        <ChevronRight className="w-3 h-3 opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                      </div>
                      <p className="text-[8px] opacity-40 font-mono mt-1">{reason.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 'details' && (
              <div className="space-y-4">
                <button onClick={() => setStep('reason')} className="text-[8px] uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity flex items-center gap-1">
                  ← Back to Reasons
                </button>
                <div className="space-y-2">
                  <p className="micro-label">ADDITIONAL_DETAILS</p>
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="Provide more context for our moderators..."
                    className="w-full bg-on-surface/5 border-2 border-on-surface/10 p-3 text-xs focus:border-brand-orange outline-none h-24"
                  />
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full bureau-btn bg-error text-white text-[10px]"
                >
                  {isSubmitting ? 'SENDING_REPORT...' : 'SUBMIT_REPORT'}
                </button>
              </div>
            )}

            {step === 'success' && (
              <div className="text-center py-8 space-y-4">
                <div className="mx-auto w-12 h-12 bg-success/10 flex items-center justify-center rounded-full">
                  <CheckCircle2 className="w-6 h-6 text-success" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-display text-xl uppercase tracking-tighter">Report Filed</h3>
                  <p className="text-[10px] opacity-60">Our field analysts will investigate this transmission within 24 hours.</p>
                </div>
                <button onClick={onClose} className="w-full bureau-btn bg-on-surface text-paper text-xs">
                  CLOSE
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
