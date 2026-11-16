export enum RewardIntensity {
  MAJOR_REVEAL = 'MAJOR_REVEAL',
  MEDIUM_REWARD = 'MEDIUM_REWARD',
  MICRO_FEEDBACK = 'MICRO_FEEDBACK',
}

export type RewardType = 'badge' | 'sticker' | 'aura' | 'persona' | 'rank' | 'milestone' | 'artifact' | 'progress' | 'action';

export type RewardRarity = 'common' | 'rare' | 'legendary';

export interface RewardQueueItem {
  id: string;
  type: RewardType;
  intensity: RewardIntensity;
  title: string;
  description?: string;
  rewardText?: string;
  iconName?: string; // Lucide icon name
  /** Sticker artwork to display instead of the Lucide icon (Stage 5). Falls back to iconName when absent or the image fails to load. */
  imageUrl?: string;
  rarity?: RewardRarity;
  redirectPath?: string;
  persistentKey?: string;
  metadata?: any;
}
