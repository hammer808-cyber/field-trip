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
  | 'scene'
  | 'closing';

export type ZineLayoutId =
  | 'cover_full_bleed'
  | 'single_receipt'
  | 'split_receipts'
  | 'timeline_strip'
  | 'sticker_sheet'
  | 'quote_page'
  | 'closing_card'
  | 'scene';

/** Scene styles — the four zine looks (Nov 21, 2026, Zach's image). */
export type ZineSceneStyleId =
  | 'vintage_nostalgia'
  | 'punk_gritty'
  | 'playful_colorful'
  | 'mixed_media';

export type ZineSceneItemKind = 'mission' | 'proof' | 'note';

/** One pasted item in a scene slot. Stickers are NOT scene items —
 *  they keep using the page's `stickers` placements (free placement
 *  inside the style's sticker zones). */
export interface ZineSceneItem {
  slotId: string;
  kind: ZineSceneItemKind;
  /** mission kind: the deck + mission the card comes from. */
  deckId?: string;
  missionId?: string;
  /** proof kind: the eligible candidate's entry id. */
  proofEntryId?: string;
  /** note kind: the note text; sourceEntryId when it quotes a proof. */
  noteText?: string;
  noteSourceEntryId?: string | null;
}

export interface ZineProofSnapshot {
  entryId: string;
  ownerId: string;
  ownerDisplayName: string;
  missionTitle: string;
  /** The deck + mission the proof is for (scene mission picker). */
  deckId: string;
  missionId: string;
  fieldNote: string;
  mediaRef: string;
  score: number;
  likeCount: number;
  approvedAt: any;
  seasonId: string;
  crewId: string | null;
}

export interface ZineStickerPlacement {
  stickerId: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
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
  stickers: ZineStickerPlacement[];
  /** Read-only compatibility for zines saved before placed stickers were introduced. */
  stickerIds?: string[];
  /** Scene pages only: the chosen style (fixed at creation) + pasted items. */
  sceneStyleId?: ZineSceneStyleId;
  sceneItems?: ZineSceneItem[];
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

export interface ZinePastSeason {
  zineId: string;
  kind: ZineKind;
  seasonId: string;
  status: ZineStatus;
  updatedAt: any;
}

export interface ZineSeasonState {
  seasonId: string;
  /** True once the season's window has ended — the zine is open. */
  ended: boolean;
  /** ISO date the season ends (the opening day for a locked zine). */
  opensAt: string | null;
}

export interface ZineWorkspaceState {
  seasonId: string;
  season: ZineSeasonState;
  isAdmin: boolean;
  /** The user's zines for ended seasons, most recent first (the archive). */
  pastZines: ZinePastSeason[];
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
