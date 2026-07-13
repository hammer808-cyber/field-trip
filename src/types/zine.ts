export type ZineKind = 'personal' | 'crew';

export type ZineStatus =
  | 'shell'
  | 'generating'
  | 'draft'
  | 'curating'
  | 'ready_for_review'
  | 'finalized'
  | 'archived'
  | 'generation_failed';

export type ZinePageRole =
  | 'cover'
  | 'season_opener'
  | 'introduction'
  | 'early_timeline'
  | 'weekly_highlight'
  | 'highest_score'
  | 'highest_liked'
  | 'offbeat_moment'
  | 'stickers_achievements'
  | 'reflection_lore'
  | 'late_timeline'
  | 'defining_moment'
  | 'optional'
  | 'closing';

export type ZineLayoutId =
  | 'cover_full_bleed'
  | 'single_receipt'
  | 'split_receipts'
  | 'timeline_strip'
  | 'sticker_sheet'
  | 'quote_page'
  | 'closing_card';

export interface ZineProofSnapshot {
  entryId: string;
  ownerId: string;
  ownerDisplayName: string;
  missionTitle: string;
  fieldNote: string;
  mediaRef: string;
  score: number;
  likeCount: number;
  approvedAt: any;
  seasonId: string;
  crewId: string | null;
}

export interface ZinePage {
  id: string;
  role: ZinePageRole;
  order: number;
  layoutId: ZineLayoutId;
  title: string;
  caption: string;
  proofIds: string[];
  proofSnapshots: ZineProofSnapshot[];
  stickerIds: string[];
  isOptional: boolean;
  isFlexible: boolean;
}

export interface ZineCoverChoice {
  id: string;
  proofId: string | null;
  layoutId: ZineLayoutId;
  title: string;
  subtitle: string;
  mediaRef: string | null;
}

export interface ZineEdition {
  id: string;
  kind: ZineKind;
  ownerId: string | null;
  crewId: string | null;
  seasonId: string;
  status: ZineStatus;
  mode: 'competitive' | 'friendly' | null;
  curatorUserId: string | null;
  curatorSource: 'owner' | 'season_winner' | 'captain_fallback' | 'friendly_captain' | null;
  pageSchemaVersion: 'v1';
  pages: ZinePage[];
  coverChoices: ZineCoverChoice[];
  selectedCoverId: string | null;
  candidateProofIds: string[];
  nominatedProofIds: string[];
  favoriteProofIds: string[];
  optionalPageCount: number;
  generatedAt: any;
  createdAt: any;
  updatedAt: any;
  finalizedAt: any;
  finalizedBy: string | null;
  finalizedPages?: ZinePage[];
  archivedAt?: any;
}

export interface ZineWorkspaceState {
  seasonId: string;
  personal: ZineEdition | null;
  crew: ZineEdition | null;
  crewRole: string | null;
  permissions: {
    canEditPersonal: boolean;
    canEditCrew: boolean;
    canFinalizePersonal: boolean;
    canFinalizeCrew: boolean;
    canNominateCrew: boolean;
  };
}

