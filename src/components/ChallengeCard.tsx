import React from 'react';
import { TripCard as TripCardType } from '../types/challenges';
import { cn } from '../lib/utils';
import { 
  Zap, 
  MapPin, 
  Users, 
  Eye, 
  CheckCircle2, 
  Lock, 
  Clock, 
  AlertTriangle,
  Sticker as StickerIcon,
  Search,
  Camera
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { Sticker } from './UI';

interface Props {
  challenge: TripCardType;
  onClick?: () => void;
  className?: string;
}

export function ChallengeCard({ challenge, onClick, className }: Props) {
  const { skin } = useTheme();
  
  const isBaja = skin.id === 'baja-bratz';
  const isDiamond = skin.id === 'slippery-diamond';
  const isHeat = skin.id === 'heatwave';

  const typeIcons: Record<string, any> = {
    'Leave the House': MapPin,
    'Social Spark': Users,
    'Explore the Map': Eye,
    'Taste Test': Search,
    'Proof Goblin': Camera,
    'Crew Chaos': Zap,
    'Onboarding': Search,
    'Bonus': Zap
  };

  const Icon = typeIcons[challenge.category || challenge.type] || Zap;

  const statusColors: Record<string, string> = {
    available: 'bg-on-surface text-brand-lime border-on-surface',
    'in-progress': 'bg-brand-orange text-white border-on-surface',
    submitted: 'bg-brand-cyan text-black border-on-surface',
    approved: 'bg-brand-lime text-black border-on-surface',
    rejected: 'bg-error text-white border-on-surface',
    locked: 'bg-on-surface/10 text-on-surface/40 border-on-surface/10',
    archived: 'bg-on-surface/5 text-on-surface/20 border-on-surface/5',
    active: 'bg-brand-magenta text-white border-on-surface'
  };

  const currentLane = challenge.lane || 'core';
  const displayXP = challenge.baseXP || challenge.basePoints || 100;

  return (
    <div 
      onClick={challenge.status !== 'locked' ? onClick : undefined}
      className={cn(
        "group relative flex flex-col transition-all cursor-pointer overflow-hidden",
        challenge.status === 'locked' && "cursor-not-allowed",
        isBaja ? "bg-white border-2 border-baja-pink rounded-xl shadow-md hover:shadow-lg" :
        isDiamond ? "bg-black/40 border border-white/20 hover:border-white shadow-xl" :
        isHeat ? "bg-white border-4 border-heat-pink rounded-[2rem] shadow-lg hover:-rotate-1" :
        "bg-white border-4 border-on-surface shadow-[12px_12px_0px_black] hover:shadow-[18px_18px_0px_var(--color-brand-cyan)] hover:-translate-y-2"
      )}
    >
      {/* HUD Scanline Overlay - Only for default */}
      {!isBaja && !isDiamond && !isHeat && (
        <div className="absolute inset-0 pointer-events-none opacity-[0.02] z-50 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px]" />
      )}

      {/* Dynamic Tab / Label */}
      <div className={cn(
        "absolute top-0 right-0 px-4 py-2 text-[10px] font-mono uppercase tracking-[0.3em] z-20 font-black italic",
        isBaja ? "bg-baja-aqua text-white rounded-bl-xl" :
        isDiamond ? "bg-white text-black" :
        isHeat ? "bg-heat-yellow text-heat-pink rounded-bl-2xl border-l-2 border-b-2 border-heat-pink" :
        "bg-on-surface text-brand-lime border-l-4 border-b-4 border-on-surface shadow-[-4px_4px_0_rgba(0,0,0,0.1)]"
      )}>
        {currentLane.toUpperCase()}_OPS_{challenge.id.slice(-4).toUpperCase()}
      </div>

      <div className="p-8 pt-14 space-y-6 flex flex-col h-full relative z-10">
        {/* Header */}
        <div className="flex justify-between items-start gap-6">
          <div className="space-y-2 flex-1 text-left">
            <div className="flex items-center gap-3 mb-2">
               <span className={cn(
                 "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 italic shadow-[2px_2px_0px_black] border border-on-surface",
                 !isBaja && !isDiamond && !isHeat ? "bg-brand-lime text-on-surface font-black" : "opacity-40"
               )}>MISSION_ID</span>
               <span className="text-[9px] font-mono opacity-40 font-bold tracking-widest">#{challenge.id.slice(0, 8)}</span>
            </div>
            <h3 className={cn(
              "font-display text-3xl md:text-4xl leading-none uppercase tracking-tighter font-black italic",
              challenge.status === 'locked' && "opacity-40",
              !isBaja && !isDiamond && !isHeat && "text-on-surface group-hover:text-brand-orange transition-colors"
            )}>
              {challenge.title}
            </h3>
            <p className="text-[12px] font-mono opacity-60 leading-tight uppercase line-clamp-2 font-black italic tracking-tight">
              {(challenge.description || challenge.theAsk || '').slice(0, 100)}
            </p>
          </div>
          <div className={cn(
            "p-4 border-4 shrink-0 shadow-[6px_6px_0px_black] transition-all group-hover:rotate-12 group-hover:scale-110",
            isBaja ? "bg-baja-pink/10 border-baja-pink text-baja-pink rounded-lg" :
            isDiamond ? "bg-white/10 border-white text-white" :
            isHeat ? "bg-heat-pink border-white text-white rounded-full" :
            "bg-white text-on-surface border-on-surface group-hover:bg-brand-lime"
          )}>
            <Icon className="w-8 h-8 stroke-[3]" />
          </div>
        </div>

        {/* Content Preview */}
        {challenge.status !== 'locked' ? (
          <div className="flex-1 space-y-6">
            <div className="flex flex-wrap gap-3">
              <Sticker color={isBaja ? "orange" : isHeat ? "mustard" : "lime"} className="text-sm py-2 px-4 font-black shadow-[4px_4px_0px_black] italic">
                {displayXP} XP
              </Sticker>
              {challenge.difficulty && (
                <div className={cn(
                  "px-4 py-2 text-[10px] font-black border-4 shadow-[4px_4px_0px_black] italic",
                  !isBaja && !isDiamond && !isHeat ? "bg-white border-on-surface" : "bg-white"
                )}>
                  LVL: {challenge.difficulty}/5
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-6 text-[11px] font-mono opacity-60 border-t-2 border-dashed border-on-surface/10 pt-6 font-black italic">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-brand-orange stroke-[3]" />
                {(challenge.mode || 'SOLO').toUpperCase()}
              </div>
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-brand-cyan stroke-[3]" />
                {(challenge.proofType || challenge.requiredProof || []).join(', ').toUpperCase()}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-10 space-y-4 opacity-10">
            <Lock className="w-16 h-16 stroke-[3]" />
            <p className="text-[11px] font-mono uppercase tracking-[0.4em] text-center font-black">
              Requires clearance<br/>[SYS_QUEUE_LOCKED]
            </p>
          </div>
        )}

        {/* Status indicator footer */}
        <div className="mt-auto pt-6 flex justify-between items-center border-t-2 border-on-surface/5">
          <div className={cn(
            "px-6 py-2 text-[10px] font-mono uppercase font-black border-4 shadow-[4px_4px_0px_black] italic",
            statusColors[challenge.status]
          )}>
            {challenge.status.replace('-', '_')}
          </div>
          {challenge.status === 'approved' && (
            <div className="text-on-surface flex items-center gap-3 font-display uppercase tracking-widest text-lg animate-bounce font-black italic">
              VERIFIED <CheckCircle2 className="w-5 h-5 text-brand-lime stroke-[4]" />
            </div>
          )}
        </div>
      </div>
      
      {/* Decorative Shimmer Edge */}
      {!isBaja && !isDiamond && !isHeat && (
        <div className="absolute top-0 left-0 w-1 h-full bg-brand-lime opacity-30" />
      )}
    </div>
  );
}
