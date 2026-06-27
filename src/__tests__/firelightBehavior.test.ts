import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  SUS_DAILY_REPORT_LIMIT,
  TRIBUNAL_REPAIR_CONFIRMATION,
  buildTribunalDiagnosticsReport,
  buildTribunalResultSnapshot,
  canonicalizeLegacyTribunalVote,
  canBackfillTribunalResult,
  getPublicTribunalCaseData,
  getPublicTribunalCasePrivateFieldViolations,
  getSusDailyCounterId,
  getSusReportId,
  getTribunalOutcome,
  getTribunalVoteId,
  isActiveSusReportStatus,
  isTribunalVerdict
} from '../logic/firelightTribunal';

const constantsSource = readFileSync('src/constants.ts', 'utf8');
const appContextSource = readFileSync('src/context/AppContext.tsx', 'utf8');
const adminSettingsSource = readFileSync('src/pages/AdminSettings.tsx', 'utf8');

class Mutex {
  private chain = Promise.resolve();

  async run<T>(fn: () => T | Promise<T>): Promise<T> {
    const previous = this.chain;
    let release!: () => void;
    this.chain = new Promise<void>(resolve => {
      release = resolve;
    });
    await previous;
    try {
      return await fn();
    } finally {
      release();
    }
  }
}

test('public case projection is an allowlist and drops unknown private fields', () => {
  const publicCase = getPublicTribunalCaseData({
    caseId: 'case-1',
    entryId: 'entry-1',
    status: 'open',
    title: 'Receipt',
    reporterId: 'reporter',
    sourceReportIds: ['report-1'],
    escalationReason: 'private reason',
    unknownPrivateField: 'should not leak',
    adminNotes: 'private admin note'
  });
  assert.deepEqual(Object.keys(publicCase).sort(), ['caseId', 'entryId', 'status', 'title']);
  assert.equal(publicCase.unknownPrivateField, undefined);
});

test('public case audit detects private reporter and source fields', () => {
  assert.deepEqual(
    getPublicTribunalCasePrivateFieldViolations({
      caseId: 'case-1',
      reporterId: 'reporter',
      sourceReportIds: ['report-1'],
      escalationReason: 'private'
    }),
    ['reporterId', 'sourceReportIds', 'escalationReason']
  );
});

test('simultaneous duplicate Sus reports produce one active report', async () => {
  const mutex = new Mutex();
  const activeReports = new Map<string, string>();
  const createReport = (reporterId: string, entryId: string) => mutex.run(() => {
    const reportId = getSusReportId(reporterId, entryId);
    const existing = activeReports.get(reportId);
    if (existing && isActiveSusReportStatus(existing)) return { ok: false, error: 'DUPLICATE_ACTIVE_SUS_REPORT' };
    activeReports.set(reportId, 'pending');
    return { ok: true, reportId };
  });

  const [first, second] = await Promise.all([
    createReport('user-1', 'entry-1'),
    createReport('user-1', 'entry-1')
  ]);
  assert.equal([first.ok, second.ok].filter(Boolean).length, 1);
  assert.equal(activeReports.size, 1);
});

test('daily Sus limit is enforced under concurrent requests', async () => {
  const mutex = new Mutex();
  const counter = new Map<string, number>();
  const submit = (userId: string, index: number) => mutex.run(() => {
    const counterId = getSusDailyCounterId(userId, '2026-06-26');
    const current = counter.get(counterId) || 0;
    if (current >= SUS_DAILY_REPORT_LIMIT) return { ok: false, error: 'SUS_RATE_LIMITED', index };
    counter.set(counterId, current + 1);
    return { ok: true, index };
  });

  const results = await Promise.all(Array.from({ length: SUS_DAILY_REPORT_LIMIT + 3 }, (_, index) => submit('user-1', index)));
  assert.equal(results.filter(result => result.ok).length, SUS_DAILY_REPORT_LIMIT);
  assert.equal(results.filter(result => result.error === 'SUS_RATE_LIMITED').length, 3);
});

test('simultaneous duplicate Tribunal votes produce one canonical vote', async () => {
  const mutex = new Mutex();
  const votes = new Map<string, 'valid' | 'sus'>();
  const cast = (userId: string, caseId: string, vote: 'valid' | 'sus') => mutex.run(() => {
    assert.equal(isTribunalVerdict(vote), true);
    const voteId = getTribunalVoteId(userId, caseId);
    const existing = votes.get(voteId);
    if (existing === vote) return { ok: true, duplicateIgnored: true };
    if (existing) return { ok: false, error: 'TRIBUNAL_VOTE_ALREADY_CAST' };
    votes.set(voteId, vote);
    return { ok: true, duplicateIgnored: false };
  });

  const [first, second, third] = await Promise.all([
    cast('user-1', 'case-1', 'valid'),
    cast('user-1', 'case-1', 'valid'),
    cast('user-1', 'case-1', 'sus')
  ]);
  assert.equal([first, second, third].filter(result => result.ok && !result.duplicateIgnored).length, 1);
  assert.equal([first, second, third].filter(result => result.duplicateIgnored).length, 1);
  assert.equal([first, second, third].filter(result => result.error === 'TRIBUNAL_VOTE_ALREADY_CAST').length, 1);
  assert.equal(votes.get('user-1_case-1'), 'valid');
});

test('finalizing a case twice cannot overwrite a second result snapshot', async () => {
  const mutex = new Mutex();
  const results = new Map<string, any>();
  const finalize = (caseId: string, validVotes: number, susVotes: number) => mutex.run(() => {
    if (results.has(caseId)) return { ok: true, alreadyFinalized: true, snapshot: results.get(caseId) };
    const snapshot = {
      caseId,
      validVotes,
      susVotes,
      outcome: getTribunalOutcome(validVotes, susVotes)
    };
    results.set(caseId, snapshot);
    return { ok: true, alreadyFinalized: false, snapshot };
  });

  const [first, second] = await Promise.all([
    finalize('case-1', 7, 2),
    finalize('case-1', 0, 99)
  ]);
  assert.equal(results.size, 1);
  assert.equal(first.snapshot, second.snapshot);
  assert.equal(results.get('case-1').validVotes, 7);
  assert.equal(results.get('case-1').susVotes, 2);
});

test('preview diagnostics reports all canonical Tribunal repair categories without mutation', () => {
  const caseData = {
    status: 'closed',
    entryId: 'entry-1',
    seasonId: 'season-1',
    weekNumber: 2,
    validVotes: 4,
    susVotes: 1,
    reporterId: 'private-reporter',
    sourceReportIds: ['report-1'],
    title: 'Receipt'
  };
  const report = buildTribunalDiagnosticsReport(
    [{ id: 'case-1', data: caseData }],
    [{ id: 'user_case-1', data: { vote: 'agree' } }],
    new Set()
  );
  assert.equal(report.counts.publicCasesWithForbiddenFields, 1);
  assert.equal(report.counts.legacyVotes, 1);
  assert.equal(report.counts.closedCasesMissingResults, 1);
  assert.equal(report.counts.cannotSafelyRepair, 0);
  assert.equal(caseData.reporterId, 'private-reporter');
});

test('repair helpers remove forbidden fields, convert legacy votes, and backfill snapshots idempotently', () => {
  const publicCase = {
    caseId: 'case-1',
    entryId: 'entry-1',
    status: 'closed',
    seasonId: 'season-1',
    weekNumber: 2,
    validVotes: 3,
    susVotes: 2,
    reporterId: 'private-reporter',
    escalationReason: 'private reason',
    title: 'Receipt'
  };
  const privateFields = getPublicTribunalCasePrivateFieldViolations(publicCase);
  for (const field of privateFields) delete (publicCase as any)[field];
  assert.deepEqual(getPublicTribunalCasePrivateFieldViolations(publicCase), []);

  assert.equal(canonicalizeLegacyTribunalVote('agree'), 'valid');
  assert.equal(canonicalizeLegacyTribunalVote('disagree'), 'sus');
  assert.equal(canonicalizeLegacyTribunalVote('weird'), null);

  assert.equal(canBackfillTribunalResult(publicCase), true);
  const snapshot = buildTribunalResultSnapshot('case-1', publicCase, 'admin-1', 'now');
  assert.equal(snapshot.caseId, 'case-1');
  assert.equal(snapshot.outcome, 'community_valid_recommendation');
  assert.equal(snapshot.recommendationOnly, true);

  const after = buildTribunalDiagnosticsReport(
    [{ id: 'case-1', data: { ...publicCase, resultSnapshotId: 'case-1' } }],
    [{ id: 'user_case-1', data: { vote: 'valid' } }],
    new Set(['case-1'])
  );
  assert.equal(after.criticalFailures, 0);
});

test('unsafe closed cases are flagged for manual admin review', () => {
  const report = buildTribunalDiagnosticsReport(
    [{ id: 'case-bad', data: { status: 'closed', entryId: 'entry-1', seasonId: 'season-1' } }],
    [],
    new Set()
  );
  assert.equal(report.counts.closedCasesMissingResults, 1);
  assert.equal(report.counts.cannotSafelyRepair, 1);
  assert.equal(report.samples.cannotSafelyRepair[0].repairable, false);
});

test('repair confirmation phrase is exact', () => {
  assert.equal(TRIBUNAL_REPAIR_CONFIRMATION, 'REPAIR TRIBUNAL DATA');
});

test('Tribunal feature flag defaults off and gates public unlock access', () => {
  assert.match(constantsSource, /tribunalEnabled:\s*false/);
  assert.match(appContextSource, /featureEnabled:\s*isFeatureEnabled\('tribunalEnabled'\)/);
  assert.match(adminSettingsSource, /Firelight Tribunal/);
});
