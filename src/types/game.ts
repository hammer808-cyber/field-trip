import { Timestamp } from 'firebase/firestore';

import { AvatarData } from './avatar';

export type SeasonStatus = 'pre-season' | 'active' | 'ending' | 'closed';

export interface Season {
  id: string;
  title: string;
  description: string;
  status: SeasonStatus;
  startDate: Timestamp;
  endDate: Timestamp;
  weeks: {
    number: number;
    startDate: Timestamp;
    fieldChallengeId: string;
    evidenceChallengeId: string;
    crewChallengeId: string;
    chaosCardIds: string[];
    sabotageCardIds: string[];
  }[];
  createdAt: Timestamp;
}

export type ScoreEventType = 
  | 'trip_approved' 
  | 'difficulty_bonus'
  | 'detour_bonus' 
  | 'field_note_bonus' 
  | 'daily_bonus' 
  | 'quality_bonus' 
  | 'crew_bonus' 
  | 'crew_artifact' 
  | 'field_type_perk' 
  | 'field_type_snag' 
  | 'chaos_modifier_bonus'
  | 'sabotage_survived_bonus'
  | 'vote_winner_bonus'
  | 'field_check_bonus'
  | 'first_submission_bonus'
  | 'final_crown_bonus'
  | 'field_check_penalty'
  | 'invalid_proof_penalty'
  | 'comeback_card'
  | 'admin_adjustment';

export interface ScoreEvent {
  id: string;
  userId: string;
  userName: string;
  crewId?: string;
  type: ScoreEventType;
  points: number;
  entryId?: string;
  tripId?: string;
  description: string;
  createdAt: Timestamp;
}

export interface AppConfig {
  activeSeasonId?: string;
  onboardingEntriesRequired: number;
  featureFlags: {
    fieldSignalsEnabled: boolean;
    badgeFragmentsEnabled: boolean;
    crewArtifactsEnabled: boolean;
    rivalMomentsEnabled: boolean;
    appObservationsEnabled: boolean;
    crewDispatchEnabled: boolean;
    proofFinderEnabled: boolean;
    skinsEnabled: boolean;
    fieldTypeEffectsEnabled: boolean;
  };
}

export interface UserStats {
  userId: string;
  totalPoints: number;
  approvedEntriesCount: number;
  boldTripsCount: number;
  crewTripsCount: number;
  crewModeUnlocked: boolean;
  onboardingCompleted: boolean;
}

export interface LegalConsent {
  accepted: boolean;
  acceptedAt: Timestamp;
  userId: string;
  termsVersion: string;
  privacyVersion: string;
  communityRulesVersion: string;
  safetyRulesVersion: string;
  isAdultConfirmed: boolean;
  appVersion?: string;
  platform?: string;
}

export type FieldCheckStatus = 'pending' | 'reviewed' | 'dismissed' | 'action_needed';
export type FieldCheckReason = 'wrong_mission' | 'copied_or_reused' | 'unsafe' | 'inappropriate' | 'other';

export interface FieldCheck {
  id: string;
  submissionId: string;
  missionId: string;
  reportedUserId: string;
  reporterUid: string;
  reason: FieldCheckReason;
  note: string;
  status: FieldCheckStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  reviewedBy?: string;
  reviewedAt?: Timestamp;
  adminNote?: string;
  source?: string;
}

export interface ChaosCard {
  id: string;
  title: string;
  description: string;
  modifier: string;
  points: number;
  icon: string;
}

export interface SabotageCard {
  id: string;
  title: string;
  description: string;
  restriction: string;
  severity: 'minor' | 'major';
  points: number; // Points awarded to target if survived
  icon: string;
}

export interface ActiveSabotage {
  id: string;
  attackerId: string;
  targetId: string;
  cardId: string;
  attackerCrewId?: string;
  severity: 'minor' | 'major';
  weekNumber: number;
  status: 'active' | 'survived' | 'failed' | 'blocked';
  expiresAt: Timestamp;
  createdAt: Timestamp;
}

export interface WeeklyLeaderboard {
  id: string; // seasonId_weekNumber
  seasonId: string;
  weekNumber: number;
  rankings: {
    userId: string;
    userName: string;
    points: number;
    rank: number;
    entriesCount: number;
  }[];
}

export interface SeasonLeaderboard {
  id: string;
  seasonId: string;
  rankings: {
    userId: string;
    userName: string;
    totalPoints: number;
    rank: number;
    badgesCount: number;
  }[];
}

export interface CrewLeaderboard {
  id: string;
  seasonId: string;
  weekNumber?: number;
  rankings: {
    crewId: string;
    crewName: string;
    score: number;
    rank: number;
    participationRate: number;
  }[];
}

export interface WeeklySummary {
  id: string; // seasonId_weekNumber
  seasonId: string;
  weekNumber: number;
  playerStats: Record<string, {
    points: number;
    entriesCount: number;
    userName: string;
    crewId?: string;
    fieldTypeName?: string;
  }>;
  crewStats: Record<string, {
    crewName: string;
    totalScore: number;
    avgTopThree: number;
    crewChallengePoints: number;
    participationRate: number;
    voteWinnerCount: number;
    chaosBonusCount: number;
  }>;
  lastCalculatedAt: any;
  isLocked?: boolean;
}

export type ReportStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed';
export type ReportTargetType = 'entry' | 'comment' | 'user' | 'crew_lore';

export type VoteCategory = 'best_photo' | 'most_mysterious' | 'funniest_proof' | 'boldest_explorer' | 'best_field_note' | 'most_chaotic';

export interface Vote {
  id: string;
  userId: string;
  entryId: string;
  weekNumber: number;
  category: VoteCategory;
  createdAt: Timestamp;
}

export interface Report {
  id: string;
  reporterId: string;
  reporterName: string;
  targetId: string;
  targetType: ReportTargetType;
  reason: string;
  details: string;
  status: ReportStatus;
  adminNotes?: string;
  createdAt: Timestamp;
}

export type TripStatus = 'locked' | 'available' | 'in-progress' | 'submitted' | 'approved' | 'needs_fix' | 'under_field_check' | 'rejected' | 'expired' | 'archived' | 'pending' | 'checking' | 'needs-more-proof' | 'auto_approved' | 'needs_review' | 'resubmit_requested' | 'approved_by_admin' | 'draft';

export interface Entry {
  id: string;
  userId: string;
  userName: string;
  crewId?: string;
  tripId: string;
  tripTitle: string;
  selectedLevel: 'Standard' | 'Advanced' | 'Certified';
  proofImage: string;
  userAvatar?: AvatarData;
  fieldNote: string;
  status: TripStatus;
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

export interface ModerationAudit {
  id: string;
  adminId: string;
  targetId: string;
  targetType: string;
  action: string;
  reason: string;
  notes: string;
  createdAt: Timestamp;
}

export type Challenge = any; // Simple fallback to avoid complex circular imports or just use TripCard where needed
