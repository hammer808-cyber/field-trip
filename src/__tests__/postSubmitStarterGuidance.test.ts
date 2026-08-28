import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPostSubmitStarterGuidance } from '../logic/postSubmitStarterGuidance';
import type { StarterCompletionState } from '../utils/starterHelper';

function starterFixture(
  overrides: Partial<StarterCompletionState> = {}
): StarterCompletionState {
  return {
    starterApprovedCount: 0,
    starterRequiredCount: 3,
    starterComplete: false,
    pendingStarterCount: 0,
    retryStarterCount: 0,
    needsMoreProofStarterCount: 0,
    submittedUniqueCount: 0,
    submittedMissionIds: [],
    needsMoreProofMissionId: null,
    needsMoreProofEntryId: null,
    rejectedMissionId: null,
    rejectedEntryId: null,
    nextStarterAction: 'Draw Starter Mission',
    status: 'NOT_STARTED',
    ...overrides,
  };
}

test('1/3 pending shows in-progress sent wording and draw-next CTA', () => {
  const guidance = buildPostSubmitStarterGuidance({
    starter: starterFixture({
      status: 'IN_PROGRESS',
      pendingStarterCount: 1,
      submittedUniqueCount: 1,
      submittedMissionIds: ['starter-1'],
    }),
    currentMissionId: 'starter-1',
    reviewStatus: 'pending_review',
  });

  assert.equal(guidance.status, 'IN_PROGRESS');
  assert.equal(guidance.progressLine, 'Starter proof 1 of 3 sent');
  assert.equal(guidance.statusLine, 'Your proof is waiting for review.');
  assert.equal(guidance.primaryHref, '/missions');
  assert.equal(guidance.primaryLabel, 'Draw Next Mission →');
  assert.doesNotMatch(guidance.progressLine || '', /complete/i);
});

test('3/3 pending shows waiting-for-review and proof-status destination', () => {
  const guidance = buildPostSubmitStarterGuidance({
    starter: starterFixture({
      status: 'PENDING_REVIEW',
      pendingStarterCount: 3,
      submittedUniqueCount: 3,
      submittedMissionIds: ['starter-1', 'starter-2', 'starter-3'],
      nextStarterAction: 'View Review Status',
    }),
    currentMissionId: 'starter-3',
    reviewStatus: 'pending_review',
  });

  assert.equal(guidance.status, 'PENDING_REVIEW');
  assert.equal(guidance.progressLine, 'Starter proof 3 of 3 sent');
  assert.equal(guidance.statusLine, 'Your proof is waiting for review.');
  assert.equal(guidance.primaryHref, '/profile?tab=logbook');
  assert.equal(guidance.primaryLabel, 'View proof status');
  assert.doesNotMatch(guidance.progressLine || '', /complete/i);
});

test('2 approved + 1 needs more proof prioritizes repair over waiting for review', () => {
  const guidance = buildPostSubmitStarterGuidance({
    starter: starterFixture({
      status: 'NEEDS_MORE_PROOF',
      starterApprovedCount: 2,
      pendingStarterCount: 0,
      needsMoreProofStarterCount: 1,
      submittedUniqueCount: 3,
      submittedMissionIds: ['starter-1', 'starter-2', 'starter-3'],
      needsMoreProofMissionId: 'starter-3',
    }),
    currentMissionId: 'starter-1',
    reviewStatus: 'approved',
  });

  assert.equal(guidance.status, 'NEEDS_MORE_PROOF');
  assert.match(guidance.progressLine || '', /Starter proof 3 of 3 sent/);
  assert.match(guidance.statusLine, /needs a clearer photo/i);
  assert.equal(guidance.primaryHref, '/capture?id=starter-3');
  assert.equal(guidance.primaryLabel, 'Add More Proof →');
  assert.notEqual(guidance.primaryHref, '/profile?tab=logbook');
  assert.doesNotMatch(guidance.statusLine, /waiting for review/i);
  assert.doesNotMatch(guidance.progressLine || '', /complete/i);
});

test('2 approved + 1 rejected prioritizes retry over waiting for review', () => {
  const guidance = buildPostSubmitStarterGuidance({
    starter: starterFixture({
      status: 'REJECTED_RETRY_AVAILABLE',
      starterApprovedCount: 2,
      retryStarterCount: 1,
      submittedUniqueCount: 3,
      submittedMissionIds: ['starter-1', 'starter-2', 'starter-3'],
      rejectedMissionId: 'starter-2',
    }),
    currentMissionId: 'starter-1',
    reviewStatus: 'approved',
  });

  assert.equal(guidance.status, 'REJECTED_RETRY_AVAILABLE');
  assert.match(guidance.progressLine || '', /Starter proof 3 of 3 sent/);
  assert.match(guidance.statusLine, /rejected/i);
  assert.equal(guidance.primaryHref, '/capture?id=starter-2');
  assert.equal(guidance.primaryLabel, 'Retry Mission →');
  assert.notEqual(guidance.primaryHref, '/profile?tab=logbook');
  assert.doesNotMatch(guidance.statusLine, /waiting for review/i);
});

test('3 approved / Starter complete reserves complete wording and draw-next CTA', () => {
  const guidance = buildPostSubmitStarterGuidance({
    starter: starterFixture({
      status: 'COMPLETE',
      starterComplete: true,
      starterApprovedCount: 3,
      submittedUniqueCount: 3,
      submittedMissionIds: ['starter-1', 'starter-2', 'starter-3'],
    }),
    currentMissionId: 'starter-3',
    reviewStatus: 'approved',
  });

  assert.equal(guidance.status, 'COMPLETE');
  assert.equal(guidance.progressLine, 'Starter complete');
  assert.equal(guidance.primaryHref, '/missions');
  assert.equal(guidance.primaryLabel, 'Draw Next Mission →');
});

test('optimistic pending count fills lagging submitted count for in-progress only', () => {
  const guidance = buildPostSubmitStarterGuidance({
    starter: starterFixture({
      status: 'IN_PROGRESS',
      pendingStarterCount: 1,
      submittedUniqueCount: 1,
      submittedMissionIds: ['starter-1'],
    }),
    currentMissionId: 'starter-2',
    reviewStatus: 'pending_review',
  });

  assert.equal(guidance.status, 'IN_PROGRESS');
  assert.equal(guidance.progressLine, 'Starter proof 2 of 3 sent');
  assert.equal(guidance.primaryLabel, 'Draw Next Mission →');
});

test('optimistic third pending becomes waiting-for-review without inventing complete', () => {
  const guidance = buildPostSubmitStarterGuidance({
    starter: starterFixture({
      status: 'IN_PROGRESS',
      pendingStarterCount: 2,
      submittedUniqueCount: 2,
      submittedMissionIds: ['starter-1', 'starter-2'],
    }),
    currentMissionId: 'starter-3',
    reviewStatus: 'pending_review',
  });

  assert.equal(guidance.status, 'PENDING_REVIEW');
  assert.equal(guidance.progressLine, 'Starter proof 3 of 3 sent');
  assert.equal(guidance.primaryHref, '/profile?tab=logbook');
  assert.doesNotMatch(guidance.progressLine || '', /complete/i);
});

test('optimistic submitted count does not override an existing needs-more-proof state', () => {
  const guidance = buildPostSubmitStarterGuidance({
    starter: starterFixture({
      status: 'NEEDS_MORE_PROOF',
      starterApprovedCount: 2,
      needsMoreProofStarterCount: 1,
      submittedUniqueCount: 3,
      submittedMissionIds: ['starter-1', 'starter-2', 'starter-3'],
      needsMoreProofMissionId: 'starter-3',
    }),
    currentMissionId: 'starter-1',
    reviewStatus: 'pending_review',
  });

  assert.equal(guidance.status, 'NEEDS_MORE_PROOF');
  assert.equal(guidance.primaryLabel, 'Add More Proof →');
  assert.equal(guidance.primaryHref, '/capture?id=starter-3');
});

test('re-submitting the needs-more-proof mission itself can optimistically leave repair state', () => {
  const guidance = buildPostSubmitStarterGuidance({
    starter: starterFixture({
      status: 'NEEDS_MORE_PROOF',
      starterApprovedCount: 2,
      needsMoreProofStarterCount: 1,
      submittedUniqueCount: 3,
      submittedMissionIds: ['starter-1', 'starter-2', 'starter-3'],
      needsMoreProofMissionId: 'starter-3',
    }),
    currentMissionId: 'starter-3',
    reviewStatus: 'pending_review',
  });

  assert.equal(guidance.status, 'PENDING_REVIEW');
  assert.equal(guidance.primaryHref, '/profile?tab=logbook');
  assert.equal(guidance.primaryLabel, 'View proof status');
});
