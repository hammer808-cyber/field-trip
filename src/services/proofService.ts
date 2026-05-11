import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc,
  doc,
  serverTimestamp,
  Timestamp,
  limit
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { ProofRequirement, ProofReview, ProofStatus } from '../types/proof';
import { analyzeSubmissionImage } from './geminiService';

const REQUIREMENTS_COLLECTION = 'proofRequirements';
const REVIEWS_COLLECTION = 'proofReviews';
const ENTRIES_COLLECTION = 'entries';

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
    base64Image?: string
): Promise<ProofReview> {
  const requirement = await getProofRequirement(challengeId);
  const missingRequirements: string[] = [];
  let confidenceScore = 100;
  let status: ProofStatus = 'approved';
  let reviewNotes = 'Evidence processed. Proceed with archival.';

  // 1. Basic Policy Checks
  if (requirement) {
    // Photo Check
    const photoCount = entryData.proofImage || base64Image ? 1 : 0;
    if (photoCount < requirement.minimumPhotoCount) {
      missingRequirements.push('Minimum photo count not met.');
      confidenceScore -= 40;
    }

    // Field Note Check
    if (requirement.requiresFieldNote && (!entryData.note || entryData.note.trim().length < 5)) {
      missingRequirements.push('Explicit field note required.');
      confidenceScore -= 30;
    }

    // Time Window Check
    if (requirement.requiresTimeWindow && requirement.startTime && requirement.endTime) {
      const now = new Date();
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

    confidenceScore = Math.min(confidenceScore, analysis.confidence);
    
    if (!analysis.contains_required_subject && (requirement?.requiresObjectDetection)) {
      missingRequirements.push(`Subject detection failure: ${analysis.missing_evidence.join(', ')}`);
      confidenceScore -= 30;
    }

    if (analysis.confidence < 50) {
      missingRequirements.push("Image clarity or relevance is below mission standards.");
    }

    reviewNotes = analysis.reason;
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
    reviewedAt: new Date().toISOString()
  };

  try {
    const docRef = await addDoc(collection(db, REVIEWS_COLLECTION), {
      ...review,
      reviewedAt: serverTimestamp()
    });
    return { id: docRef.id, ...review } as ProofReview;
  } catch (error) {
    console.error('Error saving proof review:', error);
    return { id: 'error', ...review } as ProofReview;
  }
}

export async function adminOverrideReview(reviewId: string, entryId: string, newStatus: ProofStatus, notes: string) {
    try {
        const ref = doc(db, REVIEWS_COLLECTION, reviewId);
        await updateDoc(ref, {
            status: newStatus,
            reviewNotes: notes,
            reviewedAt: serverTimestamp()
        });

        // Also update entry status if possible
        const entryRef = doc(db, ENTRIES_COLLECTION, entryId);
        await updateDoc(entryRef, {
            status: newStatus === 'approved' ? 'approved' : 'rejected',
            adminNotes: notes
        });
    } catch (error) {
        console.error('Error in admin override:', error);
    }
}
