export type SignalType = 'bonus' | 'penalty' | 'visual' | 'multiplier' | 'special';

export interface FieldSignal {
  id: string;
  title: string;
  description: string;
  signalType: SignalType;
  startDate: string; // ISO string
  endDate: string; // ISO string
  pointModifier: number; // e.g., 10 for +10, 1.5 for 1.5x (depending on usage)
  modifierType: 'flat' | 'multiplier';
  requiredCondition?: string; // e.g., 'time:night', 'type:photo', 'crew:active'
  affectedChallengeTypes?: string[]; // e.g., ['photo', 'location']
  isActive: boolean;
  createdAt: string; // ISO string
  flavorText?: string;
  bonusRule?: string;
}

export interface SignalGameState {
  activeSignal: FieldSignal | null;
  loading: boolean;
  error: string | null;
}
