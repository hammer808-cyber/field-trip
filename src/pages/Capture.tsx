import { useState, useRef, Suspense, lazy, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { MOCK_TRIPS } from '../constants';
import { Camera, X, Check, Upload, Lock, Calendar, MessageSquare, Zap, Sparkles, ShieldCheck, AlertCircle, MapPin, RefreshCw, ChevronLeft } from 'lucide-react';
import { Sticker, Card as UICard } from '../components/UI';
import { 
  getFrankieTitle,
  getFrankieDescription,
  getFrankieFieldNotePrompt,
  getFrankieEvidenceLabel
} from '../logic/frankieModeLogic';
import { useTheme } from '../context/ThemeContext';
import { cn, safeToDate } from '../lib/utils';
import { Hibiscus, ChromeStar, GlossOverlay } from '../components/BajaBratzAssets';
import { PalmTree, BeachTag as HeatBeachTag, GlossOverlay as DiamondGloss } from '../components/SkinAssets';
import type { ViewfinderCameraHandle } from '../components/ViewfinderCamera';
import { evaluateProof } from '../services/proofService';
import { uploadBase64Image } from '../services/storageService';
import { getGlobalConfig } from '../services/configService';

// Heavy component lazy load
const ViewfinderCamera = lazy(() => import('../components/ViewfinderCamera'));

import { ProofCorrection } from '../components/ProofCorrection';
import { MissionResultCard } from '../components/MissionResultCard';

export default function CapturePage() {
  const [params] = useSearchParams();
  const tripIdParam = params.get('id');
  const navigate = useNavigate();
  const submitLockRef = useRef(false);
  const { 
    addEntry, 
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
    grantPointsLocally,
    fieldType,
    fieldTokens,
    completedChallengeIds,
    isOnboardingComplete
  } = useApp();
  const cameraRef = useRef<ViewfinderCameraHandle>(null);
  const { skin, frankieMode, fc } = useTheme();

  // Find initial trip: URL param > activeTrip > trips[0]
  const resolveTrip = (id?: string | null) => {
    // 1. Check URL ID in current trips
    if (id && trips.length > 0) {
      const found = trips.find(t => t.id === id);
      if (found) return found;
    }
    
    // 2. Fallback to activeTrip from profile
    if (activeTrip) return activeTrip;

    // 3. Ultimate fallback to first available if trips are loaded
    if (trips.length > 0) {
      const isCompleted = (tid: string) => completedChallengeIds.has(tid.toLowerCase());
      const isOnboardingActive = !isOnboardingComplete;

      // Priority: If onboarding active, pick first incomplete starter
      if (isOnboardingActive) {
        const starterIds = ["starter-1", "starter-2", "starter-3"];
        const starter = trips.find(t => starterIds.includes(t.id.toLowerCase()) && !isCompleted(t.id));
        if (starter) return starter;
      }

      const firstAvailable = trips.find(t => t.status !== 'locked' && !isCompleted(t.id));
      return firstAvailable || trips[0];
    }

    // 4. Fallback for sync lag / mock data
    if (id) {
       const mockFound = (MOCK_TRIPS as any[]).find(t => t.id === id);
       if (mockFound) return mockFound;
    }

    return null;
  };

  const [currentTrip, setCurrentTrip] = useState<any>(resolveTrip(tripIdParam));
  
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

  const [step, setStep] = useState<'viewfinder' | 'developing' | 'review' | 'pending' | 'correction' | 'submitted'>(restoredState ? 'pending' : 'viewfinder');
  const [submissionStatus, setSubmissionStatus] = useState<'ready' | 'saving' | 'syncing' | 'submitted' | 'retry'>(restoredState ? 'submitted' : 'ready');
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
          tokenAwarded: restoredState.tokenAwarded,
          totalTokens: (fieldTokens || 0)
        }
      };
    }
    return null;
  });

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
        setStep('viewfinder');
        setSubmissionStatus('ready');
        setCaptureData(null);
        setNote('');
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
              setStep('pending');
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
    const target = resolveTrip(tripIdParam);
    
    // If we have a target from URL or activeTrip, and it's different from current, update it
    if (target && (!currentTrip || currentTrip.id !== target.id)) {
      if (step !== 'pending') {
        setCurrentTrip(target);
      }
    }
  }, [tripIdParam, trips, activeTrip, submissionStatus, step]);
  const [captureData, setCaptureData] = useState<{
    originalImageUrl: string;
    filteredImageUrl: string;
    metadata: any;
    trustLevel: string;
    filterId: string;
    reviewStatus: string;
    message?: string;
  } | null>(null);
  const [scoringData, setScoringData] = useState<{
    scoring?: any;
    ftBonus?: number;
    ftText?: string;
    newRewards?: { stickers: string[]; badges: string[] };
  } | null>(null);
  const [developingCaption, setDevelopingCaption] = useState('Developing...');
  const shouldReduceMotion = useReducedMotion();
  const [note, setNote] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<'Standard' | 'Advanced' | 'Certified'>('Advanced');
  const [detourCompleted, setDetourCompleted] = useState(false);
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
  const isNoteFulfilled = note.trim().length >= 10 || !!missionProgress.field_note;
  const isLocationFulfilled = localLocationChecked || !!missionProgress.location;

  const evidenceRequirements = [
    { key: 'photo', label: getFrankieEvidenceLabel(currentTrip, 'photo', fPref), fulfilled: isPhotoFulfilled, required: (currentTrip?.proofType || currentTrip?.requiredProof || []).includes('photo') },
    { key: 'field_note', label: getFrankieEvidenceLabel(currentTrip, 'field_note', fPref), fulfilled: isNoteFulfilled, required: (currentTrip?.proofType || currentTrip?.requiredProof || []).includes('note') },
    { key: 'location', label: getFrankieEvidenceLabel(currentTrip, 'location', fPref), fulfilled: isLocationFulfilled, required: (currentTrip?.proofRequirements?.requireLocation || currentTrip?.proofNeeded?.toLowerCase().includes('location') || (currentTrip?.tags || []).includes('location') || (currentTrip?.proofType || []).includes('location')) },
  ].filter(req => req.required);
  
  const isMissionReady = currentTrip && evidenceRequirements.every(r => r.fulfilled);

  const onCapture = (data: any) => {
    setCaptureData(data);
    setLocalPhotoCaptured(true);
    setDevelopingCaption('Developing...');
    setStep('developing');
    
    // Track photo progress
    if (currentTrip?.id && currentTrip.id !== 'unknown') {
      updateTripProgress(currentTrip.id, { photo: true }).catch(err => {
        console.warn("Firestore updateTripProgress failed (continuing on client):", err);
      });
    }
  };

  useEffect(() => {
    // Sync note progress
    if (currentTrip?.id && currentTrip.id !== 'unknown') {
      if (note.length >= 10) {
        updateTripProgress(currentTrip.id, { field_note: true }).catch(err => {
          console.warn("Firestore updateTripProgress for note failed:", err);
        });
      } else {
        updateTripProgress(currentTrip.id, { field_note: false }).catch(err => {
          console.warn("Firestore updateTripProgress for note failed:", err);
        });
      }
    }
  }, [note, currentTrip?.id]);

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
    if (step === 'developing') {
      const timer1 = setTimeout(() => setDevelopingCaption('Ready.'), 2200);
      const timer2 = setTimeout(() => setStep('review'), 3000);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [step]);

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
    if (!currentTrip) {
      setSubmissionStatus('retry');
      return;
    }

    submitLockRef.current = true;
    
    // 0. Calculate Rewards
    const isFirstTime = !completedChallengeIds.has(currentTrip.id);
    const multiplier = selectedLevel === 'Standard' ? 1 : selectedLevel === 'Advanced' ? 1.5 : 2;
    const base = currentTrip.baseXP || currentTrip.basePoints || 100;
    let awardedXP = Math.round(base * multiplier);
    if (hintUsed) awardedXP = Math.round(awardedXP * 0.85);
    
    const awardedTokenCount = isFirstTime ? 1 : 0;

    // 1. OPTIMISTIC UPDATE IMMEDIATELY
    grantPointsLocally(awardedXP, currentTrip.id, {
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
      note: note,
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
    setStep('pending');
    setSubmissionStatus('saving');
    setIsUploading(true);

    // 3. Timeout Guard: Ensure result appears within 3 seconds
    const timeoutHandle = setTimeout(() => {
      setSubmissionStatus('submitted');
    }, 3000);

    // 4. Background Sync Process
    const runSync = async () => {
      try {
        // Optional Review
        if (!bypassReview) {
          try {
            const review = await evaluateProof(
              user.uid, 
              currentTrip.id, 
              currentTrip.title, 
              currentTrip.description || currentTrip.theAsk || '', 
              { note, receiptsMode: isReceipts }, 
              captureData.originalImageUrl
            );
            if (review.status === 'needsMoreProof' || review.status === 'rejected') {
              clearTimeout(timeoutHandle);
              setStep('correction');
              setIsUploading(false);
              submitLockRef.current = false;
              setSubmissionStatus('ready');
              return;
            }
          } catch (error: any) {
            console.warn("Evaluation uplink unstable, continuing with local data:", error.message);
          }
        }

        // Upload and Persist
        const now = Date.now();
        let originalUrl = captureData.originalImageUrl;
        let filteredUrl = captureData.filteredImageUrl;
        let uploadSucceeded = false;
        
        try {
          const [origRes, filtRes] = await Promise.all([
            uploadBase64Image(user.uid, 'proofs/original', `orig_${now}.jpg`, captureData.originalImageUrl),
            uploadBase64Image(user.uid, 'proofs/filtered', `filt_${now}.jpg`, captureData.filteredImageUrl)
          ]);
          originalUrl = origRes.url;
          filteredUrl = filtRes.url;
          uploadSucceeded = true;
        } catch (uploadError: any) {
          console.warn("[Capture Pre-Upload Fallback] Firebase storage upload failed, using local base64/dataURLs:", uploadError.message);
        }
        
        const result = await addEntry({
          tripId: currentTrip.id,
          proofImage: filteredUrl,
          originalImageUrl: originalUrl,
          filteredImageUrl: filteredUrl,
          fieldNote: note || 'A successful field trip entry.',
          selectedLevel,
          detourCompleted,
          crewId: profile.crewId || undefined,
          userId: user.uid,
          uploadSource: captureData.metadata.source,
          photoTakenAt: captureData.metadata.photoTakenAt || null,
          fileLastModifiedAt: (() => {
            const d = safeToDate(captureData.metadata.fileLastModified);
            return d ? d.toISOString() : null;
          })(),
          submittedAt: new Date().toISOString(),
          metadataStatus: captureData.metadata.metadataStatus,
          captureTrustLevel: captureData.trustLevel as any,
          filterUsed: captureData.filterId,
          filterIntensity: 1.0,
          reviewStatus: captureData.reviewStatus as any,
          hintUsed: hintUsed
        });

        const finalXP = (result.scoring?.totalPoints || 0) + (result.ftBonus || 0);

        setCompleteRecord({
          ...localResult,
          photo: filteredUrl,
          awardedXP: finalXP || awardedXP,
          syncStatus: uploadSucceeded ? 'synced' : 'sync_failed',
          syncError: uploadSucceeded ? undefined : 'UPLINK_CONGESTION',
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

        clearTimeout(timeoutHandle);
        setSubmissionStatus('submitted');
        if (incomingFieldCheck) resolveIncomingFieldCheck();
        
      } catch (error: any) {
        console.error("Sync failed:", error);
        const isQuotaError = error.message?.includes('DAILY_LIMIT') || error.message?.includes('COOLDOWN');
        const isSystemBusy = error.message?.includes('SYSTEM_BUSY');

        setCompleteRecord((prev: any) => ({
          ...prev,
          syncStatus: 'sync_failed',
          syncError: isQuotaError ? 'BUREAU_QUOTA_REACHED' : isSystemBusy ? 'UPLINK_CONGESTION' : error.message
        }));
        
        clearTimeout(timeoutHandle);
        setSubmissionStatus('submitted');
      } finally {
        setIsUploading(false);
        submitLockRef.current = false;
      }
    };

    runSync();

  };

  const handleRetrySync = async () => {
    if (submissionStatus === 'syncing' || !completeRecord) return;
    handleSubmit(true); // Bypass review on retry
  };

  if (completeRecord) {
    const isFirstTime = !!completeRecord.scoringData?.tokenAwarded;
    const isSyncing = submissionStatus === 'syncing' || submissionStatus === 'saving';
    
    return (
      <div className={cn(
        "min-h-screen flex flex-col font-sans relative overflow-y-auto",
        isBaja ? "bg-baja-sand text-baja-pink" : 
        isDiamond ? "bg-black text-white" :
        isHeat ? "bg-heat-yellow text-white" :
        "bg-white"
      )}>
        {/* Background Grid Pattern */}
        {!isPlain && !isBaja && !isDiamond && !isHeat && (
          <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03]" 
               style={{ 
                 backgroundImage: 'linear-gradient(var(--color-on-surface) 1.5px, transparent 1.5px), linear-gradient(90deg, var(--color-on-surface) 1.5px, transparent 1.5px)', 
                 backgroundSize: '48px 48px' 
               }} 
          />
        )}
        
        {/* Main Content Viewport */}
        <div className="flex-grow flex flex-col items-center justify-center p-4 sm:p-6 md:p-12 relative z-10 w-full max-w-lg mx-auto my-auto h-auto">
          <div className={cn(
            "bg-white border-4 border-on-surface p-6 sm:p-12 text-center space-y-8 relative overflow-hidden w-full",
            isPlain ? "shadow-none border-black" :
            isBaja ? "shadow-[12px_12px_0px_rgba(255,77,148,0.3)] border-baja-pink" :
            isDiamond ? "bg-white/10 border-white/20 shadow-none blur-bg text-white" :
            isHeat ? "bg-heat-pink border-white shadow-[12px_12px_0px_rgba(255,140,0,0.5)] text-white" :
            "shadow-[16px_16px_0px_black] sm:shadow-[24px_24px_0px_black]"
          )}>
            {/* Prisms & Stamps */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-brand-orange/10 rotate-45 translate-x-12 -translate-y-12" />
            
            {/* Header Block */}
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-brand-orange animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 font-mono">{fc('UPLINK_STATUS // RECORDED', 'STATUS: SAVED')}</span>
              </div>
              <h2 className="font-display text-4xl sm:text-6xl font-black uppercase italic tracking-tighter leading-none text-on-surface">
                {fc('MISSION_SECURED', 'MISSION COMPLETE')}
              </h2>
              <div className="h-1 w-20 bg-brand-orange mx-auto shadow-[0_0_8px_var(--color-brand-orange)]" />
            </div>

            {/* Mission Details */}
            <div className="space-y-2">
              <span className="text-[8px] font-mono opacity-50 uppercase tracking-widest block">Objective Coordinates</span>
              <h3 className="font-display text-2xl sm:text-3xl font-bold uppercase italic leading-tight text-on-surface">
                {completeRecord.title}
              </h3>
            </div>

            {/* Photographic Evidence & Field Logs */}
            {(completeRecord.photo || completeRecord.note) && (
              <div className="space-y-4 pt-2">
                {completeRecord.photo && (
                  <div className="aspect-[4/3] w-full bg-paper-dark border-4 border-on-surface overflow-hidden relative rotate-[-1deg] mx-auto shadow-md">
                    <img src={completeRecord.photo || undefined} alt="Evidence submitted" className="w-full h-full object-cover grayscale brightness-110 contrast-125" referrerPolicy="no-referrer" />
                    <div className="absolute bottom-0 left-0 w-full bg-on-surface/90 text-brand-lime p-2 font-mono text-[8px] uppercase tracking-wider text-left">
                      {fc('EVIDENCE_LOG_PHOTO // SECURE_UPLINK_IMAGE', 'PHOTO EVIDENCE')}
                    </div>
                  </div>
                )}
                {completeRecord.note && (
                  <div className="p-4 bg-paper-dark border-2 border-on-surface/20 text-left relative italic">
                    <span className="absolute top-1 right-2 text-[8px] font-mono opacity-40 uppercase">Field Log Entry</span>
                    <p className="font-serif text-sm text-on-surface/80 leading-relaxed font-medium">"{completeRecord.note}"</p>
                  </div>
                )}
              </div>
            )}

            {/* Acquisition Rewards */}
            <div className="space-y-4">
              <div className="bg-brand-cyan/20 text-on-surface p-4 border-4 border-on-surface shadow-[6px_6px_0px_black] text-left">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-[8px] font-black uppercase tracking-widest opacity-60 font-mono block">Acquisition Status</span>
                    <h4 className="font-display text-lg sm:text-lg font-black uppercase italic leading-none mt-1">{fc('PENDING_MANUAL_AUDIT', 'PENDING ADMIN AUDIT')}</h4>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl sm:text-3xl font-display font-black text-on-surface block">+{completeRecord.awardedXP} XP</span>
                    <span className="text-[8px] font-mono opacity-50 uppercase block">Pending Review</span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-on-surface/10 text-[9px] font-mono opacity-80 leading-relaxed uppercase">
                  {fc('SECURE_UPLINK_SUCCESSFUL. The field checkpoint team has received your evidence. Point credits and sticker/badge acquisitions will unlock upon manual verification.', 'Uplink successful. Your evidence is in the checkpoint queue. XP and stickers will unlock once manual verification is completed.')}
                </div>

                {isFirstTime && (
                  <div className="mt-2 pt-2 border-t border-dashed border-on-surface/10 flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-brand-orange">
                    <span>Potential Field Token:</span>
                    <span className="font-display font-black">+1 Token</span>
                  </div>
                )}
              </div>

              {/* Server Synchrony Metadata */}
              <div className={cn(
                "p-3 text-[10px] font-black uppercase tracking-widest border-2",
                completeRecord.syncStatus === 'synced' ? "bg-brand-lime/10 border-brand-lime text-on-surface" :
                completeRecord.syncStatus === 'sync_failed' ? "bg-brand-orange/10 border-brand-orange text-brand-orange" :
                "bg-on-surface/5 border-on-surface/20 text-on-surface/60"
              )}>
                {completeRecord.syncStatus === 'synced' ? fc("UPLINK ARCHIVED // QUEUED", "QUEUED") : 
                 completeRecord.syncStatus === 'sync_failed' ? fc("LOCAL SAVE // RETRY UPLINK", "SAVED LOCALLY (RETRY SYNC)") :
                 fc("SAVED LOCALLY // SYNC PENDING", "SAVED LOCALLY (SYNC PENDING)")}
              </div>
            </div>

            {/* Tactical Return Triggers */}
            <div className="pt-4 flex flex-col gap-4">
              <button
                onClick={() => navigate('/deck')}
                className="w-full py-4 bg-on-surface text-white hover:bg-brand-orange transition-all font-display text-2xl uppercase tracking-wider font-black italic shadow-[8px_8px_0px_var(--color-brand-lime)] active:shadow-none active:translate-x-1 active:translate-y-1 block"
              >
                {fc('RETURN_TO_DECK', 'BACK TO DECK')}
              </button>
              
              <button
                onClick={() => navigate('/profile')}
                className="w-full py-4 bg-white border-4 border-on-surface text-on-surface hover:bg-brand-lime transition-all font-display text-2xl uppercase tracking-wider font-black italic shadow-[8px_8px_0px_black] active:shadow-none active:translate-x-1 active:translate-y-1 block"
              >
                VIEW_FIELD_LOG
              </button>

              {(completeRecord.syncStatus === 'sync_failed' || (completeRecord.syncStatus === 'pending' && isSyncing)) && (
                <button
                  onClick={handleRetrySync}
                  disabled={isSyncing}
                  className="w-full py-3 bg-brand-orange text-white border-4 border-on-surface font-display text-sm uppercase tracking-widest shadow-[6px_6px_0px_black] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all font-black italic flex items-center justify-center gap-2 block"
                >
                  <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
                  {isSyncing ? fc("UPLINK TRANSMITTING...", "SYNCING...") : fc("RETRY SYNC UPLINK", "RETRY SYNC")}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "min-h-screen flex flex-col font-sans relative overflow-hidden",
      isBaja ? "bg-baja-sand text-baja-pink" : 
      isDiamond ? "bg-black text-white" :
      isHeat ? "bg-heat-yellow text-white" :
      "bg-white"
    )}>
      {/* Backgrounds */}
      {!isPlain && !isBaja && !isDiamond && !isHeat && (
        <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03]" 
             style={{ 
               backgroundImage: 'linear-gradient(var(--color-on-surface) 1.5px, transparent 1.5px), linear-gradient(90deg, var(--color-on-surface) 1.5px, transparent 1.5px)', 
               backgroundSize: '48px 48px' 
             }} 
        />
      )}
      {/* High-Voltage HUD / Scanline Overlay */}
      {!isPlain && !isBaja && !isDiamond && !isHeat && (
        <div className="fixed inset-0 pointer-events-none z-[100] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.015)_50%)] bg-[length:100%_3px] opacity-10" />
      )}

      {/* Header */}
      {(!currentTrip && !completeRecord) ? (
        <div className="flex-grow flex items-center justify-center p-12">
          <div className="bg-white border-4 border-on-surface shadow-[16px_16px_0px_black] p-10 text-center space-y-6">
            <h2 className="font-display text-4xl uppercase tracking-tighter italic font-black">{fc('NO MISSION ACTIVE', 'NO ACTIVE MISSION')}</h2>
            <p className="font-serif italic opacity-60">{fc('Return to the deck to find a mission.', 'Go back to the deck to pick a mission.')}</p>
            <button 
              onClick={() => navigate('/deck')}
              className="px-8 py-4 bg-brand-orange text-white border-4 border-on-surface shadow-[8px_8px_0px_black] font-bold italic"
            >
              {fc('BACK_TO_DECK', 'BACK TO DECK')}
            </button>
          </div>
        </div>
      ) : (
      <>
      <div className="absolute top-0 left-0 w-full p-3 sm:p-6 flex justify-between items-start z-30 pointer-events-none">
        <div className="space-y-2 sm:space-y-4 w-full pointer-events-auto">
          {!isPlain && (
            <div className="hidden sm:flex items-center gap-3">
              <div className="w-2 h-2 bg-brand-lime shadow-[0_0_8px_var(--color-brand-lime)]" />
              <p className={cn("micro-label font-bold tracking-wider italic", isBaja ? "text-baja-aqua" : isDiamond ? "text-white/40" : isHeat ? "text-white" : "text-brand-lime")}>
                {isBaja ? 'COASTAL SNAP' : isDiamond ? 'OPTICAL CALIBRATION' : isHeat ? 'PHOTO ROLL' : fc('ACTIVE SIGNAL // PHOTO MODE', 'READY')}
              </p>
            </div>
          )}
          <div className="flex flex-col sm:flex-col gap-2 sm:gap-4 max-w-sm sm:max-w-md">
              <div className="flex items-center gap-2 sm:gap-4 bg-on-surface text-white p-2.5 sm:p-4 border-2 sm:border-4 border-white/20 shadow-[4px_4px_0px_black] sm:shadow-[8px_8px_0px_black] rotate-[-1deg] w-fit">
                <div className="flex flex-col justify-center">
                   <p className="text-[8px] sm:text-[10px] font-black opacity-60 tracking-[0.2em] italic text-brand-orange leading-none">{fc('MISSION_OPERATIONAL', 'MISSION ACTIVE')}</p>
                   <h2 className={cn("font-display text-2xl sm:text-4xl uppercase tracking-tight leading-tight italic font-bold mt-0.5", isPlain && "drop-shadow-[4px_4px_0_black]")}>
                     {isPlain ? fc('PHOTO', 'TAKE PHOTO') : fc('PHOTO', 'PHOTO')}
                   </h2>
                </div>
              </div>
             
              <div className={cn(
                "flex items-center gap-2.5 sm:gap-4 px-3 sm:px-6 py-2 sm:py-4 border-2 sm:border-4 shadow-[4px_4px_0px_black] sm:shadow-[8px_8px_0px_black] italic select-none",
                isPlain ? "bg-white text-black border-black" :
                isBaja ? "bg-white text-baja-pink border-baja-pink" :
                isDiamond ? "bg-white/10 text-white border-white/20 blur-bg" :
                isHeat ? "bg-heat-pink text-white border-white" :
                "bg-brand-lime text-on-surface border-on-surface font-bold"
              )}>
                <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3] opacity-60 shrink-0" />
                <div className="flex flex-col text-left min-w-0">
                  <span className={cn("font-bold text-xs sm:text-sm uppercase tracking-wider truncate", isPlain && "text-sm sm:text-xl font-display")}>{getFrankieTitle(currentTrip, fPref)}</span>
                  <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-[0.15em] opacity-40 leading-none mt-0.5">ACTIVE MISSION</span>
                </div>
              </div>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 'viewfinder' && (
          <motion.div 
            key="viewfinder"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-grow flex flex-col items-center justify-center p-4 sm:p-6 pt-32 sm:pt-6 relative z-10"
          >
            <div className={cn(
              "relative w-full max-w-xs sm:max-w-md aspect-[3/4] overflow-hidden group transition-all",
              isPlain ? "border-8 border-white rounded-none shadow-none bg-paper" :
              isBaja ? "border-[12px] border-white rounded-[3rem] shadow-[0_20px_50px_rgba(255,77,148,0.3)] bg-white/20" : 
              isDiamond ? "border-[1px] border-white/40 rounded-none bg-black ring-[12px] ring-white/5" :
              isHeat ? "border-[8px] border-white rounded-[2rem] shadow-[0_15px_40px_rgba(255,140,0,0.5)] bg-white/10" :
              "border-4 border-on-surface bg-black shadow-[16px_16px_0px_rgba(0,0,0,0.15)] sm:shadow-[32px_32px_0px_rgba(0,0,0,0.15)] rounded-sm"
            )}>
              {/* Corner Brackets for High Voltage */}
              {!isBaja && !isDiamond && !isHeat && (
                <>
                  <div className="absolute top-4 left-4 sm:top-6 sm:left-6 w-8 h-8 sm:w-16 sm:h-16 border-t-4 sm:border-t-8 border-l-4 sm:border-l-8 border-brand-lime z-40 opacity-90 shadow-[0_0_15px_var(--color-brand-lime)]" />
                  <div className="absolute top-4 right-4 sm:top-6 sm:right-6 w-8 h-8 sm:w-16 sm:h-16 border-t-4 sm:border-t-8 border-r-4 sm:border-r-8 border-brand-lime z-40 opacity-90 shadow-[0_0_15px_var(--color-brand-lime)]" />
                  <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 w-8 h-8 sm:w-16 sm:h-16 border-b-4 sm:border-b-8 border-l-4 sm:border-l-8 border-brand-lime z-40 opacity-90 shadow-[0_0_15px_var(--color-brand-lime)]" />
                  <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 w-8 h-8 sm:w-16 sm:h-16 border-b-4 sm:border-b-8 border-r-4 sm:border-r-8 border-brand-lime z-40 opacity-90 shadow-[0_0_15px_var(--color-brand-lime)]" />
                  
                  {/* Rec Indicator */}
                  <div className="absolute top-6 sm:top-10 left-1/2 -translate-x-1/2 flex items-center gap-2 sm:gap-4 bg-on-surface px-4 py-1.5 sm:px-6 sm:py-2.5 rounded-none z-40 shadow-[4px_4px_0px_var(--color-brand-orange)] sm:shadow-[6px_6px_0px_var(--color-brand-orange)] border border-white/20">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
                    <span className="text-[9px] sm:text-[11px] font-mono text-white font-bold tracking-widest italic">{fc('LENS_ACTIVE', 'CAMERA LIVE')}</span>
                  </div>
                </>
              )}
              
                <div className="absolute top-16 sm:top-24 right-4 z-[60] flex flex-col gap-4">
                  <button 
                    onClick={() => cameraRef.current?.toggleCamera()}
                    className="w-10 h-10 sm:w-12 sm:h-12 bg-black/60 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center text-white hover:bg-brand-orange transition-colors shadow-lg active:scale-90"
                    title="Toggle Camera"
                  >
                    <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>

                <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center bg-on-surface/5"><Camera className="w-12 h-12 opacity-10 animate-pulse" /></div>}>
                <ViewfinderCamera challenge={currentTrip} ref={cameraRef} onCapture={onCapture} />
              </Suspense>
              {(isBaja || isDiamond) && <GlossOverlay opacity={isDiamond ? 0.3 : 0.4} />}
            </div>

            {/* UI Actions */}
            <div className="flex items-center gap-4 sm:gap-8 w-full max-w-xs sm:max-w-md pt-6 sm:pt-12 px-4 sm:px-6">
              <button 
                onClick={() => navigate(-1)} 
                className="p-4 sm:p-6 rounded-none bg-white border-2 sm:border-4 border-on-surface text-on-surface hover:bg-brand-lime transition-all shadow-[4px_4px_0px_black] sm:shadow-[8px_8px_0px_black] active:translate-x-1 active:translate-y-1 active:shadow-none"
              >
                <X className="w-6 h-6 sm:w-8 sm:h-8 stroke-[3.5]" />
              </button>
              <button 
                onClick={handleCaptureClick}
                disabled={isUploading || isLocked}
                className={cn(
                  "flex-grow py-5 sm:py-8 rounded-none font-display text-xl sm:text-2xl md:text-3xl uppercase tracking-tight transition-all shadow-[8px_8px_0px_black] sm:shadow-[16px_16px_0px_black] active:translate-x-1 active:translate-y-1 sm:active:translate-x-2 sm:active:translate-y-2 active:shadow-none overflow-hidden relative font-bold italic",
                  isBaja ? "bg-baja-pink text-white" : isDiamond ? "bg-white text-black" : isHeat ? "bg-heat-pink text-white" : "bg-brand-orange text-white border-2 sm:border-4 border-on-surface hover:bg-on-surface"
                )}
              >
                <span className="relative z-10">{isUploading ? fc('PROCESSING...', 'PROCESSING...') : fc('TAKE PHOTO', 'TAKE PHOTO')}</span>
                {!isBaja && !isDiamond && !isHeat && (
                   <div className="absolute top-0 right-0 w-24 h-full bg-white/20 -skew-x-12 translate-x-8" />
                )}
              </button>
            </div>
          </motion.div>
        )}

        {step === 'developing' && captureData && (
          <motion.div
            key="developing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-grow flex flex-col items-center justify-center p-6 z-50 bg-on-surface/90 backdrop-blur-2xl"
          >
             <motion.div layoutId="proof-card" className="bg-white p-6 pb-16 shadow-[24px_24px_0px_black] border-2 border-black max-w-xs w-full">
                <div className="aspect-[3/4] w-full overflow-hidden relative bg-paper-dark border-2 border-on-surface">
                   <motion.img 
                     src={captureData.filteredImageUrl || undefined} 
                     alt="Developing Proof" 
                     className="w-full h-full object-cover grayscale brightness-125 contrast-150"
                     initial={{ filter: 'grayscale(1) blur(12px) brightness(1.6)', opacity: 0.3 }}
                     animate={{ filter: 'grayscale(0) blur(0px) brightness(1)', opacity: 1 }}
                     transition={{ duration: 2.5 }}
                   />
                   {/* Prism Overlay for nightlife look */}
                   <div className="absolute inset-0 bg-gradient-to-tr from-brand-lime/10 via-transparent to-brand-magenta/10 mix-blend-overlay pointer-events-none" />
                </div>
                <div className="mt-10 text-left space-y-4">
                   <div className="flex items-center gap-2">
                      <div className="h-1 flex-grow bg-brand-orange" />
                      <p className="font-mono text-[10px] uppercase font-black tracking-[0.4em] text-on-surface">{developingCaption}</p>
                   </div>
                   <div className="flex justify-between items-center opacity-40">
                      <span className="text-[8px] font-mono">UPLINK_01</span>
                      <span className="text-[8px] font-mono">EST_TIME: 2.4s</span>
                   </div>
                </div>
             </motion.div>
          </motion.div>
        )}

        {step === 'review' && captureData && (
          <motion.div 
            key="review"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-grow flex flex-col items-center p-3 sm:p-6 pt-16 sm:pt-24 pb-16 sm:pb-32 z-10 overflow-y-auto bg-white"
          >
            <div className="w-full max-w-sm sm:max-w-md space-y-6 sm:space-y-12">
               <div className="bg-white border-2 sm:border-4 border-on-surface shadow-[6px_6px_0px_black] sm:shadow-[24px_24px_0px_black] overflow-visible relative">
                  <div className="absolute -top-4 sm:-top-6 left-3 sm:left-8 bg-brand-lime text-on-surface px-3 sm:px-6 py-1.5 sm:py-3 text-[8px] sm:text-[12px] font-bold uppercase tracking-wider border-2 sm:border-4 border-on-surface shadow-[4px_4px_0px_black] sm:shadow-[8px_8px_0px_black] italic">{fc('PROOF // VERIFIED', 'PHOTO VERIFIED')}</div>
                  <div className="p-3 sm:p-10 pt-10 sm:pt-16 space-y-4 sm:space-y-12">
                     <motion.div layoutId="proof-card" className="aspect-square bg-paper-dark border-2 sm:border-4 border-on-surface shadow-[6px_6px_0px_var(--color-brand-magenta)] sm:shadow-[16px_16px_0px_var(--color-brand-magenta)] relative overflow-hidden rotate-[-1deg]">
                       <img src={captureData.filteredImageUrl || undefined} alt="Proof" className="w-full h-full object-cover sepia-[0.1] contrast-125 brightness-110" />
                       <div className="absolute bottom-0 left-0 w-full bg-on-surface text-brand-lime p-1.5 sm:p-4 font-mono text-[8px] sm:text-[11px] uppercase tracking-tight italic font-bold">SIGNAL_SOURCE: {captureData.metadata.source} // LATENCY_{Math.round(Math.random() * 20)}ms</div>
                       
                       {/* Scanner line detail */}
                       <div className="absolute inset-x-0 h-1.5 sm:h-2 bg-brand-lime opacity-30 top-1/2 animate-scan pointer-events-none" />
                     </motion.div>
                     
                     {/* Metadata Trust Banner */}
                     <div className={cn(
                       "flex items-center gap-2.5 sm:gap-6 p-2.5 sm:p-6 border-2 sm:border-4 shadow-[4px_4px_0px_black] sm:shadow-[8px_8px_0px_black] italic",
                       captureData.trustLevel === 'live' ? "bg-brand-lime/10 border-brand-lime text-on-surface" :
                       captureData.trustLevel === 'verifiedCameraRoll' ? "bg-brand-cyan/10 border-brand-cyan text-on-surface" :
                       "bg-brand-orange/10 border-brand-orange text-on-surface"
                     )}>
                       <div className={cn("p-1.5 sm:p-3 border-2 sm:border-4 shadow-[2px_2px_0px_black] sm:shadow-[4px_4px_0px_black]", 
                         captureData.trustLevel === 'live' ? "bg-brand-lime border-on-surface" :
                         "bg-white border-on-surface"
                       )}>
                         {captureData.trustLevel === 'live' ? <ShieldCheck className="w-4 h-4 sm:w-8 sm:h-8 text-on-surface stroke-[3]" /> : <AlertCircle className="w-4 h-4 sm:w-8 sm:h-8 text-on-surface stroke-[3]" />}
                       </div>
                       <div className="flex flex-col gap-0.5 min-w-0">
                         <span className="font-black text-[9px] sm:text-sm uppercase tracking-[0.15em] sm:tracking-[0.3em] truncate">{captureData.trustLevel.toUpperCase()}</span>
                         <span className="text-[7.5px] sm:text-[11px] opacity-70 font-sans leading-tight font-medium text-on-surface/85">{captureData.message || (captureData.trustLevel === 'live' ? "Photo verified for field trip." : "Legacy data detected. Subject to audit.")}</span>
                       </div>
                     </div>

                     <div className="space-y-4 sm:space-y-10">
                        <div className="space-y-1.5 sm:space-y-6 border-l-[4px] sm:border-l-8 border-brand-orange pl-3 sm:pl-8">
                           <p className="text-[8px] sm:text-[12px] font-bold tracking-wider opacity-50 uppercase italic">ACTIVE_MISSION_TARGET</p>
                           <h3 className="font-display text-xl sm:text-4xl md:text-5xl uppercase tracking-tight leading-none text-on-surface font-black italic">{getFrankieTitle(currentTrip, fPref)}</h3>
                           <p className="text-xs sm:text-sm md:text-base font-sans opacity-80 leading-relaxed">{getFrankieDescription(currentTrip, fPref)}</p>
                        </div>

                        <div className="space-y-3 md:space-y-6 bg-paper-dark p-3 md:p-8 border-4 border-on-surface shadow-[6px_6px_0px_black] md:shadow-[10px_10px_0px_black] italic">
                          <p className="text-[9px] md:text-[11px] font-black tracking-[0.3em] uppercase opacity-60">CHOOSE_SIGNAL_INTENSITY</p>
                          <div className="grid grid-cols-3 gap-2 md:gap-6">
                             {(['Standard', 'Advanced', 'Certified'] as const).map(level => {
                                 const isLevelBlocked = level === 'Certified' && hintUsed;
                                 return (
                                   <button
                                     key={level}
                                     onClick={() => !isLevelBlocked && setSelectedLevel(level)}
                                     className={cn(
                                       "p-2 md:p-4 border-4 transition-all text-center shadow-[4px_4px_0px_black] active:shadow-none active:translate-x-1 active:translate-y-1 font-black relative overflow-hidden",
                                       selectedLevel === level ? "border-on-surface bg-brand-orange text-white" : "border-on-surface/20 bg-white text-on-surface hover:border-brand-orange",
                                       isLevelBlocked && "opacity-40 grayscale cursor-not-allowed border-dashed"
                                     )}
                                   >
                                     <div className="text-[8px] md:text-[10px] uppercase tracking-tighter italic">{level}</div>
                                     <div className="text-[11px] md:text-[13px] font-mono leading-none mt-1 md:mt-2 italic">
                                       +{currentTrip.levels?.[level]?.points || Math.round((currentTrip.baseXP || currentTrip.basePoints || 100) * (level === 'Standard' ? 1 : level === 'Advanced' ? 1.5 : 2))}
                                     </div>
                                     {isLevelBlocked && <Lock className="absolute top-1 right-1 w-2 h-2 opacity-40" />}
                                   </button>
                                 );
                               })}
                          </div>
                          {hintUsed && (
                             <p className="text-[9px] font-bold text-brand-orange uppercase tracking-widest mt-2 flex items-center gap-2">
                               <ShieldCheck className="w-3.5 h-3.5" /> Bureau Penalty: Certified Tier Blocked & -15% XP For Hint Usage
                             </p>
                          )}
                        </div>

                        {evidenceRequirements.some(r => r.key === 'location') && (
                          <div className="bg-brand-lime p-4 border-4 border-on-surface shadow-[6px_6px_0px_black] italic flex items-center gap-4">
                            <div className="p-2 bg-on-surface text-brand-lime">
                              <MapPin className="w-6 h-6" />
                            </div>
                            <div>
                               <p className="text-[10px] font-black uppercase tracking-widest leading-none">BETA_LOCATION_SYNC</p>
                               <p className="text-[8px] font-bold opacity-60 uppercase mt-1">Satellite Lock Confirmed: Latency <span className="text-on-surface">12ms</span></p>
                               <p className="text-[7px] font-black text-on-surface uppercase tracking-tight mt-1 opacity-40">SIMULATION_ACTIVE_FOR_BETA_TEST</p>
                            </div>
                            <div className="ml-auto">
                               <div className="w-3 h-3 rounded-full bg-on-surface animate-pulse" />
                            </div>
                          </div>
                        )}

                        <div className="space-y-2 sm:space-y-4 group">
                           <label className="text-[9px] sm:text-[11px] font-mono tracking-wider uppercase flex items-center gap-2">
                             <MessageSquare className="w-3.5 h-3.5 text-brand-orange stroke-[2.5]" />
                             FIELD_NOTE
                           </label>
                           <textarea 
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder={getFrankieFieldNotePrompt(currentTrip, fPref)}
                            className="w-full h-24 sm:h-32 bg-white border-2 sm:border-4 border-on-surface focus:border-brand-magenta focus:ring-0 focus:outline-none p-3 font-sans text-sm sm:text-base text-on-surface shadow-inner placeholder:opacity-30"
                          />
                        </div>

                        <div className="flex flex-col gap-3 sm:gap-6 pt-2">
                           <p className="text-[8px] sm:text-[10px] font-sans text-on-surface/50 text-center italic leading-tight">
                             {fc('BETA_GUIDE', 'Complete the required evidence, then SECURE EVIDENCE to score your Mission.')}
                           </p>
                           <button 
                             onClick={() => handleSubmit()} 
                             disabled={!isMissionReady || isUploading}
                             className={cn(
                               "w-full py-4 sm:py-6 md:py-8 font-display text-xl sm:text-2xl md:text-3xl uppercase tracking-tighter border-2 sm:border-4 border-on-surface transition-all font-black italic",
                               isMissionReady 
                                ? "bg-brand-orange text-white shadow-[6px_6px_0px_black] sm:shadow-[16px_16px_0px_black] active:shadow-none active:translate-x-1 active:translate-y-1 sm:active:translate-x-2 sm:active:translate-y-2 hover:bg-on-surface"
                                : "bg-on-surface/10 text-on-surface/40 cursor-not-allowed shadow-none"
                             )}
                           >
                             {isMissionReady ? fc('SECURE_EVIDENCE', 'SECURE EVIDENCE') : fc('INCOMPLETE_PROOF', 'INCOMPLETE PROOF')}
                           </button>
                           {!isMissionReady && (
                             <div className="bg-brand-orange/5 p-3 sm:p-4 border border-dashed border-brand-orange/20">
                               <p className="text-[9px] sm:text-[10px] font-mono text-brand-orange uppercase tracking-widest text-center font-bold">
                                 STILL_NEEDED_BY_BUREAU:
                               </p>
                               <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mt-2">
                                 {evidenceRequirements.filter(r => !r.fulfilled).map(r => (
                                   <div key={r.key} className="flex items-center gap-1.5 text-on-surface font-bold uppercase text-[9px] sm:text-[10px]">
                                     <div className="w-1.5 h-1.5 bg-brand-orange rounded-full" />
                                     {r.label}
                                   </div>
                                 ))}
                               </div>
                             </div>
                           )}
                           <button onClick={() => { setCaptureData(null); setStep('viewfinder'); }} className="text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-on-surface opacity-50 hover:opacity-100 hover:text-error flex items-center justify-center gap-2 transition-all italic">
                             <X className="w-3.5 h-3.5 stroke-[3.5]" />
                             CANCEL_AND_RESET
                           </button>
                        </div>
                     </div>
                  </div>
               </div>
               
               {/* Footer security badge */}
               <div className="flex justify-center items-center gap-4 py-8">
                  <div className="h-[2px] w-12 bg-on-surface/10" />
                  <span className="text-[8px] font-mono opacity-30 select-none">BUREAU_ENCRYPTION_ACTIVE // 4096_BIT</span>
                  <div className="h-[2px] w-12 bg-on-surface/10" />
               </div>
            </div>
          </motion.div>
        )}

        {(step === 'pending' || submissionStatus === 'submitted') && (completeRecord || captureData) && (
          <motion.div 
            key="success-screen"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-grow flex flex-col items-center justify-center p-4 sm:p-6 space-y-8 sm:space-y-16 z-50 bg-white text-on-surface overflow-y-auto"
          >
            <div className="relative group w-full max-w-lg my-auto">
               <div className="bg-white border-4 border-on-surface shadow-[16px_16px_0px_black] sm:shadow-[32px_32px_0px_black] p-6 sm:p-16 text-center space-y-10 sm:space-y-12 relative overflow-hidden">
                  {/* Decorative prisms */}
                  <div className="absolute top-0 right-0 w-32 h-32 sm:w-48 sm:h-48 bg-brand-lime opacity-10 rotate-45 translate-x-16 -translate-y-16 sm:translate-x-24 sm:-translate-y-24" />
                  <div className="absolute bottom-0 left-0 w-32 h-32 sm:w-48 sm:h-48 bg-brand-magenta opacity-10 rotate-45 -translate-x-16 translate-y-16 sm:-translate-x-24 sm:translate-y-24" />
                  
                  {submissionStatus !== 'submitted' && captureData && (
                    <div className="relative mx-auto w-48 h-60 sm:w-64 sm:h-80">
                      <div className="absolute inset-0 border-8 p-4 bg-paper-dark shadow-[10px_10px_0px_rgba(0,0,0,0.1)] sm:shadow-[20px_20px_0px_rgba(0,0,0,0.1)] border-on-surface rotate-6 transition-transform group-hover:rotate-12">
                        <img src={captureData.filteredImageUrl} alt="Entry" className="w-full h-full object-cover grayscale brightness-110 contrast-125" />
                      </div>
                      <div className="absolute -bottom-6 -right-6 sm:-bottom-10 sm:-right-10 w-24 h-12 sm:w-40 sm:h-20 border-4 sm:border-8 border-brand-orange text-brand-orange flex items-center justify-center font-display text-xl sm:text-4xl uppercase tracking-[0.2em] rotate-[-15deg] bg-white shadow-[4px_4px_0px_black] sm:shadow-[8px_8px_0px_black] z-20 font-black italic">
                        SENT
                      </div>
                    </div>
                  )}

                  <div className="space-y-8 sm:space-y-10 pt-4">
                      <h1 className={cn(
                        "font-display uppercase tracking-tighter text-on-surface leading-[0.7] font-black italic",
                        (submissionStatus === 'submitted' || completeRecord?.syncStatus === 'sync_failed') ? "text-5xl md:text-7xl" : "text-7xl md:text-8xl"
                      )}>
                        {fc((submissionStatus === 'submitted' || completeRecord?.syncStatus === 'sync_failed') ? 'MISSION_SECURED' : 'TRANSMITTING', (submissionStatus === 'submitted' || completeRecord?.syncStatus === 'sync_failed') ? 'SAVED' : 'SENDING...')}
                      </h1>
                    <div className="h-2 w-24 sm:w-32 bg-brand-orange mx-auto shadow-[0_0_10px_var(--color-brand-orange)]" />
                    
                    {(submissionStatus === 'submitted' || completeRecord?.syncStatus === 'sync_failed') ? (
                      <div className="space-y-8 sm:space-y-10">
                        <div className="bg-brand-lime text-on-surface p-4 sm:p-6 border-4 border-on-surface shadow-[8px_8px_0px_black] text-left rotate-1">
                           <div className="flex justify-between items-start">
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Status_Update</p>
                                <h3 className="font-display text-2xl sm:text-3xl font-black uppercase italic leading-none mt-1">XP_AWARDED</h3>
                              </div>
                              <p className="text-4xl sm:text-5xl font-display font-black">+{completeRecord?.awardedXP || scoringData?.scoring?.totalPoints || currentTrip?.baseXP || 0}</p>
                           </div>
                           <p className="text-[10px] font-bold uppercase tracking-widest mt-4 opacity-70">
                             {completeRecord?.syncStatus === 'synced' ? 'Saved to Field Log' : 
                              completeRecord?.syncStatus === 'pending' ? 'Saved locally for beta. Sync pending...' :
                              completeRecord?.syncStatus === 'sync_failed' ? 'Saved locally for beta. Sync failed. Retry available.' : 
                              'Stabilizing Field Log entry...'}
                           </p>
                        </div>

                        {completeRecord && (
                          <MissionResultCard 
                            trip={{
                              id: completeRecord.tripId, 
                              title: completeRecord.title,
                              proofType: completeRecord.proofType,
                              image: completeRecord.image
                            } as any}
                            scoringData={completeRecord.scoringData || scoringData || {}}
                            evidence={{ photo: completeRecord.photo, note: completeRecord.note || 'A successful field trip entry.' }}
                            showMathWizard={profile?.preferences?.mathWizard !== false}
                            newRewards={completeRecord.scoringData?.newRewards || scoringData?.newRewards}
                          />
                        )}
                      </div>
                    ) : submissionStatus === 'retry' ? (
                      <div className="bg-white border-4 border-on-surface p-6 sm:p-8 shadow-[12px_12px_0px_black] sm:shadow-[24px_24px_0px_black] text-center max-w-sm mx-auto space-y-6">
                        <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-brand-orange mx-auto mb-4" />
                        <h3 className="font-display text-3xl sm:text-4xl font-black italic uppercase leading-none">UPLINK_ERROR</h3>
                        <p className="font-serif italic text-base sm:text-lg opacity-80 leading-relaxed">The transmission signal was disrupted. Please re-attempt target security.</p>
                        <div className="pt-4 flex flex-col gap-4">
                          <button 
                            onClick={() => setStep('review')}
                            className="w-full py-4 sm:py-6 bg-brand-orange text-white font-display text-2xl sm:text-3xl font-black uppercase italic tracking-tighter border-4 border-on-surface shadow-[8px_8px_0px_black] active:shadow-none active:translate-x-1 active:translate-y-1"
                          >
                            RETURN_TO_REVIEW
                          </button>
                          <button 
                            onClick={() => navigate('/deck')}
                            className="text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100"
                          >
                            ABORT_MISSION
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="font-serif text-xl sm:text-2xl leading-relaxed px-4 sm:px-6 opacity-80 italic font-medium">
                        Stabilizing transmission signal. Documenting parameters. Please hold position.
                      </p>
                    )}
                  </div>

                  {(submissionStatus === 'submitted' || completeRecord?.syncStatus === 'sync_failed' || submissionStatus === 'syncing') && (
                    <div className="pt-8 sm:pt-10 flex flex-col gap-4 sm:gap-6 w-full max-w-sm mx-auto">
                      <button 
                        onClick={() => navigate('/deck')} 
                        className="w-full py-4 sm:py-6 bg-on-surface text-white font-display text-2xl sm:text-3xl uppercase tracking-tighter shadow-[8px_8px_0px_var(--color-brand-lime)] sm:shadow-[12px_12px_0px_var(--color-brand-lime)] active:shadow-none active:translate-x-2 active:translate-y-2 transition-all font-black italic hover:bg-brand-orange"
                      >
                        RETURN_TO_DECK
                      </button>
                      
                      <div className="flex flex-col gap-4">
                        <button 
                          onClick={() => navigate('/profile')} 
                          className={cn(
                            "w-full py-4 sm:py-6 border-4 border-on-surface font-display text-2xl sm:text-3xl uppercase tracking-tighter transition-all font-black italic shadow-[8px_8px_0px_black] active:shadow-none active:translate-x-1 active:translate-y-1",
                            completeRecord?.syncStatus === 'sync_failed' ? "bg-brand-orange text-white" : "bg-white text-on-surface hover:bg-brand-orange hover:text-white"
                          )}
                        >
                          {completeRecord?.syncStatus === 'sync_failed' ? 'SECURE_IN_FIELD_LOG' : 'VIEW_FIELD_LOG'}
                        </button>

                        <div className="grid grid-cols-2 gap-4">
                          {completeRecord?.syncStatus === 'sync_failed' || (completeRecord?.syncStatus === 'pending' && submissionStatus === 'syncing') ? (
                            <button 
                              onClick={handleRetrySync} 
                              className="col-span-2 py-4 bg-brand-orange text-white border-4 border-on-surface font-display text-xl uppercase tracking-widest shadow-[8px_8px_0px_black] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all font-black italic flex items-center justify-center gap-3"
                            >
                              <RefreshCw className={cn("w-5 h-5", (submissionStatus === 'syncing' || submissionStatus === 'saving') && "animate-spin")} />
                              {(submissionStatus === 'syncing' || submissionStatus === 'saving') ? 'SYNCING...' : 'RETRY_SYNC'}
                            </button>
                          ) : (
                            <button 
                              onClick={() => navigate('/big-board')} 
                              className="col-span-2 py-3 sm:py-4 bg-white text-on-surface border-4 border-on-surface font-display text-sm sm:text-base uppercase tracking-widest shadow-[6px_6px_0px_black] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all font-black italic hover:bg-brand-lime"
                            >
                              BIG_BOARD
                            </button>
                          )}
                        </div>

                        {completeRecord?.syncStatus === 'sync_failed' && (
                          <div className="space-y-4">
                            <p className="text-[10px] font-bold text-on-surface/40 uppercase tracking-widest text-center italic">
                              Big Board rankings remain unchanged while unsynced.
                            </p>
                            <button 
                              onClick={() => navigate('/big-board')} 
                              className="w-full py-2 text-[10px] font-bold uppercase tracking-widest text-on-surface/40 hover:text-on-surface hover:opacity-100 transition-all italic underline underline-offset-4"
                            >
                              CONTINUE_TO_BIG_BOARD_ANYWAY
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
               </div>
            </div>
          </motion.div>
        )}

        {step === 'correction' && lastReview && (
          <ProofCorrection 
            review={lastReview} 
            onRetry={() => { setStep('review'); clearReview(); }}
            onDone={() => { handleSubmit(true); }}
          />
        )}
      </AnimatePresence>
      </>
      )}

      {import.meta.env.DEV && (
        <div className="fixed bottom-2 left-2 z-[250] pointer-events-auto select-none">
          {!showDebug ? (
            <button 
              onClick={() => setShowDebug(true)}
              className="bg-black/95 text-brand-lime hover:bg-brand-orange font-mono text-[8px] px-2 py-1 border border-brand-lime shadow-md uppercase font-black cursor-pointer rounded-sm"
              title="Open QA Console"
            >
              [QA DBG]
            </button>
          ) : (
            <div className="bg-black/95 text-brand-lime font-mono text-[8.5px] p-2.5 border border-brand-lime space-y-1 w-48 shadow-2xl relative rounded-sm">
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}
