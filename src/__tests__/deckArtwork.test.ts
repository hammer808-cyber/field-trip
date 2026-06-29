import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');

const read = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), 'utf8');

test('DeckArtwork renders deck images as a full-bleed cover layer', () => {
  const source = read('src/components/DeckArtwork.tsx');

  assert.match(source, /absolute inset-0 m-0 h-full w-full border-0 p-0 object-cover/);
  assert.match(source, /objectPosition: pack\?\.artPosition \|\| 'center'/);
});

test('DeckStack active pack art is mounted on the card shell, not the old inset frame', () => {
  const source = read('src/components/DeckStack.tsx');

  assert.match(source, /<DeckArtwork\s+pack=\{activePack\}/);
  assert.doesNotMatch(source, /w-full h-full relative p-2/);
  assert.doesNotMatch(source, /border-2 border-on-surface\/10 overflow-hidden relative field-card/);

  const activeBranchStart = source.indexOf('{activePack ? (');
  const fallbackStart = source.indexOf(') : (', activeBranchStart);
  const activeBranch = source.slice(activeBranchStart, fallbackStart);

  assert.ok(activeBranch.includes('<DeckArtwork'), 'active pack branch should use DeckArtwork');
  assert.ok(!activeBranch.includes('w-[94%] h-[82%]'), 'active pack art should not use the old inset sticker area');
});

test('deck preview surfaces use the shared full-bleed artwork layer', () => {
  const deckPage = read('src/pages/Deck.tsx');
  const selector = read('src/components/DeckPackSelector.tsx');

  assert.match(deckPage, /<DeckArtwork\s+pack=\{activePack\}/);
  assert.match(selector, /<DeckArtwork\s+pack=\{pack\}/);
  assert.match(selector, /<DeckArtwork\s+pack=\{currentPack\}/);
});
