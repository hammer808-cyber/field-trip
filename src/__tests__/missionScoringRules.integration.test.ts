import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc, Timestamp, updateDoc } from 'firebase/firestore';

let testEnv: RulesTestEnvironment;

test.before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'field-trip-mission-scoring-rules',
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
    const now = Date.now();
    await setDoc(doc(db, 'users/player-a'), { accessStatus: 'approved', role: null });
    await setDoc(doc(db, 'users/player-b'), { accessStatus: 'approved', role: null });
    await setDoc(doc(db, 'users/admin-user'), { accessStatus: 'approved', role: 'admin', isAdmin: true });
    await setDoc(doc(db, 'missionAttempts/attempt-a'), {
      userId: 'player-a',
      missionId: 'mission-a',
      status: 'active',
      hintUsed: true,
      hintPenaltyPercent: 15,
      maxScoreBeforeHint: 100,
      maxScoreAfterHint: 85,
    });
    await setDoc(doc(db, 'bonusRotations/current'), {
      status: 'active',
      startsAt: Timestamp.fromMillis(now - 60_000),
      expiresAt: Timestamp.fromMillis(now + 60_000),
      selectedMissionIds: ['mission-a', 'mission-b', 'mission-c'],
    });
    await setDoc(doc(db, 'bonusRotations/future'), {
      status: 'active',
      startsAt: Timestamp.fromMillis(now + 120_000),
      expiresAt: Timestamp.fromMillis(now + 240_000),
      selectedMissionIds: ['future-a', 'future-b', 'future-c'],
    });
    await setDoc(doc(db, 'entries/entry-a'), {
      userId: 'player-a',
      status: 'pending_review',
      createdAt: Timestamp.fromMillis(now),
      missionAttemptId: 'attempt-a',
    });
    await setDoc(doc(db, 'proofReviews/review-a'), {
      userId: 'player-a',
      entryId: 'entry-a',
      status: 'pending_review',
    });
    await setDoc(doc(db, 'scoreEvents/score-entry-a'), {
      userId: 'player-a',
      sourceType: 'proof_approved',
      sourceId: 'entry-a',
      amount: 85,
    });
  });
});

test('owner can read persisted attempt but cannot reset or rewrite its hint state', async () => {
  const ownerDb = testEnv.authenticatedContext('player-a').firestore();
  const otherDb = testEnv.authenticatedContext('player-b').firestore();
  const attemptRef = doc(ownerDb, 'missionAttempts/attempt-a');
  await assertSucceeds(getDoc(attemptRef));
  await assertFails(getDoc(doc(otherDb, 'missionAttempts/attempt-a')));
  await assertFails(updateDoc(attemptRef, { hintUsed: false, maxScoreAfterHint: 100 }));
  await assertFails(setDoc(doc(ownerDb, 'missionAttempts/forged'), {
    userId: 'player-a', hintUsed: false, maxScoreBeforeHint: 225,
  }));
  await assertFails(deleteDoc(attemptRef));
});

test('normal and admin browser clients cannot alter server-owned bonus assignments', async () => {
  for (const uid of ['player-a', 'admin-user']) {
    const db = testEnv.authenticatedContext(uid).firestore();
    await assertSucceeds(getDoc(doc(db, 'bonusRotations/current')));
    await assertFails(updateDoc(doc(db, 'bonusRotations/current'), { selectedMissionIds: ['mission-a'] }));
    await assertFails(setDoc(doc(db, `bonusRotations/forged-${uid}`), {
      status: 'active', selectedMissionIds: ['mission-a'],
    }));
  }
});

test('future bonus assignments are not exposed to normal users', async () => {
  const playerDb = testEnv.authenticatedContext('player-a').firestore();
  const adminDb = testEnv.authenticatedContext('admin-user').firestore();
  await assertFails(getDoc(doc(playerDb, 'bonusRotations/future')));
  await assertSucceeds(getDoc(doc(adminDb, 'bonusRotations/future')));
});

test('players cannot write protected scoring fields to entries or reviews', async () => {
  const db = testEnv.authenticatedContext('player-a').firestore();
  await assertFails(updateDoc(doc(db, 'entries/entry-a'), {
    scoringSnapshot: { finalScore: 999 },
    finalScore: 999,
  }));
  await assertFails(setDoc(doc(db, 'entries/forged-entry'), {
    userId: 'player-a',
    status: 'pending_review',
    createdAt: Timestamp.now(),
    scoringSnapshot: { finalScore: 999 },
  }));
  await assertFails(setDoc(doc(db, 'proofReviews/forged-review'), {
    userId: 'player-a',
    entryId: 'entry-a',
    status: 'pending_review',
    scoringSnapshot: { finalScore: 999 },
  }));
});

test('no browser client can create score events or award XP', async () => {
  for (const uid of ['player-a', 'admin-user']) {
    const db = testEnv.authenticatedContext(uid).firestore();
    await assertFails(setDoc(doc(db, `scoreEvents/forged-${uid}`), {
      userId: uid,
      sourceType: 'client',
      sourceId: 'forged',
      amount: 999,
    }));
    await assertFails(updateDoc(doc(db, 'scoreEvents/score-entry-a'), { amount: 999 }));
  }
});
