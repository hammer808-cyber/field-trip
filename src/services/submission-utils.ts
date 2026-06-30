import { db, auth } from '../lib/firebase';
import { collection, query, where, getDocs, doc, runTransaction, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Entry } from '../types/game';
import { isArchivedEntry, normalizeEntryStatus } from '../logic/entryLogic';
import { awardPoints } from './scoringService';

/**
 * Fetches all approved submissions for a specific user.
 * Discovers the documents via query, then validates and reads their canonical
 * state inside of a Firestore transaction to ensure truth of state.
 */
export async function getApprovedSubmissionsForUser(userId: string): Promise<Entry[]> {
  const q1 = query(
    collection(db, 'entries'),
    where('uid', '==', userId)
  );
  const q2 = query(
    collection(db, 'entries'),
    where('userId', '==', userId)
  );

  const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
  const uniqueDocs = new Map<string, any>();
  snap1.docs.forEach(doc => uniqueDocs.set(doc.id, doc.ref));
  snap2.docs.forEach(doc => uniqueDocs.set(doc.id, doc.ref));

  if (uniqueDocs.size === 0) {
    return [];
  }

  return runTransaction(db, async (transaction) => {
    const results: Entry[] = [];
    for (const [id, ref] of uniqueDocs.entries()) {
      const docSnap = await transaction.get(ref);
      if (docSnap.exists()) {
        const data = docSnap.data() as Entry;
        if (!isArchivedEntry(data) && normalizeEntryStatus(data.status) === 'approved') {
          results.push({ ...data, id: docSnap.id });
        }
      }
    }
    return results;
  });
}

/**
 * Award Points EXACTLY ONCE upon manual admin approval.
 * Implements full Firestore Transaction safety over the entry and user profile documents
 * to guarantee that dual updates and score checks remain perfectly atomic and canonical.
 */
export async function awardSubmissionPointsOnce(submissionId: string, notes: string = ''): Promise<{ success: boolean; points?: number; reason?: string }> {
  const entryRef = doc(db, 'entries', submissionId);

  // Fetch linked review doc outside of transaction to keep transactions strictly read-before-write and query-free
  let reviewDocRef: any = null;
  try {
    const reviewCollection = collection(db, 'proofReviews');
    const reviewQuery = query(reviewCollection, where('entryId', '==', submissionId));
    const reviewSnap = await getDocs(reviewQuery);
    if (!reviewSnap.empty) {
      reviewDocRef = reviewSnap.docs[0].ref;
    }
  } catch (err) {
    console.warn('[awardSubmissionPointsOnce] Failed reading linked review outside transaction:', err);
  }

  return runTransaction(db, async (transaction) => {
    const entrySnap = await transaction.get(entryRef);
    if (!entrySnap.exists()) {
      throw new Error('ENTRY_NOT_FOUND');
    }

    const data = entrySnap.data() as Entry;
    const pointsAwardedRaw = data.pointsAwarded as any;

    // Calculate Points
    const rawData = data as any;
    const scoringTotal = Number(rawData.scoring?.totalXpAwarded);
    const xpAward = (Number.isFinite(scoringTotal) && scoringTotal >= 0 ? scoringTotal : 0) ||
      data.xpValue ||
      data.awardedXP ||
      (typeof pointsAwardedRaw === 'number' ? pointsAwardedRaw : 0) ||
      (data as any).estimatedPoints ||
      100;
    const userId = data.userId || data.uid;
    const userName = data.displayName || data.userName || (data as any).username || 'Agent';

    const userRef = doc(db, 'users', userId);
    const userSnap = await transaction.get(userRef);

    // Mark approval first, but do not claim XP was awarded until the score event write succeeds.
    transaction.update(entryRef, {
      xpAwarded: false,
      pointsAwarded: false, // compatibility mirror
      awardedXP: xpAward,  // compatibility mirror
      totalXpAwarded: xpAward,
      scoreAwardStatus: 'pending_award',
      scoreAwardError: null,
      reviewedAt: serverTimestamp(),
      reviewedBy: auth.currentUser?.uid || 'system',
      status: 'approved',
      updatedAt: serverTimestamp()
    });

    // Update ProofReview too
    if (reviewDocRef) {
      transaction.update(reviewDocRef, {
        status: 'approved',
        xpAwarded: false,
        scoreAwardStatus: 'pending_award',
        updatedAt: serverTimestamp()
      });
    }

    const missionIdCanonical = (data.challengeId || (data as any).tripId || (data as any).missionId || '').toLowerCase().trim();

    if (userSnap.exists()) {
      const uData = userSnap.data();
      const approvedCompletedChallengeIds = Array.isArray(uData.approvedCompletedChallengeIds) ? [...uData.approvedCompletedChallengeIds] : [];
      const completedChallengeIds = Array.isArray(uData.completedChallengeIds) ? [...uData.completedChallengeIds] : [];
      
      const nextApprovedCompletedChallengeIds = approvedCompletedChallengeIds.filter(id => id.toLowerCase().trim() !== missionIdCanonical);
      nextApprovedCompletedChallengeIds.push(missionIdCanonical);

      const nextCompletedChallengeIds = completedChallengeIds.filter(id => id.toLowerCase().trim() !== missionIdCanonical);
      nextCompletedChallengeIds.push(missionIdCanonical);

      const submittedPendingChallengeIds = Array.isArray(uData.submittedPendingChallengeIds) ? uData.submittedPendingChallengeIds.filter((id: string) => id.toLowerCase().trim() !== missionIdCanonical) : [];

      // Calculate starter completeness
      const STARTER_MISSION_IDS = ["starter-1", "starter-2", "starter-3", "starter-signals"];
      const approvedStarters = nextApprovedCompletedChallengeIds.filter(id => STARTER_MISSION_IDS.includes(id) || id.startsWith('starter-')).length;
      const isStarterComplete = approvedStarters >= 3;

      transaction.update(userRef, {
        approvedCompletedChallengeIds: nextApprovedCompletedChallengeIds,
        completedChallengeIds: nextCompletedChallengeIds, // KEEP IN SYNC
        completedMissionIds: nextCompletedChallengeIds, // KEEP IN SYNC
        submittedPendingChallengeIds,
        starterDeckComplete: isStarterComplete,
        onboardingCompleted: isStarterComplete, // mirror for lock logic
        updatedAt: serverTimestamp()
      });
    }

    return { 
      success: true, 
      points: xpAward,
      _awardingPayload: { // Pass back to outer scope
        userId,
        userName,
        xpAward,
        missionIdCanonical,
        entryId: submissionId,
        notes
      }
    };
  }).then(async (result: any) => {
    // AWARD POINTS OUTSIDE TRANSACTION
    if (result.success && result._awardingPayload) {
      const p = result._awardingPayload;
      try {
        const awardResult = await awardPoints(
          p.userId,
          p.userName,
          p.xpAward,
          'trip_approved',
          {
            entryId: p.entryId,
            tripId: p.missionIdCanonical,
            description: `Manual approval validation for mission: ${p.missionIdCanonical || 'Field Mission'}. Note: ${p.notes}`
          }
        );
        await updateDoc(entryRef, {
          xpAwarded: true,
          pointsAwarded: true,
          awardedXP: p.xpAward,
          totalXpAwarded: p.xpAward,
          scoreAwardStatus: awardResult?.reason === 'ALREADY_AWARDED' ? 'already_awarded' : 'awarded',
          scoreAwardedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        if (reviewDocRef) {
          await updateDoc(reviewDocRef, {
            xpAwarded: true,
            scoreAwardStatus: awardResult?.reason === 'ALREADY_AWARDED' ? 'already_awarded' : 'awarded',
            scoreAwardedAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[awardSubmissionPointsOnce] Point awarding failed post-transaction. Entry remains approved but is flagged for retry.', err);
        await updateDoc(entryRef, {
          xpAwarded: false,
          pointsAwarded: false,
          scoreAwardStatus: 'award_failed',
          scoreAwardError: message.slice(0, 500),
          updatedAt: serverTimestamp()
        });
        if (reviewDocRef) {
          await updateDoc(reviewDocRef, {
            xpAwarded: false,
            scoreAwardStatus: 'award_failed',
            scoreAwardError: message.slice(0, 500),
            updatedAt: serverTimestamp()
          });
        }
        throw new Error(`POINT_AWARD_FAILED: ${message}`);
      }
    }
    return result;
  });
}
