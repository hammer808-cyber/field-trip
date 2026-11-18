import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { DISCOVERY_STICKERS } from '../constants/discoveryStickers';
import {
  DISCOVERY_GROUPS,
  SERVER_DISCOVERY_ALLOWLIST,
  STARTER_GATED_DISCOVERY_KEYS,
  awardDiscoveryStickerServer,
  createAdminStickerAwardStore,
  createStickerAwardHandler,
  evaluateDiscoveryGroups,
  getDiscoveryStickerAwardId,
  hasAlreadyUnlockedSticker,
  resolveDiscoverySticker,
  type StickerAwardEntryLike,
  type StickerAwardStore,
  type StickerAwardUserState,
  type StickerAwardWriteInput,
  type StickerAwardWriteResult,
} from '../server/stickerAwards';

const UID = 'user-1';

const EXPECTED_ALLOWLIST = [
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
];

const EXPECTED_GATED_KEYS = [
  'camera_ready',
  'capture_start',
  'first_field_note',
  'proof_returned',
  'proof_pirate',
  'mission_draw',
  'evidence_meter_bonus_seen',
  'starter_signal_1',
  'receipt_approved',
];

function baseUser(overrides: Partial<StickerAwardUserState> = {}): StickerAwardUserState {
  return { discoveryEvents: {}, unlockedRewards: { stickers: [] }, earnedStickers: [], ...overrides };
}

/** Starter-complete via profile mirrors (no entries needed). */
function starterCompleteUser(overrides: Partial<StickerAwardUserState> = {}): StickerAwardUserState {
  return baseUser({
    completedChallengeIds: ['starter-1', 'starter-2', 'starter-3'],
    approvedCompletedChallengeIds: ['starter-1', 'starter-2', 'starter-3'],
    ...overrides,
  });
}

function approvedEntry(id: string, tripId = 'starter-1'): StickerAwardEntryLike {
  return { id, userId: UID, status: 'approved', tripId };
}

function notedEntry(id: string): StickerAwardEntryLike {
  // Non-starter trip: a pending starter-1 entry would outrank the profile
  // mirrors in buildCanonicalStarterDeckState and mark the starter incomplete.
  return { id, userId: UID, status: 'pending_review', tripId: 'heatwave-1', fieldNote: 'cool spot', photoUrl: 'https://example.com/p.jpg' };
}

/** In-memory fake of the StickerAwardStore, mirroring the Admin SDK adapter. */
class FakeStore implements StickerAwardStore {
  user: StickerAwardUserState | null;
  entries: StickerAwardEntryLike[];
  votedUids: string[];
  needsMoreProof: boolean;
  writeCalls: StickerAwardWriteInput[] = [];
  ledger: Record<string, Record<string, unknown>> = {};

  constructor(opts: {
    user?: StickerAwardUserState | null;
    entries?: StickerAwardEntryLike[];
    votedUids?: string[];
    needsMoreProof?: boolean;
    ledgerSeed?: Record<string, Record<string, unknown>>;
  } = {}) {
    this.user = opts.user === undefined ? baseUser() : opts.user;
    this.entries = opts.entries ?? [];
    this.votedUids = opts.votedUids ?? [];
    this.needsMoreProof = opts.needsMoreProof ?? false;
    this.ledger = opts.ledgerSeed ?? {};
  }

  async getUser(_uid: string) {
    return this.user;
  }

  async listUserEntries(_uid: string, limit = 100) {
    return this.entries.slice(0, limit);
  }

  async hasCastVote(uid: string) {
    return this.votedUids.includes(uid);
  }

  async hasNeedsMoreProofReview(_uid: string) {
    return this.needsMoreProof;
  }

  async writeAward(input: StickerAwardWriteInput): Promise<StickerAwardWriteResult> {
    this.writeCalls.push(input);
    const awardId = getDiscoveryStickerAwardId(input.uid, input.sticker.id);
    if (this.ledger[awardId] || hasAlreadyUnlockedSticker(this.user, input.discoveryKey, input.sticker.id)) {
      return { applied: false, reason: 'already-unlocked' };
    }
    const user = this.user!;
    user.discoveryEvents = { ...(user.discoveryEvents ?? {}), [input.discoveryKey]: true };
    user.unlockedRewards = { stickers: [...(user.unlockedRewards?.stickers ?? []), input.sticker.id] };
    user.earnedStickers = [...(user.earnedStickers ?? []), { id: input.sticker.id }];
    if (input.completedGroups.length > 0) {
      user.completedDiscoveryGroups = [
        ...(user.completedDiscoveryGroups ?? []),
        ...input.completedGroups.map((g) => g.id),
      ];
      user.points = (user.points ?? 0) + input.completedGroups.reduce((sum, g) => sum + g.xpReward, 0);
    }
    this.ledger[awardId] = {
      awardId,
      stickerId: input.sticker.id,
      userId: input.uid,
      trigger: input.discoveryKey,
      source: input.sourcePage,
      eventId: input.eventId ?? null,
      awardedBy: 'server',
      verifiedBy: input.verifiedBy,
    };
    return { applied: true };
  }
}

function mockRes() {
  const res: any = { statusCode: 200, body: undefined };
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body: unknown) => {
    res.body = body;
    return res;
  };
  return res;
}

// ---------------------------------------------------------------------------
// Allowlist + metadata
// ---------------------------------------------------------------------------

test('server allowlist is exactly the 17 live legacy keys', () => {
  assert.deepEqual([...SERVER_DISCOVERY_ALLOWLIST].sort(), [...EXPECTED_ALLOWLIST].sort());
});

test('unknown and dead keys resolve to null (rejected with 400 by the handler)', () => {
  for (const key of ['tribunal_view', 'standings_open', 'basecamp_visit', '', 'weekly_winner']) {
    assert.equal(resolveDiscoverySticker(key), null, key);
  }
});

test('every allowlisted key resolves to a client discovery sticker with matching metadata', () => {
  for (const key of SERVER_DISCOVERY_ALLOWLIST) {
    const sticker = resolveDiscoverySticker(key);
    assert.ok(sticker, key);
    const clientEntry = DISCOVERY_STICKERS.find((s) => s.discoveryKey === key);
    assert.ok(clientEntry, key);
    assert.equal(sticker.id, clientEntry.id);
    assert.equal(sticker.name, clientEntry.name);
    assert.equal(sticker.description, clientEntry.description);
  }
});

test('the two Camera Ready stickers stay two distinct stickers', () => {
  assert.equal(resolveDiscoverySticker('camera_ready')?.id, 'camera_ready');
  assert.equal(resolveDiscoverySticker('capture_start')?.id, 'camera-ready');
  assert.notEqual(
    resolveDiscoverySticker('camera_ready')?.id,
    resolveDiscoverySticker('capture_start')?.id,
  );
});

test('starter-gated keys are the four held keys plus the five pre-starter-firing keys', () => {
  assert.deepEqual([...STARTER_GATED_DISCOVERY_KEYS].sort(), [...EXPECTED_GATED_KEYS].sort());
});

// ---------------------------------------------------------------------------
// Starter gate
// ---------------------------------------------------------------------------

test('all nine starter-gated keys return held while the starter is incomplete', async () => {
  for (const key of STARTER_GATED_DISCOVERY_KEYS) {
    const store = new FakeStore({ user: baseUser(), entries: [] });
    const result = await awardDiscoveryStickerServer(store, { uid: UID, discoveryKey: key, sourcePage: 'capture' });
    assert.equal(result.ok, false, key);
    if (!result.ok) {
      assert.equal(result.status, 409, key);
      assert.equal(result.code, 'STARTER_INCOMPLETE', key);
      assert.equal((result as any).held, true, key);
    }
    assert.equal(store.writeCalls.length, 0, key);
  }
});

test('a gated key awards once the starter is complete', async () => {
  const store = new FakeStore({ user: starterCompleteUser(), entries: [approvedEntry('e1')] });
  const result = await awardDiscoveryStickerServer(store, { uid: UID, discoveryKey: 'camera_ready', sourcePage: 'capture' });
  assert.equal(result.ok, true);
  assert.equal((result as any).awarded, true);
  assert.equal((result as any).sticker.id, 'camera_ready');
  assert.equal(store.writeCalls.length, 1);
});

test('non-gated keys are not starter-gated (dex_open awards without a starter)', async () => {
  const store = new FakeStore({ user: baseUser(), entries: [] });
  const result = await awardDiscoveryStickerServer(store, { uid: UID, discoveryKey: 'dex_open', sourcePage: 'dex' });
  assert.equal(result.ok, true);
  assert.equal((result as any).awarded, true);
});

// ---------------------------------------------------------------------------
// Idempotency + ledger
// ---------------------------------------------------------------------------

test('already-earned stickers are not written twice', async () => {
  const store = new FakeStore({
    user: starterCompleteUser({ discoveryEvents: { camera_ready: true } }),
    entries: [approvedEntry('e1')],
  });
  const result = await awardDiscoveryStickerServer(store, { uid: UID, discoveryKey: 'camera_ready', sourcePage: 'capture' });
  assert.equal(result.ok, true);
  assert.equal((result as any).awarded, false);
  assert.equal((result as any).alreadyUnlocked, true);
  assert.equal(store.writeCalls.length, 0);
});

test('a pre-existing ledger row makes the award idempotent', async () => {
  const awardId = getDiscoveryStickerAwardId(UID, 'camera_ready');
  const store = new FakeStore({
    user: starterCompleteUser(),
    entries: [approvedEntry('e1')],
    ledgerSeed: { [awardId]: { awardId, awardedBy: 'server' } },
  });
  const result = await awardDiscoveryStickerServer(store, { uid: UID, discoveryKey: 'camera_ready', sourcePage: 'capture' });
  assert.equal(result.ok, true);
  assert.equal((result as any).awarded, false);
  assert.equal((result as any).alreadyUnlocked, true);
  assert.equal(store.writeCalls.length, 1, 'the transactional re-check is what catches it');
});

test('a successful award writes a deterministic ledger row', async () => {
  const store = new FakeStore({ user: starterCompleteUser(), entries: [approvedEntry('e1')] });
  const result = await awardDiscoveryStickerServer(store, {
    uid: UID,
    discoveryKey: 'camera_ready',
    sourcePage: 'capture',
    eventId: 'evt-1',
  });
  assert.equal((result as any).awarded, true);
  const row = store.ledger[getDiscoveryStickerAwardId(UID, 'camera_ready')];
  assert.ok(row);
  assert.equal(row.awardId, `${UID}:camera_ready`);
  assert.equal(row.stickerId, 'camera_ready');
  assert.equal(row.userId, UID);
  assert.equal(row.trigger, 'camera_ready');
  assert.equal(row.source, 'capture');
  assert.equal(row.eventId, 'evt-1');
  assert.equal(row.awardedBy, 'server');
});

// ---------------------------------------------------------------------------
// Group completion
// ---------------------------------------------------------------------------

test('evaluateDiscoveryGroups completes mission-basics on the fourth sticker', () => {
  const user = baseUser({ unlockedRewards: { stickers: ['first-draw', 'camera-ready', 'proof-pirate'] } });
  const completed = evaluateDiscoveryGroups(user, 'signal-fragment-missing');
  assert.equal(completed.length, 1);
  assert.equal(completed[0].id, 'mission-basics');
  assert.equal(completed[0].xpReward, 50);
});

test('evaluateDiscoveryGroups does not re-complete an already completed group', () => {
  const user = baseUser({
    unlockedRewards: { stickers: ['first-draw', 'camera-ready', 'proof-pirate'] },
    completedDiscoveryGroups: ['mission-basics'],
  });
  assert.deepEqual(evaluateDiscoveryGroups(user, 'signal-fragment-missing'), []);
});

test('awarding the last mission-basics sticker grants +50 XP via the write', async () => {
  const user = starterCompleteUser({
    unlockedRewards: { stickers: ['first-draw', 'camera-ready', 'proof-pirate'] },
  });
  const store = new FakeStore({ user, entries: [approvedEntry('e1'), notedEntry('e2')] });
  const result = await awardDiscoveryStickerServer(store, {
    uid: UID,
    discoveryKey: 'evidence_meter_bonus_seen',
    sourcePage: 'capture',
  });
  assert.equal((result as any).awarded, true);
  assert.equal((result as any).completedGroups[0]?.id, 'mission-basics');
  assert.equal(store.user?.points, 50);
  assert.deepEqual(store.user?.completedDiscoveryGroups, ['mission-basics']);
});

// ---------------------------------------------------------------------------
// Trigger verification
// ---------------------------------------------------------------------------

test('first_vote fails verification when no vote exists, awards when one does', async () => {
  const noVote = new FakeStore({ user: baseUser(), votedUids: [] });
  const denied = await awardDiscoveryStickerServer(noVote, { uid: UID, discoveryKey: 'first_vote', sourcePage: 'voting' });
  assert.equal(denied.ok, false);
  if (!denied.ok) {
    assert.equal(denied.status, 422);
    assert.equal(denied.code, 'TRIGGER_NOT_VERIFIED');
  }
  assert.equal(noVote.writeCalls.length, 0);

  const voted = new FakeStore({ user: baseUser(), votedUids: [UID] });
  const awarded = await awardDiscoveryStickerServer(voted, { uid: UID, discoveryKey: 'first_vote', sourcePage: 'voting' });
  assert.equal((awarded as any).awarded, true);
  assert.equal((awarded as any).verifiedBy, 'server-state');
});

test('receipt_approved fails verification without an approved entry', async () => {
  const store = new FakeStore({ user: starterCompleteUser(), entries: [] });
  const result = await awardDiscoveryStickerServer(store, { uid: UID, discoveryKey: 'receipt_approved', sourcePage: 'starter' });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 422);
});

test('proof_returned fails verification without a needs-more-proof review', async () => {
  const store = new FakeStore({ user: starterCompleteUser(), entries: [approvedEntry('e1')], needsMoreProof: false });
  const result = await awardDiscoveryStickerServer(store, { uid: UID, discoveryKey: 'proof_returned', sourcePage: 'capture' });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 422);

  const withReview = new FakeStore({ user: starterCompleteUser(), entries: [approvedEntry('e1')], needsMoreProof: true });
  const awarded = await awardDiscoveryStickerServer(withReview, { uid: UID, discoveryKey: 'proof_returned', sourcePage: 'capture' });
  assert.equal((awarded as any).awarded, true);
  assert.equal((awarded as any).verifiedBy, 'server-state');
});

test('note triggers accept the claim when the entry has not landed yet, verify when it has', async () => {
  const racing = new FakeStore({ user: starterCompleteUser(), entries: [] });
  const claimed = await awardDiscoveryStickerServer(racing, { uid: UID, discoveryKey: 'first_field_note', sourcePage: 'capture' });
  assert.equal((claimed as any).awarded, true);
  assert.equal((claimed as any).verifiedBy, 'client-claim');

  const landed = new FakeStore({ user: starterCompleteUser(), entries: [notedEntry('e2')] });
  const proven = await awardDiscoveryStickerServer(landed, { uid: UID, discoveryKey: 'first_field_note', sourcePage: 'capture' });
  assert.equal((proven as any).awarded, true);
  assert.equal((proven as any).verifiedBy, 'server-state');
});

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

test('handler rejects unknown keys with 400', async () => {
  const store = new FakeStore();
  const handler = createStickerAwardHandler(() => store);
  const res = mockRes();
  await handler({ user: { uid: UID }, body: { discoveryKey: 'tribunal_view', sourcePage: 'voting' } }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, 'UNKNOWN_DISCOVERY_KEY');
  assert.equal(store.writeCalls.length, 0);
});

test('handler returns 409 held for a gated key pre-starter', async () => {
  const store = new FakeStore({ user: baseUser() });
  const handler = createStickerAwardHandler(() => store);
  const res = mockRes();
  await handler({ user: { uid: UID }, body: { discoveryKey: 'mission_draw', sourcePage: 'deck' } }, res);
  assert.equal(res.statusCode, 409);
  assert.equal(res.body.error, 'STARTER_INCOMPLETE');
  assert.equal(res.body.held, true);
});

test('handler returns 404 when the user doc does not exist', async () => {
  const store = new FakeStore({ user: null });
  const handler = createStickerAwardHandler(() => store);
  const res = mockRes();
  await handler({ user: { uid: UID }, body: { discoveryKey: 'dex_open', sourcePage: 'dex' } }, res);
  assert.equal(res.statusCode, 404);
  assert.equal(res.body.error, 'USER_NOT_FOUND');
});

test('handler awards only the authenticated caller, never a uid from the body', async () => {
  const store = new FakeStore({ user: baseUser() });
  const handler = createStickerAwardHandler(() => store);
  const res = mockRes();
  await handler(
    { user: { uid: UID }, body: { discoveryKey: 'dex_open', sourcePage: 'dex', userId: 'victim-uid', uid: 'victim-uid' } },
    res,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.awarded, true);
  assert.equal(store.writeCalls.length, 1);
  assert.equal(store.writeCalls[0].uid, UID);
  // dex_open awards the 'first-flip' sticker (key and id differ).
  assert.ok(store.ledger[getDiscoveryStickerAwardId(UID, 'first-flip')]);
  assert.equal(store.ledger[getDiscoveryStickerAwardId('victim-uid', 'first-flip')], undefined);
});

test('handler returns 500 when the Admin SDK store is unavailable', async () => {
  const handler = createStickerAwardHandler(() => null);
  const res = mockRes();
  await handler({ user: { uid: UID }, body: { discoveryKey: 'dex_open' } }, res);
  assert.equal(res.statusCode, 500);
  assert.equal(res.body.error, 'DB_ADMIN_NOT_READY');
});

test('handler returns the awarded shape the client modal consumes', async () => {
  const store = new FakeStore({ user: baseUser() });
  const handler = createStickerAwardHandler(() => store);
  const res = mockRes();
  await handler({ user: { uid: UID }, body: { discoveryKey: 'dex_open', sourcePage: 'dex' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.awarded, true);
  assert.equal(res.body.sticker.id, 'first-flip', 'dex_open awards the first-flip sticker');
  assert.equal(typeof res.body.sticker.name, 'string');
  assert.equal(typeof res.body.sticker.description, 'string');
  assert.ok(Array.isArray(res.body.completedGroups));
});

// ---------------------------------------------------------------------------
// Wiring guards
// ---------------------------------------------------------------------------

test('server.ts registers POST /api/stickers/award behind authRateLimiter + authenticate', () => {
  const server = fs.readFileSync('server.ts', 'utf8');
  assert.ok(
    server.includes('app.post("/api/stickers/award", authRateLimiter, authenticate,'),
    'route must use authRateLimiter + authenticate like the other player endpoints',
  );
  assert.ok(server.includes('createStickerAwardHandler('), 'route must use the extracted handler');
});

test('the client no longer writes legacy sticker fields directly', () => {
  assert.equal(fs.existsSync('src/services/discoveryService.ts'), false, 'discoveryService.ts is deleted');
  const appContext = fs.readFileSync('src/context/AppContext.tsx', 'utf8');
  assert.ok(!appContext.includes('services/discoveryService'), 'AppContext must not import discoveryService');
  assert.ok(appContext.includes("authenticatedFetch('/api/stickers/award'"), 'AppContext must call the endpoint');
  const votingHub = fs.readFileSync('src/pages/VotingHubPage.tsx', 'utf8');
  assert.ok(!votingHub.includes('tribunal_view'), 'dead tribunal_view call is removed');
});

// ---------------------------------------------------------------------------
// Admin store: a sticker award also writes a notification doc
// ---------------------------------------------------------------------------

/** Minimal fake Firestore: just enough for createAdminStickerAwardStore.writeAward. */
function fakeFirestore() {
  const sets: Array<{ path: string; data: Record<string, unknown> }> = [];
  const updates: Array<{ path: string; data: Record<string, unknown> }> = [];
  class FakeRef {
    constructor(public path: string) {}
    collection(name: string) {
      return { doc: (id?: string) => new FakeRef(`${this.path}/${name}/${id ?? 'auto-id'}`) };
    }
  }
  const db = {
    collection(name: string) {
      return { doc: (id?: string) => new FakeRef(`${name}/${id ?? 'auto-id'}`) };
    },
    async runTransaction(fn: (tx: unknown) => Promise<unknown>) {
      const tx = {
        async get(ref: FakeRef) {
          if (ref.path === `users/${UID}`) return { exists: true, data: () => baseUser() };
          return { exists: false, data: () => undefined };
        },
        update(ref: FakeRef, data: Record<string, unknown>) { updates.push({ path: ref.path, data }); },
        set(ref: FakeRef, data: Record<string, unknown>) { sets.push({ path: ref.path, data }); },
      };
      return fn(tx);
    },
  };
  return { db: db as never, sets, updates };
}

test('the admin award store writes a sticker_awarded notification in the same transaction', async () => {
  const sticker = resolveDiscoverySticker('camera_ready');
  assert.ok(sticker, 'camera_ready must resolve to a discovery sticker');
  const { db, sets } = fakeFirestore();
  const store = createAdminStickerAwardStore(db);
  const result = await store.writeAward({
    uid: UID,
    sticker,
    discoveryKey: 'camera_ready',
    sourcePage: '/missions',
    completedGroups: [],
    verifiedBy: 'server-state',
  });
  assert.deepEqual(result, { applied: true });
  const awardId = getDiscoveryStickerAwardId(UID, sticker.id);
  assert.equal(awardId, `${UID}:${sticker.id}`);
  const ledger = sets.find((s) => s.path === `stickerAwards/${awardId}`);
  assert.ok(ledger, 'ledger row must be written');
  // Nov 17, 2026: the notification doc lands in the same transaction, after
  // the ledger write, so the award survives the toast.
  const note = sets.find((s) => s.path.startsWith(`users/${UID}/notifications/`));
  assert.ok(note, 'a notification doc must be written under users/{uid}/notifications');
  assert.ok(sets.indexOf(note) > sets.indexOf(ledger), 'notification is written after the ledger row');
  assert.equal(note.data.type, 'sticker_awarded');
  assert.equal(note.data.stickerId, sticker.id);
  assert.equal(note.data.stickerName, sticker.name);
  assert.equal(note.data.stickerRarity, sticker.rarity ?? null);
  assert.equal(note.data.discoveryKey, 'camera_ready');
  assert.equal(note.data.read, false);
  assert.ok('createdAt' in note.data, 'notification carries a createdAt server timestamp');
});
