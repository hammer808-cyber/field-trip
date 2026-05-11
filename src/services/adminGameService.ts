import { doc, setDoc, updateDoc, serverTimestamp, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AppConfig, Season } from '../types/game';

export async function initializeGameConfig() {
  const configRef = doc(db, 'appConfig', 'game');
  const defaultConfig: AppConfig = {
    onboardingEntriesRequired: 3,
    featureFlags: {
      fieldSignalsEnabled: true,
      badgeFragmentsEnabled: true,
      crewArtifactsEnabled: true,
      rivalMomentsEnabled: true,
      appObservationsEnabled: true,
      crewDispatchEnabled: true,
      proofFinderEnabled: true,
      skinsEnabled: true,
      personaEffectsEnabled: true
    }
  };
  await setDoc(configRef, defaultConfig, { merge: true });
}

export async function updateFeatureFlags(flags: Partial<AppConfig['featureFlags']>) {
  const configRef = doc(db, 'appConfig', 'game');
  await updateDoc(configRef, {
    [`featureFlags`]: flags
  });
}

export async function createSeason(season: Omit<Season, 'id' | 'createdAt'>) {
  const seasonRef = doc(collection(db, 'seasons'));
  await setDoc(seasonRef, {
    ...season,
    createdAt: serverTimestamp()
  });
  return seasonRef.id;
}

export async function setGlobalActiveSeason(seasonId: string) {
  const configRef = doc(db, 'appConfig', 'game');
  await updateDoc(configRef, {
    activeSeasonId: seasonId
  });
}
