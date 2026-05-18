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
  limit
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { logAdminAction } from './moderationService';
import { Entry, FIELD_TYPES } from '../constants';
import { evaluateProof } from './proofService';
import { awardPoints } from './scoringService';
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
  },
  activeSeason?: Season | null
) {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.exists() ? userSnap.data() : null;
    const fieldType = userData?.fieldType || null;

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
      
      if (!trip.isRepeatableTemplate) {
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
      const storageResult = await uploadBase64Image(userId, 'proofs', filename, entryData.proofImage);
      imageUrl = storageResult.url;
      imagePath = storageResult.path;
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
      status: 'submitted',
      pointsAwarded: 0,
      createdAt: serverTimestamp(),
      submittedAt: serverTimestamp()
    });

    const entryId = entryRef.id;

    // 3. AI Evaluate Proof (Pre-classification)
    const review = await evaluateProof(
      userId,
      trip.id,
      trip.title,
      trip.theAsk,
      { ...entryData, id: entryId, note: entryData.fieldNote },
      entryData.proofImage 
    );

    const finalStatus = review.status === 'approved' ? 'approved' : 
                       review.status === 'rejected' ? 'rejected' : 
                       'needs_fix';

    const entryUpdate: any = {
      status: finalStatus,
      proofCheckId: review.id,
      adminNotes: review.reviewNotes
    };

    // 4. Scoring Logic (if approved)
    if (finalStatus === 'approved') {
      const scoring = calculateSubmissionPoints(
        { ...entryData, id: entryId } as any,
        trip,
        {
          isFirstSubmission: false, 
          isChaosModifierCompleted: entryData.isChaosModifierCompleted,
          isSabotageSurvived: entryData.isSabotageSurvived,
          sabotageSeverity: entryData.sabotageSeverity,
          isFinalCrown: entryData.isFinalCrown,
          daysLate: daysLate
        }
      );

      entryUpdate.pointsAwarded = scoring.totalPoints;
      
      // Award points via score events
      for (const event of scoring.scoreEvents) {
        await awardPoints(userId, userName, event.points, event.type as any, {
          ...event,
          crewId: entryData.crewId,
          userAvatar: entryData.userAvatar
        });
      }

      // Field Type Modifier
      const { bonus: ftBonus, penalty: ftPenalty, text: ftText } = applyFieldTypeModifier(trip, fieldType, effectsEnabled, !!entryData.crewId);
      if (ftBonus > 0) {
        await awardPoints(userId, userName, ftBonus, 'field_type_perk', {
          entryId, tripId: trip.id, description: ftText, crewId: entryData.crewId, userAvatar: entryData.userAvatar
        });
      }
      if (ftPenalty > 0 && !entryData.detourCompleted) {
        await awardPoints(userId, userName, -ftPenalty, 'field_type_snag', {
          entryId, tripId: trip.id, description: ftText, crewId: entryData.crewId, userAvatar: entryData.userAvatar
        });
      }

      // Update user stats
      const userUpdates: any = {
        approvedEntriesCount: increment(1),
        soloTripsCount: increment(1),
        activeTrip: null,
        points: increment(scoring.totalPoints + ftBonus - (entryData.detourCompleted ? 0 : ftPenalty))
      };

      if (trip.lane === 'core') {
        userUpdates.completedCoreChallenges = increment(1);
      }

      await updateDoc(userRef, userUpdates);
    }

    await updateDoc(doc(db, 'entries', entryId), entryUpdate);
    return { entryId, status: finalStatus, review };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'entries');
  }
}

export async function requestFieldCheck(
  reporterId: string,
  targetId: string,
  targetUserId: string,
  reason: FieldCheckReason,
  details: string
) {
  try {
    const checkData = createFieldCheckObj(reporterId, targetId, targetUserId, reason, details);
    const docRef = await addDoc(collection(db, 'fieldChecks'), checkData);
    
    // Update submission status
    await updateDoc(doc(db, 'entries', targetId), {
      status: 'under_field_check'
    });

    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'fieldChecks');
  }
}

export async function resolveFieldCheck(
  checkId: string,
  resolution: FieldCheckStatus,
  adminNotes: string
) {
  try {
    const checkRef = doc(db, 'fieldChecks', checkId);
    const checkSnap = await getDoc(checkRef);
    if (!checkSnap.exists()) throw new Error('Field Check not found');
    
    const check = checkSnap.data() as any;
    const resolvedCheck = resolveFieldCheckObj(check, resolution, adminNotes);
    
    await updateDoc(checkRef, resolvedCheck as any);

    // Audit Log
    if (auth.currentUser) {
        await logAdminAction(
            auth.currentUser.uid,
            checkId,
            'fieldCheck',
            'resolve',
            {
                targetId: check.targetId,
                targetUserId: check.targetUserId,
                previousStatus: check.status,
                newStatus: resolution,
                notes: adminNotes
            }
        );
    }

    // Update submission status
    const entryStatus = resolution === 'cleared' ? 'approved' : 
                       resolution === 'rejected' ? 'rejected' : 
                       resolution === 'adjusted' ? 'needs_fix' : 'dismissed';
                       
    await updateDoc(doc(db, 'entries', check.targetId), {
      status: entryStatus,
      adminNotes: `Field Check Resolution: ${adminNotes}`
    });

    const isConfession = check.reporterId === check.targetUserId;

    // Award bonus if valid snitch
    if (resolution === 'rejected' || resolution === 'adjusted') {
       if (!isConfession) {
         await awardPoints(check.reporterId, 'Bureau Auditor', 75, 'field_check_bonus', {
           description: 'Valid Field Check Reward',
           entryId: check.targetId
         });
       } else {
         // Confession: maybe a smaller bonus for honesty, or just no penalty
         await awardPoints(check.reporterId, 'Bureau Auditor', 25, 'field_check_bonus', {
           description: 'Self-Report Honesty Bonus',
           entryId: check.targetId
         });
       }
    } else if (resolution === 'dismissed' && !isConfession) {
       // Penalty for false petty snitch
       await awardPoints(check.reporterId, 'Bureau Auditor', -50, 'field_check_penalty', {
         description: 'False/Petty Field Check Penalty',
         entryId: check.targetId
       });
    }

    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'fieldChecks');
  }
}

export async function checkOnboardingState(userId: string) {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
    const data = userSnap.data();
    const coreCount = data.completedCoreChallenges || 0;
    
    if (coreCount >= 3 && !data.crewModeUnlocked) {
      await updateDoc(userRef, {
        crewModeUnlocked: true,
        onboardingCompleted: true,
        updatedAt: serverTimestamp()
      });
      return true;
    }
  }
  return false;
}

export async function getUserStats(userId: string) {
  const userRef = doc(db, 'users', userId);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return null;
  return snap.data();
}
