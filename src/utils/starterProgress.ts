import { getDeckPackById } from '../data/deckPacks';
import { normalizeEntryStatus, resolveEntryMissionId, resolveEntryUserId } from './canonicalEntry';

export const CANONICAL_STARTER_DECK_ID = 'starter-signals';
export const STARTER_REQUIRED_APPROVALS = 3;

export type StarterMissionStatus = 'unseen' | 'approved' | 'pending_review' | 'needs_more_proof' | 'rejected';

export interface CanonicalStarterMissionState {
  missionId: string;
  status: StarterMissionStatus;
  entryId?: string | null;
}

export interface CanonicalStarterProgress {
  starterDeckId: string;
  starterMissionIds: string[];
  requiredApprovals: number;
  approvedIds: string[];
  pendingIds: string[];
  needsMoreProofIds: string[];
  rejectedIds: string[];
  approvedCount: number;
  pendingCount: number;
  needsMoreProofCount: number;
  rejectedCount: number;
  submittedUniqueCount: number;
  availableIds: string[];
  isComplete: boolean;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'PENDING_REVIEW' | 'NEEDS_MORE_PROOF' | 'REJECTED_RETRY_AVAILABLE' | 'COMPLETE';
  nextMissionId: string | null;
  nextAction: 'draw_starter_mission' | 'start_starter_mission' | 'wait_for_review' | 'add_more_proof' | 'retry_rejected_mission' | 'starter_complete';
}

function cleanId(value: unknown): string {
  return typeof value === 'string' ? value.toLowerCase().trim() : '';
}

export function getCanonicalStarterMissionIds(): string[] {
  const starterPack = getDeckPackById(CANONICAL_STARTER_DECK_ID);
  return (starterPack?.missionIds || ['starter-1', 'starter-2', 'starter-3']).map(cleanId).filter(Boolean);
}

export function isCanonicalStarterMissionId(missionId: unknown): boolean {
  const missionIdClean = cleanId(missionId);
  return missionIdClean ? getCanonicalStarterMissionIds().includes(missionIdClean) : false;
}

export function getCanonicalStarterDeckId(deckId?: unknown): string {
  const deckIdClean = cleanId(deckId);
  return deckIdClean || CANONICAL_STARTER_DECK_ID;
}

export function resolveStarterMissionId(entry: unknown): string {
  return resolveEntryMissionId(entry);
}

export function isEntryInStarterDeck(entry: unknown, activeStarterDeckId?: string | null): boolean {
  const record = entry && typeof entry === 'object' ? entry as Record<string, unknown> : {};
  const missionId = resolveStarterMissionId(record);
  const deckId = cleanId(record.deckId);
  const starterDeckId = getCanonicalStarterDeckId(activeStarterDeckId);
  return isCanonicalStarterMissionId(missionId) || deckId === starterDeckId || deckId === 'starter';
}

export function getStarterProgressFromEntries(
  userId: string,
  entries: unknown[],
  options: {
    activeMissionId?: string | null;
    starterResetVersion?: string | null;
    activeStarterDeckId?: string | null;
  } = {}
): CanonicalStarterProgress {
  const starterMissionIds = getCanonicalStarterMissionIds();
  const starterMissionSet = new Set(starterMissionIds);
  const activeMissionId = cleanId(options.activeMissionId);
  const approved = new Set<string>();
  const pending = new Set<string>();
  const needsMoreProof = new Set<string>();
  const rejected = new Set<string>();
  const submitted = new Set<string>();

  for (const rawEntry of entries) {
    const entry = rawEntry && typeof rawEntry === 'object' ? rawEntry as Record<string, unknown> : {};
    if (userId && resolveEntryUserId(entry) !== userId) continue;
    if (entry.archived === true || entry.countsTowardStarter === false) continue;
    if (options.starterResetVersion && entry.starterResetVersion !== options.starterResetVersion) continue;
    if (!isEntryInStarterDeck(entry, options.activeStarterDeckId)) continue;

    const missionId = resolveStarterMissionId(entry);
    if (!starterMissionSet.has(missionId)) continue;

    const status = normalizeEntryStatus(entry.status);
    if (status === 'approved') {
      approved.add(missionId);
      submitted.add(missionId);
    } else if (status === 'pending_review') {
      pending.add(missionId);
      submitted.add(missionId);
    } else if (status === 'needs_more_proof') {
      needsMoreProof.add(missionId);
      submitted.add(missionId);
    } else if (status === 'rejected') {
      rejected.add(missionId);
      submitted.add(missionId);
    }
  }

  approved.forEach(id => {
    pending.delete(id);
    needsMoreProof.delete(id);
    rejected.delete(id);
  });
  pending.forEach(id => {
    needsMoreProof.delete(id);
    rejected.delete(id);
  });
  needsMoreProof.forEach(id => {
    rejected.delete(id);
  });

  const availableIds = starterMissionIds.filter(id =>
    !approved.has(id) &&
    !pending.has(id) &&
    !needsMoreProof.has(id) &&
    !rejected.has(id)
  );
  const approvedCount = approved.size;
  const pendingCount = pending.size;
  const needsMoreProofCount = needsMoreProof.size;
  const rejectedCount = rejected.size;
  const isComplete = approvedCount >= STARTER_REQUIRED_APPROVALS;

  let status: CanonicalStarterProgress['status'] = 'NOT_STARTED';
  let nextMissionId: string | null = null;
  let nextAction: CanonicalStarterProgress['nextAction'] = 'draw_starter_mission';

  if (isComplete) {
    status = 'COMPLETE';
    nextAction = 'starter_complete';
  } else if (availableIds.length > 0) {
    status = approvedCount === 0 && pendingCount === 0 && needsMoreProofCount === 0 && rejectedCount === 0 && !activeMissionId ? 'NOT_STARTED' : 'IN_PROGRESS';
    nextMissionId = activeMissionId && starterMissionSet.has(activeMissionId) && !approved.has(activeMissionId) && !pending.has(activeMissionId) && !needsMoreProof.has(activeMissionId) && !rejected.has(activeMissionId)
      ? activeMissionId
      : availableIds[0] || null;
    nextAction = 'start_starter_mission';
  } else if (needsMoreProofCount > 0) {
    status = 'NEEDS_MORE_PROOF';
    nextMissionId = Array.from(needsMoreProof)[0] || null;
    nextAction = 'add_more_proof';
  } else if (rejectedCount > 0) {
    status = 'REJECTED_RETRY_AVAILABLE';
    nextMissionId = Array.from(rejected)[0] || null;
    nextAction = 'retry_rejected_mission';
  } else if (pendingCount > 0) {
    status = 'PENDING_REVIEW';
    nextMissionId = Array.from(pending)[0] || null;
    nextAction = 'wait_for_review';
  }

  return {
    starterDeckId: CANONICAL_STARTER_DECK_ID,
    starterMissionIds,
    requiredApprovals: STARTER_REQUIRED_APPROVALS,
    approvedIds: Array.from(approved),
    pendingIds: Array.from(pending),
    needsMoreProofIds: Array.from(needsMoreProof),
    rejectedIds: Array.from(rejected),
    approvedCount,
    pendingCount,
    needsMoreProofCount,
    rejectedCount,
    submittedUniqueCount: submitted.size,
    availableIds,
    isComplete,
    status,
    nextMissionId,
    nextAction
  };
}
