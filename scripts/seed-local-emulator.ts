/**
 * Seeds the local Firebase emulators with the minimum canonical state for a
 * brand-new normal player: a valid invite code, app config, starter missions,
 * public decks, and a separate emulator-only admin used for review actions.
 *
 * Refuses to run unless loopback emulator hosts are set and the runtime is
 * not production/Cloud Run. Never writes to production Firebase.
 *
 * Usage (from repo root, after emulators are up):
 *   FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
 *   FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199 \
 *   npm run seed:emulator
 */
import { Timestamp } from 'firebase-admin/firestore';
import {
  assertSafeToSeedLocalEmulator,
  LOCAL_EMULATOR_ADMIN_EMAIL,
  LOCAL_EMULATOR_DEFAULTS,
  LOCAL_EMULATOR_INVITE_CODE,
} from '../src/server/firebaseEmulatorGuard';
import { initializeServerFirebase } from '../src/server/firebaseAdmin';
import { STARTER_MISSION_BANK } from '../src/data/starterMissionBank';
import { DECK_PACKS } from '../src/data/deckPacks';
import { DEFAULT_MISSION_SCORING_CONFIG } from '../src/logic/missionScoring';

function compact<T extends Record<string, unknown>>(value: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}

const LOCAL_EMULATOR_ADMIN_PASSWORD = process.env.LOCAL_EMULATOR_ADMIN_PASSWORD || 'LocalAdmin1!';

const SOCIAL_FIXTURES = [
  { email: 'social-b@emulator.test', username: 'socialb', name: 'Bravo Unrelated', fieldTypeName: 'The Gobbler' },
  { email: 'social-c@emulator.test', username: 'socialc', name: 'Charlie Crew', fieldTypeName: 'Mall Rat' },
  { email: 'social-d@emulator.test', username: 'sociald', name: 'Delta Incoming', fieldTypeName: 'Lost Camper' },
  { email: 'social-e@emulator.test', username: 'sociale', name: 'Echo Blocked', fieldTypeName: 'Bigfoot' },
] as const;

async function upsertEmulatorPlayer(
  auth: ReturnType<typeof initializeServerFirebase>['auth'],
  db: ReturnType<typeof initializeServerFirebase>['db'],
  spec: { email: string; username: string; name: string; fieldTypeName: string },
  now: Timestamp,
) {
  const password = process.env.LOCAL_EMULATOR_PLAYER_PASSWORD || 'LocalPlayer1!';
  let uid = '';
  try {
    const existing = await auth.getUserByEmail(spec.email);
    await auth.updateUser(existing.uid, { password, emailVerified: true, disabled: false, displayName: spec.name });
    uid = existing.uid;
  } catch (error: any) {
    if (error?.code !== 'auth/user-not-found') throw error;
    const created = await auth.createUser({
      email: spec.email,
      password,
      emailVerified: true,
      displayName: spec.name,
      disabled: false,
    });
    uid = created.uid;
  }

  await db.doc(`users/${uid}`).set({
    id: uid,
    name: spec.name,
    displayName: spec.name,
    username: spec.username,
    email: spec.email,
    role: 'player',
    isAdmin: false,
    accessStatus: 'approved',
    onboardingCompleted: true,
    fieldClassificationComplete: true,
    fieldTypeName: spec.fieldTypeName,
    level: 2,
    levelTitle: 'Person of Mild Interest',
    xp: spec.username === 'socialc' ? 80 : 25,
    weeklyXp: 10,
    feedVisibility: 'crew_only',
    preferences: { feedVisibility: 'crew_only', showOnBigBoard: true },
    localEmulatorOnly: true,
    createdAt: now,
    updatedAt: now,
  }, { merge: true });
  await db.doc(`usernames/${spec.username}`).set({
    userId: uid,
    createdAt: now,
  });
  await db.doc(`entries/${spec.username}-private-receipt`).set({
    userId: uid,
    uid,
    status: 'approved',
    feedVisibility: 'crew_only',
    photoUrl: 'https://example.com/emulator-proof.jpg',
    displayName: spec.name,
    username: spec.username,
    approvedAt: now,
    createdAt: now,
    fieldNote: `${spec.name} private Crew receipt`,
    localEmulatorOnly: true,
  });
  return uid;
}

async function assertEmulatorHubReachable() {
  const hub = process.env.FIREBASE_EMULATOR_HUB || `${LOCAL_EMULATOR_DEFAULTS.hubHost}:${LOCAL_EMULATOR_DEFAULTS.hubPort}`;
  const url = `http://${hub.replace(/^https?:\/\//, '')}/emulators`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`LOCAL_EMULATOR_SEED_REFUSED: emulator hub not reachable at ${url}`);
  }
  const payload = await response.json() as { hub?: unknown };
  if (!payload?.hub) {
    throw new Error('LOCAL_EMULATOR_SEED_REFUSED: emulator hub response missing hub metadata.');
  }
}

async function upsertAdminUser(auth: ReturnType<typeof initializeServerFirebase>['auth']) {
  try {
    const existing = await auth.getUserByEmail(LOCAL_EMULATOR_ADMIN_EMAIL);
    await auth.updateUser(existing.uid, {
      password: LOCAL_EMULATOR_ADMIN_PASSWORD,
      emailVerified: true,
      disabled: false,
    });
    return existing.uid;
  } catch (error: any) {
    if (error?.code !== 'auth/user-not-found') throw error;
    const created = await auth.createUser({
      email: LOCAL_EMULATOR_ADMIN_EMAIL,
      password: LOCAL_EMULATOR_ADMIN_PASSWORD,
      emailVerified: true,
      displayName: 'Emulator Admin',
      disabled: false,
    });
    return created.uid;
  }
}

async function main() {
  assertSafeToSeedLocalEmulator(process.env);
  await assertEmulatorHubReachable();

  const handles = initializeServerFirebase();
  const { db, auth } = handles;
  const now = Timestamp.now();

  await db.doc('_emulator_marker/local').set({
    localOnly: true,
    purpose: 'fieldtrip-authenticated-local-testing',
    createdAt: now,
  });

  await db.doc(`accessCodes/${LOCAL_EMULATOR_INVITE_CODE}`).set({
    active: true,
    maxUses: 1000,
    uses: 0,
    currentUses: 0,
    label: 'Local emulator player invite',
    description: 'Development-only invite for authenticated local testing. Not valid in production.',
    createdAt: now,
  });

  await db.doc('appConfig/global').set({
    maintenanceMode: false,
    proofChecksEnabled: true,
    uploadsEnabled: true,
    leaderboardLiveUpdatesEnabled: false,
    maxDailyProofChecksPerUser: 50,
    maxDailyUploadsPerUser: 100,
    betaMode: true,
    aiImageAnalysisEnabled: false,
    aiCostGuardEnabled: true,
    maxDailyAiScansPerUser: 5,
    maxAiScansPerProof: 1,
    maxAiRetriesPerProof: 1,
    maxGlobalAiScansPerDay: 500,
  }, { merge: true });

  await db.doc('appConfig/game').set({
    activeSeasonId: 'heatwave-receipts',
    activeStarterDeckId: 'starter-signals',
    onboardingEntriesRequired: 3,
    scoring: DEFAULT_MISSION_SCORING_CONFIG,
    featureFlags: {
      fieldSignalsEnabled: true,
      badgeFragmentsEnabled: true,
      crewArtifactsEnabled: true,
      rivalMomentsEnabled: true,
      appObservationsEnabled: true,
      crewDispatchEnabled: true,
      proofFinderEnabled: true,
      skinsEnabled: true,
      fieldTypeEffectsEnabled: true,
      fieldGuideAssistEnabled: true,
      tribunalEnabled: false,
    },
  }, { merge: true });

  await db.doc('appConfig/main').set({
    weeklyVoting: { maxVotesPerVoter: 3 },
    voting: { maxVotesPerVoter: 3 },
  }, { merge: true });

  await db.doc('seasons/heatwave-receipts').set({
    id: 'heatwave-receipts',
    title: 'HEATWAVE_RECEIPTS',
    description: 'Heatwave Receipts: A Summer Fieldtrip Deck',
    status: 'active',
    startDate: Timestamp.fromDate(new Date('2026-06-06')),
    endDate: Timestamp.fromDate(new Date('2026-09-06')),
    weeks: Array.from({ length: 14 }).map((_, i) => {
      const week = i + 1;
      return {
        number: week,
        startDate: Timestamp.fromDate(new Date(new Date('2026-06-06').getTime() + i * 7 * 24 * 60 * 60 * 1000)),
        fieldChallengeId: `ss26_w${week}_field`,
        evidenceChallengeId: `ss26_w${week}_evidence`,
        crewChallengeId: `ss26_w${week}_crew`,
        chaosCardIds: [`chaos-${week}`],
        sabotageCardIds: [`sabotage-${Math.floor(i / 3) + 1}`],
      };
    }),
    createdAt: now,
  }, { merge: true });

  for (const mission of STARTER_MISSION_BANK) {
    if (!mission.id) continue;
    await db.doc(`challenges/${mission.id}`).set(compact({
      ...mission,
      missionId: mission.id,
      challengeId: mission.id,
      deckId: 'starter-signals',
      status: 'active',
      active: true,
      isActive: true,
      hidden: false,
      isHidden: false,
      visibility: 'public',
      presentInMissionBank: true,
      isStarter: true,
      updatedAt: now,
    }), { merge: true });
  }

  for (const pack of DECK_PACKS) {
    const id = pack.packId || pack.id;
    if (!id) continue;
    await db.doc(`decks/${id}`).set(compact({
      id,
      packId: id,
      packName: pack.packName || pack.title || id,
      title: pack.title || pack.packName || id,
      description: pack.description || '',
      visibility: 'public',
      isActive: pack.isActive !== false,
      isStarter: pack.isStarter === true,
      unlockRule: pack.unlockRule || 'immediate',
      missionIds: pack.missionIds || [],
      updatedAt: now,
    }), { merge: true });
  }

  const adminUid = await upsertAdminUser(auth);
  await db.doc(`admins/${adminUid}`).set({
    role: 'admin',
    email: LOCAL_EMULATOR_ADMIN_EMAIL,
    localEmulatorOnly: true,
    createdAt: now,
  }, { merge: true });
  await db.doc(`users/${adminUid}`).set({
    id: adminUid,
    name: 'emulator_admin',
    email: LOCAL_EMULATOR_ADMIN_EMAIL,
    role: 'admin',
    isAdmin: true,
    accessStatus: 'approved',
    onboardingCompleted: true,
    fieldClassificationComplete: true,
    hasConfirmedLegal: true,
    points: 0,
    xp: 0,
    soloTripsCount: 0,
    createdAt: now,
    updatedAt: now,
  }, { merge: true });

  const socialUids: Record<string, string> = {};
  for (const fixture of SOCIAL_FIXTURES) {
    socialUids[fixture.username] = await upsertEmulatorPlayer(auth, db, fixture, now);
  }
  await db.doc(`entries/socialc-public-receipt`).set({
    userId: socialUids.socialc,
    uid: socialUids.socialc,
    status: 'approved',
    feedVisibility: 'public_discovery',
    photoUrl: 'https://example.com/emulator-public.jpg',
    displayName: 'Charlie Crew',
    username: 'socialc',
    approvedAt: now,
    createdAt: now,
    fieldNote: 'Explicit public discovery receipt',
    localEmulatorOnly: true,
  });

  const codeSnap = await db.doc(`accessCodes/${LOCAL_EMULATOR_INVITE_CODE}`).get();
  if (!codeSnap.exists) {
    throw new Error('LOCAL_EMULATOR_SEED_FAILED: invite code was not written.');
  }

  console.log(JSON.stringify({
    ok: true,
    usingEmulators: true,
    projectId: handles.projectId,
    databaseId: handles.databaseId,
    inviteCode: LOCAL_EMULATOR_INVITE_CODE,
    adminEmail: LOCAL_EMULATOR_ADMIN_EMAIL,
    playerNotSeeded: true,
    playerShouldSignUpThroughUi: true,
    socialFixtures: SOCIAL_FIXTURES.map(fixture => fixture.email),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
