import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

// P1-4 (audit §12): note/location rows were mislabelled as blockers —
// "Add a field note to unlock." while the note never blocks a submit, and
// the location row never blocks one either. Non-blocking rows are labelled
// optional ("Optional — adds XP") and any unlock wording names the level,
// never the submit. Copy only: no submit gating or validation changed.

test('P1-4: no bare "Add a field note to unlock." blocker copy remains', () => {
  const capture = read('src/pages/Capture.tsx');
  assert.doesNotMatch(capture, /Add a field note to unlock\./);
});

test('P1-4: level lock reasons label the note optional and name the level', () => {
  const capture = read('src/pages/Capture.tsx');
  assert.ok(
    capture.includes('Optional — adds XP. Add a field note to unlock Advanced.'),
    'missing Advanced lock reason',
  );
  assert.ok(
    capture.includes('Optional — adds XP. Add a field note to unlock Certified.'),
    'missing Certified lock reason',
  );
});

test('P1-4: note, audio and location rows are marked optional for submit', () => {
  const capture = read('src/pages/Capture.tsx');
  const requirements = capture.slice(
    capture.indexOf('const evidenceRequirements = ['),
    capture.indexOf('].filter(req => req.required);', capture.indexOf('const evidenceRequirements = [')),
  );
  for (const key of ["key: 'field_note'", "key: 'audio'", "key: 'location'"]) {
    const line = requirements.split('\n').find((l) => l.includes(key));
    assert.ok(line, `missing evidence row: ${key}`);
    assert.ok(
      line.includes('optionalForSubmit: true'),
      `row is not labelled optional for submit: ${key}`,
    );
  }
  // The photo row is the one real requirement: it carries no optional mark.
  const photoLine = requirements.split('\n').find((l) => l.includes("key: 'photo'"));
  assert.ok(photoLine, 'missing evidence row: photo');
  assert.doesNotMatch(photoLine, /optionalForSubmit/);
});

test('P1-4: the required-proof gate still excludes note/audio only', () => {
  // The gate is unchanged by this copy fix; pin it so a future edit cannot
  // silently promote an optional row back into a blocker.
  const capture = read('src/pages/Capture.tsx');
  assert.match(capture, /filter\(r => r\.key !== 'field_note' && r\.key !== 'audio'\)/);
});
