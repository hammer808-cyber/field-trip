import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

// P1-4 close-out (Zach's call, Nov 20, 2026): the field note STAYS a submit
// requirement. The audit's premise ("the note never blocks submit") was
// wrong — FieldClipboard's canSubmit requires noteSatisfied — so the
// "label it optional" fix was reverted (e5ae4fa) instead of shipping copy
// the app doesn't keep. This pins the requirement and the honest copy.

test('field note: submit requires a note (non-Frankie)', () => {
  const clipboard = read('src/components/FieldClipboard.tsx');
  assert.ok(
    clipboard.includes('const noteSatisfied = isFrankie ? true : data.note.length >= 10 || voiceNoteSatisfied;'),
    'noteSatisfied rule changed — submit no longer requires the note?'
  );
  assert.ok(
    clipboard.includes('const canSubmit = data.photoCaptured && noteSatisfied'),
    'canSubmit no longer gates on the note'
  );
});

test('field note: the UI states the requirement honestly', () => {
  const clipboard = read('src/components/FieldClipboard.tsx');
  assert.ok(
    clipboard.includes('Add a short note before submitting.'),
    'missing the honest submit-gate copy'
  );
  assert.doesNotMatch(
    clipboard,
    /Optional — adds XP/,
    'optional-note copy is back — the note is required, see above'
  );
});

test('field note: Capture no longer claims the note is not a gate', () => {
  const capture = read('src/pages/Capture.tsx');
  assert.doesNotMatch(
    capture,
    /like the field note, it is a\s*\n?\s*\/\/ way to earn the note layer, not a gate/,
    'stale comment still claims the note is not a gate'
  );
  assert.ok(
    capture.includes("The field note IS a submit requirement (Zach's call, Nov 20, 2026):"),
    'missing the recorded decision comment'
  );
});
