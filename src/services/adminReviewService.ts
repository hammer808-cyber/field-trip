import { arrayRemove, arrayUnion, doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { normalizeEntryStatus, resolveEntryMissionId, resolveEntryUserId, resolveXPFields } from '../utils/canonicalEntry';
import { awardSubmissionPointsOnce } from './submission-utils';
import { logAdminAction } from './moderationService';

export type AdminReviewVerdict = 'approved' | 'needs_more_proof' | 'rejected';

export interface ReviewSubmissionResult {
  success: boolean;
  status: AdminReviewVerdict;
  previousStatus: string;
  points?: number;
  reason?: string;
}

const ENTRIES_COLLECTION = 'entries';
const REVIEWS_COLLECTION = 'proofReviews';
const USERS_COLLECTION = 'users';

function cleanMissionId(entry: Record<string, any>): string {
  return resolveEntryMissionId(entry) || '';
}

function getUserName(entry: Record<string, any>): string {
  return entry.displayName || entry.userName || entry.username || 'Agent';
}

export async function reviewSubmission(
  entryId: string,
  verdict: AdminReviewVerdict,
  notes: string = ''
): Promise<ReviewSubmissionResult> {
  const entryRef = doc(db, ENTRIES_COLLECTION, entryId);
  const entrySnap = await getDoc(entryRef);

  if (!entrySnap.exists()) {
    throw new Error('ENTRY_NOT_FOUND: The specified entry could not be located.');
  }

  const entry = { id: entrySnap.id, ...entrySnap.data() } as Record<string, any>;
  const previousStatus = normalizeEntryStatus(entry.status);
  const userId = resolveEntryUserId(entry);
  const missionId = cleanMissionId(entry);
  const reviewNotes = notes || `Manual admin review: ${verdict}`;
  const now = serverTimestamp();
  const resolvedXP = resolveXPFields(entry);
  const estimatedXP = resolvedXP.estimatedXP || entry.xpValue || entry.estimatedPoints || 100;

  const entryUpdates: Record<string, any> = {
    status: verdict,
    reviewStatus: verdict,
    adminNotes: reviewNotes,
    reviewNotes,
    reviewedBy: auth.currentUser?.uid || 'admin-system',
    reviewerId: auth.currentUser?.uid || 'admin-system',
    reviewedAt: now,
    updatedAt: now
  };

  if (verdict === 'approved') {
    entryUpdates.showInUserLogbook = true;
    entryUpdates.showInCommunityFeed = true;
    entryUpdates.isPublic = true;
    entryUpdates.communityVisible = true;
    entryUpdates.approvedAt = now;
    entryUpdates.awardedXP = resolvedXP.awardedXP || estimatedXP;
    entryUpdates.awardedPoints = resolvedXP.awardedXP || estimatedXP;
    entryUpdates.xpAwarded = resolvedXP.xpAwarded;
    entryUpdates.pointsAwarded = resolvedXP.xpAwarded;
  }

  if (verdict === 'needs_more_proof') {
    entryUpdates.xpAwarded = false;
    entryUpdates.pointsAwarded = false;
  }

  if (verdict === 'rejected') {
    entryUpdates.xpAwarded = false;
    entryUpdates.pointsAwarded = false;
    entryUpdates.rejectionReason = reviewNotes;
    entryUpdates.rejectedAt = now;
    entryUpdates.retryAvailable = true;
    entryUpdates.retryPointMultiplier = entry.retryPointMultiplier || 0.5;
  }

  await updateDoc(entryRef, entryUpdates);

  const reviewRef = doc(db, REVIEWS_COLLECTION, entryId);
  await setDoc(reviewRef, {
    id: entryId,
    reviewId: entryId,
    entryId,
    userId,
    userName: getUserName(entry),
    missionId,
    challengeId: missionId,
    deckId: entry.deckId || 'starter-signals',
    status: verdict,
    reviewStatus: verdict,
    reviewNotes,
    confidenceScore: entry.confidenceScore || 100,
    manualOverride: true,
    reviewedBy: auth.currentUser?.uid || 'admin-system',
    reviewedAt: now,
    updatedAt: now,
    createdAt: entry.createdAt || now,
    photoUrl: entry.photoUrl || entry.imageUrl || entry.proofImage || '',
    imageUrl: entry.imageUrl || entry.photoUrl || entry.proofImage || '',
    storagePath: entry.storagePath || entry.photoStoragePath || entry.imageStoragePath || null,
    fieldNote: entry.fieldNote || entry.note || '',
    xpAwarded: verdict === 'approved' ? resolvedXP.xpAwarded : false,
    awardedXP: verdict === 'approved' ? resolvedXP.awardedXP : 0
  }, { merge: true });

  if (userId && missionId && verdict !== 'approved') {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userUpdates: Record<string, any> = {
      submittedChallengeIds: arrayRemove(missionId),
      submittedPendingChallengeIds: arrayRemove(missionId),
      updatedAt: now
    };

    if (verdict === 'needs_more_proof') {
      userUpdates.needsMoreProofChallengeIds = arrayUnion(missionId);
      userUpdates.rejectedChallengeIds = arrayRemove(missionId);
      userUpdates.completedChallengeIds = arrayRemove(missionId);
      userUpdates.completedMissionIds = arrayRemove(missionId);
    }

    if (verdict === 'rejected') {
      userUpdates.rejectedChallengeIds = arrayUnion(missionId);
      userUpdates.retryableChallengeIds = arrayUnion(missionId);
      userUpdates.needsMoreProofChallengeIds = arrayRemove(missionId);
      userUpdates.completedChallengeIds = arrayRemove(missionId);
      userUpdates.completedMissionIds = arrayRemove(missionId);
    }

    await updateDoc(userRef, userUpdates);
  }

  let awardResult: { success: boolean; points?: number; reason?: string } | undefined;
  if (verdict === 'approved') {
    awardResult = await awardSubmissionPointsOnce(entryId, reviewNotes);

    const refreshedSnap = await getDoc(entryRef);
    const refreshedEntry = refreshedSnap.exists() ? refreshedSnap.data() : entry;
    const refreshedXP = resolveXPFields(refreshedEntry);

    await setDoc(reviewRef, {
      xpAwarded: refreshedXP.xpAwarded,
      awardedXP: refreshedXP.awardedXP,
      pointsAwarded: refreshedXP.xpAwarded,
      awardedPoints: refreshedXP.awardedXP || refreshedXP.legacyPoints,
      updatedAt: serverTimestamp()
    }, { merge: true });
  }

  if (auth.currentUser) {
    await logAdminAction(auth.currentUser.uid, entryId, 'proofReview', verdict, {
      notes: reviewNotes,
      targetUserId: userId,
      previousStatus,
      pointsAwarded: awardResult?.points || 0
    });
  }

  return {
    success: awardResult ? awardResult.success : true,
    status: verdict,
    previousStatus,
    points: awardResult?.points,
    reason: awardResult?.reason
  };
}
