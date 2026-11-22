import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

test('capture flow audit: the poster shows the mission and both of its buttons work', () => {
  const clipboard = read('src/components/FieldClipboard.tsx');
  // Nov 16, 2026: the mission text hid behind the brief toggle and READY
  // TO START was a div that did nothing, so the thing that looked most
  // like the next step went nowhere. The short prompt now sits on the
  // poster with no tap, the toggle is only for the full description, and
  // READY TO START is a real button that scrolls to the camera action.
  assert.match(clipboard, /mission\.shortPrompt \|\| mission\.shortDescription \|\| mission\.description/);
  assert.match(clipboard, /What to do/);
  assert.match(clipboard, /SEE FULL BRIEF/);
  assert.match(clipboard, /HIDE BRIEF/);
  assert.doesNotMatch(clipboard, /OPEN BRIEF/);
  assert.match(clipboard, /cameraActionRef/);
  assert.match(clipboard, /onClick=\{scrollToCamera\}/);
  assert.match(clipboard, /scrollIntoView\(\{ behavior: 'smooth', block: 'center' \}\)/);
  assert.match(clipboard, /ref=\{cameraActionRef\}/);
  // The dead div is gone: READY TO START is a button, not a label.
  assert.doesNotMatch(clipboard, /<div className="flex-1 px-4 py-2 flex items-center justify-center gap-2 text-\[#FF5A00\]/);
});

test('capture flow audit: no top points meter on the reviewing screen — the bottom EvidenceMeter is the only meter', () => {
  // Nov 17, 2026 (Zach's call): the submit/reviewing page had two meters —
  // PointsMeter at the top and EvidenceMeter at the bottom. The top one
  // goes; the bottom one (in FieldClipboard) stays.
  const capture = read('src/pages/Capture.tsx');
  assert.doesNotMatch(capture, /PointsMeter/);
  const clipboard = read('src/components/FieldClipboard.tsx');
  assert.match(clipboard, /<EvidenceMeter/);
});

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

test('capture flow audit: note-starter chips show in regular mode too, not just Frankie', () => {
  const clipboard = read('src/components/FieldClipboard.tsx');
  // Nov 22, 2026 (Zach): the six one-tap note starters were Frankie-only;
  // the regular submit on every deck gets the same chips. FieldClipboard
  // is the shared submit component, so one row covers all decks.
  const arraySrc = clipboard.match(/FRANKIE_NOTE_CHIPS = \[([\s\S]*?)\];/);
  assert.ok(arraySrc, 'FRANKIE_NOTE_CHIPS array not found');
  const chips = [...arraySrc[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(chips, [
    'I found it outside.',
    'It made me laugh.',
    'It was hard to find.',
    'The light looked good.',
    'I was with my group.',
    'I want to remember this.',
  ]);
  // Every chip clears the 10-character note gate on its own.
  for (const chip of chips) assert.ok(chip.length >= 10, `chip too short to clear the gate: ${chip}`);
  // The chip row is no longer gated on Frankie mode.
  assert.doesNotMatch(clipboard, /\{isFrankie && \(/);
  // Regular mode gets its own helper line — and it never promises skipping,
  // because the note is required outside Frankie.
  assert.match(clipboard, /Tap one, or write your own\.<\/p>/);
  assert.equal((clipboard.match(/You can also skip/g) || []).length, 1);
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

test('capture flow audit: the feed actually fills its frame', () => {
  // Regression: the first black-bar fix only removed the gradient slab. The
  // feed still ended two-thirds down the frame because the global
  // containment rule in index.css (img, video { height: auto }) is
  // unlayered and beats Tailwind v4's layered h-full, so the video rendered
  // at its intrinsic aspect instead of filling the stage.
  const camera = read('src/components/ViewfinderCamera.tsx');
  assert.match(camera, /height: '100%'/);
  const css = read('src/index.css');
  assert.match(css, /\.skin-viewfinder video \{\n\s*height: 100%;\n\}/);
  // The containment rule itself stays — image layout elsewhere depends on
  // it, and deleting it is not the fix.
  assert.match(css, /img, video, canvas, svg \{\n\s*max-width: 100%;\n\s*height: auto;\n\}/);
  // The same bug hit the review polaroid image (same h-full class, same
  // global rule), so it fills its square frame the same way.
  const clipboard = read('src/components/FieldClipboard.tsx');
  assert.match(clipboard, /alt="Captured Proof" className="w-full h-full object-cover" style=\{\{ height: '100%', width: '100%' \}\}/);
});
