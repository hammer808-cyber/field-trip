import type { FieldTypeId } from '../constants/fieldTypes';
import { isArchivedEntry, normalizeEntryStatus } from '../logic/entryLogic';
import { getLevelProgress } from '../logic/playerLevel';
import type { DeckPack } from '../types/deckPacks';
import type { DrawnMissionCard, Entry } from '../types/game';
import type { MemoryEntry } from '../types/memories';
import type { ProofType, TripCard } from '../types/challenges';
import type { ReviewStatus } from '../types/proof';
import type { UserProfile } from './userService';
import {
  getCurrentVotingCycle,
  getVotingPhase,
  type VotingPhase,
} from './votingCycleService';

export type TrevorExperienceStage = 'starter' | 'new_explorer' | 'established_explorer';
export type TrevorZineGap = 'captions' | 'locations' | 'lore';

export interface TrevorActiveMission {
  id: string;
  title: string;
  status: string;
  deckId?: string;
}

export interface TrevorProofRepairTarget {
  entryId: string;
  missionId: string;
  missionTitle?: string;
  status: Extract<ReviewStatus, 'needs_more_proof' | 'rejected'>;
}

export interface TrevorContext {
  userId: string;
  currentRoute: string;
  explorerType?: FieldTypeId;
  legalComplete: boolean;
  fieldClassificationComplete: boolean;
  onboardingComplete: boolean;
  experienceStage: TrevorExperienceStage;

  starterApprovedCount: number;
  starterRequiredCount: number;
  starterSubmittedCount: number;
  starterComplete: boolean;
  hasUnseenStarterUnlock: boolean;

  level: number;
  levelTitle: string;
  currentXp: number;
  xpForNextLevel: number;
  xpToNextLevel: number;
  levelProgressPercent: number;

  weeklyRank?: number;
  weeklyScore?: number;
  pointsToNextRank?: number;

  activeMission?: TrevorActiveMission;
  proofNeedingMoreEvidence?: TrevorProofRepairTarget;
  rejectedProof?: TrevorProofRepairTarget;
  pendingProofCount: number;
  needsMoreProofCount: number;
  approvedProofCount: number;

  currentDeckId?: string;
  accessibleDeckIds: string[];
  recentlyUsedDeckIds: string[];
  recommendedDeckId?: string;

  crewId?: string;
  crewUnlocked: boolean;
  crewHasOpenTasks: boolean;

  votingPhase: VotingPhase;
  hasVotedThisCycle: boolean;

  profileCompleteness: number;
  missingProfileFields: string[];
  recentProofTypes: ProofType[];
  repeatedProofType?: ProofType;
  zineContentGaps: TrevorZineGap[];
  lastMeaningfulActionAt?: string;
}

export interface TrevorContextInput {
  userId?: string | null;
  currentRoute: string;
  profile?: Partial<UserProfile> | null;
  entries?: readonly Entry[];
  trips?: readonly TripCard[];
  activeTrip?: TripCard | null;
  activeSubmissionStatus?: string | null;
  drawnMissionCards?: readonly DrawnMissionCard[];
  memories?: readonly MemoryEntry[];
  accessibleDecks?: readonly DeckPack[];
  standings?: readonly UserProfile[];
  userVotes?: readonly unknown[];
  currentDate?: Date;
  legalComplete?: boolean;
  fieldClassificationComplete?: boolean;
  onboardingComplete?: boolean;
  starterApprovedCount?: number;
  starterRequiredCount?: number;
  starterSubmittedCount?: number;
  starterComplete?: boolean;
  pendingProofCount?: number;
  needsMoreProofCount?: number;
  approvedProofCount?: number;
  currentXp?: unknown;
  crewUnlocked?: boolean;
  crewHasOpenTasks?: boolean;
}

const PROOF_TYPES: readonly ProofType[] = [
  'photo',
  'note',
  'location',
  'group-confirmation',
  'audio',
  'video',
];

const EXCLUDED_ROUTE_PREFIXES = [
  '/admin',
  '/capture',
  '/mission-briefing',
  '/mission-submitted',
  '/classification',
  '/field-type',
  '/crew/invite',
  '/voting/ballot',
  '/voting/council',
] as const;

const EXCLUDED_EXACT_ROUTES = new Set(['/', '/login', '/signup', '/banned']);

export function isTrevorFocusedRoute(route: string): boolean {
  const path = normalizeRoute(route);
  return EXCLUDED_EXACT_ROUTES.has(path)
    || EXCLUDED_ROUTE_PREFIXES.some(prefix => path.startsWith(prefix));
}

export function buildTrevorContext(input: TrevorContextInput): TrevorContext {
  const profile = input.profile ?? null;
  const currentDate = isValidDate(input.currentDate) ? input.currentDate : new Date();
  const entries = [...(input.entries ?? [])]
    .filter(entry => !isArchivedEntry(entry))
    .sort((left, right) => getTimestampMs(right.createdAt ?? right.submittedAt) - getTimestampMs(left.createdAt ?? left.submittedAt));
  const trips = input.trips ?? [];
  const tripById = new Map<string, TripCard>();
  trips.forEach(trip => {
    getMissionAliases(trip).forEach(id => tripById.set(id, trip));
  });

  const approvedEntries = entries.filter(entry => normalizeEntryStatus(entry.status) === 'approved');
  const pendingEntries = entries.filter(entry => normalizeEntryStatus(entry.status) === 'pending_review');
  const needsMoreProofEntries = entries.filter(entry => normalizeEntryStatus(entry.status) === 'needs_more_proof');
  const rejectedEntries = entries.filter(entry => normalizeEntryStatus(entry.status) === 'rejected');

  const starterRequiredCount = toNonNegativeInteger(input.starterRequiredCount, 3) || 3;
  const starterApprovedCount = Math.min(
    starterRequiredCount,
    toNonNegativeInteger(input.starterApprovedCount, 0),
  );
  const starterSubmittedCount = Math.min(
    starterRequiredCount,
    Math.max(starterApprovedCount, toNonNegativeInteger(input.starterSubmittedCount, starterApprovedCount)),
  );
  const starterComplete = input.starterComplete === true || starterApprovedCount >= starterRequiredCount;

  const levelProgress = getLevelProgress(input.currentXp ?? profile?.xp ?? profile?.points ?? 0);
  const approvedProofCount = Math.max(
    approvedEntries.length,
    toNonNegativeInteger(input.approvedProofCount, approvedEntries.length),
  );
  const pendingProofCount = Math.max(
    pendingEntries.length,
    toNonNegativeInteger(input.pendingProofCount, pendingEntries.length),
  );
  const needsMoreProofCount = Math.max(
    needsMoreProofEntries.length,
    toNonNegativeInteger(input.needsMoreProofCount, needsMoreProofEntries.length),
  );

  const activeMission = resolveActiveMission({
    activeTrip: input.activeTrip,
    activeSubmissionStatus: input.activeSubmissionStatus,
    drawnMissionCards: input.drawnMissionCards ?? [],
    tripById,
  });
  const proofNeedingMoreEvidence = resolveProofRepairTarget(needsMoreProofEntries[0], tripById, 'needs_more_proof');
  const rejectedProof = resolveProofRepairTarget(rejectedEntries[0], tripById, 'rejected');

  const profileFields = getProfileCompleteness(profile, input.fieldClassificationComplete);
  const recentProofTypes = getRecentProofTypes(approvedEntries, tripById);
  const repeatedProofType = getRepeatedProofType(approvedEntries, tripById);
  const recentlyUsedDeckIds = uniqueStrings(entries.map(getEntryDeckId)).slice(0, 4);
  const accessibleDeckIds = uniqueStrings((input.accessibleDecks ?? []).map(deck => deck.packId || deck.deckId || deck.id));
  const recommendedDeckId = getRecommendedDeckId(accessibleDeckIds, recentlyUsedDeckIds, starterComplete);
  const crewId = normalizeOptionalString(profile?.activeCrewId || profile?.crewId);
  const ranking = getWeeklyRanking(profile, input.standings ?? []);
  const cycle = getCurrentVotingCycle(currentDate);
  const votingPhase = getVotingPhase(currentDate, cycle);
  const zineContentGaps = getZineContentGaps({
    approvedEntries,
    memories: input.memories ?? [],
    tripById,
    crewId,
  });

  const experienceStage: TrevorExperienceStage = !starterComplete
    ? 'starter'
    : approvedProofCount < 8 && levelProgress.level < 4
      ? 'new_explorer'
      : 'established_explorer';

  const lastMeaningfulActionMs = entries.length > 0
    ? getTimestampMs(entries[0].updatedAt ?? entries[0].createdAt ?? entries[0].submittedAt)
    : 0;

  return {
    userId: normalizeOptionalString(input.userId) || profile?.id || 'anonymous',
    currentRoute: normalizeRoute(input.currentRoute),
    explorerType: profile?.fieldType || undefined,
    legalComplete: input.legalComplete !== false,
    fieldClassificationComplete: input.fieldClassificationComplete ?? profile?.fieldClassificationComplete === true,
    onboardingComplete: input.onboardingComplete ?? profile?.onboardingCompleted === true,
    experienceStage,
    starterApprovedCount,
    starterRequiredCount,
    starterSubmittedCount,
    starterComplete,
    hasUnseenStarterUnlock: starterComplete
      && toNonNegativeInteger(profile?.trevorSettings?.lastSeenApprovedCount, 0) < starterRequiredCount,
    level: levelProgress.level,
    levelTitle: levelProgress.title,
    currentXp: levelProgress.xp,
    xpForNextLevel: levelProgress.xpForNextLevel,
    xpToNextLevel: levelProgress.xpToNextLevel,
    levelProgressPercent: levelProgress.progressPercent,
    weeklyRank: ranking.weeklyRank,
    weeklyScore: ranking.weeklyScore,
    pointsToNextRank: ranking.pointsToNextRank,
    activeMission,
    proofNeedingMoreEvidence,
    rejectedProof,
    pendingProofCount,
    needsMoreProofCount,
    approvedProofCount,
    currentDeckId: activeMission?.deckId || normalizeOptionalString(input.activeTrip?.deckId),
    accessibleDeckIds,
    recentlyUsedDeckIds,
    recommendedDeckId,
    crewId,
    crewUnlocked: input.crewUnlocked === true,
    crewHasOpenTasks: input.crewHasOpenTasks === true,
    votingPhase,
    hasVotedThisCycle: (input.userVotes?.length ?? 0) > 0,
    profileCompleteness: profileFields.percentage,
    missingProfileFields: profileFields.missing,
    recentProofTypes,
    repeatedProofType,
    zineContentGaps,
    lastMeaningfulActionAt: lastMeaningfulActionMs > 0
      ? new Date(lastMeaningfulActionMs).toISOString()
      : undefined,
  };
}

function normalizeRoute(route: string): string {
  const path = String(route || '/').split('?')[0].trim();
  return path.startsWith('/') ? path : `/${path}`;
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized || undefined;
}

function toNonNegativeInteger(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : fallback;
}

function isValidDate(value: unknown): value is Date {
  return value instanceof Date && Number.isFinite(value.getTime());
}

function getTimestampMs(value: unknown): number {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : 0;
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (isRecord(value)) {
    if (typeof value.toDate === 'function') {
      const result = value.toDate();
      return result instanceof Date && Number.isFinite(result.getTime()) ? result.getTime() : 0;
    }
    if (typeof value.seconds === 'number') return value.seconds * 1000;
  }
  return 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getMissionAliases(trip: TripCard): string[] {
  return uniqueStrings([trip.id, trip.missionId, trip.challengeId]).map(id => id.toLowerCase());
}

function getEntryMissionId(entry: Entry): string | undefined {
  return normalizeOptionalString(entry.missionId || entry.challengeId || entry.tripId)?.toLowerCase();
}

function getEntryDeckId(entry: Entry): string | undefined {
  return normalizeOptionalString(entry.deckId)?.toLowerCase();
}

function resolveProofRepairTarget(
  entry: Entry | undefined,
  tripById: ReadonlyMap<string, TripCard>,
  status: TrevorProofRepairTarget['status'],
): TrevorProofRepairTarget | undefined {
  if (!entry) return undefined;
  const missionId = getEntryMissionId(entry);
  const entryId = normalizeOptionalString(entry.entryId || entry.id);
  if (!entryId || !missionId) return undefined;
  return {
    entryId,
    missionId,
    missionTitle: normalizeOptionalString(entry.missionTitle || entry.tripTitle || entry.challengeTitle)
      || tripById.get(missionId)?.title,
    status,
  };
}

function resolveActiveMission(input: {
  activeTrip?: TripCard | null;
  activeSubmissionStatus?: string | null;
  drawnMissionCards: readonly DrawnMissionCard[];
  tripById: ReadonlyMap<string, TripCard>;
}): TrevorActiveMission | undefined {
  if (input.activeTrip?.id) {
    return {
      id: input.activeTrip.id,
      title: input.activeTrip.title || 'Current mission',
      status: input.activeSubmissionStatus || input.activeTrip.status || 'active',
      deckId: normalizeOptionalString(input.activeTrip.deckId),
    };
  }

  const activeCard = input.drawnMissionCards.find(card => (
    card.isActive === true || card.status === 'active' || card.status === 'drawn'
  ));
  if (!activeCard) return undefined;
  const missionId = normalizeOptionalString(activeCard.missionId || activeCard.challengeId);
  if (!missionId) return undefined;
  const mission = input.tripById.get(missionId.toLowerCase());
  return {
    id: missionId,
    title: activeCard.missionTitle || mission?.title || 'Current mission',
    status: activeCard.status,
    deckId: normalizeOptionalString(activeCard.deckId || mission?.deckId),
  };
}

function getProfileCompleteness(
  profile: Partial<UserProfile> | null,
  fieldClassificationComplete?: boolean,
): { percentage: number; missing: string[] } {
  const missing: string[] = [];
  const displayName = normalizeOptionalString(profile?.displayName || profile?.name || profile?.username);
  if (!displayName || displayName.toLowerCase() === 'field agent') missing.push('display_name');
  if (!(fieldClassificationComplete ?? profile?.fieldClassificationComplete === true) || !profile?.fieldType) {
    missing.push('explorer_type');
  }
  if (!profile?.photoURL && !profile?.avatar) missing.push('profile_image');
  return {
    percentage: Math.round(((3 - missing.length) / 3) * 100),
    missing,
  };
}

function getRecentProofTypes(
  approvedEntries: readonly Entry[],
  tripById: ReadonlyMap<string, TripCard>,
): ProofType[] {
  const types: ProofType[] = [];
  approvedEntries.slice(0, 8).forEach(entry => {
    const missionId = getEntryMissionId(entry);
    const mission = missionId ? tripById.get(missionId) : undefined;
    mission?.proofType?.forEach(type => {
      if (isProofType(type) && !types.includes(type)) types.push(type);
    });
  });
  return types;
}

function getRepeatedProofType(
  approvedEntries: readonly Entry[],
  tripById: ReadonlyMap<string, TripCard>,
): ProofType | undefined {
  const recentPrimaryTypes = approvedEntries.slice(0, 3).map(entry => {
    const missionId = getEntryMissionId(entry);
    return missionId ? tripById.get(missionId)?.proofType?.[0] : undefined;
  });
  if (recentPrimaryTypes.length < 3 || !recentPrimaryTypes.every(isProofType)) return undefined;
  return recentPrimaryTypes.every(type => type === recentPrimaryTypes[0])
    ? recentPrimaryTypes[0]
    : undefined;
}

function isProofType(value: unknown): value is ProofType {
  return typeof value === 'string' && PROOF_TYPES.some(type => type === value);
}

function uniqueStrings(values: readonly (string | null | undefined)[]): string[] {
  const unique = new Set<string>();
  values.forEach(value => {
    const normalized = normalizeOptionalString(value)?.toLowerCase();
    if (normalized) unique.add(normalized);
  });
  return [...unique];
}

function getRecommendedDeckId(
  accessibleDeckIds: readonly string[],
  recentlyUsedDeckIds: readonly string[],
  starterComplete: boolean,
): string | undefined {
  const eligible = starterComplete
    ? accessibleDeckIds.filter(id => id !== 'starter-signals')
    : accessibleDeckIds.filter(id => id === 'starter-signals');
  return eligible.find(id => !recentlyUsedDeckIds.includes(id)) || eligible[0] || accessibleDeckIds[0];
}

function getWeeklyRanking(
  profile: Partial<UserProfile> | null,
  standings: readonly UserProfile[],
): { weeklyRank?: number; weeklyScore?: number; pointsToNextRank?: number } {
  const weeklyRank = toPositiveInteger(profile?.weeklyRank);
  const weeklyScore = toFiniteNumber(profile?.weeklyXp);
  if (!weeklyRank || weeklyScore === undefined || weeklyRank <= 1) {
    return { weeklyRank, weeklyScore };
  }
  const nextProfile = standings.find(candidate => toPositiveInteger(candidate.weeklyRank) === weeklyRank - 1);
  const nextScore = toFiniteNumber(nextProfile?.weeklyXp);
  const pointsToNextRank = nextScore !== undefined && nextScore >= weeklyScore
    ? nextScore - weeklyScore + 1
    : undefined;
  return { weeklyRank, weeklyScore, pointsToNextRank };
}

function toPositiveInteger(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : undefined;
}

function toFiniteNumber(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function getZineContentGaps(input: {
  approvedEntries: readonly Entry[];
  memories: readonly MemoryEntry[];
  tripById: ReadonlyMap<string, TripCard>;
  crewId?: string;
}): TrevorZineGap[] {
  if (input.approvedEntries.length < 2) return [];
  const gaps: TrevorZineGap[] = [];
  const hasCaption = input.approvedEntries.some(entry => Boolean(normalizeOptionalString(entry.fieldNote || entry.note)))
    || input.memories.some(memory => Boolean(normalizeOptionalString(memory.fieldNote)));
  if (!hasCaption) gaps.push('captions');

  const hasLocation = input.approvedEntries.some(entry => {
    const missionId = getEntryMissionId(entry);
    const mission = missionId ? input.tripById.get(missionId) : undefined;
    return mission?.proofType?.includes('location') === true || recordHasLocation(entry);
  });
  if (!hasLocation) gaps.push('locations');

  if (input.crewId && !input.approvedEntries.some(entry => entry.crewMemory?.isEligible === true || entry.cardType === 'Lore')) {
    gaps.push('lore');
  }
  return gaps;
}

function recordHasLocation(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (
    value.location != null
    || value.latitude != null
    || value.longitude != null
    || value.geopoint != null
  ) return true;
  const metadata = isRecord(value.metadata) ? value.metadata : undefined;
  return Boolean(
    metadata?.gpsPresent
    || metadata?.latitude != null
    || metadata?.longitude != null,
  );
}
