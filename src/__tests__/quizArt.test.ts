/**
 * Quiz art — P3-5 (Nov 21, 2026, premium layer).
 * The quiz sold the personas with Unsplash stock and only revealed the
 * real character art after classification; Unclassified had no art at
 * all (one shared Unsplash URL + a DiceBear pixel avatar). Now every
 * persona image in the quiz data is local character art, Unclassified
 * has its own generated set, and each quiz answer shows its primary
 * persona's avatar.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { PERSONAS, QUIZ_QUESTIONS, primaryPersonaForAnswer } from '../data/personaQuiz';
import { FIELD_TYPES } from '../constants/fieldTypes';

function resolvePublic(p: string): string {
  assert.ok(p.startsWith('/assets/'), `expected a local /assets path, got ${p}`);
  return path.join(process.cwd(), 'public', p.slice(1));
}

test('quiz art: no Unsplash or DiceBear stock left in the quiz data or the Unclassified entry', () => {
  const quizSrc = fs.readFileSync('src/data/personaQuiz.ts', 'utf8');
  assert.ok(!quizSrc.includes('images.unsplash.com'), 'personaQuiz.ts still references Unsplash');
  assert.ok(!quizSrc.includes('dicebear'), 'personaQuiz.ts still references DiceBear');
  const fieldTypesSrc = fs.readFileSync('src/constants/fieldTypes.ts', 'utf8');
  const unclassifiedBlock = fieldTypesSrc.slice(fieldTypesSrc.indexOf("id: 'unclassified'"));
  assert.ok(!unclassifiedBlock.includes('images.unsplash.com'), 'Unclassified still references Unsplash');
});

test('quiz art: every persona image resolves to a real file in public/assets/characters/', () => {
  for (const [id, persona] of Object.entries(PERSONAS)) {
    const file = resolvePublic(persona.image);
    assert.ok(fs.existsSync(file), `${id} quiz image missing: ${persona.image}`);
    assert.ok(fs.statSync(file).size > 20000, `${id} quiz image suspiciously small`);
  }
  const fields = ['image', 'avatarPath', 'resultImagePath', 'cardImagePath', 'fullImagePath'] as const;
  for (const [id, data] of Object.entries(FIELD_TYPES)) {
    for (const f of fields) {
      const value = (data as unknown as Record<string, string>)[f];
      const file = resolvePublic(value);
      assert.ok(fs.existsSync(file), `${id}.${f} missing: ${value}`);
    }
  }
});

test('quiz art: Unclassified has its own local art set, not the shared stock photo', () => {
  const u = FIELD_TYPES.unclassified;
  assert.ok(u.image.includes('/characters/unclassified/'), `Unclassified image is not its own art: ${u.image}`);
  assert.ok(u.avatarPath.includes('/characters/unclassified/'), `Unclassified avatar is not its own art: ${u.avatarPath}`);
  assert.equal(PERSONAS.unclassified.image, '/assets/characters/unclassified/results.jpg');
});

test('quiz art: primaryPersonaForAnswer picks the weight-3 persona of every answer', () => {
  for (const q of QUIZ_QUESTIONS) {
    for (const a of q.answers) {
      const primary = primaryPersonaForAnswer(a);
      assert.ok(primary, `${a.id} has no primary persona`);
      assert.equal(a.personaWeights[primary], 3, `${a.id} primary ${primary} is not weight 3`);
      const avatar = FIELD_TYPES[primary]?.avatarPath;
      assert.ok(avatar?.startsWith('/assets/'), `${primary} has no local avatar`);
    }
  }
  assert.equal(primaryPersonaForAnswer({ id: 'x', text: 't', personaWeights: {} }), null);
});

test('quiz art: PersonaQuiz renders the primary persona avatar on each answer', () => {
  const src = fs.readFileSync('src/components/onboarding/PersonaQuiz.tsx', 'utf8');
  assert.ok(src.includes('primaryPersonaForAnswer(answer)'), 'quiz does not compute the primary persona per answer');
  assert.ok(src.includes('FIELD_TYPES[primaryPersona]?.avatarPath'), 'quiz does not read the avatar from FIELD_TYPES');
  assert.ok(src.includes('<img'), 'quiz renders no avatar image');
});
