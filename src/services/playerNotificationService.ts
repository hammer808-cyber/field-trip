import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
} from 'firebase/firestore';
import { db, logFirestoreError, OperationType } from '../lib/firebase';
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
 * A plain single-field orderBy on the owner's subcollection — no composite
 * index needed. The rules allow the owner (or an admin) to read; clients
 * never write here (the server writes via the Admin SDK, which bypasses
 * rules), so there is no client write path to guard.
 */
export const PLAYER_NOTIFICATIONS_LIMIT = 20;

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
