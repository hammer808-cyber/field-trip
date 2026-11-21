/**
 * Option B (Nov 20, 2026) — evaluator sticker awards, server-side.
 *
 * `POST /api/stickers/evaluate` is the single funnel for every evaluator
 * award: the client posts an event, the server verifies it against
 * Firestore, runs the pure evaluator (`src/logic/stickerEvaluator.ts`),
 * and writes the sticker doc + ledger row + `sticker_awarded`
 * notification in one Admin SDK transaction per award. That closes the
 * gap the diagnosis found: the client evaluator wrote only the sticker
 * doc, so no evaluator award ever reached Basecamp Notifications.
 *
 * Same rule as `stickerAwards.ts` / `stickerGrants.ts`: no award logic
 * inline in `server.ts`. This module is dependency-injected — the logic
 * runs against a narrow `StickerEvalStore` interface, so unit tests can
 * run it with an in-memory fake instead of Firestore. `server.ts` wires
 * the real Admin SDK store via `createAdminStickerEvalStore`.
 *
 * Verification — what the server checks before it awards (the honest
 * limit from the design doc, `docs/sticker-evaluator-server-awards-design.md`):
 * - Entry events (`first_approval`, `first_submission`, `field_note_added`,
 *   `photo_proof_added`, `late_night_submission`): the entry must exist
 *   and belong to the awardee. `first_approval` additionally requires
 *   the entry's status to normalize to `approved` — a bare claim without
 *   a real approval awards nothing. Note/photo events require the entry
 *   to actually carry a note / a proof image. The local hour for
 *   late-night stays client-claimed (the server has no device timezone).
 * - `starter_pack`: the requested archetype must match the profile's
 *   field type (the quiz writes fieldType before it awards).
 * - Crew events: the crew must exist; `crew_created` requires the
 *   awardee to be the crew's captain, `crew_joined` / `crew_survived_week`
 *   require membership; `crew_survived_week` additionally requires the
 *   crew to be at least 7 days old.
 * - `level_up`: the named level-up event doc must exist, belong to the
 *   awardee, and reach at least level 2.
 * - `first_draw`: the player must have at least one drawn mission card
 *   (the draw saves the card before it awards).
 * - `weekly_vote_cast`: a vote doc must exist for the player in the
 *   given season + week (the vote is cast server-side first).
 * - `zine_page_added`: no server-visible state to check (Zines parked) —
 *   the claim is accepted, and the sticker dedupes it to one award.
 * - `weekly_winner` / `admin_grant` are never evaluated here — they have
 *   their own paths (`canonicalStickerAwards.ts`, `stickerGrants.ts`).
 *
 * Awardee: the entry's owner for entry events, else the caller. Asking
 * for someone else's award needs admin (`requireAdminUser`).
 *
 * Latent bug fixed by this move (found during the build): the client's
 * `STICKER_AWARD_TRIGGERS` list had only 17 entries — the 6 fix-#3
 * triggers were never added to it — so the client unlock rejected every
 * `first_draw` / `location_verified` / `late_night_submission` /
 * `desert_state_approval` / `approval_streak` / `crew_survived_week`
 * award before it reached Firestore. The server unlock validates
 * against the full 23-trigger list in `stickerAwardCore.ts`.
 *
 * Also in this module: `POST /api/admin/stickers/backfill-notifications`
 * (admin-only) — the one-time backfill Zach picked for "all players'
 * missing ones": for every player, every sticker doc without a matching
 * `sticker_awarded` notification gets one (unread, `createdAt` = the
 * sticker's `unlockedAt`, so the feed keeps its chronology). Idempotent:
 * re-running writes nothing. Ledger rows are NOT backfilled — the ledger
 * stays the record of server-side awards only.
 */

import { FieldValue } from 'firebase-admin/firestore';
import type { Firestore } from 'firebase-admin/firestore';
import {
  getStarterPackForArchetype,
  getStickerById,
  type StickerArchetype,
  type StickerAwardTrigger
} from '../data/stickers';
import {
  evaluateAdminApprovalStickers,
  evaluateStickerTriggers,
  getEntryMissionId
} from '../logic/stickerEvaluator';
import { buildCanonicalProgress } from '../services/canonicalProgress';
import { normalizeEntryStatus } from '../logic/entryLogic';
import {
  getStickerArchetypeForFieldType,
  isNeedsMoreReviewForMission,
  isStickerAwardTrigger,
  normalizeSource,
  validateUserId,
  type StickerUnlockResult
} from '../logic/stickerAwardCore';

/** Deterministic ledger id, same shape as `stickerGrants.ts`. */
export function getStickerEvalAwardId(userId: string, stickerId: string): string {
  return `${userId}:${stickerId}`;
}

/** `crew_survived_week` bar: the crew must be at least 7 days old. */
export const CREW_SURVIVED_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Triggers this endpoint never evaluates — they have their own paths. */
const NON_EVALUATED_TRIGGERS: ReadonlySet<StickerAwardTrigger> = new Set([
  'weekly_winner',
  'admin_grant'
]);

/** Entry events: the entry must exist and belong to the awardee. */
const ENTRY_EVENTS: ReadonlySet<StickerAwardTrigger> = new Set([
  'first_approval',
  'first_submission',
  'field_note_added',
  'photo_proof_added',
  'late_night_submission'
]);

/** Crew events: the crew must exist and the player must belong to it. */
const CREW_EVENTS: ReadonlySet<StickerAwardTrigger> = new Set([
  'crew_created',
  'crew_joined',
  'crew_survived_week'
]);

function getEntryUserId(entry: Record<string, any>): string {
  return String(entry.userId ?? entry.uid ?? entry.firebaseUid ?? '').trim();
}

function crewCreatedAtMillis(createdAt: unknown): number | null {
  if (!createdAt) return null;
  if (typeof (createdAt as { toMillis?: unknown }).toMillis === 'function') {
    return (createdAt as { toMillis: () => number }).toMillis();
  }
  if (createdAt instanceof Date) return createdAt.getTime();
  if (typeof createdAt === 'number') return createdAt;
  if (typeof createdAt === 'string') {
    const parsed = Date.parse(createdAt);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof (createdAt as { seconds?: unknown }).seconds === 'number') {
    return (createdAt as { seconds: number }).seconds * 1000;
  }
  return null;
}

function buildStickerAwardedNotification(input: {
  stickerId: string;
  stickerName: string;
  stickerRarity: string | null;
  trigger: string;
  createdAt: unknown;
}): Record<string, any> {
  return {
    type: 'sticker_awarded',
    stickerId: input.stickerId,
    stickerName: input.stickerName,
    stickerRarity: input.stickerRarity,
    discoveryKey: input.trigger,
    read: false,
    createdAt: input.createdAt
  };
}

// ---------------------------------------------------------------------------
// Store interface + Admin SDK adapter
// ---------------------------------------------------------------------------

export interface StickerEvalStore {
  getUserProfile(uid: string): Promise<Record<string, any> | null>;
  getEntry(entryId: string): Promise<Record<string, any> | null>;
  /** Repair check (Plot Twist): an earlier needs-more-proof review for this mission. */
  wasRepair(userId: string, missionId: string | null): Promise<boolean>;
  hasDrawnCard(uid: string): Promise<boolean>;
  getCrew(crewId: string): Promise<Record<string, any> | null>;
  /** Membership fallback when the crew doc carries no `members` array. */
  isCrewMember(crewId: string, uid: string): Promise<boolean>;
  getLevelUpEvent(eventId: string): Promise<Record<string, any> | null>;
  hasVote(uid: string, seasonId: string, weekNumber: number): Promise<boolean>;
  /**
   * The server unlock (Option B): one transaction per award, mirroring
   * the old client unlock's semantics — re-checks the sticker doc AND
   * the ledger row, then writes the sticker doc, the ledger row, and the
   * `sticker_awarded` notification for each newly unlocked sticker.
   * Results come back in the input order.
   */
  unlock(
    userId: string,
    stickerIds: string[],
    source: string,
    trigger: StickerAwardTrigger
  ): Promise<StickerUnlockResult[]>;
}

/** Admin SDK implementation of `StickerEvalStore`. Bypasses Firestore rules. */
export function createAdminStickerEvalStore(db: Firestore): StickerEvalStore {
  return {
    async getUserProfile(uid: string) {
      const snap = await db.collection('users').doc(uid).get();
      return snap.exists ? (snap.data() as Record<string, any>) : null;
    },

    async getEntry(entryId: string) {
      const snap = await db.collection('entries').doc(entryId).get();
      return snap.exists ? (snap.data() as Record<string, any>) : null;
    },

    async wasRepair(userId: string, missionId: string | null) {
      if (!userId || !missionId) return false;
      try {
        const snap = await db
          .collection('proofReviews')
          .where('userId', '==', userId)
          .limit(50)
          .get();
        return snap.docs.some(docSnap =>
          isNeedsMoreReviewForMission(docSnap.data() as any, missionId)
        );
      } catch {
        return false;
      }
    },

    async hasDrawnCard(uid: string) {
      const snap = await db
        .collection('users')
        .doc(uid)
        .collection('drawnMissionCards')
        .limit(1)
        .get();
      return !snap.empty;
    },

    async getCrew(crewId: string) {
      const snap = await db.collection('crews').doc(crewId).get();
      return snap.exists ? (snap.data() as Record<string, any>) : null;
    },

    async isCrewMember(crewId: string, uid: string) {
      const snap = await db
        .collection('crews')
        .doc(crewId)
        .collection('members')
        .doc(uid)
        .get();
      return snap.exists;
    },

    async getLevelUpEvent(eventId: string) {
      const snap = await db.collection('levelUpEvents').doc(eventId).get();
      return snap.exists ? (snap.data() as Record<string, any>) : null;
    },

    async hasVote(uid: string, seasonId: string, weekNumber: number) {
      const snap = await db
        .collection('votes')
        .where('userId', '==', uid)
        .where('seasonId', '==', seasonId)
        .where('weekNumber', '==', weekNumber)
        .limit(1)
        .get();
      return !snap.empty;
    },

    async unlock(userId, stickerIds, source, trigger) {
      const uniqueStickerIds = [...new Set(stickerIds.filter(Boolean))];
      if (uniqueStickerIds.length === 0) return [];

      const normalizedSource = normalizeSource(source);
      if (!validateUserId(userId) || !normalizedSource || !isStickerAwardTrigger(trigger)) {
        const error = !validateUserId(userId)
          ? 'A valid userId is required.'
          : !normalizedSource
            ? 'Source must be between 1 and 200 characters.'
            : `Unknown sticker trigger: ${String(trigger)}`;
        return uniqueStickerIds.map(stickerId => ({
          stickerId,
          status: 'failed' as const,
          unlocked: false,
          error
        }));
      }

      const invalidResults: StickerUnlockResult[] = [];
      const validStickerIds = uniqueStickerIds.filter(stickerId => {
        if (getStickerById(stickerId)) return true;
        invalidResults.push({
          stickerId,
          status: 'invalid_sticker' as const,
          unlocked: false,
          error: `Unknown stickerId: ${stickerId}`
        });
        return false;
      });
      if (validStickerIds.length === 0) return invalidResults;

      const transactionResults = await db.runTransaction(async tx => {
        const stickerRefs = validStickerIds.map(stickerId =>
          db.collection('users').doc(userId).collection('stickers').doc(stickerId)
        );
        const ledgerRefs = validStickerIds.map(stickerId =>
          db.collection('stickerAwards').doc(getStickerEvalAwardId(userId, stickerId))
        );
        const [stickerSnaps, ledgerSnaps] = await Promise.all([
          Promise.all(stickerRefs.map(ref => tx.get(ref))),
          Promise.all(ledgerRefs.map(ref => tx.get(ref)))
        ]);

        return stickerSnaps.map((snapshot, index): StickerUnlockResult => {
          const stickerId = validStickerIds[index];
          if (snapshot.exists || ledgerSnaps[index].exists) {
            return { stickerId, status: 'already_unlocked', unlocked: false };
          }
          const sticker = getStickerById(stickerId)!;
          tx.set(stickerRefs[index], {
            stickerId,
            unlockedAt: FieldValue.serverTimestamp(),
            source: normalizedSource,
            trigger,
            seen: false,
            equipped: false
          });
          tx.set(ledgerRefs[index], {
            awardId: getStickerEvalAwardId(userId, stickerId),
            stickerId,
            userId,
            trigger,
            source: normalizedSource,
            eventId: null,
            awardedAt: FieldValue.serverTimestamp(),
            awardedBy: 'evaluator',
            verifiedBy: 'server'
          });
          tx.set(
            db.collection('users').doc(userId).collection('notifications').doc(),
            buildStickerAwardedNotification({
              stickerId,
              stickerName: sticker.name,
              stickerRarity: sticker.rarity ?? null,
              trigger,
              createdAt: FieldValue.serverTimestamp()
            })
          );
          return { stickerId, status: 'unlocked', unlocked: true };
        });
      });

      const resultsById = new Map(
        [...transactionResults, ...invalidResults].map(result => [result.stickerId, result])
      );
      return uniqueStickerIds.map(stickerId => resultsById.get(stickerId) ?? ({
        stickerId,
        status: 'failed',
        unlocked: false,
        error: 'Sticker unlock result was not recorded.'
      } satisfies StickerUnlockResult));
    }
  };
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

export interface EvaluateStickersInput {
  callerUid: string;
  eventType: string;
  entryId?: string;
  source?: string;
  localHour?: number;
  archetype?: string;
  crewId?: string;
  eventId?: string;
  seasonId?: string;
  weekNumber?: number;
}

export type EvaluateStickersResult =
  | { ok: true; awarded: StickerUnlockResult[] }
  | { ok: false; status: number; code: string };

const KNOWN_ARCHETYPES: ReadonlySet<string> = new Set([
  'captainClipboard',
  'mallRat',
  'mascota',
  'elondra',
  'lostCamper',
  'bigfoot'
]);

function fail(status: number, code: string): EvaluateStickersResult {
  return { ok: false, status, code };
}

export async function evaluateStickersServer(
  store: StickerEvalStore,
  input: EvaluateStickersInput,
  opts: { requireAdmin: () => Promise<void> }
): Promise<EvaluateStickersResult> {
  // 1. Event type + source.
  const eventType = String(input.eventType ?? '').trim() as StickerAwardTrigger;
  if (!isStickerAwardTrigger(eventType)) return fail(400, 'INVALID_EVENT_TYPE');
  if (NON_EVALUATED_TRIGGERS.has(eventType)) return fail(400, 'EVENT_NOT_EVALUATED');
  const source = normalizeSource(input.source ?? '');
  if (!source) return fail(400, 'INVALID_SOURCE');

  // 2. Per-event required parameters.
  const entryId = String(input.entryId ?? '').trim();
  const crewId = String(input.crewId ?? '').trim();
  const levelUpEventId = String(input.eventId ?? '').trim();
  const archetype = String(input.archetype ?? '').trim();
  if (ENTRY_EVENTS.has(eventType) && !entryId) return fail(400, 'MISSING_ENTRY_ID');
  if (eventType === 'starter_pack' && !archetype) return fail(400, 'MISSING_ARCHETYPE');
  if (eventType === 'starter_pack' && !KNOWN_ARCHETYPES.has(archetype)) {
    return fail(400, 'UNKNOWN_ARCHETYPE');
  }
  if (CREW_EVENTS.has(eventType) && !crewId) return fail(400, 'MISSING_CREW_ID');
  if (eventType === 'level_up' && !levelUpEventId) return fail(400, 'MISSING_EVENT_ID');
  if (eventType === 'weekly_vote_cast' && (!input.seasonId || input.weekNumber === undefined)) {
    return fail(400, 'MISSING_VOTE_PARAMS');
  }
  const localHour = input.localHour;
  if (eventType === 'late_night_submission') {
    if (typeof localHour !== 'number' || !Number.isInteger(localHour) || localHour < 0 || localHour > 23) {
      return fail(400, 'INVALID_LOCAL_HOUR');
    }
  }

  // 3. Loads.
  let entry: Record<string, any> | null = null;
  if (ENTRY_EVENTS.has(eventType)) {
    entry = await store.getEntry(entryId);
    if (!entry) return fail(404, 'ENTRY_NOT_FOUND');
  }
  let crew: Record<string, any> | null = null;
  if (CREW_EVENTS.has(eventType)) {
    crew = await store.getCrew(crewId);
    if (!crew) return fail(404, 'CREW_NOT_FOUND');
  }
  let levelUpEvent: Record<string, any> | null = null;
  if (eventType === 'level_up') {
    levelUpEvent = await store.getLevelUpEvent(levelUpEventId);
    if (!levelUpEvent) return fail(404, 'LEVEL_UP_EVENT_NOT_FOUND');
  }

  // 4. Awardee: the entry's owner for entry events, else the caller.
  const awardee = entry ? getEntryUserId(entry) : input.callerUid;
  if (!awardee) return fail(404, 'ENTRY_NOT_FOUND');

  // 5. Admin gate: asking for someone else's award needs admin.
  if (awardee !== input.callerUid) {
    try {
      await opts.requireAdmin();
    } catch {
      return fail(403, 'ADMIN_ONLY');
    }
  }

  // 6. Per-event verification.
  if (eventType === 'first_approval') {
    if (normalizeEntryStatus(entry!.status) !== 'approved') {
      return fail(409, 'ENTRY_NOT_APPROVED');
    }
  }
  if (eventType === 'field_note_added') {
    if (typeof entry!.fieldNote !== 'string' || !entry!.fieldNote.trim()) {
      return fail(409, 'ENTRY_MISSING_NOTE');
    }
  }
  if (eventType === 'photo_proof_added') {
    // The client fires on any image field the submission carries; the
    // entry doc stores several, so check them all.
    const image =
      entry!.proofImage ?? entry!.photoUrl ?? entry!.imageUrl ??
      entry!.originalImageUrl ?? entry!.imageStoragePath ?? entry!.storagePath;
    if (typeof image !== 'string' || !image.trim()) {
      return fail(409, 'ENTRY_MISSING_PHOTO');
    }
  }
  if (eventType === 'first_draw') {
    if (!(await store.hasDrawnCard(awardee))) return fail(409, 'NO_DRAWN_CARD');
  }
  if (eventType === 'level_up') {
    if (String(levelUpEvent!.userId ?? '') !== awardee) {
      return fail(409, 'LEVEL_UP_EVENT_NOT_OWNED');
    }
    if (Number(levelUpEvent!.toLevel || 1) < 2) {
      return fail(409, 'LEVEL_UP_EVENT_NOT_A_LEVEL_UP');
    }
  }
  if (eventType === 'crew_created') {
    const captainId = String(crew!.captainId ?? crew!.createdBy ?? '');
    if (captainId !== awardee) return fail(409, 'NOT_CREW_CREATOR');
  }
  if (eventType === 'crew_joined' || eventType === 'crew_survived_week') {
    const members = crew!.members;
    let isMember = Array.isArray(members) && members.includes(awardee);
    if (!isMember) isMember = await store.isCrewMember(crewId, awardee);
    if (!isMember) return fail(409, 'NOT_A_CREW_MEMBER');
  }
  if (eventType === 'crew_survived_week') {
    const createdMillis = crewCreatedAtMillis(crew!.createdAt);
    if (createdMillis === null || Date.now() - createdMillis < CREW_SURVIVED_WEEK_MS) {
      return fail(409, 'CREW_TOO_NEW');
    }
  }
  if (eventType === 'weekly_vote_cast') {
    if (!(await store.hasVote(awardee, String(input.seasonId), Number(input.weekNumber)))) {
      return fail(409, 'NO_VOTE_FOUND');
    }
  }

  // 7. Profile + snapshot (the milestone bundle's source). A missing
  // profile degrades to event-rules-only, same as the old client path.
  const profile = await store.getUserProfile(awardee);
  const fieldType = (entry as any)?.fieldType ?? profile?.fieldType ?? null;
  const unlock = (
    uid: string,
    ids: string[],
    src: string,
    trig: StickerAwardTrigger
  ): Promise<StickerUnlockResult[]> => store.unlock(uid, ids, src, trig);

  // 8a. Starter pack: the evaluator never evaluates `starter_pack`
  // (CLIENT_UNEVALUATED_TRIGGERS) — award the archetype's pack directly,
  // after checking it matches the profile's field type.
  if (eventType === 'starter_pack') {
    if (!profile) return fail(404, 'USER_NOT_FOUND');
    if (getStickerArchetypeForFieldType(profile.fieldType) !== archetype) {
      return fail(409, 'ARCHETYPE_MISMATCH');
    }
    let pack: ReturnType<typeof getStarterPackForArchetype>;
    try {
      pack = getStarterPackForArchetype(archetype as StickerArchetype);
    } catch {
      return fail(400, 'UNKNOWN_ARCHETYPE');
    }
    if (pack.length === 0) return fail(400, 'UNKNOWN_ARCHETYPE');
    const awarded = await store.unlock(awardee, pack.map(sticker => sticker.id), source, 'starter_pack');
    return { ok: true, awarded };
  }

  // 8b. Approval bundle (the milestone fix #1 path, server-side now).
  if (eventType === 'first_approval') {
    const wasRepair = await store.wasRepair(awardee, getEntryMissionId(entry as any));
    const awarded = await evaluateAdminApprovalStickers({
      userId: awardee,
      entry: entry as any,
      source,
      fieldType,
      profile: profile as any,
      wasRepair,
      unlock
    });
    return { ok: true, awarded };
  }

  // 8c. Every other evaluator event.
  const snapshot = profile
    ? buildCanonicalProgress({ userId: awardee, profile: profile as any })
    : null;
  const awarded = await evaluateStickerTriggers({
    event: {
      type: eventType,
      entry: entry as any,
      localHour: localHour ?? undefined,
      source
    },
    userId: awardee,
    snapshot,
    fieldType,
    unlock
  });
  return { ok: true, awarded };
}

// ---------------------------------------------------------------------------
// Express handler (thin: auth + rate limiting live in server.ts)
// ---------------------------------------------------------------------------

export interface StickerEvaluateHandlerDeps {
  requireAdminUser: (req: any) => Promise<void>;
}

/** Returns an Express handler for `POST /api/stickers/evaluate`. */
export function createEvaluateStickersHandler(
  getStore: () => StickerEvalStore | null,
  deps: StickerEvaluateHandlerDeps
) {
  return async (req: any, res: any) => {
    const store = getStore();
    if (!store) return res.status(500).json({ error: 'DB_ADMIN_NOT_READY' });
    const callerUid = req.user?.uid;
    if (!callerUid) return res.status(401).json({ error: 'UNAUTHORIZED' });

    try {
      const result = await evaluateStickersServer(
        store,
        {
          callerUid,
          eventType: req.body?.eventType,
          entryId: req.body?.entryId,
          source: req.body?.source,
          localHour: req.body?.localHour,
          archetype: req.body?.archetype,
          crewId: req.body?.crewId,
          eventId: req.body?.eventId,
          seasonId: req.body?.seasonId,
          weekNumber: req.body?.weekNumber
        },
        { requireAdmin: () => deps.requireAdminUser(req) }
      );
      if (!result.ok) return res.status(result.status).json({ error: result.code });
      return res.json({ awarded: result.awarded });
    } catch (error: any) {
      console.error('[STICKER_EVALUATE] Failed:', error);
      return res.status(500).json({ error: 'STICKER_EVALUATE_FAILED', message: error.message || String(error) });
    }
  };
}

// ---------------------------------------------------------------------------
// Backfill: missing `sticker_awarded` notifications, all players
// ---------------------------------------------------------------------------

export interface StickerBackfillStore {
  listUserIds(limit: number): Promise<string[]>;
  listStickers(uid: string): Promise<Array<{ id: string; trigger: string; unlockedAt: unknown }>>;
  listNotificationStickerIds(uid: string): Promise<Set<string>>;
  writeNotifications(uid: string, docs: Array<Record<string, any>>): Promise<number>;
}

export interface StickerBackfillResult {
  usersScanned: number;
  stickersChecked: number;
  notificationsWritten: number;
  alreadyHad: number;
}

export async function backfillMissingStickerNotifications(
  store: StickerBackfillStore,
  input: { limit?: number } = {}
): Promise<StickerBackfillResult> {
  const limit = Math.min(Math.max(input.limit ?? 500, 1), 1000);
  const userIds = await store.listUserIds(limit);
  let stickersChecked = 0;
  let notificationsWritten = 0;
  let alreadyHad = 0;

  for (const uid of userIds) {
    const [stickers, notified] = await Promise.all([
      store.listStickers(uid),
      store.listNotificationStickerIds(uid)
    ]);
    stickersChecked += stickers.length;
    const missing = stickers.filter(sticker => !notified.has(sticker.id));
    alreadyHad += stickers.length - missing.length;
    if (missing.length === 0) continue;
    const docs = missing
      .map(sticker => {
        const definition = getStickerById(sticker.id);
        if (!definition) return null;
        return buildStickerAwardedNotification({
          stickerId: sticker.id,
          stickerName: definition.name,
          stickerRarity: definition.rarity ?? null,
          trigger: sticker.trigger,
          // Preserve chronology: the notification sorts under the award.
          createdAt: sticker.unlockedAt ?? FieldValue.serverTimestamp()
        });
      })
      .filter((doc): doc is Record<string, any> => doc !== null);
    if (docs.length > 0) {
      notificationsWritten += await store.writeNotifications(uid, docs);
    }
  }

  return { usersScanned: userIds.length, stickersChecked, notificationsWritten, alreadyHad };
}

/** Admin SDK implementation of `StickerBackfillStore`. Bypasses Firestore rules. */
export function createAdminStickerBackfillStore(db: Firestore): StickerBackfillStore {
  return {
    async listUserIds(limit: number) {
      const refs = await db.collection('users').listDocuments();
      return refs.slice(0, limit).map(ref => ref.id);
    },

    async listStickers(uid: string) {
      const snap = await db.collection('users').doc(uid).collection('stickers').get();
      return snap.docs.map(docSnap => ({
        id: docSnap.id,
        trigger: String(docSnap.data().trigger ?? ''),
        unlockedAt: docSnap.data().unlockedAt ?? null
      }));
    },

    async listNotificationStickerIds(uid: string) {
      const snap = await db.collection('users').doc(uid).collection('notifications').get();
      return new Set(
        snap.docs.map(docSnap => String(docSnap.data().stickerId ?? '')).filter(Boolean)
      );
    },

    async writeNotifications(uid: string, docs: Array<Record<string, any>>) {
      let written = 0;
      for (let i = 0; i < docs.length; i += 400) {
        const chunk = docs.slice(i, i + 400);
        const batch = db.batch();
        for (const docData of chunk) {
          batch.set(db.collection('users').doc(uid).collection('notifications').doc(), docData);
        }
        await batch.commit();
        written += chunk.length;
      }
      return written;
    }
  };
}

export interface StickerBackfillHandlerDeps {
  requireAdminUser: (req: any) => Promise<void>;
  writeAdminAudit: (
    adminId: string,
    targetId: string,
    targetType: string,
    action: string,
    metadata?: Record<string, unknown>
  ) => Promise<void>;
}

/** Returns an Express handler for `POST /api/admin/stickers/backfill-notifications`. */
export function createStickerBackfillHandler(
  getStore: () => StickerBackfillStore | null,
  deps: StickerBackfillHandlerDeps
) {
  return async (req: any, res: any) => {
    const store = getStore();
    if (!store) return res.status(500).json({ error: 'DB_ADMIN_NOT_READY' });
    try {
      await deps.requireAdminUser(req);
    } catch {
      return res.status(403).json({ error: 'ADMIN_ONLY' });
    }
    const adminUid = req.user?.uid;
    if (!adminUid) return res.status(401).json({ error: 'UNAUTHORIZED' });

    try {
      const result = await backfillMissingStickerNotifications(store, { limit: req.body?.limit });
      try {
        await deps.writeAdminAudit(adminUid, 'all', 'user', 'backfill_sticker_notifications', {
          ...result
        });
      } catch (auditError) {
        // Best-effort: the backfill is committed; the audit is a record.
        console.error('[STICKER_BACKFILL] Admin audit failed (backfill already committed):', auditError);
      }
      return res.json(result);
    } catch (error: any) {
      console.error('[STICKER_BACKFILL] Failed:', error);
      return res.status(500).json({ error: 'STICKER_BACKFILL_FAILED', message: error.message || String(error) });
    }
  };
}
