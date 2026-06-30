import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { RewardIntensity, RewardQueueItem } from '../types/feedback';
import * as LucideIcons from 'lucide-react';
import { Sparkles, X, Award, Info, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';

export const RewardFeedback: React.FC = () => {
  const { rewardQueue, dismissReward, profile } = useApp();
  const { skin } = useTheme();

  const isBaja = skin.id === 'baja-bratz';
  const isDiamond = skin.id === 'slippery-diamond';
  const isHeat = skin.id === 'heatwave';

  const intensity = profile?.preferences?.rewardAnimationIntensity || 'full';

  // Process ONLY one major reveal at a time unless minimal is set
  const majorReward = intensity !== 'minimal'
    ? rewardQueue.find(r => r.intensity === RewardIntensity.MAJOR_REVEAL)
    : null;
    
  // Process multiple medium/micro rewards as toasts. If minimal is active, major reveals also go to toasts
  const toasts = rewardQueue.filter(r => 
    intensity === 'minimal' || r.intensity !== RewardIntensity.MAJOR_REVEAL
  );

  return (
    <>
      {/* 1. MAJOR REVEAL MODAL */}
      <AnimatePresence>
        {majorReward && (
          <MajorReveal 
            reward={majorReward} 
            onDismiss={() => dismissReward(majorReward.id)}
            skinConfig={{ isBaja, isDiamond, isHeat }}
            intensity={intensity}
          />
        )}
      </AnimatePresence>

      {/* 2. TOAST SYSTEM (MEDIUM & MICRO) */}
      <div className="fixed bottom-24 right-6 left-6 md:left-auto md:w-80 z-[110] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((reward) => (
            <RewardToast 
              key={reward.id}
              reward={reward}
              onDismiss={() => dismissReward(reward.id)}
              skinConfig={{ isBaja, isDiamond, isHeat }}
              intensity={intensity}
            />
          ))}
        </AnimatePresence>
      </div>
    </>
  );
};

interface MajorRevealProps {
  reward: RewardQueueItem;
  onDismiss: () => void;
  skinConfig: { isBaja: boolean; isDiamond: boolean; isHeat: boolean };
  intensity: 'full' | 'reduced' | 'minimal';
}

const MajorReveal: React.FC<MajorRevealProps> = ({ reward, onDismiss, skinConfig, intensity }) => {
  const { isBaja, isDiamond, isHeat } = skinConfig;
  const IconComponent = (LucideIcons as any)[reward.iconName || 'Award'] || Award;

  const isReduced = intensity === 'reduced';

  return (
    <div className={cn(
      "fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 bg-black/90",
      !isReduced && "backdrop-blur-xl"
    )}>
      <motion.div
        initial={isReduced ? { scale: 1, opacity: 0 } : { scale: 0.8, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={isReduced ? { opacity: 0 } : { scale: 0.8, opacity: 0, y: -20 }}
        className={cn(
          "relative w-full max-w-sm p-6 sm:p-8 text-center overflow-y-auto overscroll-contain pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)]",
          isBaja ? "bg-white border-8 border-baja-pink rounded-[4rem] shadow-[20px_20px_0px_#40e0d0]" :
          isDiamond ? "bg-white/10 border border-white/20 rounded-none backdrop-blur-2xl" :
          isHeat ? "bg-white border-8 border-heat-pink rounded-[4rem] shadow-[20px_20px_0px_rgba(255,140,0,0.4)]" :
          "bg-paper border-4 border-on-surface shadow-[24px_24px_0px_black]"
        )}
        style={{ maxHeight: 'calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 32px)' }}
      >
        {/* Background Visual Flair (Disabled on Reduced to preserve frame budgets) */}
        {!isReduced && (
          <>
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-cyan/20 blur-3xl rounded-full translate-x-12 -translate-y-12 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-brand-magenta/20 blur-2xl rounded-full -translate-x-8 translate-y-8 pointer-events-none" />
          </>
        )}

        <div className="relative z-10 space-y-8">
          <div className="flex justify-center">
            <motion.div 
              animate={isReduced ? {
                scale: 1,
                rotate: 3
              } : { 
                rotate: [0, 10, -10, 0], 
                scale: [1, 1.2, 1],
                filter: ["drop-shadow(0 0 0px var(--color-brand-cyan))", "drop-shadow(0 0 20px var(--color-brand-cyan))", "drop-shadow(0 0 0px var(--color-brand-cyan))"]
              }}
              transition={isReduced ? {} : { duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className={cn(
                "w-32 h-32 border-4 border-on-surface flex items-center justify-center shadow-[12px_12px_0px_black]",
                isBaja ? "bg-baja-pink text-white rounded-full" : 
                isDiamond ? "bg-white text-black" :
                isHeat ? "bg-heat-pink text-white rounded-full" :
                "bg-brand-lime text-on-surface rotate-3"
              )}
            >
              <IconComponent className="w-16 h-16 stroke-[2.5]" />
            </motion.div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col items-center gap-2">
              <span className="text-[10px] font-mono font-black text-brand-orange uppercase tracking-[0.4em] mb-1">DATA_STREAM_CONFIRMED</span>
              <h2 className={cn(
                "font-display text-4xl uppercase tracking-tighter leading-[0.9] font-black italic",
                isBaja ? "text-baja-pink" : isDiamond ? "text-white" : "text-on-surface"
              )}>
                {reward.title}
              </h2>
            </div>
            {reward.description && (
              <p className="text-sm font-serif italic font-bold opacity-60 px-6 leading-relaxed">
                "{reward.description}"
              </p>
            )}
          </div>

          {reward.rewardText && (
            <div className={cn(
              "p-6 border-4 border-on-surface shadow-[8px_8px_0px_black]",
              isBaja ? "bg-baja-sand" : "bg-white relative overflow-hidden group"
            )}>
              <div className="absolute top-0 right-0 w-full h-full bg-brand-orange/5 translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
              <p className="text-[10px] font-mono font-black uppercase text-on-surface/40 mb-2 mt-[-4px] tracking-widest relative z-10">{reward.type === 'sticker' ? 'CHAPTER_DECAL_RESTORED' : 'BUREAU_CREDIT_UNLOCKED'}</p>
              <p className="font-display text-4xl font-black uppercase italic tracking-tighter text-brand-orange relative z-10 animate-pulse">{reward.rewardText}</p>
            </div>
          )}

          {reward.type === 'sticker' ? (
            <div className="space-y-4 pt-2">
              <button
                onClick={() => {
                  window.location.href = '/collection?tab=stickers';
                  onDismiss();
                }}
                className={cn(
                  "w-full py-5 font-display font-black uppercase tracking-widest transition-all text-lg italic",
                  isReduced ? "" : "active:scale-95",
                  "bg-brand-lime text-on-surface shadow-[10px_10px_0px_black] hover:shadow-none hover:translate-x-1 hover:translate-y-1"
                )}
              >
                View in Dex
              </button>
              <button
                onClick={onDismiss}
                className="w-full py-2 text-[10px] font-mono font-black uppercase tracking-[0.2em] text-on-surface/40 hover:text-on-surface transition-colors"
              >
                Keep Exploring
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                onDismiss();
                if (reward.redirectPath) {
                  window.location.href = reward.redirectPath;
                }
              }}
              className={cn(
                "w-full py-5 font-display font-black uppercase tracking-widest transition-all text-lg italic px-4",
                isReduced ? "" : "active:scale-95",
                isBaja ? "bg-baja-pink text-white rounded-full shadow-[8px_8px_0px_#40e0d0]" :
                isDiamond ? "bg-white text-black rounded-none" :
                "bg-on-surface text-white shadow-[10px_10px_0px_var(--color-brand-magenta)] hover:bg-brand-magenta active:shadow-none translate-y-0 active:translate-y-2"
              )}
            >
              {reward.type === 'milestone' && reward.rewardText ? reward.rewardText : "Acknowledge Receipt"}
            </button>
          )}
        </div>

        <button 
          onClick={onDismiss}
          className="absolute top-4 right-4 opacity-70 hover:opacity-100 transition-opacity z-20 p-2 bg-white/80 border border-on-surface/20 rounded-full"
          aria-label="Close sticker reward"
        >
          <X className="w-5 h-5" />
        </button>
      </motion.div>
    </div>
  );
};

interface RewardToastProps {
  reward: RewardQueueItem;
  onDismiss: () => void;
  skinConfig: { isBaja: boolean; isDiamond: boolean; isHeat: boolean };
  intensity: 'full' | 'reduced' | 'minimal';
}

const RewardToast: React.FC<RewardToastProps> = ({ reward, onDismiss, skinConfig, intensity }) => {
  const { isBaja, isDiamond, isHeat } = skinConfig;
  const isMedium = reward.intensity === RewardIntensity.MEDIUM_REWARD;
  const IconComponent = (LucideIcons as any)[reward.iconName || (isMedium ? 'Award' : 'CheckCircle2')] || (isMedium ? Award : CheckCircle2);

  const isReduced = intensity === 'reduced';

  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, isMedium ? 4000 : 2500);
    return () => clearTimeout(timer);
  }, [onDismiss, isMedium]);

  return (
    <motion.div
      layout={!isReduced}
      initial={isReduced ? { opacity: 0 } : { x: 100, opacity: 0, scale: 0.9 }}
      animate={{ x: 0, opacity: 1, scale: 1 }}
      exit={isReduced ? { opacity: 0 } : { x: 20, opacity: 0, scale: 0.9 }}
      className={cn(
        "pointer-events-auto flex items-center gap-5",
        isMedium 
          ? "p-5 bg-white border-[3px] border-on-surface shadow-[10px_10px_0px_rgba(0,0,0,1)] relative overflow-hidden" 
          : "p-3 px-5 bg-on-surface text-paper border-2 border-on-surface shadow-xl relative overflow-hidden",
        isBaja && (isMedium ? "bg-white border-baja-pink rounded-2xl" : "bg-baja-pink rounded-full"),
        isDiamond && (isMedium ? "bg-white/10 border-white/20 backdrop-blur-xl" : "bg-white/20 backdrop-blur-lg"),
        isHeat && (isMedium ? "bg-white border-heat-pink rounded-2xl shadow-[8px_8px_0px_rgba(255,140,0,0.2)]" : "bg-heat-pink rounded-full")
      )}
    >
      {isMedium && !isReduced && (
        <div className="absolute top-0 right-0 w-16 h-full bg-brand-lime opacity-10 -skew-x-12 translate-x-8" />
      )}
      <div className={cn(
        "flex-shrink-0 text-brand-orange flex items-center justify-center",
        isMedium ? "w-10 h-10 bg-on-surface/5 rounded-lg border-2 border-on-surface/10" : "text-brand-lime"
      )}>
        <IconComponent size={isMedium ? 20 : 16} strokeWidth={3} />
      </div>

      <div className="flex-grow min-w-0 flex flex-col items-start text-left">
        <div className="flex items-center gap-2">
          <p className={cn(
            "text-[8px] font-mono font-black uppercase tracking-[0.2em] leading-none opacity-40",
            !isMedium && "text-brand-lime opacity-100"
          )}>
            {reward.type}_UPDATE
          </p>
        </div>
        <h4 className={cn(
          "font-display uppercase tracking-tight truncate leading-none mt-1",
          isMedium ? "text-lg text-on-surface font-black italic" : "text-xs text-paper font-black italic",
          isBaja && !isMedium && "text-white"
        )}>
          {reward.title}
        </h4>
        {isMedium && reward.rewardText && (
          <p className="text-[10px] font-mono text-brand-orange font-black uppercase mt-1.5 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-brand-orange rounded-full animate-pulse" />
            + {reward.rewardText}
          </p>
        )}
      </div>

      <button 
        onClick={onDismiss}
        className={cn(
          "flex-shrink-0 opacity-40 hover:opacity-100 p-1",
          !isMedium && "text-paper"
        )}
      >
        <X size={isMedium ? 14 : 10} />
      </button>
    </motion.div>
  );
};
