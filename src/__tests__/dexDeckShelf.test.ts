import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');

const read = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), 'utf8');

test('DEX tabs: Decks is the first tab; Stickers is the default (P1-8)', () => {
  const source = read('src/pages/Collection.tsx');

  // Tabs array: Decks first, before Collection / Stickers / Zines / Memories.
  const tabsStart = source.indexOf('tabs={[');
  const tabsEnd = source.indexOf(']}', tabsStart);
  const tabsBlock = source.slice(tabsStart, tabsEnd);
  const firstTab = tabsBlock.match(/id: '(\w+)'/);
  assert.equal(firstTab?.[1], 'decks', 'Decks should be the first DEX tab');

  // Default tab (no ?tab= param) lands on the sticker collection (P1-8,
  // Nov 20, 2026 — was 'decks' before the fix).
  assert.match(source, /\) \|\| 'stickers';/);
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

test('DEX shelf cards show more art: the cover fills a taller frame', () => {
  const source = read('src/pages/Collection.tsx');

  // The cover art block is a 4:3 frame, not the old 16:9 strip.
  assert.match(source, /aspect-\[4\/3\] overflow-hidden border-b-\[3px\] border-on-surface/);
  assert.doesNotMatch(source, /aspect-\[16\/9\] overflow-hidden border-b-\[3px\] border-on-surface/);
});

test('DEX shelf Select Deck carries the pack in the URL so Missions applies it', () => {
  const source = read('src/pages/Collection.tsx');

  assert.match(source, /navigate\(`\/missions\?pack=\$\{pack\.packId\}`\)/);
});

test('DEX deck choice survives auth loading: the Missions guard waits for the session', () => {
  const deckSource = read('src/pages/Deck.tsx');

  // The security-guard snap-back must not run while isAdmin / isOnboardingComplete
  // still read false because the session has not resolved yet.
  const guardStart = deckSource.indexOf('// Security Guard: Sync active pack');
  const guardEnd = deckSource.indexOf('// Save active pack ID to localStorage', guardStart);
  const guardBlock = deckSource.slice(guardStart, guardEnd);
  assert.match(guardBlock, /if \(authLoading\) return;/);
});

test('Stickers tab is live: Stickers tab exists and /dex/stickers renders StickerMachine', () => {
  const source = read('src/pages/Collection.tsx');

  const tabsStart = source.indexOf('tabs={[');
  const tabsEnd = source.indexOf(']}', tabsStart);
  const tabsBlock = source.slice(tabsStart, tabsEnd);
  assert.match(tabsBlock, /id: 'stickers'/);

  // The sticker collection UI is mounted in the DEX.
  assert.match(source, /<StickerMachine \/>/);
  assert.doesNotMatch(source, /<StickerBook \/>/);

  // Sticker deep links land on the Stickers tab instead of the shelf.
  assert.match(source, /tabParam === 'stickers'\) \{\s*\n\s*setActiveTab\('stickers'\)/);
  assert.match(source, /path\.includes\('\/dex\/stickers'\)\) \{\s*\n\s*setActiveTab\('stickers'\)/);
});
