import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';

let testEnv: RulesTestEnvironment;

test.before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'field-trip-495823-rules-test',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8')
    }
  });
});

test.after(async () => {
  await testEnv?.cleanup();
});

test.beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await setDoc(doc(db, 'users/tribunal-user'), { starterApprovedCount: 3, accessStatus: 'approved' });
    await setDoc(doc(db, 'users/locked-user'), { starterApprovedCount: 0, accessStatus: 'approved' });
    await setDoc(doc(db, 'users/admin-user'), { isAdmin: true, role: 'admin' });
    await setDoc(doc(db, 'tribunalCases/case-open'), {
      caseId: 'case-open',
      entryId: 'entry-1',
      targetUserId: 'target-1',
      targetId: 'target-1',
      status: 'open',
      seasonId: 'season-1',
      weekNumber: 1,
      title: 'Receipt',
      proofImage: 'https://example.test/proof.jpg',
      fieldNote: 'Field note',
      validVotes: 0,
      susVotes: 0,
      totalVotes: 0
    });
    await setDoc(doc(db, 'tribunalCases/case-admin-review'), {
      caseId: 'case-admin-review',
      entryId: 'entry-2',
      status: 'admin_review',
      title: 'Private case'
    });
    await setDoc(doc(db, 'tribunalCasePrivate/case-open'), {
      caseId: 'case-open',
      reporterIds: ['reporter-1'],
      sourceReportIds: ['report-1']
    });
    await setDoc(doc(db, 'tribunalResults/case-open'), {
      caseId: 'case-open',
      seasonId: 'season-1',
      weekNumber: 1,
      recommendationOnly: true,
      outcome: 'community_valid_recommendation'
    });
  });
});

function authedDb(uid: string, token: Record<string, any> = {}) {
  return testEnv.authenticatedContext(uid, token).firestore();
}

test('normal client auth cannot write protected Firelight collections', async () => {
  const db = authedDb('tribunal-user');
  const protectedWrites = [
    setDoc(doc(db, 'susReports/report-1'), { status: 'pending' }),
    setDoc(doc(db, 'susReportCounters/user-day'), { count: 1 }),
    setDoc(doc(db, 'susAbuseSignals/tribunal-user'), { totalReports: 1 }),
    setDoc(doc(db, 'tribunalCases/case-new'), { status: 'open' }),
    setDoc(doc(db, 'tribunalCasePrivate/case-new'), { reporterIds: ['user'] }),
    setDoc(doc(db, 'tribunalVotes/tribunal-user_case-open'), { userId: 'tribunal-user', caseId: 'case-open', vote: 'valid' }),
    setDoc(doc(db, 'tribunalVoteAudit/tribunal-user_case-open'), { userId: 'tribunal-user' }),
    setDoc(doc(db, 'tribunalResults/case-new'), { caseId: 'case-new' }),
    setDoc(doc(db, 'likes/entry-1_tribunal-user'), { entryId: 'entry-1', userId: 'tribunal-user' })
  ];
  for (const write of protectedWrites) {
    await assertFails(write);
  }
});

test('admin browser clients also cannot directly write server-owned Firelight collections', async () => {
  const db = authedDb('admin-user', { email: 'admin@example.test' });
  await assertFails(setDoc(doc(db, 'tribunalCases/admin-write'), { status: 'open' }));
  await assertFails(setDoc(doc(db, 'tribunalResults/admin-write'), { caseId: 'admin-write' }));
});

test('normal users cannot read tribunal private case documents', async () => {
  await assertFails(getDoc(doc(authedDb('tribunal-user'), 'tribunalCasePrivate/case-open')));
  await assertSucceeds(getDoc(doc(authedDb('admin-user', { email: 'admin@example.test' }), 'tribunalCasePrivate/case-open')));
});

test('public case reads only expose eligible open or closed cases', async () => {
  await assertSucceeds(getDoc(doc(authedDb('tribunal-user'), 'tribunalCases/case-open')));
  await assertFails(getDoc(doc(authedDb('tribunal-user'), 'tribunalCases/case-admin-review')));
  await assertFails(getDoc(doc(authedDb('locked-user'), 'tribunalCases/case-open')));
});

test('tribunalResults read requires Tribunal eligibility', async () => {
  await assertSucceeds(getDoc(doc(authedDb('tribunal-user'), 'tribunalResults/case-open')));
  await assertFails(getDoc(doc(authedDb('locked-user'), 'tribunalResults/case-open')));
});

test('catch-all rules do not create collection-group loopholes for private Firelight docs', async () => {
  const db = authedDb('tribunal-user');
  await assertFails(getDoc(doc(db, 'users/tribunal-user/tribunalCasePrivate/case-open')));
  await assertFails(setDoc(doc(db, 'users/tribunal-user/tribunalVotes/fake'), { vote: 'valid' }));
  assert.ok(true);
});
