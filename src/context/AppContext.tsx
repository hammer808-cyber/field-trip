import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../lib/firebase';
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, User } from 'firebase/auth';
import { FieldTypeId, FIELD_TYPES, Entry, ProductPersonaLensId } from '../constants';
import { AvatarData } from '../types/avatar';
import { TripCard as TripType } from '../types/challenges';
import { MOCK_USERS } from '../data/mockUsers';
import { MOCK_TRIPS } from '../constants';
import { 
  drawChallenge as drawTripLogic, 
  applyFieldTypeModifier,
  drawChallenge
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
import { UserBadgeProgress } from '../types/badges';

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

import { watchGlobalConfig, getGlobalConfig, GlobalConfig } from '../services/configService';

interface AppContextType {
  user: User | null;
  profile: UserProfile | null;
  legalConsent: any | null;
  hasConfirmedLegal: boolean;
  fieldClassificationComplete: boolean;
  onboardingCompleted: boolean;
  blockedIds: string[];
  refreshConsent: () => Promise<void>;
  loading: boolean;
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
  addEntry: (entry: { 
    tripId?: string; 
    proofImage: string; 
    originalImageUrl?: string;
    fieldNote: string; 
    selectedLevel: 'Scout' | 'Explorer' | 'Legend'; 
    detourCompleted: boolean; 
    crewId?: string;
    uploadSource?: 'camera' | 'upload';
    photoTakenAt?: string | null;
    fileLastModifiedAt?: string | null;
    submittedAt?: string;
    metadataStatus?: 'verified' | 'missing' | 'suspicious';
    captureTrustLevel?: string;
    filterUsed?: string;
    filterIntensity?: number;
    reviewStatus?: string;
  }) => Promise<{ entryId: string; status: string; review?: ProofReview }>;
  activeTrip: TripType | null;
  drawTrip: () => Promise<void>;
  trips: TripType[];
  points: number;
  soloTripsCount: number;
  isCrewUnlocked: boolean;
  isFieldCheckUnlocked: boolean;
  rerollsAvailable: number;
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
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  markCrewModeSeen: () => Promise<void>;
  updateAvatar: (data: AvatarData) => Promise<void>;
  togglePlainMode: () => Promise<void>;
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
  const [entries, setEntries] = useState<Entry[]>([]);
  const [lastVisibleEntry, setLastVisibleEntry] = useState<any>(null);
  const [hasMoreEntries, setHasMoreEntries] = useState(true);
  const [standings, setStandings] = useState<UserProfile[]>([]);
  const [incomingFieldChecks, setIncomingFieldChecks] = useState<FieldCheck[]>([]);
  const [trips, setTrips] = useState<TripType[]>([]);
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
  
  // Sync Global Kill Switches
  useEffect(() => {
    syncServerTime();
    return watchGlobalConfig(setGlobalConfig);
  }, []);

  // Sync App Config

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
        const consent = await getLatestConsent(u.uid);
        setLegalConsent(consent);
        setHasConfirmedLegal(isConsentValid(consent));
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

  // Sync profile
  useEffect(() => {
    if (!user) return;
    return subscribeToProfile(user.uid, (p) => {
      setProfile(p);
    });
  }, [user]);

  // Sync entries
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
    return subscribeToIncomingFieldChecks(user.uid, (events) => {
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

  const updateAvatar = async (data: AvatarData) => {
    if (!user) return;
    await updateProfile(user.uid, { avatar: data });
  };

  const markCrewModeSeen = async () => {
    if (!user) return;
    await updateProfile(user.uid, { crewModeSeen: true });
  };

  const togglePlainMode = async () => {
    if (!user || !profile) return;
    await updateProfile(user.uid, { plainMode: !profile.plainMode });
  };

  const addToMaybeList = async (tripId: string) => {
    if (!user || !profile) return;
    const currentList = profile.maybeList || [];
    if (!currentList.includes(tripId)) {
      await updateProfile(user.uid, { maybeList: [...currentList, tripId] });
    }
  };

  const removeFromMaybeList = async (tripId: string) => {
    if (!user || !profile) return;
    const currentList = profile.maybeList || [];
    await updateProfile(user.uid, { maybeList: currentList.filter(id => id !== tripId) });
  };

  const useComebackCard = async () => {
    if (!user || !profile || !profile.comebackCardActive) return;
    await updateProfile(user.uid, { points: profile.points + 25, comebackCardActive: false });
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

  const drawTrip = async () => {
    if (!user || trips.length === 0) return;
    
    let pool = trips;
    
    // If in season mode, only draw from current week's challenges
    if (activeSeason && activeWeekDrop) {
      const weeklyIds = [
        activeWeekDrop.fieldChallengeId,
        activeWeekDrop.evidenceChallengeId,
        activeWeekDrop.crewChallengeId
      ];
      pool = trips.filter(t => weeklyIds.includes(t.id));
    }

    const available = pool.filter(c => c.status === 'available');
    const newTrip = drawTripLogic(available.length > 0 ? available : pool as any) as any;
    await updateProfile(user.uid, { activeTrip: newTrip });
  };

  const useReroll = async () => {
    if (!user || !profile || profile.rerollsAvailable <= 0) return;
    await drawTrip();
    await updateProfile(user.uid, { rerollsAvailable: profile.rerollsAvailable - 1 });
  };

  const isFeatureEnabled = (flag: keyof AppConfig['featureFlags']) => {
    return gameConfig?.featureFlags[flag] ?? true;
  };

  const addEntry = async (entryData: { 
    tripId?: string; 
    proofImage: string; 
    originalImageUrl?: string;
    fieldNote: string; 
    selectedLevel: 'Scout' | 'Explorer' | 'Legend'; 
    detourCompleted: boolean; 
    crewId?: string;
    uploadSource?: 'camera' | 'upload';
    photoTakenAt?: string | null;
    fileLastModifiedAt?: string | null;
    submittedAt?: string;
    metadataStatus?: 'verified' | 'missing' | 'suspicious';
    captureTrustLevel?: string;
    filterUsed?: string;
    filterIntensity?: number;
    reviewStatus?: string;
  }): Promise<{ entryId: string; status: string; review?: ProofReview }> => {
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
        crewId: entryData.crewId || profile.crewId,
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

    const { entryId, status, review } = result;
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

  const useFieldCheck = async (params: { targetId: string; reason: FieldCheckType; details: string }) => {
    if (!user || !profile || !canRequestFieldCheck(profile.fieldCheckHistory || [])) return;
    
    // Find target user from entry (requires entry lookup usually, but for now we follow the payload)
    // In a real app we'd get targetUserId from the entry
    const targetUserId = 'unknown-for-demo'; 

    await submitFieldCheck({
      reporterId: user.uid,
      targetId: params.targetId,
      targetUserId: targetUserId,
      reason: params.reason,
      details: params.details,
      status: 'open'
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

  const fieldType = profile?.fieldType || null;
  const fieldClassificationComplete = !!profile?.fieldClassificationComplete;
  const productPersonaLens = profile?.productPersonaLens || 'frankie';
  const onboardingCompleted = !!profile?.onboardingCompleted;
  const points = overrides.points !== null ? overrides.points : (profile?.points || 0);
  const soloTripsCount = overrides.soloCount !== null ? overrides.soloCount : (profile?.soloTripsCount || 0);
  
  const isAdmin = overrides.isAdmin !== null ? overrides.isAdmin : (profile?.role === 'admin' || user?.email === 'hammer808@gmail.com');

  const gameState: GameState = {
    userId: user?.uid || null,
    email: user?.email || null,
    points,
    soloCount: soloTripsCount,
    onboardingComplete: onboardingCompleted,
    fieldType: fieldType,
    isAdmin,
    currentDate: overrides.date ? new Date(overrides.date) : getServerDate(),
  };

  const isCrewUnlocked = (profile?.crewModeUnlocked || checkCrewMode(gameState) || overrides.forceUnlocked) && isFeatureEnabled('crewDispatchEnabled');
  const isFieldCheckUnlocked = (checkFieldCheckMode(gameState) || overrides.forceUnlocked) && isFeatureEnabled('rivalMomentsEnabled');
  const isSeasonActive = activeSeason?.status === 'active' || isAdmin;
  const isLocked = (checkViewfinderLocked(gameState) || (!isSeasonActive && !isAdmin)) && !overrides.forceUnlocked;

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
      globalConfig,
      gameConfig,
      activeSeason,
      fieldType,
      fieldClassificationComplete,
      onboardingCompleted,
      setFieldType,
      productPersonaLens,
      setProductPersonaLens,
      entries,
      loadMoreEntries,
      hasMoreEntries,
      addEntry,
      activeTrip,
      drawTrip,
      trips,
      points,
      soloTripsCount,
      isCrewUnlocked,
      isFieldCheckUnlocked,
      rerollsAvailable,
      useReroll,
      fieldCheckEvents: [],
      useFieldCheck,
      canFieldCheckNow,
      incomingFieldCheck,
      resolveIncomingFieldCheck,
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
      isFeatureEnabled,
      markBadgeAsSeen: async () => {}, // Mocked out for now
      dismissObservation: handleDismissObservation,
      updateAvatar,
      signInWithGoogle,
      signOut,
      completeOnboarding,
      markCrewModeSeen,
      togglePlainMode,
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
