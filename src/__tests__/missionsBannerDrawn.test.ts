import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

test('missions banner: no guidance banner while a mission is drawn and waiting', () => {
  const deck = read('src/pages/Deck.tsx');
  // Nov 17, 2026: in the drawn state the lime banner repeats the mission
  // name, the waiting state, and the resume action that the mission card
  // below already carries — so it is hidden in exactly that state.
  assert.match(deck, /guidance\.state !== 'RESUME_ACTIVE_MISSION' && \(\s*<MissionsGuidanceStrip/s);
  // The hidden state is the plain resume state, not the critical
  // recovery states: repair/retry still show the banner, because there
  // the strip IS the recovery guidance.
  assert.doesNotMatch(deck, /guidance\.state !== 'REPAIR_PROOF'[^]*<MissionsGuidanceStrip/s);
  assert.doesNotMatch(deck, /!isDrawn && \(\s*<MissionsGuidanceStrip/s);
});

test('missions banner: the hidden state is the one whose copy the card duplicates', () => {
  const guidance = read('src/logic/playerGuidance.ts');
  assert.match(
    guidance,
    /RESUME_ACTIVE_MISSION:[\s\S]{0,600}shortMessage: 'Your mission is waiting\.'[\s\S]{0,300}actionLabel: 'Resume mission'/,
  );
});

test('missions banner: dropping it does not strand the player — the poster still resumes', () => {
  const card = read('src/components/MissionDecodedCard.tsx');
  assert.match(card, /getDisplayLabel\('RESUME_MISSION'\)/);
  assert.match(card, /onStart\?\.?\(\)/);
});
