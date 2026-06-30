export const CREW_MEMBER_LIMIT_DEFAULT = 8;
export const CREW_INVITE_EXPIRY_DAYS = 7;
export const CREW_SWITCH_COOLDOWN_DAYS = 7;

export type CrewMode = 'competitive' | 'friendly';
export type CrewPrivacy = 'invite_only' | 'link_request' | 'discoverable';
export type CrewStatus = 'active' | 'archived';
export type CrewMemberRole = 'founder' | 'captain' | 'member';
export type CrewMemberStatus = 'active' | 'removed' | 'left';
export type CrewZineStatus = 'collecting' | 'curating' | 'published';
export type CrewInviteType = 'direct' | 'share_link';
export type CrewInviteStatus = 'pending' | 'accepted' | 'declined' | 'revoked' | 'expired';
export type CrewJoinRequestStatus = 'pending' | 'approved' | 'declined' | 'cancelled';

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

export function isCrewFounder(member: CrewMemberLike | null | undefined): boolean {
  return member?.status === 'active' && member.role === 'founder';
}

export function canInviteToCrew(member: CrewMemberLike | null | undefined, crew: CrewLike | null | undefined): boolean {
  if (!member || member.status !== 'active' || crew?.status === 'archived') return false;
  if (member.role === 'founder') return true;
  if (member.role === 'captain') return true;
  return crew?.allowMemberInvites === true;
}

export function canApproveJoinRequest(member: CrewMemberLike | null | undefined): boolean {
  return isCrewManager(member);
}

export function canPromoteCrewMember(actor: CrewMemberLike | null | undefined, target: CrewMemberLike | null | undefined): boolean {
  return isCrewFounder(actor) && target?.status === 'active' && target.role === 'member';
}

export function canRemoveCrewCaptainRole(actor: CrewMemberLike | null | undefined, target: CrewMemberLike | null | undefined): boolean {
  return isCrewFounder(actor) && target?.status === 'active' && target.role === 'captain';
}

export function canRemoveCrewMember(actor: CrewMemberLike | null | undefined, target: CrewMemberLike | null | undefined): boolean {
  if (!actor || !target || actor.status !== 'active' || target.status !== 'active') return false;
  if (!actor.userId || !target.userId || actor.userId === target.userId) return false;
  if (target.role === 'founder') return false;
  if (actor.role === 'founder') return target.role === 'captain' || target.role === 'member';
  if (actor.role === 'captain') return target.role === 'member';
  return false;
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

export function isCrewArchiveEligible(params: {
  entry: CrewArchiveEntryLike;
  member: CrewMemberLike | null | undefined;
  activeSeasonId?: string | null;
  starterComplete: boolean;
}): boolean {
  const { entry, member, activeSeasonId, starterComplete } = params;
  if (!entry.crewId || !entry.seasonId || !entry.userId && !entry.uid) return false;
  if (!isApprovedStatus(entry.status)) return false;
  if (isStarterReceipt(entry)) return false;
  if (starterComplete !== true) return false;
  if (activeSeasonId && entry.seasonId !== activeSeasonId) return false;
  if (!member || member.status !== 'active') return false;

  const submittedAt = toMillis(entry.submittedAt || entry.createdAt);
  const eligibleFrom = toMillis(member.crewEligibleFrom || member.joinedAt);
  if (!submittedAt || !eligibleFrom) return false;
  return submittedAt >= eligibleFrom;
}
