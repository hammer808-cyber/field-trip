import {
  calculateProofRubricScore,
  getProofRubricScoring,
  getProofRubricRecommendationLabel,
  isStarterScoringMission,
  type ProofRubricRatings,
} from '../logic/proofRubric';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

console.log('RUNNING_PROOF_RUBRIC_TESTS...');

const perfect: ProofRubricRatings = {
  missionMatch: 4,
  proofClarity: 4,
  authenticity: 4,
  fieldNoteQuality: 4,
  fieldtripEnergy: 4,
};

const perfectScore = calculateProofRubricScore(perfect);
assert(perfectScore.rawScore === 20, 'perfect rubric raw score should be 20');
assert(perfectScore.normalizedScore === 100, 'perfect rubric normalized score should be 100');
assert(perfectScore.weightedScore === 100, 'perfect rubric weighted score should be 100');
assert(perfectScore.recommendation === 'strong_approval_candidate', 'perfect rubric should recommend strong approval');

const perfectStarterScoring = getProofRubricScoring(perfectScore, { deckId: 'starter-signals', challengeId: 'starter-1' });
assert(perfectStarterScoring.scoringMode === 'starter', 'starter mission should use starter scoring mode');
assert(perfectStarterScoring.maxUiPotentialXp === 100, 'starter UI potential should cap at 100 XP');
assert(perfectStarterScoring.maxAdminAwardableXp === 100, 'starter admin awardable XP should cap at 100');
assert(perfectStarterScoring.reservedPotentialXp === 0, 'starter missions should not reserve hidden XP');
assert(perfectStarterScoring.totalXpAwarded === 100, 'perfect starter rubric should award 100 XP');

const perfectStandardScoring = getProofRubricScoring(perfectScore, { deckId: 'heatwave-receipts', challengeId: 'heatwave-1', baseXP: 150 });
assert(perfectStandardScoring.scoringMode === 'standard', 'non-starter mission should use standard scoring mode');
assert(perfectStandardScoring.maxUiPotentialXp === 150, 'standard UI should show the card\'s own 150 XP ceiling');
assert(perfectStandardScoring.maxAdminAwardableXp === 150, 'standard admin awardable XP should cap at the card\'s 150 XP');
assert(perfectStandardScoring.reservedPotentialXp === 0, 'standard missions should not advertise hidden XP');
assert(perfectStandardScoring.totalXpAwarded === 150, 'perfect standard rubric should award the card\'s 150 XP');

const mixedScore = calculateProofRubricScore({
  missionMatch: 4,
  proofClarity: 3,
  authenticity: 2,
  fieldNoteQuality: 1,
  fieldtripEnergy: 0,
});
assert(mixedScore.weightedScore === 71.25, `expected weighted score 71.25, got ${mixedScore.weightedScore}`);
assert(mixedScore.recommendation === 'approve_with_judgment', 'mixed rubric should recommend admin judgment');
const mixedStandardScoring = getProofRubricScoring(mixedScore, { deckId: 'socal-summer', challengeId: 'socal-7', baseXP: 125 });
assert(mixedStandardScoring.totalXpAwarded === 89, `mixed standard rubric should award 89 XP (71.25% of the card's 125), got ${mixedStandardScoring.totalXpAwarded}`);
assert(mixedStandardScoring.maxUiPotentialXp === 125, 'mixed standard scoring should show the card\'s 125 XP ceiling');
assert(isStarterScoringMission({ challengeId: 'starter-3' }), 'starter-* challenge IDs should count as starter scoring');
assert(!isStarterScoringMission({ deckId: 'heatwave-receipts', challengeId: 'heatwave-3' }), 'seasonal challenge IDs should not count as starter scoring');
assert(getProofRubricRecommendationLabel('likely_insufficient') === 'Likely needs more proof or rejection', 'label should be human readable');

console.log('PROOF_RUBRIC_TESTS_COMPLETE. ALL_TESTS_PASSED.');
