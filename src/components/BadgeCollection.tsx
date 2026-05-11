import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BADGE_DEFINITIONS, UserBadgeProgress } from '../types/badges';
import { Card } from './UI';
import * as LucideIcons from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';
import { Lock, CheckCircle2, Sparkles } from 'lucide-react';

interface BadgeCollectionProps {
  progress: UserBadgeProgress[];
}

export const BadgeCollection: React.FC<BadgeCollectionProps> = ({ progress }) => {
  const { skin } = useTheme();
  
  const isBaja = skin === 'baja-bratz';
  const isDiamond = skin === 'slippery-diamond';
  const isHeat = skin === 'heatwave';

  const getBadgeProgress = (badgeId: string) => {
    return progress.find(p => p.badgeId === badgeId) || { fragmentCount: 0, isUnlocked: false };
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="micro-label opacity-40">BUREAU_COLLECTIBLES</p>
          <h2 className="font-display text-4xl uppercase tracking-tighter">Field Fragments</h2>
        </div>
        <div className="text-right">
          <p className="micro-label opacity-20">UNLOCKED</p>
          <p className="font-mono text-xl">{progress.filter(p => p.isUnlocked).length} / {BADGE_DEFINITIONS.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {BADGE_DEFINITIONS.map((badge, index) => {
          const userProg = getBadgeProgress(badge.id);
          const IconComponent = (LucideIcons as any)[badge.icon] || LucideIcons.Award;
          const status = userProg.isUnlocked ? 'unlocked' : userProg.fragmentCount > 0 ? 'progress' : 'locked';

          return (
            <motion.div
              key={badge.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.02 }}
              className="relative"
            >
              <Card className={cn(
                "p-5 flex gap-4 transition-all duration-500",
                status === 'unlocked' ? "border-brand-orange bg-on-surface/5" : "border-on-surface/10 opacity-70 grayscale",
                isBaja && status === 'unlocked' && "border-baja-pink bg-baja-pink/5 grayscale-0",
                isDiamond && status === 'unlocked' && "border-white/40 bg-white/5 backdrop-blur-xl grayscale-0",
                isHeat && status === 'unlocked' && "border-heat-pink bg-heat-yellow/10 grayscale-0"
              )}>
                {/* Badge Icon */}
                <div className={cn(
                  "w-16 h-16 rounded-3xl flex items-center justify-center shrink-0 relative",
                  status === 'unlocked' ? "bg-brand-orange text-white" : "bg-on-surface/10 text-on-surface/30",
                  isBaja && status === 'unlocked' && "bg-baja-pink",
                  isDiamond && status === 'unlocked' && "bg-white text-black",
                  isHeat && status === 'unlocked' && "bg-heat-pink"
                )}>
                  <IconComponent className="w-8 h-8" />
                  {status === 'unlocked' && (
                    <div className="absolute -top-1 -right-1">
                      <CheckCircle2 className="w-5 h-5 text-white bg-on-surface rounded-full p-0.5" />
                    </div>
                  )}
                  {status === 'locked' && (
                    <Lock className="w-4 h-4 absolute inset-0 m-auto opacity-40" />
                  )}
                </div>

                {/* Badge Info */}
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className={cn(
                        "micro-label uppercase opacity-40",
                        status === 'unlocked' && "opacity-100 text-brand-orange"
                      )}>
                        {badge.badgeCategory} // {badge.rarity}
                      </p>
                      <h3 className="font-display text-xl tracking-tight leading-none mt-1">{badge.title}</h3>
                    </div>
                  </div>

                  <p className="text-xs font-serif italic line-clamp-1 opacity-60">
                    "{badge.description}"
                  </p>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] uppercase font-mono">
                      <span>{badge.fragmentFlavor}</span>
                      <span className={cn(status === 'unlocked' && "text-brand-orange")}>
                        {userProg.fragmentCount} OF {badge.requiredFragments}
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="h-1 bg-on-surface/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(userProg.fragmentCount / badge.requiredFragments) * 100}%` }}
                        className={cn(
                          "h-full rounded-full",
                          status === 'unlocked' ? "bg-brand-orange" : "bg-on-surface/30",
                          isBaja && status === 'unlocked' && "bg-baja-pink",
                          isDiamond && status === 'unlocked' && "bg-white",
                          isHeat && status === 'unlocked' && "bg-heat-pink"
                        )}
                      />
                    </div>
                  </div>

                  {status === 'unlocked' && (
                    <div className="pt-2 flex items-center gap-2">
                      <Sparkles className="w-3 h-3 text-brand-orange" />
                      <p className="micro-label text-brand-orange">REWARD: {badge.unlockReward}</p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Unlock Animation Overlay */}
              {status === 'unlocked' && (
                 <motion.div 
                   className="absolute inset-0 pointer-events-none"
                   initial={{ opacity: 0 }}
                   animate={{ opacity: [0, 1, 0] }}
                   transition={{ duration: 2, repeat: Infinity, repeatDelay: 5 }}
                 >
                    <div className="absolute inset-0 border-2 border-brand-orange/40 rounded-[2.5rem] p-1 px-4 blur-[4px]" />
                 </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
