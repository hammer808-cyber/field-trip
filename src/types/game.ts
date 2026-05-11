import { Timestamp } from 'firebase/firestore';

export type SeasonStatus = 'pre-season' | 'active' | 'ending' | 'closed';

export interface Season {
  id: string;
  title: string;
  description: string;
  status: SeasonStatus;
  startDate: Timestamp;
  endDate: Timestamp;
  rules?: {
    multiplier?: number;
    specialRules?: string[];
  };
  prizes?: {
    rank: number;
    reward: string;
  }[];
  createdAt: Timestamp;
}

export type ScoreEventType = 'challenge_approved' | 'bonus_earned' | 'crew_artifact' | 'admin_adjustment';

export interface ScoreEvent {
  id: string;
  userId: string;
  userName: string;
  crewId?: string;
  type: ScoreEventType;
  points: number;
  entryId?: string;
  challengeId?: string;
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
    personaEffectsEnabled: boolean;
  };
}

export interface UserStats {
  userId: string;
  totalPoints: number;
  approvedEntriesCount: number;
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

export type ReportStatus = 'pending' | 'under_review' | 'resolved' | 'dismissed';
export type ReportTargetType = 'entry' | 'user' | 'crew' | 'lore';

export interface Report {
  id: string;
  reporterId: string;
  targetId: string;
  targetType: ReportTargetType;
  reason: string;
  details: string;
  status: ReportStatus;
  createdAt: Timestamp;
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
