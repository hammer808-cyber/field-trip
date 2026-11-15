/**
 * Admin queue stats (Q7/Q8): pure helpers for the proof-review console and
 * the admin board. No Firestore access here — the pages feed these functions
 * with data from their subscriptions, so every number on screen is computed
 * from live data, never hardcoded.
 */

/** Queue sort direction. Oldest-first is the default: the item that has
 * waited longest is reviewed first. */
export type QueueSortDirection = 'oldest' | 'newest';

/** How many queue rows one "Load more" tap reveals. */
export const QUEUE_PAGE_SIZE = 25;

/** Review velocity window (hours) and the admin-log read cap it is computed
 * from. The velocity counts proof-review decisions in the window; if the
 * log read hits the cap and the oldest returned log is still inside the
 * window, the true count may be higher and the display says so ("≥"). */
export const REVIEW_VELOCITY_WINDOW_HOURS = 24;
export const REVIEW_VELOCITY_LOG_LIMIT = 200;

/** Depth thresholds for the pending queue (same bands the console used
 * before; they are computed from the live pending count now). */
export const QUEUE_DEPTH_CONGESTED_AT = 20;
export const QUEUE_DEPTH_CRITICAL_AT = 50;

/** Milliseconds for a queue record's timestamp, reading the same fallback
 * chain the queue sort has always used. Returns 0 when no usable timestamp
 * exists (the record sorts as oldest and its age shows as "—"). */
export function entryTimestampMillis(entry: any): number {
  const value = entry?.createdAt ?? entry?.submittedAt ?? entry?.updatedAt;
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Sort queue records by waiting time. Oldest first by default. Records
 * with no timestamp sort as oldest (they need attention; their age is
 * unknown, shown as "—"). Ties break on id so the order is deterministic
 * across snapshots.
 */
export function sortReviewQueue<T extends Record<string, any>>(
  items: T[],
  direction: QueueSortDirection = 'oldest',
): T[] {
  const sign = direction === 'oldest' ? 1 : -1;
  return [...items].sort((a, b) => {
    const diff = entryTimestampMillis(a) - entryTimestampMillis(b);
    if (diff !== 0) return sign * diff;
    const aId = String(a.id || '');
    const bId = String(b.id || '');
    return aId < bId ? -1 : aId > bId ? 1 : 0;
  });
}

/**
 * Human waiting time for a queue record: "3d 4h", "2h 15m", "45m", "<1m".
 * Returns "—" when the timestamp is missing, invalid, or in the future
 * (clock skew) — never a wrong age.
 */
export function formatWaitAge(
  timestampMs: number | null | undefined,
  nowMs: number = Date.now(),
): string {
  if (!timestampMs || !Number.isFinite(timestampMs) || timestampMs > nowMs) return '—';
  const diffMs = nowMs - timestampMs;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return '<1m';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

export interface ReviewVelocity {
  /** Proof-review decisions inside the window. */
  decisions: number;
  /** Decisions per hour. */
  perHour: number;
  /** Display string, e.g. "0.5 p/h" (or "≥0.5 p/h" when the log read cap binds). */
  display: string;
  /** True when the log read hit its cap while the oldest returned log was
   * still inside the window — the real count may be higher. */
  capped: boolean;
}

/**
 * Review velocity from adminLogs docs: proof-review decisions per hour over
 * the window. Only server-written review actions count
 * (actionType === 'proof_review_action'); moderation log entries are not
 * review decisions. Zero decisions in the window is 0.0 p/h, never the old
 * hardcoded 2.4.
 */
export function computeReviewVelocity(
  logs: any[],
  options: {
    windowHours?: number;
    nowMs?: number;
    /** True when the log subscription hit its read cap (logs.length >= limit). */
    limitReached?: boolean;
  } = {},
): ReviewVelocity {
  const windowHours = options.windowHours ?? REVIEW_VELOCITY_WINDOW_HOURS;
  const nowMs = options.nowMs ?? Date.now();
  const cutoff = nowMs - windowHours * 3600 * 1000;
  const inWindow = (logs || []).filter((log) => {
    if (log?.actionType !== 'proof_review_action') return false;
    const ts = entryTimestampMillis(log);
    return ts > 0 && ts >= cutoff && ts <= nowMs;
  });
  const decisions = inWindow.length;
  const perHour = decisions / windowHours;
  // The cap only binds when the oldest log the subscription returned is
  // still inside the window — then more decisions may exist beyond the
  // cap. If the oldest returned log is older than the window, every
  // in-window decision was returned and the count is exact.
  const oldestReturned = (logs || []).reduce(
    (min, log) => Math.min(min, entryTimestampMillis(log) || Number.POSITIVE_INFINITY),
    Number.POSITIVE_INFINITY,
  );
  const capped = options.limitReached === true && oldestReturned >= cutoff;
  return {
    decisions,
    perHour,
    display: `${capped ? '≥' : ''}${perHour.toFixed(1)} p/h`,
    capped,
  };
}

/** Depth band for the pending count (same 20/50 bands the console used). */
export function queueDepthLabel(pendingCount: number): 'Clear' | 'Congested' | 'Critical' {
  if (pendingCount > QUEUE_DEPTH_CRITICAL_AT) return 'Critical';
  if (pendingCount > QUEUE_DEPTH_CONGESTED_AT) return 'Congested';
  return 'Clear';
}

/**
 * Client-side paging over the already-loaded, already-ordered queue.
 * This is a prefix slice of one immutable snapshot, so pages can never
 * duplicate or skip an item: page N is items[0..visibleCount) and "Load
 * more" only grows the prefix. (The Firestore 500-doc window is separate:
 * see the collectionGroup queries in submissionService — they order by
 * createdAt ascending so the window is deterministically the oldest 500.)
 */
export function visibleQueueItems<T>(items: T[], visibleCount: number): T[] {
  return items.slice(0, Math.max(0, visibleCount));
}

/**
 * Search filter for the proof-review queue (Q10). Case-insensitive
 * substring match against the fields an admin actually searches by:
 * agent/user ID first (the box's placeholder intent), then display name,
 * mission/card title, and entry ID. A blank query returns the input
 * unchanged — clearing the box restores the full list. The filter runs on
 * the merged queue records BEFORE paging, so the swipe view and the table
 * view (which both render from the same filtered list) always agree.
 */
export function filterQueueRecordsBySearch<T extends Record<string, any>>(
  items: T[],
  query: string,
): T[] {
  const needle = String(query || '').trim().toLowerCase();
  if (!needle) return items;
  return items.filter((record) => {
    const haystacks = [
      record.userId,
      record.uid,
      record.displayName,
      record.userName,
      record.missionTitle,
      record.challengeTitle,
      record.tripTitle,
      record.entryId,
      record.id,
    ];
    return haystacks.some(
      (value) => typeof value === 'string' && value.toLowerCase().includes(needle),
    );
  });
}
