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
import { PersonaId } from '../constants';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
  persona: PersonaId | null;
  personaName: string | null;
  personaQuizComplete: boolean;
  onboardingCompleted: boolean;
  points: number;
  soloCount: number;
  rerollsAvailable: number;
  activeChallenge: any | null;
  lastSnitchDate: string | null;
  crewId?: string | null;
  seenBadges?: string[];
  previousRank?: number;
  preferences?: {
    reduceCommentary?: boolean;
    notificationsEnabled?: boolean;
  };
  createdAt?: any;
  updatedAt?: any;
  betaAccessCodeUsed?: string;
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
      return { id: userDoc.id, ...userDoc.data() } as UserProfile;
    }

    const newProfile: UserProfile = {
      id: user.uid,
      name: user.displayName || 'Field Agent',
      email: user.email,
      photoURL: user.photoURL || '',
      persona: null,
      personaName: null,
      personaQuizComplete: false,
      onboardingCompleted: false,
      points: 0,
      soloCount: 0,
      rerollsAvailable: 3,
      activeChallenge: null,
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
      callback({ id: snapshot.id, ...snapshot.data() } as UserProfile);
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
