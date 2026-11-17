import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

test('deck line: when a mission is drawn, the deck folds into the mission panel header', () => {
  const deck = read('src/pages/Deck.tsx');
  // Nov 16, 2026: the big deck panel sat between the banner and the
  // mission card. When a mission is drawn it folds into the title part
  // of the mission card as one tappable line; the full panel is the
  // draw surface only when nothing is drawn yet.
  assert.match(deck, /!isDrawn && \(\s*<div className=\{cn\(demoteMissionBrowsing[^]*?<ActiveDeckPanel/s);
  assert.match(deck, /deckLine=\{isDrawn \? \(\s*<ExpandableDeckLine/s);
  assert.match(deck, /<ExpandableDeckLine\s*pack=\{activePack\}/);
});

test('deck line: the mission panel renders the deck line in its header', () => {
  const panel = read('src/components/missions/MissionActionPanel.tsx');
  assert.match(panel, /deckLine\?: ReactNode;/);
  assert.match(panel, /\{deckLine && \(/);
});

test('deck line: tap to expand the full deck detail, and leaving the page resets it', () => {
  const line = read('src/components/missions/ExpandableDeckLine.tsx');
  // Collapsed: cover thumb, deck name, progress at a glance, chevron.
  assert.match(line, /<DeckArtwork\s*pack=\{pack\}/);
  assert.match(line, /\$\{approvedCount\}\/\$\{totalCount\} approved · \$\{pendingCount\} pending/);
  assert.match(line, /aria-expanded=\{expanded\}/);
  assert.match(line, /<ChevronDown/);
  // Expanded: the full deck panel, flipped open from the line.
  assert.match(line, /<ActiveDeckPanel/);
  assert.match(line, /rotateX: -70/);
  // The open/closed state is plain local state — never persisted — so
  // leaving the page always resets the deck to its deck-art side.
  assert.match(line, /const \[expanded, setExpanded\] = useState\(false\);/);
  assert.doesNotMatch(line, /localStorage|sessionStorage/);
  const deck = read('src/pages/Deck.tsx');
  assert.doesNotMatch(deck, /setExpanded/);
});
