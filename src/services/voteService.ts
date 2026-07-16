import { 
  collection, 
  query, 
  where, 
  getDocs, 
  serverTimestamp, 
  doc, 
  getDoc,
  setDoc,
  updateDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Vote, VoteCategory, Entry, BallotCandidate } from '../types/game';
import { getAppConfig, getActiveSeason } from './seasonService';
import { authenticatedFetch } from '../lib/api';
import {
  runStickerAwardNonBlocking,
  STICKER_EVENT_AWARD_IDS,
  unlockStickerForUser,
} from './stickerService';

const VOTES_COLLECTION = 'votes';

/**
 * Casts a vote for a specific entry in a category for a given week.
 * Enforces business rules:
 * - Cannot vote for self.
 * - Cannot vote twice for the same entry/category/week.
 * - Only approved entries are eligible.
 */
export const castVote = async (userId: string, entryId: string, weekNumber: number, category: VoteCategory, seasonId: string = 'heatwave-receipts') => {
  try {
    const response = await authenticatedFetch('/api/voting/weekly/vote', {
      method: 'POST',
      body: JSON.stringify({ entryId, weekNumber, category, seasonId })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'VOTE_FAILED');
    }

    // A successful server-authoritative vote unlocks participation without delaying the ballot UI.
    runStickerAwardNonBlocking('weekly_vote_cast', () =>
      unlockStickerForUser(
        userId,
        STICKER_EVENT_AWARD_IDS.weeklyVoteCast,
        `weekly_vote:${seasonId}:${weekNumber}:${category}`,
        'weekly_vote_cast'
      )
    );
  } catch (error: any) {
    console.error('Vote failed:', error.message);
    if (error.message === 'SELF_VOTE_PROHIBITED') throw error;
    throw error;
  }
};

/**
 * Fetches all votes cast by a specific user for a given week.
 */
export const getVotesForUser = async (userId: string, weekNumber: number, seasonId: string = 'heatwave-receipts'): Promise<Vote[]> => {
  try {
    const q = query(
      collection(db, VOTES_COLLECTION),
      where('userId', '==', userId),
      where('seasonId', '==', seasonId),
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
 * Handles tie-breaking:
 * - Sorts by highest vote count first.
 * - If vote count is tied, breaks tie by the earliest approved/created entry submission.
 * - If still tied, allows co-winners.
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

    const entriesMap: Record<string, any> = {};
    const entryIds = Object.keys(counts);
    if (entryIds.length > 0) {
      for (const eid of entryIds) {
        const docSnap = await getDoc(doc(db, 'entries', eid));
        if (docSnap.exists()) {
          entriesMap[eid] = docSnap.data();
        }
      }
    }

    return Object.entries(counts)
      .map(([entryId, count]) => {
        const entry = entriesMap[entryId];
        const approvalTime = entry?.approvedAt?.toDate?.()?.getTime() || 
                             entry?.createdAt?.toDate?.()?.getTime() || 
                             (entry?.createdAt ? new Date(entry.createdAt).getTime() : 0);
        return { entryId, count, approvalTime };
      })
      .sort((a, b) => {
        if (b.count !== a.count) {
          return b.count - a.count; // highest votes wins
        }
        if (a.approvalTime !== b.approvalTime && a.approvalTime > 0 && b.approvalTime > 0) {
          return a.approvalTime - b.approvalTime; // earliest approved submission wins
        }
        return 0; // co-winners
      });
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, VOTES_COLLECTION);
    return [];
  }
};

/**
 * Admin utility to award points to vote winners.
 * This should be triggered when a week is locked/finalized.
 * Also awards consensus bonus (+20 XP) to users who voted for the winner(s).
 */
export const finalizeVoteWinners = async (weekNumber: number, reason = 'Admin finalized weekly voting results.') => {
  const appConfig = await getAppConfig();
  const activeSeasonId = appConfig?.activeSeasonId || 'heatwave-receipts';
  const response = await authenticatedFetch('/api/admin/voting/finalize-week', {
    method: 'POST',
    body: JSON.stringify({ seasonId: activeSeasonId, weekNumber, reason })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'FAILED_TO_FINALIZE_WEEK');
  }

  return response.json();
};

/**
 * Promotes an approved entry to a BallotCandidate as the single source of truth for voting.
 * Simultaneously populates:
 * 1. The flat 'ballotCandidates' collection
 * 2. The weeklyBallots/{seasonId_weekNumber} configuration document
 * 3. The subcollection weeklyBallots/{seasonId_weekNumber}/candidates/{entryId}
 */
export const promoteEntryToBallotCandidate = async (entryId: string, entryData: any) => {
  try {
    // 1. Guard check: only approved submissions enter the ballot
    const status = entryData.status || '';
    const isApprovedCheck = ['approved', 'approved_by_admin', 'auto_approved', 'completed'].includes(status);
    if (!isApprovedCheck) {
      console.log(`[BALLOT_ASSEMBLY] Ignored entry ${entryId} with non-approved status: ${status}`);
      return;
    }

    const tripId = entryData.tripId || entryData.challengeId || entryData.missionId || '';
    if (!tripId) return;

    // Resolve season and week
    const config = await getAppConfig();
    const seasonId = entryData.seasonId || config?.activeSeasonId || 'season-1';
    const activeSeason = await getActiveSeason(seasonId);
    
    let weekNumber = entryData.weekNumber || 1;
    if (activeSeason) {
      const matchedWeek = activeSeason.weeks.find(w => 
        w.fieldChallengeId?.toLowerCase() === tripId.toLowerCase() ||
        w.evidenceChallengeId?.toLowerCase() === tripId.toLowerCase() ||
        w.crewChallengeId?.toLowerCase() === tripId.toLowerCase()
      );
      if (matchedWeek) {
        weekNumber = matchedWeek.number;
      }
    }

    const ballotDocId = `${seasonId}_${weekNumber}`;
    const ballotRef = doc(db, 'weeklyBallots', ballotDocId);
    
    // Standard categories for candidates to belong to
    const defaultCategories = ['Aesthetic Composition', 'Scientific Evidence', 'Creative Framing'];
    const voteCountByCategory: { [key: string]: number } = {};
    defaultCategories.forEach(cat => {
      voteCountByCategory[cat] = 0;
    });

    // 2. Insert into flat ballotCandidates
    const candidateId = `${seasonId}_w${weekNumber}_${entryId}`;
    const candidateRef = doc(db, 'ballotCandidates', candidateId);
    const candidateDoc = await getDoc(candidateRef);

    if (!candidateDoc.exists()) {
      const candidateData: BallotCandidate = {
        id: candidateId,
        entryId,
        userId: entryData.userId || entryData.uid || '',
        userName: entryData.userName || entryData.displayName || 'Agent',
        tripId,
        tripTitle: entryData.tripTitle || entryData.challengeTitle || 'Field Trip Mission',
        proofImage: entryData.proofImage || entryData.imageUrl || entryData.photoUrl || '',
        fieldNote: entryData.fieldNote || entryData.note || '',
        weekNumber,
        seasonId,
        addedAt: serverTimestamp()
      };

      await setDoc(candidateRef, candidateData);
      console.log(`[BALLOT_ASSEMBLY] Promoted entry ${entryId} to flat ballot candidate: ${candidateId}`);
    }

    // 3. Insert/Update into weeklyBallots doc
    const ballotSnap = await getDoc(ballotRef);
    if (!ballotSnap.exists()) {
      await setDoc(ballotRef, {
        seasonId,
        weekNumber,
        cycleStartAt: entryData.createdAt || serverTimestamp(),
        votingOpensAt: serverTimestamp(),
        votingClosesAt: serverTimestamp(),
        awardsReleaseAt: serverTimestamp(),
        phase: 'submission',
        candidateEntryIds: [entryId],
        categoryCandidateMap: {
          'Aesthetic Composition': [entryId],
          'Scientific Evidence': [entryId],
          'Creative Framing': [entryId]
        },
        totalCandidates: 1,
        isGenerated: true,
        isLocked: false,
        generatedAt: serverTimestamp()
      });
    } else {
      const ballotData = ballotSnap.data();
      const currentEntryIds = ballotData.candidateEntryIds || [];
      if (!currentEntryIds.includes(entryId)) {
        const updatedEntryIds = [...currentEntryIds, entryId];
        const categoryMap = ballotData.categoryCandidateMap || {};
        defaultCategories.forEach(cat => {
          if (!categoryMap[cat]) categoryMap[cat] = [];
          if (!categoryMap[cat].includes(entryId)) {
            categoryMap[cat].push(entryId);
          }
        });
        await updateDoc(ballotRef, {
          candidateEntryIds: updatedEntryIds,
          categoryCandidateMap: categoryMap,
          totalCandidates: updatedEntryIds.length,
          updatedAt: serverTimestamp()
        });
      }
    }

    // 4. Insert into weeklyBallots/{seasonId_weekNumber}/candidates/{entryId}
    const weeklyCandidateRef = doc(db, 'weeklyBallots', ballotDocId, 'candidates', entryId);
    const weeklyCandidateSnap = await getDoc(weeklyCandidateRef);
    
    if (!weeklyCandidateSnap.exists()) {
      const weeklyCandidateData = {
        entryId,
        userId: entryData.userId || entryData.uid || '',
        displayName: entryData.userName || entryData.displayName || 'Agent',
        avatarUrl: entryData.avatarUrl || '',
        photoUrl: entryData.proofImage || entryData.imageUrl || entryData.photoUrl || '',
        thumbnailUrl: entryData.thumbnailUrl || entryData.proofImage || entryData.imageUrl || '',
        missionId: tripId,
        missionTitle: entryData.tripTitle || entryData.challengeTitle || 'Field Trip Mission',
        deckId: entryData.deckId || 'starter',
        fieldType: entryData.fieldType || '',
        caption: entryData.caption || '',
        fieldNote: entryData.fieldNote || '',
        approvedAt: entryData.approvedAt || serverTimestamp(),
        submittedAt: entryData.createdAt || serverTimestamp(),
        eligibleWeekNumber: weekNumber,
        seasonId,
        categories: defaultCategories,
        voteCountByCategory,
        totalVotes: 0,
        isEligible: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(weeklyCandidateRef, weeklyCandidateData);
      console.log(`[BALLOT_ASSEMBLY] Placed candidate in weeklyBallot candidates subcollection: ${ballotDocId}/candidates/${entryId}`);
    }
  } catch (err) {
    console.warn(`[BALLOT_ASSEMBLY] Failed to promote entry ${entryId} to ballot candidate:`, err);
  }
};

/**
 * Scans the database for approved entries and ensures they are promoted to BallotCandidates.
 * This acts as the automated data pipeline to assemble the weekly ballot pool.
 */
export const syncApprovedSubmissionsToBallot = async (seasonId: string = '') => {
  try {
    const config = await getAppConfig();
    const activeSeasonId = seasonId || config?.activeSeasonId || 'season-1';
    
    // Fetch all approved entries from the entries collection
    const q = query(
      collection(db, 'entries'),
      where('status', '==', 'approved')
    );
    const snap = await getDocs(q);
    
    console.log(`[BALLOT_ASSEMBLY] Scanning ${snap.size} approved entries for ballot promotion...`);
    
    for (const d of snap.docs) {
      const entryData = d.data();
      await promoteEntryToBallotCandidate(d.id, entryData);
    }
  } catch (err) {
    console.warn(`[BALLOT_ASSEMBLY] Pipeline sync failed:`, err);
  }
};
