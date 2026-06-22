import { DeckPack } from '../types/deckPacks';
import { HEATWAVE_CHALLENGE_BANK } from './heatwaveChallengeBank';
import { SOCAL_SUMMER_CHALLENGE_BANK } from './socalSummerChallengeBank';
import { ChallengeCard } from '../types/challenges';
import { HEATWAVE_SEASON_START_DATE, HEATWAVE_SEASON_END_DATE } from '../constants';

export const DECK_PACKS: DeckPack[] = [
  {
    packId: 'starter-signals',
    id: 'starter-signals',
    title: 'Starter Signals',
    deckCode: 'FT-SS',
    artworkKey: 'starter-signals',
    coverImage: '/assets/decks/starter-signals.jpg',
    isStarter: true,
    isEvergreen: true,
    packName: 'Starter: First Signals',
    shortName: 'Starter',
    description: 'Your first three tiny adventures. Snap a pic, tell Trevor what happened, and unlock the bigger map.',
    theme: 'baja',
    season: 'Summer 2026',
    missionIds: ['starter-1', 'starter-2', 'starter-3'],
    unlockRule: 'immediate',
    visibility: 'public',
    isActive: true,
    fallbackIcon: 'Zap',
    sortOrder: 1,
    difficultyRange: ['easy', 'medium'],
    tags: ['essential', 'onboarding'],
    defaultFindingTypes: [
      "Object",
      "Surface",
      "Sign",
      "Color",
      "Texture",
      "Pattern",
      "Sound",
      "Scene",
      "Human-made evidence",
      "Natural evidence"
    ]
  },
  {
    packId: 'socal-summer',
    id: 'socal-summer',
    title: 'Summer SoCal',
    deckCode: 'FT-03',
    artworkKey: 'summer-socal',
    coverImage: '/assets/decks/socal-summer.jpg',
    isSeasonal: true,
    packName: 'SoCal Summer',
    shortName: 'SoCal',
    description: 'A sun-baked Southern California field deck for beach days, neighborhood walks, boardwalk snacks, golden hour sightings, local landmarks, and summer micro-adventures.',
    theme: 'baja',
    season: 'Summer 2026',
    missionIds: SOCAL_SUMMER_CHALLENGE_BANK.map(m => m.id as string),
    unlockRule: 'starter-complete',
    visibility: 'public',
    isActive: true,
    fallbackIcon: 'Waves',
    sortOrder: 2,
    difficultyRange: ['easy', 'medium', 'hard'],
    
    // Canonical properties
    deckId: 'socal-summer',
    deckSubtitle: 'Long Beach & Coastal Fields',
    status: 'active',
    deckType: 'regional',
    requiredUnlock: 'starter-complete',
    requiredStarterApprovals: 3,
    totalCards: 15,

    defaultFindingTypes: [
      "Beach Clue",
      "Coastal Artifact",
      "Sun Signature",
      "Shoreline Signal",
      "Palm Clue",
      "Public Art",
      "Summer Snack",
      "Golden Hour Evidence"
    ]
  },
  {
    packId: 'heatwave-receipts',
    id: 'heatwave-receipts',
    title: 'Heatwave Receipts',
    deckCode: 'FT-01',
    artworkKey: 'heatwave-receipts',
    coverImage: '/assets/decks/heatwave-receipts.jpg',
    isSeasonal: true,
    packName: 'Heatwave Receipts',
    shortName: 'Heatwave',
    description: 'Everyday thermal surveillance and hot transactions. Locate heat signatures, protective gear, group oases, and financial cooling logs.',
    theme: 'heat',
    season: 'Summer 2026',
    missionIds: HEATWAVE_CHALLENGE_BANK.filter(m => m.deckId === 'heatwave-receipts').map(m => m.id as string),
    unlockRule: 'seasonal',
    startsAt: HEATWAVE_SEASON_START_DATE,
    endsAt: HEATWAVE_SEASON_END_DATE,
    visibility: 'public',
    isActive: true,
    fallbackIcon: 'Sun',
    sortOrder: 2,
    difficultyRange: ['easy', 'medium', 'hard'],
    
    // Canonical properties
    deckId: 'heatwave-receipts',
    deckSubtitle: 'A Summer Fieldtrip Deck',
    status: 'active',
    deckType: 'seasonal',
    requiredUnlock: 'starter-complete',
    requiredStarterApprovals: 3,
    totalCards: 25,

    defaultFindingTypes: [
      "Heat Signal",
      "Meltdown Object",
      "Summer Surface",
      "Public Drama",
      "Cooling Evidence",
      "Sweat Artifact",
      "Shade Receipt",
      "Neon Clue",
      "Outdoor Chaos"
    ]
  },
  {
    packId: 'errand-runs',
    id: 'errand-runs',
    title: 'Errand Runner',
    deckCode: 'FT-04',
    artworkKey: 'errand-runner',
    coverImage: '/assets/decks/errand-runner.jpg',
    isEvergreen: true,
    packName: 'Errand Runs',
    shortName: 'Errands',
    description: 'Everyday missions transformed into tactical surveillance. Locate signatures at checkpoints, queues, and aisles.',
    theme: 'diamond',
    missionIds: [],
    unlockRule: 'immediate',
    visibility: 'public',
    isActive: true,
    fallbackIcon: 'ShoppingBag',
    sortOrder: 3,
    defaultFindingTypes: [
      "Checkout Evidence",
      "Parking Lot Clue",
      "Cart Artifact",
      "Shelf Signal",
      "Receipt Moment",
      "Line Drama",
      "Errand Object",
      "Found Signage"
    ]
  },
  {
    packId: 'baja-bratz',
    id: 'baja-bratz',
    packName: 'Baja Bratz',
    shortName: 'Baja',
    description: 'Future drop. High-speed, high-heat signals from the coastal dunes.',
    theme: 'baja',
    missionIds: [],
    unlockRule: 'immediate',
    visibility: 'public',
    isActive: true,
    fallbackIcon: 'Flame',
    sortOrder: 4,
    isFutureDrop: true,
  },
  {
    packId: 'urban-recon',
    id: 'urban-recon',
    packName: 'Urban Recon',
    shortName: 'Recon',
    description: 'Future drop. Tactical navigation of the concrete jungle.',
    theme: 'diamond',
    missionIds: [],
    unlockRule: 'immediate',
    visibility: 'public',
    isActive: true,
    fallbackIcon: 'Navigation',
    sortOrder: 5,
    isFutureDrop: true,
  },
  {
    packId: 'wildlife-witness',
    id: 'wildlife-witness',
    packName: 'Wildlife Witness',
    shortName: 'Wildlife',
    description: 'Future drop. Monitoring the non-human residents of the sprawl.',
    theme: 'cosmic',
    missionIds: [],
    unlockRule: 'immediate',
    visibility: 'public',
    isActive: true,
    fallbackIcon: 'Bird',
    sortOrder: 5,
    isFutureDrop: true,
  }
];

export { BASE_DECK_PLACEHOLDER, getDeckCoverImage } from '../lib/deckUtils';

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
  return DECK_PACKS.find(p => p.packId === 'heatwave-receipts') || DECK_PACKS[0];
};

export const missionBelongsToPack = (missionId: string, packId: string): boolean => {
  const pack = getDeckPackById(packId);
  if (!pack) return false;
  return pack.missionIds.includes(missionId);
};
