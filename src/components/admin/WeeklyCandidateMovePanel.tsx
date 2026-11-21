import React, { useState } from 'react';
import { WEEKLY_VOTE_CATEGORIES, type WeeklyVoteCategory } from '../../logic/weeklyVoting';
import { getWeeklyCategoryDisplay } from '../../logic/weeklyCategories';
import type { WeeklyCategoryBallotReadModel } from '../../services/weeklyVotingService';
import { cn } from '../../lib/utils';

export interface WeeklyCandidateMoveRow {
  entryId: string;
  displayName: string;
  fromCategory: WeeklyVoteCategory;
}

export function buildWeeklyCandidateMoveRows(
  ballots: WeeklyCategoryBallotReadModel[],
): WeeklyCandidateMoveRow[] {
  const rows: WeeklyCandidateMoveRow[] = [];
  for (const ballot of ballots) {
    if (!ballot.ballotExists) continue;
    for (const nominee of ballot.nominees) {
      const entryId = String(nominee.entryId || nominee.id || '').trim();
      if (!entryId) continue;
      rows.push({
        entryId,
        displayName: String((nominee as any).displayName || (nominee as any).userName || entryId),
        fromCategory: ballot.category,
      });
    }
  }
  return rows;
}

/**
 * Admin move UI (Slice 2): for the current week's draft ballots, every
 * candidate with its current categories, and a control to move it to a
 * different category ballot. Presentational only — AdminModeration owns
 * the load and the move call. Only available while ballots are drafts:
 * once any ballot leaves draft the server refuses moves, so the panel
 * says so and hides the controls instead of offering a dead button.
 */
export function WeeklyCandidateMovePanel({
  ballots,
  isMoving,
  moveReason,
  message,
  onMoveReasonChange,
  onMove,
}: {
  ballots: WeeklyCategoryBallotReadModel[];
  isMoving: boolean;
  moveReason: string;
  message: string | null;
  onMoveReasonChange: (value: string) => void;
  onMove: (entryId: string, fromCategory: WeeklyVoteCategory, toCategory: WeeklyVoteCategory) => void;
}) {
  const rows = buildWeeklyCandidateMoveRows(ballots);
  const existingBallots = ballots.filter(ballot => ballot.ballotExists);
  const allDraft = existingBallots.length > 0 && existingBallots.every(ballot => ballot.ballotStatus === 'draft');
  const [targets, setTargets] = useState<Record<string, WeeklyVoteCategory>>({});

  const targetFor = (row: WeeklyCandidateMoveRow): WeeklyVoteCategory => {
    const key = `${row.entryId}:${row.fromCategory}`;
    return targets[key] || WEEKLY_VOTE_CATEGORIES.find(category => category !== row.fromCategory)!;
  };

  return (
    <div data-testid="weekly-candidate-move-panel" className="border-4 border-on-surface bg-white p-4 shadow-[6px_6px_0px_black] space-y-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest">Move candidates between awards</p>
        <p className="mt-1 text-xs opacity-60">
          Draft ballots only. Moving a candidate removes it from the source award ballot and adds it to the target
          award ballot in the same week.
        </p>
      </div>

      {existingBallots.length === 0 ? (
        <p className="border-2 border-dashed border-on-surface/15 p-4 font-mono text-xs uppercase tracking-widest opacity-50">
          No draft ballots for the current week yet — build the ballot first.
        </p>
      ) : !allDraft ? (
        <p
          data-testid="weekly-candidate-move-locked"
          className="border-2 border-brand-orange bg-brand-orange/10 p-4 font-mono text-[10px] font-black uppercase tracking-widest text-brand-orange"
        >
          Ballots are locked — moves are refused once the Saturday lock passes.
        </p>
      ) : rows.length === 0 ? (
        <p className="border-2 border-dashed border-on-surface/15 p-4 font-mono text-xs uppercase tracking-widest opacity-50">
          Draft ballots exist but hold no candidates yet.
        </p>
      ) : (
        <>
          <label className="block">
            <span className="micro-label">Move reason (min 5 characters, audit-logged)</span>
            <input
              value={moveReason}
              onChange={event => onMoveReasonChange(event.target.value)}
              aria-label="Candidate move reason"
              className="mt-1 min-h-11 w-full border-2 border-on-surface bg-white px-3 font-mono text-xs"
            />
          </label>
          <div className="space-y-2">
            {rows.map(row => {
              const key = `${row.entryId}:${row.fromCategory}`;
              const target = targetFor(row);
              const fromMeta = getWeeklyCategoryDisplay(row.fromCategory);
              return (
                <div
                  key={key}
                  data-testid={`weekly-move-row-${row.entryId}-${row.fromCategory}`}
                  className="flex flex-col gap-2 border-2 border-on-surface/10 bg-on-surface/[0.02] p-3 md:flex-row md:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold">{row.displayName}</p>
                    <p className="font-mono text-[10px] opacity-50">
                      ...{row.entryId.slice(-8)} // currently in {fromMeta.label}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="sr-only" htmlFor={`move-target-${key}`}>
                      Move {row.displayName} to award
                    </label>
                    <select
                      id={`move-target-${key}`}
                      value={target}
                      onChange={event => setTargets(previous => ({
                        ...previous,
                        [key]: event.target.value as WeeklyVoteCategory,
                      }))}
                      disabled={isMoving}
                      className="min-h-11 border-2 border-on-surface bg-white px-2 font-mono text-xs"
                    >
                      {WEEKLY_VOTE_CATEGORIES.filter(category => category !== row.fromCategory).map(category => (
                        <option key={category} value={category}>
                          {getWeeklyCategoryDisplay(category).label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => onMove(row.entryId, row.fromCategory, target)}
                      disabled={isMoving || moveReason.trim().length < 5}
                      className={cn(
                        'bureau-btn-sm min-h-11 bg-brand-lime text-on-surface disabled:opacity-40',
                      )}
                    >
                      {isMoving ? 'MOVING...' : 'MOVE'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {message && (
        <p data-testid="weekly-candidate-move-message" className="border-2 border-on-surface/10 bg-on-surface/[0.03] p-3 font-mono text-[10px]">
          {message}
        </p>
      )}
    </div>
  );
}
