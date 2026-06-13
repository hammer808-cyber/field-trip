import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, updateDoc, setDoc } from 'firebase/firestore';
import { Skin, SkinSettings, UserThemePreference, CopyOverrides } from '../types/skin';
import { STARTER_SKINS } from '../data/skins';
import { isUserAdmin, subscribeToSkinSettings } from '../services/skinService';

const BASE_SKIN = STARTER_SKINS[0];

interface ThemeContextType {
  skin: Skin;
  allSkins: Skin[];
  settings: SkinSettings | null;
  frankieMode: boolean;
  isAdmin: boolean;
  setSkin: (skinId: string) => Promise<void>;
  setFrankieMode: (val: boolean) => Promise<void>;
  isLoading: boolean;
  t: (key: keyof CopyOverrides) => string;
  asset: (key: keyof Skin['assets']) => string;
  fc: (normal: string, frankie: string) => string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [activeSkin, setActiveSkin] = useState<Skin>(BASE_SKIN);
  const [userPrefs, setUserPrefs] = useState<UserThemePreference | null>(null);
  const [settings, setSettings] = useState<SkinSettings | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Helper for copy overrides with fallbacks
  const t = (key: keyof CopyOverrides): string => {
    return activeSkin.copyOverrides?.[key] || (BASE_SKIN.copyOverrides[key] as string) || "";
  };

  // Helper for assets with fallbacks
  const asset = (key: keyof Skin['assets']): string => {
    return activeSkin.assets?.[key] || (BASE_SKIN.assets[key] as string) || "";
  };

  // Listen to Auth
  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          setUserId(user.uid);
          const adminStatus = await isUserAdmin(user.uid);
          setIsAdmin(adminStatus || user.email === 'hammer808@gmail.com');
        } else {
          setUserId(null);
          setIsAdmin(false);
          setUserPrefs(null);
          setActiveSkin(BASE_SKIN);
        }
      } catch (err) {
        console.error("[ThemeContext] Auth state change processing failed:", err);
        // Reset state on error to avoid stale/stuck data
        setUserId(null);
        setIsAdmin(false);
      }
    });
  }, []);

  // Listen to User Preferences
  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }
    
    // Global Settings
    const unsubSettings = subscribeToSkinSettings(setSettings);

    const unsubPrefs = onSnapshot(doc(db, 'userPrefs', userId), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as UserThemePreference;
        setUserPrefs(data);
        
        // Find skin in local config
        const skinId = data.selectedSkinId || 'classic';
        const foundSkin = STARTER_SKINS.find(s => s.id === skinId) || BASE_SKIN;
        setActiveSkin(foundSkin);
      } else {
        setUserPrefs({ selectedSkinId: 'classic', frankieMode: false });
        setActiveSkin(BASE_SKIN);
      }
      setIsLoading(false);
    }, (err) => {
      console.warn("[ThemeContext] User preferences fetch failed:", err.message);
      setIsLoading(false);
      // Fallback
      setUserPrefs({ selectedSkinId: 'classic', frankieMode: false });
      setActiveSkin(BASE_SKIN);
    });

    return () => {
      unsubSettings();
      unsubPrefs();
    };
  }, [userId]);

  const frankieMode = userPrefs?.frankieMode || false;

  // Helper for frankie mode copy switching
  const fc = (normal: string, frankie: string): string => {
    return frankieMode ? frankie : normal;
  };

  const setSkin = async (skinId: string) => {
    if (!userId) return;
    await setDoc(doc(db, 'userPrefs', userId), { selectedSkinId: skinId }, { merge: true });
    
    // Also update profile if in profile
    await setDoc(doc(db, 'users', userId), { equippedSkinId: skinId }, { merge: true });
  };

  const setFrankieMode = async (val: boolean) => {
    if (!userId) return;
    await setDoc(doc(db, 'userPrefs', userId), { frankieMode: val }, { merge: true });
  };

  // Apply CSS variables
  useEffect(() => {
    if (!activeSkin) return;
    const root = document.documentElement;
    const tokens = activeSkin.themeTokens;

    root.style.setProperty('--primary', tokens.primaryColor);
    root.style.setProperty('--secondary', tokens.secondaryColor);
    root.style.setProperty('--background', tokens.backgroundColor);
    root.style.setProperty('--card', tokens.cardColor);
    root.style.setProperty('--text', tokens.textColor);
    root.style.setProperty('--accent', tokens.accentColor);
    root.style.setProperty('--font-heading', tokens.fontHeading);
    root.style.setProperty('--font-body', tokens.fontBody);
    root.style.setProperty('--radius', tokens.borderRadius);
    root.style.setProperty('--shadow', tokens.shadowStyle);
    
    // Background texture
    if (activeSkin.assets.backgroundTexture) {
      root.style.setProperty('--bg-texture', activeSkin.assets.backgroundTexture);
    } else {
      root.style.setProperty('--bg-texture', 'none');
    }
  }, [activeSkin]);

  return (
    <ThemeContext.Provider value={{ 
      skin: activeSkin, 
      allSkins: STARTER_SKINS, 
      settings,
      frankieMode, 
      isAdmin,
      setSkin, 
      setFrankieMode,
      isLoading,
      t,
      asset,
      fc
    }}>
      <div className={`app-skin-${activeSkin.slug} ${frankieMode ? 'frankie-active' : ''}`}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
