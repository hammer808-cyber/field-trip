import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

test('capture flow audit: dead states are gone from the state machine', () => {
  const types = read('src/types/fieldClipboard.ts');
  for (const dead of ['previewing_polaroid', 'detecting', 'noting']) {
    assert.doesNotMatch(types, new RegExp(dead));
  }
  for (const live of ['brief', 'capture', 'developing_polaroid', 'reviewing', 'submitting', 'pending', 'needs_more_proof', 'result']) {
    assert.match(types, new RegExp(`'${live}'`));
  }

  const clipboard = read('src/components/FieldClipboard.tsx');
  assert.doesNotMatch(clipboard, /previewing_polaroid|state === 'detecting'|state === 'noting'/);
  assert.doesNotMatch(clipboard, /goToState\('noting'\)/);

  const capture = read('src/pages/Capture.tsx');
  assert.doesNotMatch(capture, /fcState === 'detecting'/);
  assert.doesNotMatch(capture, /setTimeout\(\(\) => setFcState\('reviewing'\), 3000\)/);
});

test('capture flow audit: one note editor, on the review screen', () => {
  const clipboard = read('src/components/FieldClipboard.tsx');
  // The Frankie one-tap chips and the voice-note recorder moved from the
  // deleted noting screen into reviewing, so audio cards can record a note
  // on the screen that actually submits.
  const reviewing = clipboard.slice(clipboard.indexOf("STEP 5: REVIEWING"));
  assert.match(reviewing, /FRANKIE_NOTE_CHIPS/);
  assert.match(reviewing, /VoiceNoteRecorder/);
  // Repair "EDIT FIELD LOGS" lands on reviewing now, not a second note screen.
  assert.match(clipboard, /goToState\('reviewing'\)/);
  assert.equal((clipboard.match(/Tell Trevor/g) || []).length, 1);
});

test('capture flow audit: no black slab under the camera feed', () => {
  const camera = read('src/components/ViewfinderCamera.tsx');
  assert.doesNotMatch(camera, /bg-gradient-to-t from-black via-black\/85/);
  // Compact floating controls, not a bottom-anchored gradient slab.
  assert.match(camera, /absolute bottom-4 inset-x-0 z-50/);
  // Retro frame: corner marks, EXP film counter, date stamp.
  assert.match(camera, /border-l-\[3px\] border-t-\[3px\] border-brand-orange/);
  assert.match(camera, /EXP_\{String\(frameCount\)/);
  assert.match(camera, /todayStamp/);

  const capture = read('src/pages/Capture.tsx');
  assert.doesNotMatch(capture, /min\(78dvh,760px\)/);
  assert.match(capture, /h-\[min\(82dvh,860px\)\]/);

  const clipboard = read('src/components/FieldClipboard.tsx');
  assert.doesNotMatch(clipboard, /bg-white border-4 border-on-surface p-2 rounded-2xl shadow-\[12px_12px_0px_white\]/);
});

test('capture flow audit: the submitting bar tracks the real upload', () => {
  const clipboard = read('src/components/FieldClipboard.tsx');
  assert.doesNotMatch(clipboard, /animate=\{\{ width: '100%' \}\}/);
  assert.match(clipboard, /repeat: Infinity/);
});
