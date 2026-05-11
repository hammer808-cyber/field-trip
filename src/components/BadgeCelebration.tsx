import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { BADGE_DEFINITIONS, UserBadgeProgress } from '../types/badges';
import * as LucideIcons from 'lucide-react';
import { Sparkles, X, Award } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';

export const BadgeCelebration: React.FC = () => {
  const { badgeProgress, profile, markBadgeAsSeen } = useApp();
  const { skin } = useTheme();
  const [celebratingBadge, setCelebratingBadge] = useState<any>(null);

  // Check for new unlocks
  useEffect(() => {
    if (!profile) return;
    
    const unlocked = badgeProgress.filter(p => p.isUnlocked);
    const seenBadges = new Set(profile.seenBadges || []);

    const newUnlock = unlocked.find(p => !seenBadges.has(p.badgeId));
    if (newUnlock) {
      const badge = BADGE_DEFINITIONS.find(b => b.id === newUnlock.badgeId);
      if (badge) {
        setCelebratingBadge(badge);
        markBadgeAsSeen(badge.id);
      }
    }
  }, [badgeProgress, profile, markBadgeAsSeen]);

  const isBaja = skin === 'baja-bratz';
  const isDiamond = skin === 'slippery-diamond';
  const isHeat = skin === 'heatwave';

  if (!celebratingBadge) return null;

  const IconComponent = (LucideIcons as any)[celebratingBadge.icon] || Award;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 0.5, opacity: 0, scaleZ: 0 }}
          className={cn(
            "relative w-full max-w-sm p-10 text-center overflow-hidden",
            isBaja ? "bg-white border-8 border-baja-pink rounded-[4rem] shadow-[20px_20px_0px_#40e0d0]" :
            isDiamond ? "bg-white/10 border border-white/20 rounded-none backdrop-blur-2xl" :
            isHeat ? "bg-white border-8 border-heat-pink rounded-[4rem] shadow-[20px_20px_0px_rgba(255,140,0,0.4)]" :
            "bg-paper border-4 border-on-surface shadow-[16px_16px_0px_black]"
          )}
        >
          {/* Confetti-like elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ y: -20, x: 0, opacity: 1 }}
                animate={{ 
                  y: 400, 
                  x: (Math.random() - 0.5) * 200, 
                  rotate: 360,
                  opacity: 0 
                }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }}
                className={cn(
                  "absolute w-2 h-2",
                  isBaja ? "bg-baja-pink" : "bg-brand-orange"
                )}
                style={{ left: `${Math.random() * 100}%`, top: '-5%' }}
              />
            ))}
          </div>

          <div className="relative z-10 space-y-6">
            <div className="flex justify-center">
              <motion.div 
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
                className={cn(
                  "w-32 h-32 rounded-full flex items-center justify-center shadow-2xl",
                  isBaja ? "bg-baja-pink text-white" : 
                  isDiamond ? "bg-white text-black" :
                  isHeat ? "bg-heat-pink text-white" :
                  "bg-brand-orange text-white"
                )}
              >
                <IconComponent className="w-16 h-16" />
              </motion.div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-orange" />
                <p className="micro-label text-brand-orange tracking-[0.4em]">BUREAU_CLEARANCE_OBTAINED</p>
                <Sparkles className="w-4 h-4 text-brand-orange" />
              </div>
              <h2 className={cn(
                "font-display text-5xl uppercase tracking-tighter leading-none",
                isBaja ? "text-baja-pink" : isDiamond ? "text-white" : "text-on-surface"
              )}>
                {celebratingBadge.title}
              </h2>
              <p className="font-serif italic opacity-60">
                "{celebratingBadge.description}"
              </p>
            </div>

            <div className={cn(
              "p-4 rounded-2xl",
              isBaja ? "bg-baja-sand" : "bg-on-surface/5 border border-on-surface/10"
            )}>
              <p className="micro-label opacity-40 mb-1">REWARD_UNLOCKED</p>
              <p className="font-display text-xl uppercase text-brand-orange">{celebratingBadge.unlockReward}</p>
            </div>

            <button
              onClick={() => setCelebratingBadge(null)}
              className={cn(
                "w-full py-4 font-display font-bold uppercase tracking-widest transition-all active:scale-95",
                isBaja ? "bg-baja-pink text-white rounded-full shadow-[4px_4px_0px_#40e0d0]" :
                isDiamond ? "bg-white text-black rounded-none" :
                "bg-on-surface text-paper shadow-[8px_8px_0px_gray]"
              )}
            >
              Secure Evidence
            </button>
          </div>

          <button 
            onClick={() => setCelebratingBadge(null)}
            className="absolute top-6 right-6 opacity-40 hover:opacity-100 transition-opacity"
          >
            <X className="w-6 h-6" />
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
