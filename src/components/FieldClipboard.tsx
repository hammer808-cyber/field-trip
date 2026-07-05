import React, { useState, useEffect } from 'react';
import { DevelopingPolaroid } from './DevelopingPolaroid';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { 
  Camera, 
  FileText, 
  Zap, 
  ArrowRight, 
  AlertCircle, 
  Loader2, 
  CheckCircle2,
  Compass,
  Trophy,
  ShieldCheck,
  Info,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { FieldClipboardState, FieldClipboardData } from '../types/fieldClipboard';
import { TripCard as TripCardType } from '../types/challenges';
import { EvidenceMeter } from './EvidenceMeter';
import { EvidenceDetector, DetectorStatus } from './EvidenceDetector';
import { getMissionImage } from '../utils/missionImages';
import { ActionButton } from './UIUtilities';

interface FieldClipboardProps {
  mission: TripCardType;
  onStartCapture: () => void;
  onPhotoConfirm: (data: any) => void;
  onSubmit: () => void;
  initialState?: FieldClipboardState;
  state: FieldClipboardState;
  setState: (s: FieldClipboardState) => void;
  data: FieldClipboardData;
  setData: React.Dispatch<React.SetStateAction<FieldClipboardData>>;
  aiAnalysisResult?: any;
  isAiAnalyzing?: boolean;
  catalyst?: any;
  receiptChallenge?: any;
  repairFeedback?: string | null;
  children?: React.ReactNode;
}

export const FieldClipboard: React.FC<FieldClipboardProps> = ({
  mission,
  onStartCapture,
  onPhotoConfirm,
  onSubmit,
  state,
  setState,
  data,
  setData,
  aiAnalysisResult,
  isAiAnalyzing,
  catalyst,
  receiptChallenge,
  repairFeedback,
  children
}) => {
  const goToState = (next: FieldClipboardState) => {
    setState(next);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBrief, setShowBrief] = useState(false);
  const imageUrl = getMissionImage(mission.id, mission.category || mission.type, mission.image);

  // Catalyst details
  const showCatalystSticker = catalyst && catalyst.isActive;

  // Derived detector status
  const detectorStatus: DetectorStatus = isAiAnalyzing 
    ? 'analyzing' 
    : (aiAnalysisResult?.status || 'idle');

  const canSubmit = data.photoCaptured && data.note.length >= 10 && !isSubmitting && !isAiAnalyzing;

  const handleFinalSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    goToState('submitting');
    try {
      await onSubmit();
    } catch (e) {
      console.error(e);
      goToState('reviewing');
      setIsSubmitting(false);
    }
  };

  // Render helpers
  const renderStepHeader = (title: string, icon: React.ReactNode, badge?: string) => (
    <div className="flex items-center justify-between pb-2 border-b-2 border-on-surface/5 mb-4">
      <div className="flex items-center gap-2">
        {icon}
        <span className="font-mono text-[10px] font-black uppercase tracking-widest text-brand-orange">{title}</span>
      </div>
      {badge && (
        <div className="bg-brand-lime text-on-surface text-[9px] font-mono px-2 py-0.5 border-2 border-on-surface shadow-[2px_2px_0px_black] font-bold">
          {badge}
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full max-w-md mx-auto space-y-6 px-4 pb-32">
      {/* NEW COMPACT MISSION SIGNAL HEADER */}
      <div className="relative w-full overflow-hidden border-4 border-on-surface bg-[#FFFDF8] shadow-[6px_6px_0px_black] rounded-2xl animate-fade-in mb-4">
        {/* Signal Strip */}
        <div className="bg-on-surface text-[#B7FF00] py-1 px-4 flex justify-between items-center relative z-20 border-b-2 border-on-surface">
           <div className="flex items-center gap-2">
             <div className="w-1 h-1 rounded-full bg-current animate-pulse shadow-[0_0_8px_currentColor]" />
             <span className="font-mono text-[7px] font-black uppercase tracking-[0.2em]">MISSION_SIGNAL</span>
           </div>
           <span className="font-mono text-[7px] font-black uppercase opacity-60">REF: {mission.id.slice(0, 8)}</span>
        </div>

        <div className="h-36 relative bg-on-surface flex flex-col group p-4 border-b-2 border-on-surface overflow-hidden">
          {/* Background Image - Subtleized */}
          <div className="absolute inset-0 z-0">
            <img 
              src={imageUrl} 
              alt={mission.title}
              className="w-full h-full object-cover opacity-50 grayscale contrast-125 transition-transform duration-700 group-hover:scale-110 group-hover:opacity-60"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-on-surface via-on-surface/40 to-on-surface/60" />
          </div>
          
          {/* Metadata Badges (STICKERS) */}
          <div className="flex justify-between items-start mb-2 relative z-20 w-full">
            <div className="flex flex-wrap gap-1.5 max-w-[70%]">
              <div className="bg-[#2EE7F0] text-on-surface text-[8px] font-black px-2 py-0.5 border-2 border-on-surface shadow-[2px_2px_0px_black] uppercase italic leading-none whitespace-nowrap">
                {mission.category || 'ONBOARDING'}
              </div>
              <div className="bg-[#B7FF00] text-on-surface text-[8px] font-black px-2 py-0.5 border-2 border-on-surface shadow-[2px_2px_0px_black] uppercase italic leading-none rotate-[-1deg] whitespace-nowrap">
                {mission.deckName || 'ADVENTURE'}
              </div>
            </div>

            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <div className="bg-[#FF5A00] text-white px-2 py-1 text-[10px] font-black uppercase italic border-2 border-on-surface shadow-[2px_2px_0px_black]">
                +{mission.baseXP} XP
              </div>
            </div>
          </div>

          {/* MISSION TITLE AREA - No truncation, clear hierarchy */}
          <div className="relative z-20 mt-auto">
            <h1 className="font-display text-2xl sm:text-3xl font-black uppercase italic text-white tracking-tighter leading-[0.85] drop-shadow-2xl">
              {mission.title}
            </h1>
          </div>
        </div>

        {/* BOTTOM ACTION STRIP */}
        <div className="flex border-t-2 border-on-surface divide-x-2 divide-on-surface bg-white relative z-30">
          <button 
            onClick={() => setShowBrief(!showBrief)} 
            className={cn(
              "flex-1 px-4 py-2 flex items-center justify-center gap-2 font-mono text-[9px] font-black uppercase tracking-wider transition-all",
              showBrief ? "bg-on-surface text-white" : "hover:bg-on-surface/5"
            )}
          >
            <Info className={cn("w-3 h-3", showBrief ? "text-brand-cyan" : "text-on-surface/40")} />
            <span>{showBrief ? 'CLOSE BRIEF' : 'OPEN BRIEF'}</span>
          </button>
          <div className="flex-1 px-4 py-2 flex items-center justify-center gap-2 text-[#FF5A00] font-mono text-[9px] font-black uppercase tracking-wider">
            <ArrowRight className="w-3 h-3 animate-pulse" />
            <span>READY TO START</span>
          </div>
        </div>

        <AnimatePresence>
          {showBrief && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-6 py-4 bg-brand-orange/[0.03] font-serif italic text-base text-on-surface/80 leading-relaxed text-left border-t-2 border-on-surface/10"
            >
              "{mission.description}"
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence mode="wait">
        {/* STEP 1: BRIEF - REDESIGNED OBJECTIVE CARD */}
        {state === 'brief' && (
          <motion.div 
            key="brief"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="bg-white border-2 border-on-surface p-5 rounded-2xl shadow-[8px_8px_0px_black] text-left space-y-4 overflow-hidden relative">
               {/* Subtle background strip */}
               <div className="absolute top-0 left-0 right-0 h-1 bg-brand-orange/10" />

               <div className="flex items-center gap-3 border-b border-dashed border-on-surface/10 pb-4">
                 <div className="w-9 h-9 bg-brand-orange/10 rounded-xl flex items-center justify-center border border-brand-orange/20 shrink-0">
                   <ShieldCheck className="w-5 h-5 text-brand-orange" />
                 </div>
                 <div className="min-w-0">
                   <span className="block font-display font-black uppercase italic text-xl tracking-tighter text-on-surface leading-none">Receipt Checklist</span>
                   <span className="block font-mono text-[9px] font-black uppercase tracking-widest text-on-surface/35 mt-1">Photo + note + submit</span>
                 </div>
               </div>

               <div className="grid grid-cols-1 gap-3 relative z-10">
                 <div className="flex gap-3 items-center group rounded-xl bg-on-surface/[0.025] border border-on-surface/5 px-3 py-3">
                   <div className="w-7 h-7 rounded-full bg-brand-cyan border-2 border-on-surface flex-shrink-0 flex items-center justify-center text-[10px] font-black shadow-[2px_2px_0px_black]">1</div>
                   <div className="min-w-0">
                     <p className="font-display uppercase italic text-base font-black leading-none text-on-surface">Find it</p>
                     <p className="text-xs text-on-surface/55 font-sans mt-1">Spot something that fits the mission.</p>
                   </div>
                 </div>
                 <div className="flex gap-3 items-center group rounded-xl bg-on-surface/[0.025] border border-on-surface/5 px-3 py-3">
                   <div className="w-7 h-7 rounded-full bg-brand-cyan border-2 border-on-surface flex-shrink-0 flex items-center justify-center text-[10px] font-black shadow-[2px_2px_0px_black]">2</div>
                   <div className="min-w-0">
                     <p className="font-display uppercase italic text-base font-black leading-none text-on-surface">Snap it</p>
                     <p className="text-xs text-on-surface/55 font-sans mt-1">Take one clear proof photo.</p>
                   </div>
                 </div>
                 <div className="flex gap-3 items-center group rounded-xl bg-on-surface/[0.025] border border-on-surface/5 px-3 py-3">
                   <div className="w-7 h-7 rounded-full bg-brand-cyan border-2 border-on-surface flex-shrink-0 flex items-center justify-center text-[10px] font-black shadow-[2px_2px_0px_black]">3</div>
                   <div className="min-w-0">
                     <p className="font-display uppercase italic text-base font-black leading-none text-on-surface">Say why</p>
                     <p className="text-xs text-on-surface/55 font-sans mt-1">Add a short field note.</p>
                   </div>
                 </div>
               </div>
               
               {(receiptChallenge || showCatalystSticker) && (
                 <div className="grid grid-cols-1 gap-3">
               {receiptChallenge && (
                 <div className="bg-brand-orange/5 border-2 border-dashed border-brand-orange p-4 rounded-2xl space-y-2 relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-2 opacity-10">
                      <Zap className="w-12 h-12 text-brand-orange" />
                   </div>
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2">
                       <Zap className="w-4 h-4 text-brand-orange animate-pulse" />
                       <span className="font-mono text-[9px] font-black uppercase text-brand-orange tracking-widest">Optional Boost</span>
                     </div>
                     <div className="bg-white border-2 border-on-surface px-2 py-1 text-[10px] font-black italic shadow-[3px_3px_0px_black] rotate-[-2deg]">
                        1.25x BOOST
                     </div>
                   </div>
                   <p className="text-xs font-bold text-on-surface/75 leading-snug pr-8 pt-1">{receiptChallenge.instructions}</p>
                 </div>
               )}

               {showCatalystSticker && (
                 <div className="bg-brand-lime/10 border-2 border-dashed border-brand-lime p-4 rounded-2xl space-y-2 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10">
                      <Sparkles className="w-12 h-12 text-brand-lime" />
                   </div>
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2">
                       <Sparkles className="w-4 h-4 text-brand-lime" />
                       <span className="font-mono text-[9px] font-black uppercase text-brand-lime tracking-widest">Weekly Bonus</span>
                     </div>
                     <div className="bg-on-surface text-brand-lime px-2 py-1 text-[10px] font-black italic shadow-[3px_3px_0px_white] rotate-[2deg]">
                        1.5x CATALYST
                     </div>
                   </div>
                   <p className="text-xs font-bold text-on-surface/75 leading-snug pr-8 pt-1">
                     {catalyst.title}: {catalyst.description}
                   </p>
                 </div>
               )}
                 </div>
               )}
            </div>


            <button
              onClick={onStartCapture}
              className="w-full py-4 bg-brand-orange text-white border-4 border-on-surface rounded-2xl font-display text-3xl font-black uppercase italic tracking-widest shadow-[8px_8px_0px_black] active:translate-y-2 active:shadow-none transition-all hover:bg-on-surface hover:text-brand-lime flex items-center justify-center gap-3 group"
            >
              <Zap className="w-8 h-8 fill-current group-hover:scale-125 transition-transform" />
              <span>START MISSION</span>
            </button>
          </motion.div>
        )}

        {/* STEP 2: CAPTURE SLOT */}
        {state === 'capture' && (
          <motion.div 
            key="capture"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="w-full"
          >
            <div className="bg-white border-4 border-on-surface p-2 rounded-2xl shadow-[12px_12px_0px_white] overflow-hidden">
               {children}
            </div>
          </motion.div>
        )}

        {/* STEP 3: PREVIEWING (Instant Look) */}
        {state === 'previewing_polaroid' && (
          <DevelopingPolaroid 
            imageUrl={data.photoUrl || ''}
            isDeveloping={false}
            onRetake={() => goToState('capture')}
            statusText="Verifying Capture..."
            subText="Instant signal stabilize. Ready for development."
          />
        )}

        {/* STEP 4: DEVELOPING (Polaroid Animation) */}
        {state === 'developing_polaroid' && (
          <DevelopingPolaroid 
            imageUrl={data.photoUrl || ''}
            isDeveloping={true}
            onRetake={() => goToState('capture')}
            statusText="Developing Evidence..."
            subText="Chemical stabilization and Bureau uplink in progress."
          />
        )}

        {/* STEP 4: DETECTING */}
        {state === 'detecting' && (
          <motion.div 
            key="detecting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-[#0E1B15] border-4 border-on-surface p-8 rounded-2xl shadow-[12px_12px_0px_black] space-y-8"
          >
            <div className="flex flex-col items-center gap-6">
              <div className="w-24 h-24 rounded-full border-8 border-on-surface bg-amber-500 animate-pulse shadow-[0_0_20px_var(--color-brand-orange)] flex items-center justify-center">
                <Compass className="w-12 h-12 text-on-surface animate-spin" />
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-emerald-400 font-display text-3xl font-black uppercase italic tracking-tighter">Scanning...</h2>
                <div className="font-mono text-[10px] text-emerald-600 bg-emerald-900/20 px-3 py-1 rounded-full uppercase tracking-widest">Optical Alignment active</div>
              </div>
            </div>

            <div className="bg-[#05110B] border-2 border-emerald-900/30 rounded-xl p-6 font-mono text-[10px] text-emerald-400 space-y-2 leading-relaxed text-left">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                <span className="opacity-50">INITIATING_HEURISTIC_SWEEP</span>
              </div>
              <div className="pl-3.5 opacity-80">
                {">"} ANALYZING_VISUAL_CONTEXT...<br />
                {">"} RUNNING_AI_EVIDENCE_MODEL_2.0...<br />
                {">"} COMPARING_AGAINST_TARGET_BLUEPRINT...
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 4: NOTING */}
        {state === 'noting' && (
          <motion.div 
            key="noting"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="bg-white border-4 border-on-surface p-6 rounded-2xl shadow-[12px_12px_0px_black] text-left space-y-4">
              {renderStepHeader('Field Documentation', <FileText size={18} />)}
              
              <div className="space-y-4">
                <p className="font-serif italic text-lg leading-snug text-on-surface/60">
                   Describe what you found. Trevor needs detail to verify the signal.
                </p>
                <textarea 
                  autoFocus
                  className="w-full bg-[#FAF9F6] border-4 border-on-surface p-6 rounded-xl font-serif text-xl italic shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] focus:ring-4 focus:ring-brand-cyan/20 outline-none transition-all"
                  rows={4}
                  placeholder="Min 10 characters..."
                  value={data.note}
                  onChange={(e) => setData(prev => ({ ...prev, note: e.target.value }))}
                />
                <div className="flex justify-between items-center px-1">
                   <div className="text-[10px] font-mono font-black uppercase text-on-surface/30 tracking-widest">
                     {data.note.length} / 10 CHARS
                   </div>
                   {data.note.length >= 10 && (
                     <div className="text-brand-lime font-display font-black text-xs uppercase italic flex items-center gap-1.5">
                        <CheckCircle2 size={14} />
                        VALID_DOCUMENTATION
                     </div>
                   )}
                </div>
              </div>
            </div>

            <button
              disabled={data.note.length < 10}
              onClick={() => goToState('reviewing')}
              className={cn(
                "w-full py-6 border-4 border-on-surface rounded-2xl font-display text-4xl font-black uppercase italic tracking-widest shadow-[10px_10px_0px_black] active:translate-y-2 active:shadow-none transition-all",
                data.note.length >= 10 
                  ? "bg-brand-lime text-on-surface hover:scale-[1.02]" 
                  : "bg-on-surface/5 text-on-surface/20 border-on-surface/10 cursor-not-allowed shadow-none"
              )}
            >
              SAVE NOTE
            </button>
          </motion.div>
        )}

        {/* STEP 5: REVIEWING (The main evidence gathering screen) */}
        {state === 'reviewing' && (
          <motion.div 
            key="reviewing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* EVIDENCE SOURCE (POLAROID FRAME) */}
            <div className="flex justify-center py-4">
              <div className="bg-white p-3 pb-10 shadow-[0_15px_35px_rgba(0,0,0,0.15)] border border-black/5 rotate-[1deg] relative">
                 <div className="w-64 h-64 bg-on-surface/5 relative overflow-hidden">
                   {data.photoUrl ? (
                     <img src={data.photoUrl} alt="Captured Proof" className="w-full h-full object-cover" />
                   ) : (
                     <div className="w-full h-full flex flex-col items-center justify-center text-on-surface/20">
                       <Camera size={48} strokeWidth={1} />
                       <p className="font-display text-sm font-black uppercase mt-2">PHOTO_MISSING</p>
                     </div>
                   )}
                 </div>
                 
                 <button 
                   onClick={() => goToState('capture')}
                   className="absolute -top-2 -right-2 bg-on-surface text-white w-7 h-7 rounded-full border border-white/20 flex items-center justify-center shadow-[3px_3px_0px_black] hover:bg-brand-orange transition-colors"
                 >
                   <RefreshCw size={12} />
                 </button>

                 <div className="mt-3 font-mono text-[8px] font-black uppercase tracking-widest text-on-surface/30 text-center">
                    EVIDENCE_ID: {data.photoUrl?.split('/').pop()?.substring(0, 12) || 'UNKNOWN'}
                 </div>
              </div>
            </div>

            {/* EVIDENCE DETECTOR */}
            <EvidenceDetector 
              status={detectorStatus}
              displayTitle={aiAnalysisResult?.displayTitle}
              displayDetail={aiAnalysisResult?.displayDetail}
              onRetry={() => goToState('capture')}
            />

            {/* FIELD LOG (NOTE) */}
            <div className="bg-white border-4 border-on-surface p-5 rounded-2xl shadow-[8px_8px_0px_black] text-left space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-brand-orange" />
                  <span className="font-display font-black uppercase italic text-sm">Tell Trevor</span>
                </div>
                <div className={cn(
                  "font-mono text-[9px] font-black uppercase",
                  data.note.length >= 10 ? "text-brand-lime" : "text-on-surface/30"
                )}>
                  {data.note.length} / 10 Min
                </div>
              </div>
              
              <textarea 
                className="w-full bg-[#FAF9F6] border-2 border-on-surface/10 p-4 rounded-xl font-serif text-base italic outline-none focus:border-brand-orange transition-all h-24"
                placeholder="Describe your findings..."
                value={data.note}
                onChange={(e) => setData(prev => ({ ...prev, note: e.target.value }))}
              />
            </div>

            {/* EVIDENCE METER */}
            <EvidenceMeter 
              photoCaptured={!!data.photoCaptured}
              noteAdded={data.note.length >= 10}
              detectedSubject={aiAnalysisResult?.status === 'detected'}
              missionMatchScore={aiAnalysisResult?.missionMatchScore}
              variant="compact"
            />

            {/* ERROR FEEDBACK IF ANY */}
            {!data.photoUrl && (
              <div className="flex items-center gap-2 text-red-500 font-mono text-[9px] font-black uppercase px-2 justify-center">
                 <AlertCircle size={10} /> Photo required to proceed
              </div>
            )}
            {data.photoUrl && data.note.length < 10 && (
              <div className="flex items-center gap-2 text-brand-orange font-mono text-[9px] font-black uppercase px-2 justify-center">
                 <Info size={10} /> field note is too short
              </div>
            )}

            {/* SUBMIT BUTTON */}
            <button
              disabled={!canSubmit}
              onClick={handleFinalSubmit}
              className={cn(
                "w-full py-6 border-4 border-on-surface rounded-2xl font-display text-4xl font-black uppercase italic tracking-widest shadow-[10px_10px_0px_black] active:translate-y-2 active:shadow-none transition-all",
                canSubmit 
                  ? "bg-brand-orange text-white hover:bg-on-surface hover:text-brand-lime" 
                  : "bg-on-surface/5 text-on-surface/20 border-on-surface/10 cursor-not-allowed shadow-none"
              )}
            >
              SUBMIT PROOF
            </button>
            
            <p className="text-[10px] font-serif italic text-on-surface/40 pt-2 pb-12">
              "Trevor requires standard field proof for logbook entry. Confirm documentation is authentic."
            </p>
          </motion.div>
        )}

        {/* STEP 6: SUBMITTING */}
        {state === 'submitting' && (
          <motion.div 
            key="submitting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-on-surface text-white p-12 rounded-2xl border-4 border-on-surface shadow-[12px_12px_0px_rgba(255,255,255,0.2)] flex flex-col items-center gap-8"
          >
            <div className="w-20 h-20 bg-brand-cyan border-4 border-white rounded-full flex items-center justify-center animate-bounce shadow-[0_0_30px_var(--color-brand-cyan)]">
               <Loader2 className="w-10 h-10 text-on-surface animate-spin-slow" />
            </div>
            <div className="text-center space-y-3">
               <h2 className="text-4xl font-display font-black uppercase italic tracking-widest text-brand-cyan">Transmitting...</h2>
               <p className="font-mono text-xs opacity-50 uppercase tracking-[0.3em]">Satellite Link Established</p>
            </div>
            <div className="w-full max-w-xs space-y-2">
               <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 3 }}
                    className="h-full bg-brand-cyan"
                  />
               </div>
               <div className="flex justify-between font-mono text-[8px] opacity-30">
                  <span>PACKET_07_B</span>
                  <span>UPLOADING...</span>
               </div>
            </div>
          </motion.div>
        )}

        {/* STEP 7: NEEDS MORE PROOF (CORRECTION) */}
        {state === 'needs_more_proof' && (
          <motion.div 
            key="needs_more_proof"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="bg-white border-4 border-on-surface p-6 rounded-2xl shadow-[12px_12px_0px_#ff3131] text-left space-y-4">
              <div className="flex items-center gap-2 text-error">
                <AlertCircle className="w-5 h-5" />
                <span className="font-display font-black uppercase italic text-lg leading-none">Incomplete Evidence</span>
              </div>
              <p className="font-serif italic text-lg text-on-surface leading-relaxed">
                {repairFeedback || "The Bureau requires additional context. Use the repair feedback to adjust your proof."}
              </p>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={() => goToState('capture')}
                className="w-full bg-brand-orange text-white py-6 border-4 border-on-surface rounded-2xl font-display text-4xl font-black uppercase italic tracking-widest shadow-[10px_10px_0px_black] active:translate-y-2 active:shadow-none transition-all"
              >
                RETAKE PHOTO
              </button>
              <button
                onClick={() => goToState('noting')}
                className="w-full bg-white text-on-surface py-4 border-4 border-on-surface rounded-2xl font-display text-2xl font-black uppercase italic tracking-widest shadow-[6px_6px_0px_black] active:translate-y-1 active:shadow-none transition-all"
              >
                EDIT FIELD LOGS
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes pulse-subtle {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.95; transform: scale(0.995); }
        }
        .animate-spin-slow {
          animation: spin 8s linear infinite;
        }
      `}} />
    </div>
  );
};
