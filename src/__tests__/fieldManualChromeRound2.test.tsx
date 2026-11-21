/**
 * Field Manual chrome, round 2 — Dex folder finish + stamps / pen-marks
 * layer (Nov 21, 2026, slice B).
 *
 * Part 1: the Dex tab content sits inside a folder body and the hero's
 * tab strip attaches to it (flushTabs + zero top padding on the body).
 * Part 2: FieldDoodles — a shared decorative layer of FieldStamps and
 * hand-drawn pen marks with deterministic placement (seeded from the
 * page key, never Math.random at render), mounted on Basecamp, Dex,
 * Profile, and Big Board.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FieldDoodles, doodleSeed, doodlePlacements } from '../components/FieldDoodles';

const read = (path: string) => readFileSync(path, 'utf8');

// --- Part 1: Dex as file folders ------------------------------------------

test('folder: the Dex hero attaches its tabs to the folder body (flushTabs)', () => {
  const collection = read('src/pages/Collection.tsx');
  assert.match(collection, /<FieldPageHero[\s\S]*?flushTabs/, 'Dex hero does not pass flushTabs');
  assert.ok(collection.includes('data-testid="dex-folder-body"'), 'Dex content has no folder-body test id');
  assert.ok(
    collection.includes('className="ft-dept-body--folder-tabs"'),
    'Dex body does not use the folder-tabs class',
  );
});

test('folder: flushTabs drops the hero bottom border, and only for that page', () => {
  const hero = read('src/components/FieldPageHero.tsx');
  assert.ok(hero.includes('flushTabs?: boolean'), 'hero has no flushTabs prop');
  assert.match(
    hero,
    /flushTabs \? 'border-b-0' : 'border-b-4'/,
    'hero does not switch its bottom border on flushTabs',
  );
  // Default off: every other page keeps its border.
  assert.ok(hero.includes('flushTabs = false'), 'flushTabs is not off by default');
});

test('folder: the folder-tabs body class zeroes the top padding', () => {
  const css = read('src/components/player/departments.css');
  assert.match(
    css,
    /\.ft-dept-body--folder-tabs \{\s*padding-top: 0;\s*\}/,
    'folder-tabs body class does not zero the top padding',
  );
});

// --- Part 2: deterministic placement --------------------------------------

test('doodles: the seed is deterministic and differs per page', () => {
  assert.equal(doodleSeed('dex'), doodleSeed('dex'), 'same page key gives a different seed');
  assert.equal(doodleSeed('basecamp'), doodleSeed('basecamp'), 'same page key gives a different seed');
  const keys = ['basecamp', 'dex', 'profile', 'board'];
  const seeds = new Set(keys.map(doodleSeed));
  assert.equal(seeds.size, keys.length, 'two pages share a seed — their doodles would collide');
});

test('doodles: placements are deterministic and stay inside their bounds', () => {
  const a = doodlePlacements('dex');
  const b = doodlePlacements('dex');
  assert.deepEqual(a, b, 'same page key renders different placements');
  assert.ok(a.rotation >= -8 && a.rotation <= 8, `rotation out of range: ${a.rotation}`);
  assert.ok(a.rotation2 >= -6 && a.rotation2 <= 6, `rotation2 out of range: ${a.rotation2}`);
  assert.ok(a.nudgeX >= -4 && a.nudgeX <= 4, `nudgeX out of range: ${a.nudgeX}`);
  assert.ok(a.nudgeY >= -3 && a.nudgeY <= 3, `nudgeY out of range: ${a.nudgeY}`);
  assert.ok(a.marginTopLeft >= 40 && a.marginTopLeft <= 46, `marginTopLeft out of range: ${a.marginTopLeft}`);
  assert.ok(a.marginTopRight >= 56 && a.marginTopRight <= 62, `marginTopRight out of range: ${a.marginTopRight}`);
});

test('doodles: no Math.random anywhere in the layer (P2 — nothing jumps on re-render)', () => {
  assert.doesNotMatch(read('src/components/FieldDoodles.tsx'), /Math\.random/, 'doodle layer uses Math.random');
});

test('doodles: no hard-coded hex in the layer (P2-1) — pen strokes use skin tokens', () => {
  assert.doesNotMatch(read('src/components/FieldDoodles.tsx'), /#[0-9a-fA-F]{3,8}\b/, 'doodle layer has a hard-coded hex');
});

// --- Part 2: the layer itself ---------------------------------------------

const twoStamps = [
  { label: 'COLLECTED', tone: 'primary' as const },
  { label: 'FILED', tone: 'text' as const },
];

test('doodles: same page key renders byte-identical markup twice', () => {
  const once = renderToStaticMarkup(<FieldDoodles pageKey="dex" stamps={twoStamps} />);
  const twice = renderToStaticMarkup(<FieldDoodles pageKey="dex" stamps={twoStamps} />);
  assert.equal(once, twice, 'doodle layer is not deterministic across renders');
});

test('doodles: the layer is decorative and non-interactive by construction', () => {
  const html = renderToStaticMarkup(<FieldDoodles pageKey="dex" stamps={twoStamps} />);
  assert.ok(html.includes('aria-hidden="true"'), 'doodle layer is not aria-hidden');
  assert.ok(html.includes('pointer-events-none'), 'doodle layer can intercept pointer events');
  assert.ok(html.includes('hidden lg:block'), 'doodle layer is not hidden below lg (no margins there)');
  assert.ok(html.includes('absolute inset-0'), 'doodle layer is not an absolute overlay');
  assert.ok(html.includes('data-testid="field-doodles-dex"'), 'doodle layer has no page test id');
});

test('doodles: stamps reuse the FieldStamp kit, with the real labels', () => {
  const html = renderToStaticMarkup(<FieldDoodles pageKey="dex" stamps={twoStamps} />);
  assert.ok(html.includes('COLLECTED'), 'doodle layer has no COLLECTED stamp');
  assert.ok(html.includes('FILED'), 'doodle layer has no FILED stamp');
  // FieldStamp kit: double border, mono uppercase, aria-hidden.
  assert.ok(html.includes('border-[var(--skin-primary)]'), 'primary stamp is not the kit orange');
  assert.ok(html.includes('border-[var(--skin-text)]'), 'text stamp is not the kit ink');
  const doodles = read('src/components/FieldDoodles.tsx');
  assert.ok(doodles.includes("import { FieldStamp"), 'doodle layer does not reuse the FieldStamp kit');
});

test('doodles: pen marks are graphical only — circle, underline, check, arrow, no words', () => {
  const html = renderToStaticMarkup(<FieldDoodles pageKey="dex" stamps={twoStamps} />);
  // Four SVG pen marks: ellipse circle, squiggle underline, checkmark, arrow.
  assert.equal((html.match(/<svg/g) || []).length, 4, `expected 4 pen-mark SVGs, got ${html}: ${html}`);
  // The only text in the layer is the two stamp labels.
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  assert.equal(text, 'COLLECTED FILED', `doodle layer carries invented words: ${text}`);
  // Pen strokes come from skin tokens, never a hex.
  assert.ok(html.includes('stroke="var(--skin-text)"'), 'pen marks do not use the skin text token');
});

test('doodles: the margin marks live only in the wide-screen gutters', () => {
  const html = renderToStaticMarkup(<FieldDoodles pageKey="dex" stamps={twoStamps} />);
  assert.ok(html.includes('2xl:block'), 'margin pen marks are not gated to 2xl gutters');
  // Placement is corners/margins only — nothing centred, and nothing
  // anchored to the page bottom, where a real button could sit. The
  // one 'bottom-' in the markup is the squiggle under the second
  // stamp, positioned relative to that stamp, not the page.
  assert.ok(!html.includes('left-1/2') && !html.includes('top-1/2'), 'doodle layer centres an element');
  assert.equal((html.match(/bottom-/g) || []).length, 1, 'doodle layer anchors an element to the page bottom');
  assert.ok(html.includes('-bottom-2'), 'squiggle underline is not under its stamp');
  assert.ok(html.includes('right-3 top-3'), 'stamp cluster is not in the top-right corner');
});

test('doodles: with no stamps the layer still renders its pen marks, and nothing else', () => {
  const html = renderToStaticMarkup(<FieldDoodles pageKey="board" stamps={[]} />);
  assert.ok(html.includes('field-doodles-board'), 'empty doodle layer does not render');
  assert.equal((html.match(/<svg/g) || []).length, 2, 'empty layer should carry only the two margin marks');
  assert.ok(!html.includes('border-[var(--skin-primary)]'), 'empty layer renders a stamp');
});

test('doodles: the chrome variant draws pen marks in the light surface token', () => {
  const html = renderToStaticMarkup(
    <FieldDoodles pageKey="board" variant="chrome" stamps={[{ label: 'RANKED', tone: 'primary' }]} />,
  );
  assert.ok(html.includes('stroke="var(--skin-surface)"'), 'chrome pen marks do not use the surface token');
  assert.ok(!html.includes('stroke="var(--skin-text)"'), 'chrome pen marks use the dark text token');
});

// --- Part 2: mounts --------------------------------------------------------

test('doodles: Basecamp, Dex, and Profile mount the layer with true labels', () => {
  const basecamp = read('src/pages/Basecamp.tsx');
  assert.match(basecamp, /<FieldDoodles\s+pageKey="basecamp"/, 'Basecamp does not mount the doodle layer');
  assert.ok(basecamp.includes("label: 'MISSION LOG'"), 'Basecamp stamp does not name the Mission Log card');
  assert.ok(basecamp.includes('label: "TREVOR\'S LOG"'), 'Basecamp stamp does not name Trevor\'s Log');
  assert.ok(basecamp.includes('skin-basecamp relative'), 'Basecamp root is not positioned for the layer');

  const dex = read('src/pages/Collection.tsx');
  assert.match(dex, /<FieldDoodles\s+pageKey="dex"/, 'Dex does not mount the doodle layer');

  const profile = read('src/pages/Profile.tsx');
  assert.match(profile, /<FieldDoodles\s+pageKey="profile"/, 'Profile does not mount the doodle layer');
  assert.ok(profile.includes("label: 'SCOUT'"), 'Profile stamp is not SCOUT');
  assert.ok(profile.includes('`LEVEL ${level}`'), 'Profile stamp is not the real level');
});

test('doodles: Big Board mounts the chrome layer with truth-conditional stamps', () => {
  const board = read('src/pages/BigBoard.tsx');
  assert.match(board, /<FieldDoodles pageKey="board" variant="chrome"/, 'Big Board does not mount the chrome layer');
  assert.ok(board.includes('boardDoodleStamps'), 'Big Board does not compute its stamps');
  assert.ok(
    board.includes("playerRankings.length > 0 ? [{ label: 'RANKED'"),
    'Big Board stamps RANKED even with nobody ranked',
  );
  assert.ok(
    board.includes("userWeeklyRank === 1 ? [{ label: '1ST'"),
    'Big Board stamps 1ST even when the viewer is not rank 1',
  );
});
