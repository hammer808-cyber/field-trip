import type { FieldValue, Timestamp } from 'firebase/firestore';

export type SkinStatus = 'inactive' | 'preview' | 'active' | 'archived';
export type SkinRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface SkinMetadata {
  id: string;
  name: string;
  shortName: string;
  slug: string;
  description: string;
  rarity: SkinRarity;
  unlockCondition: string;
  seasonId?: string;
  status: SkinStatus;
  isDefault: boolean;
  isPublic: boolean;
}

export interface SkinDesignTokens {
  background: string;
  backgroundAlt: string;
  surface: string;
  surfaceRaised: string;
  surfaceMuted: string;
  text: string;
  textMuted: string;
  primary: string;
  onPrimary: string;
  secondary: string;
  onSecondary: string;
  accent: string;
  onAccent: string;
  border: string;
  borderMuted: string;
  focus: string;
  success: string;
  warning: string;
  error: string;
  locked: string;
}

export interface SkinTypographyTokens {
  display: string;
  heading: string;
  body: string;
  mono: string;
  accent: string;
  headingWeight: number;
  bodyWeight: number;
  labelLetterSpacing: string;
  headingTransform: 'none' | 'uppercase';
}

export interface SkinShapeTokens {
  cardRadius: string;
  controlRadius: string;
  modalRadius: string;
  mediaRadius: string;
  badgeRadius: string;
  borderWidth: string;
  controlHeight: string;
}

export interface SkinEffectTokens {
  cardShadow: string;
  elevatedShadow: string;
  buttonShadow: string;
  insetShadow: string;
  overlay: string;
  imageFilter: string;
  textureOpacity: number;
}

export interface SkinMotionTokens {
  durationFast: string;
  durationBase: string;
  durationSlow: string;
  easing: string;
  hoverLift: string;
  hoverRotation: string;
  decorativeMotion: boolean;
}

export type NavigationSkinVariant = 'field-dock' | 'notebook-tabs' | 'arcade-console' | 'summer-float' | 'clubhouse-dock';
export type MissionCardSkinVariant = 'field-ticket' | 'evidence-file' | 'arcade-card' | 'summer-pass' | 'sticky-assignment';
export type ProofCardSkinVariant = 'field-photo' | 'contact-sheet' | 'score-screen' | 'postcard' | 'pinned-polaroid';
export type ModalSkinVariant = 'bureau-panel' | 'evidence-folder' | 'arcade-overlay' | 'pool-card' | 'clubhouse-notice';
export type ButtonSkinVariant = 'bureau' | 'rubber-stamp' | 'arcade-key' | 'float-button' | 'marker-label';
export type ProgressSkinVariant = 'signal-bar' | 'ruled-meter' | 'pixel-meter' | 'sun-meter' | 'tally-strip';
export type ProfileFrameSkinVariant = 'field-id' | 'case-file' | 'player-card' | 'travel-pass' | 'crew-patch';

export interface SkinComponentVariants {
  navigation: NavigationSkinVariant;
  missionCard: MissionCardSkinVariant;
  proofCard: ProofCardSkinVariant;
  modal: ModalSkinVariant;
  button: ButtonSkinVariant;
  progress: ProgressSkinVariant;
  profileFrame: ProfileFrameSkinVariant;
  viewfinder: 'field-camera' | 'evidence-camera' | 'arcade-scanner' | 'summer-camera' | 'clubhouse-camera';
  loading: 'field-checkin' | 'paper-sort' | 'pixel-load' | 'sun-spin' | 'wall-setup';
  statePanel: 'field-notice' | 'case-note' | 'arcade-alert' | 'postcard-note' | 'pinned-note';
}

export interface SkinAssetReferences {
  logo: string;
  homeSticker: string;
  emptyStateImage: string;
  viewfinderFrame: string;
  badgeFrame: string;
  leaderboardIcon: string;
  fieldSignalIcon: string;
  backgroundTexture: string;
  surfaceTexture: string;
  tapeTexture: string;
  previewImage: string;
}

export interface SkinExperienceSettings {
  density: 'compact' | 'comfortable' | 'roomy';
  decorativeLanguage: 'bureau' | 'scrapbook' | 'arcade' | 'summer' | 'clubhouse';
  imageTreatment: 'natural' | 'documentary' | 'saturated' | 'glossy' | 'collage';
  statusPresentation: 'badge' | 'stamp' | 'screen' | 'sticker' | 'pin';
  uppercaseLabels: boolean;
  tactileControls: boolean;
}

export interface SkinOptionalFeatures {
  paperTexture: boolean;
  ruledLines: boolean;
  tornEdges: boolean;
  tapedPhotos: boolean;
  rubberStamps: boolean;
  handwrittenNotes: boolean;
  scanlines: boolean;
  glossyHighlights: boolean;
  graphPaper: boolean;
  corkboard: boolean;
  pushpins: boolean;
  stickyNotes: boolean;
}

export interface SkinPreview {
  colors: string[];
  label: string;
  sampleMissionTitle: string;
  sampleButtonLabel: string;
}

/**
 * Compatibility tokens retained for existing admin documents and older callers.
 * New components should consume the semantic token groups above.
 */
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

/** @deprecated Use SkinAssetReferences. */
export type SkinAssets = SkinAssetReferences;

export interface CopyOverrides {
  fieldNotesLabel?: string;
  viewfinderLabel?: string;
  leaderboardLabel?: string;
  crewLoreLabel?: string;
}

export interface AppSkin {
  id: string;
  name: string;
  slug: string;
  description: string;
  rarity: SkinRarity;
  unlockCondition: string;
  seasonId?: string;
  status: SkinStatus;
  isDefault: boolean;
  isPublic: boolean;
  isActive: boolean;
  visualCalmSupported: boolean;
  previewColors: string[];

  metadata: SkinMetadata;
  designTokens: SkinDesignTokens;
  typography: SkinTypographyTokens;
  shape: SkinShapeTokens;
  effects: SkinEffectTokens;
  motion: SkinMotionTokens;
  components: SkinComponentVariants;
  assets: SkinAssetReferences;
  experience: SkinExperienceSettings;
  features: SkinOptionalFeatures;
  preview: SkinPreview;

  themeTokens: ThemeTokens;
  copyOverrides: CopyOverrides;
  createdAt?: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
  updatedBy?: string;
  decalRefs?: string[];
}

/** Backward-compatible name used throughout the existing app. */
export type Skin = AppSkin;

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

export interface SkinSelectionResult {
  skin: AppSkin;
  source: 'preview' | 'forced' | 'user' | 'default' | 'fallback';
  requestedSkinId: string | null;
  didFallback: boolean;
  lockedRequestedSkin: boolean;
}
