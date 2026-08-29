/**
 * Player guidance snapshot — DERIVED STATE ONLY.
 *
 * This module answers "what should this player do right now?" It does not own
 * or mutate gameplay truth: mission approval, proof status, Starter completion,
 * scoring, XP, rewards, deck completion, unlock eligibility, voting eligibility,
 * admin review, or challenge definitions.
 *
 * Canonical inputs (read-only):
 * - canonicalProgress / getChallengeStatus / getStarterProgress / canAccessFeature
 * - live entries (proof lifecycle)
 * - drawnMissionCards + activeTrip identity (resume targets)
 * - onboarding flags already stored on the profile
 * - voting window + ballot state supplied by existing helpers
 *
 * Player lifecycle status MUST come from entries / canonical progress / drawn-card
 * lifecycle. Challenge-definition publication fields such as `status: "approved"`
 * are NOT player completion.
 *
 * PRIORITY TABLE (highest first)
 * ------------------------------
 * 1000 COMPLETE_ONBOARDING        incomplete legal / type / field kit
 *  950 REPAIR_PROOF               needs more proof (stuck / recovery)
 *  940 RETRY_REJECTED_PROOF       rejected proof (stuck / recovery)
 *  900 RESUME_ACTIVE_MISSION      drawn or in-progress mission, including Starter
 *  850 DRAW_STARTER_MISSION       Starter not started, draw available
 *  840 DRAW_NEXT_STARTER          Starter in progress, another Starter still available
 *  800 WAITING_FOR_STARTER_REVIEW all required Starter proofs submitted, none left to draw
 *  750 STARTER_COMPLETE           Starter just complete; no active mission
 *  700 DRAW_MISSION               continue playing (pending proof + draws still available)
 *  600 VOTE_AVAILABLE             starter unlocked + voting window open + not yet voted
 *  100 NO_URGENT_ACTION           idle / optional draw-next when nothing else is urgent
 *
 * Safety and recovery always outrank optional discovery (vote, Loteria, Dex).
 * An active drawn mission outranks vote-available.
 * Pending review of a normal proof does not outrank drawing another available mission.
 */

import {
  canAccessFeature,
  getChallengeStatus,
  getStarterProgress,
  type CanonicalProgressSnapshot,
} from '../services/canonicalProgress';
import type { TripCard } from '../types/challenges';
import type { DrawnMissionCard, Entry } from '../types/game';
import { isArchivedEntry, normalizeEntryStatus } from './entryLogic';

export const PLAYER_PROOF_STATUSES = [
  'pending_review',
  'needs_more_proof',
  'rejected',
  'approved',
] as const;

export type PlayerProofStatus = (typeof PLAYER_PROOF_STATUSES)[number];

export const PLAYER_ACTIVE_DRAW_STATUSES = [
  'drawn',
  'active',
  'saved_for_later',
  'in-progress',
] as const;

export type PlayerGuidanceState =
  | 'COMPLETE_ONBOARDING'
  | 'DRAW_STARTER_MISSION'
  | 'RESUME_ACTIVE_MISSION'
  | 'REPAIR_PROOF'
  | 'RETRY_REJECTED_PROOF'
  | 'DRAW_NEXT_STARTER'
  | 'WAITING_FOR_STARTER_REVIEW'
  | 'STARTER_COMPLETE'
  | 'DRAW_MISSION'
  | 'VOTE_AVAILABLE'
  | 'NO_URGENT_ACTION';

export type PlayerGuidanceUrgency = 'critical' | 'high' | 'normal' | 'low';

export type PlayerGuidanceNavTarget = 'missions' | 'voting' | 'dex' | 'basecamp' | null;

export type PlayerGuidanceActionIntent = 'navigate' | 'retry-proof';

export interface PlayerGuidanceAction {
  label: string;
  destination: string;
  intent: PlayerGuidanceActionIntent;
  missionId?: string;
}

export interface PlayerMissionLifecycle {
  id: string;
  title: string;
  description: string;
  deckId: string | null;
  deckName: string;
  status: 'drawn' | 'active' | PlayerProofStatus;
  statusLabel: string;
  rewardXp: number | null;
}

export interface PlayerGuidanceSnapshot {
  state: PlayerGuidanceState;
  priority: number;
  title: string;
  shortMessage: string;
  flavorMessage: string;
  primaryActionLabel: string;
  primaryActionDestination: string;
  primaryActionIntent: PlayerGuidanceActionIntent;
  relevantMissionId: string | null;
  navigationTarget: PlayerGuidanceNavTarget;
  urgency: PlayerGuidanceUrgency;
  autoOpenTrevor: boolean;
  secondaryAction: PlayerGuidanceAction | null;
  mission: PlayerMissionLifecycle | null;
  deckId: string;
}

export interface ResolvePlayerGuidanceInput {
  canonicalProgress: CanonicalProgressSnapshot;
  entries: readonly Entry[];
  activeTrip: TripCard | null;
  activeSubmissionStatus?: string | null;
  drawnMissionCards: readonly DrawnMissionCard[];
  trips: readonly TripCard[];
  legalComplete?: boolean;
  fieldClassificationComplete?: boolean;
  hasSeenFieldTypeResults?: boolean;
  hasCompletedFieldKitOnboarding?: boolean;
  isHeatwaveDeckUnlocked?: boolean;
  voteAvailable?: boolean;
  hasUnseenStarterUnlock?: boolean;
}

export const GUIDANCE_PRIORITY: Record<PlayerGuidanceState, number> = {
  COMPLETE_ONBOARDING: 1000,
  REPAIR_PROOF: 950,
  RETRY_REJECTED_PROOF: 940,
  RESUME_ACTIVE_MISSION: 900,
  DRAW_STARTER_MISSION: 850,
  DRAW_NEXT_STARTER: 840,
  WAITING_FOR_STARTER_REVIEW: 800,
  STARTER_COMPLETE: 750,
  DRAW_MISSION: 700,
  VOTE_AVAILABLE: 600,
  NO_URGENT_ACTION: 100,
};

const PLAYER_PROOF_STATUS_SET = new Set<string>(PLAYER_PROOF_STATUSES);
const PLAYER_ACTIVE_DRAW_STATUS_SET = new Set<string>(PLAYER_ACTIVE_DRAW_STATUSES);

const STATUS_LABELS: Record<PlayerMissionLifecycle['status'], string> = {
  drawn: 'Ready to start',
  active: 'Mission active',
  pending_review: 'Proof in review',
  needs_more_proof: 'More proof needed',
  rejected: 'Retry available',
  approved: 'Mission approved',
};

export function isPlayerProofStatus(value: string | null | undefined): value is PlayerProofStatus {
  return !!value && PLAYER_PROOF_STATUS_SET.has(value);
}

export function isPlayerActiveDrawStatus(value: string | null | undefined): boolean {
  return !!value && PLAYER_ACTIVE_DRAW_STATUS_SET.has(value);
}

/**
 * Challenge-definition `status` describes publication (draft / approved / active).
 * It is never player lifecycle. Do not pass trip.status through this helper.
 */
export function resolvePlayerMissionLifecycle(input: {
  canonicalProgress: CanonicalProgressSnapshot;
  activeTrip: TripCard | null;
  activeSubmissionStatus?: string | null;
  drawnMissionCards: readonly DrawnMissionCard[];
  trips: readonly TripCard[];
}): PlayerMissionLifecycle | null {
  const tripById = new Map(input.trips.map(trip => [trip.id.toLowerCase(), trip]));
  const drawnCard = input.drawnMissionCards.find(card => (
    card.isActive === true || isPlayerActiveDrawStatus(card.status)
  ));
  const drawnMissionId = drawnCard?.missionId || drawnCard?.challengeId || null;
  const trip = input.activeTrip
    || (drawnMissionId ? tripById.get(drawnMissionId.toLowerCase()) || null : null);
  const missionId = trip?.id || drawnMissionId;
  if (!missionId) return null;

  const canonicalStatus = getChallengeStatus(
    input.canonicalProgress,
    missionId,
    input.activeTrip?.id || drawnMissionId || null,
  );

  let status: PlayerMissionLifecycle['status'];
  if (isPlayerProofStatus(canonicalStatus)) {
    status = canonicalStatus;
  } else if (isPlayerProofStatus(input.activeSubmissionStatus)) {
    status = input.activeSubmissionStatus;
  } else if (isPlayerActiveDrawStatus(drawnCard?.status)) {
    status = drawnCard?.status === 'active' || drawnCard?.status === 'in-progress'
      ? 'active'
      : 'drawn';
  } else if (canonicalStatus === 'drawn' || input.activeTrip) {
    const drawStatus = drawnCard?.status;
    status = drawStatus === 'drawn' || drawStatus === 'saved_for_later'
      ? 'drawn'
      : 'active';
  } else {
    return null;
  }

  const deckId = trip?.deckId || drawnCard?.deckId || null;
  return {
    id: missionId,
    title: trip?.title || drawnCard?.missionTitle || 'Current mission',
    description: trip?.shortDescription || trip?.description || drawnCard?.missionSummary || 'Open the mission for the full field brief.',
    deckId,
    deckName: trip?.deckName || deckId || 'Fieldtrip deck',
    status,
    statusLabel: STATUS_LABELS[status],
    rewardXp: Number.isFinite(Number(trip?.baseXP || trip?.basePoints))
      ? Number(trip?.baseXP || trip?.basePoints)
      : null,
  };
}

function latestActionableProof(
  entries: readonly Entry[],
  status: 'needs_more_proof' | 'rejected',
): { entryId: string; missionId: string; title: string } | null {
  const matches = entries
    .filter(entry => !isArchivedEntry(entry) && normalizeEntryStatus(entry.status) === status)
    .sort((left, right) => proofTimestamp(right) - proofTimestamp(left));
  const latest = matches[0];
  if (!latest) return null;
  const missionId = String(latest.missionId || latest.challengeId || latest.tripId || '').trim();
  const entryId = latest.entryId || latest.id;
  if (!missionId || !entryId) return null;
  return {
    entryId,
    missionId,
    title: latest.missionTitle || latest.tripTitle || latest.challengeTitle || 'Field proof',
  };
}

function proofTimestamp(entry: Entry): number {
  const raw = entry.reviewedAt || entry.updatedAt || entry.submittedAt || entry.createdAt;
  if (!raw) return 0;
  if (typeof (raw as { toMillis?: () => number }).toMillis === 'function') {
    return (raw as { toMillis: () => number }).toMillis();
  }
  if (typeof (raw as { toDate?: () => Date }).toDate === 'function') {
    return (raw as { toDate: () => Date }).toDate().getTime();
  }
  const parsed = new Date(raw as string | number | Date).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function missionsStillAvailable(input: ResolvePlayerGuidanceInput): boolean {
  const starter = getStarterProgress(input.canonicalProgress);
  if (!starter.starterComplete) {
    return starter.submittedUniqueCount < starter.starterRequiredCount;
  }
  if (input.isHeatwaveDeckUnlocked) return true;
  return Object.values(input.canonicalProgress.deckProgressById).some(deck => deck.eligibleCount > 0);
}

function clampNavigationTarget(
  target: PlayerGuidanceNavTarget,
  snapshot: CanonicalProgressSnapshot,
): PlayerGuidanceNavTarget {
  if (target === 'voting' && !canAccessFeature(snapshot, 'voting')) return 'missions';
  if (target === 'dex' && !canAccessFeature(snapshot, 'memories')) return 'missions';
  return target;
}

function captureHref(missionId: string, extra: Record<string, string> = {}): string {
  const query = new URLSearchParams({ id: missionId, ...extra });
  return `/capture?${query.toString()}`;
}

function briefingHref(missionId: string): string {
  return `/mission-briefing?id=${encodeURIComponent(missionId)}`;
}

function present(
  state: PlayerGuidanceState,
  extras: {
    mission?: PlayerMissionLifecycle | null;
    repair?: { entryId: string; missionId: string; title: string } | null;
    starterLabel?: string;
    deckId?: string;
    secondary?: PlayerGuidanceAction | null;
    flavorMessage?: string;
    title?: string;
    shortMessage?: string;
    actionLabel?: string;
  } = {},
): Omit<PlayerGuidanceSnapshot, 'navigationTarget' | 'autoOpenTrevor'> & { navigationTarget: PlayerGuidanceNavTarget } {
  const mission = extras.mission || null;
  const repair = extras.repair || null;
  const missionTitle = repair?.title || mission?.title || 'this mission';
  const deckId = extras.deckId
    || mission?.deckId
    || (state === 'DRAW_STARTER_MISSION' || state === 'DRAW_NEXT_STARTER' || state === 'WAITING_FOR_STARTER_REVIEW'
      ? 'starter-signals'
      : 'heatwave-receipts');

  const copy = COPY[state];
  const primary = copy.primary(missionTitle, extras.starterLabel);
  const destination = copy.destination({
    mission,
    repair,
    deckId,
  });

  return {
    state,
    priority: GUIDANCE_PRIORITY[state],
    title: extras.title || primary.title,
    shortMessage: extras.shortMessage || primary.shortMessage,
    flavorMessage: extras.flavorMessage || primary.flavorMessage,
    primaryActionLabel: extras.actionLabel || primary.actionLabel,
    primaryActionDestination: destination.href,
    primaryActionIntent: destination.intent,
    relevantMissionId: repair?.missionId || mission?.id || null,
    navigationTarget: copy.navigationTarget,
    urgency: copy.urgency,
    secondaryAction: extras.secondary !== undefined ? extras.secondary : primary.secondary,
    mission,
    deckId,
  };
}

type CopyPresenter = {
  title: string;
  shortMessage: string;
  flavorMessage: string;
  actionLabel: string;
  secondary: PlayerGuidanceAction | null;
};

const COPY: Record<PlayerGuidanceState, {
  urgency: PlayerGuidanceUrgency;
  navigationTarget: PlayerGuidanceNavTarget;
  primary: (missionTitle: string, starterLabel?: string) => CopyPresenter;
  destination: (ctx: {
    mission: PlayerMissionLifecycle | null;
    repair: { entryId: string; missionId: string; title: string } | null;
    deckId: string;
  }) => { href: string; intent: PlayerGuidanceActionIntent; missionId?: string };
}> = {
  COMPLETE_ONBOARDING: {
    urgency: 'critical',
    navigationTarget: null,
    primary: () => ({
      title: 'Finish setup',
      shortMessage: 'A couple of quick steps and you can draw a mission.',
      flavorMessage: 'PAPERWORK FIRST. THEN THE WEIRD PART.',
      actionLabel: 'Continue Setup',
      secondary: null,
    }),
    destination: () => ({ href: '/classification', intent: 'navigate' }),
  },
  REPAIR_PROOF: {
    urgency: 'critical',
    navigationTarget: 'missions',
    primary: (missionTitle) => ({
      title: missionTitle,
      shortMessage: 'Add more proof',
      flavorMessage: 'BUREAU REQUESTED ANOTHER RECEIPT',
      actionLabel: 'Add More Proof',
      secondary: { label: 'View Proof Status', destination: '/profile?tab=logbook', intent: 'navigate' },
    }),
    destination: ({ repair, mission }) => {
      const missionId = repair?.missionId || mission?.id || '';
      const extra: Record<string, string> = { mode: 'addMoreProof' };
      if (repair?.entryId) extra.entryId = repair.entryId;
      return { href: captureHref(missionId, extra), intent: 'retry-proof', missionId };
    },
  },
  RETRY_REJECTED_PROOF: {
    urgency: 'critical',
    navigationTarget: 'missions',
    primary: (missionTitle) => ({
      title: missionTitle,
      shortMessage: 'Try this mission again',
      flavorMessage: 'THAT RECEIPT DID NOT HOLD. TRY A CLEANER TAKE.',
      actionLabel: 'Retry Mission',
      secondary: { label: 'View Proof Status', destination: '/profile?tab=logbook', intent: 'navigate' },
    }),
    destination: ({ repair, mission }) => {
      const missionId = repair?.missionId || mission?.id || '';
      const extra: Record<string, string> = { isRetry: 'true' };
      if (repair?.entryId) extra.originalEntryId = repair.entryId;
      return { href: captureHref(missionId, extra), intent: 'retry-proof', missionId };
    },
  },
  RESUME_ACTIVE_MISSION: {
    urgency: 'high',
    navigationTarget: 'missions',
    primary: (missionTitle) => ({
      title: missionTitle,
      shortMessage: `Keep going: ${missionTitle}`,
      flavorMessage: 'FIELD SIGNAL ACTIVE',
      actionLabel: `Resume ${missionTitle}`,
      secondary: null,
    }),
    destination: ({ mission }) => {
      const missionId = mission?.id || '';
      if (mission?.status === 'drawn') {
        return { href: briefingHref(missionId), intent: 'navigate', missionId };
      }
      return { href: captureHref(missionId), intent: 'navigate', missionId };
    },
  },
  DRAW_STARTER_MISSION: {
    urgency: 'high',
    navigationTarget: 'missions',
    primary: () => ({
      title: 'Draw your first mission',
      shortMessage: 'Starter Missions are ready.',
      flavorMessage: 'THREE SIGNALS. THEN THE MAP OPENS.',
      actionLabel: 'Draw a Mission',
      secondary: null,
    }),
    destination: () => ({ href: '/missions?pack=starter-signals', intent: 'navigate' }),
  },
  DRAW_NEXT_STARTER: {
    urgency: 'high',
    navigationTarget: 'missions',
    primary: (_missionTitle, starterLabel) => ({
      title: 'Draw next Starter mission',
      shortMessage: starterLabel ? `Starter ${starterLabel}. Draw the next one.` : 'Draw your next Starter mission.',
      flavorMessage: 'PENDING DOES NOT STOP THE NEXT SIGNAL.',
      actionLabel: 'Draw Next Mission',
      secondary: { label: 'View Proof Status', destination: '/profile?tab=logbook', intent: 'navigate' },
    }),
    destination: () => ({ href: '/missions?pack=starter-signals', intent: 'navigate' }),
  },
  WAITING_FOR_STARTER_REVIEW: {
    urgency: 'high',
    navigationTarget: 'missions',
    primary: () => ({
      title: 'Proofs are being reviewed',
      shortMessage: 'All three Starter proofs are in review.',
      flavorMessage: 'THE DESK HAS YOUR RECEIPTS. NO MORE DRAWS UNTIL THEY CLEAR.',
      actionLabel: 'View Proof Status',
      secondary: null,
    }),
    destination: () => ({ href: '/profile?tab=logbook', intent: 'navigate' }),
  },
  STARTER_COMPLETE: {
    urgency: 'normal',
    navigationTarget: 'missions',
    primary: () => ({
      title: 'Starter complete',
      shortMessage: 'Heatwave is open. Draw your next mission.',
      flavorMessage: 'CLEARANCE CONFIRMED. THE SUMMER DECK IS LIVE.',
      actionLabel: 'Draw a Mission',
      secondary: null,
    }),
    destination: () => ({ href: '/missions?pack=heatwave-receipts', intent: 'navigate' }),
  },
  DRAW_MISSION: {
    urgency: 'normal',
    navigationTarget: 'missions',
    primary: () => ({
      title: 'Draw another mission',
      shortMessage: 'Ready for another receipt.',
      flavorMessage: 'FIELD SIGNAL READY',
      actionLabel: 'Draw Another Mission',
      secondary: null,
    }),
    destination: ({ deckId }) => ({
      href: deckId === 'starter-signals' ? '/missions' : `/missions?pack=${encodeURIComponent(deckId)}`,
      intent: 'navigate',
    }),
  },
  VOTE_AVAILABLE: {
    urgency: 'low',
    navigationTarget: 'voting',
    primary: () => ({
      title: 'Your vote is ready',
      shortMessage: 'Weekly voting is open.',
      flavorMessage: 'THE BALLOT IS LIVE. THE RECEIPTS CANNOT JUDGE THEMSELVES.',
      actionLabel: 'Vote Now',
      secondary: { label: 'Draw a Mission', destination: '/missions', intent: 'navigate' },
    }),
    destination: () => ({ href: '/voting', intent: 'navigate' }),
  },
  NO_URGENT_ACTION: {
    urgency: 'low',
    navigationTarget: null,
    primary: () => ({
      title: 'You are clear',
      shortMessage: 'No urgent field action.',
      flavorMessage: 'SYSTEMS NOMINAL. GO TOUCH GRASS OR TOUCH THE BOARD.',
      actionLabel: 'Open Missions',
      secondary: null,
    }),
    destination: () => ({ href: '/missions', intent: 'navigate' }),
  },
};

export function shouldAutoOpenTrevor(state: PlayerGuidanceState): boolean {
  return state === 'REPAIR_PROOF'
    || state === 'RETRY_REJECTED_PROOF'
    || state === 'STARTER_COMPLETE';
}

export function resolvePlayerGuidance(input: ResolvePlayerGuidanceInput): PlayerGuidanceSnapshot {
  const starter = getStarterProgress(input.canonicalProgress);
  const mission = resolvePlayerMissionLifecycle(input);
  const repair = latestActionableProof(input.entries, 'needs_more_proof');
  const rejected = latestActionableProof(input.entries, 'rejected');
  const canDrawMore = missionsStillAvailable(input);

  const onboardingIncomplete = input.legalComplete === false
    || input.fieldClassificationComplete === false
    || input.hasSeenFieldTypeResults === false
    || input.hasCompletedFieldKitOnboarding === false;

  let presented: ReturnType<typeof present>;

  if (onboardingIncomplete) {
    const href = input.legalComplete === false
      ? '/'
      : input.fieldClassificationComplete === false
        ? '/classification'
        : input.hasSeenFieldTypeResults === false
          ? '/field-type'
          : '/missions';
    presented = present('COMPLETE_ONBOARDING');
    presented = { ...presented, primaryActionDestination: href };
  } else if (repair || mission?.status === 'needs_more_proof') {
    const target = repair || (mission ? { entryId: '', missionId: mission.id, title: mission.title } : null);
    presented = present('REPAIR_PROOF', { mission, repair: target, deckId: mission?.deckId || undefined });
  } else if (rejected || mission?.status === 'rejected') {
    const target = rejected || (mission ? { entryId: '', missionId: mission.id, title: mission.title } : null);
    presented = present('RETRY_REJECTED_PROOF', { mission, repair: target, deckId: mission?.deckId || undefined });
  } else if (mission && (mission.status === 'drawn' || mission.status === 'active')) {
    presented = present('RESUME_ACTIVE_MISSION', { mission, deckId: mission.deckId || undefined });
  } else if (!starter.starterComplete && starter.submittedUniqueCount === 0) {
    presented = present('DRAW_STARTER_MISSION', { mission, deckId: 'starter-signals' });
  } else if (!starter.starterComplete && starter.submittedUniqueCount < starter.starterRequiredCount) {
    presented = present('DRAW_NEXT_STARTER', {
      mission,
      starterLabel: `${starter.submittedUniqueCount}/${starter.starterRequiredCount}`,
      deckId: 'starter-signals',
      secondary: { label: 'View Proof Status', destination: '/profile?tab=logbook', intent: 'navigate' },
    });
  } else if (!starter.starterComplete) {
    presented = present('WAITING_FOR_STARTER_REVIEW', { mission, deckId: 'starter-signals' });
  } else if ((mission?.status === 'pending_review' || hasPendingProof(input.entries)) && canDrawMore) {
    presented = present('DRAW_MISSION', {
      mission,
      deckId: input.isHeatwaveDeckUnlocked ? 'heatwave-receipts' : mission?.deckId || 'heatwave-receipts',
      secondary: { label: 'View Proof Status', destination: '/profile?tab=logbook', intent: 'navigate' },
      flavorMessage: 'PENDING DOES NOT STOP YOU FROM DRAWING ANOTHER MISSION.',
    });
  } else if (starterJustComplete(input)) {
    presented = present('STARTER_COMPLETE', {
      mission,
      deckId: 'heatwave-receipts',
    });
  } else if (input.voteAvailable && canAccessFeature(input.canonicalProgress, 'voting')) {
    presented = present('VOTE_AVAILABLE', { mission });
  } else if (canDrawMore) {
    presented = present('DRAW_MISSION', {
      mission,
      deckId: input.isHeatwaveDeckUnlocked ? 'heatwave-receipts' : 'heatwave-receipts',
    });
  } else {
    presented = present('NO_URGENT_ACTION', { mission });
  }

  const navigationTarget = clampNavigationTarget(presented.navigationTarget, input.canonicalProgress);

  return {
    ...presented,
    navigationTarget,
    autoOpenTrevor: shouldAutoOpenTrevor(presented.state),
  };
}

function hasPendingProof(entries: readonly Entry[]): boolean {
  return entries.some(entry => !isArchivedEntry(entry) && normalizeEntryStatus(entry.status) === 'pending_review');
}

function starterJustComplete(input: ResolvePlayerGuidanceInput): boolean {
  return getStarterProgress(input.canonicalProgress).starterComplete
    && input.hasUnseenStarterUnlock === true
    && !input.activeTrip;
}
