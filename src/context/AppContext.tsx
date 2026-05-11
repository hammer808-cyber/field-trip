import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../lib/firebase';
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, User } from 'firebase/auth';
import { PersonaId, PERSONAS, Entry, MOCK_ENTRIES } from '../constants';
import { ChallengeCard as ChallengeType } from '../types/challenges';
import { MOCK_USERS } from '../data/mockUsers';
import { MOCK_CHALLENGES } from '../data/mockChallenges';
import { drawChallenge as drawChallengeLogic, applyPersonaModifier } from '../logic/challengeLogic';
import { SnitchEvent, generateSnitchEffect, canSnitch } from '../logic/snitchLogic';
import { useDev } from './DevContext';
import { 
  isViewfinderLocked as checkViewfinderLocked,
  canAccessCrewMode as checkCrewMode,
  canAccessSnitchMode as checkSnitchMode,
  GameState
} from '../logic/progression';
import { 
  getOrCreateProfile, 
  subscribeToProfile, 
  updateProfile,
  UserProfile,
  subscribeToTopStandings
} from '../services/userService';
import { 
  getUserEntriesPage
} from '../services/entryService';
import { 
  sendSnitch, 
  subscribeToIncomingSnitches,
  deleteSnitch 
} from '../services/snitchService';
import { subscribeToChallenges } from '../services/challengeService';
import { processLoreForEntry } from '../services/crewService';
import { subscribeToActiveSignal } from '../services/fieldSignalService';
import { FieldSignal } from '../types/signals';

import { evaluateEntryForBadges, subscribeToUserBadgeProgress, checkRankBadges } from '../services/badgeService';
import { UserBadgeProgress } from '../types/badges';

import { evaluateEntryForArtifacts, subscribeToCrewArtifacts } from '../services/artifactService';
import { CrewArtifact } from '../types/artifacts';

import { subscribeToObservations, generateObservation, dismissObservation } from '../services/observationService';
import { Observation } from '../types/observations';
import { getProofRequirement } from '../services/proofService';
import { ProofReview, ProofRequirement } from '../types/proof';

import { 
  submitEntry as submitEntryLogic, 
  checkOnboardingState, 
  getUserStats 
} from '../services/gameService';
import { 
  subscribeToAppConfig, 
  subscribeToActiveSeason 
} from '../services/seasonService';
import { AppConfig, Season } from '../types/game';

import { 
  getLatestConsent, 
  isConsentValid 
} from '../services/legalService';
import { subscribeToBlocks } from '../services/moderationService';

interface AppContextType {
  user: User | null;
  profile: UserProfile | null;
  legalConsent: any | null;
  hasConfirmedLegal: boolean;
  personaQuizComplete: boolean;
  onboardingCompleted: boolean;
  blockedIds: string[];
  refreshConsent: () => Promise<void>;
  loading: boolean;
  gameConfig: AppConfig | null;
  activeSeason: Season | null;
  persona: PersonaId | null;
  setPersona: (id: PersonaId) => Promise<void>;
  entries: Entry[];
  loadMoreEntries: () => Promise<void>;
  hasMoreEntries: boolean;
  addEntry: (entry: { proofImage: string; note: string; crewId?: string; challengeId?: string }) => Promise<{ entryId: string; status: string; review?: ProofReview }>;
  activeChallenge: ChallengeType | null;
  drawChallenge: () => Promise<void>;
  challenges: ChallengeType[];
  points: number;
  soloCount: number;
  isCrewUnlocked: boolean;
  isSnitchUnlocked: boolean;
  rerollsAvailable: number;
  useReroll: () => Promise<void>;
  snitchEvents: SnitchEvent[];
  useSnitch: (targetName: string, targetId: string) => Promise<void>;
  canSnitchNow: boolean;
  incomingSnitch: SnitchEvent | null;
  resolveIncomingSnitch: () => Promise<void>;
  standings: UserProfile[];
  activeSignal: FieldSignal | null;
  loadingSignal: boolean;
  badgeProgress: UserBadgeProgress[];
  crewArtifacts: CrewArtifact[];
  observations: Observation[];
  lastReview: ProofReview | null;
  clearReview: () => void;
  isLocked: boolean;
  isSeasonActive: boolean;
  isAdmin: boolean;
  isFeatureEnabled: (flag: keyof AppConfig['featureFlags']) => boolean;
  markBadgeAsSeen: (badgeId: string) => Promise<void>;
  dismissObservation: (msgId: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { overrides } = useDev();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [lastVisibleEntry, setLastVisibleEntry] = useState<any>(null);
  const [hasMoreEntries, setHasMoreEntries] = useState(true);
  const [standings, setStandings] = useState<UserProfile[]>([]);
  const [incomingSnitches, setIncomingSnitches] = useState<SnitchEvent[]>([]);
  const [challenges, setChallenges] = useState<ChallengeType[]>([]);
  const [activeSignal, setActiveSignal] = useState<FieldSignal | null>(null);
  const [loadingSignal, setLoadingSignal] = useState(true);
  const [badgeProgress, setBadgeProgress] = useState<UserBadgeProgress[]>([]);
  const [crewArtifacts, setCrewArtifacts] = useState<CrewArtifact[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [lastReview, setLastReview] = useState<ProofReview | null>(null);
  const [gameConfig, setGameConfig] = useState<AppConfig | null>(null);
  const [activeSeason, setActiveSeason] = useState<Season | null>(null);
  const [legalConsent, setLegalConsent] = useState<any | null>(null);
  const [hasConfirmedLegal, setHasConfirmedLegal] = useState<boolean>(true); // Default true until checked
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  
  // Sync App Config
  useEffect(() => {
    return subscribeToAppConfig(setGameConfig);
  }, []);

  // Sync Active Season
  useEffect(() => {
    if (!gameConfig?.activeSeasonId) {
      setActiveSeason(null);
      return;
    }
    return subscribeToActiveSeason(gameConfig.activeSeasonId, setActiveSeason);
  }, [gameConfig?.activeSeasonId]);

  const refreshConsent = async () => {
    if (!user) return;
    const consent = await getLatestConsent(user.uid);
    setLegalConsent(consent);
    setHasConfirmedLegal(isConsentValid(consent));
  };

  // Auth listener
  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        setLoading(true);
        // Refresh consent first
        const consent = await getLatestConsent(u.uid);
        setLegalConsent(consent);
        setHasConfirmedLegal(isConsentValid(consent));

        // Subscribe to blocks
        const unsubBlocks = subscribeToBlocks(u.uid, setBlockedIds);

        const p = await getOrCreateProfile(u);
        setProfile(p);

        return () => {
          unsubBlocks();
        };
      } else {
        setProfile(null);
        setEntries([]);
        setLegalConsent(null);
        setHasConfirmedLegal(false);
      }
      setLoading(false);
    });
  }, []);

  // Sync profile - Targeted doc listener
  useEffect(() => {
    if (!user) return;
    return subscribeToProfile(user.uid, (p) => {
      setProfile(p);
    });
  }, [user]);

  // Sync entries - Load first batch
  useEffect(() => {
    if (!user) return;
    
    async function loadInitial() {
      const result = await getUserEntriesPage(user.uid, 5);
      if (result) {
        setEntries(result.docs);
        setLastVisibleEntry(result.lastVisible);
        setHasMoreEntries(result.docs.length === 5);
      }
    }
    loadInitial();
  }, [user]);

  const loadMoreEntries = async () => {
    if (!user || !hasMoreEntries) return;
    const result = await getUserEntriesPage(user.uid, 10, lastVisibleEntry);
    if (result) {
      setEntries(prev => [...prev, ...result.docs]);
      setLastVisibleEntry(result.lastVisible);
      setHasMoreEntries(result.docs.length === 10);
    }
  };

  // Sync standings - Top 10 only for live feel
  useEffect(() => {
    if (!user) {
      setStandings([]);
      return;
    }
    return subscribeToTopStandings((newStandings) => {
      setStandings(newStandings);
    });
  }, [user]);

  // Sync snitches - Small batch listener
  useEffect(() => {
    if (!user) return;
    return subscribeToIncomingSnitches(user.uid, (events) => {
      setIncomingSnitches(events);
    });
  }, [user]);

  // Sync Challenges
  useEffect(() => {
    if (!user) {
      setChallenges([]);
      return;
    }
    return subscribeToChallenges((data) => {
      setChallenges(data);
    });
  }, [user]);

  // Sync Field Signal
  useEffect(() => {
    setLoadingSignal(true);
    return subscribeToActiveSignal((signal) => {
      setActiveSignal(signal);
      setLoadingSignal(false);
    });
  }, []);

  // Sync Badge Progress
  useEffect(() => {
    if (!user) {
      setBadgeProgress([]);
      return;
    }
    return subscribeToUserBadgeProgress(user.uid, (data) => {
      setBadgeProgress(data);
    });
  }, [user]);

  // Sync Crew Artifacts
  useEffect(() => {
    if (!profile?.crewId) {
      setCrewArtifacts([]);
      return;
    }
    return subscribeToCrewArtifacts(profile.crewId, (data) => {
      setCrewArtifacts(data);
    });
  }, [profile?.crewId]);

  // Sync Observations
  useEffect(() => {
    if (!user) {
      setObservations([]);
      return;
    }
    return subscribeToObservations(user.uid, (data) => {
      setObservations(data);
    });
  }, [user]);

  // Handle Rank Badges
  useEffect(() => {
    if (!user || !profile) return;
    
    // Using a ref to track previous points to avoid double-processing when rank updates
    const previousPoints = profile.points; 
    
    // This is a bit reactive, so we check rank whenever points increase
    // We pass the current values and the service will handle the rest
    checkRankBadges(user.uid, profile.points, profile.points - 1, profile.previousRank);
  }, [profile?.points]);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const completeOnboarding = async () => {
    if (!user) return;
    await updateProfile(user.uid, { onboardingCompleted: true });
  };

  const setPersona = async (id: PersonaId) => {
    if (!user) return;
    const personaData = PERSONAS[id];
    await updateProfile(user.uid, { 
      persona: id,
      personaName: personaData.name,
      personaQuizComplete: true
    });
  };

  const drawChallenge = async () => {
    if (!user || challenges.length === 0) return;
    const available = challenges.filter(c => c.status === 'available');
    const newChallenge = drawChallengeLogic(available.length > 0 ? available : challenges) as any;
    await updateProfile(user.uid, { activeChallenge: newChallenge });
  };

  const useReroll = async () => {
    if (!user || !profile || profile.rerollsAvailable <= 0) return;
    await drawChallenge();
    await updateProfile(user.uid, { rerollsAvailable: profile.rerollsAvailable - 1 });
  };

  const isFeatureEnabled = (flag: keyof AppConfig['featureFlags']) => {
    return gameConfig?.featureFlags[flag] ?? true;
  };

  const addEntry = async (entryData: { proofImage: string; note: string; crewId?: string; challengeId?: string }): Promise<{ entryId: string; status: string; review?: ProofReview }> => {
    if (!user || !profile) throw new Error('Not authenticated');
    
    const currentChallenge = profile.activeChallenge || challenges[0];
    if (!currentChallenge) throw new Error('No active challenge');

    const result = await submitEntryLogic(
      user.uid,
      profile.name,
      currentChallenge,
      {
        proofImage: entryData.proofImage,
        note: entryData.note,
        crewId: entryData.crewId || profile.crewId
      }
    );

    if (!result) throw new Error('Submission failed');

    const { entryId, status, review } = result;
    setLastReview(review);

    // Update Crew Lore if applicable
    if (profile.crewId && status === 'approved') {
      await processLoreForEntry(profile.crewId, { id: entryId, status: 'approved' } as any);
    }

    // Side effects only on approval for now to keep things clean
    if (status === 'approved') {
      const entryObj = {
        ...entryData,
        id: entryId,
        challengeId: currentChallenge.id,
        category: currentChallenge.category
      };

      if (isFeatureEnabled('badgeFragmentsEnabled')) {
        evaluateEntryForBadges(user.uid, entryObj as any);
      }

      if (profile.crewId && isFeatureEnabled('crewArtifactsEnabled')) {
        evaluateEntryForArtifacts(profile.crewId, user.uid, profile.name, entryObj as any);
      }

      if (isFeatureEnabled('appObservationsEnabled')) {
        generateObservation(user.uid, profile.crewId || null, [entryObj as any, ...entries], { rankImproved: false });
      }
    }
    
    return { entryId, status, review };
  };

  const useSnitch = async (targetName: string, targetId: string) => {
    if (!user || !profile || !canSnitch(profile.lastSnitchDate)) return;

    const newSnitch = generateSnitchEffect(targetName);
    
    await sendSnitch({
      ...newSnitch,
      senderId: user.uid,
      targetId: targetId,
      targetName: targetName
    });

    await updateProfile(user.uid, {
      lastSnitchDate: new Date().toISOString()
    });
  };

  const resolveIncomingSnitch = async () => {
    if (!incomingSnitches.length || !user || !profile) return;
    
    const latest = incomingSnitches[0];
    if (latest.type === 'penalty') {
      await updateProfile(user.uid, {
        points: Math.max(0, profile.points - 10)
      });
    }
    
    if (latest.id) {
      await deleteSnitch(latest.id);
    }
  };

  const persona = overrides.persona || profile?.persona || null;
  const personaQuizComplete = !!profile?.personaQuizComplete;
  const onboardingCompleted = !!profile?.onboardingCompleted;
  const points = overrides.points !== null ? overrides.points : (profile?.points || 0);
  const soloCount = overrides.soloCount !== null ? overrides.soloCount : (profile?.soloCount || 0);
  
  const isAdmin = overrides.isAdmin !== null ? overrides.isAdmin : (profile?.role === 'admin' || user?.email === 'hammer808@gmail.com');

  const gameState: GameState = {
    userId: user?.uid || null,
    email: user?.email || null,
    points,
    soloCount,
    onboardingComplete: onboardingCompleted,
    persona,
    isAdmin,
    currentDate: overrides.date ? new Date(overrides.date) : new Date(),
  };

  const isCrewUnlocked = (profile?.crewModeUnlocked || checkCrewMode(gameState) || overrides.forceUnlocked) && isFeatureEnabled('crewDispatchEnabled');
  const isSnitchUnlocked = (checkSnitchMode(gameState) || overrides.forceUnlocked) && isFeatureEnabled('rivalMomentsEnabled');
  const isSeasonActive = activeSeason?.status === 'active' || isAdmin;
  const isLocked = (checkViewfinderLocked(gameState) || (!isSeasonActive && !isAdmin)) && !overrides.forceUnlocked;

  const canSnitchNow = canSnitch(profile?.lastSnitchDate || null) && isSnitchUnlocked;
  const activeChallenge = profile?.activeChallenge || null;
  const rerollsAvailable = profile?.rerollsAvailable || 0;
  const incomingSnitch = incomingSnitches.length > 0 ? incomingSnitches[0] : null;

  const markBadgeAsSeen = async (badgeId: string) => {
    if (!user || !profile) return;
    const currentSeen = profile.seenBadges || [];
    if (!currentSeen.includes(badgeId)) {
      await updateProfile(user.uid, {
        seenBadges: [...currentSeen, badgeId]
      });
    }
  };

  const handleDismissObservation = async (msgId: string) => {
    await dismissObservation(msgId);
  };

  const clearReview = () => setLastReview(null);

  return (
    <AppContext.Provider value={{
      user,
      profile,
      loading,
      gameConfig,
      activeSeason,
      persona,
      personaQuizComplete,
      onboardingCompleted,
      setPersona,
      entries,
      loadMoreEntries,
      hasMoreEntries,
      addEntry,
      activeChallenge,
      drawChallenge,
      challenges,
      points,
      soloCount,
      isCrewUnlocked,
      isSnitchUnlocked,
      rerollsAvailable,
      useReroll,
      snitchEvents: [], // Would sync global snitches if needed
      useSnitch,
      canSnitchNow,
      incomingSnitch,
      resolveIncomingSnitch,
      standings,
      activeSignal,
      loadingSignal,
      badgeProgress,
      crewArtifacts,
      observations,
      lastReview,
      clearReview,
      isLocked,
      isSeasonActive,
      isAdmin,
      legalConsent,
      hasConfirmedLegal,
      blockedIds,
      refreshConsent,
      isFeatureEnabled,
      markBadgeAsSeen,
      dismissObservation: handleDismissObservation,
      signInWithGoogle,
      signOut,
      completeOnboarding
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
