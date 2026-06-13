import { FieldTypeId } from '../constants';

/**
 * The 'Lane' defines the structural track this challenge belongs to.
 */
export type ChallengeLane = 'core' | 'weekly' | 'persona_spiced' | 'wildcard' | 'finale' | 'onboarding' | 'seasonal';

export type TripType = 'Field Challenge' | 'Evidence Challenge' | 'Crew Challenge' | 'Leave the House' | 'Social Spark' | 'Explore the Map' | 'Taste Test' | 'Proof Goblin' | 'Crew Chaos' | 'Onboarding' | 'Bonus' | 'Final';
export type TripMode = 'solo' | 'crew' | 'flexible';
export type TripStatus = 'draft' | 'approved' | 'scheduled' | 'active' | 'archived' | 'available' | 'locked' | 'in-progress' | 'submitted' | 'rejected' | 'needs_fix' | 'pending_review' | 'needs_more_proof' | 'approved_by_admin' | 'checking';
export type ChallengeStatus = TripStatus;
export type BrandFit = 'approved' | 'needs_review' | 'rejected';
export type ChallengeLevel = 'Standard' | 'Advanced' | 'Certified';
export type ChallengeType = TripType;
export type ChallengeCategory = TripType;
export type ProofType = 'photo' | 'note' | 'location' | 'group-confirmation' | 'audio' | 'video';

export interface TripLevel {
  label: 'Standard' | 'Advanced' | 'Certified';
  points: number;
  description: string;
}

/**
 * The primary data model for a Fieldtrip Challenge.
 */
export interface TripCard {
  // --- CORE IDENTITY ---
  /** Unique identifier for the challenge */
  id: string;
  missionId?: string;
  challengeId?: string;
  isStarter?: boolean;
  /** Public-facing name of the challenge */
  title: string;
  /** Broad classification (e.g. Field Challenge, Evidence Challenge) */
  category: TripCategory;
  /** The specific track this challenge belongs to (e.g. core, weekly) */
  lane: ChallengeLane;
  /** Full instructions for the user */
  description: string;
  
  // --- GAMEPLAY & DIFFICULTY ---
  /** Complexity label */
  difficulty: 'easy' | 'medium' | 'hard';
  /** Estimated time to complete the challenge in minutes */
  estimatedTimeMinutes: number;
  /** The foundation XP rewarded before any multipliers */
  baseXP: number;
  /** Which archetypes find this challenge easier or more thematic */
  personaAffinity: FieldTypeId[];
  /** Can this challenge be completed multiple times? */
  repeatable: boolean;
  /** Is this challenge eligible for the end-of-season Zine? */
  zineEligible: boolean;
  /** Is this challenge eligible for "snitching" (competitive auditing)? */
  snitchEligible: boolean;
  /** Requirements to reveal this challenge (e.g. "reach level 5", "complete X first") */
  unlockCondition?: string;
  /** Whether the challenge is currently available in the game loop */
  active: boolean;

  /** Rewards unlocked by this challenge */
  rewards?: {
    stickers?: string[];
    badges?: string[];
  };

  /** Optional bonus for completing the task at a specified distance */
  distanceBonus?: {
    eligible: boolean;
    label: string;
    description: string;
    bonusXp: number;
  };

  // --- ARTIFACTS & PROOF ---
  /** The primary photo/note evidence types required */
  proofType: ProofType[];
  /** List of subjects or tags required in the proof photo */
  proofRequirements?: {
    requiredSubjects: string[];
    minConfidence: number;
    requireLocation: boolean;
    requireTimestamp: boolean;
  };
  /** Starter text to help the user write their field note */
  fieldNoteStarter?: string;
  
  // --- TAGGING & LOGIC ---
  /** Tags that trigger positive multipliers for specific archetypes */
  boostTags: string[];
  /** Tags that trigger negative multipliers or added difficulty */
  slowDownTags: string[];
  /** General tags for filtering and discovery */
  tags: string[];
  /** Optional deck association */
  deckId?: string;
  findingTypes?: string[];
  cardType?: 'Signal' | 'Proof' | 'Crew' | 'Receipt' | 'Lore';
  deckName?: string;
  deckSubtitle?: string;
  season?: string;
  mission?: string;
  proofRequired?: string;
  allowedProof?: string[];
  bonusPrompt?: string;
  safetyNote?: string;
  baseXp?: number;
  bonusXp?: number;
  isActive?: boolean;

  // --- LEGACY & METADATA ---
  /** @deprecated use lane */
  type: TripType;
  /** @deprecated use description */
  theAsk: string;
  /** @deprecated use baseXP */
  basePoints: number;
  /** Multi-tier scoring system */
  levels: {
    Standard: { points: number; description: string; rule?: string };
    Advanced: { points: number; description: string; rule?: string };
    Certified: { points: number; description: string; rule?: string };
  };
  image: string;
  /** @deprecated use proofType */
  requiredProof: ProofType[];
  shortPrompt?: string;
  status: TripStatus;
  createdAt: string;
  updatedAt: string;

  // --- ADDITIONAL CONFIG ---
  mode: TripMode;
  isCrewCompatible?: boolean;
  safetyRules: string[];
  accessibilityNote?: string;
  brandFit?: BrandFit;
  detour?: any;
  proofNeeded?: string;
  fieldNotePrompt?: string;
  hintText?: string;
  hintCap?: number;
  crewModeBehavior?: string;
  weekNumber?: number;
  viewfinderRulePreset?: string;
  allowCameraRollUpload?: boolean;
  requireLiveCapture?: boolean;
  requirePhotoTakenWithinChallengeWindow?: boolean;
  allowMissingExif?: boolean;
  reviewIfMetadataMissing?: boolean;
  viewfinderRulesOverride?: any;
  plainModePrompt?: string;
  shortDescription?: string;
  fullInstructions?: string;

  // --- EXTENDED METADATA & DIALOGUE ---
  briefing?: string;
  trevorLine?: string;
  taskDescription?: string;
  submitMessage?: string;
  isRequired?: boolean;

  // --- PLAIN LANGUAGE MODE (FRANKIE MODE) ---
  plainTitle?: string;
  plainDescription?: string;
  plainDirections?: string;
  plainFieldNotePrompt?: string;
  plainEvidenceLabels?: Record<string, string>;
  plainPointExplanation?: string;
  plainDifficultyLabel?: string;
  plainEstimatedTimeLabel?: string;

  seasonAvailability?: string | string[];
  isRepeatableTemplate?: boolean;
  maxAttempts?: number;
}

export type TripCategory = TripType;
export type ChallengeCard = TripCard;
export type ProofMode = ProofType;

export interface UserTripProgress {
  userId: string;
  tripId: string;
  status: TripStatus;
  startedAt?: string;
  completedAt?: string;
  submissionId?: string;
  hintUsed?: boolean;
}
