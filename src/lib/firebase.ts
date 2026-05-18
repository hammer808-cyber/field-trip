import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore,
  doc, 
  getDocFromServer,
  Firestore
} from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { initializeAppCheck, ReCaptchaV3Provider, getToken, AppCheck } from 'firebase/app-check';
import firebaseConfig from '../../firebase-applet-config.json';

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

// Safe Initialization
let app: FirebaseApp;
let auth: Auth = null as any;
let storage: FirebaseStorage = null as any;
let db: Firestore = null as any;
let appCheck: AppCheck | null = null;

if (!firebaseErrorValue) {
  try {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    
    // Log project info as requested (no API key)
    console.log(`[Firebase] Initialized for Project: ${firebaseConfig.projectId}, App ID: ${firebaseConfig.appId}`);

    // Initialize Services
    auth = getAuth(app);
    storage = getStorage(app);
    
    // Use initializeFirestore with long polling to bypass potential proxy/websocket issues
    const firestoreSettings = {
      experimentalForceLongPolling: true,
      useFetchStreams: false, // Can help with some corporate/environment proxies
    };
    const databaseId = (firebaseConfig as any).firestoreDatabaseId;
    
    console.log(`[Firebase] Initializing Firestore. Database: ${databaseId || '(default)'}`);
    
    if (databaseId) {
      db = initializeFirestore(app, firestoreSettings, databaseId);
    } else {
      db = initializeFirestore(app, firestoreSettings);
    }

    // Initialize App Check
    const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
      const isAISPreview = hostname.includes('ais-dev-') || hostname.includes('ais-pre-');
      const isDevEnv = import.meta.env.DEV;

      // In development or AIS preview, support the Debug Provider
      if (isLocalhost || isAISPreview) {
        console.log("[Firebase] AIS/Local environment detected. Skipping App Check to ensure connectivity.");
        // We skip App Check here because it can cause timeouts if ReCaptcha is blocked or misconfigured
      } else if (RECAPTCHA_SITE_KEY) {
        // Production initialization
        const G = window as any;
        if (!G.FIREBASE_APP_CHECK_INITIALIZED) {
          try {
            appCheck = initializeAppCheck(app, {
              provider: new ReCaptchaV3Provider(RECAPTCHA_SITE_KEY),
              isTokenAutoRefreshEnabled: true,
            });
            G.FIREBASE_APP_CHECK_INITIALIZED = true;
            console.log("[Firebase] App Check initialized (Production Mode).");
          } catch (acErr) {
            console.warn("[Firebase] App Check initialization failed:", acErr);
          }
        }
      }
    }
  } catch (err: any) {
    console.error("[Firebase] Initialization error:", err);
    firebaseInitError = err.message || String(err);
    // Don't overwrite if they were already set
    if (!auth) auth = null as any;
    if (!storage) storage = null as any;
    if (!db) db = null as any;
  }
} else {
  // Provide null as any to satisfy imports during broken config state
  auth = null as any;
  storage = null as any;
  db = null as any;
}

export async function getAppCheckToken(): Promise<string | null> {
  if (!appCheck) return null;
  try {
    const result = await getToken(appCheck, false);
    return result.token;
  } catch (err) {
    console.error("[Firebase] Failed to get App Check token:", err);
    return null;
  }
}

export { auth, storage, db };

/**
 * Validates connection to Firestore.
 */
async function testConnection() {
  if (!db) return;
  try {
    const connectionRef = doc(db, 'test', 'connection');
    await getDocFromServer(connectionRef);
    console.log("[Firebase] Firestore connection verified.");
  } catch (error: any) {
    // Silencing these warnings as they are common in the preview environment and often transient
    // We only log to console.info to keep the developer informed without scaring the user with warnings or errors
    if (error.code === 'unavailable' || (error.message && error.message.includes('the client is offline'))) {
      console.info("[Firebase] Status: Offline mode or transient connectivity interruption.");
    } else {
      console.info("[Firebase] Connectivity hint (non-fatal):", error.code, error.message);
    }
  }
}

if (import.meta.env.DEV && !firebaseErrorValue) {
  testConnection();
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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const currentAuth = auth;
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
  
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
