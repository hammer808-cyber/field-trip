/**
 * Crew clubhouse — pure helpers (Nov 20, 2026).
 *
 * The social rules for the crew feed and chat, kept free of Firestore so
 * the server and the client share them and unit tests can pin them:
 *
 * - Comment and chat text limits (500 / 1,000 chars — long enough for a
 *   real reaction, short enough that the feed stays a feed).
 * - @-mention matching: a token after `@` matches a member by username
 *   or by the first word of their display name (case-insensitive), so
 *   `@zach` finds Zach Hammer and `@mascota` finds a username.
 */

/** A feed comment is a reaction, not an essay. */
export const MAX_CREW_COMMENT_LENGTH = 500;
/** A chat message is a message, not a post. */
export const MAX_CREW_CHAT_LENGTH = 1000;

export type CrewTextValidation =
  | { ok: true; text: string }
  | { ok: false; code: 'EMPTY' | 'TOO_LONG' };

function validateCrewText(text: unknown, maxLength: number): CrewTextValidation {
  const trimmed = typeof text === 'string' ? text.trim() : '';
  if (trimmed.length === 0) return { ok: false, code: 'EMPTY' };
  if (trimmed.length > maxLength) return { ok: false, code: 'TOO_LONG' };
  return { ok: true, text: trimmed };
}

export function validateCrewCommentText(text: unknown): CrewTextValidation {
  return validateCrewText(text, MAX_CREW_COMMENT_LENGTH);
}

export function validateCrewChatText(text: unknown): CrewTextValidation {
  return validateCrewText(text, MAX_CREW_CHAT_LENGTH);
}

export interface MentionableMember {
  userId: string;
  username?: string | null;
  displayName?: string | null;
}

/**
 * The `@`-tokens in `text`, matched to member user ids. A token matches a
 * member's username or the first word of their display name
 * (case-insensitive). Each member is returned at most once, in the order
 * their first mention appears. Self-mentions are NOT filtered here — the
 * server skips notifying the author.
 */
export function parseChatMentions(text: string, members: readonly MentionableMember[]): string[] {
  if (!text || members.length === 0) return [];
  const tokens = Array.from(text.matchAll(/@([A-Za-z0-9_.-]+)/g), (match) => match[1].toLowerCase());
  if (tokens.length === 0) return [];
  const matched: string[] = [];
  for (const token of tokens) {
    const member = members.find((candidate) => {
      const username = String(candidate.username || '').trim().toLowerCase();
      if (username && username === token) return true;
      const firstName = String(candidate.displayName || '').trim().split(/\s+/)[0]?.toLowerCase();
      return Boolean(firstName && firstName === token);
    });
    if (member && !matched.includes(member.userId)) matched.push(member.userId);
  }
  return matched;
}

/** Per-device "last seen" marker for the unread dot on the Chat tab. */
export function crewChatLastSeenKey(crewId: string): string {
  return `fieldtrip_crew_chat_last_seen:${crewId}`;
}

/** The local-day (YYYY-MM-DD, device time) an entry was submitted on. */
export function entryLocalDay(createdAt: unknown): string | null {
  if (!createdAt) return null;
  const millis =
    typeof (createdAt as { toMillis?: () => number }).toMillis === 'function'
      ? (createdAt as { toMillis: () => number }).toMillis()
      : typeof (createdAt as { seconds?: number }).seconds === 'number'
        ? (createdAt as { seconds: number }).seconds * 1000
        : Number(new Date(createdAt as string | number | Date).getTime());
  if (!Number.isFinite(millis) || millis <= 0) return null;
  const date = new Date(millis);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Today's local day (YYYY-MM-DD, device time). */
export function todayLocalDay(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * Milliseconds for a chat message timestamp — a Firestore Timestamp, a
 * `{ seconds }` shape, a Date, or an ISO string. 0 when unreadable, so a
 * malformed timestamp never counts as new.
 */
export function crewChatMessageMillis(createdAt: unknown): number {
  if (!createdAt) return 0;
  if (typeof (createdAt as { toMillis?: () => number }).toMillis === 'function') {
    return (createdAt as { toMillis: () => number }).toMillis();
  }
  if (typeof (createdAt as { seconds?: number }).seconds === 'number') {
    return (createdAt as { seconds: number }).seconds * 1000;
  }
  const parsed = Number(new Date(createdAt as string | number | Date).getTime());
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * The unread badge count: how many chat messages are newer than
 * `lastSeenMs` (the per-device "last opened the chat" marker). A message
 * stamped exactly at the marker is already seen.
 */
export function countUnreadChatMessages(
  messages: readonly { createdAt?: unknown }[],
  lastSeenMs: number,
): number {
  return messages.filter((message) => crewChatMessageMillis(message.createdAt) > lastSeenMs).length;
}
