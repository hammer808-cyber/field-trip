# FIELDTRIP — Sticker System Stage 0 Snapshot

- **Date:** 2026-11-15
- **Repo:** `~/workspace/field-trip`, branch `main`
- **Purpose:** Baseline for the Stage 2 store consolidation, so the migration can be verified against pre-migration counts. Stage 0 is safety only: no behavior change.

## What was NOT captured (honest gaps)

**Live earned counts were not captured in this session.** There is no admin
credential available to this agent: no Firebase service-account / application
default credentials on the machine, no admin login session, and no browser
session. Nothing was written to production Firestore, and no live read was
attempted without credentials. **Capture the live counts before Stage 2
starts** — see "How to capture" below.

**The Firestore emulator could not run in this session.** No Java is
installed, there is no cached emulator, and the `apt-get install
openjdk-17-jre-headless` attempt stalled on an interactive confirmation
prompt that cannot be approved from this session (the install was killed).
Consequence: `src/__tests__/stickerRules.integration.test.ts` was **not
run**. The legacy-spoof rejection case was added to that file as a **skipped**
test (see the `STAGE 0` comment in the file): it asserts the fixed behavior,
so it fails against the current rules and must stay skipped until Stage 2
closes the hole. Run the full emulator suite before Stage 2 touches
`firestore.rules`.

## Structural baseline (verified from code, Nov 15)

- Catalog: **42 stickers** in `src/data/stickers.ts` — common 15, uncommon 11,
  rare 13, legendary 3. Rarity is still 4-level at this stage; the collapse
  to 3 levels (uncommon folds into common) is a later stage and was NOT done.
- Canonical store: `users/{uid}/stickers/{stickerId}` subcollection, written
  by the transactional `unlockStickersForUser` (`src/services/stickerService.ts:405`).
- Legacy store (kept by Zach's decision — page-visit stickers stay earnable
  as exploration rewards): `users/{uid}` fields `unlockedRewards.stickers`,
  `earnedStickers[]`, `discoveryEvents{}`, `stickerUnlockHistory[]`,
  `completedDiscoveryGroups`.
- Rules whitelist: 42 sticker IDs, 14 triggers (`firestore.rules:350-460`).
- Dead triggers with zero call sites (unchanged in Stages 0–1):
  `weekly_winner`, `challenge_approved`, `archetype_milestone`,
  `season_milestone`, `admin_grant` — 9 stickers, including 2 of 3 legendaries.
- UI: StickerMachine mounted at `/dex/stickers` (Stage 1); StickerBook still
  unmounted; no store consolidation, no rules change, no collections field,
  no import of the 25 new PNGs, no celebration change.

## How to capture the live counts (before Stage 2)

Run as an admin (Firebase console, Admin SDK, or the admin diagnostics
endpoint) against database `ai-studio-6bdf91b5-28e9-46f3-ae49-89cf99e2d88a`,
project `field-trip-495823`. Counts only — no user PII beyond totals.

1. Users with at least one canonical unlock:
   collectionGroup `stickers` under `users`, count distinct parent `uid`s,
   and total docs.
2. Per-sticker canonical counts: group the same collectionGroup by
   `stickerId` (42 IDs).
3. Legacy counts: for every `users/{uid}` doc, count
   `unlockedRewards.stickers.length`, `earnedStickers.length`, and the keys
   of `discoveryEvents` (per-key totals, to size the page-visit set).
4. Overlap: users present in both stores, and sticker IDs present in legacy
   but not canonical (these are the migration's true scope).
5. Record the numbers in this file under a "Live counts" section with the
   capture date, then Stage 2's migration can assert: post-migration
   canonical total == pre-migration canonical total + legacy-only awards,
   with zero duplicates.

## Stage 0 verification actually run (Nov 15)

- `npx tsx --test` stickerAwards + stickerMachine + zineStickers +
  dexDeckShelf: **18/18 pass** (the Firestore "permission-denied /
  idle stream" lines in that output are non-fatal client-SDK noise from
  the test env, not failures).
- `NODE_OPTIONS=--max-old-space-size=4096 npx tsc --noEmit`: clean, exit 0.
- `npm run build`: passes. Fresh bundle `dist/assets/index-D9rG5aDH.js`;
  Collection chunk `dist/assets/Collection-C04qUJS7.js` contains the
  StickerMachine code ("Sticker Machine", "Prize counter", "Earned " date
  label). Local `vite preview` served the index shell (HTTP 200) referencing
  the new bundle hash.
- Rules integration test: **not run** (no emulator — see above).
- Live rendered check of `/dex/stickers` in a signed-in browser session:
  **not done in this session** (no browser/login available to this agent);
  needs a live check that the Stickers tab renders locked/earned states,
  progress N/42, featured max-3, and earned dates.
