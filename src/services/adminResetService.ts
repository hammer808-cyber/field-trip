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
    submittedChallengeIds: [],
    submittedPendingChallengeIds: [],
    approvedCompletedChallengeIds: [],
    completedChallengeIds: [],

    activeChallengeId: deleteField(),
    activeMissionId: deleteField(),
    currentChallengeId: deleteField(),
    currentMissionId: deleteField(),

    starterProgress: deleteField(),
    deckProgress: deleteField(),

    lastDrawnAt: deleteField(),
    lastSubmissionAt: deleteField(),

    missionStateResetAt: serverTimestamp(),
  });
}
