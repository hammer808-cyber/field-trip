import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

// P0-3 (audit §12): the deck draw was a <div onClick> with no role,
// tabIndex, onKeyDown, or aria-label — keyboard/switch users could not
// draw a mission at all. The fix makes the deck a real <button>.
// This suite has no DOM runner, so it asserts the structural facts that
// make the affordance focusable and operable: a native <button> is
// Tab-focusable by default and fires click on Enter/Space per platform
// semantics — no role/onKeyDown workaround is needed, or present.

test('deck draw keyboard path: the deck is a real button', () => {
  const stack = read('src/components/DeckStack.tsx');
  assert.match(stack, /<button\s+type="button"\s+id="starter-deck"/);
  assert.doesNotMatch(stack, /<div\s+id="starter-deck"/);
  // No role/onKeyDown workaround: the native button supplies Tab focus
  // and Enter/Space activation.
  assert.doesNotMatch(stack, /role="button"/);
  assert.doesNotMatch(stack, /onKeyDown/);
  // Tour/onboarding hooks moved with the element.
  assert.match(stack, /data-tour="deck-draw"/);
  assert.match(stack, /data-onboarding="starter-deck"/);
});

test('deck draw keyboard path: same draw handler, same disabled conditions', () => {
  const stack = read('src/components/DeckStack.tsx');
  // Pointer behaviour is unchanged: the same handler fires the draw.
  assert.match(stack, /onClick=\{handleDraw\}/);
  assert.match(stack, /const handleDraw = \(\) => \{\n\s*if \(!isActuallyDisabled && !isDrawing\) \{\n\s*onDraw\(\);\n\s*\}\n\s*\};/);
  // The native disabled state mirrors the handler guard, so a disabled
  // deck is skipped in the tab order exactly when it cannot draw.
  assert.match(stack, /disabled=\{isActuallyDisabled \|\| isDrawing\}/);
  // Hover/fan-out behaviour is untouched.
  assert.match(stack, /onMouseEnter=\{\(\) => !isActuallyDisabled && setIsHovered\(true\)\}/);
  assert.match(stack, /onMouseLeave=\{\(\) => setIsHovered\(false\)\}/);
});

test('deck draw keyboard path: visible focus, scoped to the deck', () => {
  const stack = read('src/components/DeckStack.tsx');
  // Scoped ring reusing the focus-visible:outline-4 outline-brand-cyan
  // pattern from the newer components (e.g. DevelopingPolaroid). No
  // global focus rule lives here — that is P0-4's job.
  assert.match(stack, /focus-visible:outline focus-visible:outline-4 focus-visible:outline-brand-cyan/);
  assert.doesNotMatch(stack, /outline-none/);
});

test('deck draw keyboard path: the accessible name matches the visible prompt', () => {
  const stack = read('src/components/DeckStack.tsx');
  // One label, two uses: the prompt under the deck and the button's
  // accessible name, so the announced name always matches the visible
  // label (WCAG 2.5.3 label in name).
  assert.match(stack, /const drawLabel =\n\s*statusLabel \|\| \(poolEmpty \? getDisplayLabel\('DECK_EXHAUSTED'\) : \(isActuallyDisabled \? 'Locked' : getDisplayLabel\('DRAW_A_MISSION'\)\)\);/);
  assert.match(stack, /aria-label=\{drawLabel\}/);
  assert.match(stack, /\{drawLabel\}\n\s*<\/p>/);
});

test('deck draw keyboard path: the lime header badge already was one', () => {
  // Finding while fixing P0-3 (Nov 19, 2026): in the normal draw branch
  // keyboard users were NOT fully locked out — the lime header badge has
  // been a real <button type="button" onClick={onDraw}> since Nov 18
  // (commit d55f803), wired by Deck.tsx only when there is something to
  // draw. It is small (8px status text) and is not the deck, so the deck
  // still needed its own keyboard path as the primary affordance — but
  // the badge is a second, working keyboard path in that branch.
  const panel = read('src/components/missions/MissionActionPanel.tsx');
  const deck = read('src/pages/Deck.tsx');
  assert.match(panel, /<button\n\s*type="button"\n\s*onClick=\{onDraw\}\n\s*disabled=\{drawDisabled\}/);
  assert.match(deck, /onDraw=\{!isDrawn && isNormalDrawBranch \? \(\) => handleDraw\(\) : undefined\}/);
  assert.match(deck, /drawDisabled=\{isDrawing \|\| isStarterConfigurationBlocked \|\| \(isExhausted && !activeTrip\) \|\| isWaitingForReview\}/);
  // The starter early-return branch has no header badge at all; its
  // keyboard path is the separate real draw button below the deck.
  assert.match(deck, /<button\n\s*onClick=\{\(\) => handleDraw\(\)\}\n\s*disabled=\{isDrawing\}\n\s*id="starter-draw-button"/);
});

test('missions freeze: the freeze comment is pinned, with the P0-3 one-off lift recorded', () => {
  // Audit §14: a test pinning the Deck.tsx freeze comment, so a
  // Missions change cannot slip in without a deliberate edit to the
  // guard. The one-off lift is pinned alongside it — the freeze stands
  // for everything else.
  const deck = read('src/pages/Deck.tsx');
  assert.match(deck, /^\/\/ Missions page locked per Zach, Nov 18, 2026 — no additions or changes\n\/\/ to this page until he says so\./);
  assert.match(deck, /\/\/ ONE-OFF LIFT \(Nov 19, 2026, Zach's call, 19:21 PST\): P0-3 ONLY/);
  assert.match(deck, /\/\/ deck draw keyboard path \(DeckStack is now a real <button>; this comment\n\/\/ is the only change to this file\)\./);
  assert.match(deck, /\/\/ else; do not widen this lift without his word\./);
});
