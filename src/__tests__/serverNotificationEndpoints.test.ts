import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createNotifySubmittedHandler,
  createPowerHourLiveHandler,
  getPowerHourAnnouncementId,
  getProofSubmittedNotificationId,
  type NotificationDb,
} from '../server/notificationEndpoints';
import { normalizeMissionScoringConfig } from '../logic/missionScoring';

type DocData = Record<string, any>;

/** Minimal in-memory fake of the NotificationDb surface. */
class FakeDoc {
  constructor(
    private readonly store: Map<string, DocData>,
    private readonly path: string,
  ) {}

  async get(): Promise<{ exists: boolean; data: () => DocData | undefined }> {
    return { exists: this.store.has(this.path), data: () => this.store.get(this.path) };
  }

  async set(data: DocData): Promise<void> {
    this.store.set(this.path, data);
  }

  collection(name: string): FakeCollection {
    return new FakeCollection(this.store, `${this.path}/${name}`);
  }
}

class FakeCollection {
  constructor(
    private readonly store: Map<string, DocData>,
    private readonly path: string,
  ) {}

  doc(id: string): FakeDoc {
    return new FakeDoc(this.store, `${this.path}/${id}`);
  }
}

class FakeDb implements NotificationDb {
  readonly store = new Map<string, DocData>();

  collection(name: string): FakeCollection {
    return new FakeCollection(this.store, name);
  }

  seed(path: string, data: DocData): void {
    this.store.set(path, data);
  }

  read(path: string): DocData | undefined {
    return this.store.get(path);
  }
}

function makeRes(): any {
  const res: any = { statusCode: 200, body: undefined };
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body: any) => {
    res.body = body;
    return res;
  };
  return res;
}

const PLAYER_UID = 'player-1';
const ENTRY_ID = 'entry-1';
const defaultConfig = async () => normalizeMissionScoringConfig(null);

/** Noon PDT on 2026-07-16: 12:05 local, inside the Power Hour window. */
const IN_WINDOW = () => new Date('2026-07-16T19:05:00.000Z');
/** 16:00 PDT: outside the window. */
const OUT_OF_WINDOW = () => new Date('2026-07-16T23:00:00.000Z');

function seedPendingEntry(db: FakeDb, overrides: DocData = {}): void {
  db.seed(`entries/${ENTRY_ID}`, {
    userId: PLAYER_UID,
    status: 'pending_review',
    missionTitle: 'Find the Coolest Shadow',
    challengeId: 'heat-1',
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// POST /api/entries/:id/notify-submitted
// ---------------------------------------------------------------------------

test('notify-submitted: writes one proof_submitted doc for a pending entry', async () => {
  const db = new FakeDb();
  seedPendingEntry(db);
  const handler = createNotifySubmittedHandler({
    getDb: () => db,
    getScoringConfig: defaultConfig,
  });
  const res = makeRes();
  await handler({ user: { uid: PLAYER_UID }, params: { id: ENTRY_ID } }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { ok: true, notified: true });
  const doc = db.read(`users/${PLAYER_UID}/notifications/${getProofSubmittedNotificationId(ENTRY_ID)}`);
  assert.equal(doc?.type, 'proof_submitted');
  assert.equal(doc?.entryId, ENTRY_ID);
  assert.equal(doc?.challengeId, 'heat-1');
  assert.equal(doc?.missionTitle, 'Find the Coolest Shadow');
  assert.equal(doc?.read, false);
  assert.ok(doc?.createdAt, 'server timestamp recorded');
});

test('notify-submitted: a second call is a no-op, not a second row', async () => {
  const db = new FakeDb();
  seedPendingEntry(db);
  const handler = createNotifySubmittedHandler({
    getDb: () => db,
    getScoringConfig: defaultConfig,
  });
  const first = makeRes();
  await handler({ user: { uid: PLAYER_UID }, params: { id: ENTRY_ID } }, first);
  assert.equal(first.body.notified, true);
  const sizeAfterFirst = db.store.size;
  const second = makeRes();
  await handler({ user: { uid: PLAYER_UID }, params: { id: ENTRY_ID } }, second);
  assert.deepEqual(second.body, { ok: true, notified: false, reason: 'already_notified' });
  assert.equal(db.store.size, sizeAfterFirst, 'no second doc written');
});

test('notify-submitted: missing entry, wrong owner, and decided entries are refused', async () => {
  const db = new FakeDb();
  const handler = createNotifySubmittedHandler({
    getDb: () => db,
    getScoringConfig: defaultConfig,
  });

  const missing = makeRes();
  await handler({ user: { uid: PLAYER_UID }, params: { id: 'nope' } }, missing);
  assert.equal(missing.statusCode, 404);
  assert.equal(missing.body.error, 'ENTRY_NOT_FOUND');

  seedPendingEntry(db);
  const wrongOwner = makeRes();
  await handler({ user: { uid: 'someone-else' }, params: { id: ENTRY_ID } }, wrongOwner);
  assert.equal(wrongOwner.statusCode, 403);
  assert.equal(wrongOwner.body.error, 'NOT_ENTRY_OWNER');

  seedPendingEntry(db, { status: 'approved' });
  const decided = makeRes();
  await handler({ user: { uid: PLAYER_UID }, params: { id: ENTRY_ID } }, decided);
  assert.equal(decided.statusCode, 409);
  assert.equal(decided.body.error, 'ENTRY_NOT_PENDING');
  assert.equal(db.read(`users/${PLAYER_UID}/notifications/${getProofSubmittedNotificationId(ENTRY_ID)}`), undefined);
});

test('notify-submitted: no db returns 500, not a crash', async () => {
  const handler = createNotifySubmittedHandler({
    getDb: () => null,
    getScoringConfig: defaultConfig,
  });
  const res = makeRes();
  await handler({ user: { uid: PLAYER_UID }, params: { id: ENTRY_ID } }, res);
  assert.equal(res.statusCode, 500);
  assert.equal(res.body.error, 'DB_ADMIN_NOT_READY');
});

// ---------------------------------------------------------------------------
// POST /api/notifications/power-hour-live
// ---------------------------------------------------------------------------

test('power-hour-live: writes one doc per day, with a slash-free id', () => {
  assert.equal(
    getPowerHourAnnouncementId('2026-07-16', 'America/Los_Angeles'),
    'afternoon_power_hour_2026-07-16_America_Los_Angeles',
  );
});

test('power-hour-live: announces inside the window, once per day', async () => {
  const db = new FakeDb();
  const handler = createPowerHourLiveHandler({
    getDb: () => db,
    getScoringConfig: defaultConfig,
    now: IN_WINDOW,
  });
  const res = makeRes();
  await handler(
    { user: { uid: PLAYER_UID }, body: { localDate: '2026-07-16', timezone: 'America/Los_Angeles' } },
    res,
  );
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    ok: true,
    announced: true,
    assignmentId: 'afternoon_power_hour_2026-07-16_America_Los_Angeles',
  });
  const doc = db.read(
    `users/${PLAYER_UID}/notifications/afternoon_power_hour_2026-07-16_America_Los_Angeles`,
  );
  assert.equal(doc?.type, 'power_hour_live');
  assert.equal(doc?.localDate, '2026-07-16');
  assert.equal(doc?.timezone, 'America/Los_Angeles');
  assert.equal(doc?.startHour, 12);
  assert.equal(doc?.endHourExclusive, 15);
  assert.equal(doc?.multiplier, 1.5);
  assert.equal(doc?.read, false);
  assert.ok(doc?.createdAt, 'server timestamp recorded');

  const second = makeRes();
  await handler(
    { user: { uid: PLAYER_UID }, body: { localDate: '2026-07-16', timezone: 'America/Los_Angeles' } },
    second,
  );
  assert.deepEqual(second.body, {
    ok: true,
    announced: false,
    reason: 'already_announced',
    assignmentId: 'afternoon_power_hour_2026-07-16_America_Los_Angeles',
  });
});

test('power-hour-live: outside the window, bad dates, and bad timezones are refused', async () => {
  const db = new FakeDb();
  const handler = createPowerHourLiveHandler({
    getDb: () => db,
    getScoringConfig: defaultConfig,
    now: OUT_OF_WINDOW,
  });
  const outside = makeRes();
  await handler(
    { user: { uid: PLAYER_UID }, body: { localDate: '2026-07-16', timezone: 'America/Los_Angeles' } },
    outside,
  );
  assert.equal(outside.statusCode, 409);
  assert.equal(outside.body.error, 'NOT_IN_POWER_HOUR');

  const inWindow = createPowerHourLiveHandler({
    getDb: () => db,
    getScoringConfig: defaultConfig,
    now: IN_WINDOW,
  });
  const badDate = makeRes();
  await inWindow(
    { user: { uid: PLAYER_UID }, body: { localDate: 'July 16', timezone: 'America/Los_Angeles' } },
    badDate,
  );
  assert.equal(badDate.statusCode, 400);
  assert.equal(badDate.body.error, 'INVALID_LOCAL_DATE');

  const badTz = makeRes();
  await inWindow(
    { user: { uid: PLAYER_UID }, body: { localDate: '2026-07-16', timezone: 'Not/AZone' } },
    badTz,
  );
  assert.equal(badTz.statusCode, 400);
  assert.equal(badTz.body.error, 'INVALID_TIMEZONE');

  // The claimed date must be today in that timezone — a body for another
  // day cannot announce an hour that isn't live.
  const mismatch = makeRes();
  await inWindow(
    { user: { uid: PLAYER_UID }, body: { localDate: '2026-07-17', timezone: 'America/Los_Angeles' } },
    mismatch,
  );
  assert.equal(mismatch.statusCode, 400);
  assert.equal(mismatch.body.error, 'DATE_MISMATCH');
  assert.equal(db.store.size, 0, 'nothing written on refusal');
});
