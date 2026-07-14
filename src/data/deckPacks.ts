import { DeckCatalogSectionId, DeckPack } from '../types/deckPacks';
import { HEATWAVE_CHALLENGE_BANK } from './heatwaveChallengeBank';
import { SOCAL_SUMMER_CHALLENGE_BANK } from './socalSummerChallengeBank';
import { JET_SETTER_CHALLENGE_BANK } from './jetSetterChallengeBank';
import { ERRAND_DECK_CHALLENGE_BANK } from './errandDeckChallengeBank';
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
    catalogSection: 'starter-training',
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
    catalogSection: 'local-fieldtrips',

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
    catalogSection: 'featured-seasonal',

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
    packId: 'jet-setter',
    id: 'jet-setter',
    title: 'Jet Setter',
    deckCode: 'FT-05',
    artworkKey: 'jet-setter',
    coverImage: '/assets/decks/jet-setter.jpg',
    artPosition: 'center',
    isEvergreen: true,
    packName: 'Jet Setter',
    shortName: 'Jet Setter',
    description: 'A breezy beach-vacation deck for pools, resorts, coastal stays, travel days, snack stops, sunset walks, and camera-roll-worthy crew lore.',
    theme: 'baja',
    season: 'Evergreen Travel',
    missionIds: JET_SETTER_CHALLENGE_BANK.map(mission => mission.id as string),
    unlockRule: 'starter-complete',
    visibility: 'public',
    requiredCompletedDeckIds: ['starter-signals'],
    isActive: true,
    fallbackIcon: 'Plane',
    sortOrder: 3,
    difficultyRange: ['easy', 'medium'],
    tags: ['evergreen', 'travel', 'vacation', 'beach', 'crew-friendly'],
    catalogSection: 'travel',

    // Canonical properties
    deckId: 'jet-setter',
    deckName: 'Jet Setter',
    deckSubtitle: 'A Beach Vacation Fieldtrip Deck',
    status: 'active',
    deckType: 'evergreen-travel',
    requiredUnlock: 'starter-complete',
    requiredStarterApprovals: 3,
    totalCards: 25,

    defaultFindingTypes: [
      'Vacation Signal',
      'Beach Proof',
      'Pool Evidence',
      'Travel Receipt',
      'Crew Lore',
      'Resort Detail',
      'Snack Manifest',
      'Sunset Evidence'
    ]
  },
  {
    packId: 'errand-deck',
    id: 'errand-deck',
    title: 'The Errand Deck',
    deckCode: 'FT-04',
    artworkKey: 'errand-deck',
    coverImage: '/assets/decks/errand-deck.jpg',
    artPosition: 'center',
    isEvergreen: true,
    packName: 'The Errand Deck',
    shortName: 'Errands',
    description: 'A Fieldtrip Deck for Quick Stops, Side Quests, and Bags of Consequences',
    theme: 'diamond',
    season: 'Evergreen',
    missionIds: ERRAND_DECK_CHALLENGE_BANK.map(mission => mission.id as string),
    unlockRule: 'starter-complete',
    visibility: 'public',
    requiredCompletedDeckIds: ['starter-signals'],
    isActive: true,
    fallbackIcon: 'ShoppingBag',
    sortOrder: 4,
    difficultyRange: ['easy', 'medium'],
    tags: ['evergreen', 'errand', 'side-quest', 'receipt', 'crew-friendly'],
    catalogSection: 'always-on',

    // Canonical properties
    deckId: 'errand-deck',
    deckName: 'The Errand Deck',
    deckSubtitle: 'A Fieldtrip Deck for Quick Stops, Side Quests, and Bags of Consequences',
    status: 'active',
    deckType: 'evergreen',
    requiredUnlock: 'starter-complete',
    requiredStarterApprovals: 3,
    totalCards: 15,

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
    catalogSection: 'travel',
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
    catalogSection: 'local-fieldtrips',
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
    catalogSection: 'always-on',
  }
];

export { BASE_DECK_PLACEHOLDER, getDeckCoverImage } from '../lib/deckUtils';

export const getAllDeckPacks = (): DeckPack[] => {
  return DECK_PACKS;
};

export const getActiveDeckPacks = (): DeckPack[] => {
  return DECK_PACKS.filter(p => p.isActive);
};

export interface DeckCatalogSection {
  id: DeckCatalogSectionId;
  label: string;
  packs: DeckPack[];
}

const DECK_CATALOG_SECTION_ORDER: Array<Pick<DeckCatalogSection, 'id' | 'label'>> = [
  { id: 'featured-seasonal', label: 'Featured Seasonal Deck' },
  { id: 'always-on', label: 'Always-On Decks' },
  { id: 'travel', label: 'Travel Decks' },
  { id: 'local-fieldtrips', label: 'Local Fieldtrips' },
  { id: 'starter-training', label: 'Starter / Training Deck' },
];

export function getDeckCatalogSections(packs: DeckPack[] = getActiveDeckPacks()): DeckCatalogSection[] {
  return DECK_CATALOG_SECTION_ORDER.map(section => ({
    ...section,
    packs: packs
      .filter(pack => pack.catalogSection === section.id)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.packName.localeCompare(b.packName)),
  })).filter(section => section.packs.length > 0);
}

const DECK_PACK_ALIASES: Record<string, string> = {
  'errand-runs': 'errand-deck',
  'errand-runner': 'errand-deck',
  'errand-goblin-receipts': 'errand-deck',
};

export const normalizeDeckPackId = (packId: string): string => {
  const normalized = String(packId || '').trim().toLowerCase();
  return DECK_PACK_ALIASES[normalized] || normalized;
};

export const getDeckPackById = (packId: string): DeckPack | null => {
  const canonicalPackId = normalizeDeckPackId(packId);
  return DECK_PACKS.find(pack => (
    pack.packId === canonicalPackId || pack.id === canonicalPackId || pack.deckId === canonicalPackId
  )) || null;
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
