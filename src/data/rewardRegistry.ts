
export type RewardType = 'sticker' | 'badge';
export type RewardRarity = 'common' | 'uncommon' | 'rare' | 'legendary';

export interface RewardMetadata {
  id: string;
  type: RewardType;
  label: string;
  description: string;
  rarity?: RewardRarity;
  assetPath?: string;
  fallbackIcon?: string;
  fallbackEmoji?: string;
  betaCritical?: boolean;
  category?: string;
  unlockCondition?: string;
  name?: string;
}

export const REWARD_REGISTRY: Record<string, RewardMetadata> = {
  /**
   * Note: assetPath should only be added for files that physically exist in /public/assets/rewards/
   * Proposed paths:
   * stickers: /assets/rewards/stickers/sticker_name.png
   * badges: /assets/rewards/badges/badge_name.png
   */
  // Stickers
  sticker_photo_proof: {
    id: 'sticker_photo_proof',
    type: 'sticker',
    label: 'Photo Proof',
    description: 'Captured your first visual evidence.',
    rarity: 'common',
    // assetPath: '/assets/rewards/stickers/sticker_photo_proof.png'
  },
  sticker_field_note: {
    id: 'sticker_field_note',
    type: 'sticker',
    label: 'Field Note',
    description: 'Logged a written observation.',
    rarity: 'common',
    // assetPath: '/assets/rewards/stickers/sticker_field_note.png'
  },
  sticker_weird_find: {
    id: 'sticker_weird_find',
    type: 'sticker',
    label: 'Weird Find',
    description: 'Spotted something worth documenting.',
    rarity: 'common',
    // assetPath: '/assets/rewards/stickers/sticker_weird_find.png'
  },
  'first-field-note': {
    id: 'first-field-note',
    type: 'sticker',
    label: 'First Field Note',
    description: 'Saved your first custom written field observation.',
    rarity: 'common',
    fallbackEmoji: '📝',
    betaCritical: true
  },
  'summer-starter': {
    id: 'summer-starter',
    type: 'sticker',
    label: 'Summer Starter',
    description: 'Began the seasonal expedition.',
    rarity: 'common',
    fallbackEmoji: '☀️',
    betaCritical: true
  },
  'persona-captain-clipboard': {
    id: 'persona-captain-clipboard',
    type: 'sticker',
    label: 'Captain Clipboard',
    description: 'Unlock trait: Extremely organized.',
    rarity: 'uncommon',
    fallbackEmoji: '📋',
    betaCritical: true
  },
  'persona-mall-rat': {
    id: 'persona-mall-rat',
    type: 'sticker',
    label: 'Mall Rat',
    description: 'Unlock trait: Indoor specialist.',
    rarity: 'uncommon',
    fallbackEmoji: '🐀',
    betaCritical: true
  },
  'persona-homecoming-queen': {
    id: 'persona-homecoming-queen',
    type: 'sticker',
    label: 'Homecoming Queen',
    description: 'Unlock trait: Social catalyst.',
    rarity: 'uncommon',
    fallbackEmoji: '👑',
    betaCritical: true
  },
  'persona-lost-camper': {
    id: 'persona-lost-camper',
    type: 'sticker',
    label: 'Lost Camper',
    description: 'Unlock trait: Nature survivor.',
    rarity: 'uncommon',
    fallbackEmoji: '🏕️',
    betaCritical: true
  },
  'persona-bigfoot': {
    id: 'persona-bigfoot',
    type: 'sticker',
    label: 'Bigfoot',
    description: 'Unlock trait: Legendary isolationist.',
    rarity: 'rare',
    fallbackEmoji: '👣',
    betaCritical: true
  },
  // Badges
  badge_first_mission: {
    id: 'badge_first_mission',
    type: 'badge',
    label: 'First Mission',
    description: 'Completed your first Field Trip mission.',
    rarity: 'common',
    // assetPath: '/assets/rewards/badges/badge_first_mission.png'
  },
  'first-approved-mission': {
    id: 'first-approved-mission',
    type: 'badge',
    label: 'First Approved Mission',
    description: 'Your first mission submission was approved by analysts.',
    rarity: 'common',
    fallbackEmoji: '🏆',
    betaCritical: true
  },
  badge_evidence_collector: {
    id: 'badge_evidence_collector',
    type: 'badge',
    label: 'Evidence Collector',
    description: 'Secured multiple types of mission evidence.',
    rarity: 'uncommon',
    // assetPath: '/assets/rewards/badges/badge_evidence_collector.png'
  },
  badge_field_notes: {
    id: 'badge_field_notes',
    type: 'badge',
    label: 'Field Notes',
    description: 'Showed commitment to written observations.',
    rarity: 'uncommon',
    // assetPath: '/assets/rewards/badges/badge_field_notes.png'
  }
};

/**
 * Returns metadata for a specific reward ID.
 * Falls back to a generated label if metadata is missing.
 */
export function getRewardMetadata(id: string): RewardMetadata {
  const metadata = REWARD_REGISTRY[id];
  if (metadata) return metadata;

  // Fallback for unknown IDs
  const isSticker = id.startsWith('sticker_');
  return {
    id,
    type: isSticker ? 'sticker' : 'badge',
    label: id.replace(/^sticker_|^badge_/, '').split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
    description: 'A newly discovered Field Trip reward.',
    rarity: 'common'
  };
}

/**
 * Returns all rewards of a specific type.
 */
export function getRewardsByType(type: RewardType): RewardMetadata[] {
  return Object.values(REWARD_REGISTRY).filter(r => r.type === type);
}
