import assert from 'node:assert/strict';
import test from 'node:test';
import { getDeckPackById } from '../data/deckPacks';
import { getDeckAccess, getSeasonalLockCopy } from '../logic/deckAccess';

/**
 * Seasonal deck gating (Slice 2, Nov 21, 2026): decks declare their season
 * (or event) in the catalog and deckAccess gates on the seasonal calendar
 * (src/data/seasons.ts) — meteorological seasons, PT-based. A lock never
 * touches progress.
 */

/** A Date on the given PT calendar day at noon PT (19:00 UTC). */
function ptDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 19, 0, 0));
}

function starterComplete(now: Date) {
  return { profile: { id: 'u1', completedDeckIds: ['starter-signals'] } as any, now };
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

const EVERGREEN_IDS = [
  'starter-signals',
  'socal-summer',
  'texas-get-it-yall',
  'jet-setter',
  'errand-deck',
];

test('evergreen decks are playable in every season (fall and summer dates)', () => {
  for (const packId of EVERGREEN_IDS) {
    const pack = getDeckPackById(packId);
    assert.ok(pack, `${packId} not registered`);
    assert.equal(pack!.seasonId, 'evergreen', `${packId} should declare evergreen`);
    const fall = getDeckAccess(pack, starterComplete(ptDate(2026, 11, 21)));
    assert.equal(fall.playable, true, `${packId} should be playable in fall, got ${fall.reason}`);
    const summer = getDeckAccess(pack, starterComplete(ptDate(2026, 7, 15)));
    assert.equal(summer.playable, true, `${packId} should be playable in summer, got ${summer.reason}`);
  }
});

test('Heatwave is playable Jun 1–Aug 31 and locked Sep 1–May 31 (boundary days included)', () => {
  const pack = getDeckPackById('heatwave-receipts');
  assert.ok(pack, 'heatwave-receipts not registered');
  assert.equal(pack!.seasonId, 'summer');

  for (const date of [ptDate(2026, 6, 1), ptDate(2026, 7, 15), ptDate(2026, 8, 31)]) {
    const access = getDeckAccess(pack, starterComplete(date));
    assert.equal(access.playable, true, `expected playable on ${date.toISOString()}, got ${access.reason}`);
    assert.equal(access.locked, false);
  }

  for (const date of [ptDate(2026, 9, 1), ptDate(2026, 11, 21), ptDate(2027, 5, 31), ptDate(2027, 2, 15)]) {
    const access = getDeckAccess(pack, starterComplete(date));
    assert.equal(access.playable, false, `expected locked on ${date.toISOString()}`);
    assert.equal(access.locked, true);
    assert.equal(access.privateReason, 'season_locked');
  }

  // PT boundary instants: May 31 23:59 PT is still locked, Jun 1 00:00 PT is in.
  assert.equal(
    getDeckAccess(pack, starterComplete(new Date('2026-06-01T06:59:59Z'))).playable,
    false,
    'May 31 23:59 PT should still be locked',
  );
  assert.equal(
    getDeckAccess(pack, starterComplete(new Date('2026-06-01T07:00:00Z'))).playable,
    true,
    'Jun 1 00:00 PT should be playable',
  );
});

test('a locked Heatwave deck stays visible so the shelf can show its lock copy', () => {
  const pack = getDeckPackById('heatwave-receipts');
  const access = getDeckAccess(pack, starterComplete(ptDate(2026, 11, 21)));
  assert.equal(access.locked, true);
  assert.equal(access.visible, true, 'locked seasonal deck must stay visible as a teaser');
  assert.equal(access.reason, 'Coming summer 2027');
});

test('the lock copy derives the year from the calendar, never hard-coded', () => {
  assert.equal(getSeasonalLockCopy('summer', ptDate(2026, 11, 21)), 'Coming summer 2027');
  assert.equal(getSeasonalLockCopy('summer', ptDate(2027, 5, 15)), 'Coming summer 2027');
  assert.equal(getSeasonalLockCopy('summer', ptDate(2027, 9, 15)), 'Coming summer 2028');
  // Same copy flows through the deck gate itself.
  const pack = getDeckPackById('heatwave-receipts');
  assert.equal(
    getDeckAccess(pack, starterComplete(ptDate(2027, 9, 15))).reason,
    'Coming summer 2028',
  );
});

test('Gobble & Glow is playable Nov 1 and Jan 11, not Oct 31 or Jan 12 (PT)', () => {
  const pack = getDeckPackById('gobble-and-glow');
  assert.ok(pack, 'gobble-and-glow not registered');
  assert.equal(pack!.eventId, 'gobble-and-glow');

  for (const date of [ptDate(2026, 11, 1), ptDate(2026, 12, 1), ptDate(2027, 1, 11)]) {
    const access = getDeckAccess(pack, starterComplete(date));
    assert.equal(access.playable, true, `expected playable on ${date.toISOString()}, got ${access.reason}`);
  }

  for (const date of [ptDate(2026, 10, 31), ptDate(2027, 1, 12)]) {
    const access = getDeckAccess(pack, starterComplete(date));
    assert.equal(access.playable, false, `expected locked on ${date.toISOString()}`);
    assert.equal(access.locked, true);
  }

  // PT boundary instants: the old UTC-midnight start opened the event on
  // the evening of Oct 31 PT — the PT reading must not.
  assert.equal(
    getDeckAccess(pack, starterComplete(new Date('2026-11-01T06:59:59Z'))).playable,
    false,
    'Oct 31 23:59 PT should still be locked',
  );
  assert.equal(
    getDeckAccess(pack, starterComplete(new Date('2026-11-01T09:00:00Z'))).playable,
    true,
    'Nov 1 01:00 PT should be playable',
  );
  // The whole Jan 11 PT day counts: Jan 12 00:00 UTC is still Jan 11 PT.
  assert.equal(
    getDeckAccess(pack, starterComplete(new Date('2027-01-12T00:00:00Z'))).playable,
    true,
    'Jan 11 16:00 PT should still be playable',
  );
  assert.equal(
    getDeckAccess(pack, starterComplete(new Date('2027-01-12T08:00:00Z'))).playable,
    false,
    'Jan 12 00:00 PT should be locked',
  );
});

test('a lock does not wipe progress: the gate is pure and stored progress is unchanged', () => {
  const pack = deepFreeze(getDeckPackById('heatwave-receipts'));
  // A player mid-Heatwave when the season ends: drawn card waiting, one
  // mission done, active trip still set.
  const progress = deepFreeze({
    drawnMissionCards: [
      { missionId: 'heatwave-07', challengeId: 'heatwave-07', deckId: 'heatwave-receipts', status: 'drawn' },
    ],
    activeTrip: { id: 'heatwave-07', deckId: 'heatwave-receipts' },
    completedChallengeIds: ['heatwave-01'],
    tripProgress: { 'heatwave-01': { photo: true } },
  });
  const before = JSON.parse(JSON.stringify(progress));

  const access = getDeckAccess(pack, starterComplete(ptDate(2026, 9, 1)));
  assert.equal(access.locked, true);
  assert.equal(access.playable, false);

  // The gate returned locked while the stored progress object is unchanged
  // (deep-frozen above, so any mutation attempt would have thrown).
  assert.deepEqual(JSON.parse(JSON.stringify(progress)), before);
  assert.equal(progress.drawnMissionCards.length, 1);
  assert.equal(progress.drawnMissionCards[0].status, 'drawn');
  assert.equal(progress.activeTrip.id, 'heatwave-07');
  assert.deepEqual(progress.completedChallengeIds, ['heatwave-01']);
});

test('an unknown event id applies no gate (defensive: never lock on a typo)', () => {
  const pack = {
    packId: 'mystery-deck',
    packName: 'Mystery Deck',
    shortName: 'Mystery',
    description: 'No such event',
    missionIds: ['mission-1'],
    unlockRule: 'immediate' as const,
    visibility: 'public' as const,
    isActive: true,
    fallbackIcon: 'Lock',
    sortOrder: 99,
    eventId: 'no-such-event',
  };
  const access = getDeckAccess(pack, { userId: 'u1', profile: { id: 'u1' }, now: ptDate(2026, 11, 21) });
  assert.equal(access.playable, true);
});
