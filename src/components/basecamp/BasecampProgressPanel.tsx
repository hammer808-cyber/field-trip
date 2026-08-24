import { ArrowRight, BarChart3, Sparkles, Zap } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { BasecampProgressModel } from '../../logic/basecampViewModel';

interface BasecampProgressPanelProps {
  model: BasecampProgressModel;
  onOpenProfile: () => void;
}

export function BasecampProgressPanel({ model, onOpenProfile }: BasecampProgressPanelProps) {
  return (
    <section
      aria-labelledby="basecamp-progress-heading"
      className="basecamp-progress relative overflow-hidden text-white"
    >
      <div className="basecamp-shine" aria-hidden="true" />
      <div className="relative flex items-start justify-between gap-4 p-5 sm:p-6">
        <div>
          <p className="font-mono text-[8px] font-black uppercase tracking-[0.22em] text-[var(--skin-secondary)]">Field standing</p>
          <h2 id="basecamp-progress-heading" className="mt-1 font-display text-3xl font-black uppercase italic tracking-normal">
            Your Progress
          </h2>
        </div>
        <div className="basecamp-chrome-badge">
          <Sparkles size={20} aria-hidden="true" />
        </div>
      </div>

      <div className="relative space-y-6 px-5 pb-6 sm:px-6">
        <div className="grid items-center gap-5 sm:grid-cols-[150px_1fr]">
          <div className="basecamp-progress-dial" style={{ '--progress': `${model.levelProgressPercent * 3.6}deg` } as CSSProperties}>
            <div><strong>{Math.round(model.levelProgressPercent)}%</strong><span>to level {model.nextLevel}</span></div>
          </div>
          <div>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="font-mono text-[8px] font-black uppercase tracking-widest text-[var(--skin-secondary)]">Level {model.level}</p>
              <p className="mt-1 text-sm font-bold">{model.levelTitle}</p>
            </div>
            <p className="font-mono text-[9px] font-black uppercase tracking-wider">{model.xp.toLocaleString()} XP</p>
          </div>
          <div
            className="basecamp-progress-track mt-4 h-3 overflow-hidden"
            role="progressbar"
            aria-label={`Progress to level ${model.nextLevel}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(model.levelProgressPercent)}
          >
            <div className="h-full motion-reduce:transition-none" style={{ width: `${model.levelProgressPercent}%` }} />
          </div>
          <p className="mt-2 font-mono text-[8px] font-bold uppercase tracking-wider text-[var(--skin-surface)]/70">
            {model.xpToNextLevel.toLocaleString()} XP to level {model.nextLevel}
          </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="basecamp-progress-stat">
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
          <div className="basecamp-progress-stat">
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
        className="basecamp-commercial-cta relative flex min-h-14 w-full items-center justify-center gap-2 px-4 py-3 font-mono text-[9px] font-black uppercase tracking-widest focus-visible:outline-4 focus-visible:outline-offset-[-4px] focus-visible:outline-[var(--skin-focus)]"
      >
        Open Profile Progress
        <ArrowRight size={16} aria-hidden="true" />
      </button>
    </section>
  );
}
