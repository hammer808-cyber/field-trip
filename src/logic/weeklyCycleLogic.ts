import {
  FIELDTRIP_VOTING_TIMEZONE,
  getCurrentVotingCycle,
  getVotingPhase,
  type VotingPhase,
} from '../services/votingCycleService';

export type WeeklyCyclePhase = VotingPhase;

export interface WeeklyCycleConfig {
  weekId: string;
  seasonId: string;
  phase: WeeklyCyclePhase;
  startsAt: Date;
  submissionStartsAt: Date;
  submissionEndsAt: Date;
  votingStartsAt: Date;
  votingEndsAt: Date;
  awardsStartsAt: Date;
  awardsEndsAt: Date;
  votingSlotsPerUser: number;
  categories: string[];
  bonus?: {
    enabled: boolean;
    winnerXp: number;
    consensusXp: number;
  };
  isLocked?: boolean;
  finalizedAt?: any;
}

function padWeek(week: number): string {
  return String(week).padStart(2, '0');
}

export function getIsoWeekId(value: Date | number): string {
  const date = typeof value === 'number' ? new Date(value) : new Date(value);
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((utc.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${utc.getUTCFullYear()}-W${padWeek(week)}`;
}

export function buildWeeklyCycleConfig(
  now: Date | number,
  seasonId: string,
  categories: string[],
  votingSlotsPerUser = categories.length
): WeeklyCycleConfig {
  const cycle = getCurrentVotingCycle(now, FIELDTRIP_VOTING_TIMEZONE, seasonId);
  return {
    weekId: cycle.id,
    seasonId,
    phase: getVotingPhase(now, cycle),
    startsAt: cycle.weekStart,
    submissionStartsAt: cycle.submissionStart,
    submissionEndsAt: cycle.submissionEnd,
    votingStartsAt: cycle.votingStart,
    votingEndsAt: cycle.votingEnd,
    awardsStartsAt: cycle.awardsStart,
    awardsEndsAt: cycle.awardsEnd,
    votingSlotsPerUser,
    categories,
    bonus: {
      enabled: true,
      winnerXp: 100,
      consensusXp: 20
    }
  };
}

export function isExactlyOneActiveWeeklyCycle(cycles: Array<Pick<WeeklyCycleConfig, 'phase' | 'isLocked'>>): boolean {
  return cycles.filter(cycle => cycle.phase !== 'awards' && cycle.isLocked !== true).length === 1;
}

export function canCastWeeklyVoteAt(cycle: Pick<WeeklyCycleConfig, 'phase' | 'isLocked' | 'votingStartsAt' | 'votingEndsAt'>, now: Date | number): boolean {
  const time = typeof now === 'number' ? now : now.getTime();
  return (
    cycle.phase === 'voting' &&
    cycle.isLocked !== true &&
    time >= cycle.votingStartsAt.getTime() &&
    time <= cycle.votingEndsAt.getTime()
  );
}

export function getWeeklyVoteDocumentId(weekId: string, userId: string, slotOrCategory: string): string {
  return `${weekId}_${userId}_${slotOrCategory}`;
}

export function getWeeklySnapshotPath(weekId: string, entryId: string): string {
  return `weeklyCycles/${weekId}/proofs/${entryId}`;
}
