import { ArrowRight, Radio } from 'lucide-react';
import type { BasecampNextActionModel } from '../../logic/basecampViewModel';
import type { DeckPack } from '../../types/deckPacks';
import { BasecampMissionSummary } from './BasecampMissionSummary';

interface BasecampNextActionPanelProps {
  model: BasecampNextActionModel;
  pack: DeckPack | null;
  onAction: () => void;
}

export function BasecampNextActionPanel({ model, pack, onAction }: BasecampNextActionPanelProps) {
  return (
    <section
      aria-labelledby="basecamp-next-action-heading"
      className="skin-card relative overflow-hidden border-[var(--skin-border-width)] border-[var(--skin-border)] bg-[var(--skin-surface)] shadow-[var(--skin-card-shadow)]"
    >
      <div className="pointer-events-none absolute inset-0 opacity-[var(--skin-texture-opacity)] [background-image:var(--skin-surface-texture)]" />
      <div className="relative flex min-h-10 items-center justify-between gap-3 border-b-2 border-[var(--skin-border)] bg-[var(--skin-text)] px-4 py-2 text-[var(--skin-surface)]">
        <span className="flex items-center gap-2 font-mono text-[8px] font-black uppercase tracking-[0.22em]">
          <Radio size={13} className="text-[var(--skin-secondary)]" aria-hidden="true" />
          Today at Basecamp
        </span>
        <span className="font-mono text-[8px] font-black uppercase tracking-widest text-[var(--skin-secondary)]">
          {model.statusLabel}
        </span>
      </div>

      <div className="relative grid lg:grid-cols-[minmax(0,1.45fr)_minmax(220px,0.55fr)]">
        <div className="flex min-h-[310px] flex-col justify-between gap-8 p-5 sm:p-7 lg:p-8">
          <div className="space-y-4">
            <p className="font-mono text-[9px] font-black uppercase tracking-[0.24em] text-[var(--skin-primary)]">
              {model.eyebrow}
            </p>
            <h2
              id="basecamp-next-action-heading"
              className="max-w-[16ch] break-words font-display text-4xl font-black uppercase italic leading-[0.88] tracking-normal text-[var(--skin-text)] sm:text-5xl lg:text-6xl"
            >
              {model.title}
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-[var(--skin-text-muted)] sm:text-base">
              {model.description}
            </p>
          </div>

          <button
            type="button"
            onClick={onAction}
            className="skin-button flex min-h-14 w-full items-center justify-center gap-3 border-[3px] border-[var(--skin-border)] bg-[var(--skin-primary)] px-4 py-4 font-display text-xl font-black uppercase italic tracking-normal text-[var(--skin-on-primary)] shadow-[var(--skin-button-shadow)] transition-transform focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[var(--skin-focus)] active:translate-y-1 active:shadow-none sm:w-fit sm:min-w-[260px] sm:text-2xl"
          >
            {model.action.label}
            <ArrowRight size={24} strokeWidth={3} aria-hidden="true" />
          </button>
        </div>

        <BasecampMissionSummary mission={model.mission} pack={pack} />
      </div>
    </section>
  );
}
