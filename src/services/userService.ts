import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  serverTimestamp,
  collection,
  query,
  limit,
  orderBy,
  getDocs,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  where,
  getCountFromServer
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType, logFirestoreError } from '../lib/firebase';
import { FieldTypeId, ProductPersonaLensId, FIELD_TYPES } from '../constants';
import { normalizeFieldType } from '../constants/fieldTypes';

import { AvatarData } from '../types/avatar';
import type { ProofStickerAssignments, StickerPlacement } from '../types/stickers';
import { DEFAULT_AVATAR } from '../constants/avatarAssets';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
  avatar?: AvatarData;
  // SYSTEM 2: Player-Facing Field Type (Game Identity)
  fieldType: FieldTypeId | null;
  fieldTypeName: string | null;
  fieldClassificationComplete: boolean;

  // NEW QUIZ FIELDS
  fieldTypeQuizCompleted?: boolean;
  fieldTypeScores?: Record<string, number>;
  fieldTypeAssignedAt?: any;
  fieldTypeLastUpdatedAt?: any;

  // SYSTEM 1: Internal ProductPersonaLens (QA/Design Lens)
  // This is hidden from normal users and used for admin/dev logic.
  productPersonaLens?: ProductPersonaLensId | null;

  onboardingCompleted: boolean;
  hasCompletedFieldKitOnboarding?: boolean;
  fieldKitReady?: boolean;
  permissionsPrompted?: boolean;
  cameraPermissionGranted?: boolean;
  locationPermissionGranted?: boolean;
  fieldKitCompletedAt?: string;
  starterDeckComplete?: boolean;
  hasSeenDeckChooserIntro?: boolean;
  hasSeenFieldTypeResults?: boolean;
  hasCompletedGuidedFirstEntry?: boolean;
  starterDeckTourSeen_v1?: boolean;
  fieldGuideAssistEnabled?: boolean;
  forcedLaunchMissionCompleted?: boolean;
  onboardingStarted?: boolean;
  starterApprovedCount?: number;
  activeMissionId?: string;
  activeSubmissionStatus?: 'pending_review' | 'needs_more_proof' | 'rejected' | 'approved' | null;
  onboardingCurrentStep?: number;
  onboardingSkippedAt?: number | null;
  firstMissionSubmitted?: boolean;
  firstMissionApproved?: boolean;
  firstPointsAwarded?: boolean;
  crewModeUnlocked: boolean;
  crewModeSeen: boolean;
  xp: number;
  weeklyXp?: number;
  seasonXp?: number;
  points?: number; // legacy
  soloTripsCount: number;
  approvedEntriesCount?: number;
  completedCoreChallenges: number;
  boldTripsCount: number;
  crewTripsCount: number;
  rerollsAvailable: number;
  activeTrip: any | null;
  lastSnitchDate: string | null;
  activeCrewId?: string | null;
  crewId?: string | null;
  crewCooldownUntil?: any;
  crewRole?: string | null;
  seenBadges?: string[];
  previousRank?: number;
  maybeList?: string[];
  completedChallengeIds?: string[];
  submittedChallengeIds?: string[];
  submittedPendingChallengeIds?: string[];
  rejectedChallengeIds?: string[];
  needsMoreProofChallengeIds?: string[];
  completedSpecialMissionIds?: string[];
  frankieMode?: boolean; // App-wide Plain Language Mode
  deprecated_plainMode?: boolean;
  comebackCardActive?: boolean;
  receiptsMode?: boolean;
  quietCrewMode?: boolean;
  fieldCheckHistory?: string[];
  sabotageShieldActive?: boolean;
  sabotageShieldExpiresAt?: any;
  activeSabotageId?: string | null;
  hasActiveSabotage?: boolean;
  firstMissionTourComplete?: boolean;
  preferences?: {
    frankieMode?: boolean;
    reduceCommentary?: boolean;
    highContrast?: boolean;
    motionEnabled?: boolean;
    privateApprovedPhotos?: boolean;
    mathWizard?: boolean;
    showOnBigBoard?: boolean;
    showExactPoints?: boolean;
    showExactCoordinates?: boolean;
    selectedMarkerStickerId?: string;
    rewardAnimationIntensity?: 'full' | 'reduced' | 'minimal';
  };
  fieldPulse?: {
    currentWeekId: string;
    completedActions: number;
    activeDays: string[];
    graceTokens: number;
    pulseStreak: number;
    lastGraceWeekUsed?: string;
    lastPulseCompletedWeek?: string;
    registeredEvents?: string[];
  };
  unlockedRewards?: {
    stickers: string[];
    badges: string[];
    skins?: string[];
  };
  launchMissionAssigned?: boolean;
  launchMissionId?: string;
  launchMissionAssignedAt?: string;
  discoveryEvents?: Record<string, boolean>;
  trevorSettings?: {
    enabled: boolean;
    collapsed: boolean;
    dismissedAfterFiveMissions?: boolean;
    lastSeenApprovedCount?: number;
  };
  completedDiscoveryGroups?: string[];
  earnedStickers?: Array<{
    id: string;
    title: string;
    description: string;
    trigger: string;
    earnedAt: any;
    source: string;
    seen: boolean;
    metadata?: Record<string, any>;
  }>;
  stickerUnlockHistory?: Array<{
    stickerId: string;
    discoveryKey: string;
    unlockedAt: any;
    sourcePage: string;
  }>;
  stickerPlacements?: StickerPlacement[];
  proofStickerAssignments?: ProofStickerAssignments;
  equippedSkinId?: string;
  tripProgress?: Record<string, {
    photo?: boolean;
    field_note?: boolean;
    location?: boolean;
    reaction?: boolean;
    vote?: boolean;
    time_window?: boolean;
    hintUsed?: boolean;
  }>;
  createdAt?: any;
  updatedAt?: any;
  betaAccessCodeUsed?: string;
  accessStatus?: 'pending' | 'approved' | 'banned' | 'suspended';
  role?: 'admin' | 'moderator' | null;
  // DEPRECATED: Use fieldType instead. Maintained for migration.
  persona?: FieldTypeId | null; 
}

const COLLECTION = 'users';

/**
 * FETCH: Gets current user rank using optimized count server side.
 * Cost: 1 Read per 1000 documents (standard firebase pricing for aggregation).
 */
export async function getUserRank(xp: number): Promise<number> {
  const q = query(
    collection(db, COLLECTION),
    where('xp', '>', xp)
  );
  try {
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count + 1;
  } catch (error: any) {
    if (error?.code === 'unavailable' || error?.message?.includes('offline')) {
      console.warn("[UserService] Rank fetch unavailable (offline).");
      return 0;
    }
    console.error('Error getting rank:', error);
    return 0;
  }
}

/**
 * FETCH: Gets total user count using optimized count server side.
 */
export async function getTotalUserCount(): Promise<number> {
  try {
    const snapshot = await getCountFromServer(collection(db, COLLECTION));
    return snapshot.data().count;
  } catch (error: any) {
    if (error?.code === 'unavailable' || error?.message?.includes('offline')) {
      console.warn("[UserService] Total user count unavailable (offline).");
      return 1;
    }
    console.error('Error getting total user count:', error);
    return 1;
  }
}

/**
 * FETCH: Gets current user profile. 
 * Cost: 1 Read.
 */
export async function getOrCreateProfile(user: any): Promise<UserProfile> {
  const userRef = doc(db, COLLECTION, user.uid);
  try {
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const data = userDoc.data();
      const rawFieldType = data.fieldType || data.persona || null;
      const normalizedType = normalizeFieldType(rawFieldType);
      const fieldTypeData = FIELD_TYPES[normalizedType as FieldTypeId];
      
      const fieldClassificationComplete = !!(data.fieldClassificationComplete || data.personaQuizComplete || data.fieldTypeQuizCompleted);
      
      const xpValue = data.xp !== undefined ? data.xp : (data.points || 0);

      return { 
        id: userDoc.id, 
        ...data,
        xp: xpValue,
        fieldType: normalizedType,
        fieldTypeName: fieldTypeData?.name || data.fieldTypeName || data.personaName || 'Field Agent',
        fieldClassificationComplete: fieldClassificationComplete,
        fieldTypeQuizCompleted: data.fieldTypeQuizCompleted || data.personaQuizComplete || fieldClassificationComplete,
        discoveryEvents: data.discoveryEvents || {},
        completedDiscoveryGroups: data.completedDiscoveryGroups || [],
        stickerUnlockHistory: data.stickerUnlockHistory || [],
        submittedChallengeIds: data.submittedChallengeIds || [],
        completedChallengeIds: data.completedChallengeIds || [],
        approvedEntriesCount: data.approvedEntriesCount || 0,
        boldTripsCount: data.boldTripsCount || 0,
        crewTripsCount: data.crewTripsCount || 0
      } as UserProfile;
    }

    const newProfile: UserProfile = {
      id: user.uid,
      name: user.displayName || 'Field Agent',
      email: user.email,
      photoURL: user.photoURL || '',
      fieldGuideAssistEnabled: true,
      fieldType: null,
      fieldTypeName: null,
      fieldClassificationComplete: false,
      productPersonaLens: 'frankie', // Default lens for new users
      avatar: DEFAULT_AVATAR,
      onboardingCompleted: false,
      crewModeUnlocked: false,
      crewModeSeen: false,
      xp: 0,
      weeklyXp: 0,
      seasonXp: 0,
      points: 0,
      soloTripsCount: 0,
      completedCoreChallenges: 0,
      boldTripsCount: 0,
      crewTripsCount: 0,
      rerollsAvailable: 3,
      activeTrip: null,
      completedChallengeIds: [],
      submittedChallengeIds: [],
      lastSnitchDate: null,
      unlockedRewards: {
        stickers: [],
        badges: [],
        skins: ['classic']
      },
      discoveryEvents: {},
      stickerUnlockHistory: [],
      trevorSettings: {
        enabled: true,
        collapsed: false,
        dismissedAfterFiveMissions: false,
        lastSeenApprovedCount: 0
      },
      equippedSkinId: 'classic',
      accessStatus: 'approved',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    try {
      await setDoc(userRef, newProfile);
      return newProfile;
    } catch (writeErr) {
      console.warn("[BUREAU_ADAPTER] Immediate profile creation failed (Rules check delay?). Returning transient profile context.");
      // Return the profile object anyway so the app can mount, 
      // but it won't be in DB yet. Subsequent onboarding steps will try to write it.
      return newProfile;
    }
  } catch (error: any) {
    if (error?.code === 'unavailable' || error?.message?.includes('offline')) {
      console.warn("[UserService] Firestore unreachable during profile fetch. Returning transient context.");
      // AppContext will handle the fallback logic
      throw error; 
    }
    return handleFirestoreError(error, OperationType.GET, `${COLLECTION}/${user.uid}`);
  }
}

/**
 * REALTIME: Listens ONLY to the logged-in user's profile.
 * Cost: 1 Read per update.
 */
export function subscribeToProfile(uid: string, callback: (profile: UserProfile) => void) {
  return onSnapshot(doc(db, COLLECTION, uid), (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      const rawFieldType = data.fieldType || data.persona || null;
      const normalizedType = normalizeFieldType(rawFieldType);
      const fieldTypeData = FIELD_TYPES[normalizedType as FieldTypeId];

      const fieldClassificationComplete = !!(data.fieldClassificationComplete || data.personaQuizComplete || data.fieldTypeQuizCompleted);
      const shouldRepair = !!normalizedType && normalizedType !== 'unclassified' && !fieldClassificationComplete;
      
      const xpValue = data.xp !== undefined ? data.xp : (data.points || 0);

      callback({ 
        id: snapshot.id, 
        ...data,
        xp: xpValue,
        rejectedChallengeIds: data.rejectedChallengeIds || [],
        needsMoreProofChallengeIds: data.needsMoreProofChallengeIds || [],
        fieldType: normalizedType,
        fieldTypeName: fieldTypeData?.name || data.fieldTypeName || data.personaName || 'Field Agent',
        fieldClassificationComplete: fieldClassificationComplete || shouldRepair,
        fieldTypeQuizCompleted: data.fieldTypeQuizCompleted || data.personaQuizComplete || fieldClassificationComplete || shouldRepair
      } as any as UserProfile);
    }
  }, (error: any) => {
    if (error?.code === 'unavailable' || error?.message?.includes('offline')) {
      console.warn("[BUREAU] Profile subscription running in offline/cached mode.");
    } else {
      logFirestoreError(error, OperationType.GET, `${COLLECTION}/${uid}`);
    }
  });
}

export async function updateProfile(uid: string, data: Partial<UserProfile>) {
  const userRef = doc(db, COLLECTION, uid);
  try {
    await updateDoc(userRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION}/${uid}`);
  }
}

export async function secureCompleteOnboarding() {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('NOT_AUTHENTICATED');

    const { authenticatedFetch } = await import('../lib/api');
    const response = await authenticatedFetch('/api/user/complete-onboarding', {
      method: 'POST'
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'FAILED_TO_COMPLETE_ONBOARDING');
    }

    return await response.json();
  } catch (error) {
    console.error('Error completing onboarding via API:', error);
    throw error;
  }
}

/**
 * PAGINATION: Get leaderboard with limits.
 * Cost: limited per call.
 */
export async function getLeaderboardPage(pageSize = 25, lastVisible?: QueryDocumentSnapshot<DocumentData>) {
  let q = query(
    collection(db, COLLECTION),
    orderBy('xp', 'desc'),
    limit(pageSize)
  );

  if (lastVisible) {
    q = query(q, startAfter(lastVisible));
  }

  try {
    const snapshot = await getDocs(q);
    return {
      docs: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile)),
      lastVisible: snapshot.docs[snapshot.docs.length - 1]
    };
  } catch (error) {
    return handleFirestoreError(error, OperationType.LIST, COLLECTION);
  }
}

/**
 * REALTIME: Only listen to top 10 for "live" feel.
 * Cost: 10 Reads + updates.
 */
export function subscribeToTopStandings(callback: (users: UserProfile[]) => void, count = 10) {
  const q = query(
    collection(db, COLLECTION),
    orderBy('xp', 'desc'),
    limit(count)
  );
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile)));
  }, (error) => {
    // Only log, don't crash the whole app for leaderboard failures
    console.warn("[userService] Standing subscription skipped (likely pending accessStatus):", error.message);
    callback([]);
  });
}
