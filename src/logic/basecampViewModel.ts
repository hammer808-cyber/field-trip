import type { UserBadgeProgress } from '../types/badges';
import type { TripCard } from '../types/challenges';
import type { DrawnMissionCard, Entry, Vote } from '../types/game';
import type { Observation } from '../types/observations';
import type { UserProfile } from '../services/userService';
import type { CanonicalProgressSnapshot } from '../services/canonicalProgress';
import {
  getDeckProgress,
  getStarterProgress,
  getUserXp,
} from '../services/canonicalProgress';
import { getLevelProgress } from './playerLevel';
import { isArchivedEntry, normalizeEntryStatus } from './entryLogic';
import {
  crewChatMentionCopy,
  crewCommentCopy,
  crewMemberJoinedCopy,
  powerHourLiveCopy,
  proofReviewDecisionCopy,
  proofSubmittedCopy,
  stickerAwardedCopy,
  type PlayerNotification,
} from './playerNotifications';
import {
  isUnseenStarterUnlock,
  resolvePlayerGuidance,
  resolvePlayerMissionLifecycle,
  type PlayerGuidanceSnapshot,
} from './playerGuidance';

export type BasecampActionIntent = 'navigate' | 'retry-proof';

export interface BasecampPrimaryAction {
  label: string;
  href: string;
  intent: BasecampActionIntent;
  missionId?: string;
}

export interface BasecampMissionSummaryModel {
  id: string;
  title: string;
  description: string;
  deckId: string | null;
  deckName: string;
  status:
    | 'drawn'
    | 'active'
    | 'pending_review'
    | 'needs_more_proof'
    | 'rejected'
    | 'approved';
  statusLabel: string;
  rewardXp: number | null;
}

export interface BasecampNextActionModel {
  eyebrow: string;
  title: string;
  description: string;
  statusLabel: string;
  action: BasecampPrimaryAction;
  secondaryAction: BasecampPrimaryAction | null;
  urgency: PlayerGuidanceSnapshot['urgency'];
  guidanceState: PlayerGuidanceSnapshot['state'];
  mission: BasecampMissionSummaryModel | null;
  deckId: string;
}

export interface BasecampProofAttentionModel {
  actionableCount: number;
  pendingCount: number;
  item: {
    entryId: string;
    missionId: string | null;
    deckId: string | null;
    title: string;
    status: 'needs_more_proof' | 'rejected';
    statusLabel: string;
    note: string;
    action: BasecampPrimaryAction;
  } | null;
}

export interface BasecampProgressModel {
  xp: number;
  level: number;
  levelTitle: string;
  nextLevel: number;
  xpToNextLevel: number;
  levelProgressPercent: number;
  starterApprovedCount: number;
  starterRequiredCount: number;
  starterPercent: number;
  activeDeckId: string;
  activeDeckName: string;
  activeDeckApprovedCount: number;
  activeDeckPendingCount: number;
  activeDeckTotalCount: number;
  activeDeckPercent: number;
}

export interface BasecampCrewModel {
  hasCrew: boolean;
  crewId: string | null;
  crewName: string;
  roleLabel: string | null;
  acceptedCount: number;
  incomingCount: number;
}

export interface BasecampQuickLink {
  id: 'missions' | 'logbook' | 'loteria' | 'voting';
  label: string;
  description: string;
  href: string;
}

export type BasecampNotificationKind = 'decision' | 'sticker' | 'submission' | 'power_hour' | 'crew';

/**
 * One row of the Basecamp Notifications section (Nov 17, 2026): the full
 * notification list, newest-first, no 5-item cap — the subscription caps
 * at 20. Notifications is the single home for every notification doc
 * (decisions, submissions, sticker awards, Power Hour); the Updates
 * section was removed Nov 18, 2026. Rows are tappable to their destination (Dex
 * stickers tab for sticker awards, the Logbook for decisions and
 * submissions, Missions for a live Power Hour).
 */
export interface BasecampNotificationItem {
  id: string;
  kind: BasecampNotificationKind;
  title: string;
  detail: string;
  timeLabel: string;
  timestamp: number;
  unread: boolean;
  href: string;
}

export interface BasecampViewModel {
  nextAction: BasecampNextActionModel;
  attention: BasecampProofAttentionModel;
  progress: BasecampProgressModel;
  crew: BasecampCrewModel;
  notifications: BasecampNotificationItem[];
  quickLinks: BasecampQuickLink[];
  guidance: PlayerGuidanceSnapshot;
}

export interface BuildBasecampViewModelInput {
  canonicalProgress: CanonicalProgressSnapshot;
  entries: readonly Entry[];
  activeTrip: TripCard | null;
  activeSubmissionStatus?: string | null;
  drawnMissionCards: readonly DrawnMissionCard[];
  trips: readonly TripCard[];
  profile: UserProfile | null;
  badgeProgress: readonly UserBadgeProgress[];
  observations: readonly Observation[];
  userVotes: readonly Vote[];
  /** Server-written proof-review decision notifications (Q11). Each
   * decision renders once, in Notifications, with its XP and admin note. */
  notifications: readonly PlayerNotification[];
  currentDate: Date;
  isHeatwaveDeckUnlocked: boolean;
  isVotingOpen: boolean;
  /** Accessible deck ids in deck sort order + seasonal deck, for the
   * next-deck ranking. Optional; without them the ranking falls back to
   * deckProgressById order with no seasonal pick. */
  accessibleDeckIds?: readonly string[];
  seasonalDeckId?: string;
  crewGraph?: {
    acceptedCount: number;
    incomingCount: number;
  } | null;
}

function toMillis(value: unknown): number {
  if (!value) return 0;
  if (typeof (value as { toMillis?: () => number }).toMillis === 'function') {
    return (value as { toMillis: () => number }).toMillis();
  }
  if (typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().getTime();
  }
  const seconds = (value as { seconds?: unknown }).seconds;
  if (typeof seconds === 'number') return seconds * 1000;
  const parsed = new Date(value as string | number | Date).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function getEntryTimestamp(entry: Entry): number {
  return [entry.approvedAt, entry.reviewedAt, entry.submittedAt, entry.createdAt, entry.updatedAt]
    .map(toMillis)
    .find(timestamp => timestamp > 0) || 0;
}

function formatActivityTime(timestamp: number, currentDate: Date): string {
  if (timestamp <= 0) return '';
  const now = currentDate.getTime();
  const elapsed = Math.max(0, now - timestamp);
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function entryMissionId(entry: Entry): string | null {
  const value = entry.missionId || entry.challengeId || entry.tripId;
  return value ? String(value).trim().toLowerCase() : null;
}

function entryTitle(entry: Entry): string {
  return entry.missionTitle || entry.tripTitle || entry.challengeTitle || 'Field proof';
}

function resolveMission(input: BuildBasecampViewModelInput): BasecampMissionSummaryModel | null {
  return resolvePlayerMissionLifecycle({
    canonicalProgress: input.canonicalProgress,
    activeTrip: input.activeTrip,
    activeSubmissionStatus: input.activeSubmissionStatus,
    drawnMissionCards: input.drawnMissionCards,
    trips: input.trips,
  });
}

function getActiveEntries(entries: readonly Entry[]): Entry[] {
  const byId = new Map<string, Entry>();
  entries.forEach(entry => {
    if (isArchivedEntry(entry)) return;
    const id = entry.entryId || entry.id;
    const previous = byId.get(id);
    if (!previous || getEntryTimestamp(entry) >= getEntryTimestamp(previous)) byId.set(id, entry);
  });
  return [...byId.values()];
}

function buildAttention(entries: readonly Entry[]): BasecampProofAttentionModel {
  const activeEntries = getActiveEntries(entries);
  const newestByMission = new Map<string, Entry>();
  for (const entry of activeEntries) {
    const rawStatus = String(entry.status || '').toLowerCase().trim();
    if (rawStatus === 'retried') continue;
    const missionId = entryMissionId(entry);
    if (!missionId) continue;
    const previous = newestByMission.get(missionId);
    if (!previous || getEntryTimestamp(entry) >= getEntryTimestamp(previous)) {
      newestByMission.set(missionId, entry);
    }
  }
  const actionable = [...newestByMission.values()]
    .filter(entry => ['needs_more_proof', 'rejected'].includes(normalizeEntryStatus(entry.status)))
    .sort((left, right) => getEntryTimestamp(right) - getEntryTimestamp(left));
  const pendingCount = [...newestByMission.values()]
    .filter(entry => normalizeEntryStatus(entry.status) === 'pending_review')
    .length;
  const latest = actionable[0];
  if (!latest) return { actionableCount: 0, pendingCount, item: null };

  const status = normalizeEntryStatus(latest.status) as 'needs_more_proof' | 'rejected';
  const missionId = entryMissionId(latest);
  const note = latest.reviewerNote
    || latest.adminNotes
    || (status === 'needs_more_proof'
      ? 'Open the proof record to see what additional evidence is needed.'
      : 'This mission can be attempted again when you are ready.');

  return {
    actionableCount: actionable.length,
    pendingCount,
    item: {
      entryId: latest.entryId || latest.id,
      missionId,
      deckId: latest.deckId || null,
      title: entryTitle(latest),
      status,
      statusLabel: status === 'needs_more_proof' ? 'Needs more proof' : 'Retry available',
      note,
      action: missionId
        ? { label: 'Retry Mission', href: `/capture?id=${encodeURIComponent(missionId)}`, intent: 'retry-proof', missionId }
        : { label: 'Open Logbook', href: '/profile?tab=logbook', intent: 'navigate' },
    },
  };
}

function buildNextAction(
  guidance: PlayerGuidanceSnapshot,
  mission: BasecampMissionSummaryModel | null,
): BasecampNextActionModel {
  return {
    eyebrow: guidance.shortMessage,
    title: guidance.title,
    description: guidance.flavorMessage,
    statusLabel: mission?.statusLabel || guidance.shortMessage,
    action: {
      label: guidance.primaryActionLabel,
      href: guidance.primaryActionDestination,
      intent: guidance.primaryActionIntent,
      missionId: guidance.relevantMissionId || undefined,
    },
    secondaryAction: guidance.secondaryAction
      ? {
          label: guidance.secondaryAction.label,
          href: guidance.secondaryAction.destination,
          intent: guidance.secondaryAction.intent,
          missionId: guidance.secondaryAction.missionId,
        }
      : null,
    urgency: guidance.urgency,
    guidanceState: guidance.state,
    mission,
    deckId: guidance.deckId,
  };
}

function buildProgress(input: BuildBasecampViewModelInput, activeDeckId: string): BasecampProgressModel {
  const xpProgress = getLevelProgress(getUserXp(input.canonicalProgress));
  const starter = getStarterProgress(input.canonicalProgress);
  const deck = getDeckProgress(input.canonicalProgress, activeDeckId);
  return {
    xp: xpProgress.xp,
    level: xpProgress.level,
    levelTitle: xpProgress.title,
    nextLevel: xpProgress.nextLevel.level,
    xpToNextLevel: xpProgress.xpToNextLevel,
    levelProgressPercent: xpProgress.progressPercent,
    starterApprovedCount: starter.starterApprovedCount,
    starterRequiredCount: starter.starterRequiredCount,
    starterPercent: starter.percent,
    activeDeckId,
    activeDeckName: deck.deckName,
    activeDeckApprovedCount: deck.approvedCount,
    activeDeckPendingCount: deck.pendingCount,
    activeDeckTotalCount: deck.totalCards,
    activeDeckPercent: deck.percent,
  };
}

function buildCrew(
  profile: UserProfile | null,
  entries: readonly Entry[],
  crewGraph?: BuildBasecampViewModelInput['crewGraph'],
): BasecampCrewModel {
  const crewId = profile?.activeCrewId || profile?.crewId || null;
  const crewName = crewId
    ? getActiveEntries(entries)
      .find(entry => entry.crewContext?.crewId === crewId && entry.crewContext.crewNameSnapshot)?.crewContext?.crewNameSnapshot
    : null;
  const acceptedCount = Number(crewGraph?.acceptedCount || 0);
  const incomingCount = Number(crewGraph?.incomingCount || 0);
  const hasPeople = acceptedCount > 0;
  return {
    hasCrew: hasPeople || Boolean(crewId),
    crewId,
    crewName: hasPeople
      ? (acceptedCount === 1 ? '1 Crew member' : `${acceptedCount} Crew members`)
      : (crewName || (crewId ? 'Your Crew' : 'Your Crew is empty')),
    roleLabel: crewId && profile?.crewRole ? profile.crewRole : null,
    acceptedCount,
    incomingCount,
  };
}

function buildNotifications(input: BuildBasecampViewModelInput): BasecampNotificationItem[] {
  // The full notification list (Nov 17, 2026): every notification doc the
  // subscription returns, newest-first, no 5-item cap — this section is the
  // single home for notifications (the Updates section was removed
  // Nov 18, 2026). Decisions, submissions, sticker awards, and Power Hour
  // announcements all land here.
  return (input.notifications || [])
    .flatMap<BasecampNotificationItem>(notification => {
      const timestamp = Number(notification.createdAt || 0);
      if (!timestamp) return [];
      const timeLabel = formatActivityTime(timestamp, input.currentDate);
      const unread = notification.read !== true;
      if (notification.type === 'sticker_awarded') {
        const copy = stickerAwardedCopy(notification);
        return [{
          id: `notification-${notification.id}`,
          kind: 'sticker' as const,
          title: copy.title,
          detail: copy.detail,
          timestamp,
          timeLabel,
          unread,
          href: '/dex/stickers',
        }];
      }
      if (notification.type === 'proof_submitted') {
        const copy = proofSubmittedCopy(notification);
        return [{
          id: `notification-${notification.id}`,
          kind: 'submission' as const,
          title: copy.title,
          detail: copy.detail,
          timestamp,
          timeLabel,
          unread,
          href: '/profile?tab=logbook',
        }];
      }
      if (notification.type === 'power_hour_live') {
        const copy = powerHourLiveCopy(notification);
        return [{
          id: `notification-${notification.id}`,
          kind: 'power_hour' as const,
          title: copy.title,
          detail: copy.detail,
          timestamp,
          timeLabel,
          unread,
          href: '/missions',
        }];
      }
      // Crew clubhouse (Nov 20, 2026): comments, @-mentions, and new
      // members all land in Notifications and tap through to the crew.
      if (notification.type === 'crew_comment') {
        const copy = crewCommentCopy(notification);
        return [{
          id: `notification-${notification.id}`,
          kind: 'crew' as const,
          title: copy.title,
          detail: copy.detail,
          timestamp,
          timeLabel,
          unread,
          href: '/crew?tab=feed',
        }];
      }
      if (notification.type === 'crew_chat_mention') {
        const copy = crewChatMentionCopy(notification);
        return [{
          id: `notification-${notification.id}`,
          kind: 'crew' as const,
          title: copy.title,
          detail: copy.detail,
          timestamp,
          timeLabel,
          unread,
          href: '/crew?tab=chat',
        }];
      }
      if (notification.type === 'crew_member_joined') {
        const copy = crewMemberJoinedCopy(notification);
        return [{
          id: `notification-${notification.id}`,
          kind: 'crew' as const,
          title: copy.title,
          detail: copy.detail,
          timestamp,
          timeLabel,
          unread,
          href: '/crew',
        }];
      }
      const copy = proofReviewDecisionCopy(notification);
      return [{
        id: `notification-${notification.id}`,
        kind: 'decision' as const,
        title: copy.title,
        detail: copy.detail,
        timestamp,
        timeLabel,
        unread,
        href: '/profile?tab=logbook',
      }];
    })
    .sort((left, right) => right.timestamp - left.timestamp);
}

export function buildBasecampViewModel(input: BuildBasecampViewModelInput): BasecampViewModel {
  const starter = getStarterProgress(input.canonicalProgress);
  const guidance = resolvePlayerGuidance({
    canonicalProgress: input.canonicalProgress,
    entries: input.entries,
    activeTrip: input.activeTrip,
    activeSubmissionStatus: input.activeSubmissionStatus,
    drawnMissionCards: input.drawnMissionCards,
    trips: input.trips,
    legalComplete: true,
    fieldClassificationComplete: input.profile?.fieldClassificationComplete !== false,
    hasSeenFieldTypeResults: true,
    hasCompletedFieldKitOnboarding: true,
    isHeatwaveDeckUnlocked: input.isHeatwaveDeckUnlocked,
    tripProgress: input.profile?.tripProgress,
    voteAvailable: input.isVotingOpen && input.userVotes.length === 0,
    hasUnseenStarterUnlock: isUnseenStarterUnlock({
      starterComplete: starter.starterComplete,
      starterApprovedCount: starter.starterApprovedCount,
      starterRequiredCount: starter.starterRequiredCount,
      lastSeenApprovedCount: input.profile?.trevorSettings?.lastSeenApprovedCount,
    }),
    // Deck-complete one-shot + ranking inputs (Nov 20, 2026): Basecamp.tsx
    // passes the same sorted accessible list Trevor uses, so the two agree
    // on the next deck. Tests that omit them get the deckProgressById
    // fallback order with no seasonal pick.
    seenDeckCompletions: input.profile?.trevorSettings?.seenDeckCompletions,
    accessibleDeckIds: input.accessibleDeckIds,
    seasonalDeckId: input.seasonalDeckId,
  });
  const attention = buildAttention(input.entries);
  const mission = resolveMission(input);
  const nextAction = buildNextAction(guidance, mission);
  const progress = buildProgress(input, nextAction.deckId);
  const activeEntries = getActiveEntries(input.entries);
  const approvedCount = activeEntries.filter(entry => normalizeEntryStatus(entry.status) === 'approved').length;
  const pendingCount = activeEntries.filter(entry => normalizeEntryStatus(entry.status) === 'pending_review').length;

  return {
    nextAction,
    attention,
    progress,
    crew: buildCrew(input.profile, input.entries, input.crewGraph),
    notifications: buildNotifications(input),
    guidance,
    // Missions is always in the quick links: the deck is the pre-Starter
    // home, and Basecamp is the locked room until the Starter set is done.
    quickLinks: [
      {
        id: 'missions' as const,
        label: 'Missions',
        description: guidance.primaryActionLabel,
        href: guidance.navigationTarget === 'missions' ? guidance.primaryActionDestination : '/missions',
      },
      {
        id: 'logbook',
        label: 'Logbook',
        description: activeEntries.length > 0
          ? `${approvedCount} approved · ${pendingCount} in review`
          : 'Your submitted field proofs will appear here.',
        href: '/profile?tab=logbook',
      },
      {
        id: 'voting',
        label: 'Voting',
        description: input.userVotes.length > 0
          ? 'Your ballot activity is recorded for this cycle.'
          : input.isVotingOpen
            ? 'Weekly voting is open.'
            : 'Check the current weekly voting state.',
        href: '/voting',
      },
    ],
  };
}
