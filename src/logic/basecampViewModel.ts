import type { UserBadgeProgress } from '../types/badges';
import { BADGE_DEFINITIONS } from '../types/badges';
import type { TripCard } from '../types/challenges';
import type { DrawnMissionCard, Entry, Vote } from '../types/game';
import type { Observation } from '../types/observations';
import type { UserProfile } from '../services/userService';
import type { CanonicalProgressSnapshot } from '../services/canonicalProgress';
import {
  getChallengeStatus,
  getDeckProgress,
  getStarterProgress,
  getUserXp,
} from '../services/canonicalProgress';
import { getLevelProgress } from './playerLevel';
import { isArchivedEntry, normalizeEntryStatus } from './entryLogic';

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
}

export type BasecampActivityKind = 'proof' | 'badge' | 'observation' | 'vote';

export interface BasecampActivityItem {
  id: string;
  kind: BasecampActivityKind;
  title: string;
  detail: string;
  timeLabel: string;
  timestamp: number;
}

export interface BasecampQuickLink {
  id: 'missions' | 'logbook' | 'voting';
  label: string;
  description: string;
  href: string;
}

export interface BasecampViewModel {
  nextAction: BasecampNextActionModel;
  attention: BasecampProofAttentionModel;
  progress: BasecampProgressModel;
  crew: BasecampCrewModel;
  recentActivity: BasecampActivityItem[];
  quickLinks: BasecampQuickLink[];
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
  currentDate: Date;
  isHeatwaveDeckUnlocked: boolean;
  isVotingOpen: boolean;
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
  const tripById = new Map(input.trips.map(trip => [trip.id.toLowerCase(), trip]));
  const drawnCard = input.drawnMissionCards.find(card => (
    card.isActive === true || card.status === 'active' || card.status === 'drawn'
  ));
  const drawnMissionId = drawnCard?.missionId || drawnCard?.challengeId;
  const trip = input.activeTrip || (drawnMissionId ? tripById.get(drawnMissionId.toLowerCase()) || null : null);
  const missionId = trip?.id || drawnMissionId;
  if (!missionId) return null;

  const canonicalStatus = getChallengeStatus(
    input.canonicalProgress,
    missionId,
    input.activeTrip?.id || drawnMissionId || null,
  );
  const explicitStatus = input.activeSubmissionStatus || drawnCard?.status || trip?.status;
  let status: BasecampMissionSummaryModel['status'];
  if (['pending_review', 'needs_more_proof', 'rejected', 'approved'].includes(canonicalStatus)) {
    status = canonicalStatus as BasecampMissionSummaryModel['status'];
  } else if (['pending_review', 'needs_more_proof', 'rejected', 'approved'].includes(explicitStatus || '')) {
    status = explicitStatus as BasecampMissionSummaryModel['status'];
  } else if (explicitStatus === 'active' || explicitStatus === 'in-progress') {
    status = 'active';
  } else {
    status = 'drawn';
  }

  const statusLabels: Record<BasecampMissionSummaryModel['status'], string> = {
    drawn: 'Ready to start',
    active: 'Mission active',
    pending_review: 'Proof in review',
    needs_more_proof: 'More proof needed',
    rejected: 'Retry available',
    approved: 'Mission approved',
  };
  const deckId = trip?.deckId || drawnCard?.deckId || null;

  return {
    id: missionId,
    title: trip?.title || drawnCard?.missionTitle || 'Current mission',
    description: trip?.shortDescription || trip?.description || drawnCard?.missionSummary || 'Open the mission for the full field brief.',
    deckId,
    deckName: trip?.deckName || deckId || 'Fieldtrip deck',
    status,
    statusLabel: statusLabels[status],
    rewardXp: Number.isFinite(Number(trip?.baseXP || trip?.basePoints))
      ? Number(trip?.baseXP || trip?.basePoints)
      : null,
  };
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
  const actionable = activeEntries
    .filter(entry => ['needs_more_proof', 'rejected'].includes(normalizeEntryStatus(entry.status)))
    .sort((left, right) => getEntryTimestamp(right) - getEntryTimestamp(left));
  const pendingCount = activeEntries.filter(entry => normalizeEntryStatus(entry.status) === 'pending_review').length;
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
  input: BuildBasecampViewModelInput,
  attention: BasecampProofAttentionModel,
  mission: BasecampMissionSummaryModel | null,
): BasecampNextActionModel {
  if (attention.item) {
    return {
      eyebrow: 'Proof attention',
      title: attention.item.title,
      description: attention.item.note,
      statusLabel: attention.item.statusLabel,
      action: attention.item.action,
      mission,
      deckId: attention.item.deckId || mission?.deckId || 'starter-signals',
    };
  }

  if (mission) {
    if (mission.status === 'needs_more_proof' || mission.status === 'rejected') {
      return {
        eyebrow: 'Proof attention',
        title: mission.title,
        description: mission.status === 'needs_more_proof'
          ? 'This mission needs another proof attempt before it can count toward deck progress.'
          : 'This proof did not pass review. You can reset the attempt and try the mission again.',
        statusLabel: mission.statusLabel,
        action: {
          label: 'Retry Mission',
          href: `/capture?id=${encodeURIComponent(mission.id)}`,
          intent: 'retry-proof',
          missionId: mission.id,
        },
        mission,
        deckId: mission.deckId || 'starter-signals',
      };
    }
    if (mission.status === 'pending_review') {
      return {
        eyebrow: 'Proof status',
        title: mission.title,
        description: 'Your proof is with the review team. Pending review does not stop you from drawing another mission.',
        statusLabel: mission.statusLabel,
        action: { label: 'View Logbook', href: '/profile?tab=logbook', intent: 'navigate' },
        mission,
        deckId: mission.deckId || 'starter-signals',
      };
    }
    if (mission.status === 'approved') {
      return {
        eyebrow: 'Mission cleared',
        title: mission.title,
        description: 'This receipt is approved and now counts toward your deck progress.',
        statusLabel: mission.statusLabel,
        action: { label: 'Draw Next Mission', href: '/missions', intent: 'navigate' },
        mission,
        deckId: mission.deckId || 'starter-signals',
      };
    }
    return {
      eyebrow: 'Current mission',
      title: mission.title,
      description: mission.description,
      statusLabel: mission.statusLabel,
      action: {
        label: mission.status === 'drawn' ? 'Open Briefing' : 'Continue Mission',
        href: mission.status === 'drawn'
          ? `/mission-briefing?id=${encodeURIComponent(mission.id)}`
          : `/capture?id=${encodeURIComponent(mission.id)}`,
        intent: 'navigate',
      },
      mission,
      deckId: mission.deckId || 'starter-signals',
    };
  }

  const starter = getStarterProgress(input.canonicalProgress);
  if (!starter.starterComplete) {
    return {
      eyebrow: 'Next assignment',
      title: 'Finish Starter Signals',
      description: `${starter.starterApprovedCount} of ${starter.starterRequiredCount} Starter Signals approved. Complete all three to open the wider field map.`,
      statusLabel: starter.status === 'PENDING_REVIEW' ? 'Starter proofs in review' : 'Starter training',
      action: { label: 'Open Starter Deck', href: '/missions?pack=starter-signals', intent: 'navigate' },
      mission: null,
      deckId: 'starter-signals',
    };
  }

  const deckId = input.isHeatwaveDeckUnlocked ? 'heatwave-receipts' : 'starter-signals';
  return {
    eyebrow: 'Next assignment',
    title: input.isHeatwaveDeckUnlocked ? 'Find Your Next Receipt' : 'Choose a Mission',
    description: input.isHeatwaveDeckUnlocked
      ? 'Heatwave Receipts is open. Draw a mission when you are ready to head back outside.'
      : 'Open Missions to choose an available deck and draw your next field assignment.',
    statusLabel: input.isHeatwaveDeckUnlocked ? 'Season deck available' : 'Field deck available',
    action: {
      label: input.isHeatwaveDeckUnlocked ? 'Open Heatwave Deck' : 'Open Missions',
      href: input.isHeatwaveDeckUnlocked ? '/missions?pack=heatwave-receipts' : '/missions',
      intent: 'navigate',
    },
    mission: null,
    deckId,
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

function buildCrew(profile: UserProfile | null, entries: readonly Entry[]): BasecampCrewModel {
  const crewId = profile?.activeCrewId || profile?.crewId || null;
  const crewName = crewId
    ? getActiveEntries(entries)
      .find(entry => entry.crewContext?.crewId === crewId && entry.crewContext.crewNameSnapshot)?.crewContext?.crewNameSnapshot
    : null;
  return {
    hasCrew: Boolean(crewId),
    crewId,
    crewName: crewName || (crewId ? 'Your Crew' : 'No active crew'),
    roleLabel: crewId && profile?.crewRole ? profile.crewRole : null,
  };
}

function buildRecentActivity(input: BuildBasecampViewModelInput): BasecampActivityItem[] {
  const entryItems = getActiveEntries(input.entries).flatMap<BasecampActivityItem>(entry => {
    const timestamp = getEntryTimestamp(entry);
    if (!timestamp) return [];
    const status = normalizeEntryStatus(entry.status);
    const copy = {
      approved: ['Proof approved', 'This receipt now counts toward deck progress.'],
      pending_review: ['Proof submitted', 'Your receipt is waiting for review.'],
      needs_more_proof: ['Proof needs another look', 'Review the note before retrying this mission.'],
      rejected: ['Proof review closed', 'A retry is available from your Logbook.'],
    } as const;
    return [{
      id: `entry-${entry.entryId || entry.id}`,
      kind: 'proof',
      title: copy[status][0],
      detail: entryTitle(entry),
      timestamp,
      timeLabel: formatActivityTime(timestamp, input.currentDate),
    }];
  });

  const badgeItems = input.badgeProgress.flatMap<BasecampActivityItem>(progress => {
    const timestamp = toMillis(progress.unlockedAt);
    if (!progress.isUnlocked || !timestamp) return [];
    const badge = BADGE_DEFINITIONS.find(definition => definition.id === progress.badgeId);
    return [{
      id: `badge-${progress.badgeId}`,
      kind: 'badge',
      title: 'Badge unlocked',
      detail: badge?.title || progress.badgeId,
      timestamp,
      timeLabel: formatActivityTime(timestamp, input.currentDate),
    }];
  });

  const observationItems = input.observations.flatMap<BasecampActivityItem>(observation => {
    const timestamp = toMillis(observation.createdAt);
    if (observation.isDismissed || !timestamp) return [];
    return [{
      id: `observation-${observation.id}`,
      kind: 'observation',
      title: 'Trevor left a field note',
      detail: observation.observationText,
      timestamp,
      timeLabel: formatActivityTime(timestamp, input.currentDate),
    }];
  });

  const voteItems = input.userVotes.flatMap<BasecampActivityItem>(vote => {
    const timestamp = toMillis(vote.createdAt);
    if (!timestamp) return [];
    return [{
      id: `vote-${vote.id}`,
      kind: 'vote',
      title: 'Weekly vote recorded',
      detail: vote.category.replaceAll('_', ' '),
      timestamp,
      timeLabel: formatActivityTime(timestamp, input.currentDate),
    }];
  });

  return [...entryItems, ...badgeItems, ...observationItems, ...voteItems]
    .sort((left, right) => right.timestamp - left.timestamp)
    .slice(0, 5);
}

export function buildBasecampViewModel(input: BuildBasecampViewModelInput): BasecampViewModel {
  const attention = buildAttention(input.entries);
  const mission = resolveMission(input);
  const nextAction = buildNextAction(input, attention, mission);
  const progress = buildProgress(input, nextAction.deckId);
  const activeEntries = getActiveEntries(input.entries);
  const approvedCount = activeEntries.filter(entry => normalizeEntryStatus(entry.status) === 'approved').length;
  const pendingCount = activeEntries.filter(entry => normalizeEntryStatus(entry.status) === 'pending_review').length;

  return {
    nextAction,
    attention,
    progress,
    crew: buildCrew(input.profile, input.entries),
    recentActivity: buildRecentActivity(input),
    quickLinks: [
      {
        id: 'missions',
        label: 'Missions',
        description: mission ? `Continue ${mission.title}` : 'Choose a deck and draw a field assignment.',
        href: '/missions',
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
