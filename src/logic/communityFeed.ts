import { normalizeEntryStatus } from './entryLogic';
import {
  getEntryApprovedTime,
  getEntryChallengeId,
  getEntryOwnerId,
  getEntrySeasonId,
  getProofDistributionExclusionReasons,
  getProofImageReference,
  getProofImageUrl,
  hasRenderableProofImage,
  isCommunityProofEligible,
  isRenderableProofImageReference
} from './proofDistribution';

const APPROVED_FEED_STATUSES = new Set(['approved']);

export const COMMUNITY_FEED_APPROVED_STATUSES = ['approved', 'approved_by_admin', 'auto_approved', 'completed', 'retry-approved'];
export const COMMUNITY_FEED_QUERY_STATUSES = [...COMMUNITY_FEED_APPROVED_STATUSES, 'verified'];

export type FeedVisibility = 'crew_only' | 'followers_only' | 'public_discovery' | 'private';

export interface CommunityFeedScope {
  viewerUserId: string;
  activeCrewId?: string | null;
  acceptedCrewUserIds?: readonly string[];
  activeSeasonId?: string | null;
  blockedUserIds?: readonly string[];
}

export function getProfileFeedVisibility(profile: any): FeedVisibility {
  if (profile?.preferences?.privateApprovedPhotos === true) return 'private';
  const value = profile?.preferences?.feedVisibility || profile?.feedVisibility;
  return ['crew_only', 'followers_only', 'public_discovery', 'private'].includes(value) ? value : 'crew_only';
}

export function getSocialFeedExclusionReasons(entry: any, scope: CommunityFeedScope): string[] {
  const reasons = getCommunityFeedExclusionReasons(entry);
  const ownerId = getEntryOwnerId(entry);
  if (ownerId && scope.blockedUserIds?.includes(ownerId)) reasons.push('blocked_user');
  if (scope.activeSeasonId && !getEntrySeasonId(entry)) reasons.push('missing_season');
  else if (scope.activeSeasonId && getEntrySeasonId(entry) !== scope.activeSeasonId) reasons.push('different_season');
  if (ownerId && ownerId !== scope.viewerUserId) {
    const feedVisibility = getProfileFeedVisibility(entry);
    const acceptedCrew = scope.acceptedCrewUserIds?.includes(ownerId) === true;
    const entryCrewId = String(entry?.crewId || entry?.activeCrewId || '').trim();
    const sameGroupCrew = Boolean(scope.activeCrewId && entryCrewId && entryCrewId === scope.activeCrewId);
    const publicDiscovery = feedVisibility === 'public_discovery';
    if (feedVisibility === 'private') reasons.push('private_visibility');
    else if (!acceptedCrew && !sameGroupCrew && !publicDiscovery) {
      reasons.push(scope.acceptedCrewUserIds?.length || scope.activeCrewId ? 'outside_social_scope' : 'viewer_has_no_crew');
    }
  }
  return Array.from(new Set(reasons));
}

export function isVisibleInSocialFeed(entry: any, scope: CommunityFeedScope): boolean {
  return getSocialFeedExclusionReasons(entry, scope).length === 0;
}

export function getCommunityFeedImageUrl(entry: any): string {
  return getProofImageUrl(entry);
}

export function getCommunityFeedImageReference(entry: any): string {
  return getProofImageReference(entry);
}

export function getCommunityFeedOwnerId(entry: any): string {
  return getEntryOwnerId(entry);
}

export function getCommunityFeedApprovedTime(entry: any): number {
  return getEntryApprovedTime(entry);
}

export function isRenderableCommunityFeedImage(value: unknown): boolean {
  return isRenderableProofImageReference(value);
}

export function hasCommunityFeedImageReference(entry: any): boolean {
  return hasRenderableProofImage(entry);
}

export function isCommunityFeedEligible(entry: any): boolean {
  const status = normalizeEntryStatus(entry?.status || entry?.reviewStatus || entry?.approvalStatus || entry?.submissionStatus || entry?.proofStatus);
  return APPROVED_FEED_STATUSES.has(status) && isCommunityProofEligible(entry);
}

export function getCommunityFeedDedupeKey(entry: any): string {
  const explicitEntryId = String(entry?.entryId || entry?.canonicalEntryId || entry?.sourceEntryId || '').trim();
  if (explicitEntryId) return `entry:${explicitEntryId}`;

  const proofAlias = String(entry?.proofId || entry?.submissionId || entry?.proofReviewId || entry?.reviewId || '').trim();
  if (proofAlias) return `proof:${proofAlias}`;

  const ownerId = getEntryOwnerId(entry);
  const challengeId = getEntryChallengeId(entry);
  const mediaReference = getProofImageReference(entry);
  if (ownerId && challengeId && mediaReference) {
    return `media:${ownerId}:${challengeId}:${mediaReference}`;
  }

  return `doc:${String(entry?.id || '').trim()}`;
}

export function dedupeCommunityFeedProofs<T extends Record<string, any>>(entries: T[]): T[] {
  const bestByKey = new Map<string, T>();
  for (const entry of entries) {
    const key = getCommunityFeedDedupeKey(entry);
    const existing = bestByKey.get(key);
    if (!existing || getCommunityFeedApprovedTime(entry) >= getCommunityFeedApprovedTime(existing)) {
      bestByKey.set(key, entry);
    }
  }
  return Array.from(bestByKey.values());
}

export function getCommunityFeedExclusionReasons(entry: any): string[] {
  return getProofDistributionExclusionReasons(entry).map(reason =>
    reason === 'community_feed_disabled' ? 'not_public_feed_enabled' : reason
  );
}
