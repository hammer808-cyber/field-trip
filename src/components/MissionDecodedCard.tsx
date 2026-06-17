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
  
  const [activeObjectiveHint, setActiveObjectiveHint] = React.useState<string | null>(null);

  const hintTexts: Record<string, { title: string; desc: string; tip: string }> = {
    photo: {
      title: "CAMERA INTEL",
      desc: "A clear photographic proof is required to verify this mission.",
      tip: "Use the Viewfinder camera to capture the requested subject. Avoid cropped closeups or blurry lighting."
    },
    note: {
      title: "FIELD REPORT",
      desc: "A written note or description detailing the observation is required.",
      tip: "Write a compelling field note/anecdote answering the prompt. This will build your zine entry."
    },
    location: {
      title: "GPS VERIFICATION",
      desc: "Physical environment coordinates signature verification required.",
      tip: "Open the field capture tool to record location tags automatically. Location permissions must be enabled."
    }
  };
  
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
        {/* TOP COMPACT SIGNAL HEADER */}
        <div className={cn(
          "bg-on-surface text-[#B7FF00] py-1 px-4 flex justify-between items-center relative z-20 border-b-2 border-on-surface",
          isLaunchMission && "bg-[#FF5A00] text-white"
        )}>
           <div className="flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse shadow-[0_0_8px_currentColor]" />
             <span className="font-mono text-[8px] font-black uppercase tracking-[0.2em]">{fc('MISSION_SIGNAL', 'MISSION SIGNAL')}</span>
           </div>
           <div className="flex items-center gap-3">
             <span className="font-mono text-[8px] font-black uppercase opacity-60">REF: {mission.id.slice(0, 8)}</span>
           </div>
        </div>

        {/* Header Content Area - Compacted height & No truncation */}
        <div className="relative bg-on-surface flex flex-col group p-4 sm:p-5 border-b-4 border-on-surface overflow-hidden min-h-[160px] justify-end">
          {/* Background Image - Subtleized */}
          <div className="absolute inset-0 z-0">
            <img 
              src={mission.image || 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&q=80&w=800'} 
              alt="" 
              className="w-full h-full object-cover opacity-40 grayscale contrast-125 transition-all duration-700 group-hover:scale-110 group-hover:opacity-50" 
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-on-surface via-transparent to-on-surface/40" />
          </div>
          
          {/* MISSION TITLE - Clear, no truncation, responsive */}
          <div className="relative z-10">
             <div className="flex flex-wrap gap-1.5 mb-2">
               <div className="bg-[#B7FF00] text-on-surface text-[8px] font-black px-1.5 py-0.5 border-2 border-on-surface shadow-[2px_2px_0px_black] uppercase italic rotate-[-1deg]">
                 {mission.category || 'OP'}
               </div>
               <div className="bg-white text-on-surface text-[8px] font-black px-1.5 py-0.5 border-2 border-on-surface shadow-[2px_2px_0px_black] uppercase italic rotate-[1deg]">
                 {mission.deckName || 'FIELD'}
               </div>
             </div>
             
             <h3 id="tour-card-title" className="text-white font-display text-3xl sm:text-4xl font-black uppercase tracking-tighter italic leading-[0.8] drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
               {getFrankieTitle(mission, fPref)}
             </h3>
          </div>
        </div>

        {/* BOTTOM ACTION / STATUS STRIP - Compact & High-Impact */}
        <div className="px-4 py-3 bg-[#FCFAF5] border-b-4 border-on-surface flex items-center justify-between gap-3 relative z-20">
           <div className="flex-1 min-w-0">
             <div className="flex items-center gap-1 text-[9px] font-mono font-black uppercase tracking-wider text-[#FF5A00] animate-pulse">
               <Sparkles className="w-3 h-3" />
               <span>{statusLabel || 'READY_FOR_DEPLOYMENT'}</span>
             </div>
             <p className="text-[10px] font-bold text-on-surface/40 uppercase truncate">
               REWARD: +{mission.baseXP || 100} XP_CREDITS
             </p>
           </div>

           {showActions && !onRedraw && (
             <button 
               id="tour-card-start"
               data-tour="deploy-mission"
               data-onboarding="deploy-mission"
               onClick={() => onStart?.()}
               className="bg-brand-orange text-white px-6 py-2.5 border-2 border-on-surface shadow-[4px_4px_0px_black] font-display text-base font-black uppercase italic tracking-wider active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-2 shrink-0 hover:bg-on-surface hover:text-brand-lime"
             >
               <span>{Object.keys(progress).length >= 1 ? 'RESUME' : 'START'}</span>
               <ArrowRight className="w-5 h-5 stroke-[2.5]" />
             </button>
           )}
        </div>

        {/* Content Section - Hidden by default or collapsible? 
            For now, let's keep it visible but much tighter to reduce overall scroll. */}
        <div className="p-4 sm:p-5 space-y-4 text-left bg-white/50 backdrop-blur-sm relative flex-grow text-sm">
          {/* Subtle Grid Background */}
          <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#000_1px,transparent_1px)] bg-[length:16px_16px] pointer-events-none" />

          {/* Description */}
          <div className="space-y-1.5 relative z-10">
            <p className="text-[7px] font-mono font-black uppercase tracking-[0.2em] text-on-surface/40 italic">{fc('Mission_Objectives', 'MISSION OBJECTIVES')}</p>
            <div id="tour-card-directions" className="space-y-1.5">
              {directions.map((step, i) => (
                <div key={i} className="flex gap-2.5 items-start">
                   <div className="w-4 h-4 rounded-full bg-[#2EE7F0]/20 border border-on-surface/10 flex-shrink-0 flex items-center justify-center text-[9px] font-bold">{i + 1}</div>
                   <p className="font-serif italic text-[15px] leading-tight text-on-surface/80">
                     {step}
                   </p>
                </div>
              ))}
            </div>
          </div>


          {/* Field Note Prompt - More compact */}
          <div className="bg-[#FF5A00]/[0.03] border-2 border-dashed border-on-surface/10 p-3 space-y-1 rounded-xl relative rotate-[0.5deg]">
            <div className="flex items-center gap-2 mb-0.5">
               <Zap className="w-2.5 h-2.5 text-[#FF5A00] fill-[#FF5A00]/20" />
               <span className="text-[8px] font-mono font-black uppercase tracking-widest text-on-surface/60">{fc('Field Note Request', 'INTEL_REQUEST')}</span>
            </div>
            <p className="text-[12px] font-medium italic text-on-surface leading-tight font-serif">
               "{getFrankieFieldNotePrompt(mission, fPref)}"
            </p>
          </div>

          {/* Evidence Grid - Tighter layout */}
          <div id="tour-card-proof" className="space-y-2 relative z-10">
             <div className="flex justify-between items-center text-[8px] font-mono font-black uppercase italic tracking-widest opacity-40">
                <span className="flex items-center gap-1">
                   <span>{fc('Core_Evidence_Checklist', 'PROOF CHECKLIST')}</span>
                </span>
             </div>
             <div className="flex flex-wrap gap-1.5">
                {evidenceRequirements.map((r, i) => {
                  const Icon = r.icon;
                  const collected = isCollected(r.key);
                  const isHoveredOrTapped = activeObjectiveHint === r.key;
                  return (
                    <div 
                      key={i} 
                      id={`objective-icon-btn-${r.key}`}
                      onMouseEnter={() => setActiveObjectiveHint(r.key)}
                      onMouseLeave={() => setActiveObjectiveHint(null)}
                      onClick={() => setActiveObjectiveHint(activeObjectiveHint === r.key ? null : r.key)}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5 border-2 transition-all rounded-lg cursor-pointer select-none",
                        collected 
                          ? "bg-[#B7FF00] border-on-surface shadow-[2px_2px_0px_black] -translate-y-0.5" 
                          : "border-on-surface/10 bg-on-surface/[0.04]",
                        isHoveredOrTapped && "border-[#FF5A00] bg-[#FF5A00]/5 shadow-[2px_2px_0px_black] -translate-y-0.5"
                      )}
                    >
                      <Icon className={cn("w-3 h-3 transition-transform", collected ? "text-on-surface" : "opacity-20", isHoveredOrTapped && "text-[#FF5A00] scale-110 opacity-100")} />
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black uppercase tracking-tight leading-none">{r.label}</span>
                      </div>
                      {collected && !isHoveredOrTapped && <CheckCircle2 className="w-2.5 h-2.5 text-on-surface ml-0.5 shadow-[1px_1px_0px_black] rounded-full bg-white" />}
                    </div>
                  );
                })}
             </div>

             {/* Dynamic Custom Tooltip / Hint view */}
             {activeObjectiveHint && (
               <motion.div
                 id={`objective-tooltip-${activeObjectiveHint}`}
                 initial={{ opacity: 0, scale: 0.95, y: 5 }}
                 animate={{ opacity: 1, scale: 1, y: 0 }}
                 exit={{ opacity: 0, scale: 0.95, y: 5 }}
                 className="p-3 bg-on-surface text-[#FFFDF4] border-2 border-on-surface rounded-xl flex items-start gap-3 relative shadow-[4px_4px_0px_black] transition-all"
               >
                 <div className="space-y-1 relative z-10 text-left">
                   <div className="flex items-center gap-1.5 text-[#B7FF00] font-mono text-[8px] font-black uppercase tracking-widest">
                     <Info className="w-3 h-3 text-[#B7FF00] shrink-0" />
                     <span>{hintTexts[activeObjectiveHint]?.title || 'OBJECTIVE PROTOCOL'}</span>
                   </div>
                   <p className="text-[11px] font-black font-sans text-white leading-tight">
                     {hintTexts[activeObjectiveHint]?.desc}
                   </p>
                 </div>
               </motion.div>
             )}
          </div>

          {/* Actions - CONDITIONALLY SHOWN - MOVED UP */}
          {showActions && (
            <div className="flex flex-col gap-2 pt-1 pb-1 relative z-20">
              {!onRedraw && (
                <button 
                  id="tour-card-start"
                  data-tour="deploy-mission"
                  data-onboarding="deploy-mission"
                  onClick={() => {
                    onStart?.();
                  }}
                  className="w-full field-cta field-cta--primary py-3 text-xl flex items-center justify-center gap-3 group"
                >
                  <span className="relative z-10">
                    {Object.keys(progress).length >= 1 ? fc('RESUME_MISSION', 'RESUME') : fc('START_MISSION', 'START')}
                  </span>
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-3 transition-transform duration-300" />
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
