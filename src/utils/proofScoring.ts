export type ProofMatchRating = 'weak' | 'good' | 'perfect';
export type PhotoQualityRating = 'usable' | 'clear' | 'iconic';
export type FieldNoteRating = 'none' | 'basic' | 'specific' | 'legendary';
export type AdventureRating = 'simple' | 'outside' | 'adventure' | 'social';

export interface ProofScoringSelections {
  proofMatchRating?: ProofMatchRating;
  photoQualityRating?: PhotoQualityRating;
  fieldNoteRating?: FieldNoteRating;
  adventureRating?: AdventureRating;
  weeklyCatalystApplied?: boolean;
}

export interface ProofScoringInput extends ProofScoringSelections {
  missionOrEntry?: Record<string, any> | null;
  fieldNote?: string | null;
  hintUsed?: boolean;
  lateSubmission?: boolean;
  retrySubmission?: boolean;
  retryMultiplier?: number | null;
  duplicateProof?: boolean;
}

export interface ProofScoringBreakdown {
  baseXP: number;
  proofMatchBonus: number;
  proofMatchRating: ProofMatchRating;
  photoQualityBonus: number;
  photoQualityRating: PhotoQualityRating;
  fieldNoteBonus: number;
  fieldNoteRating: FieldNoteRating;
  adventureBonus: number;
  adventureRating: AdventureRating;
  weeklyCatalystBonus: number;
  weeklyCatalystApplied: boolean;
  penalties: {
    hintUsed: boolean;
    lateSubmission: boolean;
    retrySubmission: boolean;
    duplicateProof: boolean;
    multipliers: {
      hintUsed: number;
      lateSubmission: number;
      retrySubmission: number;
    };
  };
  subtotalXP: number;
  finalXP: number;
  calculatedAt: string;
}

const PROOF_MATCH_BONUS: Record<ProofMatchRating, number> = {
  weak: 0,
  good: 10,
  perfect: 30
};

const PHOTO_QUALITY_BONUS: Record<PhotoQualityRating, number> = {
  usable: 0,
  clear: 10,
  iconic: 40
};

const FIELD_NOTE_BONUS: Record<FieldNoteRating, number> = {
  none: 0,
  basic: 5,
  specific: 10,
  legendary: 20
};

const ADVENTURE_BONUS: Record<AdventureRating, number> = {
  simple: 0,
  outside: 10,
  adventure: 20,
  social: 30
};

function firstFiniteNumber(...values: any[]): number | null {
  for (const value of values) {
    const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return null;
}

function hasText(value: unknown, ...needles: string[]): boolean {
  const haystack = Array.isArray(value) ? value.join(' ') : String(value || '');
  const normalized = haystack.toLowerCase();
  return needles.some(needle => normalized.includes(needle));
}

function inferFieldNoteRating(fieldNote?: string | null): FieldNoteRating {
  const length = (fieldNote || '').trim().length;
  if (length <= 0) return 'none';
  if (length >= 180) return 'specific';
  return 'basic';
}

export function getBaseMissionXP(missionOrEntry: Record<string, any> | null | undefined): number {
  const source = missionOrEntry || {};
  const explicit = firstFiniteNumber(
    source.baseXP,
    source.baseXp,
    source.basePoints,
    source.points,
    source.xpValue
  );
  if (explicit) return Math.round(explicit);

  const tags = source.tags || source.boostTags || [];
  const difficulty = source.difficulty || source.selectedLevel;
  const lane = source.lane || source.deckId;
  const type = source.type || source.category || source.cardType || source.mode;

  if (
    hasText(type, 'rare', 'special', 'final', 'bonus') ||
    hasText(lane, 'rare', 'special', 'finale') ||
    hasText(tags, 'rare', 'special', 'legendary')
  ) {
    return 250;
  }

  if (
    hasText(type, 'crew', 'social') ||
    hasText(lane, 'crew', 'social') ||
    hasText(tags, 'crew', 'social', 'group')
  ) {
    return 200;
  }

  if (
    hasText(type, 'bold', 'adventure', 'leave the house') ||
    hasText(lane, 'bold', 'adventure', 'wildcard') ||
    hasText(tags, 'bold', 'adventure', 'outside') ||
    hasText(difficulty, 'hard', 'bold')
  ) {
    return 150;
  }

  if (
    hasText(type, 'tiny', 'easy') ||
    hasText(lane, 'tiny') ||
    hasText(tags, 'tiny', 'easy') ||
    hasText(difficulty, 'easy', 'tiny')
  ) {
    return 50;
  }

  return 100;
}

export function calculateProofScore(input: ProofScoringInput): ProofScoringBreakdown {
  const proofMatchRating = input.proofMatchRating || 'good';
  const photoQualityRating = input.photoQualityRating || 'clear';
  const fieldNoteRating = input.fieldNoteRating || inferFieldNoteRating(input.fieldNote);
  const adventureRating = input.adventureRating || 'simple';
  const weeklyCatalystApplied = input.weeklyCatalystApplied === true;

  const baseXP = getBaseMissionXP(input.missionOrEntry);
  const proofMatchBonus = PROOF_MATCH_BONUS[proofMatchRating];
  const photoQualityBonus = PHOTO_QUALITY_BONUS[photoQualityRating];
  const fieldNoteBonus = FIELD_NOTE_BONUS[fieldNoteRating];
  const adventureBonus = ADVENTURE_BONUS[adventureRating];
  const weeklyCatalystBonus = weeklyCatalystApplied ? 25 : 0;
  const subtotalXP = baseXP + proofMatchBonus + photoQualityBonus + fieldNoteBonus + adventureBonus + weeklyCatalystBonus;

  const hintMultiplier = input.hintUsed ? 0.85 : 1;
  const lateMultiplier = input.lateSubmission ? 0.90 : 1;
  const retryMultiplier = input.retrySubmission
    ? (typeof input.retryMultiplier === 'number' && input.retryMultiplier > 0 && input.retryMultiplier < 1 ? input.retryMultiplier : 0.70)
    : 1;

  let finalXP = subtotalXP * hintMultiplier * lateMultiplier;
  if (input.retrySubmission) {
    finalXP = Math.min(finalXP, subtotalXP * retryMultiplier);
  }
  if (input.duplicateProof) {
    finalXP = 0;
  }

  const breakdown: ProofScoringBreakdown = {
    baseXP,
    proofMatchBonus,
    proofMatchRating,
    photoQualityBonus,
    photoQualityRating,
    fieldNoteBonus,
    fieldNoteRating,
    adventureBonus,
    adventureRating,
    weeklyCatalystBonus,
    weeklyCatalystApplied,
    penalties: {
      hintUsed: input.hintUsed === true,
      lateSubmission: input.lateSubmission === true,
      retrySubmission: input.retrySubmission === true,
      duplicateProof: input.duplicateProof === true,
      multipliers: {
        hintUsed: hintMultiplier,
        lateSubmission: lateMultiplier,
        retrySubmission: retryMultiplier
      }
    },
    subtotalXP,
    finalXP: Math.round(finalXP),
    calculatedAt: new Date().toISOString()
  };

  console.log('[ProofScoring] input', input);
  console.log('[ProofScoring] breakdown', breakdown);

  return breakdown;
}
