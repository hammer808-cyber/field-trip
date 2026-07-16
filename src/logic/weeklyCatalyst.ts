export interface WeeklyCatalyst {
  id: string;
  seasonId: string;
  weekNumber: number;
  title: string;
  shortLabel: string;
  description: string;
  startsAt: unknown;
  endsAt: unknown;
  status: 'scheduled' | 'active' | 'expired';
  multiplier: number;
  maxBonusPoints?: number;
  catalystType: string;
  eligibilityRules: {
    requiresPhoto?: boolean;
    requiresFieldNoteLength?: number;
    requiresTimeWindow?: boolean;
    startTime?: string;
    endTime?: string;
    requiresTag?: string;
  };
  stickerRewardId?: string;
  badgeRewardId?: string;
  isActive: boolean;
  createdAt: unknown;
  updatedAt: unknown;
  source?: 'firestore' | 'fallback';
  fallbackTemplateWeekNumber?: number;
}

export type WeeklyCatalystTemplate = Omit<WeeklyCatalyst, 'startsAt' | 'endsAt' | 'createdAt' | 'updatedAt'>;

export const DEFAULT_WEEKLY_CATALYSTS: Record<number, WeeklyCatalystTemplate> = {
  1: {
    id: 'default_1',
    seasonId: 'dev-season-2026',
    weekNumber: 1,
    title: 'Afternoon Power Hour',
    shortLabel: 'Power Hour',
    description: 'Take your shot between 12 PM and 3 PM with a photo and a decent story. Boom. 1.5x Catalyst.',
    status: 'active',
    multiplier: 1.5,
    catalystType: 'solar-wind',
    eligibilityRules: {
      requiresPhoto: true,
      requiresFieldNoteLength: 15,
      requiresTimeWindow: true,
      startTime: '12:00',
      endTime: '15:00',
    },
    stickerRewardId: 'solar-wind',
    isActive: true,
  },
  2: {
    id: 'default_2',
    seasonId: 'dev-season-2026',
    weekNumber: 2,
    title: 'Flora Finder Overdrive',
    shortLabel: 'Flora Finder',
    description: 'Find a plant, weed, leaf, or tiny green legend. Add a photo and a quick note. Nature rewards the nosy.',
    status: 'active',
    multiplier: 1.5,
    catalystType: 'flora-finder',
    eligibilityRules: {
      requiresPhoto: true,
      requiresFieldNoteLength: 15,
      requiresTag: 'nature',
    },
    stickerRewardId: 'flora-finder',
    isActive: true,
  },
  3: {
    id: 'default_3',
    seasonId: 'dev-season-2026',
    weekNumber: 3,
    title: 'Morning Legend Hour',
    shortLabel: 'Early Bird',
    description: 'Catch your find between 6 AM and 10 AM. Photo plus a little story earns 2x Catalyst. The sidewalk is awake.',
    status: 'active',
    multiplier: 2,
    catalystType: 'early-bird',
    eligibilityRules: {
      requiresPhoto: true,
      requiresFieldNoteLength: 20,
      requiresTimeWindow: true,
      startTime: '06:00',
      endTime: '10:00',
    },
    stickerRewardId: 'early-bird',
    isActive: true,
  },
  4: {
    id: 'default_4',
    seasonId: 'dev-season-2026',
    weekNumber: 4,
    title: 'Tell Me Everything Mode',
    shortLabel: 'Story Mode',
    description: 'Bring a photo and a juicy note with actual details. If Trevor can picture it, you earn 1.8x Catalyst.',
    status: 'active',
    multiplier: 1.8,
    catalystType: 'deep-field',
    eligibilityRules: {
      requiresPhoto: true,
      requiresFieldNoteLength: 45,
    },
    stickerRewardId: 'deep-field',
    isActive: true,
  },
  5: {
    id: 'default_5',
    seasonId: 'dev-season-2026',
    weekNumber: 5,
    title: 'Golden Hour-ish',
    shortLabel: 'Golden Hour',
    description: 'Catch today’s challenge between 6 PM and 9 PM. Bring a photo, a note, and a tiny bit of chaos for 1.5x Catalyst.',
    status: 'active',
    multiplier: 1.5,
    catalystType: 'dusk-watch',
    eligibilityRules: {
      requiresPhoto: true,
      requiresFieldNoteLength: 15,
      requiresTimeWindow: true,
      startTime: '18:00',
      endTime: '21:00',
    },
    stickerRewardId: 'dusk-patrol',
    isActive: true,
  },
};

export function getDefaultWeeklyCatalystForWeek(
  seasonId: string,
  weekNumber: number
): WeeklyCatalyst | null {
  if (!seasonId.trim() || !Number.isInteger(weekNumber) || weekNumber <= 0) return null;
  const templateWeeks = Object.keys(DEFAULT_WEEKLY_CATALYSTS).map(Number).sort((a, b) => a - b);
  if (templateWeeks.length === 0) return null;
  const templateWeekNumber = templateWeeks[(weekNumber - 1) % templateWeeks.length];
  const template = DEFAULT_WEEKLY_CATALYSTS[templateWeekNumber];
  return {
    ...template,
    id: `${seasonId}_${weekNumber}`,
    seasonId,
    weekNumber,
    startsAt: null,
    endsAt: null,
    createdAt: null,
    updatedAt: null,
    source: 'fallback',
    fallbackTemplateWeekNumber: templateWeekNumber,
  };
}
