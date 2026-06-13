import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  onSnapshot,
  serverTimestamp,
  doc,
  updateDoc,
  Timestamp,
  deleteDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, logFirestoreError } from '../lib/firebase';
import { Observation, ObservationType } from '../types/observations';

const COLLECTION = 'observations';

/**
 * Generates a new observation based on user behavior patterns.
 */
export async function generateObservation(userId: string, crewId: string | null, entries: any[], stats: any) {
  try {
    const observations: string[] = [];
    const type: ObservationType = 'Behavior';

    // 1. Food vs Nature imbalance
    const foodCount = entries.filter(e => e.category?.toLowerCase().includes('food')).length;
    const natureCount = entries.filter(e => e.category?.toLowerCase().includes('nature') || e.category?.toLowerCase().includes('outdoor')).length;
    
    if (foodCount >= 3 && natureCount === 0) {
      observations.push(`You have completed ${foodCount} food challenges and 0 nature challenges. The grass has filed a formal complaint.`);
    }

    // 2. Night Owl behavior
    const nightEntries = entries.filter(e => {
      const timestamp = e.createdAt instanceof Timestamp ? e.createdAt.toDate() : new Date(e.createdAt);
      const hour = timestamp.getHours();
      return hour >= 22 || hour <= 4;
    });
    if (nightEntries.length >= 3) {
      observations.push("Your recent activity peaks between 10 PM and 4 AM. Suspicious, but highly productive for the Bureau.");
    }

    // 3. Low Risk behavior
    const lowRiskEntries = entries.filter(e => e.difficulty === 'easy' || e.difficulty === 1 || e.difficulty === 2).length;
    if (lowRiskEntries >= 3 && entries.length === lowRiskEntries) {
      observations.push("You keep choosing low-risk challenges. The Field Notes are politely judging your risk aversion.");
    }

    // 4. Archivist behavior
    const longNotes = entries.filter(e => e.note && e.note.length > 100).length;
    if (longNotes >= 3) {
      observations.push(`${longNotes} extensive field reports filed this week. Archivist behavior detected. The Bureau appreciates the gossip.`);
    }

    // 5. Leaderboard momentum (simulated or based on stats)
    if (stats.rankImproved) {
      observations.push(`You moved up the leaderboard this week. Agent ${stats.nextAgentName || 'X'} should probably be nervous.`);
    }

    if (observations.length === 0) return null;

    // Pick a random valid observation
    const text = observations[Math.floor(Math.random() * observations.length)];

    // Check if we already have a similar observation to avoid spam
    const q = query(
      collection(db, COLLECTION),
      where('userId', '==', userId),
      where('observationText', '==', text),
      where('isDismissed', '==', false)
    );
    const existing = await getDocs(q);
    if (!existing.empty) return null;

    // Expiration: 3 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 3);

    const docRef = await addDoc(collection(db, COLLECTION), {
      userId,
      crewId: crewId || null,
      observationText: text,
      observationType: type,
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromDate(expiresAt),
      visibility: 'private',
      isDismissed: false
    });
    return docRef.id;
  } catch (error) {
    console.error('[ObservationService] generateObservation failed:', error);
    return null;
  }
}

export function subscribeToObservations(userId: string, callback: (observations: Observation[]) => void) {
  const now = new Date();
  const q = query(
    collection(db, COLLECTION),
    where('userId', '==', userId),
    where('isDismissed', '==', false),
    where('expiresAt', '>', Timestamp.fromDate(now)),
    orderBy('expiresAt', 'desc'),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      createdAt: doc.data().createdAt instanceof Timestamp ? doc.data().createdAt.toDate().toISOString() : doc.data().createdAt,
      expiresAt: doc.data().expiresAt instanceof Timestamp ? doc.data().expiresAt.toDate().toISOString() : doc.data().expiresAt
    } as Observation)));
  }, (error) => {
    // Suppress error if it's just index building
    if (!error.message.includes('requires an index')) {
      logFirestoreError(error, OperationType.LIST, COLLECTION);
    }
  });
}

export async function dismissObservation(observationId: string) {
  try {
    const ref = doc(db, COLLECTION, observationId);
    await updateDoc(ref, { isDismissed: true });
  } catch (error) {
    console.error('Error dismissing observation:', error);
  }
}
