import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

test('missions draw reset: returning with an active mission opens on the deck, not the poster', () => {
  // Nov 17, 2026 (Zach's call): Missions opens on the deck; the deck draw
  // is always the option. A draw IS the assignment (drawTrip writes
  // activeTrip immediately), so the old sync effect re-expanded the poster
  // on every return. The effect now re-expands only for a same-session
  // reveal or a mission that needs action — never for a plain resume.
  const deck = read('src/pages/Deck.tsx');
  const effect = deck.slice(
    deck.indexOf('// Sync initial state from a same-session reveal'),
    deck.indexOf('const handleDraw'),
  );
  assert.ok(effect.length > 0, 'sync effect found');
  assert.doesNotMatch(effect, /guidance\.state === 'RESUME_ACTIVE_MISSION'/);
  assert.match(effect, /REPAIR_PROOF/);
  assert.match(effect, /RETRY_REJECTED_PROOF/);
  assert.match(effect, /hasRevealedInActiveSession/);
});

test('missions draw reset: a waiting row holds the unfinished mission on the deck', () => {
  // Nov 17, 2026: the unfinished mission is not stranded by the reset — it
  // waits in a small row above the deck with the same start action as the
  // poster's DO THIS MISSION button.
  const deck = read('src/pages/Deck.tsx');
  const rowAt = deck.indexOf('Mission waiting');
  assert.ok(rowAt > 0, 'waiting row rendered');
  const row = deck.slice(rowAt - 200, rowAt + 2500);
  assert.match(row, /\{activeTrip && \(/);
  assert.match(row, /\{displayedMission\?\.title\}/);
  assert.match(row, /getDisplayLabel\('DO_THIS_MISSION'\)/);
  assert.match(row, /await setActiveMissionCard\(missionId\)/);
  assert.match(row, /navigate\(`\/capture\?id=\$\{missionId\}`\)/);
  // Approved/pending missions open the poster for their status instead of
  // entering capture — the same guard the poster button carries.
  assert.match(row, /missionStatus === 'approved' \|\| missionStatus === 'pending_review'/);
  // The row lives in the deck (not drawn) branch, above the deck stack.
  const deckHeroAt = deck.indexOf('key="deck-hero"');
  assert.ok(rowAt > deckHeroAt, 'waiting row is inside the deck-hero branch');
  assert.ok(rowAt < deck.indexOf('<DeckStack', deckHeroAt), 'waiting row sits above the deck');
});

test('missions draw reset: "Draw a different one" is gone — the deck is the redraw', () => {
  // Nov 17, 2026: with the deck always visible, the small redraw button
  // under the poster is redundant. The deck itself is the way to draw again.
  const deck = read('src/pages/Deck.tsx');
  assert.doesNotMatch(deck, /Draw a different one/);
});

test('missions draw reset: put-back stays — it is the only escape hatch for a draw that never became an assignment', () => {
  // Nov 17, 2026: canPutBack is unreachable after a normal draw (drawTrip
  // writes activeTrip first), but it IS reachable when a draw never became
  // an assignment: the starter early-return path in drawTrip returns an
  // already-drawn starter without writing activeTrip (so a stale drawn
  // starter card with no activeTrip renders it), and a failed profile
  // write on draw leaves drawnTrip set with activeTrip null. Removing it
  // would strand those cases with no way back to the deck.
  const deck = read('src/pages/Deck.tsx');
  assert.match(deck, /const canPutBack = !!drawnTrip && !activeTrip;/);
  assert.match(deck, /Put this card back on the deck/);
  const drawTrip = read('src/context/AppContext.tsx');
  assert.match(
    drawTrip,
    /if \(activeDrawnStarter && !canonicalStarterDeckState\.submittedIds\.includes\(activeDrawnStarter\.id\.toLowerCase\(\)\)\) \{\s*if \(import\.meta\.env\.DEV\)/,
  );
});

test('missions draw reset: save-for-later is untouched (session-local, out of scope)', () => {
  // Nov 17, 2026: making save-for-later a real reset needs an activeTrip
  // clear plus excluding 'saved_for_later' from the lifecycle lookup — a
  // separate fix, not this one. It stays session-local here.
  const deck = read('src/pages/Deck.tsx');
  assert.match(deck, /Save for later/);
  assert.match(deck, /updateMissionCardStatus\(missionId, 'saved_for_later'/);
});
