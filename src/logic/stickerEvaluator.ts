/**
 * Stage 3 — client rule evaluator for canonical sticker awards.
 *
 * The old call sites awarded one hardcoded sticker per event
 * (`STICKER_EVENT_AWARD_IDS`), regardless of who the player is: a first
 * approval always awarded `captain_clipboard_checkmark_seal`, even to an
 * Elondra player, while `elondra_glam_pose` could never be earned. The
 * evaluator fixes that with one rule: for trigger T and player archetype A,
 * award the sticker(s) with `awardTrigger === T` and `archetype === A`,
 * falling back to the trigger's existing default when that archetype has no
 * variant — plus every cross-pack sticker with `awardTrigger === T` (no
 * archetype), which belongs to all players.
 *
 * Evaluation timing is unchanged: only after the trusted event, only for
 * triggers relevant to that event. The evaluator's only writer is the
 * existing `unlockStickersForUser` transaction — re-evaluation is safe
 * (it returns `already_unlocked`), but it is not the trigger path.
 *
 * The evaluator makes no Firestore reads of its own. Its inputs are the
 * triggering event payload (which carries the entry, if any), the
 * `CanonicalProgressSnapshot` the call site already has (AppContext builds
 * one), and the player's field type. Admin approval paths build the
 * snapshot from the player's profile doc — see
 * `evaluateAdminApprovalStickers` — because the server maintains the
 * profile's approval caches on every approval, so a profile-only snapshot
 * carries the counts and deck progress the bundle needs; the evaluator's
 * stale-by-one handling covers the triggering approval whether or not the
 * profile already includes it (the snapshot is built after the server
 * commit, so it usually does). Call sites that have no snapshot at all
 * pass none: event rules still evaluate, count/set rules are skipped for
 * that call — that is now only a degradation path, not the admin path.
 *
 * Not evaluated on the client: `starter_pack` (a grant at quiz time),
 * `weekly_winner` (server-side, see `src/server/canonicalStickerAwards.ts`),
 * `admin_grant` (Stage 4).
 *
 * Deck scoping (Texas Y'all pack, Nov 20, 2026): a sticker definition may
 * carry `deckId` (and, for one mission, `missionId`). Such a sticker only
 * matches when the triggering event's entry belongs to that deck (and
 * mission). The deck comes from the entry's own `deckId` when present,
 * else from resolving the entry's mission to its deck pack. No new
 * trigger values: deck packs reuse `first_approval`, `challenge_approved`
 * and `season_milestone`, deck-scoped. A sticker with no `deckId` is
 * deck-agnostic and follows the existing trigger + archetype logic.
 */

import {
  getStickerById,
  getStickersByTrigger,
  type StickerArchetype,
  type StickerAwardTrigger,
  type StickerDefinition
} from '../data/stickers';
import { getActiveDeckPacks, getDeckPackById, missionBelongsToPack } from '../data/deckPacks';
import { STARTER_SIGNAL_IDS } from './starterDeckState';
import {
  buildCanonicalProgress,
  canonicalizeId,
  getDeckProgress,
  type BuildCanonicalProgressInput,
  type CanonicalProgressSnapshot
} from '../services/canonicalProgress';
import {
  getStickerArchetypeForFieldType,
  STICKER_EVENT_AWARD_IDS,
  unlockStickersForUser,
  type StickerUnlockResult
} from '../services/stickerService';

/** The deck id of the starter pack. Season milestones ignore it. */
export const STARTER_DECK_ID = 'starter-signals';

/** `archetype_milestone`: 5th approved proof as that archetype (Stage 3, §4.2). */
export const ARCHETYPE_MILESTONE_THRESHOLD = 5;

/**
 * `mission_count_milestone` thresholds (Stage 3, §4.2). Repeat Offender
 * (FIRST OFFENSES, Nov 17, 2026) fires at 3 approved proofs; 5 and 10 are
 * reserved for later milestone stickers — re-evaluation at those counts
 * re-attempts the award and the unlock transaction dedupes it.
 */
export const MISSION_COUNT_MILESTONE_THRESHOLDS: readonly number[] = [3, 5, 10];

export type StickerRuleKind = 'event' | 'count' | 'set' | 'field' | 'window';

export interface StickerRule {
  kind: StickerRuleKind;
  /** Count-rule thresholds (exact match — see `evaluateCountRule`). */
  thresholds?: readonly number[];
  /**
   * Catch-up count rules fire at the threshold AND on every approval
   * after it (audit fix #2): a player already past the threshold when
   * the rule ships earns the sticker on their next approval instead of
   * never. The unlock transaction dedupes re-evaluation, so re-firing
   * is safe. Exact-match rules re-attempt only at their thresholds.
   */
  catchUp?: boolean;
}

/**
 * Rule table, keyed by trigger. `field` / `window` kinds have no rows yet:
 * their stickers arrive in Stage 6 (`location_verified`,
 * `chaos_modifier_applied`, `late_night_submission`, `new_destination`,
 * windowed Limited Edition), and Stage 6 adds both halves together.
 */
export const STICKER_RULES: Readonly<Record<StickerAwardTrigger, StickerRule>> = {
  starter_pack: { kind: 'event' },
  first_submission: { kind: 'event' },
  first_approval: { kind: 'event' },
  field_note_added: { kind: 'event' },
  photo_proof_added: { kind: 'event' },
  challenge_approved: { kind: 'event' },
  weekly_vote_cast: { kind: 'event' },
  weekly_winner: { kind: 'event' },
  crew_joined: { kind: 'event' },
  crew_created: { kind: 'event' },
  zine_page_added: { kind: 'event' },
  archetype_milestone: { kind: 'count', thresholds: [ARCHETYPE_MILESTONE_THRESHOLD], catchUp: true },
  season_milestone: { kind: 'set' },
  mission_count_milestone: { kind: 'count', thresholds: MISSION_COUNT_MILESTONE_THRESHOLDS },
  level_up: { kind: 'event' },
  /**
   * Earn-audit fix #3 (Nov 20, 2026): fires when an approval is a repair —
   * the mission was sent back for more proof and came back approved. The
   * admin call sites set `wasRepair` on the event (see
   * `wasMissionSentBackForMoreProof` in stickerService.ts); the bundle
   * below awards it alongside the rest of the approval bundle.
   */
  repair_approved: { kind: 'event' },
  admin_grant: { kind: 'event' }
};

/** Triggers whose award is a grant or server-side, never client-evaluated. */
const CLIENT_UNEVALUATED_TRIGGERS: ReadonlySet<StickerAwardTrigger> = new Set([
  'starter_pack',
  'weekly_winner',
  'admin_grant'
]);

/** Existing defaults from `STICKER_EVENT_AWARD_IDS`, keyed by trigger. */
const TRIGGER_DEFAULT_STICKER_IDS: Readonly<Partial<Record<StickerAwardTrigger, string>>> = {
  first_submission: STICKER_EVENT_AWARD_IDS.firstSubmission,
  first_approval: STICKER_EVENT_AWARD_IDS.firstApproval,
  field_note_added: STICKER_EVENT_AWARD_IDS.fieldNoteAdded,
  photo_proof_added: STICKER_EVENT_AWARD_IDS.photoProofAdded,
  weekly_vote_cast: STICKER_EVENT_AWARD_IDS.weeklyVoteCast,
  crew_created: STICKER_EVENT_AWARD_IDS.crewCreated,
  crew_joined: STICKER_EVENT_AWARD_IDS.crewJoined,
  zine_page_added: STICKER_EVENT_AWARD_IDS.zinePageAdded
};

export interface StickerEventEntryLike {
  missionId?: unknown;
  challengeId?: unknown;
  tripId?: unknown;
  id?: unknown;
  [key: string]: unknown;
}

export interface StickerEvent {
  /** The trigger this event fires. */
  type: StickerAwardTrigger;
  /** The entry the event is about, when the event has one. */
  entry?: StickerEventEntryLike | null;
  /**
   * True when this approval is a repair: the mission was sent back for
   * more proof and came back approved (earn-audit fix #3). Only the
   * admin approval paths set this; the bundle awards `repair_approved`
   * on it. Defaults to false.
   */
  wasRepair?: boolean;
  /** Source string recorded on the unlock (1–200 chars). */
  source: string;
}

export type StickerUnlockFn = (
  userId: string,
  stickerIds: string[],
  source: string,
  trigger: StickerAwardTrigger
) => Promise<StickerUnlockResult[]>;

export interface EvaluateStickerTriggersInput {
  event: StickerEvent;
  userId: string;
  /** Optional: without it, count/set rules are skipped for this call. */
  snapshot?: CanonicalProgressSnapshot | null;
  /** Player's field type (profile.fieldType, or the entry's fieldType). */
  fieldType?: string | null;
  /** Test seam — defaults to `unlockStickersForUser`. */
  unlock?: StickerUnlockFn;
}

/** Canonical mission id for an entry, or null when the entry has none. */
export function getEntryMissionId(entry: StickerEventEntryLike | null | undefined): string | null {
  if (!entry) return null;
  return canonicalizeId(entry.missionId ?? entry.challengeId ?? entry.tripId ?? entry.id);
}

/**
 * Deck id for an entry, or null when it cannot be determined. Prefers the
 * entry's own `deckId` (the admin paths pass the entry doc, which carries
 * it); otherwise resolves the entry's mission to its deck pack. Deck-scoped
 * stickers only match when this returns their deck — a deckless event
 * (no entry, or an entry with no deck and no known mission) never awards
 * them, same as the existing "no entry, no award" rule for
 * `challenge_approved`.
 */
export function getEntryDeckId(entry: StickerEventEntryLike | null | undefined): string | null {
  if (!entry) return null;
  const direct = canonicalizeId(entry.deckId);
  if (direct) return direct;
  const missionId = getEntryMissionId(entry);
  if (!missionId) return null;
  const pack = getActiveDeckPacks().find(candidate => missionBelongsToPack(missionId, candidate.packId));
  return pack ? pack.packId : null;
}

function isStarterMissionId(missionId: string | null): boolean {
  return !!missionId && (STARTER_SIGNAL_IDS as readonly string[]).includes(missionId);
}

/**
 * Archetype-match (§4.1): the sticker(s) for `trigger` matching the player's
 * archetype, else the trigger's existing default, else nothing. A trigger
 * with neither a variant for this archetype nor a default stays unwinnable
 * for that archetype (e.g. `challenge_approved` has no captainClipboard /
 * mallRat / bigfoot variant).
 *
 * Cross-pack stickers (no archetype — e.g. FIRST OFFENSES) belong to every
 * player, so they ride along with the archetype variant or the default
 * instead of being swallowed by the archetype match. A trigger whose only
 * stickers are cross-pack awards exactly those.
 *
 * Deck scoping (Texas Y'all pack, Nov 20, 2026): a sticker with a `deckId`
 * only matches when `eventDeckId` is that deck, and a sticker with a
 * `missionId` only when `eventMissionId` is that mission. A sticker with
 * no `deckId` is deck-agnostic. Omit both (or pass nulls) when the event
 * has no entry: deck-scoped stickers never match a deckless event.
 */
export function resolveEventStickers(
  trigger: StickerAwardTrigger,
  fieldArchetype: StickerArchetype | null,
  eventDeckId?: string | null,
  eventMissionId?: string | null
): StickerDefinition[] {
  const candidates = getStickersByTrigger(trigger);
  if (candidates.length === 0) return [];
  const eligible = candidates.filter(sticker => {
    if (!sticker.deckId) return true;
    if (!eventDeckId || eventDeckId !== sticker.deckId) return false;
    if (sticker.missionId && sticker.missionId !== eventMissionId) return false;
    return true;
  });
  const crossPack = eligible.filter(sticker => !sticker.archetype);
  if (fieldArchetype) {
    const matches = eligible.filter(sticker => sticker.archetype === fieldArchetype);
    if (matches.length > 0) return [...matches, ...crossPack];
  }
  const defaultId = TRIGGER_DEFAULT_STICKER_IDS[trigger];
  if (defaultId) {
    // The defensive getStickerById lookup only applies to deck-agnostic
    // defaults: a deck-scoped default that does not match this event
    // never falls back.
    const defaultSticker = getStickerById(defaultId);
    const fallback = eligible.find(sticker => sticker.id === defaultId)
      ?? (defaultSticker && !defaultSticker.deckId ? defaultSticker : undefined);
    return fallback ? [fallback, ...crossPack] : [...crossPack];
  }
  return [...crossPack];
}

/**
 * Approved-proof count at evaluation time. The snapshot is stale by one
 * entry (the triggering approval is not in it yet), so the triggering
 * approval counts when its mission is not already in the set.
 */
export function getEffectiveApprovedCount(
  snapshot: CanonicalProgressSnapshot,
  entryMissionId: string | null
): number {
  const approved = new Set(snapshot.approvedCompletedChallengeIds);
  if (entryMissionId) approved.add(entryMissionId);
  return approved.size;
}

/**
 * Count-rule evaluation. Exact-match rules fire only on the threshold
 * crossing — not on the 4th, not on the 6th. Re-evaluation at the
 * threshold is safe: the unlock transaction returns `already_unlocked`.
 *
 * Catch-up rules (`archetype_milestone`, audit fix #2) fire at the
 * threshold and on every approval after it, so a player already past
 * the threshold when the rule ships earns the sticker on their next
 * approval instead of never. `season_milestone` has the same shape — it
 * re-checks completion on every approval.
 */
export function evaluateCountRule(
  trigger: StickerAwardTrigger,
  approvedCount: number
): StickerDefinition[] {
  const rule = STICKER_RULES[trigger];
  if (!rule || rule.kind !== 'count' || !rule.thresholds) return [];
  const fires = rule.catchUp
    ? approvedCount >= Math.min(...rule.thresholds)
    : rule.thresholds.includes(approvedCount);
  if (!fires) return [];
  return getStickersByTrigger(trigger);
}

/**
 * Non-starter decks the player has completed at evaluation time. The
 * triggering approval counts toward its deck (same stale-snapshot reason as
 * the count rule). A deck completed before Stage 3 ships is caught on the
 * next approval — catch-up by re-evaluation, not backfill.
 */
export function getCompletedNonStarterDecks(
  snapshot: CanonicalProgressSnapshot,
  entryMissionId: string | null
): string[] {
  const completed: string[] = [];
  for (const pack of getActiveDeckPacks()) {
    if (pack.packId === STARTER_DECK_ID) continue;
    const progress = getDeckProgress(snapshot, pack.packId);
    if (progress.totalCards <= 0) continue;
    let approvedCount = progress.approvedCount;
    if (entryMissionId && !snapshot.approvedCompletedChallengeIds.has(entryMissionId)) {
      const missionIds = (getDeckPackById(pack.packId)?.missionIds ?? [])
        .map(id => canonicalizeId(id))
        .filter((id): id is string => id !== null);
      if (missionIds.includes(entryMissionId)) approvedCount += 1;
    }
    if (approvedCount === progress.totalCards) completed.push(pack.packId);
  }
  return completed;
}

interface PendingAward {
  trigger: StickerAwardTrigger;
  stickerIds: string[];
}

export async function evaluateStickerTriggers(
  input: EvaluateStickerTriggersInput
): Promise<StickerUnlockResult[]> {
  const { event, userId, snapshot } = input;
  const unlock = input.unlock ?? unlockStickersForUser;
  const fieldArchetype = getStickerArchetypeForFieldType(input.fieldType ?? null);
  const entryMissionId = getEntryMissionId(event.entry ?? null);
  const eventDeckId = getEntryDeckId(event.entry ?? null);
  const pending: PendingAward[] = [];

  const addAward = (trigger: StickerAwardTrigger, stickerIds: string[]) => {
    if (stickerIds.length > 0) pending.push({ trigger, stickerIds });
  };

  // 1. The event's own rule — unless this trigger is never client-evaluated.
  if (!CLIENT_UNEVALUATED_TRIGGERS.has(event.type)) {
    if (event.type === 'challenge_approved') {
      // A challenge approval only counts for a non-starter mission entry.
      // Without the entry in hand the claim cannot be verified: no award.
      if (entryMissionId && !isStarterMissionId(entryMissionId)) {
        addAward('challenge_approved', resolveEventStickers('challenge_approved', fieldArchetype, eventDeckId, entryMissionId).map(s => s.id));
      }
    } else {
      addAward(event.type, resolveEventStickers(event.type, fieldArchetype, eventDeckId, entryMissionId).map(s => s.id));
    }
  }

  // 2. Approval bundle: an approval also re-checks the challenge, count,
  // and set rules. Only `first_approval` events run the bundle.
  if (event.type === 'first_approval') {
    if (entryMissionId && !isStarterMissionId(entryMissionId)) {
      addAward('challenge_approved', resolveEventStickers('challenge_approved', fieldArchetype, eventDeckId, entryMissionId).map(s => s.id));
    }
    // Repair approval (earn-audit fix #3): the mission was sent back for
    // more proof and came back approved — Plot Twist. This needs no
    // snapshot, so it runs even when the profile read failed and the rest
    // of the bundle is skipped.
    if (event.wasRepair) {
      addAward('repair_approved', resolveEventStickers('repair_approved', fieldArchetype, eventDeckId, entryMissionId).map(s => s.id));
    }
    if (snapshot) {
      const approvedCount = getEffectiveApprovedCount(snapshot, entryMissionId);
      // Archetype milestone: the archetype's own milestone sticker, if one
      // exists (4 archetypes have none — accepted gap, Stage 6 fills it).
      // Without a known field type there is no variant to award.
      const milestoneStickers = fieldArchetype
        ? evaluateCountRule('archetype_milestone', approvedCount)
          .filter(sticker => sticker.archetype === fieldArchetype)
        : [];
      addAward('archetype_milestone', milestoneStickers.map(s => s.id));
      // Mission-count milestones: Repeat Offender at 3 approved proofs.
      // Re-evaluation at 5/10 re-attempts the award; the unlock
      // transaction dedupes it.
      addAward(
        'mission_count_milestone',
        evaluateCountRule('mission_count_milestone', approvedCount).map(s => s.id)
      );
      // Season milestone: completing any full non-starter deck awards the
      // deck-agnostic season stickers (seasonal art, not persona art).
      // Deck-scoped season stickers (Texas Gold) only fire when THEIR deck
      // is among the completed ones — completing SoCal Summer must not
      // award Texas Gold.
      const completedDecks = getCompletedNonStarterDecks(snapshot, entryMissionId);
      if (completedDecks.length > 0) {
        const seasonStickers = getStickersByTrigger('season_milestone').filter(
          sticker => !sticker.deckId || completedDecks.includes(sticker.deckId)
        );
        addAward('season_milestone', seasonStickers.map(s => s.id));
      }
    }
  }

  const results: StickerUnlockResult[] = [];
  for (const award of pending) {
    const awarded = await unlock(userId, award.stickerIds, event.source, award.trigger);
    results.push(...awarded);
  }
  return results;
}

export interface AdminApprovalEvaluationInput {
  userId: string;
  /** The approved entry, when the entry doc could be read. */
  entry?: StickerEventEntryLike | null;
  /** Source string recorded on the unlock (1–200 chars). */
  source: string;
  /** Player's field type (profile.fieldType, or the entry's fieldType). */
  fieldType?: string | null;
  /**
   * The player's profile doc data, when it could be read. The milestone
   * bundle needs a snapshot, and the profile is the snapshot's source: the
   * server maintains the profile's approval caches
   * (`approvedCompletedChallengeIds` / `completedChallengeIds`) on every
   * approval, so a profile-only snapshot carries the counts and deck
   * progress the bundle needs — no entry query required. Pass null when
   * the profile read failed or the doc is missing: the event rules still
   * evaluate, and the bundle is skipped for that call (the pre-fix
   * behavior, kept as a degradation path).
   */
  profile?: BuildCanonicalProgressInput['profile'] | null;
  /**
   * True when this approval is a repair: the mission was sent back for
   * more proof and came back approved (earn-audit fix #3, Plot Twist).
   * The admin call sites compute it from the proof-review history (see
   * `wasMissionSentBackForMoreProof` in stickerService.ts). Defaults to
   * false — a failed or skipped check simply never awards Plot Twist.
   */
  wasRepair?: boolean;
  /** Test seam — defaults to `unlockStickersForUser`. */
  unlock?: StickerUnlockFn;
}

/**
 * Admin-approval evaluation (Nov 19, 2026 — milestone bundle fix #1).
 *
 * The two admin review paths funnel through here. Before this, both
 * evaluated `first_approval` with no snapshot, so the milestone bundle
 * (archetype / mission-count / season) never ran on an admin approval —
 * and the only snapshot-carrying call site, AppContext's immediate-approval
 * branch, never runs because `submitTripEntry` always returns
 * `pending_review`. The 5 milestone stickers had no live award path.
 *
 * This builds the snapshot from the player's profile and runs the full
 * `first_approval` bundle, so a milestone crossed by this approval is
 * awarded on this approval. Exactly-once: one of the two review paths runs
 * per review click, and the unlock transaction dedupes re-evaluation
 * (`already_unlocked`).
 *
 * Audit fix #2 (Nov 20, 2026): `archetype_milestone` is now a catch-up
 * rule — it fires at 5 approved proofs and on every approval after it,
 * so a player already past 5 earns it on their next approval.
 * `mission_count_milestone` stays exact-match and re-attempts at each of
 * its thresholds (3, 5, 10).
 *
 * Earn-audit fix #3 (Nov 20, 2026): a repair approval — the mission was
 * sent back for more proof and came back approved — also awards
 * `repair_approved` (Plot Twist) via `input.wasRepair`. The repair check
 * needs no snapshot, so it runs even when the profile read failed.
 */
export async function evaluateAdminApprovalStickers(
  input: AdminApprovalEvaluationInput
): Promise<StickerUnlockResult[]> {
  const snapshot = input.profile
    ? buildCanonicalProgress({ userId: input.userId, profile: input.profile })
    : null;
  return evaluateStickerTriggers({
    event: {
      type: 'first_approval',
      entry: input.entry ?? null,
      wasRepair: input.wasRepair ?? false,
      source: input.source
    },
    userId: input.userId,
    snapshot,
    fieldType: input.fieldType ?? null,
    unlock: input.unlock
  });
}
