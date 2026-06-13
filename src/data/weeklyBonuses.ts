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
    description: 'Double points on the first approved submission of the week. Calibrate your field logs carefully.',
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
    description: '+15 bonus points for submitting any mission between 11:00 AM and 1:00 PM local time.',
    variant: 'cyan',
    badgeCode: 'SIGNAL_T5'
  },
  {
    id: 'bonus-scout-armor',
    index: 4,
    title: 'Scout Armor Shield',
    description: '+1 streak protection this week. Your multiplier is shielded if you miss a field reporting day.',
    variant: 'purple',
    badgeCode: 'SHIELD_P1'
  },
  {
    id: 'bonus-radar-sweep',
    index: 5,
    title: 'Radar Sweep',
    description: 'Hidden object missions earn +20 bonus XP. Scan the blind spots of your grid.',
    variant: 'pink',
    badgeCode: 'SWEEP_D3'
  },
  {
    id: 'bonus-token-multiplier',
    index: 6,
    title: 'Archive Token Boost',
    description: 'First approved mission of the week rewards double tokens for the Season Archive.',
    variant: 'emerald',
    badgeCode: 'TOKEN_X2'
  },
  {
    id: 'bonus-expressive-flare',
    index: 7,
    title: 'Expressive Flare',
    description: 'Mood Object or atmospheric missions reward +15 bonus XP. Style your logs with flair.',
    variant: 'orange',
    badgeCode: 'FLARE_E4'
  },
  {
    id: 'bonus-ocular-capture',
    index: 8,
    title: 'Ocular Capture Multiplier',
    description: 'Photo-proof missions receive a 1.2x overall XP boost this week.',
    variant: 'cyan',
    badgeCode: 'PHOTO_Z9'
  },
  {
    id: 'bonus-transmission-leak',
    index: 9,
    title: 'Transmission Leak',
    description: 'Missions completed during high heat solar hours (2 PM - 4 PM) award +20 XP.',
    variant: 'lime',
    badgeCode: 'LEAK_W3'
  },
  {
    id: 'bonus-archive-sweep',
    index: 10,
    title: 'Archive Retry Bonus',
    description: 'Retry and resubmission success rewards an extra 10 XP on approved logs this week.',
    variant: 'purple',
    badgeCode: 'RETRY_V1'
  },
  {
    id: 'bonus-transit-sync',
    index: 11,
    title: 'Transit Node Sync',
    description: 'Missions located near transit-hubs, platforms, or bus stops reward +15 tokens.',
    variant: 'pink',
    badgeCode: 'NODE_X8'
  },
  {
    id: 'bonus-flora-finder',
    index: 12,
    title: 'Flora Finder Overlay',
    description: 'Nature-based, overgrown urban, or floral observations yield +20 XP extra.',
    variant: 'emerald',
    badgeCode: 'FLORA_G7'
  },
  {
    id: 'bonus-retro-scan',
    index: 13,
    title: 'Retro Scan Sync',
    description: 'Legacy technology, older signs, or antique object observations score double tokens.',
    variant: 'orange',
    badgeCode: 'RETRO_C0'
  },
  {
    id: 'bonus-overgrowth-echo',
    index: 14,
    title: 'Overgrowth Echo',
    description: 'Missions capturing overgrowth, weeds cracking through concrete, or alleys award +15 XP.',
    variant: 'lime',
    badgeCode: 'ECHO_Y7'
  },
  {
    id: 'bonus-dusk-surveillance',
    index: 15,
    title: 'Dusk Scout Protocol',
    description: 'Missions submitted and approved during dusk hours (6 PM - 8 PM) secure dynamic streak-shields.',
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
