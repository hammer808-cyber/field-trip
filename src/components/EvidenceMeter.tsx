import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Zap, Camera, FileText, Lock } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface EvidenceMeterProps {
  photoCaptured: boolean;
  noteAdded: boolean;
  detectedSubject?: boolean;
  missionMatchScore?: number;
  bonusCriteriaMet?: boolean;
  maxStrength?: number;
  className?: string;
  variant?: 'compact' | 'normal';
}

export const EvidenceMeter: React.FC<EvidenceMeterProps> = ({
  photoCaptured,
  noteAdded,
  detectedSubject = false,
  missionMatchScore = 0,
  bonusCriteriaMet = false,
  maxStrength = 200,
  className,
  variant = 'normal'
}) => {
  const { unlockDiscoverySticker } = useApp();
  const [displayStrength, setDisplayStrength] = useState(0);
  const proofPoints = Math.max(1, Math.round(maxStrength * 0.7));
  const notePoints = Math.max(1, Math.round(maxStrength * 0.2));
  const bonusPoints = Math.max(0, maxStrength - proofPoints - notePoints);

  // Trigger discovery sticker
  useEffect(() => {
    if (photoCaptured && noteAdded) {
      unlockDiscoverySticker('evidence_meter_bonus_seen', 'capture');
    }
  }, [photoCaptured, noteAdded, unlockDiscoverySticker]);
  
  // Scale evidence potential to the mission's base XP so the meter agrees with the mission card.
  const targetStrength = 
    (photoCaptured ? proofPoints : 0) + 
    (noteAdded ? notePoints : 0) + 
    (detectedSubject ? bonusPoints : 0);

  // Simple counting animation for Strength
  useEffect(() => {
    const timer = setInterval(() => {
      setDisplayStrength(prev => {
        if (prev < targetStrength) return Math.min(prev + 5, targetStrength);
        if (prev > targetStrength) return Math.max(prev - 5, targetStrength);
        return prev;
      });
    }, 20);
    return () => clearInterval(timer);
  }, [targetStrength]);

  const progressPercent = (displayStrength / maxStrength) * 100;

  if (variant === 'compact') {
    return (
      <div className={cn("w-full bg-[#FAF8F5] p-3 rounded-2xl border-4 border-on-surface field-paper-shadow relative overflow-hidden group", className)}>
        {/* Background Paper Texture */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/graphy-dark.png')] opacity-5 pointer-events-none" />
        
        <div className="flex items-center justify-between relative z-10 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-brand-cyan flex items-center justify-center border-2 border-on-surface shadow-[2px_2px_0px_black] group-hover:rotate-6 transition-transform">
              <Zap className="w-3.5 h-3.5 text-on-surface fill-on-surface" />
            </div>
            <div>
              <h4 className="text-on-surface font-display text-xs font-black uppercase italic tracking-tighter leading-none">Evidence_Meter</h4>
              <p className="text-[7px] font-mono text-brand-cyan font-black uppercase tracking-widest mt-0.5">UPLINK // ACTIVE</p>
            </div>
          </div>
          
          <div className="flex gap-1 items-center bg-on-surface text-white px-2 py-1 border-2 border-on-surface shadow-[3px_3px_0px_black] rotate-[-2deg]">
            <span className="text-sm font-display font-black italic tracking-tighter text-brand-lime">
              {displayStrength}
            </span>
            <span className="text-[8px] font-mono font-black text-white/40 uppercase">/ {maxStrength} POTENTIAL</span>
          </div>
        </div>

        {/* Small Progress Bar */}
        <div className="relative h-4 bg-on-surface/5 border-2 border-on-surface rounded-full overflow-hidden shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] mb-3">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ type: 'spring', stiffness: 50, damping: 20 }}
            className="absolute inset-y-0 left-0 bg-brand-cyan border-r-2 border-on-surface shadow-[0_0_12px_rgba(33,212,253,0.3)]"
          />
        </div>

        {/* Compact Horizontal Bonus Chips */}
        <div className="grid grid-cols-3 gap-1.5 relative z-10">
          {[
            { icon: <Camera className="w-3 h-3" />, label: 'Proof', pts: `+${proofPoints}`, fulfilled: photoCaptured },
            { icon: <FileText className="w-3 h-3" />, label: 'Note', pts: `+${notePoints}`, fulfilled: noteAdded },
            { icon: detectedSubject ? <Zap className="w-3 h-3 fill-on-surface" /> : <Lock className="w-3 h-3" />, label: 'Bonus', pts: `+${bonusPoints}`, fulfilled: detectedSubject, locked: !detectedSubject }
          ].map((chip, i) => (
            <div key={i} className={cn(
              "flex flex-col items-center justify-center gap-0.5 py-1.5 px-0.5 rounded-xl border-2 transition-all",
              chip.fulfilled 
                ? "bg-brand-lime/10 border-on-surface text-on-surface shadow-[2px_2px_0px_black]" 
                : chip.locked
                ? "bg-on-surface/5 border-on-surface/10 text-on-surface/20"
                : "bg-white border-on-surface/10 text-on-surface/30"
            )}>
              <div className={cn(
                "w-5 h-5 rounded-md flex items-center justify-center transition-colors",
                chip.fulfilled ? "text-on-surface" : "text-current opacity-40"
              )}>
                {chip.icon}
              </div>
              <span className="text-[7px] font-mono font-black uppercase tracking-tighter leading-none">{chip.pts}</span>
            </div>
          ))}
        </div>
        
        <div className="field-tape w-8 h-3 absolute top-0 left-1/2 -translate-x-1/2 opacity-10 rotate-[-2deg]" />
      </div>
    );
  }

  return (
    <div className={cn("w-full bg-[#FAF8F5] p-6 rounded-[2rem] border-4 border-on-surface field-paper-shadow-lg relative overflow-hidden", className)}>
      {/* Background Paper Texture */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/graphy-dark.png')] opacity-10 pointer-events-none" />
      
      <div className="flex items-center justify-between relative z-10 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-brand-cyan flex items-center justify-center border-4 border-on-surface shadow-[4px_4px_0px_black] rotate-[-4deg] group-hover:rotate-0 transition-transform">
            <Zap className="w-6 h-6 text-on-surface fill-on-surface" />
          </div>
          <div className="flex flex-col">
            <h4 className="text-on-surface font-display text-xl font-black uppercase italic tracking-tighter leading-none">Evidence Meter</h4>
            <div className="flex items-center gap-2 mt-1">
              <span className="flex h-2 w-2 rounded-full bg-brand-lime animate-pulse" />
              <p className="text-[10px] font-mono text-on-surface/40 font-black uppercase tracking-widest leading-none">UPLINK_VERIFICATION // ACTIVE</p>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2 items-center bg-on-surface text-white px-4 py-2 border-4 border-on-surface shadow-[6px_6px_0px_black] rotate-[-2deg] rounded-xl self-start">
          <span className="text-4xl font-display font-black italic tracking-tighter text-brand-lime leading-none">
            {displayStrength}
          </span>
          <span className="text-[10px] font-mono font-black text-white/40 uppercase self-end mb-1">/ {maxStrength} POTENTIAL</span>
        </div>
      </div>

      {/* Progress Bar with Tactile Border */}
      <div className="relative h-12 bg-on-surface/5 border-4 border-on-surface rounded-2xl overflow-hidden shadow-[inset_0_4px_8px_rgba(0,0,0,0.1)] mb-8">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ type: 'spring', stiffness: 50, damping: 20 }}
          className="absolute inset-y-0 left-0 bg-brand-cyan border-r-4 border-on-surface shadow-[0_0_20px_rgba(33,212,253,0.4)]"
        >
          {/* Animated Glint */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-25deg] translate-x-[-100%] animate-[shimmer_4s_infinite]" />
        </motion.div>

        {/* Locked segment marker */}
        {!detectedSubject && (
          <div className="absolute right-0 top-0 bottom-0 w-[10%] bg-on-surface/5 flex items-center justify-center border-l-4 border-dashed border-on-surface/10">
             <Lock className="w-4 h-4 text-on-surface/20" />
          </div>
        )}
      </div>

      {/* XP Chips / Status Indicators */}
      <div className="grid grid-cols-3 gap-4 relative z-10">
        <StatusChip 
          icon={<Camera className="w-5 h-5" />} 
          label="Visual Proof" 
          pts={`+${proofPoints}`} 
          active={photoCaptured} 
        />
        <StatusChip 
          icon={<FileText className="w-5 h-5" />} 
          label="Field Note" 
          pts={`+${notePoints}`} 
          active={noteAdded} 
        />
        <StatusChip 
          icon={detectedSubject ? <Zap className="w-5 h-5 fill-on-surface" /> : <Lock className="w-5 h-5" />} 
          label="Signal Bonus" 
          pts={`+${bonusPoints}`} 
          active={detectedSubject} 
          locked={!detectedSubject}
        />
      </div>

      <AnimatePresence>
        {!photoCaptured && !noteAdded && (
           <motion.div 
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0 }}
             className="flex items-center justify-center gap-2 pt-6"
           >
             <span className="w-1.5 h-1.5 bg-brand-orange rounded-full animate-ping" />
             <p className="text-[10px] font-mono text-on-surface/30 font-black uppercase tracking-[0.2em] italic">
               Awaiting satellite handshake...
             </p>
           </motion.div>
        )}
      </AnimatePresence>
      
      {/* Decorative Tape */}
      <div className="field-tape w-16 h-5 absolute top-0 left-12 opacity-10 rotate-[-5deg] -translate-y-2" />
    </div>
  );
};

const StatusChip = ({ icon, label, pts, active, locked }: { icon: React.ReactNode, label: string, pts: string, active: boolean, locked?: boolean }) => (
  <div className={cn(
    "flex flex-col items-center gap-2 p-4 border-4 transition-all rounded-3xl relative overflow-hidden",
    active 
      ? "bg-brand-lime/10 border-on-surface text-on-surface shadow-[4px_4px_0px_black] rotate-[-1deg]" 
      : locked
      ? "bg-on-surface/5 border-on-surface/5 text-on-surface/10 opacity-60"
      : "bg-white border-on-surface/10 text-on-surface/30"
  )}>
    <div className={cn(
      "w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all",
      active ? "bg-brand-lime border-on-surface shadow-[2px_2px_0px_black] -rotate-3" : "bg-on-surface/5 border-on-surface/5"
    )}>
      {icon}
    </div>
    <div className="text-center flex flex-col items-center">
      <p className="text-[9px] font-display font-black uppercase tracking-wider leading-none mb-1">{label}</p>
      <div className={cn(
        "px-2 py-0.5 rounded-full border-2 text-[10px] font-mono font-black italic transition-all",
        active ? "bg-on-surface text-white border-on-surface" : "bg-on-surface/5 border-transparent"
      )}>
        {pts}
      </div>
    </div>
    {locked && (
      <div className="absolute inset-0 bg-transparent flex flex-col items-center justify-end pb-1.5">
         <span className="text-[7px] font-mono font-black text-on-surface/40 uppercase tracking-tighter italic">LOCKED</span>
      </div>
    )}
  </div>
);
