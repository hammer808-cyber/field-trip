import React from 'react';
import { FieldTypeId, FIELD_TYPES } from '../constants';
import { PERSONAS } from '../data/personaQuiz';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { Zap, Shield, Target, Eye, Compass, Star, ShoppingBag, Sparkles } from 'lucide-react';

interface FieldTypeCardProps {
  type: FieldTypeId;
  compact?: boolean;
}

export const FieldTypeCard: React.FC<FieldTypeCardProps> = ({ type, compact = false }) => {
  const data = FIELD_TYPES[type];
  const persona = PERSONAS[type];

  if (!data) return null;

  const icons: Record<FieldTypeId, React.ReactNode> = {
    captainClipboard: <Target className="w-6 h-6" />,
    mallRat: <ShoppingBag className="w-6 h-6" />,
    mascota: <Sparkles className="w-6 h-6" />,
    elondra: <Star className="w-6 h-6" />,
    lostCamper: <Compass className="w-6 h-6" />,
    bigfoot: <Eye className="w-6 h-6" />
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3 bg-white border-2 border-on-surface p-3 group transition-all hover:bg-brand-lime/10 shadow-[4px_4px_0px_black] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none relative overflow-hidden">
        <div className="absolute top-0 right-0 w-16 h-16 bg-brand-cyan/5 -rotate-45 translate-x-8 -translate-y-8" />
        <div className="p-2 bg-on-surface text-brand-lime border-2 border-on-surface group-hover:scale-110 transition-transform shadow-[2px_2px_0px_var(--color-brand-orange)] relative z-10">
          {React.cloneElement(icons[type] as React.ReactElement<any>, { className: 'w-5 h-5 stroke-[3]' })}
        </div>
        <div className="text-left relative z-10">
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface leading-none truncate">{data.name}</p>
          <p className="text-[8px] opacity-40 uppercase tracking-tighter font-black mt-0.5 text-on-surface">{data.badgeLabel}</p>
        </div>
        <div className="absolute left-0 top-0 w-0.5 h-full bg-brand-lime" />
      </div>
    );
  }

  return (
    <div className="relative group overflow-hidden bg-white border-2 border-on-surface flex flex-col h-full shadow-[8px_8px_0px_black] hover:shadow-[12px_12px_0px_var(--color-brand-cyan)] transition-all duration-300">
      {/* Top Banner / Header */}
      <div className="bg-on-surface text-white p-6 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-lime/10 rotate-45 translate-x-16 -translate-y-16" />
        <div className="absolute top-0 right-0 p-2 opacity-20">
          <div className="grid grid-cols-2 gap-1">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="w-1 h-1 bg-white rounded-full" />
            ))}
          </div>
        </div>

        <div className="flex justify-between items-start relative z-10">
          <div className="space-y-1 text-left">
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-brand-lime text-on-surface px-2 py-0.5 font-black uppercase tracking-widest">ID_VERIFIED</span>
              <span className="text-[10px] text-white/50 font-mono">#{type.toUpperCase()}</span>
            </div>
            <h4 className="text-3xl md:text-4xl font-display font-black uppercase tracking-tighter leading-none pt-1">{data.name}</h4>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-cyan">{data.campRole}</p>
          </div>
          <div className="w-14 h-14 bg-brand-orange border-2 border-white flex items-center justify-center text-white shadow-[4px_4px_0px_var(--color-brand-magenta)] group-hover:rotate-12 transition-transform">
            {React.cloneElement(icons[type] as React.ReactElement<any>, { className: 'w-7 h-7 stroke-[3]' })}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6 space-y-6 flex-grow flex flex-col">
        {/* Description */}
        <div className="bg-paper-dark/30 p-4 border-l-4 border-brand-lime relative overflow-hidden">
          <div className="absolute top-0 right-0 p-1">
             <div className="w-8 h-8 rounded-full border border-on-surface/10 flex items-center justify-center">
                <span className="text-[10px] font-mono opacity-20">LVL_01</span>
             </div>
          </div>
          <p className="text-lg leading-tight font-serif font-medium text-on-surface/90">
            "{data.description}"
          </p>
        </div>

        {/* Stats / Identifiers Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border-2 border-on-surface p-3 space-y-1 shadow-[4px_4px_0px_var(--color-brand-lime)]">
            <span className="text-[9px] font-black uppercase opacity-40">Classification</span>
            <p className="text-xs font-black uppercase truncate text-on-surface">{data.badgeLabel}</p>
          </div>
          <div className="bg-white border-2 border-on-surface p-3 space-y-1 shadow-[4px_4px_0px_var(--color-brand-cyan)]">
            <span className="text-[9px] font-black uppercase opacity-40">Core_Instinct</span>
            <p className="text-xs font-black uppercase truncate text-on-surface">{data.coreInstinct}</p>
          </div>
        </div>

        {/* Perks & Blind Spots */}
        <div className="space-y-6 pt-4 border-t border-dashed border-on-surface/20">
          <div className="flex gap-4 items-start">
            <div className="flex-shrink-0 w-10 h-10 bg-brand-lime border-2 border-on-surface flex items-center justify-center shadow-[2px_2px_0px_black] mt-1">
              <Zap size={18} strokeWidth={3} className="text-on-surface" />
            </div>
            <div className="text-left space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black uppercase text-on-surface tracking-[0.2em] opacity-40">Perk</span>
                <div className="h-[1px] w-4 bg-on-surface/10" />
              </div>
              <p className="text-[11px] font-black uppercase text-on-surface italic">{data.perk}</p>
              <p className="text-[11px] font-medium leading-tight text-on-surface/80">{data.perkDesc}</p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <div className="flex-shrink-0 w-10 h-10 bg-white border-2 border-on-surface flex items-center justify-center shadow-[2px_2px_0px_var(--color-brand-orange)] mt-1">
              <Shield size={18} strokeWidth={3} className="text-brand-orange" />
            </div>
            <div className="text-left space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black uppercase text-brand-orange tracking-[0.2em] opacity-40">Blind Spot</span>
                <div className="h-[1px] w-4 bg-on-surface/10" />
              </div>
              <p className="text-[11px] font-black uppercase text-brand-orange italic">{data.blindSpot}</p>
              <p className="text-[11px] font-medium leading-tight text-on-surface/80">{data.blindSpotDesc}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Identity Footer */}
      {persona && (
        <div className="mt-auto bg-on-surface p-4 flex items-center justify-between border-t-2 border-on-surface">
           <p className="text-[10px] font-mono italic text-brand-lime uppercase truncate max-w-[70%]">"{persona.quote}"</p>
           <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-brand-cyan animate-pulse" />
              <span className="text-[8px] font-black text-white/40 uppercase tracking-tighter">SIGNAL_LIVE</span>
           </div>
        </div>
      )}
      
      {/* Decorative Shimmer Edge */}
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-brand-lime via-brand-cyan to-brand-magenta opacity-30" />
    </div>
  );
};

