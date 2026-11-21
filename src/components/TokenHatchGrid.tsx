import { Check } from "lucide-react";
import { cn } from "../lib/utils";

/**
 * Slice 3 — HATCH GRID + DONE STAMP (Nov 21, 2026).
 *
 * Variant 4 from the progress-bar refresh: the season-token race renders
 * as a 10x10 hatch grid. Each cell is one tenth of the season goal
 * (10 tokens at the 1000-token goal); earned cells are lime with a check,
 * unearned cells are paper. Variant 2 (the DONE stamp) is a state, not a
 * style: it lands on the leader's row only when the goal is hit.
 *
 * Colours come from skin tokens only (never hard-coded hexes) so all
 * 5 skins keep working. No em dashes in user-facing copy.
 */

export const TOKENS_PER_HATCH_CELL = 10;
export const HATCH_GRID_CELLS = 100;

/** Pure cell-count helper: how many of the 100 hatch cells are earned. */
export function earnedHatchCells(tokens: number, goal: number): number {
  if (!Number.isFinite(tokens) || !Number.isFinite(goal) || goal <= 0) {
    return 0;
  }
  const earned = Math.floor((tokens / goal) * HATCH_GRID_CELLS);
  return Math.max(0, Math.min(HATCH_GRID_CELLS, earned));
}

export function isSeasonGoalComplete(tokens: number, goal: number): boolean {
  return Number.isFinite(tokens) && Number.isFinite(goal) && tokens >= goal;
}

interface TokenHatchGridProps {
  tokens: number;
  goal?: number;
  className?: string;
}

/**
 * The 10x10 hatch grid for one trail member. Cells size themselves to the
 * card width (aspect-square, 10 columns), so the grid fits a 390px phone
 * with no overflow or horizontal scroll.
 */
export function TokenHatchGrid({
  tokens,
  goal = 1000,
  className,
}: TokenHatchGridProps) {
  const earned = earnedHatchCells(tokens, goal);
  const done = isSeasonGoalComplete(tokens, goal);
  const label = `${tokens} / ${goal} tokens`;

  return (
    <div
      role="group"
      aria-label={
        done
          ? `Season tokens: ${label}, season goal complete`
          : `Season tokens: ${label}`
      }
      className={cn("relative", className)}
    >
      {/* Hatch grid: the cells themselves are decorative, the count lives
          in the group label and the mono label below. */}
      <div
        aria-hidden="true"
        className="grid w-full grid-cols-10 gap-[2px]"
        data-hatch-grid
      >
        {Array.from({ length: HATCH_GRID_CELLS }, (_, i) => {
          const isEarned = i < earned;
          return (
            <div
              key={i}
              data-hatch-cell
              data-earned={isEarned ? "true" : "false"}
              className={cn(
                "flex aspect-square w-full items-center justify-center border",
                isEarned
                  ? "border-[var(--skin-border)] bg-[var(--skin-secondary)]"
                  : "border-[var(--skin-border-muted)] bg-[var(--skin-surface-muted)]",
              )}
            >
              {isEarned && (
                <Check
                  className="h-3 w-3 text-[var(--skin-on-secondary)] sm:h-4 sm:w-4"
                  strokeWidth={3.5}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Mono token count, right aligned like the field journal sketch. */}
      <p className="mt-2 text-right font-mono text-xs font-black uppercase tracking-widest text-[var(--skin-text)]">
        {label}
      </p>

      {/* DONE stamp: variant 2, a state that lands only at the goal. */}
      {done && (
        <div
          aria-hidden="true"
          data-done-stamp
          className="absolute -top-3 right-1 rotate-[-8deg] border-[3px] border-[var(--skin-border)] bg-[var(--skin-text)] px-3 py-1 font-display text-xl font-black uppercase italic tracking-wide text-[var(--skin-primary)] shadow-[4px_4px_0_var(--skin-border)]"
        >
          DONE!
        </div>
      )}
    </div>
  );
}

export interface TokenRaceMember {
  id: string;
  name: string;
  tokens: number;
  markerEmoji?: string;
  markerLabel?: string;
  isMe?: boolean;
}

interface SeasonTokenRaceCardProps {
  members: TokenRaceMember[];
  goal?: number;
  className?: string;
}

/**
 * The season-token race card: one hatch-grid row per trail member. In
 * beta this is just the user. Returns null when the trail is hidden
 * (showOnBigBoard opt-out), so the opt-out is respected.
 */
export function SeasonTokenRaceCard({
  members,
  goal = 1000,
  className,
}: SeasonTokenRaceCardProps) {
  if (members.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "relative flex h-full flex-col border-[3px] border-[var(--skin-border)] bg-[var(--skin-surface)] p-5 shadow-[8px_8px_0_var(--skin-border)]",
        className,
      )}
    >
      {/* Lime tape strip, the only lime outside earned cells. */}
      <div
        aria-hidden="true"
        className="absolute -top-3 left-[15%] h-5 w-14 -rotate-12 border border-[var(--skin-border-muted)] bg-[var(--skin-secondary)] opacity-90 shadow-sm"
      />
      <div className="mb-4 text-left">
        <span className="font-mono text-xs font-black uppercase tracking-widest text-[var(--skin-text-muted)]">
          SEASON_TOKEN_RACE
        </span>
        <h3 className="mt-1 font-display text-xl font-black uppercase italic leading-none tracking-tight text-[var(--skin-text)]">
          Season Tokens
        </h3>
        <div className="mt-1.5 h-[3px] w-8 rounded-full bg-[var(--skin-border)]" />
      </div>

      <div className="space-y-6">
        {members.map((member) => (
          <div key={member.id} className="relative space-y-2">
            <div className="flex items-center gap-2 text-left">
              {member.markerEmoji && (
                <span
                  role="img"
                  aria-label={member.markerLabel || "Trail marker"}
                  className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-[var(--skin-border)] bg-[var(--skin-surface-muted)] text-base leading-none shadow-[2px_2px_0_var(--skin-border)]"
                >
                  {member.markerEmoji}
                </span>
              )}
              <span className="truncate font-display text-base font-black uppercase italic tracking-tight text-[var(--skin-text)]">
                {member.name}
                {member.isMe && (
                  <span className="ml-1 font-mono text-xs font-black uppercase text-[var(--skin-primary)]">
                    (YOU)
                  </span>
                )}
              </span>
            </div>
            <TokenHatchGrid tokens={member.tokens} goal={goal} />
          </div>
        ))}
      </div>
    </div>
  );
}
