import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getCurrentSeason,
  getDaysRemainingInSeason,
  getNextSeason,
  getNextSeasonStart,
  getPtDateParts,
  getSeasonForDate,
  isEventActive,
} from '../data/seasons';

/**
 * A Date on the given PT calendar day at noon PT (19:00 UTC), so the PT
 * date is unambiguous regardless of DST.
 */
function ptDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 19, 0, 0));
}

function seasonId(date: Date): string {
  return getSeasonForDate(date).id;
}

test('spring boundaries: Mar 1–May 31 in season, neighbours out', () => {
  assert.equal(seasonId(ptDate(2027, 2, 28)), 'winter');
  assert.equal(seasonId(ptDate(2027, 3, 1)), 'spring');
  assert.equal(seasonId(ptDate(2027, 5, 31)), 'spring');
  assert.equal(seasonId(ptDate(2027, 6, 1)), 'summer');
});

test('summer boundaries: Jun 1–Aug 31 in season, neighbours out', () => {
  assert.equal(seasonId(ptDate(2027, 5, 31)), 'spring');
  assert.equal(seasonId(ptDate(2027, 6, 1)), 'summer');
  assert.equal(seasonId(ptDate(2027, 8, 31)), 'summer');
  assert.equal(seasonId(ptDate(2027, 9, 1)), 'fall');
});

test('fall boundaries: Sep 1–Nov 30 in season, neighbours out', () => {
  assert.equal(seasonId(ptDate(2027, 8, 31)), 'summer');
  assert.equal(seasonId(ptDate(2027, 9, 1)), 'fall');
  assert.equal(seasonId(ptDate(2027, 11, 30)), 'fall');
  assert.equal(seasonId(ptDate(2027, 12, 1)), 'winter');
});

test('winter spans the year boundary: Dec 31 and Jan 15 are both winter', () => {
  assert.equal(seasonId(ptDate(2026, 11, 30)), 'fall');
  assert.equal(seasonId(ptDate(2026, 12, 1)), 'winter');
  assert.equal(seasonId(ptDate(2026, 12, 31)), 'winter');
  assert.equal(seasonId(ptDate(2027, 1, 1)), 'winter');
  assert.equal(seasonId(ptDate(2027, 1, 15)), 'winter');
  assert.equal(seasonId(ptDate(2027, 2, 28)), 'winter');
  assert.equal(seasonId(ptDate(2027, 3, 1)), 'spring');
});

test('winter end is leap-year aware: Feb 29 exists in leap years only', () => {
  // 2028 is a leap year: Feb 29 is still winter.
  assert.equal(seasonId(ptDate(2028, 2, 28)), 'winter');
  assert.equal(seasonId(ptDate(2028, 2, 29)), 'winter');
  assert.equal(seasonId(ptDate(2028, 3, 1)), 'spring');
  // 2027 is not a leap year: Feb 28 is the last winter day.
  assert.equal(seasonId(ptDate(2027, 2, 28)), 'winter');
  assert.equal(seasonId(ptDate(2027, 3, 1)), 'spring');
});

test('season boundaries resolve in PT, not UTC (midnight PT is still the new day)', () => {
  // Jun 1 00:30 PT is summer; May 31 23:30 PT is still spring, even though
  // both instants are Jun 1 in UTC.
  assert.equal(seasonId(new Date('2027-06-01T07:30:00Z')), 'summer');
  assert.equal(seasonId(new Date('2027-06-01T06:30:00Z')), 'spring');
});

test('getCurrentSeason / getNextSeason across boundaries', () => {
  assert.equal(getCurrentSeason(ptDate(2026, 11, 30)).id, 'fall');
  assert.equal(getNextSeason(ptDate(2026, 11, 30)).id, 'winter');
  assert.equal(getCurrentSeason(ptDate(2026, 12, 1)).id, 'winter');
  assert.equal(getNextSeason(ptDate(2026, 12, 1)).id, 'spring');
  assert.equal(getNextSeason(ptDate(2027, 5, 31)).id, 'summer');
  assert.equal(getNextSeason(ptDate(2027, 8, 31)).id, 'fall');
  assert.equal(getNextSeason(ptDate(2027, 1, 15)).id, 'spring');
});

test('getDaysRemainingInSeason counts whole days after today', () => {
  assert.equal(getDaysRemainingInSeason(ptDate(2027, 8, 31)), 0);
  assert.equal(getDaysRemainingInSeason(ptDate(2027, 8, 30)), 1);
  assert.equal(getDaysRemainingInSeason(ptDate(2027, 6, 1)), 91);
  // Winter: last day is Feb 28 in a non-leap year, Feb 29 in a leap year.
  assert.equal(getDaysRemainingInSeason(ptDate(2027, 2, 28)), 0);
  assert.equal(getDaysRemainingInSeason(ptDate(2028, 2, 28)), 1);
  assert.equal(getDaysRemainingInSeason(ptDate(2028, 2, 29)), 0);
});

test('getNextSeasonStart derives the year from the calendar', () => {
  // From a fall date, the next summer start is the following calendar year.
  assert.deepEqual(getPtDateParts(getNextSeasonStart('summer', ptDate(2026, 10, 15))), {
    year: 2027,
    month: 6,
    day: 1,
  });
  // From a May date, the next summer start is the same year.
  assert.deepEqual(getPtDateParts(getNextSeasonStart('summer', ptDate(2027, 5, 15))), {
    year: 2027,
    month: 6,
    day: 1,
  });
  // On the season's start day itself, "next" means next year's start.
  assert.deepEqual(getPtDateParts(getNextSeasonStart('summer', ptDate(2027, 6, 1))), {
    year: 2028,
    month: 6,
    day: 1,
  });
  // Winter start is Dec 1: from mid-winter the next one is next December.
  assert.deepEqual(getPtDateParts(getNextSeasonStart('winter', ptDate(2027, 1, 15))), {
    year: 2027,
    month: 12,
    day: 1,
  });
  assert.deepEqual(getPtDateParts(getNextSeasonStart('winter', ptDate(2026, 12, 20))), {
    year: 2027,
    month: 12,
    day: 1,
  });
  // Spring from a February date is the same year's Mar 1.
  assert.deepEqual(getPtDateParts(getNextSeasonStart('spring', ptDate(2027, 2, 10))), {
    year: 2027,
    month: 3,
    day: 1,
  });
});

test('Gobble & Glow event: active on its boundary dates, inactive outside', () => {
  assert.equal(isEventActive('gobble-and-glow', ptDate(2026, 10, 31)), false);
  assert.equal(isEventActive('gobble-and-glow', ptDate(2026, 11, 1)), true);
  assert.equal(isEventActive('gobble-and-glow', ptDate(2026, 12, 25)), true);
  assert.equal(isEventActive('gobble-and-glow', ptDate(2027, 1, 11)), true);
  assert.equal(isEventActive('gobble-and-glow', ptDate(2027, 1, 12)), false);
});

test('Gobble & Glow boundaries resolve in PT, not UTC', () => {
  // Nov 1 00:30 PT is active; Oct 31 23:30 PT is not, though both are
  // Nov 1 in UTC.
  assert.equal(isEventActive('gobble-and-glow', new Date('2026-11-01T08:30:00Z')), true);
  assert.equal(isEventActive('gobble-and-glow', new Date('2026-11-01T06:30:00Z')), false);
  // Jan 11 23:30 PT is still active; Jan 12 00:30 PT is not.
  assert.equal(isEventActive('gobble-and-glow', new Date('2027-01-12T07:30:00Z')), true);
  assert.equal(isEventActive('gobble-and-glow', new Date('2027-01-12T08:30:00Z')), false);
});

test('unknown event ids are never active', () => {
  assert.equal(isEventActive('not-a-real-event', ptDate(2026, 12, 25)), false);
});
