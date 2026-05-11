import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import firebaseConfig from '../../firebase-applet-config.json';

if (firebaseConfig.projectId !== "field-trip-495823") {
  throw new Error("Wrong Firebase project connected. Expected field-trip-495823.");
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize App Check
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

if (typeof window !== 'undefined') {
  // Use a global to prevent duplicate initialization during HMR
  const G = window as any;
  if (!G.FIREBASE_APP_CHECK_INITIALIZED) {
    if (RECAPTCHA_SITE_KEY) {
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(RECAPTCHA_SITE_KEY),
        isTokenAutoRefreshEnabled: true,
      });
      G.FIREBASE_APP_CHECK_INITIALIZED = true;
    } else if (import.meta.env.PROD) {
      console.warn(
        'Firebase App Check Warning: VITE_RECAPTCHA_SITE_KEY is missing. ' +
        'Firestore security enforcement may reject requests in production if App Check is enforced.'
      );
    }
  }
}

// Initialize Services
export const auth = getAuth(app);
export const storage = getStorage(app);

// Initialize Firestore
export const db = getFirestore(app);

/**
 * Validates connection to Firestore.
 * This is critical to ensure the app is properly configured and online.
 */
async function testConnection() {
  try {
    // Attempting a server-side fetch to verify actual connectivity
    const connectionRef = doc(db, 'test', 'connection');
    await getDocFromServer(connectionRef);
    console.log("Firestore connection verified successfully.");
  } catch (error: any) {
    console.warn("Firestore connectivity check warning:", error);
    if (error?.message?.includes('the client is offline') || error?.code === 'unavailable') {
      console.error("CRITICAL: Firestore backend unreachable. This often means the Project ID is incorrect, the database instance doesn't exist, or the API key lacks Firestore permissions.");
    }
    if (error?.code === 'permission-denied') {
      console.error("CRITICAL: Firestore permission denied on test collection. Check security rules for /test/connection.");
    }
  }
}

// Only log connection test in development
if (import.meta.env.DEV) {
  testConnection();
}

// Error handling types and helper as per integration guidelines
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

/**
 * Standardized Firestore error handler to provide debugging context while maintaining security.
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
