import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

test('dex: the Collection tab is gone, with its medals cabinet', () => {
  const dex = read('src/pages/Collection.tsx');
  // Nov 17, 2026: the Collection tab was unnecessary — the medals
  // cabinet was its only content, and it went with the tab.
  assert.doesNotMatch(dex, /\{ id: 'collection', label: 'Collection' \}/);
  assert.doesNotMatch(dex, /activeTab === 'collection'/);
  assert.doesNotMatch(dex, /activeTab === 'badges'/);
  assert.doesNotMatch(dex, /type CollectionTab = [^;]*'collection'/);
  assert.doesNotMatch(dex, /type CollectionTab = [^;]*'badges'/);
  assert.doesNotMatch(dex, /<RewardItem /);
  // The remaining tabs still render.
  for (const tab of ['decks', 'stickers', 'zines', 'memories']) {
    assert.match(dex, new RegExp(`activeTab === '${tab}'`));
  }
});

test('dex: old links and params land on Decks instead of a blank page', () => {
  const dex = read('src/pages/Collection.tsx');
  // Legacy ?tab= values that used to open the cabinet.
  assert.match(dex, /tabParam === 'skins' \|\| tabParam === 'badges' \|\| tabParam === 'crew_home'\) \{\s*setActiveTab\('decks'\)/);
  // Any other removed/unknown tab value falls back too.
  assert.match(dex, /setActiveTab\(DEX_TABS\.includes\(tab\) \? tab : 'decks'\)/);
  assert.match(dex, /DEX_TABS\.includes\(rawInitialTab as CollectionTab\)/);
  // No in-page route to the removed tab remains.
  assert.doesNotMatch(dex, /\/dex\/collection/);
  const app = read('src/App.tsx');
  assert.match(app, /path="\/dex\/collection" element=\{<Navigate to="\/dex" replace \/>\} \/>/);
  const feedback = read('src/components/RewardFeedback.tsx');
  assert.match(feedback, /redirectPath \?\? '\/dex';/);
  assert.doesNotMatch(feedback, /\/dex\/collection/);
});
