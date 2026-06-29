import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  getCommunityFeedExclusionReasons,
  getCommunityFeedImageReference,
  hasCommunityFeedImageReference,
  isCommunityFeedEligible
} from '../logic/communityFeed';

const bigBoardSource = readFileSync('src/pages/BigBoard.tsx', 'utf8');
const proofServiceSource = readFileSync('src/services/proofService.ts', 'utf8');
const cardSource = readFileSync('src/components/CommunityProofCard.tsx', 'utf8');
const proofImageSource = readFileSync('src/components/ProofImage.tsx', 'utf8');
const serverSource = readFileSync('server.ts', 'utf8');
const adminModerationSource = readFileSync('src/pages/AdminModeration.tsx', 'utf8');
const rulesSource = readFileSync('firestore.rules', 'utf8');

test('community feed accepts only approved public renderable entries', () => {
  const base = {
    id: 'entry-1',
    status: 'approved',
    isPublic: true,
    userId: 'user-1',
    photoUrl: 'https://example.com/proof.jpg',
  };

  assert.equal(isCommunityFeedEligible(base), true);
  assert.equal(isCommunityFeedEligible({ ...base, status: 'pending_review' }), false);
  assert.equal(isCommunityFeedEligible({ ...base, status: 'needs_more_proof' }), false);
  assert.equal(isCommunityFeedEligible({ ...base, status: 'rejected' }), false);
  assert.equal(isCommunityFeedEligible({ ...base, archived: true }), false);
  assert.equal(isCommunityFeedEligible({ ...base, hidden: true }), false);
  assert.equal(isCommunityFeedEligible({ ...base, isDisqualified: true }), false);
  assert.equal(isCommunityFeedEligible({ ...base, visibility: 'private' }), false);
  assert.equal(isCommunityFeedEligible({ ...base, showInCommunityFeed: false }), false);
  assert.equal(isCommunityFeedEligible({ ...base, photoUrl: '' }), false);
  assert.equal(isCommunityFeedEligible({ ...base, userId: '' }), false);
});

test('community feed accepts legacy approved proof image fields and storage references', () => {
  const base = {
    id: 'entry-1',
    status: 'approved',
    userId: 'user-1',
  };

  assert.equal(isCommunityFeedEligible({ ...base, photoUrl: 'https://example.com/photo.jpg' }), true);
  assert.equal(isCommunityFeedEligible({ ...base, imageUrl: 'https://example.com/image.jpg' }), true);
  assert.equal(isCommunityFeedEligible({ ...base, mediaUrl: 'https://example.com/media.jpg' }), true);
  assert.equal(isCommunityFeedEligible({ ...base, proofImage: 'https://example.com/proof.jpg' }), true);
  assert.equal(isCommunityFeedEligible({ ...base, storagePath: 'proofs/user-1/entry-1.jpg' }), true);
  assert.equal(isCommunityFeedEligible({ ...base, photoStoragePath: 'proofs/user-1/entry-2.jpg' }), true);
  assert.equal(isCommunityFeedEligible({ ...base, imageStoragePath: 'proofs/user-1/entry-3.jpg' }), true);
  assert.equal(getCommunityFeedImageReference({ ...base, storagePath: 'proofs/user-1/entry-1.jpg' }), 'proofs/user-1/entry-1.jpg');
  assert.equal(hasCommunityFeedImageReference({ ...base, storagePath: 'blob:local' }), false);
});

test('community feed diagnostics explain exclusions', () => {
  const reasons = getCommunityFeedExclusionReasons({
    status: 'pending_review',
    showInCommunityFeed: false,
    visibility: 'private',
    photoUrl: 'blob:local',
  });

  assert.ok(reasons.includes('status:pending_review'));
  assert.ok(reasons.includes('not_public_feed_enabled'));
  assert.ok(reasons.includes('private_visibility'));
  assert.ok(reasons.includes('missing_or_invalid_image'));
  assert.ok(reasons.includes('missing_owner'));
});

test('Big Board Proofs tab does not merge local pending entries into public feed', () => {
  assert.doesNotMatch(bigBoardSource, /const userPending =/);
  assert.doesNotMatch(bigBoardSource, /\[\.\.\.userPending,\s*\.\.\.filteredPublic\]/);
  assert.match(bigBoardSource, /publicProofs\.filter\(isCommunityFeedEligible\)/);
  assert.match(bigBoardSource, /No receipts on the board yet/);
});

test('Community feed subscription does not require legacy visibility flags or approvedAt ordering', () => {
  const activitySource = readFileSync('src/services/activityService.ts', 'utf8');
  const publicProofs = activitySource.match(/export function subscribeToPublicProofs[\s\S]*?\n\}/)?.[0] || '';

  assert.match(publicProofs, /where\('status', 'in', COMMUNITY_FEED_APPROVED_STATUSES\)/);
  assert.doesNotMatch(publicProofs, /where\('showInCommunityFeed'/);
  assert.doesNotMatch(publicProofs, /orderBy\('approvedAt'/);
  assert.match(publicProofs, /filter\(isCommunityFeedEligible\)/);
  assert.match(publicProofs, /sort\(\(a: any, b: any\) => getCommunityFeedApprovedTime\(b\) - getCommunityFeedApprovedTime\(a\)\)/);
});

test('Hype writes go through server endpoint and direct Firestore like writes are blocked', () => {
  assert.match(proofServiceSource, /authenticatedFetch\('\/api\/community\/hype'/);
  assert.doesNotMatch(proofServiceSource, /collection\(db,\s*'likes'\)[\s\S]{0,500}(setDoc|deleteDoc)/);
  assert.match(rulesSource, /match \/likes\/\{likeId\}[\s\S]*allow read: if isSignedIn\(\);[\s\S]*allow write: if false;/);
});

test('Community proof card reuses private Sus endpoint and does not render pending labels', () => {
  assert.match(cardSource, /getSusReportStatus/);
  assert.match(cardSource, /submitSusReport/);
  assert.match(cardSource, /Approved Receipt/);
  assert.doesNotMatch(cardSource, /Pending Review/);
  assert.match(cardSource, /Signal Check/);
});

test('ProofImage treats Firebase Storage paths as renderable image references', () => {
  assert.match(proofImageSource, /const selectedImageReference = norm\.photoUrl \|\| norm\.storagePath \|\| null;/);
  assert.match(proofImageSource, /if \(!selectedImageReference\)/);
  assert.match(proofImageSource, /const fileRef = ref\(storage, storagePathVal\)/);
  assert.match(proofImageSource, /const downloadUrl = await getDownloadURL\(fileRef\)/);
});

test('admin community feed diagnostics are read-only and exposed in Internal Affairs', () => {
  assert.match(serverSource, /app\.get\("\/api\/admin\/community-feed\/diagnostics"/);
  assert.match(serverSource, /readOnly:\s*true/);
  assert.match(serverSource, /duplicateLikes/);
  assert.match(adminModerationSource, /Community Feed Diagnostics/);
  assert.match(adminModerationSource, /previewCommunityFeedDiagnostics/);
});
