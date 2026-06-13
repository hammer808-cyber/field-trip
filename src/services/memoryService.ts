import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  setDoc,
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  serverTimestamp,
  getDocs,
  where
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, logFirestoreError } from '../lib/firebase';
import { MemoryEntry } from '../types/memories';

const MEMORIES_SUBCOLLECTION = 'memories';

export async function addMemory(userId: string, memory: Omit<MemoryEntry, 'id' | 'completedAt'>) {
  try {
    const memoryId = `${memory.missionId}_${memory.seasonId}`;
    const memoryRef = doc(db, 'users', userId, MEMORIES_SUBCOLLECTION, memoryId);
    await setDoc(memoryRef, {
      ...memory,
      completedAt: serverTimestamp(),
      zinePageSeedGenerated: true
    });
    return memoryId;
  } catch (error) {
    return handleFirestoreError(error, OperationType.CREATE, `users/${userId}/memories`);
  }
}

export function subscribeToUserMemories(userId: string, callback: (memories: MemoryEntry[]) => void) {
  const memoriesRef = collection(db, 'users', userId, MEMORIES_SUBCOLLECTION);
  const q = query(memoriesRef, orderBy('completedAt', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const memories = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as MemoryEntry));
    callback(memories);
  }, (error: any) => {
    if (error?.code === 'unavailable' || error?.message?.includes('offline')) {
      console.warn("[BUREAU] Memories subscription running in offline/cached mode.");
    } else {
      logFirestoreError(error, OperationType.LIST, `users/${userId}/memories`);
    }
  });
}

export async function toggleFavoriteMemory(userId: string, memoryId: string, isFavorite: boolean) {
  try {
    const memoryRef = doc(db, 'users', userId, MEMORIES_SUBCOLLECTION, memoryId);
    await updateDoc(memoryRef, {
      favorite: isFavorite
    });
    return true;
  } catch (error) {
    return handleFirestoreError(error, OperationType.WRITE, `users/${userId}/memories/${memoryId}`);
  }
}
