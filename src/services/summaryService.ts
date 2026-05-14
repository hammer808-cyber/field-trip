import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  writeBatch, 
  serverTimestamp,
  Timestamp,
  getDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { ScoreEvent, WeeklySummary, Season } from '../types/game';
import { calculateCrewWeeklyScore } from '../logic/scoringLogic';

export async function recalculateWeeklySummary(seasonId: string, weekNumber: number) {
  try {
    // 1. Get Season for dates
    const seasonRef = doc(db, 'seasons', seasonId);
    const seasonSnap = await getDoc(seasonRef);
    if (!seasonSnap.exists()) throw new Error('Season not found');
    const season = { id: seasonSnap.id, ...seasonSnap.data() } as Season;

    // 2. Determine date range for the week
    const week = season.weeks.find(w => w.number === weekNumber);
    if (!week) throw new Error(`Week ${weekNumber} not found in season`);
    
    const weekStart = week.startDate;
    // Calculate end date: start of next week or season end
    let weekEnd: Timestamp;
    const nextWeek = season.weeks.find(w => w.number === weekNumber + 1);
    if (nextWeek) {
      weekEnd = nextWeek.startDate;
    } else {
      weekEnd = season.endDate;
    }

    // 3. Fetch all ScoreEvents for this week
    const eventsQuery = query(
      collection(db, 'scoreEvents'),
      where('createdAt', '>=', weekStart),
      where('createdAt', '<', weekEnd)
    );
    const eventsSnap = await getDocs(eventsQuery);
    const events = eventsSnap.docs.map(d => ({ id: d.id, ...d.data() } as ScoreEvent));

    // 4. Aggregate data
    const playerStats: Record<string, { points: number; entriesCount: number; userName: string; crewId?: string; fieldTypeName: string }> = {};
    const crewBaseStats: Record<string, { 
      crewName: string;
      playerScores: number[];
      crewChallengePoints: number;
      voteWinnerCount: number;
      chaosBonusCount: number;
      membersWithEntries: Set<string>;
    }> = {};

    // Get all crews to ensure we have names and participation counts
    const crewsSnap = await getDocs(collection(db, 'crews'));
    const crewsMap: Record<string, string> = {};
    crewsSnap.docs.forEach(d => {
      const data = d.data();
      crewsMap[d.id] = data.name;
      crewBaseStats[d.id] = {
        crewName: data.name,
        playerScores: [],
        crewChallengePoints: 0,
        voteWinnerCount: 0,
        chaosBonusCount: 0,
        membersWithEntries: new Set()
      };
    });

    // Also need total member count per crew for participation rate
    // For scale, we might need a stored count, but for now we'll count
    const usersSnap = await getDocs(collection(db, 'users'));
    const crewMemberCounts: Record<string, number> = {};
    usersSnap.docs.forEach(d => {
      const u = d.data();
      if (u.crewId) {
        crewMemberCounts[u.crewId] = (crewMemberCounts[u.crewId] || 0) + 1;
      }
    });

    events.forEach(ev => {
      // Player stats
      if (!playerStats[ev.userId]) {
        const userDoc = usersSnap.docs.find(d => d.id === ev.userId);
        const userData = userDoc?.data();
        playerStats[ev.userId] = { 
          points: 0, 
          entriesCount: 0, 
          userName: ev.userName, 
          crewId: ev.crewId,
          fieldTypeName: userData?.fieldTypeName || userData?.fieldType || 'FIELD AGENT'
        };
      }
      playerStats[ev.userId].points += ev.points;
      if (ev.type === 'trip_approved') {
        playerStats[ev.userId].entriesCount += 1;
      }

      // Crew stats
      if (ev.crewId && crewBaseStats[ev.crewId]) {
        const c = crewBaseStats[ev.crewId];
        if (ev.type === 'trip_approved') c.membersWithEntries.add(ev.userId);
        if (ev.type === 'vote_winner_bonus') c.voteWinnerCount += 1;
        if (ev.type === 'chaos_modifier_bonus') c.chaosBonusCount += 1;
        if (ev.type === 'crew_bonus') c.crewChallengePoints += ev.points;
      }
    });

    // Populate playerScores into crewBaseStats
    Object.values(playerStats).forEach(ps => {
      if (ps.crewId && crewBaseStats[ps.crewId]) {
        crewBaseStats[ps.crewId].playerScores.push(ps.points);
      }
    });

    // 5. Finalize Summary
    const crewStats: WeeklySummary['crewStats'] = {};
    Object.entries(crewBaseStats).forEach(([crewId, base]) => {
      const totalMembers = crewMemberCounts[crewId] || 1;
      const participationRate = base.membersWithEntries.size / totalMembers;
      
      // Top 3 average
      const sortedScores = [...base.playerScores].sort((a, b) => b - a);
      const topThree = sortedScores.slice(0, 3);
      const avgTopThree = topThree.length > 0 
        ? topThree.reduce((a, b) => a + b, 0) / topThree.length 
        : 0;

      const totalScore = calculateCrewWeeklyScore(topThree, {
        crewChallengePoints: base.crewChallengePoints,
        participationRate: participationRate,
        voteWinnerCount: base.voteWinnerCount,
        chaosBonusCount: base.chaosBonusCount
      });

      crewStats[crewId] = {
        crewName: base.crewName,
        totalScore,
        avgTopThree,
        crewChallengePoints: base.crewChallengePoints,
        participationRate,
        voteWinnerCount: base.voteWinnerCount,
        chaosBonusCount: base.chaosBonusCount
      };
    });

    // 6. Save in Batches
    const batch = writeBatch(db);
    const summaryId = `${seasonId}_${weekNumber}`;
    const summaryRef = doc(db, 'weeklySummaries', summaryId);
    
    const summary: WeeklySummary = {
      id: summaryId,
      seasonId,
      weekNumber,
      playerStats, // Note: if very large, this should move to subcollection
      crewStats,
      lastCalculatedAt: serverTimestamp()
    };
    
    batch.set(summaryRef, summary);
    await batch.commit();

    console.log(`[SUMMARY_JOB] Finished for week ${weekNumber}. Crews: ${Object.keys(crewStats).length}`);
    return true;
  } catch (error) {
    return handleFirestoreError(error, OperationType.WRITE, 'weeklySummaries');
  }
}

export async function getWeeklySummary(seasonId: string, weekNumber: number): Promise<WeeklySummary | null> {
  const summaryId = `${seasonId}_${weekNumber}`;
  const snap = await getDoc(doc(db, 'weeklySummaries', summaryId));
  if (!snap.exists()) return null;
  return snap.data() as WeeklySummary;
}
