import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { RotateCcw, Zap, Camera, MapPin } from 'lucide-react';
import { getMissionImage } from '../utils/missionImages';

import * as Icons from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { getFrankieTitle, getFrankieDescription } from '../logic/frankieModeLogic';

import { getDeckCoverImage, BASE_DECK_PLACEHOLDER } from '../lib/deckUtils';

interface DeckStackProps {
  onDraw: () => void;
  isDrawing: boolean;
  disabled: boolean;
  activeMission?: any;
  activePack?: any;
  poolEmpty?: boolean;
  locked?: boolean;
  loading?: boolean;
  statusLabel?: string;
  isWaitingForReview?: boolean;
}

export function DeckStack({ 
  onDraw, 
  isDrawing, 
  disabled, 
  activeMission, 
  activePack, 
  poolEmpty,
  locked,
  loading,
  statusLabel,
  isWaitingForReview
}: DeckStackProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);

  const { frankieMode, fc } = useTheme();
  const fPref = { frankieMode };
  const isPlain = frankieMode;
  const isActuallyDisabled = disabled || locked || loading;

  React.useEffect(() => {
    setImageError(false);
  }, [activePack?.packId]);

  const handleDraw = () => {
    if (!isActuallyDisabled && !isDrawing) {
      onDraw();
    }
  };

  const renderIcon = (iconName: string, className?: string) => {
    const IconComponent = (Icons as any)[iconName];
    return IconComponent ? <IconComponent className={className} /> : <RotateCcw className={className} />;
  };

  return (
    <div id="deck-draw-area" className="relative h-[200px] sm:h-[320px] w-full flex items-center justify-center py-4 transform scale-90 sm:scale-100">
      {/* The Stack */}
      <div 
           id="starter-deck" 
           data-tour="deck-draw" 
           data-onboarding="starter-deck"
           className={cn(
             "relative w-32 h-44 sm:w-64 sm:h-80 group cursor-pointer select-none transition-all",
             isActuallyDisabled ? "cursor-not-allowed grayscale opacity-40" : ""
           )}
           onClick={handleDraw}
           onMouseEnter={() => !isActuallyDisabled && setIsHovered(true)}
           onMouseLeave={() => setIsHovered(false)}
      >
        {/* Layered cards to look like a stack - increased layers and dimensional shadow */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            initial={false}
            animate={{
              rotate: i * 0.8 - 3 + (isHovered && !isActuallyDisabled ? (i - 3) * 1.5 : 0),
              x: i * 0.5 - 2 + (isHovered && !isActuallyDisabled ? (i - 3) * 4 : 0),
              y: -i * 3 + (isHovered && !isActuallyDisabled ? -12 : Math.sin(Date.now() / 1000 + i) * 1.5),
              scale: isHovered && !isActuallyDisabled ? 1.03 : 1
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className={cn(
              "absolute inset-0 border-[3px] sm:border-4 border-on-surface bg-white overflow-hidden rounded-sm",
              i === 7 
                ? "z-10 shadow-[8px_8px_0px_rgba(0,0,0,0.1),24px_24px_40px_rgba(0,0,0,0.15)]" 
                : "z-0 shadow-[2px_2px_0px_rgba(0,0,0,0.05),4px_4px_10px_rgba(0,0,0,0.05)]"
            )}
            style={{ zIndex: i }}
          >
            {/* Card Back Design - Premium Material */}
            <div className="w-full h-full flex flex-col bg-[#1e1e1f] relative overflow-hidden">
              {/* Bevel highlight */}
              <div className="absolute inset-0 border-t border-l border-white/10 pointer-events-none" />
              
              {/* Cardboard top trim strip */}
              <div className="h-6 sm:h-8 bg-[#b89065] border-b-[3px] border-on-surface relative overflow-hidden shrink-0 flex items-center justify-center">
                {/* Cardboard corrugation/lines pattern */}
                <div className="absolute inset-0 opacity-15 bg-[repeating-linear-gradient(90deg,#000,#000_1px,transparent_1px,transparent_6px)]" />
                <div className="w-10 h-1 bg-white/20 rounded-full" />
              </div>
              
              {/* Textured dark card body */}
              <div className="flex-grow p-2 sm:p-4 flex flex-col items-center justify-center relative bg-[#242426]">
                {/* Paper thickness hint on edges */}
                <div className="absolute inset-0 border-r-4 border-b-4 border-black/20 pointer-events-none" />
                
                {/* Background radial highlight */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,92,0,0.08)_0%,_transparent_75%)]" />
                
                {/* Decal / Sticker Area */}
                <div className={cn(
                  "relative bg-white border-2 border-on-surface w-[94%] h-[82%] flex flex-col items-center justify-center shadow-[4px_4px_0px_black] overflow-hidden transform",
                  i === 7 ? "rotate-[-1deg]" : i === 6 ? "rotate-[1.5deg]" : "rotate-0"
                )}>
                  {/* Subtle paper texture on the sticker itself */}
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/handmade-paper.png')] opacity-15 pointer-events-none z-10" />
                  
                  {/* Inset shadow for depth */}
                  <div className="absolute inset-0 shadow-[inset_2px_2px_8px_rgba(0,0,0,0.1)] pointer-events-none" />
                  
                  {activePack ? (
                    <div className="w-full h-full relative p-2">
                       <div className="w-full h-full border-2 border-on-surface/10 overflow-hidden relative field-card p-0 shadow-none">
                         <img 
                           src={getDeckCoverImage(activePack)} 
                           alt={`${activePack?.title || activePack?.packName || 'Deck'} cover`} 
                           className="w-full h-full object-cover grayscale-[10%] group-hover:grayscale-0 transition-all duration-500"
                           referrerPolicy="no-referrer"
                           onError={(event) => {
                             event.currentTarget.src = BASE_DECK_PLACEHOLDER;
                           }}
                         />
                         {/* Stamp effect on decal */}
                         <div className="absolute bottom-2 right-2 bg-white/80 border-2 border-on-surface text-[7px] font-black px-2 py-0.5 shadow-[2px_2px_0px_black] rotate-[-2deg]">S01_DECAL</div>
                       </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-between p-4 sm:p-5 select-none">
                      {/* Decorative Tape Piece at top */}
                      <div className="absolute top-1 left-1/2 -translate-x-1/2 w-12 h-4 bg-brand-cyan/40 border-b border-on-surface/10 rotate-[-2deg] z-20" />
                      
                      <div className="w-full flex flex-col items-center mt-2 relative z-10">
                        <span className="text-[8px] font-mono tracking-[0.25em] text-on-surface/40 uppercase font-black">BUREAU_UNIT</span>
                        <h4 className="font-display text-2xl sm:text-3xl font-black uppercase text-on-surface tracking-tighter leading-none mt-1 italic">
                          FIELD TRIP
                        </h4>
                      </div>
                      
                      <div className={cn(
                        "my-3 text-brand-orange flex items-center justify-center relative transition-transform duration-500",
                        isHovered && !isActuallyDisabled ? "rotate-12 scale-110" : "rotate-3"
                      )}>
                        <div className="w-16 h-16 rounded-full border-4 border-double border-brand-orange flex items-center justify-center p-2 bg-brand-orange/10 relative shadow-[0_0_15px_rgba(255,92,0,0.1)]">
                           <RotateCcw className="w-8 h-8 animate-spin-slow" />
                        </div>
                      </div>
                      
                      <div className="w-full flex flex-col items-center justify-center gap-1.5 mt-auto relative z-10">
                        <div className="text-[8px] font-mono text-on-surface/35 font-black uppercase tracking-widest leading-none">
                          ACTIVE_DATASET
                        </div>
                        <div className="text-[10px] text-white bg-on-surface font-display uppercase tracking-tight py-1.5 px-4 border-2 border-on-surface font-black italic max-w-full truncate shadow-[4px_4px_0px_black] rotate-[1deg]">
                          {activePack?.packName || "RECRUIT_MESS_V1"}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Subtle gloss overlay across everything on interactive front card */}
              {i === 7 && (
                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/10 pointer-events-none" />
              )}
            </div>
          </motion.div>
        ))}

        {/* Animation for drawn card - Simplified here as Deck.tsx handles the main sequence now */}
        <AnimatePresence>
          {isDrawing && (
            <motion.div
              initial={{ rotateY: 180, scale: 0.8, y: 0, opacity: 1, zIndex: 100 }}
              animate={{ 
                y: -100, 
                opacity: 0,
                scale: 0.9,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeIn" }}
              className="absolute inset-0 h-44 w-32 border-4 border-on-surface bg-[#1e1e1f] z-[200] pointer-events-none shadow-[12px_12px_0px_black]"
            >
               {/* Card Back is shown during the pull */}
               <div className="w-full h-full border-2 border-white/10" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Prompt to Draw */}
        <div className="absolute -bottom-20 left-0 right-0 text-center pointer-events-none">
            <motion.div
              animate={isHovered && !disabled ? { y: -5 } : { y: 0 }}
              className="space-y-2"
            >
              <p className={cn(
                  "font-display text-2xl uppercase italic font-black transition-all duration-300 tracking-tighter",
                  isHovered && !isActuallyDisabled ? "text-brand-orange scale-110" : "text-on-surface opacity-40"
              )}>
                  {statusLabel || (poolEmpty ? fc('DECK_EXHAUSTED', 'OUT OF MISSIONS') : (isActuallyDisabled ? fc('UPLINK_RESTRICTED', 'LOCKED') : fc('TAP_TO_DRAW_MISSION', 'TAP TO DRAW')))}
              </p>
              <div className="flex justify-center gap-1">
                 {[...Array(3)].map((_, i) => (
                   <motion.div 
                    key={i}
                    animate={isHovered && !disabled ? { scaleX: [1, 1.5, 1], backgroundColor: ['#000', '#ff5c00', '#000'] } : {}}
                    transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                    className="h-1 w-6 bg-on-surface block opacity-10" />
                 ))}
              </div>
            </motion.div>
        </div>
      </div>
    </div>
  );
}
