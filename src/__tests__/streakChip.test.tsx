/**
 * Streaks — P3-8 (Nov 21, 2026, premium layer).
 * The daily approval streak (`approvalStreakDays`, server-maintained,
 * the streak behind the On a Roll sticker) existed in logic with no
 * display anywhere. Now a chip shows it on Basecamp and in the
 * Profile progress card; a zero streak invites instead of shaming.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StreakChip } from '../components/StreakChip';

test('streaks: a live streak shows the count with a flame', () => {
  const html = renderToStaticMarkup(<StreakChip streakDays={5} />);
  assert.ok(html.includes('5-day streak'), `chip does not show the count: ${html}`);
  assert.ok(html.includes('role="status"'), 'chip has no status role');
  assert.ok(html.includes('5-day approval streak'), 'chip has no accessible streak label');
  assert.ok(html.includes('Consecutive days with an approved proof.'), 'chip has no streak explainer');
});

test('streaks: zero shows an invite, never a bare 0', () => {
  const html = renderToStaticMarkup(<StreakChip streakDays={0} />);
  assert.ok(html.includes('Start your streak'), `zero streak does not invite: ${html}`);
  assert.ok(!html.includes('0-day'), 'zero streak shows a bare 0');
  assert.ok(html.includes('One approved proof a day keeps it alive.'), 'zero streak has no explainer');
});

test('streaks: Basecamp and Profile both read the same profile value', () => {
  const basecampSrc = readFileSync('src/pages/Basecamp.tsx', 'utf8');
  assert.ok(
    basecampSrc.includes('<StreakChip streakDays={canonicalProgress.approvalStreakDays}'),
    'Basecamp does not render the streak chip from canonicalProgress',
  );
  const profileSrc = readFileSync('src/pages/Profile.tsx', 'utf8');
  assert.ok(
    profileSrc.includes('<StreakChip streakDays={canonicalProgress.approvalStreakDays}'),
    'Profile does not render the streak chip from canonicalProgress',
  );
  assert.ok(profileSrc.includes('canonicalProgress,'), 'Profile does not pull canonicalProgress from useApp');
});
