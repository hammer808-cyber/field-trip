import { useState } from 'react';
import { motion } from 'motion/react';
import { Entry } from '../constants';
import { cn } from '../lib/utils';
import { CheckCircle2, AlertCircle, Clock, ShieldAlert, Flag, Book, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { FieldBadge } from './UI';
import { AvatarPreview } from './AvatarPreview';
import { DEFAULT_AVATAR } from '../constants/avatarAssets';
import { adminOverrideReview } from '../services/proofService';
import { ProofImage } from './ProofImage';
import { FieldCheckModal } from './FieldCheckModal';
import { normalizeEntryStatus } from '../logic/entryLogic';

interface EntryCardProps {
  entry: Entry;
  className?: string;
  key?: string | number;
}

export function EntryCard({ entry, className }: EntryCardProps) {
  const { isAdmin, user, profile } = useApp();
  const { frankieMode, fc } = useTheme();
  const [isFieldCheckOpen, setIsFieldCheckOpen] = useState(false);

  const isPlain = frankieMode;
  const isOwnEntry = user?.uid === entry.userId;
  const normalizedStatus = normalizeEntryStatus(entry.status);
  const isApproved = normalizedStatus === 'approved';
  const scoring = (entry as any).scoring || {};
  const awardedXp = Number(scoring.totalXpAwarded ?? scoring.awardedXp ?? entry.awardedXP ?? entry.awardedPoints ?? (typeof entry.pointsAwarded === 'number' ? entry.pointsAwarded : 0) ?? 0);
  const maxUiPotentialXp = Number(scoring.maxUiPotentialXp || (scoring.scoringMode === 'starter' ? 100 : awardedXp || entry.xpValue || 100));
  const reservedPotentialXp = Number(scoring.reservedPotentialXp || 0);
  const hasClassifiedReserve = isApproved && reservedPotentialXp > 0 && maxUiPotentialXp > awardedXp;

  const getStatusInfo = () => {
    switch (normalizedStatus) {
      case 'approved':
        return { icon: CheckCircle2, text: fc('Verified', 'Verified'), color: 'text-on-surface', stickerColor: 'lime' as const };
      case 'needs_more_proof':
        return { icon: AlertCircle, text: fc('Needs More Proof', 'Needs Proof'), color: 'text-brand-orange', stickerColor: 'orange' as const };
      case 'rejected':
        return { icon: ShieldAlert, text: fc('Rejected', 'Rejected'), color: 'text-error', stickerColor: 'charcoal' as const };
      case 'pending_review':
      default:
        return { icon: Clock, text: fc('Field Check Pending', 'Pending Review'), color: 'opacity-40', stickerColor: 'white' as const };
    }
  };

  const status = getStatusInfo();
  const StatusIcon = status.icon;

  const handleAdminAction = async (newStatus: 'approved' | 'rejected') => {
    if (!isAdmin || !user) return;
    try {
      await adminOverrideReview('manual-override', entry.id, newStatus as any, `Manual override by ${profile?.name || user.email}`);
    } catch (error) {
      console.error("Admin override failed:", error);
    }
  };

  return (
    <div className={cn(
      "min-w-[320px] sm:min-w-[380px] flex-shrink-0 p-6 pb-12 transition-all hover:rotate-1 bg-[#FFFDF8] relative group border-[4.5px] border-on-surface shadow-[10px_12px_0px_black] hover:shadow-[14px_16px_0px_black]",
      className
    )}>
      {/* Tape on top anchoring this Polaroid entry */}
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-28 h-8 bg-[#FEFC9C]/90 border-[1.5px] border-dashed border-on-surface/30 rotate-[-1.5deg] z-40 shadow-[2px_2px_0px_rgba(0,0,0,0.05)] pointer-events-none mix-blend-multiply" />
      <div className="absolute top-2 right-2 w-7 h-7 border-[2.5px] border-on-surface/30 rounded-full flex items-center justify-center opacity-40 z-40 bg-white shadow-sm select-none pointer-events-none text-xs">📌</div>
      
      {/* Main Image Viewport */}
      <div className="relative aspect-[4/3] mb-8 overflow-hidden border-[4px] border-on-surface shadow-[6px_6px_0px_rgba(0,0,0,0.1)] group-hover:rotate-0.5 transition-transform bg-[#ECE9E0]">
        <ProofImage 
          entry={entry} 
          className="group-hover:scale-105 sepia-[0.1] contrast-125 transition-all duration-1000 grayscale-[10%]" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-brand-lime/10 mix-blend-overlay pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.12] pointer-events-none mix-blend-multiply bg-[url('https://www.transparenttextures.com/patterns/handmade-paper.png')]" />
        
        {isAdmin && (
          <div className="absolute inset-0 bg-on-surface/90 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-6 p-6 backdrop-blur-sm z-30">
            <p className="text-white font-mono text-[9px] mb-2 font-black tracking-[0.4em] uppercase italic">ADMIN_OVERRIDE_PROTOCOL</p>
            <div className="flex gap-4">
              <button 
                onClick={() => handleAdminAction('approved')}
                className="bg-brand-lime text-on-surface px-6 py-3 text-xs font-display uppercase font-black border-[3px] border-on-surface hover:bg-white transition-all shadow-[6px_6px_0px_black] active:shadow-none active:translate-y-1 italic"
              >
                VERIFY_DATA
              </button>
              <button 
                onClick={() => handleAdminAction('rejected')}
                className="bg-brand-orange text-white px-6 py-3 text-xs font-display uppercase font-black border-[3px] border-on-surface hover:bg-on-surface transition-all shadow-[6px_6px_0px_black] active:shadow-none active:translate-y-1 italic"
              >
                REJECT_VIBE
              </button>
            </div>
          </div>
        )}

        <FieldBadge 
          variant="label" 
          color="charcoal" 
          size="xs" 
          rotation={-1} 
          className="absolute top-2 left-2 z-20 font-black italic shadow-[3px_3px_0px_black]"
        >
          {fc('LENS_CAPTURE', 'FIELD_DATA')}
        </FieldBadge>

        <div className="absolute bottom-2 right-2 z-20">
           <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-brand-lime rounded-full animate-pulse" />
           </div>
        </div>
      </div>

      {/* Origin Info */}
      <div className="flex justify-between items-start mb-8">
        <div className="flex items-center gap-5">
          <div className="relative">
            <AvatarPreview 
              avatar={entry.userAvatar || DEFAULT_AVATAR} 
              size="lg" 
              className="border-[3px] border-on-surface bg-white shadow-[4px_4px_0px_black] rounded-none group-hover:rotate-3 transition-transform" 
            />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-brand-cyan border-2 border-on-surface rounded-full z-10" />
          </div>
          <div className="space-y-1 to-left">
            <p className="text-[9px] font-mono opacity-40 font-black tracking-[0.2em] italic uppercase leading-none">{fc(`SOURCE // ${entry.userName?.toUpperCase() || 'ANON_AGENT'}`, `By ${entry.userName || 'Agent'}`)}</p>
            <h4 className="font-display text-3xl uppercase tracking-tighter text-on-surface font-black italic leading-[0.8] mt-1">
              {entry.tripTitle || entry.challengeTitle || entry.missionTitle || 'Retired Mission'}
            </h4>
            <p className="pt-1 font-mono text-[8px] font-black uppercase tracking-wider text-on-surface/45">
              {entry.deckName || entry.deckId || 'Fieldtrip'} · {entry.cardType || 'Signal'}
            </p>
          </div>
        </div>
        <FieldBadge 
          variant="ticket" 
          color="lime" 
          size="sm" 
          rotation={2} 
          className="shadow-[5px_5px_0px_black] font-black italic border-[2.5px]"
        >
          ID_{entry.id?.substring(0,4).toUpperCase() || 'XXXX'}
        </FieldBadge>
      </div>
      
      {/* Field Note Content */}
      <div className="bg-[#FAF9F4] p-6 border-l-[10px] border-on-surface italic shadow-[inset_4px_4px_12px_rgba(0,0,0,0.03)] mb-8 text-left group-hover:bg-brand-cyan/[0.03] transition-colors relative">
        <div className="absolute top-2 right-2 opacity-5 scale-125 rotate-12">
           <Book className="w-10 h-10" />
        </div>
        <p className="font-serif text-xl sm:text-2xl leading-relaxed line-clamp-3 font-medium text-on-surface/80 relative z-10">"{entry.fieldNote}"</p>
      </div>

      {/* Footer / Status */}
      <div className="flex justify-between items-end border-t-[3.5px] border-on-surface/5 pt-8">
        <div className="flex flex-col gap-4">
          <div className={cn("flex items-center gap-3", status.color)}>
            <FieldBadge 
              variant={status.stickerColor === 'lime' ? 'glossy' : 'stamp'} 
              color={status.stickerColor} 
              size="md" 
              className="px-4 py-1.5 shadow-[4px_4px_0px_black]"
            >
              <div className="flex items-center gap-2">
                <StatusIcon className="w-4 h-4" />
                <span className="text-[11px] font-black tracking-tight">{isPlain ? status.text : status.text.replace(/ /g, '_')}</span>
              </div>
            </FieldBadge>
          </div>
          
          {isApproved && !isOwnEntry && (
            <button
              onClick={() => setIsFieldCheckOpen(true)}
              className="flex items-center gap-2 text-[10px] font-black uppercase italic tracking-[0.2em] text-on-surface/30 hover:text-brand-orange transition-colors"
            >
              <Flag className="w-3 h-3" />
              {fc('REQUEST_FIELD_CHECK', 'Request Field Check')}
            </button>
          )}
        </div>
        <div className="text-right">
          <div className="relative inline-block">
            <span className="font-display text-4xl text-brand-orange font-black italic drop-shadow-[5px_5px_0_var(--color-on-surface)]">
              {isApproved ? `${awardedXp} / ${maxUiPotentialXp}_XP` : `+${entry.xpValue || 0}_XP`}
            </span>
            <div className="absolute -top-1 -right-1">
               <Sparkles className="w-4 h-4 text-brand-orange animate-pulse" />
            </div>
          </div>
          {hasClassifiedReserve && (
            <p
              className="mt-2 max-w-44 text-[9px] font-mono font-black uppercase tracking-widest text-on-surface/45"
              title="Not every signal is visible yet. Some Fieldtrip points remain reserved for future discoveries, special conditions, and seasonal surprises."
            >
              {reservedPotentialXp} XP remains classified
            </p>
          )}
        </div>
      </div>

      <FieldCheckModal
        isOpen={isFieldCheckOpen}
        onClose={() => setIsFieldCheckOpen(false)}
        submissionId={entry.id}
        missionId={entry.tripId || entry.missionId || entry.challengeId || 'unknown'}
        reportedUserId={entry.userId}
        reportedUserName={entry.userName || entry.displayName || 'Field Agent'}
      />
    </div>
  );
}
