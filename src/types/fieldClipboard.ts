import { TripCard as TripCardType } from './challenges';

export type FieldClipboardState = 
  | 'brief'
  | 'capture'
  | 'previewing_polaroid'
  | 'developing_polaroid'
  | 'detecting'
  | 'noting'
  | 'reviewing'
  | 'submitting'
  | 'pending'
  | 'needs_more_proof'
  | 'result';

export interface FieldClipboardData {
  photoCaptured: boolean;
  photoUrl?: string;
  note: string;
  findingType?: string;
  isRetry?: boolean;
  isRepair?: boolean;
}
