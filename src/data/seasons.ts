/**
 * Seasonal calendar — pure, no Firebase.
 *
 * Single authority for Fieldtrip seasons and events (decided Nov 21, 2026):
 * - Seasons are METEOROLOGICAL, hard-coded, recurring every year:
 *   spring Mar 1–May 31, summer Jun 1–Aug 31, fall Sep 1–Nov 30,
 *   winter Dec 1–Feb 28/29 (leap-year aware).
 * - Gobble & Glow is an EVENT, not a season. It runs Nov 1–Jan 11 every
 *   year (Zach, Nov 21, 2026). Events are a separate list from seasons.
 *
 * All date math is in America/Los_Angeles. A plain `new Date('2026-06-01')`
 * parses as UTC midnight, which is May 31 in PT, so season boundaries must
 * never be built that way: every comparison here goes through PT calendar
 * parts (year/month/day as seen in PT), reduced to a UTC day number.
 * Returned Dates are noon UTC on the PT calendar day they name, so their
 * PT calendar date is the date they claim to be.
 */

export const SEASON_TIME_ZONE = 'America/Los_Angeles';

export type SeasonId = 'spring' | 'summer' | 'fall' | 'winter';

export interface CalendarSeason {
  id: SeasonId;
  name: string;
  /** 1-based month the season starts on (PT). */
  startMonth: number;
  startDay: number;
  /** 1-based month the season ends on (PT). For winter this is 2 (Feb);
   *  the end day is 28, or 29 in a leap year — see getSeasonEndDayNumber. */
  endMonth: number;
  endDay: number;
}

export const SEASONS: readonly CalendarSeason[] = [
  { id: 'spring', name: 'Spring', startMonth: 3, startDay: 1, endMonth: 5, endDay: 31 },
  { id: 'summer', name: 'Summer', startMonth: 6, startDay: 1, endMonth: 8, endDay: 31 },
  { id: 'fall', name: 'Fall', startMonth: 9, startDay: 1, endMonth: 11, endDay: 30 },
  { id: 'winter', name: 'Winter', startMonth: 12, startDay: 1, endMonth: 2, endDay: 28 },
] as const;

export function getSeasonById(id: SeasonId): CalendarSeason {
  return SEASONS.find((season) => season.id === id) as CalendarSeason;
}

/** PT calendar parts (year, 1-based month, day) for a Date. */
export function getPtDateParts(date: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SEASON_TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date);
  const byType = new Map(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(byType.get('year')),
    month: Number(byType.get('month')),
    day: Number(byType.get('day')),
  };
}

/** UTC day number for a PT calendar date — comparable across dates, DST-proof. */
function ptDayNumber(year: number, month: number, day: number): number {
  return Date.UTC(year, month - 1, day) / 86_400_000;
}

function ptDayNumberForDate(date: Date): number {
  const { year, month, day } = getPtDateParts(date);
  return ptDayNumber(year, month, day);
}

export function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

/**
 * The year a season starts in, for a date inside that season.
 * Winter spans the year boundary: a Jan/Feb date belongs to the season
 * that started the previous December.
 */
function getSeasonStartYear(season: CalendarSeason, date: Date): number {
  const { year, month } = getPtDateParts(date);
  if (season.id === 'winter' && month <= 2) return year - 1;
  return year;
}

function getSeasonStartDayNumber(season: CalendarSeason, startYear: number): number {
  return ptDayNumber(startYear, season.startMonth, season.startDay);
}

function getSeasonEndDayNumber(season: CalendarSeason, startYear: number): number {
  if (season.id === 'winter') {
    const endYear = startYear + 1;
    return ptDayNumber(endYear, 2, isLeapYear(endYear) ? 29 : 28);
  }
  return ptDayNumber(startYear, season.endMonth, season.endDay);
}

/** A Date at noon UTC on the given PT calendar day. */
function ptCalendarDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

export function getSeasonForDate(date: Date): CalendarSeason {
  const { month } = getPtDateParts(date);
  if (month === 12 || month <= 2) return getSeasonById('winter');
  if (month <= 5) return getSeasonById('spring');
  if (month <= 8) return getSeasonById('summer');
  return getSeasonById('fall');
}

export function getCurrentSeason(now: Date = new Date()): CalendarSeason {
  return getSeasonForDate(now);
}

const SEASON_ORDER: readonly SeasonId[] = ['spring', 'summer', 'fall', 'winter'];

/** The season that starts next after `now` (the season after the current one). */
export function getNextSeason(now: Date = new Date()): CalendarSeason {
  const current = getSeasonForDate(now);
  const nextIndex = (SEASON_ORDER.indexOf(current.id) + 1) % SEASON_ORDER.length;
  return getSeasonById(SEASON_ORDER[nextIndex]);
}

/**
 * Whole days left in the current season after today: 0 on the season's
 * last day, 1 the day before, and so on.
 */
export function getDaysRemainingInSeason(now: Date = new Date()): number {
  const season = getSeasonForDate(now);
  const startYear = getSeasonStartYear(season, now);
  return getSeasonEndDayNumber(season, startYear) - ptDayNumberForDate(now);
}

/**
 * Date of the next yearly occurrence of a season's start, strictly after
 * today's PT date (so asking for summer's start on Jun 1 returns next
 * year's Jun 1). The year is derived from the calendar, never hard-coded —
 * e.g. from a fall date the next summer start is the following calendar year.
 * Returned as noon UTC on that PT calendar day.
 */
export function getNextSeasonStart(seasonId: SeasonId, now: Date = new Date()): Date {
  const season = getSeasonById(seasonId);
  const { year } = getPtDateParts(now);
  const today = ptDayNumberForDate(now);
  let startYear = year;
  if (getSeasonStartDayNumber(season, startYear) <= today) startYear += 1;
  return ptCalendarDate(startYear, season.startMonth, season.startDay);
}

// ---------------------------------------------------------------------------
// Events (separate list from seasons)
// ---------------------------------------------------------------------------

export interface CalendarEvent {
  id: string;
  name: string;
  /** PT calendar month/day the event opens (inclusive). */
  startMonth: number;
  startDay: number;
  /** PT calendar month/day the event closes (inclusive). */
  endMonth: number;
  endDay: number;
  /**
   * True when the event recurs every year on those month/day dates.
   * A recurring event's window may span the year boundary (Nov 1–Jan 11
   * starts in year Y and ends in year Y+1). All events in the list recur.
   */
  recursYearly: boolean;
}

export const EVENTS: readonly CalendarEvent[] = [
  {
    id: 'gobble-and-glow',
    name: 'Gobble & Glow',
    startMonth: 11,
    startDay: 1,
    endMonth: 1,
    endDay: 11,
    recursYearly: true,
  },
] as const;

export function getEventById(eventId: string): CalendarEvent | undefined {
  return EVENTS.find((event) => event.id === eventId);
}

export interface EventWindow {
  /** PT calendar year the window starts in. */
  startYear: number;
  startMonth: number;
  startDay: number;
  /** PT calendar year the window ends in (startYear + 1 for a window that
   *  spans the year boundary, else startYear). */
  endYear: number;
  endMonth: number;
  endDay: number;
  startDayNumber: number;
  endDayNumber: number;
}

function eventWindowForStartYear(event: CalendarEvent, startYear: number): EventWindow {
  const endYear = startYear + (event.endMonth < event.startMonth ? 1 : 0);
  return {
    startYear,
    startMonth: event.startMonth,
    startDay: event.startDay,
    endYear,
    endMonth: event.endMonth,
    endDay: event.endDay,
    startDayNumber: ptDayNumber(startYear, event.startMonth, event.startDay),
    endDayNumber: ptDayNumber(endYear, event.endMonth, event.endDay),
  };
}

/**
 * The event window that contains `now`, or — when `now` is outside every
 * window — the next window starting after today. For a recurring event
 * there is always a next window.
 */
export function getEventWindow(eventId: string, now: Date = new Date()): EventWindow | undefined {
  const event = getEventById(eventId);
  if (!event) return undefined;
  const today = ptDayNumberForDate(now);
  const { year } = getPtDateParts(now);
  // A window starting this year or last year can contain today (a window
  // spanning the year boundary starts in the previous calendar year).
  for (const startYear of [year - 1, year]) {
    const window = eventWindowForStartYear(event, startYear);
    if (today >= window.startDayNumber && today <= window.endDayNumber) return window;
  }
  // Next window after today: the one starting this year if it has not
  // started yet, else next year's. (All events in the list recur yearly;
  // a future fixed-window event would need its own start/end years.)
  const thisYear = eventWindowForStartYear(event, year);
  return today < thisYear.startDayNumber ? thisYear : eventWindowForStartYear(event, year + 1);
}

/** True when `now`'s PT calendar date falls inside the event's window (inclusive both ends). */
export function isEventActive(eventId: string, now: Date = new Date()): boolean {
  const window = getEventWindow(eventId, now);
  if (!window) return false;
  const today = ptDayNumberForDate(now);
  return today >= window.startDayNumber && today <= window.endDayNumber;
}

export function getActiveEvents(now: Date = new Date()): CalendarEvent[] {
  return EVENTS.filter((event) => isEventActive(event.id, now));
}

/**
 * Where `now` sits relative to an event's PT window (inclusive both ends).
 * 'unknown' when the event id is not in the calendar — callers treat that
 * as "no event gate applies" rather than locking the deck.
 * A recurring event never reports 'ended': in the gap between windows it
 * reports 'not-started', with the next window's start as the date to show.
 */
export function getEventStatus(
  eventId: string,
  now: Date = new Date(),
): 'not-started' | 'active' | 'ended' | 'unknown' {
  const event = getEventById(eventId);
  if (!event) return 'unknown';
  const window = getEventWindow(eventId, now);
  if (!window) return 'unknown';
  const today = ptDayNumberForDate(now);
  if (today >= window.startDayNumber && today <= window.endDayNumber) return 'active';
  // 'ended' is unreachable while every event recurs yearly (the gap
  // reports 'not-started'); the value stays in the union for a future
  // fixed-window event.
  return 'not-started';
}

/**
 * The week number of `now` inside its calendar season (Zach, Nov 21, 2026:
 * the week number shown is the season's week number, not the ISO week and
 * not the Firestore season doc's week). Weeks are Monday-anchored, like
 * voting weeks: week 1 is the Monday–Sunday week containing the season's
 * first day. So fall 2026 (Sep 1, a Tuesday) opens with the week of
 * Monday Aug 31, and Nov 21, 2026 is fall week 12. A date in the first
 * few days of a season is always week 1.
 */
export function getSeasonWeekNumber(now: Date = new Date()): number {
  const season = getSeasonForDate(now);
  const startYear = getSeasonStartYear(season, now);
  const seasonStartDay = getSeasonStartDayNumber(season, startYear);
  // UTC day number of the Monday of the week containing a day number
  // (getUTCDay: 0 = Sunday, so Monday is (day + 6) % 7 days back).
  const mondayOf = (dayNumber: number) =>
    dayNumber - ((new Date(dayNumber * 86_400_000).getUTCDay() + 6) % 7);
  const firstMonday = mondayOf(seasonStartDay);
  const thisMonday = mondayOf(ptDayNumberForDate(now));
  return 1 + Math.floor((thisMonday - firstMonday) / 7);
}
