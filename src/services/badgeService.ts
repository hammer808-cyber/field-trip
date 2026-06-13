import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  addDoc, 
  query, 
  where, 
  serverTimestamp,
  increment,
  onSnapshot
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, logFirestoreError } from '../lib/firebase';
import { Badge, BADGE_DEFINITIONS, UserBadgeProgress } from '../types/badges';
import { getUserRank, getTotalUserCount, updateProfile } from './userService';
import { getServerDate } from './timeService';

const PROGRESS_COLLECTION = 'badgeProgress';
const FRAGMENT_COLLECTION = 'badgeFragments';

/**
 * Evaluates an entry and awards fragments for relevant badges.
 */
export async function evaluateEntryForBadges(userId: string, entry: any) {
  const badgeIdsToAward: string[] = [];
  const now = getServerDate();
  const hour = now.getHours();

  // 1. Night Owl
  if (hour >= 20 || hour <= 4) {
    badgeIdsToAward.push('night-owl');
  }

  // 2. Photo Veteran: 5 Photos (Logic handled by fragments, just trigger on photo proof)
  if (entry.proofImage) {
    badgeIdsToAward.push('photo-veteran');
  }

  // 3. Field Master: Field Challenges
  if (entry.challengeType === 'Field Challenge' || entry.type === 'Field Challenge') {
    badgeIdsToAward.push('field-master');
  }

  // 4. Gourmet Goblin: Taste Test
  if (entry.category?.toLowerCase().includes('taste') || entry.type === 'Taste Test') {
    badgeIdsToAward.push('gourmet-goblin');
  }

  // 5. First Mission
  badgeIdsToAward.push('first-mission');

  // 6. Chaos Bringer
  if (entry.chaosModifierApplied) {
    badgeIdsToAward.push('chaos-bringer');
  }

  // 7. Survivor Spirit
  if (entry.sabotageSurvived) {
    badgeIdsToAward.push('survivor-spirit');
  }

  // 8. Season Crown
  if (entry.challengeId === 'final-challenge' || entry.isFinalSeasonQuest) {
    badgeIdsToAward.push('season-crown');
  }

  // Existing categories
  const category = entry.category?.toLowerCase() || '';
  if (category.includes('social') || entry.type === 'Social Spark') {
    badgeIdsToAward.push('soft-criminal');
  }

  if (category.includes('discovery') || entry.type === 'Explore the Map') {
    badgeIdsToAward.push('grass-contact');
  }

  if (entry.crewId) {
    badgeIdsToAward.push('crew-witness');
  }

  // Award fragments for each identified badge
  for (const badgeId of badgeIdsToAward) {
    await awardBadgeFragment(userId, badgeId, entry.id || 'unknown');
  }
}

async function awardBadgeFragment(userId: string, badgeId: string, entryId: string) {
  const badge = BADGE_DEFINITIONS.find(b => b.id === badgeId);
  if (!badge) return;

  const progressId = `${userId}_${badgeId}`;
  const progressRef = doc(db, PROGRESS_COLLECTION, progressId);

  try {
    const progressDoc = await getDoc(progressRef);
    const currentProgress = progressDoc.exists() ? progressDoc.data() as UserBadgeProgress : null;

    if (currentProgress?.isUnlocked) return;

    const currentCount = currentProgress?.fragmentCount || 0;
    const newCount = currentCount + 1;
    const isUnlocked = newCount >= badge.requiredFragments;

    // Record the individual fragment
    await addDoc(collection(db, FRAGMENT_COLLECTION), {
      userId,
      badgeId,
      fragmentName: `${badge.title} Fragment #${newCount}`,
      earnedFromChallengeId: entryId,
      earnedAt: serverTimestamp()
    });

    // Update the aggregate progress
    await setDoc(progressRef, {
      userId,
      badgeId,
      fragmentCount: increment(1),
      isUnlocked,
      unlockedAt: isUnlocked ? serverTimestamp() : null,
      lastFragmentEarnedAt: serverTimestamp()
    }, { merge: true });

  } catch (error) {
    console.error(`Error awarding fragment for ${badgeId}:`, error);
  }
}

export async function checkRankBadges(userId: string, currentPoints: number, previousPoints: number, previousRank?: number) {
  try {
    if (currentPoints <= previousPoints) return;

    const currentRank = await getUserRank(currentPoints);
    const totalUsers = await getTotalUserCount();

    // Comeback Creature: From bottom half to top 3
    if (previousRank && previousRank > (totalUsers / 2) && currentRank <= 3) {
      await awardBadgeFragment(userId, 'comeback-creature', 'rank-jump');
    }

    // Update previous rank for next time
    if (currentRank !== previousRank) {
      await updateProfile(userId, { previousRank: currentRank });
    }
  } catch (err) {
    console.warn("[BadgeService] checkRankBadges failed:", err);
  }
}

export function subscribeToUserBadgeProgress(userId: string, callback: (progress: UserBadgeProgress[]) => void) {
  const q = query(
    collection(db, PROGRESS_COLLECTION),
    where('userId', '==', userId)
  );

  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => doc.data() as UserBadgeProgress));
  }, (error) => {
    logFirestoreError(error, OperationType.LIST, PROGRESS_COLLECTION);
  });
}
