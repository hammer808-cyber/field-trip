/**
 * Browser-only Firebase emulator gating.
 *
 * Production Vite builds set import.meta.env.DEV to false and
 * import.meta.env.PROD to true. Both must fail closed so a misplaced
 * VITE_USE_FIREBASE_EMULATORS flag cannot activate emulators in a
 * production bundle.
 */

export type ClientViteEnv = {
  DEV?: boolean;
  PROD?: boolean;
  MODE?: string;
  VITE_USE_FIREBASE_EMULATORS?: string;
  VITE_FIREBASE_AUTH_EMULATOR_HOST?: string;
  VITE_FIRESTORE_EMULATOR_HOST?: string;
  VITE_FIREBASE_STORAGE_EMULATOR_HOST?: string;
};

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost']);

export function parseClientEmulatorHostPort(value: string | undefined, fallbackPort: number): { host: string; port: number } | null {
  const raw = String(value || '').trim();
  if (!raw) return { host: '127.0.0.1', port: fallbackPort };
  const withoutProtocol = raw.replace(/^https?:\/\//i, '');
  const [host, portText] = withoutProtocol.split(':');
  const port = portText ? Number(portText) : fallbackPort;
  if (!host || !Number.isInteger(port) || port <= 0) return null;
  if (!LOOPBACK_HOSTS.has(host)) return null;
  return { host, port };
}

export function shouldUseClientFirebaseEmulators(env: ClientViteEnv): boolean {
  if (env.PROD === true) return false;
  if (env.DEV !== true) return false;
  if (env.MODE === 'production') return false;
  return env.VITE_USE_FIREBASE_EMULATORS === 'true';
}

export function getClientEmulatorTargets(env: ClientViteEnv) {
  if (!shouldUseClientFirebaseEmulators(env)) return null;
  const auth = parseClientEmulatorHostPort(env.VITE_FIREBASE_AUTH_EMULATOR_HOST, 9099);
  const firestore = parseClientEmulatorHostPort(env.VITE_FIRESTORE_EMULATOR_HOST, 8080);
  const storage = parseClientEmulatorHostPort(env.VITE_FIREBASE_STORAGE_EMULATOR_HOST, 9199);
  if (!auth || !firestore || !storage) return null;
  return { auth, firestore, storage };
}
