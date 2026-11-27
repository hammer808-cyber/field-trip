import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  describeTimeWindow,
  formatHour,
  formatTimeWindow,
  getTimeWindowStatus,
  isWithinTimeWindow,
} from '../logic/timeWindow';
import { WINTER_CHALLENGE_BANK } from '../data/winterChallengeBank';
import { SOCAL_SUMMER_CHALLENGE_BANK } from '../data/socalSummerChallengeBank';
import { HOLIDAY_CHALLENGE_BANK } from '../data/holidayChallengeBank';
import { TEXAS_CHALLENGE_BANK } from '../data/texasChallengeBank';
import { URBAN_RECON_CHALLENGE_BANK } from '../data/urbanReconChallengeBank';
import { JET_SETTER_CHALLENGE_BANK } from '../data/jetSetterChallengeBank';
import { ALL_CHALLENGE_CARDS } from '../data/allChallengeBanks';

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

test('winter time windows: Foggy Morning (morning), Palm Tree Lights (night), Lights After Dark (night)', () => {
  const timed = WINTER_CHALLENGE_BANK.filter((c) => c.proofRequirements?.timeWindow);
  assert.deepEqual(timed.map((c) => c.id), ['winter-06', 'winter-08', 'winter-19']);
  assert.deepEqual(
    WINTER_CHALLENGE_BANK.find((c) => c.id === 'winter-06')?.proofRequirements?.timeWindow,
    { startHour: 5, endHour: 12 },
  );
  assert.deepEqual(
    WINTER_CHALLENGE_BANK.find((c) => c.id === 'winter-08')?.proofRequirements?.timeWindow,
    { startHour: 18, endHour: 6 },
  );
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

// ---------------------------------------------------------------------------
// Nov 27, 2026 audit: every time-of-day card is time locked. Zach submitted
// Golden Hour Glow at sunrise (6 AM) and it went through because the card
// had no window. The full audit list (card -> window -> why) is pinned
// here and in the bank comments; a future card that names a time of day
// must join this list, not slip in unlocked.
// ---------------------------------------------------------------------------

/** Every card with a time window, across all decks, sorted. */
const WINDOWED_IDS = [
  'socal-05', 'socal-08',
  'holiday-08', 'holiday-09', 'holiday-10',
  'texas-12',
  'urban-02', 'urban-03', 'urban-12', 'urban-18', 'urban-20',
  'winter-06', 'winter-08', 'winter-19',
].sort();

test('audit pin: exactly these 14 cards carry a time window, no more, no fewer', () => {
  const windowed = ALL_CHALLENGE_CARDS.filter((c) => (c as any).proofRequirements?.timeWindow)
    .map((c) => c.id as string)
    .sort();
  assert.deepEqual(windowed, WINDOWED_IDS);
});

test('audit pin: every newly locked card carries its window', () => {
  const byId = new Map(ALL_CHALLENGE_CARDS.map((c) => [c.id, c] as const));
  const expected: Record<string, { startHour: number; endHour: number }> = {
    'socal-05': { startHour: 16, endHour: 20 }, // sunset (Zach: this card is for sunset)
    'socal-08': { startHour: 15, endHour: 19 }, // late afternoon shadows
    'holiday-08': { startHour: 18, endHour: 6 }, // lit house at night
    'holiday-09': { startHour: 5, endHour: 12 }, // morning frost, before the sun takes it
    'holiday-10': { startHour: 15, endHour: 18 }, // early winter sunset, sun down before five
    'texas-12': { startHour: 18, endHour: 6 }, // stadium lights at night
    'urban-02': { startHour: 18, endHour: 6 }, // holiday lights lit up
    'urban-03': { startHour: 5, endHour: 12 }, // Market Morning, farmers market
    'urban-12': { startHour: 18, endHour: 6 }, // after dark at the night market
    'winter-06': { startHour: 5, endHour: 12 }, // foggy winter morning
    'winter-08': { startHour: 18, endHour: 6 }, // palm lit up after dark
  };
  for (const [id, window] of Object.entries(expected)) {
    const card = byId.get(id);
    assert.ok(card, `${id} exists`);
    assert.deepEqual((card as any).proofRequirements?.timeWindow, window, id);
  }
  // The three pre-existing windows are unchanged.
  assert.deepEqual(
    (byId.get('winter-19') as any).proofRequirements?.timeWindow,
    { startHour: 18, endHour: 6 },
  );
  assert.deepEqual(
    (byId.get('urban-18') as any).proofRequirements?.timeWindow,
    { startHour: 18, endHour: 6 },
  );
  assert.deepEqual(
    (byId.get('urban-20') as any).proofRequirements?.timeWindow,
    { startHour: 5, endHour: 8 },
  );
});

test('Golden Hour Glow copy now says sunset, so card and lock agree', () => {
  const card = SOCAL_SUMMER_CHALLENGE_BANK.find((c) => c.id === 'socal-05');
  assert.ok(card, 'socal-05 exists');
  assert.match(card!.description || '', /sunset/i);
  assert.match(card!.mission || '', /sunset/i);
});

test('gate: Zach’s exact case — Golden Hour Glow refuses 6 AM and allows 6 PM', () => {
  const card = SOCAL_SUMMER_CHALLENGE_BANK.find((c) => c.id === 'socal-05');
  assert.ok(card, 'socal-05 exists');
  // 6:06 AM, the sunrise submit that went through before the lock.
  assert.equal(getTimeWindowStatus(card as any, atHour(6)).open, false);
  assert.match(
    getTimeWindowStatus(card as any, atHour(6)).closedMessage,
    /Only open 4 PM–8 PM — come back at 4 PM\./,
  );
  assert.equal(getTimeWindowStatus(card as any, atHour(12)).open, false);
  assert.equal(getTimeWindowStatus(card as any, atHour(18)).open, true);
  assert.equal(getTimeWindowStatus(card as any, atHour(19)).open, true);
  assert.equal(getTimeWindowStatus(card as any, atHour(20)).open, false);
});

test('gate: each newly locked card refuses the wrong time and allows the right one', () => {
  const byId = new Map(ALL_CHALLENGE_CARDS.map((c) => [c.id, c] as const));
  const cases: [string, number, number][] = [
    // [card, wrong hour (closed), right hour (open)]
    ['socal-08', 10, 16], // late afternoon shadows, not mid-morning
    ['holiday-08', 12, 20], // lit house at night, not noon
    ['holiday-09', 15, 8], // morning frost, not mid-afternoon
    ['holiday-10', 10, 16], // early winter sunset, not mid-morning
    ['texas-12', 12, 21], // stadium lights at night, not noon
    ['urban-02', 12, 20], // holiday lights at night, not noon
    ['urban-03', 15, 9], // morning market, not mid-afternoon
    ['urban-12', 12, 20], // night market after dark, not noon
    ['winter-06', 15, 8], // foggy morning, not mid-afternoon
    ['winter-08', 12, 20], // lit palm at night, not noon
  ];
  for (const [id, wrongHour, rightHour] of cases) {
    const card = byId.get(id);
    assert.ok(card, `${id} exists`);
    assert.equal(getTimeWindowStatus(card as any, atHour(wrongHour)).open, false, `${id} closed at ${wrongHour}`);
    assert.equal(getTimeWindowStatus(card as any, atHour(rightHour)).open, true, `${id} open at ${rightHour}`);
  }
});

test('left unlocked on purpose: time-agnostic cards still submit any time', () => {
  const byId = new Map(ALL_CHALLENGE_CARDS.map((c) => [c.id, c] as const));
  // Golden hour at either end (the single-window mechanism cannot express
  // two windows), multi-time by design, or a food/venue name, not a time.
  const unlocked = [
    'texas-01', // Lone Star Sky: golden hour, subjects accept sunset AND sunrise
    'urban-09', // Waterfront Walk: golden hour, no sunset/sunrise pin
    'jet-setter-06', // Sunset Department: mission explicitly allows sunset, sunrise, golden hour, evening
    'texas-02', // Taco Truck Stop: "breakfast taco" is a dish, not a time
    'texas-07', // Two-Step Floor: "nightlife" tag; the venue, not a time
    'texas-09', // Whataburger Run: "late-night" is flavor text
    'jet-setter-23', // Beach Day Aftermath: "sunset walk" is one of many options
    'holiday-06', // First Fire: seasonal, not time-of-day
    'winter-13', // Fireside Story: a fire any time
    'winter-17', // Lodge Fire: a fireplace any time
  ];
  for (const id of unlocked) {
    const card = byId.get(id);
    assert.ok(card, `${id} exists`);
    assert.equal((card as any).proofRequirements?.timeWindow, undefined, `${id} has no window`);
    assert.equal(getTimeWindowStatus(card as any, atHour(3)).open, true, `${id} open at 3 AM`);
    assert.equal(getTimeWindowStatus(card as any, atHour(15)).open, true, `${id} open at 3 PM`);
  }
});

test('describeTimeWindow: the card line names the kind and the hours', () => {
  assert.equal(describeTimeWindow({ startHour: 18, endHour: 6 }), 'Night only · 6 PM–6 AM');
  assert.equal(describeTimeWindow({ startHour: 5, endHour: 8 }), 'Sunrise only · 5 AM–8 AM');
  assert.equal(describeTimeWindow({ startHour: 5, endHour: 12 }), 'Morning only · 5 AM–12 PM');
  assert.equal(describeTimeWindow({ startHour: 15, endHour: 18 }), 'Sunset only · 3 PM–6 PM');
  assert.equal(describeTimeWindow({ startHour: 15, endHour: 19 }), 'Late afternoon only · 3 PM–7 PM');
  assert.equal(describeTimeWindow({ startHour: 16, endHour: 20 }), 'Sunset only · 4 PM–8 PM');
  assert.equal(describeTimeWindow({ startHour: 9, endHour: 17 }), 'Only open 9 AM–5 PM');
});

test('the window line shows on the card, the briefing card, and the capture brief (source pins)', () => {
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');
  // Drawn card on /missions.
  assert.match(read('src/components/MissionDecodedCard.tsx'), /<TimeWindowLine mission=\{mission\} \/>/);
  // Briefing card on /briefing.
  assert.match(read('src/components/ChallengeCard.tsx'), /<TimeWindowLine mission=\{challenge\} /);
  // Capture "What to do" block — the surface Zach was on at 6:06 AM.
  assert.match(read('src/components/FieldClipboard.tsx'), /<TimeWindowLine mission=\{mission\} variant="inline" /);
  // The line itself renders nothing without a window and names the hours with one.
  const line = read('src/components/TimeWindowLine.tsx');
  assert.match(line, /describeTimeWindow\(status\.window\)/);
  assert.match(line, /Opens at \{formatHour\(status\.window\.startHour\)\}/);
  assert.match(line, /if \(!status\.window\) return null/);
});

test('Zach’s already-submitted sunrise photo: the approve backstop now refuses it (reported, not carved out)', () => {
  // His socal-05 entry was submitted ~6:06 AM local. The server approve
  // route resolves the card from the LIVE bank and checks the entry's
  // stamped local hour against the card's current window — there is no
  // grandfathering for entries submitted before the lock existed.
  assert.equal(isWithinTimeWindow(6, { startHour: 16, endHour: 20 }), false);
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const server = readFileSync(join(repoRoot, 'server.ts'), 'utf8');
  assert.match(server, /resolveMissionById\(getBackendString\(entry\.tripId/);
  assert.match(server, /approvalWindow = \(approvalMission as any\)\?\.proofRequirements\?\.timeWindow/);
  assert.match(server, /TIME_WINDOW_CLOSED: this card only counts/);
});
