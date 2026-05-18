import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  serverTimestamp, 
  doc, 
  getDoc,
  limit,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { logAdminAction } from './moderationService';
import { Vote, VoteCategory, Entry, ScoreEvent } from '../types/game';
import { awardPoints } from './scoringService';

const VOTES_COLLECTION = 'votes';

/**
 * Casts a vote for a specific entry in a category for a given week.
 * Enforces business rules:
 * - Cannot vote for self.
 * - Cannot vote twice for the same entry/category/week.
 * - Only approved entries are eligible.
 */
export const castVote = async (userId: string, entryId: string, weekNumber: number, category: VoteCategory) => {
  try {
    const voteId = `${userId}_w${weekNumber}_${category}`;
    const voteRef = doc(db, VOTES_COLLECTION, voteId);

    // 1. Fetch Entry (Rule will also check this, but we check here for UI error messages)
    const entryDoc = await getDoc(doc(db, 'entries', entryId));
    if (!entryDoc.exists()) throw new Error('ENTRY_NOT_FOUND');
    const entry = entryDoc.data() as Entry;

    if (entry.userId === userId) {
      throw new Error('SELF_VOTE_PROHIBITED');
    }

    if (entry.status !== 'approved') {
      throw new Error('ENTRY_NOT_APPROVED');
    }

    // 2. Create or Update vote using deterministic ID
    const voteData: Omit<Vote, 'id'> = {
      userId,
      entryId,
      weekNumber,
      category,
      createdAt: serverTimestamp() as any
    };

    await writeBatch(db).set(voteRef, voteData).commit();
  } catch (error: any) {
    console.error('Vote failed:', error.message);
    if (error.message === 'SELF_VOTE_PROHIBITED') throw error;
    handleFirestoreError(error, OperationType.WRITE, VOTES_COLLECTION);
  }
};

/**
 * Fetches all votes cast by a specific user for a given week.
 */
export const getVotesForUser = async (userId: string, weekNumber: number): Promise<Vote[]> => {
  try {
    const q = query(
      collection(db, VOTES_COLLECTION),
      where('userId', '==', userId),
      where('weekNumber', '==', weekNumber)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Vote));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, VOTES_COLLECTION);
    return [];
  }
};

/**
 * Calculates current standings for a category/week.
 */
export const getVoteStandings = async (weekNumber: number, category: VoteCategory) => {
  try {
    const q = query(
      collection(db, VOTES_COLLECTION),
      where('weekNumber', '==', weekNumber),
      where('category', '==', category)
    );
    const snapshot = await getDocs(q);
    const votes = snapshot.docs.map(d => d.data() as Vote);
    
    const counts: Record<string, number> = {};
    votes.forEach(v => {
      counts[v.entryId] = (counts[v.entryId] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([entryId, count]) => ({ entryId, count }))
      .sort((a, b) => b.count - a.count);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, VOTES_COLLECTION);
    return [];
  }
};

/**
 * Admin utility to award points to vote winners.
 * This should be triggered when a week is locked/finalized.
 */
export const finalizeVoteWinners = async (weekNumber: number) => {
  const categories: VoteCategory[] = ['best_photo', 'most_mysterious', 'funniest_proof', 'boldest_explorer', 'best_field_note', 'most_chaotic'];
  
  for (const cat of categories) {
    const standings = await getVoteStandings(weekNumber, cat);
    if (standings.length > 0) {
      const winner = standings[0];
      // Fetch entry to get user info
      const entrySnap = await getDoc(doc(db, 'entries', winner.entryId));
      if (entrySnap.exists()) {
        const entry = entrySnap.data() as Entry;
        await awardPoints(
          entry.userId,
          entry.userName,
          25, // Bonus points for category win
          'vote_winner_bonus',
          {
            entryId: entry.id,
            tripId: entry.tripId,
            description: `Winner: ${cat.replace('_', ' ').toUpperCase()} (Week ${weekNumber})`
          }
        );
      }
    }
  }

  if (auth.currentUser) {
    await logAdminAction(auth.currentUser.uid, `week-${weekNumber}`, 'votes', 'finalize_winners', { weekNumber });
  }
};
