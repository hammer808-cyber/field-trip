import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

// Nov 8, 2026: the mission photo in Capture "doesn't ever load and [doesn't]
// let you submit anything". Root cause: no fetch anywhere in the photo path
// had a timeout, so a stalled request on a phone hung forever. The capture
// step awaits evaluateWithServer (authenticatedFetch) before the photo ever
// appears, and submit awaits two storage uploads while TRANSMITTING — and
// once hung, isUploading stayed true so every later submit tap silently
// no-oped. The fix is timeouts everywhere a stall can strand the user, with
// the existing fallbacks (local evaluation; "Proof did not save" + reset)
// doing the recovery once a request actually fails.

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (relativePath: string) =>
  readFileSync(join(REPO_ROOT, relativePath), 'utf8');

test('authenticatedFetch times out instead of hanging forever', () => {
  const source = read('src/lib/api.ts');

  // A shared timeout helper, with a fallback for browsers without
  // AbortSignal.timeout.
  assert.match(source, /export function timeoutSignal\(ms: number\): AbortSignal/);
  assert.match(source, /AbortSignal\.timeout/);
  assert.match(source, /new AbortController\(\)/);
  // Default 20s on every authenticated request, overridable per call.
  assert.match(source, /timeoutMs = 20000/);
  assert.match(source, /signal: timeoutSignal\(timeoutMs\)|signal =\s*\n?\s*callerSignal/);
  assert.match(source, /fetch\(url, \{/);
  // The optional App Check token fetch cannot stall the call either.
  assert.match(source, /Promise\.race\(\[\s*getAppCheckToken\(\),/);
  assert.match(source, /setTimeout\(\(\) => resolve\(null\), 5000\)/);
});

test('the storage upload fetch times out at 60s and says so plainly', () => {
  const source = read('src/services/storageService.ts');

  assert.match(source, /import \{ timeoutSignal \} from '\.\.\/lib\/api'/);
  assert.match(source, /signal: timeoutSignal\(60000\)/);
  // A timeout becomes a readable error, not a bare AbortError, so
  // Capture's "Proof did not save" alert tells the user to retry.
  assert.match(source, /err\?\.name === 'AbortError'/);
  assert.match(source, /UPLOAD_TIMEOUT: The photo upload timed out\. Check your connection and try again\./);
});

test('a timed-out metadata check falls back instead of hanging the capture', () => {
  const source = read('src/components/ViewfinderCamera.tsx');

  // Both capture paths await evaluateWithServer inside a try/catch that
  // falls back to local evaluation. A timeout rejection lands here, so
  // the photo still appears instead of spinning forever.
  assert.match(source, /evalResult = await evaluateWithServer\(metadata\);/);
  assert.match(source, /evalResult = await evaluateWithServer\(fullMetadata\);/);
  assert.match(source, /Server evaluation failed, using local fallback/);
  assert.match(source, /Server evaluation failed, using local upload fallback/);
});

test('a failed submit resets the submit lock so the button works again', () => {
  const source = read('src/pages/Capture.tsx');

  // runSync's finally runs whether the uploads succeed, fail, or time
  // out — without this, one hung submit left isUploading true and every
  // later tap hit the `if (... || isUploading ...) return;` guard.
  assert.match(
    source,
    /finally \{\s*setIsUploading\(false\);\s*submitLockRef\.current = false;/,
  );
});
