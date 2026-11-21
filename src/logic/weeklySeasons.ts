/**
 * Voting-week season labels (Nov 21, 2026).
 *
 * Voting weeks nest in seasons by the MONDAY rule (decided Nov 21, 2026):
 * a week belongs to the season its Monday falls in. Weeks that straddle
 * a season boundary take the Monday's season — no split. Seasons are
 * contiguous and voting does not pause between them, so every ISO week
 * has exactly one season.
 *
 * Pure, calendar-backed (src/data/seasons.ts is the authority). The
 * Firestore `Season` doc (src/types/game.ts) is a different concept —
 * a configured season with its own week list — and is never consulted
 * here.
 */
import { getPtDateParts, getSeasonForDate, type CalendarSeason, type SeasonId } from '../data/seasons';
import { getIsoWeekId } from './weeklyCycleLogic';

export interface WeeklySeasonLabel {
  seasonId: SeasonId;
  seasonName: string;
  /** PT calendar year of the week's Monday. */
  year: number;
  /** e.g. "Fall 2026". */
  label: string;
}

/** The season a voting week belongs to: the season its Monday falls in. */
export function getSeasonForWeekStart(weekStart: Date): CalendarSeason {
  return getSeasonForDate(weekStart);
}

/** "Fall 2026" for a week starting on the given Monday. */
export function getWeeklySeasonLabel(weekStart: Date): WeeklySeasonLabel {
  const season = getSeasonForDate(weekStart);
  const { year } = getPtDateParts(weekStart);
  return {
    seasonId: season.id,
    seasonName: season.name,
    year,
    label: `${season.name} ${year}`,
  };
}

/** Shorthand for getWeeklySeasonLabel(weekStart).label. */
export function getSeasonLabelForWeekStart(weekStart: Date): string {
  return getWeeklySeasonLabel(weekStart).label;
}

/**
 * The Monday (PT calendar date) of an ISO week id like "2026-W47".
 * Returned as noon UTC on that calendar day, so its PT calendar date is
 * the date it claims to be. Null for a malformed id, a week number
 * outside 1–53, or a week 53 in a year that only has 52 ISO weeks.
 */
export function getIsoWeekMonday(weekId: string): Date | null {
  const match = /^(\d{4})-W(\d{2})$/.exec(weekId.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const week = Number(match[2]);
  if (week < 1 || week > 53) return null;
  // Jan 4 is always in ISO week 1; back up to that week's Monday.
  const jan4 = new Date(Date.UTC(year, 0, 4, 12, 0, 0));
  const jan4Day = jan4.getUTCDay() || 7; // Mon=1 .. Sun=7
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - (jan4Day - 1) + (week - 1) * 7);
  // Guard week 53 in 52-week years: the computed Monday must belong to
  // the requested ISO week (same algorithm that minted the id).
  if (getIsoWeekId(monday) !== `${year}-W${String(week).padStart(2, '0')}`) return null;
  return monday;
}

/** The Monday-rule season label for an ISO week id, or null when invalid. */
export function getWeeklySeasonLabelForIsoWeek(weekId: string): WeeklySeasonLabel | null {
  const monday = getIsoWeekMonday(weekId);
  return monday ? getWeeklySeasonLabel(monday) : null;
}
