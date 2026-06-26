import {
  calculateProofRubricScore,
  getProofRubricRecommendationLabel,
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

const mixedScore = calculateProofRubricScore({
  missionMatch: 4,
  proofClarity: 3,
  authenticity: 2,
  fieldNoteQuality: 1,
  fieldtripEnergy: 0,
});
assert(mixedScore.weightedScore === 71.25, `expected weighted score 71.25, got ${mixedScore.weightedScore}`);
assert(mixedScore.recommendation === 'approve_with_judgment', 'mixed rubric should recommend admin judgment');
assert(getProofRubricRecommendationLabel('likely_insufficient') === 'Likely needs more proof or rejection', 'label should be human readable');

console.log('PROOF_RUBRIC_TESTS_COMPLETE. ALL_TESTS_PASSED.');
