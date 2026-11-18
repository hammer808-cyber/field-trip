// Guided tour overlay (Zach's call, Nov 17-18, 2026): a spotlight that
// darkens everything but the real element to tap, with a Trevor bubble and
// an always-visible Skip. The repo has no DOM test harness, so these are
// source assertions in the same style as fieldTypeResultVoice.test.ts.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

test('the tour mounts at App level next to TrevorGuide, so it survives the Missions -> Capture route change', () => {
  const app = read('src/App.tsx');
  assert.match(app, /import \{ GuidedTour \} from '\.\/components\/GuidedTour';/);
  assert.match(app, /<TrevorGuide \/>\n\s*\{\/\*[\s\S]*?Guided tour[\s\S]*?<GuidedTour \/>/);
});

test('the spotlight darkens everything else and frames the real element', () => {
  const tour = read('src/components/GuidedTour.tsx');
  // Four backdrop strips around the cutout, blocking taps elsewhere.
  assert.match(tour, /bg-black\/70 backdrop-blur/);
  // A lime ring on the cutout.
  assert.match(tour, /border-brand-lime/);
  // The cutout is measured live from the real element every frame, so it
  // follows the poster spring-in and the deck flip.
  assert.match(tour, /requestAnimationFrame\(tick\)/);
  assert.match(tour, /getBoundingClientRect\(\)/);
  // Off-screen targets get scrolled into view instead of lit off-screen.
  assert.match(tour, /scrollIntoView\(\{ behavior: 'smooth', block: 'center' \}\)/);
});

test('the bubble is Trevor talking, with the step count and an always-visible Skip', () => {
  const tour = read('src/components/GuidedTour.tsx');
  assert.match(tour, /Trevor says/);
  assert.match(tour, /Step \{step\.number\} of \{GUIDED_TOUR_STEP_COUNT\}/);
  assert.match(tour, /\{GUIDED_TOUR_SKIP_LABEL\}/);
  // Skip and finish both persist the same flag, so the tour never replays.
  assert.match(tour, /hasSeenFirstMissionTour: true/);
  // The tour leaves no chrome of its own behind: it unmounts (renders
  // null) the moment it is done, and Trevor's pill takes over.
  assert.match(tour, /if \(!eligible \|\| !stepId \|\| !targetRect\) return null;/);
});

test('the overlay sits above Trevor and the reward chrome, and hides nothing else', () => {
  const tour = read('src/components/GuidedTour.tsx');
  // Trevor's pill is z-105, the reward modal z-120: the tour's z-200 dims
  // both without touching either component.
  assert.match(tour, /z-\[200\]/);
  assert.doesNotMatch(tour, /TrevorGuide/);
});

test('the tour hooks are on the real buttons, not lookalikes', () => {
  // The deck and the poster already carried data-tour hooks; the capture
  // buttons got theirs in this pass.
  const deckStack = read('src/components/DeckStack.tsx');
  assert.match(deckStack, /data-tour="deck-draw"/);
  const poster = read('src/components/MissionDecodedCard.tsx');
  assert.match(poster, /data-tour="mission-card"/);
  const clipboard = read('src/components/FieldClipboard.tsx');
  assert.match(clipboard, /data-tour="open-camera"/);
  assert.match(clipboard, /data-tour="submit-proof"/);
  const viewfinder = read('src/components/ViewfinderCamera.tsx');
  assert.match(viewfinder, /data-tour="snap-photo"/);
});

test('the tour-done flag is a clean new profile field, and the dead v1 flag is left alone', () => {
  const userService = read('src/services/userService.ts');
  assert.match(userService, /hasSeenFirstMissionTour\?: boolean;/);
  // starterDeckTourSeen_v1 is declared but never read or written anywhere
  // in src — the tour does not repurpose it.
  const tour = read('src/components/GuidedTour.tsx');
  assert.doesNotMatch(tour, /starterDeckTourSeen_v1/);
  const logic = read('src/logic/guidedTour.ts');
  assert.match(logic, /starterDeckTourSeen_v1/); // only in the "do not reuse" note
});
