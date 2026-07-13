import type { AppSkin, SkinSelectionResult } from '../types/skin';
import { DEFAULT_SKIN_ID, getSkinById, resolveSkin } from '../skins/registry';

export interface ResolveSkinSelectionInput {
  skins: AppSkin[];
  persistedSkinId?: string | null;
  previewSkinId?: string | null;
  forcedSkinId?: string | null;
  defaultSkinId?: string | null;
  userSkinSelectionEnabled?: boolean;
  unlockedSkinIds?: Iterable<string>;
  isAdmin?: boolean;
}

export interface SkinPreferenceUpdate {
  userPrefs: {
    selectedSkinId: string;
  };
}

export function canUseSkin(skinId: string, unlockedSkinIds: Iterable<string>, isAdmin = false): boolean {
  if (isAdmin || skinId === DEFAULT_SKIN_ID) return true;
  return new Set(unlockedSkinIds).has(skinId);
}

export function createSkinPreferenceUpdate(
  skinId: string,
  skins: AppSkin[],
  unlockedSkinIds: Iterable<string>,
  isAdmin = false,
  defaultSkinId = DEFAULT_SKIN_ID,
): SkinPreferenceUpdate {
  const skin = getSkinById(skinId, skins);
  if (!skin || (isAdmin ? skin.status === 'archived' : skin.status !== 'active')) {
    throw new Error('Unknown or unavailable skin.');
  }
  if (skinId !== defaultSkinId && !canUseSkin(skinId, unlockedSkinIds, isAdmin)) {
    throw new Error('This skin is still locked.');
  }
  return {
    userPrefs: { selectedSkinId: skinId },
  };
}

function isSelectableSkin(skin: AppSkin | undefined, isAdmin: boolean): skin is AppSkin {
  if (!skin) return false;
  if (isAdmin) return skin.status !== 'archived';
  return skin.status === 'active' && skin.isPublic !== false;
}

export function resolveSkinSelection(input: ResolveSkinSelectionInput): SkinSelectionResult {
  const {
    skins,
    persistedSkinId,
    previewSkinId,
    forcedSkinId,
    defaultSkinId = DEFAULT_SKIN_ID,
    userSkinSelectionEnabled = true,
    unlockedSkinIds = [DEFAULT_SKIN_ID],
    isAdmin = false,
  } = input;
  const fallback = resolveSkin(defaultSkinId, skins, DEFAULT_SKIN_ID);

  const preview = getSkinById(previewSkinId, skins);
  if (previewSkinId && isSelectableSkin(preview, isAdmin)) {
    return { skin: preview, source: 'preview', requestedSkinId: previewSkinId, didFallback: false, lockedRequestedSkin: false };
  }

  const forced = getSkinById(forcedSkinId, skins);
  if (forcedSkinId && isSelectableSkin(forced, isAdmin)) {
    return { skin: forced, source: 'forced', requestedSkinId: forcedSkinId, didFallback: false, lockedRequestedSkin: false };
  }

  const requested = getSkinById(persistedSkinId, skins);
  const requestedIsUnlocked = persistedSkinId ? canUseSkin(persistedSkinId, unlockedSkinIds, isAdmin) : false;
  if (userSkinSelectionEnabled && persistedSkinId && requestedIsUnlocked && isSelectableSkin(requested, isAdmin)) {
    return { skin: requested, source: 'user', requestedSkinId: persistedSkinId, didFallback: false, lockedRequestedSkin: false };
  }

  const defaultSkin = isSelectableSkin(fallback, isAdmin) ? fallback : resolveSkin(DEFAULT_SKIN_ID, skins);
  const source = defaultSkin.id === defaultSkinId ? 'default' : 'fallback';
  return {
    skin: defaultSkin,
    source,
    requestedSkinId: persistedSkinId || forcedSkinId || previewSkinId || null,
    didFallback: Boolean(persistedSkinId || forcedSkinId || previewSkinId) && defaultSkin.id !== (persistedSkinId || forcedSkinId || previewSkinId),
    lockedRequestedSkin: Boolean(persistedSkinId && requested && !requestedIsUnlocked),
  };
}

export function resolveReducedMotion(skin: AppSkin, prefersReducedMotion: boolean): AppSkin['motion'] {
  if (!prefersReducedMotion) return skin.motion;
  return {
    ...skin.motion,
    durationFast: '0ms',
    durationBase: '0ms',
    durationSlow: '0ms',
    hoverLift: '0px',
    hoverRotation: '0deg',
    decorativeMotion: false,
  };
}

export function getSkinCssVariables(skin: AppSkin, prefersReducedMotion = false): Record<string, string> {
  const motion = resolveReducedMotion(skin, prefersReducedMotion);
  return {
    '--skin-background': skin.designTokens.background,
    '--skin-background-alt': skin.designTokens.backgroundAlt,
    '--skin-surface': skin.designTokens.surface,
    '--skin-surface-raised': skin.designTokens.surfaceRaised,
    '--skin-surface-muted': skin.designTokens.surfaceMuted,
    '--skin-text': skin.designTokens.text,
    '--skin-text-muted': skin.designTokens.textMuted,
    '--skin-primary': skin.designTokens.primary,
    '--skin-on-primary': skin.designTokens.onPrimary,
    '--skin-secondary': skin.designTokens.secondary,
    '--skin-on-secondary': skin.designTokens.onSecondary,
    '--skin-accent': skin.designTokens.accent,
    '--skin-on-accent': skin.designTokens.onAccent,
    '--skin-border': skin.designTokens.border,
    '--skin-border-muted': skin.designTokens.borderMuted,
    '--skin-focus': skin.designTokens.focus,
    '--skin-success': skin.designTokens.success,
    '--skin-warning': skin.designTokens.warning,
    '--skin-error': skin.designTokens.error,
    '--skin-locked': skin.designTokens.locked,
    '--skin-font-display': skin.typography.display,
    '--skin-font-heading': skin.typography.heading,
    '--skin-font-body': skin.typography.body,
    '--skin-font-mono': skin.typography.mono,
    '--skin-font-accent': skin.typography.accent,
    '--skin-heading-weight': String(skin.typography.headingWeight),
    '--skin-body-weight': String(skin.typography.bodyWeight),
    '--skin-label-spacing': skin.typography.labelLetterSpacing,
    '--skin-card-radius': skin.shape.cardRadius,
    '--skin-control-radius': skin.shape.controlRadius,
    '--skin-modal-radius': skin.shape.modalRadius,
    '--skin-media-radius': skin.shape.mediaRadius,
    '--skin-badge-radius': skin.shape.badgeRadius,
    '--skin-border-width': skin.shape.borderWidth,
    '--skin-control-height': skin.shape.controlHeight,
    '--skin-card-shadow': skin.effects.cardShadow,
    '--skin-elevated-shadow': skin.effects.elevatedShadow,
    '--skin-button-shadow': skin.effects.buttonShadow,
    '--skin-inset-shadow': skin.effects.insetShadow,
    '--skin-overlay': skin.effects.overlay,
    '--skin-image-filter': skin.effects.imageFilter,
    '--skin-texture-opacity': String(skin.effects.textureOpacity),
    '--skin-duration-fast': motion.durationFast,
    '--skin-duration-base': motion.durationBase,
    '--skin-duration-slow': motion.durationSlow,
    '--skin-easing': motion.easing,
    '--skin-hover-lift': motion.hoverLift,
    '--skin-hover-rotation': motion.hoverRotation,
    '--skin-background-texture': skin.assets.backgroundTexture || 'none',
    '--skin-surface-texture': skin.assets.surfaceTexture || 'none',
    '--skin-tape-texture': skin.assets.tapeTexture || 'none',
  };
}
