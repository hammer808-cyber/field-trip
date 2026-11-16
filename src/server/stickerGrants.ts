/**
 * Stage 4 — admin sticker grants.
 *
 * `POST /api/admin/stickers/grant` lets an admin award any canonical
 * sticker to any player, with a required human-readable reason. It is the
 * repair path for a missed award (e.g. a weekly-winner sticker lost to a
 * finalize bug) and the out-of-band reward path. Grant-only: there is no
 * revoke in this stage (console delete is the escape hatch; see the design
 * doc §4 for the revoke shape, defined but not built).
 *
 * Same rule as `stickerAwards.ts` / `canonicalStickerAwards.ts`: no award
 * logic inline in `server.ts`. This module is dependency-injected — the
 * grant logic runs against a narrow `StickerGrantStore` interface, so unit
 * tests can run it with an in-memory fake instead of Firestore. `server.ts`
 * wires the real Admin SDK store via `createAdminStickerGrantStore`.
 *
 * Honest limit (design doc §0, audit §3.2): the rules validate the
 * `admin_grant` trigger *string*, not the caller's role, so any player can
 * self-issue a sticker with `trigger: 'admin_grant'` through the client
 * create path today. This stage does NOT close that hole — closing it
 * means moving canonical awards server-side. What this stage does is make
 * a real grant *distinguishable*: a genuine grant has a ledger row
 * (`awardedBy: 'admin'`, `adminUid`, `reason`) plus an `adminLogs` entry;
 * a self-issue has a sticker doc and nothing else.
 *
 * Other deliberate choices (design §9, all approved as recommended):
 * - The grant bypasses the starter gate by design (§9.2); the override is
 *   recorded in the ledger + adminLogs, not hidden.
 * - Reason is required, 1–200 chars (§9.3); a grant without a reason is
 *   unauditable.
 * - Already-owned returns 200 `{ awarded: false, alreadyUnlocked: true }`
 *   (§9.6), same shape as `/api/stickers/award` — idempotent no-op.
 * - Scope is the canonical 42 only (§9.7); the 25 Stage 6 stickers become
 *   grantable automatically when they land in the registry.
 * - No XP, no group evaluation. Canonical awards carry no XP.
 * - No client ledger rows (design §5, option D): the ledger stays the
 *   record of server-side awards only.
 */

import { FieldValue } from 'firebase-admin/firestore';
import type { Firestore } from 'firebase-admin/firestore';
import {
  getStickerById,
  type StickerCollection,
  type StickerDefinition,
  type StickerRarity
} from '../data/stickers';

/** Maximum reason length, in characters (design §1). */
export const MAX_GRANT_REASON_LENGTH = 200;

/** Trigger and source recorded on both the sticker doc and the ledger row. */
export const ADMIN_GRANT_TRIGGER = 'admin_grant';

/** Deterministic ledger id, per FIELDTRIP_GAME_LOGIC.md. */
export function getStickerGrantAwardId(userId: string, stickerId: string): string {
  return `${userId}:${stickerId}`;
}

/** The sticker summary returned to the caller (design §1 response). */
export interface StickerGrantSummary {
  id: string;
  name: string;
  collection: StickerCollection;
  rarity: StickerRarity;
}

export function buildStickerGrantSummary(sticker: StickerDefinition): StickerGrantSummary {
  return {
    id: sticker.id,
    name: sticker.name,
    collection: sticker.collection,
    rarity: sticker.rarity
  };
}

// ---------------------------------------------------------------------------
// Reason validation (pure, unit-tested directly)
// ---------------------------------------------------------------------------

export type GrantReasonValidation =
  | { ok: true; reason: string }
  | { ok: false; code: 'MISSING_REASON' | 'REASON_TOO_LONG' };

export function validateGrantReason(reason: unknown): GrantReasonValidation {
  const trimmed = typeof reason === 'string' ? reason.trim() : '';
  if (trimmed.length === 0) return { ok: false, code: 'MISSING_REASON' };
  if (trimmed.length > MAX_GRANT_REASON_LENGTH) return { ok: false, code: 'REASON_TOO_LONG' };
  return { ok: true, reason: trimmed };
}

// ---------------------------------------------------------------------------
// Store interface + Admin SDK adapter
// ---------------------------------------------------------------------------

export type StickerGrantWriteResult =
  | { applied: true }
  | { applied: false; reason: 'already-unlocked' | 'user-not-found' };

export interface StickerGrantStore {
  /** Null when the user doc does not exist. */
  getUser(uid: string): Promise<{ uid: string } | null>;
  /**
   * Atomically (transaction): re-check the user exists and the sticker is
   * not already owned (sticker doc OR ledger row), then write the sticker
   * doc and the ledger row. The transaction is the already-owned check —
   * there is no separate pre-read, since no user state is consulted
   * without an extra round trip.
   */
  writeGrant(input: {
    targetUid: string;
    stickerId: string;
    adminUid: string;
    reason: string;
  }): Promise<StickerGrantWriteResult>;
}

/** Admin SDK implementation of `StickerGrantStore`. Bypasses Firestore rules. */
export function createAdminStickerGrantStore(db: Firestore): StickerGrantStore {
  return {
    async getUser(uid: string) {
      const snap = await db.collection('users').doc(uid).get();
      return snap.exists ? { uid: snap.id } : null;
    },

    async writeGrant(input: { targetUid: string; stickerId: string; adminUid: string; reason: string }) {
      const { targetUid, stickerId, adminUid, reason } = input;
      const userRef = db.collection('users').doc(targetUid);
      const stickerRef = userRef.collection('stickers').doc(stickerId);
      const ledgerRef = db.collection('stickerAwards').doc(getStickerGrantAwardId(targetUid, stickerId));

      return db.runTransaction(async (tx) => {
        const [userSnap, stickerSnap, ledgerSnap] = await Promise.all([
          tx.get(userRef),
          tx.get(stickerRef),
          tx.get(ledgerRef)
        ]);
        if (!userSnap.exists) return { applied: false, reason: 'user-not-found' } as const;
        if (stickerSnap.exists || ledgerSnap.exists) {
          return { applied: false, reason: 'already-unlocked' } as const;
        }

        tx.set(stickerRef, {
          stickerId,
          unlockedAt: FieldValue.serverTimestamp(),
          source: ADMIN_GRANT_TRIGGER,
          trigger: ADMIN_GRANT_TRIGGER,
          seen: false,
          equipped: false
        });
        tx.set(ledgerRef, {
          awardId: getStickerGrantAwardId(targetUid, stickerId),
          stickerId,
          userId: targetUid,
          trigger: ADMIN_GRANT_TRIGGER,
          source: ADMIN_GRANT_TRIGGER,
          eventId: null,
          awardedAt: FieldValue.serverTimestamp(),
          awardedBy: 'admin',
          adminUid,
          reason
        });
        return { applied: true } as const;
      });
    }
  };
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

export type GrantStickerResult =
  | { ok: true; awarded: true; sticker: StickerGrantSummary; reason: string }
  | { ok: true; awarded: false; alreadyUnlocked: true; sticker: StickerGrantSummary }
  | { ok: false; status: 400; code: 'MISSING_TARGET_UID' | 'UNKNOWN_STICKER_ID' | 'MISSING_REASON' | 'REASON_TOO_LONG' }
  | { ok: false; status: 404; code: 'USER_NOT_FOUND' };

export async function grantStickerServer(
  store: StickerGrantStore,
  input: { adminUid: string; targetUid: string; stickerId: string; reason: unknown }
): Promise<GrantStickerResult> {
  const targetUid = String(input.targetUid ?? '').trim();
  const stickerId = String(input.stickerId ?? '').trim();

  // 1. A target uid is required before anything else can proceed.
  if (!targetUid) {
    return { ok: false, status: 400, code: 'MISSING_TARGET_UID' };
  }

  // 2. Validate the sticker against the registry (canonical 42 only).
  //    No trigger check: the grant *is* the trigger; the sticker's natural
  //    awardTrigger is irrelevant, and no sticker carries admin_grant today.
  const sticker = getStickerById(stickerId);
  if (!sticker) {
    return { ok: false, status: 400, code: 'UNKNOWN_STICKER_ID' };
  }
  const summary = buildStickerGrantSummary(sticker);

  // 3. Target must exist.
  const user = await store.getUser(targetUid);
  if (!user) {
    return { ok: false, status: 404, code: 'USER_NOT_FOUND' };
  }

  // 4. Reason required, 1–200 chars.
  const reasonCheck = validateGrantReason(input.reason);
  if (!reasonCheck.ok) {
    return { ok: false, status: 400, code: reasonCheck.code };
  }

  // 5. Atomic write + ledger row (the transaction re-checks already-owned).
  const written = await store.writeGrant({
    targetUid,
    stickerId,
    adminUid: input.adminUid,
    reason: reasonCheck.reason
  });
  if (!written.applied) {
    if (written.reason === 'user-not-found') {
      return { ok: false, status: 404, code: 'USER_NOT_FOUND' };
    }
    return { ok: true, awarded: false, alreadyUnlocked: true, sticker: summary };
  }

  return { ok: true, awarded: true, sticker: summary, reason: reasonCheck.reason };
}

// ---------------------------------------------------------------------------
// Express handler (thin: auth + rate limiting live in server.ts)
// ---------------------------------------------------------------------------

export interface StickerGrantHandlerDeps {
  requireAdminUser: (req: any) => Promise<void>;
  writeAdminAudit: (
    adminId: string,
    targetId: string,
    targetType: string,
    action: string,
    metadata?: Record<string, unknown>
  ) => Promise<void>;
}

/**
 * Returns an Express handler for `POST /api/admin/stickers/grant`. The
 * target uid comes from the body — an admin acts on *other* players — and
 * the admin check applies even when the target is the caller's own uid.
 * The `adminLogs` write is best-effort after the transaction commits: the
 * ledger row (written atomically with the award) is the source of truth,
 * and failing a completed grant over a logging failure would leave the
 * sticker granted while the client reports failure.
 */
export function createStickerGrantHandler(
  getStore: () => StickerGrantStore | null,
  deps: StickerGrantHandlerDeps
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

    const targetUid = req.body?.targetUid;
    const stickerId = req.body?.stickerId;
    const reason = req.body?.reason;

    try {
      const result = await grantStickerServer(store, { adminUid, targetUid, stickerId, reason });
      if (result.ok) {
        if (result.awarded) {
          try {
            await deps.writeAdminAudit(adminUid, targetUid, 'user', 'grant_sticker', {
              stickerId,
              reason: result.reason
            });
          } catch (auditError) {
            // Best-effort: the grant is committed; the ledger row is the
            // source of truth. Log server-side and still return success.
            console.error('[STICKER_GRANT] Admin audit failed (grant already committed):', auditError);
          }
          return res.json({ awarded: true, sticker: result.sticker, alreadyUnlocked: false });
        }
        return res.json({ awarded: false, alreadyUnlocked: true, sticker: result.sticker });
      }
      return res.status(result.status).json({ error: result.code });
    } catch (error: any) {
      console.error('[STICKER_GRANT] Failed:', error);
      return res.status(500).json({ error: 'STICKER_GRANT_FAILED', message: error.message || String(error) });
    }
  };
}
