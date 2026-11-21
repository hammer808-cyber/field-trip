import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { resolveMissionById } from '../logic/missionResolver';
import {
  aiConfidencePercent,
  extractAiAnalysis,
  isTrustworthyAiAnalysis,
  normalizeAiConfidence,
  suggestAiRubric,
  suggestedActionForAiSuggestion,
} from '../logic/aiSuggestion';

function makeEntry(overrides: any = {}) {
  const analysis = {
    detectedSubject: true,
    confidence: 0.9,
    missionMatchScore: 88,
    detectedItems: ['tacos', 'food truck'],
    missingItems: [],
    modelUsed: 'gemini-1.5-flash',
    status: 'detected',
    ...(overrides.analysis || {}),
  };
  const verification = {
    proofTrustScore: 85,
    aiRiskScore: 10,
    duplicateWarning: null,
    riskReasons: [],
    ...(overrides.verification || {}),
  };
  const entry: any = {
    aiAnalysisResult: overrides.analysis === null ? null : analysis,
    proofCheckResult: overrides.analysis === null ? null : analysis,
    verification,
    fieldNote: overrides.fieldNote !== undefined
      ? overrides.fieldNote
      : 'Found the truck on 5th street, line out the door, breakfast tacos still warm.',
  };
  if (overrides.voiceNoteDurationSec !== undefined) entry.voiceNoteDurationSec = overrides.voiceNoteDurationSec;
  if (overrides.voiceNotePresent !== undefined) entry.voiceNotePresent = overrides.voiceNotePresent;
  return entry;
}

function suggested(entry: any) {
  const result = suggestAiRubric(entry);
  assert.equal(result.available, true, `expected a suggestion, got: ${JSON.stringify(result)}`);
  if (!result.available) throw new Error('unreachable');
  return result.suggestion;
}

// --- Mission Match bands (missionMatchScore 0–100) ---

test('ai suggestion: mission match bands hit every boundary', () => {
  const cases: Array<[number, number]> = [
    [90, 4], [89, 3], [75, 3], [74, 2], [50, 2], [49, 1], [25, 1], [24, 0], [0, 0],
  ];
  for (const [score, expected] of cases) {
    const suggestion = suggested(makeEntry({ analysis: { missionMatchScore: score } }));
    assert.equal(suggestion.ratings.missionMatch, expected, `missionMatchScore ${score}`);
  }
});

test('ai suggestion: missing match score falls back to the detected-subject verdict', () => {
  const withSubject = suggested(makeEntry({ analysis: { missionMatchScore: undefined } }));
  assert.equal(withSubject.ratings.missionMatch, 2);
  assert.match(withSubject.reasons.missionMatch, /no match score/);
  const withoutSubject = suggested(makeEntry({ analysis: { missionMatchScore: undefined, detectedSubject: false } }));
  assert.equal(withoutSubject.ratings.missionMatch, 0);
});

test('ai suggestion: match score falls back to the proofReviews verification block', () => {
  const entry = makeEntry({ analysis: { missionMatchScore: undefined } });
  entry.verification.missionMatchScore = 80;
  assert.equal(suggested(entry).ratings.missionMatch, 3);
});

// --- Proof Clarity bands (confidence 0–1) ---

test('ai suggestion: proof clarity bands hit every boundary', () => {
  const cases: Array<[number, number]> = [
    [0.85, 4], [0.84, 3], [0.7, 3], [0.69, 2], [0.5, 2], [0.49, 1], [0.3, 1], [0.29, 0], [0, 0],
  ];
  for (const [confidence, expected] of cases) {
    const suggestion = suggested(makeEntry({ analysis: { confidence } }));
    assert.equal(suggestion.ratings.proofClarity, expected, `confidence ${confidence}`);
  }
});

test('ai suggestion: a 0–100 confidence is normalized to 0–1', () => {
  assert.equal(normalizeAiConfidence(91), 0.91);
  assert.equal(normalizeAiConfidence(0.91), 0.91);
  assert.equal(normalizeAiConfidence(null), null);
  assert.equal(suggested(makeEntry({ analysis: { confidence: 91 } })).ratings.proofClarity, 4);
  assert.equal(aiConfidencePercent(makeEntry({ analysis: { confidence: 91 } })), 91);
  assert.equal(aiConfidencePercent(makeEntry({ analysis: null })), null);
});

// --- Authenticity / Trust bands ---

test('ai suggestion: authenticity bands follow duplicate, risk, then trust', () => {
  assert.equal(
    suggested(makeEntry({ verification: { duplicateWarning: 'exact_duplicate' } })).ratings.authenticity,
    0,
  );
  assert.equal(
    suggested(makeEntry({ verification: { duplicateWarning: 'near_duplicate' } })).ratings.authenticity,
    1,
  );
  // Risk >= 60 beats a high trust score.
  assert.equal(
    suggested(makeEntry({ verification: { aiRiskScore: 60, proofTrustScore: 90 } })).ratings.authenticity,
    1,
  );
  assert.equal(
    suggested(makeEntry({ verification: { aiRiskScore: 59, proofTrustScore: 85 } })).ratings.authenticity,
    4,
  );
  assert.equal(
    suggested(makeEntry({ verification: { aiRiskScore: 10, proofTrustScore: 80 } })).ratings.authenticity,
    4,
  );
  assert.equal(
    suggested(makeEntry({ verification: { aiRiskScore: 10, proofTrustScore: 79 } })).ratings.authenticity,
    3,
  );
  assert.equal(
    suggested(makeEntry({ verification: { aiRiskScore: 10, proofTrustScore: 60 } })).ratings.authenticity,
    3,
  );
  assert.equal(
    suggested(makeEntry({ verification: { aiRiskScore: 10, proofTrustScore: 59 } })).ratings.authenticity,
    2,
  );
  // No trust signals at all: neutral, not suspicious.
  assert.equal(
    suggested(makeEntry({ verification: { aiRiskScore: null, proofTrustScore: null, duplicateWarning: null } })).ratings.authenticity,
    2,
  );
});

// --- Field Note Quality bands ---

test('ai suggestion: field note bands hit every boundary', () => {
  const cases: Array<[string, number]> = [
    ['x'.repeat(100), 3],
    ['x'.repeat(99), 2],
    ['x'.repeat(50), 2],
    ['x'.repeat(49), 2],
    ['x'.repeat(10), 2],
    ['x'.repeat(9), 0],
    ['', 0],
  ];
  for (const [note, expected] of cases) {
    const suggestion = suggested(makeEntry({ fieldNote: note }));
    assert.equal(suggestion.ratings.fieldNoteQuality, expected, `note length ${note.length}`);
  }
});

test('ai suggestion: default stamped text never counts as a field note', () => {
  const suggestion = suggested(makeEntry({ fieldNote: 'A successful field trip entry.' }));
  assert.equal(suggestion.ratings.fieldNoteQuality, 0);
  assert.match(suggestion.reasons.fieldNoteQuality, /stamped text/);
});

test('ai suggestion: a 5s voice note covers a missing field note, a 4s one does not', () => {
  assert.equal(
    suggested(makeEntry({ fieldNote: 'short', voiceNoteDurationSec: 5 })).ratings.fieldNoteQuality,
    2,
  );
  assert.equal(
    suggested(makeEntry({ fieldNote: 'short', voiceNoteDurationSec: 4 })).ratings.fieldNoteQuality,
    0,
  );
  assert.equal(
    suggested(makeEntry({ fieldNote: 'short', voiceNotePresent: true })).ratings.fieldNoteQuality,
    2,
  );
});

// --- Guardrail: no suggestion from untrustworthy analysis ---

test('ai suggestion: simulated fallback scan yields no suggestion', () => {
  const result = suggestAiRubric(makeEntry({ analysis: { modelUsed: 'fallback_simulated_flash', confidence: 0.96, missionMatchScore: 98 } }));
  assert.equal(result.available, false);
  if (!result.available) assert.match(result.reason, /fallback_simulated_flash/);
});

test('ai suggestion: error fallback and network failure yield no suggestion', () => {
  const errorFallback = suggestAiRubric(makeEntry({
    analysis: { modelUsed: 'error_fallback', confidence: 0, missingItems: ['NETWORK_COMM_FAILURE'], detectedSubject: false, missionMatchScore: 0 },
  }));
  assert.equal(errorFallback.available, false);
  const networkFailure = suggestAiRubric(makeEntry({
    analysis: { modelUsed: 'gemini-1.5-flash', confidence: 0, missingItems: ['NETWORK_COMM_FAILURE'], detectedSubject: false, missionMatchScore: 0 },
  }));
  assert.equal(networkFailure.available, false);
});

test('ai suggestion: missing analysis yields no suggestion', () => {
  const result = suggestAiRubric(makeEntry({ analysis: null }));
  assert.equal(result.available, false);
  assert.equal(isTrustworthyAiAnalysis(null).ok, false);
  assert.equal(isTrustworthyAiAnalysis(extractAiAnalysis(makeEntry())).ok, true);
});

test('ai suggestion: a real "not detected" verdict still yields a (low) suggestion', () => {
  const suggestion = suggested(makeEntry({
    analysis: { detectedSubject: false, confidence: 0.4, missionMatchScore: 20 },
  }));
  assert.equal(suggestion.ratings.missionMatch, 0);
  assert.equal(suggestion.ratings.proofClarity, 1);
});

// --- Flags, energy, summary ---

test('ai suggestion: fieldtrip energy is never suggested and stays at the manual default', () => {
  const suggestion = suggested(makeEntry({
    analysis: { missionMatchScore: 95, confidence: 0.95 },
    verification: { proofTrustScore: 90, aiRiskScore: 5 },
    fieldNote: 'x'.repeat(120),
  }));
  assert.ok(!('fieldtripEnergy' in suggestion.ratings));
  // 4 + 4 + 4 + 3 with energy at 2: 40 + 25 + 20 + 7.5 + 2.5 = 95.
  assert.equal(suggestion.weightedScore, 95);
  assert.equal(suggestion.flagged, false);
});

test('ai suggestion: low scores, duplicates, and high risk are flagged', () => {
  const low = suggested(makeEntry({
    analysis: { detectedSubject: false, confidence: 0.1, missionMatchScore: 10 },
    verification: { duplicateWarning: 'exact_duplicate', aiRiskScore: 100, proofTrustScore: 0 },
    fieldNote: 'short',
  }));
  assert.equal(low.flagged, true);
  assert.ok(low.flagReasons.length >= 2);

  const duplicateOnly = suggested(makeEntry({
    analysis: { missionMatchScore: 95, confidence: 0.95 },
    verification: { duplicateWarning: 'near_duplicate', aiRiskScore: 5, proofTrustScore: 90 },
    fieldNote: 'x'.repeat(120),
  }));
  assert.equal(duplicateOnly.flagged, true);

  const riskOnly = suggested(makeEntry({
    analysis: { missionMatchScore: 95, confidence: 0.95 },
    verification: { aiRiskScore: 60, proofTrustScore: 90 },
    fieldNote: 'x'.repeat(120),
  }));
  assert.equal(riskOnly.flagged, true);
});

test('ai suggestion: the summary is one line carrying the score and band', () => {
  const suggestion = suggested(makeEntry());
  assert.match(suggestion.summary, /AI read: subject detected/);
  assert.match(suggestion.summary, /Suggested [\d.]+\/100/);
  assert.equal(suggestion.summary.includes('\n'), false);
});

test('ai suggestion: both non-approval bands lean to request_info', () => {
  assert.equal(suggestedActionForAiSuggestion('strong_approval_candidate'), 'approve');
  assert.equal(suggestedActionForAiSuggestion('approve_with_judgment'), 'approve');
  assert.equal(suggestedActionForAiSuggestion('needs_closer_review'), 'request_info');
  assert.equal(suggestedActionForAiSuggestion('likely_insufficient'), 'request_info');
});

// --- Source-level: the call sites ---

const serverSource = readFileSync('server.ts', 'utf8');
const gameServiceSource = readFileSync('src/services/gameService.ts', 'utf8');
const adminProofReviewSource = readFileSync('src/pages/AdminProofReview.tsx', 'utf8');
const proofLifecycleSource = readFileSync('src/services/proofLifecycleService.ts', 'utf8');

test('server: approval passes participation resolved from the stored entry signals', () => {
  const routeStart = serverSource.indexOf('app.post("/api/admin/proof-review/action"');
  assert.notEqual(routeStart, -1);
  const route = serverSource.slice(routeStart, serverSource.indexOf('app.post("/api/admin/grant-starter-bypass"', routeStart));
  assert.match(route, /const participation = resolveParticipationSignals\(\{/);
  assert.match(route, /aiAnalysisResult: entry\.aiAnalysisResult/);
  assert.match(route, /proofCheckResult: entry\.proofCheckResult/);
  assert.match(route, /locationVerified: entry\.locationVerified/);
  assert.match(route, /calculateMissionScore\(\{[\s\S]*?participation,/);
});

test('server: the points ceiling resolves from the card bank when the entry lacks baseXP', () => {
  const routeStart = serverSource.indexOf('app.post("/api/admin/proof-review/action"');
  const route = serverSource.slice(routeStart, serverSource.indexOf('app.post("/api/admin/grant-starter-bypass"', routeStart));
  assert.match(route, /getProofRubricScoring\(rubric, resolveEntryScoringMission\(entry, challengeId\)\)/);
  assert.match(serverSource, /function resolveEntryScoringMission/);
  assert.match(serverSource, /resolveMissionById\(challengeId\)/);
  // The 100 XP starter fallback stays as the last resort in the ceiling itself.
  const proofRubricSource = readFileSync('src/logic/proofRubric.ts', 'utf8');
  assert.match(proofRubricSource, /\? Math\.round\(parsed\) : 100;/);
});

test('server: approval passes the crew layer through to the award', () => {
  const routeStart = serverSource.indexOf('app.post("/api/admin/proof-review/action"');
  assert.notEqual(routeStart, -1);
  const route = serverSource.slice(routeStart, serverSource.indexOf('app.post("/api/admin/grant-starter-bypass"', routeStart));
  // Crew context stamped on the entry by AppContext.addEntry — without
  // this the server award dropped the +25% crew layer the admin preview
  // showed on group-confirmation cards.
  assert.match(route, /submittedAsCrewMember: entry\.crewContext\?\.submittedAsCrewMember === true/);
  // Card resolved from the registry by the entry's trip/mission/challenge
  // id, mirroring the preview in AdminProofReview.tsx.
  assert.match(route, /groupConfirmationCard: \(/);
  assert.match(route, /resolveMissionById\(getBackendString\(entry\.tripId \?\? entry\.missionId \?\? entry\.challengeId\)\)\?\.proofType/);
  assert.match(route, /\.includes\('group-confirmation'\)/);
});

test('server: the crew card lookup resolves group-confirmation cards from the bank', () => {
  // winter-12 Carolers is a group-confirmation card (medium, 125 XP);
  // winter-01 Paper Snowflakes is photo-only. The server's
  // resolveMissionById lookup must tell them apart or the crew layer
  // pays on the wrong cards.
  const carolers = resolveMissionById('winter-12');
  assert.ok(carolers, 'winter-12 resolves from the bank');
  assert.equal((carolers.proofType || []).includes('group-confirmation'), true);
  const snowflakes = resolveMissionById('winter-01');
  assert.ok(snowflakes, 'winter-01 resolves from the bank');
  assert.equal((snowflakes.proofType || []).includes('group-confirmation'), false);
  // Unknown ids resolve to no card, never a group card.
  assert.equal(resolveMissionById('not-a-card'), null);
});

test('server: the AI suggestion is stored next to the award in adminLogs', () => {  const routeStart = serverSource.indexOf('app.post("/api/admin/proof-review/action"');
  const route = serverSource.slice(routeStart, serverSource.indexOf('app.post("/api/admin/grant-starter-bypass"', routeStart));
  assert.match(route, /suggestedRubric,/);
  assert.match(route, /suggestedRubricApplied,/);
  assert.match(route, /adminLogs/);
});

test('submit: the entry persists the card baseXP so the ceiling is real', () => {
  assert.match(gameServiceSource, /baseXP: trip\.baseXP/);
});

test('admin review: the card shows the AI read and offers one-tap suggestion', () => {
  assert.match(adminProofReviewSource, /suggestAiRubric\(entry\)/);
  assert.match(adminProofReviewSource, /Use AI suggestion/);
  assert.match(adminProofReviewSource, /AI didn&apos;t look at this one/);
  assert.match(adminProofReviewSource, /AI suggestion applied/);
  assert.match(adminProofReviewSource, /AI suggested/);
  assert.match(adminProofReviewSource, /Adjusted from AI/);
  assert.match(adminProofReviewSource, /suggestedRubric: review\.suggestedRubric/);
  // The fake footer confidence is gone: the card reads the stored analysis.
  assert.doesNotMatch(adminProofReviewSource, /entry\.aiScore \|\| 100/);
  assert.doesNotMatch(adminProofReviewSource, /e\.aiScore \|\| 'N\/A'/);
  assert.match(adminProofReviewSource, /aiConfidencePercent\(entry\)/);
});

test('review payload: the metadata type carries the suggested rubric', () => {
  assert.match(proofLifecycleSource, /suggestedRubric\?: AiSuggestedRubric \| null/);
  assert.match(proofLifecycleSource, /suggestedRubricApplied\?: boolean/);
});
