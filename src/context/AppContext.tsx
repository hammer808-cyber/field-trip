import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot 
} from 'firebase/firestore';
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, User } from 'firebase/auth';
import { FieldTypeId, FIELD_TYPES, Entry, ProductPersonaLensId, DEV_SEASON, DEV_APP_CONFIG } from '../constants';
import { MemoryEntry } from '../types/memories';
import { AvatarData } from '../types/avatar';
import { TripCard as TripType } from '../types/challenges';
import { RewardQueueItem, RewardIntensity } from '../types/feedback';
import { MOCK_USERS } from '../data/mockUsers';
import { MOCK_TRIPS } from '../constants';
import { 
  drawChallenge as drawTripLogic, 
  applyFieldTypeModifier
} from '../logic/challengeLogic';
import { 
  getCurrentSeasonWeek,
  getActiveWeekDrop,
  isWeekUnlocked,
  isWeekLocked,
  isReviewWindowOpen,
  isVotingWindowOpen,
  canSubmitToChallenge,
  canCallFieldCheck,
  canShunIt,
  getSubmissionPointWindow
} from '../logic/weeklyLogic';
import { 
  FieldCheck, 
  FieldCheckReason as FieldCheckType,
  ActiveSabotage,
  SabotageCard
} from '../types/game';
import { activateSabotageShield, deploySabotage, getWeeklySabotages, resolveSabotage } from '../services/sabotageService';
import { SABOTAGE_CARDS } from '../constants';
import { canRequestFieldCheck } from '../logic/fieldCheckLogic';
import { useDev } from './DevContext';
import { 
  isViewfinderLocked as checkViewfinderLocked,
  canAccessCrewMode as checkCrewMode,
  canAccessFieldCheckMode as checkFieldCheckMode,
  isSummerDeckActive,
  GameState
} from '../logic/progression';
import { 
  getOrCreateProfile, 
  subscribeToProfile, 
  updateProfile,
  UserProfile,
  subscribeToTopStandings,
  secureCompleteOnboarding
} from '../services/userService';
import { 
  getUserEntriesPage
} from '../services/entryService';
import { 
  submitFieldCheck, 
  subscribeToIncomingFieldChecks,
  resolveFieldCheck 
} from '../services/fieldCheckService';
import { subscribeToChallenges } from '../services/challengeService';
import { processLoreForEntry } from '../services/crewService';
import { subscribeToActiveSignal } from '../services/fieldSignalService';
import { FieldSignal } from '../types/signals';
import { castVote, getVotesForUser } from '../services/voteService';

import { evaluateEntryForBadges, subscribeToUserBadgeProgress, checkRankBadges } from '../services/badgeService';
import { BADGE_DEFINITIONS, UserBadgeProgress } from '../types/badges';

import { evaluateEntryForArtifacts, subscribeToCrewArtifacts } from '../services/artifactService';
import { CrewArtifact } from '../types/artifacts';

import { subscribeToObservations, generateObservation, dismissObservation } from '../services/observationService';
import { Observation } from '../types/observations';
import { getProofRequirement } from '../services/proofService';
import { ProofReview, ProofRequirement } from '../types/proof';
import { syncServerTime, getServerDate } from '../services/timeService';

import { 
  submitTripEntry as submitEntryLogic, 
  checkOnboardingState, 
  getUserStats,
  secureUseReroll
} from '../services/gameService';
import { awardPoints } from '../services/scoringService';
import { 
  subscribeToAppConfig, 
  subscribeToActiveSeason 
} from '../services/seasonService';
import { subscribeToUserMemories, toggleFavoriteMemory as toggleMemoryFav } from '../services/memoryService';
import { AppConfig, Season } from '../types/game';

import { 
  getLatestConsent, 
  isConsentValid 
} from '../services/legalService';
import { subscribeToBlocks } from '../services/moderationService';
import { getDeckPackById } from '../data/deckPacks';
import { FEATURE_FLAGS } from '../config/featureFlags';

import { watchGlobalConfig, getGlobalConfig, GlobalConfig } from '../services/configService';
import { getEligibleDrawPool as getCanonicalPool } from '../logic/deckLogic';

interface AppContextType {
  user: User | null;
  profile: UserProfile | null;
  legalConsent: any | null;
  hasConfirmedLegal: boolean;
  fieldClassificationComplete: boolean;
  onboardingCompleted: boolean;
  blockedIds: string[];
  refreshConsent: () => Promise<void>;
  updateProfile: (uid: string, data: Partial<UserProfile>) => Promise<void>;
  loading: boolean;
  error: string | null;
  gameConfig: AppConfig | null;
  globalConfig: GlobalConfig;
  activeSeason: Season | null;
  fieldType: FieldTypeId | null;
  setFieldType: (id: FieldTypeId) => Promise<void>;
  productPersonaLens: ProductPersonaLensId | null;
  setProductPersonaLens: (id: ProductPersonaLensId) => Promise<void>;
  entries: Entry[];
  loadMoreEntries: () => Promise<void>;
  hasMoreEntries: boolean;
  addEntry: (entry: Omit<Entry, 'id' | 'createdAt' | 'status' | 'pointsAwarded' | 'userName' | 'tripTitle'>) => Promise<{ 
    entryId: string; 
    status: string; 
    review?: ProofReview;
    scoring?: any;
    ftBonus?: number;
    ftText?: string;
    newRewards?: { stickers: string[]; badges: string[] };
  }>;
  activeTrip: TripType | null;
  drawTrip: (tripId?: string, packId?: string) => Promise<TripType | null>;
  trips: TripType[];
  points: number;
  soloTripsCount: number;
  completedCoreChallenges: number;
  isCrewUnlocked: boolean;
  isFieldCheckUnlocked: boolean;
  rerollsAvailable: number;
  fieldTokens: number;
  useReroll: () => Promise<void>;
  fieldCheckEvents: FieldCheck[];
  useFieldCheck: (params: { targetId: string; reason: FieldCheckType; details: string }) => Promise<void>;
  canFieldCheckNow: boolean;
  incomingFieldCheck: FieldCheck | null;
  resolveIncomingFieldCheck: () => Promise<void>;
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
  currentWeekNumber: number;
  activeWeekDrop: Season['weeks'][0] | null;
  isWeekUnlocked: (weekNumber: number) => boolean;
  isWeekLocked: (weekNumber: number) => boolean;
  isReviewWindowOpen: (weekNumber: number) => boolean;
  isVotingWindowOpen: (weekNumber: number) => boolean;
  activeSabotages: ActiveSabotage[];
  deploySabotage: (targetId: string, cardId: string, severity: 'minor' | 'major', attackerCrewId?: string) => Promise<void>;
  activateShield: () => Promise<void>;
  sabotageCards: SabotageCard[];
  canSubmitToChallenge: (weekNumber: number) => boolean;
  canCallFieldCheck: (weekNumber: number) => boolean;
  canShunIt: () => boolean;
  getSubmissionPointWindow: (weekNumber: number) => 'full' | 'late' | 'closed';
  castVote: (entryId: string, weekNumber: number, category: any) => Promise<void>;
  userVotes: any[];
  isFeatureEnabled: (flag: keyof AppConfig['featureFlags']) => boolean;
  markBadgeAsSeen: (badgeId: string) => Promise<void>;
  dismissObservation: (msgId: string) => Promise<void>;
  memories: MemoryEntry[];
  toggleFavoriteMemory: (memoryId: string, isFavorite: boolean) => Promise<void>;
  completedChallengeIds: Set<string>;
  completedOnboardingMissionIds: string[];
  onboardingCompletedCount: number;
  onboardingRequiredCount: number;
  isOnboardingComplete: boolean;
  getEligibleDrawPool: (packId?: string) => TripType[];
  isSummerDeckUnlocked: boolean;
  crewUnlocked: boolean;
  currentDate: Date;
  rewardQueue: RewardQueueItem[];
  queueReward: (reward: Omit<RewardQueueItem, 'id'>) => void;
  dismissReward: (id: string) => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  markCrewModeSeen: () => Promise<void>;
  updateAvatar: (data: AvatarData) => Promise<void>;
  toggleFrankieMode: () => Promise<void>;
  updateTripProgress: (tripId: string, progress: Partial<import('../components/ChallengeCard').EvidenceProgress>) => Promise<void>;
  grantPointsLocally: (amount: number, tripId: string, entryData?: any) => void;
  addToMaybeList: (tripId: string) => Promise<void>;
  removeFromMaybeList: (tripId: string) => Promise<void>;
  useComebackCard: () => Promise<void>;
  evaluateEntryProof: (entryData: { note: string }, base64Image: string) => Promise<ProofReview>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { overrides } = useDev();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [lastVisibleEntry, setLastVisibleEntry] = useState<any>(null);
  const [hasMoreEntries, setHasMoreEntries] = useState(true);
  const [standings, setStandings] = useState<UserProfile[]>([]);
  const [incomingFieldChecks, setIncomingFieldChecks] = useState<FieldCheck[]>([]);
  const [trips, setTrips] = useState<TripType[]>(MOCK_TRIPS);
  const [activeSignal, setActiveSignal] = useState<FieldSignal | null>(null);
  const [loadingSignal, setLoadingSignal] = useState(true);
  const [badgeProgress, setBadgeProgress] = useState<UserBadgeProgress[]>([]);
  const [crewArtifacts, setCrewArtifacts] = useState<CrewArtifact[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [lastReview, setLastReview] = useState<ProofReview | null>(null);
  const [gameConfig, setGameConfig] = useState<AppConfig | null>(null);
  const [globalConfig, setGlobalConfig] = useState<GlobalConfig>(getGlobalConfig());
  const [activeSeason, setActiveSeason] = useState<Season | null>(null);
  const [legalConsent, setLegalConsent] = useState<any | null>(null);
  const [hasConfirmedLegal, setHasConfirmedLegal] = useState<boolean>(true); 
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const [rewardQueue, setRewardQueue] = useState<RewardQueueItem[]>([]);
  const [sessionSeenRewards, setSessionSeenRewards] = useState<Set<string>>(new Set());
  const [pendingEntries, setPendingEntries] = useState<Entry[]>([]);
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  
  function isFeatureEnabled(flag: keyof AppConfig['featureFlags']) {
    return gameConfig?.featureFlags?.[flag] ?? (DEV_APP_CONFIG as any).featureFlags[flag];
  }

  // -------------------------------------------------------------------------
  // SYSTEM: Canonical Progression Engine
  // -------------------------------------------------------------------------
  
  const normalizeId = (id: string | any): string | null => {
    if (!id) return null;
    return id.toString().trim();
  };

  // 1. Unified Completion Set (Normalized Strings)
  const mergedCompletedMissionIds = React.useMemo(() => {
    const completed = new Set<string>();
    
    // Server entries
    entries.forEach(e => {
      // Logic: Count approved, admin-approved, auto-approved, under-check, or submitted as "completed" for progress.
      if (['approved', 'approved_by_admin', 'auto_approved', 'submitted', 'under_field_check'].includes(e.status)) {
        const id = normalizeId(e.tripId || (e as any).missionId || (e as any).challengeId);
        if (id) completed.add(id.toLowerCase());
      }
    });

    // Local pending entries
    pendingEntries.forEach(pe => {
      // IMPORTANT: pe.id is a local GUID (local_timestamp_tripId), NOT the mission ID.
      // We must only use tripId or missionId to avoid counting local IDs as unique missions (tokens).
      const id = normalizeId(pe.tripId || (pe as any).missionId);
      if (id) completed.add(id.toLowerCase());
    });
    
    return completed;
  }, [entries, pendingEntries]);

  // Aliases and base metrics
  const completedChallengeIds = mergedCompletedMissionIds;
  const fieldTokens = completedChallengeIds.size;

  // 2. Onboarding Requirements (Starter-1, Starter-2, Starter-3 / Any Unique Completed Missions)
  const ONBOARDING_IDS = React.useMemo(() => ["starter-1", "starter-2", "starter-3"], []);

  const completedOnboardingMissionIds = React.useMemo(() => {
    if (completedChallengeIds.size >= 3) {
      return ONBOARDING_IDS;
    }
    return ONBOARDING_IDS.filter(id => completedChallengeIds.has(id.toLowerCase()));
  }, [completedChallengeIds, ONBOARDING_IDS]);

  const onboardingCompletedCount = ONBOARDING_IDS.filter(id => completedChallengeIds.has(id.toLowerCase())).length;
  const onboardingRequiredCount = 3;
  const isOnboardingComplete = ONBOARDING_IDS.every(id => completedChallengeIds.has(id.toLowerCase()));
  
  const fieldType = profile?.fieldType || null;
  const fieldClassificationComplete = !!profile?.fieldClassificationComplete;
  const productPersonaLens = profile?.productPersonaLens || 'frankie';
  const onboardingCompleted = !!profile?.onboardingCompleted || isOnboardingComplete;
  
  // 3. Stats & Scaling
  const pendingPoints = pendingEntries.reduce((sum, e) => sum + (e.pointsAwarded || 0), 0);
  const points = (overrides.points !== null) ? overrides.points : ((profile?.points || 0) + pendingPoints);
  const soloTripsCount = fieldTokens; // Map unique missions to solo count for display as per user intent
  
  const completedCoreChallenges = React.useMemo(() => {
    return Array.from(completedChallengeIds).filter(id => {
      const mission = (MOCK_TRIPS as any[]).find(m => m.id === id);
      return mission?.lane === 'core' || id.startsWith('starter-');
    }).length;
  }, [completedChallengeIds]);

  const isAdmin = (overrides.isAdmin !== null) ? overrides.isAdmin : (profile?.role === 'admin' || (user?.email === 'hammer808@gmail.com' && (user?.emailVerified || user?.emailVerified === null)));

  // 4. Game State & Unlocks
  const gameState: GameState = {
    userId: user?.uid || null,
    email: user?.email || null,
    points,
    soloTripsCount,
    completedCoreChallenges,
    onboardingComplete: onboardingCompleted,
    fieldType,
    isAdmin,
    currentDate: overrides.date ? new Date(overrides.date) : getServerDate(),
  };

  const isSummerDeckUnlocked = ((isOnboardingComplete || profile?.onboardingCompleted || overrides.forceUnlocked) && isSummerDeckActive(gameState.currentDate)) || isAdmin;
  const isCrewUnlocked = (isOnboardingComplete || overrides.forceUnlocked) && isFeatureEnabled('crewDispatchEnabled');
  const crewUnlocked = isCrewUnlocked; // Backward compat for some views
  
  const isFieldCheckUnlocked = (checkFieldCheckMode(gameState) || overrides.forceUnlocked) && isFeatureEnabled('rivalMomentsEnabled');
  
  // 5. Persistence: Pending entries that failed to sync or are optimistic
  // This ensures they survive page refresh during beta.
  useEffect(() => {
    if (!user) {
      setPendingEntries([]);
      return;
    }
    const key = `field_log_pending_${user.uid}`;
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        setPendingEntries(JSON.parse(saved));
      }
    } catch (e) {
      console.warn("[AppContext] Failed to load pending log:", e);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const key = `field_log_pending_${user.uid}`;
    if (pendingEntries.length > 0) {
      localStorage.setItem(key, JSON.stringify(pendingEntries));
    } else {
      localStorage.removeItem(key);
    }
  }, [user, pendingEntries]);

  // Reconciliation: Remove pending entries if they have synced and appeared in the server list
  useEffect(() => {
    if (entries.length > 0 && pendingEntries.length > 0) {
      const syncedTripIds = new Set(entries.map(e => e.tripId));
      const stillPending = pendingEntries.filter(p => !syncedTripIds.has(p.tripId));
      if (stillPending.length !== pendingEntries.length) {
        console.log(`[AppContext] Reconciled ${pendingEntries.length - stillPending.length} pending entries with server data.`);
        setPendingEntries(stillPending);
      }
    }
  }, [entries]);

  // Sync Global Kill Switches
  useEffect(() => {
    syncServerTime();
    return watchGlobalConfig(setGlobalConfig);
  }, []);

  // Sync App Config
  useEffect(() => {
    return subscribeToAppConfig((config) => {
      if (config) {
        setGameConfig(config);
      } else if (import.meta.env.DEV) {
        setGameConfig(DEV_APP_CONFIG as any);
      }
    });
  }, []);
  useEffect(() => {
    const seasonId = gameConfig?.activeSeasonId;
    if (!seasonId) {
      setActiveSeason(DEV_SEASON);
      return;
    }
    return subscribeToActiveSeason(seasonId, (season) => {
      if (season) {
        setActiveSeason(season);
      } else {
        setActiveSeason(DEV_SEASON);
      }
    });
  }, [gameConfig?.activeSeasonId]);

  const refreshConsent = async () => {
    if (!user) return;
    const consent = await getLatestConsent(user.uid);
    setLegalConsent(consent);
    setHasConfirmedLegal(isConsentValid(consent));
  };

  // Sync Memories
  useEffect(() => {
    if (!user) {
      setMemories([]);
      return;
    }
    return subscribeToUserMemories(user.uid, (data) => {
      setMemories(data);
    });
  }, [user]);

  // Auth listener
  useEffect(() => {
    if (!auth) {
      console.warn("[AppContext] Firebase Auth not initialized.");
      setLoading(false);
      return;
    }
    return onAuthStateChanged(auth, async (u) => {
      try {
        setUser(u);
        if (u) {
          setLoading(true);
          // Parallel fetch for speed
          const [consent, p] = await Promise.all([
            getLatestConsent(u.uid).catch(err => {
              console.warn("Targeted legal consent fetch failed (non-existent?):", err);
              return null;
            }),
            getOrCreateProfile(u)
          ]);
          
          setLegalConsent(consent);
          // If consent is missing, we consider it not confirmed yet, which is fine
          setHasConfirmedLegal(consent ? isConsentValid(consent) : false);
          setProfile(p);
          
          // Blocks subscription
          const unsubBlocks = subscribeToBlocks(u.uid, setBlockedIds);
          
          setLoading(false);
          return () => {
            unsubBlocks();
          };
        } else {
          setProfile(null);
          setEntries([]);
          setLegalConsent(null);
          setHasConfirmedLegal(false);
          setLoading(false);
        }
      } catch (err: any) {
        console.error("Critical Auth Initialization Error:", err);
        setError(err.message || "BUREAU_SYSTEM_FAILURE: Could not initialize field profile.");
        setLoading(false);
      }
    });
  }, []);

  // Sync profile
  useEffect(() => {
    if (!user) return;
    return subscribeToProfile(user.uid, (p) => {
      setProfile(p);
    });
  }, [user]);

  // Sync entries (Subscription for real-time updates)
  useEffect(() => {
    if (!user) {
      setEntries([]);
      return;
    }
    
    const q = query(
      collection(db, 'entries'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Entry));
      setEntries(docs);
      
      setLastVisibleEntry(snapshot.docs[snapshot.docs.length - 1]);
      setHasMoreEntries(docs.length === 20);
    }, (error) => {
      console.warn("[AppContext] Entry subscription skipped (likely pending accessStatus):", error.message);
      setEntries([]);
    });
  }, [user]);

  const loadMoreEntries = async () => {
    if (!user || !hasMoreEntries) return;
    const result = await getUserEntriesPage(user.uid, 10, lastVisibleEntry);
    if (result) {
      // Since we now have a subscription for the first 20, we need to be careful about merging.
      // But for simplicity, we can still use the page fetch for "history".
      // However, if the subscription is active, it will keep the first 20 sync'd.
      setEntries(prev => {
        const newDocs = result.docs.filter(doc => !prev.some(p => p.id === doc.id));
        return [...prev, ...newDocs];
      });
      setLastVisibleEntry(result.lastVisible);
      setHasMoreEntries(result.docs.length === 10);
    }
  };

  // Sync standings
  useEffect(() => {
    if (!user) {
      setStandings([]);
      return;
    }
    return subscribeToTopStandings((newStandings) => {
      setStandings(newStandings);
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

  // Sync field checks
  useEffect(() => {
    if (!user) return;
    return subscribeToIncomingFieldChecks(user.uid, (events: FieldCheck[]) => {
      setIncomingFieldChecks(events);
    });
  }, [user]);

  // Sync Trips
  useEffect(() => {
    if (!user) {
      setTrips([]);
      return;
    }
    return subscribeToChallenges((data) => {
      setTrips(data as TripType[]);
    });
  }, [user]);

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
    checkRankBadges(user.uid, profile.points, profile.points - 1, profile.previousRank);
  }, [profile?.points]);

  // Sync / Detect New Badges for Rewards
  useEffect(() => {
    if (!profile || !badgeProgress.length) return;
    
    // Check for Crew Mode Unlock (Major Reveal)
    if (profile.crewModeUnlocked && !profile.crewModeSeen) {
       queueReward({
         type: 'milestone',
         intensity: RewardIntensity.MAJOR_REVEAL,
         title: "Crew Mode Engaged",
         description: "You have proven you can be trusted with mild group-based nonsense.",
         rewardText: "CREW COLLECTIONS",
         iconName: 'Users'
       });
       markCrewModeSeen();
    }

    const seenBadges = new Set(profile.seenBadges || []);
    const unlocked = badgeProgress.filter(p => p.isUnlocked && !seenBadges.has(p.badgeId));
    
    unlocked.forEach(p => {
      const badge = BADGE_DEFINITIONS.find(b => b.id === p.badgeId);
      if (badge) {
        const isFirstBadge = (profile.seenBadges?.length || 0) === 0;
        const isAura = badge.unlockReward.toLowerCase().includes('aura');

        queueReward({
          type: isAura ? 'aura' : 'badge',
          intensity: isFirstBadge ? RewardIntensity.MAJOR_REVEAL : RewardIntensity.MEDIUM_REWARD,
          title: badge.title,
          description: isFirstBadge ? badge.description : undefined,
          rewardText: badge.unlockReward,
          iconName: badge.icon,
          rarity: badge.rarity
        });
        markBadgeAsSeen(badge.id);
      }
    });
  }, [badgeProgress, profile?.seenBadges, profile?.crewModeUnlocked]);

  // Detect Progress Changes (Micro Feedback)
  const prevProgress = useRef<UserBadgeProgress[]>([]);
  useEffect(() => {
    if (!badgeProgress.length || !prevProgress.current.length) {
      prevProgress.current = badgeProgress;
      return;
    }

    badgeProgress.forEach(curr => {
      const prev = prevProgress.current.find(p => p.badgeId === curr.badgeId);
      if (prev && curr.fragmentCount > prev.fragmentCount && !curr.isUnlocked) {
        const badge = BADGE_DEFINITIONS.find(b => b.id === curr.badgeId);
        queueReward({
          type: 'progress',
          intensity: RewardIntensity.MEDIUM_REWARD,
          title: `${badge?.title || 'FRAGMENT'} OBTAINED`,
          rewardText: `${curr.fragmentCount}/${badge?.requiredFragments || '?'}`,
          iconName: 'Zap'
        });
      }
    });

    prevProgress.current = badgeProgress;
  }, [badgeProgress]);

  // Detect Rank Ups (Major Reveal)
  const prevPointsRef = useRef<number>(0);
  useEffect(() => {
    if (points === 0) return;
    if (prevPointsRef.current === 0) {
      prevPointsRef.current = points;
      return;
    }

    if (points > prevPointsRef.current) {
      // Trigger major reveal every 500 points as "Milestones"
      // Normal points are handled by evidence submission MEDIUM feedback
      const prevFiveHundred = Math.floor(prevPointsRef.current / 500);
      const currFiveHundred = Math.floor(points / 500);
      
      if (currFiveHundred > prevFiveHundred) {
        queueReward({
          type: 'milestone',
          intensity: RewardIntensity.MAJOR_REVEAL,
          title: `MILESTONE: ${currFiveHundred * 500} XP`,
          description: "Your accumulated data has reached a critical mass. The Bureau recognizes your dedication.",
          rewardText: "CLEARANCE_LEVEL_INCREASED",
          iconName: 'ShieldCheck'
        });
      }
    }

    prevPointsRef.current = points;
  }, [points]);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const completeOnboarding = async () => {
    if (!user) return;
    try {
      await secureCompleteOnboarding();
    } catch (err: any) {
      console.error("Failed to complete onboarding:", err.message);
    }
  };

  const updateAvatar = async (data: AvatarData) => {
    if (!user) return;
    await updateProfile(user.uid, { avatar: data });
    queueReward({
      type: 'action',
      intensity: RewardIntensity.MICRO_FEEDBACK,
      title: "Identity Updated",
      iconName: 'UserCircle'
    });
  };

  const markBadgeAsSeen = async (badgeId: string) => {
    if (!user || !profile) return;
    const currentSeen = profile.seenBadges || [];
    if (!currentSeen.includes(badgeId)) {
      await updateProfile(user.uid, { seenBadges: [...currentSeen, badgeId] });
    }
  };

  const markCrewModeSeen = async () => {
    if (!user) return;
    await updateProfile(user.uid, { crewModeSeen: true });
  };

  const toggleFrankieMode = async () => {
    if (!user || !profile) return;
    await updateProfile(user.uid, { frankieMode: !profile.frankieMode });
  };

  const updateTripProgress = async (tripId: string, progress: Partial<import('../components/ChallengeCard').EvidenceProgress>) => {
    if (!user) return;
    
    // Use granular dot-notation updates to prevent overwriting other evidence 
    // or other trips' progress when multiple updates happen rapidly (e.g. from effects)
    const updates: any = {};
    Object.entries(progress).forEach(([key, value]) => {
      updates[`tripProgress.${tripId}.${key}`] = value;
    });

    await updateProfile(user.uid, updates);
  };

  const grantPointsLocally = (amount: number, tripId: string, entryData?: any) => {
    if (!profile) return;
    
    // Prevent duplicate XP if missionId is already completed/scored for this user
    if (completedChallengeIds.has(tripId)) {
      console.log(`[AppContext] Duplicate mission submission rejected: ${tripId}`);
      return;
    }
    
    // 1. Create a local log entry if data is provided (for Field Log persistence across refreshes)
    if (entryData) {
      const localEntry: Entry = {
        id: `local_${Date.now()}_${tripId}`,
        userId: user?.uid || 'anonymous',
        tripId: tripId,
        status: 'approved',
        pointsAwarded: amount,
        createdAt: new Date().toISOString(),
        proofImage: entryData.proofImage || entryData.photo || '',
        tripTitle: entryData.title || 'Mission Record',
        syncStatus: 'sync_failed'
      } as any;
      
      setPendingEntries(prev => {
        // Prevent double-adding the same mission
        if (prev.some(e => e.tripId === tripId)) return prev;
        return [...prev, localEntry];
      });
    }

    queueReward({
      type: 'action',
      intensity: RewardIntensity.MEDIUM_REWARD,
      title: "Data Secured Locally",
      description: "Points awarded for field utility (local beta only).",
      rewardText: "XP_GRANTED",
      iconName: 'ShieldCheck'
    });
  };

  const addToMaybeList = async (tripId: string) => {
    if (!user || !profile) return;
    const currentList = profile.maybeList || [];
    if (!currentList.includes(tripId)) {
      await updateProfile(user.uid, { maybeList: [...currentList, tripId] });
      queueReward({
        type: 'action',
        intensity: RewardIntensity.MICRO_FEEDBACK,
        title: "Mission Queued",
        iconName: 'Plus'
      });
    }
  };

  const removeFromMaybeList = async (tripId: string) => {
    if (!user || !profile) return;
    const currentList = profile.maybeList || [];
    await updateProfile(user.uid, { maybeList: currentList.filter(id => id !== tripId) });
    queueReward({
      type: 'action',
      intensity: RewardIntensity.MICRO_FEEDBACK,
      title: "Queue Updated",
      iconName: 'Minus'
    });
  };

  const useComebackCard = async () => {
    if (!user || !profile || !profile.comebackCardActive) return;
    await awardPoints(user.uid, profile.name, 25, 'comeback_card', {
      description: "Comeback Card Redeemed"
    });
    await updateProfile(user.uid, { comebackCardActive: false });
  };

  const evaluateEntryProof = async (entryData: { note: string }, base64Image: string): Promise<ProofReview> => {
    if (!user || !profile) throw new Error('Not authenticated');
    const currentTrip = profile.activeTrip || trips[0];
    if (!currentTrip) throw new Error('No active trip found');

    const { evaluateProof } = await import('../services/proofService');
    return evaluateProof(
      user.uid,
      currentTrip.id,
      currentTrip.title,
      currentTrip.theAsk,
      entryData,
      base64Image
    );
  };

  const setFieldType = async (id: FieldTypeId) => {
    if (!user) return;
    const typeData = FIELD_TYPES[id];
    await updateProfile(user.uid, { 
      fieldType: id,
      fieldTypeName: typeData.name,
      fieldClassificationComplete: true
    });
  };

  const setProductPersonaLens = async (id: ProductPersonaLensId) => {
    if (!user) return;
    await updateProfile(user.uid, { 
      productPersonaLens: id
    });
  };

  const getEligibleDrawPool = React.useCallback((packId?: string): TripType[] => {
    const pack = packId ? getDeckPackById(packId) : null;
    const { eligibleMissions } = getCanonicalPool({
      missions: trips,
      completedMissionIds: completedChallengeIds,
      isOnboardingComplete,
      activePack: pack,
      isSummerDeckUnlocked,
      isAdmin,
    });
    return eligibleMissions;
  }, [trips, completedChallengeIds, isOnboardingComplete, isSummerDeckUnlocked, isAdmin]);

  const drawTrip = async (tripId?: string, packId?: string): Promise<TripType | null> => {
    if (!user || trips.length === 0) return null;
    
    if (tripId) {
      const specific = trips.find(t => t.id === tripId);
      if (specific) {
        await updateProfile(user.uid, { activeTrip: specific });
        return specific;
      }
    }

    // 1. Get the current eligible pool for the pack
    const eligiblePool = getEligibleDrawPool(packId);
    
    // 2. For a NEW draw, exclude the current active trip if possible
    let finalPool = eligiblePool.filter(t => {
      const activeId = activeTrip?.id ? activeTrip.id.toString().toLowerCase() : null;
      return activeId !== t.id.toString().toLowerCase();
    });

    // 3. If we filtered everything out (e.g. only 1 eligible left and it is active)
    // then allow it if we are in onboarding or if it is the last card in pack
    if (finalPool.length === 0 && eligiblePool.length > 0) {
      finalPool = eligiblePool;
    }

    if (finalPool.length === 0) return null;

    const newTrip = drawTripLogic(finalPool as any) as any;
    
    if (newTrip) {
      await updateProfile(user.uid, { activeTrip: newTrip });
    }
    
    return newTrip;
  };

  const useReroll = async () => {
    if (!user || !profile || profile.rerollsAvailable <= 0) return;
    try {
       await secureUseReroll();
       await drawTrip();
    } catch (err: any) {
       console.error("Reroll failed:", err.message);
    }
  };

  const addEntry = async (entryData: Omit<Entry, 'id' | 'createdAt' | 'status' | 'pointsAwarded' | 'userName' | 'tripTitle'>): Promise<{ 
    entryId: string; 
    status: string; 
    review?: ProofReview;
    scoring?: any;
    ftBonus?: number;
    ftText?: string;
    newRewards?: { stickers: string[]; badges: string[] };
  }> => {
    if (!user || !profile) throw new Error('Not authenticated');
    
    const targetTripId = entryData.tripId || (profile.activeTrip?.id) || (trips[0]?.id);
    const currentTrip = trips.find(t => t.id === targetTripId) || profile.activeTrip || trips[0];
    
    if (!currentTrip) throw new Error('No valid trip found for submission');

    const result = await submitEntryLogic(
      user.uid,
      profile.name,
      currentTrip as any,
      {
        proofImage: entryData.proofImage,
        originalImageUrl: entryData.originalImageUrl,
        fieldNote: entryData.fieldNote,
        selectedLevel: entryData.selectedLevel,
        detourCompleted: entryData.detourCompleted,
        crewId: entryData.crewId || profile.crewId || undefined,
        userAvatar: profile.avatar || undefined, 
        
        // Pass through viewfinder meta
        uploadSource: entryData.uploadSource,
        photoTakenAt: entryData.photoTakenAt,
        fileLastModifiedAt: entryData.fileLastModifiedAt,
        submittedAt: entryData.submittedAt,
        metadataStatus: entryData.metadataStatus,
        captureTrustLevel: entryData.captureTrustLevel,
        filterUsed: entryData.filterUsed,
        filterIntensity: entryData.filterIntensity,
        reviewStatus: entryData.reviewStatus
      },
      activeSeason
    );

    if (!result) throw new Error('Submission failed');

    const { entryId, status, review, scoring, ftBonus, ftText, newRewards } = result;
    setLastReview(review);

    if (profile.crewId && status === 'approved') {
      await processLoreForEntry(profile.crewId, { id: entryId, status: 'approved' } as any);
    }

    if (status === 'approved') {
      const entryObj = {
        ...entryData,
        id: entryId,
        tripId: currentTrip.id,
        category: (currentTrip as any).type
      };

      queueReward({
        type: 'action',
        intensity: RewardIntensity.MEDIUM_REWARD,
        title: "Evidence Logged",
        description: "Field data successfully captured and verified.",
        rewardText: "XP_GRANTED",
        iconName: 'ClipboardCheck'
      });

      if (isFeatureEnabled('badgeFragmentsEnabled')) {
        evaluateEntryForBadges(user.uid, entryObj as any);
      }

      if (profile.crewId && isFeatureEnabled('crewArtifactsEnabled')) {
        evaluateEntryForArtifacts(profile.crewId, user.uid, profile.name, entryObj as any);
      }

      if (isFeatureEnabled('appObservationsEnabled')) {
        generateObservation(user.uid, profile.crewId || null, [entryObj as any, ...entries], { rankImproved: false });
      }
    } else {
      queueReward({
        type: 'action',
        intensity: RewardIntensity.MICRO_FEEDBACK,
        title: "Protocol Logged",
        iconName: 'Server'
      });
    }
    
    return { entryId, status, review, scoring, ftBonus, ftText, newRewards };
  };

  const useFieldCheck = async (params: { targetId: string; reason: FieldCheckType; details: string }) => {
    if (!user || !profile || !canRequestFieldCheck(profile.fieldCheckHistory || [])) return;
    
    // Attempt to find missionId if possible
    const missionId = 'unknown'; 
    const targetUserId = 'unknown-for-demo'; 

    await submitFieldCheck({
      submissionId: params.targetId,
      missionId: missionId,
      reportedUserId: targetUserId,
      reason: params.reason as any,
      note: params.details,
    });

    queueReward({
      type: 'action',
      intensity: RewardIntensity.MEDIUM_REWARD,
      title: "Field Check Logged",
      description: "Anomaly report submitted for Bureau review.",
      iconName: 'ShieldAlert'
    });

    const newHistory = [...(profile.fieldCheckHistory || []), getServerDate().toISOString()];
    await updateProfile(user.uid, {
      fieldCheckHistory: newHistory
    });
  };

  const resolveIncomingFieldCheck = async () => {
    if (!incomingFieldChecks.length || !user || !profile) return;
    const latest = incomingFieldChecks[0];
    // In summer season, admin resolves these, but user can dismiss notifications
    if (latest.id) {
      // Logic for user dismissing their notification (not necessarily deleting the audit)
      // For now we use the service to "resolve" it
      await resolveFieldCheck(latest.id, 'dismissed');
    }
  };

  const clearReview = () => setLastReview(null);

  const handleDismissObservation = async (msgId: string) => {
    await dismissObservation(msgId);
  };

  const toggleFavoriteMemory = async (memoryId: string, isFavorite: boolean) => {
    if (!user) return;
    await toggleMemoryFav(user.uid, memoryId, isFavorite);
  };

  const queueReward = (reward: Omit<RewardQueueItem, 'id'>) => {
    const id = Math.random().toString(36).substring(7);
    const item = { ...reward, id };
    
    // Check session limits for MAJOR_REVEAL
    if (item.intensity === RewardIntensity.MAJOR_REVEAL) {
      if (sessionSeenRewards.has(item.type)) {
        // Downgrade to MEDIUM if already seen in session
        item.intensity = RewardIntensity.MEDIUM_REWARD;
      } else {
        setSessionSeenRewards(prev => new Set(prev).add(item.type));
      }
    }
    
    setRewardQueue(prev => [...prev, item]);
  };

  const dismissReward = (id: string) => {
    setRewardQueue(prev => prev.filter(r => r.id !== id));
  };

  const isSeasonActive = activeSeason?.status === 'active' || isAdmin || import.meta.env.DEV;
  const isLocked = (checkViewfinderLocked(gameState) || (!isSeasonActive && !isAdmin)) && !overrides.forceUnlocked && !import.meta.env.DEV;

  const canFieldCheckNow = canRequestFieldCheck(profile?.fieldCheckHistory || []) && isFieldCheckUnlocked;
  const activeTrip = profile?.activeTrip || null;
  const rerollsAvailable = profile?.rerollsAvailable || 0;
  const incomingFieldCheck = incomingFieldChecks.length > 0 ? incomingFieldChecks[0] : null;

  const currentWeekNumber = activeSeason ? getCurrentSeasonWeek(activeSeason) : 0;
  const activeWeekDrop = activeSeason ? getActiveWeekDrop(activeSeason) : null;
  const [activeSabotages, setActiveSabotages] = useState<ActiveSabotage[]>([]);

  useEffect(() => {
    if (!activeSeason || currentWeekNumber <= 0) return;
    getWeeklySabotages(currentWeekNumber).then(setActiveSabotages);
  }, [activeSeason, currentWeekNumber]);

  const handleDeploySabotage = async (targetId: string, cardId: string, severity: 'minor' | 'major', attackerCrewId?: string) => {
    if (!user || !activeSeason) return;
    await deploySabotage(user.uid, targetId, cardId, currentWeekNumber, severity, attackerCrewId);
    const updated = await getWeeklySabotages(currentWeekNumber);
    setActiveSabotages(updated);
  };

  const handleActivateShield = async () => {
    if (!user) return;
    await activateSabotageShield(user.uid);
    // Refresh profile would happen naturally via listeners normally, 
    // but we can trigger a manual fetch or just let the persistent profile listener handle it.
  };

  const [userVotes, setUserVotes] = useState<any[]>([]);

  useEffect(() => {
    if (!user || currentWeekNumber <= 0) return;
    getVotesForUser(user.uid, currentWeekNumber).then(setUserVotes);
  }, [user, currentWeekNumber]);

  const handleCastVote = async (entryId: string, weekNumber: number, category: any) => {
    if (!user) throw new Error('Not authenticated');
    await castVote(user.uid, entryId, weekNumber, category);
    const updatedVotes = await getVotesForUser(user.uid, weekNumber);
    setUserVotes(updatedVotes);
  };

  const handleIsWeekUnlocked = (weekNumber: number) => activeSeason ? isWeekUnlocked(activeSeason, weekNumber) : false;
  const handleIsWeekLocked = (weekNumber: number) => activeSeason ? isWeekLocked(activeSeason, weekNumber) : true;
  const handleIsReviewWindowOpen = (weekNumber: number) => activeSeason ? isReviewWindowOpen(activeSeason, weekNumber) : false;
  const handleIsVotingWindowOpen = (weekNumber: number) => activeSeason ? isVotingWindowOpen(activeSeason, weekNumber) : false;
  const handleCanSubmitToChallenge = (weekNumber: number) => activeSeason ? canSubmitToChallenge(activeSeason, weekNumber) : true;
  const handleCanCallFieldCheck = (weekNumber: number) => activeSeason ? canCallFieldCheck(activeSeason, weekNumber) : false;
  const handleCanShunIt = () => canShunIt(activeSeason);
  const handleGetSubmissionPointWindow = (weekNumber: number) => activeSeason ? getSubmissionPointWindow(activeSeason, weekNumber) : 'full' as const;

  return (
    <AppContext.Provider value={{
      user,
      profile,
      loading,
      error,
      globalConfig,
      gameConfig,
      activeSeason,
      fieldType,
      fieldClassificationComplete,
      onboardingCompleted,
      setFieldType,
      productPersonaLens,
      setProductPersonaLens,
      entries: [...pendingEntries, ...entries],
      loadMoreEntries,
      hasMoreEntries,
      addEntry,
      activeTrip,
      drawTrip,
      trips,
      points,
      soloTripsCount,
      completedCoreChallenges,
      completedOnboardingMissionIds,
      onboardingCompletedCount,
      onboardingRequiredCount,
      isOnboardingComplete,
      getEligibleDrawPool,
      isSummerDeckUnlocked,
      crewUnlocked,
      isCrewUnlocked,
      currentDate: gameState.currentDate,
      isFieldCheckUnlocked,
      rerollsAvailable,
      fieldTokens,
      useReroll,
      fieldCheckEvents: incomingFieldChecks,
      useFieldCheck,
      canFieldCheckNow,
      incomingFieldCheck,
      resolveIncomingFieldCheck,
      standings,
      memories,
      toggleFavoriteMemory,
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
      currentWeekNumber,
      activeWeekDrop,
      isWeekUnlocked: handleIsWeekUnlocked,
      isWeekLocked: handleIsWeekLocked,
      isReviewWindowOpen: handleIsReviewWindowOpen,
      isVotingWindowOpen: handleIsVotingWindowOpen,
      activeSabotages,
      deploySabotage: handleDeploySabotage,
      activateShield: handleActivateShield,
      sabotageCards: SABOTAGE_CARDS,
      canSubmitToChallenge: handleCanSubmitToChallenge,
      canCallFieldCheck: handleCanCallFieldCheck,
      canShunIt: handleCanShunIt,
      getSubmissionPointWindow: handleGetSubmissionPointWindow,
      castVote: handleCastVote,
      userVotes,
      legalConsent,
      hasConfirmedLegal,
      blockedIds,
      refreshConsent,
      updateProfile,
      isFeatureEnabled,
      markBadgeAsSeen,
      dismissObservation: handleDismissObservation,
      completedChallengeIds,
      rewardQueue,
      queueReward,
      dismissReward,
      updateAvatar,
      signInWithGoogle,
      signOut,
      completeOnboarding,
      markCrewModeSeen,
      toggleFrankieMode,
      updateTripProgress,
      grantPointsLocally,
      addToMaybeList,
      removeFromMaybeList,
      useComebackCard,
      evaluateEntryProof
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
