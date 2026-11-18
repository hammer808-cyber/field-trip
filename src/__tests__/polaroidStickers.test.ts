// Polaroid stickers, baked (Zach's call, Nov 18, 2026): the developing
// Polaroid's tray shows the stickers the player actually won (canonical
// 52-registry art, not the legacy star), the sticker drags into place, it
// stays visible on the reviewing Polaroid, and at submit it is baked into
// the uploaded photo. The repo has no DOM test harness, so the wiring is
// pinned with source assertions in the same style as
// guidedTourOverlay.test.ts; the placement math is pure and tested directly.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  clampPolaroidPlacement,
  DEFAULT_POLAROID_STICKER_PLACEMENT,
  mapSquarePlacementToSource,
  resolvePolaroidSticker,
  stickerDrawHeight,
  POLAROID_STICKER_WIDTH_FRACTION,
} from '../logic/polaroidSticker';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

test('the tray resolves earned stickers to real 52-registry art, not a star', () => {
  const freshMeat = resolvePolaroidSticker('first_offenses_fresh_meat');
  assert.deepEqual(freshMeat, {
    kind: 'image',
    id: 'first_offenses_fresh_meat',
    name: 'Fresh Meat',
    imageUrl: '/assets/stickers/achievement/01_fresh_meat.png',
  });
  // A starter-pack Explorer sticker resolves the same way.
  const captain = resolvePolaroidSticker('captain_clipboard_clipboard_character');
  assert.equal(captain?.kind, 'image');
  // A legacy emoji sticker still resolves, through the legacy registry.
  const legacy = resolvePolaroidSticker('sticker_photo_proof');
  assert.deepEqual(legacy, {
    kind: 'emoji',
    id: 'sticker_photo_proof',
    name: 'PHOTO CERTIFIED',
    emoji: '📸',
  });
});

test('ids with no entry anywhere resolve to nothing, so the tray skips them instead of showing a star', () => {
  assert.equal(resolvePolaroidSticker('no_such_sticker'), undefined);
});

test('a discovery id with a legacy emoji entry still resolves, through the legacy fallback', () => {
  // 'camera_ready' has no art file (src is ''), but it does have a legacy
  // emoji entry, so it renders as the emoji chip rather than being skipped.
  assert.deepEqual(resolvePolaroidSticker('camera_ready'), {
    kind: 'emoji',
    id: 'camera_ready',
    name: 'CAMERA READY',
    emoji: '📸',
  });
});

test('placement clamps to the photo, and a bad value becomes the top-left corner', () => {
  assert.deepEqual(clampPolaroidPlacement({ x: 150, y: -20 }), { x: 100, y: 0 });
  assert.deepEqual(clampPolaroidPlacement({ x: 50, y: 50 }), { x: 50, y: 50 });
  assert.deepEqual(clampPolaroidPlacement({ x: NaN, y: NaN }), { x: 0, y: 0 });
});

test('the default spot is top-right, where the old fixed sticker lived', () => {
  assert.deepEqual(DEFAULT_POLAROID_STICKER_PLACEMENT, { x: 80, y: 20 });
});

test('center-crop mapping: a landscape source loses its left/right edges', () => {
  // 1200x800 displayed as a square: the visible crop is the centered
  // 800-wide strip, x in [200, 1000], y in [0, 800].
  const mapping = mapSquarePlacementToSource({
    sourceWidth: 1200,
    sourceHeight: 800,
    placement: { x: 50, y: 50 },
  });
  assert.equal(mapping.centerX, 600);
  assert.equal(mapping.centerY, 400);
  assert.equal(mapping.width, 800 * POLAROID_STICKER_WIDTH_FRACTION);
  // The top-right default lands inside the visible strip, not off the edge.
  const topRight = mapSquarePlacementToSource({
    sourceWidth: 1200,
    sourceHeight: 800,
    placement: DEFAULT_POLAROID_STICKER_PLACEMENT,
  });
  assert.equal(topRight.centerX, 200 + 0.8 * 800);
  assert.equal(topRight.centerY, 0.2 * 800);
});

test('center-crop mapping: a portrait source loses its top/bottom edges', () => {
  // 800x1200 displayed as a square: the visible crop is the centered
  // 800-tall strip, x in [0, 800], y in [200, 1000].
  const mapping = mapSquarePlacementToSource({
    sourceWidth: 800,
    sourceHeight: 1200,
    placement: { x: 80, y: 20 },
  });
  assert.equal(mapping.centerX, 640);
  assert.equal(mapping.centerY, 200 + 0.2 * 800);
  assert.equal(mapping.width, 800 * POLAROID_STICKER_WIDTH_FRACTION);
});

test('center-crop mapping: a square source maps straight through', () => {
  const mapping = mapSquarePlacementToSource({
    sourceWidth: 1000,
    sourceHeight: 1000,
    placement: { x: 80, y: 20 },
  });
  assert.deepEqual(
    { centerX: mapping.centerX, centerY: mapping.centerY, width: mapping.width },
    { centerX: 800, centerY: 200, width: 1000 * POLAROID_STICKER_WIDTH_FRACTION },
  );
});

test('the sticker keeps its natural aspect ratio when drawn', () => {
  assert.equal(stickerDrawHeight(240, 400, 400), 240);
  assert.equal(stickerDrawHeight(240, 400, 200), 120);
  assert.equal(stickerDrawHeight(240, 0, 0), 240);
});

test('the tray resolves through the 52-registry first and has no 8-sticker cap', () => {
  const polaroid = read('src/components/DevelopingPolaroid.tsx');
  assert.match(polaroid, /resolvePolaroidSticker/);
  assert.doesNotMatch(polaroid, /from '\.\.\/data\/stickerRegistry'/);
  assert.doesNotMatch(polaroid, /getRewardMetadata/);
  assert.doesNotMatch(polaroid, /slice\(0, 8\)/);
  // The tray scrolls instead of truncating.
  assert.match(polaroid, /max-h-40 overflow-y-auto/);
  // Real art in the tray, not an emoji.
  assert.match(polaroid, /<img src=\{resolved\.imageUrl\}/);
});

test('the placed sticker drags, taps to move, and can be removed', () => {
  const polaroid = read('src/components/DevelopingPolaroid.tsx');
  // Pointer drag measured against the image container's own bounds.
  assert.match(polaroid, /imageContainerRef/);
  assert.match(polaroid, /getBoundingClientRect\(\)/);
  assert.match(polaroid, /setPointerCapture\(event\.pointerId\)/);
  assert.match(polaroid, /touchAction: 'none'/);
  // Tap the photo itself to move the sticker there.
  assert.match(polaroid, /tagName !== 'IMG'/);
  // A small X removes the placed sticker.
  assert.match(polaroid, /aria-label=\{`Remove \$\{selectedSticker\.name\} sticker`\}/);
  // Placement is a percentage pair on the displayed square.
  assert.match(polaroid, /left: `\$\{placement\.x\}%`/);
  assert.match(polaroid, /top: `\$\{placement\.y\}%`/);
});

test('the reviewing Polaroid shows the placed sticker, so what-you-see is what-you-submit', () => {
  const clipboard = read('src/components/FieldClipboard.tsx');
  assert.match(clipboard, /const reviewingSticker = data\.stickerId \? resolvePolaroidSticker\(data\.stickerId\) : undefined;/);
  assert.match(clipboard, /reviewingSticker\.kind === 'image'/);
  assert.match(clipboard, /left: `\$\{reviewingPlacement\.x\}%`/);
});

test('the bake helper composites through the center crop and never blocks submit', () => {
  const photo = read('src/lib/photoUtils.ts');
  assert.match(photo, /export async function bakeStickerIntoPhoto\(/);
  assert.match(photo, /mapSquarePlacementToSource\(/);
  assert.match(photo, /ctx\.rotate\(\(POLAROID_STICKER_ROTATION_DEGREES \* Math\.PI\) \/ 180\)/);
  assert.match(photo, /canvas\.toDataURL\('image\/jpeg', 0\.9\)/);
  // Any load failure returns the original photo untouched.
  assert.match(photo, /catch \{\s*return photoDataUrl;\s*\}/);
});

test('submit uploads the baked photo and keeps the clean original', () => {
  const capture = read('src/pages/Capture.tsx');
  assert.match(capture, /bakeStickerIntoPhoto\(/);
  assert.match(capture, /filteredImageToUpload = await bakeStickerIntoPhoto\(/);
  assert.match(capture, /uploadBase64Image\(user\.uid, 'proofUploads', filename, filteredImageToUpload\)/);
  assert.match(capture, /uploadBase64Image\(user\.uid, 'proofs\/original', `orig_\$\{proofId\}\.jpg`, captureData\.originalImageUrl\)/);
  // The placement is recorded on the entry alongside the sticker ids.
  assert.match(capture, /stickerPlacement: fcData\.stickerPlacement \?\? null,/);
});

test('retake clears the sticker and its placement', () => {
  const capture = read('src/pages/Capture.tsx');
  assert.match(capture, /stickerId: undefined,\s*stickerPlacement: undefined,/);
});

test('the sticker id and placement travel together through the clipboard data', () => {
  const types = read('src/types/fieldClipboard.ts');
  assert.match(types, /stickerPlacement\?: PolaroidStickerPlacement;/);
  const clipboard = read('src/components/FieldClipboard.tsx');
  // Picking a sticker starts it at the default spot; removing it clears the placement.
  assert.match(clipboard, /stickerPlacement: stickerId\s*\? \(previous\.stickerPlacement \?\? DEFAULT_POLAROID_STICKER_PLACEMENT\)\s*: undefined,/);
  assert.match(clipboard, /onStickerPlacementChange=\{\(nextPlacement\) => setData\(previous => \(\{\s*\.\.\.previous, stickerPlacement: nextPlacement \}\)\)\}/);
});
