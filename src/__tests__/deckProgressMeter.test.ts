import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DeckProgressMeter } from '../components/missions/DeckProgressMeter';

const render = (props: {
  approvedCount: number;
  pendingCount?: number;
  totalCount: number;
  approvedPercent: number;
  pendingPercent?: number;
  compact?: boolean;
}) => renderToStaticMarkup(React.createElement(DeckProgressMeter, props));

const countStubs = (html: string, state: 'approved' | 'pending' | 'remaining') =>
  (html.match(new RegExp(`data-state="${state}"`, 'g')) ?? []).length;

test('one stub per mission, split by state: approved, pending, remaining', () => {
  const html = render({
    approvedCount: 3,
    pendingCount: 2,
    totalCount: 15,
    approvedPercent: 20,
    pendingPercent: 13.33,
  });
  assert.equal((html.match(/data-testid="deck-progress-stub"/g) ?? []).length, 15);
  assert.equal(countStubs(html, 'approved'), 3);
  assert.equal(countStubs(html, 'pending'), 2);
  assert.equal(countStubs(html, 'remaining'), 10);
  assert.ok(html.includes('3/15 approved · 2 pending'), 'label keeps the counts');
});

test('empty deck: all stubs remaining, no DONE stamp', () => {
  const html = render({
    approvedCount: 0,
    totalCount: 20,
    approvedPercent: 0,
  });
  assert.equal(countStubs(html, 'approved'), 0);
  assert.equal(countStubs(html, 'pending'), 0);
  assert.equal(countStubs(html, 'remaining'), 20);
  assert.ok(!html.includes('deck-progress-done-stamp'), 'no stamp before full');
});

test('pending clamps to the missions left after approved', () => {
  const html = render({
    approvedCount: 14,
    pendingCount: 5,
    totalCount: 15,
    approvedPercent: 93.33,
    pendingPercent: 33.33,
  });
  assert.equal(countStubs(html, 'approved'), 14);
  assert.equal(countStubs(html, 'pending'), 1);
  assert.equal(countStubs(html, 'remaining'), 0);
});

test('progressbar aria values come from the counts', () => {
  const html = render({
    approvedCount: 8,
    pendingCount: 1,
    totalCount: 20,
    approvedPercent: 40,
    pendingPercent: 5,
  });
  assert.ok(html.includes('role="progressbar"'), 'meter exposes progressbar role');
  assert.ok(html.includes('aria-valuemin="0"'), 'min is 0');
  assert.ok(html.includes('aria-valuemax="20"'), 'max is the deck size');
  assert.ok(html.includes('aria-valuenow="8"'), 'now is the approved count');
  assert.ok(
    html.includes('aria-label="8 of 20 deck missions approved, 1 pending review"'),
    'label names approved and pending',
  );
});

test('DONE stamp lands at 100% approved only', () => {
  const full = render({
    approvedCount: 20,
    totalCount: 20,
    approvedPercent: 100,
  });
  assert.ok(full.includes('data-testid="deck-progress-done-stamp"'), 'stamp at full');
  assert.ok(full.includes('>Done<'), 'stamp reads DONE');

  const almost = render({
    approvedCount: 19,
    totalCount: 20,
    approvedPercent: 95,
  });
  assert.ok(!almost.includes('deck-progress-done-stamp'), 'no stamp at 19/20');
});

test('compact variant hides the legend and shrinks the stubs', () => {
  const html = render({
    approvedCount: 2,
    pendingCount: 1,
    totalCount: 3,
    approvedPercent: 66.67,
    pendingPercent: 33.33,
    compact: true,
  });
  assert.equal(countStubs(html, 'approved'), 2);
  assert.ok(!html.includes('>Approved<'), 'no legend swatch row in compact');
  assert.ok(!html.includes('>Pending<'), 'no pending swatch in compact');
  assert.ok(html.includes('min-width:16px'), 'compact stubs use the small min-width');
});

test('non-compact shows the legend when something is pending', () => {
  const html = render({
    approvedCount: 1,
    pendingCount: 1,
    totalCount: 3,
    approvedPercent: 33.33,
    pendingPercent: 33.33,
  });
  assert.ok(html.includes('>Approved<'), 'approved swatch shown');
  assert.ok(html.includes('>Pending<'), 'pending swatch shown');
});

test('25-stub deck wraps in rows with no horizontal scroll', () => {
  const html = render({
    approvedCount: 10,
    pendingCount: 3,
    totalCount: 25,
    approvedPercent: 40,
    pendingPercent: 12,
  });
  assert.equal((html.match(/data-testid="deck-progress-stub"/g) ?? []).length, 25);
  assert.ok(html.includes('flex-wrap'), 'stub row wraps instead of scrolling');
  assert.ok(!html.includes('overflow-x'), 'no horizontal scroll on the meter');
  assert.ok(html.includes('min-width:20px'), 'stubs stay small enough to fit a phone row');
});
