import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  serverTimestamp,
  getDoc,
  arrayRemove,
  arrayUnion,
  increment,
  getDocs,
  writeBatch,
  setDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth, logFirestoreError } from '../lib/firebase';
import { Entry, Trip, GLOBAL_RESET_MODE } from '../constants';
import { logAdminAction } from './moderationService';
import { authenticatedFetch } from '../lib/api';
import { adminOverrideReview } from './proofService';

const ENTRIES_COLLECTION = 'entries';

function timestampMillis(value: any): number {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * REALTIME: Subscribe to pending submissions for admin review.
 */
export function subscribeToPendingSubmissions(callback: (entries: Entry[]) => void) {
  // Broad query for anything needing review
  const q = query(
    collection(db, ENTRIES_COLLECTION),
    where('status', 'in', [
      'pending_review',
      'pending', 
      'submitted', 
      'under_field_check', 
      'needs_review', 
      'retry-submitted',
      'resubmitted',
      'resubmit_requested',
      'submitted_pending_review',
      'resubmitted_pending_review'
    ])
  );

  console.log(`[AdminService] [SUBSCRIBE] Admin subscription collection path: ${ENTRIES_COLLECTION} (query filter: status in [pending, submitted, under_field_check, needs_review, retry-submitted])`);

  return onSnapshot(q, (snapshot) => {
    const entries = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as Entry))
      .sort((a, b) => timestampMillis((b as any).createdAt || (b as any).submittedAt) - timestampMillis((a as any).createdAt || (a as any).submittedAt));
    console.log(`[AdminService] [REALTIME] Admin subscription collection path: ${ENTRIES_COLLECTION} - Detected live update: Loaded ${entries.length} pending submissions.`);
    callback(entries);
  }, (error) => {
    logFirestoreError(error, OperationType.LIST, ENTRIES_COLLECTION);
    callback([]);
  });
}

/**
 * ACTION: Approve a submission and award points.
 * Redirects to the robust logic in proofService to ensure consistency.
 */
export async function approveSubmission(entry: Entry, adminId: string, notes?: string) {
  console.log(`[AdminService] Redirecting approval for ${entry.id} to canonical proofService with notes: ${notes}`);
  
  try {
    const finalNotes = notes || `BUREAU_MANUAL_APPROVAL: Authorized by ${auth.currentUser?.email || adminId}`;
    
    // Calling the centralized override function which handles:
    // - Complex scoring (Base XP + Multipliers + Field Type Perks)
    // - Sticker & Badge unlocks
    // - Weekly Bonus rewards
    // - Memory archiving
    // - Canonical completion doc sync
    await adminOverrideReview(
      entry.id, // Use entry ID as both review ID and entry ID for dashboard approvals
      entry.id, 
      'approved', 
      finalNotes
    );
    
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, ENTRIES_COLLECTION);
    return false;
  }
}

export async function rejectSubmission(entry: Entry, adminId: string, reason: string) {
  console.log(`[AdminService] Rejecting submission ${entry.id} for user ${entry.userId}. Reason: ${reason}`);
  
  const entryRef = doc(db, ENTRIES_COLLECTION, entry.id);
  const userRef = doc(db, 'users', entry.userId);

  try {
    await updateDoc(entryRef, {
      status: 'rejected',
      adminNotes: reason,
      rejectedAt: serverTimestamp(),
      reviewedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      reviewedBy: adminId,
      retryAvailable: true,
      retryPointMultiplier: 0.5
    });

    const tId = (entry.tripId || entry.challengeId || entry.missionId || 'unknown').toLowerCase();

    await updateDoc(userRef, {
      submittedChallengeIds: arrayRemove(tId),
      submittedPendingChallengeIds: arrayRemove(tId),
      rejectedChallengeIds: arrayUnion(tId),
      retryableChallengeIds: arrayUnion(tId),
      updatedAt: serverTimestamp()
    });

    await logAdminAction(adminId, entry.id, 'entry', 'reject', {
      userId: entry.userId,
      tripId: entry.tripId,
      reason
    });

    console.log(`[ADMIN_ACTION_REJECT] Entry: ${entry.id}, User: ${entry.userId}, Reason: ${reason}`);

    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, ENTRIES_COLLECTION);
    return false;
  }
}

export async function requestMoreProof(entry: Entry, adminId: string, note: string) {
  console.log(`[AdminService] Requesting more proof for ${entry.id}. Note: ${note}`);
  
  const entryRef = doc(db, ENTRIES_COLLECTION, entry.id);
  const userRef = doc(db, 'users', entry.userId);

  try {
    await updateDoc(entryRef, {
      status: 'needs_more_proof',
      adminNotes: note,
      reviewedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      reviewedBy: adminId
    });

    const tId = (entry.tripId || entry.challengeId || entry.missionId || 'unknown').toLowerCase();

    // Remove from both to allow redraws, retries, and resubmissions smoothly
    await updateDoc(userRef, {
      submittedChallengeIds: arrayRemove(tId),
      submittedPendingChallengeIds: arrayRemove(tId),
      needsMoreProofChallengeIds: arrayUnion(tId),
      updatedAt: serverTimestamp()
    });

    await logAdminAction(adminId, entry.id, 'entry', 'request_more_proof', {
      userId: entry.userId,
      tripId: entry.tripId,
      note
    });

    console.log(`[ADMIN_ACTION_REQUEST_MORE_PROOF] Entry: ${entry.id}, User: ${entry.userId}, Note: ${note}`);

    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, ENTRIES_COLLECTION);
    return false;
  }
}

/**
 * ACTION: Reset all non-admin users for the Guided Launch flow.
 * Preserves identity and persona, but resets all progression and onboarding flags.
 */
export async function resetUsersForGuidedLaunch(adminId: string): Promise<{ success: boolean; error?: string }> {
  console.log(`[GUIDED_LAUNCH_RESET_START] Admin: ${adminId} initiating guided launch reset.`);
  
  try {
    const userDocs = await getDocs(collection(db, 'users'));
    let batch = writeBatch(db);
    let count = 0;
    let resetCount = 0;

    for (const userDoc of userDocs.docs) {
      const userData = userDoc.data();
      
      // Skip admins
      if (userData.isAdmin) {
        console.log(`[GUIDED_LAUNCH_RESET_SKIP] Skipping admin user: ${userDoc.id}`);
        continue;
      }

      const userRef = doc(db, 'users', userDoc.id);
      
      // The Reset Payload as per Part 1 instructions
      const resetPayload = {
        // Reset strictly required progression flags
        onboardingStarted: false,
        onboardingCompleted: false,
        hasSeenFieldTypeResults: false,
        hasCompletedFirstMission: false,
        hasCompletedGuidedFirstEntry: false,
        forcedLaunchMissionCompleted: false,
        
        // Clear activity/trips
        activeTrip: null,
        activeChallengeId: null,
        selectedDeckId: "starter-signals",
        
        // Reset counters/scoring
        xp: 0,
        points: 0,
        totalXP: 0,
        totalPoints: 0,
        seasonXP: 0,
        seasonPoints: 0,
        weeklyXP: 0,
        weeklyXp: 0,
        weeklyPoints: 0,
        score: 0,
        pendingPoints: 0,
        entriesApprovedCount: 0,
        approvedEntriesCount: 0, // Canonical synonym
        approvedMissionCount: 0,
        totalSubmissions: 0,
        totalApprovedSubmissions: 0,
        soloTripsCount: 0,
        crewTripsCount: 0,
        boldTripsCount: 0,
        completedCoreChallenges: 0,
        level: 1,

        // Reset collection tracking
        completedChallengeIds: [],
        approvedCompletedChallengeIds: [],
        submittedChallengeIds: [],
        submittedPendingChallengeIds: [],
        needsMoreProofChallengeIds: [],
        rejectedChallengeIds: [],

        // Metadata
        updatedAt: serverTimestamp(),
        lastResetAt: serverTimestamp(),
        resetBy: adminId
      };

      batch.update(userRef, resetPayload);
      count++;
      resetCount++;

      // Firebase batch limit is 500
      if (count >= 400) {
        await batch.commit();
        batch = writeBatch(db);
        count = 0;
      }
    }

    if (count > 0) {
      await batch.commit();
    }

    await logAdminAction(adminId, 'system', 'guided_launch_reset', 'execute', {
      totalUsersProcessed: userDocs.size,
      totalUsersReset: resetCount,
      timestamp: new Date().toISOString()
    });

    console.log(`[GUIDED_LAUNCH_RESET_COMPLETE] Successfully reset ${resetCount} users.`);
    return { success: true };
  } catch (error: any) {
    console.error(`[GUIDED_LAUNCH_RESET_ERROR]`, error);
    return { success: false, error: error.message || String(error) };
  }
}

/**
 * MASTER PILOT ACTION: Reset every user's Fieldtrip gameplay progress and archive/purge old gameplay records.
 */
export async function executeGlobalUserReset(adminId: string): Promise<{ success: boolean; error?: string }> {
  console.log(`[GLOBAL_RESET_START] Admin: ${adminId} is executing a global reset in mode: ${GLOBAL_RESET_MODE}`);
  
  try {
    const userDocs = await getDocs(collection(db, 'users'));
    console.log(`[GLOBAL_RESET_USERS_FOUND] Total users found to reset: ${userDocs.size}`);
    
    let batch = writeBatch(db);
    let actionCount = 0;
    
    // 1. Reset each user's progress/gameplay fields
    for (const userDoc of userDocs.docs) {
      const uId = userDoc.id;
      const userRef = doc(db, 'users', uId);
      
      const resetFields = {
        points: 0,
        xp: 0,
        totalXP: 0,
        totalPoints: 0,
        seasonXP: 0,
        seasonPoints: 0,
        weeklyXP: 0,
        weeklyXp: 0,
        weeklyPoints: 0,
        score: 0,
        pendingPoints: 0,
        approvedCompletedChallengeIds: [],
        completedChallengeIds: [],
        submittedChallengeIds: [],
        submittedPendingChallengeIds: [],
        rejectedChallengeIds: [],
        needsMoreProofChallengeIds: [],
        activeTrip: null,
        drawnCard: null,
        currentChallengeId: null,
        activeDeckId: "starter-signals",
        selectedDeckId: "starter-signals",
        onboardingCompleted: false,
        onboardingStarted: false,
        onboardingCurrentStep: 0,
        hasCompletedOnboarding: false,
        hasConfirmedLegal: false,
        fieldClassificationComplete: false,
        hasSeenFieldTypeResults: false,
        hasCompletedFieldKitOnboarding: false,
        fieldType: null,
        fieldTypeName: null,
        fieldTypeQuizCompleted: false,
        fieldTypeScores: {},
        personaType: null,
        persona: null,
        personaQuizAnswers: [],
        classificationResult: null,
        unlockedRewards: {
          stickers: [],
          badges: [],
          skins: []
        },
        stickerUnlockHistory: [],
        discoveryEventsSeen: [],
        discoveryEvents: {},
        completedDiscoveryGroups: [],
        soloTripsCount: 0,
        crewTripsCount: 0,
        boldTripsCount: 0,
        approvedEntriesCount: 0,
        completedCoreChallenges: 0,
        totalSubmissions: 0,
        totalApprovedSubmissions: 0,
        level: 1,
        rank: 0,
        maybeList: [],
        tripProgress: {},
        starterDeckComplete: false,
        hasSeenDeckChooserIntro: false,
        comebackCardActive: false,
        firstMissionTourComplete: false,
        fieldPulse: null,
        activeSabotageId: null,
        hasActiveSabotage: false,
        sabotageShieldActive: false,
        updatedAt: serverTimestamp()
      };
      
      batch.update(userRef, resetFields);
      actionCount++;
      console.log(`[GLOBAL_RESET_USER_UPDATED] User: ${uId} fields marked for reset.`);
      
      if (actionCount >= 400) {
        await batch.commit();
        console.log(`[GLOBAL_RESET_BATCH_COMMITTED] Committed batch of user updates.`);
        batch = writeBatch(db);
        actionCount = 0;
      }
    }
    
    // Commit the remaining user updates
    if (actionCount > 0) {
      await batch.commit();
      console.log(`[GLOBAL_RESET_BATCH_COMMITTED] Committed final user updates batch.`);
      batch = writeBatch(db);
      actionCount = 0;
    }

    // 2. Clear or archive gameplay records collections
    const collectionsToProcess = [
      'entries',
      'fieldChecks',
      'proofReviews',
      'proofChecks',
      'scoreEvents',
      'activeSabotages',
      'tribunalCases',
      'tribunalVotes',
      'votes',
      'badgeProgress',
      'badgeFragments',
      'weeklySummaries',
      'observations'
    ];

    for (const colName of collectionsToProcess) {
      const querySnapshot = await getDocs(collection(db, colName));
      console.log(`[GLOBAL_RESET_COLLECTION_CLEANED] Found ${querySnapshot.size} records in collection: ${colName}`);
      
      for (const recordDoc of querySnapshot.docs) {
        const docRef = doc(db, colName, recordDoc.id);
        
        if (GLOBAL_RESET_MODE === 'archive') {
          // Move to archive collection
          const archiveRef = doc(db, `archive_${colName}`, recordDoc.id);
          batch.set(archiveRef, {
            ...recordDoc.data(),
            originalCollection: colName,
            archivedAt: new Date().toISOString()
          });
          actionCount++;
        }
        
        // Delete original document
        batch.delete(docRef);
        actionCount++;
        
        if (actionCount >= 400) {
          await batch.commit();
          console.log(`[GLOBAL_RESET_BATCH_COMMITTED] Committed batch for collection: ${colName}.`);
          batch = writeBatch(db);
          actionCount = 0;
        }
      }
      
      // Commit final batch for this collection
      if (actionCount > 0) {
        await batch.commit();
        console.log(`[GLOBAL_RESET_BATCH_COMMITTED] Committed final batch for collection: ${colName}.`);
        batch = writeBatch(db);
        actionCount = 0;
      }
    }

    // Log admin audit action tracker
    await logAdminAction(adminId, 'system', 'global_reset', 'execute', {
      mode: GLOBAL_RESET_MODE,
      timestamp: new Date().toISOString()
    });

    console.log(`[GLOBAL_RESET_COMPLETE] Game state global reset finished successfully in mode: ${GLOBAL_RESET_MODE}`);
    return { success: true };
    
  } catch (error: any) {
    console.error(`[GLOBAL_RESET_ERROR] Reset failed:`, error);
    return { 
      success: false, 
      error: error?.message || String(error) 
    };
  }
}

export interface StarterDeckResetReport {
  success: boolean;
  usersUpdated: number;
  submissionsArchived: number;
  activeMissionsCleared: number;
  proofReviewsUpdated: number;
  xpReduced: boolean;
  totalSubtractions: number;
  error?: string;
}

/**
 * RESET STARTER DECK FOR ALL USERS (Soft Reset)
 */
export async function resetStarterDeckForAllUsers(adminId: string): Promise<StarterDeckResetReport> {
  console.log(`[STARTER_RESET_START] Admin: ${adminId} is triggering a global soft reset of starter deck progress.`);
  
  try {
    const response = await authenticatedFetch('/api/admin/resetStarterDeck', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const resData = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(resData.message || resData.error || `HTTP error ${response.status}`);
    }
    return {
      success: true,
      usersUpdated: resData.usersUpdated || 0,
      submissionsArchived: resData.submissionsArchived || 0,
      activeMissionsCleared: resData.activeMissionsCleared || 0,
      proofReviewsUpdated: resData.proofReviewsUpdated || 0,
      xpReduced: resData.xpReduced || false,
      totalSubtractions: resData.totalSubtractions || 0
    };

  } catch (error: any) {
    console.error(`[STARTER_RESET_ERROR] Reset operation aborted:`, error);
    return {
      success: false,
      usersUpdated: 0,
      submissionsArchived: 0,
      activeMissionsCleared: 0,
      proofReviewsUpdated: 0,
      xpReduced: false,
      totalSubtractions: 0,
      error: error?.message || String(error)
    };
  }
}

/**
 * One-time photoUrl backfill diagnostic for approved entries missing photoUrl.
 */
export async function runOneTimePhotoBackfill(): Promise<{
  success: boolean;
  totalApprovedChecked: number;
  backfilledCount: number;
  markedMissingCount: number;
  error?: string;
}> {
  console.log("[runOneTimePhotoBackfill] Initiating one-time photo backfill diagnostic...");
  try {
    const entriesSnap = await getDocs(collection(db, 'entries'));
    let totalApprovedChecked = 0;
    let backfilledCount = 0;
    let markedMissingCount = 0;

    const normalizeStatus = (status: string | undefined): string => {
      if (!status) return "pending_review";
      const s = status.toLowerCase().trim();
      if (
        s === "approved" || 
        s === "verified" || 
        s === "approved_by_admin" || 
        s === "auto_approved" || 
        s === "completed" ||
        s === "retry-approved" ||
        s === "archived"
      ) {
        return "approved";
      }
      return s;
    };

    for (const entryDoc of entriesSnap.docs) {
      const entryId = entryDoc.id;
      const entryData = entryDoc.data();
      const status = normalizeStatus(entryData.status);

      if (status === "approved" && !entryData.photoUrl) {
        totalApprovedChecked++;
        console.log(`[BackfillDiagnostic] Approved entry missing photoUrl: ${entryId}`);

        // Step 1: Look up linked proofReviews document
        let proofPhotoUrl: string | null = null;

        // Try direct document with entry ID
        const directReviewRef = doc(db, 'proofReviews', entryId);
        const directReviewSnap = await getDoc(directReviewRef);

        if (directReviewSnap.exists() && directReviewSnap.data()?.photoUrl) {
          proofPhotoUrl = directReviewSnap.data().photoUrl;
        } else {
          // Try querying proofReviews where entryId === entryId
          const q = query(collection(db, 'proofReviews'), where('entryId', '==', entryId));
          const reviewQuerySnap = await getDocs(q);
          if (!reviewQuerySnap.empty) {
            const firstReviewDoc = reviewQuerySnap.docs[0];
            if (firstReviewDoc.data()?.photoUrl) {
              proofPhotoUrl = firstReviewDoc.data().photoUrl;
            }
          }
        }

        // Step 2: Act based on linked photo status
        if (proofPhotoUrl && typeof proofPhotoUrl === 'string' && proofPhotoUrl.trim() !== '') {
          // Do not copy placeholders
          const lower = proofPhotoUrl.toLowerCase();
          const isPlaceholder = lower.includes('placeholder') || lower.startsWith('blob:') || lower.includes('localpreview') || lower.includes('preview');
          
          if (!isPlaceholder) {
            console.log(`[BackfillDiagnostic] Linked photo found in reviews for ${entryId}: ${proofPhotoUrl}. Copying.`);
            await updateDoc(doc(db, 'entries', entryId), {
              photoUrl: proofPhotoUrl,
              imageUrl: proofPhotoUrl,
              backfilledAt: serverTimestamp(),
              missingPhoto: false
            });
            backfilledCount++;
          } else {
            console.log(`[BackfillDiagnostic] Linked photo is placeholder for ${entryId}. Marking missing.`);
            await updateDoc(doc(db, 'entries', entryId), {
              missingPhoto: true,
              missingPhotoReason: "Approved before photo persistence fix or upload failed.",
              backfilledAt: serverTimestamp()
            });
            markedMissingCount++;
          }
        } else {
          console.log(`[BackfillDiagnostic] No linked photo in reviews for ${entryId}. Marking missing.`);
          await updateDoc(doc(db, 'entries', entryId), {
            missingPhoto: true,
            missingPhotoReason: "Approved before photo persistence fix or upload failed.",
            backfilledAt: serverTimestamp()
          });
          markedMissingCount++;
        }
      }
    }

    return {
      success: true,
      totalApprovedChecked,
      backfilledCount,
      markedMissingCount
    };
  } catch (error: any) {
    console.error(`[BackfillDiagnostic] Failed:`, error);
    return {
      success: false,
      totalApprovedChecked: 0,
      backfilledCount: 0,
      markedMissingCount: 0,
      error: error?.message || String(error)
    };
  }
}
