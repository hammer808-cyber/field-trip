import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

test('drawn-card status: submitting a proof moves the card to pending_review', () => {
  // Nov 17, 2026: the DEX Missions list keys its Resume/Do-This-Mission
  // button off the drawn-card status, which never updated on submit — so
  // finished starters kept saying "Resume Mission" for proofs already sent.
  const context = read('src/context/AppContext.tsx');
  assert.match(
    context,
    /handleUpdateMissionCardStatus\(\s*currentTrip\.id,\s*status === 'approved' \? 'approved' : 'pending_review',?\s*\)/s,
  );
});

test('drawn-card status: the review decision moves the card to the decision', () => {
  // Same bug, approval side: the server review action writes the decision
  // to the drawn card in the same transaction as the award, so the DEX
  // list stops saying Resume the moment the proof is approved.
  const server = read('server.ts');
  const handler = server.slice(server.indexOf('/api/admin/proof-review/action'));
  assert.match(
    handler,
    /\.collection\('drawnMissionCards'\)\.doc\(challengeId\)/,
  );
  assert.match(
    handler,
    /\{ status: nextStatus, updatedAt: now \}/,
  );
});
