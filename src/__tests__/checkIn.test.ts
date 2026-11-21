import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { hasHonestLocationCheck } from '../logic/checkIn';

test('hasHonestLocationCheck: flag + timestamp is honest', () => {
  assert.equal(hasHonestLocationCheck({ location: true, locationCheckedAt: '2026-11-20T17:00:00.000Z' }), true);
});

test('hasHonestLocationCheck: a bare location:true without a timestamp is NOT honest (Nov 20, 2026 regression — every pre-fix flag was auto-written)', () => {
  assert.equal(hasHonestLocationCheck({ location: true }), false);
  assert.equal(hasHonestLocationCheck({ location: true, locationCheckedAt: '' }), false);
  assert.equal(hasHonestLocationCheck({ location: true, locationCheckedAt: 123 }), false);
});

test('hasHonestLocationCheck: anything else is not a check-in', () => {
  assert.equal(hasHonestLocationCheck({ location: false, locationCheckedAt: '2026-11-20T17:00:00.000Z' }), false);
  assert.equal(hasHonestLocationCheck({ locationCheckedAt: '2026-11-20T17:00:00.000Z' }), false);
  assert.equal(hasHonestLocationCheck({}), false);
  assert.equal(hasHonestLocationCheck(null), false);
  assert.equal(hasHonestLocationCheck(undefined), false);
});

const readSrc = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');

test('wiring: Capture lights the pill only after a real GPS read (Nov 20, 2026)', () => {
  const capture = readSrc('../pages/Capture.tsx');
  // The mount sync that wrote `{ location: true }` on arrival is gone.
  assert.doesNotMatch(capture, /updates\.location = true/);
  // The pill is lit by the read succeeding, and the flag is persisted with a timestamp.
  assert.match(capture, /requestLocation\(\)\.then/);
  assert.match(capture, /locationCheckedAt: new Date\(\)\.toISOString\(\)/);
  // The fulfilled state reads through the honest-check predicate, not the bare flag.
  assert.match(capture, /hasHonestLocationCheck\(missionProgress\)/);
  assert.doesNotMatch(capture, /isLocationFulfilled = localLocationChecked \|\| !!missionProgress\.location/);
});

test('wiring: every pill surface reads location through the honest-check predicate (Nov 20, 2026)', () => {
  for (const rel of [
    '../components/ChallengeCard.tsx',
    '../components/MissionDecodedCard.tsx',
    '../components/DeckLibrary.tsx'
  ]) {
    const src = readSrc(rel);
    assert.match(src, /hasHonestLocationCheck/);
  }
  const card = readSrc('../components/ChallengeCard.tsx');
  assert.doesNotMatch(card, /const isCollected = \(key: string\) => !!progress\[key as keyof EvidenceProgress\];/);
  const decoded = readSrc('../components/MissionDecodedCard.tsx');
  assert.doesNotMatch(decoded, /const isCollected = \(key: string\) => !!progress\[key === 'note' \? 'field_note' : key\];/);
  const library = readSrc('../components/DeckLibrary.tsx');
  assert.doesNotMatch(library, /const isDone = !!progress\[req\.key as keyof typeof progress\];/);
});
