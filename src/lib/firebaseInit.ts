import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore,
  memoryLocalCache,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { initializeAppCheck, ReCaptchaV3Provider, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import firebaseConfig from '../../firebase-applet-config.json';

let app: FirebaseApp;
let appCheckInitialized = false;

function ensureCryptoRandomUUID(globalObj: any) {
  const cryptoObj = globalObj?.crypto;
  if (!cryptoObj || typeof cryptoObj.randomUUID === 'function' || typeof cryptoObj.getRandomValues !== 'function') return;

  cryptoObj.randomUUID = () => {
    const bytes = new Uint8Array(16);
    cryptoObj.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0'));
    return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
  };
}

export function initializeFirebase() {
  const isBrowser = typeof window !== 'undefined';
  const globalObj = isBrowser ? (window as any) : (global as any);
  
  // Use fallbacks for import.meta.env
  const getEnv = (key: string) => {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) return import.meta.env[key];
    return typeof process !== 'undefined' && process.env ? process.env[key] : undefined;
  };

  const RECAPTCHA_SITE_KEY = getEnv('VITE_RECAPTCHA_SITE_KEY');
  const RECAPTCHA_ENTERPRISE_SITE_KEY = getEnv('VITE_RECAPTCHA_ENTERPRISE_SITE_KEY');
  const DEBUG_FLAG = getEnv('VITE_FIREBASE_APPCHECK_DEBUG') === 'true';
  const IS_PROD = typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env.PROD
    : typeof process !== 'undefined' && process.env?.NODE_ENV === 'production';
  
  if (globalObj.FIREBASE_INITIALIZED) {
    if (!IS_PROD) console.info(" [Firebase] Re-using existing initialized instances.");
    return globalObj.FIREBASE_INSTANCES;
  }

  const currentHostname = isBrowser ? window.location.hostname : 'localhost';
  
  // App Check is initialized if a reCAPTCHA key exists, or if debug mode is explicitly set.
  const SHOULD_INITIALIZE_APP_CHECK = !!RECAPTCHA_SITE_KEY || !!RECAPTCHA_ENTERPRISE_SITE_KEY || DEBUG_FLAG;
  
  // Debug mode must be opt-in. It prints a browser-specific debug token and
  // bypasses normal App Check attestation after registration in Firebase.
  const SHOULD_USE_DEBUG = DEBUG_FLAG;

  const appCheckMode = SHOULD_INITIALIZE_APP_CHECK ? (SHOULD_USE_DEBUG ? 'DEBUG' : (RECAPTCHA_ENTERPRISE_SITE_KEY ? 'RECAPTCHA_ENTERPRISE' : 'RECAPTCHA_V3')) : 'DISABLED';

  if (!IS_PROD) {
    console.log(`[Firebase Diagnostics]`);
    console.log(` - Project ID: ${firebaseConfig.projectId}`);
    console.log(` - App ID: ${firebaseConfig.appId}`);
    console.log(` - Hostname: ${currentHostname}`);
    console.log(` - App Check Initialized: ${SHOULD_INITIALIZE_APP_CHECK}`);
    console.log(` - App Check Mode: ${appCheckMode}`);
    if (SHOULD_USE_DEBUG) console.log(` - App Check Debug: ENABLED`);
    console.log(` - Token Auto-Refresh: ENABLED`);
    if (RECAPTCHA_SITE_KEY) console.log(` - ReCAPTCHA V3 Configured (Site Key: ${RECAPTCHA_SITE_KEY.slice(0, 6)}...)`);
    if (RECAPTCHA_ENTERPRISE_SITE_KEY) console.log(` - ReCAPTCHA Enterprise Configured (Site Key: ${RECAPTCHA_ENTERPRISE_SITE_KEY.slice(0, 6)}...)`);
  }

  // 1. Initialize App
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);

  // 2. Initialize App Check IMMEDIATELY after initializeApp and BEFORE any other services
  if (!appCheckInitialized && !globalObj.FIREBASE_APP_CHECK_INITIALIZED) {
    try {
      if (isBrowser) {
        ensureCryptoRandomUUID(globalObj);
      }

      if (SHOULD_USE_DEBUG) {
        // Set debug token before initializeAppCheck().
        globalObj.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
        if (!IS_PROD) console.log(` [App Check] ENABLE_DEBUG: self.FIREBASE_APPCHECK_DEBUG_TOKEN = true`);
      }

      if (SHOULD_INITIALIZE_APP_CHECK) {
        let provider: ReCaptchaV3Provider | ReCaptchaEnterpriseProvider;
        
        if (RECAPTCHA_ENTERPRISE_SITE_KEY) {
          provider = new ReCaptchaEnterpriseProvider(RECAPTCHA_ENTERPRISE_SITE_KEY);
        } else {
          provider = new ReCaptchaV3Provider(RECAPTCHA_SITE_KEY || 'debug-placeholder');
        }

        const appCheck = initializeAppCheck(app, {
          provider,
          isTokenAutoRefreshEnabled: true,
        });
        globalObj.FIREBASE_APP_CHECK_INSTANCE = appCheck;
        globalObj.FIREBASE_APP_CHECK_INITIALIZED = true;
        
        if (!IS_PROD) {
          console.group(" [App Check] ACTIVATED");
          console.log(` Provider: ${appCheckMode}`);
          console.log(` Token Auto-Refresh: ON`);
          if (SHOULD_USE_DEBUG) console.log(` Mode: Debug/CodeSpace`);
          console.groupEnd();
        }
      } else if (isBrowser && !IS_PROD) {
        console.warn(" [App Check] SKIP: No reCAPTCHA keys found and NOT in explicit debug mode.");
      }
    } catch (acErr: any) {
      if (acErr.message?.includes('400') || String(acErr).includes('400')) {
         console.error(" [App Check] HTTP 400: App Check initialization failed. Possible site key mismatch or invalid configuration.");
      } else {
         console.error(" [App Check] ERROR: Initialization failure:", acErr.message || acErr);
      }
      globalObj.FIREBASE_APPCHECK_INIT_ERROR = acErr.message || String(acErr);
    }
    appCheckInitialized = true;
  }

  // 3. Initialize Services (Firestore, Auth, Storage)
  const auth = getAuth(app);
  const storage = getStorage(app);
  
  const firestoreSettings: any = {
    experimentalForceLongPolling: true,
    ignoreUndefinedProperties: true,
    localCache: memoryLocalCache(),
  };
  const configuredDatabaseId = String((firebaseConfig as any).firestoreDatabaseId || '').trim();
  const databaseId = configuredDatabaseId && configuredDatabaseId !== '(default)'
    ? configuredDatabaseId
    : undefined;
  const db = databaseId
    ? initializeFirestore(app, firestoreSettings, databaseId)
    : initializeFirestore(app, firestoreSettings);

  const instances = { app, auth, db, storage };
  globalObj.FIREBASE_INSTANCES = instances;
  globalObj.FIREBASE_INITIALIZED = true;
  
  return instances;
}
