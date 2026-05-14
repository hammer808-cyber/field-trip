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
  
  const isBaja = skin === 'baja-bratz';
  const isDiamond = skin === 'slippery-diamond';
  const isHeat = skin === 'heatwave';

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

  const Icon = typeIcons[challenge.type] || Zap;

  const statusColors: Record<string, string> = {
    available: 'bg-on-surface text-paper',
    'in-progress': 'bg-brand-orange text-white',
    submitted: 'bg-baja-aqua text-white',
    approved: 'bg-success text-white',
    rejected: 'bg-error text-white',
    locked: 'bg-on-surface/10 text-on-surface/40',
    archived: 'bg-on-surface/5 text-on-surface/20'
  };

  return (
    <div 
      onClick={challenge.status !== 'locked' ? onClick : undefined}
      className={cn(
        "group relative flex flex-col transition-all cursor-pointer",
        challenge.status === 'locked' && "cursor-not-allowed",
        isBaja ? "bg-white border-2 border-baja-pink rounded-xl shadow-md hover:shadow-lg" :
        isDiamond ? "bg-black/40 border border-white/20 hover:border-white shadow-xl" :
        isHeat ? "bg-white border-4 border-heat-pink rounded-[2rem] shadow-lg hover:-rotate-1" :
        "bg-paper border-4 border-on-surface shadow-[8px_8px_0px_black] active:translate-x-1 active:translate-y-1 active:shadow-none",
        className
      )}
    >
      {/* Dynamic Tab */}
      <div className={cn(
        "absolute -top-3 left-6 px-4 py-1 text-[8px] font-mono uppercase tracking-widest z-10",
        isBaja ? "bg-baja-aqua text-white rounded-full" :
        isDiamond ? "bg-white text-black" :
        isHeat ? "bg-heat-yellow text-heat-pink rounded-full border-2 border-heat-pink" :
        "bg-on-surface text-paper"
      )}>
        {challenge.type.replace(/\s/g, '_').toUpperCase()}_OPS_{challenge.id.slice(-4).toUpperCase()}
      </div>

      <div className="p-6 pt-10 space-y-4 flex flex-col h-full">
        {/* Header */}
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-1 flex-1">
            <h3 className={cn(
              "font-display text-2xl leading-none uppercase tracking-tighter",
              challenge.status === 'locked' && "opacity-40"
            )}>
              {challenge.title}
            </h3>
            <p className="text-[10px] font-mono opacity-60 leading-tight uppercase">
              {challenge.theAsk.slice(0, 60)}...
            </p>
          </div>
          <div className={cn(
            "p-2 border-2",
            isBaja ? "bg-baja-pink/10 border-baja-pink text-baja-pink rounded-lg" :
            isDiamond ? "bg-white/10 border-white text-white" :
            isHeat ? "bg-heat-pink border-white text-white rounded-full" :
            "bg-on-surface text-paper border-on-surface"
          )}>
            <Icon className="w-5 h-5" />
          </div>
        </div>

        {/* Content Preview */}
        {challenge.status !== 'locked' ? (
          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap gap-2">
              <Sticker color={isBaja ? "orange" : isHeat ? "mustard" : "white"} className="text-[8px] py-1">
                VALUE: 10-35 XP
              </Sticker>
              <Sticker color="white" className="text-[8px] py-1">
                DIFF: {challenge.levels.Legend.points}XP LEGEND
              </Sticker>
            </div>
            
            <div className="flex items-center gap-4 text-[10px] font-mono opacity-50 border-t border-dashed border-on-surface/10 pt-4">
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {challenge.mode.toUpperCase()}
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {challenge.requiredProof.join(', ').toUpperCase()}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-8 space-y-2 opacity-20">
            <Lock className="w-12 h-12" />
            <p className="text-[8px] font-mono uppercase tracking-widest text-center">
              Requires clearance<br/>[Operation Unlocks at Season Start]
            </p>
          </div>
        )}

        {/* Status indicator footer */}
        <div className="mt-auto pt-4 flex justify-between items-center">
          <div className={cn(
            "px-3 py-1 text-[8px] font-mono uppercase font-black",
            statusColors[challenge.status]
          )}>
            {challenge.status.replace('-', '_')}
          </div>
          {challenge.status === 'approved' && (
            <div className="text-success flex items-center gap-1 font-display uppercase tracking-widest text-xs animate-bounce">
              RECOGNIZED <CheckCircle2 className="w-3 h-3" />
            </div>
          )}
        </div>
      </div>
      
      {/* Stylized Paper Edge for the default look */}
      {!isBaja && !isDiamond && !isHeat && (
        <div className="absolute -bottom-1 -right-1 w-full h-full bg-on-surface -z-10" />
      )}
    </div>
  );
}
