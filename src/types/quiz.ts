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
  text: string;
  personaWeights: Partial<Record<FieldTypeId, number>>;
}

export interface QuizQuestion {
  id: string;
  screenId: string;
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
