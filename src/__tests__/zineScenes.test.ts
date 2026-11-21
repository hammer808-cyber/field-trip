import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  createScenePage,
  getZineSeasonState,
  getZineSceneStyle,
  MAX_SCENES_PER_ZINE,
  normalizeSceneItems,
  validateSceneItems,
  ZINE_SCENE_STYLES,
} from '../logic/zineScenes';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

// Nov 21, 2026, noon PT — fall is running, Gobble & Glow is running.
const NOV_21_2026 = new Date('2026-11-21T20:00:00Z');

test('zine scenes: four styles, each with slots, a sticker zone, and var-only palette', () => {
  assert.equal(ZINE_SCENE_STYLES.length, 4);
  assert.deepEqual(
    ZINE_SCENE_STYLES.map(style => style.id),
    ['vintage_nostalgia', 'punk_gritty', 'playful_colorful', 'mixed_media']
  );
  for (const style of ZINE_SCENE_STYLES) {
    assert.ok(style.slots.length >= 3, `${style.id} needs at least 3 slots`);
    for (const slot of style.slots) {
      assert.ok(['mission', 'proof', 'note'].includes(slot.kind), `${style.id}/${slot.id} kind`);
      assert.ok(slot.x >= 0 && slot.y >= 0 && slot.x + slot.w <= 100 && slot.y + slot.h <= 100, `${style.id}/${slot.id} inside the page`);
    }
    assert.ok(style.stickerZone.w > 0 && style.stickerZone.h > 0, `${style.id} sticker zone`);
    for (const value of Object.values(style.palette)) {
      assert.match(value, /^var\(--scene-[a-z0-9-]+\)$/, `${style.id} palette is var-only`);
      assert.doesNotMatch(value, /#/);
    }
  }
  assert.equal(MAX_SCENES_PER_ZINE, 4);
});

test('zine scenes: createScenePage builds a scene page; unknown style throws', () => {
  const page = createScenePage('punk_gritty', 'page_scene_punk_gritty', 3);
  assert.equal(page.role, 'scene');
  assert.equal(page.layoutId, 'scene');
  assert.equal(page.sceneStyleId, 'punk_gritty');
  assert.deepEqual(page.sceneItems, []);
  assert.equal(page.isOptional, true);
  assert.equal(page.id, 'page_scene_punk_gritty');
  assert.equal(page.order, 3);
  assert.throws(() => createScenePage('nope' as any, 'x', 0), /INVALID_SCENE_STYLE/);
  assert.equal(getZineSceneStyle('nope'), null);
});

test('zine scenes: validateSceneItems catches shape errors', () => {
  const valid = [
    { slotId: 'photo-1', kind: 'proof', proofEntryId: 'entry_1' },
    { slotId: 'mission-1', kind: 'mission', deckId: 'texas-get-it-yall', missionId: 'texas-08' },
    { slotId: 'note-1', kind: 'note', noteText: 'A night at the market.' },
  ];
  assert.deepEqual(validateSceneItems('vintage_nostalgia', valid), []);
  assert.deepEqual(validateSceneItems('nope', valid), ['INVALID_SCENE_STYLE']);
  assert.ok(validateSceneItems('vintage_nostalgia', [{ slotId: 'photo-9', kind: 'proof', proofEntryId: 'e' }]).some(e => e.startsWith('UNKNOWN_SLOT')));
  assert.ok(validateSceneItems('vintage_nostalgia', [{ slotId: 'photo-1', kind: 'mission', deckId: 'd', missionId: 'm' }]).some(e => e.startsWith('KIND_MISMATCH')));
  assert.ok(validateSceneItems('vintage_nostalgia', [
    { slotId: 'photo-1', kind: 'proof', proofEntryId: 'a' },
    { slotId: 'photo-1', kind: 'proof', proofEntryId: 'b' },
  ]).some(e => e.startsWith('DUPLICATE_SLOT')));
  assert.ok(validateSceneItems('vintage_nostalgia', [{ slotId: 'note-1', kind: 'note', noteText: 'x'.repeat(281) }]).some(e => e.startsWith('NOTE_TOO_LONG')));
  assert.ok(validateSceneItems('vintage_nostalgia', [{ slotId: 'note-1', kind: 'note', noteText: '   ' }]).some(e => e.startsWith('MISSING_NOTE')));
  assert.ok(validateSceneItems('vintage_nostalgia', [{ slotId: 'mission-1', kind: 'mission' }]).some(e => e.startsWith('MISSING_MISSION')));
  assert.deepEqual(normalizeSceneItems('vintage_nostalgia', [{ slotId: 'photo-1', kind: 'proof', proofEntryId: 'e', imageUrl: 'https://x/y.png' }]), [
    { slotId: 'photo-1', kind: 'proof', proofEntryId: 'e' },
  ]);
});

test('zine season state: running seasons are locked until the morning after the last day', () => {
  const fall = getZineSeasonState('fall', NOV_21_2026);
  assert.equal(fall.ended, false);
  assert.ok(fall.opensAt?.startsWith('2026-12-01'), `fall opens Dec 1, got ${fall.opensAt}`);

  const gobble = getZineSeasonState('gobble-and-glow', NOV_21_2026);
  assert.equal(gobble.ended, false);
  assert.ok(gobble.opensAt?.startsWith('2027-01-12'), `gobble opens Jan 12, got ${gobble.opensAt}`);
});

test('zine season state: ended seasons are open; unknown ids fail open', () => {
  const summer = getZineSeasonState('summer', NOV_21_2026);
  assert.equal(summer.ended, true);
  assert.ok(summer.opensAt?.startsWith('2026-09-01'), `summer opened Sep 1, got ${summer.opensAt}`);

  const gobbleAfter = getZineSeasonState('gobble-and-glow', new Date('2027-02-15T20:00:00Z'));
  assert.equal(gobbleAfter.ended, true);
  assert.ok(gobbleAfter.opensAt?.startsWith('2027-01-12'), `gobble opened Jan 12, got ${gobbleAfter.opensAt}`);

  const winterAfter = getZineSeasonState('winter', new Date('2027-03-05T20:00:00Z'));
  assert.equal(winterAfter.ended, true);
  assert.ok(winterAfter.opensAt?.startsWith('2027-03-01'), `winter opened Mar 1, got ${winterAfter.opensAt}`);

  const unknown = getZineSeasonState('not-a-season', NOV_21_2026);
  assert.equal(unknown.ended, true);
  assert.equal(unknown.opensAt, null);
});

test('zine season state: leap-year winter ends Feb 29', () => {
  // Jan 15, 2028 — inside winter 2027-28, which ends Feb 29, 2028.
  const winter = getZineSeasonState('winter', new Date('2028-01-15T20:00:00Z'));
  assert.equal(winter.ended, false);
  assert.ok(winter.opensAt?.startsWith('2028-03-01'), `leap winter opens Mar 1, got ${winter.opensAt}`);
});

test('zine scenes: server wires the scene endpoint, the PATCH extension, and the season guard', () => {
  const server = read('server.ts');
  assert.match(server, /app\.post\('\/api\/zines\/:zineId\/pages\/scene'/);
  assert.match(server, /createScenePage\(styleId as any, pageId/);
  assert.match(server, /SCENE_STYLE_TAKEN/);
  assert.match(server, /SCENE_LIMIT/);
  assert.match(server, /req\.body\.sceneItems !== undefined/);
  assert.match(server, /validateSceneItems\(String\(\(pageBefore as any\)\.sceneStyleId\)/);
  assert.match(server, /ZINE_MISSION_NOT_ELIGIBLE/);
  // The shared edit choke point enforces the season lock for every
  // mutating endpoint (generate, PATCH, reorder, optional, cover, ready).
  assert.match(server, /if \(!isAdmin && !getZineSeasonState\(String\(zine\.seasonId \|\| ''\)\)\.ended\) \{\s*throw new Error\('ZINE_SEASON_LOCKED'\);/);
  assert.match(server, /ZINE_SEASON_LOCKED/);
  // /current reports the season state, the admin preview flag, and the archive.
  assert.match(server, /const seasonState = getZineSeasonState\(seasonId\);/);
  assert.match(server, /season: seasonState,/);
  assert.match(server, /isAdmin: admin,/);
  assert.match(server, /pastZines,/);
  assert.match(server, /const loadPastZines = async/);
});

test('zine scenes: client service, editor, and workspace wiring', () => {
  const service = read('src/services/zineService.ts');
  assert.match(service, /export async function addScenePage\(zineId: string, styleId: ZineSceneStyleId\)/);
  assert.match(service, /sceneItems\?: ZineSceneItem\[\]/);

  const workspace = read('src/components/ZineWorkspace.tsx');
  assert.match(workspace, /Add Scene/);
  assert.match(workspace, /availableSceneStyles/);
  assert.match(workspace, /Past seasons/);
  assert.match(workspace, /ZineSceneEditor/);
  assert.match(workspace, /ZineScenePage/);
  assert.match(workspace, /page\.role === 'scene'/);

  const editor = read('src/components/zine/ZineSceneEditor.tsx');
  assert.match(editor, /Or use a proof's note/);
  assert.match(editor, /Save scene/);
  const page = read('src/components/zine/ZineScenePage.tsx');
  assert.match(page, /Sticker zone/);
  assert.match(page, /getZineSceneStyle\(page\.sceneStyleId\)/);

  const types = read('src/types/zine.ts');
  assert.match(types, /'scene'/);
  assert.match(types, /ZineSceneStyleId/);
  assert.match(types, /sceneItems\?: ZineSceneItem\[\]/);
  assert.match(types, /pastZines: ZinePastSeason\[\]/);
});
