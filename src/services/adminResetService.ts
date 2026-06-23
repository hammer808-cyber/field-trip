import { doc, updateDoc, deleteField, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";

/**
 * Resets mission-related data for a user in development/admin mode.
 * Preserves onboarding, persona, classification, and core identity fields.
 */
export async function resetMyMissionState(userId: string) {
  if (!userId) {
    throw new Error("Missing userId for mission reset.");
  }

  const userRef = doc(db, "users", userId);

  await updateDoc(userRef, {
    drawnChallengeIds: [],
    drawnMissionIds: [],
    drawnMissionCards: [],
    drawHistory: [],
    submittedChallengeIds: [],
    submittedPendingChallengeIds: [],
    approvedCompletedChallengeIds: [],
    completedChallengeIds: [],
    completedMissionIds: [],
    completedMissions: [],
    rejectedChallengeIds: [],
    needsMoreProofChallengeIds: [],

    activeChallengeId: deleteField(),
    activeChallenge: deleteField(),
    activeMissionId: deleteField(),
    activeTripId: deleteField(),
    activeTrip: null,
    activeDraw: null,
    activeDrawId: null,
    activeMissionCard: null,
    currentChallengeId: deleteField(),
    currentMissionId: deleteField(),
    drawnCard: deleteField(),

    starterCompleted: false,
    starterDeckComplete: false,
    starterProgress: 0,
    seasonalProgress: 0,
    deckProgress: {},
    deckStats: {},
    deckState: {},
    missionCooldowns: {},
    tripProgress: {},

    xp: 0,
    points: 0,
    totalXP: 0,
    totalPoints: 0,
    seasonXP: 0,
    seasonPoints: 0,
    weeklyXP: 0,
    weeklyXp: 0,
    weeklyPoints: 0,
    score: 0,
    pendingPoints: 0,
    approvedMissionCount: 0,
    approvedEntriesCount: 0,
    entriesApprovedCount: 0,
    totalSubmissions: 0,
    totalApprovedSubmissions: 0,
    soloTripsCount: 0,
    crewTripsCount: 0,
    boldTripsCount: 0,
    completedCoreChallenges: 0,
    level: 1,

    lastDrawnAt: deleteField(),
    lastSubmissionAt: deleteField(),

    missionStateResetAt: serverTimestamp(),
  });
}
