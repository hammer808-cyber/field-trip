import type { ProofScoringMissionLike } from './proofRubric';
import { isStarterScoringMission } from './proofRubric';

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

export function getMissionBaseMaxScore(mission: ProofScoringMissionLike | null | undefined): number {
  return isStarterScoringMission(mission) ? 100 : 225;
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

export function calculateMissionScore(input: {
  baseMaxScore: number;
  reviewerBaseScore: number;
  hintUsed?: boolean;
  hintPenaltyPercent?: number;
  retryMultiplier?: number;
  perkPoints?: number;
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
  const preBonusScore = reviewerScoreAfterRetry + perkPoints;
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
