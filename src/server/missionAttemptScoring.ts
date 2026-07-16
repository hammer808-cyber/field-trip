import { getHintAdjustedMaximum } from '../logic/missionScoring';

export interface HintableMissionAttempt {
  hintUsed?: boolean;
  hintUsedAt?: unknown;
  hintPenaltyPercent?: number;
  hintPenaltyPoints?: number;
  maxScoreBeforeHint?: number;
  maxScoreAfterHint?: number;
  updatedAt?: unknown;
  [key: string]: unknown;
}

export interface MissionHintRevealPlan {
  changed: boolean;
  update: Partial<HintableMissionAttempt>;
  attempt: HintableMissionAttempt;
}

/**
 * Builds the one-way hint mutation. The caller supplies an authoritative
 * server timestamp so this domain helper remains deterministic in tests.
 */
export function buildMissionHintRevealPlan(
  current: HintableMissionAttempt,
  serverTimestamp: unknown,
): MissionHintRevealPlan {
  if (current.hintUsed === true) {
    return { changed: false, update: {}, attempt: current };
  }

  const { hintPenaltyPoints, adjustedMaxScore } = getHintAdjustedMaximum(
    Number(current.maxScoreBeforeHint || 0),
    true,
    Number(current.hintPenaltyPercent || 0),
  );
  const update: Partial<HintableMissionAttempt> = {
    hintUsed: true,
    hintUsedAt: serverTimestamp,
    hintPenaltyPoints,
    maxScoreAfterHint: adjustedMaxScore,
    updatedAt: serverTimestamp,
  };

  return {
    changed: true,
    update,
    attempt: { ...current, ...update },
  };
}
