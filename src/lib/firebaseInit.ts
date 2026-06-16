import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore,
  memoryLocalCache,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import firebaseConfig from '../../firebase-applet-config.json';

let app: FirebaseApp;
let appCheckInitialized = false;

export function initializeFirebase() {
  const isBrowser = typeof window !== 'undefined';
  const globalObj = isBrowser ? (window as any) : (global as any);
  
  if (globalObj.FIREBASE_INITIALIZED) return globalObj.FIREBASE_INSTANCES;

  const currentHostname = isBrowser ? window.location.hostname : 'localhost';
  
  // Use fallbacks for import.meta.env
  const getEnv = (key: string) => {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) return import.meta.env[key];
    return process.env[key];
  };

  const RECAPTCHA_SITE_KEY = getEnv('VITE_RECAPTCHA_SITE_KEY');
  const DEBUG_FLAG = getEnv('VITE_FIREBASE_APPCHECK_DEBUG') === 'true';
  const IS_PROD = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.PROD : process.env.NODE_ENV === 'production';
  const IS_DEV_PREVIEW = !IS_PROD;
  
  // App Check is only initialized if a real reCAPTCHA site key exists, or if debug mode is explicitly set to true.
  // In the preview environment, skipping initializeAppCheck when the site key is missing prevents 10-second backend connection timeouts.
  const SHOULD_INITIALIZE_APP_CHECK = !!RECAPTCHA_SITE_KEY || DEBUG_FLAG;
  const SHOULD_USE_DEBUG = DEBUG_FLAG || (IS_DEV_PREVIEW && !!RECAPTCHA_SITE_KEY);

  // AI Studio environment usually needs debug mode for App Check in the preview iframe
  const appCheckMode = SHOULD_INITIALIZE_APP_CHECK ? (SHOULD_USE_DEBUG ? 'DEBUG' : 'RECAPTCHA') : 'DISABLED';

  console.log(`[Firebase Diagnostics]`);
  console.log(` - Project ID: ${firebaseConfig.projectId}`);
  console.log(` - App ID: ${firebaseConfig.appId}`);
  console.log(` - Hostname: ${currentHostname}`);
  console.log(` - App Check Mode: ${appCheckMode}`);
  console.log(` - Token Auto-Refresh: ENABLED`);

  // 1. Initialize App
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);

  // 2. Initialize App Check IMMEDIATELY after initializeApp and BEFORE any other services
  if (!appCheckInitialized && !globalObj.FIREBASE_APP_CHECK_INITIALIZED) {
    try {
      if (SHOULD_USE_DEBUG) {
        globalObj.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
        // Do not expose debug token in UI, only internal log
        console.log(` [App Check] Initializing in DEBUG mode for environment validation.`);
      }

      if (SHOULD_INITIALIZE_APP_CHECK) {
        const appCheck = initializeAppCheck(app, {
          provider: new ReCaptchaV3Provider(RECAPTCHA_SITE_KEY || 'debug-placeholder'),
          isTokenAutoRefreshEnabled: true,
        });
        globalObj.FIREBASE_APP_CHECK_INSTANCE = appCheck;
        globalObj.FIREBASE_APP_CHECK_INITIALIZED = true;
        console.log(` [App Check] SUCCESS: Initialized and connected.`);
      } else if (isBrowser) {
        console.warn(" [App Check] SKIP: VITE_RECAPTCHA_SITE_KEY is missing and not in explicit dev/debug mode.");
      }
    } catch (acErr: any) {
      if (acErr.message?.includes('400') || String(acErr).includes('400')) {
         console.error(" [App Check] HTTP 400: App Check token failed. Verify debug token is registered under the active web app, or production reCAPTCHA config matches Firebase Console.");
      } else {
         console.error(" [App Check] ERROR: Initialization failure:", acErr.message || acErr);
      }
      globalObj.FIREBASE_APPCHECK_INIT_ERROR = acErr.message || String(acErr);
    }
    appCheckInitialized = true;
  }

  // 3. Initialize Services (Firestore, Auth, Storage)
  // These should NOT be accessed before this point to ensure they use the App Check token
  const auth = getAuth(app);
  const storage = getStorage(app);
  
  const firestoreSettings: any = {
    experimentalForceLongPolling: true,
    ignoreUndefinedProperties: true,
    localCache: memoryLocalCache(),
  };
  const databaseId = (firebaseConfig as any).firestoreDatabaseId;
  const db = initializeFirestore(app, firestoreSettings, databaseId);

  const instances = { app, auth, db, storage };
  globalObj.FIREBASE_INSTANCES = instances;
  globalObj.FIREBASE_INITIALIZED = true;
  
  return instances;
}
