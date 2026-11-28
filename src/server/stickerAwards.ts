/**
 * Server-side legacy (discovery) sticker awards — Option A.
 *
 * Legacy page-visit / discovery stickers used to be awarded client-side:
 * `discoveryService.awardDiscoverySticker` wrote the legacy fields on
 * `users/{uid}` (`discoveryEvents`, `stickerUnlockHistory`, `earnedStickers`,
 * `unlockedRewards.stickers`, `completedDiscoveryGroups`) with a plain
 * client `updateDoc`. Any owner could self-grant from the browser console,
 * which is the spoof hole the held `firestore.rules` branch
 * (feature/stage2-legacy-spoof-hole) closes. This module is the only writer
 * once that branch ships: the client calls `POST /api/stickers/award` and
 * the Admin SDK (which bypasses rules) performs the write.
 *
 * Honest limit (design doc §2): for page-view triggers the server cannot
 * independently verify the event happened — it can only trust the client's
 * claim. The endpoint buys write-path control, a server-side allowlist,
 * already-earned + starter-gate checks against fresh reads, atomic writes,
 * and a `stickerAwards` ledger row. Triggers backed by server-visible state
 * (entries / votes / proofReviews) ARE verified; the rest are accepted as
 * client claims and recorded as such (`verifiedBy: 'client-claim'`).
 *
 * This module is deliberately dependency-injected: the award logic runs
 * against a narrow `StickerAwardStore` interface, so unit tests can run it
 * with an in-memory fake instead of Firestore. `server.ts` wires the real
 * Admin SDK store via `createAdminStickerAwardStore`.
 */

import { FieldValue } from 'firebase-admin/firestore';
import type { Firestore } from 'firebase-admin/firestore';
import { DISCOVERY_STICKERS, type DiscoverySticker } from '../constants/discoveryStickers';
import { buildCanonicalStarterDeckState } from '../logic/starterDeckState';
import { normalizeEntryStatus } from '../logic/entryLogic';

// ---------------------------------------------------------------------------
// Allowlist + starter gate
// ---------------------------------------------------------------------------

/**
 * Server-side copy of the live legacy keys (the old client `PHASE_1_KEYS`).
 * Anything not in this list is rejected with 400 — including the 16 defined
 * but never-awarded legacy stickers and the dead `tribunal_view` key.
 */
export const SERVER_DISCOVERY_ALLOWLIST = [
  'camera_ready',
  'first_field_note',
  'starter_signal_1',
  'starter_signal_3_complete',
  'dex_discovered',
  'first_vote',
  'proof_returned',
  'receipt_approved',
  'crew_unlocked',
  'memories_unlocked',
  'dex_open',
  'sticker_collection_view',
  'locked_sticker_tap',
  'mission_draw',
  'capture_start',
  'proof_pirate',
  'evidence_meter_bonus_seen',
] as const;

export type DiscoveryAwardKey = (typeof SERVER_DISCOVERY_ALLOWLIST)[number];

/**
 * Keys whose awards are HELD until the starter is done (1 starter
 * mission approved). The four camera/note keys were already held
 * client-side; the five pre-starter-firing keys are held here too, so the
 * "View in Dex" modal can never point a fresh player at the locked Dex.
 */
export const STARTER_GATED_DISCOVERY_KEYS = [
  'camera_ready',
  'capture_start',
  'first_field_note',
  'proof_returned',
  'proof_pirate',
  'mission_draw',
  'evidence_meter_bonus_seen',
  'starter_signal_1',
  'receipt_approved',
] as const;

export function isAllowedDiscoveryKey(key: string): key is DiscoveryAwardKey {
  return (SERVER_DISCOVERY_ALLOWLIST as readonly string[]).includes(key);
}

export function isStarterGatedDiscoveryKey(key: string): boolean {
  return (STARTER_GATED_DISCOVERY_KEYS as readonly string[]).includes(key);
}

export function resolveDiscoverySticker(discoveryKey: string): DiscoverySticker | null {
  if (!isAllowedDiscoveryKey(discoveryKey)) return null;
  return DISCOVERY_STICKERS.find((s) => s.discoveryKey === discoveryKey) ?? null;
}

// ---------------------------------------------------------------------------
// Discovery groups (mirrors the old client-side group completion)
// ---------------------------------------------------------------------------

export interface DiscoveryGroup {
  id: string;
  name: string;
  stickerIds: string[];
  xpReward: number;
  completionCopy: string;
}

export const DISCOVERY_GROUPS: DiscoveryGroup[] = [
  {
    id: 'dex-discovery',
    name: 'Dex Discovery',
    stickerIds: ['first-flip', 'binder-goblin', 'empty-slot-syndrome'],
    xpReward: 50,
    completionCopy: 'Dex Discovery Set complete! +50 XP',
  },
  {
    id: 'mission-basics',
    name: 'Mission Basics',
    stickerIds: ['first-draw', 'camera-ready', 'proof-pirate', 'signal-fragment-missing'],
    xpReward: 50,
    completionCopy: 'Mission Basics Set complete! +50 XP',
  },
];

/** Deterministic ledger id, per FIELDTRIP_GAME_LOGIC.md. */
export function getDiscoveryStickerAwardId(userId: string, stickerId: string): string {
  return `${userId}:${stickerId}`;
}

// ---------------------------------------------------------------------------
// Pure helpers (unit-tested directly)
// ---------------------------------------------------------------------------

export interface StickerAwardUserState {
  discoveryEvents?: Record<string, boolean>;
  unlockedRewards?: { stickers?: string[] };
  earnedStickers?: Array<{ id: string }>;
  completedDiscoveryGroups?: string[];
  points?: number;
  // Profile mirrors used as a fallback for starter completion (same as the
  // client-side canonical starter state).
  completedChallengeIds?: string[];
  approvedCompletedChallengeIds?: string[];
  completedMissionIds?: string[];
  [key: string]: unknown;
}

export function hasAlreadyUnlockedSticker(
  user: StickerAwardUserState | null | undefined,
  discoveryKey: string,
  stickerId: string,
): boolean {
  if (!user) return false;
  if (user.discoveryEvents?.[discoveryKey]) return true;
  if (user.unlockedRewards?.stickers?.includes(stickerId)) return true;
  if (user.earnedStickers?.some((record) => record.id === stickerId)) return true;
  return false;
}

/**
 * Groups that become complete once `stickerId` joins the user's earned set.
 * Pure: given the user's current state, returns only newly completed groups.
 */
export function evaluateDiscoveryGroups(
  user: StickerAwardUserState | null | undefined,
  stickerId: string,
): DiscoveryGroup[] {
  const owned = new Set<string>(user?.unlockedRewards?.stickers ?? []);
  owned.add(stickerId);
  const alreadyCompleted = new Set<string>(user?.completedDiscoveryGroups ?? []);
  return DISCOVERY_GROUPS.filter(
    (group) => !alreadyCompleted.has(group.id) && group.stickerIds.every((id) => owned.has(id)),
  );
}

/**
 * Builds the `earnedStickers` record exactly as the old client writer did:
 * the canonical definition spread when one exists, otherwise the
 * DISCOVERY_STICKERS metadata. The canonical definitions for legacy ids
 * carry the same title/description/trigger as the discovery metadata, so
 * this construction is identical for all 17 keys.
 */
export function buildDiscoveryStructuredSticker(
  sticker: DiscoverySticker,
  discoveryKey: string,
  sourcePage: string,
  earnedAtIso: string,
): Record<string, unknown> {
  return {
    id: sticker.id,
    title: sticker.name,
    description: sticker.description,
    trigger: discoveryKey,
    earnedAt: earnedAtIso,
    source: sourcePage,
    seen: false,
  };
}

// ---------------------------------------------------------------------------
// Store interface + Admin SDK adapter
// ---------------------------------------------------------------------------

export interface StickerAwardEntryLike {
  id: string;
  userId?: string;
  uid?: string;
  missionId?: string;
  challengeId?: string;
  tripId?: string;
  deckId?: string;
  status?: string;
  archived?: boolean;
  fieldNote?: string;
  note?: string;
  caption?: string;
  photoUrl?: string;
  imageUrl?: string;
  proofImage?: string;
  [key: string]: unknown;
}

export interface StickerAwardWriteInput {
  uid: string;
  sticker: DiscoverySticker;
  discoveryKey: string;
  sourcePage: string;
  eventId?: string;
  completedGroups: DiscoveryGroup[];
  verifiedBy: 'server-state' | 'client-claim';
}

export type StickerAwardWriteResult =
  | { applied: true }
  | { applied: false; reason: 'already-unlocked' | 'user-not-found' };

export interface StickerAwardStore {
  getUser(uid: string): Promise<StickerAwardUserState | null>;
  /** Most recent entries for the user, newest first. */
  listUserEntries(uid: string, limit?: number): Promise<StickerAwardEntryLike[]>;
  /** True when the user has cast at least one weekly vote. */
  hasCastVote(uid: string): Promise<boolean>;
  /** True when a proof of the user was returned for more evidence. */
  hasNeedsMoreProofReview(uid: string): Promise<boolean>;
  /**
   * Atomically (transaction): re-check already-earned + ledger, then write
   * the legacy fields and the ledger row. Must return already-unlocked when
   * a concurrent award landed first.
   */
  writeAward(input: StickerAwardWriteInput): Promise<StickerAwardWriteResult>;
}

function entryHasNote(entry: StickerAwardEntryLike): boolean {
  return String(entry.fieldNote ?? entry.note ?? entry.caption ?? '').trim().length > 0;
}

function entryHasPhoto(entry: StickerAwardEntryLike): boolean {
  return Boolean(entry.photoUrl || entry.imageUrl || entry.proofImage);
}

/** Admin SDK implementation of `StickerAwardStore`. Bypasses Firestore rules. */
export function createAdminStickerAwardStore(db: Firestore): StickerAwardStore {
  return {
    async getUser(uid: string) {
      const snap = await db.collection('users').doc(uid).get();
      return snap.exists ? (snap.data() as StickerAwardUserState) : null;
    },

    async listUserEntries(uid: string, limit = 100) {
      // Entries are written with `userId` by the current pipeline; older
      // entries may carry `uid` instead. Prefer userId, fall back to uid.
      const byUserId = await db.collection('entries').where('userId', '==', uid).limit(limit).get();
      const entries = byUserId.docs.map((d) => ({ id: d.id, ...d.data() }) as StickerAwardEntryLike);
      if (entries.length > 0) return entries;
      const byUid = await db.collection('entries').where('uid', '==', uid).limit(limit).get();
      return byUid.docs.map((d) => ({ id: d.id, ...d.data() }) as StickerAwardEntryLike);
    },

    async hasCastVote(uid: string) {
      // Votes live under votingCycles/{cycle}/ballots/{ballot}/votes/{uid}.
      const snap = await db.collectionGroup('votes').where('voterId', '==', uid).limit(1).get();
      return !snap.empty;
    },

    async hasNeedsMoreProofReview(uid: string) {
      const reviews = await db.collection('proofReviews').where('userId', '==', uid).limit(25).get();
      if (reviews.docs.some((d) => d.data()?.status === 'needs_more_proof')) return true;
      // Fallback: the linked entry carries the same decision.
      const entries = await db.collection('entries').where('userId', '==', uid).limit(25).get();
      return entries.docs.some((d) => normalizeEntryStatus(d.data()?.status) === 'needs_more_proof');
    },

    async writeAward(input: StickerAwardWriteInput) {
      const { uid, sticker, discoveryKey, sourcePage, eventId, completedGroups, verifiedBy } = input;
      const userRef = db.collection('users').doc(uid);
      const awardId = getDiscoveryStickerAwardId(uid, sticker.id);
      const ledgerRef = db.collection('stickerAwards').doc(awardId);
      const nowIso = new Date().toISOString();

      return db.runTransaction(async (tx) => {
        const [userSnap, ledgerSnap] = await Promise.all([tx.get(userRef), tx.get(ledgerRef)]);
        if (!userSnap.exists) return { applied: false, reason: 'user-not-found' } as const;
        const live = userSnap.data() as StickerAwardUserState;
        if (ledgerSnap.exists || hasAlreadyUnlockedSticker(live, discoveryKey, sticker.id)) {
          return { applied: false, reason: 'already-unlocked' } as const;
        }

        const historyEntry = {
          stickerId: sticker.id,
          discoveryKey,
          unlockedAt: nowIso,
          sourcePage,
        };
        const updates: Record<string, unknown> = {
          [`discoveryEvents.${discoveryKey}`]: true,
          stickerUnlockHistory: FieldValue.arrayUnion(historyEntry),
          earnedStickers: FieldValue.arrayUnion(
            buildDiscoveryStructuredSticker(sticker, discoveryKey, sourcePage, nowIso),
          ),
          'unlockedRewards.stickers': FieldValue.arrayUnion(sticker.id),
          updatedAt: FieldValue.serverTimestamp(),
        };
        if (completedGroups.length > 0) {
          updates.completedDiscoveryGroups = FieldValue.arrayUnion(
            ...completedGroups.map((group) => group.id),
          );
          updates.points = FieldValue.increment(
            completedGroups.reduce((sum, group) => sum + group.xpReward, 0),
          );
        }
        tx.update(userRef, updates);
        tx.set(ledgerRef, {
          awardId,
          stickerId: sticker.id,
          userId: uid,
          trigger: discoveryKey,
          source: sourcePage,
          eventId: eventId ?? null,
          awardedAt: FieldValue.serverTimestamp(),
          awardedBy: 'server',
          verifiedBy,
        });
        // Nov 17, 2026: a sticker award also writes a notification doc in
        // this same transaction, so the award survives the toast — the new
        // Basecamp Notifications section lists it, tappable to the Dex
        // stickers tab. Same collection and read flag as the Q11 decision
        // notifications; the client read maps type 'sticker_awarded'.
        tx.set(db.collection('users').doc(uid).collection('notifications').doc(), {
          type: 'sticker_awarded',
          stickerId: sticker.id,
          stickerName: sticker.name,
          stickerRarity: sticker.rarity ?? null,
          discoveryKey,
          read: false,
          createdAt: FieldValue.serverTimestamp(),
        });
        return { applied: true } as const;
      });
    },
  };
}

// ---------------------------------------------------------------------------
// Trigger verification
// ---------------------------------------------------------------------------

export type StickerAwardVerifiedBy = 'server-state' | 'client-claim';

interface VerificationContext {
  entries: StickerAwardEntryLike[] | null;
  starterState: ReturnType<typeof buildCanonicalStarterDeckState> | null;
}

async function ensureEntries(
  store: StickerAwardStore,
  uid: string,
  ctx: VerificationContext,
): Promise<StickerAwardEntryLike[]> {
  if (!ctx.entries) ctx.entries = await store.listUserEntries(uid, 100);
  return ctx.entries;
}

async function ensureStarterState(
  store: StickerAwardStore,
  uid: string,
  user: StickerAwardUserState,
  ctx: VerificationContext,
): Promise<ReturnType<typeof buildCanonicalStarterDeckState>> {
  if (!ctx.starterState) {
    const entries = await ensureEntries(store, uid, ctx);
    ctx.starterState = buildCanonicalStarterDeckState({ userId: uid, entries, profile: user });
  }
  return ctx.starterState;
}

/**
 * Verifies the claimed trigger against server-visible state where possible.
 * Returns `verified: false` only for triggers the server can check and that
 * fail the check. Page-view / client-only triggers, and note triggers whose
 * entry has not landed yet (the client fires `first_field_note` before the
 * entry write completes), are accepted as client claims — the endpoint still
 * buys the allowlist, starter gate, idempotency, atomicity, and ledger.
 */
async function verifyDiscoveryTrigger(
  store: StickerAwardStore,
  uid: string,
  discoveryKey: string,
  user: StickerAwardUserState,
  ctx: VerificationContext,
): Promise<{ verified: boolean; verifiedBy: StickerAwardVerifiedBy }> {
  switch (discoveryKey) {
    case 'starter_signal_1': {
      const state = await ensureStarterState(store, uid, user, ctx);
      return { verified: state.starterApprovedCount >= 1, verifiedBy: 'server-state' };
    }
    case 'receipt_approved': {
      const entries = await ensureEntries(store, uid, ctx);
      return {
        verified: entries.some((e) => normalizeEntryStatus(e.status) === 'approved'),
        verifiedBy: 'server-state',
      };
    }
    case 'starter_signal_3_complete':
    case 'crew_unlocked':
    case 'memories_unlocked': {
      const state = await ensureStarterState(store, uid, user, ctx);
      return { verified: state.starterComplete, verifiedBy: 'server-state' };
    }
    case 'first_vote':
    case 'weekly_vote_cast': {
      return { verified: await store.hasCastVote(uid), verifiedBy: 'server-state' };
    }
    case 'proof_returned': {
      return { verified: await store.hasNeedsMoreProofReview(uid), verifiedBy: 'server-state' };
    }
    case 'first_field_note':
    case 'proof_pirate':
    case 'evidence_meter_bonus_seen': {
      const entries = await ensureEntries(store, uid, ctx);
      const needsPhoto = discoveryKey !== 'first_field_note';
      const found = entries.some((e) => entryHasNote(e) && (!needsPhoto || entryHasPhoto(e)));
      // Partially verifiable: if the entry is visible, the claim is proven;
      // if not, the award call may have raced the entry write, so accept
      // the claim rather than silently dropping a legitimate first award.
      return { verified: true, verifiedBy: found ? 'server-state' : 'client-claim' };
    }
    default:
      // camera_ready, capture_start, mission_draw, dex_*,
      // sticker_collection_view, locked_sticker_tap: client-only events.
      return { verified: true, verifiedBy: 'client-claim' };
  }
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

export type AwardDiscoveryStickerResult =
  | {
      ok: true;
      awarded: true;
      sticker: DiscoverySticker;
      completedGroups: DiscoveryGroup[];
      verifiedBy: StickerAwardVerifiedBy;
    }
  | { ok: true; awarded: false; alreadyUnlocked: true; sticker: DiscoverySticker }
  | { ok: false; status: 400; code: 'UNKNOWN_DISCOVERY_KEY'; discoveryKey: string }
  | { ok: false; status: 404; code: 'USER_NOT_FOUND' }
  | { ok: false; status: 409; code: 'STARTER_INCOMPLETE'; held: true; discoveryKey: string }
  | { ok: false; status: 422; code: 'TRIGGER_NOT_VERIFIED'; discoveryKey: string };

export async function awardDiscoveryStickerServer(
  store: StickerAwardStore,
  input: { uid: string; discoveryKey: string; sourcePage?: string; eventId?: string },
): Promise<AwardDiscoveryStickerResult> {
  const { uid, discoveryKey } = input;
  const sourcePage = input.sourcePage || 'unknown';

  // 1. Allowlist.
  const sticker = resolveDiscoverySticker(discoveryKey);
  if (!sticker) {
    return { ok: false, status: 400, code: 'UNKNOWN_DISCOVERY_KEY', discoveryKey };
  }

  // 2. User must exist.
  const user = await store.getUser(uid);
  if (!user) {
    return { ok: false, status: 404, code: 'USER_NOT_FOUND' };
  }

  const ctx: VerificationContext = { entries: null, starterState: null };

  // 3. Starter gate, enforced server-side (one place, not per call site).
  if (isStarterGatedDiscoveryKey(discoveryKey)) {
    const state = await ensureStarterState(store, uid, user, ctx);
    if (!state.starterComplete) {
      return { ok: false, status: 409, code: 'STARTER_INCOMPLETE', held: true, discoveryKey };
    }
  }

  // 4. Trigger verification where server-visible state exists.
  const verification = await verifyDiscoveryTrigger(store, uid, discoveryKey, user, ctx);
  if (!verification.verified) {
    return { ok: false, status: 422, code: 'TRIGGER_NOT_VERIFIED', discoveryKey };
  }

  // 5. Already-earned fast path (the transaction re-checks atomically).
  if (hasAlreadyUnlockedSticker(user, discoveryKey, sticker.id)) {
    return { ok: true, awarded: false, alreadyUnlocked: true, sticker };
  }

  // 6. Group completion, then the atomic write + ledger row.
  const completedGroups = evaluateDiscoveryGroups(user, sticker.id);
  const written = await store.writeAward({
    uid,
    sticker,
    discoveryKey,
    sourcePage,
    eventId: input.eventId,
    completedGroups,
    verifiedBy: verification.verifiedBy,
  });
  if (!written.applied) {
    if (written.reason === 'user-not-found') {
      return { ok: false, status: 404, code: 'USER_NOT_FOUND' };
    }
    return { ok: true, awarded: false, alreadyUnlocked: true, sticker };
  }

  return { ok: true, awarded: true, sticker, completedGroups, verifiedBy: verification.verifiedBy };
}

// ---------------------------------------------------------------------------
// Express handler (thin: auth + rate limiting live in server.ts)
// ---------------------------------------------------------------------------

/**
 * Returns an Express handler for `POST /api/stickers/award`. The uid always
 * comes from `req.user.uid` (set by `authenticate`) — never from the body —
 * so a caller can only ever award stickers to themselves.
 */
export function createStickerAwardHandler(getStore: () => StickerAwardStore | null) {
  return async (req: any, res: any) => {
    const store = getStore();
    if (!store) return res.status(500).json({ error: 'DB_ADMIN_NOT_READY' });
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: 'UNAUTHORIZED' });
    const discoveryKey = String(req.body?.discoveryKey ?? '').trim();
    const sourcePage = String(req.body?.sourcePage ?? 'unknown');
    const eventId = typeof req.body?.eventId === 'string' ? req.body.eventId : undefined;

    try {
      const result = await awardDiscoveryStickerServer(store, { uid, discoveryKey, sourcePage, eventId });
      if (result.ok) {
        if (result.awarded) {
          return res.json({
            awarded: true,
            sticker: result.sticker,
            completedGroups: result.completedGroups,
            verifiedBy: result.verifiedBy,
          });
        }
        return res.json({ awarded: false, alreadyUnlocked: true, sticker: result.sticker });
      }
      const body: Record<string, unknown> = { error: result.code, discoveryKey };
      if ('held' in result && result.held) body.held = true;
      return res.status(result.status).json(body);
    } catch (error: any) {
      console.error('[STICKER_AWARD] Failed:', error);
      return res.status(500).json({ error: 'STICKER_AWARD_FAILED', message: error.message || String(error) });
    }
  };
}
