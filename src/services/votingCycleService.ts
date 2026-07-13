/**
 * CANONICAL WEEKLY VOTING CYCLE SERVICE
 * 
 * One source of truth for the Voting Hub weekly cycle:
 * - Monday-Friday = matchup/submission period
 * - Saturday = 24-hour voting window
 * - Sunday = awards/results released
 * - Monday = new cycle starts
 */

export interface VotingCycle {
  id: string;
  seasonId?: string;
  timezone: 'America/Los_Angeles';
  weekStart: Date;
  weekEnd: Date;
  submissionStart: Date;
  submissionEnd: Date;
  ballotLocksAt: Date;
  votingStart: Date;
  votingEnd: Date;
  resultsPublishAt: Date;
  awardsStart: Date;
  awardsEnd: Date;
  status: VotingCycleStatus;
  ballotVersion: number;
}

export type VotingPhase = 'submission' | 'voting' | 'awards';
export type VotingCycleStatus =
  | 'upcoming'
  | 'submissions_open'
  | 'ballots_locked'
  | 'voting_open'
  | 'results_pending'
  | 'results_published'
  | 'archived';

export const FIELDTRIP_VOTING_TIMEZONE = 'America/Los_Angeles' as const;

function getZonedParts(date: Date, timezone = FIELDTRIP_VOTING_TIMEZONE) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    weekday: 'short',
  }).formatToParts(date);
  const part = (type: string) => parts.find(item => item.type === type)?.value || '';
  const hourRaw = Number(part('hour'));
  return {
    year: Number(part('year')),
    month: Number(part('month')),
    day: Number(part('day')),
    hour: hourRaw === 24 ? 0 : hourRaw,
    minute: Number(part('minute')),
    second: Number(part('second')),
    weekday: part('weekday'),
  };
}

function getTimeZoneOffsetMs(date: Date, timezone = FIELDTRIP_VOTING_TIMEZONE): number {
  const parts = getZonedParts(date, timezone);
  const zonedAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second, 0);
  return zonedAsUtc - Math.floor(date.getTime() / 1000) * 1000;
}

function zonedLocalToUtc(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  millisecond = 0,
  timezone = FIELDTRIP_VOTING_TIMEZONE
): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, second, millisecond));
  const offset = getTimeZoneOffsetMs(guess, timezone);
  return new Date(guess.getTime() - offset);
}

function addLocalDays(year: number, month: number, day: number, days: number) {
  const date = new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0, 0));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function weekdayIndex(weekday: string): number {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday);
}

function getWeekIdFromLocalMonday(year: number, month: number, day: number): string {
  const localNoon = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
  const thursday = new Date(localNoon);
  thursday.setUTCDate(localNoon.getUTCDate() + 3);
  const weekYear = thursday.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(weekYear, 0, 4, 12, 0, 0, 0));
  const firstDay = firstThursday.getUTCDay() || 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() + 4 - firstDay);
  const weekNumber = 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return `${weekYear}-W${String(weekNumber).padStart(2, '0')}`;
}

function getCycleStatus(now: Date, cycle: Pick<VotingCycle, 'submissionStart' | 'ballotLocksAt' | 'votingStart' | 'votingEnd' | 'resultsPublishAt' | 'awardsEnd'>): VotingCycleStatus {
  const time = now.getTime();
  if (time < cycle.submissionStart.getTime()) return 'upcoming';
  if (time < cycle.ballotLocksAt.getTime()) return 'submissions_open';
  if (time < cycle.votingStart.getTime()) return 'ballots_locked';
  if (time <= cycle.votingEnd.getTime()) return 'voting_open';
  if (time < cycle.resultsPublishAt.getTime()) return 'results_pending';
  if (time <= cycle.awardsEnd.getTime()) return 'results_published';
  return 'archived';
}

/**
 * Builds the canonical weekly voting cycle mapping for a given reference date and optional timezone.
 * Returns the exact boundaries for the starting Monday 00:00:00 through Sunday 23:59:59.999.
 * 
 * In this system:
 * - Monday 00:00 to Friday 23:59 = submission
 * - Saturday 00:00 to Saturday 23:59 = voting
 * - Sunday 00:00 to Sunday 23:59 = awards
 */
export function getCurrentVotingCycle(now: Date | number, timezone: string = FIELDTRIP_VOTING_TIMEZONE, seasonId?: string): VotingCycle {
  const reference = typeof now === 'number' ? new Date(now) : new Date(now);
  const normalizedTimezone = timezone === 'UTC' ? 'UTC' : FIELDTRIP_VOTING_TIMEZONE;
  const parts = normalizedTimezone === 'UTC'
    ? {
      year: reference.getUTCFullYear(),
      month: reference.getUTCMonth() + 1,
      day: reference.getUTCDate(),
      weekday: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][reference.getUTCDay()],
    }
    : getZonedParts(reference, normalizedTimezone);
  const day = weekdayIndex(parts.weekday);
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  const mondayLocal = addLocalDays(parts.year, parts.month, parts.day, -daysSinceMonday);
  const localToUtc = (days: number, hour: number, minute = 0, second = 0, ms = 0) => {
    const local = addLocalDays(mondayLocal.year, mondayLocal.month, mondayLocal.day, days);
    return normalizedTimezone === 'UTC'
      ? new Date(Date.UTC(local.year, local.month - 1, local.day, hour, minute, second, ms))
      : zonedLocalToUtc(local.year, local.month, local.day, hour, minute, second, ms, normalizedTimezone);
  };

  const monday = localToUtc(0, 0);
  const fridayEnd = localToUtc(4, 23, 59, 59, 999);
  const saturdayStart = localToUtc(5, 0);
  const saturdayEnd = localToUtc(5, 23, 59, 59, 999);
  const sundayStart = localToUtc(6, 0);
  const sundayResults = localToUtc(6, 9);
  const sundayEnd = localToUtc(6, 23, 59, 59, 999);
  const id = getWeekIdFromLocalMonday(mondayLocal.year, mondayLocal.month, mondayLocal.day);
  const status = getCycleStatus(reference, {
    submissionStart: monday,
    ballotLocksAt: saturdayStart,
    votingStart: saturdayStart,
    votingEnd: saturdayEnd,
    resultsPublishAt: sundayResults,
    awardsEnd: sundayEnd,
  });

  return {
    id,
    seasonId,
    timezone: FIELDTRIP_VOTING_TIMEZONE,
    weekStart: monday,
    weekEnd: sundayEnd,
    submissionStart: monday,
    submissionEnd: fridayEnd,
    ballotLocksAt: saturdayStart,
    votingStart: saturdayStart,
    votingEnd: saturdayEnd,
    resultsPublishAt: sundayResults,
    awardsStart: sundayStart,
    awardsEnd: sundayEnd,
    status,
    ballotVersion: 1,
  };
}

/**
 * Returns the active VotingPhase ('submission', 'voting', or 'awards') based on the current reference time.
 */
export function getVotingPhase(now: Date | number, cycle: VotingCycle): VotingPhase {
  const time = typeof now === 'number' ? now : now.getTime();
  const votingStart = cycle.votingStart.getTime();
  const awardsStart = cycle.awardsStart.getTime();

  if (time < votingStart) {
    return 'submission';
  } else if (time < awardsStart) {
    return 'voting';
  } else {
    return 'awards';
  }
}

export function getCycleDocumentData(cycle: VotingCycle, seasonId: string) {
  return {
    id: cycle.id,
    seasonId,
    timezone: FIELDTRIP_VOTING_TIMEZONE,
    submissionStartsAt: cycle.submissionStart,
    submissionEndsAt: cycle.submissionEnd,
    ballotLocksAt: cycle.ballotLocksAt,
    votingStartsAt: cycle.votingStart,
    votingEndsAt: cycle.votingEnd,
    resultsPublishAt: cycle.resultsPublishAt,
    status: cycle.status,
    ballotVersion: cycle.ballotVersion,
  };
}

/**
 * Calculates the number of days remaining in the submission period (rounded up).
 * Returns 0 if already finished.
 */
export function getDaysLeftInSubmissionWindow(now: Date | number, cycle: VotingCycle): number {
  const time = typeof now === 'number' ? now : now.getTime();
  const end = cycle.submissionEnd.getTime();
  if (time >= end) return 0;
  
  const msd = 1000 * 60 * 60 * 24;
  return Math.max(0, Math.ceil((end - time) / msd));
}

/**
 * Calculates the number of hours remaining in the Saturday voting window (rounded up).
 * If phase is before Saturday, returns 24.
 * Returns 0 if already finished.
 */
export function getVotingHoursLeft(now: Date | number, cycle: VotingCycle): number {
  const time = typeof now === 'number' ? now : now.getTime();
  const end = cycle.votingEnd.getTime();
  if (time >= end) return 0;
  if (time < cycle.votingStart.getTime()) return 24;
  
  const msh = 1000 * 60 * 60;
  return Math.max(0, Math.ceil((end - time) / msh));
}

/**
 * Returns an expressive atmospheric label suitable for display in terminal widgets, dashboard headers,
 * or status boxes.
 */
export function getStationClockLabel(now: Date | number, cycle: VotingCycle): string {
  const phase = getVotingPhase(now, cycle);
  const time = typeof now === 'number' ? now : now.getTime();

  if (phase === 'submission') {
    const days = getDaysLeftInSubmissionWindow(now, cycle);
    return `SUBMISSION WINDOW ACTIVE // ${days}D REMAINING`;
  } else if (phase === 'voting') {
    const hours = getVotingHoursLeft(now, cycle);
    return `TRIBUNAL CONSENSUS ACTIVE // ${hours}H REMAINING`;
  } else {
    // Sunday / Awards
    const nextMonday = new Date(cycle.weekEnd.getTime() + 1);
    const msh = 1000 * 60 * 60;
    const resetHours = Math.max(0, Math.ceil((nextMonday.getTime() - time) / msh));
    return `AWARDS BROADCAST // CYCLE RESET IN ${resetHours}H`;
  }
}

/**
 * Returns true if user is permitted to vote during the current reference clock.
 */
export function canVote(now: Date | number, cycle: VotingCycle): boolean {
  return getVotingPhase(now, cycle) === 'voting';
}

/**
 * Returns true if user can view the weekly awards/results.
 */
export function canViewAwards(now: Date | number, cycle: VotingCycle): boolean {
  return getVotingPhase(now, cycle) === 'awards';
}
