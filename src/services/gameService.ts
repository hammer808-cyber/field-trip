import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp, 
  increment,
  getDoc,
  query,
  where,
  getDocs,
  Timestamp,
  orderBy,
  limit,
  deleteField
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { logAdminAction } from './moderationService';
import { Entry, FIELD_TYPES } from '../constants';
import { evaluateProof } from './proofService';
import { awardPoints } from './scoringService';
import { addMemory } from './memoryService';
import { TripCard, ChallengeLevel } from '../types/challenges';
import { uploadBase64Image } from './storageService';
import { calculateSubmissionPoints } from '../logic/scoringLogic';
import { requestFieldCheck as createFieldCheckObj, resolveFieldCheck as resolveFieldCheckObj, applyFieldTypeModifier } from '../logic/challengeLogic';
import { FieldCheckReason, FieldCheckStatus, Season } from '../types/game';
import { getWeekWindows, getServerTime as getWeeklyServerTime } from '../logic/weeklyLogic';
import { getServerTime as getSyncedTime, getServerDate } from './timeService';

export async function submitTripEntry(
  userId: string,
  userName: string,
  trip: TripCard,
  entryData: {
    proofImage: string;
    originalImageUrl?: string;
    fieldNote: string;
    selectedLevel: ChallengeLevel;
    detourCompleted: boolean;
    crewId?: string;
    isChaosModifierCompleted?: boolean;
    isSabotageSurvived?: boolean;
    sabotageSeverity?: 'minor' | 'major';
    isFinalCrown?: boolean;
    
    // Viewfinder Meta
    uploadSource?: 'camera' | 'cameraRoll' | 'upload';
    photoTakenAt?: string | null;
    fileLastModifiedAt?: string | null;
    submittedAt?: string;
    metadataStatus?: 'verified' | 'missing' | 'mismatch' | 'unverified' | 'suspicious';
    captureTrustLevel?: 'live' | 'verifiedCameraRoll' | 'unverifiedCameraRoll';
    filterUsed?: string;
    filterIntensity?: number;
    reviewStatus?: 'approved' | 'pending' | 'pendingReview' | 'rejected' | 'autoRejected' | 'needsMoreProof';
    userAvatar?: any;
    hintUsed?: boolean;
  },
  activeSeason?: Season | null
) {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.exists() ? userSnap.data() : null;
    const fieldType = userData?.fieldType || null;

    // Use specific hintUsed flag from entryData OR from tripProgress if available
    const hintWasUsed = entryData.hintUsed || userData?.tripProgress?.[trip.id]?.hintUsed || false;

    // 1. Anti-Repeat Check 
    const recentQuery = query(
      collection(db, 'entries'),
      where('userId', '==', userId),
      where('tripId', '==', trip.id),
      where('status', '==', 'approved'),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
    const recentSnap = await getDocs(recentQuery);
    if (!recentSnap.empty) {
      const lastEntry = recentSnap.docs[0].data();
      
      const isRepeatable = trip.repeatable || trip.isRepeatableTemplate;
      if (!isRepeatable) {
        throw new Error(`Temporal Anchor: You have already completed the final transmission for "${trip.title}".`);
      }

      const lastTime = lastEntry.createdAt?.toDate ? lastEntry.createdAt.toDate() : new Date(lastEntry.createdAt);
      const sevenDaysAgo = getServerDate();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      if (lastTime > sevenDaysAgo) {
        throw new Error(`Temporal Anchor: You have already submitted evidence for "${trip.title}" recently.`);
      }
    }

    const configSnap = await getDoc(doc(db, 'appConfig', 'game'));
    const configData = configSnap.exists() ? configSnap.data() : null;
    const effectsEnabled = configData?.featureFlags?.fieldTypeEffectsEnabled ?? true;

    const timestamp = getSyncedTime();
    const filename = `proof_${trip.id}_${timestamp}.jpg`;
    
    let imageUrl = entryData.proofImage;
    let imagePath = '';
    
    if (entryData.proofImage.length > 500) {
      try {
        const storageResult = await uploadBase64Image(userId, 'proofs/processed', filename, entryData.proofImage);
        imageUrl = storageResult.url;
        imagePath = storageResult.path;
      } catch (uploadErr) {
        console.warn("[Storage Fallback] Processed proof upload failed, retaining base64 data:", uploadErr);
      }
    }

    // Determine lateness
    let daysLate = 0;
    if (activeSeason && trip.weekNumber) {
      const windows = getWeekWindows(activeSeason, trip.weekNumber);
      if (windows) {
        const now = getSyncedTime();
        if (now > windows.end.getTime()) {
          daysLate = Math.ceil((now - windows.end.getTime()) / (24 * 60 * 60 * 1000));
        }
      }
    }

    // 2. Create Entry
    const entryRef = await addDoc(collection(db, 'entries'), {
      ...entryData,
      proofImage: imageUrl,
      imageStoragePath: imagePath,
      userId,
      userName,
      tripId: trip.id,
      tripTitle: trip.title,
      status: 'pending', // Starts in pending audit state
      pointsAwarded: 0,
      createdAt: serverTimestamp(),
      submittedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    const entryId = entryRef.id;

    // 3. AI Evaluate Proof (Pre-classification check)
    const review = await evaluateProof(
      userId,
      trip.id,
      trip.title,
      trip.theAsk,
      { ...entryData, id: entryId, note: entryData.fieldNote },
      entryData.proofImage 
    );

    const entryUpdate: any = {
      status: 'pending', // Explicitly keep as pending to restrict self-approvals
      proofCheckId: review.id,
      aiRecommendation: review.status,
      adminNotes: review.reviewNotes,
      updatedAt: serverTimestamp()
    };

    await updateDoc(doc(db, 'entries', entryId), entryUpdate);

    // Track the temporary calculated projection points for display on success frames
    const estimatedScoring = calculateSubmissionPoints(
      { ...entryData, id: entryId, hintUsed: hintWasUsed } as any,
      trip,
      {
        isFirstSubmission: (userData?.approvedEntriesCount || 0) === 0,
        daysLate: daysLate,
        hintUsed: hintWasUsed
      }
    );

    return { 
      entryId, 
      status: 'pending', 
      review,
      scoring: estimatedScoring,
      ftBonus: 0,
      ftText: 'Uplink recorded. Pending manual review.',
      newRewards: undefined as { stickers: string[]; badges: string[] } | undefined
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'entries');
  }
}

export async function requestFieldCheck(
  reporterUid: string,
  submissionId: string,
  missionId: string,
  reportedUserId: string,
  reason: FieldCheckReason,
  note: string
) {
  try {
    const checkData = {
      reporterUid,
      submissionId,
      missionId,
      reportedUserId,
      reason,
      note,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      source: 'app_beta'
    };
    const docRef = await addDoc(collection(db, 'fieldChecks'), checkData);
    
    // Update submission status if needed, or leave to admin
    // User requested not to alter core approval logic too much
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'fieldChecks');
  }
}

export async function resolveFieldCheck(
  checkId: string,
  resolution: FieldCheckStatus,
  adminNote: string
) {
  try {
    const checkRef = doc(db, 'fieldChecks', checkId);
    const checkSnap = await getDoc(checkRef);
    if (!checkSnap.exists()) throw new Error('Field Check not found');
    
    const check = checkSnap.data() as any;
    
    await updateDoc(checkRef, {
      status: resolution,
      adminNote,
      reviewedBy: auth.currentUser?.uid || 'system',
      reviewedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Audit Log
    if (auth.currentUser) {
        await logAdminAction(
            auth.currentUser.uid,
            checkId,
            'fieldCheck',
            'resolve',
            {
                submissionId: check.submissionId,
                reportedUserId: check.reportedUserId,
                previousStatus: check.status,
                newStatus: resolution,
                notes: adminNote
            }
        );
    }

    // Optional: Update submission status if action is needed
    // But per instructions "Do not reverse rewards automatically"
    // So we just log the resolution.
    
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'fieldChecks');
  }
}

export async function secureUseReroll() {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('NOT_AUTHENTICATED');

    const { authenticatedFetch } = await import('../lib/api');
    const response = await authenticatedFetch('/api/game/use-reroll', {
      method: 'POST'
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'FAILED_TO_USE_REROLL');
    }

    return await response.json();
  } catch (error) {
    console.error('Error using reroll via API:', error);
    throw error;
  }
}

export async function checkOnboardingState(userId: string) {
  const userRef = doc(db, 'users', userId);
  
  // 1. Fetch relevant entries to check for specific starter IDs
  const starterIds = ["starter-1", "starter-2", "starter-3"];
  const q = query(
    collection(db, 'entries'),
    where('userId', '==', userId),
    where('status', 'in', ['approved', 'approved_by_admin', 'auto_approved']),
    where('tripId', 'in', starterIds)
  );
  
  try {
    const snapshot = await getDocs(q);
    const completedStarterIds = new Set(snapshot.docs.map(doc => {
      const tid = doc.data().tripId;
      return tid ? tid.toLowerCase() : '';
    }));
    
    const allStartersDone = starterIds.every(id => completedStarterIds.has(id.toLowerCase()));

    if (allStartersDone) {
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        if (!data.onboardingCompleted || !data.crewModeUnlocked) {
          await updateDoc(userRef, {
            crewModeUnlocked: true,
            onboardingCompleted: true,
            updatedAt: serverTimestamp()
          });
          return true;
        }
      }
    }
  } catch (err) {
    console.warn("[Onboarding Check] Failed to query entries for state check:", err);
  }
  
  return false;
}

export async function getUserStats(userId: string) {
  const userRef = doc(db, 'users', userId);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return null;
  return snap.data();
}
