import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');

const read = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), 'utf8');

// P1-8 (audit §12, Nov 20, 2026): DEX opens on the sticker collection,
// not the deck shelf. A user tapping "DEX" expecting their collection
// used to land on deck progress. Solution picked: default to stickers
// (the simpler of the two audit options — no remembered-tab storage).

test('P1-8: opening Dex with no tab lands on stickers', () => {
  const source = read('src/pages/Collection.tsx');

  // No ?tab= param: the initial-tab fallback is the default.
  assert.match(source, /\) \|\| 'stickers';/);
  assert.doesNotMatch(source, /\) \|\| 'decks';/);

  // The Stickers tab exists and renders the collection.
  const tabsStart = source.indexOf('tabs={[');
  const tabsEnd = source.indexOf(']}', tabsStart);
  const tabsBlock = source.slice(tabsStart, tabsEnd);
  assert.match(tabsBlock, /id: 'stickers'/);
  assert.match(source, /<StickerMachine \/>/);
});

test('P1-8 regression guard: an explicit decks tab still lands on decks', () => {
  const source = read('src/pages/Collection.tsx');

  // ?tab=decks resolves through the generic tab branch.
  assert.match(source, /setActiveTab\(DEX_TABS\.includes\(tab\) \? tab : 'decks'\)/);

  // /dex/decks path deep-link sets the decks tab.
  assert.match(source, /path\.includes\('\/dex\/decks'\)/);
  assert.match(
    source,
    /path\.includes\('\/dex\/decks'\)\) \{\s*\n\s*setActiveTab\('decks'\)/
  );

  // Tapping the Decks tab in-page still navigates to /dex/decks.
  assert.match(source, /decks: '\/dex\/decks'/);
});

test('P1-8: legacy aliases still fall back to decks, not a blank page', () => {
  const source = read('src/pages/Collection.tsx');

  // Removed ?tab= values (skins / badges / crew_home) keep their
  // Nov 17 fallback to the deck shelf.
  assert.match(
    source,
    /tabParam === 'skins' \|\| tabParam === 'badges' \|\| tabParam === 'crew_home'\) \{\s*\n\s*setActiveTab\('decks'\)/
  );
  // Any other unknown ?tab= value falls back to decks too.
  assert.match(source, /DEX_TABS\.includes\(rawInitialTab as CollectionTab\) \? \(rawInitialTab as CollectionTab\) : 'decks'/);
});
