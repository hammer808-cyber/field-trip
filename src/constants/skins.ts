import { ThemeTokens, SkinAssets, CopyOverrides, Skin } from '../types/skin';

export const DEFAULT_THEME_TOKENS: ThemeTokens = {
  primaryColor: "#2D5A27",
  secondaryColor: "#E29578",
  backgroundColor: "#fdf8f5",
  cardColor: "#ffffff",
  textColor: "#121212",
  accentColor: "#F4D35E",
  fontHeading: "Inter",
  fontBody: "Inter",
  borderRadius: "4px",
  shadowStyle: "2px 2px 0px rgba(0,0,0,0.1)"
};

export const DEFAULT_SKIN_ASSETS: SkinAssets = {
  logo: "/logo.svg",
  homeSticker: "/sticker.svg",
  emptyStateImage: "/empty.svg",
  viewfinderFrame: "/viewfinder-frame.svg",
  badgeFrame: "/badge-frame.svg",
  leaderboardIcon: "/leaderboard-icon.svg",
  fieldSignalIcon: "/signal-icon.svg",
  backgroundTexture: ""
};

export const DEFAULT_COPY_OVERRIDES: CopyOverrides = {
  fieldNotesLabel: "Field Notes",
  viewfinderLabel: "Viewfinder",
  leaderboardLabel: "Leaderboard",
  crewLoreLabel: "Crew Lore"
};

export const BASE_SKIN: Skin = {
  id: 'base',
  name: 'Standard Field Trip',
  slug: 'base',
  description: 'The standard issue Fieldtrip visual protocol.',
  rarity: 'common',
  unlockCondition: 'Default',
  status: 'active',
  isDefault: true,
  visualCalmSupported: true,
  themeTokens: DEFAULT_THEME_TOKENS,
  assets: DEFAULT_SKIN_ASSETS,
  copyOverrides: DEFAULT_COPY_OVERRIDES,
  createdAt: {} as any,
  updatedAt: {} as any,
  updatedBy: 'system'
};
