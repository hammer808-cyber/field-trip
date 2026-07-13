import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { db, logFirestoreError, OperationType } from '../lib/firebase';
import { authenticatedFetch } from '../lib/api';
import { CrewArtifact } from '../types/artifacts';

const COLLECTION = 'crewArtifacts';

/**
 * Requests canonical, idempotent artifact evaluation from the server.
 */
export async function evaluateEntryForArtifacts(crewId: string, entryId: string) {
  if (!crewId || !entryId) return { success: false, awardedArtifactIds: [] as string[] };
  const response = await authenticatedFetch('/api/crew/artifacts/evaluate', {
    method: 'POST',
    body: JSON.stringify({ crewId, entryId }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || payload.error || `Artifact evaluation failed with HTTP ${response.status}`);
  return payload as { success: boolean; awardedArtifactIds: string[]; alreadyAwardedArtifactIds: string[] };
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
    logFirestoreError(error, OperationType.LIST, COLLECTION);
  });
}
