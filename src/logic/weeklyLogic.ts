import type { Season } from '../types/game';
import { getServerTime as getSyncedTime } from '../services/timeService';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

type DateLike = Date | string | number | {
  toDate?: () => Date;
  toMillis?: () => number;
  seconds?: number;
} | null | undefined;

export type SeasonTimingStatus = 'upcoming' | 'active' | 'ended' | 'invalid';

export interface WeekWindows {
  start: Date;
  end: Date;
}

export interface SeasonTiming {
  seasonId: string;
  status: SeasonTimingStatus;
  weekNumber: number;
  weekId: string | null;
  seasonStartsAt: Date | null;
  seasonEndsAt: Date | null;
  weekStartsAt: Date | null;
  weekEndsAt: Date | null;
  millisecondsUntilSeasonStart: number;
  millisecondsUntilSeasonEnd: number;
}

function toDate(value: DateLike): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? new Date(value) : null;
  if (typeof value === 'object' && typeof value.toDate === 'function') {
    const date = value.toDate();
    return Number.isFinite(date.getTime()) ? date : null;
  }
  if (typeof value === 'object' && typeof value.toMillis === 'function') {
    const millis = value.toMillis();
    return Number.isFinite(millis) ? new Date(millis) : null;
  }
  if (typeof value === 'object' && typeof value.seconds === 'number') {
    return new Date(value.seconds * 1000);
  }
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function getReferenceTime(value: Date | number): number {
  return value instanceof Date ? value.getTime() : value;
}

function getSortedSeasonWeeks(season: Season) {
  return (Array.isArray(season.weeks) ? season.weeks : [])
    .map(week => ({ week, startsAt: toDate(week.startDate) }))
    .filter((item): item is { week: Season['weeks'][number]; startsAt: Date } => item.startsAt !== null)
    .sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime());
}

function getDerivedFinalWeekNumber(seasonStart: Date, seasonEnd: Date): number {
  return Math.max(1, Math.ceil((seasonEnd.getTime() - seasonStart.getTime() + 1) / WEEK_MS));
}

export function getSeasonTiming(
  season: Season,
  now: Date | number = getSyncedTime()
): SeasonTiming {
  const nowMs = getReferenceTime(now);
  const seasonStart = toDate(season.startDate);
  const seasonEnd = toDate(season.endDate);
  const invalidBase: SeasonTiming = {
    seasonId: season.id,
    status: 'invalid',
    weekNumber: 0,
    weekId: null,
    seasonStartsAt: seasonStart,
    seasonEndsAt: seasonEnd,
    weekStartsAt: null,
    weekEndsAt: null,
    millisecondsUntilSeasonStart: 0,
    millisecondsUntilSeasonEnd: 0,
  };

  if (!seasonStart || !seasonEnd || seasonEnd.getTime() < seasonStart.getTime() || !Number.isFinite(nowMs)) {
    return invalidBase;
  }

  const seasonStartMs = seasonStart.getTime();
  const seasonEndMs = seasonEnd.getTime();
  const sortedWeeks = getSortedSeasonWeeks(season);
  const finalWeekNumber = sortedWeeks.at(-1)?.week.number || getDerivedFinalWeekNumber(seasonStart, seasonEnd);

  if (nowMs < seasonStartMs) {
    return {
      ...invalidBase,
      status: 'upcoming',
      millisecondsUntilSeasonStart: seasonStartMs - nowMs,
      millisecondsUntilSeasonEnd: seasonEndMs - nowMs,
    };
  }

  if (nowMs > seasonEndMs) {
    const finalBoundary = sortedWeeks.at(-1);
    const finalStart = finalBoundary?.startsAt || new Date(seasonStartMs + (finalWeekNumber - 1) * WEEK_MS);
    return {
      ...invalidBase,
      status: 'ended',
      weekNumber: finalWeekNumber,
      weekId: `${season.id}_w${finalWeekNumber}`,
      weekStartsAt: finalStart,
      weekEndsAt: seasonEnd,
    };
  }

  let weekNumber = 1;
  let weekStartsAt = seasonStart;
  let weekEndsAt = new Date(Math.min(seasonEndMs, seasonStartMs + WEEK_MS - 1));

  if (sortedWeeks.length > 0) {
    let activeIndex = -1;
    for (let index = sortedWeeks.length - 1; index >= 0; index -= 1) {
      if (sortedWeeks[index].startsAt.getTime() <= nowMs) {
        activeIndex = index;
        break;
      }
    }
    if (activeIndex >= 0) {
      const activeBoundary = sortedWeeks[activeIndex];
      const nextBoundary = sortedWeeks[activeIndex + 1];
      weekNumber = activeBoundary.week.number;
      weekStartsAt = activeBoundary.startsAt;
      weekEndsAt = new Date(Math.min(
        seasonEndMs,
        nextBoundary ? nextBoundary.startsAt.getTime() - 1 : seasonEndMs
      ));
    }
  } else {
    weekNumber = Math.min(finalWeekNumber, Math.floor((nowMs - seasonStartMs) / WEEK_MS) + 1);
    weekStartsAt = new Date(seasonStartMs + (weekNumber - 1) * WEEK_MS);
    weekEndsAt = new Date(Math.min(seasonEndMs, weekStartsAt.getTime() + WEEK_MS - 1));
  }

  return {
    seasonId: season.id,
    status: 'active',
    weekNumber,
    weekId: `${season.id}_w${weekNumber}`,
    seasonStartsAt: seasonStart,
    seasonEndsAt: seasonEnd,
    weekStartsAt,
    weekEndsAt,
    millisecondsUntilSeasonStart: 0,
    millisecondsUntilSeasonEnd: Math.max(0, seasonEndMs - nowMs),
  };
}

export function getWeekWindows(season: Season, weekNumber: number): WeekWindows | null {
  const sortedWeeks = getSortedSeasonWeeks(season);
  const index = sortedWeeks.findIndex(item => item.week.number === weekNumber);
  const seasonStart = toDate(season.startDate);
  const seasonEnd = toDate(season.endDate);
  if (!seasonStart || !seasonEnd || weekNumber <= 0) return null;
  if (index >= 0) {
    const nextBoundary = sortedWeeks[index + 1];
    return {
      start: sortedWeeks[index].startsAt,
      end: new Date(Math.min(
        seasonEnd.getTime(),
        nextBoundary ? nextBoundary.startsAt.getTime() - 1 : seasonEnd.getTime()
      )),
    };
  }
  const start = new Date(seasonStart.getTime() + (weekNumber - 1) * WEEK_MS);
  if (start.getTime() > seasonEnd.getTime()) return null;
  return {
    start,
    end: new Date(Math.min(seasonEnd.getTime(), start.getTime() + WEEK_MS - 1)),
  };
}

export function getServerTime(): number {
  return getSyncedTime();
}

export function getCurrentSeasonWeek(season: Season, now: Date | number = getSyncedTime()): number {
  return getSeasonTiming(season, now).weekNumber;
}

export function getActiveWeekDrop(
  season: Season,
  now: Date | number = getSyncedTime()
): Season['weeks'][number] | null {
  const timing = getSeasonTiming(season, now);
  if (timing.status === 'upcoming' || timing.status === 'invalid') return null;
  return season.weeks.find(week => week.number === timing.weekNumber) || null;
}

export function isWeekUnlocked(season: Season, weekNumber: number, now: Date | number = getSyncedTime()): boolean {
  const windows = getWeekWindows(season, weekNumber);
  return !!windows && windows.start.getTime() <= getReferenceTime(now);
}

export function isWeekLocked(season: Season, weekNumber: number, now: Date | number = getSyncedTime()): boolean {
  return !isWeekUnlocked(season, weekNumber, now);
}

export function isReviewWindowOpen(season: Season, weekNumber: number, now: Date | number = getSyncedTime()): boolean {
  const windows = getWeekWindows(season, weekNumber);
  return !!windows && getReferenceTime(now) > windows.end.getTime();
}

export function isVotingWindowOpen(season: Season, weekNumber: number, now: Date | number = getSyncedTime()): boolean {
  return isReviewWindowOpen(season, weekNumber, now);
}

export function canSubmitToChallenge(season: Season, weekNumber: number, now: Date | number = getSyncedTime()): boolean {
  return isWeekUnlocked(season, weekNumber, now) && !isReviewWindowOpen(season, weekNumber, now);
}

export function canCallFieldCheck(season: Season, weekNumber: number, now: Date | number = getSyncedTime()): boolean {
  return isReviewWindowOpen(season, weekNumber, now);
}

export function canShunIt(season: Season | null): boolean {
  return !!season;
}

export function getSubmissionPointWindow(
  season: Season,
  weekNumber: number,
  now: Date | number = getSyncedTime()
): 'full' | 'late' | 'closed' {
  if (canSubmitToChallenge(season, weekNumber, now)) return 'full';
  if (isReviewWindowOpen(season, weekNumber, now)) return 'late';
  return 'closed';
}
