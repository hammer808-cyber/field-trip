import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const submissionServiceSource = readFileSync('src/services/submissionService.ts', 'utf8');
const proofLifecycleSource = readFileSync('src/services/proofLifecycleService.ts', 'utf8');

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
});

test('review transition resolves proofReview aliases against a real entries document before mutation', () => {
  assert.match(proofLifecycleSource, /resolveCanonicalEntryForReviewAction/);
  assert.match(proofLifecycleSource, /ENTRY_NOT_RESOLVED/);
  assert.match(proofLifecycleSource, /databaseId: firebaseConfig\.firestoreDatabaseId/);
  assert.match(proofLifecycleSource, /resolvedFirestorePath: resolution\.entryPath/);
  assert.match(proofLifecycleSource, /collection\(db, 'proofReviews'\), where\('entryId', '==', canonicalEntryId\)/);
});
