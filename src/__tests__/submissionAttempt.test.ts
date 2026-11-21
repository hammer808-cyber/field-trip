import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { mintSubmissionAttemptId, resolveSubmissionEntryId } from '../logic/submissionAttempt';
import {
  CAPTURE_DRAFT_VERSION,
  loadCaptureDraft,
  saveCaptureDraft,
  type CaptureDraft,
} from '../logic/captureDraft';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

/** In-memory localStorage stand-in; node:test has no DOM storage. */
function installFakeStorage() {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() { return store.size; },
  };
  return store;
}

test('attempt id uses the entry id format, mission lowercased', () => {
  const id = mintSubmissionAttemptId('SOCAL-09', 'user-1');
  assert.match(id, /^entry_socal-09_user-1_\d+$/);
});

test('resolve: repair entry id wins, then the synced pending entry, then the attempt id', () => {
  assert.equal(
    resolveSubmissionEntryId({ entryIdParam: 'entry_repair', pendingEntryId: 'entry_pending', attemptId: 'entry_attempt' }),
    'entry_repair'
  );
  assert.equal(
    resolveSubmissionEntryId({ entryIdParam: null, pendingEntryId: 'entry_pending', attemptId: 'entry_attempt' }),
    'entry_pending'
  );
  assert.equal(
    resolveSubmissionEntryId({ entryIdParam: null, pendingEntryId: null, attemptId: 'entry_attempt' }),
    'entry_attempt'
  );
  assert.equal(
    resolveSubmissionEntryId({ entryIdParam: null, pendingEntryId: null, attemptId: null }),
    null
  );
});

test('draft round-trip keeps the attempt id, so a refresh mid-submit retries the same entry', () => {
  installFakeStorage();
  const draft: CaptureDraft = {
    version: CAPTURE_DRAFT_VERSION,
    userId: 'user-1',
    missionId: 'socal-09',
    savedAt: 1_700_000_000_000,
    note: 'The fountain was still running at dusk.',
    photoDataUrl: null,
    photoTakenAt: null,
    photoSource: null,
    trustLevel: null,
    submissionAttemptId: 'entry_socal-09_user-1_1700000000000',
  };
  assert.equal(saveCaptureDraft(draft), 'saved');
  assert.equal(loadCaptureDraft('user-1', 'socal-09')?.submissionAttemptId, 'entry_socal-09_user-1_1700000000000');
});

test('Capture mints one attempt id per session and passes it as existingEntryId on every submit', () => {
  const capture = read('src/pages/Capture.tsx');
  assert.ok(
    capture.includes('mintSubmissionAttemptId(currentTrip.id, user.uid)'),
    'expected handleSubmit to mint the attempt id once per capture session'
  );
  assert.ok(
    capture.includes('existingEntryId: resolveSubmissionEntryId({'),
    'expected the submit to resolve the entry id through resolveSubmissionEntryId'
  );
  assert.ok(
    capture.includes('submissionAttemptId: submissionAttemptIdRef.current'),
    'expected the attempt id to be persisted in the capture draft'
  );
});
