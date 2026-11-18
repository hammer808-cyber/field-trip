import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (relativePath: string) =>
  readFileSync(join(REPO_ROOT, relativePath), 'utf8');

test('Capture: the reviewing screen has no top PointsMeter — the bottom EvidenceMeter is the only meter', () => {
  // Nov 17, 2026 (Zach's call): the submit/reviewing page had two meters —
  // PointsMeter at the top and EvidenceMeter at the bottom. The top one
  // goes; the bottom one stays. PointsMeter itself is parked on disk, not
  // deleted, in case it is reused.
  const capture = read('src/pages/Capture.tsx');
  assert.doesNotMatch(capture, /PointsMeter/);
  assert.doesNotMatch(capture, /liveScore/);
  assert.ok(existsSync(join(REPO_ROOT, 'src/components/PointsMeter.tsx')));
});

test('FieldClipboard: the bottom EvidenceMeter still renders', () => {
  const clipboard = read('src/components/FieldClipboard.tsx');
  assert.match(clipboard, /<EvidenceMeter/);
});
