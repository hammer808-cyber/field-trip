// Effective reward-animation intensity for a player's preferences.
//
// motionEnabled === false (the "Reduce motion" toggle in Settings, profile
// preferences) calms the celebrations to 'reduced' unless the player picked
// 'minimal', which wins. PlayerLevelUpFeedback reads motionEnabled directly
// for its own reducedMotion boolean; this helper is the single rule for
// RewardFeedback.
export type RewardAnimationIntensity = 'full' | 'reduced' | 'minimal';

export function resolveRewardIntensity(preferences?: {
  motionEnabled?: boolean;
  rewardAnimationIntensity?: RewardAnimationIntensity;
}): RewardAnimationIntensity {
  const picked = preferences?.rewardAnimationIntensity || 'full';
  if (picked === 'minimal') return 'minimal';
  if (preferences?.motionEnabled === false) return 'reduced';
  return picked;
}
