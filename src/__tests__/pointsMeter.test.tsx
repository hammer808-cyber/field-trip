import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PointsMeter } from '../components/PointsMeter';
import { calculateMissionScore } from '../logic/missionScoring';

test('the meter shows base plus each earned layer and the running total', () => {
  const score = calculateMissionScore({
    baseMaxScore: 125,
    reviewerBaseScore: 125,
    participation: { photoSubjectVerified: true, fieldNotePresent: true, locationVerified: false },
  });
  const html = renderToStaticMarkup(<PointsMeter score={score} />);
  assert.ok(html.includes('aria-label="Points so far: 187 of 218 XP"'), 'meter should report 187 of 218 (125 + 2 x 31, max 125 + 3 x 31)');
  assert.ok(html.includes('+31'), 'meter should show the earned 31-point layers');
  assert.ok(html.includes('role="meter"'), 'meter should expose its value for assistive tech');
});

test('the meter shows unearned layers as potential, not points', () => {
  const score = calculateMissionScore({
    baseMaxScore: 100,
    reviewerBaseScore: 100,
    participation: {},
  });
  const html = renderToStaticMarkup(<PointsMeter score={score} />);
  assert.ok(html.includes('aria-label="Points so far: 100 of 175 XP"'), 'meter should report 100 of 175 with no layers earned');
});
