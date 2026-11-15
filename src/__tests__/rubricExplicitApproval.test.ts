import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  getExplicitRatedCategories,
  isRubricFullyRated,
} from '../logic/proofRubric';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

test('Q9: explicit rated categories come only from finite stored ratings', () => {
  assert.deepEqual([...getExplicitRatedCategories(null)], []);
  assert.deepEqual([...getExplicitRatedCategories({})], []);
  assert.deepEqual(
    [...getExplicitRatedCategories({
      missionMatch: 2,
      proofClarity: 2,
      authenticity: 2,
      fieldNoteQuality: 2,
      fieldtripEnergy: 2,
    })].sort(),
    ['authenticity', 'fieldNoteQuality', 'fieldtripEnergy', 'missionMatch', 'proofClarity'],
  );
  // Partial: only the categories with a value count.
  assert.deepEqual(
    [...getExplicitRatedCategories({ missionMatch: 4, proofClarity: 1 })].sort(),
    ['missionMatch', 'proofClarity'],
  );
  // Non-finite values (NaN, null, undefined, strings) are not judgments.
  // Note: null must not count — Number(null) coerces to 0, so the check is
  // a strict typeof-number + isFinite, matching the SwipeView init.
  assert.deepEqual(
    [...getExplicitRatedCategories({
      missionMatch: 3,
      proofClarity: Number.NaN,
      authenticity: null,
      fieldNoteQuality: undefined,
      fieldtripEnergy: '2',
    } as any)],
    ['missionMatch'],
  );
});

test('Q9: a rubric is fully rated only when all five categories are explicit', () => {
  assert.equal(isRubricFullyRated(new Set()), false);
  assert.equal(
    isRubricFullyRated(new Set(['missionMatch', 'proofClarity', 'authenticity', 'fieldNoteQuality'])),
    false,
  );
  assert.equal(
    isRubricFullyRated(
      new Set(['missionMatch', 'proofClarity', 'authenticity', 'fieldNoteQuality', 'fieldtripEnergy']),
    ),
    true,
  );
});

test('Q9: approving against "Needs closer review" records the override', () => {
  const page = read('src/pages/AdminProofReview.tsx');
  // Include the JSDoc above the mapper: it names the band the mapper must
  // cover. The old mapper returned null for 'needs_closer_review', which is
  // what swallowed the override on a default 50% approve.
  const start = page.indexOf('/**\n * The action the rubric leans toward');
  assert.notEqual(start, -1);
  const end = page.indexOf('\n}\n', start);
  const block = page.slice(start, end);
  assert.match(block, /needs_closer_review/);
  assert.match(block, /return 'request_info'/);
  const fnStart = block.indexOf('function suggestedActionForRubric');
  const fnBody = block.slice(fnStart);
  assert.doesNotMatch(fnBody, /return null/);
});

test('Q9: Approve is disabled until all five categories are explicit', () => {
  const page = read('src/pages/AdminProofReview.tsx');
  // The Approve button's disabled prop includes the explicitness gate.
  assert.match(
    page,
    /handleDecision\('approve'\)\}\s*\n\s*disabled=\{busy \|\| !entryResolved \|\| !allRated\}/,
  );
  // Defense in depth: the handler itself refuses an approve with no
  // explicit rubric, even if called programmatically.
  assert.match(page, /if \(action === 'approve' && !allRated\) return;/);
  // The admin is told what unlocks it.
  assert.match(page, /to unlock Approve/);
});

test('Q9: applying the AI suggestion counts as explicit — including energy', () => {
  const page = read('src/pages/AdminProofReview.tsx');
  const start = page.indexOf('const applyAiSuggestion');
  assert.notEqual(start, -1);
  const body = page.slice(start, page.indexOf('\n  };\n', start));
  // The four mapped categories are added to the rated set, and energy's
  // current value (default 2) counts as accepted with the suggestion.
  assert.match(body, /next\.add\(key\)/);
  assert.match(body, /next\.add\('fieldtripEnergy'\)/);
});

test('Q9: Reject and Request info are not gated on the rubric', () => {
  const page = read('src/pages/AdminProofReview.tsx');
  for (const action of ['request_info', 'reject'] as const) {
    const at = page.indexOf(`handleDecision('${action}')`);
    assert.notEqual(at, -1);
    const button = page.slice(at, page.indexOf('</button>', at));
    assert.match(button, /disabled=\{busy \|\| !entryResolved\}/);
    assert.doesNotMatch(button, /allRated/);
  }
  // The page-level rubric requirement is unchanged: every action still
  // needs a rubric object, which SwipeView always provides.
  assert.match(page, /Score the rubric in card view before issuing a final review decision/);
});

test('Q9: unrated categories show as Not rated, never pre-selected', () => {
  const page = read('src/pages/AdminProofReview.tsx');
  assert.match(page, /Not rated/);
  // No rating button reads as selected for an unrated category.
  assert.match(
    page,
    /\(ratedCategories == null \|\| ratedCategories\.has\(category\.id\)\) && ratings\[category\.id\] === rating\.value/,
  );
  // The card says how many categories are rated.
  assert.match(page, /of 5 rated — approve unlocks when all five are rated/);
});
