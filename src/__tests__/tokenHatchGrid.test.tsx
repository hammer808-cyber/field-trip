import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { fileURLToPath } from 'node:url';
import {
  earnedHatchCells,
  isSeasonGoalComplete,
  SeasonTokenRaceCard,
  TokenHatchGrid,
} from '../components/TokenHatchGrid';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

const count = (html: string, needle: string): number =>
  html.split(needle).length - 1;

const earnedCells = (html: string) => count(html, 'data-earned="true"');
const emptyCells = (html: string) => count(html, 'data-earned="false"');
const totalCells = (html: string) => count(html, 'data-hatch-cell');

test('earnedHatchCells: one cell per 10 tokens, capped at 100', () => {
  assert.equal(earnedHatchCells(0, 1000), 0);
  assert.equal(earnedHatchCells(9, 1000), 0);
  assert.equal(earnedHatchCells(10, 1000), 1);
  assert.equal(earnedHatchCells(250, 1000), 25);
  assert.equal(earnedHatchCells(999, 1000), 99);
  assert.equal(earnedHatchCells(1000, 1000), 100);
  assert.equal(earnedHatchCells(1250, 1000), 100);
  assert.equal(earnedHatchCells(-5, 1000), 0);
});

test('isSeasonGoalComplete is true only at or past the goal', () => {
  assert.equal(isSeasonGoalComplete(999, 1000), false);
  assert.equal(isSeasonGoalComplete(1000, 1000), true);
  assert.equal(isSeasonGoalComplete(1250, 1000), true);
});

test('hatch grid always renders 100 cells', () => {
  for (const tokens of [0, 250, 1000]) {
    const html = renderToStaticMarkup(
      <TokenHatchGrid tokens={tokens} goal={1000} />,
    );
    assert.equal(totalCells(html), 100, `tokens=${tokens}`);
  }
});

test('cell counts for given token values: 0 / 250 / 1000', () => {
  const none = renderToStaticMarkup(<TokenHatchGrid tokens={0} goal={1000} />);
  assert.equal(earnedCells(none), 0);
  assert.equal(emptyCells(none), 100);

  const quarter = renderToStaticMarkup(
    <TokenHatchGrid tokens={250} goal={1000} />,
  );
  assert.equal(earnedCells(quarter), 25);
  assert.equal(emptyCells(quarter), 75);

  const full = renderToStaticMarkup(
    <TokenHatchGrid tokens={1000} goal={1000} />,
  );
  assert.equal(earnedCells(full), 100);
  assert.equal(emptyCells(full), 0);
});

test('mono label reads "N / 1000 tokens"', () => {
  const html = renderToStaticMarkup(
    <TokenHatchGrid tokens={250} goal={1000} />,
  );
  assert.match(html, /250 \/ 1000 tokens/);
  const full = renderToStaticMarkup(
    <TokenHatchGrid tokens={1000} goal={1000} />,
  );
  assert.match(full, /1000 \/ 1000 tokens/);
});

test('DONE stamp lands only at the goal', () => {
  const almost = renderToStaticMarkup(
    <TokenHatchGrid tokens={999} goal={1000} />,
  );
  assert.equal(count(almost, 'data-done-stamp'), 0);

  const done = renderToStaticMarkup(
    <TokenHatchGrid tokens={1000} goal={1000} />,
  );
  assert.equal(count(done, 'data-done-stamp'), 1);
  assert.match(done, /DONE!/);

  const over = renderToStaticMarkup(
    <TokenHatchGrid tokens={1250} goal={1000} />,
  );
  assert.equal(count(over, 'data-done-stamp'), 1);
});

test('race card renders one hatch row per trail member, with marker', () => {
  const html = renderToStaticMarkup(
    <SeasonTokenRaceCard
      goal={1000}
      members={[
        {
          id: 'me',
          name: 'Explorer',
          tokens: 250,
          markerEmoji: '👣',
          markerLabel: 'Classic Scout',
          isMe: true,
        },
      ]}
    />,
  );
  assert.match(html, /Season Tokens/);
  assert.match(html, /Explorer/);
  assert.match(html, /\(YOU\)/);
  assert.match(html, /👣/);
  assert.equal(totalCells(html), 100);
  assert.equal(earnedCells(html), 25);
  assert.match(html, /250 \/ 1000 tokens/);
});

test('race card renders nothing when the trail is hidden', () => {
  const html = renderToStaticMarkup(
    <SeasonTokenRaceCard goal={1000} members={[]} />,
  );
  assert.equal(html, '');
});

test('BigBoard wires the trail members into the hatch grid, and leaves Field Momentum on level progress', () => {
  const bigBoard = read('src/pages/BigBoard.tsx');
  assert.match(bigBoard, /import \{ SeasonTokenRaceCard \} from "\.\.\/components\/TokenHatchGrid"/);
  assert.match(bigBoard, /<SeasonTokenRaceCard/);
  assert.match(bigBoard, /members=\{activeTrailMembers\.map/);
  assert.match(bigBoard, /goal=\{SEASON_TOKEN_GOAL\}/);
  // Field Momentum is LEVEL progress, not the token race: untouched.
  assert.match(bigBoard, /percent=\{progressToNextRankPercent\}/);
  assert.match(bigBoard, /title="Field Momentum"/);
});
