import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  serverTimestamp, 
  doc, 
  getDoc,
  writeBatch,
  setDoc,
  updateDoc,
  limit,
  increment
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { TribunalCase, TribunalVote, Entry } from '../types/game';

const TRIBUNAL_CASES_COLLECTION = 'tribunalCases';
const TRIBUNAL_VOTES_COLLECTION = 'tribunalVotes';

export const createTribunalCase = async (
  reporterId: string, 
  entry: Entry, 
  weekNumber: number, 
  seasonId: string
) => {
  try {
    // Validation
    if (entry.userId === reporterId) {
      throw new Error('You cannot call out your own proof.');
    }

    // Check if case already exists
    const caseRef = doc(db, TRIBUNAL_CASES_COLLECTION, entry.id);
    const caseSnap = await getDoc(caseRef);
    if (caseSnap.exists()) {
      throw new Error('This proof is already in Tribunal.');
    }

    // Check weekly limits for reporter
    const q = query(
      collection(db, TRIBUNAL_CASES_COLLECTION),
      where('reporterId', '==', reporterId),
      where('weekNumber', '==', weekNumber),
      where('seasonId', '==', seasonId)
    );
    const reporterCases = await getDocs(q);
    if (reporterCases.size >= 2) {
      throw new Error('You can only call out up to 2 proofs per week.');
    }

    // Check if reporter already called out this player this week
    const alreadyCalledPlayer = reporterCases.docs.some(d => d.data().targetId === entry.userId);
    if (alreadyCalledPlayer) {
      throw new Error('You cannot call out the same player more than once per week.');
    }

    const newCase: TribunalCase = {
      id: entry.id,
      entryId: entry.id,
      reporterId,
      targetId: entry.userId,
      weekNumber,
      seasonId,
      status: 'open',
      agreeVotes: 0,
      disagreeVotes: 0,
      createdAt: serverTimestamp(),
      title: entry.tripTitle || entry.challengeTitle || 'Untitled Mission',
      description: entry.fieldNote || entry.note || '', // Using fieldNote as description
      proofImage: entry.proofImage || entry.imageUrl || entry.photoUrl || '',
      playerName: entry.userName || entry.displayName || 'Unknown Player',
      fieldNote: entry.fieldNote || entry.note || '',
      deckName: (entry.tripId || entry.challengeId || '').includes('deck') ? 'Deck Mission' : 'Standard Mission' // Fallback
    };

    const batch = writeBatch(db);
    batch.set(caseRef, newCase);
    batch.update(doc(db, 'entries', entry.id), { tribunalStatus: 'open' });
    await batch.commit();

    return { success: true };
  } catch (error: any) {
    console.error('Failed to create Tribunal case:', error);
    throw error;
  }
};

export const getTribunalCases = async (weekNumber: number, seasonId: string) => {
  try {
    const q = query(
      collection(db, TRIBUNAL_CASES_COLLECTION),
      where('weekNumber', '==', weekNumber),
      where('seasonId', '==', seasonId),
      where('status', '==', 'open')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as TribunalCase));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, TRIBUNAL_CASES_COLLECTION);
    return [];
  }
};

export const getResolvedTribunalCases = async (weekNumber: number, seasonId: string) => {
  try {
    const q = query(
      collection(db, TRIBUNAL_CASES_COLLECTION),
      where('weekNumber', '==', weekNumber),
      where('seasonId', '==', seasonId),
      where('status', '==', 'closed')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as TribunalCase));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, TRIBUNAL_CASES_COLLECTION);
    return [];
  }
};

export const castTribunalVote = async (
  userId: string, 
  caseId: string, 
  vote: 'agree' | 'disagree'
) => {
  try {
    const voteId = `${userId}_${caseId}`;
    const voteRef = doc(db, TRIBUNAL_VOTES_COLLECTION, voteId);
    const voteSnap = await getDoc(voteRef);

    const batch = writeBatch(db);
    const caseRef = doc(db, TRIBUNAL_CASES_COLLECTION, caseId);

    if (voteSnap.exists()) {
      const oldVote = voteSnap.data() as TribunalVote;
      if (oldVote.vote === vote) return; // No change

      // Update counts
      if (vote === 'agree') {
        batch.update(caseRef, { agreeVotes: increment(1), disagreeVotes: increment(-1) });
      } else {
        batch.update(caseRef, { agreeVotes: increment(-1), disagreeVotes: increment(1) });
      }
    } else {
      // New vote
      if (vote === 'agree') {
        batch.update(caseRef, { agreeVotes: increment(1) });
      } else {
        batch.update(caseRef, { disagreeVotes: increment(1) });
      }
    }

    const voteData: TribunalVote = {
      id: voteId,
      userId,
      caseId,
      vote,
      createdAt: serverTimestamp()
    };

    batch.set(voteRef, voteData);
    await batch.commit();

  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, TRIBUNAL_VOTES_COLLECTION);
    throw error;
  }
};

export const getTribunalVotesForUser = async (userId: string) => {
  try {
    const q = query(collection(db, TRIBUNAL_VOTES_COLLECTION), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as TribunalVote);
  } catch (error) {
    return [];
  }
};

export const resolveTribunalCase = async (caseId: string) => {
  try {
    const caseRef = doc(db, TRIBUNAL_CASES_COLLECTION, caseId);
    const caseSnap = await getDoc(caseRef);
    if (!caseSnap.exists()) return;

    const caseData = caseSnap.data() as TribunalCase;
    const outcome = caseData.agreeVotes > caseData.disagreeVotes ? 'called_out' : 'upheld';

    await updateDoc(caseRef, {
      status: 'closed',
      outcome,
      updatedAt: serverTimestamp()
    });
    
    // Also update entry
    await updateDoc(doc(db, 'entries', caseData.entryId), { tribunalStatus: 'closed' });
  } catch (error) {
    console.error('Failed to resolve Tribunal case:', error);
  }
};
