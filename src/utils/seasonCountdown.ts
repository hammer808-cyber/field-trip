import { HEATWAVE_SEASON } from '../constants';
import { getCurrentSeason, getDaysRemainingInSeason, getNextSeason, type CalendarSeason } from '../data/seasons';
import { getSeasonTiming } from '../logic/weeklyLogic';
import type { Season } from '../types/game';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export interface SeasonState {
  label: string;
  daysRemaining: number | null;
  hoursRemaining: number | null;
  status: 'upcoming' | 'active' | 'ended' | 'invalid';
  noiseLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
  endsAt: Date | null;
}

function getSeasonDisplayName(season: Season): string {
  return String(season.title || season.id || 'Fieldtrip season').replace(/_/g, ' ').trim();
}

export function getSeasonCountdown(season: Season, today: Date = new Date()): SeasonState {
  const timing = getSeasonTiming(season, today);
  const seasonName = getSeasonDisplayName(season);

  if (timing.status === 'invalid') {
    return {
      label: `${seasonName} dates need admin attention`,
      daysRemaining: null,
      hoursRemaining: null,
      status: 'invalid',
      noiseLevel: 'critical',
      endsAt: timing.seasonEndsAt,
    };
  }

  if (timing.status === 'upcoming') {
    const totalHours = Math.max(0, Math.ceil(timing.millisecondsUntilSeasonStart / HOUR_MS));
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    return {
      label: `${seasonName} starts in ${days}d ${hours}h`,
      daysRemaining: Math.ceil(timing.millisecondsUntilSeasonStart / DAY_MS),
      hoursRemaining: totalHours,
      status: 'upcoming',
      noiseLevel: totalHours <= 24 ? 'critical' : days <= 3 ? 'high' : days <= 7 ? 'medium' : 'low',
      endsAt: timing.seasonEndsAt,
    };
  }

  if (timing.status === 'active') {
    const totalHours = Math.max(0, Math.ceil(timing.millisecondsUntilSeasonEnd / HOUR_MS));
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    return {
      label: `${seasonName} ends in ${days}d ${hours}h`,
      daysRemaining: Math.ceil(timing.millisecondsUntilSeasonEnd / DAY_MS),
      hoursRemaining: totalHours,
      status: 'active',
      noiseLevel: totalHours <= 72 ? 'critical' : days <= 7 ? 'high' : 'medium',
      endsAt: timing.seasonEndsAt,
    };
  }

  return {
    label: `${seasonName} ended`,
    daysRemaining: null,
    hoursRemaining: 0,
    status: 'ended',
    noiseLevel: 'none',
    endsAt: timing.seasonEndsAt,
  };
}

export function getSummerCountdown(today: Date = new Date(), season: Season = HEATWAVE_SEASON): SeasonState {
  return getSeasonCountdown(season, today);
}

export interface CalendarSeasonHeader {
  currentSeason: CalendarSeason;
  nextSeason: CalendarSeason;
  /** Whole days left in the current season after today (0 on the last day). */
  daysRemaining: number;
  /** e.g. "Fall ends in 9d · Winter next", or "Fall ends today · Winter next". */
  label: string;
  status: 'active';
}

/**
 * Basecamp header season line, backed by the meteorological calendar
 * (src/data/seasons.ts) — the single authority (decided Nov 21, 2026).
 * The Firestore `activeSeason` doc is NOT consulted: when the old
 * Firestore-based getSeasonCountdown above and the calendar disagree,
 * the calendar wins. Same copy shape as the old header ("<Season> ends
 * in <n>d"), plus the next season. The calendar always has a current
 * season, so this never returns null.
 */
export function getCalendarSeasonHeader(now: Date = new Date()): CalendarSeasonHeader {
  const currentSeason = getCurrentSeason(now);
  const nextSeason = getNextSeason(now);
  const daysRemaining = getDaysRemainingInSeason(now);
  const label = daysRemaining === 0
    ? `${currentSeason.name} ends today · ${nextSeason.name} next`
    : `${currentSeason.name} ends in ${daysRemaining}d · ${nextSeason.name} next`;
  return { currentSeason, nextSeason, daysRemaining, label, status: 'active' };
}
