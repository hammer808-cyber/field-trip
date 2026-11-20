// P0-6 — Field Kit honesty (audit fix, Zach's call, Nov 19, 2026): the
// onboarding used to complete on crash/skip and the finalizing screen
// claimed "Camera + location set" even when nothing was set, stranding the
// player at Capture with no path back to permissions. The repo has no DOM
// test harness, so these are source assertions in the same style as
// guidedTourOverlay.test.tsx, plus counts that pin where completion happens.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');
const src = () => read('src/components/FieldKitOnboarding.tsx');

// Slice a top-level const arrow-function body out of the source.
function fnBody(source: string, name: string): string {
  const start = source.indexOf(`const ${name} =`);
  assert.notEqual(start, -1, `${name} must exist`);
  const end = source.indexOf('\n  };', start);
  assert.notEqual(end, -1, `${name} body must close`);
  return source.slice(start, end);
}

test('the finalizing screen only claims setup when permissions were actually granted', () => {
  const s = src();
  // The copy is conditional on the granted outcome, not unconditional.
  assert.match(s, /const granted = setupOutcome === 'granted';/);
  assert.match(s, /granted \? 'Camera \+ location set' : 'Camera and location not set/);
  assert.match(s, /granted \? "You're ready" : 'Not quite ready'/);
  // The granted icon stays the lime shield; the not-set icon is a warning.
  assert.match(s, /granted\s*\n\s*\? <ShieldCheck/);
  assert.match(s, /: <AlertCircle/);
});

test('the skip/failure path shows the audit honest copy', () => {
  assert.match(
    src(),
    /Camera and location not set — you can turn them on later from Settings/,
  );
});

test('skipping does not silently complete onboarding', () => {
  const body = fnBody(src(), 'handleMaybeLater');
  assert.doesNotMatch(body, /completeFieldKitOnboarding/);
  assert.match(body, /setSetupOutcome\('not-set'\)/);
  assert.match(body, /setStep\('finalizing'\)/);
});

test('a crash does not silently complete onboarding either', () => {
  const body = fnBody(src(), 'handleAllowPermissions');
  const catchAt = body.indexOf('} catch (err) {');
  assert.notEqual(catchAt, -1, 'handleAllowPermissions must keep its catch');
  const catchBody = body.slice(catchAt);
  assert.doesNotMatch(catchBody, /completeFieldKitOnboarding/);
  assert.match(catchBody, /setSetupOutcome\('not-set'\)/);
  assert.match(catchBody, /setStep\('finalizing'\)/);
});

test('the allow path only completes when both permissions actually landed', () => {
  const body = fnBody(src(), 'handleAllowPermissions');
  // The boolean results are checked now — previously they were awaited and ignored.
  assert.match(body, /const cameraOk = await requestCamera\(\);/);
  assert.match(body, /const locationOk = await requestLocation\(\);/);
  assert.match(body, /if \(cameraOk && locationOk\) \{/);
  // The failure branch shows the honest screen instead of completing.
  const elseAt = body.indexOf('} else {');
  assert.notEqual(elseAt, -1, 'handleAllowPermissions must have a failure branch');
  const elseBody = body.slice(elseAt);
  assert.match(elseBody, /setSetupOutcome\('not-set'\)/);
  assert.match(elseBody, /setStep\('finalizing'\)/);
  assert.doesNotMatch(elseBody, /completeFieldKitOnboarding/);
});

test('completion happens in exactly two places: granted auto-complete and knowing continue', () => {
  const calls = src().match(/completeFieldKitOnboarding\(\)/g) || [];
  assert.equal(calls.length, 2, `expected 2 completion call sites, found ${calls.length}`);
});

test('a re-request path exists: Try again returns to the permissions step', () => {
  const s = src();
  const body = fnBody(s, 'handleTryAgain');
  assert.match(body, /setStep\('permissions'\)/);
  assert.match(body, /setSetupOutcome\(null\)/);
  assert.match(s, /onClick=\{handleTryAgain\}/);
  assert.match(s, /Try again/);
});

test('the honest screen offers a knowing continue without permissions', () => {
  const s = src();
  const body = fnBody(s, 'handleContinueWithoutPermissions');
  assert.match(body, /await completeFieldKitOnboarding\(\);/);
  assert.match(s, /onClick=\{handleContinueWithoutPermissions\}/);
  assert.match(s, /Continue without permissions/);
  // The retry/continue buttons only render on the not-set screen.
  assert.match(s, /\{!granted && \([\s\S]*?Try again[\s\S]*?Continue without permissions[\s\S]*?\)\}/);
});
