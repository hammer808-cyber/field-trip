import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  reduceTrevorPanelState,
  TrevorGuideView,
} from '../components/TrevorGuideView';
import {
  isTrevorFocusedRoute,
  type TrevorContext,
} from '../services/trevorContextService';
import {
  getTrevorRecommendation,
  type ResolvedTrevorRecommendation,
} from '../services/trevorRecommendationEngine';

function context(overrides: Partial<TrevorContext> = {}): TrevorContext {
  return {
    userId: 'guide-user',
    currentRoute: '/basecamp',
    explorerType: 'mallRat',
    legalComplete: true,
    fieldClassificationComplete: true,
    onboardingComplete: true,
    experienceStage: 'established_explorer',
    starterApprovedCount: 3,
    starterRequiredCount: 3,
    starterSubmittedCount: 3,
    starterComplete: true,
    hasUnseenStarterUnlock: false,
    level: 5,
    levelTitle: 'Licensed Side-Quester',
    currentXp: 2000,
    xpForNextLevel: 900,
    xpToNextLevel: 700,
    levelProgressPercent: 22,
    pendingProofCount: 0,
    needsMoreProofCount: 0,
    approvedProofCount: 10,
    accessibleDeckIds: ['heatwave-receipts'],
    recentlyUsedDeckIds: ['heatwave-receipts'],
    recommendedDeckId: 'heatwave-receipts',
    crewUnlocked: true,
    crewHasOpenTasks: false,
    votingPhase: 'submission',
    hasVotedThisCycle: false,
    profileCompleteness: 100,
    missingProfileFields: [],
    recentProofTypes: ['photo', 'note'],
    zineContentGaps: [],
    ...overrides,
  };
}

function recommendation(overrides: Partial<TrevorContext> = {}): ResolvedTrevorRecommendation {
  const result = getTrevorRecommendation(context(overrides));
  if (!result) throw new Error('Expected Trevor recommendation fixture');
  return result;
}

const noop = () => undefined;

test('collapsed Trevor renders exactly one accessible native launcher', () => {
  const html = renderToStaticMarkup(
    <TrevorGuideView
      recommendation={recommendation()}
      message="Systems nominal."
      isExpanded={false}
      hasNewState={false}
      onOpen={noop}
      onCollapse={noop}
      onAction={noop}
      onSuppress={noop}
    />,
  );
  assert.equal((html.match(/aria-label="Open Trevor guide"/g) || []).length, 1);
  assert.equal((html.match(/role="dialog"/g) || []).length, 0);
  assert.match(html, /<button type="button"/);
  assert.match(html, /aria-controls="trevor-guide-panel"/);
});

test('expanded Trevor renders one panel and both distinct recommendation actions', () => {
  const selected = recommendation();
  assert.ok(selected.secondaryAction?.route);
  assert.notEqual(selected.primaryAction.route, selected.secondaryAction?.route);
  const html = renderToStaticMarkup(
    <TrevorGuideView
      recommendation={selected}
      message="Pick the useful next move."
      isExpanded
      hasNewState={false}
      onOpen={noop}
      onCollapse={noop}
      onAction={noop}
      onSuppress={noop}
    />,
  );
  assert.equal((html.match(/role="dialog"/g) || []).length, 1);
  assert.equal((html.match(/aria-label="Open Trevor guide"/g) || []).length, 0);
  assert.match(html, new RegExp(selected.primaryAction.label));
  assert.match(html, new RegExp(selected.secondaryAction?.label || 'missing-secondary'));
});

test('panel state opens one panel, collapses, and cannot reopen after session suppression', () => {
  const initial = { isExpanded: false, isSuppressed: false };
  const open = reduceTrevorPanelState(initial, 'open');
  assert.deepEqual(open, { isExpanded: true, isSuppressed: false });
  assert.deepEqual(reduceTrevorPanelState(open, 'collapse'), { isExpanded: false, isSuppressed: false });
  const suppressed = reduceTrevorPanelState(open, 'suppress');
  assert.deepEqual(suppressed, { isExpanded: false, isSuppressed: true });
  assert.deepEqual(reduceTrevorPanelState(suppressed, 'open'), suppressed);
});

test('focused and sensitive routes suppress the shell guide', () => {
  for (const route of [
    '/',
    '/capture?id=starter-1',
    '/mission-briefing?id=starter-1',
    '/mission-submitted',
    '/classification',
    '/admin/proofs',
    '/voting/ballot',
  ]) {
    assert.equal(isTrevorFocusedRoute(route), true, route);
  }
  assert.equal(isTrevorFocusedRoute('/basecamp'), false);
  assert.equal(isTrevorFocusedRoute('/profile?tab=logbook'), false);
});

test('unavailable secondary actions are omitted rather than rendered dead', () => {
  const selected = recommendation({
    legalComplete: false,
    starterComplete: false,
    accessibleDeckIds: [],
    recommendedDeckId: undefined,
  });
  assert.equal(selected.id, 'legal_required');
  assert.equal(selected.secondaryAction, undefined);
  const html = renderToStaticMarkup(
    <TrevorGuideView
      recommendation={selected}
      message="Finish setup."
      isExpanded
      hasNewState={false}
      onOpen={noop}
      onCollapse={noop}
      onAction={noop}
      onSuppress={noop}
    />,
  );
  assert.match(html, /Finish Setup/);
  assert.doesNotMatch(html, /undefined/);
});

test('mock context changes replace the recommendation without changing the launcher contract', () => {
  const ordinary = recommendation();
  const voting = recommendation({ votingPhase: 'voting', hasVotedThisCycle: false });
  assert.equal(ordinary.id, 'fallback_draw');
  assert.equal(voting.id, 'voting_open');
  assert.equal(voting.primaryAction.route, '/voting');
});
