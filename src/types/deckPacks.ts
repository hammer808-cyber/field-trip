export type UnlockRule = 'immediate' | 'rank_limit' | 'archetype_match' | 'beta_only' | 'seasonal' | 'starter-complete';

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
  artPosition?: string;
  fallbackIcon: string;
  sortOrder: number;
  
  // Tagging & Filters
  rewardIds?: string[];
  defaultFindingTypes?: string[];
  difficultyRange?: ('easy' | 'medium' | 'hard')[];
  evidenceTypesIncluded?: ('photo' | 'note' | 'location')[];
  tags?: string[];
  isFutureDrop?: boolean;

  // Seasonal/Canonical fields
  id?: string;
  title?: string;
  deckCode?: string;
  artworkKey?: string;
  isStarter?: boolean;
  isSeasonal?: boolean;
  isEvergreen?: boolean;
  
  deckId?: string;
  deckSubtitle?: string;
  status?: string;
  deckType?: string;
  requiredUnlock?: string;
  requiredStarterApprovals?: number;
  totalCards?: number;
}
