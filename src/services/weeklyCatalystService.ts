import { doc, getDoc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Entry } from '../types/game';
import {
  DEFAULT_WEEKLY_CATALYSTS,
  getDefaultWeeklyCatalystForWeek,
  type WeeklyCatalyst,
} from '../logic/weeklyCatalyst';

export { DEFAULT_WEEKLY_CATALYSTS, getDefaultWeeklyCatalystForWeek } from '../logic/weeklyCatalyst';
export type { WeeklyCatalyst } from '../logic/weeklyCatalyst';

/**
 * Returns the catalyst for a specific week inside a given season.
 * Firestore is authoritative when configured. Missing configuration uses a
 * deterministic in-memory fallback for the requested week and never writes
 * from the client.
 */
export async function getCatalystForWeek(seasonId: string, weekNumber: number): Promise<WeeklyCatalyst | null> {
  const docId = `${seasonId}_${weekNumber}`;
  try {
    const docRef = doc(db, 'weeklyCatalysts', docId);
    const snap = await getDoc(docRef);
    
    if (snap.exists()) {
      return { id: snap.id, ...snap.data(), source: 'firestore' } as WeeklyCatalyst;
    }
    return getDefaultWeeklyCatalystForWeek(seasonId, weekNumber);
  } catch (error) {
    console.warn(`[WeeklyCatalyst] ${docId} unavailable; using the week ${weekNumber} fallback:`, error);
    return getDefaultWeeklyCatalystForWeek(seasonId, weekNumber);
  }
}

/**
 * Returns the currently active weekly catalyst.
 * Queries Firestore first or grabs the fallback based on timestamp / current week.
 */
export async function getCurrentWeeklyCatalyst(seasonId: string, weekNumber: number): Promise<WeeklyCatalyst | null> {
  return getCatalystForWeek(seasonId, weekNumber);
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
    return { qualified: false, reason: 'No weekly bonus is awake right now.' };
  }

  const rules = catalyst.eligibilityRules;
  if (!rules) {
    return { qualified: true, reason: 'Trevor accepts this tiny masterpiece.' };
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
        reason: `This happened outside Trevor's bonus window of ${rules.startTime} - ${rules.endTime}.`
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
        reason: `Wrong vibe for this bonus. Trevor was looking for: '${rules.requiresTag}'.`
      };
    }
  }

  return { qualified: true, reason: `Weekly bonus unlocked. Trevor is clapping. (${catalyst.shortLabel})` };
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
