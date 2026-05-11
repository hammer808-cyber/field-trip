export type ObservationType = 'Behavior' | 'Leaderboard' | 'Crew' | 'System' | 'Playful';

export interface Observation {
  id: string;
  userId: string;
  crewId?: string;
  observationText: string;
  observationType: ObservationType;
  sourceMetric?: string;
  createdAt: string;
  expiresAt: string;
  visibility: 'private' | 'crew' | 'public';
  isDismissed: boolean;
}

export interface UserPreferences {
  reduceCommentary: boolean;
}
