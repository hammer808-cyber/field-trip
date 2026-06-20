import { doc, updateDoc, arrayUnion, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DISCOVERY_STICKERS } from '../constants/discoveryStickers';
import { UserProfile } from './userService';
import { STICKER_DEFINITIONS, hasEarnedSticker } from './stickerService';

// Phase 1 Allowed Keys
const PHASE_1_KEYS = [
  'camera_ready',
  'first_field_note',
  'starter_signal_1',
  'starter_signal_3_complete',
  'dex_discovered',
  'first_vote',
  'proof_returned',
  'receipt_approved',
  'crew_unlocked',
  'memories_unlocked',
  'dex_open',
  'sticker_collection_view',
  'locked_sticker_tap',
  'mission_draw',
  'capture_start',
  'proof_pirate',
  'evidence_meter_bonus_seen'
];

interface DiscoveryGroup {
  id: string;
  name: string;
  stickerIds: string[];
  xpReward: number;
  completionCopy: string;
}

const DISCOVERY_GROUPS: DiscoveryGroup[] = [
  {
    id: 'dex-discovery',
    name: 'Dex Discovery',
    stickerIds: ['first-flip', 'binder-goblin', 'empty-slot-syndrome'],
    xpReward: 50,
    completionCopy: 'Dex Discovery Set complete! +50 XP'
  },
  {
    id: 'mission-basics',
    name: 'Mission Basics',
    stickerIds: ['first-draw', 'camera-ready', 'proof-pirate', 'signal-fragment-missing'],
    xpReward: 50,
    completionCopy: 'Mission Basics Set complete! +50 XP'
  }
];

/**
 * AWARDS a Discovery Sticker if not already unlocked.
 * @param uid User ID
 * @param profile Current User Profile (for checking existing unlocks)
 * @param discoveryKey The unique key for the discovery event
 * @param sourcePage Optional source page for history tracking
 * @returns The unlocked sticker object if a new one was unlocked, null otherwise.
 */
export async function awardDiscoverySticker(
  uid: string,
  profile: UserProfile | null,
  discoveryKey: string,
  sourcePage: string = 'unknown'
) {
  if (!uid || !profile) return null;

  // 0. Phased Rollout Check: Only permit Phase 1 keys
  if (!PHASE_1_KEYS.includes(discoveryKey)) {
    // Hidden for now
    return null;
  }

  // 1. Find the sticker associated with this discovery key
  const sticker = DISCOVERY_STICKERS.find(s => s.discoveryKey === discoveryKey);
  if (!sticker) {
    console.warn(`[DiscoveryService] No sticker found for key: ${discoveryKey}`);
    return null;
  }

  // 2. Check if already unlocked (check both discoveryEvents map and unlockedRewards.stickers)
  const isAlreadyUnlocked = 
    (profile.discoveryEvents?.[discoveryKey]) || 
    (profile.unlockedRewards?.stickers?.includes(sticker.id)) ||
    hasEarnedSticker(profile, sticker.id);

  if (isAlreadyUnlocked) return null;

  // 3. Update Firestore
  const userRef = doc(db, 'users', uid);
  
  try {
    const historyEntry = {
      stickerId: sticker.id,
      discoveryKey,
      unlockedAt: new Date().toISOString(), 
      sourcePage
    };
    const structuredSticker = STICKER_DEFINITIONS[sticker.id]
      ? {
          ...STICKER_DEFINITIONS[sticker.id],
          earnedAt: historyEntry.unlockedAt,
          source: sourcePage,
          seen: false
        }
      : {
          id: sticker.id,
          title: sticker.name,
          description: sticker.description,
          trigger: discoveryKey,
          earnedAt: historyEntry.unlockedAt,
          source: sourcePage,
          seen: false
        };

    // Use dot notation to avoid wiping the whole unlockedRewards object
    const updates: any = {
      [`discoveryEvents.${discoveryKey}`]: true,
      'stickerUnlockHistory': arrayUnion(historyEntry),
      'earnedStickers': arrayUnion(structuredSticker),
      updatedAt: serverTimestamp()
    };

    // Ensure we don't overwrite unlockedRewards if it exists, just append to stickers
    updates['unlockedRewards.stickers'] = arrayUnion(sticker.id);

    // 4. Check for Group Completions
    // We simulate the post-update state locally
    const existingStickers = profile.unlockedRewards?.stickers || [];
    const currentStickers = [...existingStickers];
    if (!currentStickers.includes(sticker.id)) {
      currentStickers.push(sticker.id);
    }
    
    const newlyCompletedGroups: DiscoveryGroup[] = [];

    for (const group of DISCOVERY_GROUPS) {
      const alreadyCompleted = profile.completedDiscoveryGroups?.includes(group.id);
      if (alreadyCompleted) continue;

      const hasAllStickers = group.stickerIds.every(id => currentStickers.includes(id));
      if (hasAllStickers) {
        newlyCompletedGroups.push(group);
      }
    }

    if (newlyCompletedGroups.length > 0) {
      let totalXp = 0;
      for (const group of newlyCompletedGroups) {
        updates['completedDiscoveryGroups'] = arrayUnion(group.id);
        totalXp += group.xpReward;
        console.log(`[DiscoveryService] Group Complete: ${group.name}`);
      }
      updates['points'] = increment(totalXp);
    }

    await updateDoc(userRef, updates);

    console.log(`[STICKER_UNLOCKED] Sticker: ${sticker.id}, Key: ${discoveryKey}, User: ${uid}`);
    
    return {
      sticker,
      completedGroups: newlyCompletedGroups
    };
  } catch (error) {
    console.error(`[DiscoveryService] Failed to unlock sticker ${sticker.id}:`, error);
    return null;
  }
}
