import { ArrowRight, Radio, Zap } from 'lucide-react';
import type { BasecampNextActionModel } from '../../logic/basecampViewModel';
import type { DeckPack } from '../../types/deckPacks';
import { BasecampMissionSummary } from './BasecampMissionSummary';
import { DeckArtwork } from '../DeckArtwork';

interface BasecampNextActionPanelProps {
  model: BasecampNextActionModel;
  pack: DeckPack | null;
  onAction: () => void;
  onSecondaryAction?: () => void;
}

export function BasecampNextActionPanel({ model, pack, onAction, onSecondaryAction }: BasecampNextActionPanelProps) {
  const isUrgent = model.urgency === 'critical' || model.urgency === 'high';
  // Nov 18, 2026: the draw-another state (DRAW_MISSION) consolidates
  // into one compact panel — deck thumb + name + subtitle + XP on top,
  // the pending line small above the button, View Proof Status small
  // under it. The huge "DRAW ANOTHER MISSION" headline and the "Ready
  // for another receipt." eyebrow are dropped; the button carries those
  // words now. Every other state keeps the old two-column layout below.
  const isCompactDraw = model.guidanceState === 'DRAW_MISSION';
  return (
    <section
      aria-labelledby="basecamp-next-action-heading"
      data-guidance-state={model.guidanceState}
      data-guidance-urgency={model.urgency}
      className={`basecamp-today skin-card relative overflow-visible border-[var(--skin-border-width)] border-[var(--skin-border)] bg-[var(--skin-surface)] shadow-[var(--skin-card-shadow)] ${isUrgent ? 'basecamp-today--urgent' : ''}`}
    >
      <span className="basecamp-tape basecamp-tape--left" aria-hidden="true" />
      <span className="basecamp-tape basecamp-tape--right" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 opacity-[var(--skin-texture-opacity)] [background-image:var(--skin-surface-texture)]" />
      <div className="relative flex min-h-10 items-center justify-between gap-3 border-b-2 border-[var(--skin-border)] bg-[var(--skin-text)] px-4 py-2 text-[var(--skin-surface)]">
        <span className="flex items-center gap-2 font-mono text-xs font-black uppercase tracking-[0.22em]">
          <Radio size={13} className="text-[var(--skin-secondary)]" aria-hidden="true" />
          Today at Basecamp
        </span>
        <span className="font-mono text-xs font-black uppercase tracking-widest text-[var(--skin-secondary)]">
          {model.statusLabel}
        </span>
      </div>

      {isCompactDraw ? (
        <div className="basecamp-paper relative flex flex-col gap-3 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="relative aspect-square w-16 shrink-0 overflow-hidden border-[3px] border-[var(--skin-border)] bg-[var(--skin-surface)] shadow-[4px_4px_0_var(--skin-border)] sm:w-20">
              <DeckArtwork pack={pack} grayscale="" />
            </div>
            <div className="min-w-0">
              <h2
                id="basecamp-next-action-heading"
                className="break-words font-display text-xl font-black uppercase italic leading-none tracking-normal text-[var(--skin-text)]"
              >
                {pack?.packName || model.mission?.deckName || 'Missions'}
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-[var(--skin-text-muted)]">
                {pack?.deckSubtitle || pack?.description || 'Open Missions to choose your next assignment.'}
              </p>
              {model.mission?.rewardXp !== null && model.mission?.rewardXp !== undefined && (
                <span className="mt-2 inline-flex w-fit items-center gap-1.5 border-2 border-[var(--skin-border)] bg-[var(--skin-secondary)] px-2 py-1 font-mono text-xs font-black uppercase tracking-widest text-[var(--skin-on-secondary)] shadow-[2px_2px_0_var(--skin-border)]">
                  <Zap size={12} aria-hidden="true" />
                  {model.mission.rewardXp} base XP
                </span>
              )}
            </div>
          </div>

          <p className="text-sm font-bold leading-snug text-[var(--skin-text)]">
            {model.description}
          </p>

          <button
            type="button"
            onClick={onAction}
            data-basecamp-primary="true"
            className="basecamp-next-cta skin-button flex min-h-14 w-full items-center justify-center gap-3 border-[3px] border-[var(--skin-border)] bg-[var(--skin-primary)] px-4 py-4 font-display text-xl font-black uppercase italic tracking-normal text-[var(--skin-on-primary)] shadow-[var(--skin-button-shadow)] transition-transform focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[var(--skin-focus)] active:translate-y-1 active:shadow-none disabled:opacity-60 sm:text-2xl"
          >
            {model.action.label}
            <ArrowRight size={24} strokeWidth={3} aria-hidden="true" />
          </button>
          {model.secondaryAction && onSecondaryAction && (
            <button
              type="button"
              onClick={onSecondaryAction}
              className="min-h-10 w-full px-2 text-center font-mono text-xs font-black uppercase tracking-widest text-[var(--skin-text-muted)] hover:text-[var(--skin-text)] sm:w-fit"
            >
              {model.secondaryAction.label}
            </button>
          )}
        </div>
      ) : (
      <div className="basecamp-paper relative grid overflow-hidden lg:grid-cols-[minmax(0,1.45fr)_minmax(220px,0.55fr)]">
        {/* Nov 17, 2026: no forced min-height — the old 310px floor left
            ~160px of empty middle on a panel whose content is ~150px. */}
        <div className="flex flex-col justify-start gap-6 p-5 sm:p-7 lg:p-8">
          <div className="space-y-4">
            <p className="font-mono text-xs font-black uppercase tracking-[0.24em] text-[var(--skin-text)]">
              {model.eyebrow}
            </p>
            <h2
              id="basecamp-next-action-heading"
              className="max-w-[16ch] break-words font-display text-4xl font-black uppercase italic leading-[0.88] tracking-normal text-[var(--skin-text)] sm:text-5xl lg:text-6xl"
            >
              {model.title}
            </h2>
            <p className="max-w-xl text-sm font-bold leading-snug text-[var(--skin-text)] sm:text-base">
              {model.description}
            </p>
          </div>

          <div className="flex flex-col items-stretch gap-3 sm:items-start">
            {isUrgent && (
              <span className="basecamp-next-stamp" aria-hidden="true">Do this</span>
            )}
            <button
              type="button"
              onClick={onAction}
              data-basecamp-primary="true"
              className="basecamp-next-cta skin-button flex min-h-14 w-full items-center justify-center gap-3 border-[3px] border-[var(--skin-border)] bg-[var(--skin-primary)] px-4 py-4 font-display text-xl font-black uppercase italic tracking-normal text-[var(--skin-on-primary)] shadow-[var(--skin-button-shadow)] transition-transform focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[var(--skin-focus)] active:translate-y-1 active:shadow-none disabled:opacity-60 sm:w-fit sm:min-w-[280px] sm:text-2xl"
            >
              {model.action.label}
              <ArrowRight size={24} strokeWidth={3} aria-hidden="true" />
            </button>
            {model.secondaryAction && onSecondaryAction && (
              <button
                type="button"
                onClick={onSecondaryAction}
                className="min-h-10 w-full px-2 text-center font-mono text-xs font-black uppercase tracking-widest text-[var(--skin-text-muted)] hover:text-[var(--skin-text)] sm:w-fit"
              >
                {model.secondaryAction.label}
              </button>
            )}
          </div>
        </div>

        <BasecampMissionSummary mission={model.mission} pack={pack} panelDescription={model.description} />
      </div>
      )}
    </section>
  );
}
