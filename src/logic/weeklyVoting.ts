export const WEEKLY_VOTE_CATEGORIES = [
  'best_field_note',
  'best_photo_proof',
  'most_legendary_errand',
  'goblin_energy_award',
  'cleanest_completion',
  'underdog_award'
] as const;

export type WeeklyVoteCategory = typeof WEEKLY_VOTE_CATEGORIES[number];

export const APPROVED_PROOF_STATUSES = [
  'approved',
  'approved_by_admin',
  'auto_approved',
  'completed',
  'verified',
  'retry-approved'
] as const;

export function getWeeklyBallotId(seasonId: string, weekNumber: number): string {
  return `${seasonId}_${weekNumber}`;
}

export function getWeeklyVoteId(userId: string, seasonId: string, weekNumber: number, category: string): string {
  return `${userId}_${seasonId}_w${weekNumber}_${category}`;
}

export function isWeeklyVoteCategory(category: unknown): category is WeeklyVoteCategory {
  return typeof category === 'string' && WEEKLY_VOTE_CATEGORIES.includes(category as WeeklyVoteCategory);
}

export function normalizeWeeklyProofStatus(status: unknown): string {
  return String(status || '').toLowerCase().trim();
}

export function isApprovedWeeklyProofStatus(status: unknown): boolean {
  return APPROVED_PROOF_STATUSES.includes(normalizeWeeklyProofStatus(status) as any);
}

export interface WeeklyCandidateLike {
  entryId?: string;
  isEligible?: boolean;
  isDisqualified?: boolean;
  archived?: boolean;
  status?: unknown;
  categories?: unknown;
  userId?: string;
  uid?: string;
  crewId?: string;
}

export interface WeeklyEntryLike {
  userId?: string;
  uid?: string;
  crewId?: string;
  status?: unknown;
  archived?: boolean;
  isArchived?: boolean;
  disqualified?: boolean;
  isDisqualified?: boolean;
  countsTowardFeed?: boolean;
  countsTowardLiveStats?: boolean;
}

export function getWeeklyEntryOwnerId(entry: WeeklyEntryLike): string {
  return String(entry.userId || entry.uid || '').trim();
}

export function getWeeklyEntryCrewId(entry: WeeklyEntryLike): string {
  return String(entry.crewId || '').trim();
}

export function isWeeklyEntryEligible(entry: WeeklyEntryLike): boolean {
  return isApprovedWeeklyProofStatus(entry.status) &&
    entry.archived !== true &&
    entry.isArchived !== true &&
    entry.disqualified !== true &&
    entry.isDisqualified !== true &&
    entry.countsTowardFeed !== false &&
    entry.countsTowardLiveStats !== false;
}

export function isWeeklyCandidateEligible(candidate: WeeklyCandidateLike, category: string): boolean {
  const categories = Array.isArray(candidate.categories) ? candidate.categories : [];
  return candidate.isEligible !== false &&
    candidate.isDisqualified !== true &&
    candidate.archived !== true &&
    categories.includes(category);
}

export interface WeeklyVotingRestrictionInput {
  voterId: string;
  voterCrewId?: string;
  entry: WeeklyEntryLike;
  enforceCrewRestriction?: boolean;
}

export function getWeeklyVotingRestriction(input: WeeklyVotingRestrictionInput): string | null {
  const ownerId = getWeeklyEntryOwnerId(input.entry);
  if (!ownerId) return 'ENTRY_OWNER_MISSING';
  if (ownerId === input.voterId) return 'SELF_VOTE_PROHIBITED';

  if (input.enforceCrewRestriction) {
    const entryCrewId = getWeeklyEntryCrewId(input.entry);
    if (entryCrewId && input.voterCrewId && entryCrewId === input.voterCrewId) {
      return 'CREW_VOTE_PROHIBITED';
    }
  }

  return null;
}

export const WEEKLY_VOTING_COMPATIBILITY_NOTE =
  'Canonical weekly votes use votes/{userId}_{seasonId}_w{weekNumber}_{category}. Legacy weeklyVotes and voteEvents are preserved as historical data and are not read for new tallies.';
