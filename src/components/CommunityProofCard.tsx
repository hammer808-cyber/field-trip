import React, { useEffect, useMemo, useState } from 'react';
import { FieldCard, FieldTape } from './UI';
import { Flame, ShieldAlert, X, CheckCircle2, ImageOff } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { ProofImage } from './ProofImage';
import { AvatarPreview } from './AvatarPreview';
import { checkIfLiked, toggleLikeEntry } from '../services/proofService';
import { getSusReportStatus, submitSusReport } from '../services/moderationService';
import { cn } from '../lib/utils';
import { DEFAULT_AVATAR } from '../constants/avatarAssets';
import { toast } from 'react-hot-toast';
import { getCommunityFeedApprovedTime, getCommunityFeedOwnerId, hasCommunityFeedImageReference } from '../logic/communityFeed';

const SUS_REASONS = [
  "Doesn't match the mission",
  'Looks reused or borrowed',
  'Seems staged or misleading',
  'May be AI-generated or altered',
  'Unsafe or inappropriate',
  'Something else',
];

interface CommunityProofCardProps {
  proof: any;
  normalizeEntryStatus: (status: string) => string;
}

export function CommunityProofCard({ proof, normalizeEntryStatus }: CommunityProofCardProps) {
  const { user } = useApp();
  const [liked, setLiked] = useState(false);
  const [localLikeCount, setLocalLikeCount] = useState(proof.likeCount || proof.hypeCount || 0);
  const [isLiking, setIsLiking] = useState(false);
  const [isReportingSus, setIsReportingSus] = useState(false);
  const [susOpen, setSusOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [susReason, setSusReason] = useState(SUS_REASONS[0]);
  const [susDetails, setSusDetails] = useState('');
  const [susState, setSusState] = useState({ canReport: false, alreadyReported: false, isOwnProof: false });

  const ownerId = getCommunityFeedOwnerId(proof);
  const hasImageReference = hasCommunityFeedImageReference(proof);
  const missionTitle = proof.tripTitle || proof.challengeTitle || proof.missionTitle || 'Field Receipt';
  const displayName = proof.displayName || proof.userName || proof.publicName || 'Anonymous Agent';
  const deckLabel = proof.deckName || proof.deckId || proof.seasonTitle || proof.seasonId || 'Fieldtrip';
  const approvedTime = getCommunityFeedApprovedTime(proof);
  const formattedDate = approvedTime ? new Date(approvedTime).toLocaleDateString() : 'Recently';
  const statusLabel = normalizeEntryStatus(proof.status);
  const canShowSus = !!user && ownerId !== user.uid && !susState.alreadyReported && susState.canReport;
  const scoring = proof.scoring || {};
  const awardedXp = Number(scoring.totalXpAwarded ?? scoring.awardedXp ?? proof.awardedXP ?? proof.awardedPoints ?? (typeof proof.pointsAwarded === 'number' ? proof.pointsAwarded : 0) ?? 0);
  const maxUiPotentialXp = Number(scoring.maxUiPotentialXp || (scoring.scoringMode === 'starter' ? 100 : awardedXp || proof.xpValue || 100));
  const reservedPotentialXp = Number(scoring.reservedPotentialXp || 0);
  const hasXpDisplay = awardedXp > 0 || proof.pointsAwarded || proof.awardedPoints;
  const hasClassifiedReserve = reservedPotentialXp > 0 && maxUiPotentialXp > awardedXp;

  useEffect(() => {
    if (user?.uid && proof.id) {
      checkIfLiked(proof.id, user.uid).then(setLiked).catch(err => {
        console.warn("[CommunityProofCard] checkIfLiked error caught:", err);
      });
      getSusReportStatus(proof.id).then(setSusState).catch(() => {
        setSusState({ canReport: false, alreadyReported: false, isOwnProof: ownerId === user.uid });
      });
    }
  }, [proof.id, user?.uid, ownerId]);

  useEffect(() => {
    setLocalLikeCount(proof.likeCount || proof.hypeCount || 0);
  }, [proof.likeCount, proof.hypeCount]);

  const susButtonLabel = useMemo(() => {
    if (!user) return 'Raise Signal';
    if (susState.isOwnProof || ownerId === user.uid) return 'Your Receipt';
    if (susState.alreadyReported) return 'Signal Sent';
    return 'Raise Signal';
  }, [ownerId, susState.alreadyReported, susState.isOwnProof, user]);

  const handleLike = async (event?: React.MouseEvent) => {
    event?.stopPropagation();
    if (!user) {
      toast.error("Sign in to Hype receipts");
      return;
    }
    if (isLiking) return;

    const newLikedState = !liked;
    setLiked(newLikedState);
    setLocalLikeCount((prev: number) => newLikedState ? prev + 1 : Math.max(0, prev - 1));
    setIsLiking(true);

    try {
      const result = await toggleLikeEntry(proof.id, user.uid, liked);
      if (typeof result?.likeCount === 'number') setLocalLikeCount(result.likeCount);
      if (typeof result?.liked === 'boolean') setLiked(result.liked);
    } catch (err) {
      setLiked(!newLikedState);
      setLocalLikeCount((prev: number) => !newLikedState ? prev + 1 : Math.max(0, prev - 1));
      toast.error("Hype did not stick");
    } finally {
      setIsLiking(false);
    }
  };

  const handleSusReport = async () => {
    if (!user) {
      toast.error("Sign in to raise a Signal Check");
      return;
    }
    if (isReportingSus || !canShowSus) return;
    setIsReportingSus(true);
    try {
      await submitSusReport(
        proof.id,
        susReason,
        susDetails.trim() || `Community feed Signal Check for ${missionTitle}.`
      );
      setSusState(prev => ({ ...prev, alreadyReported: true, canReport: false }));
      setSusOpen(false);
      toast.success("Signal sent privately for admin review");
    } catch (err: any) {
      const message = err?.message === 'DUPLICATE_ACTIVE_SUS_REPORT'
        ? "Signal already sent"
        : err?.message === 'SELF_REPORT_PROHIBITED'
          ? "You cannot Signal Check your own receipt"
          : "Signal Check did not send";
      toast.error(message);
    } finally {
      setIsReportingSus(false);
    }
  };

  return (
    <>
      <FieldCard
        variant="photo"
        className="w-full flex flex-col h-full group relative overflow-visible cursor-pointer"
        onClick={() => setDetailOpen(true)}
      >
        <FieldTape className="absolute -top-3 left-1/3 z-20 w-16 h-6" rotation={-5} />

        <div className="absolute top-2 left-2 z-20 pointer-events-none">
          <div className="bg-brand-lime text-on-surface text-[8px] font-black px-2 py-1 border-2 border-on-surface shadow-[2px_2px_0px_black] -rotate-12 uppercase italic flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Approved Receipt
          </div>
        </div>

        <div className="photo-image-slot relative overflow-hidden aspect-square border-[2.5px] border-on-surface bg-[#ECE9E0] flex items-center justify-center m-1 shadow-[inset_0_2px_4px_rgba(0,0,0,0.15)]">
          {!hasImageReference ? (
            <div className="flex flex-col items-center gap-2 text-on-surface/35 font-mono text-[9px] font-black uppercase">
              <ImageOff className="w-8 h-8" />
              Image Missing
            </div>
          ) : (
            <ProofImage 
              entry={proof} 
              isCommunityFeed={true}
              className="grayscale-[0.15] group-hover:grayscale-0 transition-all duration-700 w-full h-full object-cover"
            />
          )}
          <span className="absolute bottom-2 right-2 bg-[#FFFDF6] text-on-surface font-mono text-[7px] font-black tracking-widest px-1.5 py-0.5 border border-on-surface/40 rotate-[1.5deg]">
            {formattedDate}
          </span>
        </div>

        <div className="p-2 pt-4 space-y-3 flex-1 flex flex-col justify-between">
          <div className="space-y-3 text-left">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <AvatarPreview avatar={proof.userAvatar || DEFAULT_AVATAR} size="xs" className="w-5 h-5 rounded-full border-2 border-on-surface shadow-[1px_1px_0px_black]" />
                <span className="text-[9px] font-mono font-black uppercase tracking-widest text-on-surface truncate">{displayName}</span>
              </div>
              {hasXpDisplay && (
                <div
                  className="bg-brand-magenta text-white text-[8px] font-black px-2 py-0.5 rounded border border-on-surface shadow-[1px_1.5px_0px_black] shrink-0"
                  title={hasClassifiedReserve ? 'Not every signal is visible yet. Some Fieldtrip points remain reserved for future discoveries, special conditions, and seasonal surprises.' : undefined}
                >
                  {awardedXp} / {maxUiPotentialXp} XP
                  {hasClassifiedReserve && <span className="block text-[6px] leading-tight opacity-80">{reservedPotentialXp} XP classified</span>}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <h4 className="text-lg font-display font-black uppercase italic leading-tight text-on-surface line-clamp-1">
                {missionTitle}
              </h4>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[7px] font-mono font-black uppercase text-on-surface/45 bg-on-surface/5 px-1.5 py-0.5 rounded-sm">
                  {deckLabel}
                </span>
                <span className="text-[7px] font-mono font-black uppercase text-brand-lime bg-brand-lime/10 px-1.5 py-0.5 rounded-sm">
                  {statusLabel === 'approved' ? 'Verified' : 'Hidden'}
                </span>
              </div>
            </div>

            <p className="text-xs text-on-surface/70 line-clamp-2 font-serif italic relative pl-3 border-l-2 border-brand-orange/30 min-h-[2.5rem]">
              "{proof.fieldNote || proof.note || 'No field note provided.'}"
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-on-surface/10">
            <button
              type="button"
              onClick={handleLike}
              disabled={isLiking}
              className={cn(
                "flex items-center justify-center gap-2 px-3 py-2 border-2 border-on-surface text-[8px] font-mono font-black uppercase tracking-widest shadow-[2px_2px_0px_black] transition-transform active:translate-y-0.5 active:shadow-none disabled:opacity-50",
                liked ? "bg-brand-orange text-white" : "bg-white text-on-surface hover:bg-brand-yellow"
              )}
            >
              <Flame className="w-3.5 h-3.5" />
              Hype {localLikeCount}
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                if (canShowSus) setSusOpen(true);
              }}
              disabled={!canShowSus || isReportingSus}
              className="flex items-center justify-center gap-2 px-3 py-2 border-2 border-on-surface/25 bg-white text-on-surface/60 hover:text-error hover:border-error hover:bg-error/5 disabled:opacity-45 disabled:hover:text-on-surface/60 disabled:hover:border-on-surface/25 disabled:hover:bg-white transition-colors text-[8px] font-mono font-black uppercase tracking-widest"
              title="Privately send this receipt for Signal Check"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              {susButtonLabel}
            </button>
          </div>
        </div>
      </FieldCard>

      <AnimatePresence>
        {detailOpen && (
          <ReceiptDetailModal
            proof={proof}
            missionTitle={missionTitle}
            displayName={displayName}
            deckLabel={deckLabel}
            formattedDate={formattedDate}
            liked={liked}
            likeCount={localLikeCount}
            onHype={handleLike}
            susButtonLabel={susButtonLabel}
            canShowSus={canShowSus}
            onSus={() => setSusOpen(true)}
            onClose={() => setDetailOpen(false)}
          />
        )}
        {susOpen && (
          <SignalCheckModal
            reason={susReason}
            details={susDetails}
            busy={isReportingSus}
            onReason={setSusReason}
            onDetails={setSusDetails}
            onSubmit={handleSusReport}
            onClose={() => setSusOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function ReceiptDetailModal({
  proof,
  missionTitle,
  displayName,
  deckLabel,
  formattedDate,
  liked,
  likeCount,
  onHype,
  susButtonLabel,
  canShowSus,
  onSus,
  onClose,
}: any) {
  return (
    <motion.div className="fixed inset-0 z-[100] bg-black/70 p-4 sm:p-8 flex items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="bg-paper max-w-5xl w-full max-h-[92vh] overflow-y-auto border-4 border-on-surface shadow-[12px_12px_0px_var(--color-brand-orange)] p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-5" initial={{ y: 30, rotate: -1 }} animate={{ y: 0, rotate: 0 }} exit={{ y: 30, opacity: 0 }} onClick={(event) => event.stopPropagation()}>
        <div className="relative border-[3px] border-on-surface bg-white aspect-square overflow-hidden">
          <ProofImage entry={proof} isCommunityFeed={true} className="w-full h-full object-contain bg-black/5" />
        </div>
        <div className="space-y-5 text-left">
          <button type="button" onClick={onClose} className="float-right p-2 bg-white border-2 border-on-surface shadow-[2px_2px_0px_black]">
            <X className="w-4 h-4" />
          </button>
          <div>
            <p className="font-mono text-[9px] font-black uppercase tracking-widest text-brand-orange">Community Receipt</p>
            <h3 className="font-display text-4xl sm:text-5xl font-black uppercase italic leading-none">{missionTitle}</h3>
          </div>
          <div className="grid grid-cols-2 gap-2 font-mono text-[10px] uppercase font-black">
            <span className="bg-white border border-on-surface/20 p-2">Agent: {displayName}</span>
            <span className="bg-white border border-on-surface/20 p-2">Posted: {formattedDate}</span>
            <span className="bg-white border border-on-surface/20 p-2 col-span-2">Deck: {deckLabel}</span>
          </div>
          <p className="font-serif italic text-lg leading-relaxed border-l-4 border-brand-orange pl-4 text-on-surface/75">
            "{proof.fieldNote || proof.note || 'No field note provided.'}"
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={onHype} className={cn("flex items-center justify-center gap-2 px-4 py-3 border-2 border-on-surface font-mono text-xs font-black uppercase shadow-[3px_3px_0px_black]", liked ? "bg-brand-orange text-white" : "bg-white")}>
              <Flame className="w-4 h-4" />
              Hype {likeCount}
            </button>
            <button type="button" disabled={!canShowSus} onClick={onSus} className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-on-surface/30 bg-white font-mono text-xs font-black uppercase disabled:opacity-45">
              <ShieldAlert className="w-4 h-4" />
              {susButtonLabel}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SignalCheckModal({ reason, details, busy, onReason, onDetails, onSubmit, onClose }: any) {
  return (
    <motion.div className="fixed inset-0 z-[110] bg-black/70 p-4 flex items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="bg-paper w-full max-w-lg border-4 border-on-surface shadow-[10px_10px_0px_var(--color-brand-magenta)] p-5 space-y-5" initial={{ y: 24 }} animate={{ y: 0 }} exit={{ y: 24, opacity: 0 }} onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[9px] font-black uppercase tracking-widest text-brand-orange">Private Signal Check</p>
            <h3 className="font-display text-3xl font-black uppercase italic">Something feel off?</h3>
          </div>
          <button type="button" onClick={onClose} className="p-2 bg-white border-2 border-on-surface shadow-[2px_2px_0px_black]">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-on-surface/70 leading-relaxed">
          Send this receipt for a private Signal Check. This is not public, and it is not a verdict.
        </p>
        <div className="space-y-2">
          {SUS_REASONS.map(item => (
            <button
              key={item}
              type="button"
              onClick={() => onReason(item)}
              className={cn("w-full text-left px-3 py-2 border-2 font-mono text-[10px] font-black uppercase", reason === item ? "bg-brand-lime border-on-surface" : "bg-white border-on-surface/20")}
            >
              {item}
            </button>
          ))}
        </div>
        <textarea
          value={details}
          onChange={(event) => onDetails(event.target.value)}
          maxLength={500}
          placeholder="Optional extra context"
          className="w-full min-h-24 bg-white border-2 border-on-surface p-3 text-sm"
        />
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={onClose} className="px-4 py-3 bg-white border-2 border-on-surface font-mono text-xs font-black uppercase">
            Cancel
          </button>
          <button type="button" disabled={busy} onClick={onSubmit} className="px-4 py-3 bg-on-surface text-white border-2 border-on-surface font-mono text-xs font-black uppercase disabled:opacity-50">
            {busy ? 'Sending' : 'Send Signal'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
