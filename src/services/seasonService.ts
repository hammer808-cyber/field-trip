import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  setDoc,
  limit,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Season, AppConfig } from '../types/game';
import { SUMMER_SEASON } from '../constants';
import { deploySummer2026Manifest } from './adminGameService';

export async function getAppConfig(): Promise<AppConfig | null> {
  const docRef = doc(db, 'appConfig', 'game');
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return snap.data() as AppConfig;
}

export async function initializeDefaultSeason(): Promise<void> {
  // Use the high-fidelity admin deployment if possible
  await deploySummer2026Manifest();
}

export function subscribeToAppConfig(callback: (config: AppConfig) => void) {
  return onSnapshot(doc(db, 'appConfig', 'game'), (doc) => {
    if (doc.exists()) {
      callback(doc.data() as AppConfig);
    }
  });
}

export async function getActiveSeason(seasonId?: string): Promise<Season | null> {
  if (!seasonId) return null;
  const docRef = doc(db, 'seasons', seasonId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Season;
}

export function subscribeToActiveSeason(seasonId: string, callback: (season: Season | null) => void) {
  return onSnapshot(doc(db, 'seasons', seasonId), (doc) => {
    if (doc.exists()) {
      callback({ id: doc.id, ...doc.data() } as Season);
    } else {
      callback(null);
    }
  });
}
