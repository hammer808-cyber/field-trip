import assert from 'node:assert/strict';
import test from 'node:test';
import type { Entry } from '../constants';
import {
  LOTERIA_BOARDS,
  buildLoteriaPlayerPanel,
  getCompletedCardIdsForBoard,
  getRecentLoteriaMemories,
} from '../logic/loteriaExplore';

function entry(overrides: Partial<Entry>): Entry {
  return {
    id: overrides.id || 'entry-1',
    entryId: overrides.entryId || overrides.id || 'entry-1',
    uid: overrides.uid || 'user-1',
    userId: overrides.userId || 'user-1',
    displayName: null,
    username: null,
    challengeId: overrides.challengeId || 'starter-open-sign',
    deckId: overrides.deckId || 'starter-signals',
    status: overrides.status || 'approved',
    imageUrl: overrides.imageUrl || '',
    storagePath: overrides.storagePath ?? null,
    fieldNote: overrides.fieldNote || '',
    xpValue: overrides.xpValue || 0,
    xpAwarded: overrides.xpAwarded || false,
    createdAt: overrides.createdAt || { seconds: 1 },
    updatedAt: overrides.updatedAt || { seconds: 1 },
    ...overrides,
  } as Entry;
}

test('getCompletedCardIdsForBoard counts approved matching cards only', () => {
  const board = LOTERIA_BOARDS[0];
  const completed = getCompletedCardIdsForBoard([
    entry({ id: 'approved', challengeId: 'starter-open-sign', status: 'approved' }),
    entry({ id: 'pending', challengeId: 'starter-tiny-detail', status: 'pending_review' }),
    entry({ id: 'wrong-deck', challengeId: 'starter-color-pop', deckId: 'errand-deck', status: 'approved' }),
  ], board);

  assert.deepEqual([...completed], ['starter-open-sign']);
});

test('getRecentLoteriaMemories includes approved storage-backed proofs', () => {
  const memories = getRecentLoteriaMemories([
    entry({ id: 'storage-proof', imageUrl: '', storagePath: 'proofs/a.jpg', status: 'approved', createdAt: { seconds: 20 } }),
    entry({ id: 'rejected-proof', imageUrl: '/x.jpg', status: 'rejected', createdAt: { seconds: 30 } }),
  ]);

  assert.equal(memories.length, 1);
  assert.equal(memories[0].id, 'storage-proof');
});

test('buildLoteriaPlayerPanel normalizes missing profile and xp progress', () => {
  assert.deepEqual(buildLoteriaPlayerPanel({ xp: 1250 }), {
    displayName: 'Field Explorer',
    fieldTypeLabel: 'Urban Legend',
    levelLabel: 'LVL 2',
    xpProgressPercent: 25,
  });
});
