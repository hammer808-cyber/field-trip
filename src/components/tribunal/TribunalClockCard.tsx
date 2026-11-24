import { formatCountdownParts, getTribunalClock } from '../../logic/tribunalClock';
import type { VotingCycle } from '../../services/votingCycleService';

/**
 * Live submission-window countdown card (Nov 24, 2026, from Zach's
 * tribunal mockup). Ticks every second from the real weekly-cycle
 * deadline; the parent passes a `now` that updates on a 1s interval.
 * Numbers are Bebas Neue display with magenta seconds; units are
 * Courier Prime mono. Never shows a negative value: the remaining
 * time clamps at zero and the phase flips on the next tick.
 */
export function TribunalClockCard({ now, cycle }: { now: Date; cycle: VotingCycle }) {
  const clock = getTribunalClock(now, cycle);
  const parts = formatCountdownParts(Math.max(0, clock.deadline.getTime() - now.getTime()));
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <div
      data-testid="tribunal-clock-card"
      className="tribunal-lined-paper max-w-[315px] border-2 border-on-surface bg-[var(--skin-surface)] p-2.5 shadow-[3px_3px_0px_black]"
    >
      <div className="flex items-start gap-2.5">
        <span
          aria-hidden="true"
          className="mt-1 h-3 w-3 shrink-0 animate-pulse border-2 border-on-surface bg-brand-cyan"
        />
        <div className="w-full leading-tight">
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs font-bold uppercase text-on-surface/60">Clock • Live</p>
            <span className="inline-flex items-center gap-1 border border-on-surface bg-brand-lime px-1 font-mono text-xs font-bold uppercase">
              <span className="h-1.5 w-1.5 animate-ping rounded-full bg-on-surface" aria-hidden="true" />
              Live
            </span>
          </div>
          <p className="mt-0.5 font-display text-2xl font-black italic leading-none tracking-tight text-on-surface">
            {pad(parts.days)}
            <span className="font-mono text-base font-bold text-on-surface/60">d</span>{' '}
            {pad(parts.hours)}
            <span className="font-mono text-base font-bold text-on-surface/60">h</span>{' '}
            {pad(parts.minutes)}
            <span className="font-mono text-base font-bold text-on-surface/60">m</span>{' '}
            <span className="text-brand-magenta">{pad(parts.seconds)}</span>
            <span className="font-mono text-base font-bold text-on-surface/60">s</span>
          </p>
          <p className="mt-0.5 font-mono text-xs text-on-surface/80">{clock.label}</p>
        </div>
      </div>
    </div>
  );
}
