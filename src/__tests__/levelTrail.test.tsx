import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LevelTrailMap } from '../components/LevelTrailMap';
import { buildLevelTrail } from '../logic/levelTrail';
import { PLAYER_LEVELS } from '../logic/playerLevel';

test('zero XP puts the player on level 1 with level 2 next', () => {
  const trail = buildLevelTrail(0);
  assert.equal(trail.nodes.length, 15);
  assert.equal(trail.currentLevel, 1);
  assert.equal(trail.isComplete, false);
  assert.equal(trail.nodes[0].state, 'current');
  assert.equal(trail.nodes[1].state, 'next');
  assert.deepEqual(
    trail.nodes.slice(2).map((node) => node.state),
    Array.from({ length: 13 }, () => 'locked'),
  );
  assert.equal(trail.nextNode?.level, 2);
  assert.equal(trail.nextNode?.title, 'Amateur Loiterer');
  assert.equal(trail.xpToNextLevel, 250);
  assert.equal(trail.progressPercent, 0);
});

test('mid-level XP stamps earlier nodes, marks the current one, names the next', () => {
  // 1587 XP is level 4 (Scene Investigator), 213 XP short of level 5.
  const trail = buildLevelTrail(1587);
  assert.equal(trail.currentLevel, 4);
  assert.equal(trail.isComplete, false);
  assert.deepEqual(
    trail.nodes.map((node) => node.state),
    [
      'passed', 'passed', 'passed', 'current', 'next',
      'locked', 'locked', 'locked', 'locked', 'locked',
      'locked', 'locked', 'locked', 'locked', 'locked',
    ],
  );
  assert.equal(trail.nextNode?.level, 5);
  assert.equal(trail.nextNode?.title, 'Licensed Side-Quester');
  assert.equal(trail.xpToNextLevel, 213);
  assert.ok(trail.progressPercent > 0 && trail.progressPercent < 100);
});

test('level 15 is trail complete: no next node, no nonsense next goal', () => {
  const trail = buildLevelTrail(22600);
  assert.equal(trail.currentLevel, 15);
  assert.equal(trail.isComplete, true);
  assert.equal(trail.nextNode, null);
  assert.equal(trail.xpToNextLevel, 0);
  assert.equal(trail.progressPercent, 100);
  assert.deepEqual(
    trail.nodes.map((node) => node.state),
    [...Array.from({ length: 14 }, () => 'passed'), 'current'],
  );
});

test('XP past level 15 stays trail complete instead of crashing', () => {
  const trail = buildLevelTrail(30000);
  assert.equal(trail.currentLevel, 15);
  assert.equal(trail.isComplete, true);
  assert.equal(trail.nextNode, null);
  assert.equal(trail.nodes.length, 15);
});

test('every node maps to a distinct authored level inside the map bounds', () => {
  const trail = buildLevelTrail(5000);
  assert.deepEqual(
    trail.nodes.map((node) => node.level),
    PLAYER_LEVELS.map((definition) => definition.level),
  );
  assert.deepEqual(
    trail.nodes.map((node) => node.title),
    PLAYER_LEVELS.map((definition) => definition.title),
  );
  for (const node of trail.nodes) {
    assert.ok(node.xPercent >= 0 && node.xPercent <= 100);
    assert.ok(node.yPercent >= 0 && node.yPercent <= 100);
  }
  // The serpentine winds: levels 1-5 bottom, 6-10 middle, 11-15 top.
  assert.ok(trail.nodes[0].yPercent > trail.nodes[5].yPercent);
  assert.ok(trail.nodes[5].yPercent > trail.nodes[10].yPercent);
});

test('render pins the current node, the next stop copy, and the XP chip', () => {
  const html = renderToStaticMarkup(<LevelTrailMap xp={1587} />);
  assert.match(html, /role="progressbar"/);
  assert.match(html, /aria-valuenow="70"/);
  assert.match(html, /You are here/i);
  assert.match(html, /Next stop: Licensed Side-Quester/i);
  assert.match(html, /213 XP to go/i);
  assert.match(html, /1,587 \/ 1,800 XP/);
  // Default marker sticker (Classic Scout) marks the current node.
  assert.match(html, /👣/);
  assert.match(html, /data-trail-node="4" data-trail-state="current"/);
  assert.match(html, /data-trail-node="5" data-trail-state="next"/);
  assert.doesNotMatch(html, /Done!/);
  assert.doesNotMatch(html, /Trail complete/i);
});

test('render honours the player-chosen marker sticker on the current node', () => {
  const html = renderToStaticMarkup(
    <LevelTrailMap xp={300} markerStickerId="lone-wolf" />,
  );
  assert.match(html, /🐺/);
  assert.doesNotMatch(html, /👣/);
  assert.match(html, /Next stop: Junior Field Nuisance/i);
});

test('render at max level stamps DONE and shows the trail-complete state', () => {
  const html = renderToStaticMarkup(<LevelTrailMap xp={22600} />);
  assert.match(html, /role="progressbar"/);
  assert.match(html, /aria-valuenow="100"/);
  assert.match(html, /Done!/);
  assert.match(html, /Local Folklore · Trail complete/i);
  assert.match(html, /22,600 XP total/);
  assert.match(html, /data-trail-node="15" data-trail-state="current"/);
  assert.doesNotMatch(html, /Next stop:/i);
  assert.doesNotMatch(html, /XP to go/i);
});
