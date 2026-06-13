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
  weekStart: Date;
  weekEnd: Date;
  submissionStart: Date;
  submissionEnd: Date;
  votingStart: Date;
  votingEnd: Date;
  awardsStart: Date;
  awardsEnd: Date;
}

export type VotingPhase = 'submission' | 'voting' | 'awards';

/**
 * Builds the canonical weekly voting cycle mapping for a given reference date and optional timezone.
 * Returns the exact boundaries for the starting Monday 00:00:00 through Sunday 23:59:59.999.
 * 
 * In this system:
 * - Monday 00:00 to Friday 23:59 = submission
 * - Saturday 00:00 to Saturday 23:59 = voting
 * - Sunday 00:00 to Sunday 23:59 = awards
 */
export function getCurrentVotingCycle(now: Date | number, timezone?: string): VotingCycle {
  const reference = typeof now === 'number' ? new Date(now) : new Date(now);
  
  // Choose whether to parse with UTC or local
  const isUtc = timezone && timezone.toUpperCase() === 'UTC';

  // Find Monday of the current week (Sunday is 0, Monday is 1, ..., Saturday is 6)
  const day = isUtc ? reference.getUTCDay() : reference.getDay();
  // Saturday has day=6, Sunday has day=0, Friday has day=5.
  // If Sunday (day=0), Monday was 6 days ago. Otherwise, day-1 days ago.
  const daysSinceMonday = day === 0 ? 6 : day - 1;

  // Let's establish Monday 00:00:00.000 for the cycle
  const monday = new Date(reference);
  if (isUtc) {
    monday.setUTCDate(monday.getUTCDate() - daysSinceMonday);
    monday.setUTCHours(0, 0, 0, 0);
  } else {
    monday.setDate(monday.getDate() - daysSinceMonday);
    monday.setHours(0, 0, 0, 0);
  }

  // Create Friday 23:59:59.999 (Submission End)
  const fridayEnd = new Date(monday);
  if (isUtc) {
    fridayEnd.setUTCDate(fridayEnd.getUTCDate() + 4);
    fridayEnd.setUTCHours(23, 59, 59, 999);
  } else {
    fridayEnd.setDate(fridayEnd.getDate() + 4);
    fridayEnd.setHours(23, 59, 59, 999);
  }

  // Create Saturday 00:00:00.000 (Voting Start)
  const saturdayStart = new Date(monday);
  if (isUtc) {
    saturdayStart.setUTCDate(saturdayStart.getUTCDate() + 5);
    saturdayStart.setUTCHours(0, 0, 0, 0);
  } else {
    saturdayStart.setDate(saturdayStart.getDate() + 5);
    saturdayStart.setHours(0, 0, 0, 0);
  }

  // Create Saturday 23:59:59.999 (Voting End)
  const saturdayEnd = new Date(monday);
  if (isUtc) {
    saturdayEnd.setUTCDate(saturdayEnd.getUTCDate() + 5);
    saturdayEnd.setUTCHours(23, 59, 59, 999);
  } else {
    saturdayEnd.setDate(saturdayEnd.getDate() + 5);
    saturdayEnd.setHours(23, 59, 59, 999);
  }

  // Create Sunday 00:00:00.000 (Awards Start)
  const sundayStart = new Date(monday);
  if (isUtc) {
    sundayStart.setUTCDate(sundayStart.getUTCDate() + 6);
    sundayStart.setUTCHours(0, 0, 0, 0);
  } else {
    sundayStart.setDate(sundayStart.getDate() + 6);
    sundayStart.setHours(0, 0, 0, 0);
  }

  // Create Sunday 23:59:59.999 (Awards End)
  const sundayEnd = new Date(monday);
  if (isUtc) {
    sundayEnd.setUTCDate(sundayEnd.getUTCDate() + 6);
    sundayEnd.setUTCHours(23, 59, 59, 999);
  } else {
    sundayEnd.setDate(sundayEnd.getDate() + 6);
    sundayEnd.setHours(23, 59, 59, 999);
  }

  return {
    weekStart: monday,
    weekEnd: sundayEnd,
    submissionStart: monday,
    submissionEnd: fridayEnd,
    votingStart: saturdayStart,
    votingEnd: saturdayEnd,
    awardsStart: sundayStart,
    awardsEnd: sundayEnd,
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
