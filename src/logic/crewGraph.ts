import type { AvatarData } from '../types/avatar';

export const CREW_CONNECTIONS_COLLECTION = 'crewConnections';
export const CREW_CONNECTION_ID_SEPARATOR = '::';
export const PLAYER_SEARCH_MIN_QUERY_LENGTH = 2;
export const COMMUNITY_SPOTLIGHT_LIMIT = 8;

export const CREW_CONNECTION_STATUSES = ['pending', 'accepted', 'declined', 'removed', 'blocked'] as const;
export type CrewConnectionStatus = typeof CREW_CONNECTION_STATUSES[number];

export const CREW_RELATIONSHIP_STATES = [
  'none',
  'outgoing_request',
  'incoming_request',
  'accepted',
  'blocked',
] as const;
export type CrewRelationshipState = typeof CREW_RELATIONSHIP_STATES[number];

export const CREW_CONNECTION_ACTIONS = [
  'send_request',
  'accept',
  'decline',
  'remove',
  'block',
] as const;
export type CrewConnectionAction = typeof CREW_CONNECTION_ACTIONS[number];

export interface PublicPlayerIdentity {
  userId: string;
  displayName: string;
  username: string | null;
  fieldType: string | null;
  fieldTypeName: string | null;
  avatar: AvatarData | null;
  level: number | null;
  levelTitle: string | null;
  photoURL: string | null;
}

export interface CrewConnectionRecord {
  id: string;
  userLow: string;
  userHigh: string;
  participants: string[];
  requesterId: string;
  addresseeId: string;
  status: CrewConnectionStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
  acceptedAt?: unknown;
  resolvedAt?: unknown;
  blockedBy?: string | null;
  requesterSnapshot?: PublicPlayerIdentity | null;
  addresseeSnapshot?: PublicPlayerIdentity | null;
}

export interface CrewGraphSnapshot {
  viewerUserId: string;
  accepted: CrewConnectionRecord[];
  incoming: CrewConnectionRecord[];
  outgoing: CrewConnectionRecord[];
  blocked: CrewConnectionRecord[];
  acceptedUserIds: string[];
  incomingCount: number;
  outgoingCount: number;
  acceptedCount: number;
}

export interface ResolveCrewWriteInput {
  actorId: string;
  targetId: string;
  action: CrewConnectionAction;
  existing: CrewConnectionRecord | null;
  actorBlockedTarget?: boolean;
  targetBlockedActor?: boolean;
}

export interface ResolveCrewWriteResult {
  ok: boolean;
  idempotent: boolean;
  error?: string;
  next?: {
    requesterId: string;
    addresseeId: string;
    status: CrewConnectionStatus;
    blockedBy?: string | null;
  };
}

const PRIVATE_PROFILE_KEYS = [
  'email',
  'isAdmin',
  'role',
  'accessStatus',
  'productPersonaLens',
  'trustScore',
  'riskScore',
  'location',
  'exactCoordinates',
  'showExactCoordinates',
  'deckInviteRedemptions',
  'credentialIds',
] as const;

export function normalizeUsernameQuery(value: unknown): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_\-]/g, '')
    .slice(0, 32);
}

export function isValidPlayerSearchQuery(value: unknown): boolean {
  return normalizeUsernameQuery(value).length >= PLAYER_SEARCH_MIN_QUERY_LENGTH;
}

export function getCrewConnectionId(userA: string, userB: string): string {
  const [low, high] = sortUserIds(userA, userB);
  return `${low}${CREW_CONNECTION_ID_SEPARATOR}${high}`;
}

export function sortUserIds(userA: string, userB: string): [string, string] {
  return userA < userB ? [userA, userB] : [userB, userA];
}

export function getCrewPeerId(connection: CrewConnectionRecord | null | undefined, viewerUserId: string): string | null {
  if (!connection) return null;
  if (connection.requesterId === viewerUserId) return connection.addresseeId;
  if (connection.addresseeId === viewerUserId) return connection.requesterId;
  const other = connection.participants?.find(id => id && id !== viewerUserId);
  return other || null;
}

export function deriveCrewRelationshipState(params: {
  viewerUserId: string;
  connection?: CrewConnectionRecord | null;
  blockedUserIds?: readonly string[];
  blockedByUserIds?: readonly string[];
}): CrewRelationshipState {
  const { viewerUserId, connection } = params;
  const peerId = getCrewPeerId(connection, viewerUserId);
  if (
    (peerId && params.blockedUserIds?.includes(peerId)) ||
    (peerId && params.blockedByUserIds?.includes(peerId)) ||
    connection?.status === 'blocked'
  ) {
    return 'blocked';
  }
  if (!connection || connection.status === 'declined' || connection.status === 'removed') {
    return 'none';
  }
  if (connection.status === 'accepted') return 'accepted';
  if (connection.status === 'pending') {
    return connection.requesterId === viewerUserId ? 'outgoing_request' : 'incoming_request';
  }
  return 'none';
}

export function isAcceptedCrewWith(connection: CrewConnectionRecord | null | undefined, viewerUserId: string, otherUserId: string): boolean {
  if (!connection || connection.status !== 'accepted') return false;
  const participants = new Set(connection.participants || [connection.userLow, connection.userHigh, connection.requesterId, connection.addresseeId]);
  return participants.has(viewerUserId) && participants.has(otherUserId);
}

export function pendingRequestIsNotAcceptedCrew(connection: CrewConnectionRecord | null | undefined): boolean {
  return !connection || connection.status !== 'accepted';
}

export function resolveCrewConnectionWrite(input: ResolveCrewWriteInput): ResolveCrewWriteResult {
  const actorId = String(input.actorId || '').trim();
  const targetId = String(input.targetId || '').trim();
  if (!actorId || !targetId) return { ok: false, idempotent: false, error: 'INVALID_PLAYER' };
  if (actorId === targetId) return { ok: false, idempotent: false, error: 'CANNOT_CONNECT_SELF' };
  if (input.actorBlockedTarget || input.targetBlockedActor || input.existing?.status === 'blocked') {
    return { ok: false, idempotent: false, error: 'BLOCKED' };
  }

  const existing = input.existing;
  if (input.action === 'send_request') {
    if (!existing || existing.status === 'declined' || existing.status === 'removed') {
      return {
        ok: true,
        idempotent: false,
        next: { requesterId: actorId, addresseeId: targetId, status: 'pending' },
      };
    }
    if (existing.status === 'accepted') {
      return {
        ok: true,
        idempotent: true,
        next: { requesterId: existing.requesterId, addresseeId: existing.addresseeId, status: 'accepted' },
      };
    }
    if (existing.status === 'pending' && existing.requesterId === actorId) {
      return {
        ok: true,
        idempotent: true,
        next: { requesterId: existing.requesterId, addresseeId: existing.addresseeId, status: 'pending' },
      };
    }
    if (existing.status === 'pending' && existing.addresseeId === actorId) {
      return {
        ok: true,
        idempotent: false,
        next: { requesterId: existing.requesterId, addresseeId: existing.addresseeId, status: 'accepted' },
      };
    }
    return { ok: false, idempotent: false, error: 'REQUEST_NOT_ALLOWED' };
  }

  if (input.action === 'accept') {
    if (existing?.status === 'accepted' && (existing.addresseeId === actorId || existing.requesterId === actorId)) {
      return {
        ok: true,
        idempotent: true,
        next: { requesterId: existing.requesterId, addresseeId: existing.addresseeId, status: 'accepted' },
      };
    }
    if (existing?.status === 'pending' && existing.addresseeId === actorId) {
      return {
        ok: true,
        idempotent: false,
        next: { requesterId: existing.requesterId, addresseeId: existing.addresseeId, status: 'accepted' },
      };
    }
    return { ok: false, idempotent: false, error: 'ACCEPT_NOT_ALLOWED' };
  }

  if (input.action === 'decline') {
    if (existing?.status === 'declined' && existing.addresseeId === actorId) {
      return {
        ok: true,
        idempotent: true,
        next: { requesterId: existing.requesterId, addresseeId: existing.addresseeId, status: 'declined' },
      };
    }
    if (existing?.status === 'pending' && existing.addresseeId === actorId) {
      return {
        ok: true,
        idempotent: false,
        next: { requesterId: existing.requesterId, addresseeId: existing.addresseeId, status: 'declined' },
      };
    }
    return { ok: false, idempotent: false, error: 'DECLINE_NOT_ALLOWED' };
  }

  if (input.action === 'remove') {
    if (existing?.status === 'removed' && (existing.requesterId === actorId || existing.addresseeId === actorId)) {
      return {
        ok: true,
        idempotent: true,
        next: { requesterId: existing.requesterId, addresseeId: existing.addresseeId, status: 'removed' },
      };
    }
    if (existing?.status === 'accepted' && (existing.requesterId === actorId || existing.addresseeId === actorId)) {
      return {
        ok: true,
        idempotent: false,
        next: { requesterId: existing.requesterId, addresseeId: existing.addresseeId, status: 'removed' },
      };
    }
    if (existing?.status === 'pending' && existing.requesterId === actorId) {
      return {
        ok: true,
        idempotent: false,
        next: { requesterId: existing.requesterId, addresseeId: existing.addresseeId, status: 'removed' },
      };
    }
    return { ok: false, idempotent: false, error: 'REMOVE_NOT_ALLOWED' };
  }

  if (input.action === 'block') {
    return {
      ok: true,
      idempotent: existing?.status === 'blocked' && existing.blockedBy === actorId,
      next: {
        requesterId: existing?.requesterId || actorId,
        addresseeId: existing?.addresseeId || targetId,
        status: 'blocked',
        blockedBy: actorId,
      },
    };
  }

  return { ok: false, idempotent: false, error: 'UNKNOWN_ACTION' };
}

export function buildCrewGraphSnapshot(viewerUserId: string, connections: readonly CrewConnectionRecord[]): CrewGraphSnapshot {
  const accepted: CrewConnectionRecord[] = [];
  const incoming: CrewConnectionRecord[] = [];
  const outgoing: CrewConnectionRecord[] = [];
  const blocked: CrewConnectionRecord[] = [];
  for (const connection of connections) {
    const state = deriveCrewRelationshipState({ viewerUserId, connection });
    if (state === 'accepted') accepted.push(connection);
    else if (state === 'incoming_request') incoming.push(connection);
    else if (state === 'outgoing_request') outgoing.push(connection);
    else if (state === 'blocked') blocked.push(connection);
  }
  return {
    viewerUserId,
    accepted,
    incoming,
    outgoing,
    blocked,
    acceptedUserIds: accepted.map(connection => getCrewPeerId(connection, viewerUserId)).filter((id): id is string => !!id),
    incomingCount: incoming.length,
    outgoingCount: outgoing.length,
    acceptedCount: accepted.length,
  };
}

export function toPublicPlayerIdentity(profile: any, userId?: string): PublicPlayerIdentity {
  const resolvedUserId = String(userId || profile?.id || profile?.uid || profile?.userId || '').trim();
  const username = profile?.username || profile?.handle || null;
  return {
    userId: resolvedUserId,
    displayName: String(profile?.displayName || profile?.name || username || 'Field Agent'),
    username: username ? String(username) : null,
    fieldType: profile?.fieldType || null,
    fieldTypeName: profile?.fieldTypeName || null,
    avatar: profile?.avatar || null,
    level: typeof profile?.level === 'number' ? profile.level : null,
    levelTitle: profile?.levelTitle || null,
    photoURL: profile?.photoURL || profile?.avatarUrl || null,
  };
}

export function publicPlayerIdentityHasPrivateLeak(value: Record<string, unknown>): boolean {
  return PRIVATE_PROFILE_KEYS.some(key => Object.prototype.hasOwnProperty.call(value, key));
}

export interface SocialFeedVisibilityScope {
  viewerUserId: string;
  acceptedCrewUserIds?: readonly string[];
  activeCrewId?: string | null;
  blockedUserIds?: readonly string[];
}

export function getCrewSocialExclusionReasons(entry: any, scope: SocialFeedVisibilityScope): string[] {
  const ownerId = String(entry?.userId || entry?.uid || '').trim();
  const reasons: string[] = [];
  if (!ownerId) {
    reasons.push('missing_owner');
    return reasons;
  }
  if (ownerId === scope.viewerUserId) return reasons;
  if (scope.blockedUserIds?.includes(ownerId)) {
    reasons.push('blocked_user');
    return reasons;
  }
  const feedVisibility = String(entry?.feedVisibility || entry?.preferences?.feedVisibility || 'crew_only');
  if (feedVisibility === 'private' || entry?.isPrivate === true || entry?.private === true) {
    reasons.push('private_visibility');
    return reasons;
  }
  const accepted = scope.acceptedCrewUserIds?.includes(ownerId) === true;
  const entryCrewId = String(entry?.crewId || entry?.activeCrewId || '').trim();
  const sameGroupCrew = Boolean(scope.activeCrewId && entryCrewId && entryCrewId === scope.activeCrewId);
  const publicDiscovery = feedVisibility === 'public_discovery';
  if (!accepted && !sameGroupCrew && !publicDiscovery) {
    reasons.push('outside_social_scope');
  }
  return reasons;
}

export function isPermittedInCrewSocialFeed(entry: any, scope: SocialFeedVisibilityScope): boolean {
  return getCrewSocialExclusionReasons(entry, scope).length === 0;
}

export function composeCrewSocialFeed<T extends { userId?: string; uid?: string }>(
  entries: readonly T[],
  scope: SocialFeedVisibilityScope,
): T[] {
  return entries.filter(entry => isPermittedInCrewSocialFeed(entry, scope));
}
