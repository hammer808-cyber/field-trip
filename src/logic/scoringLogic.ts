import { Entry, Season, ScoreEvent } from '../types/game';
import { TripCard, ChallengeLevel } from '../types/challenges';
import { getWeeklyBonusForWeek } from '../data/weeklyBonuses';
import { calculateWeeklyBonusReward, getActiveWeeklyBonus } from '../services/weeklyBonusService';
import { WeeklyCatalyst, evaluateProofForCatalyst } from '../services/weeklyCatalystService';

export function calculateSubmissionPoints(
  entry: Entry,
  challenge: TripCard,
  options: {
    isFirstSubmission?: boolean;
    isChaosModifierCompleted?: boolean;
    isSabotageSurvived?: boolean;
    sabotageSeverity?: 'minor' | 'major';
    isVoteWinner?: boolean;
    isFieldCheckValid?: boolean;
    isFinalCrown?: boolean;
    daysLate?: number;
    hintUsed?: boolean;
    weekNumber?: number;
    skipWeeklyBonus?: boolean;
    catalyst?: WeeklyCatalyst;
    catalystMultiplier?: number;
    catalystTitle?: string;
  }
) {
  let scoreEvents: Omit<ScoreEvent, 'id' | 'userId' | 'userName' | 'createdAt'>[] = [];
  
  // 1. Base points
  const baseMissionPoints = challenge.baseXP || challenge.basePoints || 100;
  
  // 2. Define quality-based multipliers to replace manually high chosen tiers
  const proofQualityBonus = entry.proofImage || entry.imageUrl || entry.photoUrl ? 1.25 : 1.0;
  const fieldNoteBonus = (entry.fieldNote || entry.note || '').trim().length >= 10 ? 1.25 : 1.0;
  const optionalStickerBonus = 1.0; // static 1.0 for now, placeholder for any future custom sticker boosts

  // Base Mission points event
  let accumulatedPoints = baseMissionPoints;
  scoreEvents.push({
    type: 'trip_approved',
    points: baseMissionPoints,
    entryId: entry.id,
    tripId: challenge.id,
    description: `Mission Uplink Base`
  });

  // Photo quality bonus (multiplicative style displayed as bonus sum)
  if (proofQualityBonus > 1.0) {
    const qBonus = Math.round(accumulatedPoints * (proofQualityBonus - 1.0));
    accumulatedPoints += qBonus;
    scoreEvents.push({
      type: 'quality_bonus',
      points: qBonus,
      entryId: entry.id,
      description: 'Proof Quality Boost (1.25x)'
    });
  }

  // Field log documentation bonus
  if (fieldNoteBonus > 1.0) {
    const fnBonus = Math.round(accumulatedPoints * (fieldNoteBonus - 1.0));
    accumulatedPoints += fnBonus;
    scoreEvents.push({
      type: 'field_note_bonus',
      points: fnBonus,
      entryId: entry.id,
      description: 'Field Log Description Boost (1.25x)'
    });
  }

  // Active Weekly Catalyst application
  let catalystQualified = false;
  let catalystMultiplier = 1.0;
  let catalystTitle = '';

  if (options.catalyst) {
    const evResult = evaluateProofForCatalyst(entry, options.catalyst, {
      challengeTags: challenge.tags || [],
      challengeTitle: challenge.title || '',
      challengeDescription: challenge.description || ''
    });
    catalystQualified = evResult.qualified;
    if (catalystQualified) {
      catalystMultiplier = options.catalyst.multiplier;
      catalystTitle = options.catalyst.shortLabel;
    }
  } else if (options.catalystMultiplier) {
    catalystMultiplier = options.catalystMultiplier;
    catalystQualified = catalystMultiplier > 1.0;
    catalystTitle = options.catalystTitle || 'Catalyst';
  }

  if (catalystQualified && catalystMultiplier > 1.0) {
    const catBonus = Math.round(accumulatedPoints * (catalystMultiplier - 1.0));
    accumulatedPoints += catBonus;
    scoreEvents.push({
      type: 'weekly_bonus_booster',
      points: catBonus,
      entryId: entry.id,
      description: `[Catalyst Boost: ${catalystTitle} ${catalystMultiplier}x] +${catBonus} XP`
    });
  }

  // Hint penalty check
  if (options.hintUsed) {
    const hintPenaltyPoints = Math.round(accumulatedPoints * -0.15);
    accumulatedPoints += hintPenaltyPoints;
    scoreEvents.push({
      type: 'admin_adjustment',
      points: hintPenaltyPoints,
      entryId: entry.id,
      description: `Hint Usage Adjustment (-15%)`
    });
  }

  // First Submission Bonus
  if (options.isFirstSubmission) {
    scoreEvents.push({
      type: 'first_submission_bonus',
      points: 25,
      entryId: entry.id,
      description: 'Week First Valid Submission'
    });
  }

  // Chaos Modifier
  if (options.isChaosModifierCompleted) {
    scoreEvents.push({
      type: 'chaos_modifier_bonus',
      points: 50,
      entryId: entry.id,
      description: 'Chaos Modifier Completed'
    });
  }

  // Sabotage Survival
  if (options.isSabotageSurvived) {
    const points = options.sabotageSeverity === 'major' ? 75 : 50;
    scoreEvents.push({
      type: 'sabotage_survived_bonus',
      points,
      entryId: entry.id,
      description: `Survived ${options.sabotageSeverity} Sabotage`
    });
  }

  // Vote Winner
  if (options.isVoteWinner) {
    scoreEvents.push({
      type: 'vote_winner_bonus',
      points: 100,
      entryId: entry.id,
      description: 'Weekly Vote Winner'
    });
  }

  // Field Check (Snitch) Valid Bonus
  if (options.isFieldCheckValid) {
    scoreEvents.push({
      type: 'field_check_bonus',
      points: 75,
      entryId: entry.id,
      description: 'Valid Field Check Reward'
    });
  }

  // Final Crown
  if (options.isFinalCrown) {
    scoreEvents.push({
      type: 'final_crown_bonus',
      points: 250,
      entryId: entry.id,
      description: 'Certified Icon'
    });
  }

  // --- Dynamic Rotating Weekly Boosts Scoring Wiring ---
  const activeWeekNum = options.weekNumber || challenge.weekNumber || 1;
  const weeklyBonus = getActiveWeeklyBonus(activeWeekNum);
  if (weeklyBonus && !options.skipWeeklyBonus) {
    const bonusReward = calculateWeeklyBonusReward(
      weeklyBonus.id,
      entry,
      challenge,
      accumulatedPoints,
      !!options.isFirstSubmission
    );

    if (bonusReward.applied) {
      if (bonusReward.multiplier > 1.0) {
        // Multiplier bonus (e.g. urban uplink 2x, photo-proof 1.2x)
        const baseSum = scoreEvents.reduce((acc, ev) => acc + ev.points, 0);
        const pointsReward = Math.round(baseSum * (bonusReward.multiplier - 1.0));
        if (pointsReward > 0) {
          scoreEvents.push({
            type: 'weekly_bonus_booster',
            points: pointsReward,
            entryId: entry.id,
            description: `[${bonusReward.bonusTitle} ${bonusReward.multiplier}X] Multiplier expansion: +${pointsReward} XP`
          });
        }
      } else if (bonusReward.xp > 0) {
        // XP bonus
        scoreEvents.push({
          type: 'weekly_bonus_booster',
          points: bonusReward.xp,
          entryId: entry.id,
          description: `[${bonusReward.bonusTitle}] +${bonusReward.xp} XP Signal Alignment`
        });
      } else if (bonusReward.points > 0) {
        // Point bonus
        scoreEvents.push({
          type: 'weekly_bonus_booster',
          points: bonusReward.points,
          entryId: entry.id,
          description: `[${bonusReward.bonusTitle}] +${bonusReward.points} Points Signal Alignment`
        });
      } else if (bonusReward.tokens > 0) {
        // Tokens bonus
        scoreEvents.push({
          type: 'weekly_bonus_booster',
          points: bonusReward.tokens,
          entryId: entry.id,
          description: `[${bonusReward.bonusTitle}] +${bonusReward.tokens} Tokens Synced`
        });
      } else if (bonusReward.shield) {
        scoreEvents.push({
          type: 'weekly_bonus_booster',
          points: 5,
          entryId: entry.id,
          description: `[${bonusReward.bonusTitle}] Multiplier Shield Calibration Complete`
        });
      }
    }
  }

  // Late Penalty
  let totalPoints = scoreEvents.reduce((acc, ev) => acc + ev.points, 0);
  if (options.daysLate && options.daysLate > 0) {
    const penaltyFactor = applyLatePenalty(options.daysLate);
    const originalPoints = totalPoints;
    totalPoints = Math.round(totalPoints * penaltyFactor);
    
    if (penaltyFactor < 1) {
      scoreEvents.push({
        type: 'admin_adjustment',
        points: totalPoints - originalPoints,
        entryId: entry.id,
        description: `Late Submission Penalty (${Math.round((1 - penaltyFactor) * 100)}%)`
      });
    }
  }

  return { totalPoints, scoreEvents };
}

export function applyLatePenalty(daysLate: number): number {
  if (daysLate <= 0) return 1.0;
  if (daysLate <= 7) return 0.5;
  return 0; // Only completion points (handled by returning 0 for leaderboard relevant points)
}

export function calculateWeeklyScore(events: ScoreEvent[]) {
  return events.reduce((acc, ev) => acc + ev.points, 0);
}

export function calculateCrewWeeklyScore(
  topThreeScores: number[],
  bonuses: {
    crewChallengePoints: number;
    participationRate: number;
    voteWinnerCount: number;
    chaosBonusCount: number;
  },
  penalties: number = 0
) {
  const avgTopThree = (topThreeScores?.length || 0) > 0 
    ? topThreeScores.reduce((a, b) => a + b, 0) / Math.min(topThreeScores.length, 3) 
    : 0;
  
  let participationBonus = 0;
  if (bonuses.participationRate >= 1.0) participationBonus = 150;
  else if (bonuses.participationRate >= 0.75) participationBonus = 100;
  else if (bonuses.participationRate >= 0.50) participationBonus = 50;
  else if (bonuses.participationRate >= 0.25) participationBonus = 25;

  const total = 
    avgTopThree + 
    bonuses.crewChallengePoints + 
    participationBonus + 
    (bonuses.voteWinnerCount * 75) + 
    (bonuses.chaosBonusCount * 50) - 
    penalties;

  return Math.round(total);
}

export function calculateLeaderboard(users: { id: string; name: string; events: ScoreEvent[] }[]) {
  return users
    .map(u => ({
      userId: u.id,
      userName: u.name,
      points: calculateWeeklyScore(u.events),
      entriesCount: u.events.filter(e => e.type === 'trip_approved').length
    }))
    .sort((a, b) => b.points - a.points || b.entriesCount - a.entriesCount)
    .map((u, i) => ({ ...u, rank: i + 1 }));
}
