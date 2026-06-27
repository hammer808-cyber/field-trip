import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  canonicalTribunalVerdict,
  getPublicTribunalCaseData,
  getTribunalOutcome,
  getTribunalVoteId,
  isPublicTribunalStatus
} from '../logic/firelightTribunal';

const serverSource = readFileSync('server.ts', 'utf8');
const rulesSource = readFileSync('firestore.rules', 'utf8');
const pageSource = readFileSync('src/pages/SnitchCouncilPage.tsx', 'utf8');

test('tribunal vote IDs are deterministic per user and case', () => {
  assert.equal(getTribunalVoteId('user-1', 'entry-9'), 'user-1_entry-9');
});

test('only open and closed tribunal cases are public-readable states', () => {
  assert.equal(isPublicTribunalStatus('admin_review'), false);
  assert.equal(isPublicTribunalStatus('open'), true);
  assert.equal(isPublicTribunalStatus('closed'), true);
  assert.equal(isPublicTribunalStatus('dismissed'), false);
});

test('legacy agree/disagree UI votes map to canonical valid/sus votes', () => {
  assert.equal(canonicalTribunalVerdict('agree'), 'valid');
  assert.equal(canonicalTribunalVerdict('disagree'), 'sus');
  assert.equal(canonicalTribunalVerdict('sus'), 'sus');
  assert.equal(canonicalTribunalVerdict('valid'), 'valid');
});

test('public tribunal case data strips private reporter linkage', () => {
  const publicCase = getPublicTribunalCaseData({
    caseId: 'entry-1',
    entryId: 'entry-1',
    status: 'open',
    reporterId: 'reporter-1',
    reporterIds: ['reporter-1'],
    sourceReportIds: ['report-1'],
    escalationReason: 'private reason',
    title: 'Receipt',
    unknownPrivateThing: 'do not leak'
  });
  assert.deepEqual(Object.keys(publicCase).sort(), ['caseId', 'entryId', 'status', 'title']);
});

test('tribunal outcome is recommendation-only and based on server totals', () => {
  assert.equal(getTribunalOutcome(5, 2), 'community_valid_recommendation');
  assert.equal(getTribunalOutcome(2, 5), 'community_sus_recommendation');
});

test('server makes tribunal votes immutable and transaction-backed', () => {
  assert.match(serverSource, /runTransaction\(async \(transaction\) => \{[\s\S]*collection\('tribunalVotes'\)/);
  assert.match(serverSource, /TRIBUNAL_VOTE_ALREADY_CAST/);
  assert.match(serverSource, /transaction\.create\(voteRef/);
  const voteEndpoint = serverSource.slice(serverSource.indexOf('app.post("/api/tribunal/vote"'), serverSource.indexOf('app.post("/api/admin/tribunal/close"'));
  assert.doesNotMatch(voteEndpoint, /canonicalTribunalVerdict/);
  assert.doesNotMatch(voteEndpoint, /agreeVotes|disagreeVotes/);
  assert.doesNotMatch(serverSource, /oldVote !== vote\)[\s\S]{0,250}FieldValue\.increment\(-1\)/);
});

test('server creates immutable tribunal result snapshots without mutating proof status or points', () => {
  assert.match(serverSource, /collection\('tribunalResults'\)\.doc\(caseId\)/);
  assert.match(serverSource, /transaction\.create\(resultRef/);
  assert.match(serverSource, /recommendationOnly: true/);
  const closeStart = serverSource.indexOf('app.post("/api/admin/tribunal/close"');
  const closeEnd = serverSource.indexOf('/**', closeStart);
  const closeEndpoint = serverSource.slice(closeStart, closeEnd);
  assert.doesNotMatch(closeEndpoint, /collection\('entries'\)[\s\S]{0,800}tribunalStatus/);
  assert.doesNotMatch(closeEndpoint, /points|xp|scoreEvent/i);
});

test('firestore rules block direct tribunal writes and protect private case data', () => {
  assert.match(rulesSource, /match \/tribunalVotes\/\{voteId\}[\s\S]*allow create, update: if false/);
  assert.match(rulesSource, /match \/tribunalCasePrivate\/\{caseId\}[\s\S]*allow read: if isAdmin\(\)[\s\S]*allow write: if false/);
  assert.match(rulesSource, /match \/tribunalResults\/\{caseId\}[\s\S]*allow read: if isTribunalEligible\(\)[\s\S]*allow write: if false/);
  assert.match(rulesSource, /match \/tribunalCases\/\{caseId\}[\s\S]*isTribunalEligible\(\)[\s\S]*resource\.data\.status in \['open', 'closed'\]/);
});

test('Firelight Tribunal page covers locked, lobby, vote booth, waiting, and archive states', () => {
  assert.match(pageSource, /Firelight Tribunal/);
  assert.match(pageSource, /Tribunal Locked/);
  assert.match(pageSource, /No Cases At The Fire/);
  assert.match(pageSource, /Vote Booth/);
  assert.match(pageSource, /Vote Cast Waiting/);
  assert.match(pageSource, /Finalized Reveal/);
  assert.match(pageSource, /Resolution Archive/);
  assert.match(pageSource, /Vote the receipt, not the person/);
});
