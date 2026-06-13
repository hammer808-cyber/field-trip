import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  query, 
  where, 
  limit, 
  orderBy, 
  updateDoc, 
  arrayUnion, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Entry } from '../types/game';

export interface WeeklyCatalyst {
  id: string; // formatted as "seasonId_weekNumber"
  seasonId: string;
  weekNumber: number;
  title: string;
  shortLabel: string;
  description: string;
  startsAt: any;
  endsAt: any;
  status: 'scheduled' | 'active' | 'expired';
  multiplier: number;
  maxBonusPoints?: number;
  catalystType: string;
  eligibilityRules: {
    requiresPhoto?: boolean;
    requiresFieldNoteLength?: number;
    requiresTimeWindow?: boolean;
    startTime?: string; // e.g. "12:00"
    endTime?: string; // e.g. "15:00"
    requiresTag?: string; // e.g. "nature" or "urban"
  };
  stickerRewardId?: string; // optional sticker award
  badgeRewardId?: string; // optional badge award
  isActive: boolean;
  createdAt: any;
  updatedAt: any;
}

// Canonical static/fallback catalysts corresponding to week numbers
export const DEFAULT_WEEKLY_CATALYSTS: Record<number, Omit<WeeklyCatalyst, 'startsAt' | 'endsAt' | 'createdAt' | 'updatedAt'>> = {
  1: {
    id: 'default_1',
    seasonId: 'dev-season-2026',
    weekNumber: 1,
    title: 'Solar Wind Calibration',
    shortLabel: 'Solar Wind',
    description: 'Afternoon solar alignment. Submissions containing a photo proof and detailed field notes (at least 15 characters) uploaded between 12:00 PM and 3:00 PM (12:00 – 15:00) local time earn a 1.5x Catalyst Boost.',
    status: 'active',
    multiplier: 1.5,
    catalystType: 'solar-wind',
    eligibilityRules: {
      requiresPhoto: true,
      requiresFieldNoteLength: 15,
      requiresTimeWindow: true,
      startTime: '12:00',
      endTime: '15:00'
    },
    stickerRewardId: 'solar-wind',
    isActive: true
  },
  2: {
    id: 'default_2',
    seasonId: 'dev-season-2026',
    weekNumber: 2,
    title: 'Flora Finder Overdrive',
    shortLabel: 'Flora Finder',
    description: 'Overgrowth signal boost. Submissions capturing flora, weeds, or botanical elements (requires nature-related tags) with notes of at least 15 characters secure a 1.5x Catalyst Boost.',
    status: 'active',
    multiplier: 1.5,
    catalystType: 'flora-finder',
    eligibilityRules: {
      requiresPhoto: true,
      requiresFieldNoteLength: 15,
      requiresTag: 'nature'
    },
    stickerRewardId: 'flora-finder',
    isActive: true
  },
  3: {
    id: 'default_3',
    seasonId: 'dev-season-2026',
    weekNumber: 3,
    title: 'Early Bird Synchronization',
    shortLabel: 'Early Bird',
    description: 'Dawn-patrol signal uplink. High-integrity photo uploads with notes (minimum 20 characters) submitted during morning hours (6:00 AM – 10:00 AM) unlock a 2.0x Catalyst Boost.',
    status: 'active',
    multiplier: 2.0,
    catalystType: 'early-bird',
    eligibilityRules: {
      requiresPhoto: true,
      requiresFieldNoteLength: 20,
      requiresTimeWindow: true,
      startTime: '06:00',
      endTime: '10:00'
    },
    stickerRewardId: 'early-bird',
    isActive: true
  },
  4: {
    id: 'default_4',
    seasonId: 'dev-season-2026',
    weekNumber: 4,
    title: 'Deep Field Notes Expansion',
    shortLabel: 'Deep Field',
    description: 'Complete high-integrity field logs documentation. Photo submissions with comprehensive notes detailed to at least 45 characters earn a 1.8x Catalyst Boost.',
    status: 'active',
    multiplier: 1.8,
    catalystType: 'deep-field',
    eligibilityRules: {
      requiresPhoto: true,
      requiresFieldNoteLength: 45
    },
    stickerRewardId: 'deep-field',
    isActive: true
  },
  5: {
    id: 'default_5',
    seasonId: 'dev-season-2026',
    weekNumber: 5,
    title: 'Dusk Surveillance Sync',
    shortLabel: 'Dusk Patrol',
    description: 'Sunset signal capture. Submissions containing a photo proof and active notes of at least 15 characters submitted between 6:00 PM and 9:00 PM (18:00 – 21:00) lock a 1.5x Catalyst Boost.',
    status: 'active',
    multiplier: 1.5,
    catalystType: 'dusk-watch',
    eligibilityRules: {
      requiresPhoto: true,
      requiresFieldNoteLength: 15,
      requiresTimeWindow: true,
      startTime: '18:00',
      endTime: '21:00'
    },
    stickerRewardId: 'dusk-patrol',
    isActive: true
  }
};

/**
 * Returns the catalyst for a specific week inside a given season.
 * If the catalyst isn't already created/seeded in Firestore, we auto-create/seed
 * the corresponding DEFAULT weekly catalyst to ensure game stability.
 */
export async function getCatalystForWeek(seasonId: string, weekNumber: number): Promise<WeeklyCatalyst | null> {
  const docId = `${seasonId}_${weekNumber}`;
  try {
    const docRef = doc(db, 'weeklyCatalysts', docId);
    const snap = await getDoc(docRef);
    
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as WeeklyCatalyst;
    }

    // Auto-seed from default configuration if it exists for this week number
    const baseDefault = DEFAULT_WEEKLY_CATALYSTS[weekNumber];
    if (baseDefault) {
      const seededCatalyst: WeeklyCatalyst = {
        ...baseDefault,
        id: docId,
        seasonId,
        weekNumber,
        startsAt: serverTimestamp(),
        endsAt: serverTimestamp(), // Dummy endsAt, or set to null
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Attempt to save to Firestore so it is persistently available
      await setDoc(docRef, seededCatalyst);
      return seededCatalyst;
    }

    // fallback when week has no default catalyst
    return null;
  } catch (error) {
    console.warn('[WeeklyCatalyst] getCatalystForWeek error; falling back to memory config:', error);
    const baseDefault = DEFAULT_WEEKLY_CATALYSTS[weekNumber] || DEFAULT_WEEKLY_CATALYSTS[1];
    if (baseDefault) {
      return {
        ...baseDefault,
        id: docId,
        seasonId,
        weekNumber,
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date()
      } as WeeklyCatalyst;
    }
    return null;
  }
}

/**
 * Returns the currently active weekly catalyst.
 * Queries Firestore first or grabs the fallback based on timestamp / current week.
 */
export async function getCurrentWeeklyCatalyst(seasonId: string, now?: Date): Promise<WeeklyCatalyst | null> {
  const checkDate = now || new Date();
  try {
    // Attempt to query the active state
    const q = query(
      collection(db, 'weeklyCatalysts'),
      where('seasonId', '==', seasonId),
      where('isActive', '==', true),
      limit(1)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docData = snap.docs[0];
      return { id: docData.id, ...docData.data() } as WeeklyCatalyst;
    }
    
    // No active, default to week 1 fallbacks or derive week from season if activeSeason is known
    return getCatalystForWeek(seasonId, 1);
  } catch (error) {
    console.warn('[WeeklyCatalyst] getCurrentWeeklyCatalyst error, falling back to week 1:', error);
    return getCatalystForWeek(seasonId, 1);
  }
}

/**
 * Core validation engine evaluating whether an entry draft satisfies the weekly catalyst goals.
 */
export function evaluateProofForCatalyst(
  entryDraft: {
    proofImage?: string;
    imageUrl?: string;
    photoUrl?: string;
    fieldNote?: string;
    note?: string;
    submittedAt?: any;
    latitude?: number | null;
    longitude?: number | null;
    tags?: string[];
    [key: string]: any;
  },
  catalyst: WeeklyCatalyst,
  userContext?: {
    challengeTags?: string[];
    challengeTitle?: string;
    challengeDescription?: string;
    [key: string]: any;
  }
): { qualified: boolean; reason: string } {
  if (!catalyst || !catalyst.isActive) {
    return { qualified: false, reason: 'No active Weekly Catalyst Alignment detected.' };
  }

  const rules = catalyst.eligibilityRules;
  if (!rules) {
    return { qualified: true, reason: 'Catalyst specifications satisfied.' };
  }

  // 1. Photo Check
  if (rules.requiresPhoto) {
    const hasPhoto = !!(entryDraft.proofImage || entryDraft.imageUrl || entryDraft.photoUrl);
    if (!hasPhoto) {
      return { qualified: false, reason: 'An active visual photo proof transmission is required.' };
    }
  }

  // 2. Note word / character length check
  if (rules.requiresFieldNoteLength !== undefined) {
    const cleanNote = (entryDraft.fieldNote || entryDraft.note || '').trim();
    if (cleanNote.length < rules.requiresFieldNoteLength) {
      return { 
        qualified: false, 
        reason: `Field log details are too brief. Note requires at least ${rules.requiresFieldNoteLength} characters (current: ${cleanNote.length}).` 
      };
    }
  }

  // 3. Time window check
  if (rules.requiresTimeWindow && rules.startTime && rules.endTime) {
    // Parse target local hour
    const evaluationDate = (() => {
      if (entryDraft.submittedAt && entryDraft.submittedAt.toDate) {
        return entryDraft.submittedAt.toDate();
      }
      return new Date();
    })();

    const curHour = evaluationDate.getHours();
    const curMin = evaluationDate.getMinutes();
    const currentMinutes = curHour * 60 + curMin;

    const [startH, startM] = rules.startTime.split(':').map(Number);
    const [endH, endM] = rules.endTime.split(':').map(Number);
    
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    const isWithin = startMinutes <= endMinutes
      ? (currentMinutes >= startMinutes && currentMinutes <= endMinutes)
      : (currentMinutes >= startMinutes || currentMinutes <= endMinutes);

    if (!isWithin) {
      return { 
        qualified: false, 
        reason: `Submission occurred outside the target Catalyst time window of ${rules.startTime} – ${rules.endTime}.` 
      };
    }
  }

  // 4. Tag alignments
  if (rules.requiresTag) {
    const requiredTagLower = rules.requiresTag.toLowerCase();
    
    // Check tags from challenge tags or entry
    const searchTags: string[] = [
      ...(entryDraft.tags || []),
      ...(userContext?.challengeTags || []),
      ...(userContext?.challenge?.tags || [])
    ].map(t => String(t).toLowerCase());

    const challengeText = [
      userContext?.challengeTitle || '',
      userContext?.challengeDescription || '',
      catalyst.title,
      catalyst.description
    ].map(t => t.toLowerCase());

    const hasTagMatched = searchTags.some(t => t.includes(requiredTagLower)) ||
                          challengeText.some(t => t.includes(requiredTagLower));

    if (!hasTagMatched) {
      return { 
        qualified: false, 
        reason: `Mission is of the wrong tactical type. Catalyst requires theme match: '${rules.requiresTag}'.` 
      };
    }
  }

  return { qualified: true, reason: `Weekly Catalyst Boost alignment verified! (${catalyst.shortLabel})` };
}

/**
 * Returns the final calculated multiplier.
 */
export function getCatalystMultiplier(
  entryDraft: any,
  catalyst: WeeklyCatalyst,
  userContext?: any
): number {
  const result = evaluateProofForCatalyst(entryDraft, catalyst, userContext);
  return result.qualified ? catalyst.multiplier : 1.0;
}

/**
 * Returns cosmetic reward representations.
 */
export function getCatalystRewardPreview(catalyst: WeeklyCatalyst): { stickers: string[]; badges: string[] } {
  return {
    stickers: catalyst.stickerRewardId ? [catalyst.stickerRewardId] : [],
    badges: catalyst.badgeRewardId ? [catalyst.badgeRewardId] : []
  };
}

/**
 * Awards catalyst-specific rewards (stickers, flags) directly to user profile.
 */
export async function awardCatalystRewardsIfEligible(
  entry: Entry,
  catalyst: WeeklyCatalyst,
  userId: string
): Promise<boolean> {
  if (!userId || !catalyst || !entry) return false;

  const evaluation = evaluateProofForCatalyst(entry, catalyst, {
    challengeTags: (entry as any).tags || [],
    challengeTitle: entry.challengeTitle || entry.tripTitle || ''
  });

  if (!evaluation.qualified) return false;

  try {
    const userRef = doc(db, 'users', userId);
    const updates: any = {};

    let awardedAny = false;
    if (catalyst.stickerRewardId) {
      updates.unlockedStickerIds = arrayUnion(catalyst.stickerRewardId);
      awardedAny = true;
    }
    if (catalyst.badgeRewardId) {
      updates.unlockedBadgeIds = arrayUnion(catalyst.badgeRewardId);
      awardedAny = true;
    }

    if (awardedAny) {
      updates.updatedAt = serverTimestamp();
      await updateDoc(userRef, updates);
      console.log(`[WeeklyCatalyst] Successfully awarded catalyst rewards to user ${userId} for ${catalyst.title}`);
      return true;
    }
  } catch (err) {
    console.warn('[WeeklyCatalyst] awardCatalystRewardsIfEligible failed:', err);
  }

  return false;
}
