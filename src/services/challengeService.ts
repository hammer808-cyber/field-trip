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
import { db, auth, logFirestoreError, OperationType } from '../lib/firebase';
import { authenticatedFetch } from '../lib/api';
import { logAdminAction } from './moderationService';
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

  if (auth.currentUser) {
    await logAdminAction(
      auth.currentUser.uid, 
      id, 
      'challenge', 
      challenge.id ? 'update' : 'create', 
      { title: challenge.title }
    );
  }

  return id;
}

export function subscribeToChallenges(callback: (challenges: ChallengeCard[]) => void) {
  let cancelled = false;
  authenticatedFetch('/api/challenges/accessible')
    .then(async response => {
      if (!response.ok) throw new Error(`Accessible challenges fetch failed (${response.status})`);
      return response.json();
    })
    .then(payload => {
      if (!cancelled) callback((payload.challenges || []) as ChallengeCard[]);
    })
    .catch(error => {
      if (!cancelled) {
        logFirestoreError(error, OperationType.LIST, CHALLENGES_COLLECTION);
        callback([]);
      }
    });
  return () => {
    cancelled = true;
  };
}

export async function updateChallengeStatus(id: string, status: ChallengeStatus) {
  await updateDoc(doc(db, CHALLENGES_COLLECTION, id), {
    status,
    updatedAt: new Date().toISOString()
  });

  if (auth.currentUser) {
    await logAdminAction(auth.currentUser.uid, id, 'challenge', 'update_status', { newStatus: status });
  }
}
