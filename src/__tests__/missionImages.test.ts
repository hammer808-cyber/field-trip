/**
 * Drawn-card photo resolution (Nov 20, 2026 — Zach's report).
 *
 * The browse grid reads the local banks (which carry the `image` fields)
 * but a drawn mission comes from the Firestore `challenges` docs, which
 * were initialized before the example photos were wired in and carry no
 * `image` — so the drawn briefing showed a generic mountain while the
 * same card showed its real photo in the deck view. These tests pin the
 * fix: the photo resolves from the banks when the mission object lacks
 * one, and photo-less decks (Gobble & Glow) still resolve to nothing.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { getMissionImage, getMissionPhoto } from '../utils/missionImages';

test('drawn-card photo: a supplied image always wins', () => {
  assert.equal(getMissionPhoto('heatwave-01', '/assets/challenges/custom.jpg'), '/assets/challenges/custom.jpg');
  assert.equal(getMissionImage('heatwave-01', 'heatwave', '/assets/challenges/custom.jpg'), '/assets/challenges/custom.jpg');
});

test('drawn-card photo: resolves from the local banks when the mission object has none', () => {
  // The exact case Zach screenshotted: a drawn Heatwave card whose
  // Firestore copy carries no image must still show the bank photo.
  assert.equal(getMissionPhoto('heatwave-01'), '/assets/challenges/heatwave-01.jpg');
  assert.equal(getMissionImage('heatwave-01', 'heatwave'), '/assets/challenges/heatwave-01.jpg');
  // Id matching is case-insensitive, the way the draw path lowercases ids.
  assert.equal(getMissionPhoto('HEATWAVE-02'), '/assets/challenges/heatwave-02.jpg');
});

test('drawn-card photo: unknown ids and photo-less decks resolve to nothing (existing fallback stays)', () => {
  assert.equal(getMissionPhoto('no-such-card'), undefined);
  assert.equal(getMissionPhoto(''), undefined);
  // Gobble & Glow carries no example photos by design (SVG badges).
  assert.equal(getMissionPhoto('holiday-01'), undefined);
  // And getMissionImage still falls through to its SVG badge art there.
  assert.ok(getMissionImage('holiday-01', 'holiday').startsWith('data:image/svg+xml;base64,'));
});
