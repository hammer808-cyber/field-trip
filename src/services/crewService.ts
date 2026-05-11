import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  onSnapshot,
  arrayUnion,
  increment
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Crew, CrewLore, CrewSeasonStats, CrewDispatch } from '../types/crew';
import { Entry } from '../constants';

const CREWS_COLLECTION = 'crews';
const LORE_COLLECTION = 'crewLore';
const DISPATCH_COLLECTION = 'crewDispatches';

export async function getCrew(crewId: string): Promise<Crew | null> {
  const docRef = doc(db, CREWS_COLLECTION, crewId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? (docSnap.data() as Crew) : null;
}

export async function getCrewLore(crewId: string): Promise<CrewLore | null> {
  const docRef = doc(db, LORE_COLLECTION, crewId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? (docSnap.data() as CrewLore) : null;
}

export function subscribeToCrewLore(crewId: string, callback: (lore: CrewLore | null) => void) {
  return onSnapshot(doc(db, LORE_COLLECTION, crewId), (docSnap) => {
    callback(docSnap.exists() ? (docSnap.data() as CrewLore) : null);
  });
}

export async function addInsideJoke(crewId: string, joke: string) {
  const docRef = doc(db, LORE_COLLECTION, crewId);
  await updateDoc(docRef, {
    insideJokes: arrayUnion(joke)
  });
}

/**
 * Automatically update lore based on entry outcome
 */
export async function processLoreForEntry(crewId: string, entry: Entry, loreTags: string[] = []) {
  const loreRef = doc(db, LORE_COLLECTION, crewId);
  const loreSnap = await getDoc(loreRef);
  const lore = loreSnap.exists() ? (loreSnap.data() as CrewLore) : null;
  
  if (!lore) return;

  const seasonId = 'S1'; // Fixed for now
  const statsUpdate: Record<string, any> = {};

  if (entry.status === 'auto_approved' || entry.status === 'approved_by_admin') {
    statsUpdate[`seasonStats.${seasonId}.totalApprovedEntries`] = increment(1);
    statsUpdate[`seasonStats.${seasonId}.totalCompletedChallenges`] = increment(1);
    
    // Add suggested lore tags
    if (loreTags.length > 0) {
      statsUpdate['tags'] = arrayUnion(...loreTags);
    }
  } else if (entry.status === 'rejected') {
    statsUpdate[`seasonStats.${seasonId}.totalRejectedEntries`] = increment(1);
    // Potential for "Most Suspicious Entry"
    if (!lore.highlights.mostSuspiciousEntry) {
      statsUpdate['highlights.mostSuspiciousEntry'] = entry.id;
    }
  }

  await updateDoc(loreRef, statsUpdate);
}

export async function getLatestDispatch(crewId: string): Promise<CrewDispatch | null> {
  const q = query(
    collection(db, DISPATCH_COLLECTION), 
    where('crewId', '==', crewId),
    where('isUnlocked', '==', true)
  );
  const snap = await getDocs(q);
  return snap.empty ? null : (snap.docs[0].data() as CrewDispatch);
}
