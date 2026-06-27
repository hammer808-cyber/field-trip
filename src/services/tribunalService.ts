import { 
  collection, 
  query, 
  where, 
  getDocs, 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { TribunalCase, TribunalVote, Entry } from '../types/game';
import { authenticatedFetch } from '../lib/api';
import { canonicalTribunalVerdict, isTribunalVerdict, TribunalVerdict } from '../logic/firelightTribunal';

const TRIBUNAL_CASES_COLLECTION = 'tribunalCases';
const TRIBUNAL_VOTES_COLLECTION = 'tribunalVotes';
const TRIBUNAL_RESULTS_COLLECTION = 'tribunalResults';

export const createTribunalCase = async (
  reporterId: string, 
  entry: Entry, 
  weekNumber: number, 
  seasonId: string
) => {
  try {
    const response = await authenticatedFetch('/api/reports/sus', {
      method: 'POST',
      body: JSON.stringify({
        entryId: entry.id,
        reason: 'community_sus',
        details: `Requested Firelight Tribunal review for week ${weekNumber} (${seasonId}).`
      })
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'FAILED_TO_SUBMIT_SUS_REPORT');
    }
    return response.json();
  } catch (error: any) {
    console.error('Failed to submit Sus report:', error);
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

export const getTribunalResults = async (weekNumber: number, seasonId: string) => {
  try {
    const q = query(
      collection(db, TRIBUNAL_RESULTS_COLLECTION),
      where('weekNumber', '==', weekNumber),
      where('seasonId', '==', seasonId)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, TRIBUNAL_RESULTS_COLLECTION);
    return [];
  }
};

export const castTribunalVote = async (
  userId: string, 
  caseId: string, 
  vote: TribunalVerdict
) => {
  try {
    if (!isTribunalVerdict(vote)) throw new Error('INVALID_TRIBUNAL_VOTE');
    const response = await authenticatedFetch('/api/tribunal/vote', {
      method: 'POST',
      body: JSON.stringify({
        caseId,
        vote
      })
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'FAILED_TO_CAST_TRIBUNAL_VOTE');
    }
    return response.json();

  } catch (error) {
    throw error;
  }
};

export const getTribunalVotesForUser = async (userId: string) => {
  try {
    const q = query(collection(db, TRIBUNAL_VOTES_COLLECTION), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map(d => {
      const data = d.data() as TribunalVote & { vote?: 'valid' | 'sus' | 'agree' | 'disagree' };
      const canonicalVote = canonicalTribunalVerdict(data.vote as any);
      return {
        ...data,
        vote: canonicalVote
      } as TribunalVote;
    });
  } catch (error) {
    return [];
  }
};

export const resolveTribunalCase = async (caseId: string, adminNotes: string) => {
  try {
    const response = await authenticatedFetch('/api/admin/tribunal/close', {
      method: 'POST',
      body: JSON.stringify({ caseId, adminNotes })
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'FAILED_TO_CLOSE_TRIBUNAL_CASE');
    }
    return response.json();
  } catch (error) {
    console.error('Failed to resolve Tribunal case:', error);
  }
};
