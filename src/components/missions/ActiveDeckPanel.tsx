import { Lock, Radio, Zap } from 'lucide-react';
import type { DeckPack } from '../../types/deckPacks';
import { cn } from '../../lib/utils';
import { DeckArtwork } from '../DeckArtwork';
import { DeckProgressMeter } from './DeckProgressMeter';

interface ActiveDeckPanelProps {
  pack: DeckPack | null | undefined;
  displayName: string;
  approvedCount: number;
  pendingCount: number;
  totalCount: number;
  approvedPercent: number;
  pendingPercent: number;
  locked: boolean;
  lockReason?: string;
  onCoverAction?: () => void;
  coverActionLabel?: string;
  className?: string;
}

export function ActiveDeckPanel({
  pack,
  displayName,
  approvedCount,
  pendingCount,
  totalCount,
  approvedPercent,
  pendingPercent,
  locked,
  lockReason,
  onCoverAction,
  coverActionLabel = 'Draw from active deck',
  className,
}: ActiveDeckPanelProps) {
  const subtitle = pack?.deckSubtitle || pack?.description || 'Deck details unavailable.';

  return (
    <section
      aria-labelledby="active-deck-heading"
      className={cn(
        'skin-card relative overflow-hidden border-[var(--skin-border-width)] border-[var(--skin-border)] bg-[var(--skin-surface)] shadow-[var(--skin-card-shadow)]',
        className,
      )}
    >
      <div className="absolute inset-0 pointer-events-none opacity-[var(--skin-texture-opacity)] [background-image:var(--skin-surface-texture)]" />
      <div className="relative grid grid-cols-[104px_minmax(0,1fr)] gap-4 p-4 sm:grid-cols-[132px_minmax(0,1fr)] sm:gap-6 sm:p-5">
        <button
          type="button"
          onClick={onCoverAction}
          disabled={!onCoverAction || locked}
          aria-label={coverActionLabel}
          className={cn(
            'group relative aspect-[3/4] w-full overflow-hidden border-[3px] border-[var(--skin-border)] bg-[var(--skin-surface-muted)] shadow-[5px_6px_0_var(--skin-border)] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[var(--skin-focus)]',
            onCoverAction && !locked ? 'cursor-pointer' : 'cursor-default',
          )}
        >
          <DeckArtwork
            pack={pack}
            alt={`${pack?.title || pack?.packName || 'Active deck'} cover`}
            imageClassName={onCoverAction && !locked ? 'group-hover:scale-[1.03]' : undefined}
            grayscale=""
          />
          <span className="absolute bottom-2 left-2 z-10 border-2 border-[var(--skin-border)] bg-[var(--skin-surface)] px-2 py-1 font-mono text-[7px] font-black uppercase tracking-widest text-[var(--skin-text)] shadow-[2px_2px_0_var(--skin-border)]">
            {pack?.deckCode || 'Active deck'}
          </span>
        </button>

        <div className="flex min-w-0 flex-col justify-between gap-4 py-0.5">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex min-h-7 items-center gap-2 border-2 border-[var(--skin-border)] bg-[var(--skin-secondary)] px-2.5 py-1 font-mono text-[8px] font-black uppercase tracking-widest text-[var(--skin-on-secondary)] shadow-[2px_2px_0_var(--skin-border)]">
                {locked ? <Lock size={12} aria-hidden="true" /> : <Radio size={12} aria-hidden="true" />}
                {locked ? 'Deck locked' : 'Active deck'}
              </span>
              {pack?.season && (
                <span className="font-mono text-[8px] font-black uppercase tracking-widest text-[var(--skin-text-muted)]">
                  {pack.season}
                </span>
              )}
            </div>

            <div>
              <p className="mb-1 font-mono text-[8px] font-black uppercase tracking-[0.22em] text-[var(--skin-primary)]">
                Current mission pack
              </p>
              <h2 id="active-deck-heading" className="break-words font-display text-2xl font-black uppercase italic leading-[0.92] tracking-normal text-[var(--skin-text)] sm:text-4xl">
                {displayName}
              </h2>
              <p className="mt-2 line-clamp-3 max-w-xl text-xs leading-relaxed text-[var(--skin-text-muted)] sm:text-sm">
                {subtitle}
              </p>
            </div>

            {locked && (
              <p className="flex items-start gap-2 border-l-4 border-[var(--skin-warning)] bg-[var(--skin-surface-muted)] px-3 py-2 font-mono text-[9px] font-bold uppercase leading-relaxed text-[var(--skin-text)]">
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {lockReason || 'Private field assignment'}
              </p>
            )}
          </div>

          <DeckProgressMeter
            approvedCount={approvedCount}
            pendingCount={pendingCount}
            totalCount={totalCount}
            approvedPercent={approvedPercent}
            pendingPercent={pendingPercent}
          />
        </div>
      </div>

      <div className="relative flex items-center justify-between border-t-2 border-[var(--skin-border)] bg-[var(--skin-text)] px-4 py-2 text-[var(--skin-surface)]">
        <span className="font-mono text-[8px] font-black uppercase tracking-[0.2em]">
          {locked ? 'Access restricted' : `${Math.max(0, totalCount - approvedCount)} signals remaining`}
        </span>
        <Zap size={14} className="text-[var(--skin-secondary)]" aria-hidden="true" />
      </div>
    </section>
  );
}
