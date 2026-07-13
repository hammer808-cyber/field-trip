import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';

let testEnv: RulesTestEnvironment;

test.before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'field-trip-skin-rules-test',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});

test.after(async () => {
  await testEnv?.cleanup();
});

test.beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'skins/journal'), { status: 'active', name: 'Field Notebook' });
    await setDoc(doc(db, 'skins/arcade'), { status: 'active', name: 'Arcade Summer' });
    await setDoc(doc(db, 'skins/retired'), { status: 'archived', name: 'Retired' });
    await setDoc(doc(db, 'users/unlocked-user'), {
      accessStatus: 'approved',
      unlockedRewards: { skins: ['journal'] },
    });
    await setDoc(doc(db, 'users/locked-user'), {
      accessStatus: 'approved',
      unlockedRewards: { skins: [] },
    });
    await setDoc(doc(db, 'users/admin-user'), { role: 'admin', isAdmin: true });
    await setDoc(doc(db, 'appConfig/skinSettings'), { defaultSkinId: 'journal' });
  });
});

function authedDb(uid: string, token: Record<string, unknown> = {}) {
  return testEnv.authenticatedContext(uid, token).firestore();
}

test('signed-in users can read all skin manifest statuses for deterministic registry merging', async () => {
  const db = authedDb('locked-user');
  await assertSucceeds(getDoc(doc(db, 'skins/journal')));
  await assertSucceeds(getDoc(doc(db, 'skins/retired')));
});

test('the unauthenticated welcome shell can read presentation-only skin manifests', async () => {
  const db = testEnv.unauthenticatedContext().firestore();
  await assertSucceeds(getDoc(doc(db, 'skins/journal')));
});

test('normal clients cannot create or alter skin registry documents', async () => {
  const db = authedDb('unlocked-user');
  await assertFails(setDoc(doc(db, 'skins/custom'), { status: 'active' }));
  await assertFails(setDoc(doc(db, 'skins/journal'), { status: 'archived' }));
});

test('an unlocked user can persist an active skin and reset to classic', async () => {
  const db = authedDb('unlocked-user');
  await assertSucceeds(setDoc(doc(db, 'userPrefs/unlocked-user'), { selectedSkinId: 'journal' }));
  await assertSucceeds(setDoc(doc(db, 'userPrefs/unlocked-user'), { selectedSkinId: 'classic' }));
});

test('a user cannot persist a locked, unknown, or archived skin', async () => {
  const db = authedDb('locked-user');
  await assertFails(setDoc(doc(db, 'userPrefs/locked-user'), { selectedSkinId: 'arcade' }));
  await assertFails(setDoc(doc(db, 'userPrefs/locked-user'), { selectedSkinId: 'not-real' }));
  await assertFails(setDoc(doc(db, 'userPrefs/locked-user'), { selectedSkinId: 'retired' }));
});

test('a user can reset to the configured global default without a personal unlock', async () => {
  const db = authedDb('locked-user');
  await assertSucceeds(setDoc(doc(db, 'userPrefs/locked-user'), { selectedSkinId: 'journal' }));
});

test('users cannot write another user preference or inject unrelated fields', async () => {
  const db = authedDb('unlocked-user');
  await assertFails(setDoc(doc(db, 'userPrefs/locked-user'), { selectedSkinId: 'classic' }));
  await assertFails(setDoc(doc(db, 'userPrefs/unlocked-user'), {
    selectedSkinId: 'journal',
    isAdmin: true,
  }));
});

test('users cannot grant themselves legacy equipped-skin ownership', async () => {
  const db = authedDb('locked-user');
  await assertFails(setDoc(doc(db, 'users/locked-user'), {
    equippedSkinId: 'arcade',
  }, { merge: true }));
  await assertFails(setDoc(doc(db, 'users/locked-user'), {
    unlockedRewards: { skins: ['arcade'] },
  }, { merge: true }));
});

test('new profiles cannot self-seed restricted skin ownership', async () => {
  const db = authedDb('new-user');
  await assertSucceeds(setDoc(doc(db, 'users/new-user'), {
    equippedSkinId: 'classic',
    unlockedRewards: { skins: ['classic'] },
  }));
  const attackerDb = authedDb('attacker-user');
  await assertFails(setDoc(doc(attackerDb, 'users/attacker-user'), {
    equippedSkinId: 'journal',
    unlockedRewards: { skins: ['classic', 'journal'] },
  }));
});

test('admins can manage skins and assign preferences', async () => {
  const db = authedDb('admin-user');
  await assertSucceeds(setDoc(doc(db, 'skins/custom'), { status: 'preview', name: 'Custom' }));
  await assertSucceeds(setDoc(doc(db, 'userPrefs/locked-user'), { selectedSkinId: 'arcade' }));
});
