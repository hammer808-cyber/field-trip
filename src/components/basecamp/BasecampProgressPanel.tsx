import { Award, BarChart3, Zap } from 'lucide-react';
import type { BasecampProgressModel } from '../../logic/basecampViewModel';

interface BasecampProgressPanelProps {
  model: BasecampProgressModel;
  onOpenProfile: () => void;
}

export function BasecampProgressPanel({ model, onOpenProfile }: BasecampProgressPanelProps) {
  return (
    <section
      aria-labelledby="basecamp-progress-heading"
      className="skin-card overflow-hidden border-[var(--skin-border-width)] border-[var(--skin-border)] bg-[var(--skin-text)] text-[var(--skin-surface)] shadow-[var(--skin-card-shadow)]"
    >
      <div className="flex items-start justify-between gap-4 p-5 sm:p-6">
        <div>
          <p className="font-mono text-[8px] font-black uppercase tracking-[0.22em] text-[var(--skin-secondary)]">Field standing</p>
          <h2 id="basecamp-progress-heading" className="mt-1 font-display text-3xl font-black uppercase italic tracking-normal">
            Your Progress
          </h2>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center border-2 border-[var(--skin-surface)] bg-[var(--skin-secondary)] text-[var(--skin-on-secondary)] shadow-[3px_3px_0_var(--skin-surface)]">
          <Award size={22} aria-hidden="true" />
        </div>
      </div>

      <div className="space-y-6 border-t-2 border-[var(--skin-surface)]/30 p-5 sm:p-6">
        <div>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="font-mono text-[8px] font-black uppercase tracking-widest text-[var(--skin-secondary)]">Level {model.level}</p>
              <p className="mt-1 text-sm font-bold">{model.levelTitle}</p>
            </div>
            <p className="font-mono text-[9px] font-black uppercase tracking-wider">{model.xp.toLocaleString()} XP</p>
          </div>
          <div
            className="mt-3 h-4 overflow-hidden border-2 border-[var(--skin-surface)] bg-[var(--skin-surface)]/15"
            role="progressbar"
            aria-label={`Progress to level ${model.nextLevel}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(model.levelProgressPercent)}
          >
            <div className="h-full bg-[var(--skin-secondary)] motion-reduce:transition-none" style={{ width: `${model.levelProgressPercent}%` }} />
          </div>
          <p className="mt-2 font-mono text-[8px] font-bold uppercase tracking-wider text-[var(--skin-surface)]/70">
            {model.xpToNextLevel.toLocaleString()} XP to level {model.nextLevel}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-[var(--skin-surface)]/30 pt-5">
          <div>
            <p className="flex items-center gap-1.5 font-mono text-[8px] font-black uppercase tracking-wider text-[var(--skin-secondary)]">
              <Zap size={12} aria-hidden="true" /> Starter Signals
            </p>
            <p className="mt-2 font-display text-2xl font-black uppercase italic tracking-normal">
              {model.starterApprovedCount}/{model.starterRequiredCount}
            </p>
            <p className="text-[10px] text-[var(--skin-surface)]/65">approved</p>
            <div className="mt-2 h-2 overflow-hidden border border-[var(--skin-surface)] bg-[var(--skin-surface)]/15" role="progressbar" aria-label="Starter Signals progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(model.starterPercent)}>
              <div className="h-full bg-[var(--skin-secondary)]" style={{ width: `${model.starterPercent}%` }} />
            </div>
          </div>
          <div>
            <p className="flex items-center gap-1.5 font-mono text-[8px] font-black uppercase tracking-wider text-[var(--skin-secondary)]">
              <BarChart3 size={12} aria-hidden="true" /> Active deck
            </p>
            <p className="mt-2 font-display text-2xl font-black uppercase italic tracking-normal">
              {model.activeDeckApprovedCount}/{model.activeDeckTotalCount}
            </p>
            <p className="text-[10px] text-[var(--skin-surface)]/65">
              approved{model.activeDeckPendingCount > 0 ? ` · ${model.activeDeckPendingCount} pending` : ''}
            </p>
            <div className="mt-2 h-2 overflow-hidden border border-[var(--skin-surface)] bg-[var(--skin-surface)]/15" role="progressbar" aria-label={`${model.activeDeckName} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(model.activeDeckPercent)}>
              <div className="h-full bg-[var(--skin-accent)]" style={{ width: `${model.activeDeckPercent}%` }} />
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenProfile}
        className="skin-button flex min-h-12 w-full items-center justify-center border-t-2 border-[var(--skin-surface)] bg-[var(--skin-secondary)] px-4 py-3 font-mono text-[9px] font-black uppercase tracking-widest text-[var(--skin-on-secondary)] focus-visible:outline-4 focus-visible:outline-offset-[-4px] focus-visible:outline-[var(--skin-focus)]"
      >
        Open Profile Progress
      </button>
    </section>
  );
}
