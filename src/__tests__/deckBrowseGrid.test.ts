import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');

const read = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), 'utf8');

test('Missions: a See-all-cards button sits next to the deck draw button', () => {
  const source = read('src/pages/Deck.tsx');

  // Toggle state, default closed: the grid is on demand, not always on.
  assert.match(source, /const \[showBrowse, setShowBrowse\] = useState\(false\);/);
  // The button lives in the draw stage, right after the Draw button, and
  // flips the toggle with an accessible expanded state.
  assert.match(source, /onClick=\{\(\) => setShowBrowse\(\(v\) => !v\)\}/);
  assert.match(source, /aria-expanded=\{showBrowse\}/);
  assert.match(source, /SEE ALL CARDS/);
  assert.match(source, /HIDE ALL CARDS/);
  assert.match(source, /<LayoutGrid /);
});

test('Missions: the browse grid only renders when the button opens it', () => {
  const source = read('src/pages/Deck.tsx');

  // The DeckLibrary browse section is gated on showBrowse — no
  // always-visible copy of the grid remains on the page.
  const sectionIdx = source.indexOf('<DeckLibrary allChallenges={browseChallenges as any} />');
  assert.ok(sectionIdx > 0, 'browse section missing');
  const guardIdx = source.lastIndexOf('{showBrowse && (', sectionIdx);
  assert.ok(guardIdx > 0, 'browse section must be gated on showBrowse');
  assert.ok(
    !source.includes("<section aria-label={frankieMode ? 'See all cards in this deck' : 'Browse all missions in this deck'} className=\"mt-4 border-t-4 border-on-surface/10 pt-2\">\n          <DeckLibrary"),
    'no unconditional browse section may remain',
  );
  // Opening it scrolls the grid into view.
  assert.match(source, /browseSectionRef\.current\?\.scrollIntoView/);
});

test('DeckLibrary: the grid sorts by deck order, difficulty, and title', () => {
  const source = read('src/components/DeckLibrary.tsx');

  assert.match(
    source,
    /const \[sort, setSort\] = useState<'deck' \| 'difficulty' \| 'title'>\('deck'\);/,
  );
  assert.match(source, /<option value="deck">/);
  assert.match(source, /<option value="difficulty">/);
  assert.match(source, /<option value="title">/);
  // Difficulty sorts easiest first.
  assert.match(source, /DIFFICULTY_RANK/);
  assert.match(source, /easy: 0, medium: 1, hard: 2/);
  // The grid renders the sorted list, not the raw filtered list.
  assert.match(source, /sortedChallenges\.map\(\(challenge, idx\) => \(/);
  assert.doesNotMatch(source, /filteredChallenges\.map\(\(challenge, idx\) => \(/);
});

test('DeckLibrary: each card face shows its mission, not just its title', () => {
  const source = read('src/components/DeckLibrary.tsx');

  // Normal mode shows the short prompt (what the card asks you to do);
  // Frankie Mode already showed the plain description.
  assert.match(
    source,
    /\{!frankieMode && \(challenge\.shortPrompt \|\| \(challenge as any\)\.mission\) && \(/,
  );
  assert.match(source, /\{challenge\.shortPrompt \|\| \(challenge as any\)\.mission\}/);
});

test('DeckLibrary: choosing a card still starts it like a draw', () => {
  const source = read('src/components/DeckLibrary.tsx');

  // Tap a card -> preview modal -> Do This One draws that exact trip and
  // goes to Capture. The browse path must not bypass the draw.
  assert.match(source, /drawTrip\(selectedChallenge\.id\)/);
  assert.match(source, /navigate\('\/capture\?id=' \+ selectedChallenge\.id\)/);
});
