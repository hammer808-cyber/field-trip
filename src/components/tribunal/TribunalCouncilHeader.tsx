import { useEffect, useRef, useState } from 'react';
import { Flame, Hourglass, Lock, Users, X } from 'lucide-react';
import {
  formatCountdownParts,
  formatPhaseCountdown,
  getCouncilBadgeState,
  getCouncilWindow,
  getTribunalPhaseBreakdown,
} from '../../logic/tribunalClock';
import type { VotingCycle } from '../../services/votingCycleService';
import { cn } from '../../lib/utils';

/**
 * Tribunal header (Nov 24, 2026, from Zach's tribunal mockup):
 * the TRIBUNAL title and subtitle plus the campfire COUNCIL badge,
 * which opens the Tribal Council Rules popover.
 *
 * Every number in the popover is real data. The council window counts
 * to the real Saturday voting window; the phase breakdown is the real
 * weekly cycle (Signals 5 days, Vote 1 day, Ruling 1 day); the votes
 * line counts real open cases and real votes cast this week. The
 * mockup's "12 Operatives voting" and "2/3 council quorum" are not
 * real in this app (there is no quorum rule; votes are recommendations
 * only), so they are not shown. The footer seal carries the real week
 * number instead of the mockup's sample SEC//TRIB-84.
 *
 * The flame flickers (CSS) and ember sparks burst when the popover
 * opens. The global reduced-motion rule squashes the animation.
 */
export function TribunalCouncilHeader({
  now,
  cycle,
  weekNumber,
  isUnlocked,
  openCaseCount,
  totalVotesCast,
  defaultOpen = false,
}: {
  now: Date;
  cycle: VotingCycle;
  weekNumber: number;
  isUnlocked: boolean;
  openCaseCount: number;
  totalVotesCast: number;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [sparksKey, setSparksKey] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const badgeState = getCouncilBadgeState(isUnlocked, openCaseCount);
  const councilWindow = getCouncilWindow(now, cycle);
  const breakdown = getTribunalPhaseBreakdown(now, cycle);
  const windowParts = councilWindow.deadline
    ? formatCountdownParts(Math.max(0, councilWindow.deadline.getTime() - now.getTime()))
    : null;
  const pad = (n: number) => String(n).padStart(2, '0');

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && rootRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open ]);

  const toggle = () => {
    setOpen((wasOpen) => {
      if (!wasOpen) setSparksKey((key) => key + 1);
      return !wasOpen;
    });
  };

  return (
    <div ref={rootRef} className="relative">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-3xl font-black uppercase italic leading-none tracking-tight text-on-surface">
            Tribunal
          </h2>
          <p className="mt-1.5 max-w-[235px] text-sm font-bold leading-snug text-on-surface/65">
            Community review for flagged receipts. Admins make the final call.
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end">
          <button
            ref={buttonRef}
            type="button"
            aria-expanded={open}
            aria-haspopup="dialog"
            onClick={toggle}
            title="Tap to inspect Tribal Council details"
            className={cn(
              'flex select-none items-center gap-2 border-2 border-on-surface px-2.5 py-1.5 text-left shadow-[2px_2px_0px_black] transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
              open ? 'bg-brand-lime' : 'bg-[var(--skin-surface)]',
            )}
          >
            {badgeState === 'locked' ? (
              <Lock className="h-7 w-7 shrink-0 text-on-surface" aria-hidden="true" />
            ) : badgeState === 'empty' ? (
              <Flame className="h-7 w-7 shrink-0 text-on-surface" aria-hidden="true" />
            ) : (
              <span className="relative flex h-7 w-7 shrink-0 items-center justify-center" aria-hidden="true">
                <svg className="h-7 w-7 shrink-0" fill="none" viewBox="0 0 36 36">
                  <rect
                    className="fill-[var(--skin-warning)] stroke-black"
                    height="4.5"
                    rx="1"
                    strokeWidth="2"
                    transform="rotate(-10 6 26)"
                    width="24"
                    x="6"
                    y="26"
                  />
                  <rect
                    className="fill-[var(--skin-warning)] stroke-black"
                    height="4.5"
                    rx="1"
                    strokeWidth="2"
                    transform="rotate(10 6 23)"
                    width="24"
                    x="6"
                    y="23"
                  />
                  <path
                    className="tribunal-flame fill-brand-orange stroke-black"
                    d="M18 4C18 4 26 11 26 18C26 22.4183 22.4183 25 18 25C13.5817 25 10 22.4183 10 18C10 13.5 13 10 14.5 8.5C14.5 8.5 14 12 16 13C16 9.5 18 4 18 4Z"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                  <path
                    className="fill-brand-lime stroke-black"
                    d="M18 13C18 13 21.5 16.5 21.5 19.5C21.5 21.433 19.933 23 18 23C16.067 23 14.5 21.433 14.5 19.5C14.5 17 18 13 18 13Z"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                  />
                </svg>
                {open && sparksKey > 0 && (
                  <span key={sparksKey} className="pointer-events-none absolute inset-0" aria-hidden="true">
                    <span className="tribunal-ember-1 absolute left-3 top-2 h-2 w-2 rounded-full border border-on-surface bg-brand-orange" />
                    <span className="tribunal-ember-2 absolute left-4 top-2.5 h-1.5 w-1.5 rounded-full border border-on-surface bg-brand-lime" />
                    <span className="tribunal-ember-3 absolute left-3.5 top-1.5 h-2 w-2 rounded-full border border-on-surface bg-brand-magenta" />
                  </span>
                )}
              </span>
            )}
            <span className="leading-none">
              <span className="flex items-center gap-1">
                {badgeState === 'in-session' && (
                  <span
                    className="h-2 w-2 animate-pulse rounded-full border border-on-surface bg-brand-magenta"
                    aria-hidden="true"
                  />
                )}
                <span className="font-mono text-xs font-bold uppercase tracking-tight text-on-surface">
                  {badgeState === 'locked' ? 'Docket' : 'Council'}
                </span>
              </span>
              <span className="mt-0.5 block font-mono text-xs uppercase text-on-surface/60">
                {badgeState === 'locked' ? 'Locked' : badgeState === 'empty' ? 'No cases' : 'In session'}
              </span>
            </span>
          </button>
        </div>
      </div>

      {open && (
        <div
          role="dialog"
          aria-live="polite"
          aria-label="Tribal council rules"
          data-testid="tribunal-council-popover"
          className="relative z-30 mt-3"
        >
          <div className="border-2 border-on-surface bg-[var(--skin-surface)] p-3.5 shadow-[0px_6px_0px_black]">
            <div className="mb-2.5 flex items-center justify-between border-b-2 border-on-surface pb-2">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 border border-on-surface bg-brand-lime" aria-hidden="true" />
                <h3 className="font-display text-base font-black uppercase italic tracking-wider text-on-surface">
                  Tribal Council Rules
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <div
                  aria-hidden="true"
                  className="flex h-4 items-end gap-0.5 border border-on-surface/40 bg-black/5 px-1.5 py-0.5"
                  title="Tribunal room acoustic monitor"
                >
                  <span className="tribunal-eq-bar w-1 rounded-full bg-brand-magenta" style={{ animationDuration: '0.8s' }} />
                  <span className="tribunal-eq-bar w-1 rounded-full bg-brand-orange" style={{ animationDuration: '0.6s', animationDelay: '0.15s' }} />
                  <span className="tribunal-eq-bar w-1 rounded-full bg-brand-lime" style={{ animationDuration: '0.9s', animationDelay: '0.3s' }} />
                  <span className="tribunal-eq-bar w-1 rounded-full bg-on-surface" style={{ animationDuration: '0.7s', animationDelay: '0.1s' }} />
                </div>
                <button
                  type="button"
                  aria-label="Close council details"
                  onClick={() => setOpen(false)}
                  className="flex h-6 w-6 items-center justify-center border-2 border-on-surface bg-white text-on-surface shadow-[1px_1px_0px_black] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="space-y-2 font-mono text-xs leading-tight text-on-surface">
              <div className="flex items-start gap-2 border border-on-surface bg-white p-2">
                <Hourglass className="mt-0.5 h-4 w-4 shrink-0 text-brand-magenta" aria-hidden="true" />
                <div className="w-full">
                  <div className="flex items-center justify-between">
                    <p className="font-bold uppercase tracking-tight text-on-surface">Active window</p>
                    {councilWindow.state !== 'after' && (
                      <span className="inline-flex items-center gap-1 border border-on-surface bg-brand-orange px-1 font-mono text-xs font-bold uppercase text-on-surface">
                        <span className="h-1.5 w-1.5 animate-ping rounded-full bg-on-surface" aria-hidden="true" />
                        Countdown
                      </span>
                    )}
                  </div>
                  {councilWindow.state === 'after' ? (
                    <p className="mt-1 font-bold text-on-surface">
                      Flame extinguished. Rulings publish Sunday 9 AM.
                    </p>
                  ) : (
                    windowParts && (
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 font-mono text-sm font-bold text-on-surface">
                        {windowParts.days > 0 && (
                          <>
                            <span className="border border-on-surface bg-on-surface px-1.5 py-0.5 text-xs text-white">
                              {pad(windowParts.days)}d
                            </span>
                            <span className="tribunal-tick-blink font-black text-brand-magenta" aria-hidden="true">:</span>
                          </>
                        )}
                        <span className="border border-on-surface bg-on-surface px-1.5 py-0.5 text-xs text-white">
                          {pad(windowParts.hours)}
                        </span>
                        <span className="tribunal-tick-blink font-black text-brand-magenta" aria-hidden="true">:</span>
                        <span className="border border-on-surface bg-on-surface px-1.5 py-0.5 text-xs text-white">
                          {pad(windowParts.minutes)}
                        </span>
                        <span className="tribunal-tick-blink font-black text-brand-magenta" aria-hidden="true">:</span>
                        <span className="border border-on-surface bg-brand-lime px-1.5 py-0.5 text-xs text-on-surface">
                          {pad(windowParts.seconds)}
                        </span>
                        <span className="text-xs font-normal uppercase text-on-surface/60">
                          {councilWindow.label}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>

              <div className="border border-on-surface bg-white p-2">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-tight text-on-surface">
                    Review window breakdown
                  </span>
                  <span className="text-xs font-bold text-on-surface/60">
                    Phase {breakdown.currentIndex + 1} of 3
                  </span>
                </div>
                <div className="mb-2 flex h-2.5 w-full overflow-hidden border border-on-surface bg-[var(--skin-surface-muted)]">
                  {breakdown.segments.map((segment) => (
                    <div
                      key={segment.key}
                      title={`${segment.label} (${segment.state})`}
                      className={cn(
                        'h-full',
                        segment.state === 'done' && 'bg-[var(--skin-text-muted)]',
                        segment.state === 'active' && 'border-x border-on-surface bg-brand-lime',
                        segment.state === 'pending' && 'bg-[var(--skin-surface)]',
                      )}
                      style={{ width: `${segment.widthPct}%` }}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 font-bold text-on-surface">
                    <span className="h-1.5 w-1.5 rounded-full border border-on-surface bg-brand-lime" aria-hidden="true" />
                    {breakdown.currentLabel.toUpperCase()} PHASE:{' '}
                    <span className="font-mono text-on-surface underline">
                      {formatPhaseCountdown(breakdown.currentRemainingMs)}
                    </span>
                  </span>
                  <span className="border border-on-surface bg-brand-lime px-1 text-xs font-bold uppercase">Active</span>
                </div>
              </div>

              <div className="flex items-start gap-2 border border-on-surface bg-white p-2">
                <Users className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" aria-hidden="true" />
                <div>
                  <p className="font-bold uppercase tracking-tight text-on-surface">Votes &amp; verdicts</p>
                  <p className="text-on-surface/70">
                    {openCaseCount} open {openCaseCount === 1 ? 'case' : 'cases'} • {totalVotesCast}{' '}
                    {totalVotesCast === 1 ? 'vote' : 'votes'} cast this week. Votes are recommendations
                    only. Admins make the final call.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 border border-on-surface bg-white p-2">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-brand-cyan" aria-hidden="true" />
                <div>
                  <p className="font-bold uppercase tracking-tight text-on-surface">Chain integrity</p>
                  <p className="text-on-surface/70">
                    Individual ballots stay private. Admins uphold the terminal ruling.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-2.5 flex items-center justify-between border-t border-on-surface/20 pt-2 font-mono text-xs text-on-surface/60">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 animate-ping rounded-full border border-on-surface bg-brand-lime" aria-hidden="true" />
                Chamber sealed
              </span>
              <span className="font-bold uppercase tracking-wider text-on-surface">
                SEC//TRIB-{weekNumber}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
