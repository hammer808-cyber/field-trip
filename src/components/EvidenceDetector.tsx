import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { ShieldAlert, ShieldCheck, Search, Loader2 } from 'lucide-react';

export type DetectorStatus = 
  | 'idle' 
  | 'analyzing' 
  | 'detected' 
  | 'not_detected' 
  | 'error' 
  | 'skipped' 
  | 'manual_review_required';

interface EvidenceDetectorProps {
  status: DetectorStatus;
  detectedText?: string;
  missingReason?: string;
  displayTitle?: string;
  displayDetail?: string;
  onRetry?: () => void;
  onManualReview?: () => void;
  className?: string;
}

export const EvidenceDetector: React.FC<EvidenceDetectorProps> = ({
  status,
  detectedText,
  missingReason,
  displayTitle,
  displayDetail,
  onRetry,
  onManualReview,
  className
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'detected': return 'bg-brand-lime';
      case 'analyzing': return 'bg-brand-orange';
      case 'not_detected': return 'bg-red-500';
      case 'error': return 'bg-brand-orange animate-pulse';
      case 'skipped':
      case 'manual_review_required': return 'bg-brand-cyan';
      default: return 'bg-on-surface/20';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'detected': return <ShieldCheck className="w-4 h-4 text-on-surface" />;
      case 'analyzing': return <Loader2 className="w-4 h-4 text-on-surface animate-spin" />;
      case 'not_detected': return <ShieldAlert className="w-4 h-4 text-white" />;
      case 'error': return <ShieldAlert className="w-4 h-4 text-on-surface" />;
      case 'skipped':
      case 'manual_review_required': return <Search className="w-4 h-4 text-on-surface" />;
      default: return <Search className="w-4 h-4 text-on-surface/40" />;
    }
  };

  const getPanelContent = () => {
    switch (status) {
      case 'idle':
        return {
          title: "Awaiting photo",
          subtitle: "Optical sensor standby"
        };
      case 'analyzing':
        return {
          title: "Analyzing proof...",
          subtitle: "Heuristic pattern match"
        };
      case 'detected':
        return {
          title: displayTitle || "Signal Verified",
          subtitle: displayDetail || "Subject Acquired"
        };
      case 'not_detected':
        return {
          title: displayTitle || "Target missing",
          subtitle: displayDetail || "Visual mismatch detected"
        };
      case 'error':
        return {
          title: displayTitle || "Uplink Error",
          subtitle: displayDetail || "Interference detected"
        };
      case 'skipped':
        return {
          title: displayTitle || "Scan skipped",
          subtitle: displayDetail || "Limits reached / Bypass active"
        };
      case 'manual_review_required':
        return {
          title: displayTitle || "Review Required",
          subtitle: displayDetail || "Send it in for a human look"
        };
    }
  };

  const content = getPanelContent();

  return (
    <div className={cn("flex items-stretch gap-3 h-14", className)}>
      {/* Indicator Light */}
      <div className="w-14 shrink-0 bg-white border-4 border-on-surface rounded-2xl flex items-center justify-center p-1 shadow-[4px_4px_0px_black]">
        <div className={cn(
          "w-full h-full rounded-full flex items-center justify-center transition-colors duration-500",
          getStatusColor(),
          status === 'analyzing' && "animate-pulse"
        )}>
          {getStatusIcon()}
        </div>
      </div>

      {/* Display Panel */}
      <div className="flex-grow bg-on-surface border-4 border-on-surface rounded-2xl overflow-hidden shadow-[4px_4px_0px_black] flex items-center px-4 relative">
        {/* Subtle grid bg for tech look */}
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:10px_10px]" />
        
        <div className="flex flex-col text-left relative z-10">
          <div className="font-display font-black uppercase text-xs italic tracking-tight text-white leading-tight">
            {content.title}
          </div>
          <div className="font-mono text-[8px] font-black uppercase tracking-widest text-brand-lime/60 mt-0.5">
            {content.subtitle}
          </div>
        </div>

        {/* Action button for manual flow if failed/missing */}
        {(status === 'error' || status === 'not_detected') && onRetry && (
           <button 
             onClick={onRetry}
             className="ml-auto bg-brand-orange text-white px-2 py-1 text-[8px] font-mono font-black uppercase border border-white/20 rounded hover:bg-white hover:text-on-surface transition-colors relative z-10"
           >
             RETRY
           </button>
        )}

        {(status === 'skipped' || status === 'manual_review_required') && onManualReview && (
           <button 
             onClick={onManualReview}
             className="ml-auto bg-brand-cyan text-on-surface px-2 py-1 text-[8px] font-mono font-black uppercase border border-white/40 rounded hover:bg-white transition-colors relative z-10"
           >
             SUBMIT_ANYWAY
           </button>
        )}
      </div>
    </div>
  );
};
