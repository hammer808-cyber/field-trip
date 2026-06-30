import type { CrewMemberRole, CrewMemberStatus, CrewMode, CrewPrivacy, CrewStatus, CrewZineStatus } from '../logic/crewSystem';
export type { CrewMemberRole, CrewMemberStatus, CrewMode, CrewPrivacy, CrewStatus, CrewZineStatus } from '../logic/crewSystem';

export interface Crew {
  id: string;
  name: string;
  slug?: string;
  motto?: string;
  icon?: string;
  badge?: string; // URL to badge image or SVG string
  members: string[]; // User IDs, compatibility roster
  memberCount?: number;
  memberLimit?: number;
  founderId?: string;
  captainIds?: string[];
  creatorId?: string;
  mode?: CrewMode;
  privacy?: CrewPrivacy;
  status?: CrewStatus;
  activeSeasonId?: string;
  createdAt: any;
  updatedAt?: any;
  currentSeason: string;
}

export interface CrewMember {
  userId: string;
  crewId?: string;
  role: CrewMemberRole;
  status: CrewMemberStatus;
  joinedAt: any;
  crewEligibleFrom: any;
  removedAt?: any;
  leftAt?: any;
  displayName?: string;
  seasonEligibility?: Record<string, any>;
}

export interface CrewSeasonZine {
  id: string;
  crewId: string;
  seasonId: string;
  mode: CrewMode;
  status: CrewZineStatus;
  coverSelection: any | null;
  curatorUserId: string | null;
  pageBlueprint: string[];
  flexPageAssignments: any[];
  createdAt: any;
  publishedAt?: any;
}

export interface CrewMembershipState {
  crew: Crew | null;
  membership: CrewMember | null;
  zine: CrewSeasonZine | null;
  cooldownUntil?: any;
}

export interface CrewLore {
  crewId: string;
  insideJokes: string[];
  seasonStats: Record<string, CrewSeasonStats>; // seasonId -> stats
  highlights: {
    mostSuspiciousEntry?: string; // entryId
    biggestComeback?: string; // blurb
    mostFieldChecksSurvived?: number;
    mostChaoticTrip?: string; // blurb
    mostReliableExplorer?: string; // userId
    mostDramaticDetour?: string; // eventId
  };
  notes: string[]; // Lore blurbs
}

export interface CrewSeasonStats {
  totalCompletedChallenges: number;
  totalApprovedEntries: number;
  totalRejectedEntries: number;
  scoreHistory: { date: string; score: number }[];
  rankHistory: { date: string; rank: number }[];
  favoriteCategory?: string;
  mostActiveMember?: string; // userId
  leastPredictableMember?: string; // userId
  bestProofSubmission?: string; // entryId
  mostCursedProofSubmission?: string; // entryId
}

export interface CrewDispatch {
  id: string;
  crewId: string;
  seasonId: string;
  finalRank: number;
  finalScore: number;
  summary: {
    recapParagraph: string;
    awards: string[];
    bestEntry: string;
    worstEntry?: string;
    funnyQuote?: string;
  };
  createdAt: string;
  isUnlocked: boolean;
}
