import type {
  AppSkin,
  CopyOverrides,
  SkinAssetReferences,
  SkinComponentVariants,
  SkinDesignTokens,
  SkinEffectTokens,
  SkinExperienceSettings,
  SkinMetadata,
  SkinMotionTokens,
  SkinOptionalFeatures,
  SkinPreview,
  SkinShapeTokens,
  SkinTypographyTokens,
  ThemeTokens,
} from '../types/skin';

export const DEFAULT_SKIN_ID = 'classic';
export const FIELD_NOTEBOOK_SKIN_ID = 'journal';
export const CLUBHOUSE_WALL_SKIN_ID = 'clubhouse-wall';

const DEFAULT_DESIGN_TOKENS: SkinDesignTokens = {
  background: '#f4f3ef',
  backgroundAlt: '#e8e7e1',
  surface: '#ffffff',
  surfaceRaised: '#ffffff',
  surfaceMuted: '#f2eee8',
  text: '#111111',
  textMuted: '#5c5c59',
  primary: '#ff5c00',
  onPrimary: '#ffffff',
  secondary: '#ccff00',
  onSecondary: '#111111',
  accent: '#00b7c7',
  onAccent: '#111111',
  border: '#111111',
  borderMuted: 'rgba(17, 17, 17, 0.18)',
  focus: '#0047ff',
  success: '#2f7d32',
  warning: '#b96900',
  error: '#c52233',
  locked: '#6d6d68',
};

const DEFAULT_TYPOGRAPHY: SkinTypographyTokens = {
  display: '"Bebas Neue", sans-serif',
  heading: '"Bebas Neue", sans-serif',
  body: '"Inter", sans-serif',
  mono: '"Courier Prime", monospace',
  accent: '"Newsreader", serif',
  headingWeight: 800,
  bodyWeight: 500,
  labelLetterSpacing: '0.12em',
  headingTransform: 'uppercase',
};

const DEFAULT_SHAPE: SkinShapeTokens = {
  cardRadius: '22px',
  controlRadius: '14px',
  modalRadius: '20px',
  mediaRadius: '12px',
  badgeRadius: '999px',
  borderWidth: '3px',
  controlHeight: '44px',
};

const DEFAULT_EFFECTS: SkinEffectTokens = {
  cardShadow: '8px 8px 0 #111111',
  elevatedShadow: '12px 14px 28px rgba(0, 0, 0, 0.2)',
  buttonShadow: '5px 6px 0 #111111',
  insetShadow: 'inset 0 1px 0 rgba(255,255,255,0.8)',
  overlay: 'rgba(17, 17, 17, 0.72)',
  imageFilter: 'none',
  textureOpacity: 0.08,
};

const DEFAULT_MOTION: SkinMotionTokens = {
  durationFast: '120ms',
  durationBase: '220ms',
  durationSlow: '420ms',
  easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
  hoverLift: '-2px',
  hoverRotation: '-0.5deg',
  decorativeMotion: true,
};

const DEFAULT_COMPONENTS: SkinComponentVariants = {
  navigation: 'field-dock',
  missionCard: 'field-ticket',
  proofCard: 'field-photo',
  modal: 'bureau-panel',
  button: 'bureau',
  progress: 'signal-bar',
  profileFrame: 'field-id',
  viewfinder: 'field-camera',
  loading: 'field-checkin',
  statePanel: 'field-notice',
};

const DEFAULT_ASSETS: SkinAssetReferences = {
  logo: '',
  homeSticker: '',
  emptyStateImage: '',
  viewfinderFrame: '',
  badgeFrame: '',
  leaderboardIcon: '',
  fieldSignalIcon: '',
  backgroundTexture: 'linear-gradient(rgba(0,0,0,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.035) 1px, transparent 1px)',
  surfaceTexture: 'radial-gradient(rgba(0,0,0,0.035) 0.8px, transparent 0.8px)',
  tapeTexture: 'linear-gradient(90deg, rgba(255,255,255,0.45), rgba(255,255,255,0.08))',
  previewImage: '/assets/decks/starter-signals.jpg',
};

const DEFAULT_EXPERIENCE: SkinExperienceSettings = {
  density: 'comfortable',
  decorativeLanguage: 'bureau',
  imageTreatment: 'natural',
  statusPresentation: 'badge',
  uppercaseLabels: true,
  tactileControls: true,
};

const DEFAULT_FEATURES: SkinOptionalFeatures = {
  paperTexture: true,
  ruledLines: false,
  tornEdges: false,
  tapedPhotos: false,
  rubberStamps: false,
  handwrittenNotes: false,
  scanlines: true,
  glossyHighlights: true,
  graphPaper: false,
  corkboard: false,
  pushpins: false,
  stickyNotes: false,
};

const DEFAULT_COPY: CopyOverrides = {
  fieldNotesLabel: 'Field Notes',
  viewfinderLabel: 'Viewfinder',
  leaderboardLabel: 'Big Board',
  crewLoreLabel: 'Crew Lore',
};

type NestedSkinKey =
  | 'metadata'
  | 'designTokens'
  | 'typography'
  | 'shape'
  | 'effects'
  | 'motion'
  | 'components'
  | 'assets'
  | 'experience'
  | 'features'
  | 'preview';

type AppSkinDefinition = Pick<AppSkin, 'id' | 'name' | 'description'> &
  Omit<Partial<AppSkin>, 'id' | 'name' | 'description' | NestedSkinKey> & {
  metadata?: Partial<SkinMetadata>;
  designTokens?: Partial<SkinDesignTokens>;
  typography?: Partial<SkinTypographyTokens>;
  shape?: Partial<SkinShapeTokens>;
  effects?: Partial<SkinEffectTokens>;
  motion?: Partial<SkinMotionTokens>;
  components?: Partial<SkinComponentVariants>;
  assets?: Partial<SkinAssetReferences>;
  experience?: Partial<SkinExperienceSettings>;
  features?: Partial<SkinOptionalFeatures>;
  preview?: Partial<SkinPreview>;
};

function legacyThemeTokens(
  design: SkinDesignTokens,
  typography: SkinTypographyTokens,
  shape: SkinShapeTokens,
  effects: SkinEffectTokens,
): ThemeTokens {
  return {
    primaryColor: design.primary,
    secondaryColor: design.secondary,
    backgroundColor: design.background,
    cardColor: design.surface,
    textColor: design.text,
    accentColor: design.accent,
    fontHeading: typography.heading,
    fontBody: typography.body,
    borderRadius: shape.cardRadius,
    shadowStyle: effects.cardShadow,
  };
}

function designFromLegacy(tokens?: Partial<ThemeTokens>): Partial<SkinDesignTokens> {
  if (!tokens) return {};
  return {
    ...(tokens.primaryColor ? { primary: tokens.primaryColor } : {}),
    ...(tokens.secondaryColor ? { secondary: tokens.secondaryColor } : {}),
    ...(tokens.backgroundColor ? { background: tokens.backgroundColor } : {}),
    ...(tokens.cardColor ? { surface: tokens.cardColor, surfaceRaised: tokens.cardColor } : {}),
    ...(tokens.textColor ? { text: tokens.textColor } : {}),
    ...(tokens.accentColor ? { accent: tokens.accentColor } : {}),
  };
}

export function defineAppSkin(definition: AppSkinDefinition, fallback?: AppSkin): AppSkin {
  const baseDesign = fallback?.designTokens || DEFAULT_DESIGN_TOKENS;
  const baseTypography = fallback?.typography || DEFAULT_TYPOGRAPHY;
  const baseShape = fallback?.shape || DEFAULT_SHAPE;
  const baseEffects = fallback?.effects || DEFAULT_EFFECTS;
  const baseMotion = fallback?.motion || DEFAULT_MOTION;
  const baseComponents = fallback?.components || DEFAULT_COMPONENTS;
  const baseAssets = fallback?.assets || DEFAULT_ASSETS;
  const baseExperience = fallback?.experience || DEFAULT_EXPERIENCE;
  const baseFeatures = fallback?.features || DEFAULT_FEATURES;
  const designTokens = {
    ...baseDesign,
    ...designFromLegacy(definition.themeTokens),
    ...definition.designTokens,
  } as SkinDesignTokens;
  const typography = {
    ...baseTypography,
    ...(definition.themeTokens?.fontHeading ? { heading: definition.themeTokens.fontHeading, display: definition.themeTokens.fontHeading } : {}),
    ...(definition.themeTokens?.fontBody ? { body: definition.themeTokens.fontBody } : {}),
    ...definition.typography,
  } as SkinTypographyTokens;
  const shape = {
    ...baseShape,
    ...(definition.themeTokens?.borderRadius ? { cardRadius: definition.themeTokens.borderRadius } : {}),
    ...definition.shape,
  } as SkinShapeTokens;
  const effects = {
    ...baseEffects,
    ...(definition.themeTokens?.shadowStyle ? { cardShadow: definition.themeTokens.shadowStyle } : {}),
    ...definition.effects,
  } as SkinEffectTokens;
  const motion = { ...baseMotion, ...definition.motion } as SkinMotionTokens;
  const components = { ...baseComponents, ...definition.components } as SkinComponentVariants;
  const assets = { ...baseAssets, ...definition.assets } as SkinAssetReferences;
  const experience = { ...baseExperience, ...definition.experience } as SkinExperienceSettings;
  const features = { ...baseFeatures, ...definition.features } as SkinOptionalFeatures;
  const status = definition.status || fallback?.status || 'active';
  const slug = definition.slug || fallback?.slug || definition.id;
  const previewColors = definition.previewColors || fallback?.previewColors || [designTokens.primary, designTokens.secondary, designTokens.background];
  const metadata: SkinMetadata = {
    ...fallback?.metadata,
    ...definition.metadata,
    id: definition.id,
    name: definition.name,
    shortName: definition.metadata?.shortName || fallback?.metadata.shortName || definition.name,
    slug,
    description: definition.description,
    rarity: definition.rarity || fallback?.rarity || 'common',
    unlockCondition: definition.unlockCondition || fallback?.unlockCondition || 'Available by default',
    seasonId: definition.seasonId || fallback?.seasonId,
    status,
    isDefault: definition.isDefault ?? fallback?.isDefault ?? false,
    isPublic: definition.isPublic ?? fallback?.isPublic ?? true,
  };
  const preview: SkinPreview = {
    colors: previewColors,
    label: definition.preview?.label || fallback?.preview.label || metadata.shortName,
    sampleMissionTitle: definition.preview?.sampleMissionTitle || fallback?.preview.sampleMissionTitle || 'Find a Field Signal',
    sampleButtonLabel: definition.preview?.sampleButtonLabel || fallback?.preview.sampleButtonLabel || 'Open Brief',
  };

  return {
    ...fallback,
    ...definition,
    id: definition.id,
    name: definition.name,
    slug,
    description: definition.description,
    rarity: metadata.rarity,
    unlockCondition: metadata.unlockCondition,
    seasonId: metadata.seasonId,
    status,
    isDefault: metadata.isDefault,
    isPublic: metadata.isPublic,
    isActive: definition.isActive ?? status === 'active',
    visualCalmSupported: definition.visualCalmSupported ?? fallback?.visualCalmSupported ?? true,
    previewColors,
    metadata,
    designTokens,
    typography,
    shape,
    effects,
    motion,
    components,
    assets,
    experience,
    features,
    preview,
    themeTokens: legacyThemeTokens(designTokens, typography, shape, effects),
    copyOverrides: { ...(fallback?.copyOverrides || DEFAULT_COPY), ...definition.copyOverrides },
  };
}

const CLASSIC_SKIN = defineAppSkin({
  id: 'classic',
  name: 'Classic Fieldtrip',
  description: 'The original high-contrast field kit with bold labels, stickers, and tactile controls.',
  slug: 'classic',
  rarity: 'common',
  unlockCondition: 'Unlocked by default',
  isDefault: true,
  metadata: { shortName: 'Classic' },
  preview: { label: 'Classic', sampleMissionTitle: 'Catch the Odd Detail', sampleButtonLabel: 'Start Mission' },
});

const ARCADE_SKIN = defineAppSkin({
  id: 'arcade',
  name: 'Arcade Summer',
  description: 'A scoreboard-inspired field kit with pixel meters, sharp controls, and energetic motion.',
  slug: 'arcade',
  rarity: 'rare',
  unlockCondition: 'Participate in 3 Weekly Matchups',
  metadata: { shortName: 'Arcade' },
  designTokens: {
    background: '#151515', backgroundAlt: '#202020', surface: '#252525', surfaceRaised: '#303030', surfaceMuted: '#1d1d1d',
    text: '#ffffff', textMuted: '#b5b5b5', primary: '#ff2d7a', onPrimary: '#ffffff', secondary: '#00e89c', onSecondary: '#101010',
    accent: '#f6ea38', onAccent: '#101010', border: '#ffffff', borderMuted: 'rgba(255,255,255,0.22)', focus: '#6fc7ff',
    success: '#00e89c', warning: '#f6ea38', error: '#ff4a61', locked: '#747474',
  },
  typography: { display: '"Space Grotesk", sans-serif', heading: '"Space Grotesk", sans-serif', mono: '"JetBrains Mono", monospace' },
  shape: { cardRadius: '2px', controlRadius: '2px', modalRadius: '2px', mediaRadius: '0px', badgeRadius: '2px' },
  effects: { cardShadow: '6px 6px 0 #00e89c', buttonShadow: '4px 4px 0 #f6ea38', imageFilter: 'saturate(1.15) contrast(1.05)' },
  components: { navigation: 'arcade-console', missionCard: 'arcade-card', proofCard: 'score-screen', modal: 'arcade-overlay', button: 'arcade-key', progress: 'pixel-meter', profileFrame: 'player-card', viewfinder: 'arcade-scanner', loading: 'pixel-load', statePanel: 'arcade-alert' },
  experience: { decorativeLanguage: 'arcade', imageTreatment: 'saturated', statusPresentation: 'screen', uppercaseLabels: true, tactileControls: true },
  features: { paperTexture: false, scanlines: true, glossyHighlights: false },
  previewColors: ['#ff2d7a', '#00e89c', '#151515'],
  preview: { label: 'Arcade', sampleMissionTitle: 'Bonus Round', sampleButtonLabel: 'Insert Vote' },
});

const FIELD_NOTEBOOK_SKIN = defineAppSkin({
  id: FIELD_NOTEBOOK_SKIN_ID,
  name: 'Field Notebook / Evidence Scrapbook',
  description: 'A working field notebook built from ruled paper, clipped evidence, contact sheets, typed labels, and handwritten marginalia.',
  slug: 'field-notebook',
  rarity: 'uncommon',
  unlockCondition: 'Complete 10 Core Challenges',
  metadata: { shortName: 'Field Notebook' },
  designTokens: {
    background: '#e8eee9',
    backgroundAlt: '#d9e2dc',
    surface: '#fffdf6',
    surfaceRaised: '#ffffff',
    surfaceMuted: '#edf1eb',
    text: '#202621',
    textMuted: '#59615b',
    primary: '#9e3d32',
    onPrimary: '#ffffff',
    secondary: '#1f6f78',
    onSecondary: '#ffffff',
    accent: '#d2a92d',
    onAccent: '#202621',
    border: '#202621',
    borderMuted: 'rgba(32, 38, 33, 0.22)',
    focus: '#005fcc',
    success: '#3b6f44',
    warning: '#a7611d',
    error: '#a82d3d',
    locked: '#6a706b',
  },
  typography: {
    display: '"Newsreader", Georgia, serif',
    heading: '"Newsreader", Georgia, serif',
    body: '"Inter", sans-serif',
    mono: '"Courier Prime", monospace',
    accent: '"Kalam", cursive',
    headingWeight: 760,
    bodyWeight: 500,
    labelLetterSpacing: '0.08em',
    headingTransform: 'none',
  },
  shape: {
    cardRadius: '3px',
    controlRadius: '2px',
    modalRadius: '4px',
    mediaRadius: '1px',
    badgeRadius: '2px',
    borderWidth: '2px',
    controlHeight: '46px',
  },
  effects: {
    cardShadow: '5px 7px 0 rgba(32, 38, 33, 0.92)',
    elevatedShadow: '10px 14px 26px rgba(32, 38, 33, 0.2)',
    buttonShadow: '3px 4px 0 #202621',
    insetShadow: 'inset 0 0 0 1px rgba(158, 61, 50, 0.08)',
    overlay: 'rgba(26, 31, 27, 0.78)',
    imageFilter: 'saturate(0.82) contrast(1.06)',
    textureOpacity: 0.16,
  },
  motion: {
    durationFast: '100ms',
    durationBase: '180ms',
    durationSlow: '320ms',
    easing: 'cubic-bezier(0.22, 0.7, 0.25, 1)',
    hoverLift: '-3px',
    hoverRotation: '-0.25deg',
    decorativeMotion: true,
  },
  components: {
    navigation: 'notebook-tabs',
    missionCard: 'evidence-file',
    proofCard: 'contact-sheet',
    modal: 'evidence-folder',
    button: 'rubber-stamp',
    progress: 'ruled-meter',
    profileFrame: 'case-file',
    viewfinder: 'evidence-camera',
    loading: 'paper-sort',
    statePanel: 'case-note',
  },
  assets: {
    backgroundTexture: 'linear-gradient(90deg, transparent 0 3.4rem, rgba(158,61,50,0.22) 3.4rem 3.5rem, transparent 3.5rem), repeating-linear-gradient(0deg, transparent 0 27px, rgba(31,111,120,0.13) 27px 28px)',
    surfaceTexture: 'radial-gradient(rgba(32,38,33,0.09) 0.7px, transparent 0.8px)',
    tapeTexture: 'repeating-linear-gradient(90deg, rgba(210,169,45,0.32) 0 9px, rgba(255,253,246,0.38) 9px 18px)',
    previewImage: '/assets/decks/starter-signals.jpg',
  },
  experience: {
    density: 'comfortable',
    decorativeLanguage: 'scrapbook',
    imageTreatment: 'documentary',
    statusPresentation: 'stamp',
    uppercaseLabels: false,
    tactileControls: true,
  },
  features: {
    paperTexture: true,
    ruledLines: true,
    tornEdges: true,
    tapedPhotos: true,
    rubberStamps: true,
    handwrittenNotes: true,
    scanlines: false,
    glossyHighlights: false,
  },
  previewColors: ['#fffdf6', '#9e3d32', '#1f6f78', '#202621'],
  preview: { label: 'Field Notebook', sampleMissionTitle: 'Document the Strange', sampleButtonLabel: 'File Evidence' },
  copyOverrides: {
    fieldNotesLabel: 'Evidence Notes',
    viewfinderLabel: 'Field Camera',
    leaderboardLabel: 'Weekly Index',
    crewLoreLabel: 'Crew Scrapbook',
  },
});

const CLUBHOUSE_WALL_SKIN = defineAppSkin({
  id: CLUBHOUSE_WALL_SKIN_ID,
  name: 'Clubhouse Wall',
  description: 'A crew-built bulletin wall with cork panels, taped receipts, pinned Polaroids, bright sticky notes, and marker-lettered controls.',
  slug: 'clubhouse-wall',
  rarity: 'uncommon',
  unlockCondition: 'Unlock through Crew rewards',
  metadata: { shortName: 'Clubhouse' },
  designTokens: {
    background: '#f4f5ef',
    backgroundAlt: '#dce8e7',
    surface: '#fffdf5',
    surfaceRaised: '#ffffff',
    surfaceMuted: '#ece7d8',
    text: '#171717',
    textMuted: '#5f5b51',
    primary: '#a71856',
    onPrimary: '#ffffff',
    secondary: '#b4e600',
    onSecondary: '#171717',
    accent: '#45bfd3',
    onAccent: '#171717',
    border: '#171717',
    borderMuted: 'rgba(23, 23, 23, 0.24)',
    focus: '#0759d3',
    success: '#28734b',
    warning: '#b94c09',
    error: '#b5233b',
    locked: '#65635d',
  },
  typography: {
    display: '"Permanent Marker", "Kalam", cursive',
    heading: '"Kalam", "Comic Sans MS", cursive',
    body: '"Inter", sans-serif',
    mono: '"Courier Prime", monospace',
    accent: '"Permanent Marker", "Kalam", cursive',
    headingWeight: 700,
    bodyWeight: 500,
    labelLetterSpacing: '0.04em',
    headingTransform: 'none',
  },
  shape: {
    cardRadius: '4px',
    controlRadius: '5px',
    modalRadius: '5px',
    mediaRadius: '2px',
    badgeRadius: '999px',
    borderWidth: '2px',
    controlHeight: '46px',
  },
  effects: {
    cardShadow: '6px 7px 0 #171717',
    elevatedShadow: '10px 14px 28px rgba(23, 23, 23, 0.24)',
    buttonShadow: '4px 5px 0 #171717',
    insetShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.42)',
    overlay: 'rgba(23, 23, 23, 0.78)',
    imageFilter: 'saturate(1.08) contrast(1.03) sepia(0.04)',
    textureOpacity: 0.14,
  },
  motion: {
    durationFast: '110ms',
    durationBase: '190ms',
    durationSlow: '360ms',
    easing: 'cubic-bezier(0.2, 0.74, 0.2, 1)',
    hoverLift: '-3px',
    hoverRotation: '-0.4deg',
    decorativeMotion: true,
  },
  components: {
    navigation: 'clubhouse-dock',
    missionCard: 'sticky-assignment',
    proofCard: 'pinned-polaroid',
    modal: 'clubhouse-notice',
    button: 'marker-label',
    progress: 'tally-strip',
    profileFrame: 'crew-patch',
    viewfinder: 'clubhouse-camera',
    loading: 'wall-setup',
    statePanel: 'pinned-note',
  },
  assets: {
    backgroundTexture: 'linear-gradient(rgba(48, 119, 139, 0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(48, 119, 139, 0.09) 1px, transparent 1px)',
    surfaceTexture: 'radial-gradient(circle at 25% 35%, rgba(67, 38, 22, 0.16) 0 1px, transparent 1.4px), radial-gradient(circle at 72% 65%, rgba(255, 255, 255, 0.2) 0 1px, transparent 1.5px)',
    tapeTexture: 'repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.34) 0 7px, rgba(255, 255, 255, 0.1) 7px 14px)',
    previewImage: '/images/welcome/field-trip-01.png',
  },
  experience: {
    density: 'comfortable',
    decorativeLanguage: 'clubhouse',
    imageTreatment: 'collage',
    statusPresentation: 'pin',
    uppercaseLabels: false,
    tactileControls: true,
  },
  features: {
    paperTexture: true,
    ruledLines: false,
    tornEdges: true,
    tapedPhotos: true,
    rubberStamps: false,
    handwrittenNotes: true,
    scanlines: false,
    glossyHighlights: false,
    graphPaper: true,
    corkboard: true,
    pushpins: true,
    stickyNotes: true,
  },
  previewColors: ['#b98a5d', '#b4e600', '#a71856', '#45bfd3', '#fffdf5'],
  preview: {
    label: 'Crew Wall',
    sampleMissionTitle: 'Pin the Best Receipt',
    sampleButtonLabel: 'Post to Wall',
  },
  copyOverrides: {
    fieldNotesLabel: 'Wall Notes',
    viewfinderLabel: 'Clubhouse Cam',
    leaderboardLabel: 'Clubhouse Wall',
    crewLoreLabel: 'Crew Wall',
  },
});

const BAJA_SKIN = defineAppSkin({
  id: 'baja-bratz',
  name: 'Baja Bratz',
  description: 'A glossy limited-edition summer kit with bright travel-pass shapes and poolside controls.',
  slug: 'baja-bratz',
  rarity: 'rare',
  unlockCondition: 'Seasonal / Heatwave Receipts',
  visualCalmSupported: false,
  metadata: { shortName: 'Baja Bratz' },
  designTokens: {
    background: '#e7f8f6', backgroundAlt: '#cdeeea', surface: '#ffffff', surfaceRaised: '#ffffff', surfaceMuted: '#e0f4f2',
    text: '#073f4d', textMuted: '#466a72', primary: '#e93f83', onPrimary: '#ffffff', secondary: '#00a6b2', onSecondary: '#ffffff',
    accent: '#f2c94c', onAccent: '#073f4d', border: '#073f4d', borderMuted: 'rgba(7,63,77,0.2)', focus: '#005fcc',
    success: '#2c7c5b', warning: '#a85f00', error: '#c52c54', locked: '#65777b',
  },
  typography: { display: '"Space Grotesk", sans-serif', heading: '"Space Grotesk", sans-serif', accent: '"Kalam", cursive' },
  shape: { cardRadius: '28px', controlRadius: '999px', modalRadius: '30px', mediaRadius: '22px', badgeRadius: '999px' },
  effects: { cardShadow: '10px 10px 0 #00a6b2', buttonShadow: '5px 6px 0 #073f4d', imageFilter: 'saturate(1.08)' },
  components: { navigation: 'summer-float', missionCard: 'summer-pass', proofCard: 'postcard', modal: 'pool-card', button: 'float-button', progress: 'sun-meter', profileFrame: 'travel-pass', viewfinder: 'summer-camera', loading: 'sun-spin', statePanel: 'postcard-note' },
  experience: { decorativeLanguage: 'summer', imageTreatment: 'glossy', statusPresentation: 'sticker', uppercaseLabels: true, tactileControls: true },
  features: { paperTexture: false, ruledLines: false, tornEdges: false, tapedPhotos: false, rubberStamps: false, handwrittenNotes: false, scanlines: false, glossyHighlights: true },
  previewColors: ['#e93f83', '#00a6b2', '#e7f8f6'],
  preview: { label: 'Baja Bratz', sampleMissionTitle: 'Heat Check', sampleButtonLabel: 'Take the Trip' },
});

export const APP_SKINS: AppSkin[] = [
  CLASSIC_SKIN,
  ARCADE_SKIN,
  FIELD_NOTEBOOK_SKIN,
  CLUBHOUSE_WALL_SKIN,
  BAJA_SKIN,
];
export const DEFAULT_APP_SKIN = CLASSIC_SKIN;

export function getBuiltInSkin(skinId?: string | null): AppSkin | undefined {
  if (!skinId) return undefined;
  return APP_SKINS.find((skin) => skin.id === skinId);
}

export function normalizeAppSkin(raw: Partial<AppSkin> & Pick<AppSkin, 'id' | 'name' | 'description'>): AppSkin {
  return defineAppSkin(raw, getBuiltInSkin(raw.id) || DEFAULT_APP_SKIN);
}

export function mergeSkinRegistry(remoteSkins: Array<Partial<AppSkin> & Pick<AppSkin, 'id' | 'name' | 'description'>>): AppSkin[] {
  const merged = new Map(APP_SKINS.map((skin) => [skin.id, skin]));
  remoteSkins.forEach((skin) => merged.set(skin.id, normalizeAppSkin(skin)));
  return Array.from(merged.values());
}

export function getSkinById(skinId: string | null | undefined, skins: AppSkin[] = APP_SKINS): AppSkin | undefined {
  return skinId ? skins.find((skin) => skin.id === skinId) : undefined;
}

export function resolveSkin(skinId: string | null | undefined, skins: AppSkin[] = APP_SKINS, fallbackId = DEFAULT_SKIN_ID): AppSkin {
  return getSkinById(skinId, skins) || getSkinById(fallbackId, skins) || DEFAULT_APP_SKIN;
}

export function isKnownSkinId(skinId: string | null | undefined, skins: AppSkin[] = APP_SKINS): boolean {
  return Boolean(getSkinById(skinId, skins));
}
