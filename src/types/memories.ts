import { Timestamp } from 'firebase/firestore';

export interface MemoryEntry {
  id: string;
  userId: string;
  missionId: string;
  seasonId: string;
  
  // Mission cached metadata
  title: string;
  category: string;
  lane: string;
  
  // User response
  fieldNote: string;
  evidenceType: string[]; // e.g. ['photo']
  evidenceUrl: string; // The primary photo/proof URL
  
  // Results
  completedAt: Timestamp | string;
  pointsEarned: number;
  rewardsEarned?: {
    stickers?: string[];
    badges?: string[];
  };
  
  // Social & Personal
  participants?: string[]; // IDs or names of crew members
  favorite: boolean;
  zineEligible: boolean;
  
  // UI status
  zinePageSeedGenerated: boolean;
}
