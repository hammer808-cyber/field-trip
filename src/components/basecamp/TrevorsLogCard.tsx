import React from 'react';
import { cn } from '../../lib/utils';
import { TrevorAvatar } from '../TrevorGuideView';

export interface TrevorsLogEntry {
  photoUrl?: string | null;
  note?: string | null;
  missionTitle: string;
  dateLabel: string;
}

interface TrevorsLogCardProps {
  latestApproved: TrevorsLogEntry | null;
  className?: string;
}

/**
 * Trevor's Log — Field Manual chrome (Nov 21, 2026). The mock's
 * right-hand page: a quote card with a stamp and a taped polaroid.
 * The log entry is the player's latest approved proof: a taped
 * polaroid (photo + mission title + date) and the proof's field note
 * as the quote, with Trevor's avatar in a rotated stamp ring.
 *
 * The current guidance message is NOT quoted here — it already shows
 * on Basecamp as the next-action description, and the same fact is
 * shown once. The proof note is new information on the page.
 */
export function TrevorsLogCard({ latestApproved, className }: TrevorsLogCardProps) {
  return (
    <section
      aria-label="Trevor's log"
      className={cn(
        'skin-card relative overflow-visible border-[var(--skin-border-width)] border-[var(--skin-border)] bg-[var(--skin-surface)] shadow-[var(--skin-card-shadow)]',
        className,
      )}
    >
      <span className="basecamp-tape basecamp-tape--left" aria-hidden="true" />
      <span className="basecamp-tape basecamp-tape--right" aria-hidden="true" />
      <div className="relative flex items-center gap-3 border-b-2 border-[var(--skin-border)] px-4 py-3">
        <span
          aria-hidden="true"
          className="rotate-6 rounded-full border-[3px] border-[var(--skin-primary)] p-0.5"
        >
          <TrevorAvatar size="small" />
        </span>
        <div className="min-w-0">
          <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-[var(--skin-text)]">
            Trevor&apos;s log
          </p>
          <p className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--skin-text-muted)]">
            Latest entry from the field
          </p>
        </div>
      </div>

      {latestApproved ? (
        <div className="relative flex flex-col gap-4 p-4 sm:flex-row sm:p-5">
          {latestApproved.photoUrl && (
            <figure className="relative w-36 shrink-0 -rotate-2 border-[3px] border-[var(--skin-border)] bg-[var(--skin-surface)] p-2 pb-1 shadow-[4px_4px_0_var(--skin-border)]">
              <img
                src={latestApproved.photoUrl}
                alt=""
                className="aspect-square w-full object-cover"
              />
              <figcaption className="break-words py-1.5 font-mono text-xs font-black uppercase tracking-wider text-[var(--skin-text)]">
                {latestApproved.missionTitle} · {latestApproved.dateLabel}
              </figcaption>
            </figure>
          )}
          <div className="min-w-0">
            {latestApproved.note ? (
              <blockquote className="line-clamp-4 font-serif text-base italic leading-relaxed text-[var(--skin-text)]">
                &ldquo;{latestApproved.note}&rdquo;
              </blockquote>
            ) : (
              <p className="font-serif text-base italic leading-relaxed text-[var(--skin-text)]">
                {latestApproved.missionTitle} — photo only, no field note.
              </p>
            )}
            <p className="mt-2 font-mono text-xs font-bold uppercase tracking-wider text-[var(--skin-text-muted)]">
              — Latest approved proof
            </p>
          </div>
        </div>
      ) : (
        <p className="relative p-4 font-serif text-base italic leading-relaxed text-[var(--skin-text-muted)] sm:p-5">
          No entries logged yet — your first approved proof lands here.
        </p>
      )}
    </section>
  );
}
