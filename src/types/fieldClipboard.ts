import { TripCard as TripCardType } from './challenges';
import type { VoiceNoteValue } from '../components/VoiceNoteRecorder';

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
  stickerId?: string;
  isRetry?: boolean;
  isRepair?: boolean;
  /** A recorded voice note (5+ seconds earns the note layer). */
  voiceNote?: VoiceNoteValue | null;
}
