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
  },
  {
    id: 'lens-flare-expert',
    title: 'LENS_FLARE_EXPERT',
    description: 'Mastery over lighting and visual composition.',
    requiredFragments: 3,
    unlockReward: 'Prismatic Filter',
    badgeCategory: 'Behavior',
    rarity: 'rare',
    icon: 'Sun',
    fragmentFlavor: 'Refracted photons'
  },
  {
    id: 'first-mission',
    title: 'FIRST_PROTOCOL_INITIATED',
    description: 'The first step into a larger, more interesting world.',
    requiredFragments: 1,
    unlockReward: 'New Recruit Title',
    badgeCategory: 'Exploration',
    rarity: 'common',
    icon: 'Flag',
    fragmentFlavor: 'Initial signal'
  },
  {
    id: 'photo-veteran',
    title: 'SHUTTER_MAESTRO',
    description: 'Five distinct photo proofs logged and classified.',
    requiredFragments: 5,
    unlockReward: 'Gold Camera Icon',
    badgeCategory: 'Behavior',
    rarity: 'uncommon',
    icon: 'Camera',
    fragmentFlavor: 'Perfect exposures'
  },
  {
    id: 'field-master',
    title: 'FIELD_VETERAN',
    description: 'Documentation of five major Field Challenges.',
    requiredFragments: 5,
    unlockReward: 'Senior Agent Status',
    badgeCategory: 'Category',
    rarity: 'rare',
    icon: 'Shield',
    fragmentFlavor: 'Bureau-approved data'
  },
  {
    id: 'gourmet-goblin',
    title: 'TASTE_BENDER',
    description: 'Victory in a high-stakes food challenge.',
    requiredFragments: 1,
    unlockReward: 'Flavor Particle Effect',
    badgeCategory: 'Category',
    rarity: 'rare',
    icon: 'Pizza',
    fragmentFlavor: 'Lingering spices'
  },
  {
    id: 'uncatchable',
    title: 'THE_GHOST_PROTOCOL',
    description: 'Surviving a Field Check without any data revisions.',
    requiredFragments: 1,
    unlockReward: 'Stealth Profile Border',
    badgeCategory: 'Behavior',
    rarity: 'rare',
    icon: 'Ghost',
    fragmentFlavor: 'Cleared logs'
  },
  {
    id: 'auditor-honor',
    title: 'BUREAU_AUDITOR',
    description: 'Providing valid Field Checks on irregular data.',
    requiredFragments: 3,
    unlockReward: 'Auditor Badge Sticker',
    badgeCategory: 'Social',
    rarity: 'uncommon',
    icon: 'Eye',
    fragmentFlavor: 'Spotted anomalies'
  },
  {
    id: 'chaos-bringer',
    title: 'ENTROPY_ENGINE',
    description: 'Completing three distinct Chaos Card modifiers.',
    requiredFragments: 3,
    unlockReward: 'Static UI Glitch',
    badgeCategory: 'Behavior',
    rarity: 'rare',
    icon: 'Zap',
    fragmentFlavor: 'Random variables'
  },
  {
    id: 'survivor-spirit',
    title: 'SABOTAGE_REJECTOR',
    description: 'Completing a challenge despite active sabotage attempts.',
    requiredFragments: 1,
    unlockReward: 'Industrial Shield Lock',
    badgeCategory: 'Behavior',
    rarity: 'rare',
    icon: 'ShieldAlert',
    fragmentFlavor: 'Resilience nodes'
  },
  {
    id: 'gallery-winner',
    title: 'LENS_LAUREATE',
    description: 'Winning the "Best Photo" vote for the week.',
    requiredFragments: 1,
    unlockReward: 'Prismatic Frame',
    badgeCategory: 'Social',
    rarity: 'rare',
    icon: 'Image',
    fragmentFlavor: 'Aesthetic consensus'
  },
  {
    id: 'season-crown',
    title: 'SUMMER_CROWN_LEGEND',
    description: 'Completion of the final Season Challenge.',
    requiredFragments: 1,
    unlockReward: 'Golden Crown Avatar Frame',
    badgeCategory: 'Exploration',
    rarity: 'bureau-secret',
    icon: 'Crown',
    fragmentFlavor: 'Season finality'
  }
];
