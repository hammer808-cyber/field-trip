import React from 'react';
import { motion } from 'motion/react';
import { ProofReview } from '../types/proof';
import { Card } from './UI';
import { AlertTriangle, Info, Check, X, Camera, FileText } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';

interface ProofCorrectionProps {
  review: ProofReview;
  onRetry: () => void;
  onDone: () => void;
}

export const ProofCorrection: React.FC<ProofCorrectionProps> = ({ review, onRetry, onDone }) => {
  const { skin } = useTheme();

  const isBaja = skin === 'baja-bratz';
  const isDiamond = skin === 'slippery-diamond';
  const isHeat = skin === 'heatwave';

  const isRejected = review.status === 'rejected';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-sm"
    >
      <div className={cn(
        "w-full max-w-md p-8 space-y-8 overflow-hidden relative",
        isBaja ? "bg-white border-4 border-baja-pink rounded-[3rem] shadow-[12px_12px_0px_#40e0d0]" :
        isDiamond ? "bg-black/80 border border-white/20 rounded-none backdrop-blur-2xl" :
        isHeat ? "bg-white border-4 border-heat-pink rounded-[3rem]" :
        "bg-paper border-2 border-on-surface shadow-[10px_10px_0px_black]"
      )}>
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className={cn(
            "p-3 rounded-2xl",
            isRejected ? "bg-red-500 text-white" : "bg-brand-orange text-white"
          )}>
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div>
            <p className="micro-label opacity-40 uppercase">EVIDENCE_VERIFICATION</p>
            <h2 className="font-display text-2xl uppercase tracking-tighter leading-none">
              {isRejected ? 'Mission Failure' : 'Field Check Required'}
            </h2>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-4">
          <div className="bg-on-surface/5 p-4 rounded-2xl space-y-2 border-l-4 border-brand-orange">
            <p className="micro-label opacity-40 flex items-center gap-1">
              <Info className="w-3 h-3" /> BUREAU_FEEDBACK
            </p>
            <p className="text-sm italic font-serif leading-relaxed line-clamp-4">
              "{review.reviewNotes}"
            </p>
          </div>

          <div className="space-y-2">
            <p className="micro-label opacity-40 uppercase">Missing Data</p>
            <div className="space-y-1.5">
              {review.missingRequirements.map((req, i) => (
                <div key={i} className="flex items-center gap-2 text-xs font-mono opacity-80">
                  <X className="w-3 h-3 text-red-500" /> {req}
                </div>
              ))}
              {review.missingRequirements.length === 0 && (
                <div className="flex items-center gap-2 text-xs font-mono opacity-60">
                   <Check className="w-3 h-3 text-green-500" /> All physical data present. Clarity issues detected.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AI Insight */}
        <div className="p-4 border border-on-surface/10 rounded-2xl bg-on-surface/5">
           <p className="text-[10px] font-mono opacity-40 leading-tight">
             // PROOF_FINDER AGENT NOTE: This almost passes, but the Bureau prefers higher fidelity submissions. 
             If this was a spontaneous moment, consider adding a memo explaining the discrepancy.
           </p>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={onRetry}
            className={cn(
              "py-4 font-display uppercase tracking-widest text-xs rounded-full flex items-center justify-center gap-2 transition-all active:scale-95",
              isBaja ? "bg-baja-pink text-white shadow-[4px_4px_0px_#40e0d0]" :
              "bg-on-surface text-paper shadow-[6px_6px_0px_gray]"
            )}
          >
            <Camera className="w-3 h-3" /> Add Proof
          </button>
          <button 
            onClick={onDone}
            className="py-4 font-display uppercase tracking-widest text-xs rounded-full border border-on-surface/20 hover:bg-on-surface/5 transition-all active:scale-95"
          >
            Stay Pending
          </button>
        </div>

        {isBaja && (
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <Check className="w-32 h-32 rotate-12" />
          </div>
        )}
      </div>
    </motion.div>
  );
};
