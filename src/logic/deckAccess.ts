import { DeckPack, DeckVisibility } from '../types/deckPacks';

export interface DeckAccessUser {
  id?: string;
  uid?: string;
  userId?: string;
  crewId?: string | null;
  credentialIds?: string[];
  completedCredentialIds?: string[];
  requiredCredentialIds?: string[];
  completedDeckIds?: string[];
  approvedCompletedDeckIds?: string[];
  deckInviteRedemptions?: Record<string, any>;
  redeemedDeckInviteIds?: string[];
}

export interface DeckAccessContext {
  userId?: string | null;
  profile?: DeckAccessUser | null;
  isAdmin?: boolean;
  now?: Date;
  completedDeckIds?: string[];
  credentialIds?: string[];
}

export interface DeckAccessResult {
  deckId: string;
  visibility: DeckVisibility;
  visible: boolean;
  playable: boolean;
  locked: boolean;
  reason: string;
  privateReason?: string;
}

const PRIVATE_ASSIGNMENT_REASON = 'Private field assignment';

function normalizeDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') return value.toDate();
  if (typeof value.seconds === 'number') return new Date(value.seconds * 1000);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function uniqueStrings(values: unknown[]): string[] {
  return Array.from(new Set(values.flatMap(value => Array.isArray(value) ? value : []).filter(Boolean).map(String)));
}

export function getDeckId(deck: Pick<DeckPack, 'packId' | 'id' | 'deckId'>): string {
  return String(deck.packId || deck.deckId || deck.id || '').trim();
}

export function getDeckVisibility(deck: Partial<DeckPack>): DeckVisibility {
  return (deck.visibility || 'public') as DeckVisibility;
}

export function hasRedeemedDeckInvite(profile: DeckAccessUser | null | undefined, deckId: string): boolean {
  if (!profile || !deckId) return false;
  if (profile.deckInviteRedemptions?.[deckId]) return true;
  return Array.isArray(profile.redeemedDeckInviteIds) && profile.redeemedDeckInviteIds.includes(deckId);
}

export function getDeckCredentialIds(profile: DeckAccessUser | null | undefined, contextCredentialIds: string[] = []): string[] {
  return uniqueStrings([
    contextCredentialIds,
    profile?.credentialIds,
    profile?.completedCredentialIds,
    profile?.requiredCredentialIds
  ]);
}

export function getCompletedDeckIds(profile: DeckAccessUser | null | undefined, contextCompletedDeckIds: string[] = []): string[] {
  return uniqueStrings([
    contextCompletedDeckIds,
    profile?.completedDeckIds,
    profile?.approvedCompletedDeckIds
  ]);
}

export function getDeckAccess(deck: DeckPack | null | undefined, context: DeckAccessContext): DeckAccessResult {
  const deckId = deck ? getDeckId(deck) : '';
  const visibility = getDeckVisibility(deck || {});
  const isAdmin = context.isAdmin === true;
  const now = context.now || new Date();
  const profile = context.profile || null;
  const userId = String(context.userId || profile?.id || profile?.uid || profile?.userId || '').trim();
  const showLockedTeaser = deck?.showLockedTeaser === true;

  if (!deck || !deckId) {
    return { deckId, visibility, visible: false, playable: false, locked: true, reason: 'Deck unavailable' };
  }

  if (isAdmin) {
    return { deckId, visibility, visible: true, playable: true, locked: false, reason: '' };
  }

  const startsAt = normalizeDate(deck.accessStartsAt || deck.startsAt);
  const endsAt = normalizeDate(deck.accessEndsAt || deck.endsAt);
  if (startsAt && now < startsAt) {
    return {
      deckId,
      visibility,
      visible: showLockedTeaser,
      playable: false,
      locked: true,
      reason: showLockedTeaser ? 'Private field assignment' : 'Deck unavailable',
      privateReason: 'access_window_not_started'
    };
  }
  if (endsAt && now > endsAt) {
    return {
      deckId,
      visibility,
      visible: showLockedTeaser,
      playable: false,
      locked: true,
      reason: showLockedTeaser ? 'Private field assignment' : 'Deck unavailable',
      privateReason: 'access_window_ended'
    };
  }

  const requiredCredentials = deck.requiredCredentialIds || [];
  const userCredentials = getDeckCredentialIds(profile, context.credentialIds || []);
  const missingCredential = requiredCredentials.find(id => !userCredentials.includes(id));
  if (missingCredential) {
    return {
      deckId,
      visibility,
      visible: showLockedTeaser || visibility === 'public',
      playable: false,
      locked: true,
      reason: showLockedTeaser ? PRIVATE_ASSIGNMENT_REASON : 'Credential required',
      privateReason: 'missing_required_credential'
    };
  }

  const requiredCompletedDeckIds = deck.requiredCompletedDeckIds || [];
  const userCompletedDeckIds = getCompletedDeckIds(profile, context.completedDeckIds || []);
  const missingCompletedDeck = requiredCompletedDeckIds.find(id => !userCompletedDeckIds.includes(id));
  if (missingCompletedDeck) {
    return {
      deckId,
      visibility,
      visible: showLockedTeaser || visibility === 'public',
      playable: false,
      locked: true,
      reason: showLockedTeaser ? PRIVATE_ASSIGNMENT_REASON : 'Complete prerequisite deck',
      privateReason: 'missing_required_completed_deck'
    };
  }

  let allowed = false;
  let privateReason = '';
  switch (visibility) {
    case 'public':
      allowed = true;
      break;
    case 'assigned_users':
      allowed = !!userId && (deck.assignedUserIds || []).includes(userId);
      privateReason = 'not_assigned_user';
      break;
    case 'crew_only':
      allowed = !!profile?.crewId && (deck.allowedCrewIds || []).includes(profile.crewId);
      privateReason = 'not_allowed_crew';
      break;
    case 'invite_code':
      allowed = hasRedeemedDeckInvite(profile, deckId);
      privateReason = 'invite_not_redeemed';
      break;
    case 'admin_only':
    case 'internal':
    case 'planned':
    case 'hidden':
      allowed = false;
      privateReason = 'admin_only_or_hidden';
      break;
    default:
      allowed = false;
      privateReason = 'unknown_visibility';
  }

  if (allowed) {
    return { deckId, visibility, visible: true, playable: true, locked: false, reason: '' };
  }

  return {
    deckId,
    visibility,
    visible: showLockedTeaser,
    playable: false,
    locked: true,
    reason: showLockedTeaser ? PRIVATE_ASSIGNMENT_REASON : 'Deck unavailable',
    privateReason
  };
}

export function canAccessDeck(deck: DeckPack | null | undefined, context: DeckAccessContext): boolean {
  return getDeckAccess(deck, context).playable;
}

export function sanitizeDeckForUnauthorized(deck: DeckPack): DeckPack {
  const { assignedUserIds, allowedCrewIds, inviteCode, ...safeDeck } = deck;
  return {
    ...safeDeck,
    assignedUserIds: [],
    allowedCrewIds: [],
    inviteCode: null
  };
}
