/**
 * Sticker award core — pure, no Firebase.
 *
 * Option B (Nov 20, 2026): evaluator awards move server-side, so the
 * evaluator and the server endpoint both need these definitions without
 * pulling in the client Firestore module. Everything that used to live in
 * `src/services/stickerService.ts` as a pure helper lives here now;
 * stickerService re-exports the client-facing pieces so existing
 * importers do not churn. The runtime import closure of this module (and
 * of `stickerEvaluator.ts` / `canonicalProgress.ts`, which the server
 * imports) must stay free of `firebase/` — see the guard test in
 * `src/__tests__/serverStickerEvaluate.test.ts`.
 */

import {
  type StickerArchetype,
  type StickerAwardTrigger
} from '../data/stickers';
import { canonicalizeId } from '../services/canonicalProgress';

/** Maximum source-string length, in characters (1–200). */
export const MAX_STICKER_SOURCE_LENGTH = 200;

export type StickerUnlockStatus =
  | 'unlocked'
  | 'already_unlocked'
  | 'invalid_sticker'
  | 'failed';

export interface StickerUnlockResult {
  stickerId: string;
  status: StickerUnlockStatus;
  unlocked: boolean;
  error?: string;
}

/**
 * The unlock function the evaluator calls. On the client it used to be
 * `unlockStickersForUser` (a Firestore transaction); since Option B it
 * is the server unlock — the evaluator takes it as a REQUIRED parameter
 * and never imports a writer itself.
 */
export type StickerUnlockFn = (
  userId: string,
  stickerIds: string[],
  source: string,
  trigger: StickerAwardTrigger
) => Promise<StickerUnlockResult[]>;

export const STICKER_EVENT_AWARD_IDS = {
  firstSubmission: 'mall_rat_receipt_curl',
  firstApproval: 'captain_clipboard_checkmark_seal',
  fieldNoteAdded: 'captain_clipboard_pen_sparkle',
  photoProofAdded: 'mall_rat_food_court_tray',
  weeklyVoteCast: 'mascota_foam_finger',
  crewCreated: 'captain_clipboard_whistle_lanyard',
  crewJoined: 'bigfoot_peace_sign',
  zinePageAdded: 'captain_clipboard_flying_papers'
} as const;

const FIELD_TYPE_TO_STICKER_ARCHETYPE: Readonly<Record<string, StickerArchetype>> = {
  captainclipboard: 'captainClipboard',
  mallrat: 'mallRat',
  mascota: 'mascota',
  themascot: 'mascota',
  elondra: 'elondra',
  homecomingqueen: 'elondra',
  lostcamper: 'lostCamper',
  thegobbler: 'lostCamper',
  evidencegoblin: 'lostCamper',
  bigfoot: 'bigfoot',
  explorer: 'bigfoot'
};

export function getStickerArchetypeForFieldType(
  fieldType: string | null | undefined
): StickerArchetype | null {
  if (!fieldType) return null;
  const normalized = fieldType.trim().replace(/[\s_-]+/g, '').toLowerCase();
  return FIELD_TYPE_TO_STICKER_ARCHETYPE[normalized] ?? null;
}

export const STICKER_AWARD_TRIGGERS: readonly StickerAwardTrigger[] = [
  'starter_pack',
  'first_submission',
  'first_approval',
  'field_note_added',
  'photo_proof_added',
  'challenge_approved',
  'weekly_vote_cast',
  'weekly_winner',
  'crew_joined',
  'crew_created',
  'zine_page_added',
  'archetype_milestone',
  'season_milestone',
  'mission_count_milestone',
  'level_up',
  'repair_approved',
  'admin_grant',
  'first_draw',
  'location_verified',
  'late_night_submission',
  'desert_state_approval',
  'approval_streak',
  'crew_survived_week'
];

export function isStickerAwardTrigger(value: unknown): value is StickerAwardTrigger {
  return typeof value === 'string' && STICKER_AWARD_TRIGGERS.includes(value as StickerAwardTrigger);
}

export function validateUserId(userId: string): boolean {
  return typeof userId === 'string' && userId.trim().length > 0;
}

export function normalizeSource(source: string): string | null {
  if (typeof source !== 'string') return null;
  const normalized = source.trim();
  return normalized.length > 0 && normalized.length <= MAX_STICKER_SOURCE_LENGTH
    ? normalized
    : null;
}

/**
 * Pure check (earn-audit fix #3): is this proof-review doc a
 * needs-more-proof decision for this mission? Reviews carry the mission
 * under `challengeId` or `missionId` (either may hold it — see the admin
 * queue's `missionId: reviewData.missionId || reviewData.challengeId`).
 * Shared by the client repair check (now retired) and the server
 * `wasRepair` computation in `src/server/stickerEvaluate.ts`.
 */
export function isNeedsMoreReviewForMission(
  review: { status?: unknown; challengeId?: unknown; missionId?: unknown },
  missionId: string | null
): boolean {
  if (!missionId) return false;
  if (review?.status !== 'needs_more_proof') return false;
  return canonicalizeId(review.challengeId ?? review.missionId) === canonicalizeId(missionId);
}
