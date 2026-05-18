
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp, 
  increment,
  runTransaction
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile } from './userService';
import { getServerDate } from './timeService';
import { DEFAULT_AVATAR } from '../constants/avatarAssets';
import { authenticatedFetch } from '../lib/api';

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
    console.log('[BUREAU_AUTH] Initiating clearance validation uplink...', code);
    const response = await authenticatedFetch('/api/auth/validate-clearance', {
      method: 'POST',
      body: JSON.stringify({ code: code.toUpperCase().trim() }),
    });

    console.log('[BUREAU_AUTH] Response received:', response.status, response.statusText);
    const isJson = response.headers.get('content-type')?.includes('application/json');
    const result = isJson ? await response.json() : null;
    console.log('[BUREAU_AUTH] Parsed result:', result);

    if (!response.ok) {
      if (response.status === 404 && !isJson) {
        return { valid: false, error: 'BUREAU_API_ENDPOINT_NOT_FOUND. SYSTEM_OUT_OF_SYNC.' };
      }
      return { 
        valid: false, 
        error: result?.error || `AUTH_PROTOCOL_ERROR (${response.status})` 
      };
    }

    if (!result) {
      return { valid: false, error: 'EMPTY_RESPONSE_FROM_BUREAU' };
    }

    return { 
      valid: result.valid, 
      error: result.error 
    };
  } catch (error: any) {
    console.error('Error validating access code:', error);
    
    // Check if it's a parse error (likely HTML returned instead of JSON)
    if (error instanceof SyntaxError) {
      return { valid: false, error: 'MALFORMED_RESPONSE. THE_BUREAU_SENT_NON_JSON_DATA.' };
    }

    return { 
      valid: false, 
      error: 'CONNECTIVITY_ERROR. THE_BUREAU_IS_UNREACHABLE. CHECK_YOUR_CONNECTION.' 
    };
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
  try {
    console.log('[BUREAU_AUTH] Initiating backend registration sequence for:', username);
    const response = await authenticatedFetch('/api/auth/register-profile', {
      method: 'POST',
      body: JSON.stringify({
        username,
        accessCode: accessCode.toUpperCase().trim()
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[BUREAU_AUTH] Registration failed at backend:', result.error);
      throw new Error(result.error || 'REGISTRATION_UPLINK_FAILURE');
    }
    
    console.log('[BUREAU_AUTH] Registration sequence complete. Welcome to the Bureau.');
    return result.status || 'approved';
  } catch (error: any) {
    console.error('[BUREAU_AUTH] Registration failed:', error.message);
    throw error;
  }
}
