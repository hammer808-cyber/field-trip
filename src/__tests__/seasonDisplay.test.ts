import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { getPtDateParts } from '../data/seasons';
import {
  getIsoWeekMonday,
  getSeasonLabelForWeekStart,
  getWeeklySeasonLabel,
  getWeeklySeasonLabelForIsoWeek,
} from '../logic/weeklySeasons';
import { getCalendarSeasonHeader } from '../utils/seasonCountdown';

/**
 * A Date on the given PT calendar day at noon PT (19:00 UTC), so the PT
 * date is unambiguous regardless of DST.
 */
function ptDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 19, 0, 0));
}

// ---------------------------------------------------------------------------
// Monday rule: a voting week belongs to the season its Monday falls in.
// ---------------------------------------------------------------------------

test('Monday rule: week starting Mon Nov 30, 2026 is fall even though its Saturday is Dec 5 (winter)', () => {
  const monday = ptDate(2026, 11, 30);
  assert.equal(getWeeklySeasonLabel(monday).seasonId, 'fall');
  assert.equal(getSeasonLabelForWeekStart(monday), 'Fall 2026');
  // The Saturday of that same week is already winter — no split.
  assert.equal(getSeasonLabelForWeekStart(ptDate(2026, 12, 5)), 'Winter 2026');
});

test('Monday rule: week starting Mon Dec 7, 2026 is winter', () => {
  assert.equal(getSeasonLabelForWeekStart(ptDate(2026, 12, 7)), 'Winter 2026');
});

test('Monday rule: week starting Mon Dec 1, 2025 is winter', () => {
  assert.equal(getSeasonLabelForWeekStart(ptDate(2025, 12, 1)), 'Winter 2025');
});

test('Monday rule at the Feb 28 / Mar 1 boundary: week starting Mon Feb 23, 2026 is winter even though its Sunday is Mar 1 (spring)', () => {
  const monday = ptDate(2026, 2, 23);
  assert.equal(getWeeklySeasonLabel(monday).seasonId, 'winter');
  assert.equal(getSeasonLabelForWeekStart(monday), 'Winter 2026');
  // The Sunday of that same week is already spring — no split.
  assert.equal(getSeasonLabelForWeekStart(ptDate(2026, 3, 1)), 'Spring 2026');
});

test('Monday rule at the Feb 28 / Mar 1 boundary: weeks starting Mon Mar 2, 2026 and Mon Mar 1, 2027 are spring', () => {
  assert.equal(getSeasonLabelForWeekStart(ptDate(2026, 3, 2)), 'Spring 2026');
  assert.equal(getSeasonLabelForWeekStart(ptDate(2027, 3, 1)), 'Spring 2027');
});

// ---------------------------------------------------------------------------
// Same rule, addressed by ISO week id.
// ---------------------------------------------------------------------------

test('ISO week ids resolve to the Monday-rule season label', () => {
  assert.deepEqual(getWeeklySeasonLabelForIsoWeek('2026-W49'), {
    seasonId: 'fall',
    seasonName: 'Fall',
    year: 2026,
    label: 'Fall 2026',
  });
  assert.equal(getWeeklySeasonLabelForIsoWeek('2025-W49')?.label, 'Winter 2025');
  assert.equal(getWeeklySeasonLabelForIsoWeek('2026-W09')?.label, 'Winter 2026');
  assert.equal(getWeeklySeasonLabelForIsoWeek('2026-W10')?.label, 'Spring 2026');
  assert.equal(getWeeklySeasonLabelForIsoWeek('2027-W09')?.label, 'Spring 2027');
  // 2026-W47 is the week of Nov 21, 2026 (Sat Nov 21 is inside it).
  assert.equal(getWeeklySeasonLabelForIsoWeek('2026-W47')?.label, 'Fall 2026');
});

test('ISO week ids resolve to the right Monday (PT calendar date)', () => {
  const mondayParts = (weekId: string) => {
    const monday = getIsoWeekMonday(weekId);
    assert.ok(monday, `${weekId} should resolve`);
    return getPtDateParts(monday);
  };
  assert.deepEqual(mondayParts('2026-W49'), { year: 2026, month: 11, day: 30 });
  assert.deepEqual(mondayParts('2025-W49'), { year: 2025, month: 12, day: 1 });
  assert.deepEqual(mondayParts('2026-W09'), { year: 2026, month: 2, day: 23 });
  assert.deepEqual(mondayParts('2027-W09'), { year: 2027, month: 3, day: 1 });
  // 2026-W01 starts Mon Dec 29, 2025 — the label year is the Monday's
  // year, not the ISO week year.
  assert.deepEqual(mondayParts('2026-W01'), { year: 2025, month: 12, day: 29 });
  assert.equal(getWeeklySeasonLabelForIsoWeek('2026-W01')?.label, 'Winter 2025');
});

test('invalid ISO week ids resolve to null', () => {
  assert.equal(getWeeklySeasonLabelForIsoWeek('2026-W54'), null);
  assert.equal(getWeeklySeasonLabelForIsoWeek('2026-W00'), null);
  assert.equal(getWeeklySeasonLabelForIsoWeek('2025-W53'), null); // 2025 has 52 ISO weeks
  assert.equal(getWeeklySeasonLabelForIsoWeek('junk'), null);
  assert.equal(getWeeklySeasonLabelForIsoWeek('2026-47'), null);
  assert.equal(getIsoWeekMonday(''), null);
});

// ---------------------------------------------------------------------------
// Basecamp header values (calendar-backed).
// ---------------------------------------------------------------------------

test('Basecamp header for Nov 21, 2026: current fall, next winter, 9 days left', () => {
  const header = getCalendarSeasonHeader(ptDate(2026, 11, 21));
  assert.equal(header.currentSeason.id, 'fall');
  assert.equal(header.currentSeason.name, 'Fall');
  assert.equal(header.nextSeason.id, 'winter');
  assert.equal(header.nextSeason.name, 'Winter');
  assert.equal(header.daysRemaining, 9);
  assert.equal(header.label, 'Fall ends in 9d · Winter next');
  assert.equal(header.status, 'active');
});

test('Basecamp header on the season last day (Nov 30, 2026): 0 days left, "ends today"', () => {
  const header = getCalendarSeasonHeader(ptDate(2026, 11, 30));
  assert.equal(header.currentSeason.id, 'fall');
  assert.equal(header.nextSeason.id, 'winter');
  assert.equal(header.daysRemaining, 0);
  assert.equal(header.label, 'Fall ends today · Winter next');
});

test('Basecamp header for Dec 1, 2026: current winter, next spring', () => {
  const header = getCalendarSeasonHeader(ptDate(2026, 12, 1));
  assert.equal(header.currentSeason.id, 'winter');
  assert.equal(header.nextSeason.id, 'spring');
  assert.equal(header.daysRemaining, 89);
  assert.equal(header.label, 'Winter ends in 89d · Spring next');
});

// ---------------------------------------------------------------------------
// Approve path must NOT season-gate reviews (source pins).
//
// Verified by reading server.ts (Nov 21, 2026): the approve handler
// (POST /api/admin/proof-review/action) has no season or date check at
// all, and its auto-populate hook keys the ballot off the CURRENT ISO
// week cycle at review time — which continues across season boundaries
// (seasons are contiguous, voting never pauses). A submission made
// before season end therefore still approves and still auto-populates
// normally even when the review finishes after the season ends. These
// pins fail loudly if anyone adds a calendar-season gate to either.
// ---------------------------------------------------------------------------

const serverSource = readFileSync('server.ts', 'utf8');
const CALENDAR_SEASON_REFS = /getSeasonForDate|getCurrentSeason|getNextSeason|getDaysRemainingInSeason|isEventActive|getEventStatus|data\/seasons|SEASON_ENDED|season has ended|season_ended/i;

test('approve path: the proof-review action handler has no calendar-season gate', () => {
  const handlerStart = serverSource.indexOf('app.post("/api/admin/proof-review/action"');
  assert.ok(handlerStart >= 0, 'approve handler not found');
  const handlerEnd = serverSource.indexOf('app.post(', handlerStart + 1);
  assert.ok(handlerEnd > handlerStart, 'approve handler end not found');
  const handlerSource = serverSource.slice(handlerStart, handlerEnd);
  assert.doesNotMatch(handlerSource, CALENDAR_SEASON_REFS);
  // The handler still runs the auto-populate hook on approve.
  assert.match(handlerSource, /addApprovedEntryToWeeklyDraftBallots\(result\.entryId\)/);
});

test('approve path: the auto-populate hook keys off the current week cycle, not the calendar season', () => {
  const hookStart = serverSource.indexOf('const addApprovedEntryToWeeklyDraftBallots');
  assert.ok(hookStart >= 0, 'auto-populate hook not found');
  const hookEnd = serverSource.indexOf('const runCanonicalWeeklyFinalize', hookStart);
  assert.ok(hookEnd > hookStart, 'auto-populate hook end not found');
  const hookSource = serverSource.slice(hookStart, hookEnd);
  assert.doesNotMatch(hookSource, CALENDAR_SEASON_REFS);
  // The cycle is the current one at review time — it keeps running
  // across season boundaries, so a late review still populates.
  assert.match(hookSource, /const cycle = getServerCycle\(seasonId, now\)/);
  // The only date gate is the week's Saturday ballot lock, not a season.
  assert.match(hookSource, /now\.getTime\(\) >= cycle\.ballotLocksAt\.getTime\(\)/);
});

test('approve path: ballot eligibility keys off approvedAt vs the week window, never the calendar season', () => {
  const weeklyVotingSource = readFileSync('src/logic/weeklyVoting.ts', 'utf8');
  assert.doesNotMatch(weeklyVotingSource, CALENDAR_SEASON_REFS);
  assert.match(weeklyVotingSource, /approved_after_submission_window/);
  assert.match(weeklyVotingSource, /approved_after_ballot_lock/);
});
