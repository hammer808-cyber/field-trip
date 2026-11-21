import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  getAllStickers,
  getStickerById,
  getStickersByCollection,
  getStickersByTrigger,
  type StickerDefinition
} from '../data/stickers';
import { MISSION_COUNT_MILESTONE_THRESHOLDS, resolveEventStickers } from '../logic/stickerEvaluator';
import { VOTING_ENABLED } from '../services/canonicalProgress';

/**
 * FIRST OFFENSES — starter achievement series (Nov 17, 2026). 9 of 12
 * stickers land here; the remaining 3 arrive separately and must NOT be
 * generated as replacements.
 */
const FIRST_OFFENSES: ReadonlyArray<{
  id: string;
  name: string;
  file: string;
  rarity: 'common' | 'rare';
  displayOrder: number;
  trigger: string;
  wired: boolean;
}> = [
  { id: 'first_offenses_fresh_meat', name: 'Fresh Meat', file: '01_fresh_meat.png', rarity: 'common', displayOrder: 13, trigger: 'first_submission', wired: true },
  { id: 'first_offenses_scene_starter', name: 'Scene Starter', file: '02_scene_starter.png', rarity: 'common', displayOrder: 14, trigger: 'first_draw', wired: true },
  { id: 'first_offenses_the_instigator', name: 'The Instigator', file: '03_the_instigator.png', rarity: 'common', displayOrder: 15, trigger: 'crew_created', wired: true },
  { id: 'first_offenses_democracy_is_messy', name: 'Democracy Is Messy', file: '04_democracy_is_messy.png', rarity: 'common', displayOrder: 16, trigger: 'weekly_vote_cast', wired: true },
  { id: 'first_offenses_accomplice', name: 'Accomplice', file: '05_accomplice.png', rarity: 'common', displayOrder: 17, trigger: 'crew_survived_week', wired: true },
  { id: 'first_offenses_outside_person', name: 'Outside Person', file: '06_outside_person.png', rarity: 'common', displayOrder: 18, trigger: 'location_verified', wired: true },
  { id: 'first_offenses_repeat_offender', name: 'Repeat Offender', file: '07_repeat_offender.png', rarity: 'rare', displayOrder: 19, trigger: 'mission_count_milestone', wired: true },
  { id: 'first_offenses_level_up', name: 'Level Up', file: '08_level_up.png', rarity: 'common', displayOrder: 20, trigger: 'level_up', wired: true },
  // Certified Menace stays admin_grant, but its earning IS defined now
  // (earn-audit fix #3 remainder, Nov 20, 2026 — Zach's call, Q5): it
  // fires automatically the first time any Chaos sticker is granted.
  // So `wired: true` — the trigger-pending tag is gone (see below).
  { id: 'first_offenses_certified_menace', name: 'Certified Menace', file: '09_certified_menace.png', rarity: 'rare', displayOrder: 21, trigger: 'admin_grant', wired: true }
];

test('first offenses: all nine are registered as cross-pack Achievement stickers', () => {
  const all = getAllStickers();
  assert.equal(all.length, 118);
  const ids = new Set(all.map(sticker => sticker.id));
  assert.equal(ids.size, all.length, 'sticker ids must be unique');

  const series = all.filter(sticker => sticker.tags.includes('first-offenses'));
  assert.equal(series.length, 9, 'the series is 9 of its 12 total — the last 3 arrive separately');

  for (const expected of FIRST_OFFENSES) {
    const sticker: StickerDefinition | undefined = getStickerById(expected.id);
    assert.ok(sticker, `${expected.id} is registered`);
    assert.equal(sticker.name, expected.name);
    assert.equal(sticker.collection, 'achievement');
    assert.equal(sticker.archetype, undefined, `${expected.id} is cross-pack (no archetype)`);
    assert.equal(sticker.rarity, expected.rarity);
    assert.equal(sticker.displayOrder, expected.displayOrder);
    assert.equal(sticker.awardTrigger, expected.trigger);
    assert.equal(sticker.imageUrl, `/assets/stickers/achievement/${expected.file}`);
    assert.ok(sticker.unlockReason.length > 0, `${expected.id} needs how-to-earn copy`);
    assert.ok(sticker.tags.includes('first-offenses'));
  }

  // Display order is unique inside Achievement (existing 1–12, these 13–21,
  // plus the four Nov 20 milestone variants at 22–25, plus the three Nov 20
  // challenge-approved variants at 26–28).
  const achievement = getStickersByCollection('achievement');
  assert.equal(achievement.length, 28);
  const orders = achievement.map(sticker => sticker.displayOrder);
  assert.equal(new Set(orders).size, orders.length);
});

test('first offenses: every catalog image resolves to a real supplied PNG', () => {
  for (const expected of FIRST_OFFENSES) {
    const filePath = path.join('public', 'assets', 'stickers', 'achievement', expected.file);
    assert.ok(fs.existsSync(filePath), `${expected.id} image missing: ${filePath}`);
    assert.ok(fs.statSync(filePath).size > 0, `${expected.id} image is empty`);
  }
});

test('first offenses: no trigger-pending stickers remain in the series', () => {
  // Earn-audit fix #3 remainder (Nov 20, 2026 — Zach's red pen, Q1–Q11):
  // the four pending stickers all got definitions, so the pending list
  // is empty. Certified Menace is the only one whose trigger stays
  // admin_grant — and its earning is defined anyway (first Chaos grant).
  const pending = FIRST_OFFENSES.filter(entry => !entry.wired);
  assert.deepEqual(pending.map(entry => entry.id), []);
  for (const entry of FIRST_OFFENSES) {
    assert.ok(!getStickerById(entry.id)!.tags.includes('trigger-pending'), `${entry.id} must not carry the trigger-pending tag`);
  }
});

test('first offenses: wired triggers resolve through the evaluator, including cross-pack', () => {
  // Fresh Meat rides first_submission for every archetype.
  for (const archetype of ['captainClipboard', 'elondra', 'bigfoot'] as const) {
    const resolved = resolveEventStickers('first_submission', archetype);
    assert.ok(resolved.some(sticker => sticker.id === 'first_offenses_fresh_meat'));
  }
  // Democracy rides the weekly vote; Scene Starter rides the first draw;
  // The Instigator rides crew creation; Outside Person rides a
  // location-verified approval; Accomplice rides the crew surviving a
  // week — NOT the join (earn-audit fix #3 remainder, Nov 20, 2026).
  assert.ok(resolveEventStickers('weekly_vote_cast', 'mascota').some(s => s.id === 'first_offenses_democracy_is_messy'));
  assert.ok(resolveEventStickers('first_draw', null).some(s => s.id === 'first_offenses_scene_starter'));
  assert.ok(resolveEventStickers('crew_created', null).some(s => s.id === 'first_offenses_the_instigator'));
  assert.ok(resolveEventStickers('location_verified', null).some(s => s.id === 'first_offenses_outside_person'));
  assert.ok(!resolveEventStickers('crew_joined', null).some(s => s.id === 'first_offenses_accomplice'));
  assert.ok(resolveEventStickers('crew_survived_week', null).some(s => s.id === 'first_offenses_accomplice'));
  // Level Up is a cross-pack event trigger: any archetype, even none.
  assert.deepEqual(
    resolveEventStickers('level_up', null).map(s => s.id),
    ['first_offenses_level_up']
  );
  // Repeat Offender is the mission-count sticker; 3 is a threshold.
  assert.ok(MISSION_COUNT_MILESTONE_THRESHOLDS.includes(3));
  assert.deepEqual(
    getStickersByTrigger('mission_count_milestone').map(s => s.id),
    ['first_offenses_repeat_offender']
  );
});

test('first offenses: the level_up trigger is wired at the level-up observation point', () => {
  // Option B (Nov 20, 2026): the observation point posts a level_up event
  // to POST /api/stickers/evaluate; the server runs the evaluator and
  // writes the award + notification. No client-side unlock remains here.
  const feedback = fs.readFileSync('src/components/PlayerLevelUpFeedback.tsx', 'utf8');
  assert.match(feedback, /requestStickerEvaluation/);
  assert.match(feedback, /eventType: 'level_up'/);
  assert.match(feedback, /eventId: levelUpEvent\.id/);
  assert.doesNotMatch(feedback, /evaluateStickerTriggers/);
  assert.doesNotMatch(feedback, /unlockStickersForUser/);
});

test('first offenses: firestore.rules whitelists the nine ids and the two repaired triggers', () => {
  const rules = fs.readFileSync('firestore.rules', 'utf8');
  for (const entry of FIRST_OFFENSES) {
    assert.ok(rules.includes(`'${entry.id}'`), `rules must whitelist ${entry.id}`);
  }
  // mission_count_milestone was missing from the rules trigger list even
  // though the evaluator already used it — a client award with that
  // trigger would have failed validation. level_up is new with this batch.
  assert.ok(rules.includes("'mission_count_milestone'"));
  assert.ok(rules.includes("'level_up'"));
});

test('first offenses: democracy is messy cannot fire while voting is parked', () => {
  // Tripwire: VOTING_ENABLED is false (Nov 17, 2026), so no weekly vote
  // can be cast and the weekly_vote_cast event cannot fire. When voting
  // unparks, this test fails on purpose — the sticker becomes earnable.
  assert.equal(VOTING_ENABLED, false);
  assert.equal(getStickerById('first_offenses_democracy_is_messy')?.awardTrigger, 'weekly_vote_cast');
});
