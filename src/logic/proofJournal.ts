import { normalizeEntryStatus } from './entryLogic';
import { getEntryChallengeId, getEntrySubmittedTime, toMillis } from './proofDistribution';

export interface LogbookStatusPresentation {
  status: 'pending_review' | 'approved' | 'needs_more_proof' | 'rejected';
  label: string;
  detail: string;
  tone: 'pending' | 'approved' | 'correction' | 'rejected';
}

export function getLogbookStatusPresentation(entry: any): LogbookStatusPresentation {
  const status = normalizeEntryStatus(
    entry?.status || entry?.reviewStatus || entry?.approvalStatus || entry?.submissionStatus,
  );

  if (status === 'approved') {
    return { status, label: 'Verified', detail: 'Approved for your archive and public distribution rules.', tone: 'approved' };
  }
  if (status === 'needs_more_proof') {
    return { status, label: 'Add More Proof', detail: 'This receipt is private until the requested correction is reviewed.', tone: 'correction' };
  }
  if (status === 'rejected') {
    return { status, label: 'Not Verified', detail: 'This receipt remains private and is excluded from community pages.', tone: 'rejected' };
  }
  return { status: 'pending_review', label: 'Pending Review', detail: 'Only you and reviewers can see this receipt.', tone: 'pending' };
}

export function getSafeProofLocation(entry: any): string | null {
  const explicit =
    entry?.safeLocationLabel ||
    entry?.publicLocationLabel ||
    entry?.locationLabel ||
    entry?.location?.publicLabel ||
    entry?.location?.safeLabel ||
    entry?.neighborhood ||
    entry?.city;
  const value = String(explicit || '').trim();
  if (value) return value;

  const hasPrivateCoordinates =
    typeof entry?.latitude === 'number' ||
    typeof entry?.longitude === 'number' ||
    typeof entry?.location?.latitude === 'number' ||
    typeof entry?.location?.longitude === 'number';
  return hasPrivateCoordinates ? 'Location saved privately' : null;
}

export function getLogbookEntryDate(entry: any): string {
  const timestamp =
    toMillis(entry?.submittedAt || entry?.createdAt || entry?.capturedAt || entry?.photoTakenAt) ||
    getEntrySubmittedTime(entry);
  if (!timestamp) return 'Date unavailable';
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function getAttachedStickerIds(entry: any, proofStickerAssignments: Record<string, string[]> = {}): string[] {
  const entryId = String(entry?.entryId || entry?.id || '').trim();
  const candidates = [
    ...(Array.isArray(entry?.stickerIds) ? entry.stickerIds : []),
    ...(Array.isArray(entry?.attachedStickerIds) ? entry.attachedStickerIds : []),
    ...(Array.isArray(entry?.proofStickers) ? entry.proofStickers : []),
    ...(entryId && Array.isArray(proofStickerAssignments[entryId]) ? proofStickerAssignments[entryId] : []),
  ];
  return Array.from(new Set(candidates.map(value => String(value?.id || value).trim()).filter(Boolean)));
}

export function getProofReactionCount(entry: any): number {
  const direct = Number(entry?.reactionCount ?? entry?.likeCount ?? entry?.hypeCount ?? 0);
  if (Number.isFinite(direct) && direct > 0) return direct;
  if (Array.isArray(entry?.reactions)) return entry.reactions.length;
  return 0;
}

export function getProofZineState(entry: any): string {
  const personal = String(entry?.personalMemory?.zineSelectionStatus || '').trim();
  const crew = String(entry?.crewMemory?.zineSelectionStatus || '').trim();
  const value = personal && personal !== 'not_selected' ? personal : crew;
  if (!value || value === 'not_selected') {
    return entry?.personalMemory?.isEligible ? 'Zine archive eligible' : 'Personal archive';
  }
  return `Zine: ${value.replaceAll('_', ' ')}`;
}

export function getNeedsMoreProofInstructions(entry: any): string {
  const note = String(
    entry?.reviewerNote ||
    entry?.adminNotes ||
    entry?.adminNote ||
    entry?.reviewFeedback ||
    entry?.proofReview?.reviewNotes ||
    '',
  ).trim();
  if (note) return note;
  if (Array.isArray(entry?.missingRequirements) && entry.missingRequirements.length > 0) {
    return entry.missingRequirements.map((value: unknown) => String(value)).join(', ');
  }
  return 'Add a clearer receipt or the missing mission detail, then resubmit it for review.';
}

export function getNeedsMoreProofRoute(entry: any): string {
  const challengeId = getEntryChallengeId(entry);
  const entryId = String(entry?.entryId || entry?.id || '').trim();
  const params = new URLSearchParams({ mode: 'addMoreProof' });
  if (entryId) params.set('entryId', entryId);
  return `/capture?id=${encodeURIComponent(challengeId)}&${params.toString()}`;
}
