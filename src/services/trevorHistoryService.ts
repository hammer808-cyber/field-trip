export interface TrevorHistoryEntry {
  recommendationId: string;
  shownAt: string;
}

const HISTORY_LIMIT = 40;
const HISTORY_KEY_PREFIX = 'fieldtrip_trevor_history_v1';
const SESSION_SUPPRESSION_KEY_PREFIX = 'fieldtrip_trevor_session_suppressed_v1';

export function readTrevorHistory(userId: string): TrevorHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const value = window.localStorage.getItem(getHistoryKey(userId));
    if (!value) return [];
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isHistoryEntry).slice(-HISTORY_LIMIT);
  } catch {
    return [];
  }
}

export function recordTrevorRecommendation(
  userId: string,
  recommendationId: string,
  shownAt: Date = new Date(),
): TrevorHistoryEntry[] {
  const history = [
    ...readTrevorHistory(userId),
    { recommendationId, shownAt: shownAt.toISOString() },
  ].slice(-HISTORY_LIMIT);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(getHistoryKey(userId), JSON.stringify(history));
    } catch {
      // Storage can be unavailable in private browsing; Trevor remains usable.
    }
  }
  return history;
}

export function isRecommendationCoolingDown(
  recommendationId: string,
  cooldownHours: number | undefined,
  history: readonly TrevorHistoryEntry[],
  now: Date = new Date(),
): boolean {
  if (!cooldownHours || cooldownHours <= 0) return false;
  const latest = [...history]
    .reverse()
    .find(entry => entry.recommendationId === recommendationId);
  if (!latest) return false;
  const shownAt = new Date(latest.shownAt).getTime();
  if (!Number.isFinite(shownAt)) return false;
  return now.getTime() - shownAt < cooldownHours * 60 * 60 * 1000;
}

export function getTrevorRecommendationDisplayCount(
  recommendationId: string,
  history: readonly TrevorHistoryEntry[],
): number {
  return history.filter(entry => entry.recommendationId === recommendationId).length;
}

export function suppressTrevorForSession(userId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(getSessionSuppressionKey(userId), 'true');
  } catch {
    // Session storage is an enhancement, not a requirement for rendering.
  }
}

export function isTrevorSuppressedForSession(userId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(getSessionSuppressionKey(userId)) === 'true';
  } catch {
    return false;
  }
}

function getHistoryKey(userId: string): string {
  return `${HISTORY_KEY_PREFIX}:${userId}`;
}

function getSessionSuppressionKey(userId: string): string {
  return `${SESSION_SUPPRESSION_KEY_PREFIX}:${userId}`;
}

function isHistoryEntry(value: unknown): value is TrevorHistoryEntry {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.recommendationId === 'string' && typeof candidate.shownAt === 'string';
}
