// Big Board playful experiment (Nov 27, 2026 — Zach's word): Bebas
// Neue titles + Poppins body + glassmorphism, scoped to the Big Board
// page only. Principle: Bebas is for headings/titles only; every other
// word — labels, body, buttons, tabs, scores, values — is Poppins.
// The glass lives on the four large section panels; the small sticker
// cards keep their opaque paper faces (their layered construction
// would turn a translucent face muddy grey, and dozens of small blurs
// would cost phones frames). Source assertions: this is a style pass,
// so the pins are on the shipped source and the page-scoped CSS.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

const css = read('src/index.css');
const board = read('src/pages/BigBoard.tsx');
const table = read('src/components/BigBoardStandingsTable.tsx');

// The appended page-scope block, for rules that must not leak.
const scopeStart = css.indexOf('.ft-dept-board.big-board-playful');
assert.ok(scopeStart >= 0, 'big-board-playful scope block exists in index.css');
const scopeBlock = css.slice(scopeStart);

test('Poppins is loaded from Google Fonts', () => {
  assert.ok(
    css.includes('family=Poppins:wght@400;500;600;700;800;900'),
    'Poppins 400-900 is in the fonts import',
  );
});

test('font-poppins utility exists via the theme token', () => {
  assert.ok(
    css.includes('--font-poppins: "Poppins"'),
    '--font-poppins is defined in @theme',
  );
});

test('Big Board root carries the page-scoped class', () => {
  assert.ok(
    board.includes('big-board-playful'),
    'BigBoard root shell carries big-board-playful',
  );
  // The scope class lives on the page root only: no other page opts in.
  assert.ok(!read('src/pages/Basecamp.tsx').includes('big-board-playful'));
  assert.ok(!read('src/pages/Deck.tsx').includes('big-board-playful'));
  assert.ok(!read('src/pages/Collection.tsx').includes('big-board-playful'));
});

test('section titles use the display font (Bebas Neue)', () => {
  for (const title of ['Top explorers', 'Results Desk', 'Community Feed']) {
    // lastIndexOf: "Community Feed" also names a hero tab earlier in
    // the file; the h2 heading is the last occurrence.
    const at = board.lastIndexOf(title);
    assert.ok(at >= 0, `${title} is on the page`);
    // The heading element carrying the title uses font-display.
    const window = board.slice(Math.max(0, at - 400), at);
    assert.ok(
      window.includes('font-display'),
      `${title} heading uses font-display`,
    );
  }
  // The empty-state heading is a title too, not body copy.
  assert.ok(board.includes('font-display text-base font-black uppercase tracking-widest text-on-surface italic'));
});

test('body text on the page resolves to Poppins, not Inter', () => {
  // The scope remaps every non-title font utility this page uses.
  for (const utility of ['.font-sans', '.font-mono', '.font-serif', '.font-outfit']) {
    assert.ok(
      scopeBlock.includes(`.big-board-playful ${utility}`),
      `scope remaps ${utility} to Poppins`,
    );
  }
  assert.ok(
    scopeBlock.includes('font-family: "Poppins"'),
    'the remap points at Poppins',
  );
  // The hero tab labels and the non-title hero display values follow.
  assert.ok(scopeBlock.includes('.big-board-playful [role="tab"]'));
  assert.ok(scopeBlock.includes('.big-board-playful header :not(h1).font-display'));
  // The standings table (Big Board-only) reads names, ranks, and
  // scores in Poppins instead of the display font.
  assert.ok(table.includes('font-poppins text-xl font-black italic'));
  assert.ok(table.includes('font-poppins text-base font-black uppercase italic'));
  assert.ok(!table.includes('font-display'), 'no Bebas left in the standings table');
  // The stat-card values are values, not titles.
  assert.ok(board.includes('font-poppins font-black text-2xl'));
  assert.ok(board.includes('font-poppins font-black text-base'));
});

test('glass treatment is on the board panels', () => {
  // The frosted-glass class exists with blur + translucent fill.
  assert.ok(scopeBlock.includes('.big-board-playful .bb-glass'));
  assert.ok(scopeBlock.includes('backdrop-filter: blur(14px)'));
  assert.ok(scopeBlock.includes('background-color: rgb(255 255 255 / 0.72)'));
  // All four large section panels carry it.
  const glassUses = board.match(/bb-glass/g) || [];
  assert.ok(glassUses.length >= 4, `bb-glass used on panels (found ${glassUses.length})`);
  // The hard black offset shadows are gone from those panels.
  assert.ok(!board.includes('shadow-[12px_12px_0px_black]'), 'standings hard shadow removed');
  assert.ok(!board.includes('shadow-[10px_10px_0px_black]'), 'results/pulse hard shadows removed');
  // The playful wash is token-based colour pools over paper.
  assert.ok(scopeBlock.includes('color-mix(in srgb, var(--color-brand-cyan)'));
  assert.ok(scopeBlock.includes('color-mix(in srgb, var(--color-brand-orange)'));
  assert.ok(scopeBlock.includes('color-mix(in srgb, var(--color-brand-lime)'));
});

test('mobile blur is cheaper than desktop blur', () => {
  assert.ok(scopeBlock.includes('@media (max-width: 640px)'));
  const mobile = scopeBlock.slice(scopeBlock.indexOf('@media (max-width: 640px)'));
  assert.ok(mobile.includes('backdrop-filter: blur(8px)'), 'phones get 8px blur');
});

test('no new hex colours or em dashes in the experiment', () => {
  assert.ok(!/#[0-9a-fA-F]{3,8}/.test(scopeBlock), 'scope block has no hex literals');
  assert.ok(!scopeBlock.includes('—'), 'scope block has no em dashes');
});

test('no other page picks up Poppins', () => {
  for (const page of ['src/pages/Basecamp.tsx', 'src/pages/Deck.tsx', 'src/pages/Collection.tsx', 'src/pages/Profile.tsx']) {
    assert.ok(!read(page).includes('font-poppins'), `${page} does not use font-poppins`);
  }
  assert.ok(!read('src/components/FieldPageHero.tsx').includes('font-poppins'));
  assert.ok(!read('src/components/FieldHeroTabs.tsx').includes('font-poppins'));
});
