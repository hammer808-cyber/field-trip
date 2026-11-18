// Guided tour for the FIRST starter mission only.
//
// Zach's call (Nov 17-18, 2026): "first mission only — tour, then Trevor
// takes over." The tour spotlights the real flow elements in order:
//
//   1. deck   — tap the deck to draw (Missions, guided-launch branch)
//   2. card   — tap the drawn card to read the brief
//   3. start  — DO THIS MISSION (Missions -> /capture)
//   4. photo  — Open Camera, then the SNAP shutter (/capture)
//   5. submit — Submit Proof (/capture reviewing)
//
// Eligibility is the guided-launch condition itself: the tour only runs
// while the player still owes the first guided entry
// (mustCompleteStarterMission), never for admins, and never again once the
// player finishes or skips it (persisted on the profile as
// hasSeenFirstMissionTour).
//
// Notes on the existing flags (verified Nov 18, 2026 — do not "fix" by
// reusing them):
// - hasCompletedGuidedFirstEntry flips only when the launch mission is
//   SUBMITTED (gameService.ts submitTripEntry). It cannot be the tour-done
//   flag: a player who skips the tour would see it again on every visit
//   until they submit.
// - starterDeckTourSeen_v1 (userService.ts) is a dead type field — declared,
//   never read or written anywhere in src. Not reused.

export type GuidedTourStepId = 'deck' | 'card' | 'start' | 'photo' | 'submit';

export interface GuidedTourStep {
  id: GuidedTourStepId;
  /** 1-based step number shown in the bubble ("1 of 5"). */
  number: number;
  title: string;
  body: string;
}

/** Profile flag persisted when the tour is finished or skipped. */
export const GUIDED_TOUR_PROFILE_FLAG = 'hasSeenFirstMissionTour';

/** Label for the always-visible escape. */
export const GUIDED_TOUR_SKIP_LABEL = 'Skip the tour';

export const GUIDED_TOUR_STEP_COUNT = 5;

export const GUIDED_TOUR_STEPS: GuidedTourStep[] = [
  {
    id: 'deck',
    number: 1,
    title: 'First mission. First card.',
    body: 'Tap the deck to draw. Trevor already picked the easy one for you — this is your first signal.',
  },
  {
    id: 'card',
    number: 2,
    title: "That's your brief.",
    body: 'It says what to do and what counts as proof. Tap the card when you’ve read it.',
  },
  {
    id: 'start',
    number: 3,
    title: 'Ready when you are.',
    body: 'Tap Do This Mission and your camera opens. Go find the thing.',
  },
  {
    id: 'photo',
    number: 4,
    title: 'Snap it.',
    body: 'Get the thing in frame, nice and clear, then tap the big SNAP button.',
  },
  {
    id: 'submit',
    number: 5,
    title: 'Send it in.',
    body: 'Add a few words about what happened, then tap Submit Proof. Trevor takes it from here — that’s the tour done.',
  },
];

/** Step 4 has two taps in it: the camera has to open before the shutter
    exists. The bubble says so while the player is still on the brief. */
export const GUIDED_TOUR_PHOTO_OPEN: Pick<GuidedTourStep, 'title' | 'body'> = {
  title: 'Open the camera.',
  body: 'Your photo is the proof. Open it up when you’re standing at the thing.',
};

export function getGuidedTourStep(stepId: GuidedTourStepId): GuidedTourStep {
  const step = GUIDED_TOUR_STEPS.find((s) => s.id === stepId);
  if (!step) throw new Error(`Unknown guided tour step: ${stepId}`);
  return step;
}

/**
 * Which of the tour's /capture hooks is in the DOM right now. The capture
 * page's own state (brief / capture / reviewing) is local to Capture.tsx,
 * so the tour reads it off the DOM instead of drilling props through the
 * app shell. Checked submit first: the reviewing screen keeps the photo
 * state around, but only the submit button means the player can finish.
 */
export type CaptureTourTarget = 'open-camera' | 'snap-photo' | 'submit-proof' | null;

export function isGuidedTourEligible(args: {
  isAdmin: boolean;
  mustCompleteStarterMission: boolean;
  hasSeenFirstMissionTour: boolean;
}): boolean {
  return !args.isAdmin && args.mustCompleteStarterMission && !args.hasSeenFirstMissionTour;
}

/**
 * Derive the tour's current step from live flow state. The step is a pure
 * function of where the player is — taps move the flow, the flow moves the
 * step — except for the brief: tapping the poster sets `briefAcked` (the
 * tour's own click listener), because the poster has no app state that says
 * "the player read the brief".
 *
 * Returns null when the tour should pause (wrong route, or a between-state
 * such as the polaroid developing step, where no tour target exists yet).
 */
export function deriveGuidedTourStep(args: {
  route: string;
  hasActiveMission: boolean;
  briefAcked: boolean;
  captureTarget: CaptureTourTarget;
}): GuidedTourStepId | null {
  const isMissionsRoute =
    args.route === '/missions' || args.route.startsWith('/missions/');
  if (isMissionsRoute) {
    if (!args.hasActiveMission) return 'deck';
    return args.briefAcked ? 'start' : 'card';
  }
  if (args.route === '/capture') {
    if (args.captureTarget === 'submit-proof') return 'submit';
    if (args.captureTarget === 'open-camera' || args.captureTarget === 'snap-photo') {
      return 'photo';
    }
    return null;
  }
  return null;
}

/**
 * The CSS selector for the element the spotlight frames for this step.
 * The photo step's target depends on which capture hook is on screen:
 * the Open Camera button on the brief, the shutter in the viewfinder.
 */
export function resolveGuidedTourTarget(
  stepId: GuidedTourStepId,
  captureTarget: CaptureTourTarget,
): string | null {
  switch (stepId) {
    case 'deck':
      return '[data-tour="deck-draw"]';
    case 'card':
      return '[data-tour="mission-card"]';
    case 'start':
      return '#start-mission-button';
    case 'photo':
      if (captureTarget === 'snap-photo') return '[data-tour="snap-photo"]';
      if (captureTarget === 'open-camera') return '[data-tour="open-camera"]';
      return null;
    case 'submit':
      return '[data-tour="submit-proof"]';
  }
}

/**
 * Extra selectors whose tap also counts as engaging this step — the big
 * DRAW button next to the deck stack draws the same card the deck does.
 * The tour advances on the flow state either way; this keeps the tap
 * itself honest when the player hits the button instead of the stack.
 */
export function getGuidedTourAdvanceSelectors(stepId: GuidedTourStepId): string[] {
  if (stepId === 'deck') return ['#starter-draw-button'];
  return [];
}
