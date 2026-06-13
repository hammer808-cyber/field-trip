import { Timestamp } from 'firebase/firestore';

export type UserRole = 'player' | 'admin' | 'moderator';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  username: string | null;
  role: UserRole;
  
  // XP - Canonical Currency
  xp: number;
  weeklyXp: number;
  seasonXp: number;
  level: number;
  
  // Onboarding & Flags
  onboardingCompleted: boolean;
  legalAccepted: boolean;
  personaSelected?: string;
  
  // Progress Tracking
  submittedPendingChallengeIds: string[];
  submittedChallengeIds: string[];
  approvedCompletedChallengeIds: string[];
  
  // Starter Progress
  starterDeckId?: string;
  starterProgressCount?: number;
  starterCompleted?: boolean;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
