import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

// Mission Archive filter row overflow (Nov 21, 2026, Zach's screenshot):
// the ALL / ELIGIBLE / COMPLETED / LOCKED / SORT row ran off the right
// edge of a phone screen and SORT was unreachable. Root cause, measured
// in a headless replica at 390px with the real compiled CSS: the chips +
// SORT are ~650px of min-content, and the page's .page-scroll container
// is a column flex whose max-w-6xl flex item cannot shrink below that
// min-content — the whole Missions page laid out ~740px wide and
// overflow-x-hidden clipped the excess. The row's own overflow-x-auto
// never engaged because its box was as wide as its content. Fix: the
// row wraps, so every filter and SORT stay on screen with no hidden
// scrolling. These tests pin the wrapping form.

test('archive filter row: wraps instead of scrolling off the page', () => {
  const library = read('src/components/DeckLibrary.tsx');
  assert.match(library, /<div className="flex flex-wrap gap-2">/);
  assert.doesNotMatch(library, /overflow-x-auto pb-2 scrollbar-none/);
});

test('archive filter row: all four filters and the SORT control are still there', () => {
  const library = read('src/components/DeckLibrary.tsx');
  for (const f of ['all', 'eligible', 'completed', 'locked']) {
    assert.ok(library.includes(`'${f}'`), `filter ${f} is still rendered`);
  }
  assert.match(library, /aria-label=\{frankieMode \? 'Sort cards' : 'Sort by'\}/);
  assert.match(library, /value="deck"/);
  assert.match(library, /value="difficulty"/);
  assert.match(library, /value="title"/);
});

test('archive filter row: chips keep shrink-0 so wrapping never squishes them', () => {
  const library = read('src/components/DeckLibrary.tsx');
  assert.match(library, /border-2 transition-all shrink-0/);
});

test('archive filter row: the page-scroll column-flex hazard is documented at the fix', () => {
  const library = read('src/components/DeckLibrary.tsx');
  assert.match(library, /Nov 21, 2026 \(Zach's screenshot\)/);
  assert.match(library, /page-scroll/);
});
