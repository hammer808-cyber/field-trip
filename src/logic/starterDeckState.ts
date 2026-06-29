import { normalizeEntryStatus, isArchivedEntry } from './entryLogic';

export const STARTER_SIGNAL_IDS = ['starter-1', 'starter-2', 'starter-3'] as const;

export type CanonicalStarterStatus = 'approved' | 'pending_review' | 'needs_more_proof' | 'rejected';

/**
 * Canonical Starter Signals model:
 * - live, non-archived entries are authoritative;
 * - local pending entries fill the gap before Firestore sync;
 * - profile arrays are repairable mirrors and only fill missing IDs;
 * - active drawn cards are display state, not submitted state.
 */
export interface StarterStateEntryLike {
  id?: string;
  uid?: string;
  userId?: string;
  missionId?: string;
  challengeId?: string;
  tripId?: string;
  deckId?: string;
  status?: string;
  archived?: boolean;
  excludedFromProgress?: boolean;
  countsTowardLiveStats?: boolean;
  countsTowardStarter?: boolean;
}

export interface StarterStateProfileLike {
  completedChallengeIds?: string[];
  approvedCompletedChallengeIds?: string[];
  completedMissionIds?: string[];
  submittedChallengeIds?: string[];
  submittedPendingChallengeIds?: string[];
  needsMoreProofChallengeIds?: string[];
  rejectedChallengeIds?: string[];
  activeTrip?: { id?: string } | null;
  activeMissionId?: string | null;
}

export interface StarterStateDrawnCardLike {
  missionId?: string;
  challengeId?: string;
  id?: string;
  status?: string;
  isActive?: boolean;
  archived?: boolean;
  excludedFromProgress?: boolean;
}

export interface CanonicalStarterDeckState {
  starterIds: string[];
  approvedIds: string[];
  pendingIds: string[];
  needsMoreProofIds: string[];
  rejectedIds: string[];
  submittedIds: string[];
  availableIds: string[];
  activeDrawnIds: string[];
  sourceById: Record<string, 'entry' | 'localPending' | 'profileFallback' | 'drawnCard'>;
  statusById: Record<string, CanonicalStarterStatus>;
  starterApprovedCount: number;
  starterPendingCount: number;
  starterSubmittedCount: number;
  starterRejectedCount: number;
  starterNeedsMoreProofCount: number;
  starterComplete: boolean;
}

function cleanId(id: unknown): string | null {
  if (!id) return null;
  const value = String(id).toLowerCase().trim();
  return value || null;
}

function unique(values: Iterable<string>): string[] {
  return Array.from(new Set(Array.from(values).map(v => v.toLowerCase().trim()).filter(Boolean))).sort();
}

function isStarterId(id: string | null): id is string {
  return !!id && STARTER_SIGNAL_IDS.includes(id as any);
}

function addStatus(
  statusById: Map<string, CanonicalStarterStatus>,
  sourceById: Map<string, CanonicalStarterDeckState['sourceById'][string]>,
  id: string | null,
  status: CanonicalStarterStatus,
  source: CanonicalStarterDeckState['sourceById'][string],
  overwrite = false
) {
  if (!isStarterId(id)) return;
  if (!overwrite && statusById.has(id)) return;
  statusById.set(id, status);
  sourceById.set(id, source);
}

export function buildCanonicalStarterDeckState({
  userId,
  entries = [],
  profile,
  localPendingEntries = [],
  drawnMissionCards = [],
  activeTripId,
}: {
  userId?: string | null;
  entries?: StarterStateEntryLike[];
  profile?: StarterStateProfileLike | null;
  localPendingEntries?: StarterStateEntryLike[];
  drawnMissionCards?: StarterStateDrawnCardLike[];
  activeTripId?: string | null;
}): CanonicalStarterDeckState {
  const statusById = new Map<string, CanonicalStarterStatus>();
  const sourceById = new Map<string, CanonicalStarterDeckState['sourceById'][string]>();
  const activeDrawnIds = new Set<string>();
  const uid = cleanId(userId);

  const relevantEntries = entries.filter(entry => {
    if (isArchivedEntry(entry)) return false;
    const entryUid = cleanId(entry.userId || entry.uid);
    if (uid && entryUid && entryUid !== uid) return false;
    const missionId = cleanId(entry.missionId || entry.challengeId || entry.tripId);
    const deckId = cleanId(entry.deckId);
    return isStarterId(missionId) || deckId === 'starter-signals' || deckId === 'starter';
  });

  relevantEntries.forEach(entry => {
    const missionId = cleanId(entry.missionId || entry.challengeId || entry.tripId);
    if (!isStarterId(missionId)) return;
    addStatus(statusById, sourceById, missionId, normalizeEntryStatus(entry.status), 'entry', true);
  });

  localPendingEntries.forEach(entry => {
    const missionId = cleanId(entry.missionId || entry.challengeId || entry.tripId);
    addStatus(statusById, sourceById, missionId, 'pending_review', 'localPending');
  });

  const addProfileIds = (ids: string[] | undefined, status: CanonicalStarterStatus) => {
    (ids || []).forEach(id => addStatus(statusById, sourceById, cleanId(id), status, 'profileFallback'));
  };

  // Profile approved arrays are compatibility mirrors for older approved Starter
  // completions whose entry/review links may be missing from the live query.
  // Do not use profile submitted/pending/rejected arrays as live deck blockers:
  // those legacy mirrors can go stale after resets and trap Starter Signals.
  addProfileIds(profile?.completedChallengeIds, 'approved');
  addProfileIds(profile?.approvedCompletedChallengeIds, 'approved');
  addProfileIds(profile?.completedMissionIds, 'approved');

  drawnMissionCards.forEach(card => {
    if (card.archived === true || card.excludedFromProgress === true) return;
    const missionId = cleanId(card.missionId || card.challengeId || card.id);
    if (!isStarterId(missionId)) return;
    const status = cleanId(card.status);
    if (card.isActive === true || status === 'active' || status === 'drawn') {
      activeDrawnIds.add(missionId);
      sourceById.set(missionId, sourceById.get(missionId) || 'drawnCard');
    }
  });

  const activeId = cleanId(activeTripId || profile?.activeMissionId || profile?.activeTrip?.id);
  if (isStarterId(activeId)) activeDrawnIds.add(activeId);

  const approvedIds = unique(Array.from(statusById.entries()).filter(([, s]) => s === 'approved').map(([id]) => id));
  const pendingIds = unique(Array.from(statusById.entries()).filter(([, s]) => s === 'pending_review').map(([id]) => id));
  const needsMoreProofIds = unique(Array.from(statusById.entries()).filter(([, s]) => s === 'needs_more_proof').map(([id]) => id));
  const rejectedIds = unique(Array.from(statusById.entries()).filter(([, s]) => s === 'rejected').map(([id]) => id));
  const submittedIds = unique([...approvedIds, ...pendingIds, ...needsMoreProofIds, ...rejectedIds]);
  const availableIds = STARTER_SIGNAL_IDS.filter(id => !submittedIds.includes(id));

  return {
    starterIds: [...STARTER_SIGNAL_IDS],
    approvedIds,
    pendingIds,
    needsMoreProofIds,
    rejectedIds,
    submittedIds,
    availableIds,
    activeDrawnIds: unique(activeDrawnIds),
    sourceById: Object.fromEntries(sourceById),
    statusById: Object.fromEntries(statusById),
    starterApprovedCount: approvedIds.length,
    starterPendingCount: pendingIds.length,
    starterSubmittedCount: submittedIds.length,
    starterRejectedCount: rejectedIds.length,
    starterNeedsMoreProofCount: needsMoreProofIds.length,
    starterComplete: approvedIds.length >= STARTER_SIGNAL_IDS.length,
  };
}

export function toStarterProfileMirrors(state: CanonicalStarterDeckState) {
  return {
    completedChallengeIds: state.approvedIds,
    completedMissionIds: state.approvedIds,
    approvedCompletedChallengeIds: state.approvedIds,
    submittedChallengeIds: state.submittedIds.filter(id => !state.rejectedIds.includes(id) && !state.needsMoreProofIds.includes(id)),
    submittedPendingChallengeIds: state.pendingIds,
    rejectedChallengeIds: state.rejectedIds,
    retryableChallengeIds: state.rejectedIds.filter(id => !state.approvedIds.includes(id) && !state.pendingIds.includes(id)),
    needsMoreProofChallengeIds: state.needsMoreProofIds,
    starterDeckComplete: state.starterComplete,
    onboardingCompleted: state.starterComplete,
    activePlayableDeckId: state.starterComplete ? 'heatwave-receipts' : 'starter-signals',
    activeDeckPackId: state.starterComplete ? 'heatwave-receipts' : 'starter-signals',
  };
}
