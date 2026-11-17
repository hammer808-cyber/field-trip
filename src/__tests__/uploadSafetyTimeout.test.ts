import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

test('upload safety timeout: a stalled photo chain shows an error and a retry instead of spinning forever', () => {
  const camera = read('src/components/ViewfinderCamera.tsx');
  // Nov 16, 2026: a camera-roll upload hung on "Processing Signal..."
  // twice in the cloud browser (warm server too) — the chain has steps
  // with no timeout, so a stall left the screen dead with no error.
  assert.match(camera, /const PROCESSING_TIMEOUT_MS = 45000;/);
  // Both handlers race their chain against the watchdog.
  assert.match(camera, /UPLOAD_TIMEOUT: The photo took too long to process\. Nothing was sent\. Try again\./);
  assert.match(camera, /CAPTURE_TIMEOUT: The photo took too long to process\. Nothing was sent\. Try again\./);
  // The timer is cleared when the chain finishes, so a slow-but-fine
  // upload never shows a spurious timeout error afterwards.
  assert.match(camera, /window\.clearTimeout\(processingTimeoutId\);/);
  // A late completion must not fire onCapture after the timeout error.
  const guarded = camera.match(/if \(!timedOut\) onCapture\(/g) ?? [];
  assert.equal(guarded.length, 2);
  // ... and a late throw must not overwrite the timeout error.
  const guardedErrors = camera.match(/if \(!timedOut\) setError\(/g) ?? [];
  assert.equal(guardedErrors.length, 2);
  // The error screen still offers the upload retry.
  assert.match(camera, /Upload Photo Evidence/);
});

test('upload safety timeout: dismissing the error actually restarts the camera', () => {
  const camera = read('src/components/ViewfinderCamera.tsx');
  // A failed upload stops the stream first, so dismissing the error
  // used to show a dead camera with no way back.
  assert.match(camera, /const \[cameraRestartNonce, setCameraRestartNonce\] = useState\(0\);/);
  assert.match(camera, /\[facingMode, cameraRestartNonce\]/);
  assert.match(camera, /setCameraRestartNonce\(\(n\) => n \+ 1\);/);
});

test('upload safety timeout: the unbounded steps in the chain are bounded at the source', () => {
  const api = read('src/lib/api.ts');
  // The token refresh had no timeout — the request timeout only covers
  // fetch, so a stalled refresh hung the whole call past it.
  assert.match(api, /Promise\.race\(\[\s*user\.getIdToken\(\),/);
  assert.match(api, /AUTH_TOKEN_TIMEOUT/);

  const camera = read('src/components/ViewfinderCamera.tsx');
  // The upload's file read had no error handler: a failed read never
  // settled, and only the watchdog saved the screen.
  assert.match(camera, /reader\.onerror = \(\) => reject\(new Error\('Failed to read the photo file\.'\)\);/);

  const photo = read('src/lib/photoUtils.ts');
  // A malformed JPEG can throw inside the EXIF read; without the catch
  // the metadata promise never settles.
  assert.match(photo, /exifData = EXIF\.readFromBinaryFile\(arrayBuffer\);/);
  assert.match(photo, /catch \{\s*exifData = undefined;\s*\}/);
});
