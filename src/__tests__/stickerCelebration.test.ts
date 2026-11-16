import assert from 'node:assert/strict';
import test from 'node:test';
import { RewardIntensity } from '../types/feedback';
import {
  celebrationIntensityForRarity,
  celebrationPersistentKey,
  filterNewStickerDocs,
  normalizeLegacyRarity,
  sessionLimitKey,
  unseenLegendaryCatchUpDocs,
  type WatcherStickerDoc,
} from '../logic/stickerCelebration';

function doc(
  overrides: Partial<WatcherStickerDoc> & { stickerId: string },
): WatcherStickerDoc {
  return { seen: false, unlockedAtMs: null, ...overrides };
}

test('celebrationIntensityForRarity maps the 3-level scale', () => {
  assert.equal(celebrationIntensityForRarity('legendary'), RewardIntensity.MAJOR_REVEAL);
  assert.equal(celebrationIntensityForRarity('rare'), RewardIntensity.MEDIUM_REWARD);
  assert.equal(celebrationIntensityForRarity('common'), RewardIntensity.MICRO_FEEDBACK);
});

test('celebrationIntensityForRarity normalizes legacy rarities', () => {
  // uncommon folds into common (the Nov 15 collapse); secret tiers fold into rare.
  assert.equal(celebrationIntensityForRarity('uncommon'), RewardIntensity.MICRO_FEEDBACK);
  assert.equal(celebrationIntensityForRarity('secret'), RewardIntensity.MEDIUM_REWARD);
  assert.equal(celebrationIntensityForRarity('bureau-secret'), RewardIntensity.MEDIUM_REWARD);
});

test('normalizeLegacyRarity collapses the 4-level scale onto 3 levels', () => {
  assert.equal(normalizeLegacyRarity('common'), 'common');
  assert.equal(normalizeLegacyRarity('uncommon'), 'common');
  assert.equal(normalizeLegacyRarity('rare'), 'rare');
  assert.equal(normalizeLegacyRarity('secret'), 'rare');
  assert.equal(normalizeLegacyRarity('bureau-secret'), 'rare');
});

test('celebrationPersistentKey is namespaced per user and sticker', () => {
  assert.equal(
    celebrationPersistentKey('user-1', 'mascota_victory_flag'),
    'sticker-celebration:user-1:mascota_victory_flag',
  );
  assert.notEqual(
    celebrationPersistentKey('user-1', 'mascota_victory_flag'),
    celebrationPersistentKey('user-2', 'mascota_victory_flag'),
  );
  assert.notEqual(
    celebrationPersistentKey('user-1', 'mascota_victory_flag'),
    celebrationPersistentKey('user-1', 'mascota_confetti_burst'),
  );
});

test('sessionLimitKey separates distinct stickers but keeps the type default', () => {
  assert.equal(sessionLimitKey('sticker', 'mascota_victory_flag'), 'sticker:mascota_victory_flag');
  assert.notEqual(
    sessionLimitKey('sticker', 'mascota_victory_flag'),
    sessionLimitKey('sticker', 'elondra_arrival_pose'),
  );
  // Non-sticker rewards carry no sticker id, so the key stays the bare type.
  assert.equal(sessionLimitKey('badge'), 'badge');
  assert.equal(sessionLimitKey('badge', undefined), 'badge');
});

test('filterNewStickerDocs returns only docs added after the baseline, in unlock order', () => {
  const baseline = new Set(['a', 'b']);
  const current = [
    doc({ stickerId: 'a', unlockedAtMs: 100 }),
    doc({ stickerId: 'c', unlockedAtMs: 300 }),
    doc({ stickerId: 'b', unlockedAtMs: 200 }),
    doc({ stickerId: 'd', unlockedAtMs: 250 }),
    doc({ stickerId: 'e', unlockedAtMs: null }),
  ];
  assert.deepEqual(
    filterNewStickerDocs(baseline, current).map((d) => d.stickerId),
    ['d', 'c', 'e'],
  );
});

test('filterNewStickerDocs returns nothing when nothing is new', () => {
  const baseline = new Set(['a', 'b']);
  assert.deepEqual(filterNewStickerDocs(baseline, [doc({ stickerId: 'a' }), doc({ stickerId: 'b' })]), []);
  assert.deepEqual(filterNewStickerDocs(new Set(), []), []);
});

test('unseenLegendaryCatchUpDocs catches up only unseen legendaries', () => {
  const rarityOf = (id: string) => {
    if (id === 'mascota_victory_flag' || id === 'elondra_arrival_pose') return 'legendary' as const;
    if (id === 'mascota_confetti_burst') return 'rare' as const;
    if (id === 'captain_clipboard_checklist_badge') return 'common' as const;
    return undefined;
  };
  const docs = [
    doc({ stickerId: 'mascota_victory_flag', seen: false, unlockedAtMs: 200 }),
    doc({ stickerId: 'elondra_arrival_pose', seen: false, unlockedAtMs: 100 }),
    doc({ stickerId: 'mascota_confetti_burst', seen: false, unlockedAtMs: 50 }),
    doc({ stickerId: 'captain_clipboard_checklist_badge', seen: false, unlockedAtMs: 10 }),
    // Seen legendary: already viewed in the Dex, no catch-up.
    doc({ stickerId: 'captain_clipboard_whistle_lanyard', seen: true, unlockedAtMs: 5 }),
    // Unknown id: registry lookup fails, skipped defensively.
    doc({ stickerId: 'not_a_sticker', seen: false, unlockedAtMs: 1 }),
  ];
  assert.deepEqual(
    unseenLegendaryCatchUpDocs(docs, rarityOf).map((d) => d.stickerId),
    ['elondra_arrival_pose', 'mascota_victory_flag'],
  );
});

test('unseenLegendaryCatchUpDocs returns nothing when there is nothing to catch up', () => {
  const rarityOf = (id: string) => (id === 'x' ? ('common' as const) : undefined);
  assert.deepEqual(unseenLegendaryCatchUpDocs([doc({ stickerId: 'x' })], rarityOf), []);
  assert.deepEqual(unseenLegendaryCatchUpDocs([], rarityOf), []);
});
