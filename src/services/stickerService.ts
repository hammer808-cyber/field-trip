import {
  Timestamp,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import {
  getStickerById as getRegistryStickerById,
  getStarterPackForArchetype as getRegistryStarterPackForArchetype,
  type StickerArchetype,
  type StickerAwardTrigger
} from '../data/stickers';
import { db } from '../lib/firebase';
import { UserProfile } from './userService';

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

export const STICKER_DEFINITIONS: Record<string, Omit<StickerRecord, 'earnedAt' | 'source' | 'seen' | 'metadata'>> = {
  camera_ready: {
    id: 'camera_ready',
    title: 'Camera Ready',
    description: 'Opened the viewfinder or submitted your first photo proof.',
    trigger: 'camera_ready'
  },
  first_field_note: {
    id: 'first_field_note',
    title: 'First Field Note',
    description: 'Submitted your first written field note.',
    trigger: 'first_field_note'
  },
  starter_signal_1: {
    id: 'starter_signal_1',
    title: 'Starter Signal 1',
    description: 'Your first Starter Signal was approved.',
    trigger: 'starter_signal_1'
  },
  starter_signal_3_complete: {
    id: 'starter_signal_3_complete',
    title: 'Starter Signals Complete',
    description: 'All 3 Starter Signals are approved.',
    trigger: 'starter_signal_3_complete'
  },
  dex_discovered: {
    id: 'dex_discovered',
    title: 'Dex Discovered',
    description: 'Opened the Dex for the first time.',
    trigger: 'dex_discovered'
  },
  first_vote: {
    id: 'first_vote',
    title: 'First Vote',
    description: 'Cast your first successful vote.',
    trigger: 'first_vote'
  },
  proof_returned: {
    id: 'proof_returned',
    title: 'Proof Returned',
    description: 'A proof was returned for more evidence.',
    trigger: 'proof_returned'
  },
  receipt_approved: {
    id: 'receipt_approved',
    title: 'Receipt Approved',
    description: 'Received your first approved submission.',
    trigger: 'receipt_approved'
  },
  crew_unlocked: {
    id: 'crew_unlocked',
    title: 'Crew Unlocked',
    description: 'Crew access unlocked after completing Starter Signals.',
    trigger: 'crew_unlocked'
  },
  memories_unlocked: {
    id: 'memories_unlocked',
    title: 'Memories Unlocked',
    description: 'Crew Memories unlocked after completing Starter Signals.',
    trigger: 'memories_unlocked'
  }
};

export const STICKER_TRIGGER_TO_ID: Record<string, string> = Object.fromEntries(
  Object.values(STICKER_DEFINITIONS).map(def => [def.trigger, def.id])
);

export function getStickerDefinition(id: string) {
  return STICKER_DEFINITIONS[id];
}

export function hasEarnedSticker(profile: UserProfile | null | undefined, stickerId: string): boolean {
  if (!profile) return false;
  if (profile.unlockedRewards?.stickers?.includes(stickerId)) return true;
  if ((profile as any).earnedStickers?.some((record: StickerRecord) => record.id === stickerId)) return true;
  return false;
}

export async function awardSticker(params: {
  uid: string;
  profile: UserProfile | null;
  stickerId: string;
  source: string;
  metadata?: Record<string, any>;
}): Promise<StickerRecord | null> {
  const { uid, profile, stickerId, source, metadata } = params;
  if (!uid || !profile || hasEarnedSticker(profile, stickerId)) return null;

  const definition = getStickerDefinition(stickerId);
  if (!definition) return null;

  const userRef = doc(db, 'users', uid);
  const latestSnap = await getDoc(userRef);
  const latestProfile = latestSnap.exists() ? latestSnap.data() as UserProfile : profile;
  if (hasEarnedSticker(latestProfile, stickerId)) return null;

  const record: StickerRecord = {
    ...definition,
    earnedAt: new Date().toISOString(),
    source,
    seen: false,
    ...(metadata ? { metadata } : {})
  };

  await updateDoc(userRef, {
    'unlockedRewards.stickers': arrayUnion(stickerId),
    earnedStickers: arrayUnion(record),
    stickerUnlockHistory: arrayUnion({
      stickerId,
      discoveryKey: definition.trigger,
      unlockedAt: record.earnedAt,
      sourcePage: source
    }),
    updatedAt: serverTimestamp()
  });

  return record;
}

export async function awardStickerForTrigger(params: {
  uid: string;
  profile: UserProfile | null;
  trigger: string;
  source: string;
  metadata?: Record<string, any>;
}) {
  const stickerId = STICKER_TRIGGER_TO_ID[params.trigger];
  if (!stickerId) return null;
  return awardSticker({ ...params, stickerId });
}

export async function markEarnedStickersSeen(uid: string, profile: UserProfile | null) {
  if (!uid || !profile || !(profile as any).earnedStickers?.length) return;
  const earnedStickers = ((profile as any).earnedStickers as StickerRecord[]).map(record => ({
    ...record,
    seen: true
  }));
  await updateDoc(doc(db, 'users', uid), {
    earnedStickers,
    updatedAt: serverTimestamp()
  });
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

const STICKER_AWARD_TRIGGERS: readonly StickerAwardTrigger[] = [
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
  'admin_grant'
];

function isStickerAwardTrigger(value: unknown): value is StickerAwardTrigger {
  return typeof value === 'string' && STICKER_AWARD_TRIGGERS.includes(value as StickerAwardTrigger);
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

function validateUserId(userId: string): boolean {
  return typeof userId === 'string' && userId.trim().length > 0;
}

function normalizeSource(source: string): string | null {
  if (typeof source !== 'string') return null;
  const normalized = source.trim();
  return normalized.length > 0 && normalized.length <= 200 ? normalized : null;
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

export async function unlockStickerForUser(
  userId: string,
  stickerId: string,
  source: string,
  trigger: StickerAwardTrigger
): Promise<StickerUnlockResult> {
  const results = await unlockStickersForUser(userId, [stickerId], source, trigger);
  return results[0] ?? {
    stickerId,
    status: 'failed',
    unlocked: false,
    error: 'Sticker unlock returned no result.'
  };
}

export async function unlockStickersForUser(
  userId: string,
  stickerIds: string[],
  source: string,
  trigger: StickerAwardTrigger
): Promise<StickerUnlockResult[]> {
  const uniqueStickerIds = [...new Set(stickerIds.filter(Boolean))];
  if (uniqueStickerIds.length === 0) return [];

  const normalizedSource = normalizeSource(source);
  if (!validateUserId(userId) || !normalizedSource || !isStickerAwardTrigger(trigger)) {
    const error = !validateUserId(userId)
      ? 'A valid userId is required.'
      : !normalizedSource
        ? 'Source must be between 1 and 200 characters.'
        : `Unknown sticker trigger: ${String(trigger)}`;
    reportStickerServiceError('unlockStickersForUser', error, { userId });
    return uniqueStickerIds.map(stickerId => ({
      stickerId,
      status: 'failed',
      unlocked: false,
      error
    }));
  }

  const invalidResults: StickerUnlockResult[] = [];
  const validStickerIds = uniqueStickerIds.filter(stickerId => {
    if (getRegistryStickerById(stickerId)) return true;
    const error = `Unknown stickerId: ${stickerId}`;
    reportStickerServiceError('unlockStickersForUser', error, { userId, stickerId });
    invalidResults.push({
      stickerId,
      status: 'invalid_sticker',
      unlocked: false,
      error
    });
    return false;
  });

  if (validStickerIds.length === 0) return invalidResults;

  try {
    const transactionResults = await runTransaction(db, async transaction => {
      const stickerRefs = validStickerIds.map(stickerId => getStickerDocument(userId, stickerId));
      const snapshots = [];
      for (const stickerRef of stickerRefs) {
        snapshots.push(await transaction.get(stickerRef));
      }

      return snapshots.map((snapshot, index): StickerUnlockResult => {
        const stickerId = validStickerIds[index];
        if (snapshot.exists()) {
          return {
            stickerId,
            status: 'already_unlocked',
            unlocked: false
          };
        }

        transaction.set(stickerRefs[index], {
          stickerId,
          unlockedAt: serverTimestamp(),
          source: normalizedSource,
          trigger,
          seen: false,
          equipped: false
        });

        return {
          stickerId,
          status: 'unlocked',
          unlocked: true
        };
      });
    });

    const resultsById = new Map(
      [...transactionResults, ...invalidResults].map(result => [result.stickerId, result])
    );
    return uniqueStickerIds.map(stickerId => resultsById.get(stickerId) ?? ({
      stickerId,
      status: 'failed',
      unlocked: false,
      error: 'Sticker unlock result was not recorded.'
    } satisfies StickerUnlockResult));
  } catch (error) {
    const message = reportStickerServiceError('unlockStickersForUser', error, { userId });
    const failedResults = validStickerIds.map(stickerId => ({
      stickerId,
      status: 'failed' as const,
      unlocked: false,
      error: message
    }));
    const resultsById = new Map(
      [...failedResults, ...invalidResults].map(result => [result.stickerId, result])
    );
    return uniqueStickerIds.map(stickerId => resultsById.get(stickerId) ?? ({
      stickerId,
      status: 'failed',
      unlocked: false,
      error: message
    } satisfies StickerUnlockResult));
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

export async function unlockStarterPackForArchetype(
  userId: string,
  archetype: StickerArchetype
): Promise<StickerUnlockResult[]> {
  try {
    const starterPack = getRegistryStarterPackForArchetype(archetype);
    return await unlockStickersForUser(
      userId,
      starterPack.map(sticker => sticker.id),
      `starter_pack:${archetype}`,
      'starter_pack'
    );
  } catch (error) {
    const message = reportStickerServiceError('unlockStarterPackForArchetype', error, { userId });
    return [{
      stickerId: `starter_pack:${archetype}`,
      status: 'failed',
      unlocked: false,
      error: message
    }];
  }
}
