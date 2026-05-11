export interface Crew {
  id: string;
  name: string;
  badge: string; // URL to badge image or SVG string
  members: string[]; // User IDs
  creatorId: string;
  createdAt: string;
  currentSeason: string;
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
