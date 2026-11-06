import type { ProofScoringMissionLike } from './proofRubric';
import { getCardBasePoints, isStarterScoringMission } from './proofRubric';

export const MISSION_SCORING_VERSION = 'mission-scoring.v1' as const;
export const DEFAULT_HINT_PENALTY_PERCENT = 15;
export const DEFAULT_AFTERNOON_BONUS_MULTIPLIER = 1.5;
export const DEFAULT_RANDOM_MISSION_BONUS_MULTIPLIER = 1.25;

export interface MissionHint {
  shortText: string;
  example?: string;
}

export interface MissionAttemptHintState {
  hintUsed: boolean;
  hintUsedAt?: unknown;
  hintPenaltyPercent: number;
  hintPenaltyPoints: number;
  maxScoreBeforeHint: number;
  maxScoreAfterHint: number;
  hint?: MissionHint;
}

export type MissionBonusType = 'time_window' | 'random_mission';

export interface BonusDefinition {
  id: string;
  type: MissionBonusType;
  label: string;
  multiplier: number;
  description: string;
  assignmentSource: 'weekly_rotation' | 'mission_start_time';
}

export interface BonusAssignment {
  assignmentId: string;
  rotationId?: string;
  missionId: string;
  bonus: BonusDefinition;
  startsAt: unknown;
  expiresAt: unknown;
}

export interface BonusEligibility {
  id: string;
  type: MissionBonusType;
  label: string;
  multiplier: number;
  description: string;
  eligible: boolean;
  assignmentId: string;
  rotationId?: string;
  timezone?: string;
  localEligibilityDate?: string;
  startLocalTime?: string;
  endLocalTimeExclusive?: string;
  reason?: string;
}

export interface ScoringSnapshot {
  version: typeof MISSION_SCORING_VERSION;
  baseMaxScore: number;
  hintUsed: boolean;
  hintPenaltyPercent: number;
  hintPenaltyPoints: number;
  adjustedMaxScore: number;
  reviewerBaseScore: number;
  retryMultiplier: number;
  reviewerScoreAfterRetry: number;
  perkPoints: number;
  participationLayers: ParticipationLayers;
  preBonusScore: number;
  eligibleBonusIds: string[];
  appliedBonusId: string | null;
  appliedBonusLabel: string | null;
  appliedMultiplier: number;
  bonusPoints: number;
  finalScore: number;
  calculatedAt?: unknown;
}

export type ScoreCalculationResult = ScoringSnapshot & {
  eligibleBonuses: BonusEligibility[];
  appliedBonus: BonusEligibility | null;
};

export interface MissionScoringConfig {
  hintPenaltyPercent: number;
  afternoonPowerHour: {
    enabled: boolean;
    startHour: number;
    endHourExclusive: number;
    multiplier: number;
  };
  randomMissionBonus: {
    enabled: boolean;
    multiplier: number;
    label: string;
  };
  bonusStacking: 'highest_only';
}

export const DEFAULT_MISSION_SCORING_CONFIG: MissionScoringConfig = {
  hintPenaltyPercent: DEFAULT_HINT_PENALTY_PERCENT,
  afternoonPowerHour: {
    enabled: true,
    startHour: 12,
    endHourExclusive: 15,
    multiplier: DEFAULT_AFTERNOON_BONUS_MULTIPLIER,
  },
  randomMissionBonus: {
    enabled: true,
    multiplier: DEFAULT_RANDOM_MISSION_BONUS_MULTIPLIER,
    label: 'Lucky Receipt',
  },
  bonusStacking: 'highest_only',
};

function finiteNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampInteger(value: unknown, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, Math.round(finiteNumber(value, minimum))));
}

function validMultiplier(value: unknown, fallback = 1): number {
  return Math.max(1, finiteNumber(value, fallback));
}

export function normalizeMissionScoringConfig(value: unknown): MissionScoringConfig {
  const scoring = value && typeof value === 'object' ? value as Record<string, any> : {};
  const afternoon = scoring.afternoonPowerHour && typeof scoring.afternoonPowerHour === 'object'
    ? scoring.afternoonPowerHour
    : {};
  const random = scoring.randomMissionBonus && typeof scoring.randomMissionBonus === 'object'
    ? scoring.randomMissionBonus
    : {};
  const startHour = clampInteger(
    afternoon.startHour ?? DEFAULT_MISSION_SCORING_CONFIG.afternoonPowerHour.startHour,
    0,
    23,
  );
  const endHourExclusive = clampInteger(
    afternoon.endHourExclusive ?? DEFAULT_MISSION_SCORING_CONFIG.afternoonPowerHour.endHourExclusive,
    startHour + 1,
    24,
  );
  const hintPenaltyPercent = scoring.hintPenaltyPercent === undefined || scoring.hintPenaltyPercent === null
    ? DEFAULT_MISSION_SCORING_CONFIG.hintPenaltyPercent
    : clampInteger(scoring.hintPenaltyPercent, 0, 100);

  return {
    hintPenaltyPercent,
    afternoonPowerHour: {
      enabled: afternoon.enabled !== false,
      startHour,
      endHourExclusive,
      multiplier: validMultiplier(
        afternoon.multiplier,
        DEFAULT_MISSION_SCORING_CONFIG.afternoonPowerHour.multiplier,
      ),
    },
    randomMissionBonus: {
      enabled: random.enabled !== false,
      multiplier: validMultiplier(
        random.multiplier,
        DEFAULT_MISSION_SCORING_CONFIG.randomMissionBonus.multiplier,
      ),
      label: String(random.label || DEFAULT_MISSION_SCORING_CONFIG.randomMissionBonus.label).trim(),
    },
    bonusStacking: 'highest_only',
  };
}

/**
 * The scoring ceiling is the card's own point value — never a flat rate.
 * Starters carry baseXP 100, so they are unchanged. A card with no usable
 * baseXP/basePoints falls back to 100 via getCardBasePoints.
 */
export function getMissionBaseMaxScore(mission: ProofScoringMissionLike | null | undefined): number {
  return getCardBasePoints(mission);
}

/** Each earned participation layer pays 25% of the card's base value. */
export const PARTICIPATION_LAYER_RATE = 0.25;

export interface ParticipationSignals {
  photoSubjectVerified?: boolean | null;
  fieldNotePresent?: boolean | null;
  /** True when the note layer was earned by a voice note, not writing. */
  fieldNoteViaVoice?: boolean | null;
  locationVerified?: boolean | null;
}

export interface ParticipationLayers {
  photoSubject: number;
  fieldNote: number;
  location: number;
  total: number;
  /** True when the note layer came from a voice note. */
  fieldNoteViaVoice: boolean;
}

export function calculateParticipationLayers(
  baseMaxScore: number,
  signals: ParticipationSignals | null | undefined,
): ParticipationLayers {
  const layerValue = Math.round(Math.max(0, baseMaxScore) * PARTICIPATION_LAYER_RATE);
  const photoSubject = signals?.photoSubjectVerified === true ? layerValue : 0;
  const fieldNote = signals?.fieldNotePresent === true ? layerValue : 0;
  const location = signals?.locationVerified === true ? layerValue : 0;
  return {
    photoSubject,
    fieldNote,
    location,
    total: photoSubject + fieldNote + location,
    fieldNoteViaVoice: fieldNote > 0 && signals?.fieldNoteViaVoice === true,
  };
}

/**
 * One place that turns raw submission evidence into the three layer
 * signals. Call sites pass whatever they have; missing evidence reads
 * as "not earned". The default text the client stamps on empty field
 * notes never counts as a note.
 */
export const DEFAULT_FIELD_NOTE_TEXT = 'A successful field trip entry.';

export const MIN_VOICE_NOTE_SECONDS = 5;

export function resolveParticipationSignals(input: {
  photoSubjectVerified?: boolean | null;
  aiAnalysisResult?: { detectedSubject?: boolean | null } | null;
  proofCheckResult?: { detectedSubject?: boolean | null } | null;
  fieldNoteRaw?: string | null;
  fieldNote?: string | null;
  note?: string | null;
  /** A recorded voice note (5+ seconds) earns the note layer, like writing. */
  voiceNotePresent?: boolean | null;
  locationVerified?: boolean | null;
  latitude?: number | null;
  longitude?: number | null;
} | null | undefined): ParticipationSignals {
  const rawNote = input?.fieldNoteRaw ?? input?.fieldNote ?? input?.note ?? '';
  const noteText = rawNote.trim();
  const writtenNotePresent = noteText.length >= 10 && noteText !== DEFAULT_FIELD_NOTE_TEXT;
  const voiceNotePresent = input?.voiceNotePresent === true;
  return {
    photoSubjectVerified:
      input?.photoSubjectVerified ??
      input?.aiAnalysisResult?.detectedSubject ??
      input?.proofCheckResult?.detectedSubject ??
      false,
    fieldNotePresent: writtenNotePresent || voiceNotePresent,
    fieldNoteViaVoice: voiceNotePresent && !writtenNotePresent,
    locationVerified:
      input?.locationVerified ??
      (input?.latitude != null && input?.longitude != null),
  };
}

/**
 * The receipt lines for a scoring result: base, hint, retry, each earned
 * layer, and the multiplier. They sum exactly to finalScore, so the player
 * and the admin see the same math. Used by the live meter's receipt, the
 * pending estimate, and the final approval.
 */
export interface ScoreBreakdownEvent {
  type: string;
  points: number;
  tripId?: string;
  description: string;
}

export function buildScoreBreakdownEvents(
  result: ScoreCalculationResult,
  tripId?: string,
): ScoreBreakdownEvent[] {
  const events: ScoreBreakdownEvent[] = [
    { type: 'trip_approved', points: result.baseMaxScore, tripId, description: 'Mission Uplink Base' },
  ];
  if (result.hintPenaltyPoints > 0) {
    events.push({ type: 'admin_adjustment', points: -result.hintPenaltyPoints, tripId, description: 'Hint Used (-15%)' });
  }
  const retryLoss = result.reviewerBaseScore - result.reviewerScoreAfterRetry;
  if (retryLoss > 0) {
    events.push({ type: 'admin_adjustment', points: -retryLoss, tripId, description: 'Retry (x0.5)' });
  }
  const layers = result.participationLayers;
  if (layers.photoSubject > 0) {
    events.push({ type: 'quality_bonus', points: layers.photoSubject, tripId, description: 'Photo Subject Match (+25%)' });
  }
  if (layers.fieldNote > 0) {
    events.push({ type: 'field_note_bonus', points: layers.fieldNote, tripId, description: layers.fieldNoteViaVoice ? 'Voice Note (+25%)' : 'Field Note (+25%)' });
  }
  if (layers.location > 0) {
    events.push({ type: 'quality_bonus', points: layers.location, tripId, description: 'Location Captured (+25%)' });
  }
  if (result.bonusPoints > 0) {
    events.push({ type: 'weekly_bonus_booster', points: result.bonusPoints, tripId, description: `[${result.appliedBonusLabel} ${result.appliedMultiplier}x] Multiplier` });
  }
  return events;
}

export function getHintAdjustedMaximum(
  baseMaxScore: number,
  hintUsed: boolean,
  hintPenaltyPercent = DEFAULT_HINT_PENALTY_PERCENT,
): { hintPenaltyPoints: number; adjustedMaxScore: number } {
  const cleanBase = Math.max(0, Math.round(finiteNumber(baseMaxScore, 0)));
  const cleanPercent = clampInteger(hintPenaltyPercent, 0, 100);
  const hintPenaltyPoints = hintUsed ? Math.round(cleanBase * cleanPercent / 100) : 0;
  return {
    hintPenaltyPoints,
    adjustedMaxScore: Math.max(0, cleanBase - hintPenaltyPoints),
  };
}

export function getMissionHint(mission: {
  hint?: MissionHint | null;
  hintText?: string | null;
  description?: string | null;
  theAsk?: string | null;
} | null | undefined): MissionHint {
  const authored = mission?.hint;
  if (authored?.shortText?.trim()) {
    return {
      shortText: authored.shortText.trim(),
      ...(authored.example?.trim() ? { example: authored.example.trim() } : {}),
    };
  }
  if (mission?.hintText?.trim()) {
    return { shortText: mission.hintText.trim() };
  }
  const missionCopy = String(mission?.description || mission?.theAsk || '').trim();
  return {
    shortText: missionCopy
      ? `In plain language: find one clear example of this mission, take a photo where it is easy to see, then explain why it fits.`
      : 'Find one clear example, take a photo where it is easy to see, then explain why it fits the mission.',
  };
}

export function chooseHighestEligibleBonus(bonuses: readonly BonusEligibility[]): BonusEligibility | null {
  return [...bonuses]
    .filter(bonus => bonus.eligible && validMultiplier(bonus.multiplier) > 1)
    .sort((left, right) => {
      const multiplierDifference = right.multiplier - left.multiplier;
      return multiplierDifference !== 0 ? multiplierDifference : left.id.localeCompare(right.id);
    })[0] || null;
}

/**
 * The one live scorer (pending estimate and final approval share it).
 *
 * Layered model — more participation, more points:
 *   base ............ the card's own point value (baseXP)
 *   hint ............ -15% of base when a hint was used
 *   retry ........... x0.5 on the reviewer score for a retry
 *   participation ... +25% of base per earned layer: the right thing in
 *                     the photo (AI subject match), a real field note
 *                     (10+ chars), a captured location. Layers are not
 *                     hint-penalized or retry-halved: you keep what you
 *                     earned by participating in this submission.
 *   multipliers ..... afternoon 1.5x / Lucky Receipt 1.25x / catalyst,
 *                     highest eligible only, applied to base + layers.
 */
export function calculateMissionScore(input: {
  baseMaxScore: number;
  reviewerBaseScore: number;
  hintUsed?: boolean;
  hintPenaltyPercent?: number;
  retryMultiplier?: number;
  perkPoints?: number;
  participation?: ParticipationSignals | null;
  eligibleBonuses?: readonly BonusEligibility[];
}): ScoreCalculationResult {
  const baseMaxScore = Math.max(0, Math.round(finiteNumber(input.baseMaxScore, 0)));
  const hintUsed = input.hintUsed === true;
  const hintPenaltyPercent = hintUsed
    ? clampInteger(input.hintPenaltyPercent ?? DEFAULT_HINT_PENALTY_PERCENT, 0, 100)
    : 0;
  const { hintPenaltyPoints, adjustedMaxScore } = getHintAdjustedMaximum(
    baseMaxScore,
    hintUsed,
    hintPenaltyPercent,
  );
  const reviewerBaseScore = clampInteger(input.reviewerBaseScore, 0, adjustedMaxScore);
  const retryMultiplier = Math.min(1, Math.max(0, finiteNumber(input.retryMultiplier, 1)));
  const reviewerScoreAfterRetry = Math.round(reviewerBaseScore * retryMultiplier);
  const perkPoints = Math.max(0, Math.round(finiteNumber(input.perkPoints, 0)));
  const participationLayers = calculateParticipationLayers(baseMaxScore, input.participation);
  const preBonusScore = reviewerScoreAfterRetry + participationLayers.total + perkPoints;
  const eligibleBonuses = [...(input.eligibleBonuses || [])].filter(bonus => bonus.eligible);
  const appliedBonus = chooseHighestEligibleBonus(eligibleBonuses);
  const appliedMultiplier = appliedBonus ? validMultiplier(appliedBonus.multiplier) : 1;
  const finalScore = Math.max(0, Math.round(preBonusScore * appliedMultiplier));
  const bonusPoints = finalScore - preBonusScore;

  return {
    version: MISSION_SCORING_VERSION,
    baseMaxScore,
    hintUsed,
    hintPenaltyPercent,
    hintPenaltyPoints,
    adjustedMaxScore,
    reviewerBaseScore,
    retryMultiplier,
    reviewerScoreAfterRetry,
    perkPoints,
    participationLayers,
    preBonusScore,
    eligibleBonusIds: eligibleBonuses.map(bonus => bonus.id),
    appliedBonusId: appliedBonus?.id || null,
    appliedBonusLabel: appliedBonus?.label || null,
    appliedMultiplier,
    bonusPoints,
    finalScore,
    eligibleBonuses,
    appliedBonus,
  };
}

export function toScoringSnapshot(result: ScoreCalculationResult, calculatedAt?: unknown): ScoringSnapshot {
  const { eligibleBonuses: _eligibleBonuses, appliedBonus: _appliedBonus, ...snapshot } = result;
  return calculatedAt === undefined ? snapshot : { ...snapshot, calculatedAt };
}
