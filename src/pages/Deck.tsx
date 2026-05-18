import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { MOCK_TRIPS, FIELD_TYPES } from '../constants';
import { Card, Sticker } from '../components/UI';
import { useTheme } from '../context/ThemeContext';
import { CheckCircle2, MapPin, AlertTriangle, ShieldAlert, Timer, Zap, Camera, Sun, RotateCcw, Info, Users, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { getFieldCheckLabel } from '../logic/fieldCheckLogic';
import { Hibiscus, ChromeStar, BeachTag, GlossOverlay } from '../components/BajaBratzAssets';
import { DiamondStar, Sparkle, SunFlare, GlossOverlay as DiamondGloss } from '../components/SkinAssets';
import { FieldSignalCard } from '../components/FieldSignalCard';
import { ObservationFeed } from '../components/ObservationFeed';
import { getServerDate } from '../services/timeService';

import { EntryCard } from '../components/EntryCard';

export default function DeckPage() {
  const { 
    fieldType, soloTripsCount, entries, activeTrip, drawTrip, 
    rerollsAvailable, useReroll, incomingFieldCheck, resolveIncomingFieldCheck, user,
    loadMoreEntries, hasMoreEntries, activeSignal, loadingSignal,
    isSeasonActive, activeSeason, gameConfig, profile,
    addToMaybeList, removeFromMaybeList, useComebackCard,
    currentWeekNumber, activeWeekDrop, getSubmissionPointWindow, isWeekLocked, isReviewWindowOpen
  } = useApp();
  const { frankieMode, skin, fc } = useTheme();
  
  const isPlain = profile?.plainMode || frankieMode;
  const onboardingRequired = gameConfig?.onboardingEntriesRequired || 3;
  
  const fieldTypeData = FIELD_TYPES[fieldType || 'unclassified'];

  const fieldCheckData = incomingFieldCheck ? getFieldCheckLabel(incomingFieldCheck.reason) : null;
  const isBaja = skin.id === 'baja-bratz';
  const isDiamond = skin.id === 'slippery-diamond';
  const isHeat = skin.id === 'heatwave';

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
  const maybeTrips = MOCK_TRIPS.filter(t => profile?.maybeList?.includes(t.id));
  
  // Recently completed (last 7 days)
  const sevenDaysAgo = getServerDate();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentTripIds = entries
    .filter(e => {
        const d = e.createdAt?.toDate ? e.createdAt.toDate() : new Date(e.createdAt);
        return d > sevenDaysAgo;
    })
    .map(e => e.tripId);

  // Determine "Do This Next"
  let recommendedTrip = activeTrip;
  
  if (!recommendedTrip && fieldTypeData) {
    // Try to find the first trip if not completed recently
    const firstTrip = MOCK_TRIPS.find(t => t.id === fieldTypeData.firstTripId);
    if (firstTrip && !recentTripIds.includes(firstTrip.id)) {
      recommendedTrip = firstTrip;
    } else {
      // Find another from recommended tags that isn't recently completed
      recommendedTrip = MOCK_TRIPS.find(t => 
        (t.tags || []).some(tag => fieldTypeData.recommendedChallengeTags?.includes(tag)) &&
        !recentTripIds.includes(t.id)
      ) || null;
    }
  }
  
  if (!recommendedTrip) {
    // Ultimate fallback if everything is done or no field type
    recommendedTrip = MOCK_TRIPS.find(t => !recentTripIds.includes(t.id)) || null;
  }

  // Recommended for Field Type
  const recommendedForPersona = MOCK_TRIPS.filter(t => {
    if (!fieldTypeData?.recommendedChallengeTags || t.id === recommendedTrip?.id) return false;
    return (t.tags || []).some(tag => fieldTypeData.recommendedChallengeTags.includes(tag));
  }).slice(0, 3);

  return (
    <div className={cn(
      "pb-40 px-6 pt-16 space-y-24 max-w-5xl mx-auto relative overflow-hidden",
      isPlain && "max-w-2xl pt-6 space-y-12",
      !isPlain && !isBaja && !isDiamond && !isHeat && "bg-white min-h-screen text-on-surface"
    )}>
      {/* High-Voltage HUD / Scanline Overlay */}
      {!isPlain && !isBaja && !isDiamond && !isHeat && (
        <div className="fixed inset-0 pointer-events-none z-[100] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.015)_50%)] bg-[length:100%_3px] opacity-10" />
      )}

      {/* Background Grid Accent for HV-LE */}
      {!isPlain && !isBaja && !isDiamond && !isHeat && (
        <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03]" 
             style={{ 
               backgroundImage: 'linear-gradient(var(--color-on-surface) 1.5px, transparent 1.5px), linear-gradient(90deg, var(--color-on-surface) 1.5px, transparent 1.5px)', 
               backgroundSize: '48px 48px' 
             }} 
        />
      )}
      {/* Comeback Card */}
      <AnimatePresence>
        {profile?.comebackCardActive && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="p-8 bg-brand-orange text-white border-4 border-on-surface shadow-[12px_12px_0px_black] rotate-1 relative z-50 overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-2 opacity-20">
              <RotateCcw className="w-16 h-16" />
            </div>
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

      {/* Plain Mode Header */}
      {isPlain && (
        <header className="border-b-4 border-on-surface pb-6">
           <h1 className="text-6xl font-display uppercase tracking-tighter leading-none">{fc('The Mission', 'Dashboard')}</h1>
           <p className="font-mono text-sm mt-2 opacity-60 uppercase">{fc('DO ONE THING. DO IT WELL.', 'MISSIONS')}</p>
        </header>
      )}

      {/* Background Assets */}
      {!isPlain && isBaja && (
        <>
          <Hibiscus className="absolute top-2 right-4 w-32 h-32 opacity-20 -z-10" />
          <Hibiscus className="absolute bottom-40 left-0 w-48 h-48 opacity-10 -z-10 rotate-45" />
          <ChromeStar className="absolute top-20 left-10 w-8 h-8 opacity-40 -z-10" />
        </>
      )}

      {isDiamond && !frankieMode && (
        <>
          <DiamondStar className="absolute top-10 right-10 w-24 h-24 text-white opacity-10 -z-10" />
          <Sparkle className="absolute bottom-1/4 left-10 w-8 h-8 text-white opacity-20 animate-pulse -z-10" />
          <div className="absolute inset-0 liquid-chrome opacity-5 pointer-events-none -z-20" />
        </>
      )}

      {isHeat && !frankieMode && (
        <>
          <SunFlare className="absolute top-0 right-[-100px] w-64 h-64" />
          <SunFlare className="absolute bottom-1/3 left-[-50px] w-48 h-48" />
        </>
      )}

      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 relative z-10">
        <div className="space-y-4 text-left">
          <div className="flex items-center gap-4">
             <div className="w-12 h-1 bg-brand-orange" />
             <p className="micro-label text-brand-orange font-black tracking-[0.4em]">
               {isBaja ? 'Coastal Operations' : 
                isDiamond ? 'Diamond Zone / 01' : 
                isHeat ? 'Heatwave Control' :
                fc('UNIT: UPDATE // ZONE: URBAN // FT_UPDATE', 'STATUS: ACTIVE')}
             </p>
          </div>
          <h2 className={cn(
            "text-huge leading-[0.85] uppercase tracking-tight italic font-bold",
            isBaja ? "text-baja-pink drop-shadow-[4px_4px_0_#40e0d0]" : 
            isDiamond ? "liquid-chrome bg-clip-text text-transparent filter drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]" :
            isHeat ? "text-white drop-shadow-[0_4px_#ff007f] font-display" :
            "text-on-surface"
          )}>
            {isBaja ? 'The Glow Up' : isDiamond ? 'The Diamond Vault' : isHeat ? 'The Hot List' : fc('Current Deck', 'Deck')}
          </h2>
          {!isBaja && !isDiamond && !isHeat && (
            <div className="flex items-center gap-4 pt-8">
               <span className="p-1.5 px-5 bg-brand-lime text-black font-bold text-[11px] uppercase tracking-wider shadow-[6px_6px_0px_black] border-2 border-on-surface rotate-[-1deg] italic">{fc('ACTIVE_STATION', 'ACTIVE')}</span>
               <span className="micro-label opacity-50 font-bold tracking-[0.3em] text-xs">WEEK_{currentWeekNumber}</span>
               {isReviewWindowOpen(currentWeekNumber) && (
                 <span className="p-1 px-3 border-2 border-brand-orange text-brand-orange font-bold text-[10px] uppercase tracking-wider animate-pulse italic">WINDOW_EXPIRING</span>
               )}
            </div>
          )}
          {!isBaja && !isDiamond && !isHeat && <p className="font-serif italic text-3xl opacity-75 max-w-lg leading-relaxed mt-12">"{fc('Field operational flows for authorized scouts. Document everything with absolute, alarming confidence.', 'Your current tasks and goals for exploring.')}"</p>}
        </div>
        <div className="text-left md:text-right">
          <div className="bg-on-surface text-brand-lime px-6 py-2 inline-block border-2 border-on-surface shadow-[10px_10px_0px_var(--color-brand-orange)] mb-6">
             <p className={cn(
               "micro-label font-black tracking-[0.4em] opacity-80 italic", 
               isBaja ? "text-baja-pink font-accent" : 
               isDiamond ? "text-diamond-silver" : 
               isHeat ? "text-white font-display" :
               "text-brand-lime"
             )}>
               {isHeat ? 'Waves Left: ' : 'SIGNAL_REROLLS: '}
             </p>
          </div>
          <p className={cn(
            "text-huge text-[6rem] leading-none font-black italic",
            isHeat ? "text-white" : "text-on-surface"
          )}>
            {rerollsAvailable}
          </p>
        </div>
      </header>

      {/* Field Signals (Hidden in Plain) */}
      {!isPlain && <FieldSignalCard activeSignal={activeSignal} loading={loadingSignal} />}

      {/* Playful Observations (Hidden in Plain) */}
      {!isPlain && <ObservationFeed />}

      {/* Weekly Twist */}
      {!isPlain && activeWeekDrop?.chaosCardIds && activeWeekDrop.chaosCardIds.length > 0 && (
        <div className="relative group">
           {/* Tabbed header for chaos card */}
           <div className="flex">
              <div className="bg-brand-orange text-white px-10 py-3 text-[11px] uppercase font-black tracking-[0.4em] italic border-4 border-on-surface relative z-10 -mb-[4px] ml-6 shadow-[6px_6px_0px_rgba(0,0,0,0.15)] flex items-center gap-3">
                 <Zap className="w-5 h-5 fill-white" />
                 WEEKLY_CHAOS_MODIFIER
              </div>
           </div>
           <div className="bg-brand-lime border-4 border-on-surface p-10 text-on-surface relative rotate-[-0.5deg] overflow-hidden shadow-[20px_20px_0px_0px_var(--color-on-surface)] group-hover:shadow-[24px_24px_0px_0px_var(--color-brand-orange)] transition-all duration-300">
              <Zap className="absolute top-[-60px] right-[-60px] w-80 h-80 opacity-5 pointer-events-none" />
              <div className="space-y-8 relative z-10">
                 <div className="flex justify-between items-start">
                    <h3 className="font-display text-5xl uppercase tracking-tighter leading-none italic max-w-lg font-black">The {currentWeekNumber % 2 === 0 ? "Urban Echo" : "Low Signal"} Protocol Active</h3>
                    <div className="bureau-tag bg-white border-2 border-on-surface shadow-[4px_4px_0px_black] rotate-3 italic font-black">BOOSTED</div>
                 </div>
                 
                 <div className="p-8 bg-white/40 border-2 border-on-surface/10 backdrop-blur-sm shadow-inner">
                   <p className="micro-label opacity-40 mb-3 font-black tracking-[0.2em] italic">OPERATIONAL_DATA // ID_{activeWeekDrop.chaosCardIds[0]} // HV.LVL_03</p>
                   <p className="font-serif italic text-3xl leading-snug font-medium text-on-surface">
                     {currentWeekNumber % 2 === 0 
                       ? "Double proof points for any discoveries made in public thoroughfares or transit hubs."
                       : "Extra field documentation required. All long-form Field Notes earn a massive 25% energy bonus."}
                   </p>
                 </div>
                 
                 <div className="flex justify-between items-center pt-4 border-t border-on-surface/10">
                    <div className="flex items-center gap-3">
                       <div className={cn("w-4 h-4 rounded-full animate-pulse shadow-[0_0_10px_var(--color-brand-orange)]", getSubmissionPointWindow(currentWeekNumber) === 'full' ? 'bg-green-500' : 'bg-brand-orange')} />
                       <span className="micro-label opacity-60 font-black tracking-widest italic">Status: {getSubmissionPointWindow(currentWeekNumber) === 'full' ? 'Operational_Full_Yield' : 'Late_Review_Windows_Active'}</span>
                    </div>
                    <p className="micro-label opacity-40 font-black tracking-[0.3em] italic">SIGNAL_STRENGTH: 98%_OPTIMIZED</p>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Field Check Alert Overlay */}
      <AnimatePresence>
        {incomingFieldCheck && fieldCheckData && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <Card className="bg-error/10 border-2 border-error p-6 flex items-start gap-6 relative">
              <div className="bg-error text-white p-3 rounded-full">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-grow space-y-1">
                <div className="flex justify-between items-center">
                  <h4 className="font-display text-xl uppercase text-error">Field Check Required</h4>
                  <Sticker color="mustard" className="text-[8px] opacity-100">AUDIT PENDING</Sticker>
                </div>
                <p className="font-serif text-sm text-on-surface">Your entry for <strong>{fieldCheckData}</strong> is under review.</p>
                <p className="micro-label opacity-40">Entry point adjustment may occur after admin review.</p>
              </div>
              <button 
                onClick={resolveIncomingFieldCheck}
                className="absolute top-2 right-2 micro-label opacity-40 hover:opacity-100"
              >
                Dismiss
              </button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress Monitor */}
      <div className="relative group">
        <div className="flex">
           <div className="bg-on-surface text-brand-lime px-10 py-4 text-[12px] uppercase font-bold tracking-wider italic border-4 border-on-surface relative z-10 -mb-[4px] ml-6 shadow-[6px_6px_0px_rgba(0,0,0,0.15)] flex items-center gap-3">
              <Zap className="w-5 h-5 fill-brand-lime" />
              {fc('SUB_STATION_MONITOR', 'PROGRESS')}
           </div>
        </div>

        <Card 
          variant={!isPlain && !isBaja && !isDiamond && !isHeat ? "high-voltage" : "default"}
          className={cn(
          "relative overflow-hidden group transition-all duration-300",
          isPlain ? "bg-on-surface/5 border-on-surface p-6 rounded-none shadow-none" :
          isBaja ? "border-baja-pink/20 rounded-[2rem] shadow-[12px_12px_0px_#40e0d0]" : 
          isDiamond ? "bg-white/5 border-white/10 rounded-sm shadow-[0_0_30px_rgba(255,255,255,0.05)]" :
          isHeat ? "bg-white border-white rounded-[2.5rem] shadow-[15px_15px_0px_rgba(255,140,0,0.5)] border-solid rotate-[-1deg]" :
          "p-0 border-4 border-on-surface shadow-[24px_24px_0px_0px_var(--color-on-surface)]"
        )}>
          {(isBaja || isDiamond) && !isPlain && <GlossOverlay opacity={isDiamond ? 0.2 : 0.3} />}
          
          <div className={cn("space-y-12 pt-16 p-12 relative z-10", isPlain && "pt-0 p-0")}>
            <div className="flex justify-between items-end">
              <div>
                <p className="micro-label font-bold tracking-wider mb-8 opacity-50 italic">
                  {isPlain ? 'PROGRESS' : isBaja ? 'Vibe Check' : isDiamond ? 'Lens Calibration' : isHeat ? 'Log Heat' : fc('SUBSYTEM_STABILITY_FLOW.04 // ONBOARDING_METRICS', 'ONBOARDING PROGRESS')}
                </p>
                <div className="flex items-baseline gap-6">
                  <h3 className={cn(
                    "font-display leading-none tracking-tight italic font-bold", 
                    isPlain ? "text-4xl uppercase" :
                    isBaja ? "text-baja-pink text-shadow-sm text-5xl" : 
                    isDiamond ? "text-white font-mono uppercase tracking-[0.3em] font-normal" :
                    isHeat ? "text-heat-pink text-5xl" :
                    "text-huge text-[8rem] md:text-[10rem] drop-shadow-[8px_8px_0_var(--color-brand-cyan)]"
                  )}>
                    {soloTripsCount}
                  </h3>
                  <span className="opacity-10 text-6xl font-display font-bold italic">/</span>
                  <span className="opacity-30 text-6xl font-display font-bold tracking-tight italic">{onboardingRequired}</span>
                </div>
              </div>
              {!isPlain && (
                <div className="flex flex-col items-end">
                   <div className="bureau-tag bg-brand-magenta text-white rotate-6 translate-x-8 mb-6 shadow-[4px_4px_0px_black] italic font-bold px-5 py-2.5">CALIBRATED_VIBE</div>
                   <span className={cn(
                    "font-bold leading-none opacity-10 text-[8rem] md:text-[10rem] -mb-12 -mr-6 italic",
                    isBaja && "text-baja-aqua",
                    isDiamond && "text-white/20",
                    isHeat && "text-heat-mango",
                    !isBaja && !isDiamond && !isHeat && "text-on-surface"
                  )}>
                    {Math.min(100, Math.round((soloTripsCount / onboardingRequired) * 100))}%
                  </span>
                </div>
              )}
            </div>
            <div className={cn(
              "w-full h-16 border-4 border-on-surface shadow-[8px_8px_0px_rgba(0,0,0,0.1)] p-2.5 bg-paper-dark relative overflow-hidden",
              isPlain ? "bg-on-surface/10 rounded-none h-4" :
              isBaja ? "bg-white border-baja-aqua rounded-full h-4" : 
              isDiamond ? "bg-white/10 border-white/20 h-4" :
              isHeat ? "bg-heat-yellow border-white rounded-full h-4" :
              ""
            )}>
              <div className={cn(
                "h-full transition-all duration-1000 relative overflow-hidden",
                isPlain ? "bg-on-surface" :
                isBaja ? "bg-baja-pink" : 
                isDiamond ? "liquid-chrome" :
                isHeat ? "bg-heat-pink" :
                "bg-brand-lime border-2 border-on-surface shadow-[0_0_15px_var(--color-brand-lime)]"
              )} style={{ width: `${(soloTripsCount / onboardingRequired) * 100}%` }}>
                 <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.6)_50%,transparent_100%)] animate-shimmer scale-x-[2] blur-sm" />
              </div>
            </div>
            {!isPlain && (
              <div className="flex justify-between items-center py-4 border-t-2 border-dashed border-on-surface/20">
                <p className={cn(
                  "font-mono text-sm uppercase font-black tracking-[0.25em] italic", 
                  isBaja ? "text-baja-coral font-serif" : 
                  isDiamond ? "text-diamond-silver" :
                  isHeat ? "text-heat-mango font-display" :
                  "text-brand-orange"
                )}>
                  {soloTripsCount >= onboardingRequired 
                    ? fc("UNLOCKED: CREW_OPS_ACTIVE // FULL_ACCESS_GRANTED", "CREW MODE UNLOCKED")
                    : fc(`RESTRICTED: ${onboardingRequired - soloTripsCount} SCANS_REMAINING_FOR_SQUAD_UPGRADE`, `${onboardingRequired - soloTripsCount} MISSIONS LEFT UNTIL CREW MODE`)}
                </p>
                {!isBaja && !isDiamond && !isHeat && (
                  <div className="flex items-center gap-4">
                     <span className="micro-label opacity-40 font-black italic">SIGNAL_LOCK: SECURE</span>
                     <div className="w-4 h-4 bg-brand-orange animate-ping rounded-full shadow-[0_0_10px_var(--color-brand-orange)]" />
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Active / Recommended Trip */}
      <section className="space-y-8">
        <div className="flex justify-between items-center">
          <h3 className={cn(
            "font-display text-3xl font-black uppercase tracking-tighter text-on-surface", 
            isBaja && "text-baja-pink font-display uppercase font-normal",
            isPlain && "text-4xl"
          )}>
            {isPlain ? fc('THE MISSION', 'MISSION') : isBaja ? 'Next Glam Assignment' : fc('Current Directive_', 'Current Mission')}
          </h3>
          {!isPlain && activeTrip && rerollsAvailable > 0 && (
            <button 
              onClick={useReroll}
              className={cn(
                "font-mono text-[10px] font-black uppercase tracking-widest hover:text-brand-orange transition-colors bg-on-surface/5 px-2 py-1 border-2 border-transparent hover:border-brand-orange/20",
                isBaja ? "text-baja-aqua" : "text-on-surface grayscale hover:grayscale-0"
              )}
            >
              REQUEST_REASSIGNMENT ({rerollsAvailable})
            </button>
          )}
        </div>

        {recommendedTrip ? (
          <div className="flex flex-col group">
            {!isPlain && !isBaja && !isDiamond && !isHeat && (
              <div className="flex">
                <div className="bg-on-surface text-brand-lime px-10 py-3 text-[11px] uppercase font-black tracking-[0.4em] italic border-4 border-on-surface relative z-10 -mb-[4px] ml-6 shadow-[6px_6px_0px_rgba(0,0,0,0.15)] flex items-center gap-3">
                   MANIFEST_ID_{recommendedTrip.id}
                </div>
              </div>
            )}
            <div className={cn(
              "flex flex-col gap-10 transition-all duration-500 relative",
              isPlain ? "bg-on-surface text-paper border-none shadow-none rounded-none p-12" :
              isBaja ? "border-baja-pink rounded-[3rem] p-8 border-4" : 
              isDiamond ? "bg-white/5 border-white/20 rounded-md backdrop-blur-md p-8 border" :
              isHeat ? "bg-white border-white rounded-[3rem] shadow-[20px_20px_0px_rgba(255,140,0,0.3)] border-solid p-8" :
              "bg-white border-4 border-on-surface p-12 shadow-[32px_32px_0px_0px_var(--color-on-surface)] group-hover:shadow-[40px_40px_0px_0px_var(--color-brand-cyan)] transition-transform duration-500 hover:-translate-y-2"
            )}>
              {/* Decorative Corner Prism */}
              {!isPlain && !isBaja && !isDiamond && !isHeat && (
                <div className="absolute top-0 right-0 w-32 h-32 prism-bg opacity-[0.03] -skew-x-12 translate-x-16 -translate-y-16 pointer-events-none" />
              )}
              
              <div className={cn("flex flex-col md:flex-row gap-12", isPlain && "md:flex-col")}>
                {!isPlain && (
                  <div className={cn(
                    "w-full md:w-5/12 aspect-[4/5] overflow-hidden shrink-0 relative",
                    isBaja ? "rounded-[2rem] border-white shadow-xl rotate-[-3deg] border-2" : 
                    isDiamond ? "border-white/40 rounded-none grayscale transition-all hover:grayscale-0 border-2" :
                    isHeat ? "rounded-[2.5rem] border-white shadow-lg rotate 3 border-2" :
                    "border-4 border-on-surface shadow-[10px_10px_0px_black] rotate-[-1deg] group-hover:rotate-0 transition-transform duration-700"
                  )}>
                    <img src={recommendedTrip.image} alt={recommendedTrip.title} className={cn(
                      "w-full h-full object-cover transition-all duration-1000 group-hover:scale-110",
                      (!isBaja && !isDiamond && !isHeat) && "grayscale-[0.2] group-hover:grayscale-0"
                    )} />
                    {/* Retro Filter Overlay */}
                    <div className="absolute inset-0 bg-brand-lime/10 mix-blend-overlay opacity-30 pointer-events-none" />
                    
                    {!isBaja && !isDiamond && !isHeat && (
                      <div className="absolute bottom-6 left-6 right-6 bg-on-surface text-brand-lime font-black text-[11px] px-5 py-3 uppercase tracking-[0.3em] italic border border-brand-lime/30 shadow-[0_10px_30px_rgba(0,0,0,0.5)] z-20">
                        LENS_REF // ACTIVE_MOD_HV
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex-grow space-y-10 z-10 text-left">
                  <div className="space-y-8">
                    {!isPlain && (
                      <div className="flex flex-wrap gap-4">
                        <span className="p-1.5 px-6 bg-on-surface text-brand-lime font-bold text-[12px] uppercase tracking-wider italic shadow-[6px_6px_0px_black] border-2 border-on-surface">TYPE: {recommendedTrip.type}</span>
                        {recommendedTrip.detour && <span className="p-1.5 px-6 border-2 border-brand-orange text-brand-orange font-bold text-[12px] uppercase tracking-wider italic shadow-[6px_6px_0px_black] bg-white translate-y-1">DETOUR_BONUS // +{recommendedTrip.detour?.points ?? 0}</span>}
                        {isBaja && <BeachTag>HOT-GIRL SUMMER</BeachTag>}
                        {recentTripIds.includes(recommendedTrip.id) && (
                           <span className="p-1 px-5 bg-brand-orange text-white font-bold text-[11px] uppercase tracking-wider flex items-center gap-3 shadow-[6px_6px_0px_black] rotate-2">
                             <Timer className="w-4 h-4 stroke-[3]" /> COOLDOWN // LOCK_SEC_7D
                           </span>
                        )}
                      </div>
                    )}
                    <h4 className={cn(
                      "font-display mb-6 tracking-tight leading-[0.85] font-bold uppercase italic",
                      isPlain ? "text-6xl text-paper" :
                      isBaja ? "text-baja-pink text-shadow-sm" : 
                      isDiamond ? "liquid-chrome bg-clip-text text-transparent" :
                      isHeat ? "text-heat-pink" :
                      "text-huge text-[6rem] md:text-[8rem] text-on-surface drop-shadow-[6px_6px_0_var(--color-brand-cyan)]"
                    )}>{recommendedTrip.title}</h4>
                    
                    <div className="space-y-8">
                      <div className="flex items-center gap-5">
                         <div className="w-16 h-[3px] bg-brand-lime" />
                         <p className={cn("micro-label opacity-100 text-brand-lime bg-on-surface px-5 py-2 font-bold tracking-wider italic", isPlain && "text-paper opacity-60")}>OPERATIONAL_MANDATE</p>
                      </div>
                      <p className={cn(
                        "font-serif text-3xl md:text-5xl leading-relaxed font-medium italic pr-6",
                        isPlain ? "text-2xl text-paper" :
                        isDiamond ? "text-white/80" : "text-on-surface/90"
                      )}>
                        "{recommendedTrip.theAsk}"
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {!isPlain && !isBaja && !isDiamond && !isHeat && (
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12 border-t-4 border-on-surface/10">
                    {([
                      { id: 'Standard', label: 'Standard_Ops', color: 'bg-white' },
                      { id: 'Advanced', label: 'Advanced_Signal', color: 'bg-brand-lime/5' },
                      { id: 'Certified', label: 'Authorized_Vibe', color: 'bg-brand-orange/5' }
                    ] as const).map((level) => {
                      const levelData = recommendedTrip.levels[level.id as keyof typeof recommendedTrip.levels];
                      return (
                        <div key={level.id} className={cn("space-y-6 p-8 border-4 border-on-surface shadow-[10px_10px_0px_rgba(0,0,0,0.1)] hover:shadow-[14px_14px_0px_black] transition-all relative overflow-hidden group/level", level.color)}>
                          <div className="flex justify-between items-center relative z-10">
                            <p className="micro-label font-black uppercase text-[11px] tracking-[0.3em] italic">{level.label}</p>
                            <span className="text-[12px] font-black font-mono text-white bg-on-surface px-3 py-1 shadow-[4px_4px_0px_var(--color-brand-orange)] italic">+{levelData?.points ?? 0}_XP</span>
                          </div>
                          <p className="text-[12px] leading-snug opacity-80 italic font-bold relative z-10 h-12 pr-6 text-on-surface">"{levelData?.description || 'Standard field protocol.'}"</p>
                          <div className="absolute bottom-0 right-0 w-12 h-12 bg-on-surface/5 -rotate-45 translate-x-6 translate-y-6 group-hover/level:translate-x-0 group-hover/level:translate-y-0 transition-transform" />
                        </div>
                      );
                    })}
                 </div>
              )}

              {!isPlain && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-10 border-t-4 border-on-surface/5 text-left">
                  <div className="space-y-8">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 micro-label text-brand-orange font-black tracking-[0.2em]">
                        <Camera className="w-5 h-5 stroke-[2.5]" />
                        REQUIRED_EVIDENCE_TYPE
                      </div>
                      <p className="text-sm font-mono font-black uppercase tracking-tight bg-white p-4 inline-block border-2 border-black shadow-[4px_4px_0px_var(--color-brand-lime)]">{recommendedTrip.proofNeeded}</p>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 micro-label opacity-40 font-black tracking-[0.2em]">
                        <Zap className="w-5 h-5 stroke-[2.5]" />
                        INTEL_COLLECTION_PROMPT
                      </div>
                      <p className="text-sm font-serif font-medium italic opacity-80 leading-relaxed border-l-8 border-brand-lime pl-6 py-2">"{recommendedTrip.fieldNotePrompt}"</p>
                    </div>
                  </div>

                  <div className="space-y-8">
                    {recommendedTrip.detour && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 micro-label text-brand-orange font-black tracking-[0.2em]">
                          <ChromeStar className="w-5 h-5" />
                          FIELD_DETOUR_PROTOCOL (+{recommendedTrip.detour?.points ?? 0})
                        </div>
                        <p className="text-sm font-mono font-black opacity-70 leading-tight bg-brand-orange/5 p-4 border-2 border-dashed border-brand-orange/20">{recommendedTrip.detour?.description || 'Extra field discovery bonus available if authorized.'}</p>
                      </div>
                    )}
                    {fieldTypeData && (
                      <div className="relative group/perk">
                         <div className="bg-on-surface text-brand-lime px-4 py-1 text-[9px] uppercase font-black tracking-[0.3em] italic border-2 border-on-surface relative z-10 -mb-[2px] ml-4 shadow-[2px_2px_0px_black] w-fit">
                            LOG_PERK
                         </div>
                         <div className={cn(
                          "p-6 border-2 shadow-[8px_8px_0px_black] group-hover/perk:shadow-[12px_12px_0px_var(--color-brand-lime)] transition-all duration-300",
                          isBaja ? "bg-baja-aqua/10 border-baja-aqua" : 
                           isDiamond ? "bg-white/5 border-white/40" :
                          "bg-brand-lime/10 border-on-surface"
                        )}>
                          <p className="micro-label opacity-40 font-black tracking-[0.15em] text-[9px] mb-1">{(fieldTypeData?.name || 'FIELD').toUpperCase()} OPERATIONAL_BONUS</p>
                          <p className="font-display text-3xl uppercase tracking-tighter font-black text-on-surface italic">{fieldTypeData?.perk || 'Standard Clearance'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!isPlain && (
                <div className="flex flex-col md:flex-row gap-6 pt-6 text-left opacity-30">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 micro-label font-black">
                      <Info className="w-3 h-3" />
                      ACCESSIBILITY_NOTE
                    </div>
                    <p className="text-[10px] leading-tight font-mono font-bold uppercase tracking-tight">{recommendedTrip.accessibilityNote || 'Standard field conditions apply.'}</p>
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 micro-label font-black">
                      <Users className="w-3 h-3" />
                      CREW_BEHAVIOR
                    </div>
                    <p className="text-[10px] leading-tight font-mono font-bold uppercase tracking-tight">{recommendedTrip.crewModeBehavior || 'No specific crew modifiers.'}</p>
                  </div>
                </div>
              )}

              <div className={cn("flex flex-col gap-8 pt-12", !isPlain && "flex-row")}>
                {recentTripIds.includes(recommendedTrip.id) ? (
                   <div className="flex-grow flex items-center justify-center bg-on-surface border-4 border-on-surface py-12 opacity-80 cursor-not-allowed shadow-[16px_16px_0px_var(--color-brand-orange)]">
                     <p className="font-display text-5xl uppercase tracking-tighter flex items-center gap-8 font-black text-white italic">
                        <Lock className="w-16 h-16 text-brand-orange stroke-[3]" /> COOLDOWN_LOCK
                     </p>
                   </div>
                ) : isWeekLocked(recommendedTrip.weekNumber || 0) ? (
                  <div className="flex-grow flex items-center justify-center bg-on-surface/10 border-4 border-on-surface/20 py-12 opacity-50 cursor-not-allowed">
                    <p className="font-display text-5xl uppercase tracking-tighter flex items-center gap-8 font-black italic">
                       <Lock className="w-16 h-16 stroke-[3]" /> WINDOW_CLOSED
                    </p>
                  </div>
                ) : (
                  <Link 
                    to={`/capture?id=${recommendedTrip.id}`}
                    className={cn(
                      "flex-grow justify-center transition-all inline-flex items-center gap-8 group relative overflow-hidden",
                      isPlain ? "bg-white text-on-surface uppercase font-display text-4xl py-10 tracking-tighter" :
                      isBaja ? "bg-baja-pink text-white rounded-full font-display text-3xl tracking-widest shadow-[8px_8px_0_#ff007f] hover:translate-y-1 hover:shadow-none py-6" : 
                      isDiamond ? "bg-white text-black rounded-none shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-[1.02] py-6" :
                      isHeat ? "bg-heat-pink text-white rounded-full shadow-[0px_8px_0px_#cc0066] border-4 border-white hover:bg-heat-aqua py-6" :
                      "bg-brand-orange text-white border-4 border-on-surface py-12 shadow-[20px_20px_0px_var(--color-on-surface)] hover:bg-on-surface hover:shadow-[24px_24px_0px_var(--color-brand-lime)] active:translate-x-3 active:translate-y-3 active:shadow-none font-black italic"
                    )}
                  >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                    <Camera className="w-16 h-16 relative z-10 stroke-[3]" />
                    <span className="font-display font-bold text-6xl md:text-8xl uppercase tracking-tight relative z-10 italic">
                      {isPlain ? 'GO' : isBaja ? 'GET THE PROB' : isDiamond ? 'LOG EVIDENCE' : isHeat ? 'CANNONBALL' : fc('SECURE_EVIDENCE', 'GO')}
                    </span>
                    <div className="absolute top-2 right-4 flex items-center gap-1 opacity-40">
                       <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                       <span className="font-mono text-[9px] uppercase font-black">LOG_ACTIVE</span>
                    </div>
                  </Link>
                )}
                
                {!isPlain && !profile?.maybeList?.includes(recommendedTrip.id) && !recentTripIds.includes(recommendedTrip.id) && (
                  <button 
                    onClick={() => addToMaybeList(recommendedTrip.id)}
                    className="px-12 border-4 border-on-surface bg-white hover:bg-brand-lime transition-all active:translate-x-2 active:translate-y-2 active:shadow-none shadow-[16px_16px_0px_black] group"
                  >
                    <Timer className="w-16 h-16 stroke-[3] group-hover:scale-110 transition-transform text-on-surface" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <button 
            onClick={drawTrip}
            className="w-full bg-white border-8 border-dashed border-on-surface/10 py-32 hover:border-brand-orange hover:bg-brand-orange/5 transition-all group relative overflow-hidden"
          >
            <div className="flex flex-col items-center gap-6 relative z-10">
              <span className="font-display text-5xl md:text-7xl font-black uppercase tracking-tighter opacity-20 group-hover:opacity-100 group-hover:text-brand-orange transition-all duration-500">Draw_Trip_Card</span>
              <p className="micro-label font-black tracking-[0.4em] opacity-40 uppercase">Next mission packet pending in queue</p>
            </div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
               <RotateCcw className="w-64 h-64 opacity-[0.02] animate-spin-slow" />
            </div>
          </button>
        )}
      </section>

      {/* Recommended for Your Field Type */}
      {!isPlain && recommendedForPersona.length > 0 && (
        <section className="space-y-12">
          <div className="space-y-3 text-left border-b-4 border-on-surface pb-6">
            <h3 className={cn(
              "font-display text-4xl font-black uppercase tracking-tighter text-on-surface italic",
              isBaja && "text-baja-pink"
            )}>
              Persona-Matched Missions_HV.DECODE
            </h3>
            <p className="font-serif italic text-2xl opacity-60 font-medium leading-tight">
              "Trevor curated these based on your field behavior metrics. Highly recommended for asset growth."
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {recommendedForPersona.map(trip => (
              <div key={trip.id}>
                <div className="bg-white border-4 border-on-surface shadow-[12px_12px_0px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col h-full group hover:shadow-[16px_16px_0px_var(--color-brand-orange)] transition-all hover:-translate-y-1">
                  <div className="aspect-[4/3] relative overflow-hidden border-b-4 border-on-surface">
                    <img 
                      src={trip.image} 
                      alt={trip.title} 
                      className="w-full h-full object-cover grayscale transition-all duration-1000 group-hover:grayscale-0 group-hover:scale-110" 
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-on-surface text-white p-5 border-t-2 border-on-surface">
                      <span className="text-[11px] font-black font-mono uppercase tracking-[0.3em] text-brand-orange block mb-1 italic">
                        SIGNAL_{trip.type.toUpperCase()}
                      </span>
                      <h4 className="font-display text-2xl leading-none uppercase font-black tracking-tighter truncate italic">
                        {trip.title}
                      </h4>
                    </div>
                  </div>
                  <div className="p-6 flex gap-4 mt-auto">
                    <Link 
                      to={`/capture?id=${trip.id}`} 
                      className="flex-grow py-5 bg-on-surface text-brand-lime text-center font-display text-lg font-black uppercase tracking-widest hover:bg-brand-orange hover:text-white transition-all border-2 border-on-surface shadow-[6px_6px_0px_black] active:translate-x-1 active:translate-y-1 active:shadow-none italic"
                    >
                      SELECT_OPS
                    </Link>
                    {!profile?.maybeList?.includes(trip.id) && (
                      <button 
                        onClick={() => addToMaybeList(trip.id)}
                        className="p-5 border-4 border-on-surface hover:bg-brand-lime transition-all active:translate-x-1 active:translate-y-1 shadow-[4px_4px_0px_black] active:shadow-none"
                      >
                        <Timer className="w-7 h-7 stroke-[3] text-on-surface" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Maybe List (Wait List) */}
      {maybeTrips.length > 0 && !isPlain && (
        <section className="space-y-10">
          <div className="flex justify-between items-center text-left border-b-4 border-on-surface/10 pb-6">
            <h3 className="font-display text-4xl font-black uppercase tracking-tighter text-on-surface opacity-30 flex items-center gap-4 italic">
              <Timer className="w-8 h-8 stroke-[3]" />
              MISSION_QUEUE_UPLINK
            </h3>
            <span className="p-2 px-4 border-4 border-on-surface text-on-surface font-black micro-label text-sm italic shadow-[4px_4px_0px_black]">{maybeTrips.length} ASSETS_STAGED</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {maybeTrips.map(trip => (
              <div key={trip.id} className="p-8 border-4 border-on-surface bg-white shadow-[12px_12px_0px_rgba(0,0,0,0.05)] flex justify-between items-center group hover:shadow-[16px_16px_0px_var(--color-brand-cyan)] transition-all hover:-translate-y-1">
                <div className="text-left space-y-2">
                   <p className="text-[11px] font-mono font-black opacity-40 uppercase tracking-[0.3em] italic">{trip.type}</p>
                   <h4 className="font-display text-3xl uppercase leading-none font-black tracking-tighter italic">{trip.title}</h4>
                </div>
                <div className="flex gap-6">
                  <Link 
                    to={`/capture?id=${trip.id}`} 
                    className="p-5 bg-on-surface text-brand-lime hover:bg-brand-orange hover:text-white transition-all border-2 border-on-surface shadow-[6px_6px_0px_black] active:translate-x-1 active:translate-y-1 active:shadow-none"
                  >
                    <Zap className="w-6 h-6 stroke-[3] fill-current" />
                  </Link>
                  <button 
                    onClick={() => removeFromMaybeList(trip.id)} 
                    className="p-5 border-4 border-on-surface/10 hover:border-brand-orange hover:text-brand-orange transition-all hover:bg-brand-orange/5"
                  >
                    <RotateCcw className="w-6 h-6 stroke-[3]" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Journal Snippets */}
      <section className="space-y-12 pb-24">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 text-left border-b-8 border-on-surface pb-8 mb-12 relative">
          <div className="space-y-2">
             <div className="flex items-center gap-4">
                <div className="w-12 h-[3px] bg-brand-orange" />
                <span className="micro-label text-brand-orange font-black tracking-[0.4em] italic leading-none">SIGNAL_RECORD_ARCHIVE</span>
             </div>
             <h3 className={cn("text-huge text-8xl italic font-black drop-shadow-[6px_6px_0_var(--color-brand-lime)]", isBaja && "text-baja-pink")}>
               {isBaja ? 'Beach Log_001' : 'Field_Recordings'}
             </h3>
          </div>
          <div className="flex flex-col items-end">
            <p className="micro-label font-black tracking-[0.3em] opacity-40 uppercase hidden md:block italic mb-2">Synchronizing_Live_Broadcast_Signals</p>
            <div className="w-48 h-1 bg-on-surface/10 relative overflow-hidden">
               <motion.div 
                 className="absolute inset-0 bg-brand-lime"
                 animate={{ x: ["-100%", "100%"] }}
                 transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
               />
            </div>
          </div>
        </div>
        <div className="flex gap-12 overflow-x-auto pb-12 no-scrollbar scroll-smooth p-6 -mx-6">
          {entries.length > 0 ? (
            <>
              {entries.map((e, i) => (
                <EntryCard 
                  key={e.id} 
                  entry={e} 
                  className={cn(
                    "min-w-[340px] transform transition-transform hover:scale-[1.02] hover:z-20",
                    i % 2 === 0 ? "rotate-[-1deg]" : "rotate-[1deg]",
                    isBaja ? "border-baja-pink/40 bg-white shadow-xl" : "border-2 border-on-surface shadow-[16px_16px_0px_rgba(0,0,0,0.05)] bg-white hover:shadow-[20px_20px_0px_var(--color-brand-orange)]"
                  )}
                />
              ))}
              {hasMoreEntries && (
                <button 
                  onClick={loadMoreEntries}
                  className="flex-shrink-0 min-w-[360px] bg-white border-4 border-dashed border-on-surface/10 flex flex-col items-center justify-center gap-10 hover:border-brand-orange/40 hover:bg-brand-orange/5 transition-all group p-16 shadow-[16px_16px_0px_rgba(0,0,0,0.02)]"
                >
                  <div className="w-24 h-24 bg-on-surface text-brand-lime flex items-center justify-center border-2 border-on-surface shadow-[6px_6px_0px_black] group-hover:rotate-180 group-hover:bg-brand-orange transition-transform duration-700">
                    <RotateCcw className="w-12 h-12 stroke-[2.5]" />
                  </div>
                  <div className="text-center">
                    <p className="font-display text-4xl tracking-tighter uppercase font-black opacity-30 group-hover:opacity-100 group-hover:text-on-surface transition-all italic">Sync_Records</p>
                    <p className="micro-label opacity-20 font-black mt-2">PULL_LATEST_SECTOR_DATA</p>
                  </div>
                </button>
              )}
            </>
          ) : (
            <div className="w-full bg-paper-dark border-4 border-dashed border-on-surface/10 py-32 text-center rounded-none shadow-inner">
               <div className="flex flex-col items-center gap-6">
                  <Camera className="w-16 h-16 opacity-10" />
                  <p className="font-serif italic text-3xl opacity-40 font-medium max-w-sm mx-auto">
                    "{fieldTypeData?.emptyState || "Archive currently empty. Secure your first evidence log in the field."}"
                  </p>
               </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
