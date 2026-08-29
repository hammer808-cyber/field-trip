import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
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
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

let testEnv: RulesTestEnvironment;

function pendingEntryPayload(userId: string, overrides: Record<string, unknown> = {}) {
  return {
    userId,
    uid: userId,
    status: 'pending_review',
    reviewStatus: 'pending_review',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    fieldNote: 'A clear outdoor receipt for review.',
    deckId: 'starter-signals',
    missionId: 'starter-1',
    challengeId: 'starter-1',
    tripId: 'starter-1',
    ...overrides,
  };
}

test.before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'field-trip-proof-submission-rules',
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
    await setDoc(doc(db, 'users/player-a'), { accessStatus: 'approved', role: null });
    await setDoc(doc(db, 'users/player-b'), { accessStatus: 'approved', role: null });
    await setDoc(doc(db, 'users/admin-user'), { accessStatus: 'approved', role: 'admin', isAdmin: true });
    await setDoc(doc(db, 'entries/entry-a'), {
      ...pendingEntryPayload('player-a', {
        id: 'entry-a',
        entryId: 'entry-a',
        feedVisibility: 'private',
        showInCommunityFeed: false,
        isPublic: false,
      }),
      // Seeded docs use concrete timestamps; client creates use serverTimestamp().
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    await setDoc(doc(db, 'proofReviews/review_entry-a'), {
      userId: 'player-a',
      uid: 'player-a',
      entryId: 'entry-a',
      status: 'pending_review',
      reviewStatus: 'pending_review',
      fieldNote: 'Original note',
      photoUrl: 'https://example.test/original.jpg',
    });
    await setDoc(doc(db, 'proofChecks/check-a'), {
      userId: 'player-a',
      entryId: 'entry-a',
      status: 'pending_review',
    });
  });
});

test('approved player can create a predetermined-id pending entry and linked proofReview', async () => {
  const db = testEnv.authenticatedContext('player-a').firestore();
  const entryId = 'entry-new-1';
  const entryRef = doc(db, `entries/${entryId}`);
  await assertSucceeds(setDoc(entryRef, pendingEntryPayload('player-a', {
    id: entryId,
    entryId,
  })));

  await assertSucceeds(setDoc(doc(db, `proofReviews/review_${entryId}`), {
    userId: 'player-a',
    uid: 'player-a',
    entryId,
    submissionId: entryId,
    status: 'pending_review',
    reviewStatus: 'pending_review',
  }));

  const snap = await getDoc(entryRef);
  assert.equal(snap.exists(), true);
  assert.equal(snap.data()?.id, entryId);
  assert.equal(snap.data()?.entryId, entryId);
  assert.equal(snap.data()?.status, 'pending_review');
});

test('player cannot self-approve or write admin/AI scoring fields on their entry', async () => {
  const db = testEnv.authenticatedContext('player-a').firestore();
  await assertFails(updateDoc(doc(db, 'entries/entry-a'), {
    status: 'approved',
    reviewStatus: 'approved',
  }));
  await assertFails(updateDoc(doc(db, 'entries/entry-a'), {
    scoringSnapshot: { finalScore: 999 },
    finalScore: 999,
    bonusPoints: 50,
  }));
  await assertFails(updateDoc(doc(db, 'entries/entry-a'), {
    aiRiskScore: 0,
    proofTrustScore: 100,
    adminNotes: 'forged clearance',
  }));
  // Allowlisted pending status keys remain writable for the owner.
  await assertSucceeds(updateDoc(doc(db, 'entries/entry-a'), {
    status: 'pending_review',
    reviewStatus: 'pending_review',
    submissionStatus: 'pending_review',
    proofStatus: 'pending_review',
    updatedAt: Timestamp.now(),
  }));
});

test('player cannot read another users private proofReview, proofCheck, or private entry', async () => {
  const otherDb = testEnv.authenticatedContext('player-b').firestore();
  await assertFails(getDoc(doc(otherDb, 'proofReviews/review_entry-a')));
  await assertFails(getDoc(doc(otherDb, 'proofChecks/check-a')));
  await assertFails(getDoc(doc(otherDb, 'entries/entry-a')));

  const ownerDb = testEnv.authenticatedContext('player-a').firestore();
  await assertSucceeds(getDoc(doc(ownerDb, 'proofReviews/review_entry-a')));
  await assertSucceeds(getDoc(doc(ownerDb, 'proofChecks/check-a')));
  await assertSucceeds(getDoc(doc(ownerDb, 'entries/entry-a')));
});

test('missing entries, proofReviews, and proofChecks can be get without null resource throw', async () => {
  const db = testEnv.authenticatedContext('player-a').firestore();
  const missingEntry = await assertSucceeds(getDoc(doc(db, 'entries/does-not-exist')));
  const missingReview = await assertSucceeds(getDoc(doc(db, 'proofReviews/does-not-exist')));
  const missingCheck = await assertSucceeds(getDoc(doc(db, 'proofChecks/does-not-exist')));
  assert.equal(missingEntry.exists(), false);
  assert.equal(missingReview.exists(), false);
  assert.equal(missingCheck.exists(), false);
});

test('anonymous clients cannot probe missing entry documents', async () => {
  const anonDb = testEnv.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(anonDb, 'entries/does-not-exist')));
  await assertFails(getDoc(doc(anonDb, 'proofReviews/does-not-exist')));
  await assertFails(getDoc(doc(anonDb, 'proofChecks/does-not-exist')));
});

test('list queries remain owner/social/admin scoped and are not opened by the missing-get fix', async () => {
  const ownerDb = testEnv.authenticatedContext('player-a').firestore();
  const otherDb = testEnv.authenticatedContext('player-b').firestore();

  // Owner can list their own proofReviews via equality query.
  await assertSucceeds(getDocs(query(
    collection(ownerDb, 'proofReviews'),
    where('userId', '==', 'player-a'),
  )));

  // Other player cannot list another user's reviews even with a crafted query.
  await assertFails(getDocs(query(
    collection(otherDb, 'proofReviews'),
    where('userId', '==', 'player-a'),
  )));

  // Unfiltered entry list must not become world-readable.
  await assertFails(getDocs(collection(otherDb, 'entries')));
});

test('players cannot update existing proofReviews; repair must create a new review doc', async () => {
  const db = testEnv.authenticatedContext('player-a').firestore();
  await assertFails(setDoc(doc(db, 'proofReviews/review_entry-a'), {
    userId: 'player-a',
    entryId: 'entry-a',
    status: 'pending_review',
    photoUrl: 'https://example.test/replacement.jpg',
    fieldNote: 'Overwritten history',
  }, { merge: true }));

  await assertSucceeds(setDoc(doc(db, 'proofReviews/review_entry-a_repair'), {
    userId: 'player-a',
    uid: 'player-a',
    entryId: 'entry-a',
    status: 'pending_review',
    reviewStatus: 'pending_review',
    photoUrl: 'https://example.test/replacement.jpg',
    fieldNote: 'Additional proof',
  }));

  const original = await getDoc(doc(db, 'proofReviews/review_entry-a'));
  assert.equal(original.data()?.photoUrl, 'https://example.test/original.jpg');
  assert.equal(original.data()?.fieldNote, 'Original note');
});

test('gameService keeps predetermined entry ids and non-destructive proofReview writes', () => {
  const source = readFileSync('src/services/gameService.ts', 'utf8');
  assert.match(source, /entryRef = doc\(collection\(db, 'entries'\)\)/);
  assert.match(source, /await setDoc\(entryRef, \{ \.\.\.finalEntryData, id: entryId, entryId \}\)/);
  assert.doesNotMatch(source, /await updateDoc\(entryRef, \{ id: entryId, entryId: entryId \}/);
  assert.match(source, /review_\$\{entryId\}_\$\{timestamp\}/);
  assert.match(source, /Players may only patch a small allowlisted key set on entries/);

  const entryUpdateStart = source.indexOf('const entryUpdate: any = {');
  const entryUpdateEnd = source.indexOf('await updateDoc(doc(db, \'entries\', entryId), entryUpdate);', entryUpdateStart);
  assert.ok(entryUpdateStart > 0 && entryUpdateEnd > entryUpdateStart);
  const entryUpdateBlock = source.slice(entryUpdateStart, entryUpdateEnd);
  assert.match(entryUpdateBlock, /status: 'pending_review'/);
  assert.doesNotMatch(entryUpdateBlock, /aiRecommendation/);
  assert.doesNotMatch(entryUpdateBlock, /proofTrustScore/);
  assert.doesNotMatch(entryUpdateBlock, /scoringSnapshot/);
  assert.doesNotMatch(entryUpdateBlock, /adminNotes/);

  // AI/trust metadata belongs on proofReviews create payloads, not entry patches.
  assert.match(source, /aiRecommendation: review\.status \|\| 'pending_review'/);
  assert.match(source, /proofTrustScore: \(review as any\)\.proofTrustScore/);
});
