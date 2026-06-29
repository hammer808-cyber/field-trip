import { getDeckPackById, getActiveDeckPacks } from '../data/deckPacks';
import { isArchivedEntry, normalizeEntryStatus } from '../logic/entryLogic';
import { StarterCompletionState } from '../utils/starterHelper';
import { buildCanonicalStarterDeckState, STARTER_SIGNAL_IDS } from '../logic/starterDeckState';
import { Entry } from '../constants';
import { TripCard } from '../types/challenges';
import { UserProfile } from './userService';

export type FeatureKey = 'starter' | 'crew' | 'memories' | 'voting' | 'tribunal' | 'heatwave-receipts' | 'socal-summer';

export type CanonicalChallengeStatus =
  | 'available'
  | 'drawn'
  | 'pending_review'
  | 'approved'
  | 'needs_more_proof'
  | 'rejected'
  | 'archived'
  | 'reset';

export interface CanonicalDeckProgress {
  deckId: string;
  deckName: string;
  totalCards: number;
  approvedCount: number;
  pendingCount: number;
  needsMoreProofCount: number;
  rejectedCount: number;
  remainingCount: number;
  eligibleCount: number;
  exhausted: boolean;
  label: string;
  percent: number;
}

export interface CanonicalProgressSnapshot {
  userId: string | null;
  xp: number;
  points: number;
  approvedCompletedChallengeIds: Set<string>;
  submittedPendingChallengeIds: Set<string>;
  submittedChallengeIds: Set<string>;
  needsMoreProofChallengeIds: Set<string>;
  rejectedChallengeIds: Set<string>;
  archivedChallengeIds: Set<string>;
  starter: StarterCompletionState & {
    label: string;
    percent: number;
  };
  deckProgressById: Record<string, CanonicalDeckProgress>;
  onboarding: {
    profileCompleted: boolean;
    canonicalComplete: boolean;
    approvedCount: number;
    requiredCount: number;
  };
  timestamps: {
    lastDrawAt: string | null;
    lastSubmissionAt: string | null;
  };
}

export interface BuildCanonicalProgressInput {
  userId?: string | null;
  profile?: UserProfile | null;
  entries?: Entry[];
  pendingEntries?: Entry[];
  drawnMissionCards?: Array<Record<string, any>>;
  trips?: TripCard[];
  activeMissionId?: string | null;
  activeSubmissionStatus?: string | null;
  starterResetVersion?: string | null;
  activeStarterDeckId?: string | null;
}

export interface ProgressMismatch {
  field: string;
  canonical: string | number | boolean;
  legacy: string | number | boolean;
  severity: 'info' | 'warning' | 'error';
  message: string;
}

const STARTER_IDS = [...STARTER_SIGNAL_IDS];

export function canonicalizeId(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function addIds(target: Set<string>, values: unknown) {
  if (!Array.isArray(values)) return;
  values.forEach(value => {
    const id = canonicalizeId(value);
    if (id) target.add(id);
  });
}

function getEntryMissionId(entry: any): string | null {
  return canonicalizeId(entry?.missionId || entry?.challengeId || entry?.tripId || entry?.id);
}

function latestIso(items: Array<Record<string, any>>, keys: string[]): string | null {
  const newest = items.reduce((latest, item) => {
    const raw = keys.map(key => item?.[key]).find(Boolean);
    if (!raw) return latest;
    const millis = typeof raw?.toDate === 'function'
      ? raw.toDate().getTime()
      : typeof raw?.seconds === 'number'
        ? raw.seconds * 1000
        : new Date(raw).getTime();
    return Number.isFinite(millis) ? Math.max(latest, millis) : latest;
  }, 0);
  return newest > 0 ? new Date(newest).toISOString() : null;
}

export function buildCanonicalProgress(input: BuildCanonicalProgressInput): CanonicalProgressSnapshot {
  const profile = input.profile || null;
  const allEntries = [...(input.pendingEntries || []), ...(input.entries || [])];
  const activeEntries = allEntries.filter(entry => !isArchivedEntry(entry));
  const canonicalStarterState = buildCanonicalStarterDeckState({
    userId: input.userId || profile?.id || null,
    entries: activeEntries,
    profile,
    localPendingEntries: input.pendingEntries,
    drawnMissionCards: input.drawnMissionCards,
    activeTripId: input.activeMissionId || null
  });

  const approvedCompletedChallengeIds = new Set<string>();
  const submittedPendingChallengeIds = new Set<string>();
  const submittedChallengeIds = new Set<string>();
  const needsMoreProofChallengeIds = new Set<string>();
  const rejectedChallengeIds = new Set<string>();
  const archivedChallengeIds = new Set<string>();

  if (activeEntries.length === 0) {
    addIds(approvedCompletedChallengeIds, (profile as any)?.approvedCompletedChallengeIds);
    addIds(approvedCompletedChallengeIds, profile?.completedChallengeIds);
    addIds(needsMoreProofChallengeIds, profile?.needsMoreProofChallengeIds);
    addIds(rejectedChallengeIds, profile?.rejectedChallengeIds);
  }

  allEntries.forEach(entry => {
    const missionId = getEntryMissionId(entry);
    if (!missionId) return;

    if (isArchivedEntry(entry)) {
      archivedChallengeIds.add(missionId);
      return;
    }

    const status = normalizeEntryStatus(entry.status);
    if (status === 'approved') {
      approvedCompletedChallengeIds.add(missionId);
      submittedChallengeIds.add(missionId);
    } else if (status === 'pending_review') {
      submittedPendingChallengeIds.add(missionId);
    } else if (status === 'needs_more_proof') {
      needsMoreProofChallengeIds.add(missionId);
    } else if (status === 'rejected') {
      rejectedChallengeIds.add(missionId);
    }
  });

  approvedCompletedChallengeIds.forEach(id => {
    submittedPendingChallengeIds.delete(id);
    needsMoreProofChallengeIds.delete(id);
    rejectedChallengeIds.delete(id);
  });
  needsMoreProofChallengeIds.forEach(id => submittedPendingChallengeIds.delete(id));
  rejectedChallengeIds.forEach(id => submittedPendingChallengeIds.delete(id));

  STARTER_IDS.forEach(id => {
    approvedCompletedChallengeIds.delete(id);
    submittedPendingChallengeIds.delete(id);
    submittedChallengeIds.delete(id);
    needsMoreProofChallengeIds.delete(id);
    rejectedChallengeIds.delete(id);
  });
  canonicalStarterState.approvedIds.forEach(id => {
    approvedCompletedChallengeIds.add(id);
    submittedChallengeIds.add(id);
  });
  canonicalStarterState.pendingIds.forEach(id => submittedPendingChallengeIds.add(id));
  canonicalStarterState.needsMoreProofIds.forEach(id => needsMoreProofChallengeIds.add(id));
  canonicalStarterState.rejectedIds.forEach(id => rejectedChallengeIds.add(id));
  canonicalStarterState.submittedIds.forEach(id => submittedChallengeIds.add(id));

  const starterStatus: StarterCompletionState['status'] = canonicalStarterState.starterComplete
    ? 'COMPLETE'
    : canonicalStarterState.needsMoreProofIds.length > 0
      ? 'NEEDS_MORE_PROOF'
      : canonicalStarterState.rejectedIds.length > 0
        ? 'REJECTED_RETRY_AVAILABLE'
        : canonicalStarterState.starterSubmittedCount >= STARTER_IDS.length
          ? 'PENDING_REVIEW'
          : canonicalStarterState.starterSubmittedCount > 0 || canonicalStarterState.activeDrawnIds.length > 0
            ? 'IN_PROGRESS'
            : 'NOT_STARTED';
  const starter: StarterCompletionState = {
    starterApprovedCount: canonicalStarterState.starterApprovedCount,
    starterRequiredCount: STARTER_IDS.length,
    starterComplete: canonicalStarterState.starterComplete,
    pendingStarterCount: canonicalStarterState.starterPendingCount,
    retryStarterCount: canonicalStarterState.starterRejectedCount,
    needsMoreProofStarterCount: canonicalStarterState.starterNeedsMoreProofCount,
    submittedUniqueCount: canonicalStarterState.starterSubmittedCount,
    submittedMissionIds: canonicalStarterState.submittedIds,
    needsMoreProofMissionId: canonicalStarterState.needsMoreProofIds[0] || null,
    needsMoreProofEntryId: null,
    rejectedMissionId: canonicalStarterState.rejectedIds[0] || null,
    rejectedEntryId: null,
    nextStarterAction: canonicalStarterState.availableIds.length > 0 ? 'Draw Starter Mission' : 'View Review Status',
    status: starterStatus,
    canonical: {
      sourceById: canonicalStarterState.sourceById,
      statusById: canonicalStarterState.statusById
    }
  };
  const starterPercent = Math.min(100, Math.round((starter.starterApprovedCount / starter.starterRequiredCount) * 100));

  const deckProgressById: Record<string, CanonicalDeckProgress> = {};
  getActiveDeckPacks().forEach(pack => {
    deckProgressById[pack.packId] = getDeckProgressFromSnapshot(pack.packId, {
      approvedCompletedChallengeIds,
      submittedPendingChallengeIds,
      needsMoreProofChallengeIds,
      rejectedChallengeIds
    });
  });

  const xp = profile?.xp !== undefined ? profile.xp : (profile?.points || 0);

  return {
    userId: input.userId || profile?.id || null,
    xp,
    points: xp,
    approvedCompletedChallengeIds,
    submittedPendingChallengeIds,
    submittedChallengeIds,
    needsMoreProofChallengeIds,
    rejectedChallengeIds,
    archivedChallengeIds,
    starter: {
      ...starter,
      label: `${starter.starterApprovedCount}/${starter.starterRequiredCount}`,
      percent: starterPercent
    },
    deckProgressById,
    onboarding: {
      profileCompleted: !!profile?.onboardingCompleted,
      canonicalComplete: starter.starterComplete,
      approvedCount: starter.starterApprovedCount,
      requiredCount: starter.starterRequiredCount
    },
    timestamps: {
      lastDrawAt: latestIso(input.drawnMissionCards || [], ['drawnAt', 'updatedAt', 'createdAt']),
      lastSubmissionAt: latestIso(activeEntries as Array<Record<string, any>>, ['submittedAt', 'createdAt', 'updatedAt'])
    }
  };
}

export function getStarterProgress(snapshot: CanonicalProgressSnapshot) {
  return snapshot.starter;
}

export function getDeckProgress(snapshot: CanonicalProgressSnapshot, deckId: string): CanonicalDeckProgress {
  return snapshot.deckProgressById[deckId] || getDeckProgressFromSnapshot(deckId, snapshot);
}

export function getUserXp(snapshot: CanonicalProgressSnapshot) {
  return snapshot.xp;
}

export function canAccessFeature(
  snapshot: CanonicalProgressSnapshot,
  featureKey: FeatureKey,
  options: { isAdmin?: boolean; forceUnlocked?: boolean; heatwaveUnlocked?: boolean; socalUnlocked?: boolean; featureEnabled?: boolean } = {}
) {
  if (options.isAdmin || options.forceUnlocked) return true;
  if (featureKey === 'starter') return true;
  if (!snapshot.starter.starterComplete) return false;
  if (featureKey === 'heatwave-receipts') return !!options.heatwaveUnlocked;
  if (featureKey === 'socal-summer') return options.socalUnlocked !== false;
  if (featureKey === 'crew') return options.featureEnabled !== false;
  return true;
}

export function getChallengeStatus(snapshot: CanonicalProgressSnapshot, challengeId: string, activeMissionId?: string | null): CanonicalChallengeStatus {
  const id = canonicalizeId(challengeId);
  if (!id) return 'available';
  if (snapshot.archivedChallengeIds.has(id)) return 'archived';
  if (snapshot.approvedCompletedChallengeIds.has(id)) return 'approved';
  if (snapshot.submittedPendingChallengeIds.has(id)) return 'pending_review';
  if (snapshot.needsMoreProofChallengeIds.has(id)) return 'needs_more_proof';
  if (snapshot.rejectedChallengeIds.has(id)) return 'rejected';
  if (activeMissionId && canonicalizeId(activeMissionId) === id) return 'drawn';
  return 'available';
}

export function getResetDefaults() {
  return {
    submittedChallengeIds: [],
    submittedPendingChallengeIds: [],
    approvedCompletedChallengeIds: [],
    completedChallengeIds: [],
    rejectedChallengeIds: [],
    needsMoreProofChallengeIds: [],
    starterCompleted: false,
    starterProgress: 0,
    seasonalProgress: 0,
    activeDraw: null,
    activeDrawId: null,
    activeMissionId: null,
    activeSubmissionStatus: null,
    drawHistory: [],
    completedMissions: [],
    missionCooldowns: {},
    deckProgress: {},
    deckStats: {},
    deckState: {}
  };
}

export function getProgressMismatches(snapshot: CanonicalProgressSnapshot, profile?: UserProfile | null): ProgressMismatch[] {
  const mismatches: ProgressMismatch[] = [];
  if (!profile) return mismatches;

  const legacyCompleted = new Set<string>();
  addIds(legacyCompleted, profile.completedChallengeIds);
  const legacyApproved = new Set<string>();
  addIds(legacyApproved, (profile as any).approvedCompletedChallengeIds || profile.completedChallengeIds);
  const legacyPending = new Set<string>();
  addIds(legacyPending, profile.submittedPendingChallengeIds);

  const canonicalStarterCount = snapshot.starter.starterApprovedCount;
  const legacyStarterCount = STARTER_IDS.filter(id => legacyApproved.has(id) || legacyCompleted.has(id)).length;

  if (legacyStarterCount !== canonicalStarterCount) {
    mismatches.push({
      field: 'starter approved count',
      canonical: canonicalStarterCount,
      legacy: legacyStarterCount,
      severity: 'warning',
      message: 'Profile starter count differs from active approved entries.'
    });
  }

  if (!!profile.onboardingCompleted !== snapshot.starter.starterComplete) {
    mismatches.push({
      field: 'onboardingCompleted',
      canonical: snapshot.starter.starterComplete,
      legacy: !!profile.onboardingCompleted,
      severity: 'warning',
      message: 'Unlocks should use approved Starter entries, not this profile flag.'
    });
  }

  if (profile.starterApprovedCount !== undefined && profile.starterApprovedCount !== canonicalStarterCount) {
    mismatches.push({
      field: 'starterApprovedCount',
      canonical: canonicalStarterCount,
      legacy: profile.starterApprovedCount,
      severity: 'warning',
      message: 'Cached starterApprovedCount is stale.'
    });
  }

  const stalePending = Array.from(legacyPending).filter(id => !snapshot.submittedPendingChallengeIds.has(id));
  if (stalePending.length > 0) {
    mismatches.push({
      field: 'submittedPendingChallengeIds',
      canonical: snapshot.submittedPendingChallengeIds.size,
      legacy: legacyPending.size,
      severity: 'info',
      message: `Legacy pending array has stale ids: ${stalePending.join(', ')}`
    });
  }

  return mismatches;
}

function getDeckProgressFromSnapshot(
  deckId: string,
  snapshot: Pick<CanonicalProgressSnapshot, 'approvedCompletedChallengeIds' | 'submittedPendingChallengeIds' | 'needsMoreProofChallengeIds' | 'rejectedChallengeIds'>
): CanonicalDeckProgress {
  const pack = getDeckPackById(deckId);
  const missionIds = (pack?.missionIds || []).map(id => canonicalizeId(id)).filter(Boolean) as string[];
  const totalCards = missionIds.length;
  const approvedCount = missionIds.filter(id => snapshot.approvedCompletedChallengeIds.has(id)).length;
  const pendingCount = missionIds.filter(id => snapshot.submittedPendingChallengeIds.has(id)).length;
  const needsMoreProofCount = missionIds.filter(id => snapshot.needsMoreProofChallengeIds.has(id)).length;
  const rejectedCount = missionIds.filter(id => snapshot.rejectedChallengeIds.has(id)).length;
  const remainingCount = missionIds.filter(id =>
    !snapshot.approvedCompletedChallengeIds.has(id) &&
    !snapshot.submittedPendingChallengeIds.has(id) &&
    !snapshot.needsMoreProofChallengeIds.has(id)
  ).length;
  const eligibleCount = missionIds.filter(id =>
    !snapshot.approvedCompletedChallengeIds.has(id) &&
    !snapshot.submittedPendingChallengeIds.has(id) &&
    !snapshot.needsMoreProofChallengeIds.has(id)
  ).length;

  return {
    deckId,
    deckName: pack?.packName || pack?.title || deckId,
    totalCards,
    approvedCount,
    pendingCount,
    needsMoreProofCount,
    rejectedCount,
    remainingCount,
    eligibleCount,
    exhausted: totalCards > 0 && eligibleCount === 0 && pendingCount === 0 && needsMoreProofCount === 0 && approvedCount < totalCards,
    label: `${approvedCount}/${totalCards}`,
    percent: totalCards > 0 ? Math.min(100, Math.round((approvedCount / totalCards) * 100)) : 0
  };
}
