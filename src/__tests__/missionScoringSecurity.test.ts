import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const server = readFileSync('server.ts', 'utf8');
const capture = readFileSync('src/pages/Capture.tsx', 'utf8');
const briefing = readFileSync('src/components/FieldClipboard.tsx', 'utf8');
const resultCard = readFileSync('src/components/MissionResultCard.tsx', 'utf8');

test('hint and attempt mutations run through authenticated transaction-backed server routes', () => {
  const start = server.slice(server.indexOf("app.post('/api/missions/attempts/start'"), server.indexOf('app.post("/api/voting/weekly/vote"'));
  assert.match(start, /authenticate/);
  assert.match(start, /runTransaction/);
  assert.match(start, /buildMissionHintRevealPlan/);
  assert.match(start, /current\.userId !== req\.user\.uid/);
  assert.match(start, /isLinkedRetry/);
  assert.match(start, /Timestamp\.fromDate\(now\)/);
});

test('approval recalculates from rubric and protected attempt instead of trusting client totals', () => {
  const routeStart = server.indexOf('app.post("/api/admin/proof-review/action"');
  const route = server.slice(routeStart, server.indexOf('app.post("/api/admin/grant-starter-bypass"', routeStart));
  assert.match(server, /function buildServerReviewRubric[\s\S]*calculateProofRubricScore/);
  assert.match(route, /buildServerReviewRubric/);
  assert.match(route, /calculateMissionScore/);
  assert.match(route, /getValidatedMissionBonuses/);
  assert.match(route, /toScoringSnapshot/);
  assert.match(route, /if \(action === 'approve'\) \{[\s\S]*baseUpdate\.scoringSnapshot = scoringSnapshot/);
  assert.match(route, /scoringSnapshot: action === 'approve' \? scoringSnapshot : null/);
  assert.match(route, /ledgerEventId: `score_\$\{resolution\.entryId\}`/);
  assert.doesNotMatch(route, /metadata\.scoring\.totalXpAwarded/);
});

test('capture and briefing no longer generate Optional Boost or receipt challenge scoring', () => {
  assert.doesNotMatch(capture, /Optional Boost|generateReceiptChallenge|receiptChallenge/);
  assert.doesNotMatch(briefing, /Optional Boost|receiptChallenge/);
  assert.match(briefing, /Optional advice\. No extra points\./);
  assert.match(briefing, /Need a Hint\?/);
  assert.match(capture, /calculateMissionScore/);
  assert.doesNotMatch(capture, /Math\.round\(awardedXP \* 0\.5\)/);
  assert.doesNotMatch(briefing, /maxScoreBeforeHint \* missionAttempt\.hintPenaltyPercent/);
});

test('pending submission UI does not present an estimate as approved XP', () => {
  assert.match(resultCard, /const isApproved = reviewStatus === 'approved'/);
  assert.match(resultCard, /isApproved \? \(scoring\?\.totalPoints \|\| 0\) \+ ftBonus : 0/);
  assert.match(resultCard, /isApproved && showMathWizard && scoring/);
  assert.match(resultCard, /PROOF SUBMITTED/);
  assert.match(resultCard, /Pending Review/);
});

test('weekly random assignments are persisted once and are not client-rerolled', () => {
  const rotation = server.slice(server.indexOf('const ensureMissionBonusRotation'), server.indexOf('const getMissionAttemptSummary'));
  assert.match(rotation, /bonusRotations/);
  assert.match(rotation, /if \(currentSnap\.exists\) return/);
  assert.match(rotation, /runTransaction/);
  assert.match(rotation, /transaction\.create/);
  assert.match(rotation, /selectedMissionIds/);
  assert.match(rotation, /seedVersion/);
});
