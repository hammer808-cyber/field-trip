import { cn } from '../lib/utils';

export interface NormalizedProof {
  entryId: string;
  proofReviewId: string;
  userId: string;
  status: string;
  fieldNote: string;
  missionTitle: string;
  photoUrl: string;
  storagePath: string;
  imageSource: 'proofReview' | 'linkedEntry' | 'missing';
  diagnosticLabel: string;
}

function firstString(...values: any[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return '';
}

/**
 * Normalizes an entry and proofReview pair into a single standard form.
 * Entries are the source of truth. proofReviews may supply review metadata or image fallback only.
 */
export function getNormalizedProof(entry: any, proofReview: any): NormalizedProof {
  const e = entry || {};
  const r = proofReview || {};

  const entryId = e.id || r.entryId || r.id || '';
  const proofReviewId = r.id || e.proofCheckId || e.proofReviewId || '';
  const userId = e.userId || e.uid || r.userId || '';
  const status = e.status || r.status || 'pending_review';
  const fieldNote = e.fieldNote || e.note || r.fieldNote || r.reviewNotes || '';
  const missionTitle = e.tripTitle || e.challengeTitle || e.missionTitle || r.missionTitle || r.challengeTitle || 'Untitled Mission';

  const entryPhotoUrl = firstString(
    e.photoUrl,
    e.imageUrl,
    e.mediaUrl,
    e.proofImageUrl,
    e.proofImage,
    Array.isArray(e.imageUrls) ? e.imageUrls[0] : ''
  );

  const reviewPhotoUrl = firstString(
    r.photoUrl,
    r.imageUrl,
    r.mediaUrl,
    r.proofImageUrl,
    r.proofImage,
    Array.isArray(r.imageUrls) ? r.imageUrls[0] : ''
  );

  const photoUrl = entryPhotoUrl || reviewPhotoUrl;

  const entryStoragePath = firstString(
    e.storagePath,
    e.imageStoragePath,
    e.photoStoragePath,
    e.proofImageRef,
    e.proofStoragePath
  );

  const reviewStoragePath = firstString(
    r.storagePath,
    r.imageStoragePath,
    r.photoStoragePath,
    r.proofImageRef,
    r.proofStoragePath
  );

  const storagePath = entryStoragePath || reviewStoragePath;
  const hasReviewMetadata = !!(r.id || r.entryId || r.reviewId || r.status || r.reviewNotes);
  const imageSource = entryPhotoUrl || entryStoragePath
    ? 'linkedEntry'
    : reviewPhotoUrl || reviewStoragePath
      ? 'proofReview'
      : 'missing';
  const diagnosticLabel = entryPhotoUrl || entryStoragePath
    ? (hasReviewMetadata ? 'Source: entry + proofReview' : 'Source: entry')
    : reviewPhotoUrl || reviewStoragePath
      ? 'Source: orphaned proofReview'
      : 'Image missing from review; checked linked entry';

  return {
    entryId,
    proofReviewId,
    userId,
    status,
    fieldNote,
    missionTitle,
    photoUrl,
    storagePath,
    imageSource,
    diagnosticLabel
  };
}

/**
 * Resolves the canonical photo URL for an entry or proof review document.
 * Entries are checked before proofReview fallbacks.
 */
export function getProofImageUrl(item: any): string | null {
  if (!item) return null;

  const direct = firstString(
    item.photoUrl,
    item.imageUrl,
    item.mediaUrl,
    item.proofImageUrl,
    item.proofImage,
    Array.isArray(item.imageUrls) ? item.imageUrls[0] : ''
  );
  if (direct) return direct;

  if (item.entry) {
    const entryUrl = firstString(
      item.entry.photoUrl,
      item.entry.imageUrl,
      item.entry.mediaUrl,
      item.entry.proofImageUrl,
      item.entry.proofImage,
      Array.isArray(item.entry.imageUrls) ? item.entry.imageUrls[0] : ''
    );
    if (entryUrl) return entryUrl;
  }

  if (item.proofReview) {
    const reviewUrl = firstString(
      item.proofReview.photoUrl,
      item.proofReview.imageUrl,
      item.proofReview.mediaUrl,
      item.proofReview.proofImageUrl,
      item.proofReview.proofImage,
      Array.isArray(item.proofReview.imageUrls) ? item.proofReview.imageUrls[0] : ''
    );
    if (reviewUrl) return reviewUrl;
  }

  if (item.proof) {
    const proofUrl = firstString(
      item.proof.photoUrl,
      item.proof.imageUrl,
      item.proof.mediaUrl,
      item.proof.proofImageUrl,
      item.proof.proofImage,
      Array.isArray(item.proof.imageUrls) ? item.proof.imageUrls[0] : ''
    );
    if (proofUrl) return proofUrl;
  }

  return null;
}

/**
 * Checks if a URL is a valid permanent Firebase Storage URL.
 */
export function isPermanentStorageUrl(url: string | null): boolean {
  if (!url) return false;
  return url.startsWith('https://firebasestorage.googleapis.com') || url.startsWith('http://localhost:9199');
}
