export type ProofRubricCategoryId =
  | 'missionMatch'
  | 'proofClarity'
  | 'authenticity'
  | 'fieldNoteQuality'
  | 'fieldtripEnergy';

export type ProofRubricRecommendation =
  | 'strong_approval_candidate'
  | 'approve_with_judgment'
  | 'needs_closer_review'
  | 'likely_insufficient';

export type ProofRubricRatings = Record<ProofRubricCategoryId, number>;

export interface ProofRubricCategory {
  id: ProofRubricCategoryId;
  label: string;
  description: string;
  weight: number;
  ratings: Array<{ value: number; label: string }>;
}

export interface ProofRubricScore {
  version: 'v1';
  missionMatch: number;
  proofClarity: number;
  authenticity: number;
  fieldNoteQuality: number;
  fieldtripEnergy: number;
  rawScore: number;
  normalizedScore: number;
  weightedScore: number;
  recommendation: ProofRubricRecommendation;
}

export type ProofScoringMode = 'starter' | 'standard';

export interface ProofRubricScoring {
  rubricVersion: 'v1';
  normalizedRubricScore: number;
  rawRubricScore: number;
  maxUiPotentialXp: 100 | 250;
  maxAdminAwardableXp: 100 | 225;
  reservedPotentialXp: 0 | 25;
  awardedXp: number;
  hiddenBonusXpAwarded: 0;
  totalXpAwarded: number;
  scoringMode: ProofScoringMode;
}

export interface ProofScoringMissionLike {
  deckId?: string | null;
  deckType?: string | null;
  challengeId?: string | null;
  missionId?: string | null;
  tripId?: string | null;
  isStarter?: boolean | null;
  countsTowardStarter?: boolean | null;
}

export const PROOF_RUBRIC_VERSION = 'v1' as const;

export const PROOF_RUBRIC_CATEGORIES: ProofRubricCategory[] = [
  {
    id: 'missionMatch',
    label: 'Mission Match',
    description: 'Does this actually satisfy the mission?',
    weight: 40,
    ratings: [
      { value: 0, label: 'Nope, wrong mission' },
      { value: 1, label: 'Weak match' },
      { value: 2, label: 'Mostly there' },
      { value: 3, label: 'Clearly matches' },
      { value: 4, label: 'Nailed it' },
    ],
  },
  {
    id: 'proofClarity',
    label: 'Proof Clarity',
    description: 'Can you confidently see what is being submitted?',
    weight: 25,
    ratings: [
      { value: 0, label: 'Unusable' },
      { value: 1, label: 'Very unclear' },
      { value: 2, label: 'Partly visible' },
      { value: 3, label: 'Clear' },
      { value: 4, label: 'Crystal clear' },
    ],
  },
  {
    id: 'authenticity',
    label: 'Authenticity / Trust',
    description: 'Does it feel original, genuine, and consistent?',
    weight: 20,
    ratings: [
      { value: 0, label: 'Strong concern' },
      { value: 1, label: 'Suspicious' },
      { value: 2, label: 'Neutral' },
      { value: 3, label: 'Credible' },
      { value: 4, label: 'High trust' },
    ],
  },
  {
    id: 'fieldNoteQuality',
    label: 'Field Note Quality',
    description: 'Does the note add useful context?',
    weight: 10,
    ratings: [
      { value: 0, label: 'Missing / irrelevant' },
      { value: 1, label: 'Minimal' },
      { value: 2, label: 'Basic context' },
      { value: 3, label: 'Thoughtful' },
      { value: 4, label: 'Memorable' },
    ],
  },
  {
    id: 'fieldtripEnergy',
    label: 'Fieldtrip Energy',
    description: 'Does it have the playful outside-world spark?',
    weight: 5,
    ratings: [
      { value: 0, label: 'No visible effort' },
      { value: 1, label: 'Bare minimum' },
      { value: 2, label: 'Baseline' },
      { value: 3, label: 'Creative' },
      { value: 4, label: 'Excellent energy' },
    ],
  },
];

export const DEFAULT_PROOF_RUBRIC_RATINGS: ProofRubricRatings = {
  missionMatch: 2,
  proofClarity: 2,
  authenticity: 2,
  fieldNoteQuality: 2,
  fieldtripEnergy: 2,
};

export function getProofRubricRecommendation(weightedScore: number): ProofRubricRecommendation {
  if (weightedScore >= 80) return 'strong_approval_candidate';
  if (weightedScore >= 60) return 'approve_with_judgment';
  if (weightedScore >= 40) return 'needs_closer_review';
  return 'likely_insufficient';
}

export function getProofRubricRecommendationLabel(recommendation: ProofRubricRecommendation): string {
  switch (recommendation) {
    case 'strong_approval_candidate':
      return 'Strong approval candidate';
    case 'approve_with_judgment':
      return 'Approve with admin judgment';
    case 'needs_closer_review':
      return 'Needs closer review';
    case 'likely_insufficient':
      return 'Likely needs more proof or rejection';
  }
}

export function calculateProofRubricScore(ratings: ProofRubricRatings): ProofRubricScore {
  const cleanRatings = PROOF_RUBRIC_CATEGORIES.reduce((acc, category) => {
    const raw = Number(ratings[category.id]);
    acc[category.id] = Number.isFinite(raw) ? Math.min(4, Math.max(0, raw)) : 0;
    return acc;
  }, {} as ProofRubricRatings);

  const rawScore = PROOF_RUBRIC_CATEGORIES.reduce((sum, category) => sum + cleanRatings[category.id], 0);
  const normalizedScore = (rawScore / (PROOF_RUBRIC_CATEGORIES.length * 4)) * 100;
  const weightedScore = PROOF_RUBRIC_CATEGORIES.reduce((sum, category) => {
    return sum + (cleanRatings[category.id] / 4) * category.weight;
  }, 0);

  return {
    version: PROOF_RUBRIC_VERSION,
    ...cleanRatings,
    rawScore: Number(rawScore.toFixed(2)),
    normalizedScore: Number(normalizedScore.toFixed(2)),
    weightedScore: Number(weightedScore.toFixed(2)),
    recommendation: getProofRubricRecommendation(weightedScore),
  };
}

export function isStarterScoringMission(mission: ProofScoringMissionLike | null | undefined): boolean {
  if (!mission) return false;
  const deckId = String(mission.deckId || '').toLowerCase().trim();
  const deckType = String(mission.deckType || '').toLowerCase().trim();
  const missionId = String(mission.challengeId || mission.missionId || mission.tripId || '').toLowerCase().trim();

  return mission.isStarter === true ||
    mission.countsTowardStarter === true ||
    deckType === 'starter' ||
    deckId === 'starter-signals' ||
    missionId.startsWith('starter-');
}

export function getProofRubricScoring(
  score: Pick<ProofRubricScore, 'version' | 'rawScore' | 'normalizedScore' | 'weightedScore'>,
  mission: ProofScoringMissionLike | null | undefined
): ProofRubricScoring {
  const scoringMode: ProofScoringMode = isStarterScoringMission(mission) ? 'starter' : 'standard';
  const maxUiPotentialXp = scoringMode === 'starter' ? 100 : 250;
  const maxAdminAwardableXp = scoringMode === 'starter' ? 100 : 225;
  const reservedPotentialXp = scoringMode === 'starter' ? 0 : 25;
  const awardedXp = Math.round((score.weightedScore / 100) * maxAdminAwardableXp);
  const finalAwardedXp = Math.min(Math.max(0, awardedXp), maxAdminAwardableXp);

  return {
    rubricVersion: score.version,
    normalizedRubricScore: score.normalizedScore,
    rawRubricScore: score.rawScore,
    maxUiPotentialXp,
    maxAdminAwardableXp,
    reservedPotentialXp,
    awardedXp: finalAwardedXp,
    hiddenBonusXpAwarded: 0,
    totalXpAwarded: finalAwardedXp,
    scoringMode,
  };
}

export function getProofRubricScoringContextLabel(scoring: ProofRubricScoring): string {
  return scoring.scoringMode === 'starter' ? 'Starter Signal Scoring' : 'Field Scoring';
}
