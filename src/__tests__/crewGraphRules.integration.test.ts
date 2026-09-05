import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { getCrewConnectionId } from '../logic/crewGraph';

let testEnv: RulesTestEnvironment;

function approvedEntry(ownerId: string, overrides: Record<string, unknown> = {}) {
  return {
    userId: ownerId,
    uid: ownerId,
    status: 'approved',
    feedVisibility: 'crew_only',
    photoUrl: 'https://example.com/proof.jpg',
    approvedAt: '2026-08-01T00:00:00.000Z',
    createdAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

async function seed() {
  await testEnv.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await setDoc(doc(db, 'users/player-a'), { accessStatus: 'approved', username: 'sociala', email: 'a@example.test', xp: 10 });
    await setDoc(doc(db, 'users/player-b'), { accessStatus: 'approved', username: 'socialb', email: 'b@example.test', xp: 20 });
    await setDoc(doc(db, 'users/player-c'), { accessStatus: 'approved', username: 'socialc', email: 'c@example.test', xp: 30, activeCrewId: 'company-1' });
    await setDoc(doc(db, 'users/player-d'), { accessStatus: 'approved', username: 'sociald', email: 'd@example.test', xp: 40 });
    await setDoc(doc(db, 'users/player-e'), { accessStatus: 'approved', username: 'sociale', email: 'e@example.test', xp: 50 });
    await setDoc(doc(db, 'users/admin-user'), { accessStatus: 'approved', role: 'admin', isAdmin: true });
    await setDoc(doc(db, 'admins/admin-user'), { role: 'admin' });
    await setDoc(doc(db, 'crews/company-1'), { name: 'Company', captainId: 'player-c', founderId: 'player-c', status: 'active' });
    await setDoc(doc(db, 'crews/company-1/members/player-c'), { userId: 'player-c', status: 'active', role: 'captain' });
    await setDoc(doc(db, `crewConnections/${getCrewConnectionId('player-a', 'player-c')}`), {
      userLow: 'player-a',
      userHigh: 'player-c',
      participants: ['player-a', 'player-c'],
      requesterId: 'player-a',
      addresseeId: 'player-c',
      status: 'accepted',
    });
    await setDoc(doc(db, `crewConnections/${getCrewConnectionId('player-a', 'player-d')}`), {
      userLow: 'player-a',
      userHigh: 'player-d',
      participants: ['player-a', 'player-d'],
      requesterId: 'player-d',
      addresseeId: 'player-a',
      status: 'pending',
    });
    await setDoc(doc(db, 'users/player-a/blocks/player-e'), { userId: 'player-a', blockedUserId: 'player-e' });
    await setDoc(doc(db, 'entries/own-a'), approvedEntry('player-a'));
    await setDoc(doc(db, 'entries/crew-c'), approvedEntry('player-c'));
    await setDoc(doc(db, 'entries/unrelated-b'), approvedEntry('player-b'));
    await setDoc(doc(db, 'entries/pending-d'), approvedEntry('player-d'));
    await setDoc(doc(db, 'entries/blocked-e'), approvedEntry('player-e'));
    await setDoc(doc(db, 'entries/public-b'), approvedEntry('player-b', { feedVisibility: 'public_discovery' }));
    await setDoc(doc(db, 'entries/private-c'), approvedEntry('player-c', { feedVisibility: 'private' }));
    await setDoc(doc(db, 'usernames/socialb'), { userId: 'player-b', createdAt: new Date('2026-08-01T00:00:00.000Z') });
    await setDoc(doc(db, 'usernames/socialc'), { userId: 'player-c', createdAt: new Date('2026-08-01T00:00:00.000Z') });
  });
}

test.before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'field-trip-crew-graph-rules',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});

test.after(async () => {
  await testEnv?.cleanup();
});

test.beforeEach(async () => {
  await testEnv.clearFirestore();
  await seed();
});

function authedDb(uid: string, token: Record<string, unknown> = {}) {
  return testEnv.authenticatedContext(uid, token).firestore();
}

test('a player can read their own profile and cannot list every user', async () => {
  const db = authedDb('player-a');
  await assertSucceeds(getDoc(doc(db, 'users/player-a')));
  await assertFails(getDoc(doc(db, 'users/player-b')));
  await assertFails(getDocs(collection(db, 'users')));
});

test('admin can still list users', async () => {
  const db = authedDb('admin-user', { email: 'admin@example.test' });
  const snap = await assertSucceeds(getDocs(collection(db, 'users')));
  assert.ok(snap.size >= 5);
});

test('username get works, username directory list does not', async () => {
  const db = authedDb('player-a');
  await assertSucceeds(getDoc(doc(db, 'usernames/socialb')));
  await assertFails(getDocs(collection(db, 'usernames')));
});

test('player can read own entries and accepted Crew entries, not unrelated private ones', async () => {
  const db = authedDb('player-a');
  await assertSucceeds(getDoc(doc(db, 'entries/own-a')));
  await assertSucceeds(getDoc(doc(db, 'entries/crew-c')));
  await assertFails(getDoc(doc(db, 'entries/unrelated-b')));
  await assertFails(getDoc(doc(db, 'entries/pending-d')));
  await assertFails(getDoc(doc(db, 'entries/blocked-e')));
  await assertFails(getDoc(doc(db, 'entries/private-c')));
});

test('pending request does not grant Crew-only entry access', async () => {
  const db = authedDb('player-a');
  await assertFails(getDoc(doc(db, 'entries/pending-d')));
  const dDb = authedDb('player-d');
  await assertFails(getDoc(doc(dDb, 'entries/own-a')));
});

test('explicit public discovery remains readable without a Crew relationship', async () => {
  const db = authedDb('player-a');
  await assertSucceeds(getDoc(doc(db, 'entries/public-b')));
});

test('list queries cannot bypass document-level restrictions', async () => {
  const db = authedDb('player-a');
  const own = await assertSucceeds(getDocs(query(
    collection(db, 'entries'),
    where('status', '==', 'approved'),
    where('userId', '==', 'player-a'),
  )));
  assert.deepEqual(own.docs.map(item => item.id), ['own-a']);

  const crew = await assertSucceeds(getDocs(query(
    collection(db, 'entries'),
    where('status', '==', 'approved'),
    where('userId', '==', 'player-c'),
    where('feedVisibility', '==', 'crew_only'),
  )));
  assert.deepEqual(crew.docs.map(item => item.id), ['crew-c']);

  const publicDiscovery = await assertSucceeds(getDocs(query(
    collection(db, 'entries'),
    where('status', '==', 'approved'),
    where('feedVisibility', '==', 'public_discovery'),
  )));
  assert.deepEqual(publicDiscovery.docs.map(item => item.id), ['public-b']);

  await assertFails(getDocs(query(
    collection(db, 'entries'),
    where('status', '==', 'approved'),
  )));
});

test('removed Crew relationship removes Crew-only access', async () => {
  await testEnv.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), `crewConnections/${getCrewConnectionId('player-a', 'player-c')}`), {
      userLow: 'player-a',
      userHigh: 'player-c',
      participants: ['player-a', 'player-c'],
      requesterId: 'player-a',
      addresseeId: 'player-c',
      status: 'removed',
    });
  });
  const db = authedDb('player-a');
  await assertFails(getDoc(doc(db, 'entries/crew-c')));
});

test('blocked relationship does not grant Crew-only access', async () => {
  const db = authedDb('player-e');
  await assertFails(getDoc(doc(db, 'entries/own-a')));
  const aDb = authedDb('player-a');
  await assertFails(getDoc(doc(aDb, 'entries/blocked-e')));
});

test('Crew connection documents are readable only by participants and are not client-writable', async () => {
  const aDb = authedDb('player-a');
  const bDb = authedDb('player-b');
  await assertSucceeds(getDoc(doc(aDb, `crewConnections/${getCrewConnectionId('player-a', 'player-c')}`)));
  await assertFails(getDoc(doc(bDb, `crewConnections/${getCrewConnectionId('player-a', 'player-c')}`)));
  await assertFails(setDoc(doc(aDb, `crewConnections/${getCrewConnectionId('player-a', 'player-b')}`), {
    participants: ['player-a', 'player-b'],
    status: 'accepted',
  }));
});

test('admin can still read another player private entry', async () => {
  const db = authedDb('admin-user', { email: 'admin@example.test' });
  await assertSucceeds(getDoc(doc(db, 'entries/unrelated-b')));
  await assertSucceeds(getDoc(doc(db, 'entries/private-c')));
});
