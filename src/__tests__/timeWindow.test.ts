import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  formatHour,
  formatTimeWindow,
  getTimeWindowStatus,
  isWithinTimeWindow,
} from '../logic/timeWindow';
import { WINTER_CHALLENGE_BANK } from '../data/winterChallengeBank';

const NIGHT = { startHour: 18, endHour: 6 };
const DAY = { startHour: 9, endHour: 17 };

test('night window wraps midnight: 6 PM–6 AM inclusive of 6 PM, exclusive of 6 AM', () => {
  assert.equal(isWithinTimeWindow(17, NIGHT), false);
  assert.equal(isWithinTimeWindow(18, NIGHT), true);
  assert.equal(isWithinTimeWindow(23, NIGHT), true);
  assert.equal(isWithinTimeWindow(0, NIGHT), true);
  assert.equal(isWithinTimeWindow(5, NIGHT), true);
  assert.equal(isWithinTimeWindow(6, NIGHT), false);
  assert.equal(isWithinTimeWindow(12, NIGHT), false);
});

test('day window does not wrap: 9 AM–5 PM', () => {
  assert.equal(isWithinTimeWindow(8, DAY), false);
  assert.equal(isWithinTimeWindow(9, DAY), true);
  assert.equal(isWithinTimeWindow(16, DAY), true);
  assert.equal(isWithinTimeWindow(17, DAY), false);
});

test('degenerate window (start == end) is always open', () => {
  assert.equal(isWithinTimeWindow(3, { startHour: 0, endHour: 0 }), true);
  assert.equal(isWithinTimeWindow(15, { startHour: 0, endHour: 0 }), true);
});

test('hour and window formatting', () => {
  assert.equal(formatHour(0), '12 AM');
  assert.equal(formatHour(6), '6 AM');
  assert.equal(formatHour(12), '12 PM');
  assert.equal(formatHour(18), '6 PM');
  assert.equal(formatHour(23), '11 PM');
  assert.equal(formatTimeWindow(NIGHT), '6 PM–6 AM');
  assert.equal(formatTimeWindow(DAY), '9 AM–5 PM');
});

function atHour(hour: number): Date {
  // Sets the LOCAL hour directly, so the test is timezone-independent:
  // getTimeWindowStatus reads now.getHours(), the same local clock.
  const date = new Date(Date.UTC(2026, 11, 19, 12, 0, 0));
  date.setHours(hour);
  return date;
}

test('status: no window is always open; a window names its hours when closed', () => {
  assert.deepEqual(getTimeWindowStatus({ proofRequirements: {} }), {
    open: true,
    closedMessage: '',
  });
  assert.deepEqual(getTimeWindowStatus(null), { open: true, closedMessage: '' });
  const open = getTimeWindowStatus({ proofRequirements: { timeWindow: NIGHT } }, atHour(20));
  assert.equal(open.open, true);
  assert.equal(open.closedMessage, '');
  const closed = getTimeWindowStatus({ proofRequirements: { timeWindow: NIGHT } }, atHour(12));
  assert.equal(closed.open, false);
  assert.equal(closed.window, NIGHT);
  assert.match(closed.closedMessage, /Only open 6 PM–6 AM — come back at 6 PM\./);
});

test('Lights After Dark (winter-19) is night-only, 6 PM–6 AM', () => {
  const card = WINTER_CHALLENGE_BANK.find((c) => c.id === 'winter-19');
  assert.ok(card, 'winter-19 exists');
  assert.deepEqual(card!.proofRequirements?.timeWindow, { startHour: 18, endHour: 6 });
  assert.equal(getTimeWindowStatus(card as any, atHour(12)).open, false);
  assert.equal(getTimeWindowStatus(card as any, atHour(22)).open, true);
});

test('no other winter card carries a time window yet', () => {
  const timed = WINTER_CHALLENGE_BANK.filter((c) => c.proofRequirements?.timeWindow);
  assert.deepEqual(timed.map((c) => c.id), ['winter-19']);
});

test('the time-window rule is enforced at all three sites (source pins)', () => {
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');
  // 1. Capture: the clipboard disables submit outside the window.
  const clipboard = read('src/components/FieldClipboard.tsx');
  assert.match(clipboard, /getTimeWindowStatus\(mission\)/);
  assert.match(clipboard, /timeWindowStatus\.open/);
  assert.match(clipboard, /Opens at \$\{formatHour\(timeWindowStatus\.window\.startHour\)\}/);
  // 2. addEntry: the submit choke point throws before writing the entry.
  const appContext = read('src/context/AppContext.tsx');
  assert.match(appContext, /getTimeWindowStatus\(currentTrip as any\)\.open/);
  assert.match(appContext, /throw new Error\('TIME_WINDOW_CLOSED'\)/);
  assert.match(appContext, /submittedLocalHour = new Date\(\)\.getHours\(\)/);
  // 3. Server approve route: refuses an approval for a submission made
  // outside the window (stamped local hour, PT fallback).
  const server = read('server.ts');
  assert.match(server, /TIME_WINDOW_CLOSED: this card only counts/);
  assert.match(server, /entry\.submittedLocalHour/);
  assert.match(server, /America\/Los_Angeles/);
});
