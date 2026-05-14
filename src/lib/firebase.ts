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
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import firebaseConfig from '../../firebase-applet-config.json';

// Basic validation of config from file
const REQUIRED_CONFIG = ['apiKey', 'authDomain', 'projectId', 'appId'];
const missingFields = REQUIRED_CONFIG.filter(field => !firebaseConfig[field as keyof typeof firebaseConfig]);

let firebaseErrorValue: string | null = missingFields.length > 0 
  ? `Missing critical Firebase configuration fields: ${missingFields.join(', ')}.` 
  : null;

// Enforce specific project requested by user
const TARGET_PROJECT_ID = "field-trip-495823";
if (!firebaseErrorValue && firebaseConfig.projectId !== TARGET_PROJECT_ID) {
  firebaseErrorValue = `Project ID mismatch: Configured for "${firebaseConfig.projectId}", but requires "${TARGET_PROJECT_ID}".`;
}

export const firebaseError = firebaseErrorValue;

// Safe Initialization
let app: FirebaseApp;
let auth: Auth;
let storage: FirebaseStorage;
let db: Firestore;

if (!firebaseErrorValue) {
  try {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    
    // Log project info as requested (no API key)
    console.log(`[Firebase] Initialized for Project: ${firebaseConfig.projectId}, App ID: ${firebaseConfig.appId}`);

    // Initialize Services
    auth = getAuth(app);
    storage = getStorage(app);
    
    // Use initializeFirestore with long polling to bypass potential proxy/websocket issues
    db = initializeFirestore(app, {
      experimentalForceLongPolling: true,
    }, (firebaseConfig as any).firestoreDatabaseId);

    // Initialize App Check
    const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
    if (typeof window !== 'undefined' && RECAPTCHA_SITE_KEY) {
      const G = window as any;
      if (!G.FIREBASE_APP_CHECK_INITIALIZED) {
        try {
          initializeAppCheck(app, {
            provider: new ReCaptchaV3Provider(RECAPTCHA_SITE_KEY),
            isTokenAutoRefreshEnabled: true,
          });
          G.FIREBASE_APP_CHECK_INITIALIZED = true;
          console.log("[Firebase] App Check initialized.");
        } catch (acErr) {
          console.warn("[Firebase] App Check initialization failed:", acErr);
        }
      }
    }
  } catch (err: any) {
    console.error("[Firebase] Initialization error:", err);
    // If initialization fails, we still need to provide something to prevent top-level crashes
    auth = null as any;
    storage = null as any;
    db = null as any;
  }
} else {
  // Provide null as any to satisfy imports during broken config state
  auth = null as any;
  storage = null as any;
  db = null as any;
}

export { auth, storage, db };

/**
 * Validates connection to Firestore.
 */
async function testConnection() {
  if (!db) return;
  try {
    const connectionRef = doc(db, 'test', 'connection');
    // Using getDocFromServer as CRITICAL CONSTRAINT in skill
    await getDocFromServer(connectionRef);
    console.log("[Firebase] Firestore connection verified.");
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration: The client is reporting offline.");
    } else {
      console.warn("[Firebase] Connectivity check warning:", error);
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
