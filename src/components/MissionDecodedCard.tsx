import React from 'react';
import { motion } from 'motion/react';
import { TripCard as TripType } from '../types/challenges';
import { 
  Camera, 
  Zap, 
  MapPin, 
  Clock, 
  Timer, 
  HelpCircle, 
  RotateCcw, 
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Info,
  Sparkles
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { 
  getFrankieTitle,
  getFrankieDescription,
  getFrankieDirections,
  getFrankieDirectionsArray,
  getFrankieFieldNotePrompt,
  getFrankieDifficultyLabel,
  getFrankieEstimatedTimeLabel,
  getFrankieEvidenceLabel
} from '../logic/frankieModeLogic';
import { cn } from '../lib/utils';

interface MissionDecodedCardProps {
  mission: TripType;
  progress?: any;
  onStart: () => void;
  onRedraw?: () => void;
  onDismiss?: () => void;
  onHint?: () => void;
  isRedrawable?: boolean;
  isHintUsed?: boolean;
  statusLabel?: string;
  className?: string;
}

export function MissionDecodedCard({ 
  mission, 
  progress = {},
  onStart, 
  onRedraw, 
  onDismiss,
  onHint,
  isRedrawable = true,
  isHintUsed = false,
  statusLabel,
  className
}: MissionDecodedCardProps) {
  const { frankieMode, fc } = useTheme();
  const fPref = { frankieMode };
  
  const evidenceRequirements = [
    { key: 'photo', label: getFrankieEvidenceLabel(mission, 'photo', fPref), icon: Camera, required: (mission.proofType || mission.requiredProof || []).includes('photo') },
    { key: 'note', label: getFrankieEvidenceLabel(mission, 'field_note', fPref), icon: Zap, required: (mission.proofType || mission.requiredProof || []).includes('note') },
    { key: 'location', label: getFrankieEvidenceLabel(mission, 'location', fPref), icon: MapPin, required: (mission.proofRequirements?.requireLocation || mission.proofNeeded?.toLowerCase().includes('location') || (mission.tags || []).includes('location') || (mission.proofType || []).includes('location')) },
  ].filter(r => r.required);

  const isCollected = (key: string) => !!progress[key === 'note' ? 'field_note' : key];

  const directions = getFrankieDirectionsArray(mission, fPref);

  const difficultyConfig = {
    easy: { label: fc('Scout', 'SIMPLE'), color: 'bg-brand-lime', text: 'text-on-surface' },
    medium: { label: fc('Vanguard', 'MODERATE'), color: 'bg-brand-cyan', text: 'text-on-surface' },
    hard: { label: fc('Elite', 'HARD'), color: 'bg-brand-orange', text: 'text-white' }
  };

  const diff = difficultyConfig[mission.difficulty as keyof typeof difficultyConfig] || difficultyConfig.easy;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      className={cn("w-full max-w-md mx-auto relative group", className)}
    >
      {/* Decoded Label Badge */}
      <div className="absolute -top-4 left-6 z-20">
        <div className="bg-on-surface text-brand-lime py-1 px-4 border-2 border-on-surface shadow-[4px_4px_0px_black] transform -rotate-1">
          <p className="font-outfit text-[10px] font-black uppercase tracking-[0.3em] italic">
            {statusLabel || 'MISSION_DECODED_v1.0'}
          </p>
        </div>
      </div>

      {/* Main Card Container */}
      <div className="bg-white border-4 border-on-surface shadow-[16px_16px_0px_black] overflow-hidden flex flex-col relative">
        {/* Top Visual Section */}
        <div className="h-48 sm:h-56 relative bg-on-surface/5 overflow-hidden group-hover:bg-on-surface/10 transition-colors">
          <img 
            src={mission.image || 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&q=80&w=800'} 
            alt="" 
            className="w-full h-full object-cover grayscale brightness-110 contrast-125 transition-all duration-700 group-hover:grayscale-0 group-hover:scale-110" 
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-on-surface/60 to-transparent opacity-60" />
          
          {/* Difficulty & Points Tags */}
          <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
            <div className="flex flex-col gap-1">
              <span className={cn(
                "px-2 py-0.5 text-[9px] font-black uppercase italic border-2 border-on-surface shadow-[3px_3px_0px_black]",
                diff.color,
                diff.text
              )}>
                {diff.label}_STATUS
              </span>
              <h3 className="text-white font-outfit text-2xl font-black uppercase tracking-tighter leading-none drop-shadow-md truncate max-w-[200px]">
                {getFrankieTitle(mission, fPref)}
              </h3>
            </div>
            <div className="bg-on-surface text-brand-lime px-3 py-1 font-outfit text-xl font-black italic border-2 border-on-surface shadow-[4px_4px_0px_black]">
              +{mission.baseXP || mission.basePoints || 100}XP
            </div>
          </div>

          {/* Decorative Corner */}
          <div className="absolute top-0 right-0 p-4">
             <div className="w-12 h-12 border-t-4 border-r-4 border-brand-orange opacity-40" />
          </div>
        </div>

        {/* Content Section */}
        <div className="p-6 space-y-6 text-left">
          {/* Description */}
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 italic">{fc('Mission_Protocol', 'MISSION DETAILS')}</p>
            <div className="space-y-4">
              {directions.map((step, i) => (
                <p key={i} className="font-serif italic text-lg leading-snug text-on-surface/90">
                  {directions.length > 1 && <span className="not-italic font-sans text-xs opacity-40 mr-2">{i + 1}.</span>}
                  "{step}"
                </p>
              ))}
            </div>
          </div>

          {/* Field Note Prompt */}
          <div className="bg-brand-lime/10 border-l-4 border-brand-lime p-4 space-y-1">
            <div className="flex items-center gap-2 mb-1">
               <Zap className="w-3 h-3 text-brand-lime" />
               <span className="text-[9px] font-black uppercase tracking-widest text-on-surface/60">{fc('Field Note Request', 'FIELD NOTE')}</span>
            </div>
            <p className="text-xs font-medium italic text-on-surface leading-relaxed">
              "{getFrankieFieldNotePrompt(mission, fPref)}"
            </p>
          </div>

          {/* Evidence Grid */}
          <div className="space-y-3">
             <div className="flex justify-between items-center text-[10px] font-black uppercase italic tracking-widest opacity-40">
                <span>{fc('Core_Evidence_Checklist', 'PROOF CHECKLIST')}</span>
                <span className="flex items-center gap-1">
                  <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
                    <Sparkles className="w-3 h-3" />
                  </motion.div>
                  {fc('Zine_Seed_Eligible', 'BONUS ELIGIBLE')}
                </span>
             </div>
             <div className="flex flex-wrap gap-2">
                {evidenceRequirements.map((r, i) => {
                  const Icon = r.icon;
                  const collected = isCollected(r.key);
                  return (
                    <div key={i} className={cn(
                      "flex items-center gap-2 px-3 py-1.5 border-2 transition-all",
                      collected 
                        ? "bg-brand-lime border-on-surface shadow-[4px_4px_0px_black] -translate-y-0.5" 
                        : "border-on-surface/10 bg-on-surface/5 group-hover:border-on-surface/30 opacity-60"
                    )}>
                      <Icon className={cn("w-3.5 h-3.5", collected ? "text-on-surface" : "opacity-40")} />
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-tight leading-none">{r.label}</span>
                        <span className="text-[7px] font-bold uppercase opacity-40 leading-none mt-0.5">{collected ? fc('COLLECTED', 'DONE') : fc('REQUIRED', 'NEEDED')}</span>
                      </div>
                      {collected && <CheckCircle2 className="w-3.5 h-3.5 text-on-surface ml-1" />}
                    </div>
                  );
                })}
             </div>
          </div>

          {/* Metadata Bar */}
          <div className="flex justify-between items-center pt-4 border-t-2 border-on-surface/5 text-[10px] font-black uppercase tracking-widest opacity-40 italic">
             <div className="flex items-center gap-1.5">
                <Timer className="w-3.5 h-3.5" />
                <span>{fc('Est. Time: ', 'TIME: ')}{getFrankieEstimatedTimeLabel(mission, fPref)}</span>
             </div>
             <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{fc('Difficulty: ', 'DIFF: ')}{getFrankieDifficultyLabel(mission, fPref)}</span>
             </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 pt-2">
            <div className="flex flex-col sm:flex-row gap-3">
               <button 
                 onClick={onStart}
                 className="flex-[3] bg-brand-orange text-white py-4 font-outfit text-xl font-black uppercase tracking-tight italic border-4 border-on-surface shadow-[6px_6px_0px_black] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-3"
               >
                 {Object.keys(progress).length >= 1 ? fc('RESUME_MISSION', 'RESUME') : fc('START_MISSION', 'START')}
                 <ArrowRight className="w-6 h-6" />
               </button>
               
               {onHint && (
                 <button 
                   onClick={onHint}
                   className={cn(
                     "flex-1 border-4 border-on-surface shadow-[6px_6px_0px_black] flex flex-col items-center justify-center transition-all active:translate-x-1 active:translate-y-1 active:shadow-none p-2",
                     isHintUsed ? "bg-brand-orange text-white" : "bg-white text-on-surface hover:bg-brand-cyan/20"
                   )}
                 >
                   <HelpCircle className="w-5 h-5 mb-0.5" />
                   <span className="text-[8px] font-black uppercase tracking-tighter leading-none">{isHintUsed ? fc('HINT_ACTIVE', 'HINT USED') : fc('GET_HINT', 'HINT')}</span>
                 </button>
               )}

               {isRedrawable && onRedraw && (
                 <button 
                   onClick={onRedraw}
                   className="flex-1 bg-brand-lime border-4 border-on-surface shadow-[6px_6px_0px_black] flex items-center justify-center hover:bg-on-surface hover:text-brand-lime transition-all active:translate-x-1 active:translate-y-1 active:shadow-none h-[68px]"
                   title="Redraw Mission"
                 >
                   <RotateCcw className="w-6 h-6" />
                 </button>
               )}
            </div>
            
            {onDismiss && (
              <button 
                onClick={onDismiss}
                className="w-full py-2 border-2 border-dashed border-on-surface/20 text-on-surface/30 font-outfit text-[10px] font-bold uppercase tracking-widest hover:bg-on-surface/5 hover:text-on-surface/60 transition-all flex items-center justify-center gap-2"
              >
                <Info className="w-3 h-3" />
                Dismiss to Deck Library
              </button>
            )}
          </div>
        </div>
        
        {/* Background Scanline Pattern */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(0,0,0,0.1)_50%,transparent_50%)] bg-[length:100%_4px]" />
      </div>
    </motion.div>
  );
}
