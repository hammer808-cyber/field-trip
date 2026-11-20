// P0-7 — "Back to Basecamp" bounce (audit fix, Zach's call, Nov 19, 2026):
// the button rendered unconditionally on the submitted screen, so pre-Starter
// players tapped it, hit the shouldRedirectPreStarterToMissions guard, and
// landed on /missions with no explanation. Fix: hide the button until the
// 3/3 Starter set is complete (admins bypass, same as the guard) — the
// primary CTA already routes pre-Starter players to /missions, so
// re-pointing would leave two buttons to the same place. The repo has no
// DOM test harness, so the component side is pinned with source assertions
// in the same style as guidedTourOverlay.test.tsx, cross-checked against
// the real guard's truth table.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { shouldRedirectPreStarterToMissions } from '../logic/onboardingFlow';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');
const src = () => read('src/pages/MissionSubmitted.tsx');

test('the guard the button used to bounce on: only pre-Starter non-admins are redirected from /basecamp', () => {
  assert.equal(
    shouldRedirectPreStarterToMissions({ pathname: '/basecamp', starterComplete: false, isAdmin: false }),
    true,
  );
  assert.equal(
    shouldRedirectPreStarterToMissions({ pathname: '/basecamp', starterComplete: true, isAdmin: false }),
    false,
  );
  assert.equal(
    shouldRedirectPreStarterToMissions({ pathname: '/basecamp', starterComplete: false, isAdmin: true }),
    false,
  );
});

test('the Back to Basecamp button is gated on the same condition as the guard', () => {
  const s = src();
  // Visible exactly when /basecamp is reachable: Starter complete or admin.
  assert.match(s, /const showBasecampButton = starter\.starterComplete \|\| isAdmin;/);
  // The button JSX only renders inside that gate.
  assert.match(s, /\{showBasecampButton && \([\s\S]*?Back to Basecamp[\s\S]*?\)\}/);
});

test('post-starter behaviour is unchanged: the button still goes to /basecamp', () => {
  const s = src();
  assert.match(s, /onClick=\{\(\) => navigate\('\/basecamp'\)\}/);
  // And it is the only /basecamp navigation on this page.
  const basecampNavs = s.match(/navigate\('\/basecamp'\)/g) || [];
  assert.equal(basecampNavs.length, 1, `expected 1 /basecamp navigation, found ${basecampNavs.length}`);
});

test('pre-Starter players still get a primary CTA to /missions, not a dead end', () => {
  const s = src();
  // The primary button navigates via the starter guidance href, which is
  // '/missions' for in-progress pre-Starter players (pinned by value in
  // postSubmitStarterGuidance.test.ts).
  assert.match(s, /onClick=\{\(\) => navigate\(primaryHref\)\}/);
  assert.match(s, /const primaryHref = showStarterGuidance \? starterGuidance\.primaryHref : '\/missions';/);
});
