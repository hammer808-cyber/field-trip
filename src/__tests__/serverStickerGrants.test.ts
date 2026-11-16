import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  ADMIN_GRANT_TRIGGER,
  buildStickerGrantSummary,
  createStickerGrantHandler,
  getStickerGrantAwardId,
  grantStickerServer,
  MAX_GRANT_REASON_LENGTH,
  validateGrantReason,
  type StickerGrantStore,
  type StickerGrantWriteResult
} from '../server/stickerGrants';
import { getStickerById } from '../data/stickers';
import {
  filterGrantPickerStickers,
  getGrantableStickers,
  isValidGrantReason,
  normalizeGrantHistoryEntry,
  sortGrantHistoryDesc,
  type GrantHistoryEntry
} from '../services/stickerAdminService';

const ADMIN_UID = 'admin-uid-1';
const PLAYER_UID = 'player-uid-1';
const STICKER_ID = 'captain_clipboard_checkmark_seal';
const OTHER_STICKER_ID = 'elondra_glam_pose';

/** In-memory fake of the StickerGrantStore, mirroring the Admin SDK adapter. */
class FakeStickerGrantStore implements StickerGrantStore {
  /** uid -> profile (points tracked to prove grants award no XP). */
  users: Record<string, { uid: string; points: number }> = {};
  /** uid -> owned canonical sticker ids. */
  stickers: Record<string, Set<string>> = {};
  /** `${userId}:${stickerId}` -> ledger row. */
  ledger: Record<
    string,
    { userId: string; stickerId: string; awardedBy: string; adminUid: string; reason: string; eventId: string | null }
  > = {};

  seedUser(uid: string, points = 100): void {
    this.users[uid] = { uid, points };
  }

  /** Seed an owned sticker doc without a ledger row. */
  seedSticker(uid: string, stickerId: string): void {
    (this.stickers[uid] ??= new Set()).add(stickerId);
  }

  /** Seed a ledger row without a sticker doc (orphaned-ledger case). */
  seedLedger(uid: string, stickerId: string): void {
    this.ledger[getStickerGrantAwardId(uid, stickerId)] = {
      userId: uid,
      stickerId,
      awardedBy: 'admin',
      adminUid: ADMIN_UID,
      reason: 'seeded',
      eventId: null
    };
  }

  async getUser(uid: string): Promise<{ uid: string } | null> {
    return this.users[uid] ?? null;
  }

  async writeGrant(input: {
    targetUid: string;
    stickerId: string;
    adminUid: string;
    reason: string;
  }): Promise<StickerGrantWriteResult> {
    if (!this.users[input.targetUid]) return { applied: false, reason: 'user-not-found' };
    const owned = this.stickers[input.targetUid] ?? new Set<string>();
    const awardId = getStickerGrantAwardId(input.targetUid, input.stickerId);
    if (owned.has(input.stickerId) || this.ledger[awardId]) {
      return { applied: false, reason: 'already-unlocked' };
    }
    owned.add(input.stickerId);
    this.stickers[input.targetUid] = owned;
    this.ledger[awardId] = {
      userId: input.targetUid,
      stickerId: input.stickerId,
      awardedBy: 'admin',
      adminUid: input.adminUid,
      reason: input.reason,
      eventId: null
    };
    return { applied: true };
  }
}

function makeStoreWithPlayer(): FakeStickerGrantStore {
  const store = new FakeStickerGrantStore();
  store.seedUser(PLAYER_UID);
  return store;
}

// ---------------------------------------------------------------------------
// Reason validation
// ---------------------------------------------------------------------------

test('grant reason: empty, blank, and non-string reasons are missing; 200 chars pass; 201 fail', () => {
  assert.deepEqual(validateGrantReason(''), { ok: false, code: 'MISSING_REASON' });
  assert.deepEqual(validateGrantReason('   '), { ok: false, code: 'MISSING_REASON' });
  assert.deepEqual(validateGrantReason(null), { ok: false, code: 'MISSING_REASON' });
  assert.deepEqual(validateGrantReason(undefined), { ok: false, code: 'MISSING_REASON' });
  assert.deepEqual(validateGrantReason('x'.repeat(MAX_GRANT_REASON_LENGTH)), {
    ok: true,
    reason: 'x'.repeat(MAX_GRANT_REASON_LENGTH)
  });
  assert.deepEqual(validateGrantReason('x'.repeat(MAX_GRANT_REASON_LENGTH + 1)), {
    ok: false,
    code: 'REASON_TOO_LONG'
  });
  assert.deepEqual(validateGrantReason('  padded reason  '), { ok: true, reason: 'padded reason' });
});

// ---------------------------------------------------------------------------
// Orchestrator: validation errors
// ---------------------------------------------------------------------------

test('grant: missing target uid → 400 MISSING_TARGET_UID', async () => {
  const store = makeStoreWithPlayer();
  const result = await grantStickerServer(store, {
    adminUid: ADMIN_UID,
    targetUid: '   ',
    stickerId: STICKER_ID,
    reason: 'repair'
  });
  assert.deepEqual(result, { ok: false, status: 400, code: 'MISSING_TARGET_UID' });
});

test('grant: unknown sticker → 400 UNKNOWN_STICKER_ID', async () => {
  const store = makeStoreWithPlayer();
  const result = await grantStickerServer(store, {
    adminUid: ADMIN_UID,
    targetUid: PLAYER_UID,
    stickerId: 'not_a_sticker',
    reason: 'repair'
  });
  assert.deepEqual(result, { ok: false, status: 400, code: 'UNKNOWN_STICKER_ID' });
});

test('grant: unknown user → 404 USER_NOT_FOUND', async () => {
  const store = new FakeStickerGrantStore();
  const result = await grantStickerServer(store, {
    adminUid: ADMIN_UID,
    targetUid: 'ghost-uid',
    stickerId: STICKER_ID,
    reason: 'repair'
  });
  assert.deepEqual(result, { ok: false, status: 404, code: 'USER_NOT_FOUND' });
});

test('grant: missing, blank, and overlong reasons → 400', async () => {
  const store = makeStoreWithPlayer();
  for (const reason of ['', '   ', null, undefined]) {
    const result = await grantStickerServer(store, {
      adminUid: ADMIN_UID,
      targetUid: PLAYER_UID,
      stickerId: STICKER_ID,
      reason
    });
    assert.deepEqual(result, { ok: false, status: 400, code: 'MISSING_REASON' });
  }
  const longResult = await grantStickerServer(store, {
    adminUid: ADMIN_UID,
    targetUid: PLAYER_UID,
    stickerId: STICKER_ID,
    reason: 'x'.repeat(MAX_GRANT_REASON_LENGTH + 1)
  });
  assert.deepEqual(longResult, { ok: false, status: 400, code: 'REASON_TOO_LONG' });
});

// ---------------------------------------------------------------------------
// Orchestrator: success + idempotency
// ---------------------------------------------------------------------------

test('grant: success writes the sticker doc shape and the ledger row, awards no XP', async () => {
  const store = makeStoreWithPlayer();
  const result = await grantStickerServer(store, {
    adminUid: ADMIN_UID,
    targetUid: PLAYER_UID,
    stickerId: STICKER_ID,
    reason: 'Missed weekly_winner — finalize bug Nov 16'
  });
  assert.equal(result.ok, true);
  if (!result.ok || !result.awarded) assert.fail('expected an awarded result');
  assert.deepEqual(result.sticker, buildStickerGrantSummary(getStickerById(STICKER_ID)!));
  assert.equal(result.reason, 'Missed weekly_winner — finalize bug Nov 16');

  assert.ok(store.stickers[PLAYER_UID]?.has(STICKER_ID));
  const row = store.ledger[getStickerGrantAwardId(PLAYER_UID, STICKER_ID)];
  assert.ok(row);
  assert.equal(row.awardedBy, 'admin');
  assert.equal(row.adminUid, ADMIN_UID);
  assert.equal(row.reason, 'Missed weekly_winner — finalize bug Nov 16');
  assert.equal(row.eventId, null);
  // No XP: the grant awards only the sticker.
  assert.equal(store.users[PLAYER_UID].points, 100);
  assert.equal(Object.keys(store.ledger).length, 1);
});

test('grant: reason is trimmed before it is stored', async () => {
  const store = makeStoreWithPlayer();
  const result = await grantStickerServer(store, {
    adminUid: ADMIN_UID,
    targetUid: PLAYER_UID,
    stickerId: STICKER_ID,
    reason: '  padded reason  '
  });
  assert.equal(result.ok, true);
  assert.equal(store.ledger[getStickerGrantAwardId(PLAYER_UID, STICKER_ID)]?.reason, 'padded reason');
});

test('grant: already-owned via sticker doc → alreadyUnlocked, no second write', async () => {
  const store = makeStoreWithPlayer();
  store.seedSticker(PLAYER_UID, STICKER_ID);
  const result = await grantStickerServer(store, {
    adminUid: ADMIN_UID,
    targetUid: PLAYER_UID,
    stickerId: STICKER_ID,
    reason: 'retry'
  });
  assert.deepEqual(result, {
    ok: true,
    awarded: false,
    alreadyUnlocked: true,
    sticker: buildStickerGrantSummary(getStickerById(STICKER_ID)!)
  });
  assert.equal(Object.keys(store.ledger).length, 0);
});

test('grant: already-owned via ledger row alone → alreadyUnlocked, no second write', async () => {
  const store = makeStoreWithPlayer();
  store.seedLedger(PLAYER_UID, STICKER_ID);
  const result = await grantStickerServer(store, {
    adminUid: ADMIN_UID,
    targetUid: PLAYER_UID,
    stickerId: STICKER_ID,
    reason: 'retry'
  });
  assert.equal(result.ok, true);
  if (!result.ok || result.awarded) assert.fail('expected an already-unlocked result');
  assert.equal(result.alreadyUnlocked, true);
  assert.ok(!store.stickers[PLAYER_UID]?.has(STICKER_ID));
  assert.equal(Object.keys(store.ledger).length, 1);
});

test('grant: a different sticker to the same player still grants (one ledger row per sticker)', async () => {
  const store = makeStoreWithPlayer();
  const first = await grantStickerServer(store, {
    adminUid: ADMIN_UID,
    targetUid: PLAYER_UID,
    stickerId: STICKER_ID,
    reason: 'first'
  });
  const second = await grantStickerServer(store, {
    adminUid: ADMIN_UID,
    targetUid: PLAYER_UID,
    stickerId: OTHER_STICKER_ID,
    reason: 'second'
  });
  assert.equal(first.ok && first.awarded, true);
  assert.equal(second.ok && second.awarded, true);
  assert.equal(Object.keys(store.ledger).length, 2);
});

test('grant: no starter gate — a grant to a fresh player succeeds (admin override)', async () => {
  // The fake store carries no starter state at all; the orchestrator never
  // consults one. A grant to a player with zero progress must succeed.
  const store = makeStoreWithPlayer();
  const result = await grantStickerServer(store, {
    adminUid: ADMIN_UID,
    targetUid: PLAYER_UID,
    stickerId: STICKER_ID,
    reason: 'out-of-band reward'
  });
  assert.equal(result.ok, true);
  if (!result.ok) assert.fail('expected success');
  assert.equal(result.awarded, true);
});

// ---------------------------------------------------------------------------
// Express handler
// ---------------------------------------------------------------------------

function makeRes() {
  return {
    statusCode: 200,
    body: null as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    }
  };
}

function makeAuditRecorder() {
  const calls: Array<{
    adminId: string;
    targetId: string;
    targetType: string;
    action: string;
    metadata?: Record<string, unknown>;
  }> = [];
  return {
    calls,
    async writeAdminAudit(
      adminId: string,
      targetId: string,
      targetType: string,
      action: string,
      metadata: Record<string, unknown> = {}
    ) {
      calls.push({ adminId, targetId, targetType, action, metadata });
    }
  };
}

const allowAdmin = async () => undefined;
const denyAdmin = async () => {
  const error: any = new Error('ADMIN_REQUIRED');
  error.status = 403;
  throw error;
};

test('handler: null store → 500 DB_ADMIN_NOT_READY', async () => {
  const handler = createStickerGrantHandler(() => null, {
    requireAdminUser: allowAdmin,
    writeAdminAudit: makeAuditRecorder().writeAdminAudit
  });
  const res = makeRes();
  await handler({ user: { uid: ADMIN_UID }, body: {} }, res);
  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, { error: 'DB_ADMIN_NOT_READY' });
});

test('handler: non-admin caller → 403 ADMIN_ONLY, even when granting to themselves', async () => {
  const store = makeStoreWithPlayer();
  const handler = createStickerGrantHandler(() => store, {
    requireAdminUser: denyAdmin,
    writeAdminAudit: makeAuditRecorder().writeAdminAudit
  });
  const res = makeRes();
  await handler(
    { user: { uid: PLAYER_UID }, body: { targetUid: PLAYER_UID, stickerId: STICKER_ID, reason: 'self' } },
    res
  );
  assert.equal(res.statusCode, 403);
  assert.deepEqual(res.body, { error: 'ADMIN_ONLY' });
  assert.equal(Object.keys(store.ledger).length, 0);
});

test('handler: admin check passes but no uid on the request → 401 UNAUTHORIZED', async () => {
  const store = makeStoreWithPlayer();
  const handler = createStickerGrantHandler(() => store, {
    requireAdminUser: allowAdmin,
    writeAdminAudit: makeAuditRecorder().writeAdminAudit
  });
  const res = makeRes();
  await handler({ user: undefined, body: { targetUid: PLAYER_UID, stickerId: STICKER_ID, reason: 'x' } }, res);
  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { error: 'UNAUTHORIZED' });
});

test('handler: success returns awarded + sticker summary and writes the admin audit', async () => {
  const store = makeStoreWithPlayer();
  const audit = makeAuditRecorder();
  const handler = createStickerGrantHandler(() => store, {
    requireAdminUser: allowAdmin,
    writeAdminAudit: audit.writeAdminAudit
  });
  const res = makeRes();
  await handler(
    {
      user: { uid: ADMIN_UID },
      body: { targetUid: PLAYER_UID, stickerId: STICKER_ID, reason: 'Compensation for lost sticker after reset' }
    },
    res
  );
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    awarded: true,
    sticker: buildStickerGrantSummary(getStickerById(STICKER_ID)!),
    alreadyUnlocked: false
  });
  assert.equal(audit.calls.length, 1);
  assert.deepEqual(audit.calls[0], {
    adminId: ADMIN_UID,
    targetId: PLAYER_UID,
    targetType: 'user',
    action: 'grant_sticker',
    metadata: { stickerId: STICKER_ID, reason: 'Compensation for lost sticker after reset' }
  });
});

test('handler: already-owned → 200 alreadyUnlocked and no audit write', async () => {
  const store = makeStoreWithPlayer();
  store.seedSticker(PLAYER_UID, STICKER_ID);
  const audit = makeAuditRecorder();
  const handler = createStickerGrantHandler(() => store, {
    requireAdminUser: allowAdmin,
    writeAdminAudit: audit.writeAdminAudit
  });
  const res = makeRes();
  await handler(
    { user: { uid: ADMIN_UID }, body: { targetUid: PLAYER_UID, stickerId: STICKER_ID, reason: 'retry' } },
    res
  );
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    awarded: false,
    alreadyUnlocked: true,
    sticker: buildStickerGrantSummary(getStickerById(STICKER_ID)!)
  });
  assert.equal(audit.calls.length, 0);
});

test('handler: a failing audit write still returns success (best-effort logging)', async () => {
  const store = makeStoreWithPlayer();
  const failingAudit = async () => {
    throw new Error('audit down');
  };
  const handler = createStickerGrantHandler(() => store, {
    requireAdminUser: allowAdmin,
    writeAdminAudit: failingAudit
  });
  const res = makeRes();
  await handler(
    { user: { uid: ADMIN_UID }, body: { targetUid: PLAYER_UID, stickerId: STICKER_ID, reason: 'repair' } },
    res
  );
  assert.equal(res.statusCode, 200);
  assert.equal((res.body as { awarded: boolean }).awarded, true);
  // The grant itself still landed.
  assert.ok(store.stickers[PLAYER_UID]?.has(STICKER_ID));
});

test('handler: orchestrator errors map to their status + code', async () => {
  const store = makeStoreWithPlayer();
  const handler = createStickerGrantHandler(() => store, {
    requireAdminUser: allowAdmin,
    writeAdminAudit: makeAuditRecorder().writeAdminAudit
  });
  const res = makeRes();
  await handler(
    { user: { uid: ADMIN_UID }, body: { targetUid: PLAYER_UID, stickerId: 'nope', reason: 'x' } },
    res
  );
  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { error: 'UNKNOWN_STICKER_ID' });
});

// ---------------------------------------------------------------------------
// Route registration (source-text assertions, repo pattern)
// ---------------------------------------------------------------------------

test('server: grant route is registered with adminRateLimiter + authenticate and the handler deps', () => {
  const serverSource = readFileSync('server.ts', 'utf8');
  assert.match(serverSource, /import \{ createAdminStickerGrantStore, createStickerGrantHandler \} from "\.\/src\/server\/stickerGrants";/);
  const routeStart = serverSource.indexOf('app.post("/api/admin/stickers/grant"');
  assert.notEqual(routeStart, -1);
  const routeLine = serverSource.slice(routeStart, serverSource.indexOf('\n', routeStart));
  assert.match(routeLine, /adminRateLimiter/);
  assert.match(routeLine, /authenticate/);
  assert.match(routeLine, /createStickerGrantHandler/);
  assert.match(routeLine, /createAdminStickerGrantStore\(dbAdmin\)/);
  assert.match(routeLine, /requireAdminUser/);
  assert.match(routeLine, /writeAdminAudit/);
});

test('server: the grant module records the admin_grant trigger and source on both writes', () => {
  const moduleSource = readFileSync('src/server/stickerGrants.ts', 'utf8');
  assert.match(moduleSource, /trigger: ADMIN_GRANT_TRIGGER/);
  assert.match(moduleSource, /source: ADMIN_GRANT_TRIGGER/);
  assert.match(moduleSource, /awardedBy: 'admin'/);
  assert.match(moduleSource, /eventId: null/);
});

// ---------------------------------------------------------------------------
// Client service: pure helpers
// ---------------------------------------------------------------------------

test('client: grant reason check matches the server limits (1–200 chars)', () => {
  assert.equal(isValidGrantReason(''), false);
  assert.equal(isValidGrantReason('   '), false);
  assert.equal(isValidGrantReason('ok'), true);
  assert.equal(isValidGrantReason('x'.repeat(MAX_GRANT_REASON_LENGTH)), true);
  assert.equal(isValidGrantReason('x'.repeat(MAX_GRANT_REASON_LENGTH + 1)), false);
});

test('client: the client and server reason limits agree', () => {
  const serviceSource = readFileSync('src/services/stickerAdminService.ts', 'utf8');
  const serverSource = readFileSync('src/server/stickerGrants.ts', 'utf8');
  const clientLimit = serviceSource.match(/export const MAX_GRANT_REASON_LENGTH = (\d+);/)?.[1];
  const serverLimit = serverSource.match(/export const MAX_GRANT_REASON_LENGTH = (\d+);/)?.[1];
  assert.ok(clientLimit, 'client limit not found');
  assert.ok(serverLimit, 'server limit not found');
  assert.equal(clientLimit, serverLimit);
});

test('client: grantable catalog is the canonical 42', () => {
  assert.equal(getGrantableStickers().length, 42);
});

test('client: picker filter matches by name or id, case-insensitive; empty query returns all', () => {
  const all = getGrantableStickers();
  assert.equal(filterGrantPickerStickers(all, '').length, 42);
  const byName = filterGrantPickerStickers(all, 'clipboard');
  assert.ok(byName.length > 0);
  assert.ok(byName.every((s) => s.name.toLowerCase().includes('clipboard') || s.id.includes('clipboard')));
  const byId = filterGrantPickerStickers(all, 'mascota_foam_finger');
  assert.deepEqual(byId.map((s) => s.id), ['mascota_foam_finger']);
  const upper = filterGrantPickerStickers(all, 'ELONDRA');
  assert.ok(upper.length > 0);
  assert.ok(upper.every((s) => s.name.toLowerCase().includes('elondra') || s.id.includes('elondra')));
  assert.deepEqual(filterGrantPickerStickers(all, 'zzz-no-match'), []);
});

test('client: grant history rows normalize timestamps and missing fields', () => {
  const at = new Date('2026-11-16T10:00:00.000Z');
  const withTimestamp = normalizeGrantHistoryEntry('log-1', {
    adminId: ADMIN_UID,
    targetId: PLAYER_UID,
    stickerId: STICKER_ID,
    reason: 'repair',
    createdAt: { toDate: () => at }
  });
  assert.deepEqual(withTimestamp, {
    id: 'log-1',
    adminId: ADMIN_UID,
    targetId: PLAYER_UID,
    stickerId: STICKER_ID,
    reason: 'repair',
    createdAt: at
  });

  const withIso = normalizeGrantHistoryEntry('log-2', {
    adminId: ADMIN_UID,
    targetId: PLAYER_UID,
    stickerId: STICKER_ID,
    reason: 'repair',
    createdAt: '2026-11-16T10:00:00.000Z'
  });
  assert.equal(withIso.createdAt?.getTime(), at.getTime());

  const missing = normalizeGrantHistoryEntry('log-3', {});
  assert.deepEqual(missing, {
    id: 'log-3',
    adminId: '',
    targetId: '',
    stickerId: '',
    reason: '',
    createdAt: null
  });
});

test('client: grant history sorts newest first, timestamp-less rows last', () => {
  const entries: GrantHistoryEntry[] = [
    { id: 'a', adminId: '', targetId: '', stickerId: '', reason: '', createdAt: new Date('2026-11-14T00:00:00Z') },
    { id: 'b', adminId: '', targetId: '', stickerId: '', reason: '', createdAt: null },
    { id: 'c', adminId: '', targetId: '', stickerId: '', reason: '', createdAt: new Date('2026-11-16T00:00:00Z') },
    { id: 'd', adminId: '', targetId: '', stickerId: '', reason: '', createdAt: new Date('2026-11-15T00:00:00Z') }
  ];
  assert.deepEqual(sortGrantHistoryDesc(entries).map((e) => e.id), ['c', 'd', 'a', 'b']);
});

// ---------------------------------------------------------------------------
// Admin UI (source-text assertions — the repo tests pages this way)
// ---------------------------------------------------------------------------

test('admin UI: picker disables owned stickers with an Owned badge and blocks empty reasons', () => {
  const pageSource = readFileSync('src/pages/AdminUsers.tsx', 'utf8');
  assert.match(pageSource, /disabled=\{isOwned\}/);
  assert.match(pageSource, /Owned/);
  assert.match(pageSource, /disabled=\{!isValidGrantReason\(reason\)\}/);
  assert.match(pageSource, /maxLength=\{MAX_GRANT_REASON_LENGTH\}/);
  assert.match(pageSource, /Confirm grant/);
  assert.match(pageSource, /Legendary — only 3 exist/);
});

test('admin UI: lookup, grant, and history go through the service layer; history reads adminLogs, not the ledger', () => {
  const pageSource = readFileSync('src/pages/AdminUsers.tsx', 'utf8');
  assert.match(pageSource, /lookupPlayers\(query\)/);
  assert.match(pageSource, /getGrantHistory\(50\)/);
  assert.match(pageSource, /grantSticker\(\{/);
  assert.match(pageSource, /getUserUnlockedStickers\(player\.uid\)/);
  assert.doesNotMatch(pageSource, /stickerAwards/);
  const serviceSource = readFileSync('src/services/stickerAdminService.ts', 'utf8');
  assert.match(serviceSource, /where\('action', '==', 'grant_sticker'\)/);
  assert.match(serviceSource, /authenticatedFetch\('\/api\/admin\/stickers\/grant'/);
  assert.match(serviceSource, /authenticatedFetch\(`\/api\/admin\/user-lookup\?q=/);
});
