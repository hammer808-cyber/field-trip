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
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db, logFirestoreError, OperationType } from '../lib/firebase';
import { DrawnMissionCard, DrawnMissionCardStatus } from '../types/game';

const USERS_COLLECTION = 'users';
const MISSION_CARDS_SUBCOLLECTION = 'drawnMissionCards';

/**
 * Saves a drawn mission card to the user's collection.
 */
export async function saveDrawnMissionCard(uid: string, card: Partial<DrawnMissionCard>): Promise<string> {
  const missionId = card.missionId;
  if (!missionId) throw new Error('missionId is required to save a mission card');

  const cardId = missionId; // We use missionId as the document ID within the subcollection
  const cardRef = doc(db, USERS_COLLECTION, uid, MISSION_CARDS_SUBCOLLECTION, cardId);
  
  const now = serverTimestamp();
  const data = {
    ...card,
    uid,
    id: cardId,
    drawnAt: card.drawnAt || now,
    updatedAt: now,
  };

  try {
    await setDoc(cardRef, data, { merge: true });
    return cardId;
  } catch (error: any) {
    logFirestoreError(error, OperationType.WRITE, `${USERS_COLLECTION}/${uid}/${MISSION_CARDS_SUBCOLLECTION}`);
    throw error;
  }
}

/**
 * Updates the status of a mission card.
 */
export async function updateMissionCardStatus(
  uid: string, 
  missionId: string, 
  status: DrawnMissionCardStatus,
  extraData: Partial<DrawnMissionCard> = {}
): Promise<void> {
  const cardRef = doc(db, USERS_COLLECTION, uid, MISSION_CARDS_SUBCOLLECTION, missionId);
  
  try {
    const updateData: any = {
      status,
      updatedAt: serverTimestamp(),
      ...extraData
    };

    // If status is active, we might want to ensure other cards are not active
    // For now, let's just update the single card as requested by the simplified flow
    await updateDoc(cardRef, updateData);
  } catch (error: any) {
    logFirestoreError(error, OperationType.UPDATE, `${USERS_COLLECTION}/${uid}/${MISSION_CARDS_SUBCOLLECTION}`);
    throw error;
  }
}

/**
 * Subscribes to a user's drawn mission cards.
 */
export function subscribeToUserMissionCards(uid: string, callback: (cards: DrawnMissionCard[]) => void) {
  const cardsRef = collection(db, USERS_COLLECTION, uid, MISSION_CARDS_SUBCOLLECTION);
  const q = query(cardsRef, orderBy('drawnAt', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const cards = snapshot.docs.map(doc => ({ ...doc.data() } as DrawnMissionCard));
    callback(cards);
  }, (error) => {
    logFirestoreError(error, OperationType.LIST, `${USERS_COLLECTION}/${uid}/${MISSION_CARDS_SUBCOLLECTION}`);
  });
}

/**
 * Marks a specific card as active and deactivates others if necessary.
 */
export async function setActiveMissionCard(uid: string, missionId: string): Promise<void> {
  // In this simplified model, we can just update the status to 'active'
  // If we want literal 'isActive' boolean toggle, we'd do a batch update.
  // The prompt says: "isActive?: boolean" in the structure.
  
  const batch = writeBatch(db);
  const cardsRef = collection(db, USERS_COLLECTION, uid, MISSION_CARDS_SUBCOLLECTION);
  const snapshot = await getDocs(cardsRef);
  
  snapshot.docs.forEach(cardDoc => {
    if (cardDoc.id === missionId) {
      batch.update(cardDoc.ref, { 
        isActive: true, 
        status: 'active',
        updatedAt: serverTimestamp() 
      });
    } else if (cardDoc.data().isActive) {
      batch.update(cardDoc.ref, { 
        isActive: false,
        // If it was active, it should probably move back to saved_for_later if it wasn't approved/pending
        status: cardDoc.data().status === 'active' ? 'saved_for_later' : cardDoc.data().status,
        updatedAt: serverTimestamp()
      });
    }
  });

  await batch.commit();
}
