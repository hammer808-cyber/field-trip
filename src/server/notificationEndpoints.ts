/**
 * Server-side player notification endpoints (Nov 17, 2026, Notifications
 * split).
 *
 * Notifications is the single home for every notification doc, so the
 * types that had no server writer needed one:
 *
 * - POST /api/entries/:id/notify-submitted — a proof submission writes a
 *   `proof_submitted` doc. Submissions are client-side Firestore writes,
 *   and the client rules are read-only for `users/{uid}/notifications`,
 *   so this endpoint is the only way a submission gets a notification.
 *   One doc per entry (deterministic id), so a resubmit refreshes the
 *   same row instead of doubling it.
 *
 * - POST /api/notifications/power-hour-live — the app opens inside the
 *   Afternoon Power Hour window and announces it, so a `power_hour_live`
 *   doc lands in Notifications. One doc per day per timezone
 *   (deterministic id), so the announcement is once a day even across
 *   devices. The server is the authority on the window: it re-checks the
 *   claimed date/timezone against the scoring config before writing, so
 *   a forged body cannot announce an hour that isn't live.
 *
 * Both handlers are deliberately dependency-injected (narrow
 * `NotificationDb` interface + `getScoringConfig`), so unit tests can run
 * them against an in-memory fake instead of Firestore. `server.ts` wires
 * the real Admin SDK db via `getDb: () => dbAdmin`.
 *
 * Mark-as-read (Nov 20, 2026, Zach's call): `POST
 * /api/notifications/:id/read` sets `read: true` on one of the caller's
 * own docs via the Admin SDK — the client rules are read-only there, so
 * this endpoint is the only write path. The detail card calls it when it
 * opens, so the red unread dot clears once the player has seen the
 * notification. The list cap rose 20 → 50 the same day (see
 * `PLAYER_NOTIFICATIONS_LIMIT`); the UI reveals 7 at a time with a
 * Show more button instead of paging the subscription.
 */

import { FieldValue } from 'firebase-admin/firestore';
import {
  AFTERNOON_POWER_HOUR_ID,
  buildAfternoonPowerHourEligibility,
  getLocalTimeSnapshot,
  isValidIanaTimezone,
} from '../logic/missionBonuses';
import type { MissionScoringConfig } from '../logic/missionScoring';

/** Minimal Admin SDK surface these handlers touch, so tests can fake it. */
export interface NotificationDocRef {
  get: () => Promise<{ exists: boolean; data: () => Record<string, any> | undefined }>;
  set: (data: Record<string, any>, options?: { merge?: boolean }) => Promise<unknown>;
  collection: (name: string) => NotificationCollectionRef;
}

export interface NotificationCollectionRef {
  doc: (id: string) => NotificationDocRef;
}

export interface NotificationDb {
  collection: (name: string) => NotificationCollectionRef;
}

export interface NotificationEndpointDeps {
  getDb: () => NotificationDb | null;
  getScoringConfig: () => Promise<MissionScoringConfig>;
  /** Test seam for "now"; defaults to the real clock. */
  now?: () => Date;
}

/** Deterministic doc id for a submission notification — one row per entry. */
export function getProofSubmittedNotificationId(entryId: string): string {
  return `proof_submitted_${entryId}`;
}

/**
 * Deterministic doc id for a Power Hour announcement — one row per day per
 * timezone. NOTE: this is NOT the eligibility `assignmentId` verbatim:
 * that key embeds the raw IANA timezone (`America/Los_Angeles`), and a
 * Firestore doc id cannot contain `/`. The timezone is flattened here.
 */
export function getPowerHourAnnouncementId(localDate: string, timezone: string): string {
  return `${AFTERNOON_POWER_HOUR_ID}_${localDate}_${timezone.replaceAll('/', '_')}`;
}

function dbOr500(deps: { getDb: () => NotificationDb | null }, res: any): NotificationDb | null {
  const db = deps.getDb();
  if (!db) res.status(500).json({ error: 'DB_ADMIN_NOT_READY' });
  return db;
}

function uidOr401(req: any, res: any): string | null {
  const uid = String(req.user?.uid ?? '').trim();
  if (!uid) res.status(401).json({ error: 'NOT_AUTHENTICATED' });
  return uid || null;
}

/**
 * Returns an Express handler for `POST /api/entries/:id/notify-submitted`.
 * The caller must own the entry, and the entry must still be pending
 * review — an already-decided entry already has its decision
 * notification, so a submission row for it would be noise.
 */
export function createNotifySubmittedHandler(deps: NotificationEndpointDeps) {
  return async (req: any, res: any) => {
    const db = dbOr500(deps, res);
    if (!db) return;
    const uid = uidOr401(req, res);
    if (!uid) return;
    const entryId = String(req.params?.id ?? '').trim();
    if (!entryId) return res.status(400).json({ error: 'MISSING_ENTRY_ID' });

    const entrySnap = await db.collection('entries').doc(entryId).get();
    if (!entrySnap.exists) return res.status(404).json({ error: 'ENTRY_NOT_FOUND' });
    const entry = entrySnap.data() || {};
    const ownerId = String(entry.userId || entry.uid || '');
    if (ownerId !== uid) return res.status(403).json({ error: 'NOT_ENTRY_OWNER' });
    if (String(entry.status || '') !== 'pending_review') {
      return res.status(409).json({ error: 'ENTRY_NOT_PENDING', status: String(entry.status || '') });
    }

    const docId = getProofSubmittedNotificationId(entryId);
    const notifRef = db.collection('users').doc(uid).collection('notifications').doc(docId);
    const existing = await notifRef.get();
    if (existing.exists) return res.json({ ok: true, notified: false, reason: 'already_notified' });

    await notifRef.set({
      type: 'proof_submitted',
      entryId,
      challengeId: entry.challengeId || entry.tripId || null,
      missionTitle: String(entry.missionTitle || entry.tripTitle || entry.challengeTitle || 'Field proof'),
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
    return res.json({ ok: true, notified: true });
  };
}

/**
 * Returns an Express handler for `POST /api/notifications/power-hour-live`.
 * Body: `{ localDate: 'YYYY-MM-DD', timezone: 'America/Los_Angeles' }`.
 * The server re-derives the local date and the window from its own clock
 * and the scoring config — a body claiming a different day, an unknown
 * timezone, or an hour outside the window is rejected, not written.
 */
export function createPowerHourLiveHandler(deps: NotificationEndpointDeps) {
  return async (req: any, res: any) => {
    const db = dbOr500(deps, res);
    if (!db) return;
    const uid = uidOr401(req, res);
    if (!uid) return;
    const localDate = String(req.body?.localDate ?? '').trim();
    const timezone = String(req.body?.timezone ?? '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(localDate)) {
      return res.status(400).json({ error: 'INVALID_LOCAL_DATE' });
    }
    if (!isValidIanaTimezone(timezone)) {
      return res.status(400).json({ error: 'INVALID_TIMEZONE' });
    }

    const now = deps.now ? deps.now() : new Date();
    const local = getLocalTimeSnapshot(now, timezone);
    if (local.localDate !== localDate) {
      return res.status(400).json({ error: 'DATE_MISMATCH' });
    }
    const config = await deps.getScoringConfig();
    const eligibility = buildAfternoonPowerHourEligibility(now, timezone, config);
    if (!eligibility.eligible) {
      return res.status(409).json({ error: 'NOT_IN_POWER_HOUR' });
    }

    const docId = getPowerHourAnnouncementId(localDate, timezone);
    const notifRef = db.collection('users').doc(uid).collection('notifications').doc(docId);
    const existing = await notifRef.get();
    if (existing.exists) {
      return res.json({ ok: true, announced: false, reason: 'already_announced', assignmentId: docId });
    }

    await notifRef.set({
      type: 'power_hour_live',
      localDate,
      timezone,
      startHour: config.afternoonPowerHour.startHour,
      endHourExclusive: config.afternoonPowerHour.endHourExclusive,
      multiplier: config.afternoonPowerHour.multiplier,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
    return res.json({ ok: true, announced: true, assignmentId: docId });
  };
}

/**
 * Returns an Express handler for `POST /api/notifications/:id/read`.
 * Marks one of the caller's own notification docs read. The doc lives
 * under the caller's own `users/{uid}/notifications` path, so ownership
 * is by path — the uid always comes from the authenticated token, never
 * the body or the id. Idempotent: an already-read doc returns ok without
 * a second write.
 */
export function createMarkNotificationReadHandler(deps: { getDb: () => NotificationDb | null }) {
  return async (req: any, res: any) => {
    const db = dbOr500(deps, res);
    if (!db) return;
    const uid = uidOr401(req, res);
    if (!uid) return;
    const notificationId = String(req.params?.id ?? '').trim();
    if (!notificationId) return res.status(400).json({ error: 'MISSING_NOTIFICATION_ID' });

    const notifRef = db.collection('users').doc(uid).collection('notifications').doc(notificationId);
    const existing = await notifRef.get();
    if (!existing.exists) return res.status(404).json({ error: 'NOTIFICATION_NOT_FOUND' });
    const data = existing.data() || {};
    if (data.read === true) return res.json({ ok: true, read: false, reason: 'already_read' });

    await notifRef.set({ read: true }, { merge: true });
    return res.json({ ok: true, read: true });
  };
}
