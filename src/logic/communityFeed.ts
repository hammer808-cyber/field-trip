import { normalizeEntryStatus } from './entryLogic';

const APPROVED_FEED_STATUSES = new Set(['approved']);

export const COMMUNITY_FEED_APPROVED_STATUSES = ['approved'];

export function getCommunityFeedImageUrl(entry: any): string {
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

export function getCommunityFeedImageReference(entry: any): string {
  return String(
    getCommunityFeedImageUrl(entry) ||
    entry?.storagePath ||
    entry?.photoStoragePath ||
    entry?.imageStoragePath ||
    entry?.proofImageRef ||
    entry?.proofStoragePath ||
    ''
  ).trim();
}

export function getCommunityFeedOwnerId(entry: any): string {
  return String(entry?.userId || entry?.uid || entry?.firebaseUid || '').trim();
}

export function getCommunityFeedApprovedTime(entry: any): number {
  const raw = entry?.approvedAt || entry?.reviewedAt || entry?.createdAt || entry?.submittedAt;
  if (raw?.toDate) return raw.toDate().getTime();
  if (typeof raw?.seconds === 'number') return raw.seconds * 1000;
  const parsed = new Date(raw || 0).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

export function isRenderableCommunityFeedImage(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const reference = value.trim();
  if (!reference) return false;
  if (reference.startsWith('blob:') || reference.startsWith('file:') || reference.startsWith('capacitor:')) return false;
  if (reference.startsWith('http://') || reference.startsWith('https://') || reference.startsWith('data:image/')) return true;
  return /^[A-Za-z0-9/_@.\-]+$/.test(reference);
}

export function hasCommunityFeedImageReference(entry: any): boolean {
  return isRenderableCommunityFeedImage(getCommunityFeedImageReference(entry));
}

function isExplicitlyHiddenFromCommunityFeed(entry: any): boolean {
  return (
    entry?.showInCommunityFeed === false ||
    entry?.isPublic === false ||
    entry?.communityVisible === false ||
    entry?.visibility === 'private'
  );
}

export function isCommunityFeedEligible(entry: any): boolean {
  const status = normalizeEntryStatus(entry?.status);
  const ownerId = getCommunityFeedOwnerId(entry);

  return (
    APPROVED_FEED_STATUSES.has(status) &&
    !isExplicitlyHiddenFromCommunityFeed(entry) &&
    entry?.archived !== true &&
    entry?.isArchived !== true &&
    entry?.hidden !== true &&
    entry?.isHidden !== true &&
    entry?.deleted !== true &&
    entry?.isDeleted !== true &&
    entry?.adminOnly !== true &&
    entry?.isDisqualified !== true &&
    entry?.disqualified !== true &&
    hasCommunityFeedImageReference(entry) &&
    ownerId.length > 0
  );
}

export function getCommunityFeedExclusionReasons(entry: any): string[] {
  const reasons: string[] = [];
  const status = normalizeEntryStatus(entry?.status);
  const ownerId = getCommunityFeedOwnerId(entry);

  if (!APPROVED_FEED_STATUSES.has(status)) reasons.push(`status:${status || 'missing'}`);
  if (entry?.showInCommunityFeed === false) reasons.push('not_public_feed_enabled');
  if (entry?.isPublic === false || entry?.communityVisible === false || entry?.visibility === 'private') reasons.push('private_visibility');
  if (entry?.archived === true || entry?.isArchived === true) reasons.push('archived');
  if (entry?.hidden === true || entry?.isHidden === true) reasons.push('hidden');
  if (entry?.deleted === true || entry?.isDeleted === true) reasons.push('deleted');
  if (entry?.adminOnly === true) reasons.push('admin_only');
  if (entry?.isDisqualified === true || entry?.disqualified === true) reasons.push('disqualified');
  if (!hasCommunityFeedImageReference(entry)) reasons.push('missing_or_invalid_image');
  if (!ownerId) reasons.push('missing_owner');

  return reasons;
}
