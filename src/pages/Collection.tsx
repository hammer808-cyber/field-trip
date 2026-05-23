import React from 'react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { getRewardsByType, getRewardMetadata, RewardMetadata } from '../data/rewardRegistry';
import { ShieldCheck, Lock, ChevronLeft, Sparkles, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

export default function CollectionPage() {
  const { profile } = useApp();
  const navigate = useNavigate();

  const stickers = getRewardsByType('sticker');
  const badges = getRewardsByType('badge');

  const unlockedStickers = new Set(profile?.unlockedRewards?.stickers || []);
  const unlockedBadges = new Set(profile?.unlockedRewards?.badges || []);

  const RewardItem = ({ reward, isUnlocked }: { reward: RewardMetadata; isUnlocked: boolean }) => {
    return (
      <motion.div 
        whileHover={isUnlocked ? { y: -4, scale: 1.02 } : {}}
        className={cn(
          "relative p-4 border-2 transition-all duration-300 overflow-hidden group min-h-[140px] flex flex-col justify-between",
          isUnlocked 
            ? "bg-white border-on-surface shadow-[4px_4px_0px_black] hover:shadow-[8px_8px_0px_black]" 
            : "bg-on-surface/5 border-on-surface/10 opacity-40 grayscale cursor-not-allowed"
        )}
      >
        <div className="flex flex-col gap-3 relative z-10">
          <div className="flex justify-between items-start">
            {reward.assetPath ? (
              <div className="w-12 h-12 relative overflow-hidden">
                <img 
                  src={reward.assetPath} 
                  alt={reward.label} 
                  className={cn("w-full h-full object-contain", !isUnlocked && "opacity-20")} 
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              </div>
            ) : (
              <>
                {reward.type === 'badge' ? (
                  <ShieldCheck className={cn("w-6 h-6", isUnlocked ? "text-brand-lime" : "text-on-surface/20")} />
                ) : (
                  <div className={cn("w-3 h-3 rotate-45", isUnlocked ? "bg-brand-magenta" : "bg-on-surface/20")} />
                )}
              </>
            )}
            {!isUnlocked && <Lock className="w-3 h-3 opacity-20" />}
          </div>
          
          <div className="space-y-1">
            <p className={cn(
              "text-[10px] font-black uppercase tracking-widest leading-none",
              isUnlocked ? "text-on-surface" : "text-on-surface/40"
            )}>
              {reward.label}
            </p>
            <p className={cn(
              "text-[8px] font-bold uppercase tracking-[0.2em]",
              isUnlocked ? "opacity-30" : "opacity-10"
            )}>
              {reward.rarity || 'common'}
            </p>
          </div>

          <p className="text-[9px] font-serif italic leading-tight line-clamp-2 opacity-60">
            {isUnlocked ? reward.description : "Locked. Complete specific missions to uncover this reward."}
          </p>
        </div>

        {/* Decorative corner for stickers */}
        {reward.type === 'sticker' && isUnlocked && !reward.assetPath && (
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-brand-magenta rotate-45 translate-x-2 translate-y-2" />
        )}
        
        {/* Background texture watermark if image is present */}
        {reward.assetPath && (
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none flex items-center justify-center p-4">
            <img src={reward.assetPath} alt="" className="w-full h-full object-contain rotate-12" />
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-paper pb-20">
      {/* Header */}
      <header className="bg-on-surface pt-16 pb-8 px-6 text-white sticky top-0 z-50 shadow-xl">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/profile')}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div className="space-y-1">
              <h1 className="font-display text-5xl font-black italic uppercase tracking-tighter leading-none">The Vault</h1>
              <p className="micro-label font-bold text-brand-lime uppercase tracking-widest opacity-60">Reward_Collection // Archive</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase opacity-40 mb-1 tracking-widest">Completion</p>
            <p className="text-3xl font-display font-black italic tracking-tight">
              {unlockedStickers.size + unlockedBadges.size}<span className="opacity-20">/</span>{stickers.length + badges.length}
            </p>
          </div>
        </div>
      </header>

      <main className="p-6 space-y-16 max-w-4xl mx-auto pt-12">
        
        {/* Stickers Section */}
        <section className="space-y-8">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-brand-magenta flex items-center justify-center rotate-3">
               <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h2 className="font-display text-3xl font-black uppercase italic tracking-tight">Field Stickers</h2>
            <div className="h-1 flex-grow bg-brand-magenta/10" />
            <p className="text-[10px] font-mono opacity-40 font-bold uppercase">{unlockedStickers.size} EARNED</p>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {stickers.map(reward => (
              <RewardItem 
                key={reward.id} 
                reward={reward} 
                isUnlocked={unlockedStickers.has(reward.id)} 
              />
            ))}
          </div>
        </section>

        {/* Badges Section */}
        <section className="space-y-8">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-brand-lime flex items-center justify-center -rotate-3 border-2 border-on-surface">
               <ShieldCheck className="w-4 h-4 text-on-surface" />
            </div>
            <h2 className="font-display text-3xl font-black uppercase italic tracking-tight">Mission Badges</h2>
            <div className="h-1 flex-grow bg-brand-lime/20" />
            <p className="text-[10px] font-mono opacity-40 font-bold uppercase">{unlockedBadges.size} EARNED</p>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {badges.map(reward => (
              <RewardItem 
                key={reward.id} 
                reward={reward} 
                isUnlocked={unlockedBadges.has(reward.id)} 
              />
            ))}
          </div>
        </section>

        {/* Legend */}
        <footer className="pt-20 border-t-2 border-on-surface/5 flex flex-col items-center gap-6 text-center italic">
           <Zap className="w-8 h-8 text-brand-orange animate-pulse" />
           <div className="space-y-2">
             <p className="font-serif text-lg opacity-60">Unlock more by documenting anomalies in the field.</p>
             <p className="micro-label font-bold uppercase tracking-[0.3em] opacity-30">Field Trip Protocol // Beta_v4.5</p>
           </div>
        </footer>
      </main>
    </div>
  );
}
