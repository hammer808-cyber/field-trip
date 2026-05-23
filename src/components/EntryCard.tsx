import { useState } from 'react';
import { motion } from 'motion/react';
import { Entry } from '../constants';
import { cn } from '../lib/utils';
import { CheckCircle2, AlertCircle, Clock, ShieldAlert, Flag } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { AvatarPreview } from './AvatarPreview';
import { DEFAULT_AVATAR } from '../constants/avatarAssets';
import { adminOverrideReview } from '../services/proofService';
import { FieldCheckModal } from './FieldCheckModal';

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
  const isApproved = entry.status === 'approved' || entry.status === 'approved_by_admin';

  const getStatusInfo = () => {
    switch (entry.status) {
      case 'approved':
      case 'approved_by_admin':
        return { icon: CheckCircle2, text: fc('Verified', 'Verified'), color: 'text-on-surface', stickerColor: 'lime' };
      case 'needs-more-proof':
      case 'needs_review':
        return { icon: AlertCircle, text: fc('Needs More Proof', 'Needs Proof'), color: 'text-brand-orange', stickerColor: 'orange' };
      case 'rejected':
        return { icon: ShieldAlert, text: fc('Rejected', 'Rejected'), color: 'text-error', stickerColor: 'black' };
      case 'pending':
      default:
        return { icon: Clock, text: fc('Field Check Pending', 'Pending Review'), color: 'opacity-40', stickerColor: 'white' };
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
      "min-w-[340px] flex-shrink-0 p-10 transition-all hover:-translate-y-2 bg-white relative group border-4 border-on-surface shadow-[16px_16px_0px_var(--color-brand-orange)] hover:shadow-[24px_24px_0px_black]",
      className
    )}>
      <div className="relative aspect-video mb-8 overflow-hidden border-4 border-on-surface shadow-[8px_8px_0px_black] group-hover:rotate-1 transition-transform">
        <img 
          src={entry.proofImage || undefined} 
          alt="" 
          loading="lazy"
          className="w-full h-full object-cover transition-all duration-1000 group-hover:scale-110 sepia-[0.1] contrast-125" 
        />
        <div className="absolute inset-0 bg-brand-lime/10 mix-blend-overlay pointer-events-none" />
        
        {isAdmin && (
          <div className="absolute inset-0 bg-on-surface/90 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-6 p-6 backdrop-blur-sm z-30">
            <p className="text-white micro-label mb-2 font-black tracking-[0.4em] italic">ADMIN_OVERRIDE_PROTOCOL</p>
            <div className="flex gap-4">
              <button 
                onClick={() => handleAdminAction('approved')}
                className="bg-brand-lime text-black px-8 py-3 text-sm font-display uppercase font-black border-2 border-on-surface hover:bg-white transition-all shadow-[6px_6px_0px_black] italic"
              >
                AUTHO_VERIFY
              </button>
              <button 
                onClick={() => handleAdminAction('rejected')}
                className="bg-error text-white px-8 py-3 text-sm font-display uppercase font-black border-2 border-on-surface hover:bg-on-surface transition-all shadow-[6px_6px_0px_black] italic"
              >
                REJECT_VIBE
              </button>
            </div>
          </div>
        )}

        <div className="absolute top-2 left-2 bg-on-surface text-brand-lime px-2 py-0.5 text-[8px] font-black uppercase tracking-widest italic z-20">{fc('LENS_ARCHIVE', 'ENTRY')}</div>
      </div>
      <div className="flex justify-between items-start mb-8">
        <div className="flex items-center gap-5">
          <AvatarPreview 
            avatar={entry.userAvatar || DEFAULT_AVATAR} 
            size="lg" 
            className="border-2 border-on-surface bg-white shadow-[4px_4px_0px_black] rounded-none" 
          />
          <div className="space-y-1.5 text-left">
            <p className="micro-label opacity-40 font-black tracking-[0.2em] italic">{fc(`FILED_BY_${entry.userName?.toUpperCase() || 'ANON_AGENT'}`, `By ${entry.userName || 'Agent'}`)}</p>
            <h4 className="font-display text-2xl uppercase tracking-tighter text-on-surface font-black italic leading-[0.8]">{entry.tripTitle}</h4>
          </div>
        </div>
        <div className="bureau-tag shadow-[4px_4px_0px_black] border-2 border-on-surface bg-brand-lime text-black font-black italic">ID_{entry.id?.substring(0,4).toUpperCase() || 'XXXX'}</div>
      </div>
      
      <div className="bg-paper-dark p-6 border-l-8 border-on-surface italic shadow-inner mb-8 text-left group-hover:bg-brand-lime/5 transition-colors">
        <p className="font-serif text-xl leading-relaxed line-clamp-3 font-medium text-on-surface/80">"{entry.fieldNote}"</p>
      </div>

      <div className="flex justify-between items-end border-t-4 border-on-surface/5 pt-8">
        <div className="flex flex-col gap-4">
          <div className={cn("flex items-center gap-3", status.color)}>
            <div className={cn("p-1.5 border-2 shadow-[2px_2px_0px_black]", status.stickerColor === 'lime' ? 'bg-brand-lime' : 'bg-white')}>
              <StatusIcon className={cn("w-5 h-5", entry.status === 'approved' ? "text-on-surface stroke-[3]" : "stroke-[3]")} />
            </div>
            <span className="micro-label font-black text-sm italic uppercase tracking-widest">{isPlain ? status.text : status.text.replace(/ /g, '_')}</span>
          </div>
          
          {isApproved && !isOwnEntry && (
            <button
              onClick={() => setIsFieldCheckOpen(true)}
              className="flex items-center gap-2 text-[10px] font-black uppercase italic tracking-[0.2em] text-on-surface/40 hover:text-brand-orange transition-colors"
            >
              <Flag className="w-3 h-3" />
              {fc('REQUEST_FIELD_CHECK', 'Request Field Check')}
            </button>
          )}
        </div>
        <div className="text-right">
          <span className="font-display text-3xl text-brand-orange font-black italic drop-shadow-[4px_4px_0_var(--color-on-surface)]">+{entry.pointsAwarded}_XP</span>
        </div>
      </div>

      <FieldCheckModal
        isOpen={isFieldCheckOpen}
        onClose={() => setIsFieldCheckOpen(false)}
        submissionId={entry.id}
        missionId={entry.tripId}
        reportedUserId={entry.userId}
        reportedUserName={entry.userName || 'Field Agent'}
      />
    </div>
  );
}
