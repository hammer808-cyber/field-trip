import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');

const read = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), 'utf8');

test('DEX opens on the deck shelf: Decks is the first tab and the default', () => {
  const source = read('src/pages/Collection.tsx');

  // Tabs array: Decks first, before Collection / Stickers / Zines / Memories.
  const tabsStart = source.indexOf('tabs={[');
  const tabsEnd = source.indexOf(']}', tabsStart);
  const tabsBlock = source.slice(tabsStart, tabsEnd);
  const firstTab = tabsBlock.match(/id: '(\w+)'/);
  assert.equal(firstTab?.[1], 'decks', 'Decks should be the first DEX tab');

  // Default tab (no ?tab= param) lands on the shelf.
  assert.match(source, /\) \|\| 'decks';/);
});

test('DEX deck shelf deep-links at /dex/decks', () => {
  const source = read('src/pages/Collection.tsx');

  assert.match(source, /path\.includes\('\/dex\/decks'\)/);
  assert.match(source, /setActiveTab\('decks'\)/);
  assert.match(source, /decks: '\/dex\/decks'/);
});

test('DEX deck shelf cards show the deck cover art', () => {
  const source = read('src/pages/Collection.tsx');

  // The decks section renders each pack's coverImage, not a text-only card.
  assert.match(source, /src=\{pack\.coverImage\}/);
  assert.match(source, /alt=\{`?\$\{pack\.packName\} cover art`?\}/);
});
