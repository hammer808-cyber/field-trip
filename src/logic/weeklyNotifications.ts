/**
 * Weekly voting notifications (Slice 3, Nov 21, 2026).
 *
 * Pure functions only — no Firestore imports — so the server (finalize
 * winner notifications in runCanonicalWeeklyFinalize, the lazy
 * voting-open fan-out endpoint) and the client (notification copy in
 * src/logic/playerNotifications.ts) can use this module, and tests can
 * pin the ids and the once-per-cycle guard without the emulator.
 *
 * Delivery is the same path as every other notification: server-written
 * docs in users/{uid}/notifications, read back by
 * subscribeToPlayerNotifications and rendered by buildNotifications in
 * src/logic/basecampViewModel.ts. No new delivery path, no push, no
 * email — the app has no push/email infra.
 *
 * Two types:
 * - `voting_open` — ballots are open for the week, go vote. One doc per
 *   player per cycle (id `voting_open_{cycleId}`), fanned out once per
 *   cycle by POST /api/voting/weekly/notify-open-if-due.
 * - `weekly_winner` — you won an award. One doc per award won (id
 *   `weekly_winner_{cycleId}_{ballotId}`), so a player winning two
 *   category ballots gets two rows, and a re-finalize writes none.
 */

import type { WeeklyVoteCategory } from './weeklyVoting';

/**
 * Display labels for the six accolade categories. Mirrors the labels in
 * src/components/VotingHub.tsx (the ballot UI) so a winner notification
 * names the same award the ballot showed. The label is denormalized
 * onto the notification doc at write time (awardLabel), so rendering
 * never needs a lookup.
 */
export const WEEKLY_VOTE_CATEGORY_LABELS: Record<WeeklyVoteCategory, string> = {
  best_field_note: 'Best Field Note',
  best_photo_proof: 'Best Photo Proof',
  most_legendary_errand: 'Most Legendary Errand',
  goblin_energy_award: 'Goblin Energy Award',
  cleanest_completion: 'Cleanest Completion',
  underdog_award: 'Underdog Award',
};

/** Human label for a ballot category, or the generic fallback for a
 * crew/tribunal ballot (which carries no accolade category). */
export function getWeeklyAwardLabel(category: string | null | undefined): string {
  if (category && category in WEEKLY_VOTE_CATEGORY_LABELS) {
    return WEEKLY_VOTE_CATEGORY_LABELS[category as WeeklyVoteCategory];
  }
  return 'Weekly award';
}

/** Deterministic doc id for a winner notification — one row per award won. */
export function getWeeklyWinnerNotificationId(cycleId: string, ballotId: string): string {
  return `weekly_winner_${cycleId}_${ballotId}`;
}

/** Deterministic doc id for a voting-open announcement — one row per player per cycle. */
export function getVotingOpenNotificationId(cycleId: string): string {
  return `voting_open_${cycleId}`;
}

/** Fields for a `weekly_winner` doc (the server adds `createdAt`). */
export function buildWeeklyWinnerNotificationDoc(input: {
  cycleId: string;
  ballotId: string;
  category: string | null | undefined;
  entryId: string;
  missionTitle: string;
  xpAwarded: number;
}): {
  type: 'weekly_winner';
  cycleId: string;
  ballotId: string;
  category: string | null;
  awardLabel: string;
  entryId: string;
  missionTitle: string;
  xpAwarded: number;
  read: boolean;
} {
  return {
    type: 'weekly_winner',
    cycleId: input.cycleId,
    ballotId: input.ballotId,
    category: input.category ?? null,
    awardLabel: getWeeklyAwardLabel(input.category),
    entryId: input.entryId,
    missionTitle: input.missionTitle || '',
    xpAwarded: Number(input.xpAwarded || 0),
    read: false,
  };
}

/** Fields for a `voting_open` doc (the server adds `createdAt`). */
export function buildVotingOpenNotificationDoc(input: {
  cycleId: string;
  seasonId: string;
}): {
  type: 'voting_open';
  cycleId: string;
  seasonId: string;
  read: boolean;
} {
  return {
    type: 'voting_open',
    cycleId: input.cycleId,
    seasonId: input.seasonId,
    read: false,
  };
}

export type VotingOpenAnnounceDueReason =
  | 'before_voting_window'
  | 'after_voting_window'
  | 'already_announced'
  | 'due';

/**
 * Once-per-cycle voting-open guard. The fan-out is due only when ALL of
 * these hold: now is inside Saturday's voting window
 * (cycle.votingStart–votingEnd), and this cycle has not been announced
 * yet (the marker field `votingOpenAnnouncedAt` on the cycle doc).
 * The endpoint additionally requires at least one built community
 * ballot before announcing — an empty ballot is not worth a nudge —
 * but that needs Firestore, so it lives in the endpoint, not here.
 */
export function isVotingOpenAnnounceDue(input: {
  nowMs: number;
  votingStartsAtMs: number;
  votingEndsAtMs: number;
  alreadyAnnounced: boolean;
}): { due: boolean; reason: VotingOpenAnnounceDueReason } {
  if (input.alreadyAnnounced) {
    return { due: false, reason: 'already_announced' };
  }
  if (input.nowMs < input.votingStartsAtMs) {
    return { due: false, reason: 'before_voting_window' };
  }
  if (input.nowMs > input.votingEndsAtMs) {
    return { due: false, reason: 'after_voting_window' };
  }
  return { due: true, reason: 'due' };
}
