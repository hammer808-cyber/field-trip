import { Clock } from 'lucide-react';
import {
  describeTimeWindow,
  formatHour,
  getTimeWindowStatus,
  type TimeWindow,
} from '../logic/timeWindow';
import { cn } from '../lib/utils';

/**
 * Time-window line for the card surfaces (Nov 27, 2026).
 *
 * Zach's rule: a card with a certain time of day must LIST its time on
 * the card itself, not only at the submit moment. Before this, the window
 * only showed in the Crew Challenges picker and on the FieldClipboard
 * submit button ("Opens at 6 PM") — a player could draw a sunset card at
 * 6 AM and see nothing wrong until submit. This line renders on the
 * drawn card (MissionDecodedCard), the briefing card (ChallengeCard),
 * and the capture "What to do" block (FieldClipboard), all from the same
 * helpers as the three enforcement sites, so the time shown is the time
 * enforced.
 *
 * Renders nothing when the card carries no window. When closed it adds
 * "Opens at …" next to the hours; the submit button's own closed copy
 * stays as the friendly face of the gate.
 */
export function TimeWindowLine({
  mission,
  variant = 'strip',
  className,
}: {
  mission: { proofRequirements?: { timeWindow?: TimeWindow } } | null | undefined;
  /** 'strip': full bordered strip for card surfaces. 'inline': bare line
      for embedding inside an existing block. */
  variant?: 'strip' | 'inline';
  className?: string;
}) {
  const status = getTimeWindowStatus(mission);
  if (!status.window) return null;
  return (
    <div
      data-testid="time-window-line"
      className={cn(
        'flex items-center gap-2 font-mono text-xs font-black uppercase tracking-wider text-on-surface',
        variant === 'strip' && 'border-b-2 border-on-surface bg-white px-4 py-2',
        className,
      )}
    >
      <Clock className="h-3.5 w-3.5 shrink-0 text-brand-orange" aria-hidden="true" />
      <span>{describeTimeWindow(status.window)}</span>
      {!status.open && (
        <span className="text-on-surface/60">Opens at {formatHour(status.window.startHour)}</span>
      )}
    </div>
  );
}
