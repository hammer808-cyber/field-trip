/**
 * Weekly finalize pure helpers (Slice 1, Nov 21, 2026).
 *
 * Pure functions only — no Firestore imports — so the finalize
 * idempotency story can be tested without the emulator. The server
 * (server.ts finalize-week + finalize-if-due) uses exactly these.
 *
 * XP values are the single source of truth here and must match the
 * config in src/logic/weeklyCycleLogic.ts buildWeeklyCycleConfig
 * (bonus.winnerXp 100, bonus.consensusXp 20). The server previously
 * awarded 25 for a win; 25 appears nowhere in config.
 */

/** Winner XP — matches buildWeeklyCycleConfig bonus.winnerXp. */
export const WEEKLY_WINNER_XP = 100;
/** Consensus XP for a voter who picked the winner — matches bonus.consensusXp. */
export const WEEKLY_CONSENSUS_XP = 20;

/**
 * Deterministic ledger event id for a winner XP award. Includes the
 * ballot id — the pre-Slice-1 id (`weekly_award_{cycle}_{user}_{scope}_{crew}`)
 * did NOT, so one user winning two of the six category ballots in the
 * same cycle would have the second award silently deduped as a
 * "duplicate" by awardTrustedXpInTransaction. Same inputs always give
 * the same id, so a re-finalize (or two concurrent finalizes) still
 * pays at most once per ballot win.
 */
export function getWeeklyWinnerAwardEventId(
  cycleId: string,
  ballotId: string,
  userId: string,
): string {
  return `weekly_award_${cycleId}_${ballotId}_${userId}`;
}

/**
 * The pre-Slice-1 winner event id (no ballot id). Only used by the
 * already-finalized branch as a transition check: if a winner was
 * already paid under the old scheme, a re-finalize must not pay them
 * again under the new scheme. No new awards ever use this id.
 */
export function getLegacyWeeklyWinnerAwardEventId(
  cycleId: string,
  userId: string,
  scope: string,
  crewId?: string | null,
): string {
  return `weekly_award_${cycleId}_${userId}_${scope}_${crewId || 'community'}`;
}

/** Deterministic ledger event id for a consensus XP award (one per voter per ballot win). */
export function getWeeklyConsensusAwardEventId(
  cycleId: string,
  ballotId: string,
  voterId: string,
  winnerEntryId: string,
): string {
  return `weekly_consensus_${cycleId}_${ballotId}_${voterId}_${winnerEntryId}`;
}

export interface WeeklyVoteLike {
  voterId: string;
  selectedProofIds: string[];
}

/** Voter ids whose ballot pick included the winning entry (one per voter). */
export function getWeeklyConsensusVoterIds(
  votes: WeeklyVoteLike[],
  winnerEntryId: string,
): string[] {
  const voters = new Set<string>();
  for (const vote of votes) {
    if (vote.voterId && vote.selectedProofIds.includes(winnerEntryId)) {
      voters.add(vote.voterId);
    }
  }
  return [...voters];
}

export type WeeklyFinalizeDueReason =
  | 'voting_window_open'
  | 'no_community_ballots'
  | 'already_finalized'
  | 'due';

/**
 * Lazy-finalize due check. The server calls this from the
 * finalize-if-due endpoint; the client (later slice) calls that
 * endpoint when the voting page loads.
 *
 * Due only when ALL of these hold: now is past Saturday's voting
 * window close (cycle.votingEnd), at least one community category
 * ballot exists for the cycle (a week with no built ballots is an
 * admin-build problem, not a finalize problem), and at least one of
 * those ballots has no final result yet.
 */
export function isWeeklyFinalizeDue(input: {
  nowMs: number;
  votingEndsAtMs: number;
  existingBallotIds: string[];
  finalizedBallotIds: string[];
}): { due: boolean; reason: WeeklyFinalizeDueReason } {
  if (input.nowMs <= input.votingEndsAtMs) {
    return { due: false, reason: 'voting_window_open' };
  }
  if (input.existingBallotIds.length === 0) {
    return { due: false, reason: 'no_community_ballots' };
  }
  const finalized = new Set(input.finalizedBallotIds);
  const missing = input.existingBallotIds.some((id) => !finalized.has(id));
  if (!missing) return { due: false, reason: 'already_finalized' };
  return { due: true, reason: 'due' };
}
