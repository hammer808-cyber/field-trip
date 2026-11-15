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
 *     read: false,      // unread until the player opens it; no mark-as-read
 *                       // UI yet — the flag is stored for that follow-up.
 *     createdAt,        // server timestamp
 *   }
 *
 * No push notifications and no email: this app has no push/email infra,
 * so delivery is in-app only, via the Basecamp "Updates" panel.
 */

/** The three review decisions. All three notify; only the copy differs. */
export type ProofReviewDecision = 'approve' | 'request_info' | 'reject';

/** A proof-review decision notification, as read back on the client. */
export interface PlayerNotification {
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
  read: boolean;
  /** Milliseconds since epoch (the subscription normalizes the Firestore
   * timestamp to millis; the server stores a server timestamp). */
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
}): { title: string; detail: string } {
  const title = notification.missionTitle || 'Field proof';
  const note = String(notification.adminNote || '').trim();
  switch (notification.decision) {
    case 'approve':
      return {
        title: 'Proof approved',
        detail: `${title} · +${Number(notification.awardedXp || 0)} XP`,
      };
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
