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
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { FieldTypeId, ProductPersonaLensId } from '../constants';

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
  boldTripsCount: number;
  crewTripsCount: number;
  rerollsAvailable: number;
  activeTrip: any | null;
  lastSnitchDate: string | null;
  crewId?: string | null;
  seenBadges?: string[];
  previousRank?: number;
  maybeList?: string[];
  plainMode?: boolean;
  comebackCardActive?: boolean;
  receiptsMode?: boolean;
  quietCrewMode?: boolean;
  fieldCheckHistory?: string[];
  sabotageShieldActive?: boolean;
  sabotageShieldExpiresAt?: any;
  activeSabotageId?: string | null;
  hasActiveSabotage?: boolean;
  preferences?: {
    reduceCommentary?: boolean;
    notificationsEnabled?: boolean;
    privateApprovedPhotos?: boolean;
  };
  createdAt?: any;
  updatedAt?: any;
  betaAccessCodeUsed?: string;
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
      // Migration: Map old 'persona' to 'fieldType' if needed
      if ((data.persona || data.personaName) && !data.fieldType) {
        return { 
          id: userDoc.id, 
          ...data,
          fieldType: data.fieldType || data.persona || null,
          fieldTypeName: data.fieldTypeName || data.personaName || null,
          fieldClassificationComplete: data.fieldClassificationComplete || data.personaQuizComplete || false
        } as UserProfile;
      }
      return { id: userDoc.id, ...data } as UserProfile;
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
      boldTripsCount: 0,
      crewTripsCount: 0,
      rerollsAvailable: 3,
      activeTrip: null,
      lastSnitchDate: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await setDoc(userRef, newProfile);
    return newProfile;
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
      // Migration: Map old 'persona' to 'fieldType' if needed
      if ((data.persona || data.personaName) && !data.fieldType) {
        callback({ 
          id: snapshot.id, 
          ...data,
          fieldType: data.fieldType || data.persona || null,
          fieldTypeName: data.fieldTypeName || data.personaName || null,
          fieldClassificationComplete: data.fieldClassificationComplete || data.personaQuizComplete || false
        } as UserProfile);
      } else {
        callback({ id: snapshot.id, ...data } as UserProfile);
      }
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
    handleFirestoreError(error, OperationType.LIST, COLLECTION);
  });
}
