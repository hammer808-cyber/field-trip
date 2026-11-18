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
  { id: 'first_offenses_scene_starter', name: 'Scene Starter', file: '02_scene_starter.png', rarity: 'common', displayOrder: 14, trigger: 'admin_grant', wired: false },
  { id: 'first_offenses_the_instigator', name: 'The Instigator', file: '03_the_instigator.png', rarity: 'common', displayOrder: 15, trigger: 'admin_grant', wired: false },
  { id: 'first_offenses_democracy_is_messy', name: 'Democracy Is Messy', file: '04_democracy_is_messy.png', rarity: 'common', displayOrder: 16, trigger: 'weekly_vote_cast', wired: true },
  { id: 'first_offenses_accomplice', name: 'Accomplice', file: '05_accomplice.png', rarity: 'common', displayOrder: 17, trigger: 'crew_joined', wired: true },
  { id: 'first_offenses_outside_person', name: 'Outside Person', file: '06_outside_person.png', rarity: 'common', displayOrder: 18, trigger: 'admin_grant', wired: false },
  { id: 'first_offenses_repeat_offender', name: 'Repeat Offender', file: '07_repeat_offender.png', rarity: 'rare', displayOrder: 19, trigger: 'mission_count_milestone', wired: true },
  { id: 'first_offenses_level_up', name: 'Level Up', file: '08_level_up.png', rarity: 'common', displayOrder: 20, trigger: 'level_up', wired: true },
  { id: 'first_offenses_certified_menace', name: 'Certified Menace', file: '09_certified_menace.png', rarity: 'rare', displayOrder: 21, trigger: 'admin_grant', wired: false }
];

test('first offenses: all nine are registered as cross-pack Achievement stickers', () => {
  const all = getAllStickers();
  assert.equal(all.length, 52);
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

  // Display order is unique inside Achievement (existing 1–12, these 13–21).
  const achievement = getStickersByCollection('achievement');
  assert.equal(achievement.length, 21);
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

test('first offenses: the four trigger-pending stickers are admin_grant and marked', () => {
  const pending = FIRST_OFFENSES.filter(entry => !entry.wired);
  assert.deepEqual(
    pending.map(entry => entry.id),
    [
      'first_offenses_scene_starter',
      'first_offenses_the_instigator',
      'first_offenses_outside_person',
      'first_offenses_certified_menace'
    ]
  );
  for (const entry of pending) {
    const sticker = getStickerById(entry.id)!;
    assert.equal(sticker.awardTrigger, 'admin_grant');
    assert.ok(sticker.tags.includes('trigger-pending'), `${entry.id} must carry the trigger-pending tag`);
  }
  // The wired five never carry the pending tag.
  for (const entry of FIRST_OFFENSES.filter(entry => entry.wired)) {
    assert.ok(!getStickerById(entry.id)!.tags.includes('trigger-pending'));
  }
});

test('first offenses: wired triggers resolve through the evaluator, including cross-pack', () => {
  // Fresh Meat rides first_submission for every archetype.
  for (const archetype of ['captainClipboard', 'elondra', 'bigfoot'] as const) {
    const resolved = resolveEventStickers('first_submission', archetype);
    assert.ok(resolved.some(sticker => sticker.id === 'first_offenses_fresh_meat'));
  }
  // Democracy rides the weekly vote; Accomplice rides crew joins.
  assert.ok(resolveEventStickers('weekly_vote_cast', 'mascota').some(s => s.id === 'first_offenses_democracy_is_messy'));
  assert.ok(resolveEventStickers('crew_joined', null).some(s => s.id === 'first_offenses_accomplice'));
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
  const feedback = fs.readFileSync('src/components/PlayerLevelUpFeedback.tsx', 'utf8');
  assert.match(feedback, /evaluateStickerTriggers/);
  assert.match(feedback, /type: 'level_up'/);
  assert.match(feedback, /runStickerAwardNonBlocking\('level_up'/);
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
