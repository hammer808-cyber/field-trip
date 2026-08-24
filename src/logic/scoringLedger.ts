export interface CanonicalScoreEventLike {
  id?: string;
  userId?: string;
  amount?: number;
  points?: number;
  xp?: number;
  archived?: boolean;
  deleted?: boolean;
  isDeleted?: boolean;
  excludedFromProgress?: boolean;
  countsTowardLiveStats?: boolean;
  reversed?: boolean;
  reversalOf?: string;
  entryId?: string | null;
  sourceId?: string | null;
  sourceType?: string | null;
}

export interface ScoreLedgerProjection {
  userId: string;
  lifetimeXp: number;
  eventCount: number;
  eventIds: string[];
  excludedEventIds: string[];
  invalidEventIds: string[];
}

export function getCanonicalScoreEventAmount(event: CanonicalScoreEventLike): number | null {
  const raw = event.amount ?? event.points ?? event.xp;
  const amount = Number(raw);
  return Number.isFinite(amount) && amount !== 0 ? Math.trunc(amount) : null;
}

export function isActiveCanonicalScoreEvent(event: CanonicalScoreEventLike, userId: string): boolean {
  return event.userId === userId &&
    event.archived !== true && event.deleted !== true && event.isDeleted !== true &&
    event.excludedFromProgress !== true && event.countsTowardLiveStats !== false &&
    event.reversed !== true && getCanonicalScoreEventAmount(event) !== null;
}

export function projectScoreLedger(userId: string, events: readonly CanonicalScoreEventLike[]): ScoreLedgerProjection {
  const active = events.filter(event => isActiveCanonicalScoreEvent(event, userId));
  const invalidEventIds = events.filter(event => event.userId === userId && getCanonicalScoreEventAmount(event) === null).map(event => String(event.id || 'unknown'));
  const excludedEventIds = events.filter(event => event.userId === userId && !isActiveCanonicalScoreEvent(event, userId) && getCanonicalScoreEventAmount(event) !== null).map(event => String(event.id || 'unknown'));
  return {
    userId,
    lifetimeXp: active.reduce((total, event) => total + (getCanonicalScoreEventAmount(event) || 0), 0),
    eventCount: active.length,
    eventIds: active.map(event => String(event.id || 'unknown')),
    excludedEventIds,
    invalidEventIds,
  };
}

export function buildScoreProjectionChanges(profile: Record<string, any>, projection: ScoreLedgerProjection): Record<string, number> {
  const changes: Record<string, number> = {};
  for (const field of ['xp', 'points', 'totalXP', 'totalPoints', 'score'] as const) {
    if (field === 'xp' || Object.prototype.hasOwnProperty.call(profile, field)) {
      if (Number(profile[field] || 0) !== projection.lifetimeXp) changes[field] = projection.lifetimeXp;
    }
  }
  return changes;
}

export function getScoreEventMillis(event: Record<string, any>): number {
  const value = event.createdAt || event.awardedAt;
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value?.toDate === 'function') return value.toDate().getTime();
  if (typeof value?.seconds === 'number') return value.seconds * 1000;
  const parsed = new Date(value || 0).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

export function projectScoreLedgerRange(userId: string, events: readonly CanonicalScoreEventLike[], startsAt: number, endsAt: number): ScoreLedgerProjection {
  return projectScoreLedger(userId, events.filter(event => {
    const millis = getScoreEventMillis(event as Record<string, any>);
    return millis >= startsAt && millis < endsAt;
  }));
}

export function buildPeriodProjectionChanges(profile: Record<string, any>, seasonXp?: number, weeklyXp?: number): Record<string, number> {
  const changes: Record<string, number> = {};
  if (seasonXp !== undefined) {
    if (Number(profile.seasonXp ?? profile.seasonXP ?? 0) !== seasonXp) changes.seasonXp = seasonXp;
    if (Object.prototype.hasOwnProperty.call(profile, 'seasonXP') && Number(profile.seasonXP || 0) !== seasonXp) changes.seasonXP = seasonXp;
  }
  if (weeklyXp !== undefined) {
    if (Number(profile.weeklyXp ?? profile.weeklyXP ?? 0) !== weeklyXp) changes.weeklyXp = weeklyXp;
    if (Object.prototype.hasOwnProperty.call(profile, 'weeklyXP') && Number(profile.weeklyXP || 0) !== weeklyXp) changes.weeklyXP = weeklyXp;
  }
  return changes;
}

export function buildScoreRepairMutationTrace(userId: string, profile: Record<string, any> | null, events: readonly CanonicalScoreEventLike[]) {
  const projection = projectScoreLedger(userId, events);
  if (!profile) return { projection, mutations: [], deletionState: 'profile_missing' as const };
  const changes = buildScoreProjectionChanges(profile, projection);
  return {
    projection,
    deletionState: 'profile_exists' as const,
    mutations: Object.entries(changes).map(([field, after]) => ({
      collection: 'users', documentId: userId, operation: 'update', field,
      before: Number(profile[field] || 0), after,
      reason: 'derived_profile_total_differs_from_immutable_score_event_ledger',
      canonicalSource: `scoreEvents[userId=${userId}]`,
    })),
  };
}
