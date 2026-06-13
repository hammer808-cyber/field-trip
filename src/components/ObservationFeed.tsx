import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Observation } from '../types/observations';
import { useApp } from '../context/AppContext';
import { Card } from './UI';
import { X, Sparkles, MessageCircle, Radio } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';

export const ObservationFeed: React.FC = () => {
  const { observations, dismissObservation, profile } = useApp();
  const { skin } = useTheme();

  if (!observations.length || profile?.preferences?.reduceCommentary) return null;

  // Show only the most recent one to keep it clean
  const latest = observations[0];

  const isBaja = skin.id === 'baja-bratz';
  const isDiamond = skin.id === 'slippery-diamond';
  const isHeat = skin.id === 'heatwave';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full mb-10"
      >
        <div className={cn(
          "p-5 sm:p-8 relative border-4 flex flex-col md:flex-row gap-6 sm:gap-8 overflow-hidden",
          latest.observationType === 'Behavior' 
            ? "border-brand-orange bg-white shadow-[12px_12px_0px_var(--color-brand-orange)] sm:shadow-[16px_16px_0px_var(--color-brand-orange)]" 
            : "border-on-surface bg-white shadow-[8px_8px_0px_black] sm:shadow-[12px_12px_0px_black]",
          isBaja && "border-baja-pink bg-white shadow-[8px_8px_0px_#ff007f] rotate-1",
          isDiamond && "border-white/40 bg-white/5 backdrop-blur-xl",
          isHeat && "border-heat-pink bg-white rounded-3xl"
        )}>
          {/* HUD Scanline Overlay for default */}
          {!isBaja && !isDiamond && !isHeat && (
            <div className="absolute inset-0 pointer-events-none opacity-[0.02] z-50 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
          )}

          <div className={cn(
            "p-5 sm:p-6 border-4 shadow-[4px_4px_0px_black] sm:shadow-[6px_6px_0px_black] shrink-0 self-start relative z-10 -rotate-3",
            latest.observationType === 'Behavior' ? "bg-brand-orange text-white" : "bg-on-surface text-brand-lime",
            isBaja && "bg-baja-pink text-white",
            isDiamond && "bg-white text-black"
          )}>
            {latest.observationType === 'Behavior' ? <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 stroke-[2.5]" /> : <MessageCircle className="w-8 h-8 sm:w-10 sm:h-10 stroke-[2.2]" />}
          </div>

          <div className="flex-1 space-y-3 sm:space-y-4 text-left relative z-10">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                 <div className={cn("w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full animate-pulse", latest.observationType === 'Behavior' ? "bg-brand-orange" : "bg-brand-lime")} />
                 <p className={cn(
                   "text-[9px] sm:text-[10px] uppercase tracking-[0.4em] font-black leading-none",
                   latest.observationType === 'Behavior' ? "text-brand-orange" : "opacity-40"
                 )}>
                   SIGNAL_DECODEX // {latest.observationType.toUpperCase()}
                 </p>
              </div>
              <button 
                onClick={() => dismissObservation(latest.id)}
                className="opacity-20 hover:opacity-100 transition-opacity p-2 bg-on-surface/5 hover:bg-on-surface/10 hover:text-brand-orange"
              >
                <X className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
            <p className={cn(
              "text-2xl sm:text-3xl md:text-4xl font-display italic text-on-surface leading-[0.9] pr-10 sm:pr-12 font-black uppercase tracking-tighter",
              latest.observationType === 'Behavior' && "text-brand-orange"
            )}>
              "{latest.observationText}"
            </p>
            <div className="flex items-center gap-4 pt-2">
               <div className="h-[1px] flex-grow bg-on-surface/5" />
               <span className="text-[8px] font-mono opacity-20 uppercase tracking-widest">BUREAU_COMMS_STABLE</span>
            </div>
          </div>

          {/* Glitch detail */}
          <div className="absolute -bottom-6 -right-6 opacity-[0.05] pointer-events-none rotate-12 scale-150">
            <Radio className="w-32 h-32 stroke-[3] text-on-surface" />
          </div>

          {/* Decorative Corner */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-brand-lime/10 -skew-x-12 translate-x-12 -translate-y-12" />
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
