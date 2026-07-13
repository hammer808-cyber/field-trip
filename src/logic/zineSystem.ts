import { STARTER_SIGNAL_IDS } from './starterDeckState';
import type {
  ZineCoverChoice,
  ZineEdition,
  ZineKind,
  ZineLayoutId,
  ZinePage,
  ZinePageRole,
  ZineProofSnapshot,
  ZineStatus,
} from '../types/zine';

export const ZINE_SCHEMA_VERSION = 'v1' as const;
export const MAX_OPTIONAL_ZINE_PAGES = 2;
export const ZINE_STATUSES: ZineStatus[] = [
  'shell',
  'generating',
  'draft',
  'curating',
  'ready_for_review',
  'finalized',
  'archived',
  'generation_failed',
];

export const ZINE_PAGE_PLAN: Array<{
  role: ZinePageRole;
  title: string;
  layoutId: ZineLayoutId;
  flexible?: boolean;
}> = [
  { role: 'cover', title: 'Fieldtrip Edition', layoutId: 'cover_full_bleed' },
  { role: 'season_opener', title: 'The Season Opens', layoutId: 'single_receipt' },
  { role: 'introduction', title: 'Field Notes', layoutId: 'quote_page' },
  { role: 'early_timeline', title: 'Early Signals', layoutId: 'timeline_strip', flexible: true },
  { role: 'weekly_highlight', title: 'Weekly Highlight', layoutId: 'single_receipt', flexible: true },
  { role: 'highest_score', title: 'Highest Signal', layoutId: 'single_receipt' },
  { role: 'highest_liked', title: 'Community Favorite', layoutId: 'single_receipt' },
  { role: 'offbeat_moment', title: 'Off the Beaten Path', layoutId: 'single_receipt', flexible: true },
  { role: 'stickers_achievements', title: 'Stickers and Signals', layoutId: 'sticker_sheet', flexible: true },
  { role: 'reflection_lore', title: 'What We Will Remember', layoutId: 'quote_page', flexible: true },
  { role: 'late_timeline', title: 'Late Season', layoutId: 'timeline_strip', flexible: true },
  { role: 'defining_moment', title: 'Defining Moment', layoutId: 'single_receipt', flexible: true },
  { role: 'closing', title: 'Until the Next Exit', layoutId: 'closing_card' },
];

export interface ZineCandidateLike {
  id?: string;
  entryId?: string;
  userId?: string;
  ownerId?: string;
  displayName?: string;
  ownerDisplayName?: string;
  missionTitle?: string;
  challengeTitle?: string;
  tripTitle?: string;
  fieldNote?: string;
  caption?: string;
  imageUrl?: string;
  photoUrl?: string;
  proofImage?: string;
  storagePath?: string;
  imageStoragePath?: string;
  imageRef?: string;
  mediaRef?: string;
  score?: number;
  awardedXP?: number;
  pointsAwarded?: number;
  likeCount?: number;
  reactionCount?: number;
  approvedAt?: any;
  reviewedAt?: any;
  verifiedAt?: any;
  createdAt?: any;
  seasonId?: string;
  crewId?: string | null;
  status?: string;
  reviewStatus?: string;
  hidden?: boolean;
  isHidden?: boolean;
  isDeleted?: boolean;
  deleted?: boolean;
  archived?: boolean;
  disqualified?: boolean;
  isDisqualified?: boolean;
  moderation?: { isHidden?: boolean } | null;
  weeklyAwardIds?: string[];
  tags?: string[];
}

export function getPersonalZineId(userId: string, seasonId: string): string {
  return `personal_${userId}_${seasonId}`;
}

export function getCrewZineId(crewId: string, seasonId: string): string {
  return `${crewId}_${seasonId}`;
}

export function getPersonalArchiveId(userId: string, entryId: string): string {
  return `${userId}_${entryId}`;
}

export function hasCompletedStarterForZine(profile: any): boolean {
  if (!profile) return false;
  if (profile.starterDeckComplete === true || profile.starterCompleted === true) return true;
  const approved = new Set<string>([
    ...(Array.isArray(profile.approvedCompletedChallengeIds) ? profile.approvedCompletedChallengeIds : []),
    ...(Array.isArray(profile.completedChallengeIds) ? profile.completedChallengeIds : []),
    ...(Array.isArray(profile.completedMissionIds) ? profile.completedMissionIds : []),
  ].map((value) => String(value).toLowerCase().trim()));
  return STARTER_SIGNAL_IDS.every((id) => approved.has(id));
}

export function normalizeZineStatus(value: unknown): ZineStatus {
  const raw = String(value || '').toLowerCase();
  if (ZINE_STATUSES.includes(raw as ZineStatus)) return raw as ZineStatus;
  if (raw === 'collecting') return 'shell';
  if (raw === 'published') return 'finalized';
  return 'shell';
}

export function getZineCandidateId(candidate: ZineCandidateLike): string {
  return String(candidate.entryId || candidate.id || '').trim();
}

export function getZineCandidateOwnerId(candidate: ZineCandidateLike): string {
  return String(candidate.ownerId || candidate.userId || '').trim();
}

export function getZineCandidateMediaRef(candidate: ZineCandidateLike): string {
  return String(
    candidate.imageUrl ||
    candidate.photoUrl ||
    candidate.proofImage ||
    candidate.mediaRef ||
    candidate.imageRef ||
    candidate.storagePath ||
    candidate.imageStoragePath ||
    ''
  ).trim();
}

export function getZineCandidateApprovedMillis(candidate: ZineCandidateLike): number {
  const value = candidate.approvedAt || candidate.reviewedAt || candidate.verifiedAt || candidate.createdAt;
  if (!value) return 0;
  if (typeof (value as any).toMillis === 'function') return (value as any).toMillis();
  if (typeof (value as any).toDate === 'function') return (value as any).toDate().getTime();
  if (typeof (value as any).seconds === 'number') return (value as any).seconds * 1000;
  const parsed = new Date(value as any).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getZineCandidateExclusionReasons(params: {
  candidate: ZineCandidateLike;
  kind: ZineKind;
  ownerId?: string | null;
  crewId?: string | null;
  seasonId: string;
}): string[] {
  const { candidate, kind, ownerId, crewId, seasonId } = params;
  const reasons: string[] = [];
  const status = String(candidate.status || candidate.reviewStatus || '').toLowerCase();
  if (!['approved', 'approved_by_admin', 'auto_approved', 'retry-approved'].includes(status)) reasons.push('not_approved');
  if (!getZineCandidateId(candidate)) reasons.push('missing_entry_id');
  if (!getZineCandidateOwnerId(candidate)) reasons.push('missing_owner');
  if (!getZineCandidateMediaRef(candidate)) reasons.push('missing_media');
  if (String(candidate.seasonId || '').trim() !== seasonId) reasons.push('season_mismatch');
  if (candidate.hidden || candidate.isHidden || candidate.deleted || candidate.isDeleted || candidate.archived || candidate.disqualified || candidate.isDisqualified || candidate.moderation?.isHidden) {
    reasons.push('hidden_or_disqualified');
  }
  if (kind === 'personal' && ownerId && getZineCandidateOwnerId(candidate) !== ownerId) reasons.push('owner_mismatch');
  if (kind === 'crew' && crewId && String(candidate.crewId || '').trim() !== crewId) reasons.push('crew_mismatch');
  return reasons;
}

export function isZineCandidateEligible(params: Parameters<typeof getZineCandidateExclusionReasons>[0]): boolean {
  return getZineCandidateExclusionReasons(params).length === 0;
}

export function toZineProofSnapshot(candidate: ZineCandidateLike): ZineProofSnapshot {
  return {
    entryId: getZineCandidateId(candidate),
    ownerId: getZineCandidateOwnerId(candidate),
    ownerDisplayName: String(candidate.ownerDisplayName || candidate.displayName || 'Field Agent'),
    missionTitle: String(candidate.missionTitle || candidate.challengeTitle || candidate.tripTitle || 'Field Mission'),
    fieldNote: String(candidate.fieldNote || candidate.caption || ''),
    mediaRef: getZineCandidateMediaRef(candidate),
    score: Number(candidate.score ?? candidate.awardedXP ?? candidate.pointsAwarded ?? 0) || 0,
    likeCount: Number(candidate.likeCount ?? candidate.reactionCount ?? 0) || 0,
    approvedAt: candidate.approvedAt || candidate.reviewedAt || candidate.verifiedAt || candidate.createdAt || null,
    seasonId: String(candidate.seasonId || ''),
    crewId: String(candidate.crewId || '').trim() || null,
  };
}

function deterministicCandidate(candidates: ZineCandidateLike[], index: number): ZineCandidateLike | null {
  if (candidates.length === 0) return null;
  return candidates[index % candidates.length];
}

function candidateForRole(role: ZinePageRole, candidates: ZineCandidateLike[]): ZineCandidateLike | null {
  if (candidates.length === 0 || ['introduction', 'stickers_achievements', 'reflection_lore', 'closing'].includes(role)) return null;
  const chronological = [...candidates].sort((a, b) => getZineCandidateApprovedMillis(a) - getZineCandidateApprovedMillis(b) || getZineCandidateId(a).localeCompare(getZineCandidateId(b)));
  if (role === 'highest_score') {
    return [...candidates].sort((a, b) => Number(b.score ?? b.awardedXP ?? b.pointsAwarded ?? 0) - Number(a.score ?? a.awardedXP ?? a.pointsAwarded ?? 0) || getZineCandidateId(a).localeCompare(getZineCandidateId(b)))[0];
  }
  if (role === 'highest_liked') {
    return [...candidates].sort((a, b) => Number(b.likeCount ?? b.reactionCount ?? 0) - Number(a.likeCount ?? a.reactionCount ?? 0) || getZineCandidateId(a).localeCompare(getZineCandidateId(b)))[0];
  }
  if (role === 'weekly_highlight') {
    return candidates.find((candidate) => Array.isArray(candidate.weeklyAwardIds) && candidate.weeklyAwardIds.length > 0) || deterministicCandidate(chronological, 1);
  }
  if (role === 'offbeat_moment') {
    return candidates.find((candidate) => (candidate.tags || []).some((tag) => /offbeat|detour|unexpected|weird|chaos/i.test(tag))) || deterministicCandidate(chronological, Math.floor(chronological.length / 2));
  }
  if (role === 'late_timeline' || role === 'defining_moment') return chronological[chronological.length - 1];
  return deterministicCandidate(chronological, role === 'early_timeline' ? 0 : 1);
}

export function buildZineDraftPages(candidates: ZineCandidateLike[]): ZinePage[] {
  const eligible = candidates.filter((candidate) => !!getZineCandidateId(candidate));
  return ZINE_PAGE_PLAN.map((definition, index) => {
    const selected = candidateForRole(definition.role, eligible);
    const snapshot = selected ? toZineProofSnapshot(selected) : null;
    return {
      id: `page_${String(index + 1).padStart(2, '0')}_${definition.role}`,
      role: definition.role,
      order: index,
      layoutId: definition.layoutId,
      title: definition.title,
      caption: snapshot?.fieldNote || '',
      proofIds: snapshot ? [snapshot.entryId] : [],
      proofSnapshots: snapshot ? [snapshot] : [],
      stickerIds: [],
      isOptional: false,
      isFlexible: definition.flexible === true,
    };
  });
}

export function buildZineCoverChoices(candidates: ZineCandidateLike[], title: string, seasonId: string): ZineCoverChoice[] {
  const ordered = [...candidates].sort((a, b) => Number(b.score ?? b.awardedXP ?? 0) - Number(a.score ?? a.awardedXP ?? 0) || getZineCandidateId(a).localeCompare(getZineCandidateId(b)));
  const choices: ZineCoverChoice[] = ordered.slice(0, 3).map((candidate, index) => ({
    id: `cover_${index + 1}_${getZineCandidateId(candidate)}`,
    proofId: getZineCandidateId(candidate),
    layoutId: 'cover_full_bleed' as const,
    title,
    subtitle: seasonId,
    mediaRef: getZineCandidateMediaRef(candidate) || null,
  }));
  if (choices.length === 0) {
    choices.push({ id: 'cover_typographic', proofId: null, layoutId: 'cover_full_bleed', title, subtitle: seasonId, mediaRef: null });
  }
  return choices;
}

function hasZineAuthority(params: {
  zine: Pick<ZineEdition, 'kind' | 'ownerId' | 'crewId' | 'status' | 'curatorUserId'>;
  userId: string;
  activeCrewId?: string | null;
  isCrewCaptain?: boolean;
  isAdmin?: boolean;
}): boolean {
  const { zine, userId, activeCrewId, isCrewCaptain = false, isAdmin = false } = params;
  if (isAdmin) return zine.status !== 'archived';
  if (zine.kind === 'personal') return zine.ownerId === userId;
  if (!activeCrewId || zine.crewId !== activeCrewId) return false;
  return zine.curatorUserId === userId || isCrewCaptain;
}

export function canEditZine(params: Parameters<typeof hasZineAuthority>[0]): boolean {
  return hasZineAuthority(params) && ['shell', 'generation_failed', 'draft', 'curating'].includes(params.zine.status);
}

export function canFinalizeZine(params: Parameters<typeof hasZineAuthority>[0]): boolean {
  return hasZineAuthority(params) && params.zine.status === 'ready_for_review';
}

export function reorderZinePages(pages: ZinePage[], pageId: string, direction: -1 | 1): ZinePage[] {
  const currentIndex = pages.findIndex((page) => page.id === pageId);
  if (currentIndex < 0 || !pages[currentIndex].isFlexible) return pages;
  const targetIndex = currentIndex + direction;
  if (targetIndex < 0 || targetIndex >= pages.length || !pages[targetIndex].isFlexible) return pages;
  const next = [...pages];
  [next[currentIndex], next[targetIndex]] = [next[targetIndex], next[currentIndex]];
  return next.map((page, order) => ({ ...page, order }));
}
