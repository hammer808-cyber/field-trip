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
import { LAUNCH_MISSION_ID } from '../data/specialMissions';

interface MissionDecodedCardProps {
  mission: TripType;
  progress?: any;
  onStart?: () => void;
  onRedraw?: () => void;
  onDismiss?: () => void;
  onHint?: () => void;
  isRedrawable?: boolean;
  isHintUsed?: boolean;
  statusLabel?: string;
  className?: string;
  showActions?: boolean;
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
  className,
  showActions = true
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
    easy: { label: fc('Scout', 'SIMPLE'), color: 'bg-[#B7FF00]', text: 'text-on-surface' },
    medium: { label: fc('Vanguard', 'MODERATE'), color: 'bg-[#2EE7F0]', text: 'text-on-surface' },
    hard: { label: fc('Elite', 'HARD'), color: 'bg-[#FF5A00]', text: 'text-white' }
  };

  const diff = difficultyConfig[mission.difficulty as keyof typeof difficultyConfig] || difficultyConfig.easy;
  const isLaunchMission = mission.id === LAUNCH_MISSION_ID;

  const isApproved = false; // Placeholder for logic
  const isSubmitted = false; // Placeholder for logic

  // Determine current step based on progress
  let currentStepIndex = 1;
  let statusText = isLaunchMission ? `Priority Mission: ${mission.title}` : "Step 1 of 3: View Mission";
  let footerHint = isLaunchMission ? "Next: press Start Required Mission below." : "Next: press Start Mission below.";

  if (progress.photo) {
    currentStepIndex = 2;
    statusText = isLaunchMission ? `Proof Found: ${mission.title}` : "Step 2 of 3: Capture Proof";
    footerHint = "Next: add field note and submit.";
  }
  
  if (isSubmitted) {
    currentStepIndex = 3;
    statusText = "Step 3 of 3: Submit";
    footerHint = "Next: view your field log.";
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      id="active-mission-detail"
      data-tour="mission-card"
      className={cn("w-full max-w-xl mx-auto relative group field-card field-card--ticket field-paper-shadow-lg p-0 overflow-hidden", className)}
    >
      {/* Decorative Ticket Punch Notches */}
      <div className="absolute left-[-11px] top-1/2 -translate-y-1/2 w-5 h-8 bg-[#FAF8F5] border-r-[3.5px] border-on-surface rounded-r-full z-40" />
      <div className="absolute right-[-11px] top-1/2 -translate-y-1/2 w-5 h-8 bg-[#FAF8F5] border-l-[3.5px] border-on-surface rounded-l-full z-40" />

      {/* Gloss Highlight for that "vinyl sticker" feel */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent pointer-events-none z-30" />
      <div className="absolute inset-y-0 left-[-100%] w-1/3 bg-white/20 skew-x-[-20deg] transition-all duration-700 pointer-events-none z-30 group-hover:left-[150%]" />

      {/* Main Card Container */}
      <div className="bg-[#FFFDF4] overflow-hidden flex flex-col relative h-full">
        {/* Step Indicator Header Overlay */}
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 py-1 bg-white border-2 border-on-surface shadow-[4px_4px_0px_black] rounded-full rotate-[-1deg] group-hover:rotate-0 transition-transform">
          <div className="w-2 h-2 rounded-full bg-brand-orange animate-pulse shadow-[0_0_8px_var(--color-brand-orange)]" />
          <span className="font-mono text-[9px] font-black uppercase tracking-widest text-on-surface whitespace-nowrap">
            {statusText}
          </span>
        </div>

        {/* Top Header Section */}
        <div className={cn(
          "bg-on-surface text-brand-lime py-3 px-6 flex justify-between items-center transition-colors relative z-10 border-b-2 border-on-surface",
          isLaunchMission && "bg-brand-orange text-white"
        )}>
          <p className="font-display text-[10px] font-black uppercase tracking-[0.2em] italic">
            {statusLabel || (isLaunchMission ? 'FIRST MISSION · REQUIRED' : 'MISSION BRIEFING')}
          </p>
          <div className="flex items-center gap-1.5">
            <div className={cn(
              "w-2 h-2 rounded-full bg-brand-lime animate-pulse",
              isLaunchMission && "bg-white"
            )} />
            <span className="font-mono text-[8px] font-black uppercase opacity-60">
              {isLaunchMission ? 'PRE-FLIGHT_SYNC' : 'UPLINK_LIVE'}
            </span>
          </div>
        </div>

        {/* Top Visual Section */}
        <div className="h-56 sm:h-64 relative bg-on-surface/5 overflow-hidden group-hover:bg-on-surface/10 transition-colors border-b-4 border-on-surface">
          <img 
            src={mission.image || 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&q=80&w=800'} 
            alt="" 
            className="w-full h-full object-cover grayscale transition-all duration-700 group-hover:grayscale-0 group-hover:scale-105" 
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-on-surface/90 via-on-surface/20 to-transparent" />
          
          {/* Mission Title Area */}
          <div className="absolute bottom-6 left-8 right-8">
             <h3 id="tour-card-title" className="text-white font-display text-4xl sm:text-5xl font-black uppercase tracking-tighter italic leading-[0.9] drop-shadow-xl truncate">
               {getFrankieTitle(mission, fPref)}
             </h3>
          </div>
        </div>

        {/* Info Strip */}
        <div className="px-8 py-4 border-b-2 border-on-surface/10 flex justify-between items-center bg-white relative">
          {/* Subtle Paper Grain */}
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/handmade-paper.png')] opacity-[0.05] pointer-events-none mix-blend-multiply" />

          <div className="flex flex-col relative z-10">
            <span className="text-[8px] font-mono font-black uppercase text-on-surface/30 tracking-widest">Difficulty</span>
            <div className="mt-1.5">
              <span className={cn(
                "px-3 py-1 text-[10px] font-black uppercase italic border-2 border-on-surface inline-block shadow-[3px_3px_0px_black] rotate-[-1deg]",
                diff.color,
                diff.text
              )}>
                {diff.label}
              </span>
            </div>
          </div>
          
          <div className="flex flex-col items-end relative z-10">
            <span className="text-[8px] font-mono font-black uppercase text-on-surface/30 tracking-widest">Bureau Reward</span>
            <div id="tour-card-points" className="text-brand-orange font-display text-3xl font-black italic leading-none mt-1 shadow-glow-orange">
              +{mission.baseXP || mission.basePoints || 100} XP
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-8 space-y-8 text-left bg-white/50 backdrop-blur-sm relative flex-grow">
          {/* Subtle Grid Background */}
          <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#000_1px,transparent_1px)] bg-[length:16px_16px] pointer-events-none" />

          {/* Description */}
          <div className="space-y-4 relative z-10">
            <p className="text-[9px] font-mono font-black uppercase tracking-[0.25em] text-on-surface/40 italic">{fc('Mission_Protocol', 'MISSION DETAILS')}</p>
            <div id="tour-card-directions" className="space-y-5">
              {directions.map((step, i) => (
                <p key={i} className="font-serif italic text-lg sm:text-xl leading-snug text-on-surface font-bold">
                  {directions.length > 1 && <span className="not-italic font-sans text-xs opacity-30 mr-2.5 uppercase tracking-widest">Step {i + 1}</span>}
                  "{step}"
                </p>
              ))}
            </div>
          </div>

          {/* Field Note Prompt */}
          <div className="bg-brand-orange/[0.03] border-4 border-dashed border-on-surface/10 p-6 space-y-3 rounded-2xl relative rotate-[0.5deg]">
            <div className="flex items-center gap-2 mb-1">
               <Zap className="w-4 h-4 text-brand-orange fill-brand-orange/20" />
               <span className="text-[10px] font-mono font-black uppercase tracking-widest text-on-surface/60">{fc('Field Note Request', 'INTEL_REQUEST')}</span>
            </div>
            <p className="text-[14px] font-medium italic text-on-surface leading-relaxed font-serif">
              "{getFrankieFieldNotePrompt(mission, fPref)}"
            </p>
          </div>

          {/* Evidence Grid */}
          <div id="tour-card-proof" className="space-y-4 relative z-10">
             <div className="flex justify-between items-center text-[10px] font-mono font-black uppercase italic tracking-widest opacity-40">
                <span>{fc('Core_Evidence_Checklist', 'PROOF CHECKLIST')}</span>
                <span className="flex items-center gap-1.5 text-brand-cyan">
                  <Sparkles className="w-4 h-4" />
                  {fc('Zine_Seed_Eligible', 'BONUS')}
                </span>
             </div>
             <div className="flex flex-wrap gap-3">
                {evidenceRequirements.map((r, i) => {
                  const Icon = r.icon;
                  const collected = isCollected(r.key);
                  return (
                    <div key={i} className={cn(
                      "flex items-center gap-3 px-4 py-3 border-2 transition-all rounded-2xl",
                      collected 
                        ? "bg-brand-lime border-on-surface shadow-[4px_4px_0px_black] -translate-y-1" 
                        : "border-on-surface/10 bg-on-surface/[0.04]"
                    )}>
                      <Icon className={cn("w-4 h-4", collected ? "text-on-surface" : "opacity-20")} />
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black uppercase tracking-tight leading-none">{r.label}</span>
                      </div>
                      {collected && <CheckCircle2 className="w-3.5 h-3.5 text-on-surface ml-1 shadow-[1px_1px_0px_black] rounded-full bg-white" />}
                    </div>
                  );
                })}
             </div>
          </div>

          {/* Instruction Footer */}
          <div className="bg-brand-orange text-white p-4 text-center rounded-2xl shadow-[6px_6px_0px_black] rotate-[-1deg] border-2 border-on-surface">
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.15em] text-white">
              {footerHint}
            </p>
          </div>

          {/* Actions - CONDITIONALLY SHOWN */}
          {showActions && (
            <div className="flex flex-col gap-4 pt-4 pb-2 relative z-20">
              {!onRedraw && (
                <button 
                  id="tour-card-start"
                  data-tour="deploy-mission"
                  data-onboarding="deploy-mission"
                  onClick={() => {
                    onStart?.();
                  }}
                  className="w-full field-cta field-cta--primary py-6 text-3xl flex items-center justify-center gap-4 group"
                >
                  <span className="relative z-10">
                    {Object.keys(progress).length >= 1 ? fc('RESUME_MISSION', 'RESUME') : fc('START_MISSION', 'START')}
                  </span>
                  <ArrowRight className="w-10 h-10 group-hover:translate-x-3 transition-transform duration-300" />
                </button>
              )}
            </div>
          )}
        </div>
        
        {/* Background Scanline Pattern */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.06] bg-[linear-gradient(rgba(0,0,0,0.1)_50%,transparent_50%)] bg-[length:100%_4px]" />
      </div>
    </motion.div>
  );
}
