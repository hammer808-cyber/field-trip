import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Lock, Radio } from 'lucide-react';
import { cn } from '../lib/utils';

interface TabbedSectionProps {
  id: string;
  title: string;
  colorClass?: string;
  eyebrow?: string;
  titleClassName?: string;
  isOpen?: boolean;
  onToggle?: () => void;
  statusLabel?: string;
  statusVariant?: 'active' | 'locked' | 'results ready' | 'coming soon' | string;
  quote?: string;
  children: React.ReactNode;
}

export const TabbedSection: React.FC<TabbedSectionProps> = ({
  id,
  title,
  colorClass = "bg-brand-lime",
  eyebrow = "SECURE_PROTOCOL",
  titleClassName = "text-4xl sm:text-6xl md:text-7xl lg:text-8xl",
  isOpen = true,
  onToggle,
  statusLabel,
  statusVariant,
  quote,
  children
}) => {
  const getStatusColor = () => {
    switch (statusVariant) {
      case 'active':
        return 'bg-brand-lime text-on-surface border-on-surface ring-2 ring-brand-lime/30';
      case 'locked':
        return 'bg-on-surface/5 text-on-surface/40 border-on-surface/10 grayscale';
      case 'results ready':
        return 'bg-on-surface text-white border-on-surface shadow-[2px_2px_0px_black]';
      default:
        return 'bg-brand-orange/10 text-on-surface border-on-surface/20';
    }
  };

  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    }
  };

  return (
    <div className="border-b-4 border-on-surface w-full bg-transparent relative overflow-hidden">
      {/* Decorative background depth */}
      <div className="absolute inset-0 bg-[radial-gradient(var(--color-on-surface)_1px,transparent_0)] bg-[length:32px_32px] opacity-[0.02] pointer-events-none" />
      
      {/* Tab Header Button */}
      <button
        onClick={handleToggle}
        className={cn(
          "w-full text-left p-3 sm:p-10 flex items-center justify-between gap-3 sm:gap-6 hover:bg-on-surface/[0.015] transition-all focus:outline-none select-none relative z-10 group",
          isOpen ? "bg-on-surface/[0.02] pb-3 sm:pb-8" : "pb-4 sm:pb-12"
        )}
      >
        <div className="space-y-1 sm:space-y-3 flex-grow min-w-0">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <span className="text-[8px] sm:text-[10px] font-mono font-black uppercase tracking-[0.3em] text-on-surface/40">
              {eyebrow}
            </span>
            {statusLabel && (
              <span className={cn(
                "px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-none border sm:border-2 border-current text-[8px] sm:text-[9px] font-black uppercase tracking-widest transition-transform group-hover:scale-105",
                getStatusColor()
              )}>
                {statusLabel}
              </span>
            )}
          </div>
          <div className="field-label-wrapper">
            <div className="field-label-blue">
              <h2 className={cn(
                "field-label-blue-text select-none break-words",
                titleClassName.replace("text-4xl", "text-xl"), // Scale down base size for mobile
                "sm:" + titleClassName.split(" ").find(c => c.startsWith("text-")) // Keep original size for sm+
              )}>
                {title}
              </h2>
            </div>
          </div>
          {quote && !isOpen && (
            <p className="text-[10px] sm:text-[11px] font-mono text-on-surface/50 font-black italic truncate max-w-xl">
              "{quote}"
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <div className={cn(
            "w-8 h-8 sm:w-12 sm:h-12 rounded-full border sm:border-2 border-on-surface flex items-center justify-center shadow-[1.5px_1.5px_0px_black] sm:shadow-[2px_2px_0px_black] transition-all",
            isOpen ? "bg-on-surface text-white rotate-180" : "bg-white text-on-surface"
          )}>
            <ChevronDown className="w-3.5 h-3.5 sm:w-5 sm:h-5 stroke-[2.5]" />
          </div>
        </div>
      </button>

      {/* Accordion Content Panel */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden bg-white relative"
          >
            {quote && (
              <div className="p-4 sm:p-8 border-b-2 border-on-surface/5 bg-[#F1E6D0]/10 flex items-start gap-3 sm:gap-4">
                <Radio className="w-4 h-4 sm:w-5 sm:h-5 text-brand-orange shrink-0 mt-0.5 animate-pulse" />
                <p className="font-serif italic text-sm sm:text-base text-on-surface/80 leading-relaxed max-w-3xl">
                  "{quote}"
                </p>
              </div>
            )}
            <div className="relative">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
