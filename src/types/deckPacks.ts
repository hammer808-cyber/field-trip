export type UnlockRule = 'immediate' | 'rank_limit' | 'archetype_match' | 'beta_only' | 'seasonal';

export interface DeckPack {
  packId: string;
  packName: string;
  shortName: string;
  description: string;
  theme?: string;
  season?: string;
  missionIds: string[];
  
  // Rules & Scaffolding
  unlockRule: UnlockRule;
  visibility: 'public' | 'internal' | 'planned' | 'hidden';
  requiredArchetype?: string;
  requiredRank?: number;
  
  // Temporal Logic
  startsAt?: string;
  endsAt?: string;
  isActive: boolean;
  
  // Metadata & Visuals
  coverImage?: string;
  fallbackIcon: string;
  sortOrder: number;
  
  // Tagging & Filters
  rewardIds?: string[];
  difficultyRange?: ('easy' | 'medium' | 'hard')[];
  evidenceTypesIncluded?: ('photo' | 'note' | 'location')[];
  tags?: string[];
}
