import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateMissionScore,
  calculateParticipationLayers,
  getHintAdjustedMaximum,
  getMissionBaseMaxScore,
  normalizeMissionScoringConfig,
  resolveParticipationSignals,
  type BonusEligibility,
} from '../logic/missionScoring';

function bonus(id: string, multiplier: number): BonusEligibility {
  return {
    id,
    type: 'random_mission',
    label: id,
    multiplier,
    description: 'Test bonus',
    eligible: true,
    assignmentId: `assignment_${id}`,
  };
}

test('no hint leaves the reviewer maximum unchanged', () => {
  const score = calculateMissionScore({ baseMaxScore: 100, reviewerBaseScore: 92 });
  assert.equal(score.adjustedMaxScore, 100);
  assert.equal(score.hintPenaltyPoints, 0);
  assert.equal(score.finalScore, 92);
});

test('hint applies an integer-safe 15 percent cap before reviewer scoring', () => {
  const score = calculateMissionScore({
    baseMaxScore: 100,
    reviewerBaseScore: 100,
    hintUsed: true,
    hintPenaltyPercent: 15,
  });
  assert.equal(score.hintPenaltyPoints, 15);
  assert.equal(score.adjustedMaxScore, 85);
  assert.equal(score.reviewerBaseScore, 85);
  assert.equal(score.finalScore, 85);
});

test('reviewer input above the hint cap is clamped at the calculation boundary', () => {
  const score = calculateMissionScore({
    baseMaxScore: 225,
    reviewerBaseScore: 999,
    hintUsed: true,
    hintPenaltyPercent: 15,
  });
  assert.equal(score.hintPenaltyPoints, 34);
  assert.equal(score.adjustedMaxScore, 191);
  assert.equal(score.reviewerBaseScore, 191);
});

test('retry and perk rules remain explicit when a hint was used', () => {
  const retry = calculateMissionScore({
    baseMaxScore: 100,
    reviewerBaseScore: 85,
    hintUsed: true,
    hintPenaltyPercent: 15,
    retryMultiplier: 0.5,
  });
  assert.equal(retry.reviewerScoreAfterRetry, 43);
  assert.equal(retry.finalScore, 43);

  const perk = calculateMissionScore({
    baseMaxScore: 100,
    reviewerBaseScore: 80,
    hintUsed: true,
    hintPenaltyPercent: 15,
    perkPoints: 25,
  });
  assert.equal(perk.adjustedMaxScore, 85);
  assert.equal(perk.preBonusScore, 105);
  assert.equal(perk.finalScore, 105);
});

test('hint cap is applied before the single highest eligible bonus', () => {
  const score = calculateMissionScore({
    baseMaxScore: 100,
    reviewerBaseScore: 80,
    hintUsed: true,
    hintPenaltyPercent: 15,
    eligibleBonuses: [bonus('lucky_receipt', 1.25), bonus('afternoon_power_hour', 1.5)],
  });
  assert.equal(score.adjustedMaxScore, 85);
  assert.equal(score.reviewerBaseScore, 80);
  assert.equal(score.appliedBonusId, 'afternoon_power_hour');
  assert.equal(score.appliedMultiplier, 1.5);
  assert.equal(score.bonusPoints, 40);
  assert.equal(score.finalScore, 120);
  assert.notEqual(score.finalScore, 150);
});

test('rounding uses Math.round at the hint and final-score boundaries', () => {
  assert.deepEqual(getHintAdjustedMaximum(101, true, 15), {
    hintPenaltyPoints: 15,
    adjustedMaxScore: 86,
  });
  const score = calculateMissionScore({
    baseMaxScore: 101,
    reviewerBaseScore: 86,
    hintUsed: true,
    hintPenaltyPercent: 15,
    eligibleBonuses: [bonus('lucky_receipt', 1.25)],
  });
  assert.equal(score.finalScore, 108);
});

test('a configured 100 percent hint penalty preserves a legitimate zero cap', () => {
  assert.deepEqual(getHintAdjustedMaximum(100, true, 100), {
    hintPenaltyPoints: 100,
    adjustedMaxScore: 0,
  });
  const score = calculateMissionScore({
    baseMaxScore: 100,
    reviewerBaseScore: 100,
    hintUsed: true,
    hintPenaltyPercent: 100,
  });
  assert.equal(score.reviewerBaseScore, 0);
  assert.equal(score.finalScore, 0);
});

test('older entries without attempt fields receive safe backwards-compatible defaults', () => {
  const score = calculateMissionScore({
    baseMaxScore: 100,
    reviewerBaseScore: 80,
    hintUsed: undefined,
    hintPenaltyPercent: undefined,
    retryMultiplier: undefined,
    perkPoints: undefined,
    eligibleBonuses: undefined,
  });
  assert.equal(score.hintUsed, false);
  assert.equal(score.appliedBonusId, null);
  assert.equal(score.finalScore, 80);
  assert.equal(Number.isFinite(score.finalScore), true);
});

test('scoring configuration accepts an intentional zero-percent hint policy', () => {
  assert.equal(normalizeMissionScoringConfig({ hintPenaltyPercent: 0 }).hintPenaltyPercent, 0);
  const defaults = normalizeMissionScoringConfig({});
  assert.equal(defaults.hintPenaltyPercent, 15);
  assert.equal(defaults.afternoonPowerHour.startHour, 12);
  assert.equal(defaults.afternoonPowerHour.endHourExclusive, 15);
});

test('the scoring ceiling is the card\'s own point value, never a flat rate', () => {
  assert.equal(getMissionBaseMaxScore({ baseXP: 100 }), 100);
  assert.equal(getMissionBaseMaxScore({ baseXP: 125 }), 125);
  assert.equal(getMissionBaseMaxScore({ baseXP: 150 }), 150);
  assert.equal(getMissionBaseMaxScore({ baseXP: 200 }), 200);
  assert.equal(getMissionBaseMaxScore({ basePoints: 150 }), 150);
  assert.equal(getMissionBaseMaxScore({}), 100);
  assert.equal(getMissionBaseMaxScore(null), 100);
});

test('each participation layer pays 25 percent of the card base', () => {
  assert.deepEqual(calculateParticipationLayers(100, { photoSubjectVerified: true, fieldNotePresent: true, locationVerified: true }), {
    photoSubject: 25,
    fieldNote: 25,
    location: 25,
    total: 75,
  });
  assert.deepEqual(calculateParticipationLayers(200, { photoSubjectVerified: true }), {
    photoSubject: 50,
    fieldNote: 0,
    location: 0,
    total: 50,
  });
  assert.deepEqual(calculateParticipationLayers(100, {}), {
    photoSubject: 0,
    fieldNote: 0,
    location: 0,
    total: 0,
  });
});

test('full participation on a 100-point card awards 175 with no multiplier', () => {
  const score = calculateMissionScore({
    baseMaxScore: 100,
    reviewerBaseScore: 100,
    participation: { photoSubjectVerified: true, fieldNotePresent: true, locationVerified: true },
  });
  assert.equal(score.participationLayers.total, 75);
  assert.equal(score.preBonusScore, 175);
  assert.equal(score.finalScore, 175);
});

test('layers survive a hint: the penalty only touches the base', () => {
  const score = calculateMissionScore({
    baseMaxScore: 100,
    reviewerBaseScore: 85,
    hintUsed: true,
    participation: { photoSubjectVerified: true, fieldNotePresent: true, locationVerified: true },
  });
  assert.equal(score.hintPenaltyPoints, 15);
  assert.equal(score.reviewerScoreAfterRetry, 85);
  assert.equal(score.finalScore, 160);
});

test('a retry halves the reviewer score but never the layers', () => {
  const score = calculateMissionScore({
    baseMaxScore: 100,
    reviewerBaseScore: 100,
    retryMultiplier: 0.5,
    participation: { photoSubjectVerified: true, fieldNotePresent: true, locationVerified: true },
  });
  assert.equal(score.reviewerScoreAfterRetry, 50);
  assert.equal(score.finalScore, 125);
});

test('multipliers apply to base plus layers, not base alone', () => {
  const score = calculateMissionScore({
    baseMaxScore: 100,
    reviewerBaseScore: 100,
    participation: { photoSubjectVerified: true, fieldNotePresent: true, locationVerified: true },
    eligibleBonuses: [bonus('afternoon', 1.5)],
  });
  assert.equal(score.preBonusScore, 175);
  assert.equal(score.finalScore, 263);
});

test('missing signals earn nothing', () => {
  const score = calculateMissionScore({ baseMaxScore: 150, reviewerBaseScore: 150 });
  assert.equal(score.participationLayers.total, 0);
  assert.equal(score.finalScore, 150);
});

test('participation signals resolve from raw submission evidence', () => {
  assert.deepEqual(
    resolveParticipationSignals({ aiAnalysisResult: { detectedSubject: true }, fieldNoteRaw: 'This is a real field note.', latitude: 33.7, longitude: -118.2 }),
    { photoSubjectVerified: true, fieldNotePresent: true, locationVerified: true },
  );
  // A short note earns nothing.
  assert.equal(resolveParticipationSignals({ fieldNoteRaw: 'short' }).fieldNotePresent, false);
  // The default text stamped on empty notes never counts as a note.
  assert.equal(resolveParticipationSignals({ fieldNote: 'A successful field trip entry.' }).fieldNotePresent, false);
  // No AI result and no coordinates: nothing earned.
  assert.deepEqual(
    resolveParticipationSignals({}),
    { photoSubjectVerified: false, fieldNotePresent: false, locationVerified: false },
  );
});
