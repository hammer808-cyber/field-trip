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
  Timestamp
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { CrewArtifact, ArtifactType, ArtifactRarity } from '../types/artifacts';
import { getServerDate } from './timeService';

const COLLECTION = 'crewArtifacts';

/**
 * Checks for and awards artifacts based on a new entry.
 */
export async function evaluateEntryForArtifacts(crewId: string, userId: string, userName: string, entry: any) {
  if (!crewId) return;

  const artifactsToAward: Partial<CrewArtifact>[] = [];

  // 1. The First Receipt: First food-related proof submitted by the crew.
  const category = entry.category?.toLowerCase() || '';
  if (category.includes('food') || category.includes('drink')) {
    const q = query(
      collection(db, COLLECTION),
      where('crewId', '==', crewId),
      where('title', '==', 'The First Receipt'),
      limit(1)
    );
    const existing = await getDocs(q);
    if (existing.empty) {
      artifactsToAward.push({
        title: 'The First Receipt',
        description: 'The inaugural instance of fiscal sustenance documentation.',
        artifactType: 'document',
        icon: 'Receipt',
        rarity: 'standard',
        flavorCaption: 'A grease-stained relic for the archives.'
      });
    }
  }

  // 2. The Parking Lot Incident: Late-night location entry
  const hour = getServerDate().getHours();
  if ((hour >= 23 || hour <= 3) && entry.proofImage) {
    artifactsToAward.push({
      title: 'The Parking Lot Incident',
      description: 'Proof captured during the hours when only the committed (or the lost) are active.',
      artifactType: 'memory',
      icon: 'Moon',
      rarity: 'classified',
      flavorCaption: 'Static and shadows. We do not discuss the specifics.'
    });
  }

  // 3. Chaos Archivist Memory: Long field notes
  if (entry.note && entry.note.length > 100) {
    artifactsToAward.push({
      title: 'The Verbose Manifesto',
      description: 'An abnormally detailed field note that suggests either deep insight or complete madness.',
      artifactType: 'document',
      icon: 'FileText',
      rarity: 'standard',
      flavorCaption: 'They had a lot to say. Possibly too much.'
    });
  }

  // 4. Detour Discovery: Spontaneous category
  if (category === 'detour') {
    artifactsToAward.push({
      title: 'The Path Less Authorized',
      description: 'A collectible memory from a deliberate deviation from the primary directive.',
      artifactType: 'relic',
      icon: 'Compass',
      rarity: 'legendary',
      flavorCaption: 'The map said one thing. The agent said another.'
    });
  }

  // Award the artifacts
  for (const art of artifactsToAward) {
    await awardArtifact(crewId, userId, userName, entry, art);
  }
}

async function awardArtifact(crewId: string, userId: string, userName: string, entry: any, artInfo: Partial<CrewArtifact>) {
  try {
    await addDoc(collection(db, COLLECTION), {
      ...artInfo,
      crewId,
      earnedByUserId: userId,
      earnedByUserName: userName,
      sourceEntryId: entry.id,
      sourceChallengeId: entry.challengeId,
      createdAt: serverTimestamp(),
      seasonId: 'S1', // Hardcoded for now
    });
  } catch (error) {
    console.error('Error awarding artifact:', error);
  }
}

export function subscribeToCrewArtifacts(crewId: string, callback: (artifacts: CrewArtifact[]) => void) {
  if (!crewId) {
    callback([]);
    return () => {};
  }

  const q = query(
    collection(db, COLLECTION),
    where('crewId', '==', crewId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      createdAt: doc.data().createdAt instanceof Timestamp ? doc.data().createdAt.toDate().toISOString() : doc.data().createdAt
    } as CrewArtifact)));
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, COLLECTION);
  });
}
