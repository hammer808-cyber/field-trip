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

  const isBaja = skin.id === 'baja-bratz';
  const isDiamond = skin.id === 'slippery-diamond';
  const isHeat = skin.id === 'heatwave';

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
        "p-6 bg-white border-4 border-on-surface shadow-[12px_12px_0px_rgba(0,0,0,0.1)]"
      )}>
        {/* Signal Icon & Type */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className={cn(
              "p-3 border-4 shadow-[4px_4px_0px_black]",
              isBaja ? "bg-baja-pink text-white rounded-full" :
              isDiamond ? "bg-white text-black rounded-none" :
              isHeat ? "bg-heat-pink text-white rounded-full" :
              "bg-brand-lime text-black border-on-surface"
            )}>
              {activeSignal.signalType === 'bonus' ? <Zap className="w-8 h-8 stroke-[3]" /> : 
               activeSignal.signalType === 'multiplier' ? <Sparkles className="w-8 h-8 stroke-[3]" /> : 
               <Radio className="w-8 h-8 stroke-[3]" />}
            </div>
            <div className="text-left">
              <p className={cn(
                "micro-label uppercase tracking-[0.4em] font-black",
                isBaja ? "text-baja-pink" : "text-brand-orange"
              )}>
                {activeSignal.signalType}_SIGNAL // HV_DETECTION
              </p>
              <h3 className={cn(
                "font-display text-4xl uppercase tracking-tighter leading-[0.8] mt-1 font-black",
                isBaja ? "text-baja-pink" : isDiamond ? "text-white" : isHeat ? "text-heat-pink" : "text-on-surface"
              )}>
                {activeSignal.title}
              </h3>
            </div>
          </div>
          
          <div className="text-left md:text-right bg-white md:bg-transparent p-2 md:p-0 border-2 md:border-0 border-on-surface shadow-[4px_4px_0px_rgba(0,0,0,0.05)] md:shadow-none">
            <p className="micro-label opacity-40 mb-1 font-black tracking-widest">SIGNAL_EXPIRATION</p>
            <div className={cn(
              "font-mono text-xl flex items-center md:justify-end gap-2 font-black",
              isBaja ? "text-baja-pink" : isDiamond ? "text-white" : isHeat ? "text-heat-pink" : "text-brand-orange"
            )}>
              <Timer className="w-5 h-5 stroke-[3]" />
              {timeLeft}
            </div>
          </div>
        </div>

        {/* Description & Flavor */}
        <div className="space-y-6 relative z-10 text-left">
          <div className="bg-paper-dark p-6 border-l-8 border-on-surface shadow-inner">
            <p className={cn(
              "font-serif text-xl italic leading-tight font-medium",
              isDiamond ? "text-white/60" : "text-on-surface"
            )}>
              "{activeSignal.description}"
            </p>
          </div>
          
          <div className={cn(
            "p-6 flex items-center justify-between border-4",
            isBaja ? "bg-white/40 border-baja-pink rounded-2xl" : 
            isDiamond ? "bg-white/5 border-white/40" :
            isHeat ? "bg-heat-yellow/20 border-white rounded-2xl" : 
            "bg-on-surface text-brand-lime border-on-surface shadow-[8px_8px_0px_rgba(0,0,0,0.1)]"
          )}>
            <div className="flex items-center gap-4">
              <Zap className={cn("w-8 h-8", isBaja ? "text-baja-pink" : "text-brand-lime")} />
              <span className={cn(
                "font-display text-2xl uppercase tracking-tighter font-black",
                isBaja ? "text-baja-pink" : "text-brand-lime"
              )}>
                {activeSignal.bonusRule}
              </span>
            </div>
            <button 
              onClick={() => setShowInfo(!showInfo)}
              className="p-2 bg-white/20 hover:bg-white/40 transition-colors"
            >
              <Info className="w-6 h-6" />
            </button>
          </div>

          {showInfo && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="overflow-hidden"
            >
              <div className="pt-4 pb-2 space-y-3">
                <p className="micro-label font-black text-brand-orange">SYSTEM_NOTES</p>
                <p className="text-[11px] leading-relaxed font-mono font-bold uppercase opacity-60">
                   Field Signals are real-time modifiers injected by the Bureau to reward adaptive behavior. 
                   Submitting reports during this window yields high-voltage clearance bonuses.
                </p>
                {activeSignal.flavorText && (
                  <p className="text-[10px] leading-relaxed font-mono text-on-surface font-black bg-brand-lime/10 p-2 border border-brand-lime/20">
                    &gt; OBS_DATA: {activeSignal.flavorText}
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
