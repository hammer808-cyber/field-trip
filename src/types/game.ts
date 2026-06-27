import { Timestamp } from 'firebase/firestore';

import { AvatarData } from './avatar';
import { ReviewStatus } from './proof';

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
  | 'weekly_bonus_booster'
  | 'field_check_penalty'
  | 'invalid_proof_penalty'
  | 'comeback_card'
  | 'admin_adjustment';

export interface ScoreEvent {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: AvatarData;
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
  activeStarterDeckId?: string;
  starterRequiredCount?: number;
  starterResetVersion?: string;
  starterResetAt?: any;
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
    fieldGuideAssistEnabled: boolean;
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
    xp: number;
    points: number; // legacy
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
    xp: number;
    totalPoints: number; // legacy
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
    xp: number;
    points: number; // legacy
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
  voteWinners?: Record<string, any>;
}

export type ReportStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed';
export type ReportTargetType = 'entry' | 'comment' | 'user' | 'crew_lore';

export type VoteCategory = 'best_field_note' | 'best_photo_proof' | 'most_legendary_errand' | 'goblin_energy_award' | 'cleanest_completion' | 'underdog_award';

export interface Vote {
  id: string;
  userId: string;
  entryId: string;
  weekNumber: number;
  seasonId: string;
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

export type TripStatus = 'locked' | 'available' | 'in-progress' | 'submitted' | 'approved' | 'needs_fix' | 'under_field_check' | 'rejected' | 'expired' | 'archived' | 'pending' | 'checking' | 'needs-more-proof' | 'needs_more_proof' | 'auto_approved' | 'needs_review' | 'resubmit_requested' | 'approved_by_admin' | 'draft' | 'retry-submitted' | 'retry-approved' | 'auto_rejected' | 'pending_review';

export type DrawnMissionCardStatus =
  | "drawn"
  | "saved_for_later"
  | "active"
  | "pending_review"
  | "needs_more_proof"
  | "approved"
  | "rejected";

export interface DrawnMissionCard {
  id: string; // Composite ID: uid_missionId
  uid: string;
  missionId: string;
  challengeId: string;
  deckId: string;
  missionTitle: string;
  missionSummary: string;
  cardImageUrl?: string;
  drawnAt: any; // Timestamp
  updatedAt?: any; // Timestamp
  status: DrawnMissionCardStatus;
  isActive?: boolean;
  attemptNumber?: number;
}

export interface Entry {
  id: string;
  entryId: string;           // canonical entryId field
  uid: string;                 // canonical userId field (mapped to uid for firebase storage rules compatibility)
  userId: string;              // canonical userId field
  displayName: string | null;  // user snapshot
  username: string | null;     // user snapshot
  challengeId: string;
  deckId: string;
  status: TripStatus;
  
  imageUrl: string;
  storagePath: string | null;
  fieldNote: string;
  
  xpValue: number;
  xpAwarded: boolean;
  
  createdAt: any;              // serverTimestamp()
  updatedAt: any;              // serverTimestamp()
  reviewedAt?: any;            // timestamp
  reviewedBy?: string;         // admin userId
  
  // Mirror fields for broad compatibility
  userName?: string;
  photoUrl?: string; 
  mediaUrl?: string;
  proofImage?: string;      // legacy
  photoStoragePath?: string; // canonical
  imageStoragePath?: string; // legacy
  awardedXP?: number;
  submittedAt?: any;
  missionId?: string;
  tripId?: string;
  tripTitle?: string;
  pointsAwarded?: number;
  awardedPoints?: number;
  estimatedPoints?: number;
  selectedLevel?: string;
  detourCompleted?: boolean;
  archived?: boolean;
  countsTowardLiveStats?: boolean;
  countsTowardStarter?: boolean;
  countsTowardFeed?: boolean;
  fastFindAttempt?: any;
  seasonId?: string;
  hintUsed?: boolean;
  crewId?: string;
  userAvatar?: any;
  uploadSource?: string;
  isRetry?: boolean;
  retryPointMultiplier?: number;
  originalImageUrl?: string;
  note?: string;
  originalEntryId?: string;
  reviewerNote?: string;
  findingType?: string;
  existingEntryId?: string;
  aiAnalysisResult?: any;
  proofCheckResult?: any;
  metadataStatus?: string;
  captureTrustLevel?: string;
  adminNotes?: string;
  imagePurged?: boolean;
  rejectedAt?: any;
  approvedAt?: any;
  challengeTitle?: string;
  starterResetVersion?: string;
  missingRequirements?: string[];
  likeCount?: number;
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

export interface TribunalCase {
  id: string; // usually same as entryId
  caseId?: string;
  entryId: string;
  resultSnapshotId?: string;
  targetId: string; // The user who submitted the proof
  targetUserId?: string;
  weekNumber: number;
  seasonId: string;
  status: 'admin_review' | 'open' | 'closed' | 'dismissed';
  outcome?: 'called_out' | 'upheld' | 'community_sus_recommendation' | 'community_valid_recommendation';
  validVotes: number;
  susVotes: number;
  totalVotes?: number;
  createdAt: any;
  openedAt?: any;
  closedAt?: any;
  openedBy?: string;
  closedBy?: string;
  adminReviewedBy?: string;
  adminReviewedAt?: any;
  adminNotes?: string;
  title: string;
  description: string;
  proofImage: string;
  playerName: string;
  fieldNote: string;
  missionTitle?: string;
  deckName?: string;
}

export interface TribunalVote {
  id: string; // userId_caseId
  userId: string;
  caseId: string;
  vote: 'valid' | 'sus';
  createdAt: any;
  updatedAt?: any;
}

export interface BallotCandidate {
  id: string; // unique candidate ID
  entryId: string;
  userId: string;
  userName: string;
  tripId: string;
  tripTitle: string;
  proofImage: string;
  fieldNote: string;
  weekNumber: number;
  seasonId: string;
  addedAt: any; // Timestamp
}
