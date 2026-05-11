import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Observation } from '../types/observations';
import { useApp } from '../context/AppContext';
import { Card } from './UI';
import { X, Info, Sparkles, MessageCircle, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';

export const ObservationFeed: React.FC = () => {
  const { observations, dismissObservation, profile } = useApp();
  const { skin } = useTheme();

  if (!observations.length || profile?.preferences?.reduceCommentary) return null;

  // Show only the most recent one to keep it clean
  const latest = observations[0];

  const isBaja = skin === 'baja-bratz';
  const isDiamond = skin === 'slippery-diamond';
  const isHeat = skin === 'heatwave';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full mb-6"
      >
        <Card className={cn(
          "p-4 relative border-l-4 overflow-hidden",
          latest.observationType === 'Behavior' ? "border-brand-orange bg-brand-orange/5" : "border-on-surface/40 bg-on-surface/5",
          isBaja && "border-baja-pink bg-baja-pink/5 grayscale-0",
          isDiamond && "border-white/40 bg-white/5 backdrop-blur-xl",
          isHeat && "border-heat-pink bg-heat-yellow/10 grayscale-0"
        )}>
          <div className="flex gap-4 items-start">
            <div className={cn(
              "p-2 rounded-xl shrink-0",
              latest.observationType === 'Behavior' ? "bg-brand-orange/10 text-brand-orange" : "bg-on-surface/10 text-on-surface/60",
              isBaja && "bg-baja-pink/10 text-baja-pink",
              isDiamond && "bg-white/10 text-white"
            )}>
              {latest.observationType === 'Behavior' ? <Sparkles className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex justify-between items-center">
                <p className={cn(
                  "micro-label uppercase tracking-widest leading-none",
                  latest.observationType === 'Behavior' ? "text-brand-orange" : "opacity-40"
                )}>
                  BUREAU_OBSERVATION // {latest.observationType}
                </p>
                <button 
                  onClick={() => dismissObservation(latest.id)}
                  className="opacity-20 hover:opacity-100 transition-opacity p-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <p className="text-[11px] font-mono leading-relaxed pr-6">
                {latest.observationText}
              </p>
            </div>
          </div>

          {/* Glitch detail */}
          <div className="absolute -bottom-2 -right-2 opacity-5 pointer-events-none">
            <AlertCircle className="w-12 h-12" />
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};
