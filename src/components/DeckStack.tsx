import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { RotateCcw, Zap, Camera, MapPin } from 'lucide-react';

import * as Icons from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { getFrankieTitle, getFrankieDescription } from '../logic/frankieModeLogic';

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
  statusLabel 
}: DeckStackProps) {
  const [isHovered, setIsHovered] = useState(false);

  const { frankieMode, fc } = useTheme();
  const fPref = { frankieMode };
  const isPlain = frankieMode;
  const isActuallyDisabled = disabled || locked || loading;

  const renderIcon = (iconName: string, className?: string) => {
    const IconComponent = (Icons as any)[iconName];
    return IconComponent ? <IconComponent className={className} /> : <RotateCcw className={className} />;
  };

  return (
    <div className="relative h-[380px] sm:h-[480px] w-full flex items-center justify-center py-6 sm:py-12">
      {/* The Stack */}
      <div className={cn(
             "relative w-64 h-80 group cursor-pointer select-none",
             isActuallyDisabled ? "cursor-not-allowed grayscale opacity-40" : ""
           )}
           onClick={() => !isActuallyDisabled && !isDrawing && onDraw()}
           onMouseEnter={() => !isActuallyDisabled && setIsHovered(true)}
           onMouseLeave={() => setIsHovered(false)}
      >
        {/* Layered cards to look like a stack */}
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            initial={false}
            animate={{
              rotate: i * 2 - 4 + (isHovered && !disabled ? (i - 2) * 2 : 0),
              x: i * 2 - 4 + (isHovered && !disabled ? (i - 2) * 6 : 0),
              y: -i * 2 + (isHovered && !disabled ? -10 : 0),
              scale: isHovered && !disabled ? 1.05 : 1
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className={cn(
              "absolute inset-0 border-4 border-on-surface shadow-[4px_4px_0px_rgba(0,0,0,0.15)] bg-white overflow-hidden",
              i === 4 ? "z-10 shadow-[8px_8px_0px_var(--color-on-surface)]" : "z-0"
            )}
            style={{ zIndex: i }}
          >
            {/* Card Back Design */}
            <div className="w-full h-full p-6 flex flex-col items-center justify-center bg-paper relative overflow-hidden">
                {/* Patterned background for card back */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                     style={{ 
                       backgroundImage: 'radial-gradient(circle, var(--color-on-surface) 1px, transparent 1px)', 
                       backgroundSize: '24px 24px' 
                     }} />
                
                <div className="relative z-10 flex flex-col items-center gap-6">
                  <div className={cn(
                    "w-20 h-20 rounded-full border-4 border-on-surface/5 flex items-center justify-center transition-all duration-500",
                    isHovered && !disabled ? "border-brand-orange/20 scale-110" : ""
                  )}>
                    {activePack && i === 4 ? (
                      renderIcon(activePack.fallbackIcon, cn(
                        "w-10 h-10 transition-all duration-500",
                        isHovered && !disabled ? "text-brand-orange scale-110" : "text-on-surface/20"
                      ))
                    ) : (
                      <RotateCcw className={cn(
                        "w-12 h-12 transition-all duration-500", 
                        i === 4 ? "opacity-100 text-on-surface/20" : "opacity-0",
                        isHovered && !disabled && i === 4 ? "animate-spin-slow text-brand-orange opacity-100" : ""
                      )} />
                    )}
                  </div>
                  <div className="space-y-1 text-center">
                    <p className={cn(
                      "font-display text-2xl font-black uppercase tracking-tighter italic transition-colors duration-300",
                      isHovered && !disabled ? "text-brand-orange" : "text-on-surface/30"
                    )}>
                      {activePack && i === 4 ? activePack.shortName : (isPlain ? "Mission Deck" : "Mission_Uplink")}
                    </p>
                    <div className="flex items-center justify-center gap-2">
                       <div className="h-1 w-4 bg-on-surface/10" />
                       <p className="micro-label text-[8px] font-bold uppercase tracking-widest opacity-20">
                         {activePack && i === 4 ? activePack.packId.toUpperCase() : (isPlain ? "SECTOR MISSIONS" : "Protocol//BETA-4")}
                       </p>
                       <div className="h-1 w-4 bg-on-surface/10" />
                    </div>
                  </div>
                </div>

                {/* Decorative stripes */}
                <div className="absolute top-0 left-0 right-0 h-4 bg-on-surface/5" />
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-on-surface/5 flex items-center justify-center gap-3 overflow-hidden">
                   {[...Array(12)].map((_, j) => (
                     <div key={j} className="w-2 h-full bg-on-surface/5 -skew-x-12 shrink-0" />
                   ))}
                </div>

                {/* Corners */}
                <div className="absolute -top-4 -left-4 w-8 h-8 border-4 border-on-surface/10 rotate-45" />
                <div className="absolute -top-4 -right-4 w-8 h-8 border-4 border-on-surface/10 rotate-45" />
            </div>
          </motion.div>
        ))}

        {/* Animation for drawn card */}
        <AnimatePresence>
          {isDrawing && activeMission && (
            <motion.div
              initial={{ x: 0, y: 0, rotate: 0, scale: 0.9, opacity: 1, zIndex: 100 }}
              animate={{ 
                x: 0, 
                y: -300, 
                rotate: [0, -2, 2, 0], 
                scale: 1.1, 
                opacity: [1, 1, 1, 0] 
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-x-4 inset-y-0 h-64 my-auto border-4 border-on-surface bg-white z-[200] pointer-events-none shadow-[20px_20px_0px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden"
            >
               {/* Card Content - Simple mobile-safe summary */}
               <div className="flex-grow flex flex-col h-full bg-white">
                  <div className="bg-on-surface p-2 flex justify-between items-center text-white">
                    <span className="text-[8px] font-black uppercase tracking-widest italic">MISSION_DECODED</span>
                    <Zap className="w-3 h-3 text-brand-orange" />
                  </div>
                  
                  <div className="p-4 flex gap-4 h-full items-center">
                    <div className="w-20 h-28 bg-on-surface/5 border-2 border-on-surface shrink-0 overflow-hidden rotate-[-2deg]">
                       <img src={activeMission.image} className="w-full h-full object-cover grayscale" alt="" />
                    </div>
                    <div className="flex-grow space-y-1">
                       <h4 className="font-display text-xl font-black uppercase italic leading-none tracking-tighter">
                         {getFrankieTitle(activeMission, fPref)}
                       </h4>
                       <p className="text-[8px] font-serif italic opacity-60 line-clamp-3">
                         "{getFrankieDescription(activeMission, fPref)}"
                       </p>
                       <div className="flex justify-between items-center pt-2">
                          <span className="bg-brand-lime text-on-surface px-1.5 py-0.5 text-[8px] font-black uppercase italic shadow-[1px_1px_0_black]">+{activeMission.baseXP || 100} XP</span>
                       </div>
                    </div>
                  </div>
               </div>
               <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.02)_50%)] bg-[length:100%_4px] opacity-20" />
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
