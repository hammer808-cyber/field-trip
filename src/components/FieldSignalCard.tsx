import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { FieldSignal } from '../types/signals';
import { Card, Sticker } from './UI';
import { Timer, Zap, Sparkles, HelpCircle, Info, Radio } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';

interface FieldSignalCardProps {
  activeSignal: FieldSignal | null;
  loading?: boolean;
}

export const FieldSignalCard: React.FC<FieldSignalCardProps> = ({ activeSignal, loading }) => {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [showInfo, setShowInfo] = useState(false);
  const { skin } = useTheme();

  useEffect(() => {
    if (!activeSignal) return;

    const timer = setInterval(() => {
      const end = new Date(activeSignal.endDate).getTime();
      const now = new Date().getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft('EXPIRED');
        clearInterval(timer);
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [activeSignal]);

  const isBaja = skin === 'baja-bratz';
  const isDiamond = skin === 'slippery-diamond';
  const isHeat = skin === 'heatwave';

  if (loading) {
    return (
      <div className="w-full h-32 animate-pulse bg-on-surface/5 rounded-3xl border-2 border-dashed border-on-surface/10 flex items-center justify-center">
        <Radio className="w-6 h-6 opacity-20 animate-bounce" />
      </div>
    );
  }

  if (!activeSignal) {
    return (
      <Card className="border-dashed border-2 opacity-40 bg-transparent text-center p-8">
        <p className="font-serif italic">The frequency is quiet. No active Field Signals detected.</p>
        <p className="micro-label mt-2">STANDBY FOR DISPATCH</p>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative z-20"
    >
      <div className={cn(
        "relative transition-all duration-500",
        isBaja ? "p-6 bg-[#40e0d0]/10 border-4 border-baja-pink rounded-[2.5rem] shadow-[8px_8px_0px_#ff007f]" :
        isDiamond ? "p-6 bg-white/5 backdrop-blur-xl border border-white/20 rounded-none shadow-[0_0_40px_rgba(255,255,255,0.05)]" :
        isHeat ? "p-6 bg-white border-4 border-heat-pink rounded-[3rem] shadow-[12px_12px_0px_rgba(255,140,0,0.4)]" :
        "notice-card p-6 rotate-[-0.5deg] border-brand-orange/40 bg-paper-dark"
      )}>
        {/* Signal Icon & Type */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-full",
              isBaja ? "bg-baja-pink text-white" :
              isDiamond ? "bg-white text-black" :
              isHeat ? "bg-heat-pink text-white" :
              "bg-brand-orange text-white"
            )}>
              {activeSignal.signalType === 'bonus' ? <Zap className="w-4 h-4" /> : 
               activeSignal.signalType === 'multiplier' ? <Sparkles className="w-4 h-4" /> : 
               <Radio className="w-4 h-4" />}
            </div>
            <div>
              <p className={cn(
                "micro-label uppercase tracking-widest",
                isBaja ? "text-baja-pink font-bold" : "opacity-60"
              )}>
                {activeSignal.signalType}_SIGNAL // ACTIVE
              </p>
              <h3 className={cn(
                "font-display text-2xl uppercase tracking-tighter leading-none mt-1",
                isBaja ? "text-baja-pink" : isDiamond ? "text-white" : isHeat ? "text-heat-pink" : "text-on-surface"
              )}>
                {activeSignal.title}
              </h3>
            </div>
          </div>
          
          <div className="text-right">
            <p className="micro-label opacity-40 mb-1">SIGNAL_EXPIRY</p>
            <div className={cn(
              "font-mono text-sm flex items-center gap-2",
              isBaja ? "text-baja-pink" : isDiamond ? "text-white" : isHeat ? "text-heat-pink" : "text-brand-orange"
            )}>
              <Timer className="w-3 h-3" />
              {timeLeft}
            </div>
          </div>
        </div>

        {/* Description & Flavor */}
        <div className="space-y-3">
          <p className={cn(
            "font-serif text-sm italic leading-relaxed",
            isDiamond ? "text-white/60" : "opacity-80"
          )}>
            "{activeSignal.description}"
          </p>
          
          <div className={cn(
            "p-3 flex items-center justify-between",
            isBaja ? "bg-white/40 rounded-2xl" : 
            isDiamond ? "bg-white/5 border border-white/10" :
            isHeat ? "bg-heat-yellow/20 rounded-2xl" : 
            "bg-on-surface/5 rounded-lg border border-on-surface/10"
          )}>
            <div className="flex items-center gap-2">
              <Zap className={cn("w-4 h-4", isBaja ? "text-baja-pink" : "text-brand-orange")} />
              <span className={cn(
                "font-display text-sm uppercase tracking-tight",
                isBaja ? "text-baja-pink" : "text-on-surface"
              )}>
                {activeSignal.bonusRule}
              </span>
            </div>
            <button 
              onClick={() => setShowInfo(!showInfo)}
              className="opacity-40 hover:opacity-100 transition-opacity"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>

          {showInfo && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="overflow-hidden"
            >
              <div className="pt-2 pb-1 space-y-2">
                <p className="micro-label opacity-40">WHY THIS MATTERS</p>
                <p className="text-[10px] leading-relaxed font-serif opacity-60">
                   Field Signals are real-time modifiers injected by the Bureau to reward adaptive field behavior. 
                   Submitting reports that match active signal conditions yields prioritized clearance bonuses.
                </p>
                {activeSignal.flavorText && (
                  <p className="text-[10px] leading-relaxed font-mono text-brand-orange/60">
                    // OBS_DATA: {activeSignal.flavorText}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </div>

        {/* Decorative elements */}
        {isBaja && <div className="absolute -bottom-2 -left-2 w-8 h-8 bg-baja-aqua rounded-full opacity-40 blur-sm" />}
        {isDiamond && <div className="absolute top-0 right-0 w-full h-full liquid-chrome opacity-5 pointer-events-none" />}
      </div>
    </motion.div>
  );
};
