import {
  FIELDTRIP_VOTING_TIMEZONE,
  getCurrentVotingCycle,
  type VotingCycleStatus,
} from '../services/votingCycleService';

export const WEEKLY_VOTE_CATEGORIES = [
  'best_field_note',
  'best_photo_proof',
  'most_legendary_errand',
  'goblin_energy_award',
  'cleanest_completion',
  'underdog_award'
] as const;

export type WeeklyVoteCategory = typeof WEEKLY_VOTE_CATEGORIES[number];
export type BallotScope = 'crew_weekly' | 'community_weekly' | 'tribunal';
export type WeeklyBallotStatus = 'draft' | 'locked' | 'open' | 'closed' | 'calculated' | 'published';

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

export interface WeeklyBallotLookup {
  seasonId: string;
  seasonWeekNumber: number;
  cycleId: string;
  canonicalBallotId: string;
  canonicalCyclePath: string;
  canonicalBallotPath: string;
  canonicalEntriesPath: string;
  legacyBallotId: string;
  legacyBallotPath: string;
}

export function getWeeklyBallotLookup(
  seasonId: string,
  seasonWeekNumber: number,
  now: Date | number
): WeeklyBallotLookup {
  const cycle = getCurrentVotingCycle(now, FIELDTRIP_VOTING_TIMEZONE, seasonId);
  const canonicalBallotId = getCanonicalBallotId(cycle.id, 'community_weekly');
  const legacyBallotId = getWeeklyBallotId(seasonId, seasonWeekNumber);
  return {
    seasonId,
    seasonWeekNumber,
    cycleId: cycle.id,
    canonicalBallotId,
    canonicalCyclePath: `votingCycles/${cycle.id}`,
    canonicalBallotPath: `votingCycles/${cycle.id}/ballots/${canonicalBallotId}`,
    canonicalEntriesPath: `votingCycles/${cycle.id}/ballots/${canonicalBallotId}/entries`,
    legacyBallotId,
    legacyBallotPath: `weeklyBallots/${legacyBallotId}`,
  };
}

export type WeeklyBallotEmptyReason =
  | 'ready'
  | 'ballot_not_generated'
  | 'no_approved_nominees'
  | 'voting_opens_soon'
  | 'voting_closed'
  | 'read_permission_denied'
  | 'missing_index'
  | 'schema_mismatch';

export function getWeeklyBallotEmptyReason(input: {
  cycleStatus: VotingCycleStatus;
  ballotExists: boolean;
  nomineeCount: number;
  errorCode?: string | null;
}): WeeklyBallotEmptyReason {
  const errorCode = String(input.errorCode || '').toLowerCase();
  if (errorCode.includes('permission-denied')) return 'read_permission_denied';
  if (errorCode.includes('failed-precondition') || errorCode.includes('index')) return 'missing_index';
  if (errorCode) return 'schema_mismatch';
  if (!input.ballotExists) return 'ballot_not_generated';
  if (input.nomineeCount === 0) return 'no_approved_nominees';
  if (['upcoming', 'submissions_open', 'ballots_locked'].includes(input.cycleStatus)) return 'voting_opens_soon';
  if (['results_pending', 'results_published', 'archived'].includes(input.cycleStatus)) return 'voting_closed';
  return 'ready';
}

export function getWeeklyBallotEmptyCopy(reason?: WeeklyBallotEmptyReason): { title: string; body: string } {
  switch (reason) {
    case 'ballot_not_generated':
      return {
        title: 'This week\'s ballot has not been generated',
        body: 'An admin needs to build and lock the current weekly ballot before nominees can appear.',
      };
    case 'voting_opens_soon':
      return {
        title: 'Voting opens soon',
        body: 'Approved receipts are frozen into the ballot at the end of the submission window.',
      };
    case 'voting_closed':
      return {
        title: 'Voting is closed',
        body: 'The ballot is sealed while the server calculates and publishes results.',
      };
    case 'read_permission_denied':
      return {
        title: 'Ballot access is blocked',
        body: 'Your account could not read this ballot. An admin can verify voting eligibility and Firestore rules.',
      };
    case 'missing_index':
      return {
        title: 'Ballot index is not ready',
        body: 'The required Firestore index must finish building before these nominees can load.',
      };
    case 'schema_mismatch':
      return {
        title: 'Ballot data needs repair',
        body: 'The stored ballot does not match the canonical weekly ballot schema. Admin diagnostics has the exact failure.',
      };
    default:
      return {
        title: 'No approved nominees yet',
        body: 'This ballot needs approved submissions from other agents before you can vote.',
      };
  }
}

export function getCanonicalBallotId(cycleId: string, scope: BallotScope, crewId?: string | null): string {
  return scope === 'crew_weekly'
    ? `${cycleId}_${scope}_${String(crewId || 'missing-crew').trim()}`
    : `${cycleId}_${scope}`;
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
  id?: string;
  entryId?: string;
  userId?: string;
  uid?: string;
  ownerId?: string;
  crewId?: string;
  activeCrewId?: string;
  crewContext?: { crewId?: string | null; submittedAt?: unknown; crewSeasonId?: string | null } | null;
  seasonId?: string | null;
  status?: unknown;
  archived?: boolean;
  isArchived?: boolean;
  hidden?: boolean;
  isHidden?: boolean;
  isDeleted?: boolean;
  deleted?: boolean;
  disqualified?: boolean;
  isDisqualified?: boolean;
  isTestEntry?: boolean;
  showInVoting?: boolean;
  showInCommunityFeed?: boolean;
  visibility?: unknown;
  proofImage?: string;
  imageUrl?: string;
  photoUrl?: string;
  mediaUrl?: string;
  storagePath?: string;
  photoStoragePath?: string;
  imageStoragePath?: string;
  proofStoragePath?: string;
  approvedAt?: any;
  reviewedAt?: any;
  createdAt?: any;
  adminScore?: number;
  likeCount?: number;
  reactionCount?: number;
  countsTowardFeed?: boolean;
  countsTowardLiveStats?: boolean;
}

export function getWeeklyEntryOwnerId(entry: WeeklyEntryLike): string {
  return String(entry.userId || entry.uid || entry.ownerId || '').trim();
}

export function getWeeklyEntryCrewId(entry: WeeklyEntryLike): string {
  return String(entry.crewContext?.crewId || entry.crewId || entry.activeCrewId || '').trim();
}

export function getWeeklyEntryMediaRef(entry: WeeklyEntryLike): string {
  return String(
    entry.proofImage ||
    entry.imageUrl ||
    entry.photoUrl ||
    entry.mediaUrl ||
    entry.storagePath ||
    entry.photoStoragePath ||
    entry.imageStoragePath ||
    entry.proofStoragePath ||
    ''
  ).trim();
}

export function toWeeklyMillis(value: any): number {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getWeeklyApprovedAtMillis(entry: WeeklyEntryLike): number {
  return toWeeklyMillis(entry.approvedAt || entry.reviewedAt || entry.createdAt);
}

export function isWeeklyEntryEligible(entry: WeeklyEntryLike): boolean {
  return isApprovedWeeklyProofStatus(entry.status) &&
    entry.archived !== true &&
    entry.isArchived !== true &&
    entry.hidden !== true &&
    entry.isHidden !== true &&
    entry.deleted !== true &&
    entry.isDeleted !== true &&
    entry.disqualified !== true &&
    entry.isDisqualified !== true &&
    entry.isTestEntry !== true &&
    entry.showInVoting !== false &&
    entry.countsTowardFeed !== false &&
    entry.countsTowardLiveStats !== false;
}

export function getWeeklyProofExclusionReasons(entry: WeeklyEntryLike, params: {
  seasonId: string;
  scope: BallotScope;
  submissionStartsAt: Date;
  submissionEndsAt: Date;
  ballotLocksAt: Date;
  crewId?: string | null;
}): string[] {
  const reasons: string[] = [];
  const approvedAt = getWeeklyApprovedAtMillis(entry);
  const ownerId = getWeeklyEntryOwnerId(entry);
  const crewId = getWeeklyEntryCrewId(entry);
  if (!isApprovedWeeklyProofStatus(entry.status)) reasons.push(`status:${String(entry.status || 'missing')}`);
  if (!ownerId) reasons.push('missing_owner');
  if (!getWeeklyEntryMediaRef(entry)) reasons.push('missing_media');
  if (entry.seasonId !== params.seasonId) reasons.push('season_mismatch');
  if (entry.archived || entry.isArchived || entry.hidden || entry.isHidden || entry.deleted || entry.isDeleted || entry.disqualified || entry.isDisqualified) reasons.push('hidden_deleted_or_disqualified');
  if (entry.isTestEntry === true) reasons.push('test_entry');
  if (entry.showInVoting === false) reasons.push('show_in_voting_false');
  if (!approvedAt) reasons.push('missing_approved_at');
  if (approvedAt && approvedAt < params.submissionStartsAt.getTime()) reasons.push('approved_before_submission_window');
  if (approvedAt && approvedAt > params.submissionEndsAt.getTime()) reasons.push('approved_after_submission_window');
  if (approvedAt && approvedAt > params.ballotLocksAt.getTime()) reasons.push('approved_after_ballot_lock');
  if (params.scope === 'crew_weekly') {
    if (!crewId) reasons.push('missing_crew');
    if (params.crewId && crewId && crewId !== params.crewId) reasons.push('crew_mismatch');
  }
  if (params.scope === 'community_weekly' && entry.showInCommunityFeed === false) reasons.push('not_community_visible');
  return reasons;
}

export function isWeeklyProofEligible(entry: WeeklyEntryLike, params: {
  seasonId: string;
  scope: BallotScope;
  submissionStartsAt: Date;
  submissionEndsAt: Date;
  ballotLocksAt: Date;
  crewId?: string | null;
}): boolean {
  return getWeeklyProofExclusionReasons(entry, params).length === 0;
}

export function isWeeklyCandidateEligible(candidate: WeeklyCandidateLike, category: string): boolean {
  const categories = normalizeWeeklyCandidateCategories(candidate.categories);
  return candidate.isEligible !== false &&
    candidate.isDisqualified !== true &&
    candidate.archived !== true &&
    categories.includes(category);
}

export function normalizeWeeklyCandidateCategories(value: unknown): WeeklyVoteCategory[] {
  if (!Array.isArray(value) || value.length === 0) return [...WEEKLY_VOTE_CATEGORIES];
  const canonical = value.filter(isWeeklyVoteCategory);
  // Older ballots used presentation labels instead of stable category IDs.
  // Those records represented general eligibility, so preserve that meaning.
  return canonical.length > 0 ? Array.from(new Set(canonical)) : [...WEEKLY_VOTE_CATEGORIES];
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
  'Canonical weekly ballots use votingCycles/{cycleId}/ballots/{ballotId}/votes/{voterId}. Legacy weeklyBallots, ballotCandidates, votes, weeklyVotes, and voteEvents are preserved as historical compatibility data.';
