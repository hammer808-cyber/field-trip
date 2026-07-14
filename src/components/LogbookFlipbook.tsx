import React, { useMemo } from 'react';
import { Archive, CalendarDays, CheckCircle2, Clock3, Heart, MapPin, RotateCcw, Sparkles, Sticker, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getRewardMetadata } from '../data/rewardRegistry';
import { isArchivedOrDeletedProof, getEntryEarnedXp, getEntryFieldNote, getEntryChallengeId, getProofLogbookCounts } from '../logic/proofDistribution';
import {
  getAttachedStickerIds,
  getLogbookEntryDate,
  getLogbookStatusPresentation,
  getNeedsMoreProofInstructions,
  getNeedsMoreProofRoute,
  getProofReactionCount,
  getProofZineState,
  getSafeProofLocation,
} from '../logic/proofJournal';
import { cn } from '../lib/utils';
import { FlipbookShell } from './FlipbookShell';
import { ProofImage } from './ProofImage';

interface LogbookFlipbookProps {
  entries: any[];
  displayName: string;
  seasonName: string;
  explorerTypeName: string;
  proofStickerAssignments?: Record<string, string[]>;
  hasMore?: boolean;
  loadingMore?: boolean;
  onRequestMore?: () => void;
}

const STATUS_STYLES = {
  approved: 'bg-brand-lime text-on-surface border-on-surface',
  pending: 'bg-brand-yellow text-on-surface border-on-surface',
  correction: 'bg-brand-orange text-white border-on-surface',
  rejected: 'bg-on-surface text-white border-on-surface',
};

const STATUS_ICONS = {
  approved: CheckCircle2,
  pending: Clock3,
  correction: RotateCcw,
  rejected: XCircle,
};

export function LogbookFlipbook({
  entries,
  displayName,
  seasonName,
  explorerTypeName,
  proofStickerAssignments = {},
  hasMore = false,
  loadingMore = false,
  onRequestMore,
}: LogbookFlipbookProps) {
  const navigate = useNavigate();
  const journalEntries = useMemo(
    () => entries.filter(entry => !isArchivedOrDeletedProof(entry)),
    [entries],
  );
  const counts = useMemo(() => getProofLogbookCounts(journalEntries), [journalEntries]);

  const pages = useMemo(() => [
    <LogbookCover
      key="logbook-cover"
      displayName={displayName}
      seasonName={seasonName}
      explorerTypeName={explorerTypeName}
      counts={counts}
    />,
    ...journalEntries.map(entry => (
      <LogbookProofPage key={entry.id} entry={entry} proofStickerAssignments={proofStickerAssignments} onRepair={() => navigate(getNeedsMoreProofRoute(entry))} />
    )),
  ], [counts, displayName, explorerTypeName, journalEntries, navigate, proofStickerAssignments, seasonName]);

  const fallbackItems = useMemo(
    () => journalEntries.map(entry => (
      <LogbookFallbackCard key={entry.id} entry={entry} onRepair={() => navigate(getNeedsMoreProofRoute(entry))} />
    )),
    [journalEntries, navigate],
  );

  return (
    <FlipbookShell
      ariaLabel="Personal Fieldtrip Logbook"
      pages={pages}
      fallbackItems={fallbackItems}
      pageParam="page"
      storageKey="fieldtrip.logbook.view"
      hasMore={hasMore}
      loadingMore={loadingMore}
      onRequestMore={onRequestMore}
    />
  );
}

function LogbookCover({ displayName, seasonName, explorerTypeName, counts }: any) {
  return (
    <div className="h-full min-h-[30rem] flex flex-col justify-between border-[3px] border-on-surface bg-[#183B32] text-white p-6 sm:p-8 shadow-[inset_0_0_0_6px_rgba(255,255,255,0.08)]">
      <div>
        <p className="font-mono text-[9px] font-black uppercase tracking-[0.3em] text-brand-lime">Personal field archive</p>
        <h3 className="font-display text-5xl sm:text-6xl font-black uppercase italic leading-[0.82] mt-4 break-words">{displayName}</h3>
        <div className="w-20 h-2 bg-brand-orange mt-6" />
      </div>
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-2 font-mono text-[9px] uppercase">
          <div className="border border-white/25 p-3"><span className="block opacity-55">Season</span><strong>{seasonName}</strong></div>
          <div className="border border-white/25 p-3"><span className="block opacity-55">Explorer Type</span><strong>{explorerTypeName}</strong></div>
          <div className="border border-white/25 p-3"><span className="block opacity-55">Submitted</span><strong>{counts.totalSubmitted}</strong></div>
          <div className="border border-white/25 p-3"><span className="block opacity-55">Approved</span><strong>{counts.approvedVerified}</strong></div>
        </div>
        <p className="font-serif italic text-xl text-white/75">Get outside. Cause a scene. Get receipts.</p>
      </div>
    </div>
  );
}

function LogbookProofPage({ entry, proofStickerAssignments, onRepair }: { entry: any; proofStickerAssignments: Record<string, string[]>; onRepair: () => void }) {
  const presentation = getLogbookStatusPresentation(entry);
  const StatusIcon = STATUS_ICONS[presentation.tone];
  const stickers = getAttachedStickerIds(entry, proofStickerAssignments);
  const fieldNote = getEntryFieldNote(entry);
  const location = getSafeProofLocation(entry);
  const reactionCount = getProofReactionCount(entry);
  const xp = getEntryEarnedXp(entry);
  const title = entry.tripTitle || entry.challengeTitle || entry.missionTitle || getEntryChallengeId(entry) || 'Field Mission';

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="relative h-64 sm:h-72 border-[3px] border-on-surface bg-on-surface/5 overflow-hidden shadow-[4px_4px_0px_rgba(0,0,0,0.15)]">
        <ProofImage
          entry={entry}
          alt={`${title} proof`}
          className="w-full h-full object-cover"
          showMetadataStamp={false}
          showDiagnosticsOverlay={false}
        />
        <div className={cn('absolute top-3 left-3 px-2.5 py-1.5 border-2 shadow-[2px_2px_0px_black] flex items-center gap-1.5 font-mono text-[8px] font-black uppercase', STATUS_STYLES[presentation.tone])}>
          <StatusIcon className="w-3.5 h-3.5" aria-hidden="true" />
          {presentation.label}
        </div>
      </div>

      <div className="space-y-3 text-left flex-1">
        <div>
          <p className="font-mono text-[8px] uppercase font-black tracking-widest text-brand-orange">{getEntryChallengeId(entry) || 'FIELD RECEIPT'}</p>
          <h3 className="font-display text-2xl sm:text-3xl uppercase italic font-black leading-none">{title}</h3>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-2 text-[9px] font-mono font-black uppercase text-on-surface/60">
          <span className="inline-flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />{getLogbookEntryDate(entry)}</span>
          {location && <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{location}</span>}
          <span className="inline-flex items-center gap-1"><Heart className="w-3.5 h-3.5" />{reactionCount} reactions</span>
          <span className="inline-flex items-center gap-1"><Archive className="w-3.5 h-3.5" />{getProofZineState(entry)}</span>
        </div>

        <blockquote className="border-l-4 border-brand-cyan pl-3 font-serif italic text-sm leading-relaxed text-on-surface/75">
          {fieldNote || 'No field note was attached to this receipt.'}
        </blockquote>

        <div className="flex flex-wrap items-center gap-2">
          {presentation.status === 'approved' && (
            <span className="inline-flex items-center gap-1 bg-brand-magenta text-white border-2 border-on-surface px-2 py-1 font-mono text-[9px] font-black uppercase shadow-[2px_2px_0px_black]">
              <Sparkles className="w-3 h-3" /> {xp} XP awarded
            </span>
          )}
          {stickers.map(stickerId => (
            <span key={stickerId} className="inline-flex items-center gap-1 bg-white border border-on-surface/25 px-2 py-1 font-mono text-[8px] font-black uppercase">
              <Sticker className="w-3 h-3" /> {getRewardMetadata(stickerId).label}
            </span>
          ))}
        </div>

        <p className="font-mono text-[9px] leading-relaxed text-on-surface/55">{presentation.detail}</p>

        {presentation.status === 'needs_more_proof' && (
          <div className="border-2 border-brand-orange bg-brand-orange/5 p-3 space-y-3">
            <p className="font-mono text-[9px] font-black uppercase text-brand-orange">Reviewer request</p>
            <p className="text-sm font-serif italic">{getNeedsMoreProofInstructions(entry)}</p>
            <button type="button" onClick={onRepair} className="min-h-11 w-full bg-brand-orange text-white border-2 border-on-surface shadow-[3px_3px_0px_black] font-mono text-[10px] font-black uppercase">
              Add requested proof
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function LogbookFallbackCard({ entry, onRepair }: { entry: any; onRepair: () => void }) {
  const presentation = getLogbookStatusPresentation(entry);
  const title = entry.tripTitle || entry.challengeTitle || entry.missionTitle || getEntryChallengeId(entry) || 'Field Mission';
  return (
    <article className="grid grid-cols-[7rem_1fr] gap-4 bg-white border-2 border-on-surface p-3 shadow-[4px_4px_0px_black] min-h-36">
      <div className="h-28 border-2 border-on-surface overflow-hidden">
        <ProofImage entry={entry} alt={`${title} proof`} showMetadataStamp={false} showDiagnosticsOverlay={false} />
      </div>
      <div className="text-left min-w-0 space-y-2">
        <span className={cn('inline-block px-2 py-1 border font-mono text-[8px] font-black uppercase', STATUS_STYLES[presentation.tone])}>{presentation.label}</span>
        <h3 className="font-display text-xl font-black uppercase italic leading-none">{title}</h3>
        <p className="font-serif italic text-xs line-clamp-2">{getEntryFieldNote(entry) || 'No field note attached.'}</p>
        {presentation.status === 'needs_more_proof' && <button type="button" onClick={onRepair} className="min-h-11 px-3 border-2 border-on-surface bg-brand-orange text-white font-mono text-[9px] font-black uppercase">Add proof</button>}
      </div>
    </article>
  );
}
