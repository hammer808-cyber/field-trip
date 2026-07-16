import assert from 'node:assert/strict';
import test from 'node:test';
import { transitionMissionHintFlow } from '../logic/missionHintFlow';
import { getMissionHint } from '../logic/missionScoring';
import { buildMissionHintRevealPlan } from '../server/missionAttemptScoring';

test('opening and cancelling hint confirmation does not mark a hint used', () => {
  const confirming = transitionMissionHintFlow('idle', 'open');
  assert.equal(confirming, 'confirming');
  assert.equal(transitionMissionHintFlow(confirming, 'cancel'), 'idle');
});

test('hint UI reveals only after explicit confirmation and successful persistence', () => {
  const confirming = transitionMissionHintFlow('idle', 'open');
  const revealing = transitionMissionHintFlow(confirming, 'confirm');
  assert.equal(revealing, 'revealing');
  assert.equal(transitionMissionHintFlow(revealing, 'success'), 'revealed');
  assert.equal(transitionMissionHintFlow('revealed', 'reset'), 'idle');
});

test('server hint mutation persists the cap once and is idempotent on replay', () => {
  const timestamp = 'server-time-1';
  const first = buildMissionHintRevealPlan({
    hintUsed: false,
    hintPenaltyPercent: 15,
    maxScoreBeforeHint: 100,
    maxScoreAfterHint: 100,
  }, timestamp);
  assert.equal(first.changed, true);
  assert.equal(first.attempt.hintUsed, true);
  assert.equal(first.attempt.hintUsedAt, timestamp);
  assert.equal(first.attempt.hintPenaltyPoints, 15);
  assert.equal(first.attempt.maxScoreAfterHint, 85);

  const replay = buildMissionHintRevealPlan(first.attempt, 'server-time-2');
  assert.equal(replay.changed, false);
  assert.deepEqual(replay.update, {});
  assert.equal(replay.attempt.hintUsedAt, timestamp);
  assert.equal(replay.attempt.maxScoreAfterHint, 85);
});

test('legacy and missing hint copy resolve to safe player-facing text', () => {
  assert.deepEqual(getMissionHint({ hintText: 'Look near the curb.' }), { shortText: 'Look near the curb.' });
  const fallback = getMissionHint({ description: 'Photograph a strange sign.' });
  assert.match(fallback.shortText, /plain language/i);
  assert.doesNotMatch(fallback.shortText, /fraud|moderation|threshold/i);
});
