import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  Timestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { FieldSignal } from '../types/signals';
import { getServerDate, getServerTime } from './timeService';

const COLLECTION = 'fieldSignals';

export function subscribeToActiveSignal(callback: (signal: FieldSignal | null) => void) {
  const now = getServerDate();
  
  // Real-world query: Find signals where startDate <= now and endDate >= now and isActive == true
  // Firestore doesn't support inequality on two different fields easily without composite index + careful query design.
  // We'll simplify for the "Only one active at a time" requirement.
  const q = query(
    collection(db, COLLECTION),
    where('isActive', '==', true),
    orderBy('startDate', 'desc'),
    limit(1)
  );

  return onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      callback(null);
      return;
    }
    const doc = snapshot.docs[0];
    const data = doc.data();
    
    // Check if it's within time bounds on the client side to be extra sure
    const startDate = data.startDate instanceof Timestamp ? data.startDate.toDate() : new Date(data.startDate);
    const endDate = data.endDate instanceof Timestamp ? data.endDate.toDate() : new Date(data.endDate);
    
    if (now >= startDate && now <= endDate) {
      callback({
        ...data,
        id: doc.id,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt
      } as FieldSignal);
    } else {
      callback(null);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, COLLECTION);
  });
}

// Initial mock signals to populate if empty (for dev/demo)
export const MOCK_SIGNALS: FieldSignal[] = [
  {
    id: 'night-owl-v1',
    title: 'GHOST_PROTOCOL',
    description: 'The Bureau has detected unauthorized shadow activity. Low light yields high rewards.',
    signalType: 'bonus',
    startDate: new Date(getServerTime() - 3600000).toISOString(), // Started 1h ago
    endDate: new Date(getServerTime() + 86400000).toISOString(), // Ends in 24h
    pointModifier: 20,
    modifierType: 'flat',
    requiredCondition: 'time:night',
    affectedChallengeTypes: ['solo', 'creative'],
    isActive: true,
    createdAt: getServerDate().toISOString(),
    flavorText: 'Evidence captured between 22:00 and 04:00 receives a static clearance bonus.',
    bonusRule: '+20 STD points for midnight entries.'
  },
  {
    id: 'golden-hour-v1',
    title: 'SOLAR_FLARE',
    description: 'Atmospheric conditions are peaking. High contrast data is currently prioritized.',
    signalType: 'multiplier',
    startDate: new Date(getServerTime() + 86400000).toISOString(), // Starts tomorrow
    endDate: new Date(getServerTime() + 172800000).toISOString(),
    pointModifier: 1.5,
    modifierType: 'multiplier',
    requiredCondition: 'type:photo',
    affectedChallengeTypes: ['discovery'],
    isActive: true,
    createdAt: getServerDate().toISOString(),
    flavorText: 'All visual proof submissions are currently amplified by 1.5x.',
    bonusRule: '1.5x Multiplier on Discovery scans.'
  }
];
