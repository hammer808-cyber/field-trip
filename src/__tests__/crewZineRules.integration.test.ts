import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';

let testEnv: RulesTestEnvironment;

test.before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'field-trip-crew-zine-rules-test',
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
    await Promise.all([
      setDoc(doc(db, 'users/member-a'), { accessStatus: 'approved', activeCrewId: 'crew-a', crewId: 'crew-a' }),
      setDoc(doc(db, 'users/member-b'), { accessStatus: 'approved', activeCrewId: 'crew-a', crewId: 'crew-a' }),
      setDoc(doc(db, 'users/outsider'), { accessStatus: 'approved' }),
      setDoc(doc(db, 'users/former-member'), { accessStatus: 'approved' }),
      setDoc(doc(db, 'users/admin-user'), { accessStatus: 'approved', role: 'admin', isAdmin: true }),
      setDoc(doc(db, 'crews/crew-a'), { name: 'Crew A', status: 'active', captainId: 'member-a' }),
      setDoc(doc(db, 'crews/crew-b'), { name: 'Crew B', status: 'active', captainId: 'outsider' }),
      setDoc(doc(db, 'crews/crew-a/members/member-a'), { userId: 'member-a', crewId: 'crew-a', role: 'captain', status: 'active' }),
      setDoc(doc(db, 'crews/crew-a/members/member-b'), { userId: 'member-b', crewId: 'crew-a', role: 'member', status: 'active' }),
      setDoc(doc(db, 'crews/crew-a/members/former-member'), { userId: 'former-member', crewId: 'crew-a', role: 'member', status: 'left' }),
      setDoc(doc(db, 'crewSeasonZines/crew-a_season-1'), { kind: 'crew', crewId: 'crew-a', seasonId: 'season-1', status: 'draft' }),
      setDoc(doc(db, 'crewSeasonZines/crew-a_season-final'), { kind: 'crew', crewId: 'crew-a', seasonId: 'season-final', status: 'finalized', viewerUserIdsSnapshot: ['member-a', 'member-b', 'former-member'] }),
      setDoc(doc(db, 'personalZines/personal_member-a_season-1'), { kind: 'personal', ownerId: 'member-a', seasonId: 'season-1', status: 'draft' }),
      setDoc(doc(db, 'crewArchiveEntries/crew-a_entry-1'), { crewId: 'crew-a', ownerId: 'member-b', status: 'approved' }),
      setDoc(doc(db, 'personalArchiveEntries/member-a_entry-1'), { ownerId: 'member-a', status: 'approved' }),
      setDoc(doc(db, 'crewLore/crew-a'), { crewId: 'crew-a', insideJokes: [] }),
      setDoc(doc(db, 'crewArtifacts/artifact-1'), { crewId: 'crew-a', title: 'Receipt' }),
      setDoc(doc(db, 'crewDispatches/dispatch-1'), { crewId: 'crew-a', isUnlocked: true }),
      setDoc(doc(db, 'zineFinalizations/finalize_crew-a'), { crewId: 'crew-a', viewerUserIdsSnapshot: ['member-a', 'former-member'] }),
      setDoc(doc(db, 'zineFinalizations/finalize_personal-a'), { ownerId: 'member-a', viewerUserIdsSnapshot: ['member-a'] }),
      setDoc(doc(db, 'crewInvites/crew-a_outsider'), { crewId: 'crew-a', inviteeUserId: 'outsider', inviterId: 'member-a', status: 'pending' }),
      setDoc(doc(db, 'crewJoinRequests/crew-a_outsider'), { crewId: 'crew-a', userId: 'outsider', status: 'pending' }),
    ]);
  });
});

function authedDb(uid: string) {
  return testEnv.authenticatedContext(uid).firestore();
}

test('active Crew members can read their Crew workspace but outsiders cannot', async () => {
  const memberDb = authedDb('member-b');
  await assertSucceeds(getDoc(doc(memberDb, 'crewSeasonZines/crew-a_season-1')));
  await assertSucceeds(getDoc(doc(memberDb, 'crewArchiveEntries/crew-a_entry-1')));
  await assertSucceeds(getDoc(doc(memberDb, 'crewLore/crew-a')));
  await assertSucceeds(getDoc(doc(memberDb, 'crewArtifacts/artifact-1')));
  await assertSucceeds(getDoc(doc(memberDb, 'crewDispatches/dispatch-1')));

  const outsiderDb = authedDb('outsider');
  await assertFails(getDoc(doc(outsiderDb, 'crewSeasonZines/crew-a_season-1')));
  await assertFails(getDoc(doc(outsiderDb, 'crewArchiveEntries/crew-a_entry-1')));
  await assertFails(getDoc(doc(outsiderDb, 'crewLore/crew-a')));
});

test('personal Zines and archives are owner-only', async () => {
  await assertSucceeds(getDoc(doc(authedDb('member-a'), 'personalZines/personal_member-a_season-1')));
  await assertSucceeds(getDoc(doc(authedDb('member-a'), 'personalArchiveEntries/member-a_entry-1')));
  await assertFails(getDoc(doc(authedDb('member-b'), 'personalZines/personal_member-a_season-1')));
  await assertFails(getDoc(doc(authedDb('member-b'), 'personalArchiveEntries/member-a_entry-1')));
});

test('finalized Crew snapshots remain visible to captured former members without exposing drafts', async () => {
  const formerDb = authedDb('former-member');
  await assertFails(getDoc(doc(formerDb, 'crewSeasonZines/crew-a_season-1')));
  await assertSucceeds(getDoc(doc(formerDb, 'crewSeasonZines/crew-a_season-final')));
  await assertSucceeds(getDoc(doc(formerDb, 'zineFinalizations/finalize_crew-a')));
  await assertFails(getDoc(doc(authedDb('outsider'), 'zineFinalizations/finalize_crew-a')));
});

test('normal and admin browser clients cannot directly write Crew or Zine authority records', async () => {
  for (const uid of ['member-a', 'admin-user']) {
    const db = authedDb(uid);
    const writes = [
      setDoc(doc(db, 'crews/new-crew'), { captainId: uid, status: 'active' }),
      setDoc(doc(db, 'crews/crew-a/members/outsider'), { userId: 'outsider', status: 'active', role: 'captain' }),
      setDoc(doc(db, 'crewInvites/fake'), { crewId: 'crew-a', status: 'pending' }),
      setDoc(doc(db, 'crewJoinRequests/fake'), { crewId: 'crew-a', status: 'approved' }),
      setDoc(doc(db, 'crewInviteRedemptions/fake'), { userId: uid, crewId: 'crew-a' }),
      setDoc(doc(db, 'crewSeasonZines/crew-a_season-1'), { status: 'finalized' }, { merge: true }),
      setDoc(doc(db, 'personalZines/personal_member-a_season-1'), { status: 'finalized' }, { merge: true }),
      setDoc(doc(db, 'crewArchiveEntries/crew-a_entry-2'), { crewId: 'crew-a', status: 'approved' }),
      setDoc(doc(db, 'personalArchiveEntries/member-a_entry-2'), { ownerId: 'member-a', status: 'approved' }),
      setDoc(doc(db, 'zineFinalizations/fake'), { ownerId: uid }),
      setDoc(doc(db, 'zineAuditLogs/fake'), { actorId: uid }),
      setDoc(doc(db, 'crewLore/crew-a'), { insideJokes: ['forged'] }, { merge: true }),
      setDoc(doc(db, 'crewArtifacts/fake'), { crewId: 'crew-a' }),
      setDoc(doc(db, 'crewDispatches/fake'), { crewId: 'crew-a' }),
    ];
    for (const write of writes) await assertFails(write);
  }
  assert.ok(true);
});

test('users cannot self-assign protected Crew fields on their profile', async () => {
  await assertFails(setDoc(doc(authedDb('outsider'), 'users/outsider'), {
    accessStatus: 'approved',
    activeCrewId: 'crew-a',
    crewId: 'crew-a',
    crewRole: 'captain',
  }, { merge: true }));
});

