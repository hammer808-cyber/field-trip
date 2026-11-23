// Missions page locked per Zach, Nov 18, 2026 — no additions or changes
// to this page until he says so.
// ONE-OFF LIFT (Nov 19, 2026, Zach's call, 19:21 PST): P0-3 ONLY — the
// deck draw keyboard path (DeckStack is now a real <button>; this comment
// is the only change to this file). The freeze stands for everything
// else; do not widen this lift without his word.
// ONE-OFF LIFT (Nov 20, 2026, Zach's call — earn-audit fix #3, Q2):
// Scene Starter's first_draw evaluation hook lives in AppContext
// drawTrip, not this file; this comment is the only change here.
// ONE-OFF LIFT (Nov 20, 2026, Zach's call): the Simple Words
// (FrankieModeCard) switch moved from above the deck to a slim
// always-visible row at the very bottom of this page — it used to hide
// when on, so it couldn't be turned back off from here.
// ONE-OFF LIFT (Nov 20, 2026, Zach's bug report — contrast): the
// NEEDS_MORE_PROOF warning chip and the adjacent REJECTED error chip
// now derive their icon color per skin (pickTextOnBackground) instead
// of hardcoded white — white failed on arcade warning (1.25:1) and
// arcade error (3.28:1). The freeze stands for everything else.
// ONE-OFF LIFT (Nov 21, 2026, Zach's word): deck meter restyle — the
// ticket-stub meter lives in DeckProgressMeter; this comment is the only
// change to this file.
// ONE-OFF LIFT (Nov 22, 2026, Zach's word — Missions style pass,
// revised the same day per his correction): the deck progress box is
// yellow/amber paper (heat-yellow sticky-note token) with corner tape
// strips holding it up and a plain text header (this file); the draw
// card title sits on a wide tape strip with the words written on it
// in Kalam (MissionActionPanel.tsx). The draw card paper ground and
// the deck cover display below are untouched.
// The freeze stands for everything else.
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';
import { useApp } from '../context/AppContext';
import { MOCK_TRIPS, FIELD_TYPES } from '../constants';
import { Card } from '../components/UI';
import { useTheme } from '../context/ThemeContext';
import { CheckCircle2, MapPin, AlertTriangle, ShieldAlert, Timer, Zap, Camera, Sun, RotateCcw, Info, Users, Lock, HelpCircle, CheckCircle, X, Sparkles, ArrowRight, FileText, Trophy, ChevronDown, Layers, Book, LayoutGrid } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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
import { FrankieModeCard } from '../components/FrankieModeCard';
import { DeckStack } from '../components/DeckStack';
import { getDefaultDeckPack, getDeckPackById, normalizeDeckPackId } from '../data/deckPacks';
import { getDeckCoverImage, BASE_DECK_PLACEHOLDER } from '../lib/deckUtils';
import { getWeeklyBonusForWeek } from '../data/weeklyBonuses';
import { StickerBackground } from '../components/StickerBackground';
import { StickerDecal, StickerCorner, StickerScatter } from '../components/StickerDecals';
import { isArchivedEntry, normalizeEntryStatus } from '../logic/entryLogic';
import { getTierLabel, isLocationAdaptiveCard, renderCardText } from '../logic/placeResolution';
import { pickTextOnBackground, skinVarHex } from '../logic/contrast';
import { DEFAULT_APP_SKIN } from '../skins/registry';
import { FEATURE_FLAGS } from '../config/featureFlags';
import { StarterCompletionState } from '../utils/starterHelper';
import { MARKER_STICKERS } from '../data/markers';
import { AvatarPreview } from '../components/AvatarPreview';
import { subscribeToRecentScoreEvents } from '../services/activityService';
import { ScoreEvent } from '../types/game';
import { LAUNCH_MISSION, LAUNCH_MISSION_ID } from '../data/specialMissions';
import { canAccessFeature, getChallengeStatus, getDeckProgress, getStarterProgress } from '../services/canonicalProgress';

import { FIELD_MATERIALS, FIELD_SHADOWS, FIELD_TYPOGRAPHY } from '../utils/styleHelpers';

const DECK_CHOOSER_INTRO_ACK_KEY = 'fieldtrip_deck_chooser_intro_ack';

// Bound on a draw attempt (Nov 18, 2026): the Firestore writes inside
// drawTrip (profile update + mission-card save) can pend indefinitely when
// long-polling stalls on a flaky connection, which stranded the deck on
// "RELEASING..." with every retry blocked by handleDraw's guard. Past this,
// the draw resets to idle so the player can tap Draw again; the optimistic
// activeTrip update already applied, so the drawn mission still waits in
// the small row above the deck.
const DRAW_TRIP_TIMEOUT_MS = 15000;

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
import { FrankieQuiet } from '../components/FrankieQuiet';
import { DeckProgressMeter } from '../components/missions/DeckProgressMeter';
import { MissionActionPanel } from '../components/missions/MissionActionPanel';
import { MissionsGuidanceStrip, getMissionsStripRole } from '../components/missions/MissionsGuidanceStrip';
import { SAVE_FOR_LATER_RECOVERY_NOTICE } from '../components/bottomNavPresentation';
import { usePlayerGuidance } from '../hooks/usePlayerGuidance';
import { resolveMissionsGuidancePrimaryAction } from '../logic/playerGuidance';
import { acknowledgeDeckCompleteSeen } from '../services/deckCompleteAck';

export default function DeckPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedPackId = searchParams.get('pack');
  const shouldAckIntroFromUrl = searchParams.get('intro') === 'ack';
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [deckChooserIntroDismissed, setDeckChooserIntroDismissed] = useState(() => (
    typeof window !== 'undefined' && localStorage.getItem(DECK_CHOOSER_INTRO_ACK_KEY) === 'true'
  ));
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
    isAdmin, isHeatwaveDeckUnlocked, isSocalSummerUnlocked, mustCompleteStarterMission, authLoading,
    needsMoreProofChallengeIds, rejectedChallengeIds,
    drawnMissionCards, updateMissionCardStatus, setActiveMissionCard, canonicalProgress, progressMismatches,
    deckPacks, visibleDeckPacks, getDeckAccessForPack
  } = useApp();
  const guidance = usePlayerGuidance();
  const stripRole = getMissionsStripRole(guidance.state);
  const demoteMissionBrowsing = stripRole === 'dominant';
  const [savedForLaterNotice, setSavedForLaterNotice] = useState<string | null>(null);
  const { frankieMode, skin, fc } = useTheme();

  // Nov 20, 2026 (contrast fix): the REJECTED / NEEDS_MORE_PROOF icon
  // chips sit on skin error/warning backgrounds, so their icon color is
  // derived per skin — hardcoded white failed on arcade warning (1.25:1)
  // and arcade error (3.28:1). Same pickTextOnBackground pattern as P0-2.
  const warningText = pickTextOnBackground(skinVarHex('--skin-warning', DEFAULT_APP_SKIN.designTokens.warning));
  const errorText = pickTextOnBackground(skinVarHex('--skin-error', DEFAULT_APP_SKIN.designTokens.error));

  const [activePackId, setActivePackId] = useState<string>(() => {
    if (!isOnboardingComplete && !isAdmin) return 'starter-signals';
    
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const packFromUrl = params.get('pack');
      if (packFromUrl) return normalizeDeckPackId(packFromUrl);
      const saved = localStorage.getItem('active_deck_pack_id');
      if (saved) {
        const normalizedSaved = normalizeDeckPackId(saved);
        // Simple security check: if it's summer and not unlocked by date/admin, fallback
        if (normalizedSaved === 'heatwave-receipts' && !isHeatwaveDeckUnlocked && !isAdmin) {
          return 'starter-signals';
        }
        return normalizedSaved;
      }
    }
    return getDefaultDeckPack().packId;
  });

  // Security Guard: Sync active pack with onboarding/unlock status
  // Don't snap the deck while auth is still loading: isAdmin and
  // isOnboardingComplete read false until the session resolves, and snapping
  // then would discard a deck the user just picked (e.g. from the DEX shelf).
  useEffect(() => {
    if (authLoading) return;

    if (!isOnboardingComplete && !isAdmin && activePackId !== 'starter-signals') {
      setActivePackId('starter-signals');
    }

    const activeVisible = visibleDeckPacks.some(pack => pack.packId === activePackId);
    if (isOnboardingComplete && !activeVisible && visibleDeckPacks.length > 0) {
      setActivePackId(visibleDeckPacks[0].packId);
    }
    
    // Fallback if they somehow have Summer active but it's not even June 6 yet and they aren't Admin
    if (activePackId === 'heatwave-receipts' && !isHeatwaveDeckUnlocked && !isAdmin) {
      setActivePackId(isOnboardingComplete ? (visibleDeckPacks[0]?.packId || 'starter-signals') : 'starter-signals');
    }
  }, [authLoading, isOnboardingComplete, isHeatwaveDeckUnlocked, isAdmin, activePackId, visibleDeckPacks]);

  // Save active pack ID to localStorage
  useEffect(() => {
    if (activePackId && typeof window !== 'undefined') {
      localStorage.setItem('active_deck_pack_id', activePackId);
    }
  }, [activePackId]);

  useEffect(() => {
    const normalizedRequestedPackId = requestedPackId ? normalizeDeckPackId(requestedPackId) : '';
    if (normalizedRequestedPackId && normalizedRequestedPackId !== activePackId) {
      setActivePackId(normalizedRequestedPackId);
    }
  }, [requestedPackId, activePackId]);

  useEffect(() => {
    if (!shouldAckIntroFromUrl || !user) return;
    localStorage.setItem(DECK_CHOOSER_INTRO_ACK_KEY, 'true');
    setDeckChooserIntroDismissed(true);
    updateProfile(user.uid, { hasSeenDeckChooserIntro: true }).catch(err => {
      console.warn('[Deck] Failed to persist deck chooser intro URL acknowledgement:', err);
    });
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('intro');
    setSearchParams(nextParams, { replace: true });
  }, [shouldAckIntroFromUrl, user?.uid]);
  
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

  // Face-up browse: the grid of this deck's cards lives behind a button
  // next to the deck (an accommodation for players who want to see all
  // options at once and pick, instead of only drawing blind).
  const [showBrowse, setShowBrowse] = useState(false);
  const browseSectionRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (showBrowse) {
      browseSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [showBrowse]);

  const activeLogEntries = React.useMemo(() => entries.filter(entry => !isArchivedEntry(entry)), [entries]);



  const getPackLockState = (pack: any) => {
    if (!pack) return { locked: false, reason: "" };
    const packId = pack.packId;
    const access = getDeckAccessForPack(pack);
    if (!access.playable) {
      return {
        locked: true,
        reason: access.reason || "Private field assignment"
      };
    }
    
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

  const getFirstPlayablePostStarterPackId = () => {
    const preferred = visibleDeckPacks.find(pack => pack.packId === 'heatwave-receipts');
    if (preferred && getPackLockState(preferred).locked === false) return preferred.packId;

    const playable = visibleDeckPacks.find(pack => (
      pack.packId !== 'starter-signals' && getPackLockState(pack).locked === false
    ));

    return playable?.packId || visibleDeckPacks[0]?.packId || 'starter-signals';
  };

  const acknowledgeDeckChooserIntro = async () => {
    if (!user) return;
    if (typeof window !== 'undefined') {
      localStorage.setItem(DECK_CHOOSER_INTRO_ACK_KEY, 'true');
    }
    setDeckChooserIntroDismissed(true);
    try {
      await updateProfile(user.uid, { hasSeenDeckChooserIntro: true });
    } catch (err) {
      console.error("Failed to save deck chooser intro acknowledgement:", err);
    }
  };

  const choosePostStarterDeck = async () => {
    const nextPackId = getFirstPlayablePostStarterPackId();
    setActivePackId(nextPackId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('active_deck_pack_id', nextPackId);
    }
    await acknowledgeDeckChooserIntro();
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
  const activePack = deckPacks.find(pack => pack.packId === activePackId) || getDeckPackById(activePackId);
  const activeDeckName = activePack ? activePack.packName : (activePackId === 'starter-signals' ? 'Starter Deck' : 'Themed Deck');
  const activeDeckShortName = activePack ? activePack.shortName : 'DECK';
  const totalDeckChallenges = activePack ? activePack.missionIds.length : 0;
  // Face-up browse: every card in the active deck, so players can pick by
  // looking instead of only drawing blind. Locked cards stay visible in the
  // library (previewable, not startable) via DeckLibrary's status logic.
  const browseChallenges = activePack
    ? MOCK_TRIPS.filter(t => activePack.missionIds.includes(t.id as string))
    : MOCK_TRIPS;

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
      console.log('[Deck Diagnostics] %s:', activePackId, {
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
           (isExhausted ? getDisplayLabel("DECK_EXHAUSTED") : getDisplayLabel("DRAW_A_MISSION"))),
    sublabel: starterHasNeedsMoreProof ? "Needs a clearer photo" :
              starterHasRejected ? "Try this mission again" :
              isStarterConfigurationBlocked ? "Check back soon" :
              isPendingReviewLimit ? "Too many proofs in review" : 
              (isWaitingForReview ? "Proof is in review" : 
              (isExhausted ? (isDeckCompleted ? "Deck complete" : getDisplayLabel("MISSION_LIMIT_REACHED")) : 
              (isStarter ? "Starter signals ready" : "Ready to draw"))),
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

  // Sync initial state from a same-session reveal, or from a persisted
  // mission that needs action (repair / retry). A plain resumed mission
  // (RESUME_ACTIVE_MISSION) no longer re-expands the poster on return —
  // Nov 17, 2026 (Zach's call): Missions opens on the deck, and an
  // unfinished mission waits in a small row above it instead.
  useEffect(() => {
    const shouldResumePersisted = guidance.state === 'REPAIR_PROOF'
      || guidance.state === 'RETRY_REJECTED_PROOF';
    if (activeTrip && !drawnTrip && (hasRevealedInActiveSession || shouldResumePersisted)) {
      setIsDrawn(true);
      setAnimationStep('settling');
    }
  }, [activeTrip, trips.length, hasRevealedInActiveSession, guidance.state, drawnTrip]);

  const handleDraw = async (isRedraw: boolean = false, packIdOverride?: string) => {
    const drawPackId = packIdOverride || activePackId;
    // When switching packs for DECK_COMPLETE, do not apply starter-pack exhausted lock.
    const drawingFromOverridePack = !!packIdOverride && packIdOverride !== activePackId;
    if (
      isDrawing
      || (!drawingFromOverridePack && isStarterConfigurationBlocked)
      || (!drawingFromOverridePack && isExhausted && !activeTrip)
      || animationStep === 'drawing'
      || animationStep === 'flipping'
    ) return;

    if (packIdOverride && packIdOverride !== activePackId) {
      setActivePackId(packIdOverride);
    }

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
      // Bound the draw (Nov 18, 2026 — stuck draw): drawTrip awaits two
      // Firestore writes that can pend indefinitely when long-polling stalls,
      // which left the deck on "RELEASING..." forever with the guard above
      // blocking every retry. The race caps the wait; on timeout the null
      // branch below resets the panel to idle so the player can draw again.
      let drawTimeoutId: ReturnType<typeof setTimeout> | undefined;
      let drawTimedOut = false;
      const trip = await Promise.race([
        drawTrip(undefined, FEATURE_FLAGS.ENABLE_DECK_PACK_DRAW_LOGIC ? drawPackId : undefined),
        new Promise<null>((resolve) => {
          drawTimeoutId = setTimeout(() => {
            drawTimedOut = true;
            resolve(null);
          }, DRAW_TRIP_TIMEOUT_MS);
        }),
      ]);
      if (drawTimeoutId) clearTimeout(drawTimeoutId);

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
        console.warn(drawTimedOut
          ? "[Deck] handleDraw: drawTrip timed out. Resetting so the player can draw again."
          : "[Deck] handleDraw: drawTrip returned null. Pool may be exhausted.");
        
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

  // Put the card back on the deck: only a freshly drawn card (not yet an
  // active mission) can be returned. A resumed active mission stays put —
  // the sync effect above would re-expand it anyway.
  const canPutBack = !!drawnTrip && !activeTrip;
  const handlePutBack = () => {
    if (!canPutBack) return;
    setIsDrawn(false);
    setDrawnTrip(null);
    setHasRevealedInActiveSession(false);
    setAnimationStep('idle');
  };

  const deckLockState = getPackLockState(activePack);
  const deckDiagnosticsPanel = (isAdmin || import.meta.env.DEV) ? (
    <DeckDiagnosticsPanel
      userId={user?.uid || null}
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
  if (user && isOnboardingComplete && !profile?.hasSeenDeckChooserIntro && !deckChooserIntroDismissed) {
    return (
      <div className={cn(
        "skin-page skin-deck-browser min-h-screen flex flex-col justify-center items-center p-4 sm:p-8 font-sans relative overflow-hidden",
        isBaja ? "bg-baja-sand text-baja-pink" :
        isDiamond ? "bg-black text-white" :
        isHeat ? "bg-heat-yellow text-white" :
        "bg-paper text-on-surface"
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
          <button
            type="button"
            aria-label="Close starter completion intro"
            onClick={acknowledgeDeckChooserIntro}
            className="absolute top-3 right-3 z-40 w-10 h-10 rounded-full bg-white border-2 border-on-surface shadow-[3px_3px_0px_black] flex items-center justify-center text-on-surface hover:bg-brand-lime active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            <X className="w-5 h-5 stroke-[3]" />
          </button>

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
              onClick={choosePostStarterDeck}
              className="flex-1 field-cta field-cta--urgent py-5 text-xl flex items-center justify-center gap-3"
            >
              <span>{fc('Choose Summer Deck', 'CHOOSE SUMMER DECK')}</span>
              <ArrowRight className="w-6 h-6 stroke-[3]" />
            </button>

            <button
              onClick={acknowledgeDeckChooserIntro}
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

  // Scroll to top on load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const activeDeckDisplayName = (() => {
    const shortName = (activePack?.shortName || activeDeckShortName).toUpperCase();
    const fullName = (activePack?.packName || activeDeckName).toUpperCase();
    return fullName.startsWith(shortName) ? fullName : `${shortName}: ${fullName}`;
  })();



  const displayedMission = drawnTrip || activeTrip;
  // Urban Recon (Nov 21, 2026): the drawn card's resolved place fills
  // the {place} slot for display. The bank card is never mutated; the
  // resolved copy is what the poster renders. Before the background
  // resolver lands, the generic text shows.
  const displayedResolvedPlace = displayedMission
    ? drawnMissionCards.find(c => c.missionId === displayedMission.id)?.resolvedPlace ?? null
    : null;
  const displayedMissionResolved = displayedMission
    ? (() => {
        const text = renderCardText(displayedMission, displayedResolvedPlace);
        return { ...displayedMission, mission: text.mission, description: text.description, shortPrompt: text.shortPrompt };
      })()
    : displayedMission;
  const displayedMissionStatus = displayedMission
    ? getChallengeStatus(canonicalProgress, displayedMission.id, activeTrip?.id || null)
    : null;
  const missionPanelStatus = displayedMissionStatus === 'approved'
    ? 'Approved'
    : displayedMissionStatus === 'pending_review'
      ? 'Pending review'
      : displayedMissionStatus === 'needs_more_proof'
        ? 'Needs more proof'
      : displayedMissionStatus === 'rejected'
          ? 'Retry required'
          : isDrawn && displayedMission
            ? (guidance.state === 'REPAIR_PROOF'
              ? 'Needs more proof'
              : guidance.state === 'RETRY_REJECTED_PROOF'
                ? 'Retry required'
                : 'In progress')
            : displayState.label;
  const missionPanelTitle = isDrawn && displayedMission
    ? displayedMission.title
    : deckLockState.locked
      ? 'Deck access'
      : 'Draw your next mission';

  // The lime header badge is a real draw button only in the normal draw
  // branch (Nov 18, 2026): in the starter COMPLETE / REJECTED / NEEDS
  // MORE PROOF / PENDING states the deck area shows a status panel
  // instead of the deck, so there is nothing to draw there.
  const isNormalDrawBranch = !(isStarter && (starterState.status === 'COMPLETE' || starterState.status === 'REJECTED_RETRY_AVAILABLE' || starterState.status === 'NEEDS_MORE_PROOF' || starterState.status === 'PENDING_REVIEW'));

  // Guided Starter Mission Mode for Launch
  if (mustCompleteStarterMission && !isAdmin) {
    const launchMission = trips.find(t => t.id.toLowerCase() === LAUNCH_MISSION_ID.toLowerCase()) || LAUNCH_MISSION;
    
    return (
      <div className="skin-page skin-deck-browser min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-6 space-y-12 relative overflow-hidden">
        {/* Background Grain */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[url('/assets/textures/handmade-paper.png')] mix-blend-multiply" />
        
        <div className="text-center space-y-2 relative z-10">
           <div className="w-fit mx-auto bg-brand-orange text-black text-[9px] font-mono font-black px-2 py-0.5 border-2 border-on-surface shadow-[2px_2px_0px_black] uppercase rotate-[-2deg] mb-1">
             {getDisplayLabel('TRANSMISSION_RECEIVED')}
           </div>
           <h1 className="font-display text-3xl sm:text-4xl font-black uppercase italic tracking-tighter leading-none">Your Mission</h1>
           <p className="text-on-surface/50 font-mono text-[10px] uppercase tracking-[0.2em] font-black">Starter 1 of 3</p>
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
                      statusLabel={isDrawing ? "Drawing..." : getDisplayLabel('DRAW_A_MISSION')}
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
                    <span>{getDisplayLabel('DRAW_A_MISSION')}</span>
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
                    progress={profile?.tripProgress?.[(drawnTrip || launchMission)?.id]}
                    showActions={false}
                    className="shadow-[20px_20px_0px_black] rounded-[2rem] border-[4px] border-on-surface"
                  />
                  <div className="w-full space-y-4">
                    <button
                      id="start-mission-button" onClick={() => navigate(`/capture?id=${(drawnTrip || launchMission)?.id}`)}
                      className="w-full py-6 bg-brand-orange text-white border-[4px] border-on-surface shadow-[0_12px_0px_black] active:shadow-none active:translate-y-3 transition-all font-display text-4xl font-black uppercase italic tracking-tight flex items-center justify-center gap-4"
                    >
                      <Camera className="w-10 h-10" />
                      <span>{getDisplayLabel('DO_THIS_MISSION')}</span>
                    </button>
                    <p className="text-[10px] font-mono font-black text-center text-on-surface/30 uppercase tracking-widest">
                      Next: open your camera and take proof
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

  return (
    <div className={cn(
      "skin-page skin-deck-browser page-scroll relative ft-paper-texture",
      isBaja ? "bg-baja-sand" : isDiamond ? "bg-black" : isHeat ? "bg-heat-yellow" : "bg-paper-light",
      "text-on-surface"
    )}>
      <FieldPageHero
        eyebrow={getDisplayLabel('MISSION_DRAW_SYSTEM')}
        title="MISSIONS"
        subtitle={frankieMode ? undefined : 'Draw a card. Take a photo. Bring back a receipt.'}
        backgroundIcon={<Layers className="w-64 h-64" />}
        variant="editorial"
      />

      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-24 pt-5 sm:px-6 sm:pt-6">

        {/* Deck progress lives in the header now (Nov 17, 2026, Zach's
            call): the big deck card is gone for every deck, so the
            approved/pending counts and the shaded bar sit here under the
            hero instead. It shows always — drawn or not. */}
        <div
          className="relative mb-6 border-[3px] border-[var(--skin-border)] bg-[var(--color-heat-yellow)] px-4 pb-4 pt-5 shadow-[5px_5px_0_var(--skin-border)]"
          style={{ borderRadius: 'var(--skin-card-radius, 8px)' }}
        >
          {/* Tape strips holding the sheet up (Nov 22, 2026, lift #7). */}
          <span aria-hidden="true" className="pointer-events-none absolute -top-3 left-4 z-20" style={{ transform: 'rotate(-5deg)' }}>
            <span className="field-tape block" />
          </span>
          <span aria-hidden="true" className="pointer-events-none absolute -top-3 right-4 z-20" style={{ transform: 'rotate(5deg)' }}>
            <span className="field-tape block" />
          </span>
          {/* Full ink, not muted: on the amber paper the muted tone
              drops to ~3.7:1; full ink is ~10.5:1. */}
          <p className="mb-2 font-mono text-[9px] font-black uppercase tracking-widest text-[var(--skin-text)]">
            {activeDeckDisplayName}
          </p>
          <DeckProgressMeter
            approvedCount={approvedDeckChallengesCount}
            pendingCount={pendingDeckChallengesCount}
            totalCount={totalDeckChallenges}
            approvedPercent={deckProgressPercent}
            pendingPercent={deckPendingPercent}
            compact
          />
        </div>

        <main className="min-w-0 space-y-6">
            {savedForLaterNotice && (
              <div className="mb-4 border-2 border-[var(--skin-border)] bg-[var(--skin-secondary)] px-4 py-3 font-sans text-sm font-bold text-[var(--skin-text)]" role="status">
                {savedForLaterNotice}
              </div>
            )}
            {/* No banner while a mission is drawn and waiting (Nov 17,
                2026): in the RESUME_ACTIVE_MISSION state the strip repeats
                the mission name, the waiting state, and the resume action
                that the mission card below already carries. No banner in
                the DRAW_MISSION state either (Nov 18, 2026, Zach's call,
                red-circled screenshot): the draw-another panel duplicated
                the lime header draw button and the deck tap, so it is gone
                from Missions. Every other state still shows it — including
                the critical repair/retry states, where the strip is the
                recovery guidance. */}
            {guidance.state !== 'RESUME_ACTIVE_MISSION' && guidance.state !== 'DRAW_MISSION' && (
            <MissionsGuidanceStrip
              guidance={guidance}
              onPrimary={() => {
                const action = resolveMissionsGuidancePrimaryAction(guidance);
                if (guidance.state === 'DECK_COMPLETE' && user?.uid && guidance.finishedDeckId) {
                  void acknowledgeDeckCompleteSeen(
                    user.uid,
                    guidance.finishedDeckId,
                    starterState.starterApprovedCount || onboardingCompletedCount || 3,
                  ).catch((error) => {
                    console.warn('[Deck] Failed to acknowledge deck completion:', error);
                  });
                }
                if (action.kind === 'draw-pack' && !isDrawn) {
                  navigate(action.destination, { replace: true });
                  void handleDraw(false, action.packId);
                  return;
                }
                if (action.kind === 'draw-current' && !isDrawn && !isWaitingForReview) {
                  void handleDraw();
                  return;
                }
                if (action.kind === 'retry-proof' && action.missionId) {
                  void retryMissionSubmission(action.missionId).then(() => navigate(action.destination));
                  return;
                }
                navigate(action.destination);
              }}
              onSecondary={guidance.secondaryAction
                ? () => navigate(guidance.secondaryAction!.destination)
                : undefined}
            />
            )}
            <MissionActionPanel
              eyebrow={isDrawn ? 'Current assignment' : 'Mission draw'}
              title={missionPanelTitle}
              status={missionPanelStatus}
              onDraw={!isDrawn && isNormalDrawBranch ? () => handleDraw() : undefined}
              drawDisabled={isDrawing || isStarterConfigurationBlocked || (isExhausted && !activeTrip) || isWaitingForReview}
              className={cn(demoteMissionBrowsing && isDrawn && 'ring-4 ring-[var(--skin-secondary)] ring-offset-2')}
            >
        {/* The sticker sheet: the deck and the mission both live on the same
            cream graph-paper page (StickerBook's recipe), so the flip and the
            expand read as one card on one sheet. */}
        <LayoutGroup>
        <div className="relative overflow-hidden border-4 border-on-surface bg-[#F5E9C9] shadow-[10px_10px_0px_black]">
          <div className="absolute inset-0 opacity-40 pointer-events-none bg-[linear-gradient(rgba(62,109,157,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(62,109,157,0.18)_1px,transparent_1px)] bg-[size:22px_22px]" aria-hidden="true" />
          <div className="relative p-4 sm:p-6">
        <AnimatePresence mode="wait">
          {!isDrawn ? (
            <motion.div 
              key="deck-hero"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              className="flex flex-col items-center space-y-6 py-1"
            >
              {isStarter && starterState.status === 'COMPLETE' ? (
                <div className="w-full animate-fade-in space-y-5 py-4 text-center">
                  <div className="mx-auto flex h-20 w-20 rotate-3 items-center justify-center rounded-[var(--skin-badge-radius)] border-2 border-[var(--skin-border)] bg-[var(--skin-secondary)] text-[var(--skin-on-secondary)] shadow-[4px_4px_0_var(--skin-border)]">
                    <CheckCircle className="w-10 h-10 text-on-surface" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="font-display text-4xl font-black uppercase italic tracking-tight text-on-surface">Starter Complete</h2>
                    <p className="text-sm font-mono font-bold text-on-surface uppercase tracking-wider">{getDisplayLabel('HEATWAVE_RECEIPTS')} unlocked</p>
                  </div>
                  <button
                    onClick={() => {
                      setActivePackId(getFirstPlayablePostStarterPackId());
                      setIsDrawn(false);
                      setDrawnTrip(null);
                      setHasRevealedInActiveSession(false);
                    }}
                    className="skin-button flex min-h-14 w-full cursor-pointer items-center justify-center gap-3 border-[3px] border-[var(--skin-border)] bg-[var(--skin-secondary)] px-4 py-4 font-display text-2xl font-black uppercase italic tracking-normal text-[var(--skin-on-secondary)] shadow-[var(--skin-button-shadow)] transition-all active:translate-y-1 active:shadow-none"
                  >
                    <Sun className="w-6 h-6 fill-current animate-spin-slow" />
                    <span>Enter {getDisplayLabel('HEATWAVE_RECEIPTS')}</span>
                  </button>
                </div>
              ) : isStarter && starterState.status === 'REJECTED_RETRY_AVAILABLE' ? (
                <div className="w-full animate-fade-in space-y-5 py-4 text-center">
                  <div className="mx-auto flex h-20 w-20 -rotate-3 items-center justify-center rounded-[var(--skin-badge-radius)] border-2 border-[var(--skin-border)] bg-[var(--skin-error)] shadow-[4px_4px_0_var(--skin-border)]" style={{ color: errorText }}>
                    <RotateCcw className="w-10 h-10" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="font-display text-4xl font-black uppercase italic tracking-tight text-on-surface">Mission Rejected</h2>
                    <FrankieQuiet frankieMode={frankieMode}>
                      <p className="text-xs font-sans font-bold text-on-surface/60 max-w-xs mx-auto">This one didn’t pass review. Ready for a second take? Retries help verify your field standing.</p>
                    </FrankieQuiet>
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
                    className="skin-button flex min-h-14 w-full cursor-pointer items-center justify-center gap-3 border-[3px] border-[var(--skin-border)] bg-[var(--skin-primary)] px-4 py-4 font-display text-2xl font-black uppercase italic tracking-normal text-[var(--skin-on-primary)] shadow-[var(--skin-button-shadow)] transition-all active:translate-y-1 active:shadow-none"
                  >
                    <RotateCcw className="w-6 h-6" />
                    <span>Retry Mission</span>
                  </button>
                </div>
              ) : isStarter && starterState.status === 'NEEDS_MORE_PROOF' ? (
                <div className="w-full animate-fade-in space-y-5 py-4 text-center">
                  <div className="mx-auto flex h-20 w-20 -rotate-3 items-center justify-center rounded-[var(--skin-badge-radius)] border-2 border-[var(--skin-border)] bg-[var(--skin-warning)] shadow-[4px_4px_0_var(--skin-border)]" style={{ color: warningText }}>
                    <AlertTriangle className="w-10 h-10 animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="font-display text-4xl font-black uppercase italic tracking-tight text-on-surface">More proof needed</h2>
                    <FrankieQuiet frankieMode={frankieMode}>
                      <p className="text-xs font-sans font-bold text-on-surface/60 max-w-xs mx-auto">The Bureau requires additional documentation for your starter signals to verify.</p>
                    </FrankieQuiet>
                  </div>
                  <button
                    onClick={() => {
                      if (starterNeedsMoreProofId) {
                        navigate(`/capture?id=${starterNeedsMoreProofId}`);
                      } else {
                        navigate('/profile');
                      }
                    }}
                    className="skin-button flex min-h-14 w-full cursor-pointer items-center justify-center gap-3 border-[3px] border-[var(--skin-border)] bg-[var(--skin-primary)] px-4 py-4 font-display text-2xl font-black uppercase italic tracking-normal text-[var(--skin-on-primary)] shadow-[var(--skin-button-shadow)] transition-all active:translate-y-1 active:shadow-none"
                  >
                    <Camera className="w-6 h-6" />
                    <span>Add More Proof</span>
                  </button>
                </div>
              ) : isStarter && starterState.status === 'PENDING_REVIEW' ? (
                <div className="w-full animate-fade-in space-y-5 py-4 text-center">
                  <div className="mx-auto flex h-20 w-20 rotate-2 items-center justify-center rounded-[var(--skin-badge-radius)] border-2 border-[var(--skin-border)] bg-[var(--skin-surface-muted)] text-[var(--skin-primary)] shadow-[4px_4px_0_var(--skin-border)]">
                    <Timer className="w-10 h-10 text-brand-orange animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="font-display text-4xl font-black uppercase italic tracking-tight text-on-surface">Pending Review</h2>
                    <FrankieQuiet frankieMode={frankieMode}>
                      <p className="text-xs font-sans font-bold text-on-surface/60 max-w-xs mx-auto">
                        All three Starter Signals are in review. Your next route unlocks once they are approved.
                      </p>
                    </FrankieQuiet>
                  </div>
                  <button
                    onClick={() => navigate('/profile?tab=history')}
                    className="skin-button flex min-h-14 w-full cursor-pointer items-center justify-center gap-3 border-[3px] border-[var(--skin-border)] bg-[var(--skin-surface)] px-4 py-4 font-display text-2xl font-black uppercase italic tracking-normal text-[var(--skin-text)] shadow-[var(--skin-button-shadow)] transition-all active:translate-y-1 active:shadow-none"
                  >
                    <FileText className="w-6 h-6" />
                    <span>View Proof Status</span>
                  </button>
                </div>
              ) : (
                <>
                  <div className="w-full max-w-[320px] sm:max-w-[27rem] mx-auto">
                    <DeckStack 
                      onDraw={() => handleDraw()}
                      isDrawing={isDrawing}
                      disabled={isDrawing || isStarterConfigurationBlocked || (isExhausted && !activeTrip) || isWaitingForReview}
                      activeMission={null}
                      activePack={activePack}
                      poolEmpty={isExhausted && !activeTrip}
                      isWaitingForReview={isWaitingForReview}
                      layoutId="mission-draw-card"
                      statusLabel={
                        animationStep === 'drawing' ? "RELEASING..." : 
                        animationStep === 'flipping' ? "DECODING..." : 
                        displayState.label
                      }
                    />
                  </div>

                  <div className="w-full space-y-4">
                  {/* The big black DRAW A MISSION button lived here (removed
                      Nov 18, 2026, Zach's call): the deck itself is the
                      draw affordance now, and the lime header badge draws
                      too. The blocked/exhausted state still shows in the
                      header badge, the status line below, and the deck's
                      own prompt. */}
                    {/* See-all-cards: for players who want every option at
                        once — opens the grid of this deck's cards and
                        missions below, instead of drawing blind. */}
                    <button
                      type="button"
                      onClick={() => setShowBrowse((v) => !v)}
                      aria-expanded={showBrowse}
                      className="skin-button flex min-h-12 w-full cursor-pointer items-center justify-center gap-3 border-[3px] border-[var(--skin-border)] bg-[var(--skin-surface)] px-4 py-3 font-display text-lg font-black uppercase italic tracking-normal text-[var(--skin-text)] shadow-[var(--skin-button-shadow)] transition-all active:translate-y-1 active:shadow-none"
                    >
                      <LayoutGrid className="w-5 h-5" />
                      <span>{showBrowse ? (frankieMode ? 'Hide the cards' : 'HIDE ALL CARDS') : (frankieMode ? 'See all cards' : 'SEE ALL CARDS')}</span>
                      <ChevronDown className={cn('w-5 h-5 transition-transform', showBrowse && 'rotate-180')} />
                    </button>

                  {(isDrawing || isStarterConfigurationBlocked || (isExhausted && !activeTrip) || isWaitingForReview) ? (
                    <p className="text-center text-sm font-sans font-bold text-on-surface/70 pt-1">
                      {isWaitingForReview
                        ? 'Your proof is waiting for review. You can draw again after it is checked.'
                        : isPendingReviewLimit
                          ? 'Too many proofs are waiting for review.'
                          : isStarterConfigurationBlocked
                            ? 'Starter missions are unavailable right now. Check back soon.'
                            : isExhausted
                              ? (isDeckCompleted ? 'This deck is complete.' : 'No missions left to draw in this deck.')
                              : displayState.sublabel}
                    </p>
                  ) : (
                  <div className="flex flex-col items-center gap-1.5 opacity-30">
                    <p className="text-[9px] font-mono font-black uppercase tracking-[0.4em] text-on-surface text-center">
                      {displayState.sublabel}
                    </p>
                    <div className="w-16 h-0.5 bg-on-surface/20 rounded-full" />
                  </div>
                  )}
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
               {/* Put-back lives here now (Nov 17, 2026): a freshly drawn
                   card can go back on the deck, and nothing else — no deck
                   name, no source line. The deck info lives on
                   Basecamp. */}
               {canPutBack && (
                 <button
                   type="button"
                   onClick={handlePutBack}
                   className="mb-4 font-mono text-[10px] font-black uppercase tracking-widest text-on-surface/60 underline underline-offset-4 hover:text-on-surface"
                 >
                   Put this card back on the deck
                 </button>
               )}
               <motion.div
                 layoutId="mission-draw-card"
                 transition={{ layout: { delay: 0.45, duration: 0.55, ease: [0.22, 1, 0.36, 1] } }}
                 className="relative group"
               >
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
                      mission={displayedMissionResolved} 
                      progress={profile?.tripProgress?.[(drawnTrip || activeTrip)?.id]}
                      onStart={() => navigate(`/capture?id=${(drawnTrip || activeTrip)?.id}`)}
                      isRedrawable={false}
                      showActions={false}
                      className="skin-mission-card shadow-[var(--skin-card-shadow)]"
                    />
                  </motion.div>

                  {/* Urban Recon (Nov 21, 2026): which place the card
                      resolved to, and how far the net went. Shows once
                      the background resolver lands. */}
                  {displayedResolvedPlace && isLocationAdaptiveCard(displayedMission) && (
                    <p className="mt-4 text-center font-mono text-xs font-black uppercase tracking-[0.2em] text-on-surface/60">
                      {displayedResolvedPlace.name} — {getTierLabel(displayedResolvedPlace)}
                    </p>
                  )}

                  {/* Decorative Labels */}
                  <div className="absolute -top-3 -right-2 z-20 flex flex-col items-end gap-1 pointer-events-none">
                    <div className="bg-brand-lime text-on-surface text-[9px] font-black uppercase px-3 py-1 border-2 border-on-surface shadow-[4px_4px_0px_black] rotate-2">
                       SIGNAL_LOCKED
                    </div>
                  </div>
               </motion.div>
               
              <div className="mt-7 space-y-4">
                <button
                  onClick={async () => {
                    try {
                      const mission = drawnTrip || activeTrip;
                      if (!mission) {
                        console.warn("[Deck] No mission found for Start Mission button.");
                        navigate('/missions');
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
                  id="start-mission-button-alt" className="skin-button flex min-h-16 w-full cursor-pointer items-center justify-center gap-3 border-[4px] border-[var(--skin-border)] bg-[var(--skin-primary)] px-4 py-4 font-display text-2xl font-black uppercase italic tracking-normal text-[var(--skin-on-primary)] shadow-[var(--skin-button-shadow)] transition-all active:translate-y-1 active:shadow-none sm:text-3xl"
                >
                  <Camera className="h-8 w-8" />
                  <span>{getDisplayLabel('DO_THIS_MISSION')}</span>
                </button>

                <div className="flex flex-col items-center gap-2 pt-1">
                  <button
                    onClick={async () => {
                      try {
                        const missionId = (drawnTrip || activeTrip).id;
                        await updateMissionCardStatus(missionId, 'saved_for_later', { isActive: false });
                        setIsDrawn(false);
                        setDrawnTrip(null);
                        setHasRevealedInActiveSession(false);
                        setSavedForLaterNotice(SAVE_FOR_LATER_RECOVERY_NOTICE);
                      } catch (err: any) {
                        console.error("[Deck] Failed to updateMissionCardStatus:", err.message);
                      }
                    }}
                    className="min-h-11 px-3 py-2 font-mono text-[11px] font-black uppercase tracking-widest text-on-surface/50 hover:text-on-surface transition-colors"
                  >
                    Save for later
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
          </div>
        </div>
        </LayoutGroup>
            </MissionActionPanel>
          </main>


        {/* Face-up browse for the active deck: pick a card by looking at it,
            instead of only drawing blind. Locked cards can be previewed.
            Behind the "See all cards" button next to the deck. */}
        {showBrowse && (
          <section ref={browseSectionRef} aria-label={frankieMode ? 'See all cards in this deck' : 'Browse all missions in this deck'} className="mt-4 border-t-4 border-on-surface/10 pt-2">
            <DeckLibrary allChallenges={browseChallenges as any} />
          </section>
        )}

        {/* Nov 20, 2026 (Zach's call): the Simple Words switch lives down
            here as one slim row, always visible in both states — it used to
            sit above the deck and only render while off, so turning it on
            made it vanish and it couldn't be turned back off from this page. */}
        <div className="mt-8">
          <FrankieModeCard slim />
        </div>
      </div>


      <DiamondDecor />
      <MissionDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        mission={displayedMissionResolved}
        // Nov 17, 2026: the modal used to blank progress for a drawn trip
        // ({}), so it always said START even when the trip already had a
        // photo/note — while the poster beside it said RESUME. Feed the
        // same record the poster gets.
        progress={profile?.tripProgress?.[(drawnTrip || activeTrip)?.id]}
        isSubmitted={drawnTrip || activeTrip ? getChallengeStatus(canonicalProgress, (drawnTrip || activeTrip).id, activeTrip?.id || null) === 'pending_review' : false}
        isApproved={drawnTrip || activeTrip ? getChallengeStatus(canonicalProgress, (drawnTrip || activeTrip).id, activeTrip?.id || null) === 'approved' : false}
        onStart={() => {
          if (drawnTrip || activeTrip) {
            navigate(`/capture?id=${(drawnTrip || activeTrip).id}`);
          }
        }}
        onRedraw={drawnTrip ? () => handleDraw(true) : undefined}
        isRedrawable={!!drawnTrip}
        statusLabel={activeTrip && !drawnTrip ? "ACTIVE_MISSION_SIGNAL" : "NEW_MISSION_DRAWN"}
      />
    </div>
  );
}
