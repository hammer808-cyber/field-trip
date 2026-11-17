import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

test('briefing reward: the Reward row reads the same base XP as the mission card', () => {
  const briefing = read('src/pages/MissionBriefing.tsx');
  // Nov 17, 2026: the briefing showed "Reward 250XP" for Park Oasis
  // while its own card showed +100 PTS. The briefing read the legacy
  // basePoints field with a 250 fallback; Park Oasis carries baseXP 100
  // and no basePoints, so it fell through to 250. Every other display
  // uses baseXP first, basePoints second, 100 last — the briefing now
  // matches that canonical pattern.
  assert.match(briefing, /\{mission\.baseXP \|\| mission\.basePoints \|\| 100\} XP/);
  assert.doesNotMatch(briefing, /\|\| 250/);
  const card = read('src/components/ChallengeCard.tsx');
  assert.match(card, /const baseXP = challenge\.baseXP \|\| challenge\.basePoints \|\| 100;/);
});

test('briefing reward: Park Oasis carries baseXP 100 and no basePoints', () => {
  const bank = read('src/data/socalSummerChallengeBank.ts');
  const card = bank.slice(bank.indexOf('id: "socal-09"'), bank.indexOf('id: "socal-09"') + 600);
  assert.match(card, /baseXP: 100,/);
  assert.doesNotMatch(card, /basePoints/);
});
