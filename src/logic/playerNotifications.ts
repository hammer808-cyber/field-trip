/**
 * Player notifications for proof-review decisions (Q11).
 *
 * There was no notification infrastructure in the app before this: the only
 * "notification" hits in the codebase were a diagnostics toast, a "Notification
 * Relay" status row, a QA-lens question, and a Profile settings line. So the
 * notification is a new server-written doc, not a second surface on top of
 * an existing one.
 *
 * Shape (written server-side by POST /api/admin/proof-review/action, in the
 * same transaction as the award — see server.ts):
 *   users/{uid}/notifications/{id} = {
 *     type: 'proof_review_decision',
 *     decision: 'approve' | 'request_info' | 'reject',
 *     status: 'approved' | 'needs_more_proof' | 'rejected',
 *     entryId, reviewId, challengeId, missionTitle,
 *     awardedXp,        // final XP for approve, 0 for the other decisions
 *     adminNote,        // the admin's note (may be empty)
 *     reviewerId,
 *     powerHour,        // true when the approval applied the Afternoon
 *                       // Power Hour multiplier (Nov 17, 2026)
 *     powerHourMultiplier, // the applied multiplier, or null
 *     read: false,      // unread until the player opens it; no mark-as-read
 *                       // UI yet — the flag is stored for that follow-up.
 *     createdAt,        // server timestamp
 *   }
 *
 * No push notifications and no email: this app has no push/email infra,
 * so delivery is in-app only, via the Basecamp "Notifications" section.
 *
 * Seven doc types share the collection (Nov 17, 2026, Notifications split,
 * plus the crew clubhouse types Nov 20, 2026): proof_review_decision
 * (review action), sticker_awarded (sticker award + admin grant),
 * proof_submitted (POST /api/entries/:id/notify-submitted, called after a
 * successful submit), power_hour_live (POST /api/notifications/power-hour-live,
 * announced when the app opens inside the Afternoon Power Hour window),
 * crew_comment (a comment on your crew photo), crew_chat_mention (an
 * @-mention in the crew chat), and crew_member_joined (a new member joined
 * your crew). Notifications is the single home for all of them; Updates no
 * longer renders notification rows.
 */

/** The three review decisions. All three notify; only the copy differs. */
export type ProofReviewDecision = 'approve' | 'request_info' | 'reject';

/** A proof-review decision notification, as read back on the client. */
export interface ProofReviewNotification {
  id: string;
  type: 'proof_review_decision';
  decision: ProofReviewDecision;
  status: 'approved' | 'needs_more_proof' | 'rejected';
  entryId: string;
  reviewId: string;
  challengeId: string | null;
  missionTitle: string;
  awardedXp: number;
  adminNote: string;
  reviewerId: string;
  /** True when the approval applied the Afternoon Power Hour multiplier. */
  powerHour?: boolean;
  /** The applied Power Hour multiplier, or null when it did not apply. */
  powerHourMultiplier?: number | null;
  read: boolean;
  /** Milliseconds since epoch (the subscription normalizes the Firestore
   * timestamp to millis; the server stores a server timestamp). */
  createdAt: number;
}

/**
 * A sticker-award notification (Nov 17, 2026). Written server-side by
 * POST /api/stickers/award in the same transaction as the award, so a
 * sticker's signal is no longer only a toast that vanishes. Same
 * collection (users/{uid}/notifications), same read flag, same client read.
 */
export interface StickerAwardedNotification {
  id: string;
  type: 'sticker_awarded';
  stickerId: string;
  stickerName: string;
  stickerRarity: string | null;
  discoveryKey: string;
  read: boolean;
  /** Milliseconds since epoch. */
  createdAt: number;
}

/**
 * A proof-submission notification (Nov 17, 2026, Notifications split).
 * Written server-side by POST /api/entries/:id/notify-submitted, called
 * after a successful submit — the client rules are read-only for these
 * docs, so a submission notification needs a server endpoint. One doc per
 * entry (deterministic id `proof_submitted_<entryId>`), so a resubmit
 * refreshes the same row instead of doubling it.
 */
export interface ProofSubmittedNotification {
  id: string;
  type: 'proof_submitted';
  entryId: string;
  challengeId: string | null;
  missionTitle: string;
  read: boolean;
  /** Milliseconds since epoch. */
  createdAt: number;
}

/**
 * An Afternoon Power Hour live announcement (Nov 17, 2026). Written
 * server-side by POST /api/notifications/power-hour-live when the app
 * opens inside the window (12:00–15:00 local). One doc per day per
 * timezone (deterministic id `afternoon_power_hour_<localDate>_<tz>`),
 * so the announcement is once a day even across devices.
 */
export interface PowerHourLiveNotification {
  id: string;
  type: 'power_hour_live';
  localDate: string;
  timezone: string;
  startHour: number;
  endHourExclusive: number;
  multiplier: number;
  read: boolean;
  /** Milliseconds since epoch. */
  createdAt: number;
}

/** Any player notification, as read back on the client. */
export type PlayerNotification =
  | ProofReviewNotification
  | StickerAwardedNotification
  | ProofSubmittedNotification
  | PowerHourLiveNotification
  | CrewCommentNotification
  | CrewChatMentionNotification
  | CrewMemberJoinedNotification;

/**
 * A comment on your crew feed photo (Nov 20, 2026 — crew clubhouse).
 * Written server-side by POST /api/crew/feed/comments, in the same call
 * as the comment itself. One doc per comment (no dedupe id — a photo can
 * collect many comments).
 */
export interface CrewCommentNotification {
  id: string;
  type: 'crew_comment';
  crewId: string;
  entryId: string;
  missionTitle: string;
  actorId: string;
  actorName: string;
  /** First 120 chars of the comment, so the row reads without a tap. */
  preview: string;
  read: boolean;
  /** Milliseconds since epoch. */
  createdAt: number;
}

/**
 * An @-mention in the crew chat (Nov 20, 2026 — crew clubhouse).
 * Written server-side by POST /api/crew/chat/messages for each mentioned
 * member (never the author). Chat messages that mention nobody write no
 * notification — the unread dot on the Chat tab is the signal for those.
 */
export interface CrewChatMentionNotification {
  id: string;
  type: 'crew_chat_mention';
  crewId: string;
  messageId: string;
  actorId: string;
  actorName: string;
  /** First 120 chars of the message. */
  preview: string;
  read: boolean;
  /** Milliseconds since epoch. */
  createdAt: number;
}

/**
 * A new member joined your crew (Nov 20, 2026 — crew clubhouse).
 * Written server-side by the invite-accept and join-approve routes,
 * fanned out to every other active member. One doc per member per join.
 */
export interface CrewMemberJoinedNotification {
  id: string;
  type: 'crew_member_joined';
  crewId: string;
  crewName: string;
  memberId: string;
  memberName: string;
  read: boolean;
  /** Milliseconds since epoch. */
  createdAt: number;
}

/**
 * The Updates-panel copy for one decision notification. The title matches
 * the generic entry-item titles the feed already uses ("Proof approved"
 * etc.) so the feed reads consistently; the detail carries what the entry
 * item cannot: the awarded XP for an approval, and the admin's note for
 * reject / request-info (the note IS what the player needs to act on).
 */
export function proofReviewDecisionCopy(notification: {
  decision: ProofReviewDecision;
  missionTitle: string;
  awardedXp: number;
  adminNote: string;
  powerHour?: boolean;
  powerHourMultiplier?: number | null;
}): { title: string; detail: string } {
  const title = notification.missionTitle || 'Field proof';
  const note = String(notification.adminNote || '').trim();
  switch (notification.decision) {
    case 'approve': {
      const powerHourSuffix =
        notification.powerHour === true
          ? ` · Power Hour ${formatMultiplier(notification.powerHourMultiplier)}x`
          : '';
      return {
        title: 'Proof approved',
        detail: `${title} · +${Number(notification.awardedXp || 0)} XP${powerHourSuffix}`,
      };
    }
    case 'reject':
      return {
        title: 'Proof review closed',
        detail: note ? `${title} · ${note}` : `${title} · No note from the reviewer.`,
      };
    case 'request_info':
      return {
        title: 'Proof needs another look',
        detail: note ? `${title} · ${note}` : `${title} · The reviewer asked for more proof.`,
      };
  }
}

/**
 * The Notifications-section copy for one sticker award. The title matches
 * the toast the award already fires ("Sticker discovered!") in spirit but
 * reads as a record, not a shout; the detail carries the sticker name and
 * rarity so the row is useful after the toast is gone.
 */
export function stickerAwardedCopy(notification: {
  stickerName: string;
  stickerRarity: string | null;
}): { title: string; detail: string } {
  const name = String(notification.stickerName || 'Sticker').trim() || 'Sticker';
  const rarity = String(notification.stickerRarity || '').trim();
  return {
    title: 'Sticker unlocked',
    detail: rarity ? `${name} · ${rarity}` : name,
  };
}

/**
 * The Notifications-section copy for one proof submission. Same language
 * as the Updates feed's pending row ("Your receipt is waiting for
 * review."), as a record: the submission now has a notification doc of
 * its own, so it survives in Notifications even after Updates scrolls on.
 */
export function proofSubmittedCopy(notification: {
  missionTitle: string;
}): { title: string; detail: string } {
  const title = String(notification.missionTitle || 'Field proof').trim() || 'Field proof';
  return {
    title: 'Proof submitted',
    detail: `${title} · Waiting for review.`,
  };
}

function formatHour(hour: number): string {
  const normalized = ((Math.round(hour) % 24) + 24) % 24;
  const suffix = normalized >= 12 ? 'PM' : 'AM';
  const clockHour = normalized % 12 || 12;
  return `${clockHour}:00 ${suffix}`;
}

function formatMultiplier(multiplier: number | null | undefined): string {
  const value = Number(multiplier);
  if (!Number.isFinite(value) || value <= 1) return '1.5';
  return String(value);
}

/**
 * The Notifications-section copy for a Power Hour live announcement. The
 * window comes from the doc (config-driven), so the copy never hardcodes
 * hours the server may have changed.
 */
export function powerHourLiveCopy(notification: {
  endHourExclusive: number;
  multiplier: number;
}): { title: string; detail: string } {
  return {
    title: 'Power Hour is live',
    detail: `Start a mission before ${formatHour(notification.endHourExclusive)} for ${formatMultiplier(notification.multiplier)}x XP.`,
  };
}

/**
 * The Notifications-section copy for a comment on your crew photo. The
 * actor is the headline (it's a person talking to you); the preview is
 * the comment itself, so the row reads without a tap.
 */
export function crewCommentCopy(notification: {
  actorName: string;
  missionTitle: string;
  preview: string;
}): { title: string; detail: string } {
  const actor = String(notification.actorName || 'A crewmate').trim() || 'A crewmate';
  const title = String(notification.missionTitle || 'your crew photo').trim() || 'your crew photo';
  const preview = String(notification.preview || '').trim();
  return {
    title: `${actor} commented on ${title}`,
    detail: preview || 'View the comment.',
  };
}

/**
 * The Notifications-section copy for an @-mention in the crew chat.
 */
export function crewChatMentionCopy(notification: {
  actorName: string;
  preview: string;
}): { title: string; detail: string } {
  const actor = String(notification.actorName || 'A crewmate').trim() || 'A crewmate';
  const preview = String(notification.preview || '').trim();
  return {
    title: `${actor} mentioned you in the crew chat`,
    detail: preview || 'Open the chat.',
  };
}

/**
 * The Notifications-section copy for a new crew member.
 */
export function crewMemberJoinedCopy(notification: {
  memberName: string;
  crewName: string;
}): { title: string; detail: string } {
  const member = String(notification.memberName || 'Someone').trim() || 'Someone';
  const crew = String(notification.crewName || 'your crew').trim() || 'your crew';
  return {
    title: `${member} joined ${crew}`,
    detail: 'Say hi in the crew chat.',
  };
}
