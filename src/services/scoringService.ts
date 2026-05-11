import { 
  collection, 
  addDoc, 
  doc, 
  updateDoc, 
  increment, 
  serverTimestamp, 
  runTransaction 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { ScoreEvent, ScoreEventType } from '../types/game';

export async function awardPoints(
  userId: string, 
  userName: string,
  points: number, 
  type: ScoreEventType,
  details: {
    entryId?: string;
    challengeId?: string;
    description: string;
    crewId?: string;
  }
) {
  try {
    await runTransaction(db, async (transaction) => {
      // 1. Create ScoreEvent
      const scoreEventRef = doc(collection(db, 'scoreEvents'));
      const scoreEvent: Omit<ScoreEvent, 'id'> = {
        userId,
        userName,
        type,
        points,
        entryId: details.entryId,
        challengeId: details.challengeId,
        description: details.description,
        crewId: details.crewId,
        createdAt: serverTimestamp() as any
      };
      transaction.set(scoreEventRef, scoreEvent);

      // 2. Update User Profile
      const userRef = doc(db, 'users', userId);
      transaction.update(userRef, {
        points: increment(points),
        updatedAt: serverTimestamp()
      });

      // 3. Update Crew if applicable
      if (details.crewId) {
        const crewRef = doc(db, 'crews', details.crewId);
        transaction.update(crewRef, {
          totalPoints: increment(points),
          updatedAt: serverTimestamp()
        });
      }
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'scoreEvents');
  }
}

export async function adjustPointsManually(
  userId: string,
  userName: string,
  points: number,
  reason: string
) {
  return awardPoints(userId, userName, points, 'admin_adjustment', {
    description: `Manual adjustment: ${reason}`
  });
}
