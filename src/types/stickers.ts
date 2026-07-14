export type StickerSheetId =
  | 'recent_finds'
  | 'mission_stickers'
  | 'explorer_type'
  | 'crew_lore'
  | 'seasonal'
  | 'rare_secret'
  | 'used_in_zine';

export interface StickerPlacement {
  stickerId: string;
  sheetId: StickerSheetId;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  zIndex: number;
  placedAt: string;
  updatedAt: string;
}

export type ProofStickerAssignments = Record<string, string[]>;
