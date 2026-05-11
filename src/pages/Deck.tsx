import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { MOCK_CHALLENGES, PERSONAS } from '../constants';
import { Card, Sticker } from '../components/UI';
import { useTheme } from '../context/ThemeContext';
import { CheckCircle2, MapPin, AlertTriangle, ShieldAlert, Timer, Zap, Camera, Sun, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { getSnitchDescription } from '../logic/snitchLogic';
import { Hibiscus, ChromeStar, BeachTag, GlossOverlay } from '../components/BajaBratzAssets';
import { DiamondStar, Sparkle, SunFlare, GlossOverlay as DiamondGloss } from '../components/SkinAssets';
import { FieldSignalCard } from '../components/FieldSignalCard';
import { ObservationFeed } from '../components/ObservationFeed';

import { EntryCard } from '../components/EntryCard';

export default function DeckPage() {
  const { 
    persona, soloCount, entries, activeChallenge, drawChallenge, 
    rerollsAvailable, useReroll, incomingSnitch, resolveIncomingSnitch, user,
    loadMoreEntries, hasMoreEntries, activeSignal, loadingSignal,
    isSeasonActive, activeSeason, gameConfig
  } = useApp();
  const { frankieMode, skin } = useTheme();
  
  const personaData = persona ? PERSONAS[persona] : null;

  const snitchData = incomingSnitch ? getSnitchDescription(incomingSnitch.type) : null;
  const isBaja = skin === 'baja-bratz';
  const isDiamond = skin === 'slippery-diamond';
  const isHeat = skin === 'heatwave';

  if (!isSeasonActive && !activeSeason) {
    return (
      <div className="pb-40 px-6 pt-12 space-y-12 max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[80vh]">
        <AlertTriangle className="w-16 h-16 opacity-10" />
        <div className="text-center space-y-4">
          <h2 className="font-display text-4xl uppercase tracking-tighter">Deck Unavailable</h2>
          <p className="font-serif italic opacity-60">"The mission deck is empty. No seasonal broadcast detected in your sector."</p>
        </div>
        <Link to="/" className="bureau-btn bg-on-surface text-paper">Return to Base</Link>
      </div>
    );
  }

  const onboardingRequired = gameConfig?.onboardingEntriesRequired || 3;

  return (
    <div className="pb-40 px-6 pt-12 space-y-12 max-w-4xl mx-auto relative overflow-hidden">
      {isBaja && !frankieMode && (
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
            isBaja ? "text-baja-pink drop-shadow-[4px_4px_0px_#40e0d0]" : 
            isDiamond ? "liquid-chrome bg-clip-text text-transparent filter drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]" :
            isHeat ? "text-white drop-shadow-[0_4px_#ff007f] font-display" :
            "text-on-surface"
          )}>
            {isBaja ? 'The Glow Up' : isDiamond ? 'The Vault' : isHeat ? 'The Hot List' : 'Dispatch'}
          </h2>
          {!isBaja && !isDiamond && !isHeat && <p className="bureau-subhead">Operational field orders for authorized agents.</p>}
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

      {/* Field Signals */}
      <FieldSignalCard activeSignal={activeSignal} loading={loadingSignal} />

      {/* Playful Observations */}
      <ObservationFeed />

      {/* Snitch Alert Overlay */}
      <AnimatePresence>
        {incomingSnitch && snitchData && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <Card className="bg-error/10 border-2 border-error p-6 flex items-start gap-6 relative">
              <div className="bg-error text-white p-3 rounded-full">
                {snitchData.icon === 'Timer' && <Timer className="w-6 h-6" />}
                {snitchData.icon === 'ShieldAlert' && <ShieldAlert className="w-6 h-6" />}
                {snitchData.icon === 'Zap' && <Zap className="w-6 h-6" />}
              </div>
              <div className="flex-grow space-y-1">
                <div className="flex justify-between items-center">
                  <h4 className="font-display text-xl uppercase text-error">{snitchData.title}</h4>
                  <Sticker color="mustard" className="text-[8px] opacity-100">RIVAL SNITCH</Sticker>
                </div>
                <p className="font-serif text-sm text-on-surface">{snitchData.desc}</p>
                <p className="micro-label opacity-40">Resolved upon next successful field transmission.</p>
              </div>
              {incomingSnitch.type === 'delay' && (
                <button 
                  onClick={resolveIncomingSnitch}
                  className="absolute top-2 right-2 micro-label opacity-40 hover:opacity-100"
                >
                  Dismiss
                </button>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress Card */}
      <Card 
        title={!isBaja && !isDiamond && !isHeat ? "VALIDATION STATUS" : undefined}
        className={cn(
        "relative overflow-hidden group border-2 transition-all duration-300",
        isBaja ? "border-baja-pink/20 rounded-[2rem] shadow-[12px_12px_0px_#40e0d0]" : 
        isDiamond ? "bg-white/5 border-white/10 rounded-sm shadow-[0_0_30px_rgba(255,255,255,0.05)]" :
        isHeat ? "bg-white border-white rounded-[2.5rem] shadow-[15px_15px_0px_rgba(255,140,0,0.5)] border-solid rotate-[-1deg]" :
        "p-0"
      )}>
        {(isBaja || isDiamond) && <GlossOverlay opacity={isDiamond ? 0.2 : 0.3} />}
        
        <div className="space-y-6 pt-8 p-4 relative z-10">
          <div className="flex justify-between items-end">
            <div>
              <span className="micro-label">
                {isBaja ? 'Vibe Check' : isDiamond ? 'Lens Calibration' : isHeat ? 'Log Heat' : 'REPORT FILING THRESHOLD'}
              </span>
              <h3 className={cn(
                "font-serif text-3xl", 
                isBaja ? "text-baja-pink font-display uppercase tracking-wider" : 
                isDiamond ? "text-white font-mono uppercase tracking-[0.4em] font-normal" :
                isHeat ? "text-heat-pink font-display uppercase tracking-tight" :
                "font-display uppercase text-on-surface"
              )}>
                {soloCount} of {onboardingRequired} {isHeat ? 'wave' : 'entry'} reports
              </h3>
            </div>
            <span className={cn(
              "text-huge leading-none opacity-20",
              isBaja ? "text-[5rem] text-baja-aqua" : 
              isDiamond ? "text-[5rem] text-white/20" :
              isHeat ? "text-[5rem] text-heat-mango" :
              "text-[4rem] text-on-surface"
            )}>
              {Math.min(100, Math.round((soloCount / onboardingRequired) * 100))}%
            </span>
          </div>
          <div className={cn(
            "w-full h-4 rounded-none overflow-hidden border",
            isBaja ? "bg-white border-baja-aqua rounded-full" : 
            isDiamond ? "bg-white/10 border-white/20" :
            isHeat ? "bg-heat-yellow border-white rounded-full" :
            "bg-paper-dark border-on-surface"
          )}>
            <div className={cn(
              "h-full transition-all duration-1000",
              isBaja ? "bg-baja-pink" : 
              isDiamond ? "liquid-chrome" :
              isHeat ? "bg-heat-pink" :
              "bg-on-surface border-r-2 border-brand-orange"
            )} style={{ width: `${(soloCount / onboardingRequired) * 100}%` }} />
          </div>
          <p className={cn(
            "font-mono text-[10px] uppercase", 
            isBaja ? "text-baja-coral font-serif italic" : 
            isDiamond ? "text-diamond-silver font-mono text-xs uppercase" :
            isHeat ? "text-heat-mango font-display" :
            "text-on-surface opacity-40"
          )}>
            {soloCount >= onboardingRequired 
              ? (isBaja ? "Surf Rank unlocked. Check Heat List." : isDiamond ? "Optics at 100%. Entry point found." : "NOTICE: MINIMUM FILING REQUIREMENT MET. CREW UNLOCK AUTHORIZED.")
              : (isBaja ? `Complete ${onboardingRequired} solo beach missions to unlock the full crew.` : isDiamond ? `Calibrate optics with ${onboardingRequired} scans.` : `ACTION: FILE ${onboardingRequired} VALID REPORTS TO AUTHORIZE CREW FORMATION.`)}
          </p>
        </div>
      </Card>

      {/* Active Challenge */}
      <section className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className={cn("font-display text-2xl uppercase tracking-tighter", isBaja && "text-baja-pink font-display uppercase font-normal")}>
            {isBaja ? 'Next Glam Mission' : 'Current Order'}
          </h3>
          {activeChallenge && rerollsAvailable > 0 && (
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

        {activeChallenge ? (
          <div className="flex flex-col">
            {!isBaja && !isDiamond && !isHeat && <div className="file-tab">FIELD ORDER // {activeChallenge.id}</div>}
            <div className={cn(
              "notice-card flex flex-col md:flex-row gap-8 p-8 transition-all duration-500",
              isBaja ? "border-baja-pink rounded-[3rem] p-8 border-4" : 
              isDiamond ? "bg-white/5 border-white/20 rounded-md backdrop-blur-md p-8 border" :
              isHeat ? "bg-white border-white rounded-[3rem] shadow-[20px_20px_0px_rgba(255,140,0,0.3)] border-solid p-8" :
              "notice-card"
            )}>
              <div className={cn(
                "w-full md:w-1/3 aspect-square overflow-hidden",
                isBaja ? "rounded-[2rem] border-white shadow-xl rotate-[-3deg] border-2" : 
                isDiamond ? "border-white/40 rounded-none grayscale transition-all hover:grayscale-0 border-2" :
                isHeat ? "rounded-[2.5rem] border-white shadow-lg rotate-3 border-2" :
                "evidence-frame"
              )}>
                <img src={activeChallenge.image} alt={activeChallenge.title} className={cn(
                  "w-full h-full object-cover transition-all duration-500 hover:scale-110",
                  (!isBaja && !isDiamond && !isHeat) && "grayscale-[0.5] hover:grayscale-0"
                )} />
                {!isBaja && !isDiamond && !isHeat && <div className="evidence-label">SITE_IMAGE_{activeChallenge.id}</div>}
              </div>
              
              <div className="flex-grow flex flex-col justify-between space-y-6 z-10">
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Sticker color="black" className="micro-label">{activeChallenge.category}</Sticker>
                    <Sticker color="orange" className="micro-label">{activeChallenge.points} XP</Sticker>
                    {isBaja && <BeachTag>HOT-GIRL SUMMER</BeachTag>}
                  </div>
                  <h4 className={cn(
                    "font-display text-4xl mb-2",
                    isBaja ? "text-baja-pink text-shadow-sm" : 
                    isDiamond ? "liquid-chrome bg-clip-text text-transparent font-black" :
                    isHeat ? "text-heat-pink font-display" :
                    "text-on-surface"
                  )}>{activeChallenge.title}</h4>
                  <p className={cn(
                    "font-serif text-lg leading-relaxed",
                    isDiamond ? "text-white/80" : "text-on-surface"
                  )}>
                    {frankieMode ? activeChallenge.shortDescription : activeChallenge.shortDescription}
                  </p>
                  {activeChallenge.fullInstructions && !frankieMode && (
                    <div className="pt-4 border-t border-dashed border-on-surface/10 space-y-2">
                      <p className="micro-label opacity-40">OPERATIONAL_INSTRUCTIONS</p>
                      <p className="text-xs opacity-70 leading-relaxed font-mono">{activeChallenge.fullInstructions}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {personaData && (
                    <div className={cn(
                      "p-4 border-l-4",
                      isBaja ? "bg-baja-aqua/10 border-baja-aqua" : 
                      isDiamond ? "bg-white/5 border-white/40" :
                      "bg-on-surface/5 border-on-surface"
                    )}>
                      <p className="micro-label opacity-40">{personaData.name} ACTIVE PERK</p>
                      <p className="font-display text-lg uppercase tracking-tight">{personaData.perk}</p>
                    </div>
                  )}

                  <Link 
                    to={`/capture?id=${activeChallenge.id}`}
                    className={cn(
                      "w-full justify-center transition-all inline-flex",
                      isBaja ? "bg-baja-pink text-white rounded-full font-display text-2xl tracking-widest shadow-[0px_8px_0px_#ff007f] hover:translate-y-1 hover:shadow-none py-4" : 
                      isDiamond ? "bg-white text-black rounded-none shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-[1.02] py-4" :
                      isHeat ? "bg-heat-pink text-white rounded-full shadow-[0px_8px_0px_#cc0066] border-4 border-white hover:bg-heat-aqua py-4" :
                      "bureau-btn py-4"
                    )}
                  >
                    {isBaja ? 'DO IT NOW' : isDiamond ? 'START CAPTURE' : isHeat ? 'SPLASH' : 'CAPTURE EVIDENCE'}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <button 
            onClick={drawChallenge}
            className="w-full notice-card py-20 border-dashed hover:border-brand-orange hover:bg-on-surface/5 transition-all group"
          >
            <div className="flex flex-col items-center gap-4">
              <span className="text-huge text-[3rem] opacity-20 group-hover:opacity-100 group-hover:text-brand-orange">Draw Field Order</span>
              <p className="micro-label">Next report packet pending in queue</p>
            </div>
          </button>
        )}
      </section>

      {/* Journal Snippets */}
      <section className="space-y-6 pb-12">
        <h3 className={cn("font-display text-2xl uppercase tracking-tighter", isBaja && "text-baja-pink")}>
          {isBaja ? 'Beach Log' : 'Prior Reports'}
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
              <p className="font-serif italic opacity-40">No records found for current asset. Get into the field.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
