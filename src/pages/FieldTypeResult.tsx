import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { RewardIntensity } from '../types/feedback';
import { useTheme } from '../context/ThemeContext';
import { FIELD_TYPES, MOCK_TRIPS } from '../constants';
import { Sticker } from '../components/UI';
import { cn } from '../lib/utils';
import { Hibiscus, ChromeStar, GlossOverlay } from '../components/BajaBratzAssets';
import { DiamondStar, Sparkle, SunFlare, GlossOverlay as DiamondGloss } from '../components/SkinAssets';

export default function FieldTypeResult() {
  const { fieldType, completeOnboarding, queueReward } = useApp();
  const { skin, frankieMode } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    if (fieldType) {
      const typeData = FIELD_TYPES[fieldType];
      queueReward({
        type: 'persona',
        intensity: RewardIntensity.MAJOR_REVEAL,
        title: `${typeData.name} IDENTIFIED`,
        description: typeData.description || 'Field classification sequence complete.',
        rewardText: `ROLE: ${typeData.campRole}`,
        iconName: 'Fingerprint'
      });
    }
  }, [fieldType]);

  const handleStartApp = async () => {
    await completeOnboarding();
    navigate('/deck');
  };

  const isBaja = skin.id === 'baja-bratz';
  const isDiamond = skin.id === 'slippery-diamond';
  const isHeat = skin.id === 'heatwave';
  const isDefault = !isBaja && !isDiamond && !isHeat;
  
  const activeType = fieldType || 'unclassified';
  const data = FIELD_TYPES[activeType];
  const firstTrip = MOCK_TRIPS.find(t => t.id === data.firstTripId);

  return (
    <div className={cn(
      "min-h-screen p-6 pb-32 flex flex-col items-center space-y-12 relative overflow-hidden",
      isBaja ? "bg-baja-sand text-baja-pink" : 
      isDiamond ? "bg-black text-white" :
      isHeat ? "bg-heat-yellow text-white" : "bg-white text-on-surface"
    )}>
      {isDefault && (
        <>
          <div className="fixed inset-0 pointer-events-none z-[100] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.02)_50%)] bg-[length:100%_2px] opacity-[0.03]" />
          <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.05]" 
               style={{ 
                 backgroundImage: 'linear-gradient(var(--color-on-surface) 1.5px, transparent 1.5px), linear-gradient(90deg, var(--color-on-surface) 1.5px, transparent 1.5px)', 
                 backgroundSize: '32px 32px' 
               }} 
          />
        </>
      )}

      <header className={cn(
        "fixed top-0 w-full z-[110] py-4 px-6 flex justify-between items-center transition-all",
        isBaja ? "bg-white/80 backdrop-blur-md border-b-2 border-baja-pink/20" : 
        isDiamond ? "bg-black/60 backdrop-blur-3xl border-b border-white/10" :
        isHeat ? "bg-heat-pink/90 backdrop-blur-md border-b-2 border-white" :
        "bg-white/90 backdrop-blur-sm border-b-2 border-on-surface"
      )}>
        <h1 className={cn(
          "text-2xl font-black italic tracking-tighter",
          isBaja ? "text-baja-pink font-display uppercase font-normal not-italic" : 
          isDiamond ? "liquid-chrome bg-clip-text text-transparent font-black" :
          isHeat ? "text-white font-display uppercase not-italic" :
          "text-on-surface font-display uppercase"
        )}>{isBaja || isDiamond || isHeat ? 'Field Trip' : 'PROT_CLASSIFICATION.HV'}</h1>
        {!isBaja && !isDiamond && !isHeat && (
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-mono font-black text-brand-orange uppercase tracking-[0.2em] italic">SIGNAL_IDENTIFIED</span>
            <div className="h-1 w-20 bg-brand-orange mt-1" />
          </div>
        )}
      </header>

      {isBaja && !frankieMode && (
        <>
          <Hibiscus className="absolute top-20 right-[-60px] w-80 h-80 opacity-20 -z-10" />
          <ChromeStar className="absolute bottom-10 left-10 w-16 h-16 opacity-40 -z-10" />
        </>
      )}

      {isDiamond && !frankieMode && (
        <>
          <div className="absolute inset-0 liquid-chrome opacity-5 pointer-events-none -z-20" />
          <DiamondStar className="absolute top-40 right-[-30px] w-48 h-48 text-white opacity-10 -z-10" />
          <Sparkle className="absolute bottom-20 left-20 w-12 h-12 text-white animate-pulse -z-10" />
        </>
      )}

      {isHeat && !frankieMode && (
        <>
          <SunFlare className="absolute top-10 right-[-80px] w-96 h-96" />
          <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-heat-mango/20 to-transparent -z-10" />
        </>
      )}

      <div className="pt-24 flex flex-col items-center space-y-10 w-full max-w-md relative z-10">
        <Sticker color={isBaja ? "white" : isDiamond ? "white" : isHeat ? "white" : "lime"} className={cn(
          "px-10 py-5 text-xl uppercase font-display font-bold italic shadow-[8px_8px_0px_black]",
          isDiamond ? "rounded-none font-mono not-italic" : (i: any) => i ? "-rotate-2" : "rotate-1"
        )}>
          {isBaja ? 'BABE_VERIFIED' : isDiamond ? 'PRISM_UNLOCKED' : isHeat ? 'SPLASH_READY' : 'ASSIGNED_UNIT'}
        </Sticker>
        
        <div className="relative group/card w-full flex justify-center px-4">
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className={cn(
              "w-full max-w-[18rem] xs:max-w-[20rem] h-[28rem] xs:h-[30rem] p-6 pb-16 shadow-[20px_20px_0px_rgba(0,0,0,0.1)] relative overflow-hidden transition-all duration-500",
              isBaja ? "bg-white rounded-[3rem] border-4 border-baja-pink" : 
              isDiamond ? "bg-white/10 rounded-none border border-white/40 backdrop-blur-xl" :
              isHeat ? "bg-white rounded-full border-8 border-white p-8" :
              "bg-white border-2 border-on-surface shadow-[16px_16px_0px_black] rounded-none group-hover/card:shadow-[24px_24px_0px_var(--color-brand-orange)]"
            )}
          >
            {(isBaja || isDiamond) && <GlossOverlay opacity={isDiamond ? 0.3 : 0.4} />}
            
            {!isBaja && !isDiamond && !isHeat && (
              <div className="absolute top-0 left-0 w-full bg-on-surface text-brand-lime px-6 py-2 flex justify-between items-center z-10 italic">
                <span className="text-[10px] font-black tracking-[0.2em] uppercase">FIELD_DOSSIER // HV-LE</span>
                <span className="text-[9px] font-mono opacity-60">REF_704_B</span>
              </div>
            )}

            <div className={cn(
              "w-full h-full border-2 border-on-surface overflow-hidden relative group",
              !isBaja && !isDiamond && !isHeat && "bg-black mt-4"
            )}>
               <img 
                 src={data.image} 
                 alt={data.name} 
                 className={cn(
                   "w-full h-full object-cover transition-all duration-700 group-hover:scale-110",
                   isBaja ? "rounded-[2rem]" : isDiamond ? "grayscale opacity-80" : isHeat ? "rounded-full" : "grayscale contrast-[1.2] brightness-110 sepia-[0.1] opacity-90 group-hover:grayscale-0 group-hover:sepia-0"
                 )} 
               />
               <div className="absolute inset-0 bg-brand-lime/10 mix-blend-overlay opacity-30 pointer-events-none" />
            </div>

            {!isBaja && !isDiamond && !isHeat && (
              <>
                <div className="absolute bottom-6 left-6 right-6 flex flex-col items-center">
                   <div className="w-full h-[2px] bg-brand-lime shadow-[0_0_8px_var(--color-brand-lime)]" />
                   <p className="text-[10px] font-black uppercase tracking-[0.4em] mt-3 text-on-surface italic">LOG_IDENT_SECURE</p>
                </div>
                {/* Decorative bits */}
                <div className="absolute bottom-10 right-4 flex flex-col gap-1.5">
                   {[...Array(4)].map((_, i) => (
                     <div key={i} className="w-2 h-2 bg-brand-lime" />
                   ))}
                </div>
                <div className="absolute top-12 left-4 w-12 h-1 bg-brand-orange/40 rotate-90 origin-left" />
              </>
            )}
          </motion.div>
          {!isBaja && !isDiamond && !isHeat && (
            <div className="absolute -top-6 -right-10 rotate-12 bg-brand-lime text-black px-6 py-3 border-2 border-on-surface font-display font-black text-sm uppercase shadow-[6px_6px_0px_black] z-20 italic">
              CLASSIFIED
            </div>
          )}
        </div>

        <div className="text-center space-y-4">
          <p className={cn(
            "micro-label uppercase tracking-widest font-bold opacity-50",
            isDiamond ? "text-white" : "text-on-surface"
          )}>Identification Sequence Complete</p>
          <div className="flex flex-col items-center">
             <h2 className={cn(
               "leading-[0.85] uppercase tracking-tight font-bold italic",
               isBaja ? "text-6xl text-baja-pink font-display" : 
               isDiamond ? "text-6xl text-white font-sans font-bold tracking-[-0.05em]" :
               isHeat ? "text-6xl text-heat-pink font-display" :
               "text-7xl md:text-8xl text-on-surface font-display"
             )}>{data.name}</h2>
             <div className="h-2 w-full bg-brand-orange mt-4 max-w-[200px]" />
          </div>
          <div className="pt-6">
            <span className={cn(
              "px-10 py-3 font-bold uppercase tracking-wider text-sm border-2 italic",
              isBaja ? "text-baja-pink/60 font-serif border-baja-pink/20" : 
              isDiamond ? "text-xs text-white/40 font-mono tracking-widest border-white/10" :
              isHeat ? "text-lg text-white font-display border-white" :
              "bg-brand-lime text-on-surface border-on-surface shadow-[6px_6px_0px_black] rotate-[-1deg] inline-block"
            )}>
              {data.campRole}
            </span>
          </div>
        </div>

        <div className={cn(
          "w-full space-y-0 relative group/panel",
          !isBaja && !isDiamond && !isHeat && "shadow-[20px_20px_0px_var(--color-brand-lime)] border-2 border-on-surface transition-all hover:shadow-[24px_24px_0px_var(--color-brand-orange)]"
        )}>
          {/* Modular Result Panel Implementation */}
          <div className={cn(
            "w-full p-10 space-y-10 relative",
            isBaja ? "bg-white border-4 border-baja-pink rounded-[2.5rem] rotate-1" :
            isDiamond ? "bg-white/5 border border-white/20 rounded-none backdrop-blur-sm" :
            isHeat ? "bg-white border-8 border-white rounded-[3rem] -rotate-2" :
            "bg-white"
          )}>
             {!isBaja && !isDiamond && !isHeat && (
               <div className="absolute top-0 right-0 p-4">
                 <div className="w-12 h-12 rounded-full border-2 border-on-surface/10 flex items-center justify-center opacity-20">
                   <span className="font-mono text-[10px]">#01</span>
                 </div>
               </div>
             )}

             <div className={cn(
               "p-8 italic shadow-inner border-l-[12px] relative group",
               isDiamond ? "bg-white/5 border-white/20" : "bg-paper-dark border-on-surface"
             )}>
                <div className="absolute top-0 right-0 p-2 opacity-5">
                   <ChromeStar className="w-16 h-16" />
                </div>
               <p className={cn("text-2xl leading-tight font-medium relative z-10", isDiamond ? "font-mono text-white/80" : "font-serif text-on-surface")}>
                 "{data.description}"
               </p>
             </div>

             <div className="bg-brand-lime text-black p-8 border-2 border-on-surface shadow-[8px_8px_0px_black] relative rotate-1 group-hover/panel:rotate-0 transition-transform">
               <p className="text-sm font-bold leading-relaxed uppercase tracking-wider italic">{data.narration}</p>
               <div className="absolute -top-3 -left-3 w-6 h-6 bg-on-surface rotate-45" />
             </div>

             <div className="space-y-12 pt-6">
                <div className="grid grid-cols-2 gap-8">
                   <div className="space-y-3">
                      <div className="flex items-center gap-3">
                         <div className="w-6 h-1 bg-brand-orange" />
                         <span className="text-[11px] font-bold uppercase text-on-surface/50 tracking-wider italic">PROT_DRIVE</span>
                      </div>
                      <p className="text-xl font-bold uppercase tracking-tight text-on-surface italic border-b-4 border-brand-lime pb-3 leading-tight">{data.coreInstinct}</p>
                   </div>
                   <div className="space-y-3 text-right">
                      <div className="flex items-center gap-3 justify-end">
                         <span className="text-[11px] font-bold uppercase text-on-surface/50 tracking-wider italic">BUREAU_STAMP</span>
                         <div className="w-6 h-1 bg-brand-lime" />
                      </div>
                      <p className="text-xl font-bold uppercase tracking-tight text-brand-orange italic leading-tight">{data.stamp}</p>
                   </div>
                </div>

                <div className="grid grid-cols-1 gap-8">
                   <div className="p-6 bg-white border-2 border-on-surface shadow-[10px_10px_0px_var(--color-brand-cyan)] relative overflow-hidden group/metrics">
                      <div className="absolute top-0 right-0 w-24 h-24 prism-bg opacity-5 -translate-y-10 translate-x-10 rotate-45" />
                      <span className="text-[10px] font-black uppercase text-on-surface/40 tracking-[0.3em] italic mb-4 block">FIELD_OPERATIONAL_CAPS</span>
                      <div className="flex justify-between mt-4 gap-4">
                        <div className="flex-1 text-center py-4 bg-on-surface text-brand-lime shadow-[4px_4px_0px_black]">
                           <p className="text-[9px] opacity-60 uppercase font-black tracking-widest">Strength_lvl</p>
                           <p className="text-lg font-black uppercase italic">{data.fieldStrength}</p>
                        </div>
                        <div className="flex-1 text-center py-4 border-2 border-on-surface bg-white shadow-[4px_4px_0px_var(--color-brand-orange)]">
                           <p className="text-[9px] opacity-40 uppercase font-black tracking-widest">Risk_Factor</p>
                           <p className="text-lg font-black uppercase text-brand-orange italic">{data.fieldRisk}</p>
                        </div>
                      </div>
                   </div>
                </div>

                <div className="p-8 border-2 border-on-surface bg-paper-dark relative shadow-inner">
                  <div className="absolute -top-4 left-8 px-4 bg-on-surface text-brand-lime border-2 border-on-surface text-[11px] font-black uppercase italic shadow-[3px_3px_0px_black]">STRATEGY_DEBRIEF</div>
                  <p className={cn(
                    "text-lg leading-relaxed font-medium pt-4 italic",
                    isDiamond ? "text-white/60 font-mono" : "text-on-surface/90 font-serif"
                  )}>{data.howToPlay}</p>
                </div>

                <div className="pt-8 border-t-4 border-on-surface/10 space-y-4">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-[2px] bg-brand-orange" />
                      <span className="text-[11px] font-black uppercase opacity-60 tracking-[0.4em] italic">IDENTITY_TAGS.HV</span>
                   </div>
                   <div className="flex flex-wrap gap-3">
                      {data.recommendedChallengeTags.map(tag => (
                        <span key={tag} className={cn(
                          "px-4 py-1.5 text-[11px] font-black border-2 uppercase italic shadow-[4px_4px_0px_rgba(0,0,0,0.05)] hover:shadow-[4px_4px_0px_black] transition-all",
                          isDiamond ? "border-white/20 text-white/60 font-mono" : "border-on-surface bg-white text-on-surface hover:bg-brand-lime"
                        )}>
                          #{tag.toUpperCase()}
                        </span>
                      ))}
                   </div>
                </div>
             </div>
          </div>
        </div>

          <button 
            onClick={handleStartApp}
            className={cn(
              "w-full py-12 font-bold text-4xl transition-all active:translate-x-2 active:translate-y-2 active:shadow-none uppercase tracking-tight border-2 italic",
              isBaja ? "bg-baja-pink text-white rounded-full font-display border-baja-pink" : 
              isDiamond ? "bg-white text-black font-sans border-white" :
              isHeat ? "bg-heat-pink text-white rounded-full font-display border-white" :
              "bg-brand-orange text-white border-on-surface shadow-[16px_16px_0px_black] hover:bg-on-surface hover:text-brand-lime hover:shadow-[20px_20px_0px_var(--color-brand-orange)]"
            )}
          >
            {isBaja ? 'START THE BEACH VACAY' : isDiamond ? 'INITIATE DEPLOYMENT' : isHeat ? 'TAKE THE PLUNGE' : 'BEGIN_DEEP_AUDIT'}
          </button>
          <button onClick={() => navigate('/onboarding')} className={cn(
            "text-sm font-black opacity-40 hover:opacity-100 transition-opacity uppercase tracking-[0.5em] p-10 italic",
            isDiamond ? "font-mono text-white/40" : "text-on-surface"
          )}>
            &lt; {isBaja ? 'RE-CHOOSE ROLE' : 'RE-AUDIT_SIGNAL'}
          </button>
      </div>
    </div>
  );
}
