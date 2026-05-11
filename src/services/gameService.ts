import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp, 
  increment,
  getDoc,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Entry } from '../constants';
import { evaluateProof } from './proofService';
import { awardPoints } from './scoringService';
import { ChallengeCard } from '../types/challenges';
import { uploadBase64Image } from './storageService';

export async function submitEntry(
  userId: string,
  userName: string,
  challenge: ChallengeCard,
  entryData: {
    proofImage: string;
    note: string;
    crewId?: string;
  }
) {
  try {
    // 1. Upload Image to Storage first to get a URL
    // Generate a unique filename
    const timestamp = Date.now();
    const filename = `proof_${challenge.id}_${timestamp}.jpg`;
    
    let imageUrl = entryData.proofImage;
    
    // Only upload if it's a base64 string (starts with data: or is long)
    if (entryData.proofImage.length > 500) {
      imageUrl = await uploadBase64Image(userId, 'proofs', filename, entryData.proofImage);
    }

    // 2. Create Entry (submitted) with URL instead of base64
    const entryRef = await addDoc(collection(db, 'entries'), {
      ...entryData,
      proofImage: imageUrl, // Store URL, not base64
      userId,
      userName,
      challengeId: challenge.id,
      challengeTitle: challenge.title,
      status: 'pendingReview',
      pointsAwarded: 0,
      createdAt: serverTimestamp()
    });

    const entryId = entryRef.id;

    // 2. Evaluate Proof
    const review = await evaluateProof(
      userId,
      challenge.id,
      challenge.title,
      challenge.fullInstructions,
      { ...entryData, id: entryId },
      entryData.proofImage 
    );

    // 3. Update Entry with Review Results
    const finalStatus = review.status === 'approved' ? 'approved' : 
                       review.status === 'rejected' ? 'rejected' : 
                       'needsMoreProof';

    await updateDoc(doc(db, 'entries', entryId), {
      status: finalStatus,
      proofCheckId: review.id,
      adminNotes: review.reviewNotes
    });

    // 4. If Approved, Award Points and Update Stats
    if (finalStatus === 'approved') {
      await awardPoints(userId, userName, challenge.points, 'challenge_approved', {
        entryId,
        challengeId: challenge.id,
        description: `Completed: ${challenge.title}`,
        crewId: entryData.crewId
      });

      // Update user counts
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        approvedEntriesCount: increment(1),
        soloCount: challenge.mode === 'solo' ? increment(1) : increment(0)
      });

      // Check for onboarding completion / crew unlock
      await checkOnboardingState(userId);
    }

    return { entryId, status: finalStatus, review };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'entries');
  }
}

export async function checkOnboardingState(userId: string) {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
    const data = userSnap.data();
    const soloCount = data.soloCount || 0;
    
    if (soloCount >= 3 && !data.crewModeUnlocked) {
      await updateDoc(userRef, {
        crewModeUnlocked: true,
        onboardingCompleted: true,
        updatedAt: serverTimestamp()
      });
      return true;
    }
  }
  return false;
}

export async function getUserStats(userId: string) {
  const userRef = doc(db, 'users', userId);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return null;
  return snap.data();
}
