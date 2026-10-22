import { FieldTypeId } from '../constants';

export interface PersonaRequirement {
  id: FieldTypeId;
  name: string;
  campRole: string;
  coreInstinct: string;
  description: string;
  vibe: string;
  image: string;
  quote: string;
}

export interface QuizAnswer {
  id: string;
  /** Short plain lead (2-5 words) shown bold so answers can be scanned fast.
   *  The full `text` stays as the flavor line — leads never replace it
   *  outside Frankie Mode, and scoring (keyed by id) never reads either. */
  shortLead?: string;
  text: string;
  personaWeights: Partial<Record<FieldTypeId, number>>;
}

export interface QuizQuestion {
  id: string;
  screenId: string;
  /** Plain one-line headline for the question; `prompt` keeps the full
   *  flavor wording and is shown under it (hidden in Frankie Mode). */
  plainHeadline?: string;
  prompt: string;
  answers: QuizAnswer[];
  weight: number;
  highSignal?: boolean;
  trevorVoice?: string;
  stickyNote?: string;
}

export interface QuizScore {
  captainClipboard: number;
  mallRat: number;
  mascota: number;
  elondra: number;
  theGobbler: number;
  bigfoot: number;
  unclassified: number;
}
