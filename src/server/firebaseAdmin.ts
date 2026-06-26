import { applicationDefault, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

export const FIELDTRIP_PROJECT_ID = 'field-trip-495823';
export const FIELDTRIP_FIRESTORE_DATABASE_ID = 'ai-studio-6bdf91b5-28e9-46f3-ae49-89cf99e2d88a';

export interface ServerFirebaseConfig {
  projectId?: string;
  firestoreDatabaseId?: string;
  storageBucket?: string;
}

export interface ServerFirebaseHandles {
  adminApp: App;
  authApp: App;
  db: Firestore;
  auth: ReturnType<typeof getAuth>;
  storage: ReturnType<typeof getStorage>;
  projectId: string;
  databaseId: string;
  storageBucket: string;
}

function cleanProjectId(value: unknown): string | null {
  if (!value) return null;
  const projectId = String(value).trim();
  if (!projectId || projectId.startsWith('ai-studio-')) return null;
  return projectId;
}

function cleanDatabaseId(value: unknown): string | null {
  if (!value) return null;
  const databaseId = String(value).trim();
  return databaseId || null;
}

export function resolveServerFirebaseProjectId(config?: ServerFirebaseConfig | null): string {
  return cleanProjectId(process.env.FIREBASE_PROJECT_ID)
    || cleanProjectId(process.env.GOOGLE_CLOUD_PROJECT)
    || cleanProjectId(process.env.GCLOUD_PROJECT)
    || cleanProjectId(config?.projectId)
    || FIELDTRIP_PROJECT_ID;
}

export function resolveServerFirestoreDatabaseId(config?: ServerFirebaseConfig | null): string {
  return cleanDatabaseId(process.env.FIRESTORE_DATABASE_ID)
    || cleanDatabaseId(config?.firestoreDatabaseId)
    || FIELDTRIP_FIRESTORE_DATABASE_ID;
}

function getOrCreateNamedApp(name: string, options: { projectId: string; storageBucket?: string }): App {
  const existing = getApps().find(app => app.name === name);
  if (existing) return existing;

  return initializeApp({
    credential: applicationDefault(),
    projectId: options.projectId,
    storageBucket: options.storageBucket,
  }, name);
}

export function initializeServerFirebase(config?: ServerFirebaseConfig | null): ServerFirebaseHandles {
  const projectId = resolveServerFirebaseProjectId(config);
  const databaseId = resolveServerFirestoreDatabaseId(config);
  const storageBucket = config?.storageBucket || `${projectId}.firebasestorage.app`;

  const adminApp = getOrCreateNamedApp('fieldtrip-admin', { projectId, storageBucket });
  const authApp = getOrCreateNamedApp('fieldtrip-auth', { projectId });
  const db = getFirestore(adminApp, databaseId);
  const auth = getAuth(authApp);
  const storage = getStorage(adminApp);

  return {
    adminApp,
    authApp,
    db,
    auth,
    storage,
    projectId,
    databaseId,
    storageBucket,
  };
}
