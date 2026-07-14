import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  clampFlipbookPage,
  getFlipbookBatchLimit,
  getFlipbookVisibleIndexes,
  getNextFlipbookPage,
  getPreviousFlipbookPage,
  parseFlipbookPage,
  serializeFlipbookPage,
  shouldRequestNextFlipbookBatch,
} from '../logic/flipbook';
import {
  getAttachedStickerIds,
  getLogbookStatusPresentation,
  getNeedsMoreProofRoute,
  getSafeProofLocation,
} from '../logic/proofJournal';
import {
  getPolaroidImageFilter,
  getPolaroidStageAtElapsed,
  revokeTemporaryPreviewUrls,
} from '../logic/polaroidDevelopment';
import {
  autoArrangeStickerSheet,
  createDeterministicStickerPlacement,
  mergeStickerPlacements,
  resetStickerSheet,
  updateStickerPlacement,
} from '../logic/stickerBook';
import { isCommunityProofEligible } from '../logic/proofDistribution';
import { isZineCandidateEligible } from '../logic/zineSystem';

const flipbookSource = readFileSync('src/components/FlipbookShell.tsx', 'utf8');
const captureSource = readFileSync('src/pages/Capture.tsx', 'utf8');
const polaroidSource = readFileSync('src/components/DevelopingPolaroid.tsx', 'utf8');
const stickerBookSource = readFileSync('src/components/StickerBook.tsx', 'utf8');
const proofImageSource = readFileSync('src/components/ProofImage.tsx', 'utf8');
const gameServiceSource = readFileSync('src/services/gameService.ts', 'utf8');
const profileSource = readFileSync('src/pages/Profile.tsx', 'utf8');
const entryServiceSource = readFileSync('src/services/entryService.ts', 'utf8');

test('flipbook exposes one mobile page and a two-page desktop spread', () => {
  assert.deepEqual(getFlipbookVisibleIndexes(0, 6, 'mobile'), [0]);
  assert.deepEqual(getFlipbookVisibleIndexes(0, 6, 'desktop'), [0, 1]);
  assert.deepEqual(getFlipbookVisibleIndexes(5, 6, 'desktop'), [5]);
  assert.equal(getNextFlipbookPage(0, 6, 'mobile'), 1);
  assert.equal(getNextFlipbookPage(0, 6, 'desktop'), 2);
  assert.equal(getPreviousFlipbookPage(4, 6, 'desktop'), 2);
  assert.equal(clampFlipbookPage(99, 6), 5);
});

test('flipbook page query round-trips and requests page-sized batches near the edge', () => {
  assert.equal(parseFlipbookPage('4'), 3);
  assert.equal(serializeFlipbookPage(3), '4');
  assert.equal(getFlipbookBatchLimit(0, 'mobile', 8), 8);
  assert.equal(getFlipbookBatchLimit(8, 'desktop', 8), 16);
  assert.equal(shouldRequestNextFlipbookBatch({ page: 6, loadedPageCount: 8, layout: 'desktop', hasMore: true }), true);
  assert.equal(shouldRequestNextFlipbookBatch({ page: 1, loadedPageCount: 8, layout: 'mobile', hasMore: true }), false);
  assert.match(profileSource, /onRequestMore=\{loadMoreLogbookEntries\}/);
  assert.match(profileSource, /hasMore=\{hasMoreEntries\}/);
  assert.match(entryServiceSource, /alias: 'uid'/);
  assert.match(entryServiceSource, /alias: 'userId'/);
  assert.doesNotMatch(entryServiceSource, /where\('showInUserLogbook', '==', true\)/);
  assert.match(entryServiceSource, /entry\.showInUserLogbook !== false/);
});

test('flipbook includes keyboard, swipe, persisted grid/list fallback, and reduced motion', () => {
  assert.match(flipbookSource, /event\.key === 'ArrowLeft'/);
  assert.match(flipbookSource, /event\.key === 'ArrowRight'/);
  assert.match(flipbookSource, /onTouchStart/);
  assert.match(flipbookSource, /window\.localStorage\.setItem\(storageKey, nextView\)/);
  assert.match(flipbookSource, /'grid'/);
  assert.match(flipbookSource, /'list'/);
  assert.match(flipbookSource, /useReducedMotion/);
});

test('private Logbook statuses normalize without making pending or rejected proofs public', () => {
  assert.equal(getLogbookStatusPresentation({ status: 'pending_review' }).label, 'Pending Review');
  assert.equal(getLogbookStatusPresentation({ status: 'needs-more-proof' }).status, 'needs_more_proof');
  assert.equal(getLogbookStatusPresentation({ status: 'rejected' }).tone, 'rejected');

  const base = {
    id: 'proof-1',
    userId: 'user-1',
    photoUrl: 'https://example.com/proof.jpg',
    createdAt: '2026-07-01T12:00:00.000Z',
  };
  assert.equal(isCommunityProofEligible({ ...base, status: 'pending_review' }), false);
  assert.equal(isCommunityProofEligible({ ...base, status: 'approved' }), true);
  assert.equal(isCommunityProofEligible({ ...base, status: 'rejected' }), false);
});

test('needs-more-proof routes use the existing correction contract and location remains privacy-safe', () => {
  assert.equal(
    getNeedsMoreProofRoute({ id: 'entry-7', challengeId: 'starter-2' }),
    '/capture?id=starter-2&mode=addMoreProof&entryId=entry-7',
  );
  assert.equal(getSafeProofLocation({ latitude: 34.1, longitude: -118.2 }), 'Location saved privately');
  assert.equal(getSafeProofLocation({ locationLabel: 'Downtown field zone', latitude: 34.1 }), 'Downtown field zone');
});

test('profile proof-sticker assignments merge with entry sticker fields without duplicates', () => {
  assert.deepEqual(
    getAttachedStickerIds(
      { id: 'entry-1', stickerIds: ['camera_ready'], attachedStickerIds: ['camera_ready'] },
      { 'entry-1': ['first_vote'] },
    ),
    ['camera_ready', 'first_vote'],
  );
});

test('Polaroid development completes under three seconds and reduced motion uses a short fade', () => {
  assert.equal(getPolaroidStageAtElapsed(0), 'captured');
  assert.equal(getPolaroidStageAtElapsed(120), 'ejecting');
  assert.equal(getPolaroidStageAtElapsed(700), 'developing_early');
  assert.equal(getPolaroidStageAtElapsed(1700), 'developing_mid');
  assert.equal(getPolaroidStageAtElapsed(2900), 'developed');
  assert.equal(getPolaroidStageAtElapsed(180, true), 'developed');
  assert.notEqual(getPolaroidImageFilter('developing_early'), getPolaroidImageFilter('developed'));
  assert.match(polaroidSource, /Use This Receipt/);
  assert.match(polaroidSource, /Retake/);
  assert.match(polaroidSource, /Skip/);
});

test('retake cleanup revokes only temporary blob previews', () => {
  const revoked: string[] = [];
  const result = revokeTemporaryPreviewUrls(
    ['blob:first', 'data:image/jpeg;base64,abc', 'blob:first', 'https://example.com/final.jpg', 'blob:second'],
    value => revoked.push(value),
  );
  assert.deepEqual(result, ['blob:first', 'blob:second']);
  assert.deepEqual(revoked, ['blob:first', 'blob:second']);
  assert.match(captureSource, /revokeTemporaryPreviewUrls/);
});

test('capture preserves the existing duplicate-submit lock and stores one selected sticker', () => {
  assert.match(captureSource, /submitLockRef\.current\) return/);
  assert.match(captureSource, /submitLockRef\.current = true/);
  assert.match(captureSource, /profile\?\.earnedStickers/);
  assert.match(captureSource, /stickerIds: fcData\.stickerId \? \[fcData\.stickerId\] : \[\]/);
  assert.match(gameServiceSource, /attachedStickerIds: Array\.from\(new Set/);
});

test('deterministic sticker placement persists saved values and stays on-sheet', () => {
  const first = createDeterministicStickerPlacement('camera_ready', 'mission_stickers', 1, '2026-07-01T00:00:00.000Z');
  const second = createDeterministicStickerPlacement('camera_ready', 'mission_stickers', 1, '2026-07-01T00:00:00.000Z');
  assert.deepEqual(first, second);
  assert.ok(first.x >= 2 && first.x <= 68);
  assert.ok(first.y >= 3 && first.y <= 74);

  const customized = updateStickerPlacement([first], 'camera_ready', { x: 40, y: 35, rotation: 12, scale: 1.2 }, '2026-07-02T00:00:00.000Z');
  const merged = mergeStickerPlacements({ stickerIds: ['camera_ready'], existingPlacements: customized });
  assert.equal(merged[0].x, 40);
  assert.equal(merged[0].rotation, 12);

  const clamped = updateStickerPlacement(merged, 'camera_ready', { x: 500, y: -20, scale: 8 })[0];
  assert.equal(clamped.x, 68);
  assert.equal(clamped.y, 3);
  assert.equal(clamped.scale, 1.4);
});

test('reset and auto-arrange are deterministic and bounded', () => {
  const placements = mergeStickerPlacements({
    stickerIds: ['camera_ready', 'first_vote', 'proof_returned'],
    recentStickerIds: [],
    now: '2026-07-01T00:00:00.000Z',
  }).map(placement => ({ ...placement, sheetId: 'mission_stickers' as const }));
  const resetA = resetStickerSheet(placements, 'mission_stickers', '2026-07-02T00:00:00.000Z');
  const resetB = resetStickerSheet(placements, 'mission_stickers', '2026-07-02T00:00:00.000Z');
  assert.deepEqual(resetA, resetB);
  const arranged = autoArrangeStickerSheet(placements, 'mission_stickers', '2026-07-02T00:00:00.000Z');
  assert.equal(new Set(arranged.map(placement => `${placement.x}:${placement.y}`)).size, 3);
  assert.ok(arranged.every(placement => placement.x <= 68 && placement.y <= 74));
});

test('sticker sheet interaction supports touch drag, keyboard nudge, profile persistence, and zine use', () => {
  assert.match(stickerBookSource, /onPointerDown/);
  assert.match(stickerBookSource, /touch-none/);
  assert.match(stickerBookSource, /event\.key === 'ArrowLeft'/);
  assert.match(stickerBookSource, /stickerPlacements: next/);
  assert.match(stickerBookSource, /proofStickerAssignments/);
  assert.match(stickerBookSource, /page\.stickerIds/);
  assert.match(stickerBookSource, /reward\.rarity !== 'legendary'/);
});

test('ProofImage keeps Firebase Storage fallback and lazily decodes journal images', () => {
  assert.match(proofImageSource, /getDownloadURL\(fileRef\)/);
  assert.match(proofImageSource, /loading=\{loadingStrategy\}/);
  assert.match(proofImageSource, /decoding="async"/);
});

test('approved proof remains eligible for personal zine archive', () => {
  assert.equal(isZineCandidateEligible({
    candidate: {
      id: 'entry-1',
      userId: 'user-1',
      status: 'approved',
      photoUrl: 'https://example.com/proof.jpg',
      seasonId: 'season-1',
    },
    kind: 'personal',
    ownerId: 'user-1',
    seasonId: 'season-1',
  }), true);
});
