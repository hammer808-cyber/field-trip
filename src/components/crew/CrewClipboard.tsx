import React from 'react';
import { cn } from '../../lib/utils';
import { FieldStamp } from '../FieldStamp';

/**
 * Crew clipboard chrome — Field Manual chrome round 2 (Nov 21, 2026).
 * Wraps the Crew page body in the clipboard from Zach's field-trip.win
 * mocks: a dark metal clip centred over the top edge, grid paper, tape
 * strips at the top corners. Content, tabs, and logic live in Crew.tsx
 * and are untouched — this is chrome only.
 *
 * Nov 21 polish (Zach's red pen): a board layer behind the paper —
 * muted, tilted a touch, peeking past the paper on all sides — so the
 * clipboard reads as board → paper → tape, like the Basecamp mock.
 * The clip is bigger, with the ring hole a real clip has.
 *
 * Colours are skin tokens only (no hard-coded hex, P2-1). The clip is a
 * small styled component: surface-muted metal with an ink border and a
 * slot, never a hex grey. The stamps are decorative kit stamps
 * (aria-hidden by construction, pointer-events-none, in-flow strips so
 * they can never cover a button or input).
 */
const GRID_PAPER_STYLE: React.CSSProperties = {
  backgroundImage:
    'repeating-linear-gradient(0deg, color-mix(in srgb, var(--skin-border) 8%, transparent) 0 1px, transparent 1px 28px), ' +
    'repeating-linear-gradient(90deg, color-mix(in srgb, var(--skin-border) 8%, transparent) 0 1px, transparent 1px 28px)',
};

interface CrewClipboardProps {
  children: React.ReactNode;
  className?: string;
}

export function CrewClipboard({ children, className }: CrewClipboardProps) {
  return (
    <div data-testid="crew-clipboard" className={cn('relative mx-auto w-full max-w-5xl', className)}>
      {/* The board: the clipboard itself — a muted sheet peeking out from
          behind the grid paper, tilted a touch so the layers read. It is
          wider than the paper and hangs below it, like a real board. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -inset-x-2 top-4 -bottom-3 rotate-[0.6deg] border-[3px] border-[var(--skin-border)] bg-[var(--skin-surface-muted)] shadow-[6px_6px_0_var(--skin-border)]"
      />

      {/* Metal clip, centred over the top edge of the paper. Bigger than
          the round-2 clip, with the ring hole a real clip has. */}
      <span
        aria-hidden="true"
        data-testid="crew-clipboard-clip"
        className="pointer-events-none absolute left-1/2 top-0 z-20 -translate-x-1/2"
      >
        <span className="block h-14 w-36 rounded-t-md border-[3px] border-[var(--skin-border)] bg-[var(--skin-surface-muted)] shadow-[3px_3px_0_var(--skin-border)]">
          <span className="mx-auto mt-2 block h-4 w-4 rounded-full border-2 border-[var(--skin-border)] bg-[var(--skin-surface)]" />
          <span className="mx-auto mt-2 block h-1 w-24 bg-[var(--skin-border)] opacity-60" />
        </span>
      </span>

      {/* The paper: grid lines, tape at the top corners, stamps top and bottom. */}
      <div
        style={GRID_PAPER_STYLE}
        className="relative z-10 mt-6 overflow-visible border-[3px] border-[var(--skin-border)] bg-[var(--skin-surface)] shadow-[8px_8px_0_var(--skin-border)]"
      >
        <span
          aria-hidden="true"
          data-testid="crew-clipboard-tape"
          className="pointer-events-none absolute -top-3 left-4 z-20"
        >
          <span className="field-tape block" aria-hidden="true" />
        </span>
        <span
          aria-hidden="true"
          data-testid="crew-clipboard-tape"
          className="pointer-events-none absolute -top-3 right-4 z-20"
          style={{ transform: 'rotate(5deg)' }}
        >
          <span className="field-tape block" aria-hidden="true" />
        </span>

        <div className="flex items-start justify-between gap-3 px-4 pt-5 sm:px-6">
          <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-[var(--skin-text-muted)]">
            Field clipboard — Crew
          </p>
          <FieldStamp label="Field log" tone="primary" className="pointer-events-none shrink-0" />
        </div>

        <div className="px-2 py-4 sm:px-4">{children}</div>

        <div className="flex justify-end px-4 pb-4 sm:px-6">
          <FieldStamp label="On file" tone="text" className="pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
