import { Entry, Season, ScoreEvent } from '../types/game';
import { TripCard, ChallengeLevel } from '../types/challenges';

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
  }
) {
  let scoreEvents: Omit<ScoreEvent, 'id' | 'userId' | 'userName' | 'createdAt'>[] = [];
  
  // Base Points from Level or baseXP
  let levelPoints = 0;
  if (challenge.levels && challenge.levels[entry.selectedLevel as ChallengeLevel]) {
    levelPoints = challenge.levels[entry.selectedLevel as ChallengeLevel].points;
  } else {
    // Fallback to baseXP with standard multipliers
    const base = challenge.baseXP || challenge.basePoints || 100;
    const multipliers = {
      'Standard': 1,
      'Advanced': 1.5,
      'Certified': 2
    };
    levelPoints = Math.round(base * multipliers[entry.selectedLevel as ChallengeLevel || 'Standard']);
  }

  scoreEvents.push({
    type: 'trip_approved',
    points: levelPoints,
    entryId: entry.id,
    tripId: challenge.id,
    description: `Challenge Completion: ${challenge.title} (${entry.selectedLevel})`
  });

  // Photo Proof Bonus
  if (entry.proofImage) {
    scoreEvents.push({
      type: 'quality_bonus',
      points: 25,
      entryId: entry.id,
      description: 'Valid Photo Proof'
    });
  }

  // Field Note Bonus
  if (entry.fieldNote && entry.fieldNote.length >= 10) {
    scoreEvents.push({
      type: 'field_note_bonus',
      points: 25,
      entryId: entry.id,
      description: 'Field Note Documentation'
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
