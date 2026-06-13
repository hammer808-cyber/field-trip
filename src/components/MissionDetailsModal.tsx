import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TripCard as TripCardType } from '../types/challenges';
import { cn } from '../lib/utils';
import { 
  X, Compass, MapPin, Camera, FileText, 
  Zap, AlertTriangle, Play, RefreshCw, HelpCircle 
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
            <div className="overflow-y-auto p-6 flex-1 space-y-6 custom-scrollbar">
              {/* Mission Polaroid Image */}
              <div className="aspect-[16/10] bg-on-surface/5 border-4 border-on-surface relative overflow-hidden shadow-[4px_4px_0px_black]">
                <img 
                  src={imageUrl} 
                  alt={mission.title} 
                  className={cn("w-full h-full object-cover", isUnavailable && "grayscale contrast-125 brightness-110")}
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-2 left-2 bg-[#FF5A00] text-white px-2 py-0.5 text-[8px] font-black uppercase tracking-widest italic border border-on-surface shadow-[1px_1px_0px_black]">
                  {(mission.category || 'FIELD OP').toUpperCase()}
                </div>
                {isUnavailable && (
                  <div className="absolute inset-0 flex items-center justify-center rotate-[-15deg] pointer-events-none">
                    <div className={cn(
                      "px-6 py-2 border-4 font-display text-4xl font-black uppercase tracking-tighter opacity-80",
                      isApproved ? "border-brand-lime text-brand-lime bg-white" : "border-brand-orange text-brand-orange bg-white"
                    )}>
                      {isApproved ? 'APPROVED' : 'SUBMITTED'}
                    </div>
                  </div>
                )}
              </div>

              {/* Title & Info */}
              <div className="space-y-2">
                <h3 id="tour-card-title" className="font-display text-2xl sm:text-3xl font-black uppercase italic tracking-tighter text-on-surface leading-none">
                  {mission.title}
                </h3>
                <div id="tour-card-points" className="flex items-center gap-2">
                  <span className="text-[9px] font-mono font-bold bg-on-surface/5 px-2 py-0.5 border border-on-surface/10 rounded-sm uppercase tracking-wider text-on-surface/60">
                    ID: {mission.id}
                  </span>
                  {isApproved ? (
                    <span className="text-[9px] font-mono font-bold bg-brand-lime text-on-surface px-2 py-0.5 border border-on-surface rounded-sm uppercase tracking-wider">
                      COMPLETE
                    </span>
                  ) : isSubmitted ? (
                    <span className="text-[9px] font-mono font-bold bg-brand-orange text-white px-2 py-0.5 border border-on-surface rounded-sm uppercase tracking-wider">
                      PENDING REVIEW
                    </span>
                  ) : (
                    mission.difficulty && (
                      <span className="text-[9px] font-mono font-bold bg-brand-orange/5 px-2 py-0.5 border border-brand-orange/10 rounded-sm text-brand-orange uppercase tracking-wider">
                        {mission.difficulty}
                      </span>
                    )
                  )}
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
                      photo: 'Photo Evidence',
                      note: 'Field Journal Entry',
                      location: 'GPS Pin Drop',
                      'group-confirmation': 'Crew Check-In',
                      audio: 'Sound Sample Capture',
                      video: 'Video Recording'
                    };
                    const instructionMap: Record<string, string> = {
                      photo: 'Take a clear, aligned photograph with the viewfinder camera.',
                      note: 'Write a detailed field note describing your subject.',
                      location: 'Log your correct GPS coordinates in the field area.',
                      'group-confirmation': 'Get confirmation from other active explorers.',
                      audio: 'Record atmospheric background noise or sound patterns.',
                      video: 'Record high-fidelity proof of the field encounter.'
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
                              {isUnavailable ? 'Objective Secured.' : (instructionMap[type] || 'Capture objective verification.')}
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
                        <span>BUREAU FIELD INTEL REVEALED:</span>
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
