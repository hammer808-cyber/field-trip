import React from 'react';
import { TripCard as TripCardType } from '../types/challenges';
import { cn } from '../lib/utils';
import { Zap, MapPin, Camera, FileText, ChevronRight, Sparkles } from 'lucide-react';
import { FieldBadge } from './UI';
import { getMissionImage } from '../utils/missionImages';

interface QuickMissionCardProps {
  mission: TripCardType;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
}

export const QuickMissionCard: React.FC<QuickMissionCardProps> = ({
  mission,
  isActive = false,
  onClick,
  className
}) => {
  const imageUrl = getMissionImage(mission.id, mission.category || mission.type, mission.image);

  return (
    <div
      id="quick-mission-card"
      data-onboarding="challenge-card"
      data-tour="drawn-card"
      onClick={onClick}
      className={cn(
        "w-full max-w-xs sm:max-w-sm sticker-card p-4 sm:p-6 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden relative group select-none hover:-translate-y-1 active:translate-y-1",
        isActive ? "ring-8 ring-brand-orange/5" : "",
        className
      )}
    >
      {/* Gloss Highlight for that "vinyl sticker" feel */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent pointer-events-none z-30" />
      <div className="absolute inset-y-0 left-[-100%] w-1/3 bg-white/20 skew-x-[-20deg] transition-all duration-700 pointer-events-none z-30 group-hover:left-[150%]" />

      {/* Tape/Sticker Header Accent */}
      <FieldBadge 
        variant="label" 
        color="white" 
        size="xs" 
        rotation={1} 
        className="absolute -top-1 left-1/4 right-1/4 z-20 h-5 sm:h-7 opacity-80"
      >
        SECURE_DEX_RECORD
      </FieldBadge>

      <div className="space-y-4 pt-4 flex-1 flex flex-col justify-between relative z-10">
        {/* Polaroid image slot */}
        <div className="aspect-[4/3] bg-on-surface/5 border-2 border-on-surface relative overflow-hidden shadow-[inset_2px_2px_8px_rgba(0,0,0,0.05),4px_4px_0px_rgba(0,0,0,0.05)] group rounded-xl">
          <div className="absolute inset-2 border border-on-surface/5 bg-white shadow-[1px_1px_4px_rgba(0,0,0,0.05)] overflow-hidden rounded-lg">
            <img 
              src={imageUrl} 
              alt={mission.title} 
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-out grayscale group-hover:grayscale-0"
              referrerPolicy="no-referrer"
            />
            {/* Subtle paper texture overlay on image */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/handmade-paper.png')] opacity-15 pointer-events-none mix-blend-overlay" />
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/20 pointer-events-none" />
          </div>

          <FieldBadge 
            variant="stamp" 
            color="lime" 
            size="xs" 
            rotation={-2} 
            className="absolute top-4 left-5 z-20"
          >
            {(mission.category || mission.type || 'SIGNAL').toUpperCase()}
          </FieldBadge>
          
          {isActive && (
            <FieldBadge 
              variant="glossy" 
              color="yellow" 
              size="xs" 
              rotation={2} 
              className="absolute bottom-4 right-5 z-20"
            >
              <div className="flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                STABILIZED
              </div>
            </FieldBadge>
          )}
        </div>

        {/* Mission Info card-style layout */}
        <div className="space-y-3 flex-grow flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-1 sm:gap-2">
              <h3 className="font-display text-xl sm:text-2xl font-black uppercase italic tracking-tighter text-on-surface leading-none sm:leading-[1.1] line-clamp-2 drop-shadow-sm">
                {mission.title}
              </h3>
            </div>
            <p className="text-[12px] opacity-75 font-serif font-bold italic leading-[1.3] sm:leading-[1.4] line-clamp-2 sm:line-clamp-3 mt-2">
              "{mission.description}"
            </p>
          </div>

          <div className="pt-4 border-t-2 border-dashed border-on-surface/10 space-y-3">
            {/* Proof icons - Badge Style */}
            <div className="flex items-center gap-3">
              <span className="text-[8px] font-mono font-black opacity-30 uppercase tracking-widest">REQUIREMENTS:</span>
              <div className="flex items-center gap-1.5">
                {(mission.proofType || []).map((type, idx) => (
                  <div key={idx} className="w-8 h-8 flex items-center justify-center bg-white border-2 border-on-surface shadow-[1.5px_1.5px_0px_black] rounded-full group-hover:scale-110 transition-transform" title={type}>
                    {type === 'photo' && <Camera className="w-4 h-4 text-on-surface" />}
                    {type === 'note' && <FileText className="w-4 h-4 text-on-surface" />}
                    {type === 'location' && <MapPin className="w-4 h-4 text-on-surface" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Rewards */}
            <div className="flex items-center justify-between pt-2">
              <FieldBadge 
                variant="stamp" 
                color="lime" 
                size="sm" 
                rotation={-1} 
                className="group-hover:rotate-0 transition-transform"
              >
                <div className="flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  +{mission.basePoints || mission.baseXP || 5} XP
                </div>
              </FieldBadge>
              
              <div className="text-[10px] font-mono font-black text-brand-orange uppercase flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                <span>OPEN_DEX</span>
                <ChevronRight className="w-4 h-4 stroke-[3]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
