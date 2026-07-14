import { normalizeEntryStatus } from './entryLogic';

export type CanonicalProofStatus = 'pending_review' | 'approved' | 'needs_more_proof' | 'rejected';

export interface ProofDistributionVisibility {
  showInCommunityFeed: boolean;
  showInCrewFeed: boolean;
  allowWeeklyVoting: boolean;
}

export interface ProofDistributionModeration {
  isHidden: boolean;
  hiddenReason: string | null;
  isSuspected: boolean;
  isTribunalEligible: boolean;
}

export interface ProofDistributionContext {
  activeCrewId?: string | null;
  requireApprovedAt?: boolean;
}

export interface NormalizedProofModel {
  id: string;
  userId: string;
  challengeId: string;
  deckId: string;
  seasonId: string;
  crewId: string;
  status: CanonicalProofStatus;
  rawStatus: string;
  approvalTime: number;
  submittedTime: number;
  mediaReference: string;
  fieldNote: string;
  earnedXp: number;
  visibility: ProofDistributionVisibility;
  moderation: ProofDistributionModeration;
  isCommunityEligible: boolean;
  communityExclusionReasons: string[];
}

export interface ProofLogbookCounts {
  totalSubmitted: number;
  pendingReview: number;
  approvedVerified: number;
  rejectedOrNeedsMoreProof: number;
  communityEligible: number;
}

export const CANONICAL_PROOF_STATUSES: CanonicalProofStatus[] = [
  'pending_review',
  'approved',
  'needs_more_proof',
  'rejected'
];

export function getEntryId(entry: any): string {
  return String(entry?.entryId || entry?.id || entry?.proofId || '').trim();
}

export function getEntryOwnerId(entry: any): string {
  return String(entry?.userId || entry?.uid || entry?.firebaseUid || '').trim();
}

export function getEntryChallengeId(entry: any): string {
  return String(entry?.challengeId || entry?.tripId || entry?.missionId || entry?.cardId || '').trim();
}

export function getEntryDeckId(entry: any): string {
  return String(entry?.deckId || entry?.deck || entry?.packId || '').trim();
}

export function getEntrySeasonId(entry: any): string {
  return String(entry?.seasonId || entry?.season || '').trim();
}

export function getEntryCrewId(entry: any): string {
  const crewIds = Array.isArray(entry?.crewIds) ? entry.crewIds : [];
  return String(entry?.crewId || entry?.activeCrewId || entry?.crew?.id || crewIds[0] || '').trim();
}

export function getEntryFieldNote(entry: any): string {
  return String(entry?.fieldNote || entry?.note || entry?.caption || entry?.reflection || '').trim();
}

export function getEntryEarnedXp(entry: any): number {
  const raw =
    entry?.scoring?.totalXpAwarded ??
    entry?.scoring?.awardedXp ??
    entry?.totalXpAwarded ??
    entry?.awardedXP ??
    entry?.awardedPoints ??
    entry?.pointsAwarded ??
    entry?.earnedXp ??
    entry?.xp ??
    entry?.points ??
    entry?.score ??
    0;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getProofImageUrl(entry: any): string {
  return String(
    entry?.photoUrl ||
    entry?.imageUrl ||
    entry?.mediaUrl ||
    entry?.proofImage ||
    entry?.proofImageUrl ||
    entry?.proofUrl ||
    ''
  ).trim();
}

export function getProofImageReference(entry: any): string {
  return String(
    getProofImageUrl(entry) ||
    entry?.storagePath ||
    entry?.photoStoragePath ||
    entry?.imageStoragePath ||
    entry?.proofImageRef ||
    entry?.proofStoragePath ||
    ''
  ).trim();
}

export function isRenderableProofImageReference(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const reference = value.trim();
  if (!reference) return false;
  if (reference.startsWith('blob:') || reference.startsWith('file:') || reference.startsWith('capacitor:')) return false;
  if (reference.startsWith('http://') || reference.startsWith('https://') || reference.startsWith('data:image/')) return true;
  return /^[A-Za-z0-9/_@.\-]+$/.test(reference);
}

export function hasRenderableProofImage(entry: any): boolean {
  return isRenderableProofImageReference(getProofImageReference(entry));
}

export function toMillis(value: any): number {
  if (!value) return 0;
  if (value?.toDate) return value.toDate().getTime();
  if (typeof value?.seconds === 'number') return value.seconds * 1000;
  if (value instanceof Date) return value.getTime();
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getEntrySubmittedTime(entry: any): number {
  return toMillis(entry?.submittedAt || entry?.createdAt || entry?.capturedAt);
}

export function getEntryApprovedTime(entry: any): number {
  return toMillis(entry?.approvedAt || entry?.reviewedAt || entry?.completedAt || entry?.createdAt || entry?.submittedAt);
}

export function hasEffectiveApprovedAt(entry: any): boolean {
  if (toMillis(entry?.approvedAt || entry?.reviewedAt || entry?.completedAt) > 0) return true;
  return isCanonicalApprovedProof(entry) && toMillis(entry?.createdAt || entry?.submittedAt) > 0;
}

export function normalizeProofVisibility(entry: any): ProofDistributionVisibility {
  const visibility = entry?.visibility;
  const visibilityMap = visibility && typeof visibility === 'object' ? visibility : {};
  const visibilityString = typeof visibility === 'string' ? visibility : '';
  const publicLegacy = entry?.isPublic === true || entry?.communityVisible === true || visibilityString === 'public';
  const approvedLike = isCanonicalApprovedProof(entry);
  const privateLegacy =
    visibilityMap.showInCommunityFeed === false ||
    entry?.isPrivate === true ||
    entry?.private === true ||
    entry?.visibilityPrivate === true ||
    visibilityString === 'private';
  const crewPrivateLegacy =
    visibilityMap.showInCrewFeed === false ||
    (entry?.showInCrewFeed === false && !approvedLike) ||
    entry?.crewVisible === false;

  const showInCommunityFeed =
    !privateLegacy &&
    (
      visibilityMap.showInCommunityFeed === true ||
      entry?.showInCommunityFeed === true ||
      publicLegacy ||
      approvedLike
    );

  const showInCrewFeed =
    !crewPrivateLegacy &&
    (
      visibilityMap.showInCrewFeed === true ||
      entry?.showInCrewFeed === true ||
      entry?.crewVisible === true ||
      (showInCommunityFeed && !!getEntryCrewId(entry))
    );

  const allowWeeklyVoting =
    visibilityMap.allowWeeklyVoting !== false &&
    entry?.allowWeeklyVoting !== false &&
    entry?.weekly?.allowWeeklyVoting !== false &&
    showInCommunityFeed;

  return {
    showInCommunityFeed,
    showInCrewFeed,
    allowWeeklyVoting
  };
}

export function normalizeProofModeration(entry: any): ProofDistributionModeration {
  const moderation = entry?.moderation && typeof entry.moderation === 'object' ? entry.moderation : {};
  const isHidden =
    moderation.isHidden === true ||
    entry?.hidden === true ||
    entry?.isHidden === true ||
    entry?.adminOnly === true;

  return {
    isHidden,
    hiddenReason: String(moderation.hiddenReason || entry?.hiddenReason || '').trim() || null,
    isSuspected: moderation.isSuspected === true || entry?.isSuspected === true,
    isTribunalEligible: moderation.isTribunalEligible === true || entry?.isTribunalEligible === true
  };
}

export function isCanonicalApprovedProof(entry: any): boolean {
  return normalizeEntryStatus(entry?.status || entry?.reviewStatus || entry?.approvalStatus || entry?.submissionStatus || entry?.proofStatus) === 'approved';
}

export function isArchivedOrDeletedProof(entry: any): boolean {
  return (
    entry?.archived === true ||
    entry?.isArchived === true ||
    entry?.deleted === true ||
    entry?.isDeleted === true ||
    entry?.excludedFromProgress === true ||
    entry?.countsTowardLiveStats === false
  );
}

export function isDisqualifiedProof(entry: any): boolean {
  return entry?.disqualified === true || entry?.isDisqualified === true || entry?.weekly?.isDisqualified === true;
}

export function getProofDistributionExclusionReasons(entry: any, context: ProofDistributionContext = {}): string[] {
  const reasons: string[] = [];
  const status = normalizeEntryStatus(entry?.status);
  const visibility = normalizeProofVisibility(entry);
  const moderation = normalizeProofModeration(entry);

  if (status !== 'approved') reasons.push(`status:${status || 'missing'}`);
  if (!getEntryOwnerId(entry)) reasons.push('missing_owner');
  if (!hasRenderableProofImage(entry)) reasons.push('missing_or_invalid_image');
  if (context.requireApprovedAt !== false && !hasEffectiveApprovedAt(entry)) reasons.push('missing_approved_at');
  if (isArchivedOrDeletedProof(entry)) reasons.push('archived_or_deleted');
  if (moderation.isHidden) reasons.push(moderation.hiddenReason ? `hidden:${moderation.hiddenReason}` : 'hidden');
  if (isDisqualifiedProof(entry)) reasons.push('disqualified');
  if (!visibility.showInCommunityFeed) reasons.push('community_feed_disabled');
  if (context.activeCrewId !== undefined) {
    const entryCrewId = getEntryCrewId(entry);
    if (!visibility.showInCrewFeed) reasons.push('crew_feed_disabled');
    if (!entryCrewId) reasons.push('missing_crew');
    if (context.activeCrewId && entryCrewId && entryCrewId !== context.activeCrewId) reasons.push('different_crew');
  }

  return reasons;
}

export function normalizeProofForDistribution(entry: any, context: ProofDistributionContext = {}): NormalizedProofModel {
  const status = normalizeEntryStatus(entry?.status || entry?.reviewStatus || entry?.approvalStatus || entry?.submissionStatus || entry?.proofStatus);
  const proof = { ...entry, status };
  const communityExclusionReasons = getProofDistributionExclusionReasons(proof, context);

  return {
    id: getEntryId(proof),
    userId: getEntryOwnerId(proof),
    challengeId: getEntryChallengeId(proof),
    deckId: getEntryDeckId(proof),
    seasonId: getEntrySeasonId(proof),
    crewId: getEntryCrewId(proof),
    status,
    rawStatus: String(entry?.status || entry?.reviewStatus || entry?.approvalStatus || entry?.submissionStatus || entry?.proofStatus || '').trim(),
    approvalTime: getEntryApprovedTime(proof),
    submittedTime: getEntrySubmittedTime(proof),
    mediaReference: getProofImageReference(proof),
    fieldNote: getEntryFieldNote(proof),
    earnedXp: getEntryEarnedXp(proof),
    visibility: normalizeProofVisibility(proof),
    moderation: normalizeProofModeration(proof),
    isCommunityEligible: communityExclusionReasons.length === 0,
    communityExclusionReasons
  };
}

export function getProofLogbookCounts(entries: any[]): ProofLogbookCounts {
  return entries.reduce<ProofLogbookCounts>((counts, entry) => {
    if (isArchivedOrDeletedProof(entry)) return counts;
    const normalized = normalizeProofForDistribution(entry, { requireApprovedAt: false });
    counts.totalSubmitted++;
    if (normalized.status === 'pending_review') counts.pendingReview++;
    if (normalized.status === 'approved') counts.approvedVerified++;
    if (normalized.status === 'rejected' || normalized.status === 'needs_more_proof') counts.rejectedOrNeedsMoreProof++;
    if (normalized.isCommunityEligible) counts.communityEligible++;
    return counts;
  }, {
    totalSubmitted: 0,
    pendingReview: 0,
    approvedVerified: 0,
    rejectedOrNeedsMoreProof: 0,
    communityEligible: 0
  });
}

export const isCommunityEligibleProof = isCommunityProofEligible;

export function isCommunityProofEligible(entry: any, context: ProofDistributionContext = {}): boolean {
  const visibility = normalizeProofVisibility(entry);
  const moderation = normalizeProofModeration(entry);
  return (
    isCanonicalApprovedProof(entry) &&
    visibility.showInCommunityFeed &&
    moderation.isHidden !== true &&
    !isArchivedOrDeletedProof(entry) &&
    !isDisqualifiedProof(entry) &&
    hasRenderableProofImage(entry) &&
    getEntryOwnerId(entry).length > 0 &&
    (context.requireApprovedAt === false || hasEffectiveApprovedAt(entry))
  );
}

export function isCrewProofEligible(entry: any, activeCrewId: string | null | undefined, context: ProofDistributionContext = {}): boolean {
  const visibility = normalizeProofVisibility(entry);
  const entryCrewId = getEntryCrewId(entry);
  return (
    !!activeCrewId &&
    entryCrewId === activeCrewId &&
    visibility.showInCrewFeed &&
    isCommunityProofEligible(entry, context)
  );
}

export function isWeeklyProofDistributionEligible(entry: any, context: ProofDistributionContext = {}): boolean {
  const visibility = normalizeProofVisibility(entry);
  return visibility.allowWeeklyVoting && isCommunityProofEligible(entry, context);
}
