import { Auth } from 'firebase/auth';
import { 
  doc, 
  getDocFromServer,
  Firestore
} from 'firebase/firestore';
import { FirebaseStorage } from 'firebase/storage';
import { getToken, AppCheck } from 'firebase/app-check';
import firebaseConfig from '../../firebase-applet-config.json';
import { initializeFirebase } from './firebaseInit';

// Basic validation of config from file
const REQUIRED_CONFIG = ['apiKey', 'authDomain', 'projectId', 'appId'];
const missingFields = REQUIRED_CONFIG.filter(field => !firebaseConfig[field as keyof typeof firebaseConfig]);

let firebaseErrorValue: string | null = missingFields.length > 0 
  ? `Missing critical Firebase configuration fields: ${missingFields.join(', ')}.` 
  : null;

let firebaseInitError: string | null = null;

// Enforce specific project requested by user
const TARGET_PROJECT_ID = "field-trip-495823";
if (!firebaseErrorValue && firebaseConfig.projectId !== TARGET_PROJECT_ID) {
  firebaseErrorValue = `Project ID mismatch: Configured for "${firebaseConfig.projectId}", but requires "${TARGET_PROJECT_ID}".`;
}

export const firebaseError = firebaseErrorValue;
export const getFirebaseInitError = () => firebaseInitError;

// Initialize as soon as this module is loaded to ensure exports are populated
// unless there's a configuration error.
let auth: Auth = null as any;
let storage: FirebaseStorage = null as any;
let db: Firestore = null as any;

if (!firebaseErrorValue) {
  try {
    const instances = initializeFirebase();
    if (instances) {
      auth = instances.auth;
      db = instances.db;
      storage = instances.storage;
    }
  } catch (err: any) {
    firebaseInitError = err.message || String(err);
  }
}

export async function getAppCheckToken(): Promise<string | null> {
  const appCheck = typeof window !== 'undefined' ? (window as any).FIREBASE_APP_CHECK_INSTANCE as AppCheck : null;
  if (!appCheck) return null;
  try {
    const result = await getToken(appCheck, false);
    return result.token;
  } catch (err) {
    console.warn("[Firebase] Failed to get App Check token:", err);
    return null;
  }
}

export { auth, storage, db };

/**
 * Validates connection to Firestore.
 */
async function testConnection() {
  if (!db) return;
  
  let timeoutId: any;

  try {
    const connectionRef = doc(db, 'test', 'connection');

    const getDocPromise = getDocFromServer(connectionRef).then(
      (res) => ({ isTimeout: false, isError: false, data: res }),
      (err) => ({ isTimeout: false, isError: true, error: err })
    );

    const timeoutPromise = new Promise<{ isTimeout: boolean; isError: boolean; data?: any; error?: any }>((resolve) => {
      timeoutId = setTimeout(() => {
        resolve({ isTimeout: true, isError: false });
      }, 5000);
    });

    const result = await Promise.race([
      getDocPromise,
      timeoutPromise
    ]);

    if (result.isTimeout) {
      throw new Error('Connection check timed out');
    }

    if (result.isError) {
      throw (result as any).error;
    }

    console.log("[Firebase] Firestore connection verified.");
  } catch (error: any) {
    // Silencing these warnings as they are common in the preview environment and often transient
    // We only log to console.info to keep the developer informed without scaring the user with warnings or errors
    if (error.code === 'unavailable' || error.message?.includes('timed out') || (error.message && error.message.includes('the client is offline'))) {
      console.info("[Firebase] Status: Offline mode or transient connectivity interruption.");
    } else {
      console.info("[Firebase] Connectivity hint (non-fatal):", error.code, error.message);
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

const isDevMode = typeof import.meta !== 'undefined' && import.meta.env 
  ? import.meta.env.DEV 
  : process.env.NODE_ENV !== 'production';

if (isDevMode && !firebaseErrorValue) {
  testConnection().catch(() => {});
}

// Error handling types and helper
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function logFirestoreError(error: unknown, operationType: OperationType, path: string | null): void {
  try {
    handleFirestoreError(error, operationType, path);
  } catch (e) {
    // We already logged it in handleFirestoreError, and by catching we prevent the throw
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const currentAuth = auth;
  const isOffline = error instanceof Error && 
    (error.message.includes('offline') || (error as any).code === 'unavailable');
  
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentAuth?.currentUser?.uid || null,
      email: currentAuth?.currentUser?.email || null,
      emailVerified: currentAuth?.currentUser?.emailVerified || null,
      isAnonymous: currentAuth?.currentUser?.isAnonymous || null,
      tenantId: currentAuth?.currentUser?.tenantId || null,
      providerInfo: currentAuth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  
  if (isOffline) {
    console.info(`[Firebase] Firestore ${operationType} at "${path}": Client is currently offline or connection is transiently unavailable. The SDK will retry/use cache if available.`);
  } else {
    console.error('Firestore Error: ', JSON.stringify(errInfo));
  }
  
  throw new Error(JSON.stringify(errInfo));
}
