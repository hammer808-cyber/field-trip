import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

test('missions draw button: the big black DRAW A MISSION button below the deck is gone', () => {
  // Nov 18, 2026 (Zach's call, annotated screenshot): the black button
  // under the deck goes; the deck itself is the draw affordance now.
  const deck = read('src/pages/Deck.tsx');
  // The black button was the only use of the dark skin-text fill and the
  // only span rendering displayState.label.
  assert.doesNotMatch(deck, /bg-\[var\(--skin-text\)\]/);
  assert.doesNotMatch(deck, /<span>\{displayState\.label\}<\/span>/);
  assert.match(deck, /The big black DRAW A MISSION button lived here/);
});

test('missions draw button: the deck is still tappable to draw', () => {
  const deck = read('src/pages/Deck.tsx');
  const stack = read('src/components/DeckStack.tsx');
  assert.match(deck, /<DeckStack[\s\S]*?onDraw=\{\(\) => handleDraw\(\)\}/);
  assert.match(stack, /id="starter-deck"/);
  assert.match(stack, /onClick=\{handleDraw\}/);
});

test('missions draw button: the lime header badge is a real draw button', () => {
  // Nov 18, 2026: the header badge already read "Draw a Mission" and
  // looked like a button, but it was a plain span — after the black
  // button's removal it does the drawing, with the same disabled
  // condition the black button carried.
  const deck = read('src/pages/Deck.tsx');
  const panel = read('src/components/missions/MissionActionPanel.tsx');
  assert.match(deck, /onDraw=\{!isDrawn && isNormalDrawBranch \? \(\) => handleDraw\(\) : undefined\}/);
  assert.match(deck, /drawDisabled=\{isDrawing \|\| isStarterConfigurationBlocked \|\| \(isExhausted && !activeTrip\) \|\| isWaitingForReview\}/);
  assert.match(panel, /onDraw\?: \(\) => void;/);
  assert.match(panel, /drawDisabled\?: boolean;/);
  assert.match(panel, /<button[\s\S]*?onClick=\{onDraw\}[\s\S]*?disabled=\{drawDisabled\}/);
  // The header draw only exists in the normal draw branch — the starter
  // COMPLETE / REJECTED / NEEDS MORE PROOF / PENDING panels show a status
  // panel instead of the deck, so there is nothing to draw there.
  assert.match(deck, /isNormalDrawBranch = !\(isStarter && \(starterState\.status === 'COMPLETE' \|\| starterState\.status === 'REJECTED_RETRY_AVAILABLE' \|\| starterState\.status === 'NEEDS_MORE_PROOF' \|\| starterState\.status === 'PENDING_REVIEW'\)\)/);
  // Without a draw action the badge stays a plain status display (e.g.
  // while a mission is drawn).
  assert.match(panel, /\{onDraw \? \(/);
});

test('missions draw button: exhausted and pending states are still communicated', () => {
  const deck = read('src/pages/Deck.tsx');
  const stack = read('src/components/DeckStack.tsx');
  // The status line below SEE ALL CARDS still explains the block.
  assert.match(deck, /No missions left to draw in this deck\./);
  assert.match(deck, /This deck is complete\./);
  assert.match(deck, /Your proof is waiting for review\. You can draw again after it is checked\./);
  // The deck's own prompt still carries the state label.
  assert.match(stack, /statusLabel \|\| \(poolEmpty \? getDisplayLabel\('DECK_EXHAUSTED'\)/);
  assert.match(deck, /statusLabel=\{[\s\S]*?displayState\.label/);
  // The header badge still shows the state label, and is disabled while blocked.
  assert.match(deck, /status=\{missionPanelStatus\}/);
  assert.match(deck, /missionPanelStatus = displayedMissionStatus === 'approved'/);
});

test('missions draw button: the waiting row and SEE ALL CARDS are intact', () => {
  const deck = read('src/pages/Deck.tsx');
  assert.match(deck, /Mission waiting/);
  assert.match(deck, /SEE ALL CARDS/);
  assert.match(deck, /setShowBrowse\(\(v\) => !v\)/);
});

test('missions draw button: the deck is enlarged', () => {
  // Nov 18, 2026 (Zach's call): the deck fills more of the screen.
  // Mobile card 128x176 -> 144x192 (+12.5% wide), sm 256x320 -> 288x352
  // (+12.5% wide); the old 0.9 shrink on mobile is gone, and the draw
  // area grows to fit the taller card plus its prompt.
  const stack = read('src/components/DeckStack.tsx');
  const deck = read('src/pages/Deck.tsx');
  assert.match(stack, /relative w-36 h-48 sm:w-72 sm:h-\[22rem\] group cursor-pointer/);
  assert.match(stack, /relative h-\[240px\] sm:h-\[400px\] w-full flex items-center justify-center py-4/);
  assert.doesNotMatch(stack, /scale-90/);
  // The draw-flight card matches the new mobile size.
  assert.match(stack, /absolute inset-0 h-48 w-36 border-4/);
  // The draw-area wrapper in Deck.tsx is wider too.
  assert.match(deck, /w-full max-w-\[320px\] sm:max-w-\[22rem\] mx-auto/);
  // The prompt sits closer under the taller card so it lands in the gap
  // above SEE ALL CARDS instead of overlapping it now the black button
  // that used to absorb it is gone.
  assert.match(stack, /absolute -bottom-12 left-0 right-0 text-center pointer-events-none/);
  assert.doesNotMatch(stack, /-bottom-20/);
});
