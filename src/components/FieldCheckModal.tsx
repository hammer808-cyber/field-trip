import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldAlert, Send, CheckCircle2 } from 'lucide-react';
import { createFieldCheck } from '../services/fieldCheckService';
import { FieldCheckReason } from '../types/game';
import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';

interface FieldCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  submissionId: string;
  missionId: string;
  reportedUserId: string;
  reportedUserName: string;
}

const REASONS: { value: FieldCheckReason; label: string }[] = [
  { value: 'wrong_mission', label: "Doesn't match the mission" },
  { value: 'copied_or_reused', label: "Looks copied or reused" },
  { value: 'unsafe', label: "Unsafe" },
  { value: 'inappropriate', label: "Inappropriate" },
  { value: 'other', label: "Something else" }
];

export function FieldCheckModal({ 
  isOpen, 
  onClose, 
  submissionId, 
  missionId, 
  reportedUserId,
  reportedUserName 
}: FieldCheckModalProps) {
  const { fc } = useTheme();
  const [reason, setReason] = useState<FieldCheckReason | ''>('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || note.length < 5) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await createFieldCheck({
        submissionId,
        missionId,
        reportedUserId,
        reason,
        note,
        source: 'user_report'
      });
      setIsSuccess(true);
    } catch (err: any) {
      console.error('Field search submission failed:', err);
      setError(err.message || 'Transmission failed. Try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-on-surface/80 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-lg bg-white border-4 border-on-surface shadow-[16px_16px_0px_black] overflow-hidden"
          >
            {/* Header */}
            <div className="bg-on-surface text-white p-6 flex justify-between items-center border-b-4 border-on-surface">
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-6 h-6 text-brand-orange" />
                <h2 className="font-display text-2xl uppercase italic font-black tracking-tight tracking-tighter">
                  {fc('REQUEST_FIELD_CHECK', 'Request a Field Check')}
                </h2>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/10 transition-colors"
                disabled={isSubmitting}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8">
              {!isSuccess ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="bg-brand-lime/10 p-4 border-l-4 border-brand-lime">
                    <p className="text-sm font-bold text-on-surface italic">
                      {fc('BUREAU_NOTICE: The Council reviews these privately. Nothing changes until a moderator checks it.', 'The Council reviews these privately. Nothing changes until a moderator checks it.')}
                    </p>
                  </div>

                  {error && (
                    <div className="bg-error/10 p-4 border-l-4 border-error text-error text-sm font-bold uppercase italic">
                      {error}
                    </div>
                  )}

                  <div className="space-y-4">
                    <label className="micro-label font-black italic tracking-widest text-on-surface/60">
                      {fc('REASON_FOR_CHECK', 'Reason for Check')}
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {REASONS.map((r) => (
                        <button
                          key={r.value}
                          type="button"
                          onClick={() => setReason(r.value)}
                          className={cn(
                            "text-left p-4 border-2 font-bold uppercase italic transition-all shadow-[4px_4px_0px_black] active:shadow-none active:translate-x-1 active:translate-y-1",
                            reason === r.value 
                              ? "bg-brand-orange text-white border-on-surface" 
                              : "bg-white text-on-surface border-on-surface hover:bg-on-surface/5"
                          )}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="micro-label font-black italic tracking-widest text-on-surface/60 flex justify-between">
                      <span>{fc('FIELD_JOURNAL_NOTE', 'Field Note')}</span>
                      <span>{note.length}/500</span>
                    </label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder={fc('EXPLAIN_THE_REGRESSION...', 'Explain the issue here...')}
                      maxLength={500}
                      required
                      className="w-full bg-paper-dark border-4 border-on-surface p-4 font-serif text-lg focus:outline-none focus:ring-4 focus:ring-brand-lime/30 min-h-[120px] resize-none"
                    />
                    <p className="text-[10px] uppercase font-bold text-on-surface/40 italic">
                      MIN_LENGTH: 5_CHARS
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || !reason || note.length < 5}
                    className={cn(
                      "w-full py-4 font-display text-xl uppercase italic font-black border-4 border-on-surface shadow-[8px_8px_0px_black] transition-all flex items-center justify-center gap-3",
                      (isSubmitting || !reason || note.length < 5)
                        ? "bg-on-surface/20 text-on-surface/40 cursor-not-allowed shadow-none translate-x-1 translate-y-1"
                        : "bg-brand-lime text-on-surface hover:bg-white active:shadow-none active:translate-x-2 active:translate-y-2"
                    )}
                  >
                    {isSubmitting ? (
                      fc('TRANSMITTING...', 'Sending...')
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        {fc('INITIATE_FIELD_CHECK', 'Submit Field Check')}
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <div className="py-12 flex flex-col items-center text-center space-y-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-24 h-24 bg-brand-lime border-4 border-on-surface flex items-center justify-center shadow-[8px_8px_0px_black]"
                  >
                    <CheckCircle2 className="w-12 h-12 text-on-surface" />
                  </motion.div>
                  <div className="space-y-4">
                    <h3 className="font-display text-3xl font-black uppercase italic italic text-on-surface">
                      {fc('CHECK_TRANSMITTED', 'Field Check Sent')}
                    </h3>
                    <p className="font-serif text-lg text-on-surface/60 max-w-xs mx-auto italic">
                      {fc('The Council will review the evidence privately. Continue your missions, Agent.', 'Field Check sent. The Council will review it privately.')}
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="px-10 py-3 bg-on-surface text-white font-display text-lg uppercase italic font-black border-2 border-on-surface hover:bg-on-surface/90 transition-all shadow-[6px_6px_0px_var(--color-brand-orange)] active:shadow-none active:translate-x-1 active:translate-y-1"
                  >
                    {fc('RETURN_TO_ARCHIVE', 'Close')}
                  </button>
                </div>
              )}
            </div>
            
            {/* Footer scanline */}
            <div className="h-2 bg-on-surface/5 flex gap-1 px-1">
              {Array.from({ length: 40 }).map((_, i) => (
                <div key={i} className="h-full w-1 bg-on-surface/10" />
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
