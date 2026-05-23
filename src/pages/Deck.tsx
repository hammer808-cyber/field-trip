import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { MOCK_TRIPS, FIELD_TYPES } from '../constants';
import { Card, Sticker } from '../components/UI';
import { useTheme } from '../context/ThemeContext';
import { CheckCircle2, MapPin, AlertTriangle, ShieldAlert, Timer, Zap, Camera, Sun, RotateCcw, Info, Users, Lock, HelpCircle, CheckCircle, X, Sparkles, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { getFieldCheckLabel } from '../logic/fieldCheckLogic';
import { Hibiscus, ChromeStar, BeachTag, GlossOverlay } from '../components/BajaBratzAssets';
import { DiamondStar, Sparkle, SunFlare, GlossOverlay as DiamondGloss } from '../components/SkinAssets';
import { FieldSignalCard } from '../components/FieldSignalCard';
import { ObservationFeed } from '../components/ObservationFeed';
import { getServerDate } from '../services/timeService';

import { MissionCard } from '../components/ChallengeCard';
import { MissionDecodedCard } from '../components/MissionDecodedCard';
import { EntryCard } from '../components/EntryCard';
import { DeckLibrary } from '../components/DeckLibrary';
import { DeckStack } from '../components/DeckStack';
import { DeckPackSelector } from '../components/DeckPackSelector';
import { getDefaultDeckPack, getDeckPackById } from '../data/deckPacks';
import { FEATURE_FLAGS } from '../config/featureFlags';
import { getSummerCountdown } from '../utils/seasonCountdown';
import { MARKER_STICKERS } from '../data/markers';

export default function DeckPage() {
  const navigate = useNavigate();
  const [isDrawing, setIsDrawing] = useState(false);
  const { 
    fieldType, soloTripsCount, entries, activeTrip, drawTrip, 
    rerollsAvailable, useReroll, incomingFieldCheck, resolveIncomingFieldCheck, user,
    loadMoreEntries, hasMoreEntries, activeSignal, loadingSignal,
    isSeasonActive, activeSeason, gameConfig, profile,
    addToMaybeList, removeFromMaybeList, useComebackCard,
    currentWeekNumber, activeWeekDrop, getSubmissionPointWindow, isWeekLocked, isReviewWindowOpen,
    updateTripProgress, completedChallengeIds, fieldTokens, onboardingCompletedCount,
    onboardingRequiredCount, completedOnboardingMissionIds, isOnboardingComplete, trips,
    memories, toggleFavoriteMemory, getEligibleDrawPool
  } = useApp();
  const { frankieMode, skin, fc } = useTheme();

  const [activePackId, setActivePackId] = useState(() => {
    if (!isOnboardingComplete) return 'starter-signals';
    return getDefaultDeckPack().packId;
  });
  
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
  
  // Calculate exhaustion state dynamically
  const eligiblePool = getEligibleDrawPool(activePackId);
  const isExhausted = eligiblePool.length === 0;

  // Sync active pack when onboarding completes
  useEffect(() => {
    if (isOnboardingComplete && activePackId === 'starter-signals') {
      setActivePackId(getDefaultDeckPack().packId);
    }
  }, [isOnboardingComplete]);

  // Reset drawn state when switching packs or when trips sync
  useEffect(() => {
    setDrawnTrip(null);
  }, [activePackId, trips.length]);

  const handleDraw = async (isRedraw: boolean = false) => {
    if (isDrawing || isExhausted) return;
    setIsDrawing(true);
    
    // Clear previous state for a fresh animation
    if (isRedraw) setDrawnTrip(null);

    try {
      // Small pause for dramatic effect
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const trip = await drawTrip(undefined, FEATURE_FLAGS.ENABLE_DECK_PACK_DRAW_LOGIC ? activePackId : undefined);
      
      if (trip) {
        setDrawnTrip(trip);
      }
    } catch (err) {
      console.error("Draw failed:", err);
    }
    
    setTimeout(() => {
      setIsDrawing(false);
    }, 1200);
  };

  if (!isSeasonActive && !activeSeason) {
    return (
      <div className="pb-40 px-6 pt-12 space-y-12 max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[80vh]">
        <AlertTriangle className="w-16 h-16 opacity-10" />
        <div className="text-center space-y-6">
          <h2 className="font-display text-4xl uppercase tracking-tight leading-tight">{fc('Deck Unavailable', 'Dashboard Unavailable')}</h2>
          <p className="font-serif italic opacity-75 text-lg">"{fc('The mission queue is currently locked. No active seasonal data available in your sector.', 'The mission queue is currently locked. Check back later.')}"</p>
        </div>
        <Link to="/" className="bureau-btn bg-on-surface text-paper">{fc('Return to Base', 'Back Home')}</Link>
      </div>
    );
  }

  // Filter for Maybe List
  const maybeTrips = trips.filter(t => profile?.maybeList?.includes(t.id));
  
  // Determine "Do This Next"
  let recommendedTrip = activeTrip;
  
  const isCompleted = (id: string) => completedChallengeIds.has(id.toLowerCase());

  if (!recommendedTrip && fieldTypeData) {
    const firstTrip = trips.find(t => t.id === fieldTypeData.firstTripId);
    if (firstTrip && !isCompleted(firstTrip.id)) {
      recommendedTrip = firstTrip;
    } else {
      recommendedTrip = trips.find(t => 
        (t.tags || []).some(tag => fieldTypeData.recommendedChallengeTags?.includes(tag)) &&
        !isCompleted(t.id)
      ) || null;
    }
  }
  
  if (!recommendedTrip) {
    // If we still don't have one, just pick the first available from the bank 
    // to avoid "empty" state on first load before sync
    // PRIORITY: If onboarding is active, pick first incomplete starter
    if (!isOnboardingComplete) {
      const starterIds = ["starter-1", "starter-2", "starter-3"];
      recommendedTrip = trips.find(t => starterIds.includes(t.id.toLowerCase()) && !isCompleted(t.id)) || null;
    }
    
    if (!recommendedTrip) {
      recommendedTrip = trips.find(t => !isCompleted(t.id)) || (trips.length > 0 ? trips[0] : null);
    }
  }

  // Recommended for Field Type
  const recommendedForPersona = recommendedTrip ? trips.filter(t => {
    if (!fieldTypeData?.recommendedChallengeTags || t.id === recommendedTrip?.id) return false;
    return (t.tags || []).some(tag => fieldTypeData.recommendedChallengeTags.includes(tag));
  }).slice(0, 3) : [];

  const missionProgress = recommendedTrip ? (profile?.tripProgress?.[recommendedTrip.id] || {}) as any : {};
  const hintUsed = !!missionProgress.hintUsed;

  return (
    <div className={cn(
      "pb-40 px-6 pt-16 space-y-16 max-w-5xl mx-auto relative overflow-hidden",
      isPlain && "max-w-2xl pt-6 space-y-12",
      !isPlain && !isBaja && !isDiamond && !isHeat && "bg-white min-h-screen text-on-surface"
    )}>
      {/* Season Countdown Banner */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-[201] -mt-10 mb-12"
      >
        {(() => {
          const season = getSummerCountdown();
          if (season.status === 'ended') return null;
          
          const isUpcoming = season.status === 'upcoming';
          const isActive = season.status === 'active';
          
          return (
            <div className={cn(
              "group relative overflow-hidden border-4 border-on-surface shadow-[8px_8px_0px_black] bg-white transition-all hover:-translate-y-0.5",
              isActive && "bg-brand-lime/10"
            )}>
              {/* Accent bars */}
              <div className="absolute top-0 left-0 w-full h-1.5 flex">
                <div className="flex-1 bg-brand-orange" />
                <div className="flex-1 bg-brand-lime" />
                <div className="flex-1 bg-brand-cyan" />
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 sm:p-6 mt-1.5">
                <div className="flex items-center gap-4 text-center sm:text-left">
                  <div className={cn(
                    "w-12 h-12 flex items-center justify-center border-2 border-on-surface shadow-[4px_4px_0px_black] shrink-0",
                    isActive ? "bg-brand-lime" : "bg-white"
                  )}>
                    {isUpcoming ? <Timer className="w-6 h-6 text-on-surface" /> : <Sun className="w-6 h-6 text-on-surface animate-pulse" />}
                  </div>
                  <div className="space-y-1">
                    <p className="font-outfit text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] italic text-on-surface/40 leading-none">
                      {isUpcoming ? "Season Signal" : "Summer Session"}
                    </p>
                    <h3 className="font-outfit text-xl sm:text-2xl font-black uppercase tracking-tighter italic text-on-surface leading-none">
                      {season.label}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="hidden sm:block w-32 h-2 bg-on-surface/5 relative overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: isActive ? '75%' : '25%' }}
                      className={cn(
                        "absolute top-0 left-0 h-full",
                        isActive ? "bg-brand-lime" : "bg-brand-orange"
                      )}
                    />
                  </div>
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full border-2 border-on-surface bg-brand-cyan flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-on-surface" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Decorative scanline overlay */}
              <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(0,0,0,0.1)_50%,transparent_50%)] bg-[length:100%_4px]" />
            </div>
          );
        })()}
      </motion.div>

      {/* HUD Background Effects */}
      {!isPlain && !isBaja && !isDiamond && !isHeat && (
        <>
          <div className="fixed inset-0 pointer-events-none z-[100] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.015)_50%)] bg-[length:100%_3px] opacity-10" />
          <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03]" 
               style={{ 
                 backgroundImage: 'linear-gradient(var(--color-on-surface) 1.5px, transparent 1.5px), linear-gradient(90deg, var(--color-on-surface) 1.5px, transparent 1.5px)', 
                 backgroundSize: '48px 48px' 
               }} 
          />
        </>
      )}

      {/* Comeback Alert */}
      <AnimatePresence>
        {profile?.comebackCardActive && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="p-8 bg-brand-orange text-white border-4 border-on-surface shadow-[12px_12px_0px_black] rotate-1 relative z-50 overflow-hidden mb-12"
          >
            <RotateCcw className="absolute top-0 right-0 p-2 w-16 h-16 opacity-20" />
            <h3 className="font-display text-5xl uppercase leading-tight italic font-bold">Welcome Back Explorer</h3>
            <p className="font-mono text-sm mt-3 font-bold uppercase tracking-wider opacity-90">Lapsed energy restored // Field bonus available.</p>
            <button 
              onClick={useComebackCard}
              className="mt-8 w-full bg-white text-on-surface py-6 font-display text-2xl uppercase tracking-wider hover:bg-on-surface hover:text-white transition-all shadow-[6px_6px_0px_rgba(0,0,0,0.2)] font-bold italic"
            >
              Collect Bonus Points (+25)
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Draw Deck / Active Mission Section (Priority 1) */}
      <section className="space-y-8 relative z-10 text-left">
        {/* Title and stats summary */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2 text-left">
            <div className="flex items-center gap-3">
               <div className="w-8 h-1 bg-brand-orange" />
               <p className="micro-label text-brand-orange font-black tracking-[0.4em] uppercase text-[10px]">
                 {isSeasonActive ? 'Mission Engine Active' : 'Uplink Standby'}
               </p>
            </div>
            <h2 className={cn(
              "text-6xl md:text-8xl leading-none uppercase tracking-tighter font-black italic",
              isBaja ? "text-baja-pink drop-shadow-[4px_4px_0_#40e0d0]" : 
              isDiamond ? "liquid-chrome bg-clip-text text-transparent filter drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]" :
              isHeat ? "text-white drop-shadow-[0_4px_#ff007f]" :
              "text-on-surface font-outfit"
            )}>
              {isBaja ? 'Coastal Snap' : isDiamond ? 'The Vault' : isHeat ? 'The Hot List' : "FIELD TRIP DEX"}
            </h2>
          </div>

          <div className="flex gap-4">
             <div className="text-left px-4 py-2 bg-brand-lime/10 border-2 border-on-surface/5">
                <span className="text-[8px] font-black uppercase tracking-widest opacity-40 block mb-1">MISSIONS</span>
                <p className="text-xl sm:text-2xl font-black font-outfit text-on-surface">
                  {completedChallengeIds.size}
                </p>
             </div>
             <div className="text-left px-4 py-2 bg-brand-cyan/10 border-2 border-on-surface/5">
                <span className="text-[8px] font-black uppercase tracking-widest opacity-40 block mb-1">MEMORIES</span>
                <p className="text-xl sm:text-2xl font-black font-outfit text-on-surface">
                  {memories.length}
                </p>
             </div>
             <div className="text-left px-4 py-2 bg-brand-orange/10 border-2 border-on-surface/5 col-span-2 sm:col-span-1">
                <span className="text-[8px] font-black uppercase tracking-widest opacity-40 block mb-1">TOKENS</span>
                <p className="text-xl sm:text-2xl font-black font-outfit text-on-surface">
                  {fieldTokens}
                </p>
             </div>
          </div>
        </div>

        {/* Deck Pack Selector */}
        <div className="flex justify-center pt-2">
          <DeckPackSelector 
            selectedPackId={activePackId} 
            onSelect={setActivePackId} 
          />
        </div>

        {/* The Draw Deck stack */}
        <div className="text-center py-6 border-b-2 border-dashed border-on-surface/5">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 mb-4 animate-pulse italic">
            {isExhausted ? fc('DECK_EXHAUSTED', 'No more missions available in this deck.') : fc('TAP_DECK_TO_DRAW', 'Tap the deck to draw your next Mission.')}
          </p>
          <DeckStack 
            onDraw={() => handleDraw()} 
            isDrawing={isDrawing} 
            disabled={isDrawing || isExhausted} 
            loading={loadingSignal}
            locked={!isSeasonActive}
            statusLabel={isExhausted ? fc('DECK_EXHAUSTED', 'DECK_EXHAUSTED') : undefined}
            activeMission={drawnTrip || activeTrip}
            activePack={getDeckPackById(activePackId)}
            poolEmpty={isExhausted}
          />

          <AnimatePresence mode="wait">
            {isExhausted && !isDrawing && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="mt-8 max-w-md mx-auto px-4 w-full"
              >
                <div className="bg-on-surface/5 border-4 border-dashed border-on-surface/30 p-12 text-center space-y-4">
                   <Lock className="w-12 h-12 mx-auto opacity-10 text-on-surface" />
                   <p className="font-outfit text-xl font-black uppercase italic opacity-40 text-on-surface">All Sector Missions Complete</p>
                   <p className="font-serif italic text-sm opacity-30 text-on-surface">Check back for the Summer drop or try another deck pack.</p>
                </div>
              </motion.div>
            )}

            {(drawnTrip) && !isDrawing && (
              <div className="mt-8 text-left">
                <MissionDecodedCard 
                  mission={drawnTrip}
                  onStart={() => navigate(`/capture?id=${drawnTrip.id}`)}
                  onRedraw={() => handleDraw(true)}
                  onDismiss={() => setDrawnTrip(null)}
                  statusLabel="NEW_MISSION_DRAWN"
                />
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Active Mission unit if present */}
        {activeTrip && (
          <div className="space-y-4 pt-4 text-left" id="active-mission">
            <div className="flex justify-between items-center border-b border-on-surface/10 pb-2">
              <h3 className="font-outfit text-lg font-black uppercase tracking-tight text-on-surface">
                {fc('ACTIVE_MISSION_SIGNAL', 'ACTIVE MISSION SIGNAL')}
              </h3>
              <div className="flex gap-4">
                {rerollsAvailable > 0 && (
                  <button 
                    onClick={useReroll}
                    className="font-mono text-[9px] font-black uppercase tracking-widest hover:text-brand-orange transition-colors bg-on-surface/5 px-2 py-1 border-2 border-transparent hover:border-brand-orange/20 text-on-surface"
                  >
                    DRAW_AGAIN ({rerollsAvailable})
                  </button>
                )}
              </div>
            </div>

            <MissionDecodedCard 
              mission={activeTrip}
              progress={missionProgress}
              onStart={() => navigate(`/capture?id=${activeTrip.id}`)}
              onHint={() => {
                updateTripProgress(activeTrip.id, { hintUsed: true });
                if (activeTrip?.hintText) alert(`Bureau Intel: ${activeTrip.hintText}`);
              }}
              isHintUsed={hintUsed}
              isRedrawable={false}
              statusLabel="ACTIVE_SIGNAL_STABLE"
              className="max-w-none md:max-w-none"
            />
          </div>
        )}
      </section>

      {/* Primary Action Buttons */}
      <section className="flex flex-wrap justify-center gap-4 relative z-10 py-6 border-b border-t border-on-surface/5">
         <button 
           onClick={() => {
             if (isExhausted) return;
             handleDraw();
           }}
           disabled={isExhausted}
           className={cn(
             "px-8 py-3 font-outfit text-sm uppercase font-black italic shadow-[4px_4px_0px_black] transition-all border-4 border-on-surface",
             isExhausted 
               ? "bg-on-surface/20 text-on-surface/40 cursor-not-allowed shadow-none border-on-surface/10" 
               : "bg-on-surface text-white hover:bg-brand-orange active:translate-y-0.5"
           )}
         >
           {activeTrip ? fc('CONTINUE_MISSION', 'CONTINUE MISSION') : fc('DRAW_MISSION_DECK', 'DRAW MISSION')}
         </button>

         <button 
           onClick={() => {
             const archiveEl = document.getElementById('dex-archive');
             if (archiveEl) archiveEl.scrollIntoView({ behavior: 'smooth' });
           }}
           className="px-8 py-3 bg-white border-4 border-on-surface text-on-surface hover:bg-brand-lime hover:text-black transition-all font-outfit text-sm uppercase font-black italic shadow-[4px_4px_0px_black] active:translate-y-0.5"
         >
           VIEW_ARCHIVE
         </button>

         {activeTrip && (
           <button 
             onClick={() => {
               const activeEl = document.getElementById('active-mission');
               if (activeEl) {
                 activeEl.scrollIntoView({ behavior: 'smooth' });
               } else {
                 navigate(`/capture?id=${activeTrip.id}`);
               }
             }}
             className="px-8 py-3 bg-brand-orange text-white hover:bg-brand-orange/90 transition-all border-4 border-on-surface font-outfit text-sm uppercase font-black italic shadow-[4px_4px_0px_black] active:translate-y-0.5"
           >
             GO_TO_ACTIVE
           </button>
         )}
      </section>

      {/* Mission Status / Progress Summary */}
      <section className="relative z-10 max-w-2xl mx-auto w-full">
        <div className="flex">
           <div className="bg-on-surface text-brand-lime px-6 py-2 text-[10px] uppercase font-bold tracking-widest italic border-4 border-on-surface relative z-10 -mb-[4px] ml-4 font-black">MISSION_STATUS</div>
        </div>
        <Card className="border-4 border-on-surface p-8 shadow-[12px_12px_0_black] space-y-6 bg-white text-left">
           <div className="flex justify-between items-end">
              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                   <span className="text-6xl font-outfit font-black text-on-surface">{onboardingCompletedCount}</span>
                   <span className="text-2xl text-on-surface/20 font-black">/ {onboardingRequired}</span>
                </div>
              </div>
              <div className="bg-brand-lime text-black border-2 border-on-surface px-3 py-1 font-black text-[9px] rotate-3 shadow-[2px_2px_0_black]">RANK: {onboardingCompletedCount >= onboardingRequired ? 'ELITE' : 'SCOUT'}</div>
           </div>
           <div className="w-full h-4 bg-paper-dark border-2 border-on-surface p-0.5 overflow-hidden">
              <div className="h-full bg-brand-lime border border-on-surface shadow-[0_0_10px_var(--color-brand-lime)]" style={{ width: `${Math.min(100, (onboardingCompletedCount/onboardingRequired)*100)}%` }} />
           </div>
          <div className="space-y-4 mt-6">
            <div className="space-y-2">
               <p className="micro-label font-black text-on-surface/60 tracking-widest italic text-[10px]">
                  {onboardingRequired - onboardingCompletedCount > 0 
                    ? `${onboardingRequired - onboardingCompletedCount} ONBOARDING MISSIONS REMAINING TO UNLOCK FULL SECTOR` 
                    : 'ALL SECTOR MODES UNLOCKED'}
               </p>
               
               {(onboardingRequired - onboardingCompletedCount > 0 && fieldTokens >= 3) && (
                  <div className="space-y-4 pt-2">
                    <p className="text-[9px] font-mono p-4 bg-brand-orange text-white border-2 border-on-surface shadow-[4px_4px_0_black] italic font-bold leading-relaxed">
                      Protocol: {fieldTokens} missions completed, but your "Starter" set is incomplete. Finish onboard IDs to unlock Crew capabilities.
                    </p>
                    <div className="bg-white border-2 border-on-surface p-4 space-y-2">
                       <p className="micro-label font-bold text-[8px] opacity-40 uppercase">Awaiting Completion:</p>
                       {["starter-1", "starter-2", "starter-3"].filter(id => !completedOnboardingMissionIds.includes(id)).map(id => {
                         const mission = MOCK_TRIPS.find(m => m.id === id);
                         return (
                           <div key={id} className="flex items-center gap-2 text-[10px] font-mono font-black text-on-surface">
                             <Lock className="w-3 h-3 text-brand-orange" />
                             <span className="opacity-40">{id.toUpperCase()}</span>
                             <span>{mission?.title || 'Unknown Asset'}</span>
                           </div>
                         );
                       })}
                    </div>
                  </div>
                )}
            </div>
          </div>
        </Card>
      </section>

      {/* Season Zine Panel (Priority 5) */}
      <section className="bg-white border-4 border-on-surface shadow-[16px_16px_0px_black] overflow-hidden relative group text-left z-10">
         <div className="absolute top-0 right-0 w-32 h-full opacity-5 bg-repeat pointer-events-none" 
              style={{ backgroundImage: 'radial-gradient(var(--color-on-surface) 1px, transparent 0)', backgroundSize: '12px 12px' }} />
         
         <div className="p-6 sm:p-10 flex flex-col md:flex-row items-center gap-10">
            <div className="w-40 h-52 bg-white border-4 border-on-surface shadow-[8px_8px_0px_var(--color-brand-cyan)] shrink-0 rotate-[-2deg] flex flex-col items-center justify-center p-4 text-center space-y-2 relative">
               <div className="w-12 h-1 bg-brand-orange mb-2" />
               <h4 className="font-outfit text-xl font-black leading-none uppercase italic text-on-surface">SUMMER_ZINE</h4>
               <div className="w-full h-1 bg-on-surface/5 my-4" />
               <p className="text-[8px] font-mono leading-tight opacity-40 font-bold uppercase tracking-widest text-on-surface">A memory archive of Summer 2026</p>
               <div className="absolute -bottom-2 -right-2 bg-brand-cyan text-on-surface px-2 py-1 text-[10px] font-black italic border-2 border-on-surface">v.01_BETA</div>
            </div>

            <div className="flex-grow space-y-6 text-left">
               <div className="space-y-2">
                  <h3 className="font-outfit text-3xl font-black uppercase italic tracking-tighter leading-none text-on-surface">Your Season Zine</h3>
                  <p className="font-serif italic text-lg text-on-surface/60">"Every completed mission adds a page seed to your end-of-season zine."</p>
               </div>

               <div className="grid grid-cols-3 gap-6 pt-4 border-t-2 border-on-surface/5">
                  <div className="space-y-1">
                     <span className="text-[8px] font-black uppercase tracking-widest opacity-40 block text-on-surface">CAPTURED</span>
                     <p className="text-2xl font-black font-outfit text-on-surface">{memories.length} Seeds</p>
                  </div>
                  <div className="space-y-1 border-l-2 border-on-surface/5 pl-6">
                     <span className="text-[8px] font-black uppercase tracking-widest opacity-40 block text-on-surface">FAVORITES</span>
                     <p className="text-2xl font-black font-outfit text-on-surface">{memories.filter(m => m.favorite).length}</p>
                  </div>
                  <div className="space-y-1 border-l-2 border-on-surface/5 pl-6">
                     <span className="text-[8px] font-black uppercase tracking-widest opacity-40 block text-on-surface">REWARDS</span>
                     <p className="text-2xl font-black font-outfit text-on-surface">{fieldTokens}</p>
                  </div>
               </div>

               <div className="flex items-center gap-4 pt-4">
                  <div className="flex-grow h-2 bg-on-surface/5 rounded-full overflow-hidden">
                     <motion.div 
                       initial={{ width: 0 }}
                       animate={{ width: `${Math.min(100, (memories.length / 20) * 100)}%` }}
                       className="h-full bg-brand-cyan shadow-[0_0_10px_var(--color-brand-cyan)]"
                     />
                  </div>
                  <span className="font-mono text-[10px] text-on-surface/40 uppercase font-black tracking-widest">Page_Seeds: {memories.length}/20</span>
               </div>
            </div>
         </div>
      </section>

      {/* Big Board / Token Stats Panel (Priority 6) */}
      <section className="bg-white border-4 border-on-surface shadow-[16px_16px_0px_var(--color-brand-orange)] overflow-hidden relative group text-left z-10">
         <div className="p-6 sm:p-10 flex flex-col md:flex-row items-center gap-10">
            <div className="w-40 h-40 bg-white border-4 border-on-surface shadow-[8px_8px_0px_black] shrink-0 rotate-[3deg] flex items-center justify-center text-6xl relative">
                {userMarker.emoji}
                <div className="absolute -top-3 -right-3 bg-brand-orange text-white px-3 py-1 text-[10px] font-black italic border-2 border-on-surface shadow-[4px_4px_0px_black]">MARKER</div>
            </div>

            <div className="flex-grow space-y-6 text-left">
               <div className="flex justify-between items-start">
                  <div className="space-y-2">
                     <h3 className="font-outfit text-3xl font-black uppercase italic tracking-tighter leading-none text-on-surface">The Big Board</h3>
                     <p className="font-serif italic text-lg text-on-surface/60">"Your marker moves along the seasonal trail with every token earned."</p>
                  </div>
                  <Link to="/big-board?view=trail" className="group flex items-center gap-2 bg-on-surface text-white px-4 py-2 hover:bg-brand-orange transition-colors">
                     <span className="text-[10px] font-black uppercase tracking-widest italic text-white">OPEN_BOARD</span>
                     <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-white" />
                  </Link>
               </div>

               <div className="flex items-center gap-4 pt-4">
                  <div className="flex-grow h-4 bg-on-surface/5 border-2 border-on-surface shadow-[4px_4px_0px_black] relative overflow-hidden">
                     <motion.div 
                       initial={{ width: 0 }}
                       animate={{ width: `${progressPercent}%` }}
                       className="h-full bg-brand-orange shadow-[0_0_15px_var(--color-brand-orange)]"
                     />
                  </div>
                  <span className="font-outfit text-xl font-black text-on-surface italic">{progressPercent}%</span>
               </div>

               <div className="flex flex-wrap gap-8 text-[10px] font-black uppercase tracking-[0.2em] opacity-40 italic text-on-surface">
                  <span>Missions: {onboardingCompletedCount + (memories?.length || 0)}</span>
                  <span>Memories: {memories.length}</span>
                  <span>Tokens: {profile?.preferences?.showExactPoints ? fieldTokens : '???'}</span>
               </div>
            </div>
         </div>
      </section>

      {/* Weekly Modifier & Supporting Intel Grid (Priority 7) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10 text-left">
         {/* Weekly Protocol */}
         {activeWeekDrop && (
           <div className="flex flex-col text-left">
              <div className="flex">
                 <div className="bg-brand-orange text-white px-6 py-2 text-[10px] uppercase font-bold tracking-widest italic border-4 border-on-surface relative z-10 -mb-[4px] ml-4 font-black">WEEKLY_MODIFIER</div>
              </div>
              <Card className="flex-1 bg-brand-lime border-4 border-on-surface p-8 shadow-[12px_12px_0_black] space-y-6">
                 <div className="flex justify-between items-start">
                    <h4 className="font-outfit text-3xl font-black uppercase tracking-tight leading-tight text-on-surface">The {currentWeekNumber % 2 === 0 ? "Urban Echo" : "Lo-Fi"} Signal</h4>
                 </div>
                 <p className="font-serif italic text-xl text-on-surface">"{currentWeekNumber % 2 === 0 ? "Double proof points for transit hub discoveries." : "Field Notes earn massive energy bonuses this week."}"</p>
              </Card>
           </div>
         )}

         {/* Field Signal / Observation Feed */}
         {!isPlain && <FieldSignalCard activeSignal={activeSignal} loading={loadingSignal} />}
         {!isPlain && <ObservationFeed />}
      </div>

      {/* Deck Archive Section */}
      <section className="pt-12 border-t-8 border-on-surface/5 relative z-10 text-left">
        <div className="flex items-center gap-4 mb-12">
            <h3 className="font-outfit text-4xl font-black uppercase tracking-tight text-on-surface">Deck_Archive_v1.2</h3>
            <div className="flex-grow h-1 bg-on-surface/5" />
        </div>
        <DeckLibrary allChallenges={trips} />
      </section>

      {/* Persona Matched Challenges */}
      {recommendedForPersona.length > 0 && !isPlain && (
        <section className="space-y-12 relative z-10 text-left">
          <div className="border-b-4 border-on-surface pb-6">
             <h3 className="font-outfit text-4xl font-black uppercase tracking-tight text-on-surface">Persona_Matched.DECODE</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {recommendedForPersona.map(trip => (
              <MissionCard 
                key={trip.id} 
                challenge={trip} 
                progress={profile?.tripProgress?.[trip.id]}
                onStart={() => navigate(`/capture?id=${trip.id}`)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Journal Archive (The Dex Vault) */}
      <section className="space-y-12 pb-32 relative z-10 text-left relative" id="dex-archive">
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b-8 border-on-surface pb-8">
           <div className="space-y-2">
             <h3 className="text-7xl font-outfit font-black text-on-surface drop-shadow-[5px_5px_0_var(--color-brand-cyan)]">Archive_Log</h3>
             <p className="font-serif italic text-xl text-on-surface/60">"Your captured field data, archived for seasonal zine ordering."</p>
           </div>
           <p className="micro-label font-black text-on-surface/30 italic">SIGNAL_STRENGTH_98.4_STABLE</p>
        </div>
        
        <div className="flex gap-10 overflow-x-auto pb-12 no-scrollbar p-4 -mx-4">
           {memories.length > 0 ? (
             memories.map((m, index) => (
                <div key={m.id} className="relative group min-w-[320px]">
                  <EntryCard 
                    entry={{
                      id: m.id,
                      tripId: m.missionId,
                      tripTitle: m.title,
                      fieldNote: m.fieldNote,
                      proofImage: m.evidenceUrl,
                      pointsAwarded: m.pointsEarned,
                      status: 'approved',
                      createdAt: m.completedAt,
                      userName: profile?.name || 'Explorer',
                      selectedLevel: 'Advanced'
                    } as any} 
                    className={cn(
                      "border-4 border-on-surface bg-white shadow-[10px_10px_0_black] transition-transform hover:scale-[1.03]",
                      index % 2 === 0 ? "rotate-[-1deg]" : "rotate-[1deg]"
                    )}
                  />
                  {/* Favorite Toggle Overlay */}
                  <button 
                    onClick={() => toggleFavoriteMemory(m.id, !m.favorite)}
                    className={cn(
                      "absolute -top-3 -right-3 w-10 h-10 border-4 border-on-surface shadow-[4px_4px_0px_black] z-30 flex items-center justify-center transition-all hover:scale-110",
                      m.favorite ? "bg-brand-orange text-white" : "bg-white text-on-surface opacity-40 hover:opacity-100"
                    )}
                  >
                    <Sparkles className={cn("w-5 h-5", m.favorite && "fill-current")} />
                  </button>
                  {m.favorite && (
                    <div className="absolute top-4 left-4 bg-brand-cyan text-on-surface px-2 py-0.5 text-[8px] font-black uppercase italic border-2 border-on-surface z-20">FAVORITE</div>
                  )}
                </div>
             ))
           ) : (
             <div className="w-full bg-on-surface/5 border-4 border-dashed border-on-surface/10 py-32 text-center">
                <Camera className="w-16 h-16 mx-auto opacity-10 mb-6 text-on-surface" />
                <p className="font-serif italic text-2xl opacity-40 text-on-surface">"Archive currently empty. Begin your first mission to populate sector logs."</p>
             </div>
           )}
        </div>
      </section>

      {/* Field Check Overlay (Global) */}
      <AnimatePresence>
        {incomingFieldCheck && fieldCheckData && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="fixed bottom-10 left-6 right-6 z-[100] max-w-lg mx-auto"
          >
            <Card className="bg-white border-4 border-error p-6 shadow-[10px_10px_0_rgba(255,0,0,0.2)] flex items-start gap-6 relative">
              <div className="bg-error text-white p-3 rotate-3 shadow-[3px_3px_0_black]">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-grow space-y-1 text-left">
                <h4 className="font-display text-xl uppercase text-error font-black italic">Field Check Required</h4>
                <p className="font-serif text-sm text-on-surface">Your entry for <strong>{fieldCheckData}</strong> is under review by sector admins.</p>
                <button 
                  onClick={resolveIncomingFieldCheck}
                  className="mt-4 px-6 py-2 bg-error text-white font-black text-xs uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all"
                >
                  Confirm_Receipt
                </button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
