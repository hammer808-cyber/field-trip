# Zine scenes — design (Option A + season-end opening)

Zach picked A (Nov 21, 2026, 2:37 PM PST): scenes live inside the zine
book. And the gate (same message): the zine stays locked until the end
of a season — every season gets a zine, opening at season end, made
with whatever decks you did in that season.

## What exists (audit, Nov 21, 2026)
- Zine system: auto-generated seasonal edition (`ZineEdition`, pages
  with roles like cover / season_opener / weekly_highlight / closing,
  `ZineLayoutId` = cover_full_bleed / single_receipt / split_receipts /
  timeline_strip / sticker_sheet / quote_page / closing_card).
  Server generates a draft from eligible proofs; the workspace
  (`ZineWorkspace.tsx`) curates it: nominate proofs, reorder pages,
  pick a cover, change a page's layout, place unlocked stickers
  (`ZineStickerLayer` + picker, x/y/rotation/scale, cap 12/page).
- All zine writes go through server endpoints (`/api/zines/...` in
  `server.ts`); PATCH page accepts proofIds (max 2, must be eligible
  candidates), layoutId, title, caption, stickers.
- `ZINES_ENABLED = false` (`canonicalProgress.ts:25`) — parked,
  admins pass the StarterGate.
- Seasons: `src/data/seasons.ts` is the authority (meteorological
  seasons + events; Gobble & Glow Nov 1–Jan 11). The zine's `seasonId`
  comes from `appConfig.game.activeSeasonId` (currently
  `gobble-and-glow`).
- Missing for scenes: no style/theme layer; mission cards and field
  notes are not pasteable items (notes only ride inside proof
  snapshots); no scene page type; no season-end gate.

## The model
- **Scene page:** new `ZinePageRole` `'scene'`, new `ZineLayoutId`
  `'scene'`. A scene page carries `sceneStyleId` (fixed at creation)
  + `sceneItems`. It is an optional page (`isOptional: true`,
  reorderable by the existing endpoint).
- **Styles** (`ZineSceneStyleId`): `vintage_nostalgia` (Vintage
  Nostalgia), `punk_gritty` (Punk / Gritty Zine), `playful_colorful`
  (Playful & Colorful Collage), `mixed_media` (Mixed-Media Art
  Journal) — the four looks from Zach's image.
- **Slots:** each style defines fixed slots (`{ id, kind, x, y, w, h,
  rotation }`, percentages of the page). One item per slot; the layout
  is set, the user picks what goes in each slot. Slot kinds:
  `mission` | `proof` | `note`.
  - vintage_nostalgia: photo ×2, note ×1, mission ×1.
  - punk_gritty: photo ×1 (large), note ×2, mission ×1.
  - playful_colorful: photo ×2, mission ×1, note ×1.
  - mixed_media: photo ×1, mission ×1, note ×1.
  Each style also has one **sticker zone** (a dashed rect); stickers
  keep using the page's existing `stickers` placements. Zones are
  visual guides in v1 — placement anywhere on the page is still
  allowed (existing behavior); zone enforcement is deferred, not
  silent.
- **Scene items** (`ZineSceneItem`): `{ slotId, kind, ... }`.
  - mission: `{ deckId, missionId }` — rendered from the challenge
    bank. Pickable missions are the season's candidate proofs'
    missions: the decks the user actually played that season.
  - proof: `{ entryId }` — pick from the season's candidates
    (proof snapshots); renders the photo + title.
  - note: `{ text, sourceEntryId?: string | null }` — write your own
    (280 chars) or use a candidate proof's field note.
- **One scene per style per zine** (max 4). "Add scene" offers the
  four styles; used ones are disabled. Scenes do not count against
  `MAX_OPTIONAL_ZINE_PAGES` (2).

## Season-end gating
- A season's zine opens when that season's window ends. The server
  resolves the window from `seasons.ts` (EVENTS by id, then SEASONS
  by id; an unknown id fails open so a misconfigured id never bricks
  the feature). `isZineSeasonEnded(seasonId, now)` is the single
  helper, used server-side.
- **Enforcement (server):** every mutating zine endpoint (generate,
  PATCH page, add scene, add optional, reorder, cover, nominate,
  ready, finalize) rejects non-admin edits on a not-ended season
  with 403 `ZINE_SEASON_LOCKED`. GET endpoints stay open.
- **Client:** `ZINES_ENABLED` flips to `true` — the feature is live;
  the lock lives in the workspace, not the gate. `/api/zines/current`
  gains `season: { seasonId, ended, opensAt }` and `isAdmin`. The
  workspace shows the open zine's editor, plus a locked card for a
  season still running ("Fall zine opens Dec 1, 2026"). Admins see
  an "Admin preview" banner and can edit early (same passthrough as
  the old gate); the preview is how the editor gets verified live
  before Jan 11.
- **Archive (so "every season" is real):** `/api/zines/current`
  also returns `pastZines` (the user's personal + crew zines for
  ended seasons, most recent first, limit 4: `{ zineId, seasonId,
  status, updatedAt }`). The workspace lists them as season cards;
  tapping one loads it via the existing GET endpoint. Without this,
  a zine would strand the moment the next season starts.
- `zineVotingComingSoon.test.ts` gets updated: the zine assertions
  change from "parked behind the kill switch" to the new gate (the
  file name stays; voting assertions untouched).

## Server changes
- `POST /api/zines/:zineId/pages/scene { styleId }`: edit + season
  checks; creates the scene page; 400 `SCENE_STYLE_TAKEN` if the
  style is already used, 400 `SCENE_LIMIT` past 4. Audit log.
- `PATCH /api/zines/:zineId/pages/:pageId` extended: accepts
  `sceneItems` (validated: slotId exists in the style's slots, kind
  matches the slot kind, proof refs are eligible candidates, mission
  refs resolve in the banks, note text ≤ 280 chars). `allowedLayouts`
  gains `'scene'`. Style is immutable after creation.
- `/api/zines/current` extended as above (`season`, `isAdmin`,
  `pastZines`).

## Client changes
- `src/types/zine.ts`: role `'scene'`, layoutId `'scene'`,
  `sceneStyleId`, `sceneItems`, `ZineSceneStyleId`, `ZineSceneItem`.
- `src/logic/zineScenes.ts` (new, pure): `ZINE_SCENE_STYLES` (four
  styles with slots + sticker zones + palette var names),
  `getZineSceneStyle`, `createScenePage`, `validateSceneItems`,
  `getSceneSlotFill`.
- `src/services/zineService.ts`: `addScenePage(zineId, styleId)`;
  `updateZinePage` accepts `sceneItems`.
- `src/components/zine/ZineSceneEditor.tsx` (new): style header,
  slots as tap targets, pickers (mission / proof / note), swap and
  remove, save via `updateZinePage`.
- `src/components/zine/ZineScenePage.tsx` (new): renders a scene
  page — style background + slotted items + `ZineStickerLayer`.
- `ZineWorkspace.tsx`: "Add scene" (four-style picker), scene pages
  render via `ZineScenePage`, locked card + past-season cards.
- **Style palettes:** new `--scene-<style>-*` custom properties in
  `src/index.css` (the token file); components reference vars only,
  no hex. The token-hex snapshot is regenerated deliberately
  (`node scripts/generate-token-hex-snapshot.mjs`) and the diff
  reviewed — the sanctioned path for new colours.

## Not in scope
- Print/export of scenes beyond the workspace's existing Print /
  Save PDF (scenes print with the book).
- Sharing a scene to the community feed.
- Sticker-zone enforcement; changing a scene's style after creation;
  free placement inside slots (slots are fixed; only stickers
  free-place).
- A full archive page (the past-season cards row is the v1 archive).

## Verification
- tsc clean; full suite back to the 3 known failures; production
  build.
- Curl deploy check (new route 401 unauthenticated; live chunks
  carry the scene strings).
- Read-only browser live check as ELONDRA (admin): workspace loads,
  locked card shows the Gobble & Glow opening date, "Add scene"
  affordance present; NO scene page is created by the check (that
  writes to his live zine — his tap to try it, or a season end,
  is the end-to-end proof).
