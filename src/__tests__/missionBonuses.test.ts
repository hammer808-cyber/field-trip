import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildAfternoonPowerHourEligibility,
  getLocalTimeSnapshot,
  isMissionAvailableForRandomBonus,
  selectRandomBonusMissionIds,
} from '../logic/missionBonuses';
import { DEFAULT_MISSION_SCORING_CONFIG } from '../logic/missionScoring';

const zone = 'America/Los_Angeles';

test('Afternoon Power Hour uses inclusive noon and exclusive 3 PM boundaries', () => {
  const cases = [
    ['2026-07-15T18:59:59.000Z', false, '11:59 AM'],
    ['2026-07-15T19:00:00.000Z', true, '12:00 PM'],
    ['2026-07-15T21:59:59.000Z', true, '2:59 PM'],
    ['2026-07-15T22:00:00.000Z', false, '3:00 PM'],
  ] as const;

  for (const [iso, expected, label] of cases) {
    const eligibility = buildAfternoonPowerHourEligibility(
      new Date(iso),
      zone,
      DEFAULT_MISSION_SCORING_CONFIG,
    );
    assert.equal(eligibility.eligible, expected, label);
  }
});

test('stored IANA timezone handles standard and daylight-saving offsets', () => {
  const winter = getLocalTimeSnapshot(new Date('2026-01-15T20:00:00.000Z'), zone);
  const summer = getLocalTimeSnapshot(new Date('2026-07-15T19:00:00.000Z'), zone);
  assert.equal(winter.hour, 12);
  assert.equal(summer.hour, 12);
  assert.equal(winter.timezone, zone);
  assert.equal(summer.timezone, zone);
});

test('weekly random rotation selects exactly three stable unique available missions', () => {
  const missions = [
    { id: 'mission-a', status: 'active' },
    { id: 'mission-b', status: 'active' },
    { id: 'mission-c', status: 'active' },
    { id: 'mission-d', status: 'active' },
    { id: 'mission-e', status: 'active' },
    { id: 'starter-1', status: 'active' },
    { id: 'mission-disabled', disabled: true },
    { id: 'mission-hidden', hidden: true },
    { id: 'mission-archived', status: 'archived' },
  ];
  const first = selectRandomBonusMissionIds(missions, 'mission-bonus_2026-W29');
  const reload = selectRandomBonusMissionIds([...missions].reverse(), 'mission-bonus_2026-W29');
  assert.equal(first.length, 3);
  assert.equal(new Set(first).size, 3);
  assert.deepEqual(reload, first);
  assert.equal(first.some(id => id.startsWith('starter-')), false);
  assert.equal(first.some(id => id.includes('disabled') || id.includes('hidden') || id.includes('archived')), false);
});

test('mission availability rejects non-playable assignment candidates', () => {
  assert.equal(isMissionAvailableForRandomBonus({ id: 'active-mission', status: 'active' }), true);
  assert.equal(isMissionAvailableForRandomBonus({ id: 'starter-2', status: 'active' }), false);
  assert.equal(isMissionAvailableForRandomBonus({ id: 'training-card', deckId: 'starter-signals' }), false);
  assert.equal(isMissionAvailableForRandomBonus({ id: 'legacy-starter', countsTowardStarter: true }), false);
  assert.equal(isMissionAvailableForRandomBonus({ id: 'draft-mission', status: 'draft' }), false);
  assert.equal(isMissionAvailableForRandomBonus({ id: 'private-mission', visibility: 'admin_only' }), false);
  assert.equal(isMissionAvailableForRandomBonus({ id: 'expired-mission', expired: true }), false);
});

test('rotation fails closed when fewer than three eligible missions exist', () => {
  assert.throws(
    () => selectRandomBonusMissionIds([{ id: 'one' }, { id: 'two' }], 'mission-bonus_2026-W29'),
    /BONUS_ROTATION_REQUIRES_3_AVAILABLE_MISSIONS/,
  );
});
