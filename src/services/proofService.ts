import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc,
  setDoc,
  getDoc,
  doc,
  serverTimestamp,
  Timestamp,
  limit,
  orderBy,
  increment,
  deleteField
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { logAdminAction } from './moderationService';
import { ProofRequirement, ProofReview, ProofStatus, ProofCheck, AIAnalysis } from '../types/proof';
import { analyzeSubmissionImage } from './geminiService';
import { guardedCall } from './guardedService';
import { getGlobalConfig } from './configService';
import { getServerDate } from './timeService';
import { MOCK_TRIPS } from '../constants';
import { Entry } from '../types/game';
import { calculateSubmissionPoints } from '../logic/scoringLogic';
import { applyFieldTypeModifier } from '../logic/challengeLogic';
import { awardPoints } from './scoringService';
import { addMemory } from './memoryService';

const REQUIREMENTS_COLLECTION = 'proofRequirements';
const REVIEWS_COLLECTION = 'proofReviews';
const ENTRIES_COLLECTION = 'entries';
const CHECKS_COLLECTION = 'proofChecks';

/**
 * Generate a SHA-256 hash of a string
 */
async function hashString(str: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generates a cache key based on the inputs for a proof check
 */
async function generateCacheKey(
  challengeId: string, 
  userId: string, 
  base64Image: string | undefined, 
  note: string, 
  level: string,
  requirement: ProofRequirement | null
): Promise<{ key: string; inputs: ProofCheck['inputs'] }> {
  const imageHash = base64Image ? await hashString(base64Image) : 'no-image';
  const reqVersion = requirement?.version || 'v1';
  const requirementsHash = await hashString(JSON.stringify(requirement?.objectKeywords || []) + "_" + reqVersion);
  
  const rawKey = `${challengeId}_${userId}_${imageHash}_${note}_${level}_${requirementsHash}`;
  const key = await hashString(rawKey);
  
  return {
    key,
    inputs: {
      imageHash,
      fieldNote: note,
      level,
      requirementsHash
    }
  };
}

/**
 * Checks if a user has exceeded their daily proof check quota.
 */
async function checkDailyProofQuota(userId: string): Promise<boolean> {
  const config = getGlobalConfig();
  const today = getServerDate();
  today.setHours(0, 0, 0, 0);

  const q = query(
    collection(db, REVIEWS_COLLECTION),
    where('userId', '==', userId),
    where('reviewedAt', '>=', today),
    limit(config.maxDailyProofChecksPerUser)
  );

  const snapshot = await getDocs(q);
  return snapshot.size >= config.maxDailyProofChecksPerUser;
}

export async function getProofRequirement(challengeId: string): Promise<ProofRequirement | null> {
  try {
    const q = query(
      collection(db, REQUIREMENTS_COLLECTION),
      where('challengeId', '==', challengeId),
      limit(1)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as ProofRequirement;
  } catch (error) {
    console.error('Error fetching proof requirement:', error);
    return null;
  }
}

export async function evaluateProof(
    userId: string, 
    challengeId: string, 
    challengeTitle: string,
    challengeInstructions: string,
    entryData: any, 
    base64Image?: string,
    options: { bypassCache?: boolean } = {}
): Promise<ProofReview> {
  const config = getGlobalConfig();
  
  if (!config.proofChecksEnabled) {
    throw new Error('PROOF_CHECKS_DISABLED: The Evidence Department is currently offline for maintenance.');
  }

  return guardedCall(`proof_${userId}`, async () => {
    // 1. Quota Enforcement
    const quotaExceeded = await checkDailyProofQuota(userId);
    if (quotaExceeded) {
      throw new Error(`DAILY_LIMIT: You have reached your limit of ${config.maxDailyProofChecksPerUser} proof checks for today.`);
    }

    const requirement = await getProofRequirement(challengeId);
    
    // 2. Cache Lookup
    const { key: cacheKey, inputs } = await generateCacheKey(
      challengeId, 
      userId, 
      base64Image, 
      entryData.fieldNote || (entryData as any).note || '', 
      entryData.selectedLevel || (entryData as any).level || 'Standard',
      requirement
    );

    if (!options.bypassCache) {
      try {
        const cacheDoc = await getDoc(doc(db, CHECKS_COLLECTION, cacheKey));
        if (cacheDoc.exists()) {
          const cachedData = cacheDoc.data() as ProofCheck;
          console.log('[PROOF_CHECK] Using cached result for key:', cacheKey);
          
          // Reconstruct ProofReview from cache
          const review: Omit<ProofReview, 'id'> = {
            entryId: entryData.id || 'pending',
            userId,
            challengeId,
            status: cachedData.status,
            confidenceScore: cachedData.confidenceScore,
            missingRequirements: cachedData.missingRequirements,
            reviewNotes: (cachedData.imageAnalysis?.reason || "Bureau review confirmed") + " (AUTHENTICATED FROM CACHE)",
            reviewedAt: getServerDate().toISOString()
          };

          return { id: 'cached_' + cacheKey, ...review } as ProofReview;
        }
      } catch (error) {
        console.warn('[PROOF_CHECK] Cache lookup failed, proceeding to AI:', error);
      }
    }

    const missingRequirements: string[] = [];
    let confidenceScore = 100;
    let status: ProofStatus = 'approved';
    let reviewNotes = 'Evidence processed. Proceed with archival.';
    let aiAnalysisResult: AIAnalysis | null = null;

    // 1. Basic Policy Checks
    if (requirement) {
      // Photo Check
      const photoCount = entryData.proofImage || base64Image ? 1 : 0;
      if (photoCount < (requirement.minimumPhotoCount || 1)) {
        missingRequirements.push('Minimum photo count not met.');
        confidenceScore -= 40;
      }

      // Field Note Check
      if (requirement.requiresFieldNote && (!entryData.note && !entryData.fieldNote || (entryData.fieldNote || entryData.note || '').trim().length < 5)) {
        missingRequirements.push('Explicit field note required.');
        confidenceScore -= 30;
      }

      // Receipts Mode: Anti-Loophole strictness
      if (entryData.receiptsMode && (!entryData.note && !entryData.fieldNote || (entryData.fieldNote || entryData.note || '').trim().length < 50)) {
         missingRequirements.push('Receipts Mode Active: Evidence insufficient. Field journal needs more detail (min 50 chars).');
         confidenceScore -= 50;
      }

      // Time Window Check
      if (requirement.requiresTimeWindow && requirement.startTime && requirement.endTime) {
        const now = getServerDate();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        
        const [startH, startM] = requirement.startTime.split(':').map(Number);
        const [endH, endM] = requirement.endTime.split(':').map(Number);
        
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;
  
        const isWithinBatch = startMinutes <= endMinutes 
          ? (currentMinutes >= startMinutes && currentMinutes <= endMinutes)
          : (currentMinutes >= startMinutes || currentMinutes <= endMinutes);
  
        if (!isWithinBatch) {
          missingRequirements.push(`Outside of mission time window (${requirement.startTime} - ${requirement.endTime}).`);
          confidenceScore -= 20;
        }
      }
    }

    // 2. AI Analysis (Gemini) - If image is provided and required
    if (base64Image && (requirement?.requiresObjectDetection || true)) {
      const analysis = await analyzeSubmissionImage(
        base64Image,
        challengeTitle,
        challengeInstructions,
        requirement?.objectKeywords || []
      );

      aiAnalysisResult = analysis;
      confidenceScore = Math.min(confidenceScore, analysis.confidence);
      
      if (!analysis.contains_required_subject && (requirement?.requiresObjectDetection)) {
        missingRequirements.push(`Subject detection failure: ${analysis.missing_evidence?.join(', ') || 'unknown'}`);
        confidenceScore -= 30;
      }

      if (analysis.confidence < 50) {
        missingRequirements.push("Image clarity or relevance is below mission standards.");
      }

      reviewNotes = analysis.reason || 'Evidence processed by AI.';
    }

    // 3. Status Determination
    if (missingRequirements.length > 0) {
      status = 'needsMoreProof';
      if (confidenceScore < 30) {
        status = 'rejected';
      }
    }

    const review: Omit<ProofReview, 'id'> = {
      entryId: entryData.id || 'pending',
      userId,
      challengeId,
      status,
      confidenceScore,
      missingRequirements,
      reviewNotes: missingRequirements.length > 0 && !base64Image
        ? `The Evidence Department requires more documentation: ${missingRequirements.join(' ')}` 
        : reviewNotes,
      reviewedAt: getServerDate().toISOString()
    };

    // 4. Persistence & Caching
    try {
      // Save Review (legacy/stat log)
      const docRef = await addDoc(collection(db, REVIEWS_COLLECTION), {
        ...review,
        reviewedAt: serverTimestamp()
      });

      // Save Cache Entry if AI was used
      if (aiAnalysisResult) {
        const checkRecord: ProofCheck = {
          cacheKey,
          submissionId: entryData.id || 'pending',
          challengeId,
          userId,
          imageAnalysis: aiAnalysisResult,
          confidenceScore,
          status,
          missingRequirements,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          inputs
        };

        await setDoc(doc(db, CHECKS_COLLECTION, cacheKey), checkRecord);
      }

      return { id: docRef.id, ...review } as ProofReview;
    } catch (error) {
      console.error('Error saving proof results:', error);
      return { id: 'error', ...review } as ProofReview;
    }
  }, { cooldownMs: 5000 }); // 5s cooldown per user proof check (beta-tuned)
}

export async function adminOverrideReview(reviewId: string, entryId: string, newStatus: ProofStatus, notes: string) {
    try {
        const ref = doc(db, REVIEWS_COLLECTION, reviewId);
        const entryRef = doc(db, ENTRIES_COLLECTION, entryId);
        const entrySnap = await getDoc(entryRef);
        
        if (!entrySnap.exists()) {
            throw new Error('Entry not found for audit.');
        }

        const entry = { id: entrySnap.id, ...entrySnap.data() } as Entry;
        const isApproving = newStatus === 'approved';
        const isRejected = newStatus === 'rejected';
        
        const updateData: any = {
            status: newStatus,
            reviewNotes: notes,
            reviewedAt: serverTimestamp()
        };

        if (isRejected) {
            const now = getServerDate();
            const purgeDate = getServerDate();
            purgeDate.setDate(now.getDate() + 14); // 14 days later
            
            updateData.rejectedAt = serverTimestamp();
            updateData.purgeEligibleAt = Timestamp.fromDate(purgeDate);
        }

        await updateDoc(ref, updateData);

        // Audit Log
        if (auth.currentUser) {
            await logAdminAction(
                auth.currentUser.uid,
                reviewId,
                'proofReview',
                'override_status',
                {
                    entryId,
                    targetUserId: entry.userId,
                    previousStatus: entrySnap.data()?.status,
                    newStatus,
                    notes
                }
            );
        }

        // Update entry status
        const entryUpdate: any = {
            status: isApproving ? 'approved' : isRejected ? 'rejected' : 'needs_fix',
            adminNotes: notes
        };

        if (isRejected) {
            const now = getServerDate();
            const purgeDate = getServerDate();
            purgeDate.setDate(now.getDate() + 14);
            
            entryUpdate.rejectedAt = serverTimestamp();
            entryUpdate.purgeEligibleAt = Timestamp.fromDate(purgeDate);
        }

        // SCORING LOGIC for CORE-05
        if (isApproving && (entry.pointsAwarded === 0 || !entry.pointsAwarded)) {
            const trip = MOCK_TRIPS.find(t => t.id === entry.tripId);
            if (trip) {
                const userRef = doc(db, 'users', entry.userId);
                const userSnap = await getDoc(userRef);
                const userData = userSnap.exists() ? userSnap.data() : null;
                const fieldType = userData?.fieldType || null;
                const userName = userData?.name || 'Agent';

                const config = getGlobalConfig() as any;
                const effectsEnabled = config?.featureFlags?.fieldTypeEffectsEnabled ?? true;

                const scoring = calculateSubmissionPoints(
                    entry,
                    trip,
                    {
                        isFirstSubmission: (userData?.approvedEntriesCount || 0) === 0,
                        daysLate: 0 // Admin approval usually bypasses lateness or handles it manually
                    }
                );

                const ftResult = applyFieldTypeModifier(trip, fieldType, effectsEnabled, !!entry.crewId);
                const ftBonus = ftResult?.bonus || 0;
                const ftText = ftResult?.text || '';

                entryUpdate.pointsAwarded = scoring.totalPoints;

                // Award points via score events
                for (const event of scoring.scoreEvents) {
                    await awardPoints(entry.userId, userName, event.points, event.type as any, {
                        ...event,
                        crewId: entry.crewId,
                        userAvatar: entry.userAvatar
                    });
                }

                // Field Type Modifier
                if (ftBonus > 0) {
                    await awardPoints(entry.userId, userName, ftBonus, 'field_type_perk', {
                        entryId, tripId: trip.id, description: ftText, crewId: entry.crewId, userAvatar: entry.userAvatar
                    });
                }

                // Reward & Badge Unlock Logic (duplication guarded)
                const currentStickers = new Set<string>(userData?.unlockedRewards?.stickers || []);
                const currentBadges = new Set<string>(userData?.unlockedRewards?.badges || []);

                const newStickers: string[] = [];
                const newBadges: string[] = [];

                // 1. Badge: first-approved-mission
                if (!currentBadges.has('first-approved-mission')) {
                    newBadges.push('first-approved-mission');
                }

                // 2. Sticker: summer-starter (unlocked on starting/completing main seasonal expeditions)
                if (!currentStickers.has('summer-starter')) {
                    newStickers.push('summer-starter');
                }

                // 3. Sticker: first-field-note (if note length is at least 5 chars)
                if (entry.fieldNote && entry.fieldNote.trim().length >= 5 && !currentStickers.has('first-field-note')) {
                    newStickers.push('first-field-note');
                }

                // 4. Sticker: Persona reward matching user fieldType
                if (fieldType) {
                    const personaMap: Record<string, string> = {
                        captainClipboard: 'persona-captain-clipboard',
                        mallRat: 'persona-mall-rat',
                        mascota: 'persona-homecoming-queen',
                        elondra: 'persona-homecoming-queen',
                        lostCamper: 'persona-lost-camper',
                        bigfoot: 'persona-bigfoot'
                    };
                    const personaSticker = personaMap[fieldType];
                    if (personaSticker && !currentStickers.has(personaSticker)) {
                        newStickers.push(personaSticker);
                    }
                }

                // 5. Trip custom rewards (if defined)
                if (trip.rewards) {
                    if (trip.rewards.stickers) {
                        trip.rewards.stickers.forEach((s: string) => {
                            if (!currentStickers.has(s) && !newStickers.includes(s)) {
                                newStickers.push(s);
                            }
                        });
                    }
                    if (trip.rewards.badges) {
                        trip.rewards.badges.forEach((b: string) => {
                            if (!currentBadges.has(b) && !newBadges.includes(b)) {
                                newBadges.push(b);
                            }
                        });
                    }
                }

                const updatedStickers = [...Array.from(currentStickers), ...newStickers];
                const updatedBadges = [...Array.from(currentBadges), ...newBadges];
                
                // Onboarding / Crew Mode Unlock Check (SECURE: Admin side only)
                let onboardingUpdates = {};
                const starterIds = ["starter-1", "starter-2", "starter-3"];
                if (starterIds.includes(trip.id)) {
                    // Check other entries for this user
                    const q = query(
                        collection(db, ENTRIES_COLLECTION),
                        where('userId', '==', entry.userId),
                        where('status', 'in', ['approved', 'approved_by_admin', 'auto_approved'])
                    );
                    const snap = await getDocs(q);
                    const completedIds = new Set(snap.docs.map(d => (d.data().tripId || '').toLowerCase()));
                    completedIds.add(trip.id.toLowerCase()); // Add the one we are currently approving

                    const allStartersDone = starterIds.every(id => completedIds.has(id.toLowerCase()));
                    if (allStartersDone && (!userData?.onboardingCompleted || !userData?.crewModeUnlocked)) {
                        onboardingUpdates = {
                            onboardingCompleted: true,
                            crewModeUnlocked: true
                        };
                    }
                }

                const userUpdates: any = {
                    approvedEntriesCount: increment(1),
                    soloTripsCount: increment(1),
                    activeTrip: null,
                    unlockedRewards: {
                        stickers: updatedStickers,
                        badges: updatedBadges
                    },
                    ...onboardingUpdates,
                    [`tripProgress.${trip.id}`]: deleteField(),
                    updatedAt: serverTimestamp()
                };

                // Add to zine memory registry
                try {
                    await addMemory(entry.userId, {
                        userId: entry.userId,
                        missionId: trip.id,
                        seasonId: 'dev-season-2026',
                        title: trip.title,
                        category: trip.category || (trip as any).type || 'field',
                        lane: trip.lane || 'summer',
                        fieldNote: entry.fieldNote || 'A successful field trip entry.',
                        evidenceType: trip.proofType || (trip as any).requiredProof || ['photo'],
                        evidenceUrl: entry.proofImage || '',
                        pointsEarned: scoring.totalPoints + ftBonus,
                        rewardsEarned: (newStickers.length > 0 || newBadges.length > 0) ? {
                            stickers: newStickers,
                            badges: newBadges
                        } : undefined,
                        participants: entry.crewId ? [entry.crewId] : [],
                        favorite: false,
                        zineEligible: trip.zineEligible !== false,
                        zinePageSeedGenerated: true
                    });
                } catch (memError) {
                    console.warn("[Memory Guard] Failed to archive mission memory on override:", memError);
                }

                // Update user stats and rewards
                await updateDoc(userRef, userUpdates);
            }
        }

        await updateDoc(entryRef, entryUpdate);
    } catch (error) {
        console.error('Error in admin override:', error);
    }
}
