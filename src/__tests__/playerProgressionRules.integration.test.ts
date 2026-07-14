import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';
import { readFileSync } from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

let testEnv: RulesTestEnvironment;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'field-trip-player-progression-rules',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
  await testEnv.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await setDoc(doc(db, 'users/player-a'), {
      xp: 600,
      weeklyXp: 30,
      seasonXp: 200,
      level: 3,
      levelTitle: 'Junior Field Nuisance',
      progressionRewardIds: ['level-2-profile-stamp', 'level-3-field-sticker'],
      role: null,
    });
    await setDoc(doc(db, 'users/player-b'), { xp: 0, role: null });
    await setDoc(doc(db, 'users/admin-user'), { xp: 0, role: 'admin', isAdmin: true });
    await setDoc(doc(db, 'scoreEvents/xp-existing'), {
      userId: 'player-a', sourceType: 'proof_approved', sourceId: 'entry-1', amount: 100,
    });
    await setDoc(doc(db, 'levelUpEvents/level-existing'), {
      userId: 'player-a', fromLevel: 2, toLevel: 3, acknowledged: false,
    });
  });
});

after(async () => {
  await testEnv.cleanup();
});

test('players cannot directly change protected progression fields', async () => {
  const db = testEnv.authenticatedContext('player-a').firestore();
  for (const update of [
    { xp: 9999 },
    { totalXP: 9999 },
    { weeklyXp: 9999 },
    { seasonXp: 9999 },
    { level: 15 },
    { levelTitle: 'Local Folklore' },
    { progressionRewardIds: ['level-15-prestige-frame'] },
    { weeklyRank: 1 },
    { seasonRank: 1 },
  ]) {
    await assertFails(updateDoc(doc(db, 'users/player-a'), update));
  }
});

test('admin browser clients must also use server routes for progression writes', async () => {
  const db = testEnv.authenticatedContext('admin-user').firestore();
  await assertFails(updateDoc(doc(db, 'users/player-a'), { xp: 5000, level: 7 }));
  await assertFails(setDoc(doc(db, 'users/admin-seeded-player'), {
    xp: 5000,
    level: 7,
    levelTitle: 'Senior Receipt Collector',
    progressionRewardIds: [],
  }));
});

test('new profiles cannot seed XP, levels, rewards, or rank', async () => {
  const safeDb = testEnv.authenticatedContext('new-safe-player').firestore();
  await assertSucceeds(setDoc(doc(safeDb, 'users/new-safe-player'), {
    xp: 0,
    weeklyXp: 0,
    seasonXp: 0,
    level: 1,
    levelTitle: 'Person of Mild Interest',
    progressionRewardIds: [],
    equippedSkinId: 'classic',
    unlockedRewards: { skins: ['classic'] },
  }));

  const attackerDb = testEnv.authenticatedContext('new-attacker').firestore();
  await assertFails(setDoc(doc(attackerDb, 'users/new-attacker'), {
    xp: 22600,
    level: 15,
    levelTitle: 'Local Folklore',
    progressionRewardIds: ['level-15-prestige-frame'],
    weeklyRank: 1,
    equippedSkinId: 'classic',
    unlockedRewards: { skins: ['classic'] },
  }));
});

test('normal and admin clients cannot write XP ledger or level-up events', async () => {
  for (const userId of ['player-a', 'admin-user']) {
    const db = testEnv.authenticatedContext(userId).firestore();
    await assertFails(setDoc(doc(db, `scoreEvents/client-${userId}`), {
      userId: 'player-a', sourceType: 'client', sourceId: userId, amount: 500,
    }));
    await assertFails(setDoc(doc(db, `levelUpEvents/client-${userId}`), {
      userId: 'player-a', fromLevel: 1, toLevel: 15, acknowledged: false,
    }));
  }
});

test('a player can read only their own level-up event and cannot acknowledge it directly', async () => {
  const ownerDb = testEnv.authenticatedContext('player-a').firestore();
  const otherDb = testEnv.authenticatedContext('player-b').firestore();
  const eventRef = doc(ownerDb, 'levelUpEvents/level-existing');
  const event = await assertSucceeds(getDoc(eventRef));
  assert.equal(event.data()?.toLevel, 3);
  await assertFails(updateDoc(eventRef, { acknowledged: true }));
  await assertFails(getDoc(doc(otherDb, 'levelUpEvents/level-existing')));
});
