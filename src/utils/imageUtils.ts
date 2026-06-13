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
}

/**
 * Normalizes an entry and proofReview pair into a single standard form.
 * Adheres to direct Fieldtrip requirement for canonical photo references on:
 * Admin Review, Logbook, Community Feed, and Memories.
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

  const photoUrl =
    e.photoUrl ||
    e.imageUrl ||
    r.photoUrl ||
    r.imageUrl ||
    r.mediaUrl ||
    e.proofImage ||
    e.proofImageUrl ||
    '';

  const storagePath =
    e.storagePath ||
    r.storagePath ||
    e.photoStoragePath ||
    '';

  return {
    entryId,
    proofReviewId,
    userId,
    status,
    fieldNote,
    missionTitle,
    photoUrl,
    storagePath
  };
}

/**
 * Resolves the canonical photo URL for an entry or proof review document.
 * Adheres to strict Fieldtrip fallback priority:
 * 1. entry.photoUrl
 * 2. entry.imageUrl
 * 3. review.photoUrl
 * 4. review.imageUrl
 * 5. proof.photoUrl
 * 6. proof.imageUrl
 */
export function getProofImageUrl(item: any): string | null {
  if (!item) return null;

  // Level 1: Standard Fieldtrip Priority
  if (item.photoUrl) return item.photoUrl;
  if (item.imageUrl) return item.imageUrl;
  
  // Level 2: Nested Entry Reference
  if (item.entry) {
    if (item.entry.photoUrl) return item.entry.photoUrl;
    if (item.entry.imageUrl) return item.entry.imageUrl;
  }

  // Level 3: ProofReview Reference
  if (item.proofReview) {
    if (item.proofReview.photoUrl) return item.proofReview.photoUrl;
    if (item.proofReview.imageUrl) return item.proofReview.imageUrl;
  }

  // Level 4: Parent Proof Reference
  if (item.proof) {
    if (item.proof.photoUrl) return item.proof.photoUrl;
    if (item.proof.imageUrl) return item.proof.imageUrl;
  }

  // Level 5: Legacy/Alternative Fields
  if (item.mediaUrl) return item.mediaUrl;
  if (item.proofImage) return item.proofImage;
  if (item.proofImageUrl) return item.proofImageUrl;
  if (Array.isArray(item.imageUrls) && item.imageUrls.length > 0) return item.imageUrls[0];

  return null;
}

/**
 * Checks if a URL is a valid permanent Firebase Storage URL.
 */
export function isPermanentStorageUrl(url: string | null): boolean {
  if (!url) return false;
  return url.startsWith('https://firebasestorage.googleapis.com') || url.startsWith('http://localhost:9199');
}
