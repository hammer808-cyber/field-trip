import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { RewardIntensity, RewardQueueItem } from '../types/feedback';
import * as LucideIcons from 'lucide-react';
import { Sparkles, X, Award, Info, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';

export const RewardFeedback: React.FC = () => {
  const { rewardQueue, dismissReward } = useApp();
  const { skin } = useTheme();

  const isBaja = skin.id === 'baja-bratz';
  const isDiamond = skin.id === 'slippery-diamond';
  const isHeat = skin.id === 'heatwave';

  // Process ONLY one major reveal at a time
  const majorReward = rewardQueue.find(r => r.intensity === RewardIntensity.MAJOR_REVEAL);
  // Process multiple medium/micro rewards as toasts
  const toasts = rewardQueue.filter(r => r.intensity !== RewardIntensity.MAJOR_REVEAL);

  return (
    <>
      {/* 1. MAJOR REVEAL MODAL */}
      <AnimatePresence>
        {majorReward && (
          <MajorReveal 
            reward={majorReward} 
            onDismiss={() => dismissReward(majorReward.id)}
            skinConfig={{ isBaja, isDiamond, isHeat }}
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
}

const MajorReveal: React.FC<MajorRevealProps> = ({ reward, onDismiss, skinConfig }) => {
  const { isBaja, isDiamond, isHeat } = skinConfig;
  const IconComponent = (LucideIcons as any)[reward.iconName || 'Award'] || Award;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0, y: -20 }}
        className={cn(
          "relative w-full max-w-sm p-8 text-center overflow-hidden",
          isBaja ? "bg-white border-8 border-baja-pink rounded-[4rem] shadow-[20px_20px_0px_#40e0d0]" :
          isDiamond ? "bg-white/10 border border-white/20 rounded-none backdrop-blur-2xl" :
          isHeat ? "bg-white border-8 border-heat-pink rounded-[4rem] shadow-[20px_20px_0px_rgba(255,140,0,0.4)]" :
          "bg-paper border-4 border-on-surface shadow-[16px_16px_0px_black]"
        )}
      >
        <div className="relative z-10 space-y-6">
          <div className="flex justify-center">
            <motion.div 
              animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className={cn(
                "w-24 h-24 rounded-full flex items-center justify-center shadow-2xl",
                isBaja ? "bg-baja-pink text-white" : 
                isDiamond ? "bg-white text-black" :
                isHeat ? "bg-heat-pink text-white" :
                "bg-brand-orange text-white"
              )}
            >
              <IconComponent className="w-12 h-12" />
            </motion.div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="w-3 h-3 text-brand-orange" />
              <p className="text-[9px] font-black uppercase tracking-[0.4em] text-brand-orange">BUREAU_CLEARANCE_OBTAINED</p>
              <Sparkles className="w-3 h-3 text-brand-orange" />
            </div>
            <h2 className={cn(
              "font-display text-xl uppercase tracking-tighter leading-tight",
              isBaja ? "text-baja-pink" : isDiamond ? "text-white" : "text-on-surface"
            )}>
              {reward.title}
            </h2>
            {reward.description && (
              <p className="text-xs font-serif italic opacity-60 px-4">
                "{reward.description}"
              </p>
            )}
          </div>

          {reward.rewardText && (
            <div className={cn(
              "p-3 rounded-xl",
              isBaja ? "bg-baja-sand" : "bg-on-surface/5 border border-on-surface/10"
            )}>
              <p className="text-[8px] font-black uppercase opacity-40 mb-0.5 tracking-widest">REWARD_DECODER_SYNCED</p>
              <p className="font-display text-lg uppercase text-brand-orange">{reward.rewardText}</p>
            </div>
          )}

          <button
            onClick={onDismiss}
            className={cn(
              "w-full py-4 font-display font-bold uppercase tracking-widest transition-all active:scale-95 text-xs",
              isBaja ? "bg-baja-pink text-white rounded-full shadow-[4px_4px_0px_#40e0d0]" :
              isDiamond ? "bg-white text-black rounded-none" :
              "bg-on-surface text-paper shadow-[8px_8px_0px_gray]"
            )}
          >
            Acknowledge Receipt
          </button>
        </div>

        <button 
          onClick={onDismiss}
          className="absolute top-4 right-4 opacity-40 hover:opacity-100 transition-opacity"
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
}

const RewardToast: React.FC<RewardToastProps> = ({ reward, onDismiss, skinConfig }) => {
  const { isBaja, isDiamond, isHeat } = skinConfig;
  const isMedium = reward.intensity === RewardIntensity.MEDIUM_REWARD;
  const IconComponent = (LucideIcons as any)[reward.iconName || (isMedium ? 'Award' : 'CheckCircle2')] || (isMedium ? Award : CheckCircle2);

  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, isMedium ? 4000 : 2500);
    return () => clearTimeout(timer);
  }, [onDismiss, isMedium]);

  return (
    <motion.div
      layout
      initial={{ x: 100, opacity: 0, scale: 0.9 }}
      animate={{ x: 0, opacity: 1, scale: 1 }}
      exit={{ x: 20, opacity: 0, scale: 0.9 }}
      className={cn(
        "pointer-events-auto flex items-center gap-4",
        isMedium 
          ? "p-4 bg-paper border-2 border-on-surface shadow-[8px_8px_0px_rgba(0,0,0,0.2)]" 
          : "p-2 px-3 bg-on-surface text-paper border border-on-surface shadow-lg",
        isBaja && (isMedium ? "bg-white border-baja-pink rounded-2xl" : "bg-baja-pink rounded-full"),
        isDiamond && (isMedium ? "bg-white/10 border-white/20 backdrop-blur-xl" : "bg-white/20 backdrop-blur-lg"),
        isHeat && (isMedium ? "bg-white border-heat-pink rounded-2xl shadow-[8px_8px_0px_rgba(255,140,0,0.2)]" : "bg-heat-pink rounded-full")
      )}
    >
      <div className={cn(
        "flex-shrink-0 text-brand-orange",
        !isMedium && "text-brand-orange"
      )}>
        <IconComponent size={isMedium ? 18 : 14} />
      </div>

      <div className="flex-grow min-w-0">
        <div className="flex items-center gap-2">
          <p className={cn(
            "text-[8px] font-black uppercase tracking-widest leading-none opacity-40",
            !isMedium && "text-paper/60"
          )}>
            {reward.type}_UPDATE
          </p>
        </div>
        <h4 className={cn(
          "font-display uppercase tracking-tight truncate leading-tight",
          isMedium ? "text-sm text-on-surface" : "text-[10px] text-paper",
          isBaja && !isMedium && "text-white"
        )}>
          {reward.title}
        </h4>
        {isMedium && reward.rewardText && (
          <p className="text-[10px] font-mono text-brand-orange font-bold uppercase mt-0.5">
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
