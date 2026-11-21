import React from 'react';
import { Trophy } from 'lucide-react';
import { WEEKLY_VOTE_CATEGORIES } from '../logic/weeklyVoting';
import { getWeeklyCategoryDisplay } from '../logic/weeklyCategories';
import {
  countCanonicalWinners,
  resolveCanonicalWinnerDisplay,
  type CanonicalWeeklyResultLike,
  type CanonicalWinnerCandidateLike,
} from '../logic/weeklyCategoryBallots';

/** A legacy weeklySummaries voteWinners row, kept for old weeks only. */
export interface LegacyWeeklyWinnerLike {
  entryId?: unknown;
  userName?: unknown;
  tripTitle?: unknown;
  fieldNote?: unknown;
  proofImage?: unknown;
  count?: unknown;
}

export interface WeeklyAwardsResultsProps {
  /** Canonical results, one slot per award; null = no result published for that award. */
  results: Partial<Record<string, CanonicalWeeklyResultLike | null>>;
  /** Candidate snapshots keyed by entry id, for photos / notes / missions. */
  entriesById?: Record<string, CanonicalWinnerCandidateLike>;
  /** Legacy weeklySummaries winners — old weeks only, never preferred over canonical. */
  legacyWinners?: Record<string, LegacyWeeklyWinnerLike> | null;
}

/**
 * Six winners, one per award, from the CANONICAL results
 * (votingCycles/{cycleId}/results/{ballotId}). Presentational only
 * (Slice 2) — VotingHub and WeeklyAwardsPage own the loads.
 *
 * Honest empty states: an award with no published result says so
 * instead of rendering a fake winner, and when no canonical result
 * exists at all the legacy summary is the fallback for old weeks; with
 * neither, the page says no results are published yet.
 */
export function WeeklyAwardsResults({ results, entriesById = {}, legacyWinners = null }: WeeklyAwardsResultsProps) {
  const canonicalCount = countCanonicalWinners(results as Partial<Record<string, CanonicalWeeklyResultLike | null>>);
  const hasLegacyWinners = Boolean(legacyWinners && Object.keys(legacyWinners).length > 0);

  if (canonicalCount === 0 && !hasLegacyWinners) {
    return (
      <div
        data-testid="weekly-awards-empty"
        className="border-4 border-dashed border-on-surface/20 bg-on-surface/[0.03] p-10 text-center"
      >
        <Trophy className="mx-auto h-12 w-12 text-on-surface/60" aria-hidden="true" />
        <p className="mt-4 font-display text-2xl font-black italic uppercase text-on-surface/60">
          No results published yet
        </p>
        <p className="mt-2 font-serif italic text-on-surface/55">
          Winners publish after voting closes and results are finalized. Check back during awards phase.
        </p>
      </div>
    );
  }

  if (canonicalCount === 0 && hasLegacyWinners) {
    return (
      <div data-testid="weekly-awards-legacy" className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {WEEKLY_VOTE_CATEGORIES.map(category => {
          const winner = legacyWinners?.[category];
          if (!winner) return null;
          const meta = getWeeklyCategoryDisplay(category);
          const entryId = String(winner.entryId || '');
          const proofImage = String(winner.proofImage || '');
          return (
            <article
              key={category}
              data-category={category}
              data-winner-entry-id={entryId}
              className="border-4 border-on-surface bg-white p-5 shadow-[8px_8px_0px_black]"
            >
              <p className="font-mono text-xs font-black uppercase tracking-[0.25em] text-brand-orange">{meta.awardLabel}</p>
              <h3 className="mt-2 font-display text-3xl font-black italic uppercase leading-none">
                {String(winner.userName || 'Field Agent')}
              </h3>
              {proofImage && (
                <img src={proofImage} alt="" className="mt-4 aspect-[16/10] w-full border-2 border-on-surface object-cover" />
              )}
              <p className="mt-3 font-serif text-sm italic text-on-surface/75">
                &ldquo;{String(winner.fieldNote || 'No field note submitted.')}&rdquo;
              </p>
              <p className="mt-4 flex items-center justify-between font-mono text-xs font-black uppercase tracking-widest text-on-surface/60">
                <span className="truncate">{String(winner.tripTitle || 'Field Receipt')}</span>
                <span className="shrink-0 text-brand-orange">{Number(winner.count || 0)} votes</span>
              </p>
            </article>
          );
        })}
      </div>
    );
  }

  return (
    <div data-testid="weekly-awards-canonical" className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {WEEKLY_VOTE_CATEGORIES.map(category => {
        const meta = getWeeklyCategoryDisplay(category);
        const result = results[category] as CanonicalWeeklyResultLike | null | undefined;
        const display = resolveCanonicalWinnerDisplay(
          result,
          result?.winner ? entriesById[String(result.winner.entryId || result.winner.proofId || '')] : undefined,
        );
        if (!display) {
          return (
            <article
              key={category}
              data-category={category}
              data-testid={`weekly-award-pending-${category}`}
              className="border-4 border-dashed border-on-surface/20 bg-on-surface/[0.03] p-5"
            >
              <p className="font-mono text-xs font-black uppercase tracking-[0.25em] text-brand-orange">{meta.awardLabel}</p>
              <h3 className="mt-2 font-display text-3xl font-black italic uppercase leading-none text-on-surface/60">
                {meta.label}
              </h3>
              <p className="mt-3 font-serif italic text-on-surface/55">No winner published for this award yet.</p>
            </article>
          );
        }
        return (
          <article
            key={category}
            data-category={category}
            data-winner-entry-id={display.entryId}
            className="border-4 border-on-surface bg-white p-5 shadow-[8px_8px_0px_black]"
          >
            <p className="font-mono text-xs font-black uppercase tracking-[0.25em] text-brand-orange">{meta.awardLabel}</p>
            <h3 className="mt-2 font-display text-3xl font-black italic uppercase leading-none">{display.userName}</h3>
            {display.proofImage && (
              <img
                src={display.proofImage}
                alt={`Winning proof by ${display.userName} for ${meta.label}`}
                className="mt-4 aspect-[16/10] w-full border-2 border-on-surface object-cover"
              />
            )}
            {display.fieldNote && (
              <p className="mt-3 font-serif text-sm italic text-on-surface/75">&ldquo;{display.fieldNote}&rdquo;</p>
            )}
            <p className="mt-4 flex items-center justify-between font-mono text-xs font-black uppercase tracking-widest text-on-surface/60">
              <span className="truncate">{display.tripTitle}</span>
              <span className="shrink-0 text-brand-orange">{display.voteTotal} votes</span>
            </p>
          </article>
        );
      })}
    </div>
  );
}
