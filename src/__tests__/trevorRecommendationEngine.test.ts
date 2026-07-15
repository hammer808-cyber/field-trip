import assert from 'node:assert/strict';
import test from 'node:test';
import {
  resolveTrevorAction,
  resolveTrevorActionWithFallback,
} from '../config/trevorActions';
import {
  buildTrevorContext,
  type TrevorContext,
} from '../services/trevorContextService';
import {
  getTrevorRecommendation,
} from '../services/trevorRecommendationEngine';
import type { TrevorHistoryEntry } from '../services/trevorHistoryService';

function context(overrides: Partial<TrevorContext> = {}): TrevorContext {
  return {
    userId: 'user-1',
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

test('incomplete Starter Signals recommends the next Starter action', () => {
  const recommendation = getTrevorRecommendation(context({
    experienceStage: 'starter',
    starterApprovedCount: 1,
    starterSubmittedCount: 1,
    starterComplete: false,
    accessibleDeckIds: ['starter-signals'],
    recentlyUsedDeckIds: [],
    recommendedDeckId: 'starter-signals',
  }));
  assert.equal(recommendation?.id, 'starter_incomplete');
  assert.equal(recommendation?.primaryAction.id, 'draw_starter');
});

test('an active Starter mission is resumed before another draw', () => {
  const recommendation = getTrevorRecommendation(context({
    experienceStage: 'starter',
    starterApprovedCount: 1,
    starterSubmittedCount: 1,
    starterComplete: false,
    accessibleDeckIds: ['starter-signals'],
    recommendedDeckId: 'starter-signals',
    activeMission: {
      id: 'starter-2',
      title: 'Second Signal',
      status: 'active',
      deckId: 'starter-signals',
    },
  }));
  assert.equal(recommendation?.id, 'starter_active');
  assert.equal(recommendation?.primaryAction.route, '/mission-briefing?id=starter-2');
});

test('proof needing more evidence outranks every other recommendation', () => {
  const recommendation = getTrevorRecommendation(context({
    needsMoreProofCount: 1,
    proofNeedingMoreEvidence: {
      entryId: 'entry-1',
      missionId: 'mission-1',
      missionTitle: 'Odd Sign',
      status: 'needs_more_proof',
    },
    votingPhase: 'voting',
    xpToNextLevel: 20,
  }));
  assert.equal(recommendation?.id, 'proof_needs_more');
  assert.equal(recommendation?.primaryAction.id, 'open_proof_fix');
  assert.match(recommendation?.primaryAction.route || '', /^\/capture\?/);
  assert.match(recommendation?.primaryAction.route || '', /mode=addMoreProof/);
});

test('a pending proof without a repair request does not produce a proof-fix recommendation', () => {
  const recommendation = getTrevorRecommendation(context({ pendingProofCount: 1 }));
  assert.notEqual(recommendation?.id, 'proof_needs_more');
  assert.notEqual(recommendation?.primaryAction.id, 'open_proof_fix');
});

test('Starter completion introduces the newly unlocked field systems', () => {
  const recommendation = getTrevorRecommendation(context({
    experienceStage: 'new_explorer',
    approvedProofCount: 3,
    hasUnseenStarterUnlock: true,
  }));
  assert.equal(recommendation?.id, 'starter_complete_unlock');
  assert.equal(recommendation?.tone, 'celebration');
});

test('a verified near-level gap produces a progression recommendation', () => {
  const recommendation = getTrevorRecommendation(context({
    xpForNextLevel: 500,
    xpToNextLevel: 60,
  }));
  assert.equal(recommendation?.id, 'near_level');
  assert.equal(recommendation?.secondaryAction?.id, 'open_level_progress');
});

test('a meaningful verified weekly rank gap is surfaced', () => {
  const recommendation = getTrevorRecommendation(context({
    weeklyRank: 4,
    weeklyScore: 300,
    pointsToNextRank: 40,
  }));
  assert.equal(recommendation?.id, 'weekly_rank');
  assert.equal(recommendation?.secondaryAction?.id, 'open_standings');
});

test('open voting is prioritized when the user has not voted', () => {
  const recommendation = getTrevorRecommendation(context({
    votingPhase: 'voting',
    hasVotedThisCycle: false,
  }));
  assert.equal(recommendation?.id, 'voting_open');
  assert.equal(recommendation?.primaryAction.route, '/voting');
});

test('completed voting is not recommended again', () => {
  const recommendation = getTrevorRecommendation(context({
    votingPhase: 'voting',
    hasVotedThisCycle: true,
  }));
  assert.notEqual(recommendation?.id, 'voting_open');
});

test('a real crew task opens Crew Home', () => {
  const recommendation = getTrevorRecommendation(context({
    crewId: 'crew-1',
    crewUnlocked: true,
    crewHasOpenTasks: true,
  }));
  assert.equal(recommendation?.id, 'crew_action');
  assert.equal(recommendation?.primaryAction.route, '/crew');
});

test('missing profile fields produce a specific profile action', () => {
  const recommendation = getTrevorRecommendation(context({
    profileCompleteness: 67,
    missingProfileFields: ['profile_image'],
  }));
  assert.equal(recommendation?.id, 'profile_incomplete');
  assert.equal(recommendation?.primaryAction.route, '/profile?tab=settings');
});

test('three repeated proof types produce a variety recommendation', () => {
  const recommendation = getTrevorRecommendation(context({ repeatedProofType: 'photo' }));
  assert.equal(recommendation?.id, 'proof_variety_photo');
});

test('a zine content gap is recommended before general discovery', () => {
  const recommendation = getTrevorRecommendation(context({ zineContentGaps: ['captions'] }));
  assert.equal(recommendation?.id, 'zine_gap_captions');
  assert.equal(recommendation?.secondaryAction?.route, '/dex/zines');
});

test('no contextual recommendation falls back to a valid mission action', () => {
  const recommendation = getTrevorRecommendation(context());
  assert.equal(recommendation?.id, 'fallback_draw');
  assert.equal(recommendation?.primaryAction.route, '/missions/decks?pack=heatwave-receipts');
});

test('missing and partially migrated beta data normalizes without crashing', () => {
  const normalized = buildTrevorContext({
    currentRoute: '/basecamp',
    profile: { id: 'beta-user', name: '', fieldType: null },
    currentDate: new Date('invalid'),
  });
  assert.equal(normalized.userId, 'beta-user');
  assert.equal(normalized.level, 1);
  assert.equal(normalized.starterApprovedCount, 0);
  assert.ok(normalized.missingProfileFields.includes('display_name'));
});

test('an unavailable destination resolves through its declared safe fallback', () => {
  const direct = resolveTrevorAction({ id: 'open_voting' }, context({ votingPhase: 'submission' }));
  const fallback = resolveTrevorActionWithFallback({ id: 'open_voting' }, context({ votingPhase: 'submission' }));
  assert.equal(direct, null);
  assert.equal(fallback?.id, 'open_standings');
  assert.equal(fallback?.route, '/big-board');
});

test('recommendation cooldown skips a recently displayed noncritical rule', () => {
  const now = new Date('2026-07-15T12:00:00.000Z');
  const history: TrevorHistoryEntry[] = [{
    recommendationId: 'near_level',
    shownAt: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
  }];
  const recommendation = getTrevorRecommendation(context({
    xpForNextLevel: 500,
    xpToNextLevel: 60,
  }), { history, now });
  assert.notEqual(recommendation?.id, 'near_level');
});

test('when voting and level rules both match, voting wins by priority', () => {
  const recommendation = getTrevorRecommendation(context({
    votingPhase: 'voting',
    hasVotedThisCycle: false,
    xpForNextLevel: 500,
    xpToNextLevel: 20,
  }));
  assert.equal(recommendation?.id, 'voting_open');
});

test('rejected proof retry uses the current Capture query contract', () => {
  const action = resolveTrevorAction({
    id: 'open_proof_fix',
    params: {
      entryId: 'entry-rejected',
      missionId: 'mission-rejected',
      status: 'rejected',
    },
  }, context());
  assert.match(action?.route || '', /^\/capture\?/);
  assert.match(action?.route || '', /isRetry=true/);
  assert.match(action?.route || '', /originalEntryId=entry-rejected/);
});
