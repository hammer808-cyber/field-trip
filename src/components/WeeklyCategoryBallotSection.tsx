import React from 'react';
import { Check, Ticket } from 'lucide-react';
import type { Entry, VoteCategory } from '../types/game';
import { getWeeklyCategoryDisplay } from '../logic/weeklyCategories';
import { getProofImageReference } from '../logic/proofDistribution';
import { cn } from '../lib/utils';

function getEntryDisplayName(entry: Entry): string {
  return (entry as any).userName || (entry as any).displayName || (entry as any).username || 'Field Agent';
}

function getEntryMissionTitle(entry: Entry): string {
  return (entry as any).tripTitle || (entry as any).missionTitle || (entry as any).challengeTitle || 'Field Receipt';
}

/**
 * One award booth: the candidates for a single accolade, one vote per
 * award. Presentational only (Slice 2) — VotingHub owns the picks and
 * the file call, so this renders from props and is testable without
 * AppContext or Firestore.
 */
export function WeeklyCategoryBallotSection({
  category,
  candidates,
  selectedEntryId,
  filedEntryId,
  isVotingOpen,
  isFiling,
  hasChanges,
  onSelect,
  onFile,
}: {
  category: VoteCategory;
  candidates: Entry[];
  selectedEntryId: string | null;
  filedEntryId: string | null;
  isVotingOpen: boolean;
  isFiling: boolean;
  hasChanges: boolean;
  onSelect: (entryId: string) => void;
  onFile: () => void;
}) {
  const meta = getWeeklyCategoryDisplay(category);
  const canFile = isVotingOpen && Boolean(selectedEntryId) && hasChanges && !isFiling;

  return (
    <section
      data-category={category}
      data-testid={`category-ballot-${category}`}
      aria-label={`${meta.awardLabel} ballot`}
      className="space-y-4"
    >
      <div className="relative overflow-hidden border-4 border-on-surface bg-paper p-5 shadow-[8px_8px_0px_black]">
        <p className="font-mono text-xs font-black uppercase tracking-[0.25em] text-brand-orange">Award Booth</p>
        <h3 className="mt-2 font-display text-4xl font-black italic uppercase leading-none tracking-tighter sm:text-5xl">
          {meta.awardLabel}
        </h3>
        <p className="mt-2 font-serif italic text-on-surface/65">{meta.awardCopy}</p>
        <p className="mt-3 font-mono text-xs font-black uppercase tracking-widest text-on-surface/60">
          {meta.label} // One vote per voter // {candidates.length} nominee{candidates.length === 1 ? '' : 's'}
        </p>
      </div>

      {candidates.length === 0 ? (
        <div className="border-4 border-dashed border-on-surface/20 bg-on-surface/[0.03] p-8 text-center">
          <p className="font-display text-2xl font-black italic uppercase text-on-surface/60">No nominees for this award yet</p>
          <p className="mt-2 font-serif italic text-on-surface/55">
            No approved receipts were assigned to {meta.label} this week.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {candidates.map((candidate, index) => {
            const entryId = String((candidate as any).entryId || candidate.id);
            const selected = selectedEntryId === entryId;
            const filed = filedEntryId === entryId && !hasChanges;
            const image = getProofImageReference(candidate as any);
            const note = String((candidate as any).fieldNote || '').trim();
            return (
              <article
                key={entryId}
                data-entry-id={entryId}
                className={cn(
                  'relative border-4 border-on-surface bg-[#fffdf7] shadow-[8px_8px_0px_black] overflow-hidden',
                  selected ? 'ring-4 ring-brand-lime' : '',
                )}
              >
                <div className="relative aspect-[4/3] overflow-hidden border-b-4 border-on-surface bg-on-surface">
                  {image ? (
                    <img
                      src={image}
                      alt={`Proof submitted by ${getEntryDisplayName(candidate)} for ${getEntryMissionTitle(candidate)}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center font-mono text-xs uppercase text-white/50">
                      Missing image
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 text-white">
                    <p className="font-display text-2xl font-black italic uppercase leading-none">{getEntryDisplayName(candidate)}</p>
                    <p className="mt-1 font-mono text-xs font-black uppercase tracking-widest text-white/75">
                      {getEntryMissionTitle(candidate)}
                    </p>
                  </div>
                </div>
                <div className="space-y-3 p-4">
                  <p className="font-mono text-xs font-black uppercase tracking-widest text-on-surface/60">
                    Receipt #{index + 1}
                  </p>
                  {note && (
                    <p className="font-serif text-sm font-bold italic leading-relaxed text-on-surface/75">&ldquo;{note}&rdquo;</p>
                  )}
                  <button
                    type="button"
                    onClick={() => onSelect(entryId)}
                    disabled={!isVotingOpen}
                    aria-pressed={selected}
                    aria-label={`Vote for ${getEntryDisplayName(candidate)} for ${meta.label}`}
                    className={cn(
                      'flex min-h-12 w-full items-center justify-center gap-2 border-4 border-on-surface px-4 py-3 font-display text-xl font-black italic uppercase shadow-[5px_5px_0px_black]',
                      selected ? 'bg-brand-lime text-on-surface' : 'bg-brand-orange text-white',
                    )}
                  >
                    {selected && <Check className="h-5 w-5" aria-hidden="true" />}
                    {filed ? 'Vote Filed' : selected ? 'Stamped Pick' : 'Stamp This'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onFile}
          disabled={!canFile}
          className={cn(
            'min-h-12 border-4 border-on-surface px-4 py-3 font-display text-xl font-black italic uppercase shadow-[5px_5px_0px_black]',
            canFile ? 'bg-brand-lime text-on-surface' : 'bg-white text-on-surface/60',
          )}
        >
          {isFiling ? 'Filing...' : filedEntryId ? 'Update My Vote' : 'File My Vote'}
        </button>
        <p className="flex items-center gap-2 font-mono text-xs font-black uppercase tracking-widest text-on-surface/60">
          <Ticket className="h-4 w-4" aria-hidden="true" />
          {selectedEntryId
            ? hasChanges
              ? 'Pick changed — file it to count.'
              : 'Your vote for this award is filed.'
            : 'Pick one photo for this award.'}
        </p>
      </div>
    </section>
  );
}
