import { Timestamp } from 'firebase/firestore';
import { Season, SabotageCard } from './types/game';
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

import { FieldTypeId as FTId, FIELD_TYPES as FTs, FieldType as FTType } from './constants/fieldTypes';

/**
 * SYSTEM 2: Player-Facing Field Types
 * The core game identity resulting from Field Classification.
 */
export type FieldTypeId = FTId;
export type FieldType = FTType;
export const FIELD_TYPES = FTs;

export type { TripCard } from './types/challenges';
export type Trip = TripCard;
export type Challenge = TripCard;

export const SUMMER_SEASON: Season = {
  id: 'summer-2026',
  title: 'SUMMER_FIELD_TRIP_01',
  description: 'Turn ordinary days into Field Trips. 14 Weekly Drops. Evidence collection is mandatory.',
  status: 'active',
  startDate: Timestamp.fromDate(new Date('2026-05-10')),
  endDate: Timestamp.fromDate(new Date('2026-08-16')),
  weeks: Array.from({ length: 14 }).map((_, i) => ({
    number: i + 1,
    startDate: Timestamp.fromDate(new Date(new Date('2026-05-10').getTime() + i * 7 * 24 * 60 * 60 * 1000)),
    fieldChallengeId: `field-${i + 1}`,
    evidenceChallengeId: `evidence-${i + 1}`,
    crewChallengeId: `crew-${i + 1}`,
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
  featureFlags: {
    fieldSignalsEnabled: true,
    badgeFragmentsEnabled: true,
    crewArtifactsEnabled: true,
    rivalMomentsEnabled: true,
    appObservationsEnabled: true,
    crewDispatchEnabled: true,
    proofFinderEnabled: true,
    skinsEnabled: true,
    fieldTypeEffectsEnabled: true
  }
};

const MOCK_TIME = new Date().toISOString();

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
import { SUMMER_CHALLENGE_BANK } from './data/summerChallengeBank';

export const MOCK_TRIPS: TripCard[] = (SUMMER_CHALLENGE_BANK as any[]).filter(t => 
  t.status === 'available' || t.status === 'approved' || t.status === 'active'
);

export interface Entry {
  id: string;
  userId: string;
  userName: string;
  crewId?: string;
  tripId: string;
  tripTitle: string;
  challengeTitle?: string; // Cache the challenge name for zine feed
  selectedLevel: 'Standard' | 'Advanced' | 'Certified';
  proofImage: string;
  userAvatar?: any; // AvatarData type
  fieldNote: string;
  status: 'pending' | 'approved' | 'rejected' | 'needs-more-proof' | 'draft' | 'submitted' | 'checking' | 'auto_approved' | 'needs_review' | 'resubmit_requested' | 'approved_by_admin' | 'under_field_check';
  pointsAwarded: number;
  detourCompleted: boolean;
  proofCheckId?: string;
  createdAt: any;
  adminNotes?: string;
  rejectedAt?: any;
  purgeEligibleAt?: any;
  imageStoragePath?: string;
  imagePurged?: boolean;
  
  // Viewfinder & Metadata Extensions
  originalImageUrl?: string;
  filteredImageUrl?: string;
  uploadSource?: 'camera' | 'cameraRoll' | 'upload';
  photoTakenAt?: string | null;
  fileLastModifiedAt?: string | null;
  submittedAt?: string;
  metadataStatus?: 'verified' | 'missing' | 'mismatch' | 'unverified' | 'suspicious';
  captureTrustLevel?: 'live' | 'verifiedCameraRoll' | 'unverifiedCameraRoll';
  filterUsed?: string;
  filterIntensity?: number;
  reviewStatus?: 'approved' | 'pending' | 'pendingReview' | 'rejected' | 'autoRejected' | 'needsMoreProof';
  hintUsed?: boolean;
}

export const MOCK_ENTRIES: Entry[] = [
  {
    id: 'e1',
    userId: 'u1',
    userName: 'Field Agent Jules',
    tripId: 't1',
    tripTitle: 'Market Intersection Audit',
    selectedLevel: 'Advanced',
    proofImage: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?auto=format&fit=crop&q=80&w=800',
    fieldNote: 'Audit completed at 0600. Vendor activity is high. Local patterns seem consistent with previous reports.',
    status: 'approved_by_admin',
    pointsAwarded: 200,
    detourCompleted: false,
    createdAt: '2024-05-09T08:00:00Z'
  },
  {
    id: 'e2',
    userId: 'u2',
    userName: 'Quiet_Gnome',
    tripId: 't2',
    tripTitle: 'Post-Industrial Flora Map',
    selectedLevel: 'Certified',
    proofImage: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?auto=format&fit=crop&q=80&w=800',
    fieldNote: 'Visual confirmation: Peregrine Falcon sighted at Site B. Unexpected deviation from seasonal norms.',
    status: 'approved_by_admin',
    pointsAwarded: 350,
    detourCompleted: true,
    createdAt: '2024-05-10T10:00:00Z'
  }
];
