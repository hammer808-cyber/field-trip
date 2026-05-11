import { motion } from 'motion/react';
import { Entry } from '../constants';
import { cn } from '../lib/utils';
import { CheckCircle2, AlertCircle, Clock, ShieldAlert } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { adminOverrideReview } from '../services/proofService';

interface EntryCardProps {
  entry: Entry;
  className?: string;
  key?: string | number;
}

export function EntryCard({ entry, className }: EntryCardProps) {
  const { profile, user } = useApp();
  const isAdmin = profile?.isAdmin;

  const getStatusInfo = () => {
    switch (entry.status) {
      case 'approved':
      case 'approved_by_admin':
        return { icon: CheckCircle2, text: 'Validated', color: 'text-brand-green', stickerColor: 'green' };
      case 'needs-more-proof':
      case 'needs_review':
        return { icon: AlertCircle, text: 'Needs More Proof', color: 'text-brand-orange', stickerColor: 'orange' };
      case 'rejected':
        return { icon: ShieldAlert, text: 'Rejected', color: 'text-error', stickerColor: 'black' };
      case 'pending':
      default:
        return { icon: Clock, text: 'Authentication Pending', color: 'text-on-surface opacity-40', stickerColor: 'white' };
    }
  };

  const status = getStatusInfo();
  const StatusIcon = status.icon;

  const handleAdminAction = async (newStatus: 'approved' | 'rejected') => {
    if (!isAdmin || !user) return;
    try {
      // Find the reviewId if we have one, otherwise we might need to handle this differently.
      // For now, if we don't have reviewId, we can't call adminOverrideReview easily.
      // But in this system, we can assume we're overriding by entryId.
      // I'll update proofService to handle optional reviewId.
      await adminOverrideReview('manual-override', entry.id, newStatus as any, `Manual override by ${profile?.name || user.email}`);
    } catch (error) {
      console.error("Admin override failed:", error);
    }
  };

  return (
    <div className={cn(
      "min-w-[300px] flex-shrink-0 notice-card p-8 transition-transform hover:scale-[1.02] bg-paper-dark relative group",
      className
    )}>
      <div className="relative aspect-video mb-4 overflow-hidden rounded-sm border-2 border-on-surface/10">
        <img 
          src={entry.proofImage} 
          alt="" 
          loading="lazy"
          className="w-full h-full object-cover" 
        />
        {isAdmin && (
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
            <button 
              onClick={() => handleAdminAction('approved')}
              className="bg-brand-green text-white px-3 py-1 text-[10px] font-mono uppercase rounded-sm hover:scale-105"
            >
              Approve
            </button>
            <button 
              onClick={() => handleAdminAction('rejected')}
              className="bg-error text-white px-3 py-1 text-[10px] font-mono uppercase rounded-sm hover:scale-105"
            >
              Reject
            </button>
          </div>
        )}
      </div>
      <div className="flex justify-between items-start mb-4">
        <div className="space-y-1">
          <p className="micro-label">FILED_{entry.createdAt ? new Date(entry.createdAt.seconds * 1000).toLocaleTimeString() : 'RECENT'}</p>
          <h4 className="font-display text-sm uppercase tracking-tighter text-on-surface/80">{entry.challengeTitle}</h4>
        </div>
        <div className="bureau-tag bg-on-surface/10 text-on-surface shrink-0">LOC_{entry.id.substring(0,4)}</div>
      </div>
      <p className="font-serif italic text-lg leading-relaxed line-clamp-3">"{entry.note}"</p>
      <div className="mt-6 flex justify-between items-end border-t border-on-surface/10 pt-4">
        <div className={cn("flex items-center gap-1.5", status.color)}>
          <StatusIcon className="w-3 h-3" />
          <span className="micro-label font-bold">{status.text}</span>
        </div>
        <div className="text-right">
          <span className="font-display text-brand-orange">+{entry.pointsAwarded} XP</span>
        </div>
      </div>
    </div>
  );
}
