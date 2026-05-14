import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { FIELD_TYPES, MOCK_TRIPS } from '../constants';
import { Sticker } from '../components/UI';
import { cn } from '../lib/utils';
import { Hibiscus, ChromeStar, GlossOverlay } from '../components/BajaBratzAssets';
import { DiamondStar, Sparkle, SunFlare, GlossOverlay as DiamondGloss } from '../components/SkinAssets';

export default function FieldTypeResult() {
  const { fieldType, completeOnboarding } = useApp();
  const { skin, frankieMode } = useTheme();
  const navigate = useNavigate();

  const handleStartApp = async () => {
    await completeOnboarding();
    navigate('/deck');
  };

  const isBaja = skin === 'baja-bratz';
  const isDiamond = skin === 'slippery-diamond';
  const isHeat = skin === 'heatwave';
  const isDefault = !isBaja && !isDiamond && !isHeat;
  
  const activeType = fieldType || 'unclassified';
  const data = FIELD_TYPES[activeType];
  const firstTrip = MOCK_TRIPS.find(t => t.id === data.firstTripId);

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
        )}>{isBaja || isDiamond || isHeat ? 'Field Trip' : 'FIELD_CLASSIFICATION'}</h1>
        {!isBaja && !isDiamond && !isHeat && (
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-mono font-bold text-brand-orange">PROTOCOL: [RESULT_ARCHIVE]</span>
            <span className="text-[8px] font-mono opacity-40 uppercase">Classification complete.</span>
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
          <p className={cn(
            "micro-label uppercase tracking-widest opacity-60",
            isDiamond ? "text-white" : "text-on-surface"
          )}>Your Field Type is...</p>
          <h2 className={cn(
            "leading-none uppercase tracking-tighter",
            isBaja ? "text-5xl text-baja-pink font-display" : 
            isDiamond ? "text-5xl text-white font-sans font-black tracking-[-0.05em]" :
            isHeat ? "text-5xl text-heat-pink font-display italic" :
            "text-huge text-6xl text-on-surface font-display"
          )}>{data.name}</h2>
          <p className={cn(
            "leading-tight font-accent uppercase tracking-widest",
            isBaja ? "text-baja-pink/60 font-serif italic" : 
            isDiamond ? "text-xs text-white/40 font-mono uppercase tracking-[0.3em]" :
            isHeat ? "text-lg text-white font-display uppercase tracking-tight" :
            "text-brand-orange"
          )}>
            {data.shortTitle}
          </p>
        </div>

        <div className={cn(
          "w-full p-8 space-y-6 relative border-4",
          isBaja ? "bg-white border-baja-pink rounded-[2.5rem] rotate-1" :
          isDiamond ? "bg-white/5 border-white/20 rounded-none backdrop-blur-sm" :
          isHeat ? "bg-white border-white rounded-[3rem] -rotate-2" :
          "bg-paper border-on-surface shadow-[10px_10px_0px_gray] rotate-1"
        )}>
           {!isBaja && !isDiamond && !isHeat && <div className="file-tab">FIELD_TYPE_CARD</div>}
           <p className={cn("text-lg", isDiamond ? "font-mono text-white/80" : "font-serif italic text-on-surface/80 leading-relaxed")}>
             "{data.description}"
           </p>

           <div className="space-y-4 pt-4 border-t border-dashed border-on-surface/20">
              <div className="flex justify-between items-start">
                 <div className="space-y-1">
                    <span className="micro-label opacity-40">PREFERRED_VIBE</span>
                    <p className="text-sm font-bold uppercase tracking-tight">{data.vibe}</p>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <span className="micro-label opacity-40">ACTIVE_PERK</span>
                    <p className="text-xs font-bold text-success uppercase">{data.perk}</p>
                 </div>
                 <div className="space-y-1">
                    <span className="micro-label opacity-40">KNOWN_SNAG</span>
                    <p className="text-xs font-bold text-error uppercase">{data.snag}</p>
                 </div>
              </div>

              <div className="pt-4 border-t border-dashed border-on-surface/10">
                 <span className="micro-label opacity-40">FIRST_RECOMMENDED_TRIP</span>
                 <p className={cn(
                   "text-xl font-display uppercase mt-1",
                   isBaja ? "text-baja-pink" : isHeat ? "text-heat-pink" : "text-brand-orange"
                 )}>
                   {firstTrip?.title || "SURVIVAL ORIENTATION"}
                 </p>
              </div>

              <div className="pt-4 border-t border-dashed border-on-surface/10 space-y-2">
                 <span className="micro-label opacity-40">RECOMMENDED_TAGS</span>
                 <div className="flex flex-wrap gap-2">
                    {data.recommendedTags.map(tag => (
                      <span key={tag} className={cn(
                        "px-2 py-0.5 text-[8px] font-mono border uppercase",
                        isDiamond ? "border-white/20 text-white/60" : "border-on-surface/20 text-on-surface/60"
                      )}>
                        #{tag}
                      </span>
                    ))}
                 </div>
              </div>

              <div className="absolute -bottom-10 -right-4 rotate-12 opacity-80 pointer-events-none">
                 <div className={cn(
                   "border-2 px-4 py-1 text-sm font-display uppercase tracking-widest",
                   isBaja ? "border-baja-pink text-baja-pink bg-white" :
                   isHeat ? "border-heat-pink text-heat-pink bg-white" :
                   "border-on-surface/40 text-on-surface/40 bg-paper"
                 )}>
                   {data.stamp}
                 </div>
              </div>
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
          {isBaja ? 'START THE BEACH VACAY' : isDiamond ? 'INITIATE DEPLOYMENT' : isHeat ? 'TAKE THE PLUNGE' : 'START YOUR FIRST TRIP'}
        </button>
        <button onClick={() => navigate('/onboarding')} className={cn(
          "text-xs underline opacity-40 hover:opacity-100 transition-opacity uppercase tracking-widest p-4",
          isDiamond ? "font-mono text-white/40" : "text-on-surface"
        )}>
          {isBaja ? 'RE-CHOOSE ROLE' : 'Reclassify later'}
        </button>
      </div>
    </div>
  );
}
