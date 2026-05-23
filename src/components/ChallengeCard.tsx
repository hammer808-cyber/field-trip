import React from 'react';
import { TripCard as TripCardType, ProofType } from '../types/challenges';
import { cn } from '../lib/utils';
import { 
  Zap, 
  MapPin, 
  Users, 
  Eye, 
  CheckCircle2, 
  Lock, 
  Clock, 
  Camera,
  FileText,
  Heart,
  Vote as VoteIcon,
  HelpCircle,
  Play,
  ArrowRight,
  Timer,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { 
  getFrankieTitle,
  getFrankieDescription,
  getFrankieFieldNotePrompt,
  getFrankieDifficultyLabel,
  getFrankieEstimatedTimeLabel,
  getFrankieEvidenceLabel
} from '../logic/frankieModeLogic';
import { useTheme } from '../context/ThemeContext';
import { Sticker } from './UI';

export interface EvidenceProgress {
  photo?: boolean;
  field_note?: boolean;
  location?: boolean;
  reaction?: boolean;
  vote?: boolean;
  time_window?: boolean;
  hintUsed?: boolean;
}

interface Props {
  challenge: TripCardType;
  progress?: EvidenceProgress;
  onStart?: () => void;
  onSubmit?: () => void;
  onHint?: () => void;
  hintUsed?: boolean;
  className?: string;
}

export function MissionCard({ 
  challenge, 
  progress = {}, 
  onStart, 
  onSubmit, 
  onHint,
  hintUsed = false,
  className 
}: Props) {
  const { skin, frankieMode, fc } = useTheme();
  const fPref = { frankieMode };
  
  const isBaja = skin.id === 'baja-bratz';
  const isDiamond = skin.id === 'slippery-diamond';
  const isHeat = skin.id === 'heatwave';

  const typeIcons: Record<string, any> = {
    'Field Challenge': MapPin,
    'Evidence Challenge': Camera,
    'Social Spark': Users,
    'Onboarding': Eye,
    'Bonus': Zap
  };

  const Icon = typeIcons[challenge.category || challenge.type] || Zap;

  const currentLane = challenge.lane || 'core';
  const baseXP = challenge.baseXP || challenge.basePoints || 100;

  const evidenceRequirements = [
    { key: 'photo', label: getFrankieEvidenceLabel(challenge, 'photo', fPref), icon: Camera, required: (challenge.proofType || challenge.requiredProof || []).includes('photo') },
    { key: 'field_note', label: getFrankieEvidenceLabel(challenge, 'field_note', fPref), icon: Zap, required: (challenge.proofType || challenge.requiredProof || []).includes('note') },
    { key: 'location', label: getFrankieEvidenceLabel(challenge, 'location', fPref), icon: MapPin, required: (challenge.proofRequirements?.requireLocation || challenge.proofNeeded?.toLowerCase().includes('location') || (challenge.tags || []).includes('location') || (challenge.proofType || []).includes('location')) },
  ].filter(req => req.required);

  const isCollected = (key: string) => !!progress[key as keyof EvidenceProgress];

  return (
    <div 
      className={cn(
        "group relative flex flex-col transition-all overflow-hidden text-left",
        challenge.status === 'locked' && "opacity-60 grayscale cursor-not-allowed",
        isBaja ? "bg-white border-2 border-baja-pink rounded-xl shadow-md" :
        isDiamond ? "bg-black/80 border border-white/20 shadow-2xl text-white" :
        isHeat ? "bg-white border-4 border-heat-pink rounded-[2rem] shadow-lg" :
        "bg-white border-4 border-on-surface shadow-[12px_12px_0px_black] hover:shadow-[16px_16px_0px_var(--color-brand-lime)]"
      , className)}
    >
      {/* Decorative ID Label */}
      <div className={cn(
        "absolute top-0 right-0 px-4 py-1.5 text-[9px] font-mono uppercase tracking-[0.3em] z-20 font-black italic",
        isBaja ? "bg-baja-aqua text-white rounded-bl-xl" :
        isDiamond ? "bg-white text-black" :
        isHeat ? "bg-heat-yellow text-heat-pink rounded-bl-2xl" :
        "bg-on-surface text-brand-lime border-l-4 border-b-4 border-on-surface"
      )}>
        {currentLane.toUpperCase()}
      </div>

      <div className="p-6 space-y-6 flex flex-col h-full relative z-10">
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-1 flex-1 min-w-0">
             <div className="flex items-center gap-2 mb-1">
                <Icon className="w-3.5 h-3.5 text-brand-orange" />
                <span className="text-[10px] font-black uppercase tracking-widest opacity-40 italic">{fc(challenge.category || challenge.type, (challenge.category || challenge.type).split(' ')[0].toUpperCase())}</span>
             </div>
             <h3 className="font-outfit text-2xl leading-none uppercase tracking-tight font-black italic text-on-surface">
               {getFrankieTitle(challenge, fPref)}
             </h3>
          </div>
          <div className="bg-on-surface text-brand-lime px-2 py-1 text-sm font-black italic border-2 border-on-surface shadow-[4px_4px_0px_black] shrink-0">
            +{baseXP}{fc('XP', ' PTS')}
          </div>
        </div>

        <p className="text-sm font-sans leading-relaxed text-on-surface/80">
          "{getFrankieDescription(challenge, fPref)}"
        </p>

        {/* Field Note Prompt */}
        <div className="bg-brand-lime/10 border-l-4 border-brand-lime p-4 space-y-1">
          <p className="text-[9px] font-black uppercase tracking-widest text-on-surface/60">{fc('Field Note Requirement', 'NOTES')}</p>
          <p className="text-[10px] font-medium italic text-on-surface leading-relaxed">
            "{getFrankieFieldNotePrompt(challenge, fPref)}"
          </p>
        </div>

        {/* Evidence Checklist */}
        <div className="space-y-3 bg-on-surface/5 p-4 border-2 border-on-surface/10">
           <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{fc('Proof Requirements', 'PROOFS')}</span>
              {challenge.zineEligible && (
                <div className="flex items-center gap-1.5 text-brand-orange">
                   <Sparkles className="w-3 h-3" />
                   <span className="text-[8px] font-black uppercase">{fc('Zine Seed', 'BONUS')}</span>
                </div>
              )}
           </div>
           <div className="flex flex-wrap gap-2">
              {evidenceRequirements.map((req) => {
                const collected = isCollected(req.key);
                const ReqIcon = req.icon;
                return (
                  <div 
                    key={req.key}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1 border-2 transition-all opacity-60",
                      collected 
                        ? "bg-brand-lime border-on-surface shadow-[3px_3px_0_black] -translate-y-0.5 opacity-100" 
                        : "bg-white border-on-surface/10 text-on-surface/50"
                    )}
                  >
                    <ReqIcon className="w-3 h-3" />
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black uppercase tracking-tight leading-none">{req.label}</span>
                      <span className="text-[7px] font-bold uppercase opacity-60 leading-none mt-0.5">{collected ? fc('COLLECTED', 'DONE') : fc('REQUIRED', 'NEEDED')}</span>
                    </div>
                    {collected && <CheckCircle2 className="w-3 h-3" />}
                  </div>
                );
              })}
           </div>
        </div>

        {/* Footer Metadata */}
        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest opacity-40 italic pt-2">
           <div className="flex items-center gap-1.5">
              <Timer className="w-3.5 h-3.5" />
              <span>{getFrankieEstimatedTimeLabel(challenge, fPref)}</span>
           </div>
           <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{getFrankieDifficultyLabel(challenge, fPref)}</span>
           </div>
        </div>

        {/* Primary Action */}
        <button 
          onClick={onStart}
          className="w-full mt-2 py-3 bg-brand-cyan text-on-surface border-4 border-on-surface shadow-[6px_6px_0px_black] font-outfit text-lg font-black uppercase italic tracking-tight hover:bg-on-surface hover:text-brand-cyan transition-all active:translate-x-1 active:translate-y-1 active:shadow-none flex items-center justify-center gap-2"
        >
          {challenge.status === 'approved' ? fc('VIEW_ARCHIVE', 'COMPLETED') : fc('START_MISSION', 'GO')}
          <ArrowRight className="w-5 h-5" />
        </button>

        {/* Decorative Shimmer Edge */}
        {!isBaja && !isDiamond && !isHeat && (
          <div className="absolute top-0 left-0 w-1.5 h-full bg-brand-lime opacity-30 group-hover:opacity-100 transition-opacity" />
        )}
      </div>
    </div>
  );
}
