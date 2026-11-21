import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
} from 'firebase/firestore';
import { db, logFirestoreError, OperationType } from '../lib/firebase';
import { authenticatedFetch } from '../lib/api';
import type { PlayerNotification, ProofReviewDecision } from '../logic/playerNotifications';

/**
 * Player decision notifications (Q11). The server writes these docs into
 * users/{uid}/notifications when a review decision is made; this is the
 * client read that feeds the Basecamp "Updates" panel.
 *
 * Sticker awards (Nov 17, 2026) write docs of type 'sticker_awarded' into
 * the same collection, from POST /api/stickers/award; this read maps both
 * shapes and feeds the Basecamp "Notifications" section too.
 *
 * Two more types joined in the Nov 17, 2026 Notifications split:
 * 'proof_submitted' (POST /api/entries/:id/notify-submitted) and
 * 'power_hour_live' (POST /api/notifications/power-hour-live). All four
 * map here; anything unrecognized still falls back to the decision shape.
 *
 * A plain single-field orderBy on the owner's subcollection — no composite
 * index needed. The rules allow the owner (or an admin) to read; clients
 * never write here (the server writes via the Admin SDK, which bypasses
 * rules), so there is no client write path to guard.
 *
 * Mark-as-read (Nov 20, 2026, Zach's call) goes through the server too:
 * `markNotificationRead` POSTs to /api/notifications/:id/read, which sets
 * `read: true` via the Admin SDK. The detail card calls it when it opens.
 */
export const PLAYER_NOTIFICATIONS_LIMIT = 50;

/** Mark one of the caller's own notifications read. Never throws — the
 * caller treats a failure as "dot stays", not an error to show. */
export async function markNotificationRead(notificationId: string): Promise<boolean> {
  const id = String(notificationId || '').trim();
  if (!id) return false;
  try {
    const res = await authenticatedFetch(`/api/notifications/${encodeURIComponent(id)}/read`, {
      method: 'POST',
    });
    return res.ok;
  } catch {
    return false;
  }
}

function toMillis(value: unknown): number {
  if (!value) return 0;
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof (value as { toMillis?: () => number }).toMillis === 'function') {
    return (value as { toMillis: () => number }).toMillis();
  }
  if (typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().getTime();
  }
  const seconds = (value as { seconds?: unknown }).seconds;
  if (typeof seconds === 'number') return seconds * 1000;
  const parsed = new Date(value as string | number | Date).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

export function subscribeToPlayerNotifications(
  userId: string,
  callback: (notifications: PlayerNotification[]) => void,
) {
  const q = query(
    collection(db, 'users', userId, 'notifications'),
    orderBy('createdAt', 'desc'),
    limit(PLAYER_NOTIFICATIONS_LIMIT),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      callback(
        snapshot.docs.map((docSnap) => {
          const data = docSnap.data() || {};
          // Sticker awards (Nov 17, 2026) share the collection with a
          // different type — map them to their own shape, not a decision.
          if (data.type === 'sticker_awarded') {
            return {
              id: docSnap.id,
              type: 'sticker_awarded',
              stickerId: String(data.stickerId || ''),
              stickerName: String(data.stickerName || 'Sticker'),
              stickerRarity: data.stickerRarity ? String(data.stickerRarity) : null,
              discoveryKey: String(data.discoveryKey || ''),
              read: data.read === true,
              createdAt: toMillis(data.createdAt),
            } as PlayerNotification;
          }
          // A proof submission (Nov 17, 2026, Notifications split) —
          // written by POST /api/entries/:id/notify-submitted after a
          // successful submit, one doc per entry.
          if (data.type === 'proof_submitted') {
            return {
              id: docSnap.id,
              type: 'proof_submitted',
              entryId: String(data.entryId || ''),
              challengeId: data.challengeId ? String(data.challengeId) : null,
              missionTitle: String(data.missionTitle || 'Field proof'),
              read: data.read === true,
              createdAt: toMillis(data.createdAt),
            } as PlayerNotification;
          }
          // A Power Hour live announcement (Nov 17, 2026) — written by
          // POST /api/notifications/power-hour-live when the app opens
          // inside the window, one doc per day per timezone.
          if (data.type === 'power_hour_live') {
            return {
              id: docSnap.id,
              type: 'power_hour_live',
              localDate: String(data.localDate || ''),
              timezone: String(data.timezone || ''),
              startHour: Number(data.startHour ?? 12),
              endHourExclusive: Number(data.endHourExclusive ?? 15),
              multiplier: Number(data.multiplier ?? 1.5),
              read: data.read === true,
              createdAt: toMillis(data.createdAt),
            } as PlayerNotification;
          }
          // Crew clubhouse (Nov 20, 2026): a comment on your crew photo,
          // an @-mention in the crew chat, or a new member joining.
          if (data.type === 'crew_comment') {
            return {
              id: docSnap.id,
              type: 'crew_comment',
              crewId: String(data.crewId || ''),
              entryId: String(data.entryId || ''),
              missionTitle: String(data.missionTitle || 'your crew photo'),
              actorId: String(data.actorId || ''),
              actorName: String(data.actorName || 'A crewmate'),
              preview: String(data.preview || ''),
              read: data.read === true,
              createdAt: toMillis(data.createdAt),
            } as PlayerNotification;
          }
          if (data.type === 'crew_chat_mention') {
            return {
              id: docSnap.id,
              type: 'crew_chat_mention',
              crewId: String(data.crewId || ''),
              messageId: String(data.messageId || ''),
              actorId: String(data.actorId || ''),
              actorName: String(data.actorName || 'A crewmate'),
              preview: String(data.preview || ''),
              read: data.read === true,
              createdAt: toMillis(data.createdAt),
            } as PlayerNotification;
          }
          if (data.type === 'crew_member_joined') {
            return {
              id: docSnap.id,
              type: 'crew_member_joined',
              crewId: String(data.crewId || ''),
              crewName: String(data.crewName || 'your crew'),
              memberId: String(data.memberId || ''),
              memberName: String(data.memberName || 'Someone'),
              read: data.read === true,
              createdAt: toMillis(data.createdAt),
            } as PlayerNotification;
          }
          const decision = (['approve', 'request_info', 'reject'] as ProofReviewDecision[]).includes(
            data.decision,
          )
            ? (data.decision as ProofReviewDecision)
            : 'request_info';
          return {
            id: docSnap.id,
            type: 'proof_review_decision',
            decision,
            status:
              decision === 'approve'
                ? 'approved'
                : decision === 'reject'
                  ? 'rejected'
                  : 'needs_more_proof',
            entryId: String(data.entryId || ''),
            reviewId: String(data.reviewId || ''),
            challengeId: data.challengeId ? String(data.challengeId) : null,
            missionTitle: String(data.missionTitle || 'Field proof'),
            awardedXp: Number(data.awardedXp || 0),
            adminNote: String(data.adminNote || ''),
            reviewerId: String(data.reviewerId || ''),
            powerHour: data.powerHour === true,
            powerHourMultiplier:
              typeof data.powerHourMultiplier === 'number' ? data.powerHourMultiplier : null,
            read: data.read === true,
            createdAt: toMillis(data.createdAt),
          } as PlayerNotification;
        }),
      );
    },
    (error) => {
      if (!error.message.includes('requires an index')) {
        logFirestoreError(error, OperationType.LIST, 'notifications');
      }
    },
  );
}
