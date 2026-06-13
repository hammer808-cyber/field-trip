import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from './UI';
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
  const { user, profile } = useApp();
  const [step, setStep] = useState<'reason' | 'details' | 'success'>('reason');
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || !selectedReason) return;
    setIsSubmitting(true);
    await createReport(user.uid, profile?.name || user.displayName || 'Field Agent', targetId, targetType, selectedReason, details);
    setIsSubmitting(false);
    setStep('success');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 bg-white/40 backdrop-blur-md">
      <AnimatePresence mode="wait">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white w-full max-w-sm border-4 border-on-surface shadow-[16px_16px_0px_rgba(0,0,0,0.1)] overflow-hidden"
        >
          {/* Header */}
          <div className="p-5 border-b-4 border-on-surface bg-brand-orange text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-6 h-6 stroke-[3]" />
              <h2 className="font-display text-xl uppercase tracking-tighter font-black">Report Content</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 transition-colors"><X className="w-6 h-6 stroke-[3]" /></button>
          </div>

          <div className="p-8">
            {step === 'reason' && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="micro-label text-brand-orange font-black">PROTOCOL_REPORT</p>
                  <p className="text-sm font-bold opacity-60">Select violation category for this {targetType}:</p>
                </div>
                <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                  {REASONS.map((reason) => (
                    <button
                      key={reason.id}
                      onClick={() => {
                        setSelectedReason(reason.id);
                        setStep('details');
                      }}
                      className="w-full text-left p-4 border-4 border-on-surface hover:bg-brand-lime transition-all group shadow-[4px_4px_0px_black] active:shadow-none active:translate-x-1 active:translate-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase font-black tracking-widest">{reason.label}</span>
                        <ChevronRight className="w-5 h-5 opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                      </div>
                      <p className="text-[10px] opacity-60 font-mono mt-2 leading-tight uppercase font-bold">{reason.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 'details' && (
              <div className="space-y-6">
                <button onClick={() => setStep('reason')} className="text-[10px] uppercase tracking-widest font-black opacity-40 hover:opacity-100 transition-opacity flex items-center gap-2 mb-2">
                  ← REVISE_REASON
                </button>
                <div className="space-y-2">
                  <p className="micro-label font-black">ADDITIONAL_CONTEXT</p>
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="Provide evidence details for bureau analysts..."
                    className="w-full bg-white border-4 border-on-surface p-4 text-xs font-mono font-bold focus:ring-4 focus:ring-brand-lime outline-none h-32 placeholder:opacity-40"
                  />
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full bureau-btn bg-on-surface text-white py-6 text-sm font-black border-4 border-on-surface shadow-[8px_8px_0px_var(--color-brand-orange)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all"
                >
                  {isSubmitting ? 'UPLOADING_REPORT...' : 'DISPATCH_ANALYSTS'}
                </button>
              </div>
            )}

            {step === 'success' && (
              <div className="text-center py-10 space-y-6">
                <div className="mx-auto w-20 h-20 bg-brand-lime border-4 border-on-surface flex items-center justify-center shadow-[6px_6px_0px_black]">
                  <CheckCircle2 className="w-10 h-10 text-on-surface stroke-[3]" />
                </div>
                <div className="space-y-3">
                  <h3 className="font-display text-4xl uppercase tracking-tighter font-black">Report Filed</h3>
                  <p className="text-xs font-mono font-bold opacity-60 uppercase tracking-widest leading-loose">
                    Transmission secured.<br/>Analysts will evaluate within 24h.
                  </p>
                </div>
                <button onClick={onClose} className="w-full bureau-btn bg-on-surface text-white py-5 text-sm font-black shadow-[6px_6px_0px_var(--color-brand-cyan)]">
                  DISMISS
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
