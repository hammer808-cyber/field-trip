import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PLAYER_LEVELS,
  getCrossedLevels,
  getExplorerTypeLevelTitle,
  getLevelFromXp,
  getLevelMinimumXp,
  getLevelProgress,
  getLevelTitle,
  getNextLevel,
  getProgressionRewardsForLevels,
  getUnlockedLevels,
} from '../logic/playerLevel';
import {
  buildProgressionAwardPlan,
  buildProgressionRepairPlan,
  getProgressionLedgerId,
  getProgressionLevelUpEventId,
} from '../server/playerProgression';

test('every fixed threshold resolves to its exact level and title', () => {
  for (const definition of PLAYER_LEVELS) {
    assert.equal(getLevelFromXp(definition.minXp), definition.level);
    assert.equal(getLevelTitle(definition.level), definition.title);
  }
});

test('values immediately below and above thresholds resolve correctly', () => {
  for (const definition of PLAYER_LEVELS.slice(1)) {
    assert.equal(getLevelFromXp(definition.minXp - 1), definition.level - 1);
    assert.equal(getLevelFromXp(definition.minXp + 1), definition.level);
  }
});

test('zero, negative, and invalid XP normalize to level one', () => {
  assert.equal(getLevelFromXp(0), 1);
  assert.equal(getLevelFromXp(-500), 1);
  assert.equal(getLevelFromXp(Number.NaN), 1);
});

test('level progress reports the next threshold and remaining XP', () => {
  assert.deepEqual(getLevelProgress(1587), {
    xp: 1587,
    level: 4,
    title: 'Scene Investigator',
    currentLevelMinXp: 1100,
    nextLevel: { level: 5, minXp: 1800, title: 'Licensed Side-Quester' },
    xpIntoLevel: 487,
    xpForNextLevel: 700,
    xpToNextLevel: 213,
    progressPercent: (487 / 700) * 100,
  });
  assert.equal(getNextLevel(1587).level, 5);
});

test('level progress percentage stays within bounds at level thresholds', () => {
  const newUser = getLevelProgress(0);
  assert.equal(newUser.level, 1);
  assert.equal(newUser.progressPercent, 0);
  assert.equal(newUser.xpToNextLevel, 250);

  const justBeforeLevelTwo = getLevelProgress(249);
  assert.ok(justBeforeLevelTwo.progressPercent >= 0);
  assert.ok(justBeforeLevelTwo.progressPercent < 100);
  assert.equal(justBeforeLevelTwo.xpToNextLevel, 1);

  const levelTwo = getLevelProgress(250);
  assert.equal(levelTwo.level, 2);
  assert.equal(levelTwo.progressPercent, 0);
  assert.equal(levelTwo.xpIntoLevel, 0);
});

test('highest authored tier and very high XP keep progress finite and bounded', () => {
  const highestAuthoredTier = getLevelProgress(getLevelMinimumXp(15));
  assert.equal(highestAuthoredTier.level, 15);
  assert.equal(highestAuthoredTier.progressPercent, 0);
  assert.equal(highestAuthoredTier.nextLevel.level, 16);
  assert.ok(highestAuthoredTier.xpToNextLevel > 0);

  const highProgress = getLevelProgress(Number.MAX_SAFE_INTEGER);
  assert.ok(Number.isFinite(highProgress.progressPercent));
  assert.ok(highProgress.progressPercent >= 0);
  assert.ok(highProgress.progressPercent <= 100);
  assert.ok(Number.isFinite(highProgress.xpToNextLevel));
  assert.ok(highProgress.xpToNextLevel >= 0);
});

test('post-level-15 progression follows the documented increasing-cost formula', () => {
  assert.equal(getLevelMinimumXp(16), 26300);
  assert.equal(getLevelMinimumXp(17), 30300);
  assert.equal(getLevelFromXp(26299), 15);
  assert.equal(getLevelFromXp(26300), 16);
  assert.equal(getLevelFromXp(30300), 17);
  assert.equal(getLevelTitle(17), 'Local Folklore');
});

test('multi-level jumps and unlocked level lists are complete', () => {
  assert.deepEqual(getCrossedLevels(249, 1800), [2, 3, 4, 5]);
  assert.deepEqual(getUnlockedLevels(600).map(level => level.level), [1, 2, 3]);
  assert.deepEqual(
    getProgressionRewardsForLevels([2, 3, 4, 5]).map(reward => reward.id),
    ['level-2-profile-stamp', 'level-3-field-sticker', 'level-4-big-board-border', 'level-5-explorer-pose'],
  );
});

test('Explorer Type title variants use existing IDs and safely fall back', () => {
  assert.equal(getExplorerTypeLevelTitle(5, 'mallRat'), 'Licensed Loitering Specialist');
  assert.equal(getExplorerTypeLevelTitle(5, 'captainClipboard'), 'Deputy Form Inspector');
  assert.equal(getExplorerTypeLevelTitle(5, 'missing-type'), 'Licensed Side-Quester');
  assert.equal(getExplorerTypeLevelTitle(4, 'mallRat'), 'Scene Investigator');
});

test('trusted award plans derive multi-level events and do not duplicate rewards', () => {
  const plan = buildProgressionAwardPlan({
    previousXp: 249,
    amount: 1551,
    existingRewardIds: ['level-2-profile-stamp'],
    explorerTypeId: 'mascota',
  });
  assert.equal(plan.fromLevel, 1);
  assert.equal(plan.toLevel, 5);
  assert.deepEqual(plan.unlockedLevels, [2, 3, 4, 5]);
  assert.equal(plan.explorerLevelTitle, 'Official Morale Officer');
  assert.equal(plan.allProgressionRewardIds.filter(id => id === 'level-2-profile-stamp').length, 1);
  assert.deepEqual(plan.newlyUnlockedRewardIds, [
    'level-3-field-sticker',
    'level-4-big-board-border',
    'level-5-explorer-pose',
  ]);
});

test('ledger and level-up IDs are deterministic per user and source', () => {
  const first = getProgressionLedgerId('user-1', 'proof_approved', 'entry-1');
  const replay = getProgressionLedgerId('user-1', 'proof_approved', 'entry-1');
  const other = getProgressionLedgerId('user-1', 'proof_approved', 'entry-2');
  assert.equal(first, replay);
  assert.notEqual(first, other);
  assert.equal(getProgressionLevelUpEventId(first), `level_${first}`);
});

test('repair plans preserve XP, correct stale caches, and create no event data', () => {
  const plan = buildProgressionRepairPlan('user-1', {
    xp: 1800,
    level: 2,
    levelTitle: 'Old title',
    progressionRewardIds: ['level-2-profile-stamp'],
  });
  assert.equal(plan.xp, 1800);
  assert.equal(plan.expectedLevel, 5);
  assert.equal(plan.changes.level, 5);
  assert.equal(plan.changes.levelTitle, 'Licensed Side-Quester');
  assert.equal(Object.prototype.hasOwnProperty.call(plan.changes, 'xp'), false);
  assert.equal(Object.keys(plan.changes).some(key => key.toLowerCase().includes('event')), false);

  const repaired = buildProgressionRepairPlan('user-1', {
    xp: 1800,
    level: plan.expectedLevel,
    levelTitle: plan.expectedLevelTitle,
    progressionRewardIds: plan.expectedProgressionRewardIds,
  });
  assert.deepEqual(repaired.changes, {});
});
