import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  COLLECTION_META,
  COLLECTION_SHELF_ORDER,
  getStickersByCollection,
  type StickerCollection
} from '../data/stickers';
import {
  STICKER_FOLDER_TAB_ACCENTS,
  StickerCollectionSection,
  StickerFolderTab
} from '../components/stickers/StickerGrid';
import { DecalShelf } from '../components/stickers/DecalShelf';

const read = (rel: string) => readFileSync(join(process.cwd(), rel), 'utf8');

test('every collection has a folder-tab accent, and every accent is a skin token, never a hex', () => {
  for (const collection of COLLECTION_SHELF_ORDER) {
    const accent = STICKER_FOLDER_TAB_ACCENTS[collection as StickerCollection];
    assert.ok(accent, `${collection} has no folder-tab accent`);
    assert.match(accent, /^var\(--(skin-|color-)[a-z-]+\)$/, `${collection} accent must be a skin token`);
    assert.doesNotMatch(accent, /#[0-9a-fA-F]{3,8}/, `${collection} accent must not be a hard-coded hex`);
  }
  // The map covers exactly the shelf order — a new collection cannot
  // silently fall through to an uncolored tab.
  assert.deepEqual(
    Object.keys(STICKER_FOLDER_TAB_ACCENTS).sort(),
    [...COLLECTION_SHELF_ORDER].sort()
  );
});

test('a collection shelf renders one folder tab with its name and count, in the sheet tone', () => {
  const stickers = getStickersByCollection('explorer');
  const html = renderToStaticMarkup(
    <StickerCollectionSection
      collection="explorer"
      stickers={stickers}
      earnedCount={7}
      totalCount={39}
      unlocksById={new Map()}
      onOpenSticker={() => undefined}
      tone="plain"
    />
  );

  assert.match(html, /data-testid="sticker-folder-tab"/);
  assert.match(html, /Explorer/);
  assert.match(html, /7 \/ 39/);
  // Tab and sheet share the plain tone: white surface.
  assert.match(html, /background:\s*var\(--skin-surface\)/);
  // The tagline stays in the sheet; the old in-sheet h3 header is gone —
  // exactly one h3 remains, inside the tab (the second "Explorer" hit is
  // the section's aria-label, not visible text).
  assert.match(html, /Who you are in the field\./);
  assert.equal((html.match(/<h3/g) ?? []).length, 1, 'exactly one h3: the tab');

  const mutedHtml = renderToStaticMarkup(
    <StickerCollectionSection
      collection="adventure"
      stickers={getStickersByCollection('adventure')}
      earnedCount={4}
      totalCount={15}
      unlocksById={new Map()}
      onOpenSticker={() => undefined}
      tone="muted"
    />
  );
  assert.match(mutedHtml, /background:\s*var\(--skin-surface-muted\)/);
  assert.match(mutedHtml, /4 \/ 15/);
});

test('the folder tab count stays at 70% ink (the AA pin from the Nov 21 Dex round)', () => {
  const source = read('src/components/stickers/StickerGrid.tsx');
  assert.match(source, /opacity-70/);
  // The tab is attached: open bottom, negative margin pulling the
  // sheet's top border underneath it.
  assert.match(source, /border-b-0/);
  assert.match(source, /marginBottom: `-\$\{overlapPx\}px`/);
});

test('the Decals shelf is a folder too, with its count in the tab', () => {
  const html = renderToStaticMarkup(<DecalShelf profile={null} />);
  assert.match(html, /data-testid="sticker-folder-tab"/);
  assert.match(html, /Decals/);
  assert.match(html, /0 of \d+ earned/);
  // The tagline and the stamp stay in the sheet.
  assert.match(html, /Earned by deeds, not draws/);
  assert.match(html, /One of a kind/);
});

test('the Sticker Machine card carries its title in a folder tab, not a header h2', () => {
  const source = read('src/components/stickers/StickerMachine.tsx');
  assert.match(source, /<StickerFolderTab/);
  assert.match(source, /headingId="sticker-machine-title"/);
  assert.match(source, /overlapPx=\{3\}/);
  // One h2 in the file, inside the tab — the old in-header h2 is gone.
  assert.equal((source.match(/<h2/g) ?? []).length, 1);
  // The left tape strip is gone (the tab occupies that corner); the
  // right tape strip stays.
  assert.equal((source.match(/field-tape/g) ?? []).length, 1);
  assert.match(source, /right-4/);
  assert.doesNotMatch(source, /left-4/);
});

test('filter pills are folder index tabs on a ruled divider, on paper tones', () => {
  const source = read('src/components/stickers/StickerFilterTabs.tsx');
  // Folder-tab shape: rounded top only, open bottom. The shared
  // .skin-button class is absent — it forces a 14px all-corner radius.
  assert.match(source, /rounded-t-\[10px\] border-2 border-b-0/);
  assert.doesNotMatch(source, /'skin-button/, 'the shared button class must not be applied to the tab buttons');
  // The rows carry the 2px rule the tabs sit on.
  assert.equal((source.match(/border-b-2 border-\[var\(--skin-border\)\]/g) ?? []).length, 2);
  // Inactive tabs sit on the deeper beige paper token, not white.
  assert.match(source, /bg-\[var\(--skin-background-alt\)\]/);
  // The active tab is the open folder: its own-color shadow covers
  // the rule segment beneath it.
  assert.match(source, /shadow-\[0_2px_0_var\(--skin-primary\)\]/);
});

test('no hard-coded hex colors in the touched sticker files', () => {
  for (const rel of [
    'src/components/stickers/StickerGrid.tsx',
    'src/components/stickers/StickerFilterTabs.tsx',
    'src/components/stickers/StickerMachine.tsx',
    'src/components/stickers/DecalShelf.tsx'
  ]) {
    assert.doesNotMatch(read(rel), /#[0-9a-fA-F]{3,8}\b/, `${rel} must not contain a hard-coded hex`);
  }
});

test('the shelf tape strip is gone — the folder tab is the top anchor now', () => {
  const source = read('src/components/stickers/StickerGrid.tsx');
  assert.doesNotMatch(source, /field-tape/);
  assert.match(source, /The tab replaces the centered tape strip/);
});
