export type UnlockRule = 'immediate' | 'rank_limit' | 'archetype_match' | 'beta_only' | 'seasonal' | 'starter-complete';

export type DeckVisibility =
  | 'public'
  | 'assigned_users'
  | 'crew_only'
  | 'invite_code'
  | 'admin_only'
  | 'internal'
  | 'planned'
  | 'hidden';

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
  visibility: DeckVisibility;
  assignedUserIds?: string[];
  allowedCrewIds?: string[];
  inviteCode?: string | null;
  accessStartsAt?: any | null;
  accessEndsAt?: any | null;
  showLockedTeaser?: boolean;
  requiredCredentialIds?: string[];
  requiredCompletedDeckIds?: string[];
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
