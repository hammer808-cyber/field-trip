import { Timestamp } from 'firebase/firestore';
import { Season, SabotageCard, Entry } from './types/game';
export type { Season, SabotageCard, Entry };
import { TripCard } from './types/challenges';

/**
 * SYSTEM 1: Internal Product/User Personas
 * Used ONLY for design, QA lenses, and admin/testing logic. 
 * Hidden from player-facing UI.
 */
export type ProductPersonaLensId = 'frankie' | 'danielle' | 'mahsa' | 'zach';

export interface ProductPersonaLens {
  id: ProductPersonaLensId;
  name: string;
  description: string;
}

export const PRODUCT_PERSONAS: Record<ProductPersonaLensId, ProductPersonaLens> = {
  'frankie': {
    id: 'frankie',
    name: 'Frankie',
    description: 'The Plain Player. Low friction, needs extremely clear calls to action, prefers simplicity over flavor text.'
  },
  'danielle': {
    id: 'danielle',
    name: 'Danielle',
    description: 'The Curated Critic. High standards for aesthetic/copy, sensitive to "cringe", appreciates high-polish details.'
  },
  'mahsa': {
    id: 'mahsa',
    name: 'Mahsa',
    description: 'The Interest-Wave Learner. Motivated by facts and fairness, sensitive to inconsistent rewards, loves warm social cohesion.'
  },
  'zach': {
    id: 'zach',
    name: 'Zach',
    description: 'The Intentional Chaos Strategist. Pushes edges, looks for loopholes, motivated by weirdness and unique social outcomes.'
  }
};

import { FieldTypeId as FTId, FIELD_TYPES as FTs, FieldType as FTType, normalizePersonaKey, normalizeFieldType } from './constants/fieldTypes';

/**
 * SYSTEM 2: Player-Facing Field Types
 * The core game identity resulting from Field Classification.
 */
export type FieldTypeId = FTId;
export type FieldType = FTType;
export const FIELD_TYPES = FTs;
export { normalizePersonaKey, normalizeFieldType };

export type { TripCard } from './types/challenges';
export type Trip = TripCard;
export type Challenge = TripCard;

export const HEATWAVE_SEASON_START_DATE = '2026-06-06T00:00:00Z'; // Launch date
export const HEATWAVE_SEASON_END_DATE = '2026-09-06T23:59:59Z';

export const HEATWAVE_SEASON: Season = {
  id: 'heatwave-receipts',
  title: 'HEATWAVE_RECEIPTS',
  description: 'Heatwave Receipts: A Summer Fieldtrip Deck',
  status: 'active',
  startDate: Timestamp.fromDate(new Date(HEATWAVE_SEASON_START_DATE)),
  endDate: Timestamp.fromDate(new Date(HEATWAVE_SEASON_END_DATE)),
  weeks: Array.from({ length: 14 }).map((_, i) => ({
    number: i + 1,
    startDate: Timestamp.fromDate(new Date(new Date(HEATWAVE_SEASON_START_DATE).getTime() + i * 7 * 24 * 60 * 60 * 1000)),
    fieldChallengeId: `ss26_w${i + 1}_field`,
    evidenceChallengeId: `ss26_w${i + 1}_evidence`,
    crewChallengeId: `ss26_w${i + 1}_crew`,
    chaosCardIds: [`chaos-${i + 1}`],
    sabotageCardIds: [`sabotage-${~~(i/3) + 1}`]
  })),
  createdAt: Timestamp.now()
};

export const DEV_SEASON: Season = {
  id: 'dev-season-2026',
  title: 'Field Trip Dev Season',
  description: 'BUREAU_OPS: Universal Deployment for Internal Field Research.',
  status: 'active',
  startDate: Timestamp.fromDate(new Date('2026-05-01')),
  endDate: Timestamp.fromDate(new Date('2026-09-01')),
  weeks: Array.from({ length: 20 }).map((_, i) => ({
    number: i + 1,
    startDate: Timestamp.fromDate(new Date(new Date('2026-05-01').getTime() + i * 7 * 24 * 60 * 60 * 1000)),
    fieldChallengeId: `field-${i + 1}`,
    evidenceChallengeId: `evidence-${i + 1}`,
    crewChallengeId: `crew-${i + 1}`,
    chaosCardIds: [`chaos-${i + 1}`],
    sabotageCardIds: [`sabotage-${~~(i/3) + 1}`]
  })),
  createdAt: Timestamp.now()
};

export const DEV_APP_CONFIG = {
  activeSeasonId: 'dev-season-2026',
  onboardingEntriesRequired: 1,
  levelThresholds: [
    { level: 1, minXP: 0 },
    { level: 2, minXP: 150 },
    { level: 3, minXP: 500 },
    { level: 4, minXP: 1000 }
  ],
  featureFlags: {
    fieldSignalsEnabled: true,
    badgeFragmentsEnabled: true,
    crewArtifactsEnabled: true,
    rivalMomentsEnabled: true,
    appObservationsEnabled: true,
    crewDispatchEnabled: true,
    proofFinderEnabled: true,
    skinsEnabled: true,
    fieldTypeEffectsEnabled: true,
    fieldGuideAssistEnabled: true,
    tribunalEnabled: false
  }
};

const MOCK_TIME = new Date().toISOString();

/**
 * GLOBAL CONFIG: User Fieldtrip Reset Modes
 * Defines how gameplay records are handled during a Global Reset.
 */
export type GlobalResetMode = 'archive' | 'delete';
export const GLOBAL_RESET_MODE: GlobalResetMode = 'archive';

export const SABOTAGE_CARDS: SabotageCard[] = [
  {
    id: 'sabotage-1',
    title: 'The Analog Filter',
    description: 'Forces target to write 200+ characters of Field Notes for their next entry.',
    restriction: 'Target must provide longer field notes.',
    severity: 'minor',
    points: 75,
    icon: 'PenTool'
  },
  {
    id: 'sabotage-2',
    title: 'Lens Fog',
    description: 'Target must submit two photos instead of one for proof.',
    restriction: 'Dual-proof required.',
    severity: 'major',
    points: 150,
    icon: 'CameraOff'
  },
  {
    id: 'sabotage-3',
    title: 'Social Silence',
    description: 'Target cannot use Crew Bonuses or Witness perks for 24 hours.',
    restriction: 'Solo documentation only.',
    severity: 'minor',
    points: 100,
    icon: 'MicOff'
  },
  {
    id: 'sabotage-4',
    title: 'The Red Tape',
    description: 'Target is subjected to mandatory Council Review for their next 3 entries.',
    restriction: 'Forced moderation.',
    severity: 'major',
    points: 200,
    icon: 'ShieldAlert'
  }
];

// We will use the high-fidelity bank for mocks to ensure consistency
import { HEATWAVE_CHALLENGE_BANK } from './data/heatwaveChallengeBank';
import { SOCAL_SUMMER_CHALLENGE_BANK } from './data/socalSummerChallengeBank';
import { STARTER_MISSION_BANK } from './data/starterMissionBank';

export const MOCK_TRIPS: TripCard[] = ([...STARTER_MISSION_BANK, ...HEATWAVE_CHALLENGE_BANK, ...SOCAL_SUMMER_CHALLENGE_BANK] as any[]).filter(t => 
  t.status === 'published' || t.status === 'available' || t.status === 'approved' || t.status === 'active'
);

export const MOCK_ENTRIES: Entry[] = [
  {
    id: 'e1',
    entryId: 'e1',
    uid: 'u1',
    userId: 'u1',
    userName: 'Field Agent Jules',
    displayName: 'Field Agent Jules',
    username: 'Field Agent Jules',
    missionId: 't1',
    challengeId: 't1',
    tripId: 't1',
    deckId: 'd1',
    tripTitle: 'Market Intersection Audit',
    selectedLevel: 'Advanced',
    proofImage: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?auto=format&fit=crop&q=80&w=800',
    imageUrl: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?auto=format&fit=crop&q=80&w=800',
    storagePath: null,
    fieldNote: 'Audit completed at 0600. Vendor activity is high. Local patterns seem consistent with previous reports.',
    status: 'approved_by_admin',
    xpValue: 200,
    xpAwarded: true,
    pointsAwarded: 200,
    detourCompleted: false,
    createdAt: '2024-05-09T08:00:00Z',
    updatedAt: '2024-05-09T08:00:00Z'
  },
  {
    id: 'e2',
    entryId: 'e2',
    uid: 'u2',
    userId: 'u2',
    userName: 'Quiet_Gnome',
    displayName: 'Quiet_Gnome',
    username: 'Quiet_Gnome',
    missionId: 't2',
    challengeId: 't2',
    tripId: 't2',
    deckId: 'd1',
    tripTitle: 'Post-Industrial Flora Map',
    selectedLevel: 'Certified',
    proofImage: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?auto=format&fit=crop&q=80&w=800',
    imageUrl: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?auto=format&fit=crop&q=80&w=800',
    storagePath: null,
    fieldNote: 'Visual confirmation: Peregrine Falcon sighted at Site B. Unexpected deviation from seasonal norms.',
    status: 'approved_by_admin',
    xpValue: 350,
    xpAwarded: true,
    pointsAwarded: 350,
    detourCompleted: true,
    createdAt: '2024-05-10T10:00:00Z',
    updatedAt: '2024-05-10T10:00:00Z'
  }
];
