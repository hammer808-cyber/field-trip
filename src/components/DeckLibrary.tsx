import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TripCard } from '../types/challenges';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { 
  Lock, CheckCircle2, Play, Info, Timer, Zap, 
  MapPin, Camera, AlertTriangle, ShieldCheck, 
  X, ChevronRight, Bookmark
} from 'lucide-react';
import { StickerDecal, StickerCorner } from './StickerDecals';
import { cn } from '../lib/utils';
import { Card } from './UI';
import { getMissionImage } from '../utils/missionImages';

interface DeckLibraryProps {
  allChallenges: TripCard[];
}

export function DeckLibrary({ allChallenges }: DeckLibraryProps) {
  const navigate = useNavigate();
  const { 
    profile, activeTrip, currentWeekNumber, 
    activeSeason, isWeekLocked, completedChallengeIds, drawTrip,
    isHeatwaveDeckUnlocked: isSummerDeckUnlocked,
    isSocalSummerUnlocked,
    isAdmin
  } = useApp();
  const { fc } = useTheme();
  const [selectedChallenge, setSelectedChallenge] = useState<TripCard | null>(null);
  const [filter, setFilter] = useState<'all' | 'eligible' | 'completed' | 'locked'>('all');

  const challengesWithStatus = useMemo(() => {
    return allChallenges.map(challenge => {
      const isCompleted = completedChallengeIds.has(challenge.id);
      const isCued = activeTrip?.id === challenge.id;
      const progress = profile?.tripProgress?.[challenge.id];
      const isInProgress = !!progress && !isCompleted;
      
      // Determine if locked
      let isLocked = false;

      // 1. Deck Gating
      if (challenge.deckId === 'heatwave-receipts' && !isSummerDeckUnlocked && !isAdmin) {
        isLocked = true;
      } else if (challenge.deckId === 'socal-summer' && !isSocalSummerUnlocked && !isAdmin) {
        isLocked = true;
      }

      // 2. Weekly Gating (only if not already locked by deck)
      if (activeSeason && !isLocked) {
        // If it follows the seasonal ID pattern, check if that week is locked
        const match = challenge.id.match(/^(field|evidence|crew)-(\d+)$/);
        if (match) {
          const weekNum = parseInt(match[2]);
          isLocked = isWeekLocked(weekNum);
        } else if (challenge.weekNumber) {
          // Fallback to explicit weekNumber if it exists
          isLocked = isWeekLocked(challenge.weekNumber);
        }
      }

      const isEligible = !isLocked && !isCompleted && !isCued;

      let uiStatus: 'locked' | 'eligible' | 'cued' | 'in-progress' | 'completed' = 'eligible';
      if (isLocked) uiStatus = 'locked';
      else if (isCompleted) uiStatus = 'completed';
      else if (isCued) uiStatus = 'cued';
      else if (isInProgress) uiStatus = 'in-progress';

      return { ...challenge, uiStatus };
    });
  }, [allChallenges, activeTrip, profile?.tripProgress, completedChallengeIds, isWeekLocked, activeSeason, isSummerDeckUnlocked, isSocalSummerUnlocked, isAdmin]);

  const filteredChallenges = useMemo(() => {
    if (filter === 'all') return challengesWithStatus;
    if (filter === 'eligible') return challengesWithStatus.filter(c => c.uiStatus === 'eligible' || c.uiStatus === 'in-progress' || c.uiStatus === 'cued');
    if (filter === 'completed') return challengesWithStatus.filter(c => c.uiStatus === 'completed');
    if (filter === 'locked') return challengesWithStatus.filter(c => c.uiStatus === 'locked');
    return challengesWithStatus;
  }, [challengesWithStatus, filter]);

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
        <div className="space-y-2">
          <h3 className="font-display text-3xl sm:text-4xl uppercase tracking-tighter italic font-black">Mission Archive_</h3>
          <p className="micro-label opacity-40 font-bold tracking-widest uppercase italic text-brand-orange">Beta: Submissions may require admin review before XP updates</p>
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {(['all', 'eligible', 'completed', 'locked'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-6 py-2 pb-2.5 font-display text-xs uppercase tracking-widest italic border-2 transition-all shrink-0",
                filter === f 
                  ? "bg-on-surface text-brand-lime border-on-surface shadow-[4px_4px_0px_var(--color-brand-orange)]" 
                  : "bg-white text-on-surface border-on-surface/10 opacity-60 hover:opacity-100"
              )}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="relative group/scroll">
        <div className="flex gap-8 overflow-x-auto pb-12 pt-4 px-4 snap-x no-scrollbar">
          {filteredChallenges.length > 0 ? (
            filteredChallenges.map((challenge, idx) => (
              <div key={challenge.id} className="snap-center">
                <MissionCardItem 
                  challenge={challenge as any} 
                  onClick={() => setSelectedChallenge(challenge)}
                  idx={idx}
                />
              </div>
            ))
          ) : (
            <div className="w-full py-20 text-center bg-on-surface/5 border-4 border-dashed border-on-surface/10">
               <p className="font-serif italic text-2xl opacity-40">No missions found in this category.</p>
            </div>
          )}
        </div>
        
        <div className="absolute top-1/2 -left-4 -translate-y-1/2 pointer-events-none opacity-0 group-hover/scroll:opacity-100 transition-opacity hidden md:block">
           <div className="w-12 h-12 bg-white/20 blur-xl rounded-full" />
        </div>
        <div className="absolute top-1/2 -right-4 -translate-y-1/2 pointer-events-none opacity-0 group-hover/scroll:opacity-100 transition-opacity hidden md:block">
           <div className="w-12 h-12 bg-white/20 blur-xl rounded-full" />
        </div>
      </div>

      <AnimatePresence>
        {selectedChallenge && (
          <ChallengePreviewModal 
            challenge={selectedChallenge} 
            uiStatus={challengesWithStatus.find(c => c.id === selectedChallenge.id)?.uiStatus || 'eligible'}
            onClose={() => setSelectedChallenge(null)}
            onStart={() => {
              if (selectedChallenge) {
                drawTrip(selectedChallenge.id).then(() => {
                  navigate('/capture?id=' + selectedChallenge.id);
                }).catch(err => {
                  console.error("[DeckLibrary] Failed to start trip:", err);
                });
                setSelectedChallenge(null);
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function MissionCardItem({ challenge, onClick, idx }: { challenge: TripCard & { uiStatus: any }, onClick: () => void, idx: number }) {
  const { profile } = useApp();
  const isLocked = challenge.uiStatus === 'locked';
  const isCompleted = challenge.uiStatus === 'completed';
  const isInProgress = challenge.uiStatus === 'in-progress';
  const isCued = challenge.uiStatus === 'cued';
  
  const progress = profile?.tripProgress?.[challenge.id] || {};
  const hintUsed = !!progress.hintUsed;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.05 }}
      whileHover={{ y: -8, rotate: idx % 2 === 0 ? 1 : -1 }}
      onClick={onClick}
      className={cn(
        "group relative cursor-pointer border-4 transition-all overflow-hidden w-[280px] sm:w-[320px] shrink-0 bg-white",
        isLocked ? "grayscale opacity-60 border-on-surface/20" : "border-on-surface shadow-[8px_8px_0px_black] hover:shadow-[16px_16px_0px_var(--color-brand-orange)]",
        isCompleted && "bg-brand-lime/5 border-on-surface",
        isCued && "border-brand-orange",
        isInProgress && "border-brand-cyan"
      )}
    >
      <div className="aspect-[3/4] sm:aspect-[4/5] overflow-hidden relative bg-on-surface/5">
        <img 
          src={getMissionImage(challenge.id, challenge.category || challenge.type, challenge.image)} 
          alt={challenge.title} 
          className={cn(
            "w-full h-full object-cover transition-transform duration-700 group-hover:scale-110",
            isLocked && "blur-[2px]"
          )}
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1541339907198-e08756ebafe3?auto=format&fit=crop&q=80&w=800';
          }}
        />
        {/* Dark Gradient Overlay for Readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
        
        {/* Paper Texture Overlay */}
        <div className="absolute inset-0 opacity-10 pointer-events-none mix-blend-multiply bg-[url('https://www.transparenttextures.com/patterns/handmade-paper.png')]" />

        {/* Dynamic decorative mission reward sticker decal */}
        {challenge.rewards?.stickers && challenge.rewards.stickers.length > 0 && (
          <StickerDecal
            id={challenge.rewards.stickers[0]}
            className="left-4 top-4 w-10 h-10 pointer-events-none"
            scale={0.8}
            rotation={-6}
            zIndex="z-20"
          />
        )}
        
        {/* Status Badges */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
          {isLocked && (
            <div className="bg-black/60 backdrop-blur-md text-white p-2 border border-white/20">
              <Lock className="w-4 h-4" />
            </div>
          )}
          {isCompleted && (
            <div className="bg-brand-lime text-on-surface p-1.5 border-2 border-on-surface shadow-[4px_4px_0px_black] rotate-3">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          )}
          {isCued && (
            <div className="bg-brand-orange text-white px-3 py-1 font-display text-[10px] uppercase tracking-widest border-2 border-on-surface shadow-[4px_4px_0px_black] -rotate-3 font-black">
              CUED_ACTIVE
            </div>
          )}
          {isInProgress && (
            <div className="bg-brand-cyan text-on-surface px-3 py-1 font-display text-[10px] uppercase tracking-widest border-2 border-on-surface shadow-[4px_4px_0px_black] -rotate-2 font-black">
              IN_PROGRESS
            </div>
          )}
          {hintUsed && (
            <div className="bg-brand-orange text-white p-1 border-2 border-on-surface shadow-[3px_3px_0px_black] rotate-6">
              <Zap className="w-3 h-3 fill-white" />
            </div>
          )}
        </div>

        {/* Challenge Meta */}
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <p className="micro-label text-[8px] opacity-60 mb-1 tracking-widest italic">{challenge.type || challenge.category}</p>
          <h4 className="font-display text-xl uppercase tracking-tighter leading-none italic font-black line-clamp-1">{challenge.title}</h4>
        </div>
      </div>

      <div className="p-4 bg-white flex justify-between items-center">
        <div className="flex gap-4">
           <div className="flex items-center gap-1 opacity-40">
             <Timer className="w-3 h-3" />
             <span className="font-mono text-[9px] font-bold">{challenge.estimatedTimeMinutes || 10}M</span>
           </div>
           <div className="flex items-center gap-1 opacity-40">
             <Zap className="w-3 h-3" />
             <span className="font-mono text-[9px] font-bold">{challenge.baseXP || (challenge as any).basePoints || 100}XP</span>
           </div>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-mono font-black uppercase tracking-tight opacity-40 group-hover:opacity-100 transition-opacity">
           VIEW_INTEL <ChevronRight className="w-3 h-3" />
        </div>
      </div>
    </motion.div>
  );
}

function ChallengePreviewModal({ challenge, uiStatus, onClose, onStart }: { challenge: TripCard, uiStatus: any, onClose: () => void, onStart: () => void }) {
  const { profile, updateTripProgress } = useApp();
  const isLocked = uiStatus === 'locked';
  const isCompleted = uiStatus === 'completed';
  const canStart = uiStatus === 'eligible' || uiStatus === 'in-progress';
  
  const [activeObjectiveHint, setActiveObjectiveHint] = useState<string | null>(null);

  const hintTexts: Record<string, { title: string; desc: string; tip: string }> = {
    photo: {
      title: "CAMERA INTEL",
      desc: "A clear photographic proof is required to verify this mission.",
      tip: "Use the Viewfinder camera to capture the requested subject. Avoid cropped closeups or blurry lighting."
    },
    field_note: {
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

  const progress = profile?.tripProgress?.[challenge.id] || {};
  const hintUsed = !!progress.hintUsed;

  const evidenceRequirements = [
    { key: 'photo', label: 'Photo Proof', icon: Camera, required: (challenge.proofType || []).includes('photo') },
    { key: 'field_note', label: 'Field Note', icon: Zap, required: (challenge.proofType || []).includes('note') },
    { key: 'location', label: 'GPS Lock', icon: MapPin, required: !!challenge.proofRequirements?.requireLocation },
  ].filter(r => r.required);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-on-surface/90 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="w-full max-w-lg bg-white border-4 border-on-surface shadow-[12px_12px_0px_rgba(0,0,0,0.5)] relative overflow-hidden flex flex-col max-h-[90vh]"
      >
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 z-50 bg-white border-2 border-on-surface p-2 shadow-[2px_2px_0px_black] hover:bg-brand-orange hover:text-white transition-all"
        >
          <X className="w-5 h-5" />
        </button>
 
        {/* Header / Image Section */}
        <div className="w-full aspect-[4/3] sm:aspect-[16/9] relative bg-on-surface shrink-0 border-b-4 border-on-surface overflow-hidden">
          <img 
            src={getMissionImage(challenge.id, challenge.category || challenge.type, challenge.image)} 
            alt={challenge.title} 
            className={cn("w-full h-full object-cover", isLocked && "grayscale opacity-60")}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
          
          {/* Paper Texture Overlay */}
          <div className="absolute inset-0 opacity-10 pointer-events-none mix-blend-multiply bg-[url('https://www.transparenttextures.com/patterns/handmade-paper.png')]" />

          {isLocked && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black/40 backdrop-blur-[2px]">
              <Lock className="w-12 h-12 mb-2 opacity-40" />
              <h3 className="font-display text-xl uppercase font-black italic">TEMPORAL_LOCK</h3>
            </div>
          )}
          {isCompleted && (
            <div className="absolute top-4 left-4 bg-brand-lime text-on-surface px-4 py-2 border-2 border-on-surface shadow-[4px_4px_0px_black] -rotate-3 flex items-center gap-2 z-20">
              <CheckCircle2 className="w-4 h-4" />
              <span className="font-display text-sm uppercase tracking-tighter font-black italic">EVIDENCE_LOGGED</span>
            </div>
          )}
        </div>
 
        <div className="flex-grow overflow-y-auto p-4 sm:p-8 space-y-6 sm:space-y-8 bg-[#fdfdfb] text-left">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-6 h-1 bg-brand-orange" />
              <p className="micro-label text-brand-orange font-black tracking-widest uppercase italic text-[8px] sm:text-[9px]">
                {challenge.category || challenge.type} // {challenge.id}
              </p>
            </div>
            <h2 className="text-2xl sm:text-4xl font-display font-black uppercase italic tracking-tighter leading-none text-on-surface">
              {challenge.title}
            </h2>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-0.5 bg-brand-lime text-on-surface border border-on-surface text-[8px] font-black uppercase italic">
                {challenge.baseXP || (challenge as any).basePoints || 100} XP
              </span>
              <span className="px-2 py-0.5 bg-white text-on-surface border border-on-surface text-[8px] font-black uppercase italic">
                DIFF: {challenge.difficulty?.toUpperCase()}
              </span>
            </div>
          </div>
  
          <div className="space-y-4">
            <p className="font-serif text-lg sm:text-xl leading-relaxed italic text-on-surface/80">
              "{challenge.description || challenge.theAsk}"
            </p>
            
            <div className="p-4 bg-white border-2 border-on-surface shadow-[6px_6px_0px_var(--color-brand-orange)] space-y-2">
               <h4 className="micro-label opacity-40 font-black tracking-[0.1em] italic uppercase flex items-center gap-2 text-[8px]">
                 <Zap className="w-4 h-4 fill-brand-orange text-brand-orange" />
                 FIELD_PROMPT
               </h4>
               <p className="font-serif italic text-sm sm:text-base leading-snug">"{challenge.fieldNotePrompt || 'Document field observations.'}"</p>
            </div>
          </div>
 
           <div className="space-y-3">
             <div className="flex justify-between items-baseline">
               <h5 className="micro-label opacity-40 font-black italic uppercase text-[8px]">Required Evidence</h5>
               <span id="library-checklist-interactive-indicator" className="text-[7px] opacity-75 text-brand-orange font-black tracking-normal animate-pulse select-none">(HOVER/TAP ICONS FOR PROTOCOL)</span>
             </div>
             <div className="flex flex-wrap gap-2">
               {evidenceRequirements.map(req => {
                 const isDone = !!progress[req.key as keyof typeof progress];
                 const isHoveredOrTapped = activeObjectiveHint === req.key;
                 return (
                   <div 
                     key={req.key} 
                     id={`library-objective-icon-btn-${req.key}`}
                     onMouseEnter={() => setActiveObjectiveHint(req.key)}
                     onMouseLeave={() => setActiveObjectiveHint(null)}
                     onClick={() => setActiveObjectiveHint(activeObjectiveHint === req.key ? null : req.key)}
                     className={cn(
                       "flex items-center gap-2 px-3 py-1.5 border transition-all cursor-pointer select-none rounded-lg",
                       isDone ? "bg-brand-lime/10 border-brand-lime" : "bg-on-surface/5 border-on-surface/10",
                       isHoveredOrTapped && "bg-brand-orange/5 border-brand-orange shadow-[2px_2px_0px_black] -translate-y-0.5"
                     )}
                   >
                     <req.icon className={cn("w-3 h-3 transition-transform", isDone ? "text-brand-lime" : "opacity-30", isHoveredOrTapped && "text-brand-orange scale-110 opacity-100")} />
                     <span className={cn("text-[9px] font-black uppercase tracking-widest", isHoveredOrTapped && "text-brand-orange")}>{req.label}</span>
                   </div>
                 );
               })}
             </div>

             {/* Dynamic Custom Tooltip / Hint view */}
             {activeObjectiveHint && (
               <motion.div
                 id={`library-objective-tooltip-${activeObjectiveHint}`}
                 initial={{ opacity: 0, scale: 0.95, y: 3 }}
                 animate={{ opacity: 1, scale: 1, y: 0 }}
                 exit={{ opacity: 0, scale: 0.95, y: 3 }}
                 className="mt-3 p-4 bg-on-surface text-[#FFFDF4] border-2 border-on-surface rounded-xl flex items-start gap-3 relative shadow-[4px_4px_0px_black]"
               >
                 <div className="space-y-1 relative z-10 text-left">
                   <div className="flex items-center gap-1.5 text-brand-lime font-mono text-[9px] font-black uppercase tracking-widest">
                     <Info className="w-3.5 h-3.5 text-brand-lime shrink-0" />
                     <span>{hintTexts[activeObjectiveHint]?.title || 'OBJECTIVE PROTOCOL'}</span>
                   </div>
                   <p className="text-xs font-black font-sans text-white leading-normal">
                     {hintTexts[activeObjectiveHint]?.desc}
                   </p>
                   <p className="text-[10px] text-brand-lime/80 font-sans italic opacity-90 leading-tight">
                     💡 {hintTexts[activeObjectiveHint]?.tip}
                   </p>
                 </div>
               </motion.div>
             )}
           </div>

          {hintUsed && (
            <div className="p-3 border-2 border-brand-orange bg-brand-orange/5 text-brand-orange flex items-center gap-3">
              <Zap className="w-4 h-4 fill-brand-orange" />
              <p className="text-[9px] font-black uppercase leading-tight italic">HINT_PENALTY_ACTIVE // -15% XP</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-6 border-t-2 border-on-surface/5 bg-on-surface/5 flex flex-col sm:flex-row gap-3">
          {canStart ? (
            <button 
              onClick={onStart}
              className="flex-grow bg-brand-orange text-white border-2 border-on-surface py-3 sm:py-4 font-display text-lg uppercase italic font-black tracking-widest shadow-[4px_4px_0px_black] hover:shadow-[6px_6px_0px_black] transition-all flex items-center justify-center gap-3"
            >
              <Play className="w-5 h-5 fill-white" /> 
              {uiStatus === 'in-progress' ? 'RESUME' : 'START'}
            </button>
          ) : (
            <div className="flex-grow bg-on-surface/10 text-on-surface/30 border-2 border-dashed border-on-surface/20 py-3 sm:py-4 font-display text-lg uppercase italic font-black tracking-widest flex items-center justify-center gap-3">
              {isLocked ? 'LOCKED' : 'COMPLETE'}
            </div>
          )}
          <button 
            onClick={onClose}
            className="bg-white text-on-surface border-2 border-on-surface px-6 py-3 font-display text-sm uppercase italic font-black tracking-wider shadow-[4px_4px_0px_black] hover:bg-on-surface/5"
          >
            RETURN
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
