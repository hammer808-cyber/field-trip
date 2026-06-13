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
  writeBatch,
  setDoc,
  updateDoc
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { logAdminAction } from './moderationService';
import { Vote, VoteCategory, Entry, ScoreEvent, BallotCandidate } from '../types/game';
import { awardPoints } from './scoringService';
import { getAppConfig, getActiveSeason } from './seasonService';

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
    const voteId = `${userId}_${seasonId}_w${weekNumber}_${category}`;
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

    // 2. Check if vote is new (to award participation bonus once)
    const voteDoc = await getDoc(voteRef);
    const isNewVote = !voteDoc.exists();

    const voteData: Omit<Vote, 'id'> = {
      userId,
      entryId,
      weekNumber,
      seasonId,
      category,
      createdAt: serverTimestamp() as any
    };

    await writeBatch(db).set(voteRef, voteData).commit();

    // Award +5 XP participation points if this is a first-time vote for this category-week
    if (isNewVote) {
      try {
        await awardPoints(
          userId,
          'Agent',
          5, // +5 XP per category voted
          'vote_winner_bonus',
          {
            entryId,
            description: `Participated in Tribunal Consensus: ${category.replace('_', ' ').toUpperCase()} (Week ${weekNumber})`
          }
        );
      } catch (scoreErr) {
        console.warn('Failed to award participation points:', scoreErr);
      }
    }
  } catch (error: any) {
    console.error('Vote failed:', error.message);
    if (error.message === 'SELF_VOTE_PROHIBITED') throw error;
    handleFirestoreError(error, OperationType.WRITE, VOTES_COLLECTION);
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
      where('weekNumber', '==', weekNumber)
    );
    const snapshot = await getDocs(q);
    const allVotes = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Vote));
    return allVotes.filter(v => (v.seasonId || 'heatwave-receipts') === seasonId);
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
export const finalizeVoteWinners = async (weekNumber: number) => {
  const categories: VoteCategory[] = ['best_field_note', 'best_photo_proof', 'most_legendary_errand', 'goblin_energy_award', 'cleanest_completion', 'underdog_award'];
  
  const config = await getAppConfig();
  const seasonId = config?.activeSeasonId || 'heatwave-receipts';
  const summaryId = `${seasonId}_${weekNumber}`;
  const summaryRef = doc(db, 'weeklySummaries', summaryId);
  const summarySnap = await getDoc(summaryRef);

  // IDEMPOTENCY PRE-CHECK: If week is already locked and finalized with winners, do not run payout logic again
  if (summarySnap.exists()) {
    const summaryData = summarySnap.data();
    if (summaryData?.isLocked && summaryData?.voteWinners && Object.keys(summaryData?.voteWinners).length > 0) {
      console.log(`[VOTE_SERVICE] Week ${weekNumber} is already locked and finalized. Skipping points distribution.`);
      return;
    }
  }

  const voteWinners: Record<string, any> = {};

  for (const cat of categories) {
    const standings = await getVoteStandings(weekNumber, cat);
    if (standings.length > 0) {
      const topVotes = standings[0].count;
      const topApprovalTime = standings[0].approvalTime;
      
      // Determine co-winners if they are tied on both votes and approval time
      const categoryWinners = standings.filter(s => s.count === topVotes && s.approvalTime === topApprovalTime);

      const premierWinner = categoryWinners[0];
      const entrySnap = await getDoc(doc(db, 'entries', premierWinner.entryId));
      if (entrySnap.exists()) {
        const entryData = entrySnap.data() as Entry;
        voteWinners[cat] = {
          entryId: premierWinner.entryId,
          count: premierWinner.count,
          userName: entryData.userName || 'Anonymous Agent',
          tripTitle: entryData.tripTitle || '',
          proofImage: entryData.proofImage || '',
          fieldNote: entryData.fieldNote || ''
        };
      }

      // 1. Award +25 XP to each Category Winner/Laureate (with duplicate protection)
      for (const winner of categoryWinners) {
        const winSnap = await getDoc(doc(db, 'entries', winner.entryId));
        if (winSnap.exists()) {
          const entry = winSnap.data() as Entry;
          
          // IDEMPOTENCY: Check if winner reward already exists
          const q = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', entry.userId),
            where('type', '==', 'vote_winner_bonus'),
            where('entryId', '==', entry.id)
          );
          const existingEventsSnap = await getDocs(q);
          const alreadyAwarded = existingEventsSnap.docs.some(d => 
            d.data().description?.includes(`Winner: ${cat.replace('_', ' ').toUpperCase()}`)
          );

          if (!alreadyAwarded) {
            try {
              await awardPoints(
                entry.userId,
                entry.userName || entry.displayName || 'Unknown Player',
                25, // Bonus points for category win
                'vote_winner_bonus',
                {
                  entryId: entry.id,
                  tripId: entry.tripId || entry.challengeId || 'unknown',
                  description: `Winner: ${cat.replace('_', ' ').toUpperCase()} (Week ${weekNumber})`
                }
              );
            } catch (winnerErr) {
              console.warn(`Failed to award category winner bonus to user ${entry.userId}:`, winnerErr);
            }
          }
        }
      }

      // 2. Award +20 XP Consensus Bonus to users who voted for the winner(s) (with duplicate protection)
      const votesQuery = query(
        collection(db, VOTES_COLLECTION),
        where('weekNumber', '==', weekNumber),
        where('category', '==', cat)
      );
      const votesSnap = await getDocs(votesQuery);
      const categoryVotes = votesSnap.docs.map(d => d.data() as Vote);
      
      const winningEntryIds = new Set(categoryWinners.map(w => w.entryId));
      for (const vote of categoryVotes) {
        if (winningEntryIds.has(vote.entryId)) {
          // IDEMPOTENCY: Check if voter already has consensus bonus for this category and week
          const voterQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', vote.userId),
            where('type', '==', 'vote_winner_bonus'),
            where('entryId', '==', vote.entryId)
          );
          const existingVoterEvents = await getDocs(voterQuery);
          const alreadyGotConsensus = existingVoterEvents.docs.some(d => 
            d.data().description?.includes(`Consensus Bonus: ${cat.replace('_', ' ').toUpperCase()}`)
          );

          if (!alreadyGotConsensus) {
            try {
              await awardPoints(
                vote.userId,
                'Agent',
                20, // Consensus bonus
                'vote_winner_bonus',
                {
                  entryId: vote.entryId,
                  description: `Consensus Bonus: ${cat.replace('_', ' ').toUpperCase()} (Week ${weekNumber})`
                }
              );
            } catch (voterErr) {
              console.warn(`Failed to award consensus bonus to user ${vote.userId}:`, voterErr);
            }
          }
        }
      }
    }
  }

  // Update weeklySummary document with the calculated voteWinners
  if (summarySnap.exists()) {
    await updateDoc(summaryRef, {
      voteWinners,
      isLocked: true
    });
  } else {
    await setDoc(summaryRef, {
      id: summaryId,
      seasonId,
      weekNumber,
      playerStats: {},
      crewStats: {},
      lastCalculatedAt: serverTimestamp(),
      voteWinners,
      isLocked: true
    });
  }

  if (auth.currentUser) {
    await logAdminAction(auth.currentUser.uid, `week-${weekNumber}`, 'votes', 'finalize_winners', { weekNumber });
  }
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
