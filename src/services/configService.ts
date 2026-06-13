import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface GlobalConfig {
  maintenanceMode: boolean;
  proofChecksEnabled: boolean;
  uploadsEnabled: boolean;
  leaderboardLiveUpdatesEnabled: boolean;
  maxDailyProofChecksPerUser: number;
  maxDailyUploadsPerUser: number;
  betaMode: boolean;
  
  // AI Specific Caps (Stage 2B)
  aiImageAnalysisEnabled: boolean;
  maxDailyAiScansPerUser: number;
  maxAiScansPerProof: number;
  maxAiRetriesPerProof: number;
  maxGlobalAiScansPerDay: number;
  aiCostGuardEnabled: boolean;
}

const DEFAULT_CONFIG: GlobalConfig = {
  maintenanceMode: false,
  proofChecksEnabled: true,
  uploadsEnabled: true,
  leaderboardLiveUpdatesEnabled: false, 
  maxDailyProofChecksPerUser: 50,
  maxDailyUploadsPerUser: 100,
  betaMode: false,

  // AI Defaults
  aiImageAnalysisEnabled: true,
  maxDailyAiScansPerUser: 5,
  maxAiScansPerProof: 1,
  maxAiRetriesPerProof: 1,
  maxGlobalAiScansPerDay: 500,
  aiCostGuardEnabled: true,
};

let currentConfig: GlobalConfig = { ...DEFAULT_CONFIG };

/**
 * Initializes real-time listener for global configuration
 */
export function watchGlobalConfig(callback?: (config: GlobalConfig) => void) {
  const configRef = doc(db, 'appConfig', 'global');
  
  return onSnapshot(configRef, (snapshot) => {
    if (snapshot.exists()) {
      currentConfig = { ...DEFAULT_CONFIG, ...snapshot.data() } as GlobalConfig;
      console.log('[Config] Global kill-switches updated:', currentConfig);
      if (callback) callback(currentConfig);
    } else {
      console.warn('[Config] Global config document missing. Using defaults.');
    }
  }, (error) => {
    console.error('[Config] Failed to watch global config:', error);
  });
}

/**
 * Returns latest snapshot of global config
 */
export function getGlobalConfig(): GlobalConfig {
  return currentConfig;
}

/**
 * Fetches config once (useful for initialization)
 */
export async function fetchGlobalConfig(): Promise<GlobalConfig> {
  const configRef = doc(db, 'appConfig', 'global');
  try {
    const snapshot = await getDoc(configRef);
    if (snapshot.exists()) {
      currentConfig = { ...DEFAULT_CONFIG, ...snapshot.data() } as GlobalConfig;
    }
    return currentConfig;
  } catch (err) {
    console.error('[Config] Error fetching config:', err);
    return DEFAULT_CONFIG;
  }
}
