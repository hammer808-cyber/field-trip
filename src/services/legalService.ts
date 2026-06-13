import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { LegalConsent } from '../types/game';
import { 
  CURRENT_TERMS_VERSION, 
  CURRENT_PRIVACY_VERSION, 
  CURRENT_COMMUNITY_RULES_VERSION, 
  CURRENT_SAFETY_RULES_VERSION 
} from '../constants/legal';

export async function getLatestConsent(userId: string): Promise<LegalConsent | null> {
  try {
    const docRef = doc(db, 'users', userId, 'legalConsents', 'current');
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return snap.data() as LegalConsent;
  } catch (error: any) {
    if (error?.code === 'unavailable' || error?.message?.includes('offline')) {
      console.warn("[LegalService] Firestore unreachable. Proceeding with offline/null state.");
      return null;
    }
    handleFirestoreError(error, OperationType.GET, `users/${userId}/legalConsents/current`);
    return null;
  }
}

export async function saveConsent(userId: string) {
  try {
    const docRef = doc(db, 'users', userId, 'legalConsents', 'current');
    const consent: LegalConsent = {
      accepted: true,
      acceptedAt: serverTimestamp() as any,
      userId,
      termsVersion: CURRENT_TERMS_VERSION,
      privacyVersion: CURRENT_PRIVACY_VERSION,
      communityRulesVersion: CURRENT_COMMUNITY_RULES_VERSION,
      safetyRulesVersion: CURRENT_SAFETY_RULES_VERSION,
      isAdultConfirmed: true,
      appVersion: "1.0.0",
      platform: window.navigator.userAgent
    };
    await setDoc(docRef, consent);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/legalConsents/current`);
  }
}

export function isConsentValid(consent: LegalConsent | null): boolean {
  if (!consent) return false;
  return (
    consent.accepted &&
    consent.termsVersion === CURRENT_TERMS_VERSION &&
    consent.privacyVersion === CURRENT_PRIVACY_VERSION &&
    consent.communityRulesVersion === CURRENT_COMMUNITY_RULES_VERSION &&
    consent.safetyRulesVersion === CURRENT_SAFETY_RULES_VERSION &&
    consent.isAdultConfirmed === true
  );
}
