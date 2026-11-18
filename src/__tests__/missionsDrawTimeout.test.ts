import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

test('missions draw timeout: a stalled draw cannot strand the deck on "RELEASING..." forever', () => {
  // Nov 18, 2026 (Zach's call — stuck draw on his phone): the deck sat
  // greyed out on "RELEASING..." with no card flipping over. Root cause:
  // handleDraw awaited drawTrip with no bound, and drawTrip awaits two
  // Firestore writes (profile update + mission-card save) that can pend
  // indefinitely when long-polling stalls on a flaky connection — the
  // promises neither resolve nor reject, so handleDraw never advanced past
  // animationStep 'drawing', isDrawing was never cleared, and the guard
  // early-returned on every later tap. The draw is now raced against a
  // timeout so the panel always comes back.
  const deck = read('src/pages/Deck.tsx');
  assert.match(deck, /const DRAW_TRIP_TIMEOUT_MS = 15000;/);
  const drawAt = deck.indexOf('const handleDraw = async');
  assert.ok(drawAt > 0, 'handleDraw found');
  const handleDraw = deck.slice(drawAt, drawAt + 4000);
  assert.match(handleDraw, /await Promise\.race\(\[/);
  assert.match(handleDraw, /drawTrip\(undefined, FEATURE_FLAGS\.ENABLE_DECK_PACK_DRAW_LOGIC \? drawPackId : undefined\)/);
  assert.match(handleDraw, /setTimeout\(\(\) => \{\s*drawTimedOut = true;\s*resolve\(null\);\s*\}, DRAW_TRIP_TIMEOUT_MS\)/);
  // The timer is cleared when the draw resolves in time — no dangling
  // timeout that could flip the flag after a good draw.
  assert.match(handleDraw, /if \(drawTimeoutId\) clearTimeout\(drawTimeoutId\);/);
});

test('missions draw timeout: on timeout the panel resets to idle so the player can draw again', () => {
  // The timeout resolves the race with null, which flows into the existing
  // empty-pool branch — but it must be distinguishable from a genuinely
  // empty pool, and it must clear every piece of the drawing state (the
  // old code only cleared isDrawing 1000ms after try/catch, which never
  // ran while the draw was pending).
  const deck = read('src/pages/Deck.tsx');
  const drawAt = deck.indexOf('const handleDraw = async');
  const handleDraw = deck.slice(drawAt, drawAt + 4000);
  assert.match(handleDraw, /drawTimedOut\s*\?\s*"\[Deck\] handleDraw: drawTrip timed out\. Resetting so the player can draw again\."/);
  assert.match(handleDraw, /setAnimationStep\('idle'\);\s*setShowAnimation\(false\);\s*setIsDrawing\(false\);/);
});

test('missions draw timeout: the re-entry guard still blocks taps while a draw is in flight', () => {
  // The timeout is a recovery path, not a license to double-draw: while
  // animationStep is 'drawing'/'flipping' or isDrawing is set, taps still
  // early-return.
  const deck = read('src/pages/Deck.tsx');
  const drawAt = deck.indexOf('const handleDraw = async');
  const handleDraw = deck.slice(drawAt, drawAt + 4000);
  assert.match(handleDraw, /isDrawing/);
  assert.match(handleDraw, /animationStep === 'drawing'/);
  assert.match(handleDraw, /animationStep === 'flipping'/);
});

test('missions draw timeout: the stuck state is documented at the Firestore layer', () => {
  // The hang itself lives in the writes drawTrip awaits — updateDoc in
  // userService and setDoc in missionCardService — under
  // experimentalForceLongPolling. If that transport ever changes, this
  // test's premise should be revisited, but the timeout stays as the
  // safety net either way.
  const init = read('src/lib/firebaseInit.ts');
  assert.match(init, /experimentalForceLongPolling: true/);
  const userService = read('src/services/userService.ts');
  assert.match(userService, /await updateDoc\(userRef, \{/);
  const cardService = read('src/services/missionCardService.ts');
  assert.match(cardService, /await setDoc\(cardRef, data, \{ merge: true \}\);/);
});
