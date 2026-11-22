import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  runTransaction
} from 'firebase/firestore';
import {
  getStickerById as getRegistryStickerById,
  type StickerAwardTrigger
} from '../data/stickers';
import { db } from '../lib/firebase';
import { authenticatedFetch } from '../lib/api';
import { UserProfile } from './userService';
import {
  isStickerAwardTrigger,
  validateUserId,
  type StickerUnlockResult
} from '../logic/stickerAwardCore';

// Option B (Nov 20, 2026): the pure award definitions moved to
// `src/logic/stickerAwardCore.ts` (importable from the server without
// the client Firestore module). Re-exported here so existing importers
// do not churn; new code imports from the core directly.
export {
  getStickerArchetypeForFieldType,
  isStickerAwardTrigger,
  normalizeSource,
  STICKER_EVENT_AWARD_IDS,
  type StickerUnlockResult,
  type StickerUnlockStatus
} from '../logic/stickerAwardCore';

export interface StickerRecord {
  id: string;
  title: string;
  description: string;
  trigger: string;
  earnedAt: any;
  source: string;
  seen: boolean;
  metadata?: Record<string, any>;
}

export function hasEarnedSticker(profile: UserProfile | null | undefined, stickerId: string): boolean {
  if (!profile) return false;
  if (profile.unlockedRewards?.stickers?.includes(stickerId)) return true;
  if ((profile as any).earnedStickers?.some((record: StickerRecord) => record.id === stickerId)) return true;
  return false;
}

export interface UserUnlockedSticker {
  stickerId: string;
  unlockedAt: Timestamp;
  source: string;
  trigger: StickerAwardTrigger;
  seen: boolean;
  equipped: boolean;
}

export const MAX_FEATURED_STICKERS = 3;

export function canSetStickerFeatured(
  featuredCount: number,
  isCurrentlyFeatured: boolean,
  shouldFeature: boolean
): boolean {
  if (!shouldFeature || isCurrentlyFeatured) return true;
  return featuredCount < MAX_FEATURED_STICKERS;
}


type StickerAwardOperationResult = StickerUnlockResult | StickerUnlockResult[];

export function runStickerAwardNonBlocking(
  context: string,
  operation: () => Promise<StickerAwardOperationResult>
): void {
  void Promise.resolve()
    .then(operation)
    .then(result => {
      const failures = (Array.isArray(result) ? result : [result])
        .filter(item => item.status === 'failed' || item.status === 'invalid_sticker');
      if (failures.length > 0) {
        console.error(`[StickerService] ${context} award did not complete`, failures);
      }
    })
    .catch(error => {
      reportStickerServiceError(context, error);
    });
}


function getStickerCollection(userId: string) {
  return collection(db, 'users', userId, 'stickers');
}

function getStickerDocument(userId: string, stickerId: string) {
  return doc(db, 'users', userId, 'stickers', stickerId);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function reportStickerServiceError(
  operation: string,
  error: unknown,
  context: { userId?: string; stickerId?: string } = {}
): string {
  const message = getErrorMessage(error);
  console.error(`[StickerService] ${operation} failed`, {
    ...context,
    error: message
  });
  return message;
}


function normalizeUnlockedSticker(
  documentId: string,
  data: Record<string, unknown>
): UserUnlockedSticker | null {
  if (!getRegistryStickerById(documentId)) {
    console.warn(`[StickerService] Ignoring unknown sticker record: ${documentId}`);
    return null;
  }

  if (
    data.stickerId !== documentId ||
    !(data.unlockedAt instanceof Timestamp) ||
    typeof data.source !== 'string' ||
    !isStickerAwardTrigger(data.trigger) ||
    typeof data.seen !== 'boolean' ||
    typeof data.equipped !== 'boolean'
  ) {
    console.warn(`[StickerService] Ignoring malformed sticker record: ${documentId}`);
    return null;
  }

  return {
    stickerId: documentId,
    unlockedAt: data.unlockedAt,
    source: data.source,
    trigger: data.trigger,
    seen: data.seen,
    equipped: data.equipped
  };
}

export async function getUserUnlockedStickers(userId: string): Promise<UserUnlockedSticker[]> {
  if (!validateUserId(userId)) {
    reportStickerServiceError('getUserUnlockedStickers', 'A valid userId is required.');
    return [];
  }

  try {
    const snapshot = await getDocs(getStickerCollection(userId));
    return snapshot.docs
      .map(stickerDoc => normalizeUnlockedSticker(stickerDoc.id, stickerDoc.data()))
      .filter((sticker): sticker is UserUnlockedSticker => sticker !== null)
      .sort((left, right) => right.unlockedAt.toMillis() - left.unlockedAt.toMillis());
  } catch (error) {
    reportStickerServiceError('getUserUnlockedStickers', error, { userId });
    return [];
  }
}

export async function hasUserUnlockedSticker(userId: string, stickerId: string): Promise<boolean> {
  if (!validateUserId(userId)) {
    reportStickerServiceError('hasUserUnlockedSticker', 'A valid userId is required.', {
      stickerId
    });
    return false;
  }
  if (!getRegistryStickerById(stickerId)) {
    reportStickerServiceError('hasUserUnlockedSticker', `Unknown stickerId: ${stickerId}`, {
      userId,
      stickerId
    });
    return false;
  }

  try {
    const snapshot = await getDoc(getStickerDocument(userId, stickerId));
    return snapshot.exists();
  } catch (error) {
    reportStickerServiceError('hasUserUnlockedSticker', error, { userId, stickerId });
    return false;
  }
}

export async function markStickerSeen(userId: string, stickerId: string): Promise<boolean> {
  if (!validateUserId(userId)) {
    reportStickerServiceError('markStickerSeen', 'A valid userId is required.', { stickerId });
    return false;
  }
  if (!getRegistryStickerById(stickerId)) {
    reportStickerServiceError('markStickerSeen', `Unknown stickerId: ${stickerId}`, {
      userId,
      stickerId
    });
    return false;
  }

  try {
    return await runTransaction(db, async transaction => {
      const stickerRef = getStickerDocument(userId, stickerId);
      const snapshot = await transaction.get(stickerRef);
      if (!snapshot.exists()) return false;
      if (snapshot.data().seen !== true) {
        transaction.update(stickerRef, { seen: true });
      }
      return true;
    });
  } catch (error) {
    reportStickerServiceError('markStickerSeen', error, { userId, stickerId });
    return false;
  }
}

export async function setFeaturedSticker(
  userId: string,
  stickerId: string,
  featured = true
): Promise<boolean> {
  if (!validateUserId(userId)) {
    reportStickerServiceError('setFeaturedSticker', 'A valid userId is required.', { stickerId });
    return false;
  }
  if (!getRegistryStickerById(stickerId)) {
    reportStickerServiceError('setFeaturedSticker', `Unknown stickerId: ${stickerId}`, {
      userId,
      stickerId
    });
    return false;
  }

  try {
    const collectionSnapshot = await getDocs(getStickerCollection(userId));
    const stickerRefs = collectionSnapshot.docs.map(stickerDoc => stickerDoc.ref);
    const targetRef = getStickerDocument(userId, stickerId);
    if (!stickerRefs.some(stickerRef => stickerRef.path === targetRef.path)) return false;

    return await runTransaction(db, async transaction => {
      const snapshots = [];
      for (const stickerRef of stickerRefs) {
        snapshots.push(await transaction.get(stickerRef));
      }

      const targetSnapshot = snapshots.find(snapshot => snapshot.id === stickerId);
      if (!targetSnapshot?.exists()) return false;

      const targetData = targetSnapshot.data();
      const isCurrentlyFeatured = targetData?.equipped === true;
      const featuredCount = snapshots.filter(snapshot => snapshot.data()?.equipped === true).length;
      if (!canSetStickerFeatured(featuredCount, isCurrentlyFeatured, featured)) return false;

      if (isCurrentlyFeatured !== featured) {
        transaction.update(targetSnapshot.ref, { equipped: featured });
      }
      return true;
    });
  } catch (error) {
    reportStickerServiceError('setFeaturedSticker', error, { userId, stickerId });
    return false;
  }
}

export async function getFeaturedStickers(userId: string): Promise<UserUnlockedSticker[]> {
  const stickers = await getUserUnlockedStickers(userId);
  return stickers
    .filter(sticker => sticker.equipped)
    .slice(0, MAX_FEATURED_STICKERS);
}

/**
 * Option B (Nov 20, 2026): the client-side award path. The evaluator no
 * longer writes sticker docs from the phone — this posts the event to
 * `POST /api/stickers/evaluate` and the server verifies the event,
 * runs the evaluator, and writes the sticker doc + ledger row +
 * notification in one transaction. Returns the evaluator's results
 * (same shape as the old client unlock), or [] when the request fails —
 * call sites stay fire-and-forget via `runStickerAwardNonBlocking`,
 * which logs any `failed` / `invalid_sticker` results.
 *
 * Verification (server-side, see `src/server/stickerEvaluate.ts`):
 * entry-based events must name a real, approved entry owned by the
 * awardee; starter packs must match the profile's archetype; crew
 * events must name a real crew the player belongs to; level-ups must
 * name a real level-up event. A player asking for someone else's award
 * needs admin.
 */
export interface StickerEvaluationRequest {
  eventType: StickerAwardTrigger;
  /** Entry doc id, for entry-based events (approval, submission, note, photo, late-night). */
  entryId?: string;
  /** Source string recorded on the unlock (1–200 chars). */
  source: string;
  /** The submitting device's local hour (0–23), for `late_night_submission`. */
  localHour?: number;
  /** Quiz archetype, for `starter_pack`. */
  archetype?: string;
  /** Crew doc id, for `crew_created` / `crew_joined` / `crew_survived_week`. */
  crewId?: string;
  /** Level-up event doc id, for `level_up`. */
  eventId?: string;
  /** Vote season/week, for `weekly_vote_cast`. */
  seasonId?: string;
  weekNumber?: number;
}

export async function requestStickerEvaluation(
  input: StickerEvaluationRequest
): Promise<StickerUnlockResult[]> {
  try {
    const response = await authenticatedFetch('/api/stickers/evaluate', {
      method: 'POST',
      body: JSON.stringify(input)
    });
    if (!response.ok) {
      console.error('[StickerService] Sticker evaluation request failed', {
        status: response.status,
        eventType: input.eventType
      });
      return [];
    }
    const data = await response.json();
    return Array.isArray(data?.awarded) ? (data.awarded as StickerUnlockResult[]) : [];
  } catch (error) {
    console.error('[StickerService] Sticker evaluation request failed', {
      eventType: input.eventType,
      error: error instanceof Error ? error.message : String(error)
    });
    return [];
  }
}

/**
 * Batch evaluate (Nov 21, 2026 — first-time-user blocker fix): post
 * several events in ONE `POST /api/stickers/evaluate` call and get the
 * combined awards back. One submit used to fire up to five separate
 * evaluate calls (first_submission, field_note_added, photo_proof_added,
 * late_night_submission, first_approval); three missions back-to-back
 * was ~15 evaluate calls alone against the shared rate-limit bucket.
 * The server evaluates each event in order with the same verification
 * as a single call, so the awards are identical — only the request
 * count changes. Same failure contract as the single call: any failure
 * returns [] and the caller stays fire-and-forget.
 */
export async function requestStickerEvaluations(
  events: StickerEvaluationRequest[]
): Promise<StickerUnlockResult[]> {
  if (events.length === 0) return [];
  try {
    const response = await authenticatedFetch('/api/stickers/evaluate', {
      method: 'POST',
      body: JSON.stringify({ events })
    });
    if (!response.ok) {
      console.error('[StickerService] Sticker batch evaluation request failed', {
        status: response.status,
        eventCount: events.length
      });
      return [];
    }
    const data = await response.json();
    return Array.isArray(data?.awarded) ? (data.awarded as StickerUnlockResult[]) : [];
  } catch (error) {
    console.error('[StickerService] Sticker batch evaluation request failed', {
      eventCount: events.length,
      error: error instanceof Error ? error.message : String(error)
    });
    return [];
  }
}
