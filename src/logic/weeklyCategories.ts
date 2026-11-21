/**
 * Weekly voting category assignment (Slice 1, Nov 21, 2026).
 *
 * Pure functions only — no Firestore imports — so both the server
 * (build endpoint, approval auto-populate hook) and the client can use
 * this module. Every approved photo is assigned to 1-2 of the six
 * accolade categories (WEEKLY_VOTE_CATEGORIES) by rule; nothing is
 * assigned to all six any more (the old build path did that).
 *
 * Design (Zach's pick, Nov 21, 2026 — option G from
 * docs/voting-system-audit.md): keep the six accolades, assign each
 * photo to 1-2 by rule.
 *
 * Shape of an assignment:
 * - `best_photo_proof` is the base category for EVERY entry. This is
 *   honest, not a cop-out: ballot eligibility already requires
 *   renderable photo media (see getWeeklyProofExclusionReasons), so
 *   every candidate is a photo proof by construction.
 * - Exactly ONE discriminating category is added, by priority:
 *   underdog_award -> best_field_note -> most_legendary_errand ->
 *   cleanest_completion -> goblin_energy_award (fallback).
 *   The priority is the deterministic tie-break when several rules
 *   match the same entry; each entry therefore lands in exactly 2
 *   categories (1 base + 1 discriminating).
 *
 * Rule grounds (all read from real Entry fields, src/types/game.ts):
 * - underdog_award: first-timer (approvedCount <= 1, counting this
 *   entry — at build time the count is the player's career approved
 *   entries, at approval time it includes the just-approved one) or
 *   low-XP player (xp < 100 — less than one full standard mission's
 *   max award, maxUiPotentialXp 100). Player context is an explicit
 *   argument so the rule never has to fetch a profile itself.
 * - best_field_note: a substantial field note. Threshold 140 chars:
 *   a one-liner ("Found it by the pier!") is ~20 chars; 140 is about
 *   two real sentences / ~25 words — a note someone actually wrote,
 *   not a caption. Reads Entry.fieldNote, falling back to Entry.note.
 * - most_legendary_errand: errand-deck entries (Entry.deckId ===
 *   'errand-deck') or high-XP missions (Entry.xpValue >= 200 — the
 *   top tier of mission face values, which top out at 250 per
 *   ProofRubricScoring.maxUiPotentialXp).
 * - cleanest_completion: high admin score (adminScore >= 80 on the
 *   0-100 normalized rubric scale — ProofRubricScore.normalizedScore
 *   is (raw / max) * 100). Reads scoring.normalizedRubricScore first,
 *   then the legacy fallbacks the candidate snapshot uses.
 * - goblin_energy_award: there is NO honest entry-level signal for
 *   this. No chaos / mischief / goblin field exists on Entry, and
 *   inventing one would be fabrication. So it is the deterministic
 *   fallback: entries no other discriminating rule claims. That keeps
 *   the ballot populated and the assignment reproducible, and the
 *   fallback is stated here, not hidden.
 */
import { WEEKLY_VOTE_CATEGORIES, type WeeklyVoteCategory } from './weeklyVoting';

/** Minimum trimmed field-note length (chars) for best_field_note. */
export const FIELD_NOTE_MIN_LENGTH = 140;
/** A player with this many approved entries (incl. this one) is a first-timer. */
export const UNDERDOG_MAX_APPROVED_COUNT = 1;
/** A player under this much lifetime XP counts as low-XP for underdog_award. */
export const UNDERDOG_MAX_XP = 100;
/** Mission face value (Entry.xpValue) at/above this marks a legendary errand. */
export const LEGENDARY_MIN_XP_VALUE = 200;
/** Admin score (0-100 normalized rubric) at/above this marks a clean completion. */
export const CLEAN_COMPLETION_MIN_ADMIN_SCORE = 80;
/** Deck whose entries are errands by definition. */
export const ERRAND_DECK_ID = 'errand-deck';

/** The subset of Entry fields the rules read. Server entries are `any`; keep it loose. */
export interface WeeklyCategoryEntryLike {
  fieldNote?: unknown;
  note?: unknown;
  deckId?: unknown;
  cardType?: unknown;
  xpValue?: unknown;
  totalXpAwarded?: unknown;
  adminScore?: unknown;
  rubricScore?: unknown;
  scoring?: {
    normalizedRubricScore?: unknown;
    weightedRubricScore?: unknown;
  } | null;
  proofImage?: unknown;
  imageUrl?: unknown;
  photoUrl?: unknown;
  mediaUrl?: unknown;
  storagePath?: unknown;
}

/** Player context the caller resolves (build: from the loaded entries + user docs; hook: from a profile read + an entries count query). */
export interface WeeklyCategoryPlayerContext {
  /** Career approved entries for this player, including the entry being assigned. */
  approvedCount: number;
  /** Lifetime XP on the player's profile (xp ?? points ?? 0). */
  xp: number;
}

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** The field note as the rules see it (Entry.fieldNote, falling back to Entry.note). */
export function getWeeklyCategoryFieldNote(entry: WeeklyCategoryEntryLike): string {
  return toTrimmedString(entry.fieldNote) || toTrimmedString(entry.note);
}

/**
 * The admin score as the rules see it (0-100 normalized rubric scale).
 * Prefers scoring.normalizedRubricScore — the field the approval flow
 * actually writes (ProofRubricScoring.normalizedRubricScore) — then the
 * legacy fallbacks the candidate snapshot reads.
 */
export function getWeeklyCategoryAdminScore(entry: WeeklyCategoryEntryLike): number {
  return (
    toNumber(entry.scoring?.normalizedRubricScore) ||
    toNumber(entry.scoring?.weightedRubricScore) ||
    toNumber(entry.adminScore) ||
    toNumber(entry.rubricScore)
  );
}

/** True when the entry carries renderable photo media (what ballot eligibility already requires). */
export function hasWeeklyCategoryPhotoProof(entry: WeeklyCategoryEntryLike): boolean {
  return Boolean(
    toTrimmedString(entry.proofImage) ||
      toTrimmedString(entry.imageUrl) ||
      toTrimmedString(entry.photoUrl) ||
      toTrimmedString(entry.mediaUrl) ||
      toTrimmedString(entry.storagePath),
  );
}

function isUnderdog(playerContext: WeeklyCategoryPlayerContext): boolean {
  return (
    playerContext.approvedCount <= UNDERDOG_MAX_APPROVED_COUNT ||
    playerContext.xp < UNDERDOG_MAX_XP
  );
}

function hasSubstantialFieldNote(entry: WeeklyCategoryEntryLike): boolean {
  return getWeeklyCategoryFieldNote(entry).length >= FIELD_NOTE_MIN_LENGTH;
}

function isLegendaryErrand(entry: WeeklyCategoryEntryLike): boolean {
  return (
    toTrimmedString(entry.deckId) === ERRAND_DECK_ID ||
    toNumber(entry.xpValue) >= LEGENDARY_MIN_XP_VALUE
  );
}

function isCleanCompletion(entry: WeeklyCategoryEntryLike): boolean {
  return getWeeklyCategoryAdminScore(entry) >= CLEAN_COMPLETION_MIN_ADMIN_SCORE;
}

/**
 * Assign 1-2 categories to an entry. Always returns best_photo_proof
 * plus exactly one discriminating category (see the module header for
 * the priority order and the goblin fallback). Never returns zero, never
 * returns more than two, never duplicates.
 */
export function assignWeeklyCategories(
  entry: WeeklyCategoryEntryLike,
  playerContext: WeeklyCategoryPlayerContext,
): WeeklyVoteCategory[] {
  const discriminating: WeeklyVoteCategory = isUnderdog(playerContext)
    ? 'underdog_award'
    : hasSubstantialFieldNote(entry)
      ? 'best_field_note'
      : isLegendaryErrand(entry)
        ? 'most_legendary_errand'
        : isCleanCompletion(entry)
          ? 'cleanest_completion'
          : 'goblin_energy_award';
  // best_photo_proof is the base; the discriminating slot is never the base.
  return ['best_photo_proof', discriminating];
}

/** Ballot id scheme (Slice 1): the category is encoded in the id, so finalize, results, and the client can tell ballots apart without a new field. */
export function getWeeklyCategoryBallotId(cycleId: string, category: WeeklyVoteCategory): string {
  return `${cycleId}_community_weekly_${category}`;
}

/** Parse the category back out of a category-ballot id. Returns null for the old single-ballot id (`{cycleId}_community_weekly`) and anything else malformed. */
export function getWeeklyCategoryFromBallotId(
  ballotId: string,
  cycleId: string,
): WeeklyVoteCategory | null {
  const prefix = `${cycleId}_community_weekly_`;
  if (!ballotId.startsWith(prefix)) return null;
  const category = ballotId.slice(prefix.length);
  return (WEEKLY_VOTE_CATEGORIES as readonly string[]).includes(category)
    ? (category as WeeklyVoteCategory)
    : null;
}

export interface WeeklyCategoryBallotPlan {
  ballotId: string;
  category: WeeklyVoteCategory;
  /** Exactly 1 — one vote per voter per category ballot. */
  maxVotesPerVoter: 1;
  eligibleProofIds: string[];
  entryIds: string[];
}

/**
 * Pure build plan: given the week's already-eligible entries (eligibility
 * filtering stays in the build endpoint) plus each owner's player
 * context, produce the six per-category ballots. The server writes
 * exactly this shape; tests pin it here without Firestore.
 */
export function buildWeeklyCategoryBallotPlan(input: {
  cycleId: string;
  entries: Array<{ id: string; entry: WeeklyCategoryEntryLike; playerContext: WeeklyCategoryPlayerContext }>;
}): WeeklyCategoryBallotPlan[] {
  const byCategory = new Map<WeeklyVoteCategory, string[]>(
    WEEKLY_VOTE_CATEGORIES.map((category) => [category, []]),
  );
  for (const { id, entry, playerContext } of input.entries) {
    for (const category of assignWeeklyCategories(entry, playerContext)) {
      byCategory.get(category)!.push(id);
    }
  }
  return WEEKLY_VOTE_CATEGORIES.map((category) => ({
    ballotId: getWeeklyCategoryBallotId(input.cycleId, category),
    category,
    maxVotesPerVoter: 1 as const,
    eligibleProofIds: byCategory.get(category)!,
    entryIds: byCategory.get(category)!,
  }));
}
