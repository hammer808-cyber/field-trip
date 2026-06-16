import React from 'react';
import { motion } from 'motion/react';
import { TripCard } from '../types/challenges';
import { FileText, Zap, Download, Sparkles, ShieldCheck, Trophy } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { getRewardMetadata } from '../data/rewardRegistry';
import { getFrankieTitle } from '../logic/frankieModeLogic';
import { Link } from 'react-router-dom';
import { getDisplayLabel } from '../utils/labelUtils';

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
  const totalXP = (scoring?.totalPoints || trip.baseXP || (trip as any).basePoints || 100) + ftBonus;

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
      className="w-full max-w-lg mx-auto field-card field-card--paper border-4 border-on-surface field-card-shadow-lg p-0 overflow-hidden relative font-sans"
    >
      {/* 1. Header with Title and Score */}
      <div className="bg-on-surface text-white p-6 sm:p-8 relative overflow-hidden">
        {/* Decorative Grid Line */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-brand-orange" />
        
        <div className="relative z-10 flex flex-col gap-4">
          <motion.div variants={itemVariants} className="flex items-center gap-2">
            <div className="w-2 h-2 bg-brand-lime shadow-[0_0_8px_var(--color-brand-lime)] rounded-full" />
            <p className="font-mono text-[9px] font-black uppercase tracking-[0.25em] text-brand-lime">
              {fc(getDisplayLabel('MISSION_SECURED'), 'MISSION SECURED')}
            </p>
          </motion.div>

          <div className="flex justify-between items-end gap-6">
            <motion.h2 variants={itemVariants} className="font-display text-4xl sm:text-5xl uppercase tracking-tighter leading-[0.85] font-black italic">
              {getFrankieTitle(trip, fPref)}
            </motion.h2>
            
            <motion.div variants={itemVariants} className="text-right shrink-0 flex flex-col items-end">
              <span className="text-[10px] font-mono font-black uppercase tracking-widest text-[#FFFDF8]/40 mb-1">Estimated XP</span>
              <div className="flex flex-col items-end relative">
                <span className="font-display text-5xl sm:text-6xl font-black text-brand-orange tracking-tighter leading-none italic">+{totalXP}</span>
                {tokenAwarded && (
                  <div className="absolute -bottom-4 right-0 bg-brand-lime text-on-surface px-2 py-0.5 border-2 border-on-surface shadow-[3px_3px_0px_black] rotate-[-4deg] z-20">
                    <p className="text-[9px] font-black uppercase tracking-tighter italic leading-none">{fc('+1 TOKEN', getDisplayLabel('NEW_TOKEN'))}</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
        
        {/* Background Noise/Texture */}
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/grid-me.png')]" />
      </div>

      <div className="p-5 sm:p-8 space-y-6 sm:space-y-10 relative">
        {/* 2. Visual Proof with Sticker Feel */}
        <motion.div variants={itemVariants} className="relative">
          <div className="aspect-[4/3] bg-[#EAE5D8] border-4 border-on-surface shadow-[10px_10px_0px_black] overflow-hidden rotate-[-1.5deg] transition-transform hover:rotate-0 duration-500 relative group">
            <img src={evidence.photo} alt="Mission Proof" className="w-full h-full object-contain grayscale-[0.3] brightness-110 contrast-[1.1]" />
            
            {/* Filter Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-80" />
            
            {/* Timestamp Strip */}
            <div className="absolute bottom-5 left-0 w-full bg-on-surface/85 backdrop-blur-md text-brand-lime px-4 py-2 font-mono text-[9px] uppercase tracking-widest italic font-black border-y border-white/5">
              {fc(`TIMESTAMP // ${new Date().toLocaleTimeString()} // VERIFIED`, `Verified at ${new Date().toLocaleTimeString()}`)}
            </div>

            {/* Gloss Highlight */}
            <div className="absolute top-0 right-0 w-32 h-full bg-white/5 skew-x-[-20deg] translate-x-24 group-hover:translate-x-[-120%] transition-transform duration-1000" />
          </div>

          {/* APPROVED Stamp */}
          <div className="absolute -top-6 -right-2 sm:-top-8 sm:-right-4 bg-brand-lime text-on-surface px-5 py-2 sm:px-8 sm:py-3 text-lg sm:text-2xl font-display font-black border-4 border-on-surface shadow-[6px_6px_0px_black] rotate-[10deg] z-30 italic leading-none">
            {fc(getDisplayLabel('AUTHORIZED'), getDisplayLabel('APPROVED'))}
          </div>
        </motion.div>

        {/* 3. Evidence Log & Stats */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {/* Field Note Scrap */}
          <div className="p-5 bg-[#FFFDF8] border-4 border-on-surface field-paper-shadow rotate-[0.5deg] relative overflow-hidden group">
             <div className="field-tape w-12 h-4 absolute -top-1 left-4 opacity-20 rotate-[-12deg]" />
             <div className="flex items-center gap-2 mb-3">
               <FileText className="w-4 h-4 text-brand-cyan" />
               <span className="font-display text-[10px] font-black uppercase tracking-wider text-brand-cyan italic">{fc(getDisplayLabel('LOG_ENTRY'), 'FIELD NOTE')}</span>
             </div>
             <p className="text-sm font-serif text-on-surface/80 leading-relaxed italic line-clamp-4">"{evidence.note}"</p>
             <div className="field-stamp absolute bottom-2 right-2 opacity-5 scale-75" />
          </div>

          {/* Verification Chips */}
          <div className="p-5 bg-on-surface text-white border-4 border-on-surface shadow-[6px_6px_0px_black] rotate-[-0.5deg] relative overflow-hidden">
             <div className="flex items-center gap-2 mb-4 text-brand-lime">
               <Zap className="w-4 h-4 fill-brand-lime" />
               <span className="font-display text-[10px] font-black uppercase tracking-wider italic">{fc(getDisplayLabel('UPLINK_DETAILS'), 'EVIDENCE')}</span>
             </div>
             <div className="space-y-2">
               {trip.proofType.map((type) => (
                 <div key={type} className="flex items-center gap-2 text-[10px] font-mono font-black uppercase tracking-widest text-white/50">
                   <div className="w-1.5 h-1.5 bg-brand-lime rounded-full shadow-[0_0_8px_var(--color-brand-lime)]" />
                   {type === 'note' ? 'Text Synthesis' : type === 'photo' ? 'Visual Signal' : type}
                 </div>
               ))}
               {ftBonus > 0 && (
                  <div className="flex items-center gap-2 text-[10px] font-mono font-black uppercase tracking-widest text-brand-orange animate-pulse">
                    <Sparkles className="w-3.5 h-3.5" />
                    {ftText.toUpperCase()}
                  </div>
               )}
             </div>
             
             {/* Background Scanline */}
             <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(transparent_0%,rgba(255,255,255,1)_50%,transparent_100%)] h-1 w-full animate-[shimmer_2s_infinite]" />
          </div>
        </motion.div>

        {/* 4. Reward Unlocked Sticker */}
        {newRewards && (newRewards.stickers.length > 0 || newRewards.badges.length > 0) && (
          <motion.div variants={itemVariants} className="p-6 bg-brand-purple/5 border-4 border-brand-purple shadow-[8px_8px_0px_black] rotate-[-1deg] relative overflow-hidden">
             <div className="flex items-center gap-2 text-brand-purple mb-5">
               <Sparkles className="w-4 h-4 animate-pulse" />
               <span className="font-display text-[11px] font-black uppercase tracking-widest leading-none">{fc(getDisplayLabel('SYNCHRONIZING_COLLECTION'), getDisplayLabel('NEW_REWARD_UNLOCKED'))}</span>
             </div>
             
             <div className="flex flex-wrap gap-4">
               {newRewards.stickers.map(s => {
                 const meta = getRewardMetadata(s);
                 return (
                   <div key={s} className="field-card field-card--sticker bg-white border-2 border-on-surface px-4 py-2 flex items-center gap-3 shadow-[3px_3px_0px_black] rotate-[-3deg] hover:rotate-0 transition-transform">
                      {meta.assetPath ? (
                        <img 
                          src={meta.assetPath} 
                          alt="" 
                          className="w-6 h-6 object-contain" 
                        />
                      ) : (
                        <div className="w-6 h-6 bg-brand-orange rounded-full shadow-inner" />
                      )}
                      <div className="flex flex-col">
                        <span className="text-[8px] font-mono font-black uppercase text-on-surface/40 leading-tight">ARTIFACT</span>
                        <span className="text-[11px] font-black uppercase italic tracking-tighter leading-none">{meta.label}</span>
                      </div>
                   </div>
                 );
               })}
               {newRewards.badges.map(b => {
                 const meta = getRewardMetadata(b);
                 return (
                   <div key={b} className="field-card field-card--sticker bg-brand-lime border-2 border-on-surface px-4 py-2 flex items-center gap-3 shadow-[3px_3px_0px_black] rotate-[3deg] hover:rotate-0 transition-transform">
                      {meta.assetPath ? (
                        <img 
                          src={meta.assetPath} 
                          alt="" 
                          className="w-6 h-6 object-contain" 
                        />
                      ) : (
                        <ShieldCheck className="w-6 h-6 text-on-surface" />
                      )}
                      <div className="flex flex-col">
                        <span className="text-[8px] font-mono font-black uppercase text-on-surface/40 leading-tight">BADGE</span>
                        <span className="text-[11px] font-black uppercase italic tracking-tighter leading-none">{meta.label}</span>
                      </div>
                   </div>
                 );
               })}
             </div>
             
             <div className="field-tape w-12 h-4 absolute top-0 left-10 opacity-20 -translate-y-2" />
          </motion.div>
        )}

        {/* 5. Math Wizard Breakdown */}
        {showMathWizard && scoring && (
          <motion.div 
            variants={itemVariants}
            className="bg-on-surface text-white p-6 rounded-[1.5rem] border-b-8 border-brand-orange relative font-mono overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <Zap className="w-16 h-16" />
            </div>
            
            <p className="text-[10px] font-black text-brand-orange uppercase tracking-[0.3em] mb-5">{fc(getDisplayLabel('SIGNAL_ANALYSIS'), 'PENDING ADMIN SCORE')}</p>
            <div className="space-y-2.5 text-[10px] uppercase font-bold">
              {scoring.scoreEvents?.map((ev: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center gap-4">
                  <span className="opacity-40 truncate">{ev.description.toUpperCase()}</span>
                  <span className="text-brand-lime shrink-0">+{ev.points}</span>
                </div>
              ))}
              {ftBonus > 0 && (
                <div className="flex justify-between items-center pt-2 border-t border-white/10 mt-2">
                  <span className="opacity-40">{ftText.toUpperCase()}</span>
                  <span className="text-brand-orange">+{ftBonus}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-4 border-t-2 border-brand-orange/40 text-[11px] font-black text-brand-orange mt-2">
                <span>PENDING_ESTIMATE</span>
                <span className="text-2xl italic tracking-tighter">{totalXP} XP</span>
              </div>
              <p className="pt-2 text-[9px] leading-relaxed text-white/45 normal-case">
                Final XP is awarded only after admin approval.
              </p>
            </div>
          </motion.div>
        )}

        {/* 6. Footer Actions */}
        <motion.div variants={itemVariants} className="pt-4 flex flex-col gap-4">
           <button 
             onClick={() => window.location.href = '/deck'}
             className="w-full py-6 bg-brand-lime text-on-surface border-4 border-on-surface rounded-2xl font-display text-2xl font-black uppercase italic tracking-widest shadow-[8px_8px_0px_black] active:translate-y-1 active:shadow-none transition-all hover:bg-on-surface hover:text-white"
           >
             RETURN TO MISSIONS
           </button>

           <Link 
             to="/collection"
             className="field-cta field-cta--paper py-4 text-sm flex items-center justify-center gap-3"
           >
             <Trophy className="w-5 h-5" />
             OPEN COLLECTION BOOK
           </Link>
           
           <button 
             disabled
             className="w-full py-4 border-4 border-on-surface/10 text-on-surface/30 font-black uppercase text-[10px] flex items-center justify-center gap-3 cursor-not-allowed group transition-all italic tracking-[0.25em] rounded-2xl"
           >
             <Download className="w-4 h-4 opacity-30 group-hover:animate-bounce" />
             PRINT_PHYSICAL_CARD
           </button>
           
           <div className="flex flex-col items-center gap-2 pt-4">
              <p className="text-[8px] text-center opacity-20 font-mono tracking-widest uppercase italic">{fc(`BUREAU_TX_REF: ${Math.random().toString(36).substring(7).toUpperCase()}`, `TX REF: ${Math.random().toString(36).substring(7).toUpperCase()}`)}</p>
              {totalTokens !== undefined && (
                <div className="flex items-center gap-4 px-6 opacity-30 h-px w-full max-w-[200px] bg-on-surface/20 self-center mt-2" />
              )}
              {totalTokens !== undefined && (
                <span className="text-[10px] font-display font-black uppercase tracking-widest italic text-on-surface/40 mt-1">Total Field Tokens: {totalTokens}</span>
              )}
           </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
