export type ArtifactRarity = 'standard' | 'classified' | 'legendary';
export type ArtifactType = 'object' | 'document' | 'memory' | 'relic';

export interface CrewArtifact {
  id: string;
  crewId: string;
  title: string;
  description: string;
  artifactType: ArtifactType;
  sourceEntryId: string;
  sourceChallengeId: string;
  earnedByUserId: string;
  earnedByUserName?: string;
  createdAt: string;
  seasonId: string;
  rarity: ArtifactRarity;
  icon: string; // Lucide icon name
  flavorCaption: string;
}
