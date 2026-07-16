import { db } from '../lib/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  serverTimestamp 
} from 'firebase/firestore';
import { FIELDTRIP_VOTING_TIMEZONE, getCurrentVotingCycle, getVotingPhase } from './votingCycleService';
import { getActiveSeason, getAppConfig } from './seasonService';
import { WeeklyBallot, CandidateProof, WeeklyBallotStatus } from '../data/votingBallotSchema';

/**
 * Calculates which week number a given approvedAt date belongs to,
 * applying the rollup rule for Saturday/Sunday.
 */
export async function isEntryEligibleForBallot(entry: any, targetSeasonId: string): Promise<boolean> {
  const entryId = entry.id || entry.entryId;
  if (!entryId) return false;

  // 1. status === "approved"
  const status = entry.status || '';
  const isApproved = ['approved', 'approved_by_admin', 'auto_approved', 'completed'].includes(status);
  if (!isApproved) {
    console.log(`[BALLOT_ASSEMBLY] Entry ${entryId} rejected: status is not approved (${status})`);
    return false;
  }

  // 2. photoUrl exists
  const photoUrl = entry.proofImage || entry.imageUrl || entry.photoUrl || entry.proofUrl || '';
  if (!photoUrl) {
    console.log(`[BALLOT_ASSEMBLY] Entry ${entryId} rejected: photoUrl is missing`);
    return false;
  }

  // 3. entry is not marked private
  if (entry.isPrivate === true || entry.private === true || entry.visibility === 'private') {
    console.log(`[BALLOT_ASSEMBLY] Entry ${entryId} rejected: marked private`);
    return false;
  }

  // 4. entry is not disqualified
  if (entry.disqualified === true) {
    console.log(`[BALLOT_ASSEMBLY] Entry ${entryId} rejected: marked disqualified`);
    return false;
  }

  // 5. entry belongs to the current season
  const entrySeasonId = entry.seasonId || 'season-1';
  if (entrySeasonId !== targetSeasonId) {
    console.log(`[BALLOT_ASSEMBLY] Entry ${entryId} rejected: belongs to season ${entrySeasonId}, target is ${targetSeasonId}`);
    return false;
  }

  // 6. user has not opted out of public sharing
  const userId = entry.userId || entry.uid || '';
  if (userId) {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.preferences?.privateApprovedPhotos === true || userData.privateApprovedPhotos === true) {
          console.log(`[BALLOT_ASSEMBLY] Entry ${entryId} rejected: user is opted out of public sharing`);
          return false;
        }
      }
    } catch (err) {
      console.warn(`[BALLOT_ASSEMBLY] Error checking user profile for opt-out of entry ${entryId}:`, err);
    }
  }

  // 7. entry has enough display data for a public card
  const userName = entry.userName || entry.displayName || '';
  const tripTitle = entry.tripTitle || entry.challengeTitle || entry.missionTitle || '';
  if (!userName.trim() || userName.trim().toLowerCase() === 'anonymous' || !tripTitle.trim()) {
    console.log(`[BALLOT_ASSEMBLY] Entry ${entryId} rejected: insufficient display data`, { userName, tripTitle });
    return false;
  }

  return true;
}

export function getBallotTargetWeek(approvedAt: Date, season: any): { weekNumber: number; seasonId: string } {
  const seasonId = season?.id || 'season-1';
  
  // 1. Find naturally which week number the approvedAt date falls into
  let naturalWeek = 1;
  if (season && season.weeks) {
    const sortedWeeks = [...season.weeks].sort((a, b) => {
      const aTime = typeof a.startDate.toDate === 'function' ? a.startDate.toDate().getTime() : new Date(a.startDate).getTime();
      const bTime = typeof b.startDate.toDate === 'function' ? b.startDate.toDate().getTime() : new Date(b.startDate).getTime();
      return aTime - bTime;
    });
    
    for (let i = 0; i < sortedWeeks.length; i++) {
      const start = typeof sortedWeeks[i].startDate.toDate === 'function' 
        ? sortedWeeks[i].startDate.toDate().getTime() 
        : new Date(sortedWeeks[i].startDate).getTime();
        
      let end = Infinity;
      if (i < sortedWeeks.length - 1) {
        end = typeof sortedWeeks[i + 1].startDate.toDate === 'function'
          ? sortedWeeks[i + 1].startDate.toDate().getTime()
          : new Date(sortedWeeks[i + 1].startDate).getTime();
      } else if (season.endDate) {
        end = typeof season.endDate.toDate === 'function'
          ? season.endDate.toDate().getTime()
          : new Date(season.endDate).getTime();
      }
      
      const appTime = approvedAt.getTime();
      if (appTime >= start && appTime < end) {
        naturalWeek = sortedWeeks[i].number;
        break;
      }
    }
  }

  // 2. Check the phase for that naturalWeek's canonical Voting Cycle
  const cycle = getCurrentVotingCycle(approvedAt, FIELDTRIP_VOTING_TIMEZONE, seasonId);
  const phase = getVotingPhase(approvedAt, cycle);

  let targetWeek = naturalWeek;
  // Rule: Monday-Friday approved entries populate the upcoming Saturday ballot (same week).
  // Saturday voting & Sunday awards use the locked candidate list, meaning new approvals on Saturday/Sunday
  // must roll into the next eligible week's ballot.
  if (phase === 'voting' || phase === 'awards') {
    targetWeek = naturalWeek + 1;
    console.log(`[BALLOT_ASSEMBLY] Approved on ${approvedAt.toISOString()} during ${phase} phase. Rolling target week from ${naturalWeek} to ${targetWeek}.`);
  }

  return { weekNumber: targetWeek, seasonId };
}

/**
 * Returns the WeeklyBallot configuration and populated candidates array.
 */
export async function getCurrentWeeklyBallot(seasonId: string, weekNumber: number): Promise<WeeklyBallot | null> {
  try {
    const ballotId = `${seasonId}_${weekNumber}`;
    const docRef = doc(db, 'weeklyBallots', ballotId);
    const snap = await getDoc(docRef);
    
    if (!snap.exists()) {
      return null;
    }
    
    const data = snap.data();
    const candidatesColRef = collection(db, 'weeklyBallots', ballotId, 'candidates');
    const candidatesSnap = await getDocs(candidatesColRef);
    
    const candidates: CandidateProof[] = candidatesSnap.docs.map(d => {
      const cData = d.data();
      return {
        entryId: cData.entryId,
        userId: cData.userId,
        userName: cData.displayName || 'Agent',
        tripId: cData.missionId,
        tripTitle: cData.missionTitle,
        proofImage: cData.photoUrl,
        fieldNote: cData.fieldNote || cData.caption || '',
        weekNumber: cData.eligibleWeekNumber,
        seasonId: cData.seasonId,
        votesCount: cData.totalVotes || 0
      };
    });

    let ballotStatus: WeeklyBallotStatus = 'pending';
    if (data.phase === 'voting') ballotStatus = 'active';
    else if (data.phase === 'awards') ballotStatus = 'closed';

    return {
      ballotId,
      seasonId: data.seasonId,
      weekNumber: data.weekNumber,
      status: ballotStatus,
      candidates,
      createdAt: data.generatedAt || data.cycleStartAt || null,
      updatedAt: data.lockedAt || data.finalizedAt || null
    };
  } catch (err) {
    console.warn(`[BALLOT_ASSEMBLY] getCurrentWeeklyBallot failed:`, err);
    return null;
  }
}

/**
 * Helper file-private function to add an individual candidate to the subcollection
 */
async function addApprovedEntryToWeeklyBallotSub(
  ballotId: string,
  entry: any,
  weekNumber: number,
  seasonId: string,
  categoriesList: string[]
) {
  const entryId = entry.id || entry.entryId;
  const weeklyCandidateRef = doc(db, 'weeklyBallots', ballotId, 'candidates', entryId);
  const weeklyCandidateSnap = await getDoc(weeklyCandidateRef);

  if (!weeklyCandidateSnap.exists()) {
    const voteCountByCategory: Record<string, number> = {};
    categoriesList.forEach(cat => {
      voteCountByCategory[cat] = 0;
    });

    const tripId = entry.tripId || entry.challengeId || entry.missionId || '';

    const weeklyCandidateData = {
      entryId,
      userId: entry.userId || entry.uid || '',
      displayName: entry.userName || entry.displayName || 'Agent',
      avatarUrl: entry.avatarUrl || '',
      photoUrl: entry.proofImage || entry.imageUrl || entry.photoUrl || '',
      thumbnailUrl: entry.thumbnailUrl || entry.proofImage || entry.imageUrl || '',
      missionId: tripId,
      missionTitle: entry.tripTitle || entry.challengeTitle || 'Field Trip Mission',
      deckId: entry.deckId || 'starter',
      fieldType: entry.fieldType || '',
      caption: entry.caption || '',
      fieldNote: entry.fieldNote || '',
      approvedAt: entry.approvedAt || serverTimestamp(),
      submittedAt: entry.createdAt || serverTimestamp(),
      eligibleWeekNumber: weekNumber,
      seasonId,
      categories: categoriesList,
      voteCountByCategory,
      totalVotes: 0,
      isEligible: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await setDoc(weeklyCandidateRef, weeklyCandidateData);
    console.log(`[BALLOT_ASSEMBLY] Saved candidate sub-document: ${ballotId}/candidates/${entryId}`);
  }
}

/**
 * Builds or refreshes the weekly ballot structure for a given season and week, populating candidates.
 */
export async function buildWeeklyBallotFromApprovedEntries(seasonId: string, weekNumber: number): Promise<void> {
  try {
    const ballotId = `${seasonId}_${weekNumber}`;
    const ballotRef = doc(db, 'weeklyBallots', ballotId);

    const eligibleEntries = await getEligibleEntriesForWeek(seasonId, weekNumber);
    const candidateEntryIds = eligibleEntries.map(e => e.id);

    const categoriesList = [
      'best_field_note',
      'best_photo_proof',
      'most_legendary_errand',
      'goblin_energy_award',
      'cleanest_completion',
      'underdog_award'
    ];

    const categoryCandidateMap: Record<string, string[]> = {};
    categoriesList.forEach(cat => {
      categoryCandidateMap[cat] = candidateEntryIds;
    });

    const ballotDocSnap = await getDoc(ballotRef);
    if (!ballotDocSnap.exists()) {
      await setDoc(ballotRef, {
        seasonId,
        weekNumber,
        cycleStartAt: serverTimestamp(),
        votingOpensAt: serverTimestamp(),
        votingClosesAt: serverTimestamp(),
        awardsReleaseAt: serverTimestamp(),
        phase: 'submission',
        candidateEntryIds,
        categoryCandidateMap,
        totalCandidates: candidateEntryIds.length,
        isGenerated: true,
        isLocked: false,
        generatedAt: serverTimestamp()
      });
    } else {
      await updateDoc(ballotRef, {
        candidateEntryIds,
        categoryCandidateMap,
        totalCandidates: candidateEntryIds.length,
        updatedAt: serverTimestamp()
      });
    }

    for (const entry of eligibleEntries) {
      await addApprovedEntryToWeeklyBallotSub(ballotId, entry, weekNumber, seasonId, categoriesList);
    }

    console.log(`[BALLOT_ASSEMBLY] Completed building weekly ballot ${ballotId} with ${eligibleEntries.length} candidates.`);
  } catch (err) {
    console.warn(`[BALLOT_ASSEMBLY] buildWeeklyBallotFromApprovedEntries failed:`, err);
  }
}

/**
 * Pipelines a newly approved entry into the correct week, respecting voting lock constraints.
 */
export async function addApprovedEntryToWeeklyBallot(entry: any): Promise<void> {
  try {
    const entryId = entry.id || entry.entryId;
    if (!entryId) return;

    const status = entry.status || '';
    const isApprovedCheck = ['approved', 'approved_by_admin', 'auto_approved', 'completed'].includes(status);
    if (!isApprovedCheck) {
      console.log(`[BALLOT_ASSEMBLY] Ignored entry ${entryId} because status is ${status}`);
      return;
    }

    let seasonId = entry.seasonId || 'season-1';
    let weekNumber = entry.eligibleWeekNumber || entry.weekNumber;

    if (!weekNumber) {
      const appConfig = await getAppConfig();
      seasonId = entry.seasonId || appConfig?.activeSeasonId || 'season-1';
      const activeSeason = await getActiveSeason(seasonId);

      const approvedAtVal = entry.approvedAt || entry.createdAt || new Date();
      const approvedDate = typeof approvedAtVal.toDate === 'function'
        ? approvedAtVal.toDate()
        : new Date(approvedAtVal);

      const target = getBallotTargetWeek(approvedDate, activeSeason);
      weekNumber = target.weekNumber;
      seasonId = target.seasonId;
    }

    const isEligibleVal = await isEntryEligibleForBallot(entry, seasonId);
    if (!isEligibleVal) {
      console.log(`[BALLOT_ASSEMBLY] Entry ${entryId} failed eligibility or privacy checks. Ignored.`);
      return;
    }

    const ballotId = `${seasonId}_${weekNumber}`;
    const ballotRef = doc(db, 'weeklyBallots', ballotId);

    const ballotSnap = await getDoc(ballotRef);
    let finalWeekNumber = weekNumber;
    let finalBallotId = ballotId;
    let finalBallotRef = ballotRef;

    if (ballotSnap.exists()) {
      const ballotData = ballotSnap.data();
      if (ballotData.isLocked || ballotData.phase === 'voting' || ballotData.phase === 'awards') {
        finalWeekNumber = weekNumber + 1;
        finalBallotId = `${seasonId}_${finalWeekNumber}`;
        finalBallotRef = doc(db, 'weeklyBallots', finalBallotId);
        console.log(`[BALLOT_ASSEMBLY] Weekly Ballot ${ballotId} is active or finalized. Rolling over entries/${entryId} to next eligibility: ${finalBallotId}`);
      }
    }

    const categoriesList = [
      'best_field_note',
      'best_photo_proof',
      'most_legendary_errand',
      'goblin_energy_award',
      'cleanest_completion',
      'underdog_award'
    ];

    const voteCountByCategory: Record<string, number> = {};
    categoriesList.forEach(cat => {
      voteCountByCategory[cat] = 0;
    });

    const weeklyCandidateRef = doc(db, 'weeklyBallots', finalBallotId, 'candidates', entryId);
    const weeklyCandidateSnap = await getDoc(weeklyCandidateRef);

    if (!weeklyCandidateSnap.exists()) {
      const tripId = entry.tripId || entry.challengeId || entry.missionId || '';

      const weeklyCandidateData = {
        entryId,
        userId: entry.userId || entry.uid || '',
        displayName: entry.userName || entry.displayName || 'Agent',
        avatarUrl: entry.avatarUrl || '',
        photoUrl: entry.proofImage || entry.imageUrl || entry.photoUrl || '',
        thumbnailUrl: entry.thumbnailUrl || entry.proofImage || entry.imageUrl || '',
        missionId: tripId,
        missionTitle: entry.tripTitle || entry.challengeTitle || 'Field Trip Mission',
        deckId: entry.deckId || 'starter',
        fieldType: entry.fieldType || '',
        caption: entry.caption || '',
        fieldNote: entry.fieldNote || '',
        approvedAt: entry.approvedAt || serverTimestamp(),
        submittedAt: entry.createdAt || serverTimestamp(),
        eligibleWeekNumber: finalWeekNumber,
        seasonId,
        categories: categoriesList,
        voteCountByCategory,
        totalVotes: 0,
        isEligible: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(weeklyCandidateRef, weeklyCandidateData);
      console.log(`[BALLOT_ASSEMBLY] Added ${entryId} into canonical subcollection: ${finalBallotId}/candidates`);
    }

    const finalBallotSnap = await getDoc(finalBallotRef);
    if (!finalBallotSnap.exists()) {
      await setDoc(finalBallotRef, {
        seasonId,
        weekNumber: finalWeekNumber,
        cycleStartAt: entry.createdAt || serverTimestamp(),
        votingOpensAt: serverTimestamp(),
        votingClosesAt: serverTimestamp(),
        awardsReleaseAt: serverTimestamp(),
        phase: 'submission',
        candidateEntryIds: [entryId],
        categoryCandidateMap: {
          'best_field_note': [entryId],
          'best_photo_proof': [entryId],
          'most_legendary_errand': [entryId],
          'goblin_energy_award': [entryId],
          'cleanest_completion': [entryId],
          'underdog_award': [entryId]
        },
        totalCandidates: 1,
        isGenerated: true,
        isLocked: false,
        generatedAt: serverTimestamp()
      });
    } else {
      const ballotData = finalBallotSnap.data();
      const currentEntryIds = ballotData.candidateEntryIds || [];
      if (!currentEntryIds.includes(entryId)) {
        const updatedEntryIds = [...currentEntryIds, entryId];
        const categoryMap = ballotData.categoryCandidateMap || {};
        categoriesList.forEach(cat => {
          if (!categoryMap[cat]) categoryMap[cat] = [];
          if (!categoryMap[cat].includes(entryId)) {
            categoryMap[cat].push(entryId);
          }
        });
        await updateDoc(finalBallotRef, {
          candidateEntryIds: updatedEntryIds,
          categoryCandidateMap: categoryMap,
          totalCandidates: updatedEntryIds.length,
          updatedAt: serverTimestamp()
        });
      }
    }
  } catch (err) {
    console.warn(`[BALLOT_ASSEMBLY] addApprovedEntryToWeeklyBallot failed:`, err);
  }
}

/**
 * Resolves all eligible entries for the given week from the Firestore database,
 * querying both existing copied candidate sub-documents and scanning the entry collection
 * dynamically if needed.
 */
export async function getEligibleEntriesForWeek(seasonId: string, weekNumber: number): Promise<any[]> {
  try {
    const ballotId = `${seasonId}_${weekNumber}`;
    const candidatesColRef = collection(db, 'weeklyBallots', ballotId, 'candidates');
    const candidatesSnap = await getDocs(candidatesColRef);

    if (!candidatesSnap.empty) {
      const rawList = candidatesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const verifiedList: any[] = [];
      for (const cand of rawList) {
        if (await isEntryEligibleForBallot(cand, seasonId)) {
          verifiedList.push(cand);
        }
      }
      return verifiedList;
    }

    const entriesRef = collection(db, 'entries');
    const q = query(entriesRef, where('status', '==', 'approved'));
    const entrySnap = await getDocs(q);

    const eligibleList: any[] = [];
    const activeSeason = await getActiveSeason(seasonId);

    for (const d of entrySnap.docs) {
      const entry = { id: d.id, ...d.data() } as any;

      let targetWeek = entry.eligibleWeekNumber || entry.weekNumber;
      let targetSeason = entry.seasonId || 'season-1';

      if (!targetWeek) {
        const approvedAtVal = entry.approvedAt || entry.createdAt || new Date();
        const approvedDate = typeof approvedAtVal.toDate === 'function'
          ? approvedAtVal.toDate()
          : new Date(approvedAtVal);

        const target = getBallotTargetWeek(approvedDate, activeSeason);
        targetWeek = target.weekNumber;
        targetSeason = target.seasonId;
      }

      if (targetWeek === weekNumber && targetSeason === seasonId) {
        if (await isEntryEligibleForBallot(entry, seasonId)) {
          eligibleList.push(entry);
        }
      }
    }

    return eligibleList;
  } catch (err) {
    console.warn(`[BALLOT_ASSEMBLY] getEligibleEntriesForWeek failed:`, err);
    return [];
  }
}

/**
 * Filters the active weekend candidate list for a specific ballot category.
 */
export async function getCandidatesByCategory(seasonId: string, weekNumber: number, categoryId: string): Promise<any[]> {
  try {
    const ballotId = `${seasonId}_${weekNumber}`;
    const candidatesColRef = collection(db, 'weeklyBallots', ballotId, 'candidates');
    const candidatesSnap = await getDocs(candidatesColRef);

    const candidates = candidatesSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
    return candidates.filter(c => c.isEligible && c.categories?.includes(categoryId));
  } catch (err) {
    console.warn(`[BALLOT_ASSEMBLY] getCandidatesByCategory failed:`, err);
    return [];
  }
}

/**
 * Locks the candidate entry list so Saturday/Sunday activity doesn't disrupt voting data pools.
 */
export async function lockWeeklyBallotForVoting(seasonId: string, weekNumber: number): Promise<void> {
  try {
    const ballotId = `${seasonId}_${weekNumber}`;
    const ballotRef = doc(db, 'weeklyBallots', ballotId);
    
    const ballotSnap = await getDoc(ballotRef);
    if (!ballotSnap.exists()) {
      await buildWeeklyBallotFromApprovedEntries(seasonId, weekNumber);
    }

    await updateDoc(ballotRef, {
      isLocked: true,
      phase: 'voting',
      lockedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    console.log(`[BALLOT_ASSEMBLY] Weekly Ballot ${ballotId} locked for voting.`);
  } catch (err) {
    console.warn(`[BALLOT_ASSEMBLY] lockWeeklyBallotForVoting failed:`, err);
  }
}

/**
 * Finalizes weekly ballot candidates, sealing results.
 */
export async function markBallotFinalized(seasonId: string, weekNumber: number): Promise<void> {
  try {
    const ballotId = `${seasonId}_${weekNumber}`;
    const ballotRef = doc(db, 'weeklyBallots', ballotId);

    await updateDoc(ballotRef, {
      phase: 'awards',
      finalizedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    console.log(`[BALLOT_ASSEMBLY] Weekly Ballot ${ballotId} finalized.`);
  } catch (err) {
    console.warn(`[BALLOT_ASSEMBLY] markBallotFinalized failed:`, err);
  }
}
