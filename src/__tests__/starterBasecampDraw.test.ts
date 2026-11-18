import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveBasecampNavLocked } from '../components/bottomNavPresentation';
import {
  resolveOnboardingDestination,
  shouldRedirectPreStarterToMissions,
  isAllowedPreStarterPage,
  type OnboardingDestinationState,
} from '../logic/onboardingFlow';
import {
  resolveMissionsGuidancePrimaryAction,
  type PlayerGuidanceSnapshot,
} from '../logic/playerGuidance';
import { buildPostSubmitStarterGuidance } from '../logic/postSubmitStarterGuidance';

test('Basecamp nav is locked until the Starter set is done', () => {
  // Nov 17, 2026: Zach reversed the Nov 16 call — the deck (Missions) is
  // home pre-Starter and Basecamp is the locked room, not the other way
  // around. Missions is open from the first tap; Basecamp unlocks at 3/3.
  assert.equal(resolveBasecampNavLocked({ starterComplete: false, isAdmin: false }), true);
  assert.equal(resolveBasecampNavLocked({ starterComplete: true, isAdmin: false }), false);
  assert.equal(resolveBasecampNavLocked({ starterComplete: false, isAdmin: true }), false);
});

test('the mission briefing stays reachable before the Starter is done', () => {
  // Nov 16, 2026: RESUME MISSION for a drawn Starter goes to
  // /mission-briefing, and the Step 3 guard bounced it straight back to
  // Basecamp because the briefing wasn't on the allowlist — the tap
  // looked dead. The briefing is the resume path, so it stays open.
  assert.equal(isAllowedPreStarterPage('/mission-briefing'), true);
  assert.equal(isAllowedPreStarterPage('/capture?id=starter-3'), true);
  assert.equal(isAllowedPreStarterPage('/basecamp'), true);
  assert.equal(isAllowedPreStarterPage('/missions'), true);
  assert.equal(isAllowedPreStarterPage('/deck'), true);
  assert.equal(isAllowedPreStarterPage('/profile'), true);
  assert.equal(isAllowedPreStarterPage('/field-type'), true);
  assert.equal(isAllowedPreStarterPage('/dex/stickers'), true);
  assert.equal(isAllowedPreStarterPage('/settings'), false);
  assert.equal(isAllowedPreStarterPage('/admin'), false);
  assert.equal(isAllowedPreStarterPage('/proofs'), false);
});

test('pre-Starter players are sent to Missions from Basecamp, and only from Basecamp', () => {
  const preStarter = { starterComplete: false, isAdmin: false };
  assert.equal(shouldRedirectPreStarterToMissions({ ...preStarter, pathname: '/basecamp' }), true);
  assert.equal(shouldRedirectPreStarterToMissions({ ...preStarter, pathname: '/missions' }), false);
  assert.equal(shouldRedirectPreStarterToMissions({ ...preStarter, pathname: '/missions?pack=starter-signals' }), false);
  assert.equal(shouldRedirectPreStarterToMissions({ ...preStarter, pathname: '/deck' }), false);
  assert.equal(shouldRedirectPreStarterToMissions({ ...preStarter, pathname: '/capture' }), false);
  assert.equal(shouldRedirectPreStarterToMissions({ ...preStarter, pathname: '/mission-briefing' }), false);
  assert.equal(shouldRedirectPreStarterToMissions({ starterComplete: true, isAdmin: false, pathname: '/basecamp' }), false);
  assert.equal(shouldRedirectPreStarterToMissions({ starterComplete: false, isAdmin: true, pathname: '/basecamp' }), false);
});

test('pre-Starter players land on Missions, not Basecamp', () => {
  const base: OnboardingDestinationState = {
    hasConfirmedLegal: true,
    fieldClassificationComplete: true,
    hasSeenFieldTypeResults: true,
    onboardingCompleted: false,
    starterApprovedCount: 0,
  };
  assert.equal(resolveOnboardingDestination(base), '/missions');
  assert.equal(resolveOnboardingDestination({ ...base, starterApprovedCount: 2 }), '/missions');
  assert.equal(resolveOnboardingDestination({ ...base, onboardingCompleted: true, starterApprovedCount: 3 }), '/basecamp');
});

test('a proof needing more work routes to Missions before the Starter is done', () => {
  const base: OnboardingDestinationState = {
    hasConfirmedLegal: true,
    fieldClassificationComplete: true,
    hasSeenFieldTypeResults: true,
    onboardingCompleted: false,
    starterApprovedCount: 1,
    activeSubmissionStatus: 'needs_more_proof',
  };
  assert.equal(resolveOnboardingDestination(base), '/missions');
  assert.equal(resolveOnboardingDestination({ ...base, onboardingCompleted: true }), '/missions');
});

test('the Deck strip draws a Starter in place on Missions', () => {
  for (const state of ['DRAW_STARTER_MISSION', 'DRAW_NEXT_STARTER'] as const) {
    const snapshot = {
      state,
      primaryActionDestination: '/missions?pack=starter-signals',
      primaryActionIntent: 'navigate',
      relevantMissionId: null,
      deckId: 'starter-signals',
    } as PlayerGuidanceSnapshot;
    assert.deepEqual(resolveMissionsGuidancePrimaryAction(snapshot), {
      kind: 'draw-current',
      destination: '/missions?pack=starter-signals',
    });
  }
});

test('post-submit copy points a Starter retry at Missions, not Basecamp', () => {
  const guidance = buildPostSubmitStarterGuidance({
    starter: {
      status: 'IN_PROGRESS',
      starterComplete: false,
      starterApprovedCount: 0,
      starterRequiredCount: 3,
      submittedUniqueCount: 1,
      submittedMissionIds: ['starter-1'],
      needsMoreProofMissionId: null,
      rejectedMissionId: null,
      needsMoreProofStarterCount: 0,
      retryStarterCount: 0,
    },
    currentMissionId: 'starter-1',
    reviewStatus: 'needs_more_proof',
  });
  assert.equal(guidance.primaryHref, '/missions');
  assert.equal(guidance.primaryLabel, 'Back to Missions');
  assert.match(guidance.statusLine, /Missions/);
  assert.doesNotMatch(guidance.statusLine, /Basecamp/);
});
