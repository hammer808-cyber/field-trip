export type BadgeRarity = 'common' | 'uncommon' | 'rare' | 'bureau-secret';
export type BadgeCategory = 'Behavior' | 'Category' | 'Social' | 'Exploration';

export interface Badge {
  id: string;
  title: string;
  description: string;
  requiredFragments: number;
  unlockReward: string;
  badgeCategory: BadgeCategory;
  rarity: BadgeRarity;
  icon: string; // Lucide icon name
  fragmentFlavor: string; // Description of what the fragments represent (e.g., "Sleepless hours")
}

export interface UserBadgeProgress {
  badgeId: string;
  userId: string;
  fragmentCount: number;
  isUnlocked: boolean;
  unlockedAt?: string;
  lastFragmentEarnedAt?: string;
}

export interface BadgeFragment {
  id: string;
  badgeId: string;
  userId: string;
  fragmentName: string;
  earnedFromChallengeId: string;
  earnedAt: string;
}

export const BADGE_DEFINITIONS: Badge[] = [
  {
    id: 'night-owl',
    title: 'NIGHT_OWL',
    description: 'Operating efficiently while the sun is offline.',
    requiredFragments: 3,
    unlockReward: 'Shadow Frame',
    badgeCategory: 'Behavior',
    rarity: 'uncommon',
    icon: 'Moon',
    fragmentFlavor: 'Deep hour timestamps'
  },
  {
    id: 'food-goblin',
    title: 'FOOD_GOBLIN',
    description: 'Documenting the fuel that keeps the field agents moving.',
    requiredFragments: 5,
    unlockReward: 'Sticker: Gluttony',
    badgeCategory: 'Category',
    rarity: 'common',
    icon: 'Utensils',
    fragmentFlavor: 'Grease-stained receipts'
  },
  {
    id: 'main-character',
    title: 'MAIN_CHARACTER',
    description: 'Ensuring the lens is always focused on the primary asset.',
    requiredFragments: 4,
    unlockReward: 'Glossy Profile Overlay',
    badgeCategory: 'Behavior',
    rarity: 'rare',
    icon: 'User',
    fragmentFlavor: 'Narcissistic lens flares'
  },
  {
    id: 'soft-criminal',
    title: 'SOFT_CRIMINAL',
    description: 'Pushing the boundaries of civic norms without actual fines.',
    requiredFragments: 3,
    unlockReward: 'Title: Public Nuisance',
    badgeCategory: 'Exploration',
    rarity: 'rare',
    icon: 'Ghost',
    fragmentFlavor: 'Suspicious glances'
  },
  {
    id: 'grass-contact',
    title: 'GRASS_CONTACT',
    description: 'Proof that the indoors has been successfully exited.',
    requiredFragments: 4,
    unlockReward: 'Nature Particle Effect',
    badgeCategory: 'Exploration',
    rarity: 'common',
    icon: 'Leaf',
    fragmentFlavor: 'Synthesized pollen'
  },
  {
    id: 'receipt-gremlin',
    title: 'RECEIPT_GREMLIN',
    description: 'A collector of fiscal evidence and paper trails.',
    requiredFragments: 3,
    unlockReward: 'Industrial Stapler Icon',
    badgeCategory: 'Category',
    rarity: 'uncommon',
    icon: 'Receipt',
    fragmentFlavor: 'Thermal paper scraps'
  },
  {
    id: 'crew-witness',
    title: 'CREW_WITNESS',
    description: 'Corroborating the activities of the collective.',
    requiredFragments: 5,
    unlockReward: 'Team Aura Effect',
    badgeCategory: 'Social',
    rarity: 'uncommon',
    icon: 'Users',
    fragmentFlavor: 'Group consensus'
  },
  {
    id: 'chaos-archivist',
    title: 'CHAOS_ARCHIVIST',
    description: 'Transforming random entropy into readable field data.',
    requiredFragments: 5,
    unlockReward: 'Ink-stained UI',
    badgeCategory: 'Behavior',
    rarity: 'rare',
    icon: 'Library',
    fragmentFlavor: 'Meticulous scribbles'
  },
  {
    id: 'detour-magnet',
    title: 'DETOUR_MAGNET',
    description: 'Successfully pivoting from the intended path.',
    requiredFragments: 3,
    unlockReward: 'Navigation Glitch Visual',
    badgeCategory: 'Exploration',
    rarity: 'rare',
    icon: 'Compass',
    fragmentFlavor: 'Wasted GPS cycles'
  },
  {
    id: 'comeback-creature',
    title: 'COMEBACK_CREATURE',
    description: 'Rising from the depths to the upper echelons.',
    requiredFragments: 1,
    unlockReward: 'Resurrection Aura Effect',
    badgeCategory: 'Social',
    rarity: 'bureau-secret',
    icon: 'TrendingUp',
    fragmentFlavor: 'Compressed adrenaline'
  }
];
