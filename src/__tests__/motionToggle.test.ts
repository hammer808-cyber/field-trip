import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { resolveRewardIntensity } from '../logic/rewardIntensity';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const profileSrc = readFileSync(join(repoRoot, 'src/pages/Profile.tsx'), 'utf8');
const rewardFeedbackSrc = readFileSync(
  join(repoRoot, 'src/components/RewardFeedback.tsx'),
  'utf8'
);

// Motion toggle (Zach's call, Nov 20, 2026): the motionEnabled preference was
// only ever read (PlayerLevelUpFeedback) and never written — Settings now has
// a real "Reduce motion" toggle that writes it, and RewardFeedback honors it
// through resolveRewardIntensity.

test('motion toggle: resolveRewardIntensity respects motionEnabled', () => {
  assert.equal(resolveRewardIntensity(undefined), 'full');
  assert.equal(resolveRewardIntensity({}), 'full');
  assert.equal(resolveRewardIntensity({ rewardAnimationIntensity: 'reduced' }), 'reduced');
  assert.equal(resolveRewardIntensity({ rewardAnimationIntensity: 'minimal' }), 'minimal');
  // Reduce motion calms full celebrations to reduced.
  assert.equal(
    resolveRewardIntensity({ motionEnabled: false }),
    'reduced'
  );
  assert.equal(
    resolveRewardIntensity({ motionEnabled: false, rewardAnimationIntensity: 'full' }),
    'reduced'
  );
  // Minimal wins over the toggle.
  assert.equal(
    resolveRewardIntensity({ motionEnabled: false, rewardAnimationIntensity: 'minimal' }),
    'minimal'
  );
  // Motion on (true) leaves the picked intensity alone.
  assert.equal(
    resolveRewardIntensity({ motionEnabled: true, rewardAnimationIntensity: 'full' }),
    'full'
  );
});

test('motion toggle: Settings has a Reduce motion toggle writing motionEnabled', () => {
  assert.ok(profileSrc.includes('Reduce motion'), 'no Reduce motion label in Profile.tsx');
  assert.ok(
    profileSrc.includes('motionEnabled: !reduceMotion'),
    'toggle does not write motionEnabled'
  );
  assert.ok(
    profileSrc.includes('profile?.preferences?.motionEnabled === false'),
    'toggle does not read motionEnabled === false as its checked state'
  );
});

test('motion toggle: RewardFeedback derives intensity through the helper', () => {
  assert.ok(
    rewardFeedbackSrc.includes('resolveRewardIntensity(profile?.preferences)'),
    'RewardFeedback does not use resolveRewardIntensity'
  );
  assert.ok(
    !rewardFeedbackSrc.includes("profile?.preferences?.rewardAnimationIntensity || 'full'"),
    'RewardFeedback still derives intensity inline, bypassing the toggle'
  );
});
