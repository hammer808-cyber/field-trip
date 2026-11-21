/**
 * The match scoreboard as a ruled table — Field Manual chrome
 * (Nov 21, 2026). Big Board's standings were a stack of player cards;
 * the mock is a table: RANK / SCOUT / LEVEL / STREAKS / SCORE, the
 * leader row lime, a 1ST stamp on rank one. BADGES is LEVEL instead —
 * no per-player badge count exists in the ranking payload, and level
 * is the real per-player mark. Streaks read the server-maintained
 * `approvalStreakDays` (the value behind the streak chip).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BigBoardStandingsTable } from '../components/BigBoardStandingsTable';

const players = [
  {
    id: 'a',
    name: 'Elondra',
    weeklyXp: 500,
    lifetimeXp: 314,
    approvalStreakDays: 5,
  },
  {
    id: 'b',
    name: 'Trevor',
    weeklyXp: 300,
    lifetimeXp: 120,
    approvalStreakDays: 0,
  },
];

test('scoreboard: renders a real table with the five mock columns', () => {
  const html = renderToStaticMarkup(
    <BigBoardStandingsTable players={players} currentUserId="b" />,
  );
  assert.ok(html.includes('<table'), 'standings are not a table');
  assert.ok(html.includes('Rank') && html.includes('Scout'), 'table lacks Rank/Scout headers');
  assert.ok(html.includes('Level') && html.includes('Streaks'), 'table lacks Level/Streaks headers');
  assert.ok(html.includes('Score'), 'table lacks the Score header');
});

test('scoreboard: the leader row is lime with a 1ST stamp', () => {
  const html = renderToStaticMarkup(
    <BigBoardStandingsTable players={players} currentUserId="b" />,
  );
  assert.ok(html.includes('bg-[var(--skin-secondary)]'), 'leader row is not lime');
  assert.ok(html.includes('1ST'), 'rank one has no 1ST stamp');
  assert.ok(html.includes('#1'), 'rank one shows no rank number');
});

test('scoreboard: streaks show the approval count with a flame, zero shows a dash', () => {
  const html = renderToStaticMarkup(
    <BigBoardStandingsTable players={players} currentUserId="b" />,
  );
  assert.ok(html.includes('lucide-flame'), 'a live streak has no flame');
  assert.ok(html.includes('>5<'), 'a live streak shows no count');
  assert.ok(html.includes('—'), 'a zero streak shows no dash');
});

test('scoreboard: the level-4 Big Board border still shows as an orange ring', () => {
  const html = renderToStaticMarkup(
    <BigBoardStandingsTable
      players={[
        { ...players[0], progressionRewardIds: ['level-4-big-board-border'] },
        players[1],
      ]}
      currentUserId="b"
    />,
  );
  assert.ok(html.includes('ring-brand-orange/30'), 'the milestone border reward lost its visible effect');
});

test('scoreboard: Big Board renders the table and feeds it the approval streak', () => {
  const board = readFileSync('src/pages/BigBoard.tsx', 'utf8');
  assert.match(
    board,
    /<BigBoardStandingsTable players=\{playerRankings\} currentUserId=\{user\?\.uid\} \/>/,
    'Big Board does not render the standings table',
  );
  assert.ok(
    board.includes('approvalStreakDays: Number((userProfile as any)?.approvalStreakDays || 0)'),
    'the weekly branch does not feed the streak',
  );
  assert.ok(
    board.includes('approvalStreakDays: Number((profile as any)?.approvalStreakDays || 0)'),
    'the current-user override does not feed the streak',
  );
  assert.doesNotMatch(board, /playerRankings\.map\(\(player: any, idx: number\)/, 'the old card stack is still rendered');
});

test('scoreboard: the viewer is tagged and the score is weekly XP', () => {
  const html = renderToStaticMarkup(
    <BigBoardStandingsTable players={players} currentUserId="b" />,
  );
  assert.ok(html.includes('(YOU)'), 'the viewer row is not tagged');
  assert.ok(html.includes('500 XP'), 'the score is not weekly XP');
  assert.ok(html.includes('Level 2'), 'the level chip does not show the level');
});
