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
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { FieldTypeId, ProductPersonaLensId, FIELD_TYPES } from '../constants';
import { normalizeFieldType } from '../constants/fieldTypes';

import { AvatarData } from '../types/avatar';
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
  crewModeUnlocked: boolean;
  crewModeSeen: boolean;
  points: number;
  soloTripsCount: number;
  completedCoreChallenges: number;
  boldTripsCount: number;
  crewTripsCount: number;
  rerollsAvailable: number;
  activeTrip: any | null;
  lastSnitchDate: string | null;
  crewId?: string | null;
  seenBadges?: string[];
  previousRank?: number;
  maybeList?: string[];
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
  preferences?: {
    frankieMode?: boolean;
    reduceCommentary?: boolean;
    highContrast?: boolean;
    motionEnabled?: boolean;
    privateApprovedPhotos?: boolean;
    mathWizard?: boolean;
    showOnBigBoard?: boolean;
    showExactPoints?: boolean;
    selectedMarkerStickerId?: string;
  };
  unlockedRewards?: {
    stickers: string[];
    badges: string[];
  };
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
export async function getUserRank(points: number): Promise<number> {
  const q = query(
    collection(db, COLLECTION),
    where('points', '>', points)
  );
  try {
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count + 1;
  } catch (error) {
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
  } catch (error) {
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
      
      return { 
        id: userDoc.id, 
        ...data,
        fieldType: normalizedType,
        fieldTypeName: fieldTypeData?.name || data.fieldTypeName || data.personaName || 'Field Agent',
        fieldClassificationComplete: data.fieldClassificationComplete || data.personaQuizComplete || false
      } as UserProfile;
    }

    const newProfile: UserProfile = {
      id: user.uid,
      name: user.displayName || 'Field Agent',
      email: user.email,
      photoURL: user.photoURL || '',
      fieldType: null,
      fieldTypeName: null,
      fieldClassificationComplete: false,
      productPersonaLens: 'frankie', // Default lens for new users
      avatar: DEFAULT_AVATAR,
      onboardingCompleted: false,
      crewModeUnlocked: false,
      crewModeSeen: false,
      points: 0,
      soloTripsCount: 0,
      completedCoreChallenges: 0,
      boldTripsCount: 0,
      crewTripsCount: 0,
      rerollsAvailable: 3,
      activeTrip: null,
      lastSnitchDate: null,
      accessStatus: 'pending',
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
  } catch (error) {
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

      callback({ 
        id: snapshot.id, 
        ...data,
        fieldType: normalizedType,
        fieldTypeName: fieldTypeData?.name || data.fieldTypeName || data.personaName || 'Field Agent',
        fieldClassificationComplete: data.fieldClassificationComplete || data.personaQuizComplete || false
      } as UserProfile);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, `${COLLECTION}/${uid}`);
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
    orderBy('points', 'desc'),
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
    orderBy('points', 'desc'),
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
