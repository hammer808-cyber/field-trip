import type { CSSProperties } from 'react';
import { FieldStamp } from '../FieldStamp';

/**
 * Stapled ticket meter for the Basecamp progress card (Nov 21, 2026,
 * mock Option 5). One long ticket: side notches cut with the same
 * mask technique DeckProgressMeter uses for stubs, a dashed
 * perforation near the right end, a hatched lime fill up to the
 * level-progress percent, and a small orange marker triangle at the
 * fill edge. At 100% a rotated DONE stamp sits on the ticket instead
 * of a colour shift, the mock's rule. Skin tokens only.
 */
function ticketNotchStyle(notchRadius: number): CSSProperties {
  const gradient = (position: string) =>
    `radial-gradient(circle ${notchRadius}px at ${position} 50%, transparent ${notchRadius - 0.5}px, black ${notchRadius}px)`;
  return {
    maskImage: `${gradient('0px')}, ${gradient('100%')}`,
    maskComposite: 'intersect',
    WebkitMaskImage: `${gradient('0px')}, ${gradient('100%')}`,
    WebkitMaskComposite: 'source-in',
  };
}

export function BasecampTicketMeter({
  percent,
  xpToNextLevel,
  nextLevel,
}: {
  percent: number;
  xpToNextLevel: number;
  nextLevel: number;
}) {
  const safePercent = Math.min(100, Math.max(0, percent));
  const rounded = Math.round(safePercent);
  const isComplete = safePercent >= 100;

  return (
    <div className="space-y-2">
      <div
        className="relative h-10 border-2 border-[var(--skin-border)] bg-[var(--skin-surface-muted)]"
        style={ticketNotchStyle(7)}
        role="progressbar"
        aria-label={`Progress to level ${nextLevel}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={rounded}
      >
        {/* Hatched lime fill: diagonal ink lines over the secondary. */}
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 bg-[var(--skin-secondary)]"
          style={{
            width: `${safePercent}%`,
            backgroundImage:
              'repeating-linear-gradient(45deg, transparent 0 8px, color-mix(in srgb, var(--skin-border) 20%, transparent) 8px 10px)',
          }}
        />
        {/* Perforation: the tear-off stub at the right end. */}
        <div
          aria-hidden="true"
          className="absolute bottom-0 right-[18%] top-0 border-l-2 border-dashed border-[var(--skin-border)] opacity-60"
        />
        {/* Marker triangle at the fill edge, clamped inside the ticket. */}
        <svg
          aria-hidden="true"
          width="14"
          height="10"
          viewBox="0 0 14 10"
          className="absolute -top-[9px] z-10 -translate-x-1/2"
          style={{ left: `clamp(7px, ${safePercent}%, calc(100% - 7px))` }}
        >
          <polygon
            points="1,1 13,1 7,9"
            fill="var(--skin-primary)"
            stroke="var(--skin-border)"
            strokeWidth="1.5"
          />
        </svg>
        {isComplete && (
          <span className="absolute -top-3 right-2 z-10">
            <FieldStamp label="Done" tone="primary" />
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-xs font-black uppercase tracking-widest text-[var(--skin-text)]">
          {rounded}% completed
        </span>
        <span className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--skin-text-muted)]">
          {xpToNextLevel.toLocaleString()} XP to level {nextLevel}
        </span>
      </div>
    </div>
  );
}
