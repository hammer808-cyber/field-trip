import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  classifyRepairReview,
  createQueueRepairReport,
  getCanonicalSubmissionId,
  getDiagnosticsMissingFields,
  isKnownProofStatusValue,
  isPlaceholderEntryId,
  planEntryRepair,
  validateCanonicalSubmission,
} from '../services/proofLifecycleService';
import { computeReviewableButNotRendered } from '../services/submissionService';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

const IMG = 'https://example.test/proof.jpg';

const validEntry = (overrides: Record<string, any> = {}) => ({
  userId: 'user-1',
  challengeId: 'texas-01',
  deckId: 'texas-get-it-yall',
  photoUrl: IMG,
  submittedAt: '2026-11-01T00:00:00Z',
  status: 'pending_review',
  ...overrides,
});

const validReview = (overrides: Record<string, any> = {}) => ({
  entryId: 'e-root',
  userId: 'user-1',
  challengeId: 'texas-01',
  deckId: 'texas-get-it-yall',
  photoUrl: IMG,
  status: 'pending_review',
  ...overrides,
});

test('repair/diagnostics alignment: one predicate for "missing required fields"', () => {
  assert.deepEqual(getDiagnosticsMissingFields(validEntry()), []);
  assert.deepEqual(getDiagnosticsMissingFields(validEntry({ status: undefined, reviewStatus: 'pending_review' })), []);
  assert.deepEqual(getDiagnosticsMissingFields(validEntry({ status: undefined })), ['status']);
  assert.deepEqual(getDiagnosticsMissingFields(validEntry({ photoUrl: undefined })), ['photoUrl/storagePath']);
  assert.deepEqual(getDiagnosticsMissingFields(validEntry({ userId: '' })), ['userId']);
  assert.deepEqual(getDiagnosticsMissingFields(validEntry({ challengeId: '' })), ['challengeId']);
  assert.deepEqual(getDiagnosticsMissingFields(validEntry({ deckId: '' })), ['deckId']);
  // Diagnostics does NOT count submittedAt; the repair's canonical
  // validation does. That asymmetry is deliberate and documented: a
  // record missing only submittedAt is ambiguous to the repair but is
  // not counted missing by diagnostics.
  const noSubmittedAt = validEntry({ submittedAt: undefined });
  assert.deepEqual(getDiagnosticsMissingFields(noSubmittedAt), []);
  assert.equal(validateCanonicalSubmission(noSubmittedAt).valid, false);
});

test('repair/diagnostics alignment: placeholder entry ids mean "no link"', () => {
  assert.equal(isPlaceholderEntryId('TBD'), true);
  assert.equal(isPlaceholderEntryId('pending'), true);
  assert.equal(isPlaceholderEntryId('pending_review'), true);
  assert.equal(isPlaceholderEntryId('entry_texas-01_user-1_123'), false);
  assert.equal(isPlaceholderEntryId(''), false);
  // A placeholder in the entryId field falls through to the next
  // candidate, then to the fallback — it never survives as the id.
  assert.equal(getCanonicalSubmissionId({ entryId: 'TBD', submissionId: 'sub-9' }, 'doc-1'), 'sub-9');
  assert.equal(getCanonicalSubmissionId({ entryId: 'TBD' }, 'doc-1'), 'doc-1');
  assert.equal(getCanonicalSubmissionId({ entryId: 'e-real' }, 'doc-1'), 'e-real');
});

test('repair/diagnostics alignment: every diagnostics-flagged record is covered by the repair', () => {
  const entryIds = new Set(['e-root', 'e-sub-2', 'e-root-tbd']);
  // Fixture spanning root + subcollection paths, mirroring the live shape:
  // root entries the old repair saw, subcollection entries it never did.
  const entries: Array<[string, any]> = [
    ['e-root', validEntry()],
    ['e-sub-1', validEntry({ status: undefined, reviewStatus: undefined, submissionStatus: undefined, proofStatus: undefined })],
    ['e-sub-2', validEntry({ status: 'weird_status' })],
    ['e-root-tbd', validEntry({ entryId: 'TBD' })],
  ];
  const reviews: Array<[string, any]> = [
    ['r-1', validReview({ status: undefined })],
    ['r-2', validReview({ entryId: 'TBD' })],
    ['r-3', validReview()],
  ];

  const diagnosticsFlags = (record: any) => {
    const rawStatus = record.status || record.reviewStatus || record.submissionStatus || record.proofStatus;
    return getDiagnosticsMissingFields(record).length > 0 || (!!rawStatus && !isKnownProofStatusValue(rawStatus));
  };

  for (const [docId, data] of entries) {
    const plan = planEntryRepair(docId, data);
    const covered = !plan.validation.valid || plan.changes.length > 0;
    if (diagnosticsFlags(data)) assert.ok(covered, `${docId} is diagnostics-flagged but the repair ignores it`);
  }
  for (const [docId, data] of reviews) {
    const { orphan, flagged } = classifyRepairReview(docId, data, entryIds);
    const covered = orphan !== null || flagged !== null;
    if (diagnosticsFlags(data)) assert.ok(covered, `${docId} is diagnostics-flagged but the repair ignores it`);
  }

  // The two flagged subcollection entries are exactly the shape of the
  // live 5: invisible to the old root-only scan, visible to both now.
  const sub1 = planEntryRepair('e-sub-1', entries[1][1]);
  assert.equal(sub1.validation.valid, true);
  assert.ok(sub1.changes.some(c => c.startsWith('status:missing->pending_review')));
  const sub2 = planEntryRepair('e-sub-2', entries[2][1]);
  assert.ok(sub2.changes.some(c => c.startsWith('status:weird_status->pending_review')));
  // A missing status is repaired via the status mirror, never ambiguous:
  // validation runs on the normalized record, whose status defaults.
  assert.equal(sub1.validation.valid, true);
});

test('repair/diagnostics alignment: placeholder entryId is mirrored to the doc id', () => {
  const plan = planEntryRepair('e-root-tbd', validEntry({ entryId: 'TBD' }));
  assert.equal(plan.normalized.entryId, 'e-root-tbd');
  assert.ok(plan.changes.includes('entryId mirror'));
  const missing = planEntryRepair('e-missing', validEntry({ entryId: undefined }));
  assert.equal(missing.normalized.entryId, 'e-missing');
  assert.ok(missing.changes.includes('entryId mirror'));
  const real = planEntryRepair('e-real', validEntry({ entryId: 'e-real' }));
  assert.ok(!real.changes.includes('entryId mirror'));
  const noUser = planEntryRepair('e-nouser', validEntry({ userId: '' }));
  assert.equal(noUser.validation.valid, false);
  assert.ok(noUser.validation.missingFields.includes('userId'));
  assert.deepEqual(noUser.changes, []);
});

test('repair/diagnostics alignment: review classification (orphan vs flagged vs clean)', () => {
  const entryIds = new Set(['e-root']);
  assert.deepEqual(classifyRepairReview('r-linked', validReview(), entryIds), { orphan: null, flagged: null });
  const orphanTbd = classifyRepairReview('r-orphan', validReview({ entryId: 'TBD' }), entryIds);
  assert.deepEqual(orphanTbd.orphan, { id: 'r-orphan', entryId: 'missing' });
  assert.equal(orphanTbd.flagged, null);
  const orphanUnknown = classifyRepairReview('r-ghost', validReview({ entryId: 'e-nope' }), entryIds);
  assert.deepEqual(orphanUnknown.orphan, { id: 'r-ghost', entryId: 'e-nope' });
  const flagged = classifyRepairReview('r-dirty', validReview({ status: undefined, photoUrl: undefined }), entryIds);
  assert.equal(flagged.orphan, null);
  assert.deepEqual(flagged.flagged?.reasons, ['status', 'photoUrl/storagePath']);
  const badStatus = classifyRepairReview('r-weird', validReview({ status: 'weird_status' }), entryIds);
  assert.equal(badStatus.orphan, null);
  assert.ok(badStatus.flagged?.reasons.some(r => r.startsWith('invalid status:')));
});

test('repair/diagnostics alignment: reviewable-not-rendered uses resolved ids, capped, with a total', () => {
  const merged = [
    { id: 'e-root', entryId: 'e-root', status: 'pending_review' },
    { id: 'e-root-tbd', entryId: 'e-root-tbd', status: 'pending_review' },
  ] as any[];
  const entries = merged as any[];
  const reviews = [
    { id: 'r-orphan', entryId: 'attempt-1', status: 'pending_review' },
    { id: 'r-orphan-2', entryId: 'attempt-1', status: 'pending_review' },
    { id: 'r-linked', entryId: 'e-root', status: 'pending_review' },
    { id: 'r-approved', entryId: 'attempt-2', status: 'approved' },
  ] as any[];
  const result = computeReviewableButNotRendered(entries, reviews, merged, 'pending_review');
  // The orphan's attempted id is listed once (deduped); the approved
  // record is not pending; the rendered ones are not listed.
  assert.deepEqual(result.ids, ['attempt-1']);
  assert.equal(result.total, 1);
  // The old bug: a rendered record whose STORED entryId field was the
  // legacy 'TBD' placeholder showed up as the literal string "TBD".
  // The helper only ever sees normalized records, whose entryId is the
  // resolved doc id — 'TBD' can never appear from a rendered record.
  assert.ok(!result.ids.includes('TBD'));
  assert.ok(!result.ids.includes('e-root-tbd'));

  const many = Array.from({ length: 30 }, (_, i) => ({
    id: `r-many-${i}`,
    entryId: `attempt-many-${i}`,
    status: 'pending_review',
  })) as any[];
  const capped = computeReviewableButNotRendered([], many, [], 'pending_review');
  assert.equal(capped.ids.length, 25);
  assert.equal(capped.total, 30);
});

test('repair/diagnostics alignment: the repair scans collectionGroup, writes only off dry-run, never backfills scoring signals', () => {
  const proofLifecycleSource = read('src/services/proofLifecycleService.ts');
  const repairStart = proofLifecycleSource.indexOf('export async function repairCanonicalProofQueue');
  assert.notEqual(repairStart, -1);
  const repairSource = proofLifecycleSource.slice(repairStart);
  assert.match(repairSource, /collectionGroup\(db, 'entries'\)/);
  assert.match(repairSource, /collectionGroup\(db, 'proofReviews'\)/);
  assert.doesNotMatch(repairSource, /getDocs\(collection\(db, 'entries'\)\)/);
  assert.doesNotMatch(repairSource, /getDocs\(collection\(db, 'proofReviews'\)\)/);
  assert.match(repairSource, /if \(!dryRun\)/);
  assert.match(repairSource, /batch\.set\(entryDoc\.ref/);
  // The repair fixes status/field mirrors only — it must never backfill
  // scoring signals (baseXP, AI score, location, voice notes).
  assert.doesNotMatch(repairSource, /baseXP:/);
  assert.doesNotMatch(repairSource, /aiScore:/);
  assert.doesNotMatch(repairSource, /locationVerified:/);
  assert.doesNotMatch(repairSource, /voiceNotePresent:/);
  assert.doesNotMatch(repairSource, /voiceNoteUrl:/);

  const submissionSource = read('src/services/submissionService.ts');
  assert.match(submissionSource, /getDiagnosticsMissingFields\(record\)/);
  assert.match(submissionSource, /computeReviewableButNotRendered\(latestEntries, latestReviews, merged, statusFilter\)/);
  assert.match(submissionSource, /REVIEWABLE_NOT_RENDERED_LIMIT = 25/);
  assert.match(submissionSource, /reviewableButNotRenderedTotal: number/);

  // The report carries the reconciliation counters the live read needed:
  // repair total minus without-createdAt equals the diagnostics total.
  const report = createQueueRepairReport();
  assert.equal(report.scannedRootEntries, 0);
  assert.equal(report.scannedSubcollectionEntries, 0);
  assert.equal(report.scannedEntriesWithoutCreatedAt, 0);
  assert.equal(report.scannedProofReviewsWithoutCreatedAt, 0);
  assert.deepEqual(report.flaggedProofReviews, []);
});
