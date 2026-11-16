import assert from 'node:assert/strict';
import test from 'node:test';
import {
  awardWeeklyWinnerStickers,
  getWeeklyWinnerAwardId,
  VICTORY_FLAG_WIN_THRESHOLD,
  WEEKLY_WINNER_CONFETTI_STICKER_ID,
  WEEKLY_WINNER_VICTORY_FLAG_STICKER_ID,
  type CanonicalStickerAwardStore
} from '../server/canonicalStickerAwards';

/** In-memory fake of the CanonicalStickerAwardStore, mirroring the Admin SDK adapter. */
class FakeCanonicalStore implements CanonicalStickerAwardStore {
  /** userId -> set of owned canonical sticker ids. */
  stickers: Record<string, Set<string>> = {};
  /** `${userId}:${stickerId}` -> ledger row. */
  ledger: Record<string, { userId: string; stickerId: string; eventId?: string | null }> = {};
  /** userId -> counted win cycle ids (one record per win). */
  wins: Record<string, Set<string>> = {};

  /** Seed a prior win: win record + confetti row (+ flag row when it was the 3rd+ win). */
  seedWin(userId: string, cycleId: string, withFlag = false): void {
    (this.wins[userId] ??= new Set()).add(cycleId);
    (this.stickers[userId] ??= new Set()).add(WEEKLY_WINNER_CONFETTI_STICKER_ID);
    this.ledger[getWeeklyWinnerAwardId(userId, WEEKLY_WINNER_CONFETTI_STICKER_ID)] = {
      userId,
      stickerId: WEEKLY_WINNER_CONFETTI_STICKER_ID,
      eventId: `weekly_winner_${cycleId}_${userId}`
    };
    if (withFlag) {
      this.stickers[userId].add(WEEKLY_WINNER_VICTORY_FLAG_STICKER_ID);
      this.ledger[getWeeklyWinnerAwardId(userId, WEEKLY_WINNER_VICTORY_FLAG_STICKER_ID)] = {
        userId,
        stickerId: WEEKLY_WINNER_VICTORY_FLAG_STICKER_ID,
        eventId: `weekly_winner_${cycleId}_${userId}_victory_flag`
      };
    }
  }

  winCount(userId: string): number {
    return this.wins[userId]?.size ?? 0;
  }

  async listWeeklyWins(userId: string): Promise<Array<{ cycleId: string }>> {
    return [...(this.wins[userId] ?? [])].map((cycleId) => ({ cycleId }));
  }

  async writeWeeklyWinnerAward(input: {
    userId: string;
    cycleId: string;
    entryId: string;
    scope: string;
    priorWins: number;
  }): Promise<{ awarded: string[] }> {
    const owned = this.stickers[input.userId] ?? new Set<string>();
    const wins = this.wins[input.userId] ?? new Set<string>();
    // This cycle was already counted (re-finalize): no-op.
    if (wins.has(input.cycleId)) return { awarded: [] };
    wins.add(input.cycleId);
    this.wins[input.userId] = wins;

    const awarded: string[] = [];
    const writeSticker = (stickerId: string) => {
      const ledgerId = getWeeklyWinnerAwardId(input.userId, stickerId);
      if (owned.has(stickerId) || this.ledger[ledgerId]) return;
      owned.add(stickerId);
      this.stickers[input.userId] = owned;
      this.ledger[ledgerId] = {
        userId: input.userId,
        stickerId,
        eventId: `weekly_winner_${input.cycleId}_${input.userId}`
      };
      awarded.push(stickerId);
    };
    writeSticker(WEEKLY_WINNER_CONFETTI_STICKER_ID);
    if (input.priorWins >= VICTORY_FLAG_WIN_THRESHOLD - 1) {
      writeSticker(WEEKLY_WINNER_VICTORY_FLAG_STICKER_ID);
    }
    return { awarded };
  }
}

test('a first weekly win awards the confetti sticker only', async () => {
  const store = new FakeCanonicalStore();
  const results = await awardWeeklyWinnerStickers(store, {
    cycleId: 'cycle-1',
    winners: [{ userId: 'user-1', entryId: 'entry-1', scope: 'community' }]
  });
  assert.deepEqual(results, [{ userId: 'user-1', awarded: [WEEKLY_WINNER_CONFETTI_STICKER_ID] }]);
  assert.equal(store.winCount('user-1'), 1);
});

test('a second weekly win awards nothing new (confetti already owned) but is counted', async () => {
  const store = new FakeCanonicalStore();
  store.seedWin('user-1', 'cycle-1');
  const results = await awardWeeklyWinnerStickers(store, {
    cycleId: 'cycle-2',
    winners: [{ userId: 'user-1', entryId: 'entry-2', scope: 'community' }]
  });
  assert.deepEqual(results, [{ userId: 'user-1', awarded: [] }]);
  assert.equal(store.winCount('user-1'), 2);
});

test('the 3rd cumulative weekly win awards the victory flag', async () => {
  assert.equal(VICTORY_FLAG_WIN_THRESHOLD, 3);
  const store = new FakeCanonicalStore();
  store.seedWin('user-1', 'cycle-1');
  store.seedWin('user-1', 'cycle-2');
  const results = await awardWeeklyWinnerStickers(store, {
    cycleId: 'cycle-3',
    winners: [{ userId: 'user-1', entryId: 'entry-3', scope: 'community' }]
  });
  assert.deepEqual(results, [{ userId: 'user-1', awarded: [WEEKLY_WINNER_VICTORY_FLAG_STICKER_ID] }]);
  assert.equal(store.winCount('user-1'), 3);
});

test('a 4th win awards nothing new and is counted', async () => {
  const store = new FakeCanonicalStore();
  store.seedWin('user-1', 'cycle-1');
  store.seedWin('user-1', 'cycle-2');
  store.seedWin('user-1', 'cycle-3', true);
  const results = await awardWeeklyWinnerStickers(store, {
    cycleId: 'cycle-4',
    winners: [{ userId: 'user-1', entryId: 'entry-4', scope: 'community' }]
  });
  assert.deepEqual(results, [{ userId: 'user-1', awarded: [] }]);
  assert.equal(store.winCount('user-1'), 4);
});

test('re-finalize of the same cycle is a no-op and does not double-count the win', async () => {
  const store = new FakeCanonicalStore();
  const winners = [{ userId: 'user-1', entryId: 'entry-1', scope: 'community' }];
  const first = await awardWeeklyWinnerStickers(store, { cycleId: 'cycle-1', winners });
  assert.deepEqual(first[0].awarded, [WEEKLY_WINNER_CONFETTI_STICKER_ID]);
  assert.equal(store.winCount('user-1'), 1);
  const second = await awardWeeklyWinnerStickers(store, { cycleId: 'cycle-1', winners });
  assert.deepEqual(second, [{ userId: 'user-1', awarded: [] }]);
  assert.equal(store.winCount('user-1'), 1);
});

test('re-finalize of an older cycle does not double-count it toward the flag', async () => {
  const store = new FakeCanonicalStore();
  store.seedWin('user-1', 'cycle-1');
  store.seedWin('user-1', 'cycle-2');
  const replay = await awardWeeklyWinnerStickers(store, {
    cycleId: 'cycle-1',
    winners: [{ userId: 'user-1', entryId: 'entry-1', scope: 'community' }]
  });
  assert.deepEqual(replay, [{ userId: 'user-1', awarded: [] }]);
  assert.equal(store.winCount('user-1'), 2);
  // The next real win is still only the 3rd — and it awards the flag.
  const third = await awardWeeklyWinnerStickers(store, {
    cycleId: 'cycle-3',
    winners: [{ userId: 'user-1', entryId: 'entry-3', scope: 'community' }]
  });
  assert.deepEqual(third, [{ userId: 'user-1', awarded: [WEEKLY_WINNER_VICTORY_FLAG_STICKER_ID] }]);
  assert.equal(store.winCount('user-1'), 3);
});

test('one user winning two ballots in one finalize counts as one win', async () => {
  const store = new FakeCanonicalStore();
  store.seedWin('user-1', 'cycle-1');
  store.seedWin('user-1', 'cycle-2');
  const results = await awardWeeklyWinnerStickers(store, {
    cycleId: 'cycle-3',
    winners: [
      { userId: 'user-1', entryId: 'entry-a', scope: 'community' },
      { userId: 'user-1', entryId: 'entry-b', scope: 'crew-1' }
    ]
  });
  assert.equal(results.length, 1);
  assert.deepEqual(results[0].awarded, [WEEKLY_WINNER_VICTORY_FLAG_STICKER_ID]);
  assert.equal(store.winCount('user-1'), 3);
});

test('multiple distinct winners each get the confetti sticker', async () => {
  const store = new FakeCanonicalStore();
  const results = await awardWeeklyWinnerStickers(store, {
    cycleId: 'cycle-1',
    winners: [
      { userId: 'user-1', entryId: 'entry-1', scope: 'community' },
      { userId: 'user-2', entryId: 'entry-2', scope: 'crew-1' }
    ]
  });
  assert.deepEqual(results, [
    { userId: 'user-1', awarded: [WEEKLY_WINNER_CONFETTI_STICKER_ID] },
    { userId: 'user-2', awarded: [WEEKLY_WINNER_CONFETTI_STICKER_ID] }
  ]);
});

test('a winner with no userId is skipped', async () => {
  const store = new FakeCanonicalStore();
  const results = await awardWeeklyWinnerStickers(store, {
    cycleId: 'cycle-1',
    winners: [
      { userId: '', entryId: 'entry-1', scope: 'community' },
      { userId: 'user-2', entryId: 'entry-2', scope: 'community' }
    ]
  });
  assert.deepEqual(results, [{ userId: 'user-2', awarded: [WEEKLY_WINNER_CONFETTI_STICKER_ID] }]);
});
