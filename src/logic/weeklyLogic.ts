import { Season } from '../types/game';
import { getServerTime as getSyncedTime } from '../services/timeService';

export interface WeekWindows {
  start: Date;
  end: Date;
}

export function getWeekWindows(season: Season, weekNumber: number): WeekWindows | null {
  const week = season.weeks.find(w => w.number === weekNumber);
  if (!week) return null;
  return {
    start: week.startDate.toDate(),
    end: (week as any).endDate?.toDate() || season.endDate.toDate() // Fallback to season end
  };
}

export function getServerTime(): number {
  return getSyncedTime();
}

export function getCurrentSeasonWeek(season: Season): number {
  const now = getSyncedTime();
  const activeWeek = season.weeks.find(w => {
    const start = w.startDate.toDate().getTime();
    const end = (w as any).endDate?.toDate().getTime() || season.endDate.toDate().getTime();
    return now >= start && now <= end;
  });
  return activeWeek ? activeWeek.number : (season.weeks[0]?.number || 0);
}

export function getActiveWeekDrop(season: Season): Season['weeks'][0] | null {
  const weekNum = getCurrentSeasonWeek(season);
  return season.weeks.find(w => w.number === weekNum) || null;
}

export function isWeekUnlocked(season: Season, weekNumber: number): boolean {
  const week = season.weeks.find(w => w.number === weekNumber);
  if (!week) return false;
  return week.startDate.toDate().getTime() <= getSyncedTime();
}

export function isWeekLocked(season: Season, weekNumber: number): boolean {
  return !isWeekUnlocked(season, weekNumber);
}

export function isReviewWindowOpen(season: Season, weekNumber: number): boolean {
  // Logic: Review window opens after week ends
  const week = season.weeks.find(w => w.number === weekNumber);
  if (!week) return false;
  const end = (week as any).endDate?.toDate().getTime() || season.endDate.toDate().getTime();
  return getSyncedTime() > end;
}

export function isVotingWindowOpen(season: Season, weekNumber: number): boolean {
  return isReviewWindowOpen(season, weekNumber);
}

export function canSubmitToChallenge(season: Season, weekNumber: number): boolean {
  return isWeekUnlocked(season, weekNumber) && !isReviewWindowOpen(season, weekNumber);
}

export function canCallFieldCheck(season: Season, weekNumber: number): boolean {
  return isReviewWindowOpen(season, weekNumber);
}

export function canShunIt(season: Season | null): boolean {
  return !!season;
}

export function getSubmissionPointWindow(season: Season, weekNumber: number): 'full' | 'late' | 'closed' {
  if (canSubmitToChallenge(season, weekNumber)) return 'full';
  if (isReviewWindowOpen(season, weekNumber)) return 'late';
  return 'closed';
}
