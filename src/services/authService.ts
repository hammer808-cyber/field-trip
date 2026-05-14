
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp, 
  increment,
  runTransaction
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { UserProfile } from './userService';
import { getServerDate } from './timeService';

export interface AccessCode {
  code: string;
  active: boolean;
  maxUses: number;
  currentUses: number;
  expiresAt?: any;
  createdAt: any;
  label: string;
}

export async function validateAccessCode(code: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const codeRef = doc(db, 'accessCodes', code.toUpperCase());
    const codeSnap = await getDoc(codeRef);

    if (!codeSnap.exists()) {
      return { valid: false, error: 'INVALID_ACCESS_CODE. CHECK_SPELLING.' };
    }

    const data = codeSnap.data() as AccessCode;
    
    // Safety check for empty or malformed codes
    if (!data) return { valid: false, error: 'INVALID_ACCESS_CODE' };

    if (!data.active) {
      return { valid: false, error: 'ACCESS_CODE_INACTIVE. CONTACT_BUREAU.' };
    }

    if (data.maxUses > 0 && data.currentUses >= data.maxUses) {
      return { valid: false, error: 'ACCESS_CODE_EXPIRED. CAPACITY_REACHED.' };
    }

    if (data.expiresAt && data.expiresAt.toDate() < getServerDate()) {
      return { valid: false, error: 'ACCESS_CODE_EXPIRED. TIME_LIMIT_EXCEEDED.' };
    }

    return { valid: true };
  } catch (error: any) {
    console.error('Error validating access code:', error);
    
    // Specific check for offline error
    if (error.message?.includes('offline') || error.code === 'unavailable') {
      return { valid: false, error: 'CONNECTIVITY_ERROR. THE_BUREAU_IS_UNREACHABLE. CHECK_YOUR_CONNECTION.' };
    }
    
    return { valid: false, error: 'SYSTEM_ERROR. TRY_AGAIN.' };
  }
}

export async function checkUsernameUnique(username: string): Promise<boolean> {
  const nameRef = doc(db, 'usernames', username.toLowerCase());
  const nameSnap = await getDoc(nameRef);
  return !nameSnap.exists();
}

export async function registerWithAccessCode(
  uid: string, 
  email: string, 
  username: string, 
  accessCode: string
) {
  const userRef = doc(db, 'users', uid);
  const usernameRef = doc(db, 'usernames', username.toLowerCase());
  const codeRef = doc(db, 'accessCodes', accessCode.toUpperCase());

  await runTransaction(db, async (transaction) => {
    // 1. Double check username uniqueness inside transaction
    const usernameSnap = await transaction.get(usernameRef);
    if (usernameSnap.exists()) {
      throw new Error('USERNAME_TAKEN');
    }

    // 2. Double check code inside transaction
    const codeSnap = await transaction.get(codeRef);
    if (!codeSnap.exists()) throw new Error('INVALID_CODE');
    const codeData = codeSnap.data() as AccessCode;
    if (!codeData.active || (codeData.maxUses > 0 && codeData.currentUses >= codeData.maxUses)) {
       throw new Error('CODE_NOT_AVAILABLE');
    }

    // 3. Create user profile
    const newProfile: UserProfile = {
      id: uid,
      name: username, // Use username as initial display name
      email: email,
      fieldType: null,
      fieldTypeName: null,
      fieldClassificationComplete: false,
      productPersonaLens: 'frankie', // Default internal lens
      onboardingCompleted: false,
      crewModeUnlocked: false,
      crewModeSeen: false,
      points: 0,
      soloTripsCount: 0,
      boldTripsCount: 0,
      crewTripsCount: 0,
      rerollsAvailable: 3,
      activeTrip: null,
      lastSnitchDate: null,
      betaAccessCodeUsed: accessCode.toUpperCase(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    transaction.set(userRef, newProfile);

    // 4. Claim username
    transaction.set(usernameRef, {
      userId: uid,
      createdAt: serverTimestamp()
    });

    // 5. Update code usage
    transaction.update(codeRef, {
      currentUses: increment(1),
      usedBy: increment(1) // Just tracking usage count for now
    });
    
    // Add to usedBy array if needed, but array might grow too large. 
    // Usually we just track the count or a subcollection.
  });
}
