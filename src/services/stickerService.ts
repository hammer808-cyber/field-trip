import { arrayUnion, doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
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
