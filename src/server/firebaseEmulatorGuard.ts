/**
 * Local Firebase emulator gating.
 *
 * This module is the only server-side switch that may point Fieldtrip at
 * Auth/Firestore/Storage emulators. Production and Cloud Run must never
 * take that path, even if emulator host environment variables are present.
 */

export const LOCAL_EMULATOR_INVITE_CODE = 'LOCAL-DEV-PLAYER';
export const LOCAL_EMULATOR_PLAYER_EMAIL = 'local-player@emulator.test';
export const LOCAL_EMULATOR_ADMIN_EMAIL = 'emulator-admin@localhost';

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost']);

export type EmulatorEnv = Record<string, string | undefined>;

export function isProductionLikeRuntime(env: EmulatorEnv = process.env): boolean {
  if (env.NODE_ENV === 'production') return true;
  if (env.K_SERVICE) return true;
  if (env.K_REVISION) return true;
  if (env.K_CONFIGURATION) return true;
  if (env.FUNCTION_TARGET) return true;
  if (env.FUNCTION_NAME) return true;
  return false;
}

export function parseEmulatorHostPort(value: string | undefined): { host: string; port: number } | null {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const withoutProtocol = raw.replace(/^https?:\/\//i, '');
  const [host, portText] = withoutProtocol.split(':');
  const port = Number(portText);
  if (!host || !Number.isInteger(port) || port <= 0) return null;
  return { host, port };
}

export function isLoopbackEmulatorTarget(value: string | undefined): boolean {
  const parsed = parseEmulatorHostPort(value);
  return Boolean(parsed && LOOPBACK_HOSTS.has(parsed.host));
}

export function shouldUseServerFirebaseEmulators(env: EmulatorEnv = process.env): boolean {
  if (isProductionLikeRuntime(env)) return false;
  if (!isLoopbackEmulatorTarget(env.FIREBASE_AUTH_EMULATOR_HOST)) return false;
  if (!isLoopbackEmulatorTarget(env.FIRESTORE_EMULATOR_HOST)) return false;
  if (env.FIREBASE_STORAGE_EMULATOR_HOST && !isLoopbackEmulatorTarget(env.FIREBASE_STORAGE_EMULATOR_HOST)) {
    return false;
  }
  return true;
}

export function assertSafeToSeedLocalEmulator(env: EmulatorEnv = process.env): void {
  if (isProductionLikeRuntime(env)) {
    throw new Error('LOCAL_EMULATOR_SEED_REFUSED: production-like runtime.');
  }
  if (!shouldUseServerFirebaseEmulators(env)) {
    throw new Error(
      'LOCAL_EMULATOR_SEED_REFUSED: Auth and Firestore emulator hosts must be loopback and set (FIREBASE_AUTH_EMULATOR_HOST, FIRESTORE_EMULATOR_HOST).'
    );
  }
}

export const LOCAL_EMULATOR_DEFAULTS = {
  authHost: '127.0.0.1',
  authPort: 9099,
  firestoreHost: '127.0.0.1',
  firestorePort: 8080,
  storageHost: '127.0.0.1',
  storagePort: 9199,
  hubHost: '127.0.0.1',
  hubPort: 4400,
} as const;
