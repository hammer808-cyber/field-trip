import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy,
  onSnapshot,
  Timestamp,
  limit
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ChallengeCard, ChallengeStatus } from '../types/challenges';

const CHALLENGES_COLLECTION = 'challenges';

export async function getAllChallenges(): Promise<ChallengeCard[]> {
  const q = query(collection(db, CHALLENGES_COLLECTION), orderBy('createdAt', 'desc'), limit(100));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChallengeCard));
}

export async function saveChallenge(challenge: Partial<ChallengeCard>): Promise<string> {
  const id = challenge.id || doc(collection(db, CHALLENGES_COLLECTION)).id;
  const now = new Date().toISOString();
  
  const data = {
    ...challenge,
    id,
    updatedAt: now,
    createdAt: challenge.createdAt || now
  };
  
  await setDoc(doc(db, CHALLENGES_COLLECTION, id), data, { merge: true });
  return id;
}

export function subscribeToChallenges(callback: (challenges: ChallengeCard[]) => void) {
  // Limit to 100 challenges for app performance and billing safety
  const q = query(collection(db, CHALLENGES_COLLECTION), orderBy('createdAt', 'desc'), limit(100));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChallengeCard)));
  });
}

export async function updateChallengeStatus(id: string, status: ChallengeStatus) {
  await updateDoc(doc(db, CHALLENGES_COLLECTION, id), {
    status,
    updatedAt: new Date().toISOString()
  });
}
