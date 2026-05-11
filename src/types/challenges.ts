import { PersonaId } from '../constants';

export type ChallengeCategory = 'Social' | 'Nature' | 'Navigator' | 'Stealth' | 'Chaos' | 'Onboarding' | 'Bonus' | 'Detour';
export type ChallengeType = 'solo' | 'crew' | 'flexible';
export type ChallengeStatus = 'locked' | 'available' | 'in-progress' | 'submitted' | 'approved' | 'rejected' | 'archived';
export type ProofType = 'photo' | 'note' | 'location' | 'group-confirmation';

export type ProofMode = 'strict_proof' | 'flexible_proof' | 'social_proof';

export interface ChallengeCard {
  id: string;
  title: string;
  shortDescription: string;
  fullInstructions: string;
  category: ChallengeCategory;
  difficulty: number; // 1-5
  points: number;
  estimatedTime: string; // e.g., "15m", "1h"
  mode: ChallengeType;
  proofMode: ProofMode;
  requiredProof: ProofType[];
  proofRequirements?: {
    requiredSubjects?: string[];
    minConfidence?: number;
    requireLocation?: boolean;
    requireTimestamp?: boolean;
    minCrewConfirmations?: number;
  };
  allowCaption: boolean;
  seasonAvailability: string[]; // ['S1', 'S2']
  skinCompatibility: string[]; // ['baja-bratz', 'slippery-diamond']
  status: ChallengeStatus;
  tags: string[];
  bonusCondition?: string;
  riskCondition?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserChallengeProgress {
  userId: string;
  challengeId: string;
  status: ChallengeStatus;
  startedAt?: string;
  completedAt?: string;
  submissionId?: string;
}
