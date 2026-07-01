import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getProofDistributionExclusionReasons,
  getProofImageReference,
  isCommunityProofEligible,
  isCrewProofEligible,
  isWeeklyProofDistributionEligible,
  normalizeProofVisibility
} from '../logic/proofDistribution';

const approvedBase = {
  id: 'entry-1',
  userId: 'user-1',
  status: 'approved',
  approvedAt: '2026-06-20T10:00:00.000Z',
  photoUrl: 'https://example.com/proof.jpg',
  visibility: {
    showInCommunityFeed: true,
    showInCrewFeed: true,
    allowWeeklyVoting: true
  },
  crewId: 'crew-1'
};

test('approved proof distributes to community, crew, and weekly when all canonical flags allow it', () => {
  assert.equal(isCommunityProofEligible(approvedBase), true);
  assert.equal(isCrewProofEligible(approvedBase, 'crew-1'), true);
  assert.equal(isWeeklyProofDistributionEligible(approvedBase), true);
});

test('community feed rejects pending, rejected, hidden, and image-less proofs', () => {
  assert.equal(isCommunityProofEligible({ ...approvedBase, status: 'pending_review' }), false);
  assert.equal(isCommunityProofEligible({ ...approvedBase, status: 'rejected' }), false);
  assert.equal(isCommunityProofEligible({ ...approvedBase, moderation: { isHidden: true } }), false);
  assert.equal(isCommunityProofEligible({ ...approvedBase, photoUrl: '', storagePath: '' }), false);
});

test('legacy visibility and storage fields remain compatible with canonical distribution', () => {
  const legacy = {
    id: 'legacy-entry',
    uid: 'user-1',
    status: 'approved_by_admin',
    reviewedAt: '2026-06-20T10:00:00.000Z',
    isPublic: true,
    proofStoragePath: 'proofs/user-1/legacy-entry.jpg'
  };

  assert.equal(normalizeProofVisibility(legacy).showInCommunityFeed, true);
  assert.equal(getProofImageReference(legacy), 'proofs/user-1/legacy-entry.jpg');
  assert.equal(isCommunityProofEligible(legacy), true);
});

test('crew feed requires the active crew and does not leak other crew proofs', () => {
  assert.equal(isCrewProofEligible(approvedBase, 'crew-1'), true);
  assert.equal(isCrewProofEligible(approvedBase, 'crew-2'), false);
  assert.equal(isCrewProofEligible({ ...approvedBase, visibility: { showInCommunityFeed: true, showInCrewFeed: false } }, 'crew-1'), false);
});

test('distribution diagnostics expose exact exclusion reasons', () => {
  const reasons = getProofDistributionExclusionReasons({
    id: 'bad-entry',
    status: 'needs_more_proof',
    userId: '',
    photoUrl: 'blob:local',
    visibility: { showInCommunityFeed: false },
    moderation: { isHidden: true, hiddenReason: 'admin_review' },
    approvedAt: null
  });

  assert.ok(reasons.includes('status:needs_more_proof'));
  assert.ok(reasons.includes('missing_owner'));
  assert.ok(reasons.includes('missing_or_invalid_image'));
  assert.ok(reasons.includes('missing_approved_at'));
  assert.ok(reasons.includes('hidden:admin_review'));
  assert.ok(reasons.includes('community_feed_disabled'));
});
