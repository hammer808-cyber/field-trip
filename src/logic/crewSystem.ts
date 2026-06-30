export const CREW_MEMBER_LIMIT_DEFAULT = 8;
export const CREW_INVITE_EXPIRY_DAYS = 7;
export const CREW_SWITCH_COOLDOWN_DAYS = 7;

export type CrewMode = 'competitive' | 'friendly';
export type CrewPrivacy = 'invite_only' | 'link_request' | 'discoverable';
export type CrewStatus = 'active' | 'archived';
export type CrewMemberRole = 'founder' | 'captain' | 'member';
export type CrewMemberStatus = 'active' | 'removed' | 'left';
export type CrewZineStatus = 'collecting' | 'curating' | 'published';

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
  status?: CrewMemberStatus | string;
  joinedAt?: any;
  crewEligibleFrom?: any;
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

