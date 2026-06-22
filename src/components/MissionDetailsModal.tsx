import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TripCard as TripCardType } from '../types/challenges';
import { cn } from '../lib/utils';
import { 
  X, Compass, MapPin, Camera, FileText, 
  Zap, AlertTriangle, Play, RefreshCw, HelpCircle, Sparkles 
} from 'lucide-react';
import { getMissionImage } from '../utils/missionImages';

interface MissionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  mission: TripCardType | null;
  progress?: any;
  onStart: () => void;
  onRedraw?: () => void;
  onHint?: () => void;
  isHintUsed?: boolean;
  isRedrawable?: boolean;
  isSubmitted?: boolean;
  isApproved?: boolean;
  statusLabel?: string;
}

export const MissionDetailsModal: React.FC<MissionDetailsModalProps> = ({
  isOpen,
  onClose,
  mission,
  progress = {},
  onStart,
  onRedraw,
  onHint,
  isHintUsed = false,
  isRedrawable = false,
  isSubmitted = false,
  isApproved = false,
  statusLabel = "MISSION_DETAILS"
}) => {
  if (!mission) return null;

  const isUnavailable = isSubmitted || isApproved;
  const imageUrl = getMissionImage(mission.id, mission.category || mission.type, mission.image);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-on-surface/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="bg-white border-8 border-on-surface shadow-[16px_16px_0px_black] max-w-lg w-full flex flex-col relative z-10 max-h-[90vh] overflow-hidden"
          >
            {/* Top Security Line Banner */}
            <div className={cn(
              "text-white p-2 px-4 flex items-center justify-between border-b-4 border-on-surface",
              isApproved ? "bg-brand-lime text-on-surface" : isSubmitted ? "bg-brand-orange" : "bg-on-surface text-brand-lime"
            )}>
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 animate-spin-slow" />
                <span className="font-mono text-[9px] font-black uppercase tracking-[0.2em]">
                  {isApproved ? 'MISSION_ARCHIVED_SUCCESS' : isSubmitted ? 'MISSION_UPLINK_PENDING' : statusLabel}
                </span>
              </div>
              <button 
                onClick={onClose}
                className="hover:opacity-60 transition-opacity"
                aria-label="Close details"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            {/* Content Body */}
            <div className="overflow-y-auto p-4 sm:p-5 flex-1 space-y-5 custom-scrollbar">
              {/* Mission Polaroid Image - Compacted */}
              <div className="aspect-[18/10] bg-on-surface/5 border-2 border-on-surface relative overflow-hidden shadow-[2px_2px_0px_black] rounded-xl mx-auto">
                <img 
                  src={imageUrl} 
                  alt={mission.title} 
                  className={cn("w-full h-full object-cover", isUnavailable && "grayscale contrast-125 brightness-110")}
                  referrerPolicy="no-referrer"
                />
                {/* Sticker Badges Overlay */}
                <div className="absolute top-2 left-2 flex gap-1">
                  <div className="bg-[#FF5A00] text-white px-2 py-0.5 text-[8px] font-black uppercase tracking-widest italic border border-on-surface shadow-[1px_1px_0px_black] rotate-[-2deg]">
                    {(mission.category || 'FIELD OP').toUpperCase()}
                  </div>
                  <div className="bg-[#B7FF00] text-on-surface px-2 py-0.5 text-[8px] font-black uppercase tracking-widest italic border border-on-surface shadow-[1px_1px_0px_black] rotate-[1deg]">
                    {mission.difficulty?.toUpperCase() || 'MODERATE'}
                  </div>
                </div>
                {isUnavailable && (
                  <div className="absolute inset-0 flex items-center justify-center rotate-[-15deg] pointer-events-none">
                    <div className={cn(
                      "px-4 py-1 border-2 font-display text-2xl font-black uppercase tracking-tighter opacity-80",
                      isApproved ? "border-brand-lime text-brand-lime bg-white" : "border-brand-orange text-brand-orange bg-white"
                    )}>
                      {isApproved ? 'APPROVED' : 'SUBMITTED'}
                    </div>
                  </div>
                )}
              </div>

              {/* Title & Status Strip - NO TRUNCATION */}
              <div className="space-y-3">
                <h3 id="tour-card-title" className="font-display text-2xl sm:text-3xl font-black uppercase italic tracking-tighter text-on-surface leading-[0.85] text-wrap">
                  {mission.title}
                </h3>
                
                <div className="flex items-center justify-between border-y-2 border-on-surface/10 py-2">
                   <div className="flex items-center gap-2">
                     <span className="text-[8px] font-mono font-bold bg-on-surface text-white px-1.5 py-0.5 rounded-sm uppercase tracking-wider">
                       REF: {mission.id.slice(0, 8)}
                     </span>
                     <span className="text-[10px] font-mono font-black text-brand-orange uppercase">
                       +{mission.baseXP || 100} XP_PTS
                     </span>
                   </div>
                   
                   <div className="flex items-center gap-1.5 text-brand-lime text-[10px] font-mono font-black uppercase">
                     <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                     <span>{statusLabel}</span>
                   </div>
                </div>
              </div>

              {/* Main Mission Description */}
              <div id="tour-card-directions" className="p-4 bg-[#F1E6D0]/20 border-l-4 border-brand-orange border-y border-r border-on-surface/10 font-serif italic text-base opacity-90 leading-relaxed">
                "{mission.description}"
              </div>

              {/* Objectives / Required Proof */}
              <div id="tour-card-proof" className="space-y-3">
                <p className="font-display text-xs font-black uppercase tracking-widest text-on-surface/40">REQUIRED EVIDENCE</p>
                <div className="grid grid-cols-1 gap-2.5">
                  {(mission.proofType || []).map((type, idx) => {
                    const isDone = !!progress[type] || isUnavailable;
                    const labelMap: Record<string, string> = {
                      photo: 'Photo Receipt',
                      note: 'Tell the Story',
                      location: 'Drop a Pin',
                      'group-confirmation': 'Crew Check-In',
                      audio: 'Catch the Sound',
                      video: 'Video Clip'
                    };
                    const instructionMap: Record<string, string> = {
                      photo: 'Snap a clear pic of the thing.',
                      note: 'Tell Trevor what you found and why it matters.',
                      location: 'Drop a pin while you are near the spot.',
                      'group-confirmation': 'Bring your crew into the tiny legend.',
                      audio: 'Record the sound if the moment has one.',
                      video: 'Record a quick clip of the adventure.'
                    };
                    return (
                      <div 
                        key={idx} 
                        className={cn(
                          "w-full p-3 border-2 border-on-surface flex items-center justify-between transition-all",
                          isDone ? "bg-brand-lime/10 border-brand-lime shadow-[2px_2px_0px_var(--color-brand-lime)]" : "bg-white"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "p-1.5 border border-on-surface/25 text-on-surface/70 bg-on-surface/5 rounded-sm",
                            isDone && "bg-brand-lime/20 border-brand-lime/40 text-on-surface"
                          )}>
                            {type === 'photo' && <Camera className="w-4 h-4" />}
                            {type === 'note' && <FileText className="w-4 h-4" />}
                            {type === 'location' && <MapPin className="w-4 h-4" />}
                          </div>
                          <div>
                            <span className="font-display text-sm font-black uppercase italic text-on-surface leading-none">
                              {labelMap[type] || type.replace('_', ' ')}
                            </span>
                            <p className="text-[10px] opacity-60 leading-none mt-0.5 font-medium">
                              {isUnavailable ? 'Already caught.' : (instructionMap[type] || 'Grab a little proof.')}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Secret Intel / Hint Field */}
              {mission.hintText && (
                <div className="pt-4 border-t-2 border-dashed border-on-surface/10">
                  {isHintUsed || isUnavailable ? (
                    <div className="p-3 bg-brand-orange/5 border border-brand-orange/15 rounded-md text-left">
                      <div className="flex items-center gap-1.5 text-brand-orange text-[10px] font-mono font-black uppercase">
                        <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
                        <span>TREVOR'S HINT REVEALED:</span>
                      </div>
                      <p className="text-xs font-medium opacity-80 mt-1 leading-relaxed">
                        {mission.hintText}
                      </p>
                    </div>
                  ) : (
                    onHint && (
                      <button 
                        onClick={onHint}
                        className="w-full py-2.5 border-2 border-dashed border-on-surface/30 hover:border-on-surface text-on-surface bg-on-surface/5 hover:bg-on-surface/10 transition-colors flex items-center justify-center gap-2 text-xs font-mono font-black uppercase tracking-wider"
                      >
                        <HelpCircle className="w-4 h-4" />
                        <span>DECODE ENCRYPTED INTEL (REVEAL HINT)</span>
                      </button>
                    )
                  )}
                </div>
              )}
            </div>

            {/* Bottom Form Actions */}
            <div className="p-4 bg-[#F1E6D0]/10 border-t-4 border-on-surface flex items-center gap-3">
              {isRedrawable && onRedraw && !isUnavailable && (
                <button
                  onClick={onRedraw}
                  className="flex-1 py-3 px-4 bg-white hover:bg-on-surface/5 border-2 border-on-surface font-display text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-[2px_2px_0px_black] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>REROLL</span>
                </button>
              )}
              
              <button
                id="tour-card-start"
                data-tour="deploy-mission"
                data-onboarding="deploy-mission"
                onClick={isUnavailable ? onClose : onStart}
                className={cn(
                  "flex-[2] py-3 px-4 border-2 border-on-surface font-display text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-[4px_4px_0px_black] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all",
                  isApproved ? "bg-brand-lime hover:brightness-105" : isSubmitted ? "bg-brand-orange text-white hover:brightness-105" : "bg-[#B7FF00] text-on-surface hover:brightness-105"
                )}
              >
                {isApproved ? (
                  <>
                    <HelpCircle className="w-4 h-4" />
                    <span>MISSION ARCHIVED</span>
                  </>
                ) : isSubmitted ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin-slow" />
                    <span>PENDING REVIEW</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-on-surface" />
                    <span>DEPLOY MISSION</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
