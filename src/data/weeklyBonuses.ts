export interface WeeklyBonus {
  id: string;
  index: number;
  title: string;
  description: string;
  variant: 'orange' | 'cyan' | 'lime' | 'purple' | 'pink' | 'emerald';
  badgeCode: string;
}

export const WEEKLY_BONUSES: WeeklyBonus[] = [
  {
    id: 'bonus-urban-uplink',
    index: 1,
    title: 'Urban Uplink',
    description: 'Your first approved receipt this week gets double points. Trevor loves a strong opener.',
    variant: 'orange',
    badgeCode: 'SIGNAL_A1'
  },
  {
    id: 'bonus-heatwave-receipts',
    index: 2,
    title: 'Heatwave Receipts Booster',
    description: '+25 bonus XP for completing any Heatwave Receipts mission this week.',
    variant: 'lime',
    badgeCode: 'SIGNAL_SF'
  },
  {
    id: 'bonus-noontime-sync',
    index: 3,
    title: 'Noontime Sync',
    description: '+15 bonus points for sending in an adventure between 11 AM and 1 PM.',
    variant: 'cyan',
    badgeCode: 'SIGNAL_T5'
  },
  {
    id: 'bonus-scout-armor',
    index: 4,
    title: 'Scout Armor Shield',
    description: '+1 streak save this week. Miss a day and your streak gets one tiny helmet.',
    variant: 'purple',
    badgeCode: 'SHIELD_P1'
  },
  {
    id: 'bonus-radar-sweep',
    index: 5,
    title: 'Radar Sweep',
    description: 'Hidden-object adventures earn +20 bonus XP. Look where nobody bothers to look.',
    variant: 'pink',
    badgeCode: 'SWEEP_D3'
  },
  {
    id: 'bonus-token-multiplier',
    index: 6,
    title: 'Archive Token Boost',
    description: 'Your first approved adventure this week earns double archive tokens.',
    variant: 'emerald',
    badgeCode: 'TOKEN_X2'
  },
  {
    id: 'bonus-expressive-flare',
    index: 7,
    title: 'Expressive Flare',
    description: 'Mood-object or vibe-heavy adventures get +15 XP. Bring flair. Trevor is watching respectfully.',
    variant: 'orange',
    badgeCode: 'FLARE_E4'
  },
  {
    id: 'bonus-ocular-capture',
    index: 8,
    title: 'Camera Roll Bonus',
    description: 'Photo adventures get a 1.2x XP boost this week. Snap the thing. Become folklore.',
    variant: 'cyan',
    badgeCode: 'PHOTO_Z9'
  },
  {
    id: 'bonus-transmission-leak',
    index: 9,
    title: 'Hot Sidewalk Bonus',
    description: 'Adventures finished between 2 PM and 4 PM earn +20 XP. Hydrate like a legend.',
    variant: 'lime',
    badgeCode: 'LEAK_W3'
  },
  {
    id: 'bonus-archive-sweep',
    index: 10,
    title: 'Archive Retry Bonus',
    description: 'Fix-up attempts that get approved earn an extra 10 XP this week. Comeback energy.',
    variant: 'purple',
    badgeCode: 'RETRY_V1'
  },
  {
    id: 'bonus-transit-sync',
    index: 11,
    title: 'Bus Stop Treasure',
    description: 'Adventures near bus stops, trains, or platforms earn +15 tokens. Public transit has secrets.',
    variant: 'pink',
    badgeCode: 'NODE_X8'
  },
  {
    id: 'bonus-flora-finder',
    index: 12,
    title: 'Plant Thing Bonus',
    description: 'Plants, weeds, flowers, and sidewalk jungle moments earn +20 extra XP.',
    variant: 'emerald',
    badgeCode: 'FLORA_G7'
  },
  {
    id: 'bonus-retro-scan',
    index: 13,
    title: 'Old Thing Bonus',
    description: 'Old signs, ancient gadgets, and suspiciously vintage finds earn double tokens.',
    variant: 'orange',
    badgeCode: 'RETRO_C0'
  },
  {
    id: 'bonus-overgrowth-echo',
    index: 14,
    title: 'Overgrowth Echo',
    description: 'Overgrowth, weeds in concrete, and dramatic alley moments earn +15 XP.',
    variant: 'lime',
    badgeCode: 'ECHO_Y7'
  },
  {
    id: 'bonus-dusk-surveillance',
    index: 15,
    title: 'Dusk Legend Bonus',
    description: 'Adventures approved between 6 PM and 8 PM earn a streak shield. Sunset does paperwork now.',
    variant: 'purple',
    badgeCode: 'DUSK_Q1'
  }
];

function mulberry32(a: number) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
};

export function getWeeklyBonusForWeek(weekNumber: number): WeeklyBonus {
  const adjustedWeek = weekNumber > 0 ? weekNumber : 1;
  const cycle = Math.floor((adjustedWeek - 1) / 15);
  const indexInCycle = (adjustedWeek - 1) % 15;
  
  // Seed based on sequence cycle to avoid duplicates in the same cycle
  const seed = 142857 + cycle * 12345;
  const rand = mulberry32(seed);
  
  // List of indices
  const indices = Array.from({ length: 15 }, (_, i) => i);
  // Fisher-Yates shuffle
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const temp = indices[i];
    indices[i] = indices[j];
    indices[j] = temp;
  }
  
  const selectedIndex = indices[indexInCycle];
  return WEEKLY_BONUSES[selectedIndex] || WEEKLY_BONUSES[0];
}
