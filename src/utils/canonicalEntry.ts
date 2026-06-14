export type CanonicalEntryStatus = 'pending_review' | 'approved' | 'needs_more_proof' | 'rejected';

export interface ResolvedProofImage {
  url: string;
  sourceField: string | null;
  sourceObject: 'entry' | 'proofReview' | 'nestedEntry' | 'nestedProofReview' | 'proof' | null;
}

export interface ResolvedStoragePath {
  path: string;
  sourceField: string | null;
  sourceObject: 'entry' | 'proofReview' | 'nestedEntry' | 'nestedProofReview' | 'proof' | null;
}

export interface ResolvedXPFields {
  estimatedXP: number;
  awardedXP: number;
  finalXP: number;
  xpAwarded: boolean;
  legacyPoints: number;
  legacyPointsAwarded: boolean | number | null;
}

export interface ResolvedFeedVisibility {
  showInLogbook: boolean;
  showInCommunityFeed: boolean;
  isPublic: boolean;
  communityVisible: boolean;
  votingEligible: boolean;
}

type SourceObject = ResolvedProofImage['sourceObject'];

type FieldCandidate = {
  sourceObject: SourceObject;
  source: Record<string, unknown>;
  fields: string[];
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function normalizeStatusText(status: unknown): string {
  return typeof status === 'string' ? status.toLowerCase().trim() : '';
}

function readString(source: Record<string, unknown>, field: string): string {
  const value = source[field];
  return typeof value === 'string' ? value.trim() : '';
}

function readNumber(source: Record<string, unknown>, field: string): number | null {
  const value = source[field];
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readBoolean(source: Record<string, unknown>, field: string): boolean | null {
  const value = source[field];
  return typeof value === 'boolean' ? value : null;
}

function firstStringCandidate(candidates: FieldCandidate[]): { value: string; sourceField: string | null; sourceObject: SourceObject } {
  for (const candidate of candidates) {
    for (const field of candidate.fields) {
      const value = readString(candidate.source, field);
      if (value) {
        return {
          value,
          sourceField: field,
          sourceObject: candidate.sourceObject
        };
      }
    }
  }

  return {
    value: '',
    sourceField: null,
    sourceObject: null
  };
}

/**
 * Normalize variations of entry/proof statuses into the canonical Fieldtrip set.
 */
export function normalizeEntryStatus(status: unknown): CanonicalEntryStatus {
  const s = normalizeStatusText(status);

  if (!s) return 'pending_review';

  if ([
    'approved',
    'verified',
    'approved_by_admin',
    'auto_approved',
    'complete',
    'completed',
    'retry-approved',
    'archived'
  ].includes(s)) {
    return 'approved';
  }

  if ([
    'needs_more_proof',
    'needs-more-proof',
    'needsmoreproof',
    'needs_more_proof_requested',
    'resubmit_requested',
    'needs-fix',
    'needs_fix',
    'needsmore',
    'needs_more'
  ].includes(s)) {
    return 'needs_more_proof';
  }

  if ([
    'rejected',
    'denied',
    'auto_rejected',
    'autorejected',
    'awaiting_purge',
    'purged'
  ].includes(s)) {
    return 'rejected';
  }

  if ([
    'pending_review',
    'pending-review',
    'pendingreview',
    'submitted_pending_review',
    'resubmitted_pending_review',
    'awaiting_review',
    'manual_review_required',
    'needs_review',
    'checking',
    'under_field_check',
    'submitted',
    'pending',
    'resubmitted',
    'retry-submitted',
    'pending_upload',
    'available'
  ].includes(s)) {
    return 'pending_review';
  }

  return 'pending_review';
}

/**
 * Resolve the canonical user id from modern and legacy entry/review fields.
 */
export function resolveEntryUserId(entry: unknown, proofReview?: unknown): string {
  const e = asRecord(entry);
  const r = asRecord(proofReview);
  const nestedEntry = asRecord(e.entry);
  const nestedReview = asRecord(e.proofReview);

  return firstStringCandidate([
    { sourceObject: 'entry', source: e, fields: ['userId', 'uid', 'firebaseUid', 'ownerId'] },
    { sourceObject: 'proofReview', source: r, fields: ['userId', 'uid', 'firebaseUid', 'ownerId'] },
    { sourceObject: 'nestedEntry', source: nestedEntry, fields: ['userId', 'uid', 'firebaseUid', 'ownerId'] },
    { sourceObject: 'nestedProofReview', source: nestedReview, fields: ['userId', 'uid', 'firebaseUid', 'ownerId'] }
  ]).value;
}

/**
 * Resolve the canonical mission id from modern and legacy mission/challenge fields.
 */
export function resolveEntryMissionId(entry: unknown, proofReview?: unknown): string {
  const e = asRecord(entry);
  const r = asRecord(proofReview);
  const nestedEntry = asRecord(e.entry);
  const nestedReview = asRecord(e.proofReview);

  return firstStringCandidate([
    { sourceObject: 'entry', source: e, fields: ['missionId', 'challengeId', 'tripId'] },
    { sourceObject: 'proofReview', source: r, fields: ['missionId', 'challengeId', 'tripId'] },
    { sourceObject: 'nestedEntry', source: nestedEntry, fields: ['missionId', 'challengeId', 'tripId'] },
    { sourceObject: 'nestedProofReview', source: nestedReview, fields: ['missionId', 'challengeId', 'tripId'] }
  ]).value.toLowerCase().trim();
}

/**
 * Resolve the best available proof image URL without requiring callers to know legacy field names.
 */
export function resolveProofImage(entry: unknown, proofReview?: unknown): ResolvedProofImage {
  const e = asRecord(entry);
  const r = asRecord(proofReview);
  const nestedEntry = asRecord(e.entry);
  const nestedReview = asRecord(e.proofReview);
  const nestedProof = asRecord(e.proof);

  const resolved = firstStringCandidate([
    { sourceObject: 'entry', source: e, fields: ['photoUrl', 'imageUrl', 'mediaUrl', 'proofImage', 'proofUrl', 'proofImageUrl', 'thumbnailUrl', 'originalImageUrl'] },
    { sourceObject: 'proofReview', source: r, fields: ['photoUrl', 'imageUrl', 'mediaUrl', 'proofImage', 'proofUrl', 'proofImageUrl', 'thumbnailUrl'] },
    { sourceObject: 'nestedEntry', source: nestedEntry, fields: ['photoUrl', 'imageUrl', 'mediaUrl', 'proofImage', 'proofUrl', 'proofImageUrl', 'thumbnailUrl'] },
    { sourceObject: 'nestedProofReview', source: nestedReview, fields: ['photoUrl', 'imageUrl', 'mediaUrl', 'proofImage', 'proofUrl', 'proofImageUrl', 'thumbnailUrl'] },
    { sourceObject: 'proof', source: nestedProof, fields: ['photoUrl', 'imageUrl', 'mediaUrl', 'proofImage', 'proofUrl', 'proofImageUrl', 'thumbnailUrl'] }
  ]);

  return {
    url: resolved.value,
    sourceField: resolved.sourceField,
    sourceObject: resolved.sourceObject
  };
}

/**
 * Resolve the best available Firebase Storage path without changing any write behavior.
 */
export function resolveStoragePath(entry: unknown, proofReview?: unknown): ResolvedStoragePath {
  const e = asRecord(entry);
  const r = asRecord(proofReview);
  const nestedEntry = asRecord(e.entry);
  const nestedReview = asRecord(e.proofReview);
  const nestedProof = asRecord(e.proof);

  const resolved = firstStringCandidate([
    { sourceObject: 'entry', source: e, fields: ['storagePath', 'photoStoragePath', 'imageStoragePath', 'proofImageRef', 'proofStoragePath'] },
    { sourceObject: 'proofReview', source: r, fields: ['storagePath', 'photoStoragePath', 'imageStoragePath', 'proofImageRef', 'proofStoragePath'] },
    { sourceObject: 'nestedEntry', source: nestedEntry, fields: ['storagePath', 'photoStoragePath', 'imageStoragePath', 'proofImageRef', 'proofStoragePath'] },
    { sourceObject: 'nestedProofReview', source: nestedReview, fields: ['storagePath', 'photoStoragePath', 'imageStoragePath', 'proofImageRef', 'proofStoragePath'] },
    { sourceObject: 'proof', source: nestedProof, fields: ['storagePath', 'photoStoragePath', 'imageStoragePath', 'proofImageRef', 'proofStoragePath'] }
  ]);

  return {
    path: resolved.value,
    sourceField: resolved.sourceField,
    sourceObject: resolved.sourceObject
  };
}

/**
 * Resolve canonical XP values while preserving awareness of legacy points fields.
 */
export function resolveXPFields(entry: unknown): ResolvedXPFields {
  const e = asRecord(entry);

  const estimatedXP =
    readNumber(e, 'estimatedXP') ??
    readNumber(e, 'estimatedPoints') ??
    readNumber(e, 'xpValue') ??
    readNumber(e, 'baseXP') ??
    readNumber(e, 'basePoints') ??
    0;

  const awardedXP =
    readNumber(e, 'awardedXP') ??
    readNumber(e, 'finalXPAwarded') ??
    readNumber(e, 'xp') ??
    0;

  const legacyPoints =
    readNumber(e, 'awardedPoints') ??
    readNumber(e, 'finalPointsAwarded') ??
    readNumber(e, 'points') ??
    0;

  const legacyPointsAwardedRaw = e.pointsAwarded;
  const legacyPointsAwarded =
    typeof legacyPointsAwardedRaw === 'boolean' || typeof legacyPointsAwardedRaw === 'number'
      ? legacyPointsAwardedRaw
      : null;

  const xpAwardedBoolean = readBoolean(e, 'xpAwarded');
  const xpAwarded = xpAwardedBoolean ?? awardedXP > 0 ?? false;

  return {
    estimatedXP,
    awardedXP,
    finalXP: awardedXP || legacyPoints,
    xpAwarded,
    legacyPoints,
    legacyPointsAwarded
  };
}

/**
 * Resolve feed/logbook visibility from canonical status plus current legacy visibility flags.
 */
export function resolveFeedVisibility(entry: unknown): ResolvedFeedVisibility {
  const e = asRecord(entry);
  const status = normalizeEntryStatus(e.status);
  const isApproved = status === 'approved';

  const showInLogbook = readBoolean(e, 'showInUserLogbook') ?? true;
  const showInCommunityFeed = readBoolean(e, 'showInCommunityFeed') ?? false;
  const isPublic = readBoolean(e, 'isPublic') ?? false;
  const communityVisible = readBoolean(e, 'communityVisible') ?? false;
  const isPublicEligible = readBoolean(e, 'isPublicEligible') ?? true;
  const countsTowardFeed = readBoolean(e, 'countsTowardFeed') ?? true;

  const resolvedCommunity = isApproved && countsTowardFeed && (
    showInCommunityFeed ||
    isPublic ||
    communityVisible
  );

  return {
    showInLogbook,
    showInCommunityFeed: resolvedCommunity,
    isPublic: isApproved && isPublic,
    communityVisible: isApproved && communityVisible,
    votingEligible: isApproved && isPublicEligible && countsTowardFeed
  };
}
