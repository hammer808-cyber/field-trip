/**
 * Client-side weekly voting helpers (Slice 2, Nov 21, 2026).
 *
 * Pure functions only — no Firestore imports — so the ballot UI, the
 * results view, and the tests can use them without a live backend.
 *
 * Two jobs:
 * 1. Per-award picks: one vote per award (maxVotesPerVoter=1 per
 *    category ballot). Picking a different photo in the same award
 *    REPLACES the pick; picking the photo already picked leaves it.
 * 2. Canonical results display: join a canonical result doc
 *    (votingCycles/{cycleId}/results/{ballotId}, shape written by
 *    runCanonicalWeeklyFinalize in server.ts) with the candidate
 *    snapshot for the same entry so the results view can show the
 *    photo, field note, and mission without a second fetch.
 */
import { WEEKLY_VOTE_CATEGORIES, type WeeklyVoteCategory } from './weeklyVoting';

/** One pick per award: the entry id the voter picked for that category, if any. */
export type WeeklyCategoryPicks = Partial<Record<WeeklyVoteCategory, string>>;

/**
 * Replace the pick for one award. A different photo replaces the
 * current pick; the same photo is a no-op. Other awards are untouched.
 */
export function replaceCategoryPick(
  picks: WeeklyCategoryPicks,
  category: WeeklyVoteCategory,
  entryId: string,
): WeeklyCategoryPicks {
  if (!entryId) return { ...picks };
  if (picks[category] === entryId) return { ...picks };
  return { ...picks, [category]: entryId };
}

/** Remove the pick for one award (used when a pick is withdrawn, never by the file path). */
export function clearCategoryPick(
  picks: WeeklyCategoryPicks,
  category: WeeklyVoteCategory,
): WeeklyCategoryPicks {
  if (!(category in picks)) return { ...picks };
  const next = { ...picks };
  delete next[category];
  return next;
}

export function getCategoryPick(picks: WeeklyCategoryPicks, category: WeeklyVoteCategory): string | null {
  return picks[category] ?? null;
}

/** How many of the six awards have a pick (draft or filed). */
export function countCategoryPicks(picks: WeeklyCategoryPicks): number {
  return WEEKLY_VOTE_CATEGORIES.filter((category) => Boolean(picks[category])).length;
}

/** True when the draft pick for an award differs from the filed pick (i.e. there is something to file). */
export function hasCategoryPickChanged(
  draftPicks: WeeklyCategoryPicks,
  filedPicks: WeeklyCategoryPicks,
  category: WeeklyVoteCategory,
): boolean {
  return (draftPicks[category] ?? null) !== (filedPicks[category] ?? null);
}

/** The winner half of a canonical result doc, as the server writes it. */
export interface CanonicalWeeklyWinnerLike {
  entryId?: unknown;
  proofId?: unknown;
  userId?: unknown;
  displayName?: unknown;
  userName?: unknown;
  voteTotal?: unknown;
}

/** A canonical result doc, as read from votingCycles/{cycleId}/results/{ballotId}. */
export interface CanonicalWeeklyResultLike {
  ballotId?: unknown;
  category?: WeeklyVoteCategory | null;
  isFinal?: unknown;
  winner?: CanonicalWeeklyWinnerLike | null;
  validVoteCount?: unknown;
}

/** The candidate snapshot for the winning entry, when the client has it loaded. */
export interface CanonicalWinnerCandidateLike {
  entryId?: unknown;
  id?: unknown;
  userId?: unknown;
  displayName?: unknown;
  userName?: unknown;
  tripTitle?: unknown;
  missionTitle?: unknown;
  challengeTitle?: unknown;
  fieldNote?: unknown;
  note?: unknown;
  proofImage?: unknown;
  imageUrl?: unknown;
  photoUrl?: unknown;
  storagePath?: unknown;
}

export interface CanonicalWinnerDisplay {
  entryId: string;
  userId: string;
  userName: string;
  tripTitle: string;
  fieldNote: string;
  proofImage: string;
  voteTotal: number;
}

/**
 * Resolve one canonical winner into display fields. The result doc
 * itself only carries entryId / userId / displayName / voteTotal, so
 * the photo, field note, and mission title come from the candidate
 * snapshot when available and fall back to honest blanks otherwise —
 * never invented copy.
 */
export function resolveCanonicalWinnerDisplay(
  result: CanonicalWeeklyResultLike | null | undefined,
  candidate: CanonicalWinnerCandidateLike | null | undefined,
): CanonicalWinnerDisplay | null {
  const winner = result?.winner;
  if (!winner) return null;
  const entryId = String(winner.entryId || winner.proofId || candidate?.entryId || candidate?.id || '').trim();
  if (!entryId) return null;
  return {
    entryId,
    userId: String(winner.userId || candidate?.userId || '').trim(),
    userName: String(winner.displayName || winner.userName || candidate?.displayName || candidate?.userName || 'Field Agent').trim(),
    tripTitle: String(candidate?.tripTitle || candidate?.missionTitle || candidate?.challengeTitle || 'Field Receipt').trim(),
    fieldNote: String(candidate?.fieldNote || candidate?.note || '').trim(),
    proofImage: String(candidate?.proofImage || candidate?.imageUrl || candidate?.photoUrl || candidate?.storagePath || '').trim(),
    voteTotal: Number(winner.voteTotal || 0),
  };
}

/** How many of the six awards have a published canonical winner. */
export function countCanonicalWinners(
  results: Partial<Record<WeeklyVoteCategory, CanonicalWeeklyResultLike | null>>,
): number {
  return WEEKLY_VOTE_CATEGORIES.filter((category) => Boolean(results[category]?.winner?.entryId || results[category]?.winner?.proofId)).length;
}

export function hasCanonicalWinners(
  results: Partial<Record<WeeklyVoteCategory, CanonicalWeeklyResultLike | null>>,
): boolean {
  return countCanonicalWinners(results) > 0;
}
