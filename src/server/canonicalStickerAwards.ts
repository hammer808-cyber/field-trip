/**
 * Stage 3 — server-side weekly-winner canonical sticker awards.
 *
 * `POST /api/admin/voting/finalize-week` computes weekly winners and awards
 * XP idempotently, but never awarded the two `weekly_winner` stickers
 * (`mascota_confetti_burst`, `mascota_victory_flag`). This module is the
 * only writer for them, wired into both finalize-week paths (plus the
 * already-finalized early return, so a week finalized before Stage 3 ships
 * still gets its stickers on a later re-finalize).
 *
 * Tier rule (design §5): confetti on any weekly win; victory flag on the
 * 3rd cumulative weekly win. No backfill for past weeks (approved §9.7) —
 * only wins finalized after this wiring count.
 *
 * DESIGN GAP FOUND IN IMPLEMENTATION (design §5 as written cannot work):
 * the design counts prior wins from `stickerAwards` ledger rows, but the
 * ledger doc id is `${userId}:${stickerId}` — one row per sticker per user,
 * ever. There can be at most one confetti row, so a row count can never
 * reach 2 and the victory flag could never be awarded. It also cannot tell
 * a re-finalize of an already-counted cycle from a new win, so a plain
 * counter on the user doc would double-count re-finalizes. The fix: one
 * win record per win in `users/{uid}/weeklyWins/{cycleId}` (the cycle id
 * is the doc id, so a re-finalize of the same cycle is a no-op by
 * construction). The win count is the number of win records. The sticker
 * ledger rows stay exactly as designed (one per sticker, deterministic id).
 *
 * Same rule as `stickerAwards.ts`: no award logic inline in `server.ts`.
 * This module is dependency-injected — the award logic runs against a
 * narrow `CanonicalStickerAwardStore` interface, so unit tests can run it
 * with an in-memory fake instead of Firestore. `server.ts` wires the real
 * Admin SDK store via `createAdminCanonicalStickerAwardStore`.
 *
 * The sticker docs match what `firestore.rules` expects and what
 * `normalizeUnlockedSticker` validates, so the client reads them without
 * changes. Admin SDK bypasses rules anyway.
 */

import { FieldValue } from 'firebase-admin/firestore';
import type { DocumentReference, Firestore } from 'firebase-admin/firestore';

export const WEEKLY_WINNER_CONFETTI_STICKER_ID = 'mascota_confetti_burst';
export const WEEKLY_WINNER_VICTORY_FLAG_STICKER_ID = 'mascota_victory_flag';

/** Cumulative wins needed for the victory flag (3rd win — threshold PROV). */
export const VICTORY_FLAG_WIN_THRESHOLD = 3;

/** Deterministic ledger id, per FIELDTRIP_GAME_LOGIC.md. */
export function getWeeklyWinnerAwardId(userId: string, stickerId: string): string {
  return `${userId}:${stickerId}`;
}

export interface WeeklyWinnerInput {
  userId: string;
  entryId: string;
  /** Ballot scope (cycle path) or vote category (legacy summary path). */
  scope: string;
}

export interface CanonicalStickerAwardStore {
  /** Win records for the user — one per counted win; the count is the win count. */
  listWeeklyWins(userId: string): Promise<Array<{ cycleId: string }>>;
  /**
   * Atomically (transaction): record the win (no-op when this cycle was
   * already counted), award the confetti sticker — plus the victory flag
   * when `priorWins` makes this the 3rd cumulative win — and write the
   * ledger rows. A re-finalize of an already-counted cycle awards nothing.
   */
  writeWeeklyWinnerAward(input: {
    userId: string;
    cycleId: string;
    entryId: string;
    scope: string;
    priorWins: number;
  }): Promise<{ awarded: string[] }>;
}

/** Admin SDK implementation of `CanonicalStickerAwardStore`. Bypasses Firestore rules. */
export function createAdminCanonicalStickerAwardStore(db: Firestore): CanonicalStickerAwardStore {
  return {
    async listWeeklyWins(userId: string) {
      const snap = await db.collection('users').doc(userId).collection('weeklyWins').get();
      return snap.docs.map((d) => ({ cycleId: d.id }));
    },

    async writeWeeklyWinnerAward(input: {
      userId: string;
      cycleId: string;
      entryId: string;
      scope: string;
      priorWins: number;
    }) {
      const { userId, cycleId, entryId, scope, priorWins } = input;
      const userRef = db.collection('users').doc(userId);
      const winRef = userRef.collection('weeklyWins').doc(cycleId);
      const confettiRef = userRef.collection('stickers').doc(WEEKLY_WINNER_CONFETTI_STICKER_ID);
      const flagRef = userRef.collection('stickers').doc(WEEKLY_WINNER_VICTORY_FLAG_STICKER_ID);
      const confettiLedgerRef = db
        .collection('stickerAwards')
        .doc(getWeeklyWinnerAwardId(userId, WEEKLY_WINNER_CONFETTI_STICKER_ID));
      const flagLedgerRef = db
        .collection('stickerAwards')
        .doc(getWeeklyWinnerAwardId(userId, WEEKLY_WINNER_VICTORY_FLAG_STICKER_ID));

      return db.runTransaction(async (tx) => {
        const [winSnap, confettiSnap, flagSnap, confettiLedgerSnap, flagLedgerSnap] = await Promise.all([
          tx.get(winRef),
          tx.get(confettiRef),
          tx.get(flagRef),
          tx.get(confettiLedgerRef),
          tx.get(flagLedgerRef)
        ]);

        // This cycle was already counted (re-finalize): nothing to do.
        if (winSnap.exists) return { awarded: [] as string[] };

        const awarded: string[] = [];
        tx.set(winRef, {
          cycleId,
          userId,
          entryId,
          scope,
          wonAt: FieldValue.serverTimestamp()
        });

        const writeSticker = (
          stickerRef: DocumentReference,
          ledgerRef: DocumentReference,
          stickerId: string,
          exists: boolean
        ) => {
          if (exists) return;
          const eventId = stickerId === WEEKLY_WINNER_VICTORY_FLAG_STICKER_ID
            ? `weekly_winner_${cycleId}_${userId}_victory_flag`
            : `weekly_winner_${cycleId}_${userId}`;
          tx.set(stickerRef, {
            stickerId,
            unlockedAt: FieldValue.serverTimestamp(),
            source: `weekly_winner:${cycleId}`,
            trigger: 'weekly_winner',
            seen: false,
            equipped: false
          });
          tx.set(ledgerRef, {
            awardId: getWeeklyWinnerAwardId(userId, stickerId),
            stickerId,
            userId,
            trigger: 'weekly_winner',
            source: `weekly_winner:${cycleId}`,
            eventId,
            awardedAt: FieldValue.serverTimestamp(),
            awardedBy: 'server'
          });
          awarded.push(stickerId);
        };

        writeSticker(confettiRef, confettiLedgerRef, WEEKLY_WINNER_CONFETTI_STICKER_ID, confettiSnap.exists || confettiLedgerSnap.exists);
        if (priorWins >= VICTORY_FLAG_WIN_THRESHOLD - 1) {
          writeSticker(flagRef, flagLedgerRef, WEEKLY_WINNER_VICTORY_FLAG_STICKER_ID, flagSnap.exists || flagLedgerSnap.exists);
        }
        return { awarded };
      });
    }
  };
}

/**
 * Awards the weekly-winner stickers for one finalize run. Winners are
 * deduped by userId first — one user winning two ballots counts as one win.
 * Winners with no userId are skipped.
 */
export async function awardWeeklyWinnerStickers(
  store: CanonicalStickerAwardStore,
  input: { cycleId: string; winners: WeeklyWinnerInput[] }
): Promise<Array<{ userId: string; awarded: string[] }>> {
  const seenUserIds = new Set<string>();
  const distinctWinners = input.winners.filter((winner) => {
    if (!winner.userId || seenUserIds.has(winner.userId)) return false;
    seenUserIds.add(winner.userId);
    return true;
  });

  const results: Array<{ userId: string; awarded: string[] }> = [];
  for (const winner of distinctWinners) {
    const priorWins = (await store.listWeeklyWins(winner.userId)).length;
    const written = await store.writeWeeklyWinnerAward({
      userId: winner.userId,
      cycleId: input.cycleId,
      entryId: winner.entryId,
      scope: winner.scope,
      priorWins
    });
    results.push({ userId: winner.userId, awarded: written.awarded });
  }
  return results;
}
