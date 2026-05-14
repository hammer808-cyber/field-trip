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

/**
 * SYSTEM 2: Player-Facing Field Types
 * The core game identity resulting from Field Classification.
 */
export type FieldTypeId = 'captainClipboard' | 'mallRat' | 'homecomingQueen' | 'lostCamper' | 'bigfoot';

export interface FieldType {
  id: FieldTypeId;
  name: string;
  campRole: string;
  coreInstinct: string;
  description: string;
  vibe: string;
  firstTripId: string;
  perk: string;
  snag: string;
  perkDesc: string;
  snagDesc: string;
  stamp: string;
  badgeLabel: string;
  emptyState: string;
  recommendedTags: string[];
  recommendedChallengeTags: string[];
  image: string;
}

export const FIELD_TYPES: Record<FieldTypeId | 'unclassified', FieldType> = {
  'captainClipboard': {
    id: 'captainClipboard',
    name: 'Captain Clipboard',
    campRole: 'The Organizer',
    coreInstinct: 'Organize',
    description: 'The primary architect of the checklist. Precision is your primary weapon.',
    vibe: 'Organized, Rule-bound, Authoritative',
    firstTripId: 'starter-1',
    perk: 'Double Audit',
    perkDesc: 'Audit points are doubled for perfectly documented entries.',
    snag: 'Bureaucracy Block',
    snagDesc: 'Must fill out extra field notes or points are withheld.',
    stamp: 'CLIPBOARD_CERTIFIED',
    badgeLabel: 'Taskmaster',
    emptyState: 'The clipboard is empty. This is unacceptable.',
    recommendedTags: ['scout', 'detail', 'organized'],
    recommendedChallengeTags: ['organization', 'rules', 'timed', 'checklist'],
    image: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04844?auto=format&fit=crop&q=80&w=400'
  },
  'mallRat': {
    id: 'mallRat',
    name: 'Mall Rat',
    campRole: 'The Scene Seeker',
    coreInstinct: 'Socialize',
    description: 'The great outdoors is fine, but the great food court is better.',
    vibe: 'Social, Chill, Consumer-Adjacent',
    firstTripId: 'starter-3',
    perk: 'AC Comfort',
    perkDesc: 'Bonus points for indoor urban locations.',
    snag: 'Sunburn Risk',
    snagDesc: 'Outdoor missions during peak heat earn 20% fewer points.',
    stamp: 'MALL_CERTIFIED',
    badgeLabel: 'Aisle Explorer',
    emptyState: 'No activity. Are we at the arcade?',
    recommendedTags: ['urban', 'social', 'indoor'],
    recommendedChallengeTags: ['social', 'public', 'crew', 'location'],
    image: 'https://images.unsplash.com/photo-1541411138264-9743aadc26d0?auto=format&fit=crop&q=80&w=400'
  },
  'homecomingQueen': {
    id: 'homecomingQueen',
    name: 'Homecoming Queen',
    campRole: 'The Ringleader',
    coreInstinct: 'Lead / Compete',
    description: 'The world is your stage, and every mission is a photo op.',
    vibe: 'Social, High-Profile, Aesthetic',
    firstTripId: 'starter-3',
    perk: 'Social Proof',
    perkDesc: 'Bonus points for photos with friends or strangers.',
    snag: 'Camera Shy',
    snagDesc: 'Submissions without a high-fidelity photo get 10% penalty.',
    stamp: 'CROWN_STATUS',
    badgeLabel: 'Main Character',
    emptyState: 'Where is the audience? Go find them.',
    recommendedTags: ['social', 'aesthetic', 'group'],
    recommendedChallengeTags: ['competitive', 'performance', 'public', 'timed'],
    image: 'https://images.unsplash.com/photo-1582213713303-9366e609748b?auto=format&fit=crop&q=80&w=400'
  },
  'lostCamper': {
    id: 'lostCamper',
    name: 'Lost Camper',
    campRole: 'The Lonesome Traveler',
    coreInstinct: 'Explore',
    description: 'You aren\'t actually lost, you\'re just taking the scenically-serendipitous route.',
    vibe: 'Curious, Confused, Lucky',
    firstTripId: 'starter-1',
    perk: 'Chance Encounter',
    perkDesc: 'Rare chance to earn massive bonus points on random missions.',
    snag: 'Navigational Lag',
    snagDesc: 'Missions take longer to verify due to "unclear pathing."',
    stamp: 'MAP_NOT_FOUND',
    badgeLabel: 'Sightseer',
    emptyState: 'The map is upside down. Perfect.',
    recommendedTags: ['solo', 'wonder', 'random'],
    recommendedChallengeTags: ['exploration', 'solo', 'location', 'strange'],
    image: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&q=80&w=400'
  },
  'bigfoot': {
    id: 'bigfoot',
    name: 'Bigfoot',
    campRole: 'The Elusive Observer',
    coreInstinct: 'Observe / Document',
    description: 'Blurry photos, remote locations, and zero social interaction. Perfect.',
    vibe: 'Solo, Elusive, Nature-First',
    firstTripId: 'starter-2',
    perk: 'Deep Woods',
    perkDesc: 'Bonus points for being as far away from cities as possible.',
    snag: 'Social Anxiety',
    snagDesc: 'Point penalty for entries featuring more than one human.',
    stamp: 'SIGHTING_CONFIRMED',
    badgeLabel: 'Cryptid',
    emptyState: 'Unseen, as it should be.',
    recommendedTags: ['wilderness', 'solo', 'quiet'],
    recommendedChallengeTags: ['observation', 'photo', 'strange', 'fieldNotes'],
    image: 'https://images.unsplash.com/photo-1555685812-4b943f1cb0eb?auto=format&fit=crop&q=80&w=400'
  },
  'unclassified': {
    id: 'lostCamper' as any,
    name: 'Unclassified',
    campRole: 'Field Asset',
    coreInstinct: 'Adapt',
    description: 'Awaiting classification. The Bureau is still processing your behavioral profile.',
    vibe: 'Neutral, observing, flexible',
    firstTripId: 'starter-1',
    perk: 'Base Protocol',
    perkDesc: 'Standard Bureau rewards and rules apply.',
    snag: 'No Signature',
    snagDesc: 'Lacks specialized field advantages.',
    stamp: 'Pending Classification',
    badgeLabel: 'New Recruit',
    emptyState: 'Mission queue empty. Draw a card to begin.',
    recommendedTags: ['starter', 'basics'],
    recommendedChallengeTags: ['starter', 'basics'],
    image: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=400'
  }
};

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

export const MOCK_TRIPS: TripCard[] = SUMMER_CHALLENGE_BANK as any;

export interface Entry {
  id: string;
  userId: string;
  userName: string;
  crewId?: string;
  tripId: string;
  tripTitle: string;
  challengeTitle?: string; // Cache the challenge name for zine feed
  selectedLevel: 'Scout' | 'Explorer' | 'Legend';
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
  uploadSource?: 'camera' | 'upload';
  photoTakenAt?: string | null;
  fileLastModifiedAt?: string | null;
  submittedAt?: string;
  metadataStatus?: 'verified' | 'missing' | 'suspicious';
  captureTrustLevel?: 'live' | 'verifiedCameraRoll' | 'unverifiedCameraRoll';
  filterUsed?: string;
  filterIntensity?: number;
  reviewStatus?: 'approved' | 'pendingReview' | 'rejected' | 'needsMoreProof';
}

export const MOCK_ENTRIES: Entry[] = [
  {
    id: 'e1',
    userId: 'u1',
    userName: 'Field Agent Jules',
    tripId: 't1',
    tripTitle: 'Market Intersection Audit',
    selectedLevel: 'Explorer',
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
    selectedLevel: 'Legend',
    proofImage: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?auto=format&fit=crop&q=80&w=800',
    fieldNote: 'Visual confirmation: Peregrine Falcon sighted at Site B. Unexpected deviation from seasonal norms.',
    status: 'approved_by_admin',
    pointsAwarded: 350,
    detourCompleted: true,
    createdAt: '2024-05-10T10:00:00Z'
  }
];
