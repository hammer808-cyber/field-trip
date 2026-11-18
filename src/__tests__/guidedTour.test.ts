// Guided tour for the first starter mission only (Zach's call, Nov 17-18,
// 2026): the tour fires only for a pre-starter player on their first
// mission, walks the real flow (deck -> card -> start -> photo -> submit),
// and never replays once finished or skipped.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GUIDED_TOUR_PROFILE_FLAG,
  GUIDED_TOUR_SKIP_LABEL,
  GUIDED_TOUR_STEP_COUNT,
  GUIDED_TOUR_STEPS,
  deriveGuidedTourStep,
  getGuidedTourAdvanceSelectors,
  getGuidedTourStep,
  isGuidedTourEligible,
  resolveGuidedTourTarget,
} from '../logic/guidedTour';

test('the tour is five steps, in flow order, each with Trevor copy', () => {
  assert.equal(GUIDED_TOUR_STEP_COUNT, 5);
  assert.deepEqual(
    GUIDED_TOUR_STEPS.map((s) => s.id),
    ['deck', 'card', 'start', 'photo', 'submit'],
  );
  for (const step of GUIDED_TOUR_STEPS) {
    assert.equal(step.number, GUIDED_TOUR_STEPS.indexOf(step) + 1);
    assert.ok(step.title.length > 0, `${step.id} needs a title`);
    assert.ok(step.body.length > 0, `${step.id} needs body copy`);
  }
  assert.equal(getGuidedTourStep('submit').number, 5);
  assert.throws(() => getGuidedTourStep('nope' as never), /Unknown guided tour step/);
});

test('eligibility: first mission only — never admins, never starters 2/3 or post-starter, never after seen/skipped', () => {
  const base = { isAdmin: false, mustCompleteStarterMission: true, hasSeenFirstMissionTour: false };
  // The first mission: pre-starter, guided entry still owed, tour unseen.
  assert.equal(isGuidedTourEligible(base), true);
  // Admins bypass the starter flow, so they never get the tour.
  assert.equal(isGuidedTourEligible({ ...base, isAdmin: true }), false);
  // Starters 2 and 3 and post-starter: the guided entry is done, so
  // mustCompleteStarterMission is false and the tour stays off.
  assert.equal(isGuidedTourEligible({ ...base, mustCompleteStarterMission: false }), false);
  // Finished or skipped: the persisted flag keeps it from ever replaying.
  assert.equal(isGuidedTourEligible({ ...base, hasSeenFirstMissionTour: true }), false);
});

test('step derivation on Missions: deck, then card, then start once the brief is tapped', () => {
  const missions = (over: Partial<Parameters<typeof deriveGuidedTourStep>[0]> = {}) =>
    deriveGuidedTourStep({
      route: '/missions',
      hasActiveMission: false,
      briefAcked: false,
      captureTarget: null,
      ...over,
    });
  // No mission drawn yet: the deck is the step.
  assert.equal(missions(), 'deck');
  // A draw assigns the mission: the poster (brief) is the step.
  assert.equal(missions({ hasActiveMission: true }), 'card');
  // Tapping the poster acknowledges the brief: start is the step.
  assert.equal(missions({ hasActiveMission: true, briefAcked: true }), 'start');
  // A cleared mission re-opens the deck step, brief un-acked.
  assert.equal(missions({ hasActiveMission: false, briefAcked: true }), 'deck');
  // The /missions sub-paths render the same Deck page.
  assert.equal(
    deriveGuidedTourStep({
      route: '/missions/decks',
      hasActiveMission: false,
      briefAcked: false,
      captureTarget: null,
    }),
    'deck',
  );
});

test('step derivation on Capture follows the hooks in the DOM, and pauses between states', () => {
  const capture = (captureTarget: Parameters<typeof deriveGuidedTourStep>[0]['captureTarget']) =>
    deriveGuidedTourStep({
      route: '/capture',
      hasActiveMission: true,
      briefAcked: true,
      captureTarget,
    });
  // Brief state: open the camera first, still the photo step.
  assert.equal(capture('open-camera'), 'photo');
  // Viewfinder: snap it, still the photo step.
  assert.equal(capture('snap-photo'), 'photo');
  // Reviewing: the submit button is on screen, submit is the step.
  assert.equal(capture('submit-proof'), 'submit');
  // Between states (e.g. the polaroid developing beat): no target yet,
  // so the tour waits instead of showing a wrong step.
  assert.equal(capture(null), null);
});

test('the tour pauses off the tour routes — it never spotlights a wrong page', () => {
  for (const route of ['/basecamp', '/profile', '/dex', '/field-type', '/']) {
    assert.equal(
      deriveGuidedTourStep({
        route,
        hasActiveMission: true,
        briefAcked: true,
        captureTarget: null,
      }),
      null,
      route,
    );
  }
});

test('targets are the real flow elements, not stand-ins', () => {
  // Deck stack (draw), drawn poster (brief), the guided branch's real
  // DO THIS MISSION button — all already in the app, none invented here.
  assert.equal(resolveGuidedTourTarget('deck', null), '[data-tour="deck-draw"]');
  assert.equal(resolveGuidedTourTarget('card', null), '[data-tour="mission-card"]');
  assert.equal(resolveGuidedTourTarget('start', null), '#start-mission-button');
  // Photo: the button that exists on screen right now.
  assert.equal(resolveGuidedTourTarget('photo', 'open-camera'), '[data-tour="open-camera"]');
  assert.equal(resolveGuidedTourTarget('photo', 'snap-photo'), '[data-tour="snap-photo"]');
  assert.equal(resolveGuidedTourTarget('photo', null), null);
  assert.equal(resolveGuidedTourTarget('submit', null), '[data-tour="submit-proof"]');
  // The big DRAW button next to the deck stack draws the same card.
  assert.deepEqual(getGuidedTourAdvanceSelectors('deck'), ['#starter-draw-button']);
  assert.deepEqual(getGuidedTourAdvanceSelectors('card'), []);
  assert.deepEqual(getGuidedTourAdvanceSelectors('submit'), []);
});

test('completion persists under a clean new flag, not a repurposed one', () => {
  // hasCompletedGuidedFirstEntry flips only on submit, so it cannot be
  // the tour-done flag (a skip would replay until submit). The tour gets
  // its own flag, persisted on the profile.
  assert.equal(GUIDED_TOUR_PROFILE_FLAG, 'hasSeenFirstMissionTour');
  assert.equal(GUIDED_TOUR_SKIP_LABEL, 'Skip the tour');
});
