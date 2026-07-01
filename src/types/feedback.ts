export enum RewardIntensity {
  MAJOR_REVEAL = 'MAJOR_REVEAL',
  MEDIUM_REWARD = 'MEDIUM_REWARD',
  MICRO_FEEDBACK = 'MICRO_FEEDBACK',
}

export type RewardType = 'badge' | 'sticker' | 'aura' | 'persona' | 'rank' | 'milestone' | 'artifact' | 'progress' | 'action';

export interface RewardQueueItem {
  id: string;
  type: RewardType;
  intensity: RewardIntensity;
  title: string;
  description?: string;
  rewardText?: string;
  iconName?: string; // Lucide icon name
  rarity?: 'common' | 'uncommon' | 'rare' | 'bureau-secret';
  redirectPath?: string;
  persistentKey?: string;
  metadata?: any;
}
