import { ArrowRight } from 'lucide-react';
import type { PlayerGuidanceSnapshot } from '../../logic/playerGuidance';

interface MissionsGuidanceStripProps {
  guidance: PlayerGuidanceSnapshot;
  onPrimary: () => void;
  onSecondary?: () => void;
}

export function MissionsGuidanceStrip({ guidance, onPrimary, onSecondary }: MissionsGuidanceStripProps) {
  return (
    <section
      aria-label="What to do next"
      data-guidance-state={guidance.state}
      className="mb-4 border-[3px] border-[var(--skin-border)] bg-[var(--skin-surface)] px-4 py-3 shadow-[4px_4px_0_var(--skin-border)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[8px] font-black uppercase tracking-[0.22em] text-[var(--skin-text-muted)]">
            Now
          </p>
          <p className="mt-1 font-display text-xl font-black uppercase italic leading-none tracking-normal text-[var(--skin-text)]">
            {guidance.primaryActionLabel}
          </p>
          <p className="mt-2 text-xs font-bold text-[var(--skin-text-muted)]">
            {guidance.shortMessage}
          </p>
          <p className="mt-1 font-mono text-[8px] font-black uppercase tracking-[0.18em] text-[var(--skin-primary)]">
            {guidance.flavorMessage}
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <button
            type="button"
            onClick={onPrimary}
            className="skin-button inline-flex min-h-11 items-center justify-center gap-2 border-2 border-[var(--skin-border)] bg-[var(--skin-primary)] px-4 py-2 font-display text-sm font-black uppercase italic text-[var(--skin-on-primary)] shadow-[3px_3px_0_var(--skin-border)]"
          >
            {guidance.primaryActionLabel}
            <ArrowRight size={16} aria-hidden="true" />
          </button>
          {guidance.secondaryAction && (
            <button
              type="button"
              onClick={onSecondary}
              className="min-h-9 px-2 font-mono text-[10px] font-black uppercase tracking-widest text-on-surface/50 hover:text-on-surface"
            >
              {guidance.secondaryAction.label}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
