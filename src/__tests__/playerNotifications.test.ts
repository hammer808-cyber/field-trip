import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { proofReviewDecisionCopy } from '../logic/playerNotifications';

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

test('Q11: the server writes the notification in the decision transaction', () => {
  const server = read('server.ts');
  // Exactly one notification write in the whole server, inside the
  // proof-review action handler — no second surface, no write on
  // dry-run/repair paths (those never reach this handler).
  const writes = server.match(/\.collection\('notifications'\)/g) || [];
  assert.equal(writes.length, 1, 'exactly one notifications write in server.ts');
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
    'read: false',
    'createdAt: now',
  ]) {
    assert.ok(handler.includes(field), `server notification must carry ${field}`);
  }
});

test('Q11: the player read path is wired from the service to Basecamp Updates', () => {
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
  // The notification replaces the generic entry row for the same entry —
  // a decision shows once in the 5-row feed, with its XP and note.
  assert.ok(viewModel.includes('notifiedEntryIds.has(entry.entryId || entry.id)'));
});

test('Q11: Firestore rules let the owner read their notifications, and nobody writes them from the client', () => {
  const rules = read('firestore.rules');
  const matchAt = rules.indexOf('match /notifications/{notificationId}');
  assert.ok(matchAt > -1, 'rules must have a notifications match under /users/{uId}');
  const block = rules.slice(matchAt, matchAt + 300);
  assert.ok(block.includes('allow read: if isSignedIn() && (uId == request.auth.uid || isAdmin())'));
  assert.ok(!block.includes('allow write'), 'no client write to notifications');
});

test('Q11: no push or email notification path was built', () => {
  const server = read('server.ts');
  assert.ok(!/sendPush|pushNotification|sendMail|sendEmail|nodemailer/i.test(server),
    'no push/email infra exists in the server, and none was added');
});
