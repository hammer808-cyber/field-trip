import React from 'react';
import { motion } from 'motion/react';
import { TripCard } from '../types/challenges';
import { FileText, Zap, Download, Sparkles, ShieldCheck, Trophy } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { getRewardMetadata } from '../data/rewardRegistry';
import { getFrankieTitle } from '../logic/frankieModeLogic';
import { Link } from 'react-router-dom';

interface MissionResultCardProps {
  trip: TripCard;
  scoringData: {
    scoring?: any;
    ftBonus?: number;
    ftText?: string;
    tokenAwarded?: boolean;
    totalTokens?: number;
  };
  evidence: {
    photo: string;
    note: string;
  };
  showMathWizard: boolean;
  newRewards?: { stickers: string[]; badges: string[] };
}

export function MissionResultCard({ trip, scoringData, evidence, showMathWizard, newRewards }: MissionResultCardProps) {
  const { frankieMode, fc } = useTheme();
  const fPref = { frankieMode };
  const { scoring, ftBonus = 0, ftText = '', tokenAwarded, totalTokens } = scoringData;
  const totalXP = (scoring?.totalPoints || 0) + ftBonus;

  const containerVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full max-w-lg mx-auto bg-white border-2 sm:border-4 border-on-surface shadow-[8px_8px_0px_black] sm:shadow-[32px_32px_0px_black] overflow-hidden relative font-sans"
    >
      {/* HUD Elements */}
      <div className="absolute top-0 left-0 w-full h-1 bg-brand-orange" />
      <div className="p-4 sm:p-8 space-y-5 sm:space-y-8">
        
        {/* Header */}
        <motion.div variants={itemVariants} className="space-y-2 sm:space-y-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-brand-lime shadow-[0_0_8px_var(--color-brand-lime)]" />
            <p className="micro-label font-bold tracking-widest text-brand-lime italic text-[8px] sm:text-[10px]">{fc('MISSION_RESULT // SECURE', 'MISSION RESULT')}</p>
          </div>
          <div className="flex justify-between items-end gap-3">
            <h2 className="font-display text-2xl sm:text-4xl md:text-5xl uppercase tracking-tight leading-none font-bold italic">
              {getFrankieTitle(trip, fPref)}
            </h2>
            <div className="text-right shrink-0 space-y-1 sm:space-y-2">
              <div>
                <p className="text-[8px] sm:text-[10px] font-bold opacity-40 uppercase tracking-widest mb-0.5 sm:mb-1">{fc('XP Earned', 'POINTS')}</p>
                <p className="text-2xl sm:text-4xl md:text-5xl font-display font-black text-brand-orange tracking-tight leading-none">+{totalXP}</p>
              </div>
              {tokenAwarded && (
                <div className="bg-on-surface text-brand-lime px-1.5 py-0.5 border border-on-surface shadow-[2px_2px_0px_black] sm:shadow-[4px_4px_0px_black] rotate-[-2deg]">
                  <p className="text-[7.5px] sm:text-[8px] font-black uppercase tracking-tighter italic">{fc('+1 Token', 'NEW TOKEN')}</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Visual Proof */}
        <motion.div variants={itemVariants} className="relative group">
          <div className="aspect-[4/3] bg-paper-dark border-2 sm:border-4 border-on-surface shadow-[6px_6px_0px_var(--color-brand-magenta)] sm:shadow-[12px_12px_0px_var(--color-brand-magenta)] overflow-hidden rotate-[-1deg] transition-transform hover:rotate-0 duration-500">
            <img src={evidence.photo} alt="Mission Proof" className="w-full h-full object-cover grayscale brightness-110 contrast-125" />
            <div className="absolute bottom-0 left-0 w-full bg-on-surface/80 backdrop-blur-sm text-brand-lime p-2 sm:p-3 font-mono text-[8px] sm:text-[9px] uppercase tracking-widest italic font-bold">
              {fc(`SIGNAL_CAPTURED // ${new Date().toLocaleTimeString()}`, `Captured at ${new Date().toLocaleTimeString()}`)}
            </div>
          </div>
          {/* Approved Stamp Look */}
          <div className="absolute -top-3 -right-3 sm:-top-4 sm:-right-4 bg-brand-lime text-on-surface px-3 sm:px-6 py-1 sm:py-2 text-sm sm:text-xl font-display font-black border-2 sm:border-4 border-on-surface shadow-[4px_4px_0px_black] sm:shadow-[8px_8px_0px_black] rotate-[15deg] z-10 italic">
            {fc('MATCHED', 'APPROVED')}
          </div>
        </motion.div>

        {/* Evidence Highlights */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
          {/* Note Excerpt */}
          <div className="space-y-1.5 sm:space-y-3 p-3 sm:p-5 bg-paper-dark border border-on-surface relative">
             <div className="flex items-center gap-1.5 opacity-40">
               <FileText className="w-3 h-3" />
               <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest">{fc('Field Note Logged', 'Your Field Note')}</span>
             </div>
             <p className="text-xs sm:text-sm font-sans text-on-surface/85 leading-relaxed italic line-clamp-3">"{evidence.note}"</p>
          </div>

          {/* Verification Stats */}
          <div className="space-y-1.5 sm:space-y-3 p-3 sm:p-5 bg-brand-lime/5 border border-brand-lime/30 relative">
             <div className="flex items-center gap-1.5 text-brand-lime">
               <Zap className="w-3 h-3 text-brand-lime" />
               <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest">{fc('Evidence Secured', 'Evidence')}</span>
             </div>
             <ul className="space-y-1 font-mono">
               {trip.proofType.map((type) => (
                 <li key={type} className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-bold uppercase opacity-80">
                   <div className="w-1.5 h-1.5 bg-brand-lime rounded-full" />
                   {type === 'note' ? 'Field Note' : type === 'photo' ? 'Visual Proof' : type}
                 </li>
               ))}
               {ftBonus > 0 && (
                  <li className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-bold uppercase text-brand-orange">
                    <Sparkles className="w-3.5 h-3.5 text-brand-orange animate-pulse" />
                    Perk: {ftText}
                  </li>
               )}
             </ul>
          </div>
        </motion.div>

        {/* Rewards Unlocked */}
        {newRewards && (newRewards.stickers.length > 0 || newRewards.badges.length > 0) && (
          <motion.div variants={itemVariants} className="p-4 sm:p-6 bg-brand-magenta/10 border-2 sm:border-4 border-brand-magenta shadow-[6px_6px_0px_black] sm:shadow-[12px_12px_0px_black] rotate-[1deg]">
             <div className="flex items-center gap-1.5 text-brand-magenta mb-3 sm:mb-4">
               <Sparkles className="w-3.5 h-3.5 animate-pulse" />
               <span className="text-[8.5px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em]">{fc('Rewards Unlocked // Collection Update', 'New Rewards')}</span>
             </div>
             <div className="flex flex-wrap gap-4">
               {newRewards.stickers.map(s => {
                 const meta = getRewardMetadata(s);
                 return (
                   <div key={s} className="flex items-center gap-2 bg-on-surface text-white px-3 py-1 text-[10px] uppercase font-bold tracking-widest relative overflow-hidden">
                     {meta.assetPath && (
                        <img 
                          src={meta.assetPath} 
                          alt="" 
                          className="w-4 h-4 object-contain brightness-0 invert" 
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                        />
                     )}
                     {!meta.assetPath && <div className="w-2 h-2 bg-brand-lime" />}
                     Sticker: {meta.label}
                   </div>
                 );
               })}
               {newRewards.badges.map(b => {
                 const meta = getRewardMetadata(b);
                 return (
                   <div key={b} className="flex items-center gap-2 bg-brand-lime text-on-surface px-3 py-1 text-[10px] uppercase font-black tracking-widest border-2 border-on-surface">
                     {meta.assetPath ? (
                        <img 
                          src={meta.assetPath} 
                          alt="" 
                          className="w-4 h-4 object-contain" 
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                        />
                     ) : (
                       <ShieldCheck className="w-3 h-3" />
                     )}
                     Badge: {meta.label}
                   </div>
                 );
               })}
             </div>
             <p className="mt-4 text-[9px] opacity-60 font-bold uppercase tracking-widest">Added to your collection.</p>
          </motion.div>
        )}

        {/* Math Wizard Breakdown */}
        {showMathWizard && scoring && (
          <motion.div 
            variants={itemVariants}
            className="bg-on-surface text-white p-4 sm:p-6 border-b-4 sm:border-b-8 border-brand-orange relative font-mono italic"
          >
            <p className="text-[8px] sm:text-[9px] font-bold text-brand-orange uppercase tracking-[0.2em] sm:tracking-[0.3em] mb-3 sm:mb-4">{fc('Math Wizard Breakdown', 'Point Breakdown')}</p>
            <div className="space-y-1.5 sm:space-y-2 text-[9px] sm:text-[10px] uppercase">
              {scoring.scoreEvents?.map((ev: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center gap-2">
                  <span className="opacity-60 truncate">{ev.description}</span>
                  <span className="font-bold shrink-0">+{ev.points}</span>
                </div>
              ))}
              {ftBonus > 0 && (
                <div className="flex justify-between items-center pt-1 border-t border-white/10 mt-1">
                  <span className="opacity-60">{ftText}</span>
                  <span className="font-bold">+{ftBonus}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2.5 sm:pt-3 border-t-2 border-brand-orange/40 text-[10px] sm:text-xs font-black text-brand-orange">
                <span>Total Mission XP</span>
                <span className="text-lg sm:text-xl">{totalXP}</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Footer Actions */}
        <motion.div variants={itemVariants} className="pt-2 sm:pt-4 flex flex-col gap-3 sm:gap-4">
           <Link 
             to="/collection"
             className="w-full py-3 sm:py-4 bg-brand-lime text-on-surface font-black uppercase text-xs flex items-center justify-center gap-3 shadow-[4px_4px_0px_black] sm:shadow-[8px_8px_0px_black] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all italic tracking-widest border border-on-surface"
           >
             <Trophy className="w-4 h-4" />
             View Full Vault
           </Link>
           <button 
             disabled
             className="w-full py-3 sm:py-4 border border-on-surface/20 text-on-surface/40 font-bold uppercase text-[9px] sm:text-[10px] flex items-center justify-center gap-3 cursor-not-allowed group transition-all italic tracking-[0.2em]"
           >
             <Download className="w-3.5 h-3.5 opacity-40 group-hover:animate-bounce" />
             Save Result Card (Soon)
           </button>
           <p className="text-[7px] sm:text-[8px] text-center opacity-30 font-mono tracking-widest uppercase italic">{fc(`Bureau_Transaction_ID: ${Math.random().toString(36).substring(7).toUpperCase()}`, `Transaction ID: ${Math.random().toString(36).substring(7).toUpperCase()}`)}</p>
           {totalTokens !== undefined && (
             <div className="flex justify-center items-center gap-3 pt-2 sm:pt-4 opacity-40">
               <div className="h-px w-6 sm:w-8 bg-on-surface" />
               <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] italic font-display">Total Field Tokens: {totalTokens}</span>
               <div className="h-px w-6 sm:w-8 bg-on-surface" />
             </div>
           )}
        </motion.div>
      </div>
    </motion.div>
  );
}
