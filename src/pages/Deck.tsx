import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { MOCK_TRIPS, FIELD_TYPES } from '../constants';
import { Card } from '../components/UI';
import { useTheme } from '../context/ThemeContext';
import { CheckCircle2, MapPin, AlertTriangle, ShieldAlert, Timer, Zap, Camera, Sun, RotateCcw, Info, Users, Lock, HelpCircle, CheckCircle, X, Sparkles, ArrowRight, FileText, Trophy, ChevronDown, Layers, Book } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { getFieldCheckLabel } from '../logic/fieldCheckLogic';
import { Hibiscus, ChromeStar, BeachTag, GlossOverlay } from '../components/BajaBratzAssets';
import { DiamondStar, Sparkle, SunFlare, GlossOverlay as DiamondGloss } from '../components/SkinAssets';
import { getDisplayLabel } from '../utils/labelUtils';
import { FieldSignalCard } from '../components/FieldSignalCard';
import { ObservationFeed } from '../components/ObservationFeed';
import { getServerDate } from '../services/timeService';

import { MissionCard } from '../components/ChallengeCard';
import { MissionDecodedCard } from '../components/MissionDecodedCard';
import { EntryCard } from '../components/EntryCard';
import { DeckLibrary } from '../components/DeckLibrary';
import { DeckStack } from '../components/DeckStack';
import { getDefaultDeckPack, getDeckPackById, DECK_PACKS } from '../data/deckPacks';
import { getDeckCoverImage, BASE_DECK_PLACEHOLDER } from '../lib/deckUtils';
import { getWeeklyBonusForWeek } from '../data/weeklyBonuses';
import { StickerBackground } from '../components/StickerBackground';
import { StickerDecal, StickerCorner, StickerScatter } from '../components/StickerDecals';
import { isArchivedEntry, normalizeEntryStatus } from '../logic/entryLogic';
import { FEATURE_FLAGS } from '../config/featureFlags';
import { StarterCompletionState } from '../utils/starterHelper';
import { getSummerCountdown } from '../utils/seasonCountdown';
import { MARKER_STICKERS } from '../data/markers';
import { AvatarPreview } from '../components/AvatarPreview';
import { subscribeToRecentScoreEvents } from '../services/activityService';
import { ScoreEvent } from '../types/game';
import { LAUNCH_MISSION, LAUNCH_MISSION_ID } from '../data/specialMissions';
import { canAccessFeature, getChallengeStatus, getDeckProgress, getStarterProgress } from '../services/canonicalProgress';

import { FIELD_MATERIALS, FIELD_SHADOWS, FIELD_TYPOGRAPHY } from '../utils/styleHelpers';

interface DeckMetricBadgeProps {
  type: 'challenges' | 'tokens';
  value: number;
}

function DeckMetricBadge({ type, value }: DeckMetricBadgeProps) {
  const isChallenges = type === 'challenges';
  return (
    <div className={cn(
      "w-20 h-20 sm:w-24 sm:h-24 field-card field-card--paper flex flex-col items-center justify-center p-2 text-center relative select-none shrink-0 transition-all duration-300 hover:scale-105 group",
      "shadow-[8px_8px_0px_black] bg-white",
    )}>
      <span className={cn(
        "text-[8px] font-mono tracking-widest font-black uppercase text-center block leading-none opacity-40",
      )}>
        {isChallenges ? getDisplayLabel('MISSIONS') : getDisplayLabel('TOKENS')}
      </span>
      <span className="font-display text-2xl sm:text-3xl font-black mt-1 leading-none tracking-tight block italic text-on-surface">
        {value}
      </span>
      
      {/* Decorative colored dot */}
      <div className={cn(
        "absolute top-2 right-2 w-2 h-2 rounded-full border border-on-surface/10",
        isChallenges ? "bg-brand-orange" : "bg-brand-lime"
      )} />
    </div>
  );
}

// --- COMPACT SPLIT-FLAP DIGITS FOR KEY DECK METRICS & WEEKLY BONUSES ---
function MiniSplitFlap({ text, colorClass = "text-brand-orange" }: { text: string | number; colorClass?: string }) {
  const chars = String(text).split('');
  return (
    <div className="inline-flex gap-[2px] items-center p-1.5 bg-[#121212] border-2 border-on-surface rounded shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]">
      {chars.map((char, index) => {
        if (char === ' ') {
          return <div key={index} className="w-1.5 sm:w-2" />;
        }
        return (
          <div 
            key={index} 
            className="relative inline-flex flex-col items-center justify-center bg-[#222222] rounded overflow-hidden border border-neutral-700 shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)] w-[18px] h-[28px] sm:w-[22px] sm:h-[32px] select-none"
          >
            {/* Top flap half */}
            <div className="absolute inset-x-0 top-0 h-1/2 overflow-hidden border-b border-black/30">
              <div className="flex h-full items-center justify-center translate-y-1/2">
                <span className={cn("font-mono font-black text-xs sm:text-sm tracking-tighter", colorClass)}>{char.toUpperCase()}</span>
              </div>
            </div>
            {/* Bottom flap half */}
            <div className="absolute inset-x-0 bottom-0 bg-[#1D1D1D] h-1/2 overflow-hidden">
              <div className="flex h-full items-center justify-center -translate-y-1/2">
                <span className={cn("font-mono font-black text-xs sm:text-sm tracking-tighter", colorClass)}>{char.toUpperCase()}</span>
              </div>
            </div>
            {/* Split seam line */}
            <div className="absolute top-1/2 left-0 w-full h-[1px] bg-black/40 z-20" />
            <div className="absolute inset-0 z-10 bg-gradient-to-b from-white/5 via-transparent to-black/20 pointer-events-none" />
          </div>
        );
      })}
    </div>
  );
}

import { QuickMissionCard } from '../components/QuickMissionCard';
import { MissionDetailsModal } from '../components/MissionDetailsModal';
import { DeckDiagnosticsPanel } from '../components/DeckDiagnosticsPanel';

import { ActionButton, DisplayPanel } from '../components/UIUtilities';

const DEX_QUOTES = [
  "Go outside. Notice something weird. Call it personal growth.",
  "Progress is measured in achievements, questionable choices, and snacks.",
  "Every mission completed is one less excuse with a backpack on.",
  "Fieldwork builds character. Allegedly.",
  "Your future self requested fewer abandoned missions.",
  "Small steps. Big lore. Moderate sunscreen.",
  "Today’s goal: complete the mission before the mission completes you.",
  "Evidence first. Confidence later.",
  "Touch grass, but document it.",
  "Every field legend started as someone squinting at a weird object.",
  "Motivation is temporary. Tokens are slightly less temporary.",
  "Do the thing. The archive is watching."
];

function DiamondDecor() {
  return (
    <>
      <DiamondStar className="absolute top-20 left-[-20px] w-48 h-48 text-white opacity-5 -z-10" />
      <Sparkle className="absolute top-1/4 right-0 w-12 h-12 text-white opacity-10 animate-pulse -z-10" />
      <div className="absolute inset-0 liquid-chrome opacity-5 pointer-events-none -z-20" />
    </>
  );
}

import { FieldPageHero } from '../components/FieldPageHero';

export default function DeckPage() {
  const navigate = useNavigate();
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const { 
    fieldType, soloTripsCount, entries, activeTrip, drawTrip, 
    rerollsAvailable, useReroll, incomingFieldCheck, resolveIncomingFieldCheck, user,
    loadMoreEntries, hasMoreEntries, activeSignal, loadingSignal,
    isSeasonActive, activeSeason, gameConfig, profile,
    addToMaybeList, removeFromMaybeList, useComebackCard, retryMissionSubmission,
    currentWeekNumber, activeWeekDrop, getSubmissionPointWindow, isWeekLocked, isReviewWindowOpen,
    updateTripProgress, completedChallengeIds, submittedPendingChallengeIds, fieldTokens, onboardingCompletedCount,
    onboardingRequiredCount, completedOnboardingMissionIds, isOnboardingComplete, trips, starterState,
    memories, toggleFavoriteMemory, getEligibleDrawPool, updateProfile, blockedIds, unlockDiscoverySticker, currentDate,
    isAdmin, isHeatwaveDeckUnlocked, isSocalSummerUnlocked, mustCompleteStarterMission,
    needsMoreProofChallengeIds, rejectedChallengeIds,
    drawnMissionCards, updateMissionCardStatus, setActiveMissionCard, canonicalProgress, progressMismatches
  } = useApp();
  const { frankieMode, skin, fc } = useTheme();

  const [activePackId, setActivePackId] = useState<string>(() => {
    if (!isOnboardingComplete && !isAdmin) return 'starter-signals';
    
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('active_deck_pack_id');
      if (saved) {
        // Simple security check: if it's summer and not unlocked by date/admin, fallback
        if (saved === 'heatwave-receipts' && !isHeatwaveDeckUnlocked && !isAdmin) {
          return 'starter-signals';
        }
        return saved;
      }
    }
    return getDefaultDeckPack().packId;
  });

  // Security Guard: Sync active pack with onboarding/unlock status
  useEffect(() => {
    if (!isOnboardingComplete && !isAdmin && activePackId !== 'starter-signals') {
      setActivePackId('starter-signals');
    }
    
    // Fallback if they somehow have Summer active but it's not even June 6 yet and they aren't Admin
    if (activePackId === 'heatwave-receipts' && !isHeatwaveDeckUnlocked && !isAdmin) {
      setActivePackId(isOnboardingComplete ? 'urban-recon' : 'starter-signals');
    }
  }, [isOnboardingComplete, isHeatwaveDeckUnlocked, isAdmin, activePackId]);

  // Save active pack ID to localStorage
  useEffect(() => {
    if (activePackId && typeof window !== 'undefined') {
      localStorage.setItem('active_deck_pack_id', activePackId);
    }
  }, [activePackId]);
  
  const isPlain = frankieMode;
  const onboardingRequired = onboardingRequiredCount;
  
  const fieldTypeData = FIELD_TYPES[fieldType || 'unclassified'];

  const progressPercent = Math.min(100, Math.round((fieldTokens / 1000) * 100));
  const userMarker = MARKER_STICKERS.find(s => s.id === (profile?.preferences?.selectedMarkerStickerId || 'default-scout')) || MARKER_STICKERS[0];

  const fieldCheckData = incomingFieldCheck ? getFieldCheckLabel(incomingFieldCheck.reason) : null;
  const isBaja = skin.id === 'baja-bratz';
  const isDiamond = skin.id === 'slippery-diamond';
  const isHeat = skin.id === 'heatwave';

  const [drawnTrip, setDrawnTrip] = useState<any>(null);
  const [recentActivity, setRecentActivity] = useState<ScoreEvent[]>([]);

  const [isDeckShelfExpanded, setIsDeckShelfExpanded] = useState(false);
  const [isFieldLogExpanded, setIsFieldLogExpanded] = useState(false);

  const activeLogEntries = React.useMemo(() => entries.filter(entry => !isArchivedEntry(entry)), [entries]);

  const pendingSubmissions = activeLogEntries.filter(e => 
    normalizeEntryStatus(e.status) === 'pending_review'
  );

  const needsMoreProofSubmissions = activeLogEntries.filter(e => 
    normalizeEntryStatus(e.status) === 'needs_more_proof'
  );

  const rejectedMissions = activeLogEntries.filter(e => 
    normalizeEntryStatus(e.status) === 'rejected'
  );

  const recentlyApprovedMissions = activeLogEntries.filter(e => 
    normalizeEntryStatus(e.status) === 'approved'
  );

  const urgentCount = needsMoreProofSubmissions.length + rejectedMissions.length;
  const hasUrgentItems = urgentCount > 0;

  // Auto-expand and keep open if urgent items exist
  useEffect(() => {
    if (hasUrgentItems) {
      setIsFieldLogExpanded(true);
    }
  }, [hasUrgentItems]);

  const getPackProgress = (pack: any) => {
    if (!pack) return { completed: 0, total: 0, percent: 0 };
    const progress = getDeckProgress(canonicalProgress, pack.packId);
    return { completed: progress.approvedCount, total: progress.totalCards, percent: progress.percent };
  };

  const getPackLockState = (pack: any) => {
    if (!pack) return { locked: false, reason: "" };
    const packId = pack.packId;
    
    if (pack.isFutureDrop) {
      return {
        locked: !isAdmin,
        reason: "Calibration pending"
      };
    }

    if (packId !== 'starter-signals' && packId !== 'heatwave-receipts' && !canAccessFeature(canonicalProgress, 'socal-summer', { isAdmin, socalUnlocked: isSocalSummerUnlocked })) {
      return { 
        locked: !isAdmin, 
        reason: "Unlocks after Starter Deck" 
      };
    }

    if (packId === 'heatwave-receipts') {
      const locked = !canAccessFeature(canonicalProgress, 'heatwave-receipts', { isAdmin, heatwaveUnlocked: isHeatwaveDeckUnlocked });
      let reason = "";
      if (!isOnboardingComplete && !isAdmin) {
        reason = "Unlocks after Starter Deck";
      } else if (!isHeatwaveDeckUnlocked && !isAdmin) {
        reason = "Opens Saturday, June 6th";
      }

      return { 
        locked, 
        reason
      };
    }

    return { locked: false, reason: "" };
  };

  useEffect(() => {
    let unsub: (() => void) | undefined;
    
    const initScoreEvents = async () => {
      try {
        const { subscribeToRecentScoreEvents } = await import('../services/activityService');
        unsub = subscribeToRecentScoreEvents(10, setRecentActivity);
      } catch (err) {
        console.warn("[Deck] Failed to load activity service:", err);
      }
    };

    initScoreEvents();
    return () => {
      if (unsub) unsub();
    };
  }, []);

  const visibleActivity = recentActivity.filter(event => !blockedIds.includes(event.userId));

  // Real Deck-Specific progression calculations
  const activePack = getDeckPackById(activePackId);
  const activeDeckName = activePack ? activePack.packName : (activePackId === 'starter-signals' ? 'Starter Deck' : 'Themed Deck');
  const activeDeckShortName = activePack ? activePack.shortName : 'DECK';
  const totalDeckChallenges = activePack ? activePack.missionIds.length : 0;
  
  // Starter-specific counts and variables (based on 'starter-signals')
  const isStarter = activePackId === 'starter-signals';
  const starterProgress = getStarterProgress(canonicalProgress);
  const starterApproved = starterProgress.starterApprovedCount || 0;
  const starterPendingCount = starterProgress.pendingStarterCount || 0;
  const starterSubmittedCount = starterProgress.submittedUniqueCount || 0;
  const starterNeedsMoreProofId = starterProgress.needsMoreProofMissionId;
  const starterRejectedId = starterProgress.rejectedMissionId;
  
  const isCurrentActiveStarter = activeTrip && ['starter-1', 'starter-2', 'starter-3', 'starter-signals', 'onboarding-mission'].includes(activeTrip.id.toLowerCase().trim());
  
  const isHeatwaveUnlockedForUI = isHeatwaveDeckUnlocked && (isOnboardingComplete || starterApproved >= 3);

  const activeDeckProgress = activePack
    ? getDeckProgress(canonicalProgress, activePack.packId)
    : null;

  const approvedDeckChallengesCount = activeDeckProgress?.approvedCount || 0;
  const pendingDeckChallengesCount = activeDeckProgress?.pendingCount || 0;
  
  const completedDeckChallengesCount = approvedDeckChallengesCount + pendingDeckChallengesCount;
  
  const isDeckCompleted = isStarter && starterApproved < 3 
    ? false 
    : (totalDeckChallenges > 0 && approvedDeckChallengesCount === totalDeckChallenges);
  const isDeckSubmitted = totalDeckChallenges > 0 && completedDeckChallengesCount === totalDeckChallenges;

  const deckProgressPercent = totalDeckChallenges > 0 
    ? Math.min(100, Math.round((approvedDeckChallengesCount / totalDeckChallenges) * 100)) 
    : 0;
  const deckPendingPercent = totalDeckChallenges > 0 
    ? Math.min(100 - deckProgressPercent, Math.round((pendingDeckChallengesCount / totalDeckChallenges) * 100)) 
    : 0;

  // Calculate exhaustion state dynamically
  const poolResult = getEligibleDrawPool(activePackId);
  const eligiblePool = poolResult.eligibleMissions;
  const drawPoolAnalysis = poolResult.analysis || [];
  const isStarterConfigurationBlocked = isStarter && poolResult.reason === 'unpublished_cards_blocked';
  
  // Rule 1 & Rule 2 for Starter Deck:
  // - Pending review should only show if ALL starters are submitted but not yet 3 approved.
  // - allow sequential draws if available cards exist.
  const isStarterPending = isStarter && starterApproved < 3 && starterSubmittedCount >= 3;

  // Seasonal/Evergreen Rules:
  // Allow multiple pending missions unless a limit is hit or the deck is actually out of missions.
  const maxSeasonalPending = 3; 
  const isPendingReviewLimit = !isStarter && !isDeckCompleted && eligiblePool.length > 0 && pendingDeckChallengesCount >= maxSeasonalPending;
  
  const isExhausted = !isStarter 
    ? (eligiblePool.length === 0 && pendingDeckChallengesCount === 0)
    : false;

  const isWaitingForReview = !!(isStarter 
    ? (isStarterPending || isDeckCompleted)
    : (isPendingReviewLimit || (eligiblePool.length === 0 && !isDeckCompleted && activePack && pendingDeckChallengesCount > 0)));

  const needsMoreProofDeckChallengesCount = activeDeckProgress?.needsMoreProofCount || 0;
  const rejectedDeckChallengesCount = activeDeckProgress?.rejectedCount || 0;

  // Diagnostic Logs for Regression Repair
  useEffect(() => {
    if (activePackId === 'heatwave-receipts' || activePackId === 'starter-signals') {
      console.log(`[Deck Diagnostics] ${activePackId}:`, {
        deckId: activePackId,
        approvedCount: approvedDeckChallengesCount,
        pendingCount: pendingDeckChallengesCount,
        starterSubmittedCount,
        needsMoreProofCount: needsMoreProofDeckChallengesCount,
        rejectedCount: rejectedDeckChallengesCount,
        availableCards: eligiblePool.length,
        maxActivePendingPerDeck: maxSeasonalPending,
        isBlocked: isWaitingForReview,
        isStarterPending,
        blockReason: isPendingReviewLimit ? 'pending_limit_reached' : (eligiblePool.length === 0 && !isStarter ? 'deck_exhausted' : 'none'),
        analysis: drawPoolAnalysis
      });
    }
  }, [activePackId, approvedDeckChallengesCount, pendingDeckChallengesCount, starterSubmittedCount, eligiblePool.length, isWaitingForReview, isPendingReviewLimit, isExhausted, isStarterPending, maxSeasonalPending, needsMoreProofDeckChallengesCount, rejectedDeckChallengesCount, drawPoolAnalysis]);

  const starterHasNeedsMoreProof = isStarter && starterNeedsMoreProofId;
  const starterHasRejected = isStarter && starterRejectedId;

  const displayState = {
    label: starterHasNeedsMoreProof ? "FIX PROOF" : 
           starterHasRejected ? "RETRY MISSION" :
           isStarterConfigurationBlocked ? "STARTER UNAVAILABLE" :
           isPendingReviewLimit ? "LIMIT REACHED" : 
           (isWaitingForReview ? "PENDING REVIEW" : 
           (isExhausted ? getDisplayLabel("DECK_EXHAUSTED") : getDisplayLabel("START_MISSION"))),
    sublabel: starterHasNeedsMoreProof ? "PHOTO_REJECTED" :
              starterHasRejected ? "RETRY_REQUIRED" :
              isStarterConfigurationBlocked ? "CHECK_BACK_SOON" :
              isPendingReviewLimit ? "PENDING_LIMIT_REACHED" : 
              (isWaitingForReview ? "CALIBRATION_PENDING" : 
              (isExhausted ? (isDeckCompleted ? "DECK_COMPLETE" : getDisplayLabel("MISSION_LIMIT_REACHED")) : 
              (isStarter ? "STARTER_SIGNALS_READY" : getDisplayLabel("UPLINK_READY_FOR_HAND_OFF")))),
    status: starterHasNeedsMoreProof || starterHasRejected || isStarterConfigurationBlocked || isPendingReviewLimit || isWaitingForReview ? "PENDING" : (isExhausted ? "EXHAUSTED" : "READY")
  };

  // Real automatically rotating weekly bonus selector
  const currentWeeklyBonus = getWeeklyBonusForWeek(currentWeekNumber);

  const [isDrawn, setIsDrawn] = useState(false);
  const [hasRevealedInActiveSession, setHasRevealedInActiveSession] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);

  const [animationStep, setAnimationStep] = useState<'idle' | 'drawing' | 'flipping' | 'settling'>('idle');

  // Sync active pack when onboarding completes (Disabled to let the user see the Starter Complete layout and manually switch)
  /*
  useEffect(() => {
    if (isOnboardingComplete && activePackId === 'starter-signals') {
      setActivePackId(getDefaultDeckPack().packId);
    }
  }, [isOnboardingComplete]);
  */

  const isCompleted = (id: string) => getChallengeStatus(canonicalProgress, id, activeTrip?.id || null) === 'approved';
  const isPending = (id: string) => getChallengeStatus(canonicalProgress, id, activeTrip?.id || null) === 'pending_review';
  const isUnavailable = (id: string) => isCompleted(id) || isPending(id);

  // Sync initial state if mission already exists AND they have already revealed it in this session
  useEffect(() => {
    if (activeTrip && !drawnTrip && hasRevealedInActiveSession) {
      setIsDrawn(true);
      setAnimationStep('settling');
    }
  }, [activeTrip, trips.length, hasRevealedInActiveSession]);

  const handleDraw = async (isRedraw: boolean = false) => {
    if (isDrawing || isStarterConfigurationBlocked || (isExhausted && !activeTrip) || animationStep === 'drawing' || animationStep === 'flipping') return;

    setIsDrawing(true);
    setShowAnimation(true);
    setAnimationStep('drawing');
    
    // Clear previous state for a fresh animation
    if (isRedraw) {
      setDrawnTrip(null);
      setIsDrawn(false);
      setHasRevealedInActiveSession(false);
    }

    try {
      // Logic for drawing a NEW card
      // In the new flow, drawTrip already saves to drawnMissionCards as 'drawn'
      const trip = await drawTrip(undefined, FEATURE_FLAGS.ENABLE_DECK_PACK_DRAW_LOGIC ? activePackId : undefined);
      
      // Sequence timing for slide-out/decode
      await new Promise(resolve => setTimeout(resolve, 350));
      setAnimationStep('flipping');
      
      if (trip) {
        setDrawnTrip(trip);
        unlockDiscoverySticker('mission_draw', 'deck');

        await new Promise(resolve => setTimeout(resolve, 450));
        setAnimationStep('settling');
        setIsDrawn(true);
        setHasRevealedInActiveSession(true);
      } else {
        console.warn("[Deck] handleDraw: drawTrip returned null. Pool may be exhausted.");
        
        setAnimationStep('idle');
        setShowAnimation(false);
        setIsDrawing(false);
        return;
      }

    } catch (err) {
      console.error("Draw failed:", err);
      setAnimationStep('idle');
      setShowAnimation(false);
    }
    
    setTimeout(() => {
      setIsDrawing(false);
    }, 1000);
  };

  const deckLockState = getPackLockState(activePack);
  const deckDiagnosticsPanel = (isAdmin || import.meta.env.DEV) ? (
    <DeckDiagnosticsPanel
      activePack={activePack}
      missions={trips}
      entries={entries}
      drawnMissionCards={drawnMissionCards}
      profile={profile}
      completedChallengeIds={completedChallengeIds}
      submittedPendingChallengeIds={submittedPendingChallengeIds}
      needsMoreProofChallengeIds={needsMoreProofChallengeIds}
      rejectedChallengeIds={rejectedChallengeIds}
      onboardingCompletedCount={onboardingCompletedCount}
      onboardingRequiredCount={onboardingRequiredCount}
      isOnboardingComplete={isOnboardingComplete}
      starterState={starterState}
      isHeatwaveDeckUnlocked={isHeatwaveDeckUnlocked}
      isSocalSummerUnlocked={isSocalSummerUnlocked}
      isAdmin={isAdmin}
      locked={deckLockState.locked}
      lockReason={deckLockState.reason}
      exhausted={isExhausted}
      eligibleCards={eligiblePool}
      activeTripId={activeTrip?.id || null}
      canonicalProgress={canonicalProgress}
      progressMismatches={progressMismatches}
    />
  ) : null;

  // Full-Screen Training Protocol Complete Screen (Intro)
  if (user && isOnboardingComplete && !profile?.hasSeenDeckChooserIntro) {
    return (
      <div className={cn(
        "min-h-screen flex flex-col justify-center items-center p-4 sm:p-8 font-sans relative overflow-hidden",
        isBaja ? "bg-baja-sand text-baja-pink" :
        isDiamond ? "bg-black text-white" :
        isHeat ? "bg-heat-yellow text-white" :
        "bg-[#FAF8F5] text-on-surface"
      )}>
        {/* Background Gradients & Textures */}
        <div className="absolute inset-0 ft-paper-texture opacity-100" />
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(183,255,0,0.15)_0%,transparent_70%)] pointer-events-none" />

        <motion.div 
          initial={{ opacity: 0, y: 40, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className={cn(
            "max-w-xl w-full p-6 sm:p-10 space-y-8 relative z-20 field-card field-card--paper field-paper-shadow-lg",
            isPlain ? "shadow-none border-black" :
            isBaja ? "shadow-[12px_12px_0px_rgba(255,77,148,0.3)] border-baja-pink" :
            isDiamond ? "bg-white/10 border-white/20 shadow-none blur-bg text-white" :
            isHeat ? "bg-heat-pink border-white shadow-[12px_12px_0px_rgba(255,140,0,0.5)] text-white" :
            ""
          )}
        >
          {/* Decorative Corner Element */}
          <div className="absolute top-[-10px] right-[-10px] w-24 h-24 bg-brand-lime rotate-12 field-card field-card--sticker shadow-md flex items-center justify-center -translate-x-2 translate-y-2">
             <Trophy className="w-10 h-10 text-on-surface" />
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-cyan field-card field-card--sticker flex items-center justify-center p-0">
                <Sparkles className="w-5 h-5 text-on-surface animate-pulse" />
              </div>
              <span className="text-[10px] sm:text-xs font-mono font-black uppercase tracking-[0.2em] opacity-60">
                {getDisplayLabel('UPLINK_ESTABLISHED')}
              </span>
            </div>
  
            <h1 className="font-display text-4xl sm:text-5xl font-black uppercase italic tracking-tighter leading-[0.9] text-on-surface">
              {fc('Starter Deck Complete', 'STARTER DECK COMPLETE')}
            </h1>
  
            <div className="h-2 w-24 bg-brand-lime shadow-[4px_4px_0px_black] border-2 border-on-surface rotate-[-1deg]" />
  
            <div className="space-y-4 font-serif text-base sm:text-lg text-on-surface/80 leading-relaxed italic">
              <p>
                {fc(
                  'Your initial training protocol is finalized. The Field Bureau has authorized access to the global mission bank. You can now select themed decks to focus your exploration.',
                  'Your initial training protocol is finalized. The Field Bureau has authorized access to the global mission bank. You can now select themed decks to focus your exploration.'
                )}
              </p>
              
              <div className="p-5 bg-brand-orange/5 border-4 border-dashed border-on-surface/10 rounded-2xl relative rotate-1">
                <span className="absolute -top-3 left-4 px-3 py-1 bg-brand-orange text-white text-[9px] font-mono font-black tracking-widest uppercase shadow-[2px_2px_0px_black]">
                  {getDisplayLabel('CORE_DIRECTIVE')}
                </span>
                <p className="font-sans text-sm font-bold text-on-surface/90 not-italic mt-2">
                  {fc(
                    'Use the Deck Chooser to toggle active mission sets. Start with "Heatwave Receipts" to join the current seasonal field route.',
                    'Use the Deck Chooser to toggle active mission sets. Start with "Heatwave Receipts" to join the current seasonal field route.'
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row gap-5">
            <button
              onClick={async () => {
                try {
                  setActivePackId('heatwave-receipts');
                  await updateProfile(user.uid, { hasSeenDeckChooserIntro: true });
                } catch (err) {
                  console.error("Failed to start Heatwave Receipts deck:", err);
                }
              }}
              className="flex-1 field-cta field-cta--urgent py-5 text-xl flex items-center justify-center gap-3"
            >
              <span>{fc('Load Heatwave Deck', 'LOAD HEATWAVE DECK')}</span>
              <ArrowRight className="w-6 h-6 stroke-[3]" />
            </button>

            <button
              onClick={async () => {
                try {
                  await updateProfile(user.uid, { hasSeenDeckChooserIntro: true });
                } catch (err) {
                  console.error("Failed to dismiss intro:", err);
                }
              }}
              className="py-5 px-8 field-card field-card--paper hover:bg-on-surface hover:text-white transition-all font-display text-lg uppercase tracking-wider font-black italic shadow-[8px_8px_0px_black] active:shadow-none active:translate-x-1 active:translate-y-1 flex items-center justify-center"
            >
              {fc('Maybe Later', 'NOT YET')}
            </button>
          </div>
        </motion.div>
        <div className="relative z-30 w-full px-4">
          {deckDiagnosticsPanel}
        </div>
      </div>
    );
  }

  if (!isSeasonActive && !activeSeason) {
    return (
      <div className="pb-40 px-6 pt-12 space-y-12 max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[80vh]">
        <AlertTriangle className="w-16 h-16 opacity-10" />
        <div className="text-center space-y-6">
          <h2 className="font-display text-4xl uppercase tracking-tight leading-tight">{fc('Deck Unavailable', 'Dashboard Unavailable')}</h2>
          <p className="font-serif italic opacity-75 text-lg">"{fc('The mission queue is currently locked. No active seasonal data available in your sector.', 'The mission queue is currently locked. Check back later.')}"</p>
        </div>
        <Link to="/" className="bureau-btn bg-on-surface text-paper">{fc('Return to Base', 'Back Home')}</Link>
        {deckDiagnosticsPanel}
      </div>
    );
  }

  // Filter for Maybe List
  const maybeTrips = trips.filter(t => profile?.maybeList?.includes(t.id) && !isUnavailable(t.id));
  
  // Determine "Do This Next"
  let recommendedTrip = activeTrip && !isUnavailable(activeTrip.id) ? activeTrip : null;
  
  if (!recommendedTrip && fieldTypeData) {
    const firstTrip = trips.find(t => t.id === fieldTypeData.firstTripId);
    if (firstTrip && !isUnavailable(firstTrip.id)) {
      recommendedTrip = firstTrip;
    } else {
      recommendedTrip = trips.find(t => 
        (t.tags || []).some(tag => fieldTypeData.recommendedChallengeTags?.includes(tag)) &&
        !isUnavailable(t.id)
      ) || null;
    }
  }
  
  if (!recommendedTrip) {
    // If we still don't have one, just pick the first available from the bank 
    // to avoid "empty" state on first load before sync
    // PRIORITY: If onboarding is active, pick first incomplete starter
    if (!isOnboardingComplete) {
      const starterIds = ["starter-1", "starter-2", "starter-3"];
      recommendedTrip = trips.find(t => starterIds.includes(t.id.toLowerCase()) && !isUnavailable(t.id)) || null;
    }
    
    if (!recommendedTrip) {
      recommendedTrip = trips.find(t => !isUnavailable(t.id)) || (trips.length > 0 ? trips[0] : null);
    }
  }

  // Recommended for Field Type
  const recommendedForPersona = recommendedTrip ? trips.filter(t => {
    if (!fieldTypeData?.recommendedChallengeTags || t.id === recommendedTrip?.id) return false;
    return (t.tags || []).some(tag => fieldTypeData.recommendedChallengeTags.includes(tag));
  }).slice(0, 3) : [];

  const missionProgress = recommendedTrip ? (profile?.tripProgress?.[recommendedTrip.id] || {}) as any : {};
  const hintUsed = !!missionProgress.hintUsed;

  // Scroll to top on load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Use dynamic countdown
  const countdown = getSummerCountdown(currentDate);

  // Guided Starter Mission Mode for Launch
  if (mustCompleteStarterMission && !isAdmin) {
    const launchMission = trips.find(t => t.id.toLowerCase() === LAUNCH_MISSION_ID.toLowerCase()) || LAUNCH_MISSION;
    
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-6 space-y-12 relative overflow-hidden">
        {/* Background Grain */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/handmade-paper.png')] mix-blend-multiply" />
        
        <div className="text-center space-y-2 relative z-10">
           <div className="w-fit mx-auto bg-brand-orange text-white text-[9px] font-mono font-black px-2 py-0.5 border-2 border-on-surface shadow-[2px_2px_0px_black] uppercase rotate-[-2deg] mb-1">
             {getDisplayLabel('TRANSMISSION_RECEIVED')}
           </div>
           <h1 className="font-display text-3xl sm:text-4xl font-black uppercase italic tracking-tighter leading-none">Your Mission</h1>
           <p className="text-on-surface/50 font-mono text-[8px] uppercase tracking-[0.2em] font-black">Frequency Locked: {LAUNCH_MISSION_ID}</p>
        </div>

        <div className="w-full max-w-[320px] sm:max-w-sm relative z-10">
           <AnimatePresence mode="wait">
             {!isDrawn ? (
               <motion.div 
                 key="draw-stage"
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, scale: 0.9 }}
                 className="space-y-10 flex flex-col items-center"
               >
                  <div className="w-full">
                    <DeckStack 
                      onDraw={handleDraw}
                      isDrawing={isDrawing}
                      disabled={isDrawing}
                      activeMission={null}
                      activePack={getDeckPackById('starter-signals')}
                      poolEmpty={false}
                      statusLabel={isDrawing ? "DECODING..." : "Tap the card"}
                    />
                  </div>
                  <button
                    onClick={() => handleDraw()}
                    disabled={isDrawing}
                    id="starter-draw-button" className="w-full py-5 bg-brand-orange text-white border-[4px] border-on-surface shadow-[0_8px_0px_black] active:shadow-none active:translate-y-2 transition-all font-display text-3xl font-black uppercase italic tracking-wide flex items-center justify-center gap-3"
                  >
                    {isDrawing ? (
                       <RotateCcw className="w-6 h-6 animate-spin" />
                    ) : (
                       <Zap className="w-6 h-6 fill-white" />
                    )}
                    <span>Tap the Card</span>
                  </button>
               </motion.div>
             ) : (
               <motion.div 
                 key="start-stage"
                 initial={{ opacity: 0, scale: 1.1 }}
                 animate={{ opacity: 1, scale: 1 }}
                 className="space-y-10 flex flex-col items-center"
               >
                  <MissionDecodedCard 
                    mission={drawnTrip || launchMission} 
                    showActions={false}
                    className="shadow-[20px_20px_0px_black] rounded-[2rem] border-[4px] border-on-surface"
                  />
                  <div className="w-full space-y-4">
                    <button
                      id="start-mission-button" onClick={() => navigate(`/capture?id=${(drawnTrip || launchMission)?.id}`)}
                      className="w-full py-6 bg-brand-orange text-white border-[4px] border-on-surface shadow-[0_12px_0px_black] active:shadow-none active:translate-y-3 transition-all font-display text-4xl font-black uppercase italic tracking-tight flex items-center justify-center gap-4"
                    >
                      <Camera className="w-10 h-10" />
                      <span>Start Mission</span>
                    </button>
                    <p className="text-[10px] font-mono font-black text-center text-on-surface/30 uppercase tracking-widest">
                      Next Step: Proceed to field site
                    </p>
                  </div>
               </motion.div>
             )}
           </AnimatePresence>
        </div>

        {/* Decorative footer */}
        <div className="fixed bottom-8 flex flex-col items-center gap-2 opacity-20 select-none pointer-events-none">
           <div className="text-[8px] font-mono font-black uppercase tracking-[0.6em]">Protocol: Ready for Deployment</div>
           <div className="h-0.5 w-32 bg-on-surface/40 rounded-full" />
        </div>
        <div className="absolute bottom-24 left-0 right-0 z-30 px-4">
          {deckDiagnosticsPanel}
        </div>
      </div>
    );
  }

  const getPreciseCountdownText = () => {
    const today = new Date(currentDate);
    const target = new Date('2026-06-06T00:00:00Z');
    const diffMs = target.getTime() - today.getTime();
    if (diffMs <= 0) {
      return "Heatwave Receipts is live. Complete Starter Pack to enter.";
    }
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `Heatwave Season starts in ${days}d ${hours}h ${mins}m`;
  };

  return (
    <div className={cn(
      "page-scroll relative px-4 sm:px-6 ft-paper-texture",
      isBaja ? "bg-baja-sand" : isDiamond ? "bg-black" : isHeat ? "bg-heat-yellow" : "bg-paper-light",
      "text-on-surface"
    )}>
      {/* Visual Spiral Notebook Rings at the top */}
      <div className="w-full flex justify-center py-1 opacity-55 z-20 relative select-none pointer-events-none mb-4 pt-4">
        <div className="h-4 w-60 border-y-2 border-on-surface bg-paper-dark flex justify-between px-4 rounded-full shadow-[inset_0_2px_4.5px_rgba(0,0,0,0.15)]">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-2.5 h-6 bg-slate-400 border-2 border-on-surface rounded-full -mt-1 shadow" />
          ))}
        </div>
      </div>

      <FieldPageHero
        eyebrow={getDisplayLabel('MISSION_DRAW_SYSTEM')}
        title="MISSIONS"
        subtitle="Sector 7-B // Field Headquarters"
        backgroundIcon={<Layers className="w-64 h-64" />}
        infoCardLabel={getDisplayLabel('ACTIVE_DECK')}
        infoCardValue={activePack?.shortName || activeDeckShortName}
        infoCardSubtext={deckLockState.locked ? "LOCKED" : "UNLOCKED"}
        infoCardAccent="blue"
      />

      {/* 3. ACTIVE DECK STATUS CARD / MISSION SHELF */}
      <div className="max-w-xl mx-auto mb-6 px-2 relative z-10">
        <div className="bg-[#FCFAF5] border-[3px] border-on-surface p-4 rounded-3xl shadow-[8px_8px_0px_black] relative overflow-hidden flex items-center gap-4">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:100%_8px] pointer-events-none" />
          
          {/* Small Decorative Deck Stack - Always visible as shelf marker */}
          <div 
            onClick={() => !activeTrip && !drawnTrip && handleDraw()}
            className={cn(
              "w-16 h-20 shrink-0 relative overflow-visible transform -rotate-3 hover:rotate-0 transition-transform cursor-pointer",
              isDrawing && "animate-pulse scale-105"
            )}
          >
            <div className="absolute inset-0 bg-on-surface/5 border border-on-surface/10 rounded translate-x-1 translate-y-1" />
             <div className="absolute inset-0 bg-white border-2 border-on-surface rounded flex items-center justify-center p-1 overflow-hidden shadow-sm">
               <img 
                 src={getDeckCoverImage(activePack)} 
                 className="w-full h-full object-cover grayscale-[20%]" 
                 alt={`${activePack?.title || 'Active deck'} cover`}
                 onError={(event) => {
                   event.currentTarget.src = BASE_DECK_PLACEHOLDER;
                 }}
                 referrerPolicy="no-referrer"
               />
             </div>
            {/* Status dot */}
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-brand-lime rounded-full border-2 border-on-surface shadow-sm z-20" />
          </div>

          <div className="flex-grow min-w-0 space-y-2">
            <div className="flex justify-between items-center text-[10px] font-mono font-black uppercase tracking-widest">
              <span className="text-on-surface/40">Active Deck</span>
              <span className="text-brand-lime">Active Pack</span>
            </div>
            <h4 className="text-lg font-display font-black uppercase italic truncate leading-none">
              {(() => {
                const short = (activePack?.shortName || activeDeckShortName).toUpperCase();
                const full = (activePack?.packName || activeDeckName).toUpperCase();
                if (full.startsWith(short)) {
                  return full;
                }
                return `${short}: ${full}`;
              })()}
            </h4>
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[9px] font-black font-mono text-on-surface/30">
                <span>PROGRESS</span>
                <span>
                  {approvedDeckChallengesCount} / {totalDeckChallenges} APPROVED
                  {pendingDeckChallengesCount > 0 && ` (${pendingDeckChallengesCount} PENDING)`}
                </span>
              </div>
              <div className="h-2.5 bg-on-surface/5 border-2 border-on-surface rounded-full overflow-hidden p-0.5 flex">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${deckProgressPercent}%` }}
                  className="h-full bg-brand-lime rounded-l-full"
                />
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${deckPendingPercent}%` }}
                  className="h-full bg-brand-orange/40"
                />
              </div>
            </div>
          </div>
        </div>

      </div>

      {deckDiagnosticsPanel}

      {/* 4. MAIN INTERACTIVE AREA: DRAW OR REVEAL (REFACTORED) */}
      <div className="max-w-xl mx-auto mb-12 relative z-10 px-2 lg:px-0 min-h-[500px]">
        <AnimatePresence mode="wait">
          {!isDrawn ? (
            <motion.div 
              key="deck-hero"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              className="flex flex-col items-center py-4 space-y-10"
            >
              {isStarter && starterState.status === 'COMPLETE' ? (
                <div className="w-full bg-[#FCFAF5] border-[3px] border-on-surface p-6 rounded-[2rem] shadow-[12px_12px_0px_black] text-center space-y-6 animate-fade-in">
                  <div className="w-20 h-20 bg-brand-lime border-2 border-on-surface rounded-full flex items-center justify-center mx-auto shadow-[4px_4px_0px_black] rotate-3">
                    <CheckCircle className="w-10 h-10 text-on-surface" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="font-display text-4xl font-black uppercase italic tracking-tight text-on-surface">Starter Complete</h2>
                    <p className="text-sm font-mono font-bold text-[#FF5A00] uppercase tracking-wider">{getDisplayLabel('HEATWAVE_RECEIPTS')} unlocked</p>
                  </div>
                  <button
                    onClick={() => {
                      setActivePackId('heatwave-receipts');
                      setIsDrawn(false);
                      setDrawnTrip(null);
                      setHasRevealedInActiveSession(false);
                    }}
                    className="w-full py-5 bg-brand-lime text-on-surface border-[3px] border-on-surface shadow-[0_8px_0px_black] active:shadow-none active:translate-y-2 transition-all font-display text-2xl font-black uppercase italic tracking-wide flex items-center justify-center gap-3 cursor-pointer"
                  >
                    <Sun className="w-6 h-6 fill-current animate-spin-slow" />
                    <span>Enter {getDisplayLabel('HEATWAVE_RECEIPTS')}</span>
                  </button>
                </div>
              ) : isStarter && starterState.status === 'REJECTED_RETRY_AVAILABLE' ? (
                <div className="w-full bg-[#FCFAF5] border-[3px] border-on-surface p-6 rounded-[2rem] shadow-[12px_12px_0px_black] text-center space-y-6 animate-fade-in">
                  <div className="w-20 h-20 bg-brand-orange border-2 border-on-surface rounded-full flex items-center justify-center mx-auto shadow-[4px_4px_0px_black] -rotate-3">
                    <RotateCcw className="w-10 h-10 text-white" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="font-display text-4xl font-black uppercase italic tracking-tight text-on-surface">Mission Rejected</h2>
                    <p className="text-xs font-sans font-bold text-on-surface/60 max-w-xs mx-auto">This one didn’t pass review. Ready for a second take? Retries help verify your field standing.</p>
                  </div>
                  <button
                    onClick={() => {
                      if (starterRejectedId) {
                        retryMissionSubmission(starterRejectedId);
                        navigate(`/capture?id=${starterRejectedId}`);
                      } else {
                        handleDraw(true);
                      }
                    }}
                    className="w-full py-5 bg-brand-orange text-white border-[3px] border-on-surface shadow-[0_8px_0px_black] active:shadow-none active:translate-y-2 transition-all font-display text-2xl font-black uppercase italic tracking-wide flex items-center justify-center gap-3 cursor-pointer"
                  >
                    <RotateCcw className="w-6 h-6" />
                    <span>Retry Mission</span>
                  </button>
                </div>
              ) : isStarter && starterState.status === 'NEEDS_MORE_PROOF' ? (
                <div className="w-full bg-[#FCFAF5] border-[3px] border-on-surface p-6 rounded-[2rem] shadow-[12px_12px_0px_black] text-center space-y-6 animate-fade-in">
                  <div className="w-20 h-20 bg-brand-orange border-2 border-on-surface rounded-full flex items-center justify-center mx-auto shadow-[4px_4px_0px_black] -rotate-3">
                    <AlertTriangle className="w-10 h-10 text-white animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="font-display text-4xl font-black uppercase italic tracking-tight text-on-surface">More proof needed</h2>
                    <p className="text-xs font-sans font-bold text-on-surface/60 max-w-xs mx-auto">The Bureau requires additional documentation for your starter signals to verify.</p>
                  </div>
                  <button
                    onClick={() => {
                      if (starterNeedsMoreProofId) {
                        navigate(`/capture?id=${starterNeedsMoreProofId}`);
                      } else {
                        navigate('/profile');
                      }
                    }}
                    className="w-full py-5 bg-brand-orange text-white border-[3px] border-on-surface shadow-[0_8px_0px_black] active:shadow-none active:translate-y-2 transition-all font-display text-2xl font-black uppercase italic tracking-wide flex items-center justify-center gap-3 cursor-pointer"
                  >
                    <Camera className="w-6 h-6" />
                    <span>Add More Proof</span>
                  </button>
                </div>
              ) : isStarter && starterState.status === 'PENDING_REVIEW' ? (
                <div className="w-full bg-[#FCFAF5] border-[3px] border-on-surface p-6 rounded-[2rem] shadow-[12px_12px_0px_black] text-center space-y-6 animate-fade-in">
                  <div className="w-20 h-20 bg-brand-orange/10 border-2 border-on-surface rounded-full flex items-center justify-center mx-auto shadow-[4px_4px_0px_black] rotate-2">
                    <Timer className="w-10 h-10 text-brand-orange animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="font-display text-4xl font-black uppercase italic tracking-tight text-on-surface">Pending Review</h2>
                    <p className="text-xs font-sans font-bold text-on-surface/60 max-w-xs mx-auto">
                      All three Starter Signals are in review. Your next route unlocks once they are approved.
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('/profile?tab=history')}
                    className="w-full py-5 bg-white text-on-surface border-[3px] border-on-surface shadow-[0_8px_0px_black] active:shadow-none active:translate-y-2 transition-all font-display text-2xl font-black uppercase italic tracking-wide flex items-center justify-center gap-3 cursor-pointer"
                  >
                    <FileText className="w-6 h-6" />
                    <span>View Proof Status</span>
                  </button>
                </div>
              ) : (
                <>
                  <div className="w-full max-w-[280px] sm:max-w-xs mx-auto">
                    <DeckStack 
                      onDraw={() => handleDraw()}
                      isDrawing={isDrawing}
                      disabled={isDrawing || isStarterConfigurationBlocked || (isExhausted && !activeTrip) || isWaitingForReview}
                      activeMission={null}
                      activePack={activePack}
                      poolEmpty={isExhausted && !activeTrip}
                      isWaitingForReview={isWaitingForReview}
                      statusLabel={
                        animationStep === 'drawing' ? "RELEASING..." : 
                        animationStep === 'flipping' ? "DECODING..." : 
                        displayState.label
                      }
                    />
                  </div>

                  <div className="w-full space-y-6">
                    <button
                      onClick={() => handleDraw()}
                      disabled={isDrawing || isStarterConfigurationBlocked || (isExhausted && !activeTrip) || isWaitingForReview}
                      className={cn(
                        "w-full py-5 bg-on-surface text-white border-[3px] border-on-surface shadow-[0_8px_0px_#B7FF00] active:shadow-none active:translate-y-2 transition-all font-display text-2xl font-black uppercase italic tracking-wide flex items-center justify-center gap-3 cursor-pointer",
                        (isDrawing || isStarterConfigurationBlocked || (isExhausted && !activeTrip) || isWaitingForReview) && "opacity-70 cursor-not-allowed grayscale"
                      )}
                    >
                      {isDrawing ? (
                        <>
                          <RotateCcw className="w-6 h-6 animate-spin text-brand-orange" />
                          <span>Decoding...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-6 h-6 fill-brand-lime text-brand-lime" />
                          <span>{displayState.label}</span>
                        </>
                      )}
                    </button>

                  <div className="flex flex-col items-center gap-1.5 opacity-30">
                    <p className="text-[9px] font-mono font-black uppercase tracking-[0.4em] text-on-surface text-center">
                      {displayState.sublabel}
                    </p>
                    <div className="w-16 h-0.5 bg-on-surface/20 rounded-full" />
                  </div>
                  </div>
                </>
              )}
            </motion.div>
          ) : (
            /* STATE B: MISSION HERO (Revealed) */
            <motion.div
              key={(drawnTrip || activeTrip)?.id || 'revealed'}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="w-full"
            >
               <div className="relative group">
                  {/* The Card Reveal Animation Wrapper */}
                  <motion.div
                    initial={animationStep === 'settling' ? { y: 0, scale: 1, rotateY: 0 } : { y: -200, scale: 0.8, rotateY: 180 }}
                    animate={{ y: 0, scale: 1, rotateY: 0 }}
                    transition={{ 
                      type: "spring", 
                      damping: 15, 
                      stiffness: 100, 
                      rotateY: { duration: 0.4, delay: 0.1 } 
                    }}
                  >
                    <MissionDecodedCard 
                      mission={drawnTrip || activeTrip} 
                      progress={profile?.tripProgress?.[(drawnTrip || activeTrip)?.id]}
                      onStart={() => navigate(`/capture?id=${(drawnTrip || activeTrip)?.id}`)}
                      isRedrawable={false}
                      showActions={false}
                      className="shadow-[16px_16px_0px_black] rounded-[2rem]"
                    />
                  </motion.div>

                  {/* Decorative Labels */}
                  <div className="absolute -top-3 -right-2 z-20 flex flex-col items-end gap-1 pointer-events-none">
                    <div className="bg-brand-lime text-on-surface text-[9px] font-black uppercase px-3 py-1 border-2 border-on-surface shadow-[4px_4px_0px_black] rotate-2">
                       SIGNAL_LOCKED
                    </div>
                  </div>
               </div>
               
              <div className="mt-10 space-y-4">
                <button
                  onClick={async () => {
                    try {
                      const mission = drawnTrip || activeTrip;
                      if (!mission) {
                        console.warn("[Deck] No mission found for Start Mission button.");
                        navigate('/deck');
                        return;
                      }

                      const missionId = mission.id;

                      // FINAL SAFETY: If it's already approved or pending, don't enter capture
                      const missionStatus = getChallengeStatus(canonicalProgress, missionId, activeTrip?.id || null);
                      const isAlreadyDone = missionStatus === 'approved' || missionStatus === 'pending_review';
                      if (isAlreadyDone) {
                        console.log("[Deck] Mission already completed or pending. Redirecting to deck instead of capture.");
                        setIsDrawn(false);
                        setDrawnTrip(null);
                        return;
                      }

                      await setActiveMissionCard(missionId);
                      sessionStorage.setItem('last_mission_action', Date.now().toString());
                      navigate(`/capture?id=${missionId}`);
                    } catch (err: any) {
                      console.error("[Deck] Failed to setActiveMissionCard:", err.message);
                    }
                  }}
                  id="start-mission-button-alt" className="w-full py-6 bg-brand-orange text-white border-[4px] border-on-surface shadow-[0_12px_0] active:shadow-none active:translate-y-3 transition-all font-display text-4xl font-black uppercase italic tracking-tight flex items-center justify-center gap-4 cursor-pointer"
                >
                  <Camera className="w-10 h-10" />
                  <span>Start Mission</span>
                </button>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={async () => {
                      try {
                        const missionId = (drawnTrip || activeTrip).id;
                        await updateMissionCardStatus(missionId, 'saved_for_later', { isActive: false });
                        setIsDrawn(false);
                        setDrawnTrip(null);
                        setHasRevealedInActiveSession(false);
                      } catch (err: any) {
                        console.error("[Deck] Failed to updateMissionCardStatus:", err.message);
                      }
                    }}
                    className="py-4 bg-white text-on-surface border-[3px] border-on-surface shadow-[0_6px_0] active:shadow-none active:translate-y-1.5 transition-all font-display text-xl font-black uppercase italic italic flex items-center justify-center gap-3 cursor-pointer"
                  >
                    <Book className="w-5 h-5 text-on-surface/40" />
                    <span>Save for Later</span>
                  </button>
                  <button
                    onClick={() => handleDraw(true)}
                    className="py-4 bg-white text-on-surface border-[3px] border-on-surface shadow-[0_6px_0] active:shadow-none active:translate-y-1.5 transition-all font-display text-xl font-black uppercase italic italic flex items-center justify-center gap-3 cursor-pointer"
                  >
                    <RotateCcw className="w-5 h-5 text-on-surface/40" />
                    <span>Draw Another</span>
                  </button>
                </div>

                <div className="text-center pt-2">
                  <button
                    onClick={() => navigate('/collection?tab=missions')}
                    className="text-[10px] font-mono font-black uppercase tracking-[0.3em] text-on-surface/40 hover:text-on-surface transition-colors"
                  >
                    View Mission Dex
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 5. COLLAPSIBLE BINDER DRAWERS */}
      <div className="max-w-xl mx-auto space-y-12 relative z-10 px-2 lg:px-0 pt-8">
        {/* Deck Shelf Accordion */}
        <div className="bg-white border-[3px] border-on-surface shadow-[8px_8px_0px_black] relative mt-4">
           {/* Folder / Binder divider tab notched overlay */}
           <div className="absolute top-0 left-6 -translate-y-full bg-[#FCF9F2] border-t-[3px] border-x-[3px] border-on-surface px-4 py-1 font-mono text-[9px] font-black uppercase tracking-wider text-on-surface/60 rounded-t-xl select-none">
              Dossier_Shelf
           </div>

           <details 
             open={isDeckShelfExpanded} id="deck-shelf" 
             onToggle={(e) => setIsDeckShelfExpanded(e.currentTarget.open)}
             className="group"
           >
              <summary className="p-4 flex items-center justify-between cursor-pointer list-none select-none">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-brand-cyan border-2 border-on-surface flex items-center justify-center shadow-[3px_3px_0px_black]">
                      <Trophy className="w-4 h-4 text-on-surface" />
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-black uppercase italic tracking-tight leading-none text-on-surface">Deck Shelf</h3>
                      <p className="text-[10px] font-mono font-black uppercase tracking-widest text-[#FF5A00] mt-1 leading-none">
                        {activePack?.shortName || "STARTER"} ACTIVE {isHeatwaveUnlockedForUI ? "· HEATWAVE UNLOCKED" : ""}
                      </p>
                    </div>
                 </div>
                 <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono font-black text-on-surface/30 group-open:opacity-0 transition-opacity uppercase">Manage</span>
                    <ChevronDown className="w-6 h-6 text-on-surface/30 group-open:rotate-180 transition-transform" />
                  </div>
              </summary>
              <div className="p-4 pt-0 space-y-3 bg-[#FCFAF5] border-t-2 border-on-surface/5">
                 {DECK_PACKS.map((pack) => {
                    const { completed, total, percent } = getPackProgress(pack);
                    const { locked, reason } = getPackLockState(pack);
                    const isSelected = pack.packId === activePackId;

                    return (
                      <div 
                        key={pack.packId}
                        onClick={() => {
                          if (!locked && !isSelected) {
                            setActivePackId(pack.packId);
                            setDrawnTrip(null);
                            setIsDrawn(false);
                            setAnimationStep('idle');
                            setHasRevealedInActiveSession(false);
                          }
                        }}
                        className={cn(
                          "p-3 rounded-2xl border-2 transition-all relative overflow-hidden bg-white select-none",
                          isSelected 
                            ? "border-on-surface shadow-[4px_4px_0px_black]" 
                            : locked 
                              ? "opacity-60 bg-stone-50 border-dashed border-stone-200 cursor-not-allowed"
                              : "border-on-surface/20 hover:border-on-surface hover:shadow-[4px_4px_0px_black] hover:-translate-y-0.5 cursor-pointer"
                        )}
                      >
                        {locked && (
                          <div 
                            className="absolute inset-0 pointer-events-none opacity-[0.02] z-0" 
                            style={{ 
                              backgroundImage: 'repeating-linear-gradient(45deg, #000 0px, #000 10px, transparent 10px, transparent 20px)' 
                            }} 
                          />
                        )}
                        <div className="flex gap-3 items-center relative z-10">
                           {/* Thumbnail/icon */}
                           <div className={cn(
                             "w-10 h-10 border-2 border-on-surface flex items-center justify-center shrink-0 overflow-hidden relative shadow-[2px_2px_0px_black]",
                             isSelected ? "bg-brand-lime" : "bg-neutral-100"
                           )}>
                              <img 
                                src={getDeckCoverImage(pack)} 
                                className="w-full h-full object-cover" 
                                alt={`${pack?.title || pack?.packName || 'Deck'} cover`}
                                onError={(event) => {
                                  event.currentTarget.src = BASE_DECK_PLACEHOLDER;
                                }}
                                referrerPolicy="no-referrer"
                              />
                           </div>

                           <div className="flex-grow min-w-0">
                              <div className="flex justify-between items-baseline gap-1.5">
                                 <h4 className={cn(
                                   "font-display uppercase text-sm font-black tracking-tight truncate leading-tight",
                                   isSelected ? "text-on-surface italic" : "text-on-surface/70"
                                 )}>
                                    {pack.packName}
                                 </h4>
                                 {isSelected && (
                                   <span className="shrink-0 bg-brand-lime text-on-surface text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full border border-on-surface">
                                     Active
                                   </span>
                                 )}
                              </div>

                              {locked ? (
                                <p className="text-[9px] font-mono font-black text-[#FF5A00] uppercase tracking-wide leading-none mt-1">
                                   LOCKED: {reason}
                                </p>
                              ) : (
                                <div className="space-y-1 mt-1">
                                   <div className="flex justify-between items-center text-[8px] font-mono font-black text-on-surface/45">
                                      <span>PROGRESS</span>
                                      <span>{completed}/{total} COMPLETE</span>
                                   </div>
                                   <div className="h-1.5 bg-on-surface/5 border border-on-surface/10 rounded-full overflow-hidden">
                                      <div 
                                         className="h-full bg-brand-lime"
                                         style={{ width: `${percent}%` }}
                                      />
                                   </div>
                                </div>
                              )}
                           </div>

                           {/* Selection handler / Locked Indicator */}
                           <div className="shrink-0 flex items-center justify-end pl-2">
                              {locked ? (
                                 <Lock className="w-4 h-4 text-neutral-400" />
                              ) : isSelected ? (
                                 <div className="w-5 h-5 rounded-full bg-brand-lime border-2 border-on-surface flex items-center justify-center shadow-sm">
                                    <CheckCircle className="w-3.5 h-3.5 text-on-surface" />
                                 </div>
                              ) : (
                                 <button
                                    onClick={() => {
                                       setActivePackId(pack.packId);
                                       setDrawnTrip(null);
                                       setIsDrawn(false);
                                       setAnimationStep('idle');
                                       setHasRevealedInActiveSession(false);
                                    }}
                                    className="py-1 px-3 bg-white border-2 border-on-surface shadow-[2px_2px_0px_black] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-[9.5px] font-mono font-black uppercase italic cursor-pointer"
                                 >
                                    Select
                                 </button>
                              )}
                           </div>
                        </div>
                      </div>
                    );
                 })}
              </div>
           </details>
        </div>

        {/* Logbook Accordion */}
        <div className="bg-white border-[3px] border-on-surface shadow-[8px_8px_0px_black] relative mt-4">
           {/* Folder / Binder divider tab notched overlay */}
           <div className="absolute top-0 left-6 -translate-y-full bg-[#FCF9F2] border-t-[3px] border-x-[3px] border-on-surface px-4 py-1 font-mono text-[9px] font-black uppercase tracking-wider text-on-surface/60 rounded-t-xl select-none">
              Archive_Logs
           </div>

           <details 
             id="field-log-details"
             open={isFieldLogExpanded} 
             onToggle={(e) => setIsFieldLogExpanded(e.currentTarget.open)}
             className="group"
           >
              <summary className="p-4 flex items-center justify-between cursor-pointer list-none select-none">
                 <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 border-2 border-on-surface flex items-center justify-center shadow-[3px_3px_0px_black]",
                      activeLogEntries.length > 0 ? "bg-brand-lime" : "bg-neutral-200"
                    )}>
                      <FileText className="w-4 h-4 text-on-surface" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                         <h3 className="font-display text-lg font-black uppercase italic tracking-tight leading-none text-on-surface">Logbook</h3>
                         {hasUrgentItems && (
                            <span className="shrink-0 bg-[#FF5A00] text-white text-[9px] font-mono font-black uppercase px-2.5 py-0.5 rounded border-2 border-on-surface shadow-[2px_2px_0px_black] animate-bounce">
                               {urgentCount} needs attention
                            </span>
                         )}
                      </div>
                      <p className="text-[10px] font-mono font-black uppercase tracking-widest text-[#FF5A00] mt-1 leading-none">
                         {activeLogEntries.length === 0 ? "NO ACTIVE FIELD LOGS" : `${activeLogEntries.length} ACTIVE LOGS`}
                      </p>
                    </div>
                 </div>
                 <div className="flex items-center gap-2">
                    {hasUrgentItems && <span className="w-2.5 h-2.5 rounded-full bg-[#FF5A00] animate-pulse" />}
                    <ChevronDown className="w-6 h-6 text-on-surface/30 group-open:rotate-180 transition-transform" />
                 </div>
              </summary>
              <div className="p-4 pt-0 bg-[#FCFAF5] border-t-2 border-on-surface/5">
                 <div className="space-y-3 max-h-[360px] overflow-y-auto custom-scrollbar pt-2">
                    {activeLogEntries.length > 0 ? (
                       activeLogEntries.slice(0, 8).map((entry) => {
                          const normalizedStatus = normalizeEntryStatus(entry.status);
                          const isUrgent = normalizedStatus === 'needs_more_proof' || normalizedStatus === 'rejected';
                          const isApprovedState = normalizedStatus === 'approved';

                          let badgeText = "Pending Review";
                          let badgeColor = "bg-neutral-100 text-on-surface/50 border-on-surface/20";

                          if (normalizedStatus === 'needs_more_proof') {
                             badgeText = "Needs Proof";
                             badgeColor = "bg-amber-100 text-amber-700 border-amber-300";
                          } else if (normalizedStatus === 'rejected') {
                             badgeText = "Rejected";
                             badgeColor = "bg-rose-100 text-rose-700 border-rose-300";
                          } else if (isApprovedState) {
                             badgeText = `Verified (+${entry.pointsAwarded} XP)`;
                             badgeColor = "bg-emerald-100 text-emerald-700 border-emerald-300";
                          }

                          return (
                             <div 
                               key={entry.id}
                               className={cn(
                                 "p-3 rounded-2xl border-2 transition-all bg-white relative overflow-hidden",
                                 isUrgent ? "border-[#FF5A00] shadow-[3px_3px_0px_black]" : "border-on-surface/10"
                               )}
                             >
                                <div className="flex gap-3 items-start">
                                   {/* Image thumbnail */}
                                   <div className="w-10 h-10 border border-on-surface/25 bg-neutral-100 shrink-0 overflow-hidden relative shadow-[1px_1px_0px_black] mt-0.5 animate-fadeIn">
                                      {entry.proofImage ? (
                                         <img src={entry.proofImage} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                                      ) : (
                                         <FileText className="w-5 h-5 text-on-surface/30" />
                                      )}
                                   </div>

                                   <div className="flex-grow min-w-0">
                                      <div className="flex justify-between items-baseline gap-1.5 flex-wrap sm:flex-nowrap">
                                         <h4 className="font-display uppercase text-xs font-black tracking-tight truncate leading-tight text-on-surface italic">
                                            {entry.tripTitle}
                                         </h4>
                                         <span className={cn(
                                           "shrink-0 text-[8px] font-mono font-black uppercase px-2 py-0.5 rounded-full border",
                                           badgeColor
                                         )}>
                                            {badgeText}
                                         </span>
                                      </div>

                                      <p className="text-[9px] font-mono font-black uppercase tracking-wide text-on-surface/30 leading-none mt-1">
                                         FILED: {entry.createdAt ? new Date(entry.createdAt.seconds ? entry.createdAt.seconds * 1000 : entry.createdAt).toLocaleDateString() : "RECENTLY"}
                                      </p>

                                      <p className="text-[10px] text-on-surface/70 mt-2 font-serif italic leading-snug">
                                         "{entry.fieldNote || 'No field notes provided.'}"
                                      </p>

                                      {(entry.adminNotes || (entry as any).adminNote) && (
                                         <div className="mt-2 text-[10px] font-mono text-rose-500 bg-rose-50/50 p-2 border border-rose-100">
                                            <span className="font-black">FEEDBACK_REASON:</span> "{entry.adminNotes || (entry as any).adminNote}"
                                         </div>
                                      )}

                                      {isUrgent && (
                                         <div className="mt-3 flex justify-end">
                                            <Link 
                                               to={`/capture?id=${entry.tripId}&isRetry=true&originalEntryId=${entry.id}`}
                                               className="px-3 py-1 bg-[#FF5A00] text-white border border-on-surface hover:bg-white hover:text-[#FF5A00] transition-all font-display text-[10px] font-black uppercase italic tracking-wider shadow-[2px_2px_0px_black]"
                                            >
                                               Retry Mission
                                            </Link>
                                         </div>
                                      )}
                                   </div>
                                </div>
                             </div>
                          );
                       })
                    ) : (
                       <div className="py-8 text-center text-on-surface/30 space-y-2">
                          <p className="text-xs font-mono font-black uppercase tracking-widest text-[#FF5A00]">
                             No field logs yet. Draw a mission to start.
                          </p>
                       </div>
                    )}
                 </div>
              </div>
           </details>
        </div>
      </div>


      <DiamondDecor />
      <MissionDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        mission={drawnTrip || activeTrip}
        progress={drawnTrip ? {} : missionProgress}
        isSubmitted={drawnTrip || activeTrip ? getChallengeStatus(canonicalProgress, (drawnTrip || activeTrip).id, activeTrip?.id || null) === 'pending_review' : false}
        isApproved={drawnTrip || activeTrip ? getChallengeStatus(canonicalProgress, (drawnTrip || activeTrip).id, activeTrip?.id || null) === 'approved' : false}
        onStart={() => {
          if (drawnTrip || activeTrip) {
            navigate(`/capture?id=${(drawnTrip || activeTrip).id}`);
          }
        }}
        onRedraw={drawnTrip ? () => handleDraw(true) : undefined}
        onHint={drawnTrip ? undefined : () => {
          if (activeTrip) {
            updateTripProgress(activeTrip.id, { hintUsed: true });
          }
        }}
        isHintUsed={drawnTrip ? false : hintUsed}
        isRedrawable={!!drawnTrip}
        statusLabel={activeTrip && !drawnTrip ? "ACTIVE_MISSION_SIGNAL" : "NEW_MISSION_DRAWN"}
      />
    </div>
  );
}
