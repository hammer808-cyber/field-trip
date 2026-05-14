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
  const { frankieMode, skin } = useTheme();
  
  const isPlain = profile?.plainMode || frankieMode;
  const onboardingRequired = gameConfig?.onboardingEntriesRequired || 3;
  
  const fieldTypeData = FIELD_TYPES[fieldType || 'unclassified'];

  const fieldCheckData = incomingFieldCheck ? getFieldCheckLabel(incomingFieldCheck.reason) : null;
  const isBaja = skin === 'baja-bratz';
  const isDiamond = skin === 'slippery-diamond';
  const isHeat = skin === 'heatwave';

  if (!isSeasonActive && !activeSeason) {
    return (
      <div className="pb-40 px-6 pt-12 space-y-12 max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[80vh]">
        <AlertTriangle className="w-16 h-16 opacity-10" />
        <div className="text-center space-y-4">
          <h2 className="font-display text-4xl uppercase tracking-tighter">Deck Unavailable</h2>
          <p className="font-serif italic opacity-60">"The trip deck is empty. No seasonal broadcast detected in your sector."</p>
        </div>
        <Link to="/" className="bureau-btn bg-on-surface text-paper">Return to Base</Link>
      </div>
    );
  }

  // Filter for Maybe List
  const maybeTrips = MOCK_TRIPS.filter(t => profile?.maybeList?.includes(t.id));

  // Determine "Do This Next"
  const recommendedTrip = activeTrip || MOCK_TRIPS.find(t => t.id === fieldTypeData?.firstTripId) || MOCK_TRIPS[0];

  // Recommended for Field Type
  const recommendedForPersona = MOCK_TRIPS.filter(t => {
    if (!fieldTypeData?.recommendedChallengeTags || t.id === recommendedTrip?.id) return false;
    return (t.tags || []).some(tag => fieldTypeData.recommendedChallengeTags.includes(tag));
  }).slice(0, 3);

  // Recently completed (last 7 days)
  const sevenDaysAgo = getServerDate();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentTripIds = entries
    .filter(e => {
        const d = e.createdAt?.toDate ? e.createdAt.toDate() : new Date(e.createdAt);
        return d > sevenDaysAgo;
    })
    .map(e => e.tripId);

  return (
    <div className={cn(
      "pb-40 px-6 pt-12 space-y-12 max-w-4xl mx-auto relative overflow-hidden",
      isPlain && "max-w-2xl pt-6 space-y-8"
    )}>
      {/* Comeback Card */}
      <AnimatePresence>
        {profile?.comebackCardActive && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="p-6 bg-brand-orange text-white border-4 border-on-surface shadow-[8px_8px_0px_black] rotate-1 relative z-50 overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-2 opacity-20">
              <RotateCcw className="w-12 h-12" />
            </div>
            <h3 className="font-display text-4xl uppercase leading-none">Welcome Back Agent</h3>
            <p className="font-mono text-sm mt-1">Lapsed energy restored. Field bonus available.</p>
            <button 
              onClick={useComebackCard}
              className="mt-6 w-full bg-white text-on-surface py-3 font-display uppercase tracking-widest hover:bg-on-surface hover:text-white transition-all shadow-[4px_4px_0px_gray]"
            >
              Collect Bonus Points (+25)
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Plain Mode Header */}
      {isPlain && (
        <header className="border-b-4 border-on-surface pb-6">
           <h1 className="text-6xl font-display uppercase tracking-tighter leading-none">The Mission</h1>
           <p className="font-mono text-sm mt-2 opacity-60">DO ONE THING. DO IT WELL.</p>
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

      <header className="flex items-end justify-between relative">
        <div className="space-y-2">
          <p className="micro-label">
            {isBaja ? 'Coastal Operations' : 
             isDiamond ? 'Diamond Sector / 01' : 
             isHeat ? 'Heatwave Control' :
             'UNIT: DISPATCH // SECTOR: URBAN'}
          </p>
          <h2 className={cn(
            "text-huge leading-none",
            isBaja ? "text-baja-pink drop-shadow-[4px_4px_0_#40e0d0]" : 
            isDiamond ? "liquid-chrome bg-clip-text text-transparent filter drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]" :
            isHeat ? "text-white drop-shadow-[0_4px_#ff007f] font-display" :
            "text-on-surface"
          )}>
            {isBaja ? 'The Glow Up' : isDiamond ? 'The Vault' : isHeat ? 'The Hot List' : 'Dispatch'}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="micro-label opacity-40">WEEK {currentWeekNumber}</span>
            {isReviewWindowOpen(currentWeekNumber) && (
              <Sticker color="orange" className="text-[8px] py-0">REVIEW_WINDOW_OPEN</Sticker>
            )}
          </div>
          {!isBaja && !isDiamond && !isHeat && <p className="bureau-subhead">Operational field trips for authorized agents.</p>}
        </div>
        <div className="text-right">
          <p className={cn(
            "micro-label", 
            isBaja ? "text-baja-pink font-accent" : 
            isDiamond ? "text-diamond-silver" : 
            isHeat ? "text-white font-display uppercase tracking-wider" :
            "text-on-surface opacity-60"
          )}>
            {isHeat ? 'Waves Left: ' : 'AUTH_REROLLS: '} {rerollsAvailable}
          </p>
        </div>
      </header>

      {/* Field Signals (Hidden in Plain) */}
      {!isPlain && <FieldSignalCard activeSignal={activeSignal} loading={loadingSignal} />}

      {/* Playful Observations (Hidden in Plain) */}
      {!isPlain && <ObservationFeed />}

      {/* Weekly Twist */}
      {!isPlain && activeWeekDrop?.chaosCardIds && activeWeekDrop.chaosCardIds.length > 0 && (
        <Card className="bg-brand-orange border-none shadow-[10px_10px_0px_white] p-6 text-white relative rotate-[-0.5deg] overflow-hidden">
           <Zap className="absolute top-[-20px] right-[-20px] w-32 h-32 opacity-10" />
           <div className="flex justify-between items-start mb-4">
              <h3 className="font-display text-2xl uppercase tracking-tighter">Weekly Protocol Twist</h3>
              <Sticker color="black" className="text-[10px]">ACTIVE_BUFF</Sticker>
           </div>
           <div className="space-y-4">
              <div className="p-4 bg-white/10 border border-white/20">
                <p className="font-mono text-xs uppercase opacity-80 mb-1">CHAOS_ID: {activeWeekDrop.chaosCardIds[0]}</p>
                <p className="font-serif italic text-lg leading-tight">
                  {currentWeekNumber % 2 === 0 
                    ? "Urban Echo: Double points for Evidence collected in public thoroughfares."
                    : "Low Signal: All Field Notes earn a flat 25% bonus for extra length."}
                </p>
              </div>
              <p className="micro-label opacity-60">Status: {getSubmissionPointWindow(currentWeekNumber) === 'full' ? 'Operational' : 'Review Window (Late Fees Apply)'}</p>
           </div>
        </Card>
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

      {/* Progress Card (Simplified in Plain) */}
      <Card 
        title={!isPlain && !isBaja && !isDiamond && !isHeat ? "FIELD CLEARANCE" : undefined}
        className={cn(
        "relative overflow-hidden group border-2 transition-all duration-300",
        isPlain ? "bg-on-surface/5 border-on-surface p-6 rounded-none shadow-none" :
        isBaja ? "border-baja-pink/20 rounded-[2rem] shadow-[12px_12px_0px_#40e0d0]" : 
        isDiamond ? "bg-white/5 border-white/10 rounded-sm shadow-[0_0_30px_rgba(255,255,255,0.05)]" :
        isHeat ? "bg-white border-white rounded-[2.5rem] shadow-[15px_15px_0px_rgba(255,140,0,0.5)] border-solid rotate-[-1deg]" :
        "p-0"
      )}>
        {(isBaja || isDiamond) && !isPlain && <GlossOverlay opacity={isDiamond ? 0.2 : 0.3} />}
        
        <div className={cn("space-y-6 pt-8 p-4 relative z-10", isPlain && "pt-0 p-0")}>
          <div className="flex justify-between items-end">
            <div>
              <span className="micro-label">
                {isPlain ? 'PROGRESS' : isBaja ? 'Vibe Check' : isDiamond ? 'Lens Calibration' : isHeat ? 'Log Heat' : 'REPORT FILING THRESHOLD'}
              </span>
              <h3 className={cn(
                "font-serif text-3xl", 
                isPlain ? "font-display text-4xl uppercase" :
                isBaja ? "text-baja-pink font-display uppercase tracking-wider" : 
                isDiamond ? "text-white font-mono uppercase tracking-[0.4em] font-normal" :
                isHeat ? "text-heat-pink font-display uppercase tracking-tight" :
                "font-display uppercase text-on-surface"
              )}>
                {soloTripsCount} / {onboardingRequired}
              </h3>
            </div>
            {!isPlain && (
              <span className={cn(
                "text-huge leading-none opacity-20 text-[4rem] text-on-surface",
                isBaja && "text-[5rem] text-baja-aqua",
                isDiamond && "text-[5rem] text-white/20",
                isHeat && "text-[5rem] text-heat-mango"
              )}>
                {Math.min(100, Math.round((soloTripsCount / onboardingRequired) * 100))}%
              </span>
            )}
          </div>
          <div className={cn(
            "w-full h-4 rounded-none overflow-hidden border",
            isPlain ? "bg-on-surface/10 border-on-surface rounded-none" :
            isBaja ? "bg-white border-baja-aqua rounded-full" : 
            isDiamond ? "bg-white/10 border-white/20" :
            isHeat ? "bg-heat-yellow border-white rounded-full" :
            "bg-paper-dark border-on-surface"
          )}>
            <div className={cn(
              "h-full transition-all duration-1000",
              isPlain ? "bg-on-surface" :
              isBaja ? "bg-baja-pink" : 
              isDiamond ? "liquid-chrome" :
              isHeat ? "bg-heat-pink" :
              "bg-on-surface border-r-2 border-brand-orange"
            )} style={{ width: `${(soloTripsCount / onboardingRequired) * 100}%` }} />
          </div>
          {!isPlain && (
            <p className={cn(
              "font-mono text-[10px] uppercase", 
              isBaja ? "text-baja-coral font-serif italic" : 
              isDiamond ? "text-diamond-silver font-mono text-xs uppercase" :
              isHeat ? "text-heat-mango font-display" :
              "text-on-surface opacity-40"
            )}>
              {soloTripsCount >= onboardingRequired 
                ? "MISSION CLEARANCE ATTAINED. CREW READY."
                : `ACTION: FILE ${onboardingRequired - soloTripsCount} MORE ENTRIES TO UNLOCK CREW.`}
            </p>
          )}
        </div>
      </Card>

      {/* Active / Recommended Trip */}
      <section className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className={cn(
            "font-display text-2xl uppercase tracking-tighter", 
            isBaja && "text-baja-pink font-display uppercase font-normal",
            isPlain && "text-4xl"
          )}>
            {isPlain ? 'YOUR MISSION' : isBaja ? 'Next Glam Mission' : 'Active Trip Card'}
          </h3>
          {!isPlain && activeTrip && rerollsAvailable > 0 && (
            <button 
              onClick={useReroll}
              className={cn(
                "micro-label hover:text-brand-orange transition-colors",
                isBaja ? "text-baja-aqua" : "text-on-surface"
              )}
            >
              REQUEST REASSIGNMENT ({rerollsAvailable})
            </button>
          )}
        </div>

        {recommendedTrip ? (
          <div className="flex flex-col">
            {!isPlain && !isBaja && !isDiamond && !isHeat && <div className="file-tab">TRIP_CARD // {recommendedTrip.id}</div>}
            <div className={cn(
              "notice-card flex flex-col gap-8 p-8 transition-all duration-500",
              isPlain ? "bg-on-surface text-paper border-none shadow-none rounded-none p-12" :
              isBaja ? "border-baja-pink rounded-[3rem] p-8 border-4" : 
              isDiamond ? "bg-white/5 border-white/20 rounded-md backdrop-blur-md p-8 border" :
              isHeat ? "bg-white border-white rounded-[3rem] shadow-[20px_20px_0px_rgba(255,140,0,0.3)] border-solid p-8" :
              "notice-card"
            )}>
              <div className={cn("flex flex-col md:flex-row gap-8", isPlain && "md:flex-col")}>
                {!isPlain && (
                  <div className={cn(
                    "w-full md:w-1/3 aspect-square overflow-hidden shrink-0",
                    isBaja ? "rounded-[2rem] border-white shadow-xl rotate-[-3deg] border-2" : 
                    isDiamond ? "border-white/40 rounded-none grayscale transition-all hover:grayscale-0 border-2" :
                    isHeat ? "rounded-[2.5rem] border-white shadow-lg rotate 3 border-2" :
                    "evidence-frame"
                  )}>
                    <img src={recommendedTrip.image} alt={recommendedTrip.title} className={cn(
                      "w-full h-full object-cover transition-all duration-500 hover:scale-110",
                      (!isBaja && !isDiamond && !isHeat) && "grayscale-[0.5] hover:grayscale-0"
                    )} />
                    {!isBaja && !isDiamond && !isHeat && <div className="evidence-label">TRIP_IMAGE_{recommendedTrip.id}</div>}
                  </div>
                )}
                
                <div className="flex-grow space-y-6 z-10">
                  <div className="space-y-4">
                    {!isPlain && (
                      <div className="flex flex-wrap gap-2">
                        <Sticker color="black" className="micro-label font-bold uppercase">{recommendedTrip.type}</Sticker>
                        {recommendedTrip.detour && <Sticker color="orange" className="micro-label font-bold">DETOUR +{recommendedTrip.detour.points}</Sticker>}
                        {isBaja && <BeachTag>HOT-GIRL SUMMER</BeachTag>}
                        {recentTripIds.includes(recommendedTrip.id) && (
                           <Sticker color="mustard" className="micro-label font-bold flex items-center gap-1">
                             <Timer className="w-3 h-3" /> REPEAT_LOCKED (7d)
                           </Sticker>
                        )}
                      </div>
                    )}
                    <h4 className={cn(
                      "font-display text-4xl mb-2",
                      isPlain ? "text-6xl text-paper" :
                      isBaja ? "text-baja-pink text-shadow-sm" : 
                      isDiamond ? "liquid-chrome bg-clip-text text-transparent font-black" :
                      isHeat ? "text-heat-pink font-display" :
                      "text-on-surface"
                    )}>{recommendedTrip.title}</h4>
                    
                    <div className="space-y-2">
                      <p className={cn("micro-label opacity-40", isPlain && "text-paper opacity-60")}>THE_ASK</p>
                      <p className={cn(
                        "font-serif text-xl leading-relaxed",
                        isPlain ? "text-2xl text-paper" :
                        isDiamond ? "text-white/80" : "text-on-surface"
                      )}>
                        {recommendedTrip.theAsk}
                      </p>
                    </div>

                    {!isPlain && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-dashed border-on-surface/10">
                        {(['light', 'standard', 'bold'] as const).map((level) => (
                          <div key={level} className="space-y-1 p-3 bg-on-surface/5 rounded-sm border border-transparent hover:border-brand-orange/20 transition-all">
                            <div className="flex justify-between items-center">
                              <p className="micro-label font-bold capitalize">{level}</p>
                              <span className="text-[10px] font-mono text-brand-orange">+{recommendedTrip.levels[level].points}</span>
                            </div>
                            <p className="text-[10px] leading-tight opacity-70 italic">"{recommendedTrip.levels[level].description}"</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {!isPlain && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-on-surface/10">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 micro-label opacity-40">
                        <Camera className="w-3 h-3" />
                        PROOF_NEEDED
                      </div>
                      <p className="text-xs font-mono opacity-80">{recommendedTrip.proofNeeded}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 micro-label opacity-40">
                        <Zap className="w-3 h-3" />
                        FIELD_NOTE_PROMPT
                      </div>
                      <p className="text-xs font-mono opacity-80 italic">"{recommendedTrip.fieldNotePrompt}"</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {recommendedTrip.detour && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 micro-label text-brand-orange">
                          <ChromeStar className="w-3 h-3" />
                          OPTIONAL_DETOUR (+{recommendedTrip.detour.points})
                        </div>
                        <p className="text-xs font-mono opacity-80">{recommendedTrip.detour.description}</p>
                      </div>
                    )}
                    {fieldTypeData && (
                      <div className={cn(
                        "p-4 border-l-4",
                        isBaja ? "bg-baja-aqua/10 border-baja-aqua" : 
                        isDiamond ? "bg-white/5 border-white/40" :
                        "bg-on-surface/5 border-on-surface"
                      )}>
                        <p className="micro-label opacity-40">{fieldTypeData.name.toUpperCase()} FIELD PERK</p>
                        <p className="font-display text-lg uppercase tracking-tight">{fieldTypeData.perk}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!isPlain && (
                <div className="flex flex-col md:flex-row gap-4 pt-4">
                  <div className="flex-1 space-y-1 opacity-40">
                    <div className="flex items-center gap-2 micro-label">
                      <Info className="w-3 h-3" />
                      ACCESSIBILITY_NOTE
                    </div>
                    <p className="text-[10px] leading-tight font-mono">{recommendedTrip.accessibilityNote || 'Standard field conditions apply.'}</p>
                  </div>
                  <div className="flex-1 space-y-1 opacity-40">
                    <div className="flex items-center gap-2 micro-label">
                      <Users className="w-3 h-3" />
                      CREW_BEHAVIOR
                    </div>
                    <p className="text-[10px] leading-tight font-mono">{recommendedTrip.crewModeBehavior || 'No specific crew modifiers.'}</p>
                  </div>
                </div>
              )}

              <div className={cn("flex flex-col gap-4", !isPlain && "flex-row")}>
                {recentTripIds.includes(recommendedTrip.id) ? (
                   <div className="flex-grow flex items-center justify-center bg-on-surface/5 border-2 border-on-surface/10 py-4 opacity-50 cursor-not-allowed">
                     <p className="font-mono text-xs uppercase tracking-widest flex items-center gap-2">
                        <Lock className="w-4 h-4" /> Locked by Anti-Repeat
                     </p>
                   </div>
                ) : isWeekLocked(recommendedTrip.weekNumber || 0) ? (
                  <div className="flex-grow flex items-center justify-center bg-on-surface/10 border-2 border-on-surface/20 py-4 opacity-50 cursor-not-allowed">
                    <p className="font-mono text-xs uppercase tracking-widest flex items-center gap-2">
                       <Lock className="w-4 h-4" /> Review Window Closed
                    </p>
                  </div>
                ) : (
                  <Link 
                    to={`/capture?id=${recommendedTrip.id}`}
                    className={cn(
                      "flex-grow justify-center transition-all inline-flex",
                      isPlain ? "bg-white text-on-surface uppercase font-display text-4xl py-8 tracking-tighter" :
                      isBaja ? "bg-baja-pink text-white rounded-full font-display text-2xl tracking-widest shadow-[8px_8px_0_#ff007f] hover:translate-y-1 hover:shadow-none py-4" : 
                      isDiamond ? "bg-white text-black rounded-none shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-[1.02] py-4" :
                      isHeat ? "bg-heat-pink text-white rounded-full shadow-[0px_8px_0px_#cc0066] border-4 border-white hover:bg-heat-aqua py-4" :
                      "bureau-btn py-4"
                    )}
                  >
                    {isPlain ? 'GO' : isBaja ? 'DO IT NOW' : isDiamond ? 'START CAPTURE' : isHeat ? 'SPLASH' : 'FILE ENTRY'}
                  </Link>
                )}
                
                {!isPlain && !profile?.maybeList?.includes(recommendedTrip.id) && !recentTripIds.includes(recommendedTrip.id) && (
                  <button 
                    onClick={() => addToMaybeList(recommendedTrip.id)}
                    className="p-4 border-2 border-on-surface/10 hover:border-brand-orange transition-colors"
                  >
                    <Timer className="w-6 h-6" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <button 
            onClick={drawTrip}
            className="w-full notice-card py-20 border-dashed hover:border-brand-orange hover:bg-on-surface/5 transition-all group"
          >
            <div className="flex flex-col items-center gap-4">
              <span className="text-huge text-[3rem] opacity-20 group-hover:opacity-100 group-hover:text-brand-orange">Draw Trip Card</span>
              <p className="micro-label">Next mission packet pending in queue</p>
            </div>
          </button>
        )}
      </section>

      {/* Recommended for Your Field Type */}
      {!isPlain && recommendedForPersona.length > 0 && (
        <section className="space-y-6">
          <div className="space-y-1">
            <h3 className={cn(
              "font-display text-2xl uppercase tracking-tighter",
              isBaja && "text-baja-pink"
            )}>
              Recommended for Your Field Type
            </h3>
            <p className="font-serif italic text-sm opacity-60">
              Trevor picked these based on your field behavior. He claims this is science.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recommendedForPersona.map(trip => (
              <div key={trip.id}>
                <Card className="p-0 overflow-hidden group">
                  <div className="aspect-[4/3] relative overflow-hidden">
                    <img 
                      src={trip.image} 
                      alt={trip.title} 
                      className="w-full h-full object-cover transition-transform group-hover:scale-110" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-4">
                      <span className="text-[8px] font-mono uppercase text-brand-orange mb-1">
                        {trip.type}
                      </span>
                      <h4 className="font-display text-lg leading-none uppercase text-white">
                        {trip.title}
                      </h4>
                    </div>
                  </div>
                  <div className="p-4 flex gap-2">
                    <Link 
                      to={`/capture?id=${trip.id}`} 
                      className="flex-grow py-2 bg-on-surface text-paper text-center font-display text-xs uppercase tracking-widest hover:bg-brand-orange transition-all"
                    >
                      SELECT
                    </Link>
                    {!profile?.maybeList?.includes(trip.id) && (
                      <button 
                        onClick={() => addToMaybeList(trip.id)}
                        className="p-2 border border-on-surface/20 hover:border-brand-orange transition-colors"
                      >
                        <Timer className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Maybe List (Wait List) */}
      {maybeTrips.length > 0 && !isPlain && (
        <section className="space-y-6">
          <h3 className="font-display text-2xl uppercase tracking-tighter opacity-60 flex items-center gap-2">
            <Timer className="w-5 h-5" />
            Wait List
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {maybeTrips.map(trip => (
              <div key={trip.id} className="p-4 border-2 border-on-surface/10 bg-on-surface/5 flex justify-between items-center group">
                <div>
                   <h4 className="font-display text-lg uppercase leading-none">{trip.title}</h4>
                   <p className="text-[10px] font-mono opacity-60 mt-1">{trip.type}</p>
                </div>
                <div className="flex gap-2">
                  <Link to={`/capture?id=${trip.id}`} className="p-2 bg-on-surface text-paper hover:bg-brand-orange transition-colors">
                    <Zap className="w-4 h-4" />
                  </Link>
                  <button onClick={() => removeFromMaybeList(trip.id)} className="p-2 hover:text-error transition-colors">
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Journal Snippets */}
      <section className="space-y-6 pb-12">
        <h3 className={cn("font-display text-2xl uppercase tracking-tighter", isBaja && "text-baja-pink")}>
          {isBaja ? 'Beach Log' : 'Field Entries'}
        </h3>
        <div className="flex gap-8 overflow-x-auto pb-8 no-scrollbar scroll-smooth">
          {entries.length > 0 ? (
            <>
              {entries.map((e, i) => (
                <EntryCard 
                  key={e.id} 
                  entry={e} 
                  className={cn(
                    i % 2 === 0 ? "rotate-[-1deg]" : "rotate-[1deg]",
                    isBaja ? "border-baja-pink/40 bg-white" : ""
                  )}
                />
              ))}
              {hasMoreEntries && (
                <button 
                  onClick={loadMoreEntries}
                  className="flex-shrink-0 min-w-[300px] border-4 border-dashed border-on-surface/10 rounded-xl flex flex-col items-center justify-center gap-4 hover:border-brand-orange/40 hover:bg-brand-orange/5 transition-all group"
                >
                  <RotateCcw className="w-8 h-8 text-on-surface/20 group-hover:text-brand-orange group-hover:rotate-180 transition-transform duration-500" />
                  <p className="font-display text-xs tracking-widest uppercase opacity-40 group-hover:opacity-100">Sync More Records</p>
                </button>
              )}
            </>
          ) : (
            <div className="w-full bureau-panel py-12 text-center border-dashed">
              <p className="font-serif italic opacity-40">
                {fieldTypeData?.emptyState || "No entries found for current agent. Get into the field."}
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
