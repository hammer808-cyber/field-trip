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
    projectId: 'field-trip-weekly-voting-rules-test',
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
    await setDoc(doc(db, 'users/voter-1'), { accessStatus: 'approved' });
    await setDoc(doc(db, 'users/voter-2'), { accessStatus: 'approved' });
    await setDoc(doc(db, 'weeklyCatalysts/summer-fieldtrip_8'), {
      seasonId: 'summer-fieldtrip',
      weekNumber: 8,
      title: 'Week Eight Catalyst',
    });
    await setDoc(doc(db, 'votingCycles/2026-W29'), {
      id: '2026-W29',
      seasonId: 'summer-fieldtrip',
      status: 'voting_open',
    });
    await setDoc(doc(db, 'votingCycles/2026-W29/ballots/2026-W29_community_weekly'), {
      ballotId: '2026-W29_community_weekly',
      scope: 'community_weekly',
      status: 'open',
      eligibleProofIds: ['proof-1'],
    });
    await setDoc(doc(db, 'votingCycles/2026-W29/ballots/2026-W29_community_weekly/entries/proof-1'), {
      entryId: 'proof-1',
      userId: 'voter-2',
      isEligible: true,
      isDisqualified: false,
    });
    await setDoc(doc(db, 'votingCycles/2026-W29/ballots/2026-W29_community_weekly/votes/voter-1'), {
      voterId: 'voter-1',
      selectedProofIds: ['proof-1'],
    });
    await setDoc(doc(db, 'votingCycles/2026-W29/ballots/2026-W29_community_weekly/votes/voter-2'), {
      voterId: 'voter-2',
      selectedProofIds: ['proof-1'],
    });
  });
});

function authedDb(uid: string) {
  return testEnv.authenticatedContext(uid).firestore();
}

test('approved users can read the current Catalyst and canonical ballot nominees', async () => {
  const db = authedDb('voter-1');
  await assertSucceeds(getDoc(doc(db, 'weeklyCatalysts/summer-fieldtrip_8')));
  await assertSucceeds(getDoc(doc(db, 'votingCycles/2026-W29')));
  await assertSucceeds(getDoc(doc(db, 'votingCycles/2026-W29/ballots/2026-W29_community_weekly')));
  await assertSucceeds(getDoc(doc(db, 'votingCycles/2026-W29/ballots/2026-W29_community_weekly/entries/proof-1')));
});

test('normal clients cannot mutate Catalysts, cycles, ballots, nominees, votes, or results', async () => {
  const db = authedDb('voter-1');
  const writes = [
    setDoc(doc(db, 'weeklyCatalysts/summer-fieldtrip_8'), { title: 'tampered' }, { merge: true }),
    setDoc(doc(db, 'votingCycles/2026-W30'), { status: 'voting_open' }),
    setDoc(doc(db, 'votingCycles/2026-W29/ballots/fake'), { status: 'open' }),
    setDoc(doc(db, 'votingCycles/2026-W29/ballots/2026-W29_community_weekly/entries/proof-2'), { isEligible: true }),
    setDoc(doc(db, 'votingCycles/2026-W29/ballots/2026-W29_community_weekly/votes/voter-1'), { selectedProofIds: ['proof-2'] }, { merge: true }),
    setDoc(doc(db, 'votingCycles/2026-W29/results/2026-W29_community_weekly'), { isFinal: true }),
  ];
  for (const write of writes) await assertFails(write);
});

test('a voter can read only their own canonical vote document', async () => {
  const db = authedDb('voter-1');
  await assertSucceeds(getDoc(doc(db, 'votingCycles/2026-W29/ballots/2026-W29_community_weekly/votes/voter-1')));
  await assertFails(getDoc(doc(db, 'votingCycles/2026-W29/ballots/2026-W29_community_weekly/votes/voter-2')));
});

test('unauthenticated users cannot read the Catalyst or canonical ballot', async () => {
  const db = testEnv.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(db, 'weeklyCatalysts/summer-fieldtrip_8')));
  await assertFails(getDoc(doc(db, 'votingCycles/2026-W29/ballots/2026-W29_community_weekly')));
});
