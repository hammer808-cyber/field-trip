import { DeckPack, DeckVisibility } from '../types/deckPacks';
import {
  SEASON_TIME_ZONE,
  getEventById,
  getEventStatus,
  getNextSeasonStart,
  getPtDateParts,
  getSeasonById,
  getSeasonForDate,
  type SeasonId,
} from '../data/seasons';

/**
 * "Coming summer 2027" — the year comes from the calendar (the next start
 * of that season), never hard-coded.
 */
export function getSeasonalLockCopy(seasonId: SeasonId, now: Date = new Date()): string {
  const season = getSeasonById(seasonId);
  const nextStart = getNextSeasonStart(seasonId, now);
  return `Coming ${season.name.toLowerCase()} ${getPtDateParts(nextStart).year}`;
}

/** "Nov 1, 2026" for a PT calendar date. */
function formatPtDate(year: number, month: number, day: number): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: SEASON_TIME_ZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(Date.UTC(year, month - 1, day, 12, 0, 0)));
}

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

  // Seasonal calendar (Nov 21, 2026): a deck that declares a season or an
  // event is gated by the calendar (src/data/seasons.ts), not by its legacy
  // startsAt/endsAt window. A lock is only a verdict — this function never
  // touches progress (drawn/active missions, completed counts), so a locked
  // deck's progress survives until the deck reopens and the player
  // continues where they left off. A calendar-locked public deck stays
  // visible so the shelf/selector can show its "Coming summer 2027" state.
  if (deck.eventId) {
    const status = getEventStatus(deck.eventId, now);
    if (status === 'not-started' || status === 'ended') {
      const event = getEventById(deck.eventId);
      const reason = event
        ? status === 'not-started'
          ? `${event.name} opens ${formatPtDate(event.startYear, event.startMonth, event.startDay)}`
          : `${event.name} ended ${formatPtDate(event.endYear, event.endMonth, event.endDay)}`
        : 'Deck unavailable';
      return {
        deckId,
        visibility,
        visible: visibility === 'public' || showLockedTeaser,
        playable: false,
        locked: true,
        reason,
        privateReason: status === 'not-started' ? 'access_window_not_started' : 'access_window_ended'
      };
    }
  } else if (deck.seasonId && deck.seasonId !== 'evergreen') {
    if (getSeasonForDate(now).id !== deck.seasonId) {
      return {
        deckId,
        visibility,
        visible: visibility === 'public' || showLockedTeaser,
        playable: false,
        locked: true,
        reason: getSeasonalLockCopy(deck.seasonId, now),
        privateReason: 'season_locked'
      };
    }
  }

  // Legacy access window: only for decks WITHOUT a calendar declaration.
  // A deck with seasonId/eventId is gated by the calendar above — running
  // the old instant window as well would re-lock the opening/closing PT
  // days (e.g. Nov 1 01:00 PT is inside Gobble & Glow but before its
  // noon-UTC startsAt instant).
  const startsAt = deck.eventId || deck.seasonId ? null : normalizeDate(deck.accessStartsAt || deck.startsAt);
  const endsAt = deck.eventId || deck.seasonId ? null : normalizeDate(deck.accessEndsAt || deck.endsAt);
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
