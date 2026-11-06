import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { canAccessFeature, LOTERIA_ENABLED } from '../services/canonicalProgress';

const basecamp = readFileSync('src/pages/Basecamp.tsx', 'utf8');
const viewModel = readFileSync('src/logic/basecampViewModel.ts', 'utf8');
const starterGate = readFileSync('src/components/StarterGate.tsx', 'utf8');
const appSource = readFileSync('src/App.tsx', 'utf8');

function starterCompleteSnapshot() {
  return { starter: { starterComplete: true } } as any;
}

test('Loteria is barred for players even after the starter', () => {
  assert.equal(LOTERIA_ENABLED, false, 'Loteria kill switch should be off while it is in the works');
  assert.equal(
    canAccessFeature(starterCompleteSnapshot(), 'loteria'),
    false,
    'a starter-complete player should not reach Loteria',
  );
  assert.equal(
    canAccessFeature(starterCompleteSnapshot(), 'loteria', { isAdmin: true }),
    true,
    'admins can still preview the board',
  );
  assert.equal(
    canAccessFeature(starterCompleteSnapshot(), 'voting'),
    true,
    'barring Loteria should not lock other features',
  );
});

test('no Basecamp link leads to Loteria', () => {
  assert.doesNotMatch(basecamp, /\/loteria/);
  assert.doesNotMatch(viewModel, /\/loteria/);
});

test('the /loteria route stays gated behind the StarterGate', () => {
  assert.match(appSource, /requiredFeature="loteria"/);
  assert.match(starterGate, /coming_soon/);
});
