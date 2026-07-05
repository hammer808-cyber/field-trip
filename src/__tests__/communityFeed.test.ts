import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  COMMUNITY_FEED_APPROVED_STATUSES,
  COMMUNITY_FEED_QUERY_STATUSES,
  dedupeCommunityFeedProofs,
  getCommunityFeedExclusionReasons,
  getCommunityFeedDedupeKey,
  getCommunityFeedImageReference,
  hasCommunityFeedImageReference,
  isCommunityFeedEligible
} from '../logic/communityFeed';

const bigBoardSource = readFileSync('src/pages/BigBoard.tsx', 'utf8');
const communityProofsFeedSource = readFileSync('src/components/CommunityProofsFeed.tsx', 'utf8');
const proofServiceSource = readFileSync('src/services/proofService.ts', 'utf8');
const cardSource = readFileSync('src/components/CommunityProofCard.tsx', 'utf8');
const proofImageSource = readFileSync('src/components/ProofImage.tsx', 'utf8');
const serverSource = readFileSync('server.ts', 'utf8');
const adminModerationSource = readFileSync('src/pages/AdminModeration.tsx', 'utf8');
const rulesSource = readFileSync('firestore.rules', 'utf8');
const deckSource = readFileSync('src/pages/Deck.tsx', 'utf8');

test('community feed accepts only approved public renderable entries', () => {
  const base = {
    id: 'entry-1',
    status: 'approved',
    isPublic: true,
    userId: 'user-1',
    photoUrl: 'https://example.com/proof.jpg',
    approvedAt: '2026-06-20T10:00:00.000Z',
  };

  assert.equal(isCommunityFeedEligible(base), true);
  assert.equal(isCommunityFeedEligible({ ...base, status: 'pending_review' }), false);
  assert.equal(isCommunityFeedEligible({ ...base, status: 'needs_more_proof' }), false);
  assert.equal(isCommunityFeedEligible({ ...base, status: 'rejected' }), false);
  assert.equal(isCommunityFeedEligible({ ...base, archived: true }), false);
  assert.equal(isCommunityFeedEligible({ ...base, hidden: true }), false);
  assert.equal(isCommunityFeedEligible({ ...base, isDisqualified: true }), false);
  assert.equal(isCommunityFeedEligible({ ...base, visibility: 'private' }), false);
  assert.equal(isCommunityFeedEligible({ ...base, visibility: { showInCommunityFeed: false } }), false);
  assert.equal(isCommunityFeedEligible({ ...base, photoUrl: '' }), false);
  assert.equal(isCommunityFeedEligible({ ...base, userId: '' }), false);
});

test('community feed queries all canonical and legacy approved entry statuses', () => {
  assert.deepEqual(
    COMMUNITY_FEED_APPROVED_STATUSES,
    ['approved', 'approved_by_admin', 'auto_approved', 'completed', 'retry-approved']
  );
  assert.ok(COMMUNITY_FEED_QUERY_STATUSES.includes('verified'));

  const base = {
    id: 'entry-1',
    isPublic: true,
    userId: 'user-1',
    photoUrl: 'https://example.com/proof.jpg',
    reviewedAt: '2026-06-20T10:00:00.000Z',
  };

  for (const status of COMMUNITY_FEED_APPROVED_STATUSES) {
    assert.equal(isCommunityFeedEligible({ ...base, status }), true, status);
  }
  assert.equal(isCommunityFeedEligible({ ...base, status: 'verified' }), true);
});

test('community feed accepts legacy approved entries with createdAt but no approvedAt mirror', () => {
  assert.equal(isCommunityFeedEligible({
    id: 'legacy-approved-entry',
    status: 'approved',
    userId: 'user-1',
    isPublic: true,
    photoUrl: 'https://example.com/proof.jpg',
    createdAt: '2026-06-20T10:00:00.000Z',
  }), true);
});

test('community feed accepts legacy approved proof image fields and storage references', () => {
  const base = {
    id: 'entry-1',
    status: 'approved',
    userId: 'user-1',
    showInCommunityFeed: true,
    approvedAt: '2026-06-20T10:00:00.000Z',
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

test('community feed dedupes canonical and legacy copies before rendering', () => {
  const canonical = {
    id: 'doc-a',
    entryId: 'entry-1',
    status: 'approved',
    userId: 'user-1',
    challengeId: 'starter-1',
    photoUrl: 'https://example.com/proof.jpg',
    approvedAt: '2026-06-20T10:00:00.000Z',
  };
  const copied = {
    ...canonical,
    id: 'doc-b',
    sourceEntryId: 'entry-1',
    approvedAt: '2026-06-20T11:00:00.000Z',
  };
  const legacyWithoutAlias = {
    id: 'legacy-doc-a',
    status: 'approved',
    userId: 'user-1',
    challengeId: 'starter-2',
    storagePath: 'proofs/user-1/starter-2.jpg',
    approvedAt: '2026-06-20T12:00:00.000Z',
  };
  const legacyCopyWithoutAlias = {
    ...legacyWithoutAlias,
    id: 'legacy-doc-b',
    reviewedAt: '2026-06-20T12:05:00.000Z',
  };

  assert.equal(getCommunityFeedDedupeKey(canonical), 'entry:entry-1');
  assert.equal(getCommunityFeedDedupeKey(copied), 'entry:entry-1');
  assert.deepEqual(
    dedupeCommunityFeedProofs([canonical, copied, legacyWithoutAlias, legacyCopyWithoutAlias]).map(entry => entry.id).sort(),
    ['doc-b', 'legacy-doc-b']
  );
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
  assert.ok(reasons.includes('missing_approved_at'));
  assert.ok(reasons.includes('missing_or_invalid_image'));
  assert.ok(reasons.includes('missing_owner'));
});

test('Dex Community Proofs feed does not merge local pending entries into public feed', () => {
  assert.doesNotMatch(communityProofsFeedSource, /const userPending =/);
  assert.doesNotMatch(communityProofsFeedSource, /\[\.\.\.userPending,\s*\.\.\.filteredPublic\]/);
  assert.match(communityProofsFeedSource, /publicProofs\.filter\(isCommunityFeedEligible\)/);
  assert.match(communityProofsFeedSource, /No receipts on the board yet/);
  assert.match(bigBoardSource, /navigate\('\/dex\/memories\/community'/);
  assert.doesNotMatch(bigBoardSource, /\{ id: "proofs", label: "Proofs" \}/);
});

test('Community feed subscription does not require legacy visibility flags or approvedAt ordering', () => {
  const activitySource = readFileSync('src/services/activityService.ts', 'utf8');
  const publicProofs = activitySource.match(/export function subscribeToPublicProofs[\s\S]*?\n\}/)?.[0] || '';

  assert.match(publicProofs, /where\('status', 'in', COMMUNITY_FEED_QUERY_STATUSES\)/);
  assert.doesNotMatch(publicProofs, /where\('showInCommunityFeed'/);
  assert.doesNotMatch(publicProofs, /orderBy\('approvedAt'/);
  assert.match(publicProofs, /dedupeCommunityFeedProofs/);
  assert.match(publicProofs, /sourceDocumentId: doc\.id/);
  assert.match(publicProofs, /filter\(isCommunityFeedEligible\)/);
  assert.match(publicProofs, /sort\(\(a: any, b: any\) => getCommunityFeedApprovedTime\(b\) - getCommunityFeedApprovedTime\(a\)\)/);
});

test('Hype writes go through server endpoint and direct Firestore like writes are blocked', () => {
  assert.match(proofServiceSource, /authenticatedFetch\('\/api\/community\/hype'/);
  assert.doesNotMatch(proofServiceSource, /collection\(db,\s*'likes'\)[\s\S]{0,500}(setDoc|deleteDoc)/);
  assert.match(rulesSource, /match \/likes\/\{likeId\}[\s\S]*allow read: if isSignedIn\(\);[\s\S]*allow write: if false;/);
});

test('Firestore rules allow approved users to list entries for Community Feed subscriptions', () => {
  assert.match(rulesSource, /match \/entries\/\{entryId\}[\s\S]*allow list: if isAdmin\(\) \|\| isApproved\(\);/);
});

test('Community feed My Crew filter uses canonical crew eligibility helper', () => {
  assert.match(communityProofsFeedSource, /isCrewProofEligible\(entry, crewId\)/);
});

test('Logbook header reports state counts instead of active logs label', () => {
  assert.match(deckSource, /getProofLogbookCounts/);
  assert.match(deckSource, /SUBMITTED/);
  assert.match(deckSource, /VERIFIED/);
  assert.match(deckSource, /PENDING/);
  assert.doesNotMatch(deckSource, /ACTIVE LOGS/);
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
  assert.match(serverSource, /targetUserId/);
  assert.match(serverSource, /approvedExclusions/);
  assert.match(serverSource, /app\.post\("\/api\/admin\/community-feed\/repair"/);
  assert.match(serverSource, /readOnly:\s*true/);
  assert.match(serverSource, /duplicateLikes/);
  assert.match(adminModerationSource, /Community Feed Diagnostics/);
  assert.match(adminModerationSource, /previewCommunityFeedDiagnostics/);
  assert.match(adminModerationSource, /repairCommunityFeedDistribution/);
});
