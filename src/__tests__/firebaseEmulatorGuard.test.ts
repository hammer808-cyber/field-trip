import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  assertSafeToSeedLocalEmulator,
  isLoopbackEmulatorTarget,
  isProductionLikeRuntime,
  LOCAL_EMULATOR_ADMIN_EMAIL,
  LOCAL_EMULATOR_INVITE_CODE,
  LOCAL_EMULATOR_PLAYER_EMAIL,
  parseEmulatorHostPort,
  shouldUseServerFirebaseEmulators,
} from '../server/firebaseEmulatorGuard';
import {
  getClientEmulatorTargets,
  shouldUseClientFirebaseEmulators,
} from '../lib/firebaseEmulators';

test('production-like runtimes never enable server emulators', () => {
  const hosts = {
    FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
    FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
    FIREBASE_STORAGE_EMULATOR_HOST: '127.0.0.1:9199',
  };

  assert.equal(shouldUseServerFirebaseEmulators({ ...hosts, NODE_ENV: 'production' }), false);
  assert.equal(shouldUseServerFirebaseEmulators({ ...hosts, K_SERVICE: 'fieldtrip' }), false);
  assert.equal(shouldUseServerFirebaseEmulators({ ...hosts, K_REVISION: 'fieldtrip-00001' }), false);
  assert.equal(shouldUseServerFirebaseEmulators({ ...hosts, FUNCTION_TARGET: 'api' }), false);
  assert.equal(isProductionLikeRuntime({ NODE_ENV: 'production' }), true);
});

test('server emulators require both Auth and Firestore loopback hosts', () => {
  assert.equal(shouldUseServerFirebaseEmulators({ NODE_ENV: 'development' }), false);
  assert.equal(shouldUseServerFirebaseEmulators({
    NODE_ENV: 'development',
    FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
  }), false);
  assert.equal(shouldUseServerFirebaseEmulators({
    NODE_ENV: 'development',
    FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
  }), false);
  assert.equal(shouldUseServerFirebaseEmulators({
    NODE_ENV: 'development',
    FIREBASE_AUTH_EMULATOR_HOST: 'auth.example.com:9099',
    FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
  }), false);
  assert.equal(shouldUseServerFirebaseEmulators({
    NODE_ENV: 'development',
    FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
    FIRESTORE_EMULATOR_HOST: '10.0.0.8:8080',
  }), false);
  assert.equal(shouldUseServerFirebaseEmulators({
    NODE_ENV: 'development',
    FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
    FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
  }), true);
  assert.equal(shouldUseServerFirebaseEmulators({
    NODE_ENV: 'development',
    FIREBASE_AUTH_EMULATOR_HOST: 'localhost:9099',
    FIRESTORE_EMULATOR_HOST: 'localhost:8080',
    FIREBASE_STORAGE_EMULATOR_HOST: '127.0.0.1:9199',
  }), true);
});

test('loopback host parsing rejects missing ports and remote hosts', () => {
  assert.deepEqual(parseEmulatorHostPort('127.0.0.1:9099'), { host: '127.0.0.1', port: 9099 });
  assert.equal(parseEmulatorHostPort('127.0.0.1'), null);
  assert.equal(isLoopbackEmulatorTarget('example.com:8080'), false);
  assert.equal(isLoopbackEmulatorTarget('http://localhost:8080'), true);
});

test('seed assertion refuses production and incomplete emulator env', () => {
  assert.throws(
    () => assertSafeToSeedLocalEmulator({ NODE_ENV: 'production', FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099', FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080' }),
    /LOCAL_EMULATOR_SEED_REFUSED/
  );
  assert.throws(
    () => assertSafeToSeedLocalEmulator({ NODE_ENV: 'development' }),
    /LOCAL_EMULATOR_SEED_REFUSED/
  );
  assert.doesNotThrow(() => assertSafeToSeedLocalEmulator({
    NODE_ENV: 'development',
    FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
    FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
  }));
});

test('client emulators require Vite DEV plus an explicit flag and fail closed in production builds', () => {
  assert.equal(shouldUseClientFirebaseEmulators({
    DEV: true,
    PROD: false,
    VITE_USE_FIREBASE_EMULATORS: 'true',
  }), true);
  assert.equal(shouldUseClientFirebaseEmulators({
    DEV: false,
    PROD: true,
    VITE_USE_FIREBASE_EMULATORS: 'true',
  }), false);
  assert.equal(shouldUseClientFirebaseEmulators({
    DEV: true,
    PROD: false,
    MODE: 'production',
    VITE_USE_FIREBASE_EMULATORS: 'true',
  }), false);
  assert.equal(shouldUseClientFirebaseEmulators({
    DEV: true,
    PROD: false,
    VITE_USE_FIREBASE_EMULATORS: 'false',
  }), false);
  assert.equal(shouldUseClientFirebaseEmulators({
    DEV: true,
    PROD: false,
  }), false);
});

test('client emulator targets refuse non-loopback hosts', () => {
  assert.equal(getClientEmulatorTargets({
    DEV: true,
    PROD: false,
    VITE_USE_FIREBASE_EMULATORS: 'true',
    VITE_FIRESTORE_EMULATOR_HOST: 'firestore.googleapis.com:443',
  }), null);
  assert.deepEqual(getClientEmulatorTargets({
    DEV: true,
    PROD: false,
    VITE_USE_FIREBASE_EMULATORS: 'true',
  }), {
    auth: { host: '127.0.0.1', port: 9099 },
    firestore: { host: '127.0.0.1', port: 8080 },
    storage: { host: '127.0.0.1', port: 9199 },
  });
});

test('local emulator invite fixtures are not wired into production auth UI', () => {
  const accessGate = readFileSync('src/pages/Auth/AccessCodeGate.tsx', 'utf8');
  const welcome = readFileSync('src/pages/Welcome.tsx', 'utf8');
  const signUp = readFileSync('src/pages/Auth/SignUp.tsx', 'utf8');
  const signIn = readFileSync('src/pages/Auth/SignIn.tsx', 'utf8');
  const combined = `${accessGate}\n${welcome}\n${signUp}\n${signIn}`;

  assert.doesNotMatch(combined, new RegExp(LOCAL_EMULATOR_INVITE_CODE));
  assert.doesNotMatch(combined, new RegExp(LOCAL_EMULATOR_PLAYER_EMAIL.replace('.', '\\.')));
  assert.doesNotMatch(combined, new RegExp(LOCAL_EMULATOR_ADMIN_EMAIL.replace('.', '\\.')));
});

test('server firebase admin uses emulator init without applicationDefault when gated on', () => {
  const adminSource = readFileSync('src/server/firebaseAdmin.ts', 'utf8');
  assert.match(adminSource, /shouldUseServerFirebaseEmulators/);
  const emulatorInit = adminSource.match(/if \(options\.useEmulators\) \{[\s\S]*?\n  \}/)?.[0] || '';
  assert.match(emulatorInit, /projectId: options\.projectId/);
  assert.doesNotMatch(emulatorInit, /applicationDefault/);
  assert.match(adminSource, /credential: applicationDefault\(\)/);
});

test('client firebase init connects emulators only through the DEV-gated helper', () => {
  const initSource = readFileSync('src/lib/firebaseInit.ts', 'utf8');
  assert.match(initSource, /getClientEmulatorTargets/);
  assert.match(initSource, /connectAuthEmulator/);
  assert.match(initSource, /connectFirestoreEmulator/);
  assert.match(initSource, /connectStorageEmulator/);
  assert.match(initSource, /clientEmulatorTargets/);
});
