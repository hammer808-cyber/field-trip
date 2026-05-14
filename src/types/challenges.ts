import { FieldTypeId } from '../constants';

export type TripType = 'Field Challenge' | 'Evidence Challenge' | 'Crew Challenge' | 'Leave the House' | 'Social Spark' | 'Explore the Map' | 'Taste Test' | 'Proof Goblin' | 'Crew Chaos' | 'Onboarding' | 'Bonus' | 'Final';
export type TripMode = 'solo' | 'crew' | 'flexible';
export type TripStatus = 'draft' | 'approved' | 'scheduled' | 'active' | 'archived' | 'available' | 'locked' | 'in-progress' | 'submitted' | 'rejected' | 'needs_fix';
export type ChallengeStatus = TripStatus;
export type BrandFit = 'approved' | 'needs_review' | 'rejected';
export type ChallengeLevel = 'Scout' | 'Explorer' | 'Legend';
export type ChallengeType = TripType;
export type ChallengeCategory = TripType;
export type ProofType = 'photo' | 'note' | 'location' | 'group-confirmation';

export interface TripLevel {
  label: 'Light Trip' | 'Standard Trip' | 'Bold Trip';
  points: number;
  description: string;
}

export interface TripCard {
  id: string;
  templateId?: string; // If instantiated from a template
  isRepeatableTemplate?: boolean;
  title: string;
  type: TripType;
  theAsk: string; // Full prompt
  shortPrompt?: string;
  plainModePrompt: string;
  basePoints: number;
  levels: {
    Scout: { points: number; description: string; rule?: string };
    Explorer: { points: number; description: string; rule?: string };
    Legend: { points: number; description: string; rule?: string };
  };
  image: string;
  proofNeeded: string;
  fieldNotePrompt: string; // Field note starter
  detour?: {
    description: string;
    points: number;
  };
  accessibilityNote: string;
  safetyRules: string[];
  accessibilityAlternative?: string; // Alias for accessibilityNote
  fieldNoteStarter?: string; // Alias for fieldNotePrompt
  
  // Viewfinder & Proof Settings
  viewfinderRulePreset?: 'standard' | 'liveOnly' | 'cameraRollAllowed' | 'archiveAllowed' | 'manualReview' | 'finalChallenge';
  viewfinderRulesOverride?: {
    allowCameraRollUpload?: boolean;
    requireLiveCapture?: boolean;
    requirePhotoTakenWithinChallengeWindow?: boolean;
    allowMissingExif?: boolean;
    reviewIfMetadataMissing?: boolean;
  };
  
  allowCameraRollUpload?: boolean;
  requireLiveCapture?: boolean;
  requirePhotoTakenWithinChallengeWindow?: boolean;
  allowMissingExif?: boolean;
  reviewIfMetadataMissing?: boolean;

  proofRequirements?: {
    requiredSubjects: string[];
    minConfidence: number;
    requireLocation: boolean;
    requireTimestamp: boolean;
  };
  estimatedTimeMinutes?: number;
  eligibleBonuses?: string[];
  isFieldPartyCompatible?: boolean;
  isCrewCompatible?: boolean;
  crewModeBehavior: string;
  mode: TripMode;
  requiredProof: ProofType[];
  seasonAvailability: string[];
  weekNumber?: number; // For weekly releases
  status: TripStatus;
  brandFit: BrandFit;
  tags: string[];
  forbiddenTags?: string[];
  createdAt: string;
  updatedAt: string;
}
export type ChallengeCard = TripCard;
export type ProofMode = ProofType;

export interface UserTripProgress {
  userId: string;
  tripId: string;
  status: TripStatus;
  startedAt?: string;
  completedAt?: string;
  submissionId?: string;
}
