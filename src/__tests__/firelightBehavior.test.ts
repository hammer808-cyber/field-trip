import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SUS_DAILY_REPORT_LIMIT,
  getPublicTribunalCaseData,
  getPublicTribunalCasePrivateFieldViolations,
  getSusDailyCounterId,
  getSusReportId,
  getTribunalOutcome,
  getTribunalVoteId,
  isActiveSusReportStatus,
  isTribunalVerdict
} from '../logic/firelightTribunal';

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
