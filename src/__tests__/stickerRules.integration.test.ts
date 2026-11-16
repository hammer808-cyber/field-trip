import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment
} from '@firebase/rules-unit-testing';
import {
  arrayUnion,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc
} from 'firebase/firestore';

const STICKER_ID = 'captain_clipboard_clipboard_character';
let testEnv: RulesTestEnvironment;

test.before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'field-trip-sticker-rules-test',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') }
  });
});

test.after(async () => {
  await testEnv?.cleanup();
});

test.beforeEach(async () => {
  await testEnv.clearFirestore();
});

function authedDb(uid: string) {
  return testEnv.authenticatedContext(uid).firestore();
}

function validUnlockData(stickerId = STICKER_ID) {
  return {
    stickerId,
    unlockedAt: serverTimestamp(),
    source: 'starter_pack:captainClipboard',
    trigger: 'starter_pack',
    seen: false,
    equipped: false
  };
}

test('a user can create and read a valid sticker unlock in their own collection', async () => {
  const db = authedDb('owner');
  const stickerRef = doc(db, 'users', 'owner', 'stickers', STICKER_ID);

  await assertSucceeds(setDoc(stickerRef, validUnlockData()));
  await assertSucceeds(getDoc(stickerRef));
});

test('a user cannot create an unknown sticker or alias a known sticker under another ID', async () => {
  const db = authedDb('owner');
  await assertFails(setDoc(
    doc(db, 'users', 'owner', 'stickers', 'unknown_sticker'),
    validUnlockData('unknown_sticker')
  ));
  await assertFails(setDoc(
    doc(db, 'users', 'owner', 'stickers', 'bigfoot_footprint'),
    validUnlockData(STICKER_ID)
  ));
});

test('a user cannot read or write another user sticker collection', async () => {
  await testEnv.withSecurityRulesDisabled(async context => {
    await setDoc(
      doc(context.firestore(), 'users', 'owner', 'stickers', STICKER_ID),
      {
        ...validUnlockData(),
        unlockedAt: new Date('2026-07-15T12:00:00.000Z')
      }
    );
  });

  const attackerDb = authedDb('attacker');
  const stickerRef = doc(attackerDb, 'users', 'owner', 'stickers', STICKER_ID);
  await assertFails(getDoc(stickerRef));
  await assertFails(setDoc(stickerRef, validUnlockData()));
});

test('owners can mark stickers seen and choose an equipped sticker without changing unlock metadata', async () => {
  const db = authedDb('owner');
  const stickerRef = doc(db, 'users', 'owner', 'stickers', STICKER_ID);
  await assertSucceeds(setDoc(stickerRef, validUnlockData()));
  await assertSucceeds(updateDoc(stickerRef, { seen: true }));
  await assertSucceeds(updateDoc(stickerRef, { equipped: true }));
  await assertFails(updateDoc(stickerRef, { source: 'rewritten-source' }));
  await assertFails(updateDoc(stickerRef, { trigger: 'admin_grant' }));
});

test('owners cannot mark a seen sticker unseen or delete unlock history', async () => {
  const db = authedDb('owner');
  const stickerRef = doc(db, 'users', 'owner', 'stickers', STICKER_ID);
  await assertSucceeds(setDoc(stickerRef, validUnlockData()));
  await assertSucceeds(updateDoc(stickerRef, { seen: true }));
  await assertFails(updateDoc(stickerRef, { seen: false }));
  await assertFails(deleteDoc(stickerRef));
});

// STAGE 2 (Nov 15, 2026) — legacy-spoof rejection case.
// Audit finding (docs/sticker-system-audit.md §3.2): the legacy users/{uid}
// sticker fields (unlockedRewards.stickers, earnedStickers,
// discoveryEvents, stickerUnlockHistory) were NOT in the rules' protected
// sets, so an owner could self-grant any legacy-visible sticker.
// firestore.rules now blocks non-admin writes to all four fields (plus
// completedDiscoveryGroups, the fifth field in the §3.2 list) on update,
// and requires them empty on self-create. Un-skipped as part of Stage 2.
// Emulator-only like the rest of this file.
test('owners cannot self-grant legacy sticker fields on their own profile', async () => {
  await testEnv.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'users', 'owner'), {
      unlockedRewards: { stickers: [], badges: [], skins: ['classic'] },
      earnedStickers: [],
      discoveryEvents: {},
      stickerUnlockHistory: [],
      completedDiscoveryGroups: []
    });
  });

  const db = authedDb('owner');
  const userRef = doc(db, 'users', 'owner');
  await assertFails(updateDoc(userRef, {
    'unlockedRewards.stickers': arrayUnion('bigfoot_night_silhouette')
  }));
  await assertFails(updateDoc(userRef, {
    earnedStickers: arrayUnion({
      id: 'bigfoot_night_silhouette',
      title: 'Night Silhouette',
      description: 'Self-granted',
      trigger: 'dex_open',
      earnedAt: new Date().toISOString(),
      source: 'console',
      seen: false
    })
  }));
  await assertFails(updateDoc(userRef, {
    'discoveryEvents.dex_open': true
  }));
  await assertFails(updateDoc(userRef, {
    stickerUnlockHistory: arrayUnion({
      stickerId: 'bigfoot_night_silhouette',
      discoveryKey: 'dex_open',
      unlockedAt: new Date().toISOString(),
      sourcePage: 'console'
    })
  }));
  await assertFails(updateDoc(userRef, {
    completedDiscoveryGroups: arrayUnion('dex-discovery')
  }));
});

test('owners cannot create a profile pre-populated with legacy sticker fields', async () => {
  const db = authedDb('owner');
  const userRef = doc(db, 'users', 'owner');
  const safeCreate = {
    xp: 0,
    totalXP: 0,
    weeklyXp: 0,
    weeklyXP: 0,
    seasonXp: 0,
    seasonXP: 0,
    points: 0,
    level: 1,
    levelTitle: 'Person of Mild Interest',
    progressionRewardIds: [],
    weeklyRank: null,
    seasonRank: null,
    comebackCardActive: false,
    isAdmin: false,
    role: 'player',
    equippedSkinId: 'classic',
    unlockedRewards: { stickers: [], badges: [], skins: ['classic'] },
    discoveryEvents: {},
    stickerUnlockHistory: [],
    earnedStickers: [],
    completedDiscoveryGroups: []
  };

  // Control: a clean self-create with empty legacy fields succeeds.
  await assertSucceeds(setDoc(userRef, safeCreate));
  await assertSucceeds(getDoc(userRef));

  // Each pre-populated legacy field is rejected on create. The attempts
  // use an 'owner2' context so the uid matches the target doc — otherwise
  // the write would fail for the wrong reason (wrong owner).
  const db2 = authedDb('owner2');
  await assertFails(setDoc(doc(db2, 'users', 'owner2'), {
    ...safeCreate,
    unlockedRewards: { stickers: ['bigfoot_night_silhouette'], badges: [], skins: ['classic'] }
  }));
  await assertFails(setDoc(doc(db2, 'users', 'owner2'), {
    ...safeCreate,
    earnedStickers: [{ id: 'bigfoot_night_silhouette', title: 'Night Silhouette' }]
  }));
  await assertFails(setDoc(doc(db2, 'users', 'owner2'), {
    ...safeCreate,
    discoveryEvents: { dex_open: true }
  }));
  await assertFails(setDoc(doc(db2, 'users', 'owner2'), {
    ...safeCreate,
    stickerUnlockHistory: [{ stickerId: 'bigfoot_night_silhouette', discoveryKey: 'dex_open' }]
  }));
});
