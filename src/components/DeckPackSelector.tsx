import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DeckPack } from '../types/deckPacks';
import { getActiveDeckPacks, getMissionsForPack } from '../data/deckPacks';
import { SUMMER_CHALLENGE_BANK } from '../data/summerChallengeBank';
import { FEATURE_FLAGS } from '../config/featureFlags';
import { Zap, ChevronDown, Check, Info, Lock } from 'lucide-react';
import { cn } from '../lib/utils';
import * as Icons from 'lucide-react';
import { useApp } from '../context/AppContext';
import { isSummerDeckActive } from '../logic/progression';

interface DeckPackSelectorProps {
  selectedPackId: string;
  onSelect: (packId: string) => void;
}

export const DeckPackSelector: React.FC<DeckPackSelectorProps> = ({ selectedPackId, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { isAdmin, currentDate, isSummerDeckUnlocked, isOnboardingComplete } = useApp();
  
  const getPackLockState = (packId: string) => {
    if (packId === 'summer-surge-2026') {
      const activeByDate = isSummerDeckActive(currentDate);
      const locked = !isSummerDeckUnlocked;
      const bypassed = (isAdmin || import.meta.env.DEV) && (!activeByDate || !isOnboardingComplete);
      
      let reason = "";
      if (!isOnboardingComplete) reason = "(COMPLETE_ONBOARDING)";
      else if (!activeByDate) reason = "(OPENS_MAY_30)";

      return { locked, bypassed, reason };
    }
    return { locked: false, bypassed: false, reason: "" };
  };

  const activePacks = getActiveDeckPacks();
  const currentPack = activePacks.find(p => p.packId === selectedPackId) || activePacks[0];

  const renderIcon = (iconName: string, className?: string) => {
    const IconComponent = (Icons as any)[iconName];
    return IconComponent ? <IconComponent className={className} /> : <Zap className={className} />;
  };

  const currentLockState = getPackLockState(currentPack.packId);

  return (
    <div className="relative w-full max-w-sm mx-auto">
      {/* Active Pack Label */}
      <div className="flex justify-center -mb-3 relative z-10">
        <div className="bg-on-surface text-brand-lime px-3 py-1 text-[8px] font-black uppercase tracking-[0.2em] italic border-2 border-on-surface shadow-[4px_4px_0px_rgba(0,0,0,0.2)]">
          ACTIVE_PACK_SLOT
        </div>
      </div>

      {/* Main Trigger Card */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full bg-white border-4 border-on-surface p-4 shadow-[8px_8px_0px_black] text-left transition-all active:translate-x-1 active:translate-y-1 active:shadow-none relative overflow-hidden",
          isOpen && "shadow-none translate-x-1 translate-y-1"
        )}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-on-surface/5 flex items-center justify-center border-2 border-on-surface/10 shrink-0">
            {renderIcon(currentPack.fallbackIcon, "w-6 h-6 opacity-60")}
          </div>
          <div className="flex-grow min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-display text-xl font-black uppercase italic tracking-tighter truncate">
                {currentPack.packName} {currentLockState.locked && " (LOCKED)"}
              </h4>
              {currentPack.season && (
                <span className="bg-brand-orange text-white text-[7px] font-black px-1.5 py-0.5 uppercase italic">
                  {currentPack.season}
                </span>
              )}
            </div>
            {currentLockState.reason && currentLockState.locked && (
              <div className="mt-1">
                <span className="text-[7px] font-mono tracking-wider text-error bg-error/5 border border-error/10 px-1 py-0.5 uppercase">
                  Locked: {currentLockState.reason}
                </span>
              </div>
            )}
            {currentLockState.bypassed && (
              <div className="mt-1">
                <span className="text-[7px] font-mono tracking-wider text-brand-orange bg-brand-orange/5 border border-brand-orange/10 px-1 py-0.5 uppercase">
                  Active via Dev-Bypass
                </span>
              </div>
            )}
            <p className="text-[9px] font-mono opacity-50 uppercase tracking-widest truncate">
              {getMissionsForPack(currentPack.packId, SUMMER_CHALLENGE_BANK).length} SIGNALS AVAILABLE
            </p>
          </div>
          <ChevronDown className={cn("w-5 h-5 transition-transform duration-300", isOpen && "rotate-180")} />
        </div>

        {/* Beta Notice */}
        <div className="absolute top-0 right-0 left-0 h-0.5 bg-brand-orange/20" />
      </motion.button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-4 bg-white border-4 border-on-surface shadow-[16px_16px_0px_rgba(0,0,0,0.1)] z-[200] p-2 max-h-[400px] overflow-y-auto custom-scrollbar"
          >
            <div className="p-3 border-b-2 border-on-surface/5 mb-2">
              <div className="flex items-center gap-2 text-brand-orange">
                <Zap className="w-3 h-3 fill-brand-orange" />
                <p className="text-[10px] font-black uppercase tracking-wider italic">MISSION_PACK_LIBRARY</p>
              </div>
              <p className="text-[8px] opacity-40 mt-1 uppercase tracking-tight">
                {FEATURE_FLAGS.ENABLE_DECK_PACK_DRAW_LOGIC 
                  ? "Phase 3: Active Pack Draw Logic Engaged" 
                  : "Phase 2: Pack Visual Preview Active"}
              </p>
            </div>

            <div className="space-y-2">
              {activePacks.map((pack) => {
                const missionCount = getMissionsForPack(pack.packId, SUMMER_CHALLENGE_BANK).length;
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
                      "w-full text-left p-3 border-2 transition-all flex gap-3 group",
                      isSelected 
                        ? "bg-on-surface/5 border-on-surface shadow-[4px_4px_0px_black]" 
                        : "border-transparent hover:border-on-surface/20",
                      locked && "opacity-50 cursor-not-allowed hover:border-transparent"
                    )}
                  >
                    <div className="w-10 h-10 bg-on-surface/5 flex items-center justify-center shrink-0 border border-on-surface/5">
                      {locked ? (
                        <Lock className="w-5 h-5 text-error" />
                      ) : (
                        renderIcon(pack.fallbackIcon, cn("w-5 h-5 transition-transform group-hover:scale-110", isSelected ? "opacity-100" : "opacity-30"))
                      )}
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-display text-base font-black uppercase italic tracking-tighter truncate">
                          {pack.packName} {locked && reason}
                        </span>
                        {isSelected && !locked && <Check className="w-4 h-4 text-brand-lime" />}
                        {locked && <Lock className="w-3 h-3 text-error shrink-0" />}
                      </div>
                      <p className="text-[8px] opacity-60 leading-tight line-clamp-1 mt-0.5">
                        {locked ? `Locked ${reason}. Complete requirements to unlock.` : pack.description}
                      </p>
                      {bypassed && (
                        <div className="mt-1">
                          <span className="text-[7px] font-mono tracking-wider text-brand-orange bg-brand-orange/5 border border-brand-orange/10 px-1 py-0.5 uppercase">
                            Active via Dev-Bypass
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[7px] font-mono font-bold opacity-40">{missionCount} SIGNALS</span>
                        {pack.difficultyRange && (
                          <span className="text-[7px] font-black uppercase px-1 bg-on-surface/5 text-on-surface/40">
                            {pack.difficultyRange.join(' / ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 p-3 bg-brand-orange/5 border-t-2 border-on-surface/5 flex gap-3 items-start">
              <Info className="w-4 h-4 text-brand-orange shrink-0 mt-0.5" />
              <p className="text-[8px] font-medium leading-tight opacity-70">
                <span className="font-black">BETA_NOTICE:</span> {FEATURE_FLAGS.ENABLE_DECK_PACK_DRAW_LOGIC 
                  ? "Mission draws now come from your slotted pack. If a pack is exhausted, we fall back to the Summer Surge signal feed." 
                  : "Pack themes are previewing now. The physical deck continues to draw from the verified Summer Surge pool for stability."}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[150] bg-on-surface/20 backdrop-blur-[1px]" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};
