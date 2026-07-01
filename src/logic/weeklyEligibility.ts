import {
  getEntryApprovedTime,
  getEntryChallengeId,
  getEntryCrewId,
  getEntryDeckId,
  getEntryEarnedXp,
  getEntryFieldNote,
  getEntryId,
  getEntryOwnerId,
  getEntrySeasonId,
  getEntrySubmittedTime,
  getProofDistributionExclusionReasons,
  getProofImageReference,
  isWeeklyProofDistributionEligible
} from './proofDistribution';
import { canCastWeeklyVoteAt, getWeeklyVoteDocumentId, type WeeklyCycleConfig } from './weeklyCycleLogic';

export interface WeeklyProofSnapshot {
  entryId: string;
  userId: string;
  challengeId: string;
  deckId: string;
  seasonId: string;
  crewId: string | null;
  photoUrl: string;
  fieldNote: string;
  earnedXp: number;
  approvedAtMillis: number;
  submittedAtMillis: number;
  sourceEntryPath: string;
  isEligible: boolean;
  isDisqualified: boolean;
  disqualifiedReason: string | null;
  snapshottedAtMillis: number;
}

export interface WeeklyVoteAttempt {
  voterId: string;
  voterCrewId?: string | null;
  entry: any;
  cycle: Pick<WeeklyCycleConfig, 'weekId' | 'phase' | 'isLocked' | 'votingStartsAt' | 'votingEndsAt'>;
  now: Date | number;
  slotOrCategory: string;
  existingVoteIds?: Set<string>;
  enforceCrewRestriction?: boolean;
}

export function getWeeklyProofEligibilityReasons(entry: any, cycle?: Pick<WeeklyCycleConfig, 'seasonId' | 'startsAt' | 'awardsEndsAt'>): string[] {
  const reasons = getProofDistributionExclusionReasons(entry);
  if (!isWeeklyProofDistributionEligible(entry)) reasons.push('weekly_voting_disabled');
  if (cycle?.seasonId && getEntrySeasonId(entry) && getEntrySeasonId(entry) !== cycle.seasonId) reasons.push('different_season');
  const approvedTime = getEntryApprovedTime(entry);
  if (cycle && approvedTime > 0) {
    if (approvedTime < cycle.startsAt.getTime()) reasons.push('approved_before_cycle');
    if (approvedTime > cycle.awardsEndsAt.getTime()) reasons.push('approved_after_cycle');
  }
  return [...new Set(reasons)];
}

export function isWeeklyProofEligible(entry: any, cycle?: Pick<WeeklyCycleConfig, 'seasonId' | 'startsAt' | 'awardsEndsAt'>): boolean {
  return getWeeklyProofEligibilityReasons(entry, cycle).length === 0;
}

export function buildWeeklyProofSnapshot(entry: any, cycle: Pick<WeeklyCycleConfig, 'weekId' | 'seasonId'>, snapshottedAt: Date | number): WeeklyProofSnapshot {
  const entryId = getEntryId(entry);
  const reasons = getWeeklyProofEligibilityReasons(entry);
  return {
    entryId,
    userId: getEntryOwnerId(entry),
    challengeId: getEntryChallengeId(entry),
    deckId: getEntryDeckId(entry),
    seasonId: getEntrySeasonId(entry) || cycle.seasonId,
    crewId: getEntryCrewId(entry) || null,
    photoUrl: getProofImageReference(entry),
    fieldNote: getEntryFieldNote(entry),
    earnedXp: getEntryEarnedXp(entry),
    approvedAtMillis: getEntryApprovedTime(entry),
    submittedAtMillis: getEntrySubmittedTime(entry),
    sourceEntryPath: `entries/${entryId}`,
    isEligible: reasons.length === 0,
    isDisqualified: reasons.includes('disqualified'),
    disqualifiedReason: reasons.length > 0 ? reasons.join(',') : null,
    snapshottedAtMillis: typeof snapshottedAt === 'number' ? snapshottedAt : snapshottedAt.getTime()
  };
}

export function getWeeklyVoteRejectionReason(input: WeeklyVoteAttempt): string | null {
  if (!canCastWeeklyVoteAt(input.cycle, input.now)) return 'VOTING_WINDOW_CLOSED';
  if (!isWeeklyProofEligible(input.entry)) return 'PROOF_NOT_ELIGIBLE';

  const ownerId = getEntryOwnerId(input.entry);
  if (!ownerId) return 'ENTRY_OWNER_MISSING';
  if (ownerId === input.voterId) return 'SELF_VOTE_PROHIBITED';
  if (input.enforceCrewRestriction && input.voterCrewId && getEntryCrewId(input.entry) === input.voterCrewId) {
    return 'CREW_VOTE_PROHIBITED';
  }

  const voteId = getWeeklyVoteDocumentId(input.cycle.weekId, input.voterId, input.slotOrCategory);
  if (input.existingVoteIds?.has(voteId)) return 'VOTE_ALREADY_CAST';

  return null;
}

export function makeWeeklyBonusScoreEventId(weekId: string, entryId: string, bonusType: 'winner' | 'consensus', userId: string): string {
  return `weeklyBonus_${weekId}_${entryId}_${bonusType}_${userId}`;
}
