export const CREW_MEMBER_LIMIT_DEFAULT = 8;
export const CREW_INVITE_EXPIRY_DAYS = 7;
export const CREW_SWITCH_COOLDOWN_DAYS = 7;

export type CrewMode = 'competitive' | 'friendly';
export type CrewPrivacy = 'invite_only' | 'link_request' | 'discoverable';
export type CrewStatus = 'active' | 'archived' | 'disbanded';
export type CrewMemberRole = 'founder' | 'captain' | 'member';
export type CrewMemberStatus = 'active' | 'removed' | 'left';
export type CrewZineStatus = 'shell' | 'generating' | 'draft' | 'curating' | 'ready_for_review' | 'finalized' | 'archived' | 'generation_failed';
export type CrewInviteType = 'direct' | 'share_link';
export type CrewInviteStatus = 'pending' | 'accepted' | 'declined' | 'revoked' | 'expired';
export type CrewJoinRequestStatus = 'pending' | 'approved' | 'declined' | 'cancelled';
export type CrewMemoryArchiveStatus = 'not_eligible' | 'candidate' | 'archived' | 'featured' | 'excluded';
export type CrewMemoryZineSelectionStatus = 'not_selected' | 'candidate' | 'selected' | 'cover_candidate' | 'published';
export type PersonalMemoryArchiveStatus = 'candidate' | 'archived' | 'featured' | 'excluded';

export const CREW_PRIVACY_VALUES: CrewPrivacy[] = ['invite_only', 'link_request', 'discoverable'];
export const CREW_MODE_VALUES: CrewMode[] = ['competitive', 'friendly'];

export const CREW_ZINE_PAGE_BLUEPRINT = [
  'Cover',
  'Crew Roll Call / Character Sheet',
  'Crew Origin Story',
  'Early Season Timeline',
  'Highest Scored Receipt',
  'Most Liked Receipt',
  'Seasonal Signature Moment',
  'Off the Beaten Path',
  'Voting / Tribunal Lore',
  'Midseason Timeline',
  'Member Spotlight',
  'Late Season Timeline',
  'Sleeper Hit or Unexpected Moment',
  'Crew Superlatives',
  'Flex Page One',
  'Flex Page Two',
];

export interface CrewOnboardingProfileLike {
  id?: string;
  accessStatus?: string;
  fieldClassificationComplete?: boolean;
  fieldTypeQuizCompleted?: boolean;
  personaQuizComplete?: boolean;
}

export interface CrewArchiveEntryLike {
  id?: string;
  entryId?: string;
  userId?: string;
  uid?: string;
  crewId?: string | null;
  seasonId?: string | null;
  deckId?: string | null;
  challengeId?: string | null;
  missionId?: string | null;
  tripId?: string | null;
  status?: string | null;
  crewContext?: {
    crewId?: string | null;
    crewNameSnapshot?: string | null;
    crewMembershipId?: string | null;
    submittedAsCrewMember?: boolean;
    crewSeasonId?: string | null;
    submittedAt?: any;
  } | null;
  crewChallengeId?: string | null;
  crewMissionId?: string | null;
  isCrewChallenge?: boolean;
  weeklyAwardIds?: string[];
  stickerIds?: string[];
  reactionCount?: number;
  captainHighlight?: boolean;
  adminHighlight?: boolean;
  tribunalLore?: boolean;
  hidden?: boolean;
  archived?: boolean;
  deleted?: boolean;
  isDeleted?: boolean;
  disqualified?: boolean;
  isDisqualified?: boolean;
  moderation?: {
    isHidden?: boolean;
    excludedFromCrewMemories?: boolean;
  } | null;
  submittedAt?: any;
  createdAt?: any;
}

export interface CrewMemberLike {
  userId?: string;
  role?: CrewMemberRole | string;
  status?: CrewMemberStatus | string;
  joinedAt?: any;
  crewEligibleFrom?: any;
}

export interface CrewLike {
  id?: string;
  founderId?: string | null;
  captainId?: string | null;
  captainIds?: string[];
  members?: string[];
  memberCount?: number;
  memberLimit?: number;
  status?: CrewStatus | string;
  privacy?: CrewPrivacy | string;
  allowMemberInvites?: boolean;
  allowCaptainRoleManagement?: boolean;
  autoApproveShareLinks?: boolean;
}

export function normalizeCrewSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export function normalizeCrewPrivacy(value: unknown): CrewPrivacy {
  return CREW_PRIVACY_VALUES.includes(value as CrewPrivacy) ? value as CrewPrivacy : 'invite_only';
}

export function normalizeCrewMode(value: unknown): CrewMode {
  return CREW_MODE_VALUES.includes(value as CrewMode) ? value as CrewMode : 'friendly';
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function isCrewManager(member: CrewMemberLike | null | undefined): boolean {
  return member?.status === 'active' && (member.role === 'founder' || member.role === 'captain');
}

export function getCanonicalCrewCaptainId(crew: CrewLike | null | undefined): string | null {
  return String(crew?.captainId || crew?.founderId || crew?.captainIds?.[0] || '').trim() || null;
}

export function isCanonicalCrewCaptain(
  member: CrewMemberLike | null | undefined,
  crew: CrewLike | null | undefined
): boolean {
  const captainId = getCanonicalCrewCaptainId(crew);
  return member?.status === 'active' && !!member?.userId && !!captainId && member.userId === captainId;
}

export function canInviteToCrew(member: CrewMemberLike | null | undefined, crew: CrewLike | null | undefined): boolean {
  if (!member || member.status !== 'active' || crew?.status !== 'active') return false;
  if (isCanonicalCrewCaptain(member, crew)) return true;
  return crew?.allowMemberInvites === true;
}

export function canApproveJoinRequest(member: CrewMemberLike | null | undefined, crew?: CrewLike | null): boolean {
  return crew ? isCanonicalCrewCaptain(member, crew) : isCrewManager(member);
}

export function canRemoveCrewMember(
  actor: CrewMemberLike | null | undefined,
  target: CrewMemberLike | null | undefined,
  crew: CrewLike | null | undefined
): boolean {
  if (!actor || !target || actor.status !== 'active' || target.status !== 'active') return false;
  if (!actor.userId || !target.userId || actor.userId === target.userId) return false;
  return isCanonicalCrewCaptain(actor, crew) && target.userId !== getCanonicalCrewCaptainId(crew);
}

export function canTransferCrewCaptain(
  actor: CrewMemberLike | null | undefined,
  target: CrewMemberLike | null | undefined,
  crew: CrewLike | null | undefined
): boolean {
  return isCanonicalCrewCaptain(actor, crew) &&
    target?.status === 'active' &&
    !!target.userId &&
    target.userId !== actor?.userId;
}

export function isCrewAtCapacity(crew: CrewLike | null | undefined): boolean {
  const limit = Number(crew?.memberLimit || CREW_MEMBER_LIMIT_DEFAULT);
  const count = Number(crew?.memberCount || crew?.members?.length || 0);
  return count >= limit;
}

export function hasCrewCooldown(profile: { crewCooldownUntil?: any } | null | undefined, now = new Date()): boolean {
  const cooldownUntil = toMillis(profile?.crewCooldownUntil);
  return cooldownUntil > now.getTime();
}

export function getCrewJoinBlockReason(params: {
  profile?: { activeCrewId?: string | null; crewId?: string | null; crewCooldownUntil?: any } | null;
  crew?: CrewLike | null;
  existingMember?: CrewMemberLike | null;
  now?: Date;
}): string | null {
  const { profile, crew, existingMember, now = new Date() } = params;
  const activeCrewId = profile?.activeCrewId || profile?.crewId || null;
  if (activeCrewId && activeCrewId !== crew?.id) return 'ALREADY_IN_ANOTHER_CREW';
  if (activeCrewId && activeCrewId === crew?.id) return 'ALREADY_IN_THIS_CREW';
  if (existingMember?.status === 'active') return 'ALREADY_IN_THIS_CREW';
  if (hasCrewCooldown(profile, now)) return 'CREW_SWITCH_COOLDOWN_ACTIVE';
  if (!crew || crew.status !== 'active') return 'CREW_NOT_ACTIVE';
  if (isCrewAtCapacity(crew)) return 'CREW_AT_CAPACITY';
  if (existingMember?.status === 'removed') return 'REMOVED_MEMBER_REQUIRES_REINVITE';
  return null;
}

export function normalizeInviteStatus(status: unknown, expiresAt?: any, now = new Date()): CrewInviteStatus {
  const raw = String(status || 'pending').toLowerCase();
  if (raw === 'accepted' || raw === 'declined' || raw === 'revoked' || raw === 'expired') return raw;
  return toMillis(expiresAt) && toMillis(expiresAt) <= now.getTime() ? 'expired' : 'pending';
}

export function hasCrewOnboardingAccess(profile: CrewOnboardingProfileLike | null | undefined, hasCurrentLegalConsent = true): boolean {
  if (!profile || hasCurrentLegalConsent !== true) return false;
  const hasProfile = !!profile.id || profile.accessStatus === 'approved';
  const classificationComplete = !!(profile.fieldClassificationComplete || profile.fieldTypeQuizCompleted || profile.personaQuizComplete);
  return hasProfile && classificationComplete;
}

export function isStarterReceipt(entry: CrewArchiveEntryLike): boolean {
  const deckId = String(entry.deckId || '').toLowerCase().trim();
  const missionId = String(entry.challengeId || entry.missionId || entry.tripId || '').toLowerCase().trim();
  return deckId === 'starter-signals' || missionId.startsWith('starter-');
}

export function toMillis(value: any): number {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

export function isApprovedStatus(status: unknown): boolean {
  return ['approved', 'approved_by_admin', 'auto_approved', 'completed', 'retry-approved'].includes(String(status || '').toLowerCase());
}

export function getCrewContextCrewId(entry: CrewArchiveEntryLike): string {
  return String(entry.crewContext?.crewId || entry.crewId || '').trim();
}

export function getCrewMemorySeasonId(entry: CrewArchiveEntryLike): string {
  return String(entry.crewContext?.crewSeasonId || entry.seasonId || '').trim();
}

export function getCrewMemorySubmittedAt(entry: CrewArchiveEntryLike): any {
  return entry.crewContext?.submittedAt || entry.submittedAt || entry.createdAt;
}

export function getCrewMemoryExclusionReasons(params: {
  entry: CrewArchiveEntryLike;
  member: CrewMemberLike | null | undefined;
  activeSeasonId?: string | null;
  starterComplete: boolean;
}): string[] {
  const { entry, member, activeSeasonId, starterComplete } = params;
  const reasons: string[] = [];
  const crewId = getCrewContextCrewId(entry);
  const seasonId = getCrewMemorySeasonId(entry);
  const userId = entry.userId || entry.uid;
  if (!crewId) reasons.push('missing_crew_context');
  if (!seasonId) reasons.push('missing_season');
  if (!userId) reasons.push('missing_owner');
  if (!isApprovedStatus(entry.status)) reasons.push(`status:${String(entry.status || 'missing')}`);
  if (isStarterReceipt(entry)) reasons.push('starter_receipt');
  if (starterComplete !== true) reasons.push('starter_incomplete');
  if (activeSeasonId && seasonId && seasonId !== activeSeasonId) reasons.push('season_mismatch');
  if (entry.hidden || entry.archived || entry.deleted || entry.isDeleted || entry.disqualified || entry.isDisqualified || entry.moderation?.isHidden || entry.moderation?.excludedFromCrewMemories) {
    reasons.push('hidden_or_disqualified');
  }
  if (!member) {
    reasons.push('missing_membership_snapshot');
  } else if (member.status === 'removed') {
    reasons.push('member_removed');
  }

  const submittedAt = toMillis(getCrewMemorySubmittedAt(entry));
  const eligibleFrom = toMillis(member?.crewEligibleFrom || member?.joinedAt);
  if (!submittedAt) reasons.push('missing_submitted_at');
  if (!eligibleFrom) reasons.push('missing_membership_start');
  if (submittedAt && eligibleFrom && submittedAt < eligibleFrom) reasons.push('pre_membership_submission');
  return reasons;
}

export function getCrewMemoryEligibilityReasons(entry: CrewArchiveEntryLike): string[] {
  const reasons = new Set<string>();
  if (getCrewContextCrewId(entry)) reasons.add('approved_crew_submission');
  if (entry.isCrewChallenge || entry.crewChallengeId || entry.crewMissionId) reasons.add('crew_challenge');
  if (Array.isArray(entry.weeklyAwardIds) && entry.weeklyAwardIds.length > 0) {
    reasons.add('weekly_vote_nominee');
    reasons.add('weekly_vote_winner');
  }
  if (entry.tribunalLore) reasons.add('tribunal_lore');
  if (entry.captainHighlight) reasons.add('captain_highlight');
  if (entry.adminHighlight) reasons.add('admin_highlight');
  if (Number(entry.reactionCount || 0) >= 3) reasons.add('high_reaction_count');
  if (Array.isArray(entry.stickerIds) && entry.stickerIds.length > 0) reasons.add('sticker_milestone');
  return Array.from(reasons);
}

export function buildCrewMemoryState(entry: CrewArchiveEntryLike) {
  const eligibilityReasons = getCrewMemoryEligibilityReasons(entry);
  const featured = eligibilityReasons.some(reason => [
    'weekly_vote_winner',
    'tribunal_lore',
    'captain_highlight',
    'admin_highlight',
    'high_reaction_count',
  ].includes(reason));
  return {
    isEligible: eligibilityReasons.length > 0,
    eligibilityReasons,
    archiveStatus: (featured ? 'featured' : 'candidate') as CrewMemoryArchiveStatus,
    seasonId: getCrewMemorySeasonId(entry) || null,
    crewId: getCrewContextCrewId(entry) || null,
    featuredBy: featured
      ? (eligibilityReasons.includes('admin_highlight') ? 'admin'
        : eligibilityReasons.includes('captain_highlight') ? 'captain'
          : eligibilityReasons.includes('weekly_vote_winner') ? 'weekly_vote'
            : eligibilityReasons.includes('tribunal_lore') ? 'tribunal'
              : 'system')
      : null,
    featuredAt: null,
    zineSelectionStatus: (featured ? 'candidate' : 'not_selected') as CrewMemoryZineSelectionStatus,
    zinePageId: null,
    zinePageType: null,
  };
}

export function buildPersonalMemoryState(entry: CrewArchiveEntryLike) {
  return {
    isEligible: isApprovedStatus(entry.status) && !entry.hidden && !entry.deleted && !entry.isDeleted,
    seasonId: entry.seasonId || null,
    archiveStatus: 'candidate' as PersonalMemoryArchiveStatus,
    zineSelectionStatus: 'not_selected' as 'not_selected' | 'selected' | 'published',
    zinePageId: null,
  };
}

export function isCrewArchiveEligible(params: {
  entry: CrewArchiveEntryLike;
  member: CrewMemberLike | null | undefined;
  activeSeasonId?: string | null;
  starterComplete: boolean;
}): boolean {
  return getCrewMemoryExclusionReasons(params).length === 0;
}
