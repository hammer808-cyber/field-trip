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
import { authenticatedFetch } from '../lib/api';
import { Crew, CrewLore, CrewDispatch, CrewMembershipState } from '../types/crew';
import { Entry } from '../constants';
import type { CrewMode, CrewPrivacy } from '../logic/crewSystem';

const CREWS_COLLECTION = 'crews';
const LORE_COLLECTION = 'crewLore';
const DISPATCH_COLLECTION = 'crewDispatches';

async function readCrewResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || payload.error || fallbackMessage);
  }
  return payload as T;
}

export async function getCurrentCrewMembership(): Promise<CrewMembershipState> {
  const response = await authenticatedFetch('/api/crew/current');
  return readCrewResponse<CrewMembershipState>(response, `Crew membership lookup failed with HTTP ${response.status}`);
}

export async function createCrew(input: {
  name: string;
  motto?: string;
  icon?: string;
  mode?: CrewMode;
  privacy?: CrewPrivacy;
}): Promise<CrewMembershipState> {
  const response = await authenticatedFetch('/api/crew/create', {
    method: 'POST',
    body: JSON.stringify(input)
  });
  return readCrewResponse<CrewMembershipState>(response, `Crew creation failed with HTTP ${response.status}`);
}

export async function leaveCrew(reason = 'User left Crew.'): Promise<{ success: boolean; cooldownUntil: any }> {
  const response = await authenticatedFetch('/api/crew/leave', {
    method: 'POST',
    body: JSON.stringify({ reason })
  });
  return readCrewResponse<{ success: boolean; cooldownUntil: any }>(response, `Crew leave failed with HTTP ${response.status}`);
}

export async function getCrew(crewId: string): Promise<Crew | null> {
  const docRef = doc(db, CREWS_COLLECTION, crewId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? ({ id: docSnap.id, ...docSnap.data() } as Crew) : null;
}

export async function getCrewLore(crewId: string): Promise<CrewLore | null> {
  const docRef = doc(db, LORE_COLLECTION, crewId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? (docSnap.data() as CrewLore) : null;
}

export function subscribeToCrewLore(crewId: string, callback: (lore: CrewLore | null) => void) {
  return onSnapshot(doc(db, LORE_COLLECTION, crewId), (docSnap) => {
    callback(docSnap.exists() ? (docSnap.data() as CrewLore) : null);
  }, (error) => {
    console.warn("[CrewService] Crew Lore subscription skipped:", error.message);
    callback(null);
  });
}

export async function addInsideJoke(crewId: string, joke: string) {
  try {
    const docRef = doc(db, LORE_COLLECTION, crewId);
    await updateDoc(docRef, {
      insideJokes: arrayUnion(joke)
    });
  } catch (error) {
    console.error("[CrewService] addInsideJoke failed:", error);
  }
}

/**
 * Automatically update lore based on entry outcome
 */
export async function processLoreForEntry(crewId: string, entry: Entry, loreTags: string[] = []) {
  try {
    const loreRef = doc(db, LORE_COLLECTION, crewId);
    const loreSnap = await getDoc(loreRef);
    const lore = loreSnap.exists() ? (loreSnap.data() as CrewLore) : null;
    
    if (!lore) return;

    const seasonId = 'S1'; // Fixed for now
    const statsUpdate: Record<string, any> = {};

    const status = (entry.status as string);
    const isApproved = ['approved', 'auto_approved', 'approved_by_admin', 'retry-approved'].includes(status);
    
    if (isApproved) {
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

    if (Object.keys(statsUpdate).length > 0) {
      await updateDoc(loreRef, statsUpdate);
    }
  } catch (error) {
    console.warn("[CrewService] processLoreForEntry skipped/failed:", error);
  }
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
