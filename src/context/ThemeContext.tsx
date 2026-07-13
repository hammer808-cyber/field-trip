import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { MotionConfig } from 'motion/react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, serverTimestamp, writeBatch } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import type { AppSkin, CopyOverrides, SkinSettings, UserThemePreference } from '../types/skin';
import {
  APP_SKINS,
  DEFAULT_APP_SKIN,
  DEFAULT_SKIN_ID,
  getSkinById,
  mergeSkinRegistry,
} from '../skins/registry';
import {
  canUseSkin as canUseSkinSelection,
  createSkinPreferenceUpdate,
  getSkinCssVariables,
  resolveSkinSelection,
} from '../logic/skinSystem';
import { isUserAdmin, subscribeToSkins, subscribeToSkinSettings } from '../services/skinService';

interface ThemeContextType {
  skin: AppSkin;
  allSkins: AppSkin[];
  settings: SkinSettings | null;
  frankieMode: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  selectedSkinId: string;
  previewSkinId: string | null;
  unlockedSkinIds: string[];
  selectionSource: 'preview' | 'forced' | 'user' | 'default' | 'fallback';
  setSkin: (skinId: string) => Promise<void>;
  previewSkin: (skinId: string) => void;
  applyPreview: () => Promise<void>;
  cancelPreview: () => void;
  resetSkin: () => Promise<void>;
  canUseSkin: (skinId: string) => boolean;
  setFrankieMode: (value: boolean) => Promise<void>;
  t: (key: keyof CopyOverrides) => string;
  asset: (key: keyof AppSkin['assets']) => string;
  fc: (normal: string, frankie: string) => string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function applySkinVariables(skin: AppSkin, prefersReducedMotion: boolean) {
  const root = document.documentElement;
  const variables = getSkinCssVariables(skin, prefersReducedMotion);
  const compatibilityVariables: Record<string, string> = {
    '--primary': skin.designTokens.primary,
    '--secondary': skin.designTokens.secondary,
    '--background': skin.designTokens.background,
    '--card': skin.designTokens.surface,
    '--text': skin.designTokens.text,
    '--accent': skin.designTokens.accent,
    '--font-heading': skin.typography.heading,
    '--font-body': skin.typography.body,
    '--radius': skin.shape.cardRadius,
    '--shadow': skin.effects.cardShadow,
    '--bg-texture': skin.assets.backgroundTexture || 'none',
    '--color-paper': skin.designTokens.background,
    '--color-paper-dark': skin.designTokens.backgroundAlt,
    '--color-on-surface': skin.designTokens.text,
    '--color-brand-orange': skin.designTokens.primary,
    '--color-brand-lime': skin.designTokens.secondary,
    '--color-brand-cyan': skin.designTokens.accent,
    '--color-error': skin.designTokens.error,
  };

  Object.entries({ ...variables, ...compatibilityVariables }).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  root.dataset.skin = skin.id;
  root.dataset.skinNavigation = skin.components.navigation;
  root.dataset.skinMissionCard = skin.components.missionCard;
  root.dataset.skinProofCard = skin.components.proofCard;
  root.dataset.skinModal = skin.components.modal;
  root.dataset.skinButton = skin.components.button;
  root.dataset.skinProgress = skin.components.progress;
  root.dataset.skinProfileFrame = skin.components.profileFrame;
  root.dataset.skinViewfinder = skin.components.viewfinder;
  root.dataset.skinLoading = skin.components.loading;
  root.dataset.skinState = skin.components.statePanel;
  root.dataset.skinMotion = prefersReducedMotion || !skin.motion.decorativeMotion ? 'reduced' : 'full';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [allSkins, setAllSkins] = useState<AppSkin[]>(APP_SKINS);
  const [userPrefs, setUserPrefs] = useState<UserThemePreference | null>(null);
  const [settings, setSettings] = useState<SkinSettings | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [profileEquippedSkinId, setProfileEquippedSkinId] = useState<string | null>(null);
  const [profileUnlockedSkinIds, setProfileUnlockedSkinIds] = useState<string[]>([DEFAULT_SKIN_ID]);
  const [previewSkinId, setPreviewSkinId] = useState<string | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setPrefersReducedMotion(media.matches);
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);

  useEffect(() => subscribeToSkinSettings(setSettings), []);

  useEffect(() => onAuthStateChanged(auth, async (user) => {
    if (!user) {
      setUserId(null);
      setIsAdmin(false);
      setUserPrefs(null);
      setProfileEquippedSkinId(null);
      setProfileUnlockedSkinIds([DEFAULT_SKIN_ID]);
      setPreviewSkinId(null);
      setIsLoading(false);
      return;
    }

    setUserId(user.uid);
    try {
      const adminStatus = await isUserAdmin(user.uid);
      setIsAdmin(adminStatus || user.email === 'hammer808@gmail.com');
    } catch (error) {
      console.warn('[ThemeContext] Admin status fallback used:', error);
      setIsAdmin(user.email === 'hammer808@gmail.com');
    }
  }), []);

  useEffect(() => {
    return subscribeToSkins((remoteSkins) => {
      setAllSkins(mergeSkinRegistry(remoteSkins));
    }, isAdmin);
  }, [isAdmin]);

  useEffect(() => {
    if (!userId) return;

    const unsubscribePrefs = onSnapshot(doc(db, 'userPrefs', userId), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as UserThemePreference;
        setUserPrefs({
          selectedSkinId: data.selectedSkinId || '',
          frankieMode: data.frankieMode ?? data.reduceCommentary ?? false,
        });
      } else {
        setUserPrefs({ selectedSkinId: '', frankieMode: false });
      }
      setIsLoading(false);
    }, (error) => {
      console.warn('[ThemeContext] User theme preference unavailable:', error.message);
      setUserPrefs({ selectedSkinId: '', frankieMode: false });
      setIsLoading(false);
    });

    const unsubscribeProfile = onSnapshot(doc(db, 'users', userId), (snapshot) => {
      const data = snapshot.data() as {
        equippedSkinId?: string;
        unlockedRewards?: { skins?: string[] };
      } | undefined;
      const unlocked = new Set([DEFAULT_SKIN_ID, ...(data?.unlockedRewards?.skins || [])]);
      if (data?.equippedSkinId) unlocked.add(data.equippedSkinId);
      setProfileEquippedSkinId(data?.equippedSkinId || null);
      setProfileUnlockedSkinIds(Array.from(unlocked));
    }, (error) => {
      console.warn('[ThemeContext] Skin ownership unavailable:', error.message);
      setProfileEquippedSkinId(null);
      setProfileUnlockedSkinIds([DEFAULT_SKIN_ID]);
    });

    return () => {
      unsubscribePrefs();
      unsubscribeProfile();
    };
  }, [userId]);

  const selectedSkinId = userPrefs?.selectedSkinId || profileEquippedSkinId || DEFAULT_SKIN_ID;
  const frankieMode = userPrefs?.frankieMode ?? false;
  const selection = useMemo(() => resolveSkinSelection({
    skins: allSkins,
    persistedSkinId: selectedSkinId,
    previewSkinId,
    forcedSkinId: settings?.forcedSkinId,
    defaultSkinId: settings?.defaultSkinId || DEFAULT_SKIN_ID,
    userSkinSelectionEnabled: settings?.userSkinSelectionEnabled ?? true,
    unlockedSkinIds: profileUnlockedSkinIds,
    isAdmin,
  }), [allSkins, isAdmin, previewSkinId, profileUnlockedSkinIds, selectedSkinId, settings]);
  const activeSkin = selection.skin || DEFAULT_APP_SKIN;

  useEffect(() => {
    applySkinVariables(activeSkin, prefersReducedMotion || frankieMode);
  }, [activeSkin, frankieMode, prefersReducedMotion]);

  const canUseSkin = useCallback((skinId: string) => {
    const candidate = getSkinById(skinId, allSkins);
    const defaultId = getSkinById(settings?.defaultSkinId, allSkins)?.id || DEFAULT_SKIN_ID;
    return Boolean(
      candidate &&
      (isAdmin ? candidate.status !== 'archived' : candidate.status === 'active') &&
      (skinId === defaultId || canUseSkinSelection(skinId, profileUnlockedSkinIds, isAdmin))
    );
  }, [allSkins, isAdmin, profileUnlockedSkinIds, settings?.defaultSkinId]);

  const persistSkin = useCallback(async (skinId: string, allowWhenSelectionDisabled = false) => {
    if (!userId) throw new Error('Sign in before applying a skin.');
    if (!allowWhenSelectionDisabled && settings?.userSkinSelectionEnabled === false && !isAdmin) {
      throw new Error('Skin selection is currently locked by an administrator.');
    }
    const defaultId = getSkinById(settings?.defaultSkinId, allSkins)?.id || DEFAULT_SKIN_ID;
    const update = createSkinPreferenceUpdate(skinId, allSkins, profileUnlockedSkinIds, isAdmin, defaultId);
    const batch = writeBatch(db);
    batch.set(doc(db, 'userPrefs', userId), {
      ...update.userPrefs,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    await batch.commit();
    setUserPrefs((current) => ({
      selectedSkinId: skinId,
      frankieMode: current?.frankieMode ?? false,
    }));
  }, [allSkins, isAdmin, profileUnlockedSkinIds, settings?.defaultSkinId, settings?.userSkinSelectionEnabled, userId]);

  const setSkin = useCallback(async (skinId: string) => {
    await persistSkin(skinId);
    setPreviewSkinId(null);
  }, [persistSkin]);

  const previewSkin = useCallback((skinId: string) => {
    const candidate = getSkinById(skinId, allSkins);
    if (!candidate || (isAdmin ? candidate.status === 'archived' : candidate.status !== 'active')) return;
    setPreviewSkinId(skinId);
  }, [allSkins, isAdmin]);

  const applyPreview = useCallback(async () => {
    if (!previewSkinId) return;
    await setSkin(previewSkinId);
  }, [previewSkinId, setSkin]);

  const cancelPreview = useCallback(() => setPreviewSkinId(null), []);

  const resetSkin = useCallback(async () => {
    const defaultId = getSkinById(settings?.defaultSkinId, allSkins)?.id || DEFAULT_SKIN_ID;
    await persistSkin(defaultId, true);
    setPreviewSkinId(null);
  }, [allSkins, persistSkin, settings?.defaultSkinId]);

  const setFrankieMode = useCallback(async (value: boolean) => {
    if (!userId) return;
    const batch = writeBatch(db);
    batch.set(doc(db, 'userPrefs', userId), { frankieMode: value, updatedAt: serverTimestamp() }, { merge: true });
    await batch.commit();
    setUserPrefs((current) => ({
      selectedSkinId: current?.selectedSkinId || profileEquippedSkinId || DEFAULT_SKIN_ID,
      frankieMode: value,
    }));
  }, [profileEquippedSkinId, userId]);

  const t = useCallback((key: keyof CopyOverrides): string => (
    activeSkin.copyOverrides?.[key] || DEFAULT_APP_SKIN.copyOverrides[key] || ''
  ), [activeSkin]);
  const asset = useCallback((key: keyof AppSkin['assets']): string => (
    activeSkin.assets?.[key] || DEFAULT_APP_SKIN.assets[key] || ''
  ), [activeSkin]);
  const fc = useCallback((normal: string, frankie: string): string => frankieMode ? frankie : normal, [frankieMode]);

  const value = useMemo<ThemeContextType>(() => ({
    skin: activeSkin,
    allSkins,
    settings,
    frankieMode,
    isAdmin,
    isLoading,
    selectedSkinId,
    previewSkinId,
    unlockedSkinIds: profileUnlockedSkinIds,
    selectionSource: selection.source,
    setSkin,
    previewSkin,
    applyPreview,
    cancelPreview,
    resetSkin,
    canUseSkin,
    setFrankieMode,
    t,
    asset,
    fc,
  }), [
    activeSkin, allSkins, applyPreview, asset, canUseSkin, cancelPreview, fc, frankieMode, isAdmin,
    isLoading, previewSkin, previewSkinId, profileUnlockedSkinIds, resetSkin, selectedSkinId, selection.source,
    setFrankieMode, setSkin, settings, t,
  ]);

  return (
    <ThemeContext.Provider value={value}>
      <MotionConfig reducedMotion={prefersReducedMotion || frankieMode ? 'always' : 'user'}>
        <div
          id="fieldtrip-app-skin-root"
          data-skin={activeSkin.id}
          data-skin-navigation={activeSkin.components.navigation}
          data-skin-mission-card={activeSkin.components.missionCard}
          data-skin-proof-card={activeSkin.components.proofCard}
          data-skin-modal={activeSkin.components.modal}
          data-skin-button={activeSkin.components.button}
          data-skin-progress={activeSkin.components.progress}
          data-skin-profile-frame={activeSkin.components.profileFrame}
          data-skin-viewfinder={activeSkin.components.viewfinder}
          data-skin-loading={activeSkin.components.loading}
          data-skin-state={activeSkin.components.statePanel}
          className={`skin-app-root app-skin-${activeSkin.slug} ${frankieMode ? 'frankie-active' : ''}`}
        >
          {children}
        </div>
      </MotionConfig>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
