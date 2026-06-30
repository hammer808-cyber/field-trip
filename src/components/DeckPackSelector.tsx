import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { DeckPack } from '../types/deckPacks';
import { getMissionsForPack } from '../data/deckPacks';
import { HEATWAVE_CHALLENGE_BANK } from '../data/heatwaveChallengeBank';
import { SOCAL_SUMMER_CHALLENGE_BANK } from '../data/socalSummerChallengeBank';
import { FEATURE_FLAGS } from '../config/featureFlags';
import { Zap, ChevronDown, Check, Info, Lock, X, Waves } from 'lucide-react';
import { cn } from '../lib/utils';
import * as Icons from 'lucide-react';
import { useApp } from '../context/AppContext';
import { isHeatwaveDeckActive as isSummerDeckActive, isHeatwaveDeckStabilized as isSummerDeckStabilized } from '../logic/progression';
import { StickerDecal, StickerCorner } from './StickerDecals';
import { DeckArtwork } from './DeckArtwork';

interface DeckPackSelectorProps {
  selectedPackId: string;
  onSelect: (packId: string) => void;
}

export const DeckPackSelector: React.FC<DeckPackSelectorProps> = ({ selectedPackId, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null);
  const { 
    isAdmin, 
    currentDate, 
    isHeatwaveDeckUnlocked: isSummerDeckUnlocked, 
    isSocalSummerUnlocked,
    isOnboardingComplete,
    visibleDeckPacks,
    getDeckAccessForPack
  } = useApp();
  
  const updateTriggerRect = () => {
    if (triggerRef.current) {
      setTriggerRect(triggerRef.current.getBoundingClientRect());
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateTriggerRect();
      window.addEventListener('scroll', updateTriggerRect, true);
      window.addEventListener('resize', updateTriggerRect);
    }
    return () => {
      window.removeEventListener('scroll', updateTriggerRect, true);
      window.removeEventListener('resize', updateTriggerRect);
    };
  }, [isOpen]);

  const getPackLockState = (packId: string) => {
    const pack = activePacks.find(p => p.packId === packId);
    const access = getDeckAccessForPack(pack);
    if (pack && !access.playable) {
      return {
        locked: true,
        bypassed: false,
        reason: access.reason || "Private field assignment"
      };
    }
    
    // Future Drop Rule
    if (pack?.isFutureDrop) {
      return {
        locked: !isAdmin,
        bypassed: isAdmin,
        reason: "Locked for a future drop"
      };
    }

    // Rule: SoCal Summer Locking
    if (packId === 'socal-summer') {
      const locked = !isSocalSummerUnlocked && !isAdmin;
      const bypassed = isAdmin && !isSocalSummerUnlocked;
      let reason = "";
      if (locked) {
        reason = "Unlocks after Starter Signals";
      }
      return { locked, bypassed, reason };
    }

    // Rule: Starter must be complete for ANY other non-summer, non-starter deck
    if (packId !== 'starter-signals' && packId !== 'heatwave-receipts' && !isSummerDeckUnlocked) {
      return { 
        locked: !isAdmin, 
        bypassed: isAdmin, 
        reason: "Complete Starter Pack (3/3 missions) to unlock" 
      };
    }

    if (packId === 'heatwave-receipts') {
      const activeByDate = isSummerDeckActive(currentDate);
      
      // Locked if not unlocked by onboarding/date and not admin
      const locked = !isSummerDeckUnlocked && !isAdmin;
      const bypassed = isAdmin && !isSummerDeckUnlocked;
      
      let reason = "";
      if (!isSummerDeckUnlocked && !isAdmin) {
        if (!isOnboardingComplete) {
          reason = "Complete Starter Pack (3/3 missions) to unlock";
        } else if (!activeByDate) {
          reason = `Season starts ${new Date(activePacks.find(p => p.packId ==='heatwave-receipts')?.startsAt || '').toLocaleDateString()}`;
        }
      }

      return { 
        locked, 
        bypassed, 
        reason
      };
    }

    return { locked: false, bypassed: false, reason: "" };
  };

  const activePacks = visibleDeckPacks;
  const currentPack = activePacks.find(p => p.packId === selectedPackId) || activePacks[0];

  const renderIcon = (iconName: string, className?: string) => {
    if (iconName === 'Waves') return <Waves className={className} />;
    const IconComponent = (Icons as any)[iconName];
    return IconComponent ? <IconComponent className={className} /> : <Zap className={className} />;
  };

  const currentLockState = getPackLockState(currentPack.packId);

  const menuContent = (
    <div className="space-y-3 p-1">
      {activePacks.map((pack) => {
        const ALL_MISSIONS = [...HEATWAVE_CHALLENGE_BANK, ...SOCAL_SUMMER_CHALLENGE_BANK];
        const missionCount = getMissionsForPack(pack.packId, ALL_MISSIONS).length;
        const isSelected = pack.packId === selectedPackId;
        const { locked, bypassed, reason } = getPackLockState(pack.packId);

        return (
          <button
            key={pack.packId}
            disabled={locked}
            onClick={() => {
              if (locked) return;
              onSelect(pack.packId);
              setIsOpen(false);
            }}
            className={cn(
              "w-full text-left p-4 bg-white border-2 transition-all flex gap-4 items-start rounded-none group cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-orange-500 relative overflow-hidden",
              isSelected 
                ? "bg-[#FAF7F0] border-on-surface shadow-[4px_4px_0px_black]" 
                : "border-on-surface/15 hover:border-on-surface/40 hover:bg-[#FAF8F5]",
              locked && "cursor-not-allowed hover:border-on-surface/15 bg-stone-50 border-dashed border-stone-300"
            )}
          >
            {/* Visual locked diagonal striped warning watermark overlay */}
            {locked && (
              <div 
                className="absolute inset-0 pointer-events-none opacity-[0.03] z-0" 
                style={{ 
                  backgroundImage: 'repeating-linear-gradient(45deg, #000 0px, #000 10px, transparent 10px, transparent 20px)' 
                }} 
              />
            )}
            {/* Left Column: Icon Container */}
            <div className="w-[32px] h-[32px] flex items-center justify-center border-[2px] border-on-surface/50 bg-[#F2EDE2] shrink-0 relative mt-0.5 select-none overflow-hidden">
              {locked ? (
                <Lock className="w-4 h-4 text-error" />
              ) : (
                <DeckArtwork pack={pack} alt={pack.packName} imageClassName="group-hover:scale-105" grayscale="" />
              )}
            </div>

            {/* Right Column: Content Details */}
            <div className="flex-grow min-w-0 space-y-2 text-left">
              <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                <span className="font-sans text-[16px] md:text-[17px] font-black uppercase text-on-surface tracking-tight leading-[1.15] truncate max-w-full">
                  {pack.packName}
                </span>
                <div className="flex items-center gap-1.5 shrink-0 ms-auto">
                  {isSelected && !locked && <Check className="w-4 h-4 text-brand-lime stroke-[3]" />}
                  {locked && <Lock className="w-3.5 h-3.5 text-error shrink-0" />}
                </div>
              </div>

              <p className="text-[13px] md:text-[14.5px] text-on-surface/85 font-medium leading-[1.4] font-sans break-words whitespace-normal leading-relaxed">
                {locked ? (
                  <span className="text-error/80 font-semibold font-mono text-[11px] uppercase tracking-wide">
                    {reason || "This dossier is currently locked. Complete previous field signals or requirements to unlock this file."}
                  </span>
                ) : (
                  pack.description
                )}
              </p>

              {bypassed && (
                <div className="inline-block">
                  <span className="text-[10px] font-mono font-bold tracking-wider text-brand-orange bg-brand-orange/10 border border-brand-orange/25 px-2 py-0.5 uppercase rounded-none">
                    Active via Dev-Bypass
                  </span>
                </div>
              )}

              {/* Metadata pills wrapping clearly with higher contrast and 10px+ size */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                <span className="px-2.5 py-0.5 bg-on-surface/5 text-on-surface/85 border border-on-surface/20 rounded-full text-[10.5px] font-mono font-extrabold tracking-wider uppercase inline-flex items-center">
                  {missionCount} SIGNALS
                </span>
                
                {/* Progress Details (Requirement: Show approved/pending on Starter and others) */}
                {(() => {
                  const deckMissions = getMissionsForPack(pack.packId, [...HEATWAVE_CHALLENGE_BANK, ...SOCAL_SUMMER_CHALLENGE_BANK]);
                  const missionIds = deckMissions.map(m => (m.id || '').toLowerCase());
                  
                  const { entries, completedChallengeIds, submittedPendingChallengeIds } = useApp();
                  
                  // For Starter, we use a specific list if the packId matches
                  const isStarterPack = pack.packId === 'starter-signals';
                  const starterIds = ['starter-1', 'starter-2', 'starter-3'];
                  const targetIds = isStarterPack ? starterIds : missionIds;
                  
                  const approvedCount = targetIds.filter(id => completedChallengeIds.has(id)).length;
                  const pendingCount = targetIds.filter(id => submittedPendingChallengeIds.has(id)).length;

                  if (approvedCount > 0 || pendingCount > 0) {
                    return (
                      <>
                        <span className="px-2.5 py-0.5 bg-brand-lime/10 text-brand-lime border border-brand-lime/30 rounded-full text-[10.5px] font-mono font-extrabold tracking-wider uppercase inline-flex items-center">
                          {approvedCount}{isStarterPack ? '/3' : ''} APPROVED
                        </span>
                        {pendingCount > 0 && (
                          <span className="px-2.5 py-0.5 bg-brand-orange/10 text-brand-orange border border-brand-orange/30 rounded-full text-[10.5px] font-mono font-extrabold tracking-wider uppercase inline-flex items-center">
                            {pendingCount} PENDING
                          </span>
                        )}
                      </>
                    );
                  }
                  return null;
                })()}

                {!locked && isSelected && (
                  <span className="px-2.5 py-0.5 bg-[#FAF7F0] text-brand-orange border border-brand-orange/30 rounded-full text-[10.5px] font-mono font-extrabold tracking-wider uppercase inline-flex items-center">
                    LOADED
                  </span>
                )}
                {pack.difficultyRange && (
                  <span className="px-2.5 py-0.5 bg-on-surface/10 text-on-surface/90 border border-on-surface/20 rounded-full text-[10.5px] font-mono font-extrabold tracking-wider uppercase inline-flex items-center">
                    {pack.difficultyRange.join(' / ')}
                  </span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="relative w-full max-w-sm">
      {/* Dimensional Cartridge / Tab Trigger */}
      <motion.button
        ref={triggerRef}
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98, y: 0 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full bg-[#FCF9F2] border-[3px] sm:border-4 border-on-surface p-3 sm:p-5 text-left relative",
          "shadow-[4px_4px_0px_rgba(0,0,0,0.1),8px_8px_0px_black] group transition-all",
          isOpen && "shadow-none translate-x-[4px] translate-y-[4px]"
        )}
      >
        {/* Dynamic decorative theme sticker corner */}
        <StickerCorner 
          id={currentPack.packId === 'heatwave-receipts' ? 'heatwave-starter' : currentPack.packId === 'starter-signals' ? 'deck-starter-signals' : 'deck-urban-recon'}
          corner="top-right" 
          scale={0.7} 
          className="mr-12 -mt-2 sm:mr-16 sm:-mt-3 pointer-events-none"
        />

        {/* Physical Detail: Cartridge Slot Grip */}
        <div className="absolute top-0 right-0 w-12 h-full opacity-[0.15] bg-[repeating-linear-gradient(0deg,#000,#000_1px,transparent_1px,transparent_6px)] pointer-events-none" />
        
        {/* Paper Grain & Material Depth */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/handmade-paper.png')] opacity-20 pointer-events-none mix-blend-multiply" />
        <div className="absolute inset-0 shadow-[inset_2px_2px_12px_rgba(255,255,255,0.4)] pointer-events-none" />
        
        {/* Top Gloss Glint */}
        <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/40 to-transparent pointer-events-none" />

        <div className="relative z-10 flex items-center gap-4">
          {/* Card Icon / Decal Inset */}
          <div className="w-16 h-16 bg-white flex items-center justify-center border-2 border-on-surface shrink-0 overflow-hidden relative shadow-[inset_2px_2px_4px_rgba(0,0,0,0.1),2px_2px_0px_black] rotate-[-1deg]">
            <DeckArtwork pack={currentPack} alt={currentPack.packName} />
            {/* Gloss on the icon */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-white/40 pointer-events-none" />
          </div>

          <div className="flex-grow min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="h-2 w-2 rounded-full bg-brand-lime shadow-[0_0_8px_var(--color-brand-lime)]" />
              <span className="text-[8px] font-mono tracking-[0.2em] font-black text-on-surface/40 uppercase">
                LOADED_CARTRIDGE
              </span>
            </div>
            
            <h4 className="font-display text-xl sm:text-2xl font-black uppercase italic tracking-tighter truncate text-on-surface leading-none mb-1">
              {currentPack.packName}
            </h4>
            
            <div className="flex items-center gap-2">
              <Zap className="w-3 h-3 text-brand-orange" />
              <p className="text-[10px] font-mono uppercase tracking-widest font-black text-on-surface/50">
                {getMissionsForPack(currentPack.packId, [...HEATWAVE_CHALLENGE_BANK, ...SOCAL_SUMMER_CHALLENGE_BANK]).length} SIGNALS
              </p>
            </div>
          </div>
          
          <div className="flex flex-col items-center gap-1 opacity-20 group-hover:opacity-100 transition-opacity translate-x-2">
            <ChevronDown className={cn("w-6 h-6 transition-transform duration-500", isOpen && "rotate-180")} />
            <span className="text-[7px] font-black uppercase tracking-tighter font-mono -mt-1">DISK</span>
          </div>
        </div>

        {/* Peel Detail */}
        <div className="absolute top-0 right-0 w-6 h-6 bg-black/5 rotate-45 translate-x-3 -translate-y-3" />
      </motion.button>

      {/* PORTAL OVERLAY */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[1000] bg-on-surface/40 backdrop-blur-sm" 
                onClick={() => setIsOpen(false)}
              />

              {/* Menu Container */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, x: '-50%', y: '-45%' }}
                animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
                exit={{ opacity: 0, scale: 0.95, x: '-50%', y: '-45%' }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                style={{
                  position: 'fixed',
                  top: '50%',
                  left: '50%',
                }}
                className={cn(
                  "z-[3001] bg-[#FCF9F2] border-[4px] border-on-surface shadow-[12px_12px_0px_black] flex flex-col rounded-none",
                  "w-[calc(100vw-24px)] max-w-[420px] sm:max-w-[540px] md:max-w-[620px] max-h-[85vh] sm:max-h-[640px] overflow-hidden"
                )}
              >
                {/* Header for Menu */}
                <div className="p-4 sm:p-5 border-b-[3px] border-on-surface bg-[#F2EDE2] flex items-center justify-between select-none">
                  <div className="flex items-center gap-2 text-brand-orange">
                    <Zap className="w-5 h-5 fill-brand-orange text-brand-orange shrink-0" />
                    <span className="text-base sm:text-lg font-display font-black uppercase tracking-wider italic text-on-surface">
                      MISSION_PACK_LIBRARY
                    </span>
                  </div>
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="w-[38px] h-[38px] sm:w-[42px] sm:h-[42px] flex items-center justify-center bg-on-surface/5 hover:bg-on-surface/10 hover:text-brand-orange border-2 border-on-surface transition-colors cursor-pointer rounded-none focus:outline-none focus:ring-2 focus:ring-brand-orange/40 shrink-0"
                    aria-label="Close Library"
                  >
                    <X className="w-5 h-5 stroke-[2.5]" />
                  </button>
                </div>

                {/* Content Area */}
                <div className="p-4 sm:p-5 overflow-y-auto overflow-x-hidden custom-scrollbar flex-1 bg-[#FCF9F2]">
                  {menuContent}
                </div>

                {/* Bottom Footer Intel - Goal 8 */}
                <div className="p-4 sm:p-5 bg-[#FFEFE5] border-t-[3px] border-on-surface flex gap-3 items-center justify-center select-none shrink-0">
                  <Info className="w-4 h-4 text-brand-orange shrink-0" />
                  <p className="text-[11px] sm:text-[12px] font-mono font-extrabold tracking-wide text-[#C23C00] leading-tight uppercase text-center">
                    MISSION DRAW FROM SLOTTED PACK. FALLBACK: HEATWAVE RECEIPTS FEED.
                  </p>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};
