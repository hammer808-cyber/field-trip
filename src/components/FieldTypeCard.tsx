import React from 'react';
import { FieldTypeId, FIELD_TYPES } from '../constants';
import { PERSONAS } from '../data/personaQuiz';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { Zap, Shield, Target, Eye, Compass, Crown, ShoppingBag } from 'lucide-react';

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
    homecomingQueen: <Crown className="w-6 h-6" />,
    lostCamper: <Compass className="w-6 h-6" />,
    bigfoot: <Eye className="w-6 h-6" />
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3 bg-neutral-900 border border-white/10 p-3 rounded-sm group transition-all hover:bg-neutral-800">
        <div className="p-2 bg-brand-orange/10 text-brand-orange rounded-sm group-hover:scale-110 transition-transform">
          {icons[type]}
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-white">{data.name}</p>
          <p className="text-[8px] opacity-40 uppercase tracking-tighter italic">{data.shortTitle}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative group overflow-hidden bg-black border border-white/10 p-6 space-y-6">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-brand-orange/10 blur-3xl -z-10 group-hover:opacity-100 opacity-50 transition-opacity" />
      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-500/10 blur-3xl -z-10 group-hover:opacity-100 opacity-50 transition-opacity" />

      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <span className="micro-label text-brand-orange">FIELD_CLASSIFICATION_LOCKED</span>
          <h4 className="text-3xl font-black italic uppercase tracking-tighter text-white">{data.name}</h4>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-40">{data.shortTitle}</p>
        </div>
        <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-sm flex items-center justify-center text-brand-orange">
          {icons[type]}
        </div>
      </div>

      {/* Description */}
      <p className="text-sm opacity-80 leading-relaxed italic font-bold">
        "{data.description}"
      </p>

      {/* Perks / Snags */}
      <div className="grid grid-cols-1 gap-4 pt-4 border-t border-white/5">
        <div className="flex gap-4 items-start">
          <div className="p-2 bg-green-500/10 text-green-400 rounded-sm mt-1">
            <Zap size={14} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-green-400">Persona_Perk: {data.perk}</p>
            <p className="text-[8px] opacity-60 uppercase">{data.perkDesc}</p>
          </div>
        </div>
        <div className="flex gap-4 items-start opacity-60">
          <div className="p-2 bg-red-500/10 text-red-400 rounded-sm mt-1">
            <Shield size={14} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-red-100">Persona_Snag: {data.snag}</p>
            <p className="text-[8px] opacity-60 uppercase">{data.snagDesc}</p>
          </div>
        </div>
      </div>

      {/* Quote Banner */}
      {persona && (
        <div className="bg-white/5 p-3 rounded-sm border-l-2 border-brand-orange italic shadow-inner">
           <p className="text-[10px] opacity-60">"{persona.quote}"</p>
        </div>
      )}
    </div>
  );
};

