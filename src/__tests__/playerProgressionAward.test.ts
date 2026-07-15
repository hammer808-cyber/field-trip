import assert from 'node:assert/strict';
import test from 'node:test';
import {
  awardTrustedXpInTransaction,
  getLevelUpAcknowledgementError,
  isTrustedProofXpEligible,
} from '../server/playerProgression';

class FakeDocumentReference {
  constructor(public readonly path: string) {}
}

class FakeFirestore {
  readonly documents = new Map<string, Record<string, any>>();

  collection(collectionId: string) {
    return {
      doc: (documentId: string) => new FakeDocumentReference(`${collectionId}/${documentId}`),
    };
  }
}

class FakeTransaction {
  constructor(private readonly firestore: FakeFirestore) {}

  async get(reference: FakeDocumentReference) {
    const data = this.firestore.documents.get(reference.path);
    return { exists: data !== undefined, data: () => data };
  }

  create(reference: FakeDocumentReference, data: Record<string, any>) {
    if (this.firestore.documents.has(reference.path)) throw new Error('ALREADY_EXISTS');
    this.firestore.documents.set(reference.path, { ...data });
  }

  set(reference: FakeDocumentReference, data: Record<string, any>, options?: { merge?: boolean }) {
    const existing = this.firestore.documents.get(reference.path) || {};
    this.firestore.documents.set(reference.path, options?.merge ? { ...existing, ...data } : { ...data });
  }
}

test('an approved proof awards once and creates one multi-level event', async () => {
  const db = new FakeFirestore();
  db.documents.set('users/player-1', {
    name: 'Test Agent',
    xp: 249,
    weeklyXp: 10,
    seasonXp: 20,
    fieldType: 'mallRat',
    progressionRewardIds: [],
  });

  const input = {
    userId: 'player-1',
    sourceType: 'proof_approved',
    sourceId: 'entry-1',
    amount: 1551,
    ledgerEventId: 'score_entry-1',
    entryId: 'entry-1',
  };
  const first = await awardTrustedXpInTransaction({ db: db as any, transaction: new FakeTransaction(db) as any, input });
  const replay = await awardTrustedXpInTransaction({ db: db as any, transaction: new FakeTransaction(db) as any, input });

  assert.equal(first.awarded, true);
  assert.equal(first.fromLevel, 1);
  assert.equal(first.toLevel, 5);
  assert.deepEqual(first.unlockedLevels, [2, 3, 4, 5]);
  assert.equal(replay.awarded, false);
  assert.equal(replay.duplicate, true);
  assert.equal(db.documents.get('users/player-1')?.xp, 1800);
  assert.equal(db.documents.get('users/player-1')?.weeklyXp, 1561);
  assert.equal(db.documents.get('users/player-1')?.seasonXp, 1571);
  assert.equal([...db.documents.keys()].filter(path => path.startsWith('scoreEvents/')).length, 1);
  assert.equal([...db.documents.keys()].filter(path => path.startsWith('levelUpEvents/')).length, 1);
  assert.equal(db.documents.get('levelUpEvents/level_score_entry-1')?.acknowledged, false);
});

test('weekly and seasonal XP can remain separate from a lifetime-only trusted award', async () => {
  const db = new FakeFirestore();
  db.documents.set('users/player-1', { xp: 100, weeklyXp: 7, seasonXp: 11 });
  await awardTrustedXpInTransaction({
    db: db as any,
    transaction: new FakeTransaction(db) as any,
    input: {
      userId: 'player-1',
      sourceType: 'lifetime_adjustment',
      sourceId: 'adjustment-1',
      amount: 25,
      awardWeeklyXp: false,
      awardSeasonXp: false,
    },
  });
  assert.equal(db.documents.get('users/player-1')?.xp, 125);
  assert.equal(db.documents.get('users/player-1')?.weeklyXp, 7);
  assert.equal(db.documents.get('users/player-1')?.seasonXp, 11);
});

test('pending and rejected proof actions are never XP-eligible', () => {
  assert.equal(isTrustedProofXpEligible('approve', 'approved', 100), true);
  assert.equal(isTrustedProofXpEligible('approve', 'pending_review', 100), false);
  assert.equal(isTrustedProofXpEligible('reject', 'rejected', 100), false);
  assert.equal(isTrustedProofXpEligible('request_info', 'needs_more_proof', 100), false);
  assert.equal(isTrustedProofXpEligible('approve', 'approved', 0), false);
});

test('level-up acknowledgement requires the owning user and permits an acknowledged replay', () => {
  assert.equal(getLevelUpAcknowledgementError({ userId: 'player-1' }, 'player-2'), 'LEVEL_UP_EVENT_FORBIDDEN');
  assert.equal(getLevelUpAcknowledgementError({ userId: 'player-1', acknowledged: false }, 'player-1'), null);
  assert.equal(getLevelUpAcknowledgementError({ userId: 'player-1', acknowledged: true }, 'player-1'), null);
});

test('a missing level-up event resolves to not found before acknowledgement handling', () => {
  assert.equal(getLevelUpAcknowledgementError(null, 'player-1'), 'LEVEL_UP_EVENT_NOT_FOUND');
});
