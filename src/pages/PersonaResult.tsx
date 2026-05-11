import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { PERSONAS } from '../constants';
import { Sticker } from '../components/UI';
import { cn } from '../lib/utils';
import { Hibiscus, ChromeStar, GlossOverlay } from '../components/BajaBratzAssets';
import { DiamondStar, Sparkle, SunFlare, GlossOverlay as DiamondGloss } from '../components/SkinAssets';

export default function PersonaResult() {
  const { persona, completeOnboarding } = useApp();
  const { skin, frankieMode } = useTheme();
  const navigate = useNavigate();

  const handleStartApp = async () => {
    await completeOnboarding();
    navigate('/deck');
  };

  const isBaja = skin === 'baja-bratz';
  const isDiamond = skin === 'slippery-diamond';
  const isHeat = skin === 'heatwave';
  
  if (!persona) return null;
  const data = PERSONAS[persona];

  return (
    <div className={cn(
      "min-h-screen p-6 flex flex-col items-center space-y-12 relative overflow-hidden",
      isBaja ? "bg-baja-sand text-baja-pink" : 
      isDiamond ? "bg-black text-white" :
      isHeat ? "bg-heat-yellow text-white" : "bg-paper text-on-surface"
    )}>
      <header className={cn(
        "fixed top-0 w-full z-50 py-4 px-6 flex justify-between items-center transition-all",
        isBaja ? "bg-white/80 backdrop-blur-md border-b-2 border-baja-pink/20" : 
        isDiamond ? "bg-black/60 backdrop-blur-3xl border-b border-white/10" :
        isHeat ? "bg-heat-pink/90 backdrop-blur-md border-b-2 border-white" :
        "bg-paper border-b-4 border-on-surface shadow-sm"
      )}>
        <h1 className={cn(
          "text-2xl italic",
          isBaja ? "text-baja-pink font-display uppercase font-normal" : 
          isDiamond ? "liquid-chrome bg-clip-text text-transparent font-black" :
          isHeat ? "text-white font-display uppercase" :
          "text-on-surface font-display uppercase tracking-tighter font-black"
        )}>{isBaja || isDiamond || isHeat ? 'Field Trip' : 'BUREAU_ADVENTURE'}</h1>
        {!isBaja && !isDiamond && !isHeat && <div className="text-[10px] font-mono opacity-40">REF_8829_ACCRED</div>}
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

      <div className="pt-24 flex flex-col items-center space-y-10 w-full max-w-sm relative z-10">
        <Sticker color={isBaja ? "white" : isDiamond ? "white" : isHeat ? "white" : "orange"} className={cn(
          "px-8 py-3 text-lg uppercase font-display",
          isDiamond ? "rounded-none font-mono" : i => i ? "-rotate-2" : "rotate-1"
        )}>
          {isBaja ? 'BABE_VERIFIED' : isDiamond ? 'PRISM_UNLOCKED' : isHeat ? 'SPLASH_READY' : 'IDENTITY_VERIFIED'}
        </Sticker>
        
        <div className="relative">
          <motion.div 
            initial={{ scale: 0.9, rotate: 5 }}
            animate={{ scale: 1, rotate: isDiamond ? 0 : 2 }}
            className={cn(
              "w-72 h-72 p-4 pb-12 shadow-2xl relative overflow-hidden transition-all",
              isBaja ? "bg-white rounded-[3rem] border-4 border-baja-pink" : 
              isDiamond ? "bg-white/10 rounded-none border border-white/40 backdrop-blur-xl" :
              isHeat ? "bg-white rounded-full border-8 border-white p-6" :
              "bg-paper border-4 border-on-surface shadow-[15px_15px_0px_gray] p-4 rotate-[-2deg]"
            )}
          >
            {(isBaja || isDiamond) && <GlossOverlay opacity={isDiamond ? 0.3 : 0.4} />}
            <img 
              src={data.image} 
              alt={data.name} 
              className={cn(
                "w-full h-full object-cover",
                isBaja ? "rounded-[2rem]" : isDiamond ? "grayscale opacity-80" : isHeat ? "rounded-full" : "grayscale contrast-125 brightness-110"
              )} 
            />
            {!isBaja && !isDiamond && !isHeat && (
              <div className="absolute inset-0 border-4 border-on-surface/10 pointer-events-none" />
            )}
          </motion.div>
          {!isBaja && !isDiamond && !isHeat && <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-24 h-12 bg-paper/60 backdrop-blur-sm -rotate-6 border-b-4 border-on-surface flex items-center justify-center font-mono text-[8px] uppercase">Bureau_Seal</div>}
        </div>

        <div className="text-center space-y-4">
          <h2 className={cn(
            "leading-none uppercase tracking-tighter",
            isBaja ? "text-5xl text-baja-pink font-display" : 
            isDiamond ? "text-5xl text-white font-sans font-black tracking-[-0.05em]" :
            isHeat ? "text-5xl text-heat-pink font-display italic" :
            "text-huge text-5xl text-on-surface font-display"
          )}>{data.name}</h2>
          <p className={cn(
            "leading-relaxed",
            isBaja ? "text-xl text-baja-pink font-serif italic" : 
            isDiamond ? "text-xs text-white/60 font-mono uppercase tracking-[0.3em]" :
            isHeat ? "text-lg text-white font-display uppercase tracking-tight" :
            "text-lg text-on-surface-variant font-serif italic"
          )}>
            "{data.description}"
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 w-full">
          <div className={cn(
            "p-6 shadow-xl space-y-3 relative overflow-hidden transition-all",
            isBaja ? "bg-white border-2 border-baja-pink rounded-[2rem] rotate-1" : 
            isDiamond ? "bg-white text-black rounded-none border-l-[8px] border-black" :
            isHeat ? "bg-white text-heat-pink rounded-[2.5rem] -rotate-2 border-4 border-white" :
            "notice-card rotate-1 shadow-md bg-paper border-4"
          )}>
            {isBaja && <GlossOverlay opacity={0.1} />}
            <div className="bureau-tag bg-on-surface text-paper text-[10px] w-fit mb-2">BUREAU_CLEARANCE</div>
            <h3 className={cn(
              "text-3xl leading-tight font-black uppercase tracking-tighter",
              isDiamond ? "font-sans uppercase" : isHeat ? "font-display uppercase italic" : "font-display text-on-surface"
            )}>{data.perk}</h3>
            <p className={cn(
              "font-mono text-[10px] opacity-60 uppercase",
              isDiamond ? "text-black" : isHeat ? "text-heat-pink font-display uppercase" : "text-on-surface/60"
            )}>{data.perkDesc}</p>
          </div>

          <div className={cn(
             "p-6 shadow-xl space-y-3 relative overflow-hidden transition-all",
             isBaja ? "bg-baja-aqua text-white rounded-[2rem] -rotate-1 border-2 border-white" : 
             isDiamond ? "bg-black text-white rounded-none border-l-[8px] border-white" :
             isHeat ? "bg-heat-mango text-white rounded-[2.5rem] rotate-2 border-4 border-white" :
             "notice-card -rotate-1 shadow-md bg-paper border-4 border-brand-orange/30"
          )}>
            <div className="bureau-tag bg-brand-orange text-white text-[10px] w-fit mb-2">OPERATIONAL_RISK</div>
            <h3 className={cn(
              "text-3xl leading-tight font-black uppercase tracking-tighter",
              isDiamond ? "font-sans uppercase" : isHeat ? "font-display uppercase italic text-heat-pink" : "font-display text-brand-orange"
            )}>{data.snag}</h3>
            <p className="font-mono text-[10px] opacity-70 uppercase">{data.snagDesc}</p>
          </div>
        </div>

        <button 
          onClick={handleStartApp}
          className={cn(
            "w-full py-5 rounded-none font-bold text-xl transition-all active:scale-95 shadow-2xl uppercase tracking-widest",
            isBaja ? "bg-baja-pink text-white rounded-full font-display" : 
            isDiamond ? "bg-white text-black font-sans" :
            isHeat ? "bg-heat-pink text-white rounded-full font-display border-4 border-white" :
            "bureau-btn text-2xl h-auto"
          )}
        >
          {isBaja ? 'START THE BEACH VACAY' : isDiamond ? 'INITIATE DEPLOYMENT' : isHeat ? 'TAKE THE PLUNGE' : 'COMMENCE FIELD OPERATIONS'}
        </button>
        <button onClick={() => navigate('/onboarding')} className={cn(
          "text-xs underline opacity-40 hover:opacity-100 transition-opacity uppercase tracking-widest",
          isDiamond ? "font-mono" : "font-display"
        )}>
          Re-evaluate identity protocols
        </button>
      </div>
    </div>
  );
}
