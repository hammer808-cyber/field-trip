import { TripCard as TripCardType } from './challenges';
import type { VoiceNoteValue } from '../components/VoiceNoteRecorder';
import type { PolaroidStickerPlacement } from '../logic/polaroidSticker';

export type FieldClipboardState =
  | 'brief'
  | 'capture'
  | 'developing_polaroid'
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
  /** Where the sticker sits on the Polaroid, as percentages of the displayed square. */
  stickerPlacement?: PolaroidStickerPlacement;
  isRetry?: boolean;
  isRepair?: boolean;
  /** A recorded voice note (5+ seconds earns the note layer). */
  voiceNote?: VoiceNoteValue | null;
  /**
   * Share-to-community toggle (Nov 21, 2026): ON means this photo may
   * appear in the community feed and on a weekly voting ballot.
   * Undefined at init resolves to the profile-derived default in Capture.
   */
  shareWithCommunity?: boolean;
}
