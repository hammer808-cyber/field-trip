import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

// P0-8 (Nov 19, 2026): a fatal submit failure used to show a browser
// alert("Proof did not save..."), reset to reviewing, and null completeRecord
// — and the only retry handler was gated on completeRecord, so it could
// never fire after the failure it existed to recover from. The fix is an
// inline error with an explicit retry that preserves the captured evidence.

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

test('P0-8: the fatal submit failure is an inline error, not a browser alert()', () => {
  const capture = read('src/pages/Capture.tsx');

  // The old alert is gone from the fatal catch.
  assert.doesNotMatch(capture, /alert\(`Proof did not save/);
  // The fatal catch records the failure in state for the inline panel.
  const fatalCatch = capture.slice(capture.indexOf('[ProofSubmit] FATAL Error:'));
  assert.match(fatalCatch, /setSubmissionStatus\('error'\)/);
  assert.match(fatalCatch, /setErrorMessage\(/);
  // A fresh submit attempt clears the previous inline error.
  assert.match(capture, /setErrorMessage\(null\)/);
});

test('P0-8: the inline error panel renders with a retry wired to handleRetrySync', () => {
  const capture = read('src/pages/Capture.tsx');

  // The panel only shows on a submit error and is announced as an alert.
  assert.match(capture, /submissionStatus === 'error' && \(/);
  assert.match(capture, /role="alert"/);
  // The retry button calls the existing retry handler and is disabled while
  // a retry is in flight, so a double-tap cannot double-submit.
  assert.match(capture, /onClick=\{handleRetrySync\}/);
  assert.match(capture, /disabled=\{isUploading\}/);
  // The panel names the failure and reassures the player the evidence kept.
  assert.match(capture, /Proof didn&apos;t save/);
  assert.match(capture, /Your photo and field note are still here/);
});

test('P0-8: the retry handler is reachable after a fatal failure', () => {
  const capture = read('src/pages/Capture.tsx');

  // The fatal catch nulls completeRecord, so the old `!completeRecord`
  // guard made the retry dead on arrival. The retry now only needs
  // captured evidence (which handleSubmit itself guards on) plus the
  // in-flight guard.
  // Scope to the retry handler body only (it ends at the next `};`).
  const start = capture.indexOf('const handleRetrySync');
  const retry = capture.slice(start, capture.indexOf('\n  };', start));
  assert.doesNotMatch(retry, /!completeRecord/);
  assert.match(retry, /handleSubmit\(true\)/);
  assert.match(retry, /isUploading \|\| submitLockRef\.current/);
});

test('P0-8: a failed submit preserves the captured photo and note', () => {
  const capture = read('src/pages/Capture.tsx');

  // Scope to the fatal catch: from the FATAL log line to the end of the
  // catch block (the `finally` that follows it). The catch may drop the
  // optimistic local record, but it must not clear the evidence itself.
  const fatalCatch = capture.slice(
    capture.indexOf('[ProofSubmit] FATAL Error:'),
    capture.indexOf('} finally {', capture.indexOf('[ProofSubmit] FATAL Error:')),
  );
  assert.doesNotMatch(fatalCatch, /setCaptureData\(null\)/);
  assert.doesNotMatch(fatalCatch, /setFcData\(/);
  assert.doesNotMatch(fatalCatch, /alert\(/);
  // And the failure path still lands back on reviewing, where the photo
  // and note are shown.
  assert.match(fatalCatch, /setFcState\('reviewing'\)/);
});

test('P0-8: a retry reuses an already-created pending entry instead of minting a duplicate', () => {
  const capture = read('src/pages/Capture.tsx');

  // submitTripEntry mints a fresh entry doc per call unless existingEntryId
  // is set, and its anti-repeat check only blocks APPROVED entries — so a
  // retry after a post-write failure would otherwise double-submit. The
  // retry passes the id of a synced pending entry for this trip when one
  // exists, turning the retry into an update-in-place.
  assert.match(capture, /pendingEntryIdForTrip/);
  assert.match(capture, /normalizeEntryStatus\(e\.status\) === 'pending_review'/);
  assert.match(capture, /existingEntryId: entryIdParam \|\| pendingEntryIdForTrip \|\| null/);
  // The submit entry point still refuses a second in-flight attempt.
  assert.match(
    capture,
    /if \(!user \|\| !profile \|\| !captureData \|\| isUploading \|\| submitLockRef\.current\) return;/,
  );
});
