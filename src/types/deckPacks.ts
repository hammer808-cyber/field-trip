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

export type DeckCatalogSectionId =
  | 'featured-seasonal'
  | 'always-on'
  | 'travel'
  | 'local-fieldtrips'
  | 'starter-training';

/**
 * Home region for a location-based deck (Near You, option A, Nov 20, 2026).
 * Bounding box, not a circle: regions here are states/coasts, and a box is
 * exact for them. A point inside the box counts as "near" — the deck floats
 * to the top of its section, with a "Near you" badge. No geofence locking:
 * being outside never hides or locks a deck.
 */
export interface DeckHomeRegion {
  /** Bounding box: a point inside it counts as "near". */
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  /** Short label for the badge, e.g. "Texas", "SoCal coast". */
  label: string;
}

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
  catalogSection?: DeckCatalogSectionId;
  /** Home region for location-based decks (Near You, option A). Decks
   * without one are never boosted and their order never changes. */
  homeRegion?: DeckHomeRegion;

  // Seasonal/Canonical fields
  id?: string;
  title?: string;
  deckCode?: string;
  artworkKey?: string;
  isStarter?: boolean;
  isSeasonal?: boolean;
  isEvergreen?: boolean;
  
  deckId?: string;
  deckName?: string;
  deckSubtitle?: string;
  status?: string;
  deckType?: string;
  requiredUnlock?: string;
  requiredStarterApprovals?: number;
  totalCards?: number;
}
