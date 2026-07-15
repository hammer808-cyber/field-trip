import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createQueueRepairReport } from '../services/proofLifecycleService';

const submissionServiceSource = readFileSync('src/services/submissionService.ts', 'utf8');
const proofLifecycleSource = readFileSync('src/services/proofLifecycleService.ts', 'utf8');
const serverSource = readFileSync('server.ts', 'utf8');

test('admin review queue normalizes status variants instead of querying one raw status', () => {
  const queueStart = submissionServiceSource.indexOf('export function subscribeToAdminPendingReviews');
  const queueSource = submissionServiceSource.slice(queueStart);

  assert.match(proofLifecycleSource, /'submitted_pending_review'/);
  assert.match(proofLifecycleSource, /'needs-more-proof'/);
  assert.doesNotMatch(queueSource, /where\('status',\s*'==',\s*statusFilter\)/);
  assert.match(queueSource, /normalizeProofStatus\(\(e as any\)\.status \|\| \(e as any\)\.reviewStatus\)/);
});

test('admin review actions require a resolved canonical entryId before buttons can run', () => {
  const adminProofReviewSource = readFileSync('src/pages/AdminProofReview.tsx', 'utf8');

  assert.match(submissionServiceSource, /collectReviewEntryAliases/);
  assert.match(submissionServiceSource, /canonicalEntryResolved/);
  assert.match(submissionServiceSource, /missing_source_entry/);
  assert.match(adminProofReviewSource, /Missing source entry/);
  assert.match(adminProofReviewSource, /record\?\.idAliases/);
  assert.doesNotMatch(adminProofReviewSource, /onAction\(e\.entryId \|\| e\.submissionId \|\| e\.id/);
  assert.match(adminProofReviewSource, /selectedQueueEntry/);
  assert.match(adminProofReviewSource, /Score/);
  assert.doesNotMatch(adminProofReviewSource, /onAction\(actionId,\s*'approve'\)/);
});

test('review transition delegates canonical entry resolution and mutation to the server', () => {
  const transitionStart = proofLifecycleSource.indexOf('export async function transitionProofReview');
  const transitionEnd = proofLifecycleSource.indexOf('export async function repairCanonicalProofQueue', transitionStart);
  const transitionSource = proofLifecycleSource.slice(transitionStart, transitionEnd);

  assert.match(transitionSource, /authenticatedFetch\('\/api\/admin\/proof-review\/action'/);
  assert.match(transitionSource, /entryId: submissionId/);
  assert.match(transitionSource, /submissionId/);
  assert.doesNotMatch(transitionSource, /runTransaction\(/);
  assert.match(serverSource, /resolveBackendReviewEntry/);
  assert.match(serverSource, /resolvedFirestorePath: resolution\.entryPath/);
});

test('admin review decisions are sent through a server-authorized canonical entry action', () => {
  const adminActionRouteStart = serverSource.indexOf('app.post("/api/admin/proof-review/action"');
  assert.notEqual(adminActionRouteStart, -1);
  const adminActionRoute = serverSource.slice(adminActionRouteStart, serverSource.indexOf('app.post("/api/admin/grant-starter-bypass"', adminActionRouteStart));

  assert.match(submissionServiceSource, /authenticatedFetch\('\/api\/admin\/proof-review\/action'/);
  assert.match(submissionServiceSource, /submitAdminProofReviewAction/);
  assert.match(adminActionRoute, /await requireAdminUser\(req\)/);
  assert.match(adminActionRoute, /resolveBackendReviewEntry/);
  assert.match(adminActionRoute, /FIELDTRIP_FIRESTORE_DATABASE_ID/);
  assert.match(adminActionRoute, /awardTrustedXpInTransaction/);
  assert.match(adminActionRoute, /ledgerEventId: `score_\$\{resolution\.entryId\}`/);
  assert.match(adminActionRoute, /reviewRefs\.forEach/);
  assert.match(adminActionRoute, /adminLogs/);
  assert.doesNotMatch(submissionServiceSource, /logAdminAction\(auth\.currentUser\.uid, submissionId, 'proofReview'/);
});

test('canonical queue repair reports have a stable dry-run and live-repair shape', () => {
  assert.deepEqual(createQueueRepairReport(), {
    dryRun: true,
    scannedEntries: 0,
    scannedProofReviews: 0,
    repairedEntries: [],
    ambiguousRecords: [],
    orphanProofReviews: [],
  });

  const liveReport = createQueueRepairReport(false);
  assert.equal(liveReport.dryRun, false);
  assert.deepEqual(Object.keys(liveReport).sort(), [
    'ambiguousRecords',
    'dryRun',
    'orphanProofReviews',
    'repairedEntries',
    'scannedEntries',
    'scannedProofReviews',
  ]);
});
