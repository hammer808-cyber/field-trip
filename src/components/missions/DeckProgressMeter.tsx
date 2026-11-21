import type { CSSProperties } from 'react';
import { cn } from '../../lib/utils';

interface DeckProgressMeterProps {
  approvedCount: number;
  pendingCount?: number;
  totalCount: number;
  approvedPercent: number;
  pendingPercent?: number;
  compact?: boolean;
  className?: string;
}

type StubState = 'approved' | 'pending' | 'remaining';

// Ticket stubs, variant 3 in the Nov 21 progress-bar reference (Zach's
// word): one stub per mission. Approved stubs are lime-filled, pending
// stubs are half-punched (orange left half, paper right half), and
// remaining stubs are empty paper. The side notches are cut with a mask
// so they read as ticket stubs on every skin; if a browser ignores the
// mask the stub still renders as a bordered ticket.
function stubNotchStyle(notchRadius: number): CSSProperties {
  const gradient = (position: string) =>
    `radial-gradient(circle ${notchRadius}px at ${position} 50%, transparent ${notchRadius - 0.5}px, black ${notchRadius}px)`;
  return {
    maskImage: `${gradient('0px')}, ${gradient('100%')}`,
    maskComposite: 'intersect',
    WebkitMaskImage: `${gradient('0px')}, ${gradient('100%')}`,
    WebkitMaskComposite: 'source-in',
  };
}

function stubClassName(state: StubState, compact: boolean): string {
  return cn(
    'shrink-0 border-2 border-[var(--skin-border)]',
    compact ? 'h-5' : 'h-6',
    state === 'approved' && 'bg-[var(--skin-secondary)]',
    state === 'remaining' && 'bg-[var(--skin-surface-muted)]',
  );
}

function stubStyle(state: StubState, compact: boolean): CSSProperties {
  // Small stubs with a wrap so a 25-mission deck fits a 390px phone in
  // two rows with no horizontal scroll: at 20px min-width (16px compact)
  // a 358px row holds 15 stubs (12 compact), and stubs grow to a 44px
  // cap so a 3-mission starter deck still reads as tickets, not slivers.
  const minWidth = compact ? 16 : 20;
  const maxWidth = compact ? 36 : 44;
  const style: CSSProperties = {
    flex: `1 1 ${minWidth}px`,
    minWidth: `${minWidth}px`,
    maxWidth: `${maxWidth}px`,
    ...stubNotchStyle(compact ? 3 : 4),
  };
  if (state === 'pending') {
    // Half-punched: orange left half (today's pending color,
    // var(--skin-primary)), paper right half.
    style.background =
      'linear-gradient(to right, var(--skin-primary) 50%, var(--skin-surface-muted) 50%)';
  }
  return style;
}

export function DeckProgressMeter({
  approvedCount,
  pendingCount = 0,
  totalCount,
  compact = false,
  className,
}: DeckProgressMeterProps) {
  // States come from the counts, not the percents: approvedPercent and
  // pendingPercent stay in the props so both callers stay untouched, but
  // counts are the source of truth for one stub per mission.
  const safeTotal = Math.max(0, totalCount);
  const safeApproved = Math.min(safeTotal, Math.max(0, approvedCount));
  const safePending = Math.min(safeTotal - safeApproved, Math.max(0, pendingCount));
  const safeRemaining = safeTotal - safeApproved - safePending;
  const isComplete = safeTotal > 0 && safeApproved === safeTotal;

  const stubs: StubState[] = [
    ...Array<StubState>(safeApproved).fill('approved'),
    ...Array<StubState>(safePending).fill('pending'),
    ...Array<StubState>(safeRemaining).fill('remaining'),
  ];

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 font-mono text-[9px] font-black uppercase tracking-wider text-[var(--skin-text-muted)]">
        <span>Deck progress</span>
        <span className="text-[var(--skin-text)]">
          {safeApproved}/{safeTotal} approved
          {safePending > 0 ? ` · ${safePending} pending` : ''}
        </span>
      </div>

      <div className="relative">
        <div
          className="flex w-full flex-wrap gap-1"
          role="progressbar"
          aria-label={`${safeApproved} of ${safeTotal} deck missions approved${safePending > 0 ? `, ${safePending} pending review` : ''}`}
          aria-valuemin={0}
          aria-valuemax={safeTotal}
          aria-valuenow={safeApproved}
        >
          {stubs.map((state, index) => (
            <span
              key={index}
              data-testid="deck-progress-stub"
              data-state={state}
              aria-hidden="true"
              className={stubClassName(state, compact)}
              style={stubStyle(state, compact)}
            />
          ))}
        </div>

        {isComplete && (
          <span
            data-testid="deck-progress-done-stamp"
            aria-hidden="true"
            className="pointer-events-none absolute -top-3 right-1 rotate-[-8deg] border-[3px] border-[var(--skin-primary)] bg-[var(--skin-text)] px-2 py-0.5 font-display text-lg font-black uppercase leading-none tracking-wider text-[var(--skin-primary)] shadow-[3px_3px_0_var(--skin-border)]"
          >
            Done
          </span>
        )}
      </div>

      {safePending > 0 && !compact && (
        <div className="flex items-center gap-4 font-mono text-[8px] font-bold uppercase tracking-widest text-[var(--skin-text-muted)]">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 border border-[var(--skin-border)] bg-[var(--skin-secondary)]" />
            Approved
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 border border-[var(--skin-border)] bg-[var(--skin-primary)] opacity-55" />
            Pending
          </span>
        </div>
      )}
    </div>
  );
}
