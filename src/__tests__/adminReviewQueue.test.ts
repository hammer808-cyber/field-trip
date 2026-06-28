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
