import { Timestamp, FieldValue } from 'firebase/firestore';

export interface ThemeTokens {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  cardColor: string;
  textColor: string;
  accentColor: string;
  fontHeading: string;
  fontBody: string;
  borderRadius: string;
  shadowStyle: string;
}

export interface SkinAssets {
  logo: string;
  homeSticker: string;
  emptyStateImage: string;
  viewfinderFrame: string;
  badgeFrame: string;
  leaderboardIcon: string;
  fieldSignalIcon: string;
  backgroundTexture: string;
}

export interface CopyOverrides {
  fieldNotesLabel?: string;
  viewfinderLabel?: string;
  leaderboardLabel?: string;
  crewLoreLabel?: string;
}

export type SkinStatus = 'inactive' | 'preview' | 'active' | 'archived';

export interface Skin {
  id: string;
  name: string;
  slug: string; // for class names
  description: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  unlockCondition: string;
  seasonId?: string;
  status: SkinStatus;
  isDefault: boolean;
  isPublic?: boolean;
  isActive?: boolean;
  visualCalmSupported: boolean;
  previewColors?: string[];
  themeTokens: ThemeTokens;
  assets: SkinAssets;
  copyOverrides: CopyOverrides;
  createdAt?: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
  updatedBy?: string;
  decalRefs?: string[];
}

export interface SkinSettings {
  defaultSkinId: string;
  forcedSkinId: string | null;
  userSkinSelectionEnabled: boolean;
  seasonalSkinsEnabled: boolean;
  visualCalmAvailable: boolean;
  updatedAt?: Timestamp | FieldValue;
  updatedBy?: string;
}

export interface UserThemePreference {
  selectedSkinId: string;
  frankieMode: boolean;
  /** @deprecated use frankieMode */
  reduceCommentary?: boolean;
  updatedAt?: Timestamp | FieldValue;
}
