export interface CandidateProof {
  entryId: string;
  userId: string;
  userName: string;
  tripId: string;
  tripTitle: string;
  proofImage: string;
  fieldNote: string;
  weekNumber: number;
  seasonId: string;
  votesCount?: number;
}

export type WeeklyBallotStatus = 'pending' | 'active' | 'closed';

export interface WeeklyBallot {
  /**
   * The canonical identifier formatted as `seasonId_weekNumber` (e.g. "heatwave-receipts_1")
   */
  ballotId: string;
  seasonId: string;
  weekNumber: number;
  status: WeeklyBallotStatus;
  candidates: CandidateProof[];
  createdAt: any; // Firestore Timestamp or date ISO string
  updatedAt?: any;
}
