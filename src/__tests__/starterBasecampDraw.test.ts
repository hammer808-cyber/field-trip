import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveMissionsNavLocked } from '../components/bottomNavPresentation';
import {
  resolveOnboardingDestination,
  shouldRedirectPreStarterToBasecamp,
  type OnboardingDestinationState,
} from '../logic/onboardingFlow';
import {
  resolveMissionsGuidancePrimaryAction,
  type PlayerGuidanceSnapshot,
} from '../logic/playerGuidance';
import { buildPostSubmitStarterGuidance } from '../logic/postSubmitStarterGuidance';

test('Missions nav is locked until the Starter set is done', () => {
  assert.equal(resolveMissionsNavLocked({ starterComplete: false, isAdmin: false }), true);
  assert.equal(resolveMissionsNavLocked({ starterComplete: true, isAdmin: false }), false);
  assert.equal(resolveMissionsNavLocked({ starterComplete: false, isAdmin: true }), false);
});

test('pre-Starter players are sent back to Basecamp from Missions and Deck', () => {
  const preStarter = { starterComplete: false, isAdmin: false };
  assert.equal(shouldRedirectPreStarterToBasecamp({ ...preStarter, pathname: '/missions' }), true);
  assert.equal(shouldRedirectPreStarterToBasecamp({ ...preStarter, pathname: '/missions?pack=starter-signals' }), true);
  assert.equal(shouldRedirectPreStarterToBasecamp({ ...preStarter, pathname: '/deck' }), true);
  assert.equal(shouldRedirectPreStarterToBasecamp({ ...preStarter, pathname: '/basecamp' }), false);
  assert.equal(shouldRedirectPreStarterToBasecamp({ ...preStarter, pathname: '/capture' }), false);
  assert.equal(shouldRedirectPreStarterToBasecamp({ ...preStarter, pathname: '/mission-briefing' }), false);
  assert.equal(shouldRedirectPreStarterToBasecamp({ starterComplete: true, isAdmin: false, pathname: '/missions' }), false);
  assert.equal(shouldRedirectPreStarterToBasecamp({ starterComplete: false, isAdmin: true, pathname: '/missions' }), false);
});

test('a proof needing more work routes through Basecamp before the Starter is done', () => {
  const base: OnboardingDestinationState = {
    hasConfirmedLegal: true,
    fieldClassificationComplete: true,
    hasSeenFieldTypeResults: true,
    onboardingCompleted: false,
    starterApprovedCount: 1,
    activeSubmissionStatus: 'needs_more_proof',
  };
  assert.equal(resolveOnboardingDestination(base), '/basecamp');
  assert.equal(resolveOnboardingDestination({ ...base, onboardingCompleted: true }), '/missions');
});

test('the Deck strip never sends a Starter draw to Missions', () => {
  for (const state of ['DRAW_STARTER_MISSION', 'DRAW_NEXT_STARTER'] as const) {
    const snapshot = {
      state,
      primaryActionDestination: '/basecamp',
      primaryActionIntent: 'draw-starter',
      relevantMissionId: null,
      deckId: 'starter-signals',
    } as PlayerGuidanceSnapshot;
    assert.deepEqual(resolveMissionsGuidancePrimaryAction(snapshot), {
      kind: 'navigate',
      destination: '/basecamp',
    });
  }
});

test('post-submit copy points a Starter retry at Basecamp, not Missions', () => {
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
  assert.equal(guidance.primaryHref, '/basecamp');
  assert.doesNotMatch(guidance.statusLine, /Missions/);
});
