import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  subscribeToSkin, 
  subscribeToSkins, 
  subscribeToSkinSettings, 
  subscribeToUserThemePreference, 
  updateThemePreference as updateUserThemePreference,
  isUserAdmin,
  setAdminStatus
} from '../services/skinService';
import { Skin, SkinSettings, UserThemePreference, ThemeTokens, CopyOverrides } from '../types/skin';
import { BASE_SKIN, DEFAULT_SKIN_ASSETS, DEFAULT_COPY_OVERRIDES } from '../constants/skins';

interface ThemeContextType {
  skin: Skin;
  allSkins: Skin[];
  settings: SkinSettings | null;
  userPrefs: UserThemePreference | null;
  isAdmin: boolean;
  frankieMode: boolean; // Visual Calm mode
  setSkin: (skinId: string) => Promise<void>;
  setFrankieMode: (val: boolean) => Promise<void>;
  isLoading: boolean;
  t: (key: keyof CopyOverrides) => string;
  asset: (key: keyof Skin['assets']) => string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [activeSkin, setActiveSkin] = useState<Skin>(BASE_SKIN);
  const [allSkins, setAllSkins] = useState<Skin[]>([]);
  const [settings, setSettings] = useState<SkinSettings | null>(null);
  const [userPrefs, setUserPrefs] = useState<UserThemePreference | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Helper for copy overrides with fallbacks
  const t = (key: keyof CopyOverrides): string => {
    return activeSkin.copyOverrides?.[key] || DEFAULT_COPY_OVERRIDES[key];
  };

  // Helper for assets with fallbacks
  const asset = (key: keyof Skin['assets']): string => {
    return activeSkin.assets?.[key] || DEFAULT_SKIN_ASSETS[key];
  };

  // Listen to Auth
  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        const adminStatus = await isUserAdmin(user.uid);
        const isHardcodedAdmin = user.email === 'hammer808@gmail.com' && user.emailVerified;
        
        // Auto-bootstrap hardcoded admin into the collection for faster rule checks
        if (isHardcodedAdmin && !adminStatus) {
          await setAdminStatus(user.uid, true);
        }

        setIsAdmin(adminStatus || isHardcodedAdmin);
      } else {
        setUserId(null);
        setIsAdmin(false);
        setUserPrefs(null);
      }
    });
  }, []);

  // Subscribe to Global Settings
  useEffect(() => {
    return subscribeToSkinSettings((newSettings) => {
      setSettings(newSettings);
    });
  }, []);

  // Subscribe to User Preferences
  useEffect(() => {
    if (!userId) return;
    return subscribeToUserThemePreference(userId, (prefs) => {
      setUserPrefs(prefs);
    });
  }, [userId]);

  // Determine and Subscribe to the ACTIVE skin - Optimization: Only 1 doc read
  useEffect(() => {
    if (!settings) return;

    let targetId = settings.forcedSkinId;
    if (!targetId && userPrefs?.selectedSkinId && settings.userSkinSelectionEnabled) {
      targetId = userPrefs.selectedSkinId;
    }
    if (!targetId) {
      targetId = settings.defaultSkinId;
    }
    if (!targetId) return;

    // Targeted single doc listener
    const unsub = subscribeToSkin(targetId, (skin) => {
      setActiveSkin(skin);
      setIsLoading(false);
    });

    return () => unsub();
  }, [settings, userPrefs]);

  // Subscribe to ALL skins if admin
  useEffect(() => {
    if (!isAdmin) {
      setAllSkins([]);
      return;
    }
    const unsub = subscribeToSkins((skins) => {
      setAllSkins(skins);
    }, true);
    return () => unsub();
  }, [isAdmin]);

  const frankieMode = useMemo(() => {
    if (userPrefs?.visualCalmEnabled !== undefined) {
      return userPrefs.visualCalmEnabled && activeSkin.visualCalmSupported;
    }
    return false;
  }, [userPrefs, activeSkin]);

  const setSkin = async (skinId: string) => {
    if (!userId) return;
    await updateUserThemePreference(userId, { selectedSkinId: skinId });
  };

  const setFrankieMode = async (val: boolean) => {
    if (!userId) return;
    await updateUserThemePreference(userId, { visualCalmEnabled: val });
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
  }, [activeSkin]);

  return (
    <ThemeContext.Provider value={{ 
      skin: activeSkin, 
      allSkins, 
      settings, 
      userPrefs, 
      isAdmin, 
      frankieMode, 
      setSkin, 
      setFrankieMode,
      isLoading,
      t,
      asset
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
