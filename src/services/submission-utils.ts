import { db, auth } from '../lib/firebase';
import { collection, query, where, getDocs, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { Entry } from '../types/game';
import { normalizeEntryStatus } from '../logic/entryLogic';
import { awardPoints } from './scoringService';
import { resolveXPFields } from '../utils/canonicalEntry';
import { getCanonicalStarterMissionIds, STARTER_REQUIRED_APPROVALS } from '../utils/starterProgress';

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
        if (normalizeEntryStatus(data.status) === 'approved') {
          results.push({ ...data, id: docSnap.id });
        }
      }
    }
    return results;
  });
}

export async function awardSubmissionPointsOnce(submissionId: string, notes: string = ''): Promise<{ success: boolean; points?: number; reason?: string }> {
  const entryRef = doc(db, 'entries', submissionId);

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
    const resolvedXP = resolveXPFields(data);
    if (resolvedXP.xpAwarded || resolvedXP.awardedXP > 0) {
      return { success: false, reason: 'ALREADY_AWARDED', points: resolvedXP.awardedXP || resolvedXP.legacyPoints };
    }

    const xpAward = resolvedXP.estimatedXP || data.xpValue || data.awardedXP || (data as any).estimatedPoints || 100;
    const userId = data.userId || data.uid;
    const userName = data.displayName || data.userName || (data as any).username || 'Agent';

    const userRef = doc(db, 'users', userId);
    const userSnap = await transaction.get(userRef);

    transaction.update(entryRef, {
      xpAwarded: true,
      awardedXP: xpAward,
      pointsAwarded: true,
      awardedPoints: xpAward,
      reviewedAt: serverTimestamp(),
      reviewedBy: auth.currentUser?.uid || 'system',
      status: 'approved',
      updatedAt: serverTimestamp()
    });

    if (reviewDocRef) {
      transaction.update(reviewDocRef, {
        status: 'approved',
        xpAwarded: true,
        awardedXP: xpAward,
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
      const starterMissionIds = getCanonicalStarterMissionIds();
      const approvedStarters = new Set(
        nextApprovedCompletedChallengeIds
          .map(id => id.toLowerCase().trim())
          .filter(id => starterMissionIds.includes(id))
      );
      const isStarterComplete = approvedStarters.size >= STARTER_REQUIRED_APPROVALS;

      transaction.update(userRef, {
        approvedCompletedChallengeIds: nextApprovedCompletedChallengeIds,
        completedChallengeIds: nextCompletedChallengeIds,
        completedMissionIds: nextCompletedChallengeIds,
        submittedPendingChallengeIds,
        starterDeckComplete: isStarterComplete,
        onboardingCompleted: isStarterComplete,
        updatedAt: serverTimestamp()
      });
    }

    return { 
      success: true, 
      points: xpAward,
      _awardingPayload: {
        userId,
        userName,
        xpAward,
        missionIdCanonical,
        entryId: submissionId,
        notes
      }
    };
  }).then(async (result: any) => {
    if (result.success && result._awardingPayload) {
      const p = result._awardingPayload;
      try {
        await awardPoints(
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
      } catch (err) {
        console.error('[awardSubmissionPointsOnce] XP award failed after entry update. Entry is approved and the operation can be retried safely.', err);
      }
    }
    return result;
  });
}
