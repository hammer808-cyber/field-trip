import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  SUS_DAILY_REPORT_LIMIT,
  canSubmitSusReport,
  getSusDailyCounterId,
  getSusReportId,
  isActiveSusReportStatus,
  isSusReviewStatus
} from '../logic/firelightTribunal';

const serverSource = readFileSync('server.ts', 'utf8');
const rulesSource = readFileSync('firestore.rules', 'utf8');

test('sus report IDs prevent duplicate active reports per reporter and entry', () => {
  assert.equal(getSusReportId('user-1', 'entry-2'), 'user-1_entry-2');
});

test('sus daily counter IDs are deterministic per reporter and UTC day', () => {
  assert.equal(getSusDailyCounterId('user-1', '2026-06-26'), 'user-1_2026-06-26');
  assert.equal(SUS_DAILY_REPORT_LIMIT, 10);
});

test('users cannot report their own proof', () => {
  assert.equal(canSubmitSusReport('user-1', 'user-1'), false);
  assert.equal(canSubmitSusReport('user-1', 'user-2'), true);
});

test('only pending, request-clarification, or escalated sus reports count as active duplicates', () => {
  assert.equal(isActiveSusReportStatus('pending'), true);
  assert.equal(isActiveSusReportStatus('request_clarification'), true);
  assert.equal(isActiveSusReportStatus('escalated_to_tribunal'), true);
  assert.equal(isActiveSusReportStatus('dismissed'), false);
  assert.equal(isActiveSusReportStatus('resolved'), false);
});

test('admin sus review actions are constrained to private review statuses', () => {
  assert.equal(isSusReviewStatus('pending'), true);
  assert.equal(isSusReviewStatus('dismissed'), true);
  assert.equal(isSusReviewStatus('resolved'), true);
  assert.equal(isSusReviewStatus('request_clarification'), true);
  assert.equal(isSusReviewStatus('escalated_to_tribunal'), true);
  assert.equal(isSusReviewStatus('needs_more_proof'), false);
  assert.equal(isSusReviewStatus('approved'), false);
});

test('server rate-limits Sus reports and tracks abuse signals without touching proof status', () => {
  const susEndpoint = serverSource.slice(
    serverSource.indexOf('app.post("/api/reports/sus"'),
    serverSource.indexOf('app.get("/api/reports/sus/:entryId/status"')
  );
  assert.match(susEndpoint, /SUS_DAILY_REPORT_LIMIT/);
  assert.match(susEndpoint, /collection\('susReportCounters'\)/);
  assert.match(susEndpoint, /collection\('susAbuseSignals'\)/);
  assert.match(susEndpoint, /SUS_RATE_LIMITED/);
  assert.doesNotMatch(susEndpoint, /collection\('entries'\)[\s\S]{0,500}\.set|collection\('entries'\)[\s\S]{0,500}\.update/);
});

test('server requires admin reason before resolving or escalating Sus reports', () => {
  assert.match(serverSource, /ADMIN_REASON_REQUIRED/);
  assert.match(serverSource, /open_tribunal_case/);
  assert.match(serverSource, /SUS_REPORT_REQUIRED/);
});

test('firestore rules keep Sus reports, counters, and abuse signals private', () => {
  assert.match(rulesSource, /match \/susReports\/\{id\}[\s\S]*allow read: if isAdmin\(\)[\s\S]*allow write: if false/);
  assert.match(rulesSource, /match \/susReportCounters\/\{counterId\}[\s\S]*allow read: if isAdmin\(\)[\s\S]*allow write: if false/);
  assert.match(rulesSource, /match \/susAbuseSignals\/\{userId\}[\s\S]*allow read: if isAdmin\(\)[\s\S]*allow write: if false/);
});
