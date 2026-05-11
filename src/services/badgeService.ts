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
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Badge, BADGE_DEFINITIONS, UserBadgeProgress } from '../types/badges';
import { getUserRank, getTotalUserCount, updateProfile } from './userService';

const PROGRESS_COLLECTION = 'badgeProgress';
const FRAGMENT_COLLECTION = 'badgeFragments';

/**
 * Evaluates an entry and awards fragments for relevant badges.
 */
export async function evaluateEntryForBadges(userId: string, entry: any) {
  const badgeIdsToAward: string[] = [];
  const now = new Date();
  const hour = now.getHours();

  // 1. Night Owl: Complete challenges after 8 PM (20:00)
  if (hour >= 20 || hour <= 4) {
    badgeIdsToAward.push('night-owl');
  }

  // 2. Food Goblin: Food categories
  const category = entry.category?.toLowerCase() || '';
  if (category.includes('food') || category.includes('drink') || category.includes('gastronomy')) {
    badgeIdsToAward.push('food-goblin');
  }

  // 3. Main Character Sighting: Solo/Creative or specific tags
  if (category.includes('solo') || category.includes('creative') || entry.challengeTitle?.toLowerCase().includes('portrait')) {
    badgeIdsToAward.push('main-character');
  }

  // 4. Soft Criminal: Playful/Social
  if (category.includes('social') || category.includes('playful')) {
    badgeIdsToAward.push('soft-criminal');
  }

  // 5. Grass Contact: Outdoor/Discovery
  if (category.includes('discovery') || category.includes('outdoor')) {
    badgeIdsToAward.push('grass-contact');
  }

  // 6. Receipt Gremlin: Receipt requirements
  if (entry.hasReceipt || entry.note?.toLowerCase().includes('receipt') || entry.note?.toLowerCase().includes('menu')) {
    badgeIdsToAward.push('receipt-gremlin');
  }

  // 7. Crew Witness: Crew entries
  if (entry.crewId) {
    badgeIdsToAward.push('crew-witness');
  }

  // 8. Chaos Archivist: Long field notes
  if (entry.note && entry.note.length > 50) {
    badgeIdsToAward.push('chaos-archivist');
  }

  // 9. Detour Magnet: Detour category
  if (category === 'detour') {
    badgeIdsToAward.push('detour-magnet');
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
}

export function subscribeToUserBadgeProgress(userId: string, callback: (progress: UserBadgeProgress[]) => void) {
  const q = query(
    collection(db, PROGRESS_COLLECTION),
    where('userId', '==', userId)
  );

  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => doc.data() as UserBadgeProgress));
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, PROGRESS_COLLECTION);
  });
}
