import React, { useState, useRef, Suspense, lazy, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { MOCK_TRIPS } from '../constants';
import { Camera, X, Check, Upload, Lock, Calendar, MessageSquare, Zap, Sparkles, ShieldCheck, AlertCircle, MapPin, RefreshCw, ChevronLeft, ChevronRight, Loader2, FileText, ChevronDown } from 'lucide-react';
import { Card as UICard } from '../components/UI';
import { 
  getFrankieTitle,
  getFrankieDescription,
  getFrankieFieldNotePrompt,
  getFrankieEvidenceLabel
} from '../logic/frankieModeLogic';
import { useTheme } from '../context/ThemeContext';
import { cn, safeToDate } from '../lib/utils';
import { ActionButton, DisplayPanel, RecoveryScreen } from '../components/UIUtilities';
import { Hibiscus, ChromeStar, GlossOverlay } from '../components/BajaBratzAssets';
import { PalmTree, BeachTag as HeatBeachTag, GlossOverlay as DiamondGloss } from '../components/SkinAssets';
import type { ViewfinderCameraHandle } from '../components/ViewfinderCamera';
import { evaluateProof } from '../services/proofService';
import { uploadBase64Image } from '../services/storageService';
import { getGlobalConfig } from '../services/configService';
import { calculateSubmissionPoints } from '../logic/scoringLogic';
import { getCatalystForWeek } from '../services/weeklyCatalystService';
import { analyzeSubmissionImage } from '../services/geminiService';

// Heavy component lazy load
const ViewfinderCamera = lazy(() => import('../components/ViewfinderCamera'));
import { ProofCorrection } from '../components/ProofCorrection';
import { MissionResultCard } from '../components/MissionResultCard';
import { FieldClipboard } from '../components/FieldClipboard';
import { FieldClipboardData, FieldClipboardState } from '../types/fieldClipboard';

import { LAUNCH_MISSION, LAUNCH_MISSION_ID } from '../data/specialMissions';

import { resolveMissionById } from '../logic/missionResolver';
import { normalizeEntryStatus } from '../logic/entryLogic';

const GESTURES = [
  "Thumbs Up",
  "Peace Sign",
  "Three fingers raised",
  "Holding a pen/pencil",
  "Pointing at the subject",
  "Wave hand",
  "Fist pump",
  "Open palm"
];

function generateReceiptChallenge() {
  const isGesture = Math.random() < 0.5;
  if (isGesture) {
    const gesture = GESTURES[Math.floor(Math.random() * GESTURES.length)];
    const instructionsOpts = [
      `Receipt Check: Add today’s weird little proof detail so Trevor knows this happened in the wild. Incorporate a physical "${gesture}" gesture clearly within your photo proof.`,
      `Today’s Field Receipt: include something orange, suspicious, or emotionally unavailable. Make sure a clear "${gesture}" gesture is visible in the photo.`
    ];
    const chosenInstructions = instructionsOpts[Math.floor(Math.random() * instructionsOpts.length)];
    return {
      type: 'gesture',
      code: `GESTURE_${gesture.toUpperCase().replace(/\s+/g, '_')}`,
      text: gesture,
      instructions: chosenInstructions
    };
  } else {
    const num = Math.floor(100 + Math.random() * 900);
    const prefixes = ["TACO", "ORANGE", "CHIP", "OK", "EV", "TX", "WILD"];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const code = `${prefix}-${num}`;
    const instructionsOpts = [
      `Receipt Check: Add today’s weird little proof detail so Trevor knows this happened in the wild. Write down the dynamic proof code "${code}" on a piece of paper in your photo, or write it explicitly inside your field note journal.`,
      `Today’s Field Receipt: include something orange, suspicious, or emotionally unavailable. Write the code "${code}" on a scrap or reference it clearly.`
    ];
    const chosenInstructions = instructionsOpts[Math.floor(Math.random() * instructionsOpts.length)];
    return {
      type: 'code',
      code: code,
      text: code,
      instructions: chosenInstructions
    };
  }
}

export default function CapturePage() {
  const [params] = useSearchParams();
  const tripIdParam = params.get('id') || params.get('missionId') || params.get('challengeId');
  const isRetry = params.get('isRetry') === 'true';
  const isResubmit = params.get('isResubmit') === 'true';
  const originalEntryId = params.get('originalEntryId');
  const isRepairMode = params.get('mode') === 'addMoreProof';
  const entryIdParam = params.get('entryId');
  const reviewIdParam = params.get('reviewId');
  const navigate = useNavigate();
  const submitLockRef = useRef(false);

  const [receiptChallenge, setReceiptChallenge] = useState<{
    type: string;
    code: string;
    text: string;
    instructions: string;
  } | null>(null);
  
  const { 
    addEntry, 
    entries,
    trips, 
    activeTrip,
    incomingFieldCheck, 
    resolveIncomingFieldCheck, 
    isLocked, 
    user, 
    profile, 
    activeSignal,
    lastReview,
    clearReview,
    updateTripProgress,
    registerPendingSubmissionLocally,
    fieldType,
    fieldTokens,
    completedChallengeIds,
    submittedPendingChallengeIds,
    needsMoreProofChallengeIds,
    isOnboardingComplete,
    unlockDiscoverySticker,
    cameraPermissionReady,
    locationPermissionReady,
    requestCamera,
    requestLocation,
    mustCompleteStarterMission,
    activeSeason,
    currentWeekNumber
  } = useApp();

  const cameraRef = useRef<ViewfinderCameraHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { skin, frankieMode, fc } = useTheme();

  const repairEntry = React.useMemo(() => {
    if (!entries || entries.length === 0) return null;
    if (entryIdParam) {
      return entries.find(e => e.id === entryIdParam);
    }
    const lowerId = tripIdParam?.toLowerCase();
    return entries.find(e => 
      (e.tripId?.toLowerCase() === lowerId || e.missionId?.toLowerCase() === lowerId || e.challengeId?.toLowerCase() === lowerId) && 
      normalizeEntryStatus(e.status) === 'needs_more_proof'
    );
  }, [entries, entryIdParam, tripIdParam]);

  const repairFeedback = React.useMemo(() => {
    if (!repairEntry) return null;
    return repairEntry.adminNotes || (repairEntry as any).adminNote || (repairEntry as any).reviewerNote || null;
  }, [repairEntry]);

  // Initialization Timeout Logic
  const [initializationTimedOut, setInitializationTimedOut] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setInitializationTimedOut(true);
    }, 6000); // 6 seconds for initialization fallback
    return () => clearTimeout(timer);
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        onCapture({
          originalImageUrl: base64,
          filteredImageUrl: base64,
          metadata: { 
            source: 'upload', 
            metadataStatus: 'verified',
            photoTakenAt: file.lastModified ? new Date(file.lastModified).toISOString() : null
          },
          trustLevel: 'verifiedCameraRoll',
          filterId: 'original',
          reviewStatus: 'pending'
        });
      };
      reader.readAsDataURL(file);
    }
  };


  // Find initial trip: URL param > activeTrip > trips[0]
  // Mission Resolution Logic
  const resolvedTrip = React.useMemo(() => {
    return resolveMissionById(tripIdParam) || activeTrip || trips[0];
  }, [tripIdParam, activeTrip, trips]);

  const [currentTrip, setCurrentTrip] = useState<any>(resolvedTrip);
  const [loading, setLoading] = useState(true);

  const missionNotFound = tripIdParam && !resolveMissionById(tripIdParam) && !loading;

  useEffect(() => {
    if (resolvedTrip && (!currentTrip || currentTrip.id !== resolvedTrip.id)) {
      setCurrentTrip(resolvedTrip);
    }
  }, [resolvedTrip, currentTrip]);

  useEffect(() => {
    console.log('[Capture] Trip Resolution:', {
      paramId: tripIdParam,
      resolved: currentTrip?.id,
      title: currentTrip?.title,
      loading,
      onboarding: isOnboardingComplete
    });
  }, [currentTrip, tripIdParam, loading, isOnboardingComplete]);

  // Initialization Timeout Handler
  if (initializationTimedOut && !currentTrip && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 font-mono bg-paper">
        <div className="max-w-md w-full border-4 border-on-surface p-8 space-y-6 bg-white shadow-[12px_12px_0px_var(--color-brand-orange)]">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-brand-orange" />
            <h1 className="text-xl font-black uppercase tracking-tighter">Handshake_Timeout</h1>
          </div>
          <p className="text-xs leading-relaxed opacity-60">
            System initialization is taking longer than expected. This could be due to signal loss or account synchronization delays.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <ActionButton label="Back to Missions" onClick={() => navigate('/deck')} />
            <ActionButton label="Retry System" onClick={() => window.location.reload()} variant="primary" />
          </div>
        </div>
      </div>
    );
  }

  if (missionNotFound) {
    return (
       <div className="min-h-screen flex items-center justify-center p-8 font-mono bg-paper">
         <div className="max-w-md w-full border-4 border-on-surface p-8 space-y-6 bg-white shadow-[12px_12px_0px_#ff3131]">
           <div className="flex items-center gap-3">
             <AlertCircle className="w-6 h-6 text-error" />
             <h1 className="text-xl font-black uppercase tracking-tighter">Mission_Not_Found</h1>
           </div>
           <div className="p-4 bg-error/5 border border-error/20 font-mono text-[10px] break-all">
             ID_REF: {tripIdParam}
           </div>
           <p className="text-xs leading-relaxed opacity-60">
             The requested mission profile could not be retrieved from the central bank.
           </p>
           <ActionButton label="Return to Mission Deck" onClick={() => navigate('/deck')} variant="primary" className="w-full" />
         </div>
       </div>
    );
  }
  
  const [restoredState] = useState(() => {
    try {
      const stored = localStorage.getItem('fieldtrip_last_completed_result');
      if (stored) {
        const parsed = JSON.parse(stored);
        const timeDiff = Date.now() - new Date(parsed.completedAt).getTime();
        if (timeDiff < 10 * 60 * 1000 && parsed.missionId === tripIdParam) {
          return parsed;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  });

  const isNeedsMore = tripIdParam ? needsMoreProofChallengeIds?.has(tripIdParam.toLowerCase()) : false;
  const initialFcState: FieldClipboardState = restoredState ? 'result' : (isNeedsMore || isRepairMode ? 'needs_more_proof' : 'brief');
  
  const [fcState, setFcState] = useState<FieldClipboardState>(initialFcState);
  const [fcData, setFcData] = useState<FieldClipboardData>({
    photoCaptured: restoredState ? true : (isNeedsMore || isRepairMode), // if we are in repair mode, we likely had data but need to fix it
    photoUrl: restoredState ? restoredState.evidenceSubmitted : undefined,
    note: restoredState ? restoredState.fieldLogMessage : '',
    findingType: restoredState ? (restoredState as any).findingType : undefined,
    isRetry,
    isRepair: isRepairMode || isNeedsMore
  });
  
  const [submissionStatus, setSubmissionStatus] = useState<'ready' | 'saving' | 'syncing' | 'submitted' | 'retry' | 'error'>(restoredState ? 'submitted' : 'ready');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (currentTrip?.id) {
      const storageKey = `ft_challenge_${currentTrip.id}`;
      const cached = localStorage.getItem(storageKey);
      if (cached) {
        try {
          setReceiptChallenge(JSON.parse(cached));
        } catch (e) {
          const fresh = generateReceiptChallenge();
          localStorage.setItem(storageKey, JSON.stringify(fresh));
          setReceiptChallenge(fresh);
        }
      } else {
        const fresh = generateReceiptChallenge();
        localStorage.setItem(storageKey, JSON.stringify(fresh));
        setReceiptChallenge(fresh);
      }
    }
  }, [currentTrip?.id]);

  // Hard Guard: Block access if mission is already submitted/approved and NOT in needs_more_proof
  useEffect(() => {
    if (!tripIdParam || !user) return;
    
    // Clear any stale local mission pointers if we are entering capture for a specific mission
    localStorage.removeItem('activeTrip');
    localStorage.removeItem('currentMission');
    localStorage.removeItem('resumeMission');
    sessionStorage.removeItem('activeTrip');

    const lowerId = tripIdParam.toLowerCase();
    const isCompleted = completedChallengeIds.has(lowerId);
    const isPending = submittedPendingChallengeIds.has(lowerId);
    const isNeedsMore = needsMoreProofChallengeIds?.has(lowerId) || isRepairMode;

    // If it's already in a final/pending state and NOT specifically requested for resubmission
    if ((isCompleted || isPending) && !isNeedsMore && fcState !== 'result' && submissionStatus !== 'submitted') {
       console.log(`[Capture Guard] Mission ${lowerId} already submitted/approved. Redirecting back to Deck.`);
       // Use replace: true to prevent back-button loops
       navigate('/deck', { replace: true });
    }
  }, [tripIdParam, completedChallengeIds, submittedPendingChallengeIds, needsMoreProofChallengeIds, user, navigate, fcState, submissionStatus]);

  // Gating properties needed early
  const isLaunchMission = !!(currentTrip?.id && currentTrip.id.toLowerCase() === LAUNCH_MISSION_ID.toLowerCase());
  // Retired guide flags
  
  const isStarterMission = !!(currentTrip?.id && [
    'starter-2', 
    'starter-3', 
    LAUNCH_MISSION_ID.toLowerCase()
  ].includes(currentTrip.id.toLowerCase()));
  const isStarterTrainingActive = !isOnboardingComplete && isStarterMission;
  const isUnavailable = !!(currentTrip && (completedChallengeIds.has(currentTrip.id.toLowerCase()) || submittedPendingChallengeIds.has(currentTrip.id.toLowerCase())));

  // Page load triggers
  useEffect(() => {
    if (fcState === 'capture') {
      unlockDiscoverySticker('capture_start', 'capture');
    }
  }, [fcState, unlockDiscoverySticker]);

  // STRICTION: Detect if this mission is ALREADY submitted via entries context
  // This solves the "dead end" where a refresh or navigation back shows the review screen again
  useEffect(() => {
    if (submissionStatus === 'submitted' || fcState === 'result') return;
    if (!tripIdParam || entries.length === 0) return;

    const existingEntry = entries.find(e => 
      (e.tripId === tripIdParam || e.missionId === tripIdParam) && 
      ['pending', 'approved', 'submitted', 'under_field_check'].includes(e.status)
    );

    if (existingEntry) {
      console.log('[Capture] Found existing entry for missionId:', tripIdParam, 'restoring success state.');
      setCompleteRecord({
        tripId: tripIdParam,
        title: existingEntry.tripTitle || existingEntry.challengeTitle || 'Mission Record',
        awardedXP: existingEntry.pointsAwarded || existingEntry.estimatedPoints || 150,
        baseXP: 150,
        note: existingEntry.fieldNote || existingEntry.note || 'Uplink stored.',
        photo: existingEntry.proofImage || existingEntry.imageUrl,
        proofType: ['photo'],
        completedAt: existingEntry.createdAt,
        syncStatus: 'synced',
        scoringData: {
          scoring: { totalPoints: existingEntry.pointsAwarded || existingEntry.estimatedPoints || 150 },
          ftBonus: 0,
          ftText: 'Uplink Verified',
          tokenAwarded: false,
          totalTokens: fieldTokens
        }
      });
      setFcState('result');
      setSubmissionStatus('submitted');
    }
  }, [tripIdParam, entries, submissionStatus, fcState, fieldTokens]);

  // Handle successful submission navigation timer
  useEffect(() => {
    if (fcState === 'result' && !isStarterTrainingActive) {
      // We don't auto-navigate anymore to give user control over the result view
      // But we might want a "Finish" button on the result card. 
      // For now, let's keep it visible and let them tap something if available.
    }
  }, [fcState, isStarterTrainingActive]);

  const [completeRecord, setCompleteRecord] = useState<any>(() => {
    if (restoredState) {
      return {
        tripId: restoredState.missionId,
        title: restoredState.missionTitle,
        awardedXP: restoredState.awardedXP,
        baseXP: restoredState.awardedXP,
        note: restoredState.fieldLogMessage,
        photo: restoredState.evidenceSubmitted,
        proofType: ['photo'],
        completedAt: restoredState.completedAt,
        syncStatus: restoredState.syncStatus,
        scoringData: {
          scoring: { totalPoints: restoredState.awardedXP },
          ftBonus: 0,
          ftText: restoredState.syncStatus === 'synced' ? 'Synchronized' : 'Uplink Pending...',
          tokenAwarded: restoredState.tokenAwarded || false,
          totalTokens: restoredState.totalTokens || 0
        }
      };
    }
    return null;
  });

  // Handle fallback redirect for already submitted missions
  useEffect(() => {
    // Recovery redirect logic
    if ((!currentTrip && !completeRecord && (fcState as string) !== 'result') || (isUnavailable && !completeRecord && (fcState as string) !== 'result' && submissionStatus !== 'submitted')) {
      const timer = setTimeout(() => {
        // Only redirect if still true after 0.5s (proactive recovery)
        if ((!currentTrip && !completeRecord && (fcState as string) !== 'result') || (isUnavailable && !completeRecord && (fcState as string) !== 'result' && submissionStatus !== 'submitted')) {
          navigate('/deck');
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentTrip, completeRecord, fcState, completedChallengeIds, submittedPendingChallengeIds, navigate, submissionStatus, isUnavailable]);

  // Reset scroll on step changes
  useEffect(() => {
    // Only reset if we're moving to a distinct new content phase
    if (fcState === 'noting' || fcState === 'reviewing' || fcState === 'submitting' || fcState === 'needs_more_proof') {
      const resetScroll = () => {
        window.scrollTo({ top: 0, behavior: 'instant' as any });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      };
      resetScroll();
      requestAnimationFrame(resetScroll);
    }
  }, [fcState]);
  
  // Track localStorage updates whenever completeRecord changes
  useEffect(() => {
    if (completeRecord) {
      try {
        const resultPayload = {
          missionId: completeRecord.tripId,
          missionTitle: completeRecord.title,
          awardedXP: completeRecord.awardedXP,
          tokenAwarded: !!completeRecord.scoringData?.tokenAwarded,
          completedAt: completeRecord.completedAt || new Date().toISOString(),
          syncStatus: completeRecord.syncStatus,
          evidenceSubmitted: completeRecord.photo,
          fieldLogMessage: completeRecord.note || ''
        };
        localStorage.setItem('fieldtrip_last_completed_result', JSON.stringify(resultPayload));
      } catch (e) {
        console.error(e);
      }
    }
  }, [completeRecord]);

  // Handle route and parameter changes cleanly
  useEffect(() => {
    if (tripIdParam) {
      if (completeRecord && completeRecord.tripId !== tripIdParam) {
        setCompleteRecord(null);
        setFcState('capture');
        setSubmissionStatus('ready');
        setCaptureData(null);
        setFcData(prev => ({ ...prev, note: '' }));
      } else if (!completeRecord) {
        try {
          const stored = localStorage.getItem('fieldtrip_last_completed_result');
          if (stored) {
            const parsed = JSON.parse(stored);
            const timeDiff = Date.now() - new Date(parsed.completedAt).getTime();
            if (timeDiff < 10 * 60 * 1000 && parsed.missionId === tripIdParam) {
              setCompleteRecord({
                tripId: parsed.missionId,
                title: parsed.missionTitle,
                awardedXP: parsed.awardedXP,
                baseXP: parsed.awardedXP,
                note: parsed.fieldLogMessage,
                photo: parsed.evidenceSubmitted,
                proofType: ['photo'],
                completedAt: parsed.completedAt,
                syncStatus: parsed.syncStatus,
                scoringData: {
                  scoring: { totalPoints: parsed.awardedXP },
                  ftBonus: 0,
                  ftText: parsed.syncStatus === 'synced' ? 'Synchronized' : 'Uplink Pending...',
                  tokenAwarded: parsed.tokenAwarded,
                  totalTokens: (fieldTokens || 0)
                }
              });
              setFcState('result');
              setSubmissionStatus('submitted');
            }
          }
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [tripIdParam, fieldTokens]);

  // Sync if data arrives or context changes
  useEffect(() => {
    // DO NOT SYNC if already submitted - we want to keep the result screen
    if (submissionStatus === 'submitted') return;

    // Only update currentTrip if we don't have one, or if the ID in the URL explicitly changes
    const target = resolveMissionById(tripIdParam);
    
    // If we have a target from URL or activeTrip, and it's different from current, update it
    if (target && (!currentTrip || currentTrip.id !== target.id)) {
      if (fcState !== 'submitting') {
        setCurrentTrip(target);
      }
    }
  }, [tripIdParam, trips, activeTrip, submissionStatus, fcState, entries]);
  const [captureData, setCaptureData] = useState<{
    originalImageUrl: string;
    filteredImageUrl: string;
    metadata: any;
    trustLevel: string;
    filterId: string;
    reviewStatus: string;
    message?: string;
    aiAnalysisResult?: any;
    proofCheckResult?: any;
    proofId?: string;
  } | null>(null);
  const [scoringData, setScoringData] = useState<{
    scoring?: any;
    ftBonus?: number;
    ftText?: string;
    newRewards?: { stickers: string[]; badges: string[] };
  } | null>(null);
  const [developingCaption, setDevelopingCaption] = useState('Developing...');
  const shouldReduceMotion = useReducedMotion();
  const [findingType, setFindingType] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<'Standard' | 'Advanced' | 'Certified'>('Advanced');
  const [catalyst, setCatalyst] = useState<any>(null);
  const [bonusProofFulfilled, setBonusProofFulfilled] = useState(false);

  const [aiAnalysisResult, setAiAnalysisResult] = useState<any>(null);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);

  // Trigger real AI Image analysis upon capture/upload
  useEffect(() => {
    if (!captureData || !currentTrip) {
      setAiAnalysisResult(null);
      setIsAiAnalyzing(false);
      return;
    }

    // CLIENT IDEMPOTENCY GUARD: Prevent repeated calls on component re-render, routes, or reload.
    const existingResult = captureData.aiAnalysisResult || captureData.proofCheckResult;
    if (existingResult && existingResult.status && existingResult.status !== 'idle' && existingResult.status !== 'analyzing') {
      setAiAnalysisResult(existingResult);
      setIsAiAnalyzing(false);
      return;
    }

    let active = true;
    const runAnalysis = async () => {
      setIsAiAnalyzing(true);
      try {
        const base64Img = captureData.originalImageUrl || captureData.filteredImageUrl || '';
        if (!base64Img) return;

        const reqSubjects = currentTrip.proofRequirements?.requiredSubjects || 
                             currentTrip.requiredProof || 
                             [];

        const detectionResult = await analyzeSubmissionImage(
          base64Img,
          currentTrip.title || '',
          currentTrip.description || currentTrip.theAsk || '',
          reqSubjects,
          captureData.proofId,
          currentTrip.id,
          currentTrip.deckId
        );

        if (active) {
          setAiAnalysisResult(detectionResult);
          
          // Also set it in capture-data state in order to persist with submission and avoid double-scan on refresh
          setCaptureData(prev => prev ? {
            ...prev,
            aiAnalysisResult: detectionResult,
            proofCheckResult: detectionResult
          } : null);
        }
      } catch (err) {
        console.error('[Capture] AI Image Analysis failed:', err);
        if (active) {
          setAiAnalysisResult({
            status: 'error',
            requiredSubject: currentTrip.title || 'Target Match',
            detectedSubject: false,
            confidence: 0,
            detectedItems: [],
            missingItems: ['SCAN_FAILED'],
            displayTitle: 'Scan Failed',
            displayDetail: 'Optical scanning protocol encountered an access error.',
            missionMatchScore: 0
          });
        }
      } finally {
        if (active) {
          setIsAiAnalyzing(false);
        }
      }
    };

    runAnalysis();

    return () => {
      active = false;
    };
  }, [captureData, currentTrip?.id]);

  useEffect(() => {
    let active = true;
    const fetchCatalyst = async () => {
      if (!currentTrip) return;
      try {
        const seasonId = activeSeason?.id || 'dev-season-2026';
        const weekNum = currentTrip.weekNumber || currentWeekNumber || 1;
        const cat = await getCatalystForWeek(seasonId, weekNum);
        if (active) {
          setCatalyst(cat);
        }
      } catch (err) {
        console.warn("[Capture] fetchCatalyst error:", err);
      }
    };
    fetchCatalyst();
    return () => { active = false; };
  }, [activeSeason?.id, currentTrip?.id, currentWeekNumber]);

  useEffect(() => {
    setBonusProofFulfilled(false);
  }, [currentTrip?.id]);


  // Fast Find state fields
  const [fastFindStarted, setFastFindStarted] = useState(false);
  const [fastFindStartedAt, setFastFindStartedAt] = useState<number | null>(null);
  const [fastFindExpiresAt, setFastFindExpiresAt] = useState<number | null>(null);
  const [fastFindExpired, setFastFindExpired] = useState(false);
  const [lockedSignalIntensity, setLockedSignalIntensity] = useState<'Standard' | 'Advanced' | 'Certified' | null>(null);
  const [lockedBasePoints, setLockedBasePoints] = useState<number | null>(null);
  const [fastFindTimeRemaining, setFastFindTimeRemaining] = useState<number>(300);

  const isFastFind = !!(currentTrip && (currentTrip.mode === 'fastFind' || currentTrip.type === 'fastFind'));

  // Reset Fast Find state on active trip change
  useEffect(() => {
    setFastFindStarted(false);
    setFastFindStartedAt(null);
    setFastFindExpiresAt(null);
    setFastFindExpired(false);
    setLockedSignalIntensity(null);
    setLockedBasePoints(null);
    if (currentTrip) {
      const limit = currentTrip.timeLimitSeconds || 300;
      setFastFindTimeRemaining(limit);
    }
  }, [currentTrip?.id]);

  // Handle countdown interval safely
  useEffect(() => {
    if (!fastFindStarted || !isFastFind || fastFindExpired) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const expires = fastFindExpiresAt || 0;
      const remainingMs = expires - now;
      const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
      
      setFastFindTimeRemaining(remainingSeconds);

      if (remainingSeconds <= 0) {
        setFastFindExpired(true);
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [fastFindStarted, isFastFind, fastFindExpiresAt, fastFindExpired]);

  const handleStartFastFind = () => {
    if (!isFastFind || fastFindStarted) return;
    const now = Date.now();
    const limit = (currentTrip?.timeLimitSeconds || 300) * 1000;
    const expires = now + limit;
    
    setFastFindStarted(true);
    setFastFindStartedAt(now);
    setFastFindExpiresAt(expires);
    setFastFindExpired(false);
    setLockedSignalIntensity(selectedLevel);
    
    const base = currentTrip?.baseXP || currentTrip?.basePoints || 100;
    setLockedBasePoints(base);
    setFastFindTimeRemaining(Math.ceil(limit / 1000));
  };

  const [hintUsed, setHintUsed] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  
  const [localPhotoCaptured, setLocalPhotoCaptured] = useState(false);
  const [localLocationChecked, setLocalLocationChecked] = useState(false);

  useEffect(() => {
    if (currentTrip) {
      const locationRequired = currentTrip.proofRequirements?.requireLocation || 
                               currentTrip.proofNeeded?.toLowerCase().includes('location') || 
                               (currentTrip.tags || []).includes('location') || 
                               (currentTrip.proofType || []).includes('location');
      if (locationRequired) {
        setLocalLocationChecked(true);
      }
    }
  }, [currentTrip]);

  const isPlain = frankieMode;
  const isReceipts = profile?.receiptsMode;

  const isBaja = skin.id === 'baja-bratz';
  const isDiamond = skin.id === 'slippery-diamond';
  const isHeat = skin.id === 'heatwave';

  const missionProgress = (profile?.tripProgress?.[currentTrip?.id] || {}) as any;
  const hintWasUsedInitial = !!missionProgress.hintUsed;
  
  useEffect(() => {
    if (hintWasUsedInitial && !hintUsed) {
      setHintUsed(true);
    }
  }, [hintWasUsedInitial]);

  const fPref = { frankieMode };

  const isPhotoFulfilled = localPhotoCaptured || !!missionProgress.photo;
  const isNoteFulfilled = fcData.note.trim().length >= 10 || !!missionProgress.field_note;
  const isLocationFulfilled = localLocationChecked || !!missionProgress.location;

  const evidenceRequirements = [
    { key: 'photo', label: getFrankieEvidenceLabel(currentTrip, 'photo', fPref), fulfilled: isPhotoFulfilled, required: (currentTrip?.proofType || currentTrip?.requiredProof || []).includes('photo') },
    { key: 'field_note', label: getFrankieEvidenceLabel(currentTrip, 'field_note', fPref), fulfilled: isNoteFulfilled, required: (currentTrip?.proofType || currentTrip?.requiredProof || []).includes('note') },
    { key: 'location', label: getFrankieEvidenceLabel(currentTrip, 'location', fPref), fulfilled: isLocationFulfilled, required: (currentTrip?.proofRequirements?.requireLocation || currentTrip?.proofNeeded?.toLowerCase().includes('location') || (currentTrip?.tags || []).includes('location') || (currentTrip?.proofType || []).includes('location')) },
  ].filter(req => req.required);

  // --- POINT SELECTION SYSTEM GATING ---
  // (isStarterTrainingActive moved higher up)

  const isRequiredProofCompleted = evidenceRequirements
    .filter(r => r.key !== 'field_note')
    .every(r => r.fulfilled);

  const isFieldNoteEntered = fcData.note.trim().length >= 10;
  const supportsBonusProof = !!currentTrip?.distanceBonus?.eligible;
  const isBonusProofCompleted = bonusProofFulfilled;

  const getLockReason = (level: 'Standard' | 'Advanced' | 'Certified') => {
    if (isStarterTrainingActive) {
      if (level === 'Advanced' || level === 'Certified') {
        return "Locked during Training.";
      }
    } else {
      if (level === 'Advanced') {
        if (!isFieldNoteEntered) {
          return "Add a field note to unlock.";
        }
      }
      if (level === 'Certified') {
        if (hintUsed) {
          return "Locked: Hint used.";
        }
        if (!isFieldNoteEntered) {
          return "Add a field note to unlock.";
        }
        if (supportsBonusProof && !isBonusProofCompleted) {
          return "Bonus proof required.";
        }
      }
    }
    return null;
  };

  // Automatically adjust selectedLevel if it becomes locked based on evidence
  useEffect(() => {
    if (isStarterTrainingActive) {
      if (selectedLevel !== 'Standard') {
        setSelectedLevel('Standard');
      }
      return;
    }

    // After onboarding is complete:
    if (selectedLevel === 'Certified') {
      const isCertifiedLocked = !isRequiredProofCompleted || !isFieldNoteEntered || (supportsBonusProof && !isBonusProofCompleted) || hintUsed;
      if (isCertifiedLocked) {
        // Fallback to Advanced if possible, else Standard
        const isAdvancedLocked = !isRequiredProofCompleted || !isFieldNoteEntered;
        if (isAdvancedLocked) {
          setSelectedLevel('Standard');
        } else {
          setSelectedLevel('Advanced');
        }
      }
    } else if (selectedLevel === 'Advanced') {
      const isAdvancedLocked = !isRequiredProofCompleted || !isFieldNoteEntered;
      if (isAdvancedLocked) {
        setSelectedLevel('Standard');
      }
    }
  }, [
    isStarterTrainingActive,
    isRequiredProofCompleted,
    isFieldNoteEntered,
    supportsBonusProof,
    isBonusProofCompleted,
    hintUsed,
    selectedLevel
  ]);
  
  const isMissionReady = currentTrip && evidenceRequirements.every(r => r.fulfilled);

  const handleStartCapture = async () => {
    await proceedToCapture();
  };

  const proceedToCapture = async () => {
    // 1. Camera is contextually requested when starting capture if not already ready
    if (!cameraPermissionReady) {
      await requestCamera();
    }

    // 2. Location is only requested contextually if mission requires it
    const locationRequired = currentTrip.proofRequirements?.requireLocation || 
                           currentTrip.proofNeeded?.toLowerCase().includes('location') || 
                           (currentTrip.tags || []).includes('location') || 
                           (currentTrip.proofType || []).includes('location');
    
    if (locationRequired && !locationPermissionReady) {
      await requestLocation();
    }

    setFcState('capture');
  };

  const onCapture = (data: any) => {
    const proofId = data?.proofId || `proof_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const updatedData = { ...data, proofId };
    setCaptureData(updatedData);
    setLocalPhotoCaptured(true);
    setFcData(prev => ({
      ...prev,
      photoCaptured: true,
      photoUrl: data.filteredImageUrl,
      trustLevel: data.trustLevel
    }));
    setFcState('previewing_polaroid'); // Show instant clear preview in frame
    
    // Track photo progress
    if (currentTrip?.id && currentTrip.id !== 'unknown') {
      updateTripProgress(currentTrip.id, { photo: true }).catch(err => {
        console.warn("Firestore updateTripProgress failed (continuing on client):", err);
      });
    }
  };

  useEffect(() => {
    if (fcState === 'previewing_polaroid') {
      const timer = setTimeout(() => {
        setFcState('developing_polaroid');
      }, 1500); 
      return () => clearTimeout(timer);
    }
    if (fcState === 'developing_polaroid') {
      const timer = setTimeout(() => {
        setFcState('reviewing');
      }, 4500); 
      return () => clearTimeout(timer);
    }
  }, [fcState]);

  useEffect(() => {
    // Sync note progress
    if (currentTrip?.id && currentTrip.id !== 'unknown') {
      if (fcData.note.length >= 10) {
        updateTripProgress(currentTrip.id, { field_note: true }).catch(err => {
          console.warn("Firestore updateTripProgress for note failed:", err);
        });
      } else {
        updateTripProgress(currentTrip.id, { field_note: false }).catch(err => {
          console.warn("Firestore updateTripProgress for note failed:", err);
        });
      }
    }
  }, [fcData.note, currentTrip?.id]);

  useEffect(() => {
    // Initial progress sync for location and existing state
    if (currentTrip?.id && currentTrip.id !== 'unknown') {
      const updates: any = {};
      
      // If location is required, mark it as checked when they arrive at the capture screen
      if (currentTrip.proofNeeded?.toLowerCase().includes('location') || (currentTrip.tags || []).includes('location') || currentTrip.proofRequirements?.requireLocation || (currentTrip.proofType || []).includes('location')) {
        updates.location = true;
      }
      
      if (Object.keys(updates).length > 0) {
        updateTripProgress(currentTrip.id, updates).catch(err => {
          console.warn("Firestore init updateTripProgress failed:", err);
        });
      }
    }
  }, [currentTrip?.id, currentTrip?.proofNeeded, currentTrip?.tags, currentTrip?.proofRequirements]);

  useEffect(() => {
    if (fcState === 'detecting') {
      const timer1 = setTimeout(() => setDevelopingCaption('Ready.'), 2200);
      const timer2 = setTimeout(() => setFcState('reviewing'), 3000);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [fcState]);

  const handleCaptureClick = () => {
    if (isUploading) return;
    setIsUploading(true);
    
    // Trigger capture from viewfinder
    setTimeout(() => {
      if (cameraRef.current) {
        cameraRef.current.capture();
      } else {
        // Fallback for demo
        onCapture({
          originalImageUrl: currentTrip.image,
          filteredImageUrl: currentTrip.image,
          metadata: { source: 'camera', metadataStatus: 'verified' },
          trustLevel: 'live',
          filterId: 'original',
          reviewStatus: 'approved'
        });
      }
      setIsUploading(false);
    }, 500);
  };

  const handleSubmit = async (bypassReview = false) => {
    if (!user || !profile || !captureData || isUploading || submitLockRef.current) return;
    
    // We do not auto-advance here to avoid navigating away from the MISSION SECURED screen prematurely.
    // Instead, we will advance the onboarding step when they hit "BACK TO DECK".
    if (!currentTrip) {
      setSubmissionStatus('retry');
      return;
    }

    if (isFastFind) {
      if (!fastFindStarted || !fastFindStartedAt || !fastFindExpiresAt) {
        alert("Submission Blocked: Fast Find was not properly started.");
        return;
      }
      if (Date.now() > fastFindExpiresAt) {
        setFastFindExpired(true);
        alert("Submission Blocked: This Fast Find attempt has expired.");
        return;
      }
    }

    submitLockRef.current = true;
    
    // 0. Calculate Rewards
    const isFirstTime = !completedChallengeIds.has(currentTrip.id);
    const draftForScoring = {
      id: 'draft',
      proofImage: captureData?.filteredImageUrl || '',
      imageUrl: captureData?.filteredImageUrl || '',
      photoUrl: captureData?.filteredImageUrl || '',
      note: fcData.note || '',
      fieldNote: fcData.note || ''
    } as any;

    const scoringResult = calculateSubmissionPoints(
      draftForScoring,
      currentTrip,
      {
        isFirstSubmission: (profile?.approvedEntriesCount || 0) === 0,
        daysLate: 0,
        hintUsed: hintUsed,
        weekNumber: currentTrip.weekNumber || currentWeekNumber || 1,
        catalyst: catalyst || undefined
      }
    );

    let awardedXP = scoringResult.totalPoints;
    if (isRetry) awardedXP = Math.round(awardedXP * 0.5);
    
    const awardedTokenCount = isFirstTime ? 1 : 0;

    // 1. OPTIMISTIC UPDATE IMMEDIATELY
    registerPendingSubmissionLocally(awardedXP, currentTrip.id, {
      title: currentTrip.title,
      photo: captureData.filteredImageUrl,
      awardedXP: awardedXP
    });

    // 2. Prepare Local Result Record
    const localResult = {
      tripId: currentTrip.id,
      title: currentTrip.title,
      awardedXP: awardedXP,
      baseXP: awardedXP,
      note: fcData.note,
      photo: captureData.filteredImageUrl,
      proofType: currentTrip.proofType || currentTrip.requiredProof || ['photo'],
      image: currentTrip.image,
      completedAt: new Date().toISOString(),
      syncStatus: 'pending' as 'pending' | 'synced' | 'sync_failed',
      scoringData: {
        scoring: { totalPoints: awardedXP },
        ftBonus: 0,
        ftText: 'Uplink Pending...',
        tokenAwarded: isFirstTime,
        totalTokens: (fieldTokens || 0) + awardedTokenCount
      }
    };
    setCompleteRecord(localResult);

    // Enter pending step immediately so user sees "TRANSMITTING"
    setFcState('submitting');
    setSubmissionStatus('saving');
    setIsUploading(true);

    // 4. Background Sync Process
    const runSync = async () => {
      try {
        const proofId = `proof_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log(`[ProofSubmit] proofId created: ${proofId}`);
        console.log(`[ProofSubmit] local preview exists: ${!!(captureData.originalImageUrl || captureData.filteredImageUrl)}`);

        // Step 1: Upload images first to satisfy Requirement 2
        const now = Date.now();
        const filename = `${proofId}.jpg`;
        const storagePath = `proofUploads/${user.uid}/${currentTrip.id}/${filename}`;
        
        console.log(`[ProofSubmit] upload started: ${filename}`);
        console.log(`[ProofSubmit] storagePath: ${storagePath}`);
        
        const [origRes, filtRes] = await Promise.all([
          uploadBase64Image(user.uid, 'proofs/original', `orig_${proofId}.jpg`, captureData.originalImageUrl),
          uploadBase64Image(user.uid, 'proofUploads', filename, captureData.filteredImageUrl)
        ]);
        
        const originalUrl = origRes.url;
        const filteredUrl = filtRes.url;
        const filteredStoragePath = filtRes.path;
        
        console.log(`[ProofSubmit] upload complete`);
        console.log(`[ProofSubmit] downloadURL received: ${filteredUrl.substring(0, 50)}...`);

        // Step 2: Save the permanent URL and path into the proof document
        console.log(`[ProofSubmit] proof document saved with photoUrl`);
        const result = await addEntry({
          uid: user.uid,
          missionId: currentTrip.id,
          challengeId: currentTrip.id,
          tripId: currentTrip.id,
          photoUrl: filteredUrl,      // Canonical field
          imageUrl: filteredUrl,      // Canonical field
          mediaUrl: filteredUrl,      // Fallback
          photoStoragePath: filteredStoragePath,
          imageStoragePath: filteredStoragePath,
          storagePath: filteredStoragePath,
          proofImage: filteredUrl,      // Legacy
          originalImageUrl: originalUrl,
          filteredImageUrl: filteredUrl,
          fieldNote: fcData.note || 'A successful field trip entry.',
          findingType,
          selectedCategory: selectedLevel,
          selectedLevel: selectedLevel,
          crewId: profile.crewId || undefined,
          userId: user.uid,
          uploadSource: captureData.metadata.source || 'camera',
          photoTakenAt: captureData.metadata.photoTakenAt || null,
          latitude: captureData.metadata.latitude !== undefined ? captureData.metadata.latitude : null,
          longitude: captureData.metadata.longitude !== undefined ? captureData.metadata.longitude : null,
          submittedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          metadataStatus: captureData.metadata.metadataStatus || 'unverified',
          captureTrustLevel: captureData.trustLevel as any,
          filterUsed: captureData.filterId || 'original',
          filterIntensity: 1.0,
          reviewStatus: captureData.reviewStatus as any,
          hintUsed: hintUsed,
          proofChallengeCode: receiptChallenge?.code,
          proofChallengeType: receiptChallenge?.type,
          proofChallengeText: receiptChallenge?.text,
          proofChallengeInstructions: receiptChallenge?.instructions,
          isRetry: isRetry,
          retryPointMultiplier: isRetry ? 0.5 : undefined,
          originalEntryId: originalEntryId || null,
          existingEntryId: entryIdParam || null,
          fastFindAttempt: isFastFind ? {
            mode: "fastFind",
            selectedIntensity: lockedSignalIntensity || 'Standard',
            lockedBasePoints: lockedBasePoints || currentTrip.baseXP || currentTrip.basePoints || 100,
            startedAt: fastFindStartedAt ? new Date(fastFindStartedAt).toISOString() : new Date().toISOString(),
            expiresAt: fastFindExpiresAt ? new Date(fastFindExpiresAt).toISOString() : new Date().toISOString(),
            submittedAt: new Date().toISOString(),
            completedBeforeExpiration: true,
            expired: false,
            hintUsed: false
          } : undefined,
          aiAnalysisResult: aiAnalysisResult,
          proofCheckResult: aiAnalysisResult
        } as any);

        console.log(`[ProofSubmit] AI scan started`);
        // AI Scan happens inside addEntry via evaluateProof, but we already have its results from step 320-ish in addEntry context if pre-calculated
        // Or it will run now. If it fails, addEntry still returns the result because it's wrapped in try/catch in gameService.
        console.log(`[ProofSubmit] AI scan result or fallback: ${result.review?.status || 'Manual Review Fallback'}`);
        
        if (!bypassReview && result.review && (result.review.status === 'needs_more_proof' || result.review.status === 'rejected')) {
          setFcState('needs_more_proof');
          setIsUploading(false);
          submitLockRef.current = false;
          setSubmissionStatus('ready');
          return;
        }

        const finalXP = (result.scoring?.totalPoints || 0) + (result.ftBonus || 0);

        setCompleteRecord({
          ...localResult,
          photo: filteredUrl,
          awardedXP: finalXP || awardedXP,
          syncStatus: 'synced',
          scoringData: {
            scoring: result.scoring,
            ftBonus: result.ftBonus,
            ftText: result.ftText,
            newRewards: result.newRewards,
            tokenAwarded: isFirstTime,
            totalTokens: (fieldTokens || 0) + awardedTokenCount
          }
        });

        setScoringData({
          scoring: result.scoring,
          ftBonus: result.ftBonus,
          ftText: result.ftText,
          newRewards: result.newRewards,
          tokenAwarded: isFirstTime,
          totalTokens: (fieldTokens || 0) + awardedTokenCount
        } as any);

        setFcState('result'); // MOVE TO SUCCESS STEP
        setSubmissionStatus('submitted');
        if (currentTrip?.id) {
          localStorage.removeItem(`ft_challenge_${currentTrip.id}`);
        }
        if (incomingFieldCheck) resolveIncomingFieldCheck();
        
      } catch (error: any) {
        console.error("[ProofSubmit] FATAL Error:", error);
        setFcState('result');
        setSubmissionStatus('submitted');
        setCompleteRecord((prev: any) => ({
          ...prev,
          syncStatus: 'sync_failed',
          syncError: error.message
        }));
      } finally {
        setIsUploading(false);
        submitLockRef.current = false;
        // Ensure stale mission state is purged from storage immediately after submission attempt
        localStorage.removeItem('fieldtrip_active_trip');
        localStorage.removeItem('current_mission_id');
        localStorage.removeItem('resume_mission_id');
        localStorage.removeItem('activeTrip');
        localStorage.removeItem('currentMission');
        localStorage.removeItem('resumeMission');
        sessionStorage.removeItem('activeTrip');
      }
    };

    runSync();

  };

  const handleRetrySync = async () => {
    if (submissionStatus === 'syncing' || !completeRecord) return;
    handleSubmit(true); // Bypass review on retry
  };


  // Show recovery if mission is missing and we aren't in a success/pending state
  if (!currentTrip && !completeRecord && !loading && fcState !== 'result' && submissionStatus !== 'submitted' && fcState !== 'submitting' && fcState !== 'detecting' && fcState !== 'needs_more_proof') {
    console.error('[Capture] Mission Recovery Triggered:', { tripIdParam, activeTripId: activeTrip?.id });
    return (
      <RecoveryScreen 
        message={`Mission not found: "${tripIdParam || 'Unspecified ID'}". The signal for this sector may have been archived or re-assigned.`} 
        onAction={() => console.log('Mission reported missing:', tripIdParam)}
      />
    );
  }

  // Debug logging for state transitions
  useEffect(() => {
    console.log("[Capture State]", {
      tripIdParam,
      fcState,
      submissionStatus,
      missionFound: !!currentTrip,
      activeTripId: activeTrip?.id,
      completeRecordId: completeRecord?.tripId,
      submitting: isUploading,
      hasPhoto: !!captureData || !!completeRecord?.photo,
      hasNote: !!fcData.note || !!completeRecord?.note
    });
  }, [tripIdParam, fcState, submissionStatus, currentTrip, activeTrip, completeRecord, isUploading, captureData, fcData.note]);

  return (
    <div className={cn(
      "page-scroll flex flex-col font-sans relative ft-paper-texture",
      isBaja ? "bg-baja-sand text-baja-pink" : 
      isDiamond ? "bg-black text-white" :
      isHeat ? "bg-heat-yellow text-white" :
      "bg-[#FAF8F5] text-on-surface"
    )}>
      {/* Removed: Notebook Rings Decoration to avoid confusion with horizontal guide pills */}
      <div className="w-full flex justify-center py-2 relative z-20 select-none pointer-events-none mb-2" />
      
      {/* Main 3-Step Guided Container */}
      <div className="flex-grow flex flex-col items-center justify-start p-4 sm:p-6 md:p-8 pt-4 max-w-md w-full mx-auto relative z-10">

      <AnimatePresence mode="wait">
        {currentTrip && !completeRecord && submissionStatus !== 'submitted' && (fcState !== 'result') && (
          <motion.div
            key="fc-flow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full"
          >
            {isRepairMode && repairFeedback && fcState === 'brief' && (
              <div className="mb-6 bg-brand-orange/10 border-l-4 border-brand-orange p-5 rounded-2xl text-left space-y-1.5 shadow-sm">
                <p className="font-mono text-[9px] font-black uppercase tracking-wider text-brand-orange flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" /> BUREAU_REPAIR_FEEDBACK
                </p>
                <p className="text-xs font-serif italic text-on-surface leading-relaxed">
                  "{repairFeedback}"
                </p>
              </div>
            )}

            <FieldClipboard
              mission={currentTrip}
              onStartCapture={proceedToCapture}
              onPhotoConfirm={onCapture}
              onSubmit={() => handleSubmit()}
              state={fcState}
              setState={setFcState}
              data={fcData}
              setData={setFcData}
              aiAnalysisResult={aiAnalysisResult}
              isAiAnalyzing={isAiAnalyzing}
              catalyst={catalyst}
              receiptChallenge={receiptChallenge}
              repairFeedback={repairFeedback}
            >
              {fcState === 'capture' && (
                <div className="w-full flex flex-col space-y-4">
                  {/* Fast Find countdown indicator */}
                  {isFastFind && fastFindStarted && (
                    <div className="w-full bg-on-surface text-paper border-2 border-brand-orange p-3 flex items-center justify-between gap-3 shadow-[4px_4px_0px_black] font-mono rounded-xl">
                      <div className="flex items-center gap-2">
                        <div className="w-2 rounded-full h-2 bg-brand-orange animate-ping" />
                        <span className="text-[9px] uppercase font-black text-brand-orange">Fast Find Timer:</span>
                      </div>
                      <div className="text-sm font-black text-white bg-black px-2 py-0.5 rounded tracking-widest font-mono">
                        {Math.floor(fastFindTimeRemaining / 60).toString().padStart(2, '0')}:
                        {(fastFindTimeRemaining % 60).toString().padStart(2, '0')}
                      </div>
                    </div>
                  )}

                  <div id="viewfinder-area" className="relative w-full aspect-[3/4] overflow-hidden group transition-all border-4 border-on-surface bg-black rounded-xl">
                      <Suspense fallback={
                        <div className="absolute inset-0 flex items-center justify-center bg-black">
                          <Loader2 className="w-10 h-10 text-brand-orange animate-spin" />
                        </div>
                      }>
                        <ViewfinderCamera 
                          challenge={currentTrip}
                          onCapture={onCapture}
                          ref={cameraRef}
                        />
                      </Suspense>
                  </div>
                </div>
              )}
            </FieldClipboard>
          </motion.div>
        )}

        {fcState === 'result' && (completeRecord || captureData) && (
          <motion.div
            key="step-success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm mx-auto"
          >
            <MissionResultCard 
              trip={currentTrip!}
              scoringData={scoringData || completeRecord?.scoringData || {}}
              evidence={{
                photo: (completeRecord?.photo || captureData?.filteredImageUrl || ''),
                note: (completeRecord?.note || fcData.note || '')
              }}
              showMathWizard={true}
            />
          </motion.div>
        )}
      </AnimatePresence>
      </div>

      {import.meta.env.DEV && (
        <div className="fixed bottom-2 left-2 z-[250] pointer-events-none select-none">
          {!showDebug ? (
            <button 
              onClick={() => setShowDebug(true)}
              className="bg-black/95 text-brand-lime hover:bg-brand-orange font-mono text-[8px] px-2 py-1 border border-brand-lime shadow-md uppercase font-black cursor-pointer rounded-sm pointer-events-auto"
              title="Open QA Console"
            >
              [QA DBG]
            </button>
          ) : (
            <div className="bg-black/95 text-brand-lime font-mono text-[8.5px] p-2.5 border border-brand-lime space-y-1 w-48 shadow-2xl relative rounded-sm pointer-events-auto">
              <button 
                onClick={() => setShowDebug(false)}
                className="absolute top-1 right-2 text-white hover:text-brand-orange text-[9px] font-bold cursor-pointer"
              >
                [X]
              </button>
              <p className="text-[9px] font-black uppercase text-white tracking-widest border-b border-white/20 pb-0.5 mb-1 font-sans">QA_CONSOLE</p>
              <p>screenMode: {(() => {
                if (completeRecord) {
                  if (completeRecord.syncStatus === 'sync_failed') return 'error';
                  return 'result';
                }
                if (isUploading) return 'transmitting';
                if (currentTrip) return 'capture';
                return 'noMission';
              })()}</p>
              <p>completedResult exists: {completeRecord ? 'yes' : 'no'}</p>
              <p>completedResult missionId: {completeRecord?.tripId || 'none'}</p>
              <p>awardedXP: {completeRecord?.awardedXP || 0}</p>
              <p>syncStatus: {completeRecord?.syncStatus || 'none'}</p>
              <p>routeId: {tripIdParam || 'none'}</p>
              <p>currentTrip id: {currentTrip?.id || 'none'}</p>
              <p>submitting: {isUploading ? 'yes' : 'no'}</p>
              <p>repairMode: {isRepairMode ? 'yes' : 'no'}</p>
              <p>repairEntry: {repairEntry?.id || 'none'}</p>
              <p>repairImg: {(repairEntry?.photoUrl || repairEntry?.imageUrl || repairEntry?.proofImage) ? 'EXISTS' : 'MISSING'}</p>
              <p>repairSrcRow: {(() => {
                if (!repairEntry) return 'none';
                if (repairEntry.photoUrl) return 'photoUrl';
                if (repairEntry.imageUrl) return 'imageUrl';
                if (repairEntry.proofImage) return 'proofImage';
                return 'NOT_FOUND';
              })()}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
