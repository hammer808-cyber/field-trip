import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TripCard as TripCardType } from '../../types/challenges';
import { cn } from '../../lib/utils';
import { 
  X, Compass, Camera, FileText, 
  Gift, ChevronDown, CheckCircle2, 
  Sparkles, Zap, Info, ChevronRight,
  ArrowRight, AlertCircle, Loader2
} from 'lucide-react';
import { getMissionImage } from '../../utils/missionImages';
import { Card } from '../UI';
import { EvidenceMeter } from '../EvidenceMeter';
import { useApp } from '../../context/AppContext';
import { getCatalystForWeek, evaluateProofForCatalyst } from '../../services/weeklyCatalystService';
import { calculateSubmissionPoints } from '../../logic/scoringLogic';
import { getDeckPackById } from '../../data/deckPacks';

interface MissionBriefingProps {
  mission: TripCardType;
  isUnavailable?: boolean;
  isApproved?: boolean;
  isSubmitted?: boolean;
  onStartCapture: () => void;
  onSubmit: () => void;
  photoCaptured: boolean;
  photoUrl?: string;
  note: string;
  setNote: (note: string) => void;
  findingType?: string;
  setFindingType?: (type: string) => void;
  selectedLevel?: 'Standard' | 'Advanced' | 'Certified';
  setSelectedLevel?: (level: 'Standard' | 'Advanced' | 'Certified') => void;
  getLockReason?: (level: 'Standard' | 'Advanced' | 'Certified') => string | null;
  bonusProofFulfilled?: boolean;
  setBonusProofFulfilled?: (fulfilled: boolean) => void;
  isAnalyzing?: boolean;
  aiAnalysisResult?: any;
  fieldClipboardState?: 'briefing' | 'photo_required' | 'photo_captured' | 'analyzing' | 'analysis_complete' | 'note_required' | 'ready_to_submit' | 'submitting' | 'pending_review' | 'needs_more_proof' | 'approved' | 'rejected' | 'error';
  receiptChallenge?: any;
}

export const MissionBriefing: React.FC<MissionBriefingProps> = ({
  mission,
  isUnavailable = false,
  isApproved = false,
  isSubmitted = false,
  onStartCapture,
  onSubmit,
  photoCaptured,
  photoUrl,
  note,
  setNote,
  bonusProofFulfilled = false,
  setBonusProofFulfilled,
  findingType,
  setFindingType,
  isAnalyzing: isAnalyzingProp,
  aiAnalysisResult: aiAnalysisResultProp,
  fieldClipboardState = 'briefing',
  receiptChallenge
}) => {
  const [showBrief, setShowBrief] = useState(false);

  const isBriefingMode = fieldClipboardState === 'briefing';
  const aiMatchDetected = aiAnalysisResultProp?.status === 'detected' || aiAnalysisResultProp?.missionMatchScore > 0;

  useEffect(() => {
    if (fieldClipboardState === 'briefing') {
      setShowBrief(true);
    } else {
      setShowBrief(false);
    }
  }, [fieldClipboardState]);

  const [localFoundCategory, setLocalFoundCategory] = useState('');
  
  const foundCategory = findingType !== undefined ? findingType : localFoundCategory;
  const setFoundCategory = setFindingType !== undefined ? setFindingType : setLocalFoundCategory;
  
  const { activeSeason, currentWeekNumber } = useApp();
  const [catalyst, setCatalyst] = useState<any>(null);
  const [evalResult, setEvalResult] = useState<{ qualified: boolean; reason: string } | null>(null);

  useEffect(() => {
    let active = true;
    const fetchCatalyst = async () => {
      try {
        const seasonId = activeSeason?.id || 'dev-season-2026';
        const weekNum = mission.weekNumber || currentWeekNumber || 1;
        const cat = await getCatalystForWeek(seasonId, weekNum);
        if (active) {
          setCatalyst(cat);
        }
      } catch (err) {
        console.warn("[MissionBriefing] fetchCatalyst error:", err);
      }
    };
    fetchCatalyst();
    return () => { active = false; };
  }, [activeSeason?.id, mission.weekNumber, currentWeekNumber, mission.id]);

  useEffect(() => {
    if (catalyst) {
      const eDraft = {
        proofImage: photoUrl || '',
        fieldNote: note
      };
      const res = evaluateProofForCatalyst(eDraft, catalyst, {
        challengeTags: mission.tags || [],
        challengeTitle: mission.title || '',
        challengeDescription: mission.description || ''
      });
      setEvalResult(res);
    } else {
      setEvalResult(null);
    }
  }, [catalyst, photoUrl, note, mission.id]);

  const imageUrl = getMissionImage(mission.id, mission.category || mission.type, mission.image);

  const activeDeck = mission.deckId ? getDeckPackById(mission.deckId) : null;
  const STARTER_DEFAULT_FINDING_TYPES = [
    "Object",
    "Surface",
    "Sign",
    "Color",
    "Texture",
    "Pattern",
    "Sound",
    "Scene",
    "Human-made evidence",
    "Natural evidence"
  ];
  const findingTypeOptions = mission?.findingTypes?.length
    ? mission.findingTypes
    : activeDeck?.defaultFindingTypes?.length
      ? activeDeck.defaultFindingTypes
      : STARTER_DEFAULT_FINDING_TYPES;

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  useEffect(() => {
    if (photoCaptured && !hasAnalyzed) {
      setIsAnalyzing(true);
      const timer = setTimeout(() => {
        setIsAnalyzing(false);
        setHasAnalyzed(true);
      }, 1500);
      return () => clearTimeout(timer);
    } else if (!photoCaptured) {
      setHasAnalyzed(false);
      setIsAnalyzing(false);
    }
  }, [photoCaptured, hasAnalyzed]);

  const getLights = () => {
    if (!photoCaptured || isAnalyzing) {
      return {
        OBJECT: false,
        SURFACE: false,
        "PERSON / CREW": false,
        SCENE: false,
        ACTION: false,
        "LOCATION CLUE": false,
      };
    }

    const t = (mission.title || '').toLowerCase() + ' ' + (mission.tags || []).join(' ').toLowerCase();
    const n = note.toLowerCase();

    const isSurface = t.includes('surface') || t.includes('texture') || t.includes('floor') || t.includes('wall') || t.includes('color') || t.includes('pattern') || n.includes('surface') || n.includes('texture') || n.includes('pattern');
    const isPerson = t.includes('person') || t.includes('human') || t.includes('face') || t.includes('crew') || t.includes('agent') || n.includes('person') || n.includes('crew') || n.includes('guy') || n.includes('someone') || n.includes('me') || n.includes('human') || n.includes('he') || n.includes('she');
    const isAction = t.includes('run') || t.includes('move') || t.includes('action') || t.includes('do') || n.includes('ing') || n.includes('holding') || n.includes('doing') || n.includes('running') || n.includes('walking') || n.includes('placing');
    const isLocation = !!mission.distanceBonus?.eligible || n.includes('place') || n.includes('here') || n.includes('location') || n.includes('spot') || n.includes('at');

    return {
      OBJECT: !isSurface,
      SURFACE: isSurface,
      "PERSON / CREW": isPerson,
      SCENE: true,
      ACTION: isAction,
      "LOCATION CLUE": isLocation,
    };
  };

  // Determine AI Evidence Detector values
  let indicatorColor = "bg-neutral-600 border border-neutral-700 shadow-none"; // Off
  let detectorScreenContent = (
    <div className="space-y-1">
      <div className="text-emerald-500 font-bold">[OFFLINE]</div>
      <div className="text-white font-black text-[10.5px]">Awaiting photo.</div>
      <div className="text-neutral-500 text-[8px] leading-tight">Scan triggers upon visual context ingest.</div>
    </div>
  );

  const activeAnalysis = aiAnalysisResultProp || null;
  const activeAnalyzing = isAnalyzingProp !== undefined ? isAnalyzingProp : isAnalyzing;
  const reqSubjectName = mission.proofRequirements?.requiredSubjects?.[0] || mission.requiredProof?.[0] || "Target Match";

  if (photoCaptured) {
    if (activeAnalyzing) {
      indicatorColor = "bg-amber-500 border-2 border-amber-400 animate-pulse shadow-[0_0_8px_#f59e0b]";
      detectorScreenContent = (
        <div className="space-y-1">
          <div className="text-amber-400 font-bold animate-pulse">[SCANNING...]</div>
          <div className="text-amber-300 font-black animate-pulse text-[10.5px]">Analyzing receipt...</div>
          <div className="text-neutral-500 text-[8px] leading-tight">Calibrating optical detectors...</div>
        </div>
      );
    } else if (activeAnalysis) {
      const status = activeAnalysis.status;
      if (status === 'detected') {
        indicatorColor = "bg-emerald-500 border-2 border-emerald-400 shadow-[0_0_12px_#10b981]";
        detectorScreenContent = (
          <div className="space-y-1 text-emerald-400">
            <div className="font-bold text-emerald-300">[EVIDENCE VERIFIED]</div>
            <div className="text-white font-extrabold uppercase text-[10.5px] leading-tight flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Found: {activeAnalysis.displayTitle || reqSubjectName}
            </div>
            <div className="text-[8.5px] leading-snug text-emerald-400/80">
              {activeAnalysis.displayDetail || "Characteristics recognized matching guidelines."}
            </div>
            {activeAnalysis.detectedItems && activeAnalysis.detectedItems.length > 0 && (
              <div className="text-[8px] text-emerald-400/80 font-mono">
                Detected: {activeAnalysis.detectedItems.join(', ')}
              </div>
            )}
            {activeAnalysis.missionMatchScore !== undefined && (
              <div className="text-brand-orange text-[9px] font-black uppercase mt-0.5 animate-pulse">
                ✓ match score: {activeAnalysis.missionMatchScore}%
              </div>
            )}
          </div>
        );
      } else if (status === 'not_detected') {
        indicatorColor = "bg-rose-500 border-2 border-rose-400 animate-pulse shadow-[0_0_10px_#f43f5e]";
        detectorScreenContent = (
          <div className="space-y-1 text-rose-300">
            <div className="font-bold text-rose-400">[PENDING CONTEXT]</div>
            <div className="text-white font-extrabold uppercase text-[10.5px] leading-tight">
              Target not detected
            </div>
            {activeAnalysis.missingItems && activeAnalysis.missingItems.length > 0 ? (
              <div className="text-rose-400 font-bold uppercase text-[9px]">
                Missing: {activeAnalysis.missingItems.join(', ')}
              </div>
            ) : (
              <div className="text-rose-400 font-bold uppercase text-[9px]">
                Target Mismatch
              </div>
            )}
            <div className="text-neutral-500 text-[8px] leading-tight">
              {activeAnalysis.displayDetail || "Field notes or visual context mismatch."}
            </div>
          </div>
        );
      } else if (status === 'skipped' || status === 'blocked_by_cap' || status === 'manual_review_required') {
        indicatorColor = "bg-sky-500 border-2 border-sky-400 shadow-[0_0_8px_#38bdf8]";
        detectorScreenContent = (
          <div className="space-y-1 text-sky-300">
            <div className="font-bold text-sky-400">[MANUAL REVIEW REQUIRED]</div>
            <div className="text-white font-extrabold uppercase text-[10.5px] leading-tight">
              {activeAnalysis.displayTitle || "AI scan unavailable"}
            </div>
            <div className="text-neutral-400 text-[8px] leading-tight">
              {activeAnalysis.displayDetail || "AI scan unavailable, proof can still be submitted."}
            </div>
          </div>
        );
      } else {
        indicatorColor = "bg-neutral-600 border border-neutral-700 shadow-none";
        detectorScreenContent = (
          <div className="space-y-1 text-rose-400 animate-pulse">
            <div className="font-bold text-rose-500">[SCAN FAILED]</div>
            <div className="text-white font-bold text-[10.5px]">Scan failed — try again.</div>
            <div className="text-neutral-500 text-[8.5px] leading-tight">
              {activeAnalysis.displayDetail || "The Fieldtrip uplink was desynced."}
            </div>
          </div>
        );
      }
    } else {
      indicatorColor = "bg-neutral-600 border border-neutral-700 shadow-none";
      detectorScreenContent = (
        <div className="space-y-1">
          <div className="text-amber-400 font-bold">[QUEUED]</div>
          <div className="text-white font-black text-[10.5px]">Awaiting analysis.</div>
          <div className="text-neutral-500 text-[8px] leading-tight">Starting scan pipeline...</div>
        </div>
      );
    }
  }

  return (
    <div className="w-full max-w-md mx-auto pb-48 space-y-5 px-4">
      {/* 1. Mission Hero Card */}
      <div className="relative w-full overflow-hidden field-card field-card--paper border-4 border-on-surface bg-[#FFFDF8] field-paper-shadow-lg mt-3 p-0 rounded-2xl">
        <div className="h-28 sm:h-32 relative overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img 
              src={imageUrl} 
              alt={mission.title}
              className={cn(
                "w-full h-full object-cover brightness-[0.7] grayscale-[0.2] transition-all duration-705",
                (isSubmitted || isApproved) && "grayscale brightness-[0.25]"
              )}
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-on-surface/90 via-on-surface/20 to-transparent" />
          </div>

          <div className="relative z-10 p-4 flex flex-col h-full justify-end items-start animate-fade-in">
            <div className="space-y-0.5 animate-slide-up">
              <div className="flex items-center gap-2 mb-1">
                <div className="field-badge bg-brand-cyan text-on-surface text-[8px] py-0.5 px-1.5 uppercase font-mono tracking-wider font-extrabold shadow-[1px_1px_0px_rgba(0,0,0,1)]">
                  {mission.category || 'FIELD_FIND'}
                </div>
                <div className="field-badge bg-on-surface text-white opacity-45 border-transparent text-[8px] py-0.5 px-1.5 uppercase font-mono tracking-wider">
                  DECK 0{mission.weekNumber || 1}
                </div>
              </div>
              
              <h1 className="font-display text-xl sm:text-2xl font-black uppercase italic tracking-tighter text-white leading-none">
                {mission.title}
              </h1>
            </div>
          </div>

          {/* XP Tag */}
          <div className="absolute top-3 right-3 bg-brand-orange text-white px-3 py-1 text-[10px] font-black uppercase italic tracking-tight border-2 border-on-surface shadow-[2px_2px_0px_black] rotate-[-2deg] select-none">
            +{mission.baseXP} XP
          </div>
        </div>

        {/* View Mission Bio Dropdown */}
        <div className="px-4 py-2.5 bg-white/85 backdrop-blur-sm border-t-2 border-on-surface/5">
          <button 
            onClick={() => setShowBrief(!showBrief)}
            type="button"
            className="w-full flex items-center justify-between text-[10px] font-black font-mono uppercase tracking-[0.2em] text-on-surface/60 hover:text-on-surface cursor-pointer animate-fade-in"
          >
            <div className="flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-brand-cyan" />
              <span>{showBrief ? "CLOSE MISSION LOG" : "VIEW MISSION BIO"}</span>
            </div>
            <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showBrief ? "rotate-180" : "-rotate-90")} />
          </button>
        </div>

        <AnimatePresence>
          {showBrief && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden relative z-10 border-t-2 border-on-surface/5 bg-on-surface/[0.02] px-4 pb-4 pt-2.5 text-left animate-fade-in"
            >
              <p className="font-serif italic text-sm text-on-surface/85 leading-relaxed">
                "{mission.description}"
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {receiptChallenge && (
        <div className="w-full border-4 border-dashed border-brand-orange bg-brand-orange/5 p-4 rounded-xl mt-4 text-left relative z-10 animate-fade-in mb-4">
          <div className="flex items-center gap-1.5 text-brand-orange">
            <Zap className="w-4 h-4 text-brand-orange animate-pulse" />
            <span className="font-mono text-[9px] font-black uppercase tracking-wider">Trevor's Side Quest</span>
          </div>
          <p className="font-sans text-xs text-on-surface/90 leading-relaxed font-semibold mt-1">
            {receiptChallenge.instructions}
          </p>
          <div className="mt-2.5 inline-flex items-center gap-1.5 bg-brand-orange text-white px-2.5 py-1 rounded font-mono text-xs font-bold shadow-sm">
            Tiny target: {receiptChallenge.text}
          </div>
        </div>
      )}

      {isBriefingMode ? (
        /* Render ONLY START CTA button during briefing screen */
        <div className="pt-2 pb-14 relative z-10 w-full animate-fade-in">
          <button
            onClick={onStartCapture}
            type="button"
            className="w-full py-5 bg-brand-orange text-white border-4 border-on-surface font-display text-2xl font-black uppercase italic tracking-wide shadow-[6px_6px_0px_black] active:translate-y-1 hover:bg-[#0E1B15] hover:text-[#21D4FD] transition-all rounded-2xl flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Start Adventure</span>
            <ArrowRight className="w-6 h-6 animate-pulse" />
          </button>
        </div>
      ) : (
        /* Full guided sequence */
        <>
          {/* 2. Capture Proof Card */}
          <div className="w-full field-card field-card--paper border-4 border-on-surface bg-white p-4 field-paper-shadow-lg space-y-3.5 relative z-10 text-left rounded-2xl animate-fade-in animate-duration-300">
            <div className="flex items-center justify-between pb-1 border-b border-on-surface/5">
              <div className="flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-brand-orange" />
                <span className="font-mono text-[9px] font-black uppercase tracking-wider text-brand-orange">Grab Your Receipt</span>
              </div>
              {photoCaptured ? (
                <div className="field-badge bg-brand-lime text-on-surface border-on-surface shadow-[2px_2px_0px_black] text-[9px] font-mono">
                  ✓ CAPTURED
                </div>
              ) : (
                <div className="field-badge bg-brand-orange/15 text-brand-orange border-brand-orange/20 animate-pulse text-[9px] font-mono">
                  RECOMMENDED
                </div>
              )}
            </div>

            {photoCaptured && photoUrl ? (
              <div className="relative aspect-square w-full rounded-xl overflow-hidden border-4 border-on-surface field-paper-shadow group bg-neutral-900 shadow-[6px_6px_0px_black]">
                <img src={photoUrl} className="w-full h-full object-cover" alt="Proof captured receipt" />
                
                <button 
                  onClick={onStartCapture}
                  type="button"
                  className="absolute bottom-4 right-4 bg-white border-2 border-on-surface p-2.5 rounded-full shadow-[3px_3px_0px_black] hover:bg-neutral-100 transition-all active:scale-95 cursor-pointer z-20 flex items-center justify-center gap-1.5"
                >
                  <Camera className="w-3.5 h-3.5 text-on-surface" />
                  <span className="font-mono text-[9px] font-black uppercase tracking-wider text-on-surface pr-1">Retake</span>
                </button>
                <div className="absolute inset-0 bg-brand-lime/5 pointer-events-none mix-blend-overlay" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_45%,rgba(0,0,0,0.40)_100%)] pointer-events-none" />
                
                <div className="absolute top-3 left-3 px-2 py-0.5 bg-black/75 text-white font-mono text-[8px] uppercase tracking-widest rounded select-none">
                  M_REC_#{mission.id.slice(-4).toUpperCase()}
                </div>
              </div>
            ) : (
              <button 
                onClick={onStartCapture}
                type="button"
                className="w-full py-14 aspect-square rounded-2xl border-4 border-dashed border-brand-orange bg-brand-orange/[0.01] hover:bg-brand-orange/5 transition-all flex flex-col items-center justify-center gap-4 cursor-pointer shadow-[inset_0_4px_16px_rgba(249,115,22,0.05)] text-brand-orange group animate-pulse-subtle"
              >
                <div className="w-16 h-16 rounded-full bg-brand-orange text-white flex items-center justify-center shadow-[4px_4px_0px_black] group-hover:scale-105 transition-all border-4 border-on-surface rotate-[-3deg]">
                  <Camera className="w-8 h-8 animate-pulse" />
                </div>
                <div className="space-y-1 text-center">
                  <p className="font-display text-lg font-black uppercase tracking-tight text-on-surface italic">INITIALIZE_CAPTURE</p>
                  <p className="text-[10px] font-mono font-black text-brand-orange/80 uppercase tracking-widest">Tap to activate field camera</p>
                </div>
              </button>
            )}
          </div>

          {/* 3. AI Evidence Detector */}
          {photoCaptured && (
            <div className="w-full bg-[#0E1B15] border-4 border-on-surface p-4 shadow-[4px_4px_0px_black] rounded-2xl relative z-10 flex items-center gap-4 text-left animate-fade-in">
              {/* Left: Round indicator light */}
              <div className="flex flex-col items-center justify-center shrink-0">
                <div className={cn(
                  "w-8 h-8 rounded-full border-4 border-on-surface transition-all duration-500",
                  indicatorColor
                )} />
                <span className="text-[7px] font-mono text-emerald-500/50 uppercase tracking-wider mt-1 font-bold">DETECTOR</span>
              </div>

              {/* Right: Rectangular green screen / terminal display panel */}
              <div className="flex-1 min-h-[72px] bg-[#050D0A] border-2 border-emerald-900/30 rounded-xl p-3 font-mono text-[10px] text-emerald-400 relative overflow-hidden flex flex-col justify-center">
                <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(16,185,129,0)_50%,rgba(16,185,129,0.25)_50%)] bg-[length:100%_4px]" />
                <div className="relative z-10">
                  {detectorScreenContent}
                </div>
              </div>
            </div>
          )}

          {/* 4. Field Note, Evidence Meter, and Submit Card (Only unlocked/shown once AI scan finishes) */}
          {photoCaptured && !activeAnalyzing && (
            <>
              {/* 4. Field Note Card (Highly Prominent with warm highlight border if photoCaptured but note is too short) */}
          <div 
            className={cn(
              "w-full field-card field-card--paper border-4 p-4 sm:p-5 field-paper-shadow-lg rounded-2xl space-y-3 relative z-10 text-left bg-white transition-all duration-300 animate-fade-in",
              (photoCaptured && note.trim().length < 10) 
                ? "border-brand-orange shadow-[6px_6px_0px_#f97316] ring-2 ring-brand-orange/20 animate-pulse-subtle" 
                : "border-on-surface"
            )}
          >
            <div className="flex items-center justify-between select-none pb-1.5 border-b border-on-surface/5">
              <div className="flex items-center gap-2">
                 <div className="w-8 h-8 field-card field-card--sticker bg-brand-cyan/5 flex items-center justify-center p-0 shadow-[2px_2px_0px_black] border border-on-surface/25">
                   <FileText className="w-4 h-4 text-brand-cyan" />
                 </div>
                 <div>
                   <h3 className="font-display text-sm font-black uppercase text-on-surface leading-none mt-0.5">Add Field Note</h3>
                   <p className="text-[9px] text-on-surface/50 font-sans font-bold uppercase tracking-wider">Describe your evidence details.</p>
                 </div>
              </div>
              {note.trim().length >= 10 && (
                <div className="field-badge bg-brand-lime text-on-surface border-on-surface shadow-[2px_2px_0px_black] text-[9px] font-mono shrink-0">
                   ✓ VERIFIED
                </div>
              )}
            </div>
            
            <div className="relative mt-1">
              <textarea
                id="field-note-input"
                rows={2.5}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What is happening in this receipt... (Min 10 chars)"
                className="w-full p-3 bg-white border-2 border-on-surface shadow-[3px_3px_0px_black] rounded-xl font-serif text-sm italic focus:outline-none focus:ring-4 focus:ring-brand-cyan/10 text-on-surface placeholder:opacity-35 resize-none"
              />
            </div>
            
            {/* Optional classifications embedded inside notes card */}
            <div className="pt-1 flex flex-col gap-1 text-left">
              <label className="text-[8px] font-mono font-black uppercase tracking-wider text-on-surface/40 leading-none">Optional // Classification type</label>
              <select
                value={foundCategory}
                onChange={(e) => setFoundCategory(e.target.value)}
                className="w-full p-2 bg-white border-2 border-on-surface shadow-[2px_2px_0px_black] rounded-lg font-mono text-[9px] uppercase font-bold focus:outline-none focus:ring-4 focus:ring-brand-cyan/10 cursor-pointer text-on-surface"
              >
                <option value="">-- AUTO_DETECT --</option>
                {findingTypeOptions.map((type, idx) => (
                  <option key={idx} value={type}>
                    {type.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-between items-center text-[8.5px] font-mono font-black uppercase tracking-wider pt-1 select-none">
               <span className="opacity-40">{note.trim().length} / 10 CHARACTERS</span>
               {note.trim().length === 0 ? (
                 <span className="text-on-surface/30 font-black">Awaiting notes...</span>
               ) : note.trim().length < 10 ? (
                 <span className="text-brand-orange animate-pulse font-black">NEED {10 - note.trim().length} MORE</span>
               ) : (
                 <span className="text-brand-lime flex items-center gap-1 font-bold">
                   UPLINK READY
                 </span>
               )}
            </div>
          </div>

          {/* 5. Evidence Meter */}
          {photoCaptured && (
            <div className="w-full field-card field-card--paper border-4 border-on-surface bg-[#FAF8F5] p-4 field-paper-shadow rounded-2xl relative z-10 text-left space-y-3 animate-fade-in">
              <div className="flex items-center justify-between pb-1 border-b border-on-surface/5">
                <div className="flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-brand-cyan shrink-0 animate-spin" />
                  <span className="font-mono text-[9px] font-black uppercase tracking-wider text-on-surface/40">Evidence Meter</span>
                </div>
                <span className="px-2 py-0.5 bg-black text-brand-lime text-[10px] font-mono font-black italic shadow-[2px_2px_0px_black] rounded border border-on-surface select-none font-bold">
                  {(() => {
                    let xp = 0;
                    if (photoCaptured) xp += 100;
                    if (note.trim().length >= 10) xp += 50;
                    if (aiMatchDetected) xp += 30; // AI Match & Target detected
                    if (evalResult?.qualified) xp += 20; // Catalyst fulfilled
                    return `${xp} / 200 XP`;
                  })()}
                </span>
              </div>

              {/* Progress bar */}
              <div className="relative h-4.5 bg-on-surface/5 border-2 border-on-surface rounded-full overflow-hidden shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] mb-2">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ 
                    width: `${(() => {
                      let percent = 0;
                      if (photoCaptured) percent += 50;
                      if (note.trim().length >= 10) percent += 25;
                      if (aiMatchDetected) percent += 15;
                      if (evalResult?.qualified) percent += 10;
                      return percent;
                    })()}%` 
                  }}
                  transition={{ type: 'spring', stiffness: 50, damping: 20 }}
                  className="absolute inset-y-0 left-0 bg-brand-cyan border-r-2 border-on-surface shadow-[0_0_12px_rgba(33,212,253,0.3)] animate-[shimmer_3s_infinite]"
                />
              </div>

              {/* Checklist grids */}
              <div className="grid grid-cols-2 gap-2 text-[8.5px] font-mono leading-none">
                <div className={cn("flex items-center gap-1.5 p-1.5 border rounded-lg transition-all", photoCaptured ? "bg-brand-lime/10 border-brand-lime text-on-surface" : "bg-neutral-50 border-neutral-200 text-neutral-400")}>
                  <div className={cn("w-1.5 h-1.5 rounded-full", photoCaptured ? "bg-brand-lime" : "bg-neutral-300")} />
                  <span>Photo: +100XP</span>
                </div>
                <div className={cn("flex items-center gap-1.5 p-1.5 border rounded-lg transition-all", note.trim().length >= 10 ? "bg-brand-lime/10 border-brand-lime text-on-surface" : "bg-neutral-50 border-neutral-200 text-neutral-400")}>
                  <div className={cn("w-1.5 h-1.5 rounded-full", note.trim().length >= 10 ? "bg-brand-lime" : "bg-neutral-300")} />
                  <span>Story Note: +50XP</span>
                </div>
                <div className={cn("flex items-center gap-1.5 p-1.5 border rounded-lg transition-all", aiMatchDetected ? "bg-brand-lime/10 border-brand-lime text-on-surface" : "bg-neutral-50 border-neutral-200 text-neutral-400")}>
                  <div className={cn("w-1.5 h-1.5 rounded-full", aiMatchDetected ? "bg-brand-lime" : "bg-neutral-300")} />
                  <span>AI Target Match: +30XP</span>
                </div>
                <div className={cn("flex items-center gap-1.5 p-1.5 border rounded-lg transition-all", evalResult?.qualified ? "bg-brand-lime/10 border-brand-lime text-on-surface" : "bg-neutral-50 border-neutral-200 text-neutral-400")}>
                  <div className={cn("w-1.5 h-1.5 rounded-full", evalResult?.qualified ? "bg-brand-lime" : "bg-neutral-300")} />
                  <span>Catalyst Boost: +20XP</span>
                </div>
              </div>
            </div>
          )}

          {/* 6. Weekly Catalyst Sticker */}
          {catalyst && (
            <div className="w-full relative z-10 flex flex-col items-center animate-fade-in">
              <div className="field-card field-card--sticker bg-[#FFEFC6] border-[4px] border-dashed border-on-surface p-4 shadow-[4px_4px_0px_black] rotate-[-1deg] max-w-sm w-full text-left space-y-1.5 rounded-2xl select-none">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] font-black uppercase tracking-wider text-brand-orange">Weekly Catalyst Boost</span>
                  <span className="px-2 py-0.5 bg-brand-orange text-white text-[8px] font-mono font-black uppercase tracking-wider rounded border border-on-surface font-bold animate-pulse">1.5x Boost</span>
                </div>
                
                <div className="space-y-0.5">
                  <h4 className="font-display text-xs font-black uppercase italic tracking-tight text-on-surface">{catalyst.title}</h4>
                  <p className="text-[10px] text-on-surface/85 leading-relaxed font-serif italic">
                    "{catalyst.description}"
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-on-surface/5 text-[8.5px] font-mono leading-none">
                  <div className={cn(
                    "w-2 h-2 rounded-full border",
                    evalResult?.qualified 
                      ? "bg-brand-lime border-on-surface shadow-[0_0_6px_var(--color-brand-lime)] animate-pulse" 
                      : "bg-on-surface/10 border-transparent"
                  )} />
                  <span className="font-bold uppercase tracking-wider opacity-60">
                    {evalResult?.qualified ? "Weekly condition matched (+20 XP!)" : "Dormant // Awaiting Matching Criteria"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 7. Potential Sticker Award */}
          {mission.rewards?.stickers?.[0] && (
            <div className="w-full flex justify-center items-center py-1 relative z-10 opacity-55 text-[8.5px] font-mono font-bold uppercase tracking-wider text-on-surface/50">
              <Gift className="w-3 h-3 text-brand-purple shrink-0 mr-1.5" />
              <span>Award sticker: {mission.rewards.stickers[0]}</span>
            </div>
          )}

          {/* 8. Submit Proof CTA */}
          <div className="pt-2 pb-14 relative z-10 w-full animate-fade-in">
            {isUnavailable ? (
              <button
                onClick={() => window.history.back()}
                type="button"
                className="w-full py-5 bg-neutral-900 border-4 border-on-surface text-white font-display text-xl font-bold uppercase italic tracking-widest shadow-[6px_6px_0px_black] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer rounded-2xl"
              >
                BACK TO DECK
              </button>
            ) : (
              (() => {
                const isNoteComplete = note.trim().length >= 10;
                const isReady = photoCaptured && isNoteComplete && !isSubmitted;
                
                return (
                  <div className="space-y-4 text-center">
                    <button
                      onClick={isReady ? onSubmit : undefined}
                      type="button"
                      disabled={!isReady || isSubmitted}
                      className={cn(
                        "w-full py-5 text-xl font-display font-black uppercase italic tracking-wider border-4 border-on-surface rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all duration-300",
                        isReady 
                          ? "bg-brand-lime text-on-surface shadow-[6px_6px_0px_black] hover:scale-[1.01] active:translate-y-0.5 cursor-pointer animate-pulse"
                          : "bg-on-surface/5 text-on-surface/20 border-on-surface/10 cursor-not-allowed"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {isSubmitted ? (
                          <Loader2 className="w-5 h-5 animate-spin opacity-45" />
                        ) : (
                          <ArrowRight className={cn("w-4 h-4", isReady && "animate-pulse")} />
                        )}
                        <span>
                          {isSubmitted 
                            ? "TRANSMITTING..." 
                            : fieldClipboardState === 'needs_more_proof' 
                              ? "Submit Updated Proof" 
                              : "Submit Proof"}
                        </span>
                      </div>
                      <span className="text-[8px] font-mono font-black uppercase opacity-45 tracking-widest select-none">
                        {isSubmitted 
                          ? "Satellite Uplink Active" 
                          : !isNoteComplete 
                            ? `Awaiting field note description (${note.trim().length}/10 complete)` 
                            : "Ready to send Trevor the receipt"}
                      </span>
                    </button>
                    
                    {/* Visual feedback of what is missing */}
                    {!isReady && !isSubmitted && (
                      <div className="bg-brand-orange/5 border border-brand-orange/20 rounded-xl p-3 flex items-start gap-2 max-w-sm mx-auto text-left animate-fade-in">
                        <AlertCircle className="w-4 h-4 text-brand-orange mt-0.5 shrink-0 animate-bounce" />
                        <p className="text-[10px] font-serif italic text-brand-orange/80 leading-snug">
                          {!photoCaptured && "To file this discovery, a field receipt image must be uploaded/snapped."}
                          {photoCaptured && !isNoteComplete && `Field notes must be at least 10 characters long (${note.trim().length}/10 complete).`}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()
            )}
          </div>
          </>
          )}
        </>
      )}
    </div>
  );
};
