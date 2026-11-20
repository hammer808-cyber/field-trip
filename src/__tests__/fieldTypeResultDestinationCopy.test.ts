// P1-2 — Onboarding copy names the wrong destination (audit §12, fix Nov 20,
// 2026): the photo-step Skip read "Skip — go to Basecamp" and the busy
// label read "Opening Basecamp…" while handleStartApp routes pre-starter
// players to /missions (Basecamp is locked until 3/3 starters are
// approved). The destination copy is now derived from starter state, so
// only a starter-complete player ever sees "Basecamp". The repo has no DOM
// test harness, so these are source assertions in the same style as
// fieldKitOnboardingHonestCopy.test.tsx.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');
const page = () => read('src/pages/FieldTypeResult.tsx');

test('routing: pre-starter players go to /missions, only starter-complete players go to /basecamp', () => {
  assert.match(page(), /const destination = starterState\?\.starterComplete \? '\/basecamp' : '\/missions';/);
});

test('destination copy is derived from starter state, not hard-coded', () => {
  assert.match(page(), /const startDestination = starterState\?\.starterComplete \? 'Basecamp' : 'Missions';/);
});

test('no copy hard-codes Basecamp as the destination', () => {
  const p = page();
  // The only "Basecamp" strings left are the route, the derivation, and
  // comments explaining the lock — never a label a player reads.
  assert.doesNotMatch(p, /'Opening Basecamp\.\.\.'/);
  assert.doesNotMatch(p, /Skip — go to Basecamp/);
  assert.doesNotMatch(p, /then Basecamp\./);
  assert.doesNotMatch(p, /on Basecamp/);
  assert.doesNotMatch(p, /go to Basecamp/);
});

test('skipping the photo step names the derived destination', () => {
  const p = page();
  assert.match(p, /Skip — go to \{startDestination\}/);
  assert.match(p, /onClick=\{handleStartApp\}[^>]*>\s*Skip — go to \{startDestination\}/s);
});

test('both navigating labels open the derived destination', () => {
  // Primary CTA + sticky mobile footer.
  const hits = page().match(/Opening \$\{startDestination\}\.\.\./g) || [];
  assert.equal(hits.length, 2, `expected 2 derived "Opening …" labels, found ${hits.length}`);
});

test('captions name the derived destination, never Basecamp pre-starter', () => {
  const p = page();
  // Guided caption: the first mission is the next step — no "on Basecamp".
  assert.match(p, /Next: add a photo if you want, then your first mission\./);
  assert.doesNotMatch(p, /your first mission on Basecamp/);
  // Non-guided caption: the destination after the photo step.
  assert.match(p, /Next: add a photo if you want one, then \{startDestination\}\./);
});

test('post-starter copy still says Basecamp where it is correct', () => {
  // The starter-complete branch of the derivation is 'Basecamp', so a
  // player who finished the starters still reads Basecamp everywhere
  // the pre-starter player reads Missions.
  assert.match(page(), /starterState\?\.starterComplete \? 'Basecamp' : 'Missions'/);
});
