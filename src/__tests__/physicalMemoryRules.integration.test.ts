import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

let testEnv: RulesTestEnvironment;

test.before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'field-trip-physical-memory-rules-test',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});

test.after(async () => {
  await testEnv?.cleanup();
});

test.beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await setDoc(doc(db, 'users/agent-a'), {
      accessStatus: 'approved',
      xp: 40,
      earnedStickers: [{ id: 'camera_ready', earnedAt: '2026-07-01T00:00:00.000Z' }],
      stickerPlacements: [],
      proofStickerAssignments: {},
    });
    await setDoc(doc(db, 'users/agent-b'), {
      accessStatus: 'approved',
      xp: 10,
      stickerPlacements: [],
      proofStickerAssignments: {},
    });
  });
});

function authedDb(uid: string) {
  return testEnv.authenticatedContext(uid).firestore();
}

test('an owner can persist sticker placement and proof assignment preferences', async () => {
  const db = authedDb('agent-a');
  await assertSucceeds(updateDoc(doc(db, 'users/agent-a'), {
    stickerPlacements: [{
      stickerId: 'camera_ready',
      sheetId: 'mission_stickers',
      x: 32,
      y: 28,
      rotation: 4,
      scale: 1,
      zIndex: 2,
      placedAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-02T00:00:00.000Z',
    }],
    proofStickerAssignments: { 'entry-1': ['camera_ready'] },
  }));

  const profile = (await getDoc(doc(db, 'users/agent-a'))).data();
  assert.equal(profile?.stickerPlacements?.[0]?.x, 32);
  assert.deepEqual(profile?.proofStickerAssignments?.['entry-1'], ['camera_ready']);
  assert.deepEqual(profile?.earnedStickers, [{ id: 'camera_ready', earnedAt: '2026-07-01T00:00:00.000Z' }]);
  assert.equal(profile?.xp, 40);
});

test('a user cannot persist sticker preferences on another profile', async () => {
  const db = authedDb('agent-a');
  await assertFails(updateDoc(doc(db, 'users/agent-b'), {
    stickerPlacements: [{ stickerId: 'camera_ready', sheetId: 'recent_finds', x: 20, y: 20 }],
  }));
});

test('sticker preference writes cannot be combined with protected progression changes', async () => {
  const db = authedDb('agent-a');
  await assertFails(updateDoc(doc(db, 'users/agent-a'), {
    stickerPlacements: [],
    xp: 9999,
  }));
});
