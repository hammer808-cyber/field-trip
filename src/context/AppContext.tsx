import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  collection, 
  doc,
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot 
} from 'firebase/firestore';
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, User } from 'firebase/auth';
import { FieldTypeId, FIELD_TYPES, Entry, ProductPersonaLensId, DEV_SEASON, DEV_APP_CONFIG, HEATWAVE_SEASON_START_DATE, HEATWAVE_SEASON_END_DATE } from '../constants';
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
  isHeatwaveDeckActive as isSummerDeckActive,
  isHeatwaveDeckStabilized as isSummerDeckStabilized,
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
import { awardDiscoverySticker } from '../services/discoveryService';
import { DISCOVERY_STICKERS, DiscoverySticker } from '../constants/discoveryStickers';
import { hasEarnedSticker } from '../services/stickerService';
import { castVote, getVotesForUser } from '../services/voteService';
import { StarterCompletionState } from '../utils/starterHelper';

import { evaluateEntryForBadges, subscribeToUserBadgeProgress, checkRankBadges } from '../services/badgeService';
import { BADGE_DEFINITIONS, UserBadgeProgress } from '../types/badges';

import { evaluateEntryForArtifacts, subscribeToCrewArtifacts } from '../services/artifactService';
import { CrewArtifact } from '../types/artifacts';

import { subscribeToObservations, generateObservation, dismissObservation } from '../services/observationService';
import { Observation } from '../types/observations';
import { getProofRequirement } from '../services/proofService';
import { ProofReview, ProofRequirement } from '../types/proof';
import { syncServerTime, getServerDate } from '../services/timeService';
import { LAUNCH_MISSION, LAUNCH_MISSION_ID, isLaunchMissionEligible } from '../data/specialMissions';
import { isArchivedEntry, normalizeEntryStatus } from '../logic/entryLogic';

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
import { DEFAULT_AVATAR } from '../constants/avatarAssets';
import { subscribeToBlocks } from '../services/moderationService';
import { getDeckPackById } from '../data/deckPacks';
import { FEATURE_FLAGS } from '../config/featureFlags';

import { 
  subscribeToUserMissionCards, 
  saveDrawnMissionCard, 
  updateMissionCardStatus,
  setActiveMissionCard
} from '../services/missionCardService';

import { watchGlobalConfig, getGlobalConfig, GlobalConfig } from '../services/configService';
import { getEligibleDrawPool as getCanonicalPool, ExclusionAnalysis, EligibleDrawPoolResult } from '../logic/deckLogic';
import {
  buildCanonicalProgress,
  canAccessFeature,
  getProgressMismatches,
  getStarterProgress,
  CanonicalProgressSnapshot,
  ProgressMismatch
} from '../services/canonicalProgress';
import { buildCanonicalStarterDeckState, STARTER_SIGNAL_IDS } from '../logic/starterDeckState';

import { 
  DrawnMissionCard, 
  DrawnMissionCardStatus 
} from '../types/game';

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
  authLoading: boolean;
  profileLoading: boolean;
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
  drawnMissionCards: DrawnMissionCard[];
  saveMissionCard: (card: Partial<DrawnMissionCard>) => Promise<string>;
  updateMissionCardStatus: (missionId: string, status: DrawnMissionCardStatus, extraData?: Partial<DrawnMissionCard>) => Promise<void>;
  setActiveMissionCard: (missionId: string) => Promise<void>;
  xp: number;
  points: number;
  pendingPoints: number;
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
  submittedPendingChallengeIds: Set<string>;
  approvedCompletedChallengeIds: Set<string>;
  rejectedChallengeIds: Set<string>;
  needsMoreProofChallengeIds: Set<string>;
  approvedEntriesCount: number;
  boldTripsCount: number;
  crewTripsCount: number;
  completedOnboardingMissionIds: string[];
  onboardingCompletedCount: number;
  onboardingRequiredCount: number;
  isOnboardingComplete: boolean;
  hasCompletedFieldKitOnboarding: boolean;
  hasCompletedGuidedFirstEntry: boolean;
  hasSeenFieldTypeResults: boolean;
  onboardingStarted: boolean;
  starterApprovedCount: number;
  starterState: StarterCompletionState;
  canonicalProgress: CanonicalProgressSnapshot;
  progressMismatches: ProgressMismatch[];
  pendingStarterCount: number;
  retryStarterCount: number;
  nextStarterAction: string;
  activeMissionId: string | null;
  activeSubmissionStatus: 'pending_review' | 'needs_more_proof' | 'rejected' | 'approved' | null;
  cameraPermissionReady: boolean;
  locationPermissionReady: boolean;
  isIOS: boolean;
  isStandalone: boolean;
  mustCompleteStarterMission: boolean;
  requestCamera: () => Promise<boolean>;
  requestLocation: () => Promise<boolean>;
  completeFieldKitOnboarding: () => Promise<void>;
  isTribunalUnlocked: boolean;
  getEligibleDrawPool: (packId?: string) => EligibleDrawPoolResult;
  isHeatwaveDeckUnlocked: boolean;
  isSocalSummerUnlocked: boolean;
  fieldGuideAssistEnabled: boolean;
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
  unlockDiscoverySticker: (discoveryKey: string, sourcePage?: string) => Promise<DiscoverySticker | null>;
  registerPulseAction: (actionType: 'submit_proof' | 'complete_mission' | 'vote' | 'add_field_note' | 'unlock_sticker', uniqueId?: string) => Promise<void>;
  updateTripProgress: (tripId: string, progress: Partial<import('../components/ChallengeCard').EvidenceProgress>) => Promise<void>;
  registerPendingSubmissionLocally: (amount: number, tripId: string, entryData?: any) => void;
  addToMaybeList: (tripId: string) => Promise<void>;
  removeFromMaybeList: (tripId: string) => Promise<void>;
  useComebackCard: () => Promise<void>;
  evaluateEntryProof: (entryData: { note: string }, base64Image: string) => Promise<ProofReview>;
  showHelpToast: (message: string) => void;
  retryMissionSubmission: (missionId: string) => Promise<void>;
  showCompass: (show: boolean) => void;
  isCompassOpen: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { overrides } = useDev();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdminFromCollection, setIsAdminFromCollection] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const loading = authLoading || profileLoading;
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
  const [drawnMissionCards, setDrawnMissionCards] = useState<DrawnMissionCard[]>([]);
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const pendingUnlocksRef = useRef<Set<string>>(new Set());
  
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

  const activeEntries = React.useMemo(() => {
    return entries.filter(entry => !isArchivedEntry(entry));
  }, [entries]);

  const canonicalStarterDeckState = React.useMemo(() => {
    return buildCanonicalStarterDeckState({
      userId: user?.uid || null,
      entries: activeEntries,
      profile,
      localPendingEntries: pendingEntries,
      drawnMissionCards,
      activeTripId: profile?.activeTrip?.id || profile?.activeMissionId || null,
    });
  }, [user?.uid, activeEntries, profile, pendingEntries, drawnMissionCards]);

  // 1. Unified Distinct Status Sets (Normalized Strings)
  // APPROVED completed submissions
  const approvedCompletedChallengeIds = React.useMemo(() => {
    const approved = new Set<string>();
    
    // Profile arrays are only a fallback before entry data has synced. Once entries
    // are present, live/non-archived entries are the source of truth after reset.
    if (entries.length === 0 && profile?.completedChallengeIds && Array.isArray(profile.completedChallengeIds)) {
      profile.completedChallengeIds.forEach(id => {
        if (id) approved.add(id.toLowerCase());
      });
    }

    // Scanned real-time server entries that are approved/completed
    activeEntries.forEach(e => {
      const status = normalizeEntryStatus(e.status);
      if (status === 'approved') {
        const id = normalizeId(e.missionId || e.challengeId || e.tripId);
        if (id) approved.add(id.toLowerCase());
      }
    });

    STARTER_SIGNAL_IDS.forEach(id => approved.delete(id));
    canonicalStarterDeckState.approvedIds.forEach(id => approved.add(id));

    return approved;
  }, [activeEntries, entries.length, profile?.completedChallengeIds, canonicalStarterDeckState]);

  // REJECTED submissions
  const rejectedChallengeIds = React.useMemo(() => {
    const rejected = new Set<string>();
    if (entries.length === 0 && profile?.rejectedChallengeIds && Array.isArray(profile.rejectedChallengeIds)) {
      profile.rejectedChallengeIds.forEach(id => {
        if (id) rejected.add(id.toLowerCase());
      });
    }
    activeEntries.forEach(e => {
      const status = normalizeEntryStatus(e.status);
      if (status === 'rejected') {
        const id = normalizeId(e.missionId || e.challengeId || e.tripId);
        if (id) rejected.add(id.toLowerCase());
      }
    });
    STARTER_SIGNAL_IDS.forEach(id => rejected.delete(id));
    canonicalStarterDeckState.rejectedIds.forEach(id => rejected.add(id));
    return rejected;
  }, [activeEntries, entries.length, profile?.rejectedChallengeIds, canonicalStarterDeckState]);

  // NEEDS MORE PROOF submissions
  const needsMoreProofChallengeIds = React.useMemo(() => {
    const needsMore = new Set<string>();
    if (entries.length === 0 && profile?.needsMoreProofChallengeIds && Array.isArray(profile.needsMoreProofChallengeIds)) {
      profile.needsMoreProofChallengeIds.forEach(id => {
        if (id) needsMore.add(id.toLowerCase());
      });
    }
    activeEntries.forEach(e => {
      const status = normalizeEntryStatus(e.status);
      if (status === 'needs_more_proof') {
        const id = normalizeId(e.missionId || e.challengeId || e.tripId);
        if (id) needsMore.add(id.toLowerCase());
      }
    });
    STARTER_SIGNAL_IDS.forEach(id => needsMore.delete(id));
    canonicalStarterDeckState.needsMoreProofIds.forEach(id => needsMore.add(id));
    return needsMore;
  }, [activeEntries, entries.length, profile?.needsMoreProofChallengeIds, canonicalStarterDeckState]);

  // SUBMITTED pending review
  const submittedPendingChallengeIds = React.useMemo(() => {
    const pending = new Set<string>();

    // Server-side pending documents are the only durable pending source.
    // Legacy profile arrays are intentionally ignored here because failed,
    // denied, or interrupted submissions can leave stale ids that burn cards.
    activeEntries.forEach(e => {
      const status = normalizeEntryStatus(e.status);
      if (status === 'pending_review') {
        const id = normalizeId(e.missionId || e.challengeId || e.tripId);
        if (id) pending.add(id.toLowerCase());
      }
    });

    // Client-side optimistic logs before Firestore sync complete
    pendingEntries.forEach(pe => {
      const id = normalizeId(pe.tripId || (pe as any).missionId);
      if (id) pending.add(id.toLowerCase());
    });

    // Prune approved / rejected / needs more proof so they don't block display state
    approvedCompletedChallengeIds.forEach(id => pending.delete(id.toLowerCase()));
    rejectedChallengeIds.forEach(id => pending.delete(id.toLowerCase()));
    needsMoreProofChallengeIds.forEach(id => pending.delete(id.toLowerCase()));
    STARTER_SIGNAL_IDS.forEach(id => pending.delete(id));
    canonicalStarterDeckState.pendingIds.forEach(id => pending.add(id));

    return pending;
  }, [activeEntries, pendingEntries, approvedCompletedChallengeIds, rejectedChallengeIds, needsMoreProofChallengeIds, canonicalStarterDeckState]);

  // Aliases and base metrics
  // STRICTION: completedChallengeIds points strictly to approved ones for unlocks!
  const completedChallengeIds = approvedCompletedChallengeIds;
  const fieldTokens = completedChallengeIds.size;

  // 2. Onboarding Requirements (The Ignored Place, Starter-2, Starter-3 / Any Unique Completed Missions)
  const ONBOARDING_IDS = React.useMemo(() => ["starter-1", "starter-2", "starter-3"], []);

  const completedOnboardingMissionIds = React.useMemo(() => {
    // STRICTION: For Summer unlock, only use APPROVED completed challenges
    const starters = ONBOARDING_IDS.filter(id => 
      completedChallengeIds.has(id.toLowerCase())
    );
    return starters;
  }, [completedChallengeIds, ONBOARDING_IDS]);

  const activeMissionId = profile?.activeMissionId || profile?.activeTrip?.id || null;
  const activeSubmissionStatus = (profile?.activeSubmissionStatus || profile?.activeTrip?.status || null) as 'pending_review' | 'needs_more_proof' | 'rejected' | 'approved' | null;

  // Canonical Starter Deck Gating State Calculation
  const starterState = React.useMemo(() => {
    const status: StarterCompletionState['status'] = canonicalStarterDeckState.starterComplete
      ? 'COMPLETE'
      : canonicalStarterDeckState.needsMoreProofIds.length > 0
        ? 'NEEDS_MORE_PROOF'
        : canonicalStarterDeckState.rejectedIds.length > 0
          ? 'REJECTED_RETRY_AVAILABLE'
          : canonicalStarterDeckState.starterSubmittedCount >= STARTER_SIGNAL_IDS.length
            ? 'PENDING_REVIEW'
            : canonicalStarterDeckState.starterSubmittedCount > 0 || canonicalStarterDeckState.activeDrawnIds.length > 0
              ? 'IN_PROGRESS'
              : 'NOT_STARTED';

    return {
      starterApprovedCount: canonicalStarterDeckState.starterApprovedCount,
      starterRequiredCount: STARTER_SIGNAL_IDS.length,
      starterComplete: canonicalStarterDeckState.starterComplete,
      pendingStarterCount: canonicalStarterDeckState.starterPendingCount,
      retryStarterCount: canonicalStarterDeckState.starterRejectedCount,
      needsMoreProofStarterCount: canonicalStarterDeckState.starterNeedsMoreProofCount,
      submittedUniqueCount: canonicalStarterDeckState.starterSubmittedCount,
      submittedMissionIds: canonicalStarterDeckState.submittedIds,
      needsMoreProofMissionId: canonicalStarterDeckState.needsMoreProofIds[0] || null,
      needsMoreProofEntryId: null,
      rejectedMissionId: canonicalStarterDeckState.rejectedIds[0] || null,
      rejectedEntryId: null,
      nextStarterAction: canonicalStarterDeckState.availableIds.length > 0 ? 'Draw Starter Mission' : 'View Review Status',
      status,
      canonical: {
        sourceById: canonicalStarterDeckState.sourceById,
        statusById: canonicalStarterDeckState.statusById
      }
    };
  }, [canonicalStarterDeckState]);

  const canonicalProgress = React.useMemo(() => buildCanonicalProgress({
    userId: user?.uid || null,
    profile,
    entries,
    pendingEntries,
    drawnMissionCards,
    trips,
    activeMissionId,
    activeSubmissionStatus,
    starterResetVersion: gameConfig?.starterResetVersion,
    activeStarterDeckId: gameConfig?.activeStarterDeckId
  }), [
    user?.uid,
    profile,
    entries,
    pendingEntries,
    drawnMissionCards,
    trips,
    activeMissionId,
    activeSubmissionStatus,
    gameConfig?.starterResetVersion,
    gameConfig?.activeStarterDeckId
  ]);

  const progressMismatches = React.useMemo(
    () => getProgressMismatches(canonicalProgress, profile),
    [canonicalProgress, profile]
  );

  const canonicalStarterProgress = getStarterProgress(canonicalProgress);
  const starterApprovedCount = canonicalStarterProgress.starterApprovedCount;
  const isOnboardingComplete = canonicalStarterProgress.starterComplete;
  const onboardingCompletedCount = canonicalStarterProgress.starterApprovedCount;
  const onboardingRequiredCount = 3;
  const onboardingCompleted = canonicalStarterProgress.starterComplete;

  // Track "Started Onboarding" (including pending) for some UI hints if needed,
  // but for hard gating we use isOnboardingComplete (Approved only)
  const onboardingAttemptedIds = React.useMemo(() => {
    return ONBOARDING_IDS.filter(id => 
      completedChallengeIds.has(id.toLowerCase()) || 
      submittedPendingChallengeIds.has(id.toLowerCase())
    );
  }, [completedChallengeIds, submittedPendingChallengeIds, ONBOARDING_IDS]);
  
  const fieldType = profile?.fieldType || null;
  const fieldClassificationComplete = !!profile?.fieldClassificationComplete;
  const productPersonaLens = profile?.productPersonaLens || 'frankie';
  const hasCompletedGuidedFirstEntry = !!profile?.hasCompletedGuidedFirstEntry;
  const hasSeenFieldTypeResults = !!profile?.hasSeenFieldTypeResults;
  const onboardingStarted = !!profile?.onboardingStarted;
  const hasCompletedFieldKitOnboarding = !!profile?.hasCompletedFieldKitOnboarding;

  const [cameraPermissionReady, setCameraPermissionReady] = useState(false);
  const [locationPermissionReady, setLocationPermissionReady] = useState(false);

  const requestCamera = async (): Promise<boolean> => {
    console.log('[FIELD_KIT_SETUP_START] Requesting camera permission (audio:false)...');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn("[FIELD_KIT_CAMERA_SKIPPED] getUserMedia not supported");
        setCameraPermissionReady(false);
        return false;
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      stream.getTracks().forEach(track => track.stop()); // Stop immediately, we just wanted the permission
      setCameraPermissionReady(true);
      console.log('[FIELD_KIT_CAMERA_COMPLETE] Camera permission granted.');
      return true;
    } catch (err) {
      console.warn("[FIELD_KIT_CAMERA_SKIPPED] Camera permission denied or failed:", err);
      setCameraPermissionReady(false);
      return false; // Resolve anyway to avoid blocking flow
    }
  };

  const requestLocation = async (): Promise<boolean> => {
    console.log('[FIELD_KIT_SETUP_START] Requesting geolocation permission...');
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.warn("[FIELD_KIT_LOCATION_SKIPPED] Geolocation not supported");
        setLocationPermissionReady(false);
        resolve(false);
        return;
      }

      const timeoutId = setTimeout(() => {
        console.warn("[FIELD_KIT_LOCATION_SKIPPED] Geolocation request timed out (5s)");
        resolve(false);
      }, 5000);

      navigator.geolocation.getCurrentPosition(
        () => {
          clearTimeout(timeoutId);
          setLocationPermissionReady(true);
          console.log('[FIELD_KIT_LOCATION_COMPLETE] Geolocation permission granted.');
          resolve(true);
        },
        (err) => {
          clearTimeout(timeoutId);
          console.warn("[FIELD_KIT_LOCATION_SKIPPED] Geolocation permission denied or failed:", err);
          setLocationPermissionReady(false);
          resolve(false); // Resolve anyway
        },
        { timeout: 5000, enableHighAccuracy: false }
      );
    });
  };

  const completeFieldKitOnboarding = async () => {
    if (!user) return;
    console.log('[FIELD_KIT_SETUP_COMPLETE] Finalizing field kit onboarding for profile:', user.uid);
    const now = new Date().toISOString();
    await handleUpdateProfile(user.uid, { 
      hasCompletedFieldKitOnboarding: true,
      fieldKitReady: true,
      permissionsPrompted: true,
      cameraPermissionGranted: cameraPermissionReady,
      locationPermissionGranted: locationPermissionReady,
      fieldKitCompletedAt: now,
      updatedAt: now,
      // Assign Launch mission if launch day eligible
      launchMissionAssigned: true,
      launchMissionId: LAUNCH_MISSION_ID,
      launchMissionAssignedAt: now,
      activeTrip: LAUNCH_MISSION
    });
  };
  
  // 3. Stats & Scaling
  const pendingPoints = React.useMemo(() => {
    // 1. Sum up local pending entries (optimistic points)
    const localSum = pendingEntries.reduce((sum, e) => sum + (e.pointsAwarded || (e as any).estimatedPoints || 150), 0);
    
    // 2. Avoid double-counting for entries currently in local pending
    const localPendingTripIds = new Set(pendingEntries.map(e => e.tripId));
    
    // 3. Sum up server-side entries that represent XP in-flight
    const serverPendingSum = activeEntries.reduce((sum, e) => {
      const isPendingXP = ['pending', 'pending_review', 'submitted_pending_review', 'submitted', 'under_field_check', 'needs_more_proof'].includes(e.status);
      if (isPendingXP && !localPendingTripIds.has(e.tripId)) {
        // Fallback chain for points: actual > estimated > base placeholder
        return sum + ((e as any).pointsAwarded || (e as any).estimatedPoints || 150);
      }
      return sum;
    }, 0);
    
    return localSum + serverPendingSum;
  }, [pendingEntries, activeEntries]);

  const xp = (overrides.xp !== null) ? overrides.xp : (profile?.xp !== undefined ? profile.xp : (profile?.points || 0));
  const points = xp;
  const soloTripsCount = (profile?.soloTripsCount !== undefined) ? profile.soloTripsCount : fieldTokens;
  const approvedEntriesCount = fieldTokens;
  const boldTripsCount = profile?.boldTripsCount || 0;
  const crewTripsCount = profile?.crewTripsCount || 0;
  
  // Dev-only diagnostic logging tracking the loading of stats
  React.useEffect(() => {
    if (import.meta.env.DEV && user) {
      console.log(`[AppContext_Diagnostic] Stats Loaded for User ${user.uid}:`, {
        points,
        approvedEntriesCount,
        completedChallengeIdsSize: completedChallengeIds.size,
        completedChallengeList: Array.from(completedChallengeIds),
        submittedPendingChallengeIdsSize: submittedPendingChallengeIds.size,
        needsMoreProofChallengeIdsSize: needsMoreProofChallengeIds.size,
        rejectedChallengeIdsSize: rejectedChallengeIds.size,
        onboardingCompletedCount
      });
    }
  }, [user, points, approvedEntriesCount, completedChallengeIds, submittedPendingChallengeIds, needsMoreProofChallengeIds, rejectedChallengeIds, onboardingCompletedCount]);

  
  const completedCoreChallenges = React.useMemo(() => {
    return Array.from(completedChallengeIds).filter(id => {
      const mission = (MOCK_TRIPS as any[]).find(m => m.id === id);
      return mission?.lane === 'core' || id.startsWith('starter-');
    }).length;
  }, [completedChallengeIds]);

  const isAdmin = (overrides.isAdmin !== null) 
    ? overrides.isAdmin 
    : (profile?.role === 'admin' || 
       isAdminFromCollection ||
       user?.uid === 'vX7K0XGkXRM2yPzhidv79Q59GqC2' ||
       (user?.email === 'hammer808@gmail.com' && (user?.emailVerified || user?.emailVerified === null)));

  const mustCompleteStarterMission = React.useMemo(() => {
    if (!profile || !user) return false;
    
    // Core check for the Guided Launch sequence
    // ONLY force it if it hasn't been submitted (pending, approved, or needs_more_proof)
    if (profile.hasCompletedGuidedFirstEntry === false && !submittedPendingChallengeIds.has(LAUNCH_MISSION_ID) && !completedChallengeIds.has(LAUNCH_MISSION_ID)) {
      return true;
    }

    return false;
  }, [profile, user, submittedPendingChallengeIds, completedChallengeIds]);

  // 4. Game State & Unlocks
  const gameState: GameState = {
    userId: user?.uid || null,
    email: user?.email || null,
    xp,
    points,
    soloTripsCount,
    completedCoreChallenges,
    onboardingComplete: onboardingCompleted,
    fieldType,
    isAdmin,
    currentDate: overrides.date ? new Date(overrides.date) : getServerDate(),
  };

  // Hard Gating: isHeatwaveDeckUnlocked requires ALL approved starter missions AND current date >= season start
  const isHeatwaveDeckUnlocked = React.useMemo(() => {
    if (isAdmin || overrides.forceUnlocked) return true;
    
    // Safety: If the user already has any approved heatwave missions, it must remain unlocked to prevent state-locking
    const hasHeatwaveProgress = Array.from(completedChallengeIds).some(id => {
      const mission = trips.find(t => t.id.toLowerCase() === id.toLowerCase());
      return (mission?.deckId || '').toLowerCase() === 'heatwave-receipts';
    });
    if (hasHeatwaveProgress) return true;

    if (!isOnboardingComplete) return false;
    return gameState.currentDate >= new Date(HEATWAVE_SEASON_START_DATE);
  }, [isAdmin, overrides.forceUnlocked, isOnboardingComplete, gameState.currentDate, completedChallengeIds, trips]);

  const isSocalSummerUnlocked = React.useMemo(() => {
    if (isAdmin || overrides.forceUnlocked) return true;
    
    const hasSocalProgress = Array.from(completedChallengeIds).some(id => {
      const mission = trips.find(t => t.id.toLowerCase() === id.toLowerCase());
      return (mission?.deckId || '').toLowerCase() === 'socal-summer';
    });
    if (hasSocalProgress) return true;

    return isOnboardingComplete;
  }, [isAdmin, overrides.forceUnlocked, isOnboardingComplete, completedChallengeIds, trips]);

  const fieldGuideAssistEnabled = isFeatureEnabled('fieldGuideAssistEnabled');
  
  // Tribunal access gate
  const isTribunalUnlocked = canAccessFeature(canonicalProgress, 'tribunal', {
    forceUnlocked: overrides.forceUnlocked,
    featureEnabled: isFeatureEnabled('tribunalEnabled')
  });

  const isCrewUnlocked = canAccessFeature(canonicalProgress, 'crew', {
    forceUnlocked: overrides.forceUnlocked,
    featureEnabled: isFeatureEnabled('crewDispatchEnabled')
  });
  const crewUnlocked = isCrewUnlocked; // Backward compat for some views
  
  const isFieldCheckUnlocked = (checkFieldCheckMode(gameState) || overrides.forceUnlocked) && isFeatureEnabled('rivalMomentsEnabled') && isTribunalUnlocked;
  
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

  // iOS / PWA detection
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent.toLowerCase();
    const isIPhone = ua.indexOf('iphone') > -1 || ua.indexOf('ipad') > -1;
    const isSafari = ua.indexOf('safari') > -1 && ua.indexOf('chrome') === -1;
    setIsIOS(isIPhone && isSafari);
    
    // @ts-ignore
    setIsStandalone(window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches);
  }, []);

  // Sync App Config
  useEffect(() => {
    if (user && isOnboardingComplete && !profile?.onboardingCompleted) {
      console.log("[AppContext] Starter missions logged. Triggering persistent onboarding completion check...");
      checkOnboardingState(user.uid).catch(err => {
        console.warn("[AppContext] checkOnboardingState background task failed:", err);
      });
    }
  }, [user, isOnboardingComplete, profile?.onboardingCompleted]);

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
    try {
      const consent = await getLatestConsent(user.uid);
      setLegalConsent(consent);
      setHasConfirmedLegal(isConsentValid(consent));
    } catch (err) {
      console.warn("Failed to refresh consent:", err);
    }
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
  const authUnsubRef = useRef<(() => void) | null>(null);
  const profileUnsubRef = useRef<(() => void) | null>(null);
  const blocksUnsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!auth) {
      console.warn("[AppContext] Firebase Auth not initialized.");
      setAuthLoading(false);
      setProfileLoading(false);
      return;
    }

    authUnsubRef.current = onAuthStateChanged(auth, async (u) => {
      console.log('[AppContext] Auth state changed:', u?.uid || 'null');
      
      // Clean up existing listeners on state change
      if (profileUnsubRef.current) {
        profileUnsubRef.current();
        profileUnsubRef.current = null;
      }
      if (blocksUnsubRef.current) {
        blocksUnsubRef.current();
        blocksUnsubRef.current = null;
      }

      try {
        setUser(u);
        setAuthLoading(false);
        
        if (u) {
          setProfileLoading(true);
          let profileTimeoutId: any;
          let profileTimedOut = false;
          const profileFetch = getOrCreateProfile(u);

          profileFetch.catch(err => {
            if (profileTimedOut) {
              console.info("[AppContext] Profile fetch rejected after timeout occurred:", err.message);
            }
          });

          const [consent, p] = await Promise.all([
            getLatestConsent(u.uid).catch(err => {
              console.warn("Targeted legal consent fetch failed (non-existent?):", err);
              return null;
            }),
            Promise.race([
              profileFetch,
              new Promise<UserProfile>((_, reject) => {
                profileTimeoutId = setTimeout(() => {
                  profileTimedOut = true;
                  reject(new Error('PROFILE_FETCH_TIMEOUT'));
                }, 4000);
              })
            ]).then(res => {
              clearTimeout(profileTimeoutId);
              return res;
            }).catch(err => {
              clearTimeout(profileTimeoutId);
              console.warn("[AppContext] Profile fetch/creation failed or timed out (offline?):", err);
              const fallback: UserProfile = {
                id: u.uid,
                name: u.displayName || 'Field Agent',
                email: u.email || '',
                photoURL: u.photoURL || '',
                fieldType: null,
                fieldTypeName: null,
                fieldClassificationComplete: false,
                productPersonaLens: 'frankie',
                avatar: DEFAULT_AVATAR,
                onboardingCompleted: false,
                crewModeUnlocked: false,
                crewModeSeen: false,
                xp: 0,
                weeklyXp: 0,
                seasonXp: 0,
                points: 0,
                soloTripsCount: 0,
                completedCoreChallenges: 0,
                boldTripsCount: 0,
                crewTripsCount: 0,
                rerollsAvailable: 3,
                activeTrip: null,
                lastSnitchDate: null,
                accessStatus: 'approved',
                createdAt: null as any,
                updatedAt: null as any
              };
              return fallback;
            })
          ]);
          clearTimeout(profileTimeoutId);
          
          console.log('[AppContext] Profile Hydra success:', p.id);
          
          setLegalConsent(consent);
          setHasConfirmedLegal(consent ? isConsentValid(consent) : false);
          setProfile(p);

          // Blocks subscription
          blocksUnsubRef.current = subscribeToBlocks(u.uid, setBlockedIds);

          setProfileLoading(false);
          
          // Profile live updates subscription
          profileUnsubRef.current = subscribeToProfile(u.uid, (updatedProfile) => {
            if (updatedProfile) {
              setProfile(updatedProfile);
            }
          });

        } else {
          setProfile(null);
          setEntries([]);
          setLegalConsent(null);
          setHasConfirmedLegal(false);
          setAuthLoading(false);
          setProfileLoading(false);
        }
      } catch (err: any) {
        console.error("Critical Auth Initialization Error:", err);
        setError(err.message || "BUREAU_SYSTEM_FAILURE: Could not initialize field profile.");
        setAuthLoading(false);
        setProfileLoading(false);
      }
    });

    return () => {
      if (authUnsubRef.current) authUnsubRef.current();
      if (profileUnsubRef.current) profileUnsubRef.current();
      if (blocksUnsubRef.current) blocksUnsubRef.current();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setDrawnMissionCards([]);
      return;
    }
    return subscribeToUserMissionCards(user.uid, (cards) => {
      console.log('[AppContext] Drawn mission cards sync:', cards.length);
      setDrawnMissionCards(cards);
    });
  }, [user]);

  // Sync profile
  useEffect(() => {
    if (!user) {
      setIsAdminFromCollection(false);
      return;
    }

    // Real-time admin check for Priority 1 Robustness
    const unsubAdmin = onSnapshot(doc(db, 'admins', user.uid), (snap) => {
      setIsAdminFromCollection(snap.exists());
    }, (err) => {
      console.warn("[AppContext] Admin check failed (likely permissions):", err.message);
      setIsAdminFromCollection(false);
    });

    const unsubProfile = subscribeToProfile(user.uid, (p) => {
      console.log('[AppContext] Profile sync update:', { 
        id: p.id, 
        fieldClassificationComplete: p.fieldClassificationComplete,
        onboardingCompleted: p.onboardingCompleted
      });
      setProfile(p);
      setProfileLoading(false);
    });

    return () => {
      unsubAdmin();
      unsubProfile();
    };
  }, [user]);

  // Sync entries (Subscription for real-time updates)
  useEffect(() => {
    if (!user) {
      setEntries([]);
      return;
    }
    
    // Query by canonical uid (new entries)
    const qUid = query(
      collection(db, 'entries'),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    // Query by legacy userId (old entries)
    const qUserId = query(
      collection(db, 'entries'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubUid = onSnapshot(qUid, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Entry));
      setEntries(prev => {
        const merged = [...prev];
        docs.forEach(d => {
          const idx = merged.findIndex(p => p.id === d.id);
          if (idx >= 0) merged[idx] = d;
          else merged.push(d);
        });
        return merged.sort((a, b) => {
           const ta = a.createdAt?.seconds || a.submittedAt?.seconds || 0;
           const tb = b.createdAt?.seconds || b.submittedAt?.seconds || 0;
           return tb - ta;
        }).slice(0, 50);
      });
    }, (err) => {
      console.warn("[AppContext] Entry sync (UID query) failed:", err.message);
    });

    const unsubUserId = onSnapshot(qUserId, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Entry));
      setEntries(prev => {
        const merged = [...prev];
        docs.forEach(d => {
          const idx = merged.findIndex(p => p.id === d.id);
          if (idx >= 0) merged[idx] = d;
          else merged.push(d);
        });
        return merged.sort((a, b) => {
           const ta = a.createdAt?.seconds || a.submittedAt?.seconds || 0;
           const tb = b.createdAt?.seconds || b.submittedAt?.seconds || 0;
           return tb - ta;
        }).slice(0, 50);
      });
    }, (err) => {
      console.warn("[AppContext] Entry sync (UserId query) failed:", err.message);
    });

    return () => {
      unsubUid();
      unsubUserId();
    };
  }, [user]);

  // Synchronize Field Pulse weekly transitions on load
  useEffect(() => {
    if (!profile || !user || !activeSeason) return;
    const weekNo = getCurrentSeasonWeek(activeSeason);
    if (weekNo <= 0) return;
    const weekId = `week-${weekNo}`;
    const pulse = profile.fieldPulse;
    
    if (pulse && pulse.currentWeekId !== weekId && weekId !== 'week-0') {
      console.log(`[FieldPulse] Advancing week from ${pulse.currentWeekId} to ${weekId}`);
      const updatedPulse = { ...pulse };
      const completed = pulse.completedActions >= 5;
      
      if (completed) {
        updatedPulse.pulseStreak = (updatedPulse.pulseStreak || 0) + 1;
        updatedPulse.lastPulseCompletedWeek = pulse.currentWeekId;
      } else if (pulse.graceTokens > 0) {
        updatedPulse.graceTokens = Math.max(0, pulse.graceTokens - 1);
        updatedPulse.lastGraceWeekUsed = pulse.currentWeekId;
        console.log(`[FieldPulse] Streak preserved via Grace Token for week ${pulse.currentWeekId}`);
      } else {
        updatedPulse.pulseStreak = 0;
        console.log(`[FieldPulse] Streak lost for week ${pulse.currentWeekId}`);
      }
      
      updatedPulse.currentWeekId = weekId;
      updatedPulse.completedActions = 0;
      updatedPulse.activeDays = [];
      updatedPulse.graceTokens = (updatedPulse.graceTokens || 0) + 1;
      
      handleUpdateProfile(user.uid, { fieldPulse: updatedPulse }).catch(err => {
         console.warn("[FieldPulse] Failed to advance week:", err);
      });
    } else if (!pulse) {
      const initialPulse = {
        currentWeekId: weekId,
        completedActions: 0,
        activeDays: [] as string[],
        graceTokens: 1,
        pulseStreak: 0,
        registeredEvents: [] as string[]
      };
      handleUpdateProfile(user.uid, { fieldPulse: initialPulse }).catch(err => {
         console.warn("[FieldPulse] Failed to initialize pulse:", err);
      });
    }
  }, [profile?.fieldPulse?.currentWeekId, user?.uid, activeSeason]);

  // Auto-register mission completed pulse action when entry status transitions to approved
  useEffect(() => {
    if (!profile || !user || entries.length === 0) return;
    const pulse = profile.fieldPulse;
    if (!pulse) return;
    
    entries.forEach(entry => {
      const isApproved = ['approved', 'auto_approved', 'approved_by_admin', 'retry-approved'].includes(entry.status || '');
      if (isApproved) {
        const eventKey = `complete_mission_${entry.id}`;
        const registered = pulse.registeredEvents?.includes(eventKey);
        if (!registered) {
          console.log(`[FieldPulse] Automatically registering newly approved mission as pulse action: ${entry.id}`);
          registerPulseAction('complete_mission', entry.id).catch(err => {
             console.warn("[FieldPulse] Failed to auto-register approved mission:", err);
          });
        }
      }
    });
  }, [entries, profile?.fieldPulse]);

  const loadMoreEntries = async () => {
    if (!user || !hasMoreEntries) return;
    try {
      const result = await getUserEntriesPage(user.uid, 10, lastVisibleEntry);
      if (result && !(result instanceof Error)) {
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
    } catch (err) {
      console.warn("Failed to load more entries:", err);
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
      console.log('[AppContext] Challenges sync:', data.length);
      
      // Merge mocks with Firestore data to ensure core missions are always available
      // favoring Firestore data if IDs match (using Firestore as "overrides")
      const merged: TripType[] = [...(data as TripType[])];
      const existingIds = new Set(data.map(m => m.id.toLowerCase()));
      
      // Inject Special Missions if eligible
      const currentDate = overrides.date ? new Date(overrides.date) : getServerDate();
      if (isLaunchMissionEligible(profile, currentDate, submittedPendingChallengeIds)) {
        if (!existingIds.has(LAUNCH_MISSION_ID.toLowerCase())) {
          merged.push(LAUNCH_MISSION as any);
          existingIds.add(LAUNCH_MISSION_ID.toLowerCase());
        }
      }

      MOCK_TRIPS.forEach(mock => {
        if (!existingIds.has(mock.id.toLowerCase())) {
          merged.push(mock as any);
        }
      });
      
      console.log(`[AppContext] Missions merged. Total: ${merged.length} (Firestore: ${data.length}, Mocks: ${merged.length - data.length})`);
      setTrips(merged);
    });
  }, [user, profile?.onboardingCompleted, profile?.completedSpecialMissionIds, overrides.date, submittedPendingChallengeIds]);

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
    const currentXP = profile.xp || (profile as any).points || 0;
    checkRankBadges(user.uid, currentXP, currentXP - 1, profile.previousRank).catch(err => {
       console.warn("[AppContext] checkRankBadges background task failed:", err);
    });
  }, [profile?.xp, profile?.points]);

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
       markCrewModeSeen().catch(err => console.warn("markCrewModeSeen failed:", err));
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
        markBadgeAsSeen(badge.id).catch(err => console.warn("markBadgeAsSeen failed:", err));
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
  
  // Detect Special Mission Approval
  useEffect(() => {
    if (!user || !profile || !approvedCompletedChallengeIds.has(LAUNCH_MISSION_ID.toLowerCase())) return;
    
    const completedSpecialIds = profile.completedSpecialMissionIds || [];
    if (!completedSpecialIds.includes(LAUNCH_MISSION_ID)) {
      console.log(`[AppContext] Launch mission approved! Updating completedSpecialMissionIds for ${user.uid}`);
      handleUpdateProfile(user.uid, {
        completedSpecialMissionIds: [...completedSpecialIds, LAUNCH_MISSION_ID]
      }).catch(err => console.warn("[AppContext] Failed to update special missions:", err));
    }
  }, [approvedCompletedChallengeIds, profile?.completedSpecialMissionIds, user?.uid]);

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

  const [starterRewardShown, setStarterRewardShown] = useState(false);
  const [isCompassOpen, setIsCompassOpen] = useState(false);

  const showHelpToast = (message: string) => {
    queueReward({
      type: 'action',
      intensity: RewardIntensity.MICRO_FEEDBACK,
      title: "Field Intelligence",
      description: message,
      iconName: 'Info'
    });
  };

  const showCompass = (show: boolean) => setIsCompassOpen(show);

  useEffect(() => {
    if (isOnboardingComplete && !starterRewardShown && user) {
      const isSeasonStarted = gameState.currentDate >= new Date(HEATWAVE_SEASON_START_DATE);
      
      queueReward({
        type: 'milestone',
        intensity: RewardIntensity.MAJOR_REVEAL,
        title: "Starter Pack complete!",
        description: isSeasonStarted 
          ? "Starter Pack complete! Summer Deck is now live."
          : "Starter Pack complete! Summer Deck opens Saturday.",
        rewardText: isSeasonStarted ? "CHOOSE SUMMER DECK" : "CHECK COUNTDOWN",
        redirectPath: '/deck',
        iconName: 'Zap'
      });
      setStarterRewardShown(true);
    }
  }, [isOnboardingComplete, starterRewardShown, user, gameState.currentDate]);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Sign in failed:", err.message);
      setError("AUTHENTICATION_FAILED: Bureau credentials rejected.");
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (err: any) {
      console.error("Sign out failed:", err.message);
    }
  };

  const handleUpdateProfile = async (uid: string, data: Partial<UserProfile>) => {
    console.log('[AppContext] updateProfile call:', uid, data);
    // Optimistic update
    setProfile(prev => prev ? { ...prev, ...data } as UserProfile : null);
    try {
      await updateProfile(uid, data);
    } catch (err) {
      console.error("Profile update failed, reverting optimistic state:", err);
      // If we wanted to be perfect we would revert here, but subscribeToProfile will sync the truth anyway
    }
  };

  const completeOnboarding = async () => {
    if (!user) return;
    // Optimistic update
    setProfile(prev => prev ? { ...prev, onboardingCompleted: true } as UserProfile : null);
    try {
      await secureCompleteOnboarding();
    } catch (err: any) {
      console.error("Failed to complete onboarding:", err.message);
    }
  };

  const updateAvatar = async (data: AvatarData) => {
    if (!user) return;
    try {
      await handleUpdateProfile(user.uid, { avatar: data });
      queueReward({
        type: 'action',
        intensity: RewardIntensity.MICRO_FEEDBACK,
        title: "Identity Updated",
        iconName: 'UserCircle'
      });
    } catch (err) {
      console.error("Avatar update failed:", err);
    }
  };

  const markBadgeAsSeen = async (badgeId: string) => {
    if (!user || !profile) return;
    try {
      const currentSeen = profile.seenBadges || [];
      if (!currentSeen.includes(badgeId)) {
        await handleUpdateProfile(user.uid, { seenBadges: [...currentSeen, badgeId] });
      }
    } catch (err) {
      console.warn("Failed to mark badge as seen:", err);
    }
  };

  const markCrewModeSeen = async () => {
    if (!user) return;
    try {
      await handleUpdateProfile(user.uid, { crewModeSeen: true });
    } catch (err) {
      console.warn("Failed to mark crew mode seen:", err);
    }
  };

  const toggleFrankieMode = async () => {
    if (!user || !profile) return;
    try {
      await handleUpdateProfile(user.uid, { frankieMode: !profile.frankieMode });
    } catch (err) {
      console.warn("Failed to toggle frankie mode:", err);
    }
  };

  const registerPulseAction = async (
    actionType: 'submit_proof' | 'complete_mission' | 'vote' | 'add_field_note' | 'unlock_sticker',
    uniqueId?: string
  ) => {
    if (!user || !profile) return;
    
    const weekNum = activeSeason ? getCurrentSeasonWeek(activeSeason) : 0;
    const weekId = activeSeason ? `week-${weekNum}` : 'week-0';
    
    // Safely parse current pulse
    const pulse = profile.fieldPulse ? { ...profile.fieldPulse } : {
      currentWeekId: weekId,
      completedActions: 0,
      activeDays: [] as string[],
      graceTokens: 1,
      pulseStreak: 0,
      registeredEvents: [] as string[]
    };
    
    // Check for duplicates
    if (uniqueId) {
      const eventKey = `${actionType}_${uniqueId}`;
      if (!pulse.registeredEvents) {
        pulse.registeredEvents = [];
      }
      if (pulse.registeredEvents.includes(eventKey)) {
        return; // already tracked!
      }
      pulse.registeredEvents.push(eventKey);
    }
    
    // If the week of the loaded pulse is outdated, run transition first
    if (pulse.currentWeekId !== weekId && weekId !== 'week-0') {
      const completed = pulse.completedActions >= 5;
      if (completed) {
        pulse.pulseStreak = (pulse.pulseStreak || 0) + 1;
      } else if (pulse.graceTokens > 0) {
        pulse.graceTokens = Math.max(0, pulse.graceTokens - 1);
        pulse.lastGraceWeekUsed = pulse.currentWeekId;
      } else {
        pulse.pulseStreak = 0;
      }
      
      pulse.currentWeekId = weekId;
      pulse.completedActions = 0;
      pulse.activeDays = [];
      pulse.graceTokens = (pulse.graceTokens || 0) + 1; // grant 1 grace token per week
    }
    
    // Track active day
    const todayStr = new Date().toISOString().split('T')[0];
    if (!pulse.activeDays) {
      pulse.activeDays = [];
    }
    if (!pulse.activeDays.includes(todayStr)) {
      pulse.activeDays.push(todayStr);
    }
    
    // Increment actions
    pulse.completedActions = (pulse.completedActions || 0) + 1;
    
    // Trigger Micro Reward for UI Stamp/Wiggle
    queueReward({
      type: 'action',
      intensity: RewardIntensity.MICRO_FEEDBACK,
      title: `${actionType.replace('_', ' ').toUpperCase()} SUCCESS`,
      iconName: actionType === 'vote' ? 'Vote' : actionType === 'unlock_sticker' ? 'Sparkles' : 'Camera'
    });
    
    // Check if pulse completes hits 5
    if (pulse.completedActions === 5) {
      pulse.pulseStreak = (pulse.pulseStreak || 0) + 1;
      pulse.lastPulseCompletedWeek = weekId;
      
      queueReward({
        type: 'milestone',
        intensity: RewardIntensity.MAJOR_REVEAL,
        title: "⚡ FIELD PULSE AT 100%!",
        description: "Your consistency metric is fully synchronized. Keep the campfire crackling to maintain momentum! Trevor nods with silent, campy approval.",
        rewardText: "PROUD PULSATOR DECAL UNLOCKED",
        iconName: 'Activity',
      });
    }
    
    try {
      await handleUpdateProfile(user.uid, { fieldPulse: pulse });
    } catch (err) {
      console.error("Pulse update failed:", err);
    }
  };

  const unlockDiscoverySticker = async (discoveryKey: string, sourcePage: string = 'unknown') => {
    if (!user || !profile) return null;

    // Prevent duplicate calls for the same key in the same session while one is in flight
    if (pendingUnlocksRef.current.has(discoveryKey)) return null;

    // Check if already unlocked locally to prevent wasting a call
    const stickerDef = DISCOVERY_STICKERS.find(s => s.discoveryKey === discoveryKey);
    const alreadyOwns = (profile.discoveryEvents?.[discoveryKey]) || 
                        (profile.unlockedRewards?.stickers?.includes(stickerDef?.id || 'MISSING_ID')) ||
                        (!!stickerDef && hasEarnedSticker(profile, stickerDef.id));
    if (alreadyOwns) return null;

    pendingUnlocksRef.current.add(discoveryKey);

    try {
      const result = await awardDiscoverySticker(user.uid, profile, discoveryKey, sourcePage);
      
      if (result) {
        const { sticker, completedGroups } = result;
        
        // Register field pulse action (increment action count)
        registerPulseAction('unlock_sticker', sticker.id);
        
        // 1. Queue Sticker Reward
        queueReward({
          type: 'sticker',
          intensity: RewardIntensity.MAJOR_REVEAL,
          title: "Sticker discovered!",
          description: sticker.description,
          rewardText: sticker.name,
          iconName: sticker.iconName,
          rarity: sticker.rarity as any,
          metadata: { stickerId: sticker.id }
        });

        // 2. Queue Group Completion Rewards
        if (completedGroups && completedGroups.length > 0) {
          completedGroups.forEach(group => {
            queueReward({
              type: 'milestone',
              intensity: RewardIntensity.MAJOR_REVEAL,
              title: `SET COMPLETE: ${group.name}`,
              description: group.completionCopy,
              rewardText: `+${group.xpReward} XP EARNED`,
              iconName: 'BadgeAlert'
            });
          });
        }

        return sticker;
      }
      return null;
    } finally {
      // Remove from pending so it can be tried again if it failed, 
      // but if it succeeded, the 'isAlreadyUnlocked' check at top will catch it next time.
      pendingUnlocksRef.current.delete(discoveryKey);
    }
  };

  React.useEffect(() => {
    if (!user || !profile) return;
    if (onboardingCompletedCount >= 1) {
      unlockDiscoverySticker('starter_signal_1', 'starter').catch(err => console.warn('starter_signal_1 sticker failed:', err));
      unlockDiscoverySticker('receipt_approved', 'starter').catch(err => console.warn('receipt_approved sticker failed:', err));
    }
    if (onboardingCompletedCount >= 3) {
      unlockDiscoverySticker('starter_signal_3_complete', 'starter').catch(err => console.warn('starter_signal_3_complete sticker failed:', err));
      unlockDiscoverySticker('crew_unlocked', 'starter').catch(err => console.warn('crew_unlocked sticker failed:', err));
      unlockDiscoverySticker('memories_unlocked', 'starter').catch(err => console.warn('memories_unlocked sticker failed:', err));
    }
  }, [user?.uid, profile, onboardingCompletedCount]);

  const updateTripProgress = async (tripId: string, progress: Partial<import('../components/ChallengeCard').EvidenceProgress>) => {
    if (!user) return;
    
    // Use granular dot-notation updates to prevent overwriting other evidence 
    // or other trips' progress when multiple updates happen rapidly (e.g. from effects)
    const updates: any = {};
    Object.entries(progress).forEach(([key, value]) => {
      updates[`tripProgress.${tripId}.${key}`] = value;
    });

    try {
      await handleUpdateProfile(user.uid, updates);
    } catch (err) {
      console.warn("Failed to update trip progress:", err);
    }
  };

  /**
   * 17. Client side optimistic state for mission submissions.
   * This ensures the mission disappears from the "Available" lists immediately upon clicking submit,
   * before the Firestore sync is even complete.
   * STRICTION: This does NOT award XP! XP is awarded only by the server/admin upon approval.
   */
  const registerPendingSubmissionLocally = (amount: number, tripId: string, entryData?: any) => {
    if (!profile) return;
    
    // Prevent duplicate XP if missionId is already completed/scored/pending for this user
    if (completedChallengeIds.has(tripId) || submittedPendingChallengeIds.has(tripId)) {
      console.log(`[AppContext] Duplicate mission submission rejected: ${tripId}`);
      return;
    }
    
    // 1. Create a local log entry if data is provided (for Field Log persistence across refreshes)
    if (entryData) {
      const localEntry: Entry = {
        id: `local_${Date.now()}_${tripId}`,
        userId: user?.uid || 'anonymous',
        tripId: tripId,
        status: 'pending_review',
        pointsAwarded: 0,
        estimatedPoints: amount,
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

    showHelpToast(`"${entryData?.title || 'Your receipt'}" is in. Trevor is reviewing the tiny evidence.`);
  };

  const addToMaybeList = async (tripId: string) => {
    if (!user || !profile) return;
    try {
      const currentList = profile.maybeList || [];
      if (!currentList.includes(tripId)) {
        await handleUpdateProfile(user.uid, { maybeList: [...currentList, tripId] });
        queueReward({
          type: 'action',
          intensity: RewardIntensity.MICRO_FEEDBACK,
          title: "Mission Queued",
          iconName: 'Plus'
        });
      }
    } catch (err) {
      console.warn("Failed to add to maybe list:", err);
    }
  };

  const removeFromMaybeList = async (tripId: string) => {
    if (!user || !profile) return;
    try {
      const currentList = profile.maybeList || [];
      await handleUpdateProfile(user.uid, { maybeList: currentList.filter(id => id !== tripId) });
      queueReward({
        type: 'action',
        intensity: RewardIntensity.MICRO_FEEDBACK,
        title: "Queue Updated",
        iconName: 'Minus'
      });
    } catch (err) {
      console.warn("Failed to remove from maybe list:", err);
    }
  };

  const useComebackCard = async () => {
    if (!user || !profile || !profile.comebackCardActive) return;
    try {
      await awardPoints(user.uid, profile.name, 25, 'comeback_card', {
        description: "Comeback Card Redeemed"
      });
      await handleUpdateProfile(user.uid, { comebackCardActive: false });
    } catch (err) {
      console.error("Failed to use comeback card:", err);
    }
  };

  const handleRetryMissionSubmission = async (missionId: string) => {
    if (!user) {
      console.error('[AppContext] retryResetFailed: No authenticated user.');
      return;
    }
    const missionIdClean = missionId.toLowerCase().trim();
    console.log(`[AppContext] retryButtonPressed for mission: ${missionIdClean}`);
    console.log(`[AppContext] retryResetStarted for mission: ${missionIdClean}`);
    
    // 1. Optimistic update for profile
    setProfile(prev => {
      if (!prev) return null;
      const updatedProfile = { ...prev };
      
      // Clear activeTrip if it matches
      if (updatedProfile.activeTrip && updatedProfile.activeTrip.id && updatedProfile.activeTrip.id.toLowerCase().trim() === missionIdClean) {
        updatedProfile.activeTrip = null;
      }
      
      // Clear missionId from array properties
      if (updatedProfile.submittedChallengeIds) {
        updatedProfile.submittedChallengeIds = updatedProfile.submittedChallengeIds.filter(id => id.toLowerCase().trim() !== missionIdClean);
      }
      if (updatedProfile.submittedPendingChallengeIds) {
        updatedProfile.submittedPendingChallengeIds = updatedProfile.submittedPendingChallengeIds.filter(id => id.toLowerCase().trim() !== missionIdClean);
      }
      if (updatedProfile.rejectedChallengeIds) {
        updatedProfile.rejectedChallengeIds = updatedProfile.rejectedChallengeIds.filter(id => id.toLowerCase().trim() !== missionIdClean);
      }
      if (updatedProfile.needsMoreProofChallengeIds) {
        updatedProfile.needsMoreProofChallengeIds = updatedProfile.needsMoreProofChallengeIds.filter(id => id.toLowerCase().trim() !== missionIdClean);
      }
      if (updatedProfile.tripProgress) {
        const progressCopy = { ...updatedProfile.tripProgress };
        delete progressCopy[missionIdClean];
        updatedProfile.tripProgress = progressCopy;
      }
      
      return updatedProfile as UserProfile;
    });

    // 2. Optimistic update for entries
    setEntries(prev => {
      return prev.map(e => {
        const eMissionId = (e.missionId || e.challengeId || e.tripId || '').toLowerCase().trim();
        if (eMissionId === missionIdClean && ['rejected', 'needs_more_proof', 'needs-more-proof'].includes(e.status)) {
          return { ...e, status: 'retried' as any };
        }
        return e;
      });
    });

    try {
      const { retryMissionSubmission } = await import('../services/deckProgressService');
      await retryMissionSubmission(user.uid, missionIdClean);
      console.log(`[AppContext] retryResetSuccess for mission: ${missionIdClean}`);
    } catch (err) {
      console.error(`[AppContext] retryResetFailed for mission: ${missionIdClean}`, err);
    }
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
    try {
      const typeData = FIELD_TYPES[id];
      await handleUpdateProfile(user.uid, { 
        fieldType: id,
        fieldTypeName: typeData.name,
        fieldClassificationComplete: true
      });
    } catch (err) {
      console.error("Failed to set field type:", err);
    }
  };

  const setProductPersonaLens = async (id: ProductPersonaLensId) => {
    if (!user) return;
    try {
      await handleUpdateProfile(user.uid, { 
        productPersonaLens: id
      });
    } catch (err) {
      console.error("Failed to set product persona lens:", err);
    }
  };

  const getEligibleDrawPool = React.useCallback((packId?: string): EligibleDrawPoolResult => {
    // 1. Enforce Starter Pack if not complete
    let effectivePackId = packId;
    if (!isOnboardingComplete && !isAdmin && !overrides.forceUnlocked) {
      effectivePackId = 'starter-signals';
    }

    const pack = effectivePackId ? getDeckPackById(effectivePackId) : null;
    
    // 2. Prevent selecting locked summer deck if not unlocked
    if (effectivePackId === 'heatwave-receipts' && !isHeatwaveDeckUnlocked && !isAdmin && !overrides.forceUnlocked) {
      return { eligibleMissions: [], reason: 'season_locked' };
    }
    
    if (effectivePackId === 'socal-summer' && !isSocalSummerUnlocked && !isAdmin && !overrides.forceUnlocked) {
      return { eligibleMissions: [], reason: 'season_locked' };
    }

    const result = getCanonicalPool({
      missions: trips,
      completedMissionIds: completedChallengeIds,
      pendingMissionIds: submittedPendingChallengeIds,
      needsMoreProofMissionIds: needsMoreProofChallengeIds,
      rejectedMissionIds: rejectedChallengeIds,
      activeMissionId: profile?.activeTrip?.id || profile?.activeMissionId || null,
      isOnboardingComplete,
      activePack: pack,
      isHeatwaveDeckUnlocked,
      isSocalSummerUnlocked,
      isAdmin,
      canonicalStarterState: canonicalStarterDeckState,
    });
    
    return result;
  }, [trips, completedChallengeIds, submittedPendingChallengeIds, needsMoreProofChallengeIds, rejectedChallengeIds, profile?.activeTrip?.id, profile?.activeMissionId, isOnboardingComplete, isHeatwaveDeckUnlocked, isSocalSummerUnlocked, isAdmin, canonicalStarterDeckState]);

  const drawTrip = async (tripId?: string, packId?: string): Promise<TripType | null> => {
    if (!user || trips.length === 0) return null;

    try {
      if (mustCompleteStarterMission && tripId !== LAUNCH_MISSION_ID) {
        console.warn("[AppContext] Launch mission is required first. Blocking normal draw.");
        await handleUpdateProfile(user.uid, { activeTrip: LAUNCH_MISSION });
        // Also save to mission cards
        await saveDrawnMissionCard(user.uid, {
          missionId: LAUNCH_MISSION_ID,
          challengeId: LAUNCH_MISSION_ID,
          deckId: 'starter-signals',
          missionTitle: LAUNCH_MISSION.title,
          missionSummary: LAUNCH_MISSION.description,
          status: 'active',
          isActive: true
        });
        return LAUNCH_MISSION;
      }
      
      if (tripId) {
        const specific = trips.find(t => t.id === tripId);
        if (specific) {
          await handleUpdateProfile(user.uid, { activeTrip: specific });
          await saveDrawnMissionCard(user.uid, {
            missionId: specific.id,
            challengeId: specific.id,
            deckId: packId || 'unknown',
            missionTitle: specific.title,
            missionSummary: specific.description,
            status: 'active',
            isActive: true
          });
          return specific;
        }
      }
    } catch (err) {
      console.warn("Trip assignment failed:", err);
    }

    // 1. Get the current eligible pool for the pack
    const effectivePackId = packId || (isOnboardingComplete ? (localStorage.getItem('active_deck_pack_id') || 'urban-recon') : 'starter-signals');
    const poolResult = getEligibleDrawPool(effectivePackId);
    const eligiblePool = poolResult.eligibleMissions;
    const isStarterPackDraw = effectivePackId === 'starter-signals';

    const activeDrawnStarter = isStarterPackDraw && canonicalStarterDeckState.activeDrawnIds.length > 0
      ? trips.find(t => t.id.toLowerCase() === canonicalStarterDeckState.activeDrawnIds[0])
      : null;

    if (activeDrawnStarter && !canonicalStarterDeckState.submittedIds.includes(activeDrawnStarter.id.toLowerCase())) {
      if (import.meta.env.DEV) {
        console.log('[Deck Draw Canonical] returning active drawn starter mission', {
          uid: user.uid,
          deckId: effectivePackId,
          activeDrawnIds: canonicalStarterDeckState.activeDrawnIds,
          canonicalSubmittedIds: canonicalStarterDeckState.submittedIds,
          selectedId: activeDrawnStarter.id,
        });
      }
      return activeDrawnStarter;
    }
    
    // 2. Identify previous mission to avoid immediate repeat (Summer rule)
    const lastEntryId = profile?.submittedChallengeIds?.[profile.submittedChallengeIds.length - 1];
    const activeId = activeTrip?.id ? activeTrip.id.toString().toLowerCase() : null;
    const previousId = lastEntryId || activeId;

    // 3. For a NEW draw, exclude the current active trip AND the previous one if possible
    const afterCanonicalFilter = eligiblePool.map(t => t.id);
    let finalPool = eligiblePool.filter(t => {
      if (isStarterPackDraw) return true;
      const tid = t.id.toString().toLowerCase();
      return !(eligiblePool.length > 1 && tid === previousId);
    });
    const afterPreviousFilter = finalPool.map(t => t.id);

    // 4. Default if all filtered out
    if (finalPool.length === 0 && eligiblePool.length > 0) {
      finalPool = eligiblePool;
    }

    const selectedId = finalPool.length > 0 ? (drawTripLogic(finalPool as any) as any)?.id : null;

    // 5. DEEP LOGGING as requested
    const nullReason = finalPool.length === 0
      ? (poolResult.diagnostics?.nullReason || `empty_final_pool:${poolResult.reason || 'unknown'}`)
      : null;

    if (import.meta.env.DEV) {
      console.log("[Deck Draw Canonical]", {
        uid: user?.uid,
        deckId: effectivePackId,
        totalCards: trips.length,
        approvedIds: Array.from(approvedCompletedChallengeIds),
        pendingIds: Array.from(submittedPendingChallengeIds),
        needsMoreProofIds: Array.from(needsMoreProofChallengeIds),
        rejectedIds: Array.from(rejectedChallengeIds),
        activeTripId: activeId,
        previousDrawnId: previousId,
        eligibleIds: eligiblePool.map(t => t.id),
        afterCanonicalFilter,
        afterPreviousFilter,
        canonicalStarter: isStarterPackDraw ? canonicalStarterDeckState : undefined,
        excludedCards: poolResult.excludedCards,
        nullReason,
        selectedId
      });
    }

    if (finalPool.length === 0) {
      console.warn('[Deck Draw] drawTrip returning null', {
        uid: user.uid,
        deckId: effectivePackId,
        nullReason,
        diagnostics: poolResult.diagnostics,
        analysis: poolResult.analysis,
      });
      return null;
    }

    const newTrip = finalPool.find(t => t.id === selectedId) || finalPool[0];
    
    if (newTrip) {
      try {
        await handleUpdateProfile(user.uid, { activeTrip: newTrip });
        // Save to mission cards - status is 'drawn' initially in the new flow
        await saveDrawnMissionCard(user.uid, {
          missionId: newTrip.id,
          challengeId: newTrip.id,
          deckId: effectivePackId,
          missionTitle: newTrip.title,
          missionSummary: newTrip.description,
          status: 'drawn',
          isActive: false
        });
      } catch (err) {
        console.warn("Trip draw save failed:", err);
      }
    }
    
    return newTrip;
  };

  const handleSaveMissionCard = async (card: Partial<DrawnMissionCard>) => {
    if (!user) return '';
    return saveDrawnMissionCard(user.uid, card);
  };

  const handleUpdateMissionCardStatus = async (missionId: string, status: DrawnMissionCardStatus, extraData?: Partial<DrawnMissionCard>) => {
    if (!user) return;
    return updateMissionCardStatus(user.uid, missionId, status, extraData);
  };

  const handleSetActiveMissionCard = async (missionId: string) => {
    if (!user) return;
    
    const targetTrip = trips.find(t => t.id === missionId);
    if (targetTrip) {
      await handleUpdateProfile(user.uid, { activeTrip: targetTrip });
    }
    
    return setActiveMissionCard(user.uid, missionId);
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
        proofImage: entryData.proofImage || '',
        originalImageUrl: entryData.originalImageUrl,
        fieldNote: entryData.fieldNote || '',
        selectedLevel: (entryData.selectedLevel || 'Standard') as any,
        detourCompleted: entryData.detourCompleted || false,
        crewId: entryData.crewId || profile.crewId || undefined,
        userAvatar: profile.avatar || undefined, 
        
        // Pass through viewfinder meta
        imageStoragePath: (entryData as any).imageStoragePath,
        storagePath: (entryData as any).storagePath,
        uploadSource: entryData.uploadSource as any,
        photoTakenAt: (entryData as any).photoTakenAt,
        fileLastModifiedAt: (entryData as any).fileLastModifiedAt,
        submittedAt: entryData.submittedAt,
        metadataStatus: entryData.metadataStatus as any,
        captureTrustLevel: entryData.captureTrustLevel as any,
        filterUsed: (entryData as any).filterUsed,
        filterIntensity: (entryData as any).filterIntensity,
        reviewStatus: (entryData as any).reviewStatus as any,
        hintUsed: entryData.hintUsed,
        fastFindAttempt: (entryData as any).fastFindAttempt,
        isRetry: (entryData as any).isRetry || false,
        originalEntryId: (entryData as any).originalEntryId || null,
        retryPointMultiplier: (entryData as any).retryPointMultiplier || null,
        reviewerNote: (entryData as any).reviewerNote || null,
        fieldType: profile.fieldType || undefined,
        fieldTypeName: profile.fieldTypeName || undefined,
        existingEntryId: (entryData as any).existingEntryId || null,
        findingType: (entryData as any).findingType || null,
        aiAnalysisResult: (entryData as any).aiAnalysisResult || null,
        proofCheckResult: (entryData as any).proofCheckResult || null,
      },
      activeSeason
    );

    if (!result) throw new Error('Submission failed');

    const { entryId, status, review, scoring, ftBonus, ftText, newRewards } = result;
    setLastReview(review);

    if (profile.crewId && status === 'approved') {
      try {
        await processLoreForEntry(profile.crewId, { id: entryId, status: 'approved' } as any);
      } catch (err) {
        console.warn("[AppContext] Crew lore processing failed:", err);
      }
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
        evaluateEntryForBadges(user.uid, entryObj as any).catch(e => console.warn("[AppContext] Badge evaluation failed:", e));
      }

      if (profile.crewId && isFeatureEnabled('crewArtifactsEnabled')) {
        evaluateEntryForArtifacts(profile.crewId, user.uid, profile.name, entryObj as any).catch(e => console.warn("[AppContext] Artifact evaluation failed:", e));
      }

      if (isFeatureEnabled('appObservationsEnabled')) {
        generateObservation(user.uid, profile.crewId || null, [entryObj as any, ...entries], { rankImproved: false }).catch(e => console.warn("[AppContext] Observation generation failed:", e));
      }

      // Check for discovery stickers
      if (entryData.proofImage && entryData.fieldNote) {
        unlockDiscoverySticker('proof_pirate', 'capture').catch(e => console.warn("Discovery unlock failed (proof_pirate):", e));
      }
    } else {
      queueReward({
        type: 'action',
        intensity: RewardIntensity.MICRO_FEEDBACK,
        title: "Protocol Logged",
        iconName: 'Server'
      });
    }

    // Optimistic clearance of activeTrip and tracking submittal to prevent lag/duplicates
    setProfile(prev => {
      if (!prev) return null;
      const submitted = prev.submittedChallengeIds || [];
      const submittedPending = (prev as any).submittedPendingChallengeIds || [];
      const lowerId = currentTrip.id.toLowerCase();
      const updatedSubmitted = submitted.includes(lowerId) ? submitted : [...submitted, lowerId];
      const updatedSubmittedPending = submittedPending.includes(lowerId) ? submittedPending : [...submittedPending, lowerId];
      return {
        ...prev,
        activeTrip: null,
        submittedChallengeIds: updatedSubmitted,
        submittedPendingChallengeIds: updatedSubmittedPending
      };
    });

    // Register Field Pulse actions
    registerPulseAction('submit_proof', entryId).catch(err => console.warn("Pulse register failed (submit):", err));
    if (entryData.fieldNote) {
      registerPulseAction('add_field_note', entryId).catch(err => console.warn("Pulse register failed (note):", err));
    }
    
    return { entryId, status, review, scoring, ftBonus, ftText, newRewards };
  };

  const useFieldCheck = async (params: { targetId: string; reason: FieldCheckType; details: string }) => {
    if (!user || !profile || !canRequestFieldCheck(profile.fieldCheckHistory || [])) return;
    
    // Attempt to find missionId if possible
    const missionId = 'unknown'; 
    const targetUserId = 'unknown-for-demo'; 

    try {
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
      await handleUpdateProfile(user.uid, {
        fieldCheckHistory: newHistory
      });
    } catch (err) {
      console.error("Field check failed:", err);
    }
  };

  const resolveIncomingFieldCheck = async () => {
    if (!incomingFieldChecks.length || !user || !profile) return;
    const latest = incomingFieldChecks[0];
    // In summer season, admin resolves these, but user can dismiss notifications
    if (latest.id) {
      try {
        // Logic for user dismissing their notification (not necessarily deleting the audit)
        // For now we use the service to "resolve" it
        await resolveFieldCheck(latest.id, 'dismissed');
      } catch (err) {
        console.warn("Failed to resolve field check:", err);
      }
    }
  };

  const clearReview = () => setLastReview(null);

  const handleDismissObservation = async (msgId: string) => {
    try {
      await dismissObservation(msgId);
    } catch (err) {
      console.warn("Failed to dismiss observation:", err);
    }
  };

  const toggleFavoriteMemory = async (memoryId: string, isFavorite: boolean) => {
    if (!user) return;
    try {
      await toggleMemoryFav(user.uid, memoryId, isFavorite);
    } catch (err) {
      console.warn("Failed to toggle favorite memory:", err);
    }
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
    getWeeklySabotages(currentWeekNumber)
      .then(setActiveSabotages)
      .catch(err => console.warn("[AppContext] Failed to sync sabotages:", err));
  }, [activeSeason, currentWeekNumber]);

  const handleDeploySabotage = async (targetId: string, cardId: string, severity: 'minor' | 'major', attackerCrewId?: string) => {
    if (!user || !activeSeason) return;
    try {
      await deploySabotage(user.uid, targetId, cardId, currentWeekNumber, severity, attackerCrewId);
      const updated = await getWeeklySabotages(currentWeekNumber);
      setActiveSabotages(updated);
    } catch (err) {
      console.error("Sabotage deploy failed:", err);
    }
  };

  const handleActivateShield = async () => {
    if (!user) return;
    try {
      await activateSabotageShield(user.uid);
    } catch (err) {
      console.error("Shield activation failed:", err);
    }
  };

  const [userVotes, setUserVotes] = useState<any[]>([]);

  useEffect(() => {
    if (!user || currentWeekNumber <= 0) return;
    getVotesForUser(user.uid, currentWeekNumber, activeSeason?.id || 'heatwave-receipts')
      .then(setUserVotes)
      .catch(err => console.warn("[AppContext] Failed to sync user votes:", err));
  }, [user, currentWeekNumber, activeSeason?.id]);

  const handleCastVote = async (entryId: string, weekNumber: number, category: any) => {
    if (!user) throw new Error('Not authenticated');
    try {
      const sId = activeSeason?.id || 'heatwave-receipts';
      await castVote(user.uid, entryId, weekNumber, category, sId);
      const updatedVotes = await getVotesForUser(user.uid, weekNumber, sId);
      setUserVotes(updatedVotes);
      
      // Register Field Pulse action
      registerPulseAction('vote', `${entryId}_${category}`).catch(e => console.warn("Pulse register failed:", e));
      
      // Trigger weekly_vote_cast discovery
      unlockDiscoverySticker('weekly_vote_cast', 'voting').catch(e => console.warn("Discovery unlock failed:", e));
      unlockDiscoverySticker('first_vote', 'voting').catch(e => console.warn("Discovery unlock failed:", e));
    } catch (err) {
      console.error("Vote action failed:", err);
      throw err;
    }
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
      authLoading,
      profileLoading,
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
      xp,
      points,
      pendingPoints,
      soloTripsCount,
      approvedEntriesCount,
      boldTripsCount,
      crewTripsCount,
      completedCoreChallenges,
      completedOnboardingMissionIds,
      onboardingCompletedCount,
      onboardingRequiredCount,
      isOnboardingComplete,
      hasCompletedFieldKitOnboarding,
      hasCompletedGuidedFirstEntry,
      hasSeenFieldTypeResults,
      onboardingStarted,
      starterApprovedCount,
      starterState,
      canonicalProgress,
      progressMismatches,
      pendingStarterCount: starterState.pendingStarterCount,
      retryStarterCount: starterState.retryStarterCount,
      nextStarterAction: starterState.nextStarterAction,
      activeMissionId,
      activeSubmissionStatus,
      cameraPermissionReady,
      locationPermissionReady,
      requestCamera,
      requestLocation,
      completeFieldKitOnboarding,
      mustCompleteStarterMission,
      fieldGuideAssistEnabled,
      isTribunalUnlocked,
      getEligibleDrawPool,
      isHeatwaveDeckUnlocked,
      isSocalSummerUnlocked,
      isIOS,
      isStandalone,
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
      updateProfile: handleUpdateProfile,
      isFeatureEnabled,
      markBadgeAsSeen,
      dismissObservation: handleDismissObservation,
      completedChallengeIds,
      submittedPendingChallengeIds,
      approvedCompletedChallengeIds,
      rejectedChallengeIds,
      needsMoreProofChallengeIds,
      rewardQueue,
      queueReward,
      dismissReward,
      updateAvatar,
      signInWithGoogle,
      signOut,
      completeOnboarding,
      markCrewModeSeen,
      toggleFrankieMode,
      unlockDiscoverySticker,
      registerPulseAction,
      updateTripProgress,
      registerPendingSubmissionLocally,
      showHelpToast,
      showCompass,
      isCompassOpen,
      addToMaybeList,
      removeFromMaybeList,
      useComebackCard,
      evaluateEntryProof,
      retryMissionSubmission: handleRetryMissionSubmission,
      drawnMissionCards,
      saveMissionCard: handleSaveMissionCard,
      updateMissionCardStatus: handleUpdateMissionCardStatus,
      setActiveMissionCard: handleSetActiveMissionCard
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
