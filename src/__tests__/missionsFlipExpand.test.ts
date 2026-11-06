import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');

const read = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), 'utf8');

test('Missions play on the sticker sheet: cream graph paper under the deck and the mission', () => {
  const source = read('src/pages/Deck.tsx');

  // The MissionActionPanel content lives on the same sheet as the
  // StickerBook: cream paper, blue graph grid, hard offset shadow.
  assert.match(source, /bg-\[#F5E9C9\] shadow-\[10px_10px_0px_black\]/);
  assert.match(source, /bg-\[size:22px_22px\]/);
  assert.match(source, /rgba\(62,109,157,0\.18\)/);

  // The sheet wraps the draw/reveal swap, so both states share one page.
  const sheetStart = source.indexOf('bg-[#F5E9C9]');
  const presenceStart = source.indexOf('<AnimatePresence mode="wait">', sheetStart);
  assert.ok(sheetStart !== -1 && presenceStart !== -1 && presenceStart > sheetStart);
});

test('Flip then expand: the deck top card and the revealed mission card share one layoutId', () => {
  const deckStack = read('src/components/DeckStack.tsx');
  const deck = read('src/pages/Deck.tsx');

  // DeckStack takes an optional layoutId and puts it on the top layer only.
  assert.match(deckStack, /layoutId\?: string;/);
  assert.match(deckStack, /layoutId=\{i === 7 \? layoutId : undefined\}/);

  // The main draw stage passes the shared id (the starter flow does not).
  assert.match(deck, /layoutId="mission-draw-card"/);

  // The revealed card carries the same id, with the grow delayed until the
  // flip lands (flip ~0.1-0.5s, grow starts at 0.45s).
  const revealedStart = deck.indexOf("key={(drawnTrip || activeTrip)?.id || 'revealed'}");
  const revealedBlock = deck.slice(revealedStart, revealedStart + 4000);
  assert.match(revealedBlock, /layoutId="mission-draw-card"/);
  assert.match(revealedBlock, /layout: \{ delay: 0\.45, duration: 0\.55/);

  // The flip itself is still there: the card arrives face-down and rotates over.
  assert.match(deck, /rotateY: 180/);
  assert.match(deck, /rotateY: \{ duration: 0\.4, delay: 0\.1 \}/);
});

test('The deck stays on the sheet with a mission drawn: mini deck strip with put-back', () => {
  const source = read('src/pages/Deck.tsx');

  // The revealed state shows where the card came from.
  assert.match(source, /Drawn from/);
  assert.match(source, /activeDeckDisplayName/);

  // Put-back exists and is gated to a freshly drawn card: a resumed active
  // mission cannot be put back (the resume sync would re-expand it).
  assert.match(source, /const canPutBack = !!drawnTrip && !activeTrip;/);
  assert.match(source, /const handlePutBack = \(\) => \{/);
  assert.match(source, /onClick=\{handlePutBack\}/);
  assert.match(source, /disabled=\{!canPutBack\}/);
  assert.match(source, /Tap the deck to put this card back\./);
  assert.match(source, /Finish this mission to draw again\./);

  // The mini deck shows the pack art on top of the stack.
  const stripStart = source.indexOf('The deck you drew from stays on the sheet');
  const stripBlock = source.slice(stripStart, stripStart + 2200);
  assert.match(stripBlock, /<DeckArtwork pack=\{activePack\} \/>/);
});
