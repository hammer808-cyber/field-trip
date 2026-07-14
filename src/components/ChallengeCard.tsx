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
import { getDisplayLabel } from '../utils/labelUtils';

export interface EvidenceProgress {
  photo?: boolean;
  field_note?: boolean;
  location?: boolean;
  reaction?: boolean;
  vote?: boolean;
  time_window?: boolean;
  hintUsed?: boolean;
  drawn?: boolean;
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
  const cardType = challenge.cardType || (
    challenge.category === 'Crew Challenge' || challenge.type === 'Crew Challenge'
      ? 'Crew'
      : challenge.category === 'Evidence Challenge' || challenge.type === 'Evidence Challenge'
        ? 'Proof'
        : 'Signal'
  );
  const deckName = challenge.deckName || challenge.deckId || 'Fieldtrip';

  const evidenceRequirements = [
    { key: 'photo', label: getFrankieEvidenceLabel(challenge, 'photo', fPref), icon: Camera, required: (challenge.proofType || challenge.requiredProof || []).includes('photo') },
    { key: 'field_note', label: getFrankieEvidenceLabel(challenge, 'field_note', fPref), icon: Zap, required: (challenge.proofType || challenge.requiredProof || []).includes('note') },
    { key: 'location', label: getFrankieEvidenceLabel(challenge, 'location', fPref), icon: MapPin, required: (challenge.proofRequirements?.requireLocation || challenge.proofNeeded?.toLowerCase().includes('location') || (challenge.tags || []).includes('location') || (challenge.proofType || []).includes('location')) },
  ].filter(req => req.required);

  const isCollected = (key: string) => !!progress[key as keyof EvidenceProgress];

  if (challenge.status === 'locked') {
    return (
      <div 
        className={cn(
          "skin-card skin-mission-card skin-locked-state group relative flex flex-col transition-all overflow-hidden text-left rounded-[2rem] border-4 border-on-surface",
          "bg-[#F3EFE3] shadow-[8px_8px_0px_rgba(0,0,0,0.1),12px_12px_0px_black] opacity-95",
          className
        )}
      >
        {/* Paper Grain Overlay */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/handmade-paper.png')] opacity-[0.12] pointer-events-none mix-blend-multiply" />
        
        {/* Diagonal Warning/Classified Tape */}
        <div className="absolute -right-12 top-8 bg-brand-orange text-white text-[10px] font-mono font-black uppercase tracking-[0.2em] px-14 py-2 rotate-[35deg] shadow-[2px_2px_4px_rgba(0,0,0,0.15)] border-y border-on-surface z-20">
          SEALED FILE
        </div>

        {/* Small Stamped LOCKED / CLASSIFIED Tag */}
        <div className="absolute top-5 left-5 bg-on-surface text-brand-lime border-2 border-on-surface font-mono text-[9px] font-black uppercase tracking-widest px-3 py-1 rotate-[-2deg] shadow-[3px_3px_0px_black] z-20">
          🔒 SECURE_LANE_{currentLane.toUpperCase()}
        </div>

        <div className="p-8 space-y-6 flex flex-col h-full justify-between relative z-10 min-h-[340px]">
          {/* Top category label & XP */}
          <div className="flex justify-between items-start gap-4 pt-4">
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1 text-on-surface/50">
                <Lock className="w-3.5 h-3.5 text-brand-orange shrink-0 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">{cardType}</span>
              </div>
              <h3 className="font-display text-2xl leading-[1.0] uppercase tracking-tighter font-black italic text-on-surface/40 break-words text-wrap">
                {getFrankieTitle(challenge, fPref)}
              </h3>
              <p className="font-mono text-[8px] font-black uppercase tracking-wider text-on-surface/35">{deckName}</p>
            </div>
            <div className="bg-on-surface/10 text-on-surface/30 px-3 py-1 text-sm font-black italic border-2 border-on-surface/20 shrink-0 rotate-[1deg]">
              +{baseXP}{fc('XP', ' PTS')}
            </div>
          </div>

          {/* Center Raised Badge Container holding the lock/category icon */}
          <div className="my-auto py-4 flex flex-col items-center justify-center">
            <div className="relative w-24 h-24 bg-[#FCF9F2] border-4 border-on-surface rounded-none shadow-[6px_6px_0px_black] flex items-center justify-center rotate-[-3deg] group-hover:rotate-[2deg] transition-transform">
              <div className="absolute inset-0 border-2 border-dashed border-on-surface/15 m-1" />
              <div className="absolute -top-3 -right-3 w-8 h-8 bg-brand-orange border-2 border-on-surface flex items-center justify-center rounded-none shadow-[2px_2px_0px_black] transform rotate-[10deg]">
                <Lock className="w-4 h-4 text-white" />
              </div>
              <Icon className="w-10 h-10 text-on-surface/25 stroke-[1.5]" />
            </div>
            
            <p className="text-[9px] font-mono leading-none text-on-surface/40 uppercase font-black tracking-widest mt-6 text-center">
              NOT YET, LEGEND
            </p>
          </div>

          {/* Locked / Requirement Details */}
          <div className="bg-on-surface/[0.04] border-4 border-dashed border-on-surface/10 p-4 rounded-none space-y-1 text-center relative overflow-hidden">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-orange">
              FINISH THE EARLIER ADVENTURES
            </p>
            <p className="text-[11px] font-medium italic text-on-surface/60 leading-snug">
              Finish the adventures before this one, then Trevor opens the next tiny door: {getFrankieTitle(challenge, fPref).replace(/_/g, ' ')}.
            </p>
          </div>

          {/* Stamped Tactile Bottom Banner */}
          <button 
            disabled
            className="w-full py-4 bg-on-surface/[0.05] text-on-surface/30 border-4 border-dashed border-on-surface/20 font-display text-lg font-black uppercase italic tracking-tight flex items-center justify-center gap-2 cursor-not-allowed"
          >
            <Lock className="w-5 h-5" />
            <span>MISSION DECK RESTRICTED</span>
          </button>
        </div>
      </div>
    );
  }

  const isStarter = challenge.lane === 'onboarding' || challenge.category?.toLowerCase() === 'onboarding';

  // Determine a playful dominant theme color based on the challenge type
  let colorTheme = {
    bg: "bg-[#FFFDF5]",
    wash: "bg-brand-orange/5",
    header: "bg-brand-orange text-white",
    sticker: "bg-brand-orange text-white border-on-surface",
    primaryText: "text-[#E65100]",
    accentLabel: "STARTER DECK",
    emoji: "⭐"
  };

  if (isStarter) {
    colorTheme = {
      bg: "bg-[#FFFCEB]",
      wash: "bg-brand-lime/10",
      header: "bg-brand-lime text-on-surface",
      sticker: "bg-brand-lime text-on-surface border-on-surface",
      primaryText: "text-brand-orange-dark",
      accentLabel: "STARTER CERTIFICATION",
      emoji: "🏅"
    };
  } else if (challenge.category === 'Field Challenge' || challenge.type === 'Field Challenge') {
    colorTheme = {
      bg: "bg-[#F2FCFC]",
      wash: "bg-brand-cyan/5",
      header: "bg-brand-cyan text-on-surface",
      sticker: "bg-brand-cyan text-on-surface border-on-surface",
      primaryText: "text-brand-cyan-dark",
      accentLabel: "CREW MULTIPLIER",
      emoji: "🗺️"
    };
  } else if (challenge.category === 'Social Spark' || challenge.type === 'Social Spark') {
    colorTheme = {
      bg: "bg-[#FFF5FF]",
      wash: "bg-brand-magenta/5",
      header: "bg-brand-magenta text-white",
      sticker: "bg-[#FFE0F7] text-brand-magenta border-brand-magenta",
      primaryText: "text-brand-magenta",
      accentLabel: "SOCIAL CHALLENGE",
      emoji: "💬"
    };
  } else if (challenge.category === 'Bonus' || challenge.type === 'Bonus') {
    colorTheme = {
      bg: "bg-[#FFFDF5]",
      wash: "bg-brand-yellow/15",
      header: "bg-brand-yellow text-on-surface border-b-2 border-on-surface",
      sticker: "bg-[#FFF9C4] text-on-surface border-on-surface",
      primaryText: "text-[#F57F17]",
      accentLabel: "BONUS UNLOCKED",
      emoji: "⚡"
    };
  }

  return (
    <div 
      data-state={challenge.status || 'available'}
      className={cn(
        "skin-card skin-mission-card",
        "group relative flex flex-col transition-all text-left field-card field-card--paper overflow-hidden border-[4px] border-on-surface shadow-[8px_8px_0px_black]",
        colorTheme.bg,
        "field-paper-shadow-lg hover:-translate-y-1.5 hover:shadow-2xl"
      , className)}
    >
      {/* Decorative Ticket Punch Notches for physical material appearance */}
      <div className="absolute left-[-11px] top-1/2 -translate-y-1/2 w-5 h-8 bg-paper border-r-[3.5px] border-on-surface rounded-r-full z-20" />
      <div className="absolute right-[-11px] top-1/2 -translate-y-1/2 w-5 h-8 bg-paper border-l-[3.5px] border-on-surface rounded-l-full z-20" />

      {/* Jagged yellow tape stripe on the top-left of the ticket component */}
      <div className="absolute -top-3.5 left-10 w-16 h-7 bg-[#FEFC9C]/85 border-b border-dashed border-on-surface/15 rotate-[-8deg] shadow-sm pointer-events-none mix-blend-multiply z-35" />

      {/* Gloss Highlight for that "vinyl sticker" feel */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/45 pointer-events-none z-30" />
      <div className="absolute inset-y-0 left-[-100%] w-1/3 bg-white/25 skew-x-[-20deg] transition-all duration-1000 pointer-events-none z-30 group-hover:left-[150%]" />

      {/* Decorative ID Label / Sticker */}
      <div className={cn(
        "absolute top-4 right-4 px-3 py-1.5 text-[9px] font-mono uppercase tracking-[0.2em] z-20 font-black italic shadow-[3px_3px_0px_black] border-2 border-on-surface rotate-[2deg] transition-transform group-hover:rotate-0",
        colorTheme.sticker
      )}>
        {colorTheme.accentLabel}
      </div>

      <div className="p-6 space-y-5 flex flex-col h-full relative z-10">
        <div className="flex justify-between items-start gap-4 pr-32">
          <div className="space-y-1 flex-1 min-w-0">
             <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-lg select-none">{colorTheme.emoji}</span>
                <span className="text-[9px] font-mono font-black uppercase tracking-[0.2em] opacity-40 italic">
                  {cardType}
                </span>
             </div>
             <h3 className="font-display text-2xl sm:text-3xl leading-[0.95] uppercase tracking-tighter font-black italic text-on-surface">
                {getFrankieTitle(challenge, fPref)}
             </h3>
             <p className="font-mono text-[8px] font-black uppercase tracking-wider text-on-surface/40">
               {deckName}{challenge.deckSubtitle ? ` // ${challenge.deckSubtitle}` : ''}
             </p>
          </div>
        </div>

        {/* 1. PHOTO PROMPT Area (Dotted & Styled) */}
        <div className="bg-white border-2 border-on-surface/10 p-4 space-y-1.5 rounded-xl relative overflow-hidden shadow-[inset_1px_1px_4px_rgba(0,0,0,0.05)]">
          <div className="absolute top-2 right-2 text-on-surface/10">
            <Camera className="w-5 h-5 text-brand-orange opacity-40 animate-pulse" />
          </div>
          <span className="text-[8px] font-mono font-black uppercase tracking-[0.25em] text-brand-orange flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-brand-orange rounded-full" />
            WHAT TO HUNT
          </span>
          <p className="text-xs sm:text-sm font-sans font-extrabold text-on-surface leading-snug">
            "{challenge.theAsk || getFrankieDescription(challenge, fPref)}"
          </p>
        </div>

        {/* 2. MEMORY ANGLE (Why is it fun? / Suggestion) */}
        <div className="bg-brand-yellow/5 border-[2px] border-dashed border-on-surface/15 p-4 space-y-1 rounded-xl relative">
          <span className="text-[8px] font-mono font-black uppercase tracking-[0.25em] text-[#D84315] flex items-center gap-1">
            ✨ WHY IT'S FUN
          </span>
          <p className="text-xs font-serif italic font-bold text-on-surface/70 leading-relaxed">
            "{challenge.shortPrompt || challenge.fieldNotePrompt || "Spot it, snap it, and record a small part of your summer vacation lore."}"
          </p>
        </div>

        {/* 3. GAME DETAILS BOX (Points, Who will see it) */}
        <div className="bg-on-surface/[0.02] border-[2px] border-on-surface/5 p-4 rounded-xl flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <span className="text-[7px] font-mono font-black uppercase tracking-widest text-on-surface/30 block">WHERE IT GOES</span>
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-brand-cyan" />
              <p className="text-[10px] font-sans font-bold text-on-surface/60">
                Added to your <span className="text-brand-orange-dark font-black">Crew Feed</span>
              </p>
            </div>
          </div>
          
          <div className="bg-brand-lime text-on-surface px-4 py-2 text-base sm:text-lg font-black italic border-2 border-on-surface shadow-[4px_4px_0px_black] shrink-0 rotate-[-2deg] group-hover:rotate-[1deg] transition-all">
            +{baseXP} PTS
          </div>
        </div>

        {/* High-Impact Action Button */}
        <button 
          onClick={onStart}
          className={cn(
            "w-full mt-2 py-4 bg-brand-orange text-white border-4 border-on-surface shadow-[6px_6px_0px_black] relative overflow-hidden",
            "font-display text-lg sm:text-xl font-black uppercase italic tracking-tight transition-all",
            "hover:bg-brand-orange-dark hover:-translate-y-1 hover:shadow-[8px_8px_0px_black]",
            "active:translate-x-0.5 active:translate-y-0.5 active:shadow-none flex items-center justify-center gap-3"
          )}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent pointer-events-none" />
          <span className="relative z-10 flex items-center gap-2">
            <Camera className="w-6 h-6 stroke-[2.5]" />
            {challenge.status === 'approved' ? 'ADVENTURE SAVED ✓' : 'SNAP A PIC'}
            <ArrowRight className="w-5 h-5 stroke-[2.5]" />
          </span>
        </button>
      </div>
    </div>
  );
}
