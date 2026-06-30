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

const perfectStandardScoring = getProofRubricScoring(perfectScore, { deckId: 'heatwave-receipts', challengeId: 'heatwave-1' });
assert(perfectStandardScoring.scoringMode === 'standard', 'non-starter mission should use standard scoring mode');
assert(perfectStandardScoring.maxUiPotentialXp === 250, 'standard UI potential should be 250 XP');
assert(perfectStandardScoring.maxAdminAwardableXp === 225, 'standard admin awardable XP should cap at 225');
assert(perfectStandardScoring.reservedPotentialXp === 25, 'standard missions should reserve 25 hidden XP');
assert(perfectStandardScoring.totalXpAwarded === 225, 'perfect standard rubric should award 225 XP');

const mixedScore = calculateProofRubricScore({
  missionMatch: 4,
  proofClarity: 3,
  authenticity: 2,
  fieldNoteQuality: 1,
  fieldtripEnergy: 0,
});
assert(mixedScore.weightedScore === 71.25, `expected weighted score 71.25, got ${mixedScore.weightedScore}`);
assert(mixedScore.recommendation === 'approve_with_judgment', 'mixed rubric should recommend admin judgment');
const mixedStandardScoring = getProofRubricScoring(mixedScore, { deckId: 'socal-summer', challengeId: 'socal-7' });
assert(mixedStandardScoring.totalXpAwarded === 160, `mixed standard rubric should award 160 XP, got ${mixedStandardScoring.totalXpAwarded}`);
assert(mixedStandardScoring.maxUiPotentialXp === 250, 'mixed standard scoring should still show 250 XP potential');
assert(isStarterScoringMission({ challengeId: 'starter-3' }), 'starter-* challenge IDs should count as starter scoring');
assert(!isStarterScoringMission({ deckId: 'heatwave-receipts', challengeId: 'heatwave-3' }), 'seasonal challenge IDs should not count as starter scoring');
assert(getProofRubricRecommendationLabel('likely_insufficient') === 'Likely needs more proof or rejection', 'label should be human readable');

console.log('PROOF_RUBRIC_TESTS_COMPLETE. ALL_TESTS_PASSED.');
