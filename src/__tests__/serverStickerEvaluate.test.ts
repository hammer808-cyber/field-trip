/**
 * Option B (Nov 20, 2026) — server-side evaluator awards.
 *
 * Tests the orchestrator (`evaluateStickersServer`) against an in-memory
 * fake store, the two Express handlers, the notification backfill, and
 * the two guards that keep this move honest: no client file calls the
 * deleted client unlock functions, and the server's import closure
 * contains no client Firebase SDK import.
 *
 * The fake store mirrors the real Admin SDK store's semantics, including
 * the unlock transaction's already-unlocked dedupe (sticker doc OR
 * ledger row) and the sticker + ledger + notification triple write.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  backfillMissingStickerNotifications,
  createEvaluateStickersHandler,
  createStickerBackfillHandler,
  evaluateStickersServer,
  type StickerBackfillStore,
  type StickerEvalStore
} from '../server/stickerEvaluate';
import { getStickerById, getStarterPackForArchetype } from '../data/stickers';
import {
  isNeedsMoreReviewForMission,
  isStickerAwardTrigger,
  normalizeSource,
  STICKER_EVENT_AWARD_IDS
} from '../logic/stickerAwardCore';
import type { StickerUnlockResult } from '../logic/stickerAwardCore';

const USER_ID = 'eval-player';
const OTHER_ID = 'eval-other';
const ADMIN_ID = 'eval-admin';

const SOURCE = 'test:evaluate';

function makeProfile(overrides: Record<string, any> = {}): any {
  return {
    id: USER_ID,
    fieldType: 'mallRat',
    approvedCompletedChallengeIds: [],
    completedChallengeIds: [],
    completedMissionIds: [],
    approvalStreakDays: 0,
    xp: 0,
    points: 0,
    onboardingCompleted: true,
    ...overrides
  };
}

function makeEntry(overrides: Record<string, any> = {}): Record<string, any> {
  return {
    userId: USER_ID,
    missionId: 'socal-01',
    status: 'approved',
    fieldType: 'mallRat',
    fieldNote: 'great spot',
    proofImage: 'https://example.com/proof.jpg',
    ...overrides
  };
}

class FakeStickerEvalStore implements StickerEvalStore {
  profiles = new Map<string, Record<string, any>>();
  entries = new Map<string, Record<string, any>>();
  proofReviews: Array<Record<string, any>> = [];
  drawnCards = new Set<string>();
  crews = new Map<string, Record<string, any>>();
  crewMemberDocs = new Map<string, Set<string>>();
  levelUpEvents = new Map<string, Record<string, any>>();
  votes = new Set<string>();
  stickers = new Map<string, Map<string, Record<string, any>>>();
  ledger = new Set<string>();
  notifications: Array<{ uid: string; doc: Record<string, any> }> = [];
  unlockCalls: Array<{ userId: string; stickerIds: string[]; source: string; trigger: string }> = [];

  async getUserProfile(uid: string) {
    return this.profiles.get(uid) ?? null;
  }

  async getEntry(entryId: string) {
    return this.entries.get(entryId) ?? null;
  }

  async wasRepair(userId: string, missionId: string | null) {
    if (!userId || !missionId) return false;
    return this.proofReviews
      .filter(review => review.userId === userId)
      .some(review => isNeedsMoreReviewForMission(review, missionId));
  }

  async hasDrawnCard(uid: string) {
    return this.drawnCards.has(uid);
  }

  async getCrew(crewId: string) {
    return this.crews.get(crewId) ?? null;
  }

  async isCrewMember(crewId: string, uid: string) {
    return this.crewMemberDocs.get(crewId)?.has(uid) ?? false;
  }

  async getLevelUpEvent(eventId: string) {
    return this.levelUpEvents.get(eventId) ?? null;
  }

  async hasVote(uid: string, seasonId: string, weekNumber: number) {
    return this.votes.has(`${uid}|${seasonId}|${weekNumber}`);
  }

  async unlock(
    userId: string,
    stickerIds: string[],
    source: string,
    trigger: string
  ): Promise<StickerUnlockResult[]> {
    this.unlockCalls.push({ userId, stickerIds, source, trigger });
    const normalizedSource = normalizeSource(source);
    if (!normalizedSource || !isStickerAwardTrigger(trigger)) {
      return stickerIds.map(stickerId => ({
        stickerId,
        status: 'failed' as const,
        unlocked: false,
        error: 'invalid unlock input'
      }));
    }
    const owned = this.stickers.get(userId) ?? new Map<string, Record<string, any>>();
    this.stickers.set(userId, owned);
    return stickerIds.map(stickerId => {
      const definition = getStickerById(stickerId);
      if (!definition) {
        return { stickerId, status: 'invalid_sticker' as const, unlocked: false, error: 'unknown sticker' };
      }
      if (owned.has(stickerId) || this.ledger.has(`${userId}:${stickerId}`)) {
        return { stickerId, status: 'already_unlocked' as const, unlocked: false };
      }
      owned.set(stickerId, { stickerId, unlockedAt: new Date(), source: normalizedSource, trigger, seen: false, equipped: false });
      this.ledger.add(`${userId}:${stickerId}`);
      this.notifications.push({
        uid: userId,
        doc: {
          type: 'sticker_awarded',
          stickerId,
          stickerName: definition.name,
          stickerRarity: definition.rarity ?? null,
          discoveryKey: trigger,
          read: false,
          createdAt: new Date()
        }
      });
      return { stickerId, status: 'unlocked' as const, unlocked: true };
    });
  }
}

class FakeBackfillStore implements StickerBackfillStore {
  stickersByUser = new Map<string, Array<{ id: string; trigger: string; unlockedAt: unknown }>>();
  notifiedByUser = new Map<string, Set<string>>();
  written: Array<{ uid: string; doc: Record<string, any> }> = [];

  async listUserIds(limit: number) {
    return [...this.stickersByUser.keys()].slice(0, limit);
  }

  async listStickers(uid: string) {
    return this.stickersByUser.get(uid) ?? [];
  }

  async listNotificationStickerIds(uid: string) {
    return this.notifiedByUser.get(uid) ?? new Set<string>();
  }

  async writeNotifications(uid: string, docs: Array<Record<string, any>>) {
    for (const doc of docs) this.written.push({ uid, doc });
    return docs.length;
  }
}

function seedStore(): FakeStickerEvalStore {
  const store = new FakeStickerEvalStore();
  store.profiles.set(USER_ID, makeProfile());
  store.entries.set('entry-1', makeEntry());
  store.drawnCards.add(USER_ID);
  store.crews.set('crew-1', {
    captainId: USER_ID,
    members: [USER_ID],
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
  });
  store.levelUpEvents.set('level-event-1', { userId: USER_ID, toLevel: 2, acknowledged: false });
  store.votes.add(`${USER_ID}|heatwave-receipts|3`);
  return store;
}

const allowAdmin = async () => undefined;
const denyAdmin = async () => {
  throw new Error('ADMIN_REQUIRED');
};

const awardedIds = (result: { ok: true; awarded: StickerUnlockResult[] }) =>
  result.awarded.filter(item => item.status === 'unlocked').map(item => item.stickerId);

// ---------------------------------------------------------------------------
// Validation: 400s
// ---------------------------------------------------------------------------

test('evaluate: unknown event type is 400', async () => {
  const store = seedStore();
  const result = await evaluateStickersServer(store, { callerUid: USER_ID, eventType: 'nope', source: SOURCE }, { requireAdmin: allowAdmin });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, 'INVALID_EVENT_TYPE');
});

test('evaluate: weekly_winner and admin_grant are never evaluated here', async () => {
  const store = seedStore();
  for (const eventType of ['weekly_winner', 'admin_grant']) {
    const result = await evaluateStickersServer(store, { callerUid: USER_ID, eventType, source: SOURCE }, { requireAdmin: allowAdmin });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, 'EVENT_NOT_EVALUATED');
  }
});

test('evaluate: missing source is 400', async () => {
  const store = seedStore();
  const result = await evaluateStickersServer(store, { callerUid: USER_ID, eventType: 'first_submission', entryId: 'entry-1', source: '  ' }, { requireAdmin: allowAdmin });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, 'INVALID_SOURCE');
});

test('evaluate: entry events without an entry id are 400', async () => {
  const store = seedStore();
  const result = await evaluateStickersServer(store, { callerUid: USER_ID, eventType: 'first_approval', source: SOURCE }, { requireAdmin: allowAdmin });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, 'MISSING_ENTRY_ID');
});

test('evaluate: starter_pack without an archetype, and with an unknown one, is 400', async () => {
  const store = seedStore();
  const missing = await evaluateStickersServer(store, { callerUid: USER_ID, eventType: 'starter_pack', source: SOURCE }, { requireAdmin: allowAdmin });
  assert.equal(missing.ok, false);
  if (!missing.ok) assert.equal(missing.code, 'MISSING_ARCHETYPE');
  const unknown = await evaluateStickersServer(store, { callerUid: USER_ID, eventType: 'starter_pack', archetype: 'notAPersona', source: SOURCE }, { requireAdmin: allowAdmin });
  assert.equal(unknown.ok, false);
  if (!unknown.ok) assert.equal(unknown.code, 'UNKNOWN_ARCHETYPE');
});

test('evaluate: crew events without a crew id, level_up without an event id, votes without params are 400', async () => {
  const store = seedStore();
  const crew = await evaluateStickersServer(store, { callerUid: USER_ID, eventType: 'crew_joined', source: SOURCE }, { requireAdmin: allowAdmin });
  assert.equal(crew.ok, false);
  if (!crew.ok) assert.equal(crew.code, 'MISSING_CREW_ID');
  const level = await evaluateStickersServer(store, { callerUid: USER_ID, eventType: 'level_up', source: SOURCE }, { requireAdmin: allowAdmin });
  assert.equal(level.ok, false);
  if (!level.ok) assert.equal(level.code, 'MISSING_EVENT_ID');
  const vote = await evaluateStickersServer(store, { callerUid: USER_ID, eventType: 'weekly_vote_cast', source: SOURCE }, { requireAdmin: allowAdmin });
  assert.equal(vote.ok, false);
  if (!vote.ok) assert.equal(vote.code, 'MISSING_VOTE_PARAMS');
});

test('evaluate: late_night_submission without a valid hour is 400', async () => {
  const store = seedStore();
  const result = await evaluateStickersServer(store, { callerUid: USER_ID, eventType: 'late_night_submission', entryId: 'entry-1', source: SOURCE }, { requireAdmin: allowAdmin });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, 'INVALID_LOCAL_HOUR');
});

// ---------------------------------------------------------------------------
// Loads: 404s
// ---------------------------------------------------------------------------

test('evaluate: missing entry, crew, and level-up event are 404', async () => {
  const store = seedStore();
  const entry = await evaluateStickersServer(store, { callerUid: USER_ID, eventType: 'first_submission', entryId: 'nope', source: SOURCE }, { requireAdmin: allowAdmin });
  assert.equal(entry.ok, false);
  if (!entry.ok) assert.equal(entry.code, 'ENTRY_NOT_FOUND');
  const crew = await evaluateStickersServer(store, { callerUid: USER_ID, eventType: 'crew_joined', crewId: 'nope', source: SOURCE }, { requireAdmin: allowAdmin });
  assert.equal(crew.ok, false);
  if (!crew.ok) assert.equal(crew.code, 'CREW_NOT_FOUND');
  const level = await evaluateStickersServer(store, { callerUid: USER_ID, eventType: 'level_up', eventId: 'nope', source: SOURCE }, { requireAdmin: allowAdmin });
  assert.equal(level.ok, false);
  if (!level.ok) assert.equal(level.code, 'LEVEL_UP_EVENT_NOT_FOUND');
});

// ---------------------------------------------------------------------------
// Admin gate: 403
// ---------------------------------------------------------------------------

test('evaluate: a non-admin asking for someone else\'s award is 403', async () => {
  const store = seedStore();
  store.entries.set('entry-other', makeEntry({ userId: OTHER_ID }));
  const result = await evaluateStickersServer(
    store,
    { callerUid: USER_ID, eventType: 'first_approval', entryId: 'entry-other', source: SOURCE },
    { requireAdmin: denyAdmin }
  );
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.status, 403);
    assert.equal(result.code, 'ADMIN_ONLY');
  }
  assert.equal(store.unlockCalls.length, 0, 'nothing was awarded');
});

test('evaluate: an admin asking for someone else\'s award succeeds', async () => {
  const store = seedStore();
  store.entries.set('entry-other', makeEntry({ userId: OTHER_ID }));
  store.profiles.set(OTHER_ID, makeProfile({ id: OTHER_ID }));
  const result = await evaluateStickersServer(
    store,
    { callerUid: ADMIN_ID, eventType: 'first_submission', entryId: 'entry-other', source: SOURCE },
    { requireAdmin: allowAdmin }
  );
  assert.equal(result.ok, true);
  if (result.ok) assert.ok(awardedIds(result).includes(STICKER_EVENT_AWARD_IDS.firstSubmission));
});

// ---------------------------------------------------------------------------
// Verification: 409s
// ---------------------------------------------------------------------------

test('evaluate: first_approval on a not-yet-approved entry is 409', async () => {
  const store = seedStore();
  store.entries.set('entry-pending', makeEntry({ status: 'pending_review' }));
  const result = await evaluateStickersServer(store, { callerUid: USER_ID, eventType: 'first_approval', entryId: 'entry-pending', source: SOURCE }, { requireAdmin: allowAdmin });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, 'ENTRY_NOT_APPROVED');
  assert.equal(store.unlockCalls.length, 0);
});

test('evaluate: field_note_added without a note, photo_proof_added without a photo are 409', async () => {
  const store = seedStore();
  store.entries.set('entry-no-note', makeEntry({ fieldNote: '  ' }));
  const note = await evaluateStickersServer(store, { callerUid: USER_ID, eventType: 'field_note_added', entryId: 'entry-no-note', source: SOURCE }, { requireAdmin: allowAdmin });
  assert.equal(note.ok, false);
  if (!note.ok) assert.equal(note.code, 'ENTRY_MISSING_NOTE');
  store.entries.set('entry-no-photo', makeEntry({ proofImage: '', originalImageUrl: '' }));
  const photo = await evaluateStickersServer(store, { callerUid: USER_ID, eventType: 'photo_proof_added', entryId: 'entry-no-photo', source: SOURCE }, { requireAdmin: allowAdmin });
  assert.equal(photo.ok, false);
  if (!photo.ok) assert.equal(photo.code, 'ENTRY_MISSING_PHOTO');
});

test('evaluate: first_draw with no drawn card is 409', async () => {
  const store = seedStore();
  store.drawnCards.delete(USER_ID);
  const result = await evaluateStickersServer(store, { callerUid: USER_ID, eventType: 'first_draw', source: SOURCE }, { requireAdmin: allowAdmin });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, 'NO_DRAWN_CARD');
});

test('evaluate: a level-up event belonging to someone else is 409', async () => {
  const store = seedStore();
  store.levelUpEvents.set('level-event-other', { userId: OTHER_ID, toLevel: 3, acknowledged: false });
  const result = await evaluateStickersServer(store, { callerUid: USER_ID, eventType: 'level_up', eventId: 'level-event-other', source: SOURCE }, { requireAdmin: allowAdmin });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, 'LEVEL_UP_EVENT_NOT_OWNED');
});

test('evaluate: crew_created by a non-captain, crew_joined by a non-member are 409', async () => {
  const store = seedStore();
  store.crews.set('crew-other', { captainId: OTHER_ID, members: [OTHER_ID], createdAt: new Date() });
  const created = await evaluateStickersServer(store, { callerUid: USER_ID, eventType: 'crew_created', crewId: 'crew-other', source: SOURCE }, { requireAdmin: allowAdmin });
  assert.equal(created.ok, false);
  if (!created.ok) assert.equal(created.code, 'NOT_CREW_CREATOR');
  const joined = await evaluateStickersServer(store, { callerUid: USER_ID, eventType: 'crew_joined', crewId: 'crew-other', source: SOURCE }, { requireAdmin: allowAdmin });
  assert.equal(joined.ok, false);
  if (!joined.ok) assert.equal(joined.code, 'NOT_A_CREW_MEMBER');
});

test('evaluate: crew_survived_week on a week-old crew awards; on a new crew it is 409', async () => {
  const store = seedStore();
  const old = await evaluateStickersServer(store, { callerUid: USER_ID, eventType: 'crew_survived_week', crewId: 'crew-1', source: SOURCE }, { requireAdmin: allowAdmin });
  assert.equal(old.ok, true);
  if (old.ok) assert.ok(awardedIds(old).includes('first_offenses_accomplice'), 'Accomplice awards on a week-old crew');
  store.crews.set('crew-new', { captainId: USER_ID, members: [USER_ID], createdAt: new Date() });
  const fresh = await evaluateStickersServer(store, { callerUid: USER_ID, eventType: 'crew_survived_week', crewId: 'crew-new', source: SOURCE }, { requireAdmin: allowAdmin });
  assert.equal(fresh.ok, false);
  if (!fresh.ok) assert.equal(fresh.code, 'CREW_TOO_NEW');
});

test('evaluate: weekly_vote_cast with no vote doc is 409', async () => {
  const store = seedStore();
  const result = await evaluateStickersServer(store, { callerUid: USER_ID, eventType: 'weekly_vote_cast', seasonId: 'heatwave-receipts', weekNumber: 9, source: SOURCE }, { requireAdmin: allowAdmin });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, 'NO_VOTE_FOUND');
});

test('evaluate: starter_pack with a mismatched archetype is 409', async () => {
  const store = seedStore();
  const result = await evaluateStickersServer(store, { callerUid: USER_ID, eventType: 'starter_pack', archetype: 'elondra', source: SOURCE }, { requireAdmin: allowAdmin });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, 'ARCHETYPE_MISMATCH');
});

// ---------------------------------------------------------------------------
// Success paths: award + notification, dedupe, starter pack, streak
// ---------------------------------------------------------------------------

test('evaluate: first_submission awards and writes the notification', async () => {
  const store = seedStore();
  const result = await evaluateStickersServer(store, { callerUid: USER_ID, eventType: 'first_submission', entryId: 'entry-1', source: SOURCE }, { requireAdmin: allowAdmin });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.ok(awardedIds(result).includes(STICKER_EVENT_AWARD_IDS.firstSubmission));
  const notes = store.notifications.filter(note => note.doc.stickerId === STICKER_EVENT_AWARD_IDS.firstSubmission);
  assert.equal(notes.length, 1, 'one sticker_awarded notification');
  assert.equal(notes[0].doc.type, 'sticker_awarded');
  assert.equal(notes[0].doc.discoveryKey, 'first_submission');
  assert.equal(notes[0].doc.read, false);
});

test('evaluate: first_approval awards the bundle and notifies per award', async () => {
  const store = seedStore();
  const result = await evaluateStickersServer(store, { callerUid: USER_ID, eventType: 'first_approval', entryId: 'entry-1', source: SOURCE }, { requireAdmin: allowAdmin });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const ids = awardedIds(result);
  assert.ok(ids.includes('side_quests_retail_therapy'), 'Mall Rat first-approval variant');
  assert.ok(ids.includes('mall_rat_shopping_spree'), 'Mall Rat challenge_approved');
  assert.equal(store.notifications.length, ids.length, 'one notification per newly unlocked sticker');
});

test('evaluate: re-evaluation writes nothing the second time', async () => {
  const store = seedStore();
  const first = await evaluateStickersServer(store, { callerUid: USER_ID, eventType: 'first_submission', entryId: 'entry-1', source: SOURCE }, { requireAdmin: allowAdmin });
  assert.equal(first.ok, true);
  const notesAfterFirst = store.notifications.length;
  assert.ok(notesAfterFirst > 0);
  const second = await evaluateStickersServer(store, { callerUid: USER_ID, eventType: 'first_submission', entryId: 'entry-1', source: SOURCE }, { requireAdmin: allowAdmin });
  assert.equal(second.ok, true);
  if (second.ok) {
    assert.ok(second.awarded.every(item => item.status === 'already_unlocked'));
  }
  assert.equal(store.notifications.length, notesAfterFirst, 'no duplicate notification');
});

test('evaluate: starter_pack awards the archetype pack', async () => {
  const store = seedStore();
  store.profiles.set(USER_ID, makeProfile({ fieldType: 'mascota' }));
  const result = await evaluateStickersServer(store, { callerUid: USER_ID, eventType: 'starter_pack', archetype: 'mascota', source: SOURCE }, { requireAdmin: allowAdmin });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const expected = getStarterPackForArchetype('mascota').map(sticker => sticker.id);
  assert.deepEqual(awardedIds(result).sort(), [...expected].sort());
  assert.ok(store.notifications.length >= expected.length);
});

test('evaluate: a 5-day approval streak awards On a Roll (the 23-trigger list)', async () => {
  const store = seedStore();
  store.profiles.set(USER_ID, makeProfile({ approvalStreakDays: 5 }));
  const result = await evaluateStickersServer(store, { callerUid: USER_ID, eventType: 'first_approval', entryId: 'entry-1', source: SOURCE }, { requireAdmin: allowAdmin });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  // The old client list had only 17 triggers and rejected approval_streak
  // before it reached Firestore — this pins the fix.
  assert.ok(awardedIds(result).includes('chaos_on_a_roll'), 'On a Roll fires at a 5-day streak');
});

test('evaluate: level_up awards Level Up from the named event', async () => {
  const store = seedStore();
  const result = await evaluateStickersServer(store, { callerUid: USER_ID, eventType: 'level_up', eventId: 'level-event-1', source: SOURCE }, { requireAdmin: allowAdmin });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.ok(awardedIds(result).includes('first_offenses_level_up'));
});

test('evaluate: a repair approval awards Plot Twist', async () => {
  const store = seedStore();
  store.proofReviews.push({ userId: USER_ID, status: 'needs_more_proof', missionId: 'socal-01' });
  const result = await evaluateStickersServer(store, { callerUid: USER_ID, eventType: 'first_approval', entryId: 'entry-1', source: SOURCE }, { requireAdmin: allowAdmin });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.ok(awardedIds(result).includes('side_quests_plot_twist'), 'Plot Twist fires on a repair approval');
});

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

function makeRes() {
  const res: any = { statusCode: 200, body: undefined as any };
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

test('handler: evaluate without a signed-in user is 401, without a store is 500', async () => {
  const store = seedStore();
  const handler = createEvaluateStickersHandler(() => store, { requireAdminUser: allowAdmin });
  const noUser = makeRes();
  await handler({ user: undefined, body: { eventType: 'first_draw', source: SOURCE } }, noUser);
  assert.equal(noUser.statusCode, 401);
  const noStore = createEvaluateStickersHandler(() => null, { requireAdminUser: allowAdmin });
  const res = makeRes();
  await noStore({ user: { uid: USER_ID }, body: { eventType: 'first_draw', source: SOURCE } }, res);
  assert.equal(res.statusCode, 500);
  assert.equal(res.body.error, 'DB_ADMIN_NOT_READY');
});

test('handler: evaluate returns the awarded results', async () => {
  const store = seedStore();
  const handler = createEvaluateStickersHandler(() => store, { requireAdminUser: allowAdmin });
  const res = makeRes();
  await handler({ user: { uid: USER_ID }, body: { eventType: 'first_draw', source: SOURCE } }, res);
  assert.equal(res.statusCode, 200);
  assert.ok(Array.isArray(res.body.awarded));
  assert.ok(res.body.awarded.some((item: StickerUnlockResult) => item.status === 'unlocked'));
});

test('handler: backfill is admin-only and returns counts', async () => {
  const fake = new FakeBackfillStore();
  fake.stickersByUser.set(USER_ID, [
    { id: STICKER_EVENT_AWARD_IDS.firstSubmission, trigger: 'first_submission', unlockedAt: new Date('2026-11-01') },
    { id: 'captain_clipboard_checkmark_seal', trigger: 'first_approval', unlockedAt: new Date('2026-11-02') }
  ]);
  fake.notifiedByUser.set(USER_ID, new Set([STICKER_EVENT_AWARD_IDS.firstSubmission]));
  const audits: Array<Record<string, any>> = [];
  const handler = createStickerBackfillHandler(() => fake, {
    requireAdminUser: denyAdmin,
    writeAdminAudit: async (...args: any[]) => {
      audits.push({ args });
    }
  });
  const forbidden = makeRes();
  await handler({ user: { uid: USER_ID }, body: {} }, forbidden);
  assert.equal(forbidden.statusCode, 403);
  assert.equal(fake.written.length, 0);

  const allowed = createStickerBackfillHandler(() => fake, {
    requireAdminUser: allowAdmin,
    writeAdminAudit: async () => undefined
  });
  const res = makeRes();
  await allowed({ user: { uid: ADMIN_ID }, body: {} }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.usersScanned, 1);
  assert.equal(res.body.stickersChecked, 2);
  assert.equal(res.body.notificationsWritten, 1, 'only the missing one is written');
  assert.equal(res.body.alreadyHad, 1);
  assert.equal(fake.written[0].doc.stickerId, 'captain_clipboard_checkmark_seal');
  assert.equal(fake.written[0].doc.read, false);
});

// ---------------------------------------------------------------------------
// Backfill orchestrator
// ---------------------------------------------------------------------------

test('backfill: writes missing notifications only, and is idempotent', async () => {
  const fake = new FakeBackfillStore();
  fake.stickersByUser.set(USER_ID, [
    { id: STICKER_EVENT_AWARD_IDS.firstSubmission, trigger: 'first_submission', unlockedAt: new Date('2026-11-01T10:00:00Z') },
    { id: 'unknown_sticker_id', trigger: 'first_approval', unlockedAt: new Date() }
  ]);
  fake.stickersByUser.set(OTHER_ID, [
    { id: 'captain_clipboard_checkmark_seal', trigger: 'first_approval', unlockedAt: new Date('2026-11-03T10:00:00Z') }
  ]);
  fake.notifiedByUser.set(USER_ID, new Set([STICKER_EVENT_AWARD_IDS.firstSubmission]));
  fake.notifiedByUser.set(OTHER_ID, new Set());

  const first = await backfillMissingStickerNotifications(fake, {});
  assert.equal(first.usersScanned, 2);
  assert.equal(first.stickersChecked, 3);
  assert.equal(first.notificationsWritten, 1, 'only the other player\'s missing one; the unknown id is skipped');
  assert.equal(first.alreadyHad, 1);
  assert.equal(fake.written[0].doc.stickerId, 'captain_clipboard_checkmark_seal');
  assert.deepEqual(fake.written[0].doc.createdAt, new Date('2026-11-03T10:00:00Z'), 'createdAt preserves the award time');

  // Second run: the written notification now exists, so nothing is written.
  fake.notifiedByUser.set(OTHER_ID, new Set(['captain_clipboard_checkmark_seal']));
  fake.written.length = 0;
  const second = await backfillMissingStickerNotifications(fake, {});
  assert.equal(second.notificationsWritten, 0);
});

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

function walkSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '__tests__') continue;
      walkSourceFiles(full, out);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

test('guard: no client file calls the deleted client unlock functions', () => {
  const root = path.join(process.cwd(), 'src');
  const files = walkSourceFiles(root);
  const offenders: string[] = [];
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    if (/unlockStickersForUser\s*\(/.test(text)) offenders.push(`${file}: unlockStickersForUser(`);
    if (/unlockStickerForUser\s*\(/.test(text)) offenders.push(`${file}: unlockStickerForUser(`);
    if (/unlockStarterPackForArchetype\s*\(/.test(text)) offenders.push(`${file}: unlockStarterPackForArchetype(`);
    if (/wasMissionSentBackForMoreProof\s*\(/.test(text)) offenders.push(`${file}: wasMissionSentBackForMoreProof(`);
  }
  assert.deepEqual(offenders, [], 'client unlock calls must be gone; awards go through POST /api/stickers/evaluate');
});

test('guard: the server evaluate import closure has no client Firebase SDK import', () => {
  const root = path.join(process.cwd(), 'src');
  const seen = new Set<string>();
  const queue = [path.join(root, 'server', 'stickerEvaluate.ts')];
  const closure: string[] = [];
  while (queue.length > 0) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    closure.push(file);
    const text = fs.readFileSync(file, 'utf8');
    for (const line of text.split('\n')) {
      // Type-only imports are erased at runtime — they cannot pull the
      // client SDK into the server bundle.
      if (/^\s*import\s+type\b/.test(line) || /^\s*export\s+type\b/.test(line)) continue;
      const match = line.match(/from\s+['"](\.[^'"]+)['"]/);
      if (!match) continue;
      const resolved = match[1];
      const base = path.resolve(path.dirname(file), resolved);
      for (const candidate of [`${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')]) {
        if (fs.existsSync(candidate)) queue.push(candidate);
      }
    }
  }
  assert.ok(closure.length > 3, `expected a real closure, got ${closure.join(', ')}`);
  const offenders = closure.filter(file => {
    const text = fs.readFileSync(file, 'utf8');
    return /from\s+['"]firebase\//.test(text);
  });
  assert.deepEqual(offenders, [], 'client firebase/ imports must not reach the server evaluate module');
});
