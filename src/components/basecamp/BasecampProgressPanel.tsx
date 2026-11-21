import { ArrowRight, BarChart3, Sparkles, Zap } from 'lucide-react';
import type { BasecampProgressModel } from '../../logic/basecampViewModel';
import { BasecampTicketMeter } from './BasecampTicketMeter';
import { BasecampTrailMap } from './BasecampTrailMap';

interface BasecampProgressPanelProps {
  model: BasecampProgressModel;
  onOpenProfile: () => void;
  /** Player's chosen marker sticker id (same value Profile passes to
      the trail map); absent means the default scout footprint. */
  markerStickerId?: string | null;
}

export function BasecampProgressPanel({ model, onOpenProfile, markerStickerId }: BasecampProgressPanelProps) {
  return (
    <section
      aria-labelledby="basecamp-progress-heading"
      className="basecamp-progress relative"
    >
      <span className="basecamp-tape basecamp-tape--left" aria-hidden="true" />
      <div className="relative flex items-start justify-between gap-4 p-5 sm:p-6">
        <div>
          <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-[var(--skin-secondary)]">How you&apos;re doing</p>
          <h2 id="basecamp-progress-heading" className="mt-1 font-display text-3xl font-black uppercase italic tracking-normal">
            Your Progress
          </h2>
          <p className="basecamp-progress-headline mt-2 text-[var(--skin-text)]">
            Level {model.level} · {model.levelTitle}
          </p>
        </div>
        <div className="basecamp-chrome-badge">
          <Sparkles size={20} aria-hidden="true" />
        </div>
      </div>

      <div className="relative space-y-6 px-5 pb-6 sm:px-6">
        {/* Paper sheets (Nov 21, 2026): each component sits on its own
            taped sheet so the trail and the ticket stop blending into
            the card's grid paper. Same trail, same ticket, same numbers. */}
        <div className="basecamp-sheet">
          <span className="basecamp-tape basecamp-tape--left" aria-hidden="true" />
          <BasecampTrailMap xp={model.xp} markerStickerId={markerStickerId} />
        </div>

        <div className="basecamp-sheet">
          <span className="basecamp-tape basecamp-tape--right" aria-hidden="true" />
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="font-mono text-xs font-black uppercase tracking-widest text-[var(--skin-secondary)]">Level {model.level}</p>
              <p className="mt-1 text-sm font-bold">{model.levelTitle}</p>
            </div>
            <p className="font-mono text-xs font-black uppercase tracking-wider">{model.xp.toLocaleString()} XP</p>
          </div>
          <div className="mt-4">
            <BasecampTicketMeter
              percent={model.levelProgressPercent}
              xpToNextLevel={model.xpToNextLevel}
              nextLevel={model.nextLevel}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="basecamp-progress-stat">
            <p className="flex items-center gap-1.5 font-mono text-xs font-black uppercase tracking-wider text-[var(--skin-secondary)]">
              <Zap size={12} aria-hidden="true" /> Starter Signals
            </p>
            <p className="mt-2 font-display text-2xl font-black uppercase italic tracking-normal">
              {model.starterApprovedCount}/{model.starterRequiredCount}
            </p>
            <p className="text-xs text-[var(--skin-text-muted)]">
              {model.starterApprovedCount >= model.starterRequiredCount ? 'unlocked' : 'working toward unlock'}
            </p>
            <div className="mt-2 h-2 overflow-hidden border border-[var(--skin-border)] bg-[var(--skin-surface)]" role="progressbar" aria-label="Starter Signals progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(model.starterPercent)}>
              <div className="h-full bg-[var(--skin-secondary)]" style={{ width: `${model.starterPercent}%` }} />
            </div>
          </div>
          <div className="basecamp-progress-stat">
            <p className="flex items-center gap-1.5 font-mono text-xs font-black uppercase tracking-wider text-[var(--skin-secondary)]">
              <BarChart3 size={12} aria-hidden="true" /> Active deck
            </p>
            <p className="mt-2 font-display text-2xl font-black uppercase italic tracking-normal">
              {model.activeDeckApprovedCount}/{model.activeDeckTotalCount}
            </p>
            <p className="text-xs text-[var(--skin-text-muted)]">
              approved{model.activeDeckPendingCount > 0 ? ` · ${model.activeDeckPendingCount} pending` : ''}
            </p>
            <div className="mt-2 h-2 overflow-hidden border border-[var(--skin-border)] bg-[var(--skin-surface)]" role="progressbar" aria-label={`${model.activeDeckName} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(model.activeDeckPercent)}>
              <div className="h-full bg-[var(--skin-accent)]" style={{ width: `${model.activeDeckPercent}%` }} />
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenProfile}
        className="basecamp-commercial-cta relative flex min-h-14 w-full items-center justify-center gap-2 px-4 py-3 font-mono text-xs font-black uppercase tracking-widest focus-visible:outline-4 focus-visible:outline-offset-[-4px] focus-visible:outline-[var(--skin-focus)]"
      >
        Open Profile Progress
        <ArrowRight size={16} aria-hidden="true" />
      </button>
    </section>
  );
}
