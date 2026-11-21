import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { powerHourLiveCopy, proofReviewDecisionCopy, proofSubmittedCopy, stickerAwardedCopy } from '../logic/playerNotifications';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

test('Q11: an approval notification names the mission and the awarded XP', () => {
  assert.deepEqual(
    proofReviewDecisionCopy({
      decision: 'approve',
      missionTitle: 'Find the Coolest Shadow',
      awardedXp: 75,
      adminNote: '',
    }),
    { title: 'Proof approved', detail: 'Find the Coolest Shadow · +75 XP' },
  );
});

test('Q11: a rejection notification names the mission and the admin note', () => {
  assert.deepEqual(
    proofReviewDecisionCopy({
      decision: 'reject',
      missionTitle: 'Find the Coolest Shadow',
      awardedXp: 0,
      adminNote: 'Photo shows the wrong street.',
    }),
    { title: 'Proof review closed', detail: 'Find the Coolest Shadow · Photo shows the wrong street.' },
  );
});

test('Q11: a request-info notification names the mission and what is needed', () => {
  assert.deepEqual(
    proofReviewDecisionCopy({
      decision: 'request_info',
      missionTitle: 'Find the Coolest Shadow',
      awardedXp: 0,
      adminNote: 'Need a closer photo of the shade.',
    }),
    { title: 'Proof needs another look', detail: 'Find the Coolest Shadow · Need a closer photo of the shade.' },
  );
});

test('Q11: missing admin notes fall back to plain copy, never an empty detail', () => {
  assert.deepEqual(
    proofReviewDecisionCopy({ decision: 'reject', missionTitle: 'X', awardedXp: 0, adminNote: '' }),
    { title: 'Proof review closed', detail: 'X · No note from the reviewer.' },
  );
  assert.deepEqual(
    proofReviewDecisionCopy({ decision: 'request_info', missionTitle: 'X', awardedXp: 0, adminNote: '   ' }),
    { title: 'Proof needs another look', detail: 'X · The reviewer asked for more proof.' },
  );
});

test('sticker awards: the copy names the sticker and its rarity', () => {
  // Nov 17, 2026: sticker awards write notification docs too, so the
  // Notifications section can list them after the toast is gone.
  assert.deepEqual(
    stickerAwardedCopy({ stickerName: 'Fresh Meat', stickerRarity: 'common' }),
    { title: 'Sticker unlocked', detail: 'Fresh Meat · common' },
  );
  assert.deepEqual(
    stickerAwardedCopy({ stickerName: 'Victory Flag', stickerRarity: null }),
    { title: 'Sticker unlocked', detail: 'Victory Flag' },
  );
});

test('sticker awards: the server writes the notification in the award transaction', () => {
  // Same-transaction write as the Q11 decision notification, but in the
  // sticker award store — the award and its notification land together.
  const store = read('src/server/stickerAwards.ts');
  assert.match(store, /\.collection\('notifications'\)\.doc\(\)/);
  for (const field of [
    "type: 'sticker_awarded'",
    'stickerId: sticker.id',
    'stickerName: sticker.name',
    'stickerRarity: sticker.rarity',
    'discoveryKey',
    'read: false',
    'createdAt: FieldValue.serverTimestamp()',
  ]) {
    assert.ok(store.includes(field), `sticker notification must carry ${field}`);
  }
  const writeAt = store.indexOf(".collection('notifications')");
  const ledgerAt = store.indexOf('tx.set(ledgerRef');
  assert.ok(writeAt > ledgerAt, 'notification is written in the award transaction, with the ledger row');
});

test('sticker awards: the client read maps the sticker shape, not a decision', () => {
  const service = read('src/services/playerNotificationService.ts');
  assert.match(service, /data\.type === 'sticker_awarded'/);
  assert.match(service, /stickerId: String\(data\.stickerId/);
  assert.match(service, /stickerName: String\(data\.stickerName/);
});

test('Q11: the server writes the notification in the decision transaction', () => {
  const server = read('server.ts');
  // Exactly four notification writes in the whole server: the decision
  // write inside the proof-review action handler, the shared
  // writeCrewPlayerNotification helper the crew clubhouse (Nov 20, 2026)
  // uses for comments, @-mentions, and member joins, the weekly-winner
  // write in runCanonicalWeeklyFinalize (Slice 3), and the voting-open
  // fan-out in notify-open-if-due (Slice 3). No second surface for
  // decisions, and no write on dry-run/repair paths (those never
  // reach this handler).
  const writes = server.match(/\.collection\('notifications'\)/g) || [];
  assert.equal(writes.length, 4, 'exactly four notifications writes in server.ts: decision, crew helper, weekly winner, voting-open fan-out');
  assert.ok(
    server.includes(".collection('users').doc(ownerId).collection('notifications').doc()"),
    'notification is written under the deciding player',
  );
  assert.ok(
    server.includes('async function writeCrewPlayerNotification(targetUid: string'),
    'crew notifications go through the shared helper, not ad-hoc writes',
  );
  assert.ok(
    server.includes(".collection('users').doc(ownerId).collection('notifications').doc()"),
    'notification is written under the deciding player',
  );
  const handler = server.slice(server.indexOf('/api/admin/proof-review/action'));
  const writeAt = handler.indexOf(".collection('notifications')");
  const adminLogAt = handler.indexOf('collection("adminLogs")');
  assert.ok(writeAt > adminLogAt, 'notification is written with the award/admin-log transaction');
  // The record carries every field the client and the audit doc specify.
  for (const field of [
    "type: 'proof_review_decision'",
    'decision: action',
    'status: nextStatus',
    'entryId: resolution.entryId',
    'reviewId: resolution.reviewId',
    'missionTitle:',
    "awardedXp: action === 'approve' ? Number(baseUpdate.awardedXP || 0) : 0",
    'adminNote: notes',
    'reviewerId',
    // Nov 17, 2026: an approval that applied the Afternoon Power Hour
    // multiplier records it, so the decision copy can say so.
    'powerHour: powerHourApplied',
    'powerHourMultiplier:',
    'read: false',
    'createdAt: now',
  ]) {
    assert.ok(handler.includes(field), `server notification must carry ${field}`);
  }
  assert.ok(
    handler.includes("scoringSnapshot.appliedBonusId === AFTERNOON_POWER_HOUR_ID"),
    'Power Hour is detected from the scoring snapshot bonus id',
  );
});

test('Q11: the player read path is wired from the service to Basecamp Notifications', () => {
  const service = read('src/services/playerNotificationService.ts');
  assert.ok(service.includes("collection(db, 'users', userId, 'notifications')"));
  assert.ok(service.includes("orderBy('createdAt', 'desc')"));
  const context = read('src/context/AppContext.tsx');
  assert.ok(context.includes('subscribeToPlayerNotifications(user.uid'));
  assert.ok(context.includes('notifications,'));
  const basecamp = read('src/pages/Basecamp.tsx');
  // Destructured from context, passed into the view model, and listed in
  // the useMemo deps — three mentions, not a dropped prop.
  assert.equal((basecamp.match(/notifications,/g) || []).length, 3);  const viewModel = read('src/logic/basecampViewModel.ts');
  assert.ok(viewModel.includes('notifications: readonly PlayerNotification[]'));
  assert.ok(viewModel.includes('proofReviewDecisionCopy(notification)'));
});

test('Q11: Firestore rules let the owner read their notifications, and nobody writes them from the client', () => {
  const rules = read('firestore.rules');
  const matchAt = rules.indexOf('match /notifications/{notificationId}');
  assert.ok(matchAt > -1, 'rules must have a notifications match under /users/{uId}');
  const block = rules.slice(matchAt, matchAt + 300);
  assert.ok(block.includes('allow read: if isSignedIn() && (uId == request.auth.uid || isAdmin())'));
  assert.ok(!block.includes('allow write'), 'no client write to notifications');
});

test('Notifications split: a submission notification names the mission and the wait', () => {
  // Nov 17, 2026: submissions write their own doc now, so the pending row
  // survives in Notifications.
  assert.deepEqual(
    proofSubmittedCopy({ missionTitle: 'Find the Coolest Shadow' }),
    { title: 'Proof submitted', detail: 'Find the Coolest Shadow · Waiting for review.' },
  );
  assert.deepEqual(
    proofSubmittedCopy({ missionTitle: '' }),
    { title: 'Proof submitted', detail: 'Field proof · Waiting for review.' },
  );
});

test('Notifications split: a Power Hour announcement names the window from the doc', () => {
  // Hours come from the doc (config-driven), never hardcoded in the copy.
  assert.deepEqual(
    powerHourLiveCopy({ endHourExclusive: 15, multiplier: 1.5 }),
    { title: 'Power Hour is live', detail: 'Start a mission before 3:00 PM for 1.5x XP.' },
  );
  assert.deepEqual(
    powerHourLiveCopy({ endHourExclusive: 17, multiplier: 2 }),
    { title: 'Power Hour is live', detail: 'Start a mission before 5:00 PM for 2x XP.' },
  );
});

test('Notifications split: an approval that applied Power Hour says so', () => {
  assert.deepEqual(
    proofReviewDecisionCopy({
      decision: 'approve',
      missionTitle: 'Find the Coolest Shadow',
      awardedXp: 112,
      adminNote: '',
      powerHour: true,
      powerHourMultiplier: 1.5,
    }),
    { title: 'Proof approved', detail: 'Find the Coolest Shadow · +112 XP · Power Hour 1.5x' },
  );
  // No Power Hour, no suffix — the old copy is unchanged.
  assert.deepEqual(
    proofReviewDecisionCopy({
      decision: 'approve',
      missionTitle: 'Find the Coolest Shadow',
      awardedXp: 75,
      adminNote: '',
    }),
    { title: 'Proof approved', detail: 'Find the Coolest Shadow · +75 XP' },
  );
});

test('Notifications split: the two new endpoints are registered in server.ts', () => {
  const server = read('server.ts');
  assert.ok(server.includes('"/api/entries/:id/notify-submitted"'), 'submission endpoint registered');
  assert.ok(server.includes('"/api/notifications/power-hour-live"'), 'power-hour endpoint registered');
  assert.ok(server.includes('createNotifySubmittedHandler'), 'submission handler wired');
  assert.ok(server.includes('createPowerHourLiveHandler'), 'power-hour handler wired');
  // Both sit behind the same auth + rate limiting as the other player
  // endpoints — the uid always comes from the token, never the body.
  for (const route of ['/api/entries/:id/notify-submitted', '/api/notifications/power-hour-live']) {
    const at = server.indexOf(route);
    const line = server.slice(at, at + 200);
    assert.ok(line.includes('authRateLimiter'), `${route} is rate-limited`);
    assert.ok(line.includes('authenticate'), `${route} requires auth`);
  }
});

test('Notifications split: the endpoint module writes both doc types with deterministic ids', () => {
  const endpoints = read('src/server/notificationEndpoints.ts');
  // Submission: one doc per entry, owner + pending checks first.
  assert.match(endpoints, /type: 'proof_submitted'/);
  assert.match(endpoints, /getProofSubmittedNotificationId\(entryId\)/);
  assert.ok(endpoints.includes("String(entry.status || '') !== 'pending_review'"));
  assert.ok(endpoints.includes("ownerId !== uid"));
  // Power Hour: one doc per day per timezone, server-verified window.
  assert.match(endpoints, /type: 'power_hour_live'/);
  assert.match(endpoints, /getPowerHourAnnouncementId\(localDate, timezone\)/);
  assert.ok(endpoints.includes('buildAfternoonPowerHourEligibility(now, timezone, config)'));
  assert.ok(endpoints.includes("local.localDate !== localDate"));
  // The doc id flattens the timezone: a raw IANA zone contains '/', and
  // a Firestore doc id cannot contain '/'.
  assert.ok(endpoints.includes("timezone.replaceAll('/', '_')"));
  for (const field of ['read: false', 'createdAt: FieldValue.serverTimestamp()']) {
    assert.ok(endpoints.includes(field), `endpoint docs must carry ${field}`);
  }
});

test('Q11: no push or email notification path was built', () => {
  const server = read('server.ts');
  assert.ok(!/sendPush|pushNotification|sendMail|sendEmail|nodemailer/i.test(server),
    'no push/email infra exists in the server, and none was added');
});
