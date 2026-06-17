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
      <div className="absolute -top-1 left-1/4 right-1/4 z-20 flex justify-center">
        <FieldBadge 
          variant="label" 
          color="white" 
          size="xs" 
          rotation={1} 
          className="h-5 sm:h-7 opacity-90 border-2 border-on-surface shadow-sm"
        >
          {mission.id.slice(0, 8)}_RECORD
        </FieldBadge>
      </div>

      <div className="space-y-3 pt-3 flex-1 flex flex-col justify-between relative z-10">
        {/* Polaroid image slot - Compacted */}
        <div className="aspect-[16/10] bg-on-surface/5 border-2 border-on-surface relative overflow-hidden shadow-[inset_2px_2px_8px_rgba(0,0,0,0.05),2px_2px_0px_black] group rounded-xl">
          <div className="absolute inset-1.5 border border-on-surface/5 bg-white shadow-[1px_1px_4px_rgba(0,0,0,0.05)] overflow-hidden rounded-lg">
            <img 
              src={imageUrl} 
              alt={mission.title} 
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-out grayscale group-hover:grayscale-0"
              referrerPolicy="no-referrer"
            />
            {/* Subtle paper texture overlay on image */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/handmade-paper.png')] opacity-15 pointer-events-none mix-blend-overlay" />
          </div>

          {/* Compact Badges */}
          <div className="absolute top-2 left-3 flex flex-col gap-1 z-20">
            <FieldBadge 
              variant="stamp" 
              color="lime" 
              size="xs" 
              rotation={-1} 
              className="px-1.5"
            >
              {(mission.category || mission.type || 'SIGNAL').toUpperCase()}
            </FieldBadge>
            {isActive && (
              <FieldBadge 
                variant="glossy" 
                color="yellow" 
                size="xs" 
                rotation={1} 
                className="px-1.5"
              >
                STABILIZED
              </FieldBadge>
            )}
          </div>
        </div>

        {/* Mission Info card-style layout - Clean hierarchy */}
        <div className="space-y-2 flex-grow flex flex-col justify-between">
          <div>
            <h3 className="font-display text-lg sm:text-xl font-black uppercase italic tracking-tighter text-on-surface leading-[0.9] sm:leading-[0.9] line-clamp-2 drop-shadow-sm">
              {mission.title}
            </h3>
            <p className="text-[10px] opacity-75 font-serif font-bold italic leading-tight line-clamp-2 mt-1.5">
              "{mission.description}"
            </p>
          </div>

          <div className="pt-3 border-t-2 border-dashed border-on-surface/10 flex items-center justify-between">
            {/* Requirements icons summary */}
            <div className="flex flex-col gap-1">
              <span className="text-[7px] font-mono font-black opacity-30 uppercase tracking-widest whitespace-nowrap">MISSION_REQ:</span>
              <div className="flex items-center gap-1">
                {(mission.proofType || []).slice(0, 3).map((type, idx) => (
                  <div 
                    key={idx} 
                    className="w-6 h-6 flex items-center justify-center bg-white border border-on-surface shadow-[1px_1px_0px_black] rounded-full group-hover:rotate-6 transition-transform"
                    title={type}
                  >
                    {type === 'photo' && <Camera className="w-3 h-3 text-on-surface" />}
                    {type === 'note' && <FileText className="w-3 h-3 text-on-surface" />}
                    {type === 'location' && <MapPin className="w-3 h-3 text-on-surface" />}
                  </div>
                ))}
              </div>
            </div>

            {/* XP Award - Compact Sticker Style */}
            <div className="bg-[#B7FF00] text-on-surface p-1.5 px-3 border-2 border-on-surface shadow-[3px_3px_0px_black] rotate-[-2deg] group-hover:rotate-0 transition-transform">
               <div className="flex items-center gap-1 font-display text-[10px] font-black uppercase tracking-tight">
                 <Zap className="w-2.5 h-2.5 fill-current" />
                 <span>+{mission.baseXP || 100}XP</span>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
