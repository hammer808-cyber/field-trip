import { STARTER_SIGNAL_IDS } from './starterDeckState';
import type { StarterCompletionState } from '../utils/starterHelper';

export type PostSubmitStarterGuidance = {
  status: StarterCompletionState['status'];
  progressLine: string | null;
  statusLine: string;
  primaryHref: string;
  primaryLabel: string;
  sentCount: number;
  requiredCount: number;
};

type GuidanceInput = {
  starter: Pick<
    StarterCompletionState,
    | 'status'
    | 'starterComplete'
    | 'starterApprovedCount'
    | 'starterRequiredCount'
    | 'submittedUniqueCount'
    | 'submittedMissionIds'
    | 'needsMoreProofMissionId'
    | 'rejectedMissionId'
    | 'needsMoreProofStarterCount'
    | 'retryStarterCount'
  >;
  currentMissionId?: string | null;
  reviewStatus?: string | null;
};

function isStarterMissionId(id: string | null | undefined): id is string {
  return !!id && STARTER_SIGNAL_IDS.includes(id as typeof STARTER_SIGNAL_IDS[number]);
}

function normalizeId(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

/**
 * Post-submission Starter next-step copy/CTA.
 * Uses canonical Starter status; optimistic pending only fills a lagging
 * submitted count and never overrides an active needs-more-proof / rejected state
 * for a different mission.
 */
export function buildPostSubmitStarterGuidance(input: GuidanceInput): PostSubmitStarterGuidance {
  const starter = input.starter;
  const requiredCount = starter.starterRequiredCount || STARTER_SIGNAL_IDS.length;
  const currentMissionId = normalizeId(input.currentMissionId);
  const reviewStatus = String(input.reviewStatus || '').toLowerCase();
  const submittedIds = new Set((starter.submittedMissionIds || []).map((id) => String(id).toLowerCase()));

  const currentIsOptimisticPending =
    isStarterMissionId(currentMissionId)
    && (reviewStatus === 'pending_review' || reviewStatus === '' || reviewStatus === 'submitted');

  // If this exact mission was just re-submitted after repair/reject, treat that
  // local pending result as ahead of stale canonical repair status for THIS id.
  const currentRepairResolvedOptimistically =
    currentIsOptimisticPending
    && (
      normalizeId(starter.needsMoreProofMissionId) === currentMissionId
      || normalizeId(starter.rejectedMissionId) === currentMissionId
    );

  const needsMoreActive =
    starter.status === 'NEEDS_MORE_PROOF'
    && !!starter.needsMoreProofMissionId
    && !(currentRepairResolvedOptimistically && normalizeId(starter.needsMoreProofMissionId) === currentMissionId);

  const rejectedActive =
    !needsMoreActive
    && starter.status === 'REJECTED_RETRY_AVAILABLE'
    && !!starter.rejectedMissionId
    && !(currentRepairResolvedOptimistically && normalizeId(starter.rejectedMissionId) === currentMissionId);

  let sentCount = starter.submittedUniqueCount || submittedIds.size;
  if (currentIsOptimisticPending && currentMissionId && !submittedIds.has(currentMissionId)) {
    sentCount += 1;
  }
  sentCount = Math.min(Math.max(0, sentCount), requiredCount);

  if (starter.starterComplete || starter.status === 'COMPLETE') {
    return {
      status: 'COMPLETE',
      progressLine: 'Starter complete',
      statusLine: isApprovedStatus(reviewStatus)
        ? 'Your proof was approved.'
        : 'Your proof is waiting for review.',
      // Post-unlock redirect (Nov 27, 2026, Zach's call): once the game
      // unlocks after the one Starter card is done, the player goes
      // straight to picking a deck — the Dex decks shelf — not back to
      // drawing another Starter mission.
      primaryHref: '/dex/decks',
      primaryLabel: 'Pick a deck →',
      sentCount: requiredCount,
      requiredCount,
    };
  }

  if (needsMoreActive) {
    const missionId = normalizeId(starter.needsMoreProofMissionId)!;
    return {
      status: 'NEEDS_MORE_PROOF',
      progressLine: `Starter proof ${Math.min(sentCount || requiredCount, requiredCount)} of ${requiredCount} sent`,
      statusLine: 'One starter proof needs a clearer photo.',
      primaryHref: `/capture?id=${encodeURIComponent(missionId)}`,
      primaryLabel: 'Add More Proof →',
      sentCount,
      requiredCount,
    };
  }

  if (rejectedActive) {
    const missionId = normalizeId(starter.rejectedMissionId)!;
    return {
      status: 'REJECTED_RETRY_AVAILABLE',
      progressLine: `Starter proof ${Math.min(sentCount || requiredCount, requiredCount)} of ${requiredCount} sent`,
      statusLine: 'One starter proof was rejected. Try again.',
      primaryHref: `/capture?id=${encodeURIComponent(missionId)}`,
      primaryLabel: 'Retry Mission →',
      sentCount,
      requiredCount,
    };
  }

  const allRequiredSent =
    sentCount >= requiredCount
    || starter.status === 'PENDING_REVIEW'
    // A repair that was just re-submitted is waiting for review even
    // though the deck is not fully sent: the player did the work, the
    // review is pending, and the stale canonical status may still say
    // NEEDS_MORE_PROOF until the subscription catches up.
    || currentRepairResolvedOptimistically;

  if (allRequiredSent) {
    return {
      status: 'PENDING_REVIEW',
      // The gate is one approved Starter, not all five sent: sentCount is
      // the real number of proofs sent (usually 1 while waiting), never
      // the deck size.
      progressLine: `Starter proof ${sentCount} of ${requiredCount} sent`,
      statusLine: 'Your proof is waiting for review.',
      primaryHref: '/profile?tab=logbook',
      primaryLabel: 'View proof status',
      sentCount,
      requiredCount,
    };
  }

  if (starter.status === 'NOT_STARTED' && sentCount === 0) {
    return {
      status: 'NOT_STARTED',
      progressLine: null,
      statusLine: isApprovedStatus(reviewStatus)
        ? 'Your proof was approved.'
        : 'Your proof is waiting for review.',
      primaryHref: '/missions',
      primaryLabel: 'Back to Missions',
      sentCount: 0,
      requiredCount,
    };
  }

  return {
    status: 'IN_PROGRESS',
    progressLine: `Starter proof ${Math.max(sentCount, 1)} of ${requiredCount} sent`,
    statusLine: isApprovedStatus(reviewStatus)
      ? 'Your proof was approved.'
      : reviewStatus === 'needs_more_proof'
        ? 'Your proof needs a bit more. Try again from Missions.'
        : 'Your proof is waiting for review.',
    primaryHref: '/missions',
    primaryLabel: 'Back to Missions',
    sentCount: Math.max(sentCount, 1),
    requiredCount,
  };
}

function isApprovedStatus(reviewStatus: string) {
  return reviewStatus === 'approved';
}
