/**
 * Repair a half-saved local-emulator submission so the player can continue
 * the authenticated walkthrough after the rules-invalid id update path failed.
 */
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { assertSafeToSeedLocalEmulator } from '../src/server/firebaseEmulatorGuard';
import { initializeServerFirebase } from '../src/server/firebaseAdmin';

async function main() {
  assertSafeToSeedLocalEmulator(process.env);
  const { db } = initializeServerFirebase();
  const playerEmail = process.env.LOCAL_EMULATOR_PLAYER_EMAIL || 'local-player@emulator.test';

  const users = await db.collection('users').where('email', '==', playerEmail).limit(1).get();
  if (users.empty) throw new Error(`Player not found: ${playerEmail}`);
  const userDoc = users.docs[0];
  const userId = userDoc.id;

  const entries = await db.collection('entries').where('userId', '==', userId).get();
  console.log(`Found ${entries.size} entries for ${userId}`);

  for (const entryDoc of entries.docs) {
    const entryId = entryDoc.id;
    const data = entryDoc.data() || {};
    await entryDoc.ref.set({
      id: entryId,
      entryId,
      status: 'pending_review',
      reviewStatus: 'pending_review',
      submissionStatus: 'pending_review',
      proofStatus: 'pending_review',
      submissionVersion: 'canonical-entry-v1',
      submissionValidatedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    const reviewId = `review_${entryId}`;
    await db.doc(`proofReviews/${reviewId}`).set({
      id: reviewId,
      reviewId,
      entryId,
      submissionId: entryId,
      userId,
      uid: userId,
      missionId: data.missionId || data.challengeId || data.tripId || null,
      challengeId: data.challengeId || data.missionId || data.tripId || null,
      tripId: data.tripId || data.missionId || null,
      deckId: data.deckId || 'starter-signals',
      status: 'pending_review',
      reviewStatus: 'pending_review',
      photoUrl: data.photoUrl || data.imageUrl || data.proofImage || null,
      imageUrl: data.imageUrl || data.photoUrl || data.proofImage || null,
      proofImage: data.proofImage || data.imageUrl || data.photoUrl || null,
      storagePath: data.storagePath || data.imageStoragePath || null,
      fieldNote: data.fieldNote || data.note || '',
      needsManualReview: true,
      createdAt: data.createdAt || Timestamp.now(),
      submittedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      version: 'local-emulator.repair-v1',
    }, { merge: true });

    console.log(JSON.stringify({ repairedEntryId: entryId, reviewId, missionId: data.missionId || data.challengeId }));
  }

  const missionIds = entries.docs
    .map((docSnap) => String(docSnap.data()?.missionId || docSnap.data()?.challengeId || '').toLowerCase())
    .filter(Boolean);

  await userDoc.ref.set({
    activeTrip: null,
    submittedPendingChallengeIds: FieldValue.arrayUnion(...missionIds),
    submittedChallengeIds: FieldValue.arrayUnion(...missionIds),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  console.log(JSON.stringify({ ok: true, userId, clearedActiveTrip: true, pendingMissionIds: missionIds }));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
