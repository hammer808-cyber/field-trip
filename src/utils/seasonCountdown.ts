import { HEATWAVE_SEASON } from '../constants';
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
