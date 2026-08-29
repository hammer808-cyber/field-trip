/**
 * Emulator-only admin review helper.
 *
 * Signs in as the local emulator admin and calls the existing
 * /api/admin/proof-review/action route. Does not change production
 * review logic.
 *
 * Usage:
 *   npm run review:emulator -- list
 *   npm run review:emulator -- approve <entryId>
 *   npm run review:emulator -- needs-more <entryId>
 *   npm run review:emulator -- reject <entryId>
 */
import {
  assertSafeToSeedLocalEmulator,
  LOCAL_EMULATOR_ADMIN_EMAIL,
  LOCAL_EMULATOR_DEFAULTS,
} from '../src/server/firebaseEmulatorGuard';
import { initializeServerFirebase } from '../src/server/firebaseAdmin';
import firebaseConfig from '../firebase-applet-config.json';

const LOCAL_EMULATOR_ADMIN_PASSWORD = process.env.LOCAL_EMULATOR_ADMIN_PASSWORD || 'LocalAdmin1!';
const APP_URL = process.env.APP_URL || 'http://127.0.0.1:3000';

const DEFAULT_RUBRIC = {
  missionMatch: 3,
  proofClarity: 3,
  authenticity: 3,
  fieldNoteQuality: 2,
  fieldtripEnergy: 2,
};

function actionFromArg(raw: string): 'approve' | 'request_info' | 'reject' {
  if (raw === 'approve') return 'approve';
  if (raw === 'needs-more' || raw === 'request_info') return 'request_info';
  if (raw === 'reject') return 'reject';
  throw new Error(`Unknown action "${raw}". Use list | approve | needs-more | reject`);
}

async function signInEmulatorAdmin(): Promise<string> {
  const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST || `${LOCAL_EMULATOR_DEFAULTS.authHost}:${LOCAL_EMULATOR_DEFAULTS.authPort}`;
  const url = `http://${authHost.replace(/^https?:\/\//, '')}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(firebaseConfig.apiKey)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: LOCAL_EMULATOR_ADMIN_EMAIL,
      password: LOCAL_EMULATOR_ADMIN_PASSWORD,
      returnSecureToken: true,
    }),
  });
  const payload = await response.json() as { idToken?: string; error?: { message?: string } };
  if (!response.ok || !payload.idToken) {
    throw new Error(`Emulator admin sign-in failed: ${payload.error?.message || response.status}`);
  }
  return payload.idToken;
}

async function listPending() {
  const { db } = initializeServerFirebase();
  const snap = await db.collection('entries').limit(100).get();
  const rows = snap.docs.map((docSnap) => {
    const data = docSnap.data() || {};
    return {
      entryId: docSnap.id,
      status: data.status || data.reviewStatus || null,
      missionId: data.missionId || data.challengeId || data.tripId || null,
      userId: data.userId || data.uid || null,
    };
  });
  console.log(JSON.stringify({ count: rows.length, entries: rows }, null, 2));
}

async function review(actionArg: string, entryId: string) {
  const action = actionFromArg(actionArg);
  const idToken = await signInEmulatorAdmin();
  const response = await fetch(`${APP_URL}/api/admin/proof-review/action`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      entryId,
      submissionId: entryId,
      action,
      notes: `local emulator ${action}`,
      metadata: { rubric: DEFAULT_RUBRIC },
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Review action failed (${response.status}): ${JSON.stringify(payload)}`);
  }
  console.log(JSON.stringify({ ok: true, action, entryId, payload }, null, 2));
}

async function main() {
  assertSafeToSeedLocalEmulator(process.env);
  const [command, entryId] = process.argv.slice(2);
  if (!command || command === 'list') {
    await listPending();
    return;
  }
  if (!entryId) throw new Error('entryId is required for review actions');
  await review(command, entryId);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
