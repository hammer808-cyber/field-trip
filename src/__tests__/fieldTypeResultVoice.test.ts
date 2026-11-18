import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

test('result page speaks in Trevor\u2019s voice, not dossier-speak', () => {
  const page = read('src/pages/FieldTypeResult.tsx');
  // Trevor leads: his per-type line is stripped of the "TREVOR:" log
  // prefix and shown up top under a "Trevor says" label.
  assert.match(page, /trevorLine = data\.narration\.replace\(\/\^TREVOR:\\s\*\/, ''\)/);
  assert.match(page, /Trevor says/);
  // The persona name is the heading for everyone. A first-timer used to
  // see "YOU\u2019RE BACK" and a "RE-ENTRY SEQUENCE" label instead of
  // their own result, and the guided view hid the summary, the
  // description, and Trevor's line entirely.
  assert.match(page, />\{data\.name\}<\/h2>/);
  assert.doesNotMatch(page, /YOU\u2019RE BACK/);
  assert.doesNotMatch(page, /RE-ENTRY SEQUENCE/);
  assert.doesNotMatch(page, /Identification Sequence Complete/);
  // The dossier chrome is gone: no reference code, no CLASSIFIED stamp,
  // no "Locked in".
  assert.doesNotMatch(page, /REF_704_B/);
  assert.doesNotMatch(page, /CLASSIFIED/);
  assert.doesNotMatch(page, /Locked in/);
  // The rules blocks were reframed as Trevor talking about the player.
  assert.match(page, /Trevor\u2019s field notes/);
  assert.match(page, /Your field report/);
  assert.match(page, /Superpower/);
  assert.match(page, /Watch out for/);
  assert.match(page, /Your vibe/);
  assert.match(page, /Your stamp/);
  assert.match(page, /Trevor approved/);
  assert.doesNotMatch(page, /STRATEGY_DEBRIEF/);
  assert.doesNotMatch(page, /Field stats/);
  assert.doesNotMatch(page, /Strength_lvl/);
  assert.doesNotMatch(page, /Risk_Factor/);
  assert.doesNotMatch(page, /Vibe tags/);
});

test('result page how-to-play lines are Trevor talking, not rules', () => {
  const types = read('src/constants/fieldTypes.ts');
  assert.doesNotMatch(types, /Stick to the rules/);
  assert.doesNotMatch(types, /Complete the classification quiz to unlock your field potential/);
  assert.match(types, /Write it all down\. The list is half the mission, honestly\./);
  assert.match(types, /Take the quiz and I will tell you who you are\. It takes about a minute\./);
});

test('result page CTA says what happens next', () => {
  const page = read('src/pages/FieldTypeResult.tsx');
  // "Start my first mission" opens the photo step first, then Basecamp —
  // the page says so now, on both the inline button and the sticky footer.
  assert.match(page, /Next: add a photo if you want, then your first mission on Basecamp\./);
  assert.match(page, /Photo first if you want it, then your first mission\./);
  // The non-guided button gets the same honesty when the photo step
  // will actually appear.
  assert.match(page, /Next: add a photo if you want one, then Basecamp\./);
  // The caption only shows when there is no photo saved — with one, the
  // button goes straight to Basecamp and the line would be wrong.
  assert.match(page, /isGuidedActive && !profile\?\.photoURL && \(/);
  assert.match(page, /!isGuidedActive && !profile\?\.photoURL && \(/);
  // The navigating label used to promise a mission while routing to
  // Basecamp.
  assert.match(page, /Opening Basecamp\.\.\./);
  assert.doesNotMatch(page, /Opening mission\.\.\./);
  assert.doesNotMatch(page, /This will open your first required starter mission/);
  // Skipping the photo step says where it goes.
  assert.match(page, /Skip — go to Basecamp/);
  assert.doesNotMatch(page, /Skip for now/);
});

test('result page badge reads as Trevor, not a form', () => {
  const labels = read('src/utils/labelUtils.ts');
  assert.match(labels, /PERSONA_IDENTIFIED: "That's you"/);
});

test('result page is the persona, not instructions', () => {
  const page = read('src/pages/FieldTypeResult.tsx');
  // Nov 17, 2026: the guided how-to caption and the 01/02/03 steps were
  // removed from the result page — the mission flow itself teaches them.
  assert.doesNotMatch(page, /Take one photo\. Add one short note\. Submit it for review\./);
  assert.doesNotMatch(page, /Find the target in the real world\./);
  assert.doesNotMatch(page, /Take one photo as proof\./);
  assert.doesNotMatch(page, /Add a note and submit\./);
  // The instinct shows without the stray slash: "HYPE PERFORM", not
  // "HYPE / PERFORM".
  assert.match(page, /data\.coreInstinct\.replace\(' \/ ', ' '\)/);
  // The stamp is an actual stamp visual now — one generic stamp style for
  // every persona for now, with that persona's stamp text inside — not
  // plain orange text.
  assert.match(page, /-rotate-3 border-\[3px\] border-brand-orange/);
  assert.match(page, /\{data\.stamp\}/);
});

test('result page CTA routes pre-starter players to the deck', () => {
  const page = read('src/pages/FieldTypeResult.tsx');
  // Nov 17, 2026: the deck is home until the three starters are approved;
  // Basecamp is locked pre-starter.
  assert.match(page, /starterState\?\.starterComplete \? '\/basecamp' : '\/missions'/);
});
