import { DeckPack } from '../types/deckPacks';
import { SUMMER_CHALLENGE_BANK } from './summerChallengeBank';
import { ChallengeCard } from '../types/challenges';

export const DECK_PACKS: DeckPack[] = [
  {
    packId: 'starter-signals',
    packName: 'Starter: First Signals',
    shortName: 'Starter',
    description: 'Essential signals for new Bureau scouts. Calibrate your sensors and cross the threshold.',
    theme: 'baja',
    season: 'Summer 2026',
    missionIds: ['starter-1', 'starter-2', 'starter-3'],
    unlockRule: 'immediate',
    visibility: 'public',
    isActive: true,
    fallbackIcon: 'Zap',
    sortOrder: 1,
    difficultyRange: ['easy', 'medium'],
    tags: ['essential', 'onboarding']
  },
  {
    packId: 'summer-surge-2026',
    packName: 'Summer Surge 2026',
    shortName: 'Summer Surge',
    description: 'The main tactical feed for the current atmospheric season. Document the heat, the light, and the urban overgrowth.',
    theme: 'heat',
    season: 'Summer 2026',
    missionIds: SUMMER_CHALLENGE_BANK.map(m => m.id as string).filter(id => id),
    unlockRule: 'seasonal',
    startsAt: '2026-05-30T00:00:00Z',
    endsAt: '2026-08-28T23:59:59Z',
    visibility: 'public',
    isActive: true,
    fallbackIcon: 'Sun',
    sortOrder: 2,
    difficultyRange: ['easy', 'medium', 'hard']
  },
  {
    packId: 'quick-hits',
    packName: 'Quick Hits',
    shortName: 'Quick',
    description: 'Rapid data points. Missions designed to be completed in under 10 minutes.',
    theme: 'diamond',
    missionIds: SUMMER_CHALLENGE_BANK.filter(m => (m.estimatedTimeMinutes || 0) <= 10).map(m => m.id as string),
    unlockRule: 'immediate',
    visibility: 'public',
    isActive: true,
    fallbackIcon: 'Clock',
    sortOrder: 3,
    difficultyRange: ['easy', 'medium'],
    evidenceTypesIncluded: ['photo', 'note']
  },
  {
    packId: 'expeditions',
    packName: 'Expeditions',
    shortName: 'Expedition',
    description: 'Extended signal tracking. High-effort missions for the dedicated scout.',
    theme: 'cosmic',
    missionIds: SUMMER_CHALLENGE_BANK.filter(m => (m.estimatedTimeMinutes || 0) >= 15 || m.difficulty === 'hard').map(m => m.id as string),
    unlockRule: 'rank_limit',
    requiredRank: 2,
    visibility: 'public',
    isActive: true,
    fallbackIcon: 'Compass',
    sortOrder: 4,
    difficultyRange: ['medium', 'hard']
  },
  {
    packId: 'evidence-photo',
    packName: 'Evidence: Photo Missions',
    shortName: 'Optics',
    description: 'Visual confirmation required. Missions focused on ocular data capture.',
    missionIds: SUMMER_CHALLENGE_BANK.filter(m => m.proofType?.includes('photo')).map(m => m.id as string),
    unlockRule: 'immediate',
    visibility: 'public',
    isActive: true,
    fallbackIcon: 'Camera',
    sortOrder: 5,
    evidenceTypesIncluded: ['photo']
  },
  {
    packId: 'evidence-note',
    packName: 'Evidence: Field Note Missions',
    shortName: 'Notes',
    description: 'Literary observation required. Detailed field reports for the Bureau archives.',
    missionIds: SUMMER_CHALLENGE_BANK.filter(m => m.proofType?.includes('note')).map(m => m.id as string),
    unlockRule: 'immediate',
    visibility: 'public',
    isActive: true,
    fallbackIcon: 'Zap',
    sortOrder: 6,
    evidenceTypesIncluded: ['note']
  },
  {
    packId: 'evidence-location',
    packName: 'Evidence: Location Missions',
    shortName: 'Sync',
    description: 'Geospatial verification required. Sync your satellite lock with these targeted areas.',
    missionIds: SUMMER_CHALLENGE_BANK.filter(m => m.proofRequirements?.requireLocation).map(m => m.id as string),
    unlockRule: 'rank_limit',
    requiredRank: 3,
    visibility: 'public',
    isActive: true,
    fallbackIcon: 'MapPin',
    sortOrder: 7,
    evidenceTypesIncluded: ['location']
  },
  {
    packId: 'archetype-captain-clipboard',
    packName: 'Captain Clipboard Pack',
    shortName: 'Clipboard',
    description: 'Official. Bureaucratic. Orderly. Document the bureaucracy of the physical world.',
    missionIds: SUMMER_CHALLENGE_BANK.filter(m => m.personaAffinity?.includes('captainClipboard')).map(m => m.id as string),
    unlockRule: 'archetype_match',
    requiredArchetype: 'captainClipboard',
    visibility: 'planned',
    isActive: false,
    fallbackIcon: 'Clipboard',
    sortOrder: 8
  },
  {
    packId: 'archetype-mall-rat',
    packName: 'Mall Rat Pack',
    shortName: 'Mall Rat',
    description: 'Navigate the commercial corridors. Document the retail artifacts of the era.',
    missionIds: SUMMER_CHALLENGE_BANK.filter(m => m.personaAffinity?.includes('mallRat')).map(m => m.id as string),
    unlockRule: 'archetype_match',
    requiredArchetype: 'mallRat',
    visibility: 'planned',
    isActive: false,
    fallbackIcon: 'ShoppingBag',
    sortOrder: 9
  },
  {
    packId: 'archetype-mascota',
    packName: 'Mascota Pack',
    shortName: 'Mascota',
    description: 'Visual flair and aesthetic precision. Discover the style within the sprawl.',
    missionIds: SUMMER_CHALLENGE_BANK.filter(m => m.personaAffinity?.includes('mascota')).map(m => m.id as string),
    unlockRule: 'archetype_match',
    requiredArchetype: 'mascota',
    visibility: 'planned',
    isActive: false,
    fallbackIcon: 'Palette',
    sortOrder: 10
  },
  {
    packId: 'archetype-elondra',
    packName: 'Elondra Pack',
    shortName: 'Elondra',
    description: 'High-concept observation. The spiritual pulse of the summer heat.',
    missionIds: SUMMER_CHALLENGE_BANK.filter(m => m.personaAffinity?.includes('elondra')).map(m => m.id as string),
    unlockRule: 'archetype_match',
    requiredArchetype: 'elondra',
    visibility: 'planned',
    isActive: false,
    fallbackIcon: 'Sparkles',
    sortOrder: 11
  },
  {
    packId: 'archetype-lost-camper',
    packName: 'Lost Camper Pack',
    shortName: 'Lost Camper',
    description: 'Urban exploration via accidental discovery. Find your way by getting lost.',
    missionIds: SUMMER_CHALLENGE_BANK.filter(m => m.personaAffinity?.includes('lostCamper')).map(m => m.id as string),
    unlockRule: 'archetype_match',
    requiredArchetype: 'lostCamper',
    visibility: 'planned',
    isActive: false,
    fallbackIcon: 'Tent',
    sortOrder: 12
  },
  {
    packId: 'archetype-bigfoot',
    packName: 'Bigfoot Pack',
    shortName: 'Bigfoot',
    description: 'Stealth surveillance. See without being seen. The master of hidden signals.',
    missionIds: SUMMER_CHALLENGE_BANK.filter(m => m.personaAffinity?.includes('bigfoot')).map(m => m.id as string),
    unlockRule: 'archetype_match',
    requiredArchetype: 'bigfoot',
    visibility: 'planned',
    isActive: false,
    fallbackIcon: 'Footprints',
    sortOrder: 13
  }
];

export const getAllDeckPacks = (): DeckPack[] => {
  return DECK_PACKS;
};

export const getActiveDeckPacks = (): DeckPack[] => {
  return DECK_PACKS.filter(p => p.isActive);
};

export const getDeckPackById = (packId: string): DeckPack | null => {
  return DECK_PACKS.find(p => p.packId === packId) || null;
};

export const getMissionsForPack = (packId: string, missionBank: Partial<ChallengeCard>[]): Partial<ChallengeCard>[] => {
  const pack = getDeckPackById(packId);
  if (!pack) return [];
  return missionBank.filter(m => m.id && pack.missionIds.includes(m.id));
};

export const getDefaultDeckPack = (): DeckPack => {
  return DECK_PACKS.find(p => p.packId === 'summer-surge-2026') || DECK_PACKS[0];
};

export const missionBelongsToPack = (missionId: string, packId: string): boolean => {
  const pack = getDeckPackById(packId);
  if (!pack) return false;
  return pack.missionIds.includes(missionId);
};
