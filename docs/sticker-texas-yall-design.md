# Texas Y'all Sticker Pack — Design

Status: **APPROVED Nov 20, 2026 — build in progress.** Zach's answers to the three blocking
questions: (1) mapping is my call — building the §3.4 table as proposed (8 mission pairs +
first Texas approval + deck completion; 3rd/5th milestones and deck social deferred);
(2) trim approved — crop anything that needs cropping so it doesn't look weird (remove
neighboring-sheet slivers only, never touch the sticker art itself); (3) build the nested
version — Dex → Collections → Deck Collections → Texas Y'all grouping in the Dex UI.
All other decisions as recommended in §5 (flat-shelf recommendation superseded by (3);
rarities 6/3/1; deckId mechanism; no secrets; rules deploy from his Mac after the build;
live Firestore check during the live check).

## 1. What this pack is

A 10-sticker deck-specific pack for the Texas Y'all mission deck, built on the existing
centralized sticker system (canonical catalog, idempotent unlock transaction, Stage 5
celebrations, admin grants). No new reward engine. The pack also establishes the reusable
pattern for future deck packs (see §7).

## 2. Grounding facts (audited Nov 20, 2026, main @ 785d595)

### 2.1 The deck

| Field | Value |
|---|---|
| Deck doc / pack id | `texas-get-it-yall` |
| Deck code | `FT-06` |
| Title | Get It, Y'all |
| Short name | Texas |
| Status | `regional`, active, evergreen (no season window) |
| Unlock | starter-complete (3 starter approvals) |
| Total cards | 15 |

Missions (`src/data/texasChallengeBank.ts`), all `lane: "seasonal"`, `proofType: ["photo"]`,
each carrying `deckId: "texas-get-it-yall"`:

| # | Mission id | Title | Difficulty |
|---|---|---|---|
| 1 | `texas-01` | Lone Star Sky | easy |
| 2 | `texas-02` | Taco Truck Stop | easy |
| 3 | `texas-03` | Boots on the Ground | easy |
| 4 | `texas-04` | Bluebonnet Patch | easy |
| 5 | `texas-05` | Y'all Means All | easy |
| 6 | `texas-06` | Brisket Smoke | easy |
| 7 | `texas-07` | Two-Step Floor | medium |
| 8 | `texas-08` | Longhorn Lookout | medium |
| 9 | `texas-09` | Whataburger Run | easy |
| 10 | `texas-10` | Lone Star Flag | easy |
| 11 | `texas-11` | Swimming Hole | medium |
| 12 | `texas-12` | Friday Night Lights | hard |
| 13 | `texas-13` | Big Bend Blues | hard |
| 14 | `texas-14` | Kolache Run | easy |
| 15 | `texas-15` | Don't Mess With Texas | easy |

Missions carry no archetype. Cards set neither `cardType` nor `category`, so at submission
they default to `'Signal'`. There is no separate "challenge" entity: the 15 missions ARE the
deck's challenges, so "completing a qualifying deck challenge" collapses to completing a
specific mission.

### 2.2 The sticker system today

- Catalog: **108** stickers in `src/data/stickers.ts` (`STICKER_DEFINITIONS`). Collections:
  explorer 39, achievement 28, adventure 15, side_quests 11, chaos 11, social 4,
  limited_edition 0. Rarity: exactly 3 values, 72 common / 33 rare / 3 legendary.
- Entry shape: `id`, `name`, `archetype?`, `collection` (exactly one of 7),
  `imageUrl` (must start `/assets/stickers/`, real file under `public/`, enforced by test),
  `rarity`, `awardTrigger` (17 values), `unlockReason`, `tags`, `displayOrder?` (unique
  within a collection, enforced by test), `secret?`, `availableFrom?`, `availableUntil?`
  (last three defined but unused; no UI consumes `secret` today). **No `deckId` field.**
- Triggers (17): `starter_pack, first_submission, first_approval, field_note_added,
  photo_proof_added, challenge_approved, weekly_vote_cast, weekly_winner, crew_joined,
  crew_created, zine_page_added, archetype_milestone, season_milestone,
  mission_count_milestone, level_up, repair_approved, admin_grant`.
- **No per-deck trigger exists.** `challenge_approved` fires on any non-starter approval
  (archetype-resolved); `archetype_milestone` is a global count (≥5, catch-up);
  `mission_count_milestone` is a global count [3, 5, 10]; `season_milestone` fires on ANY
  full non-starter deck completion and awards every sticker carrying that trigger.
  Registering Texas stickers under any existing trigger without deck scoping would award
  them for every other deck too. This is the one missing piece: deck-scoped evaluation.
- Deck completion detection already exists: `getCompletedNonStarterDecks`
  (`src/logic/stickerEvaluator.ts:272-295`) via `getDeckProgress`
  (`src/services/canonicalProgress.ts:418-451`), counting
  `approvedCompletedChallengeIds ∩ pack.missionIds`. Per-deck approved counts already
  exist in the progress snapshot (`deckProgressById`), so no new data is needed.
  Counting is over distinct mission ids, so repeats never inflate counts, and
  pending/rejected/needs-more-proof never count as approved (they live in separate sets).
- Award path: `evaluateStickerTriggers` / `evaluateAdminApprovalStickers`
  (`src/logic/stickerEvaluator.ts`) → `unlockStickersForUser`
  (`src/services/stickerService.ts:317-403`), an idempotent client-side Firestore
  transaction into `users/{uid}/stickers/{stickerId}`. Re-award returns `already_unlocked`.
  Approval call sites: `proofService.ts:655-656`, `submissionService.ts:790-791`.
- Rules: `firestore.rules` whitelists exactly the 108 catalog IDs and the 17 triggers
  (verified by script, 0 drift). Adding 10 stickers means 10 new IDs in
  `isKnownStickerId()`. Rules deploy is Zach's manual step from his Mac
  (`npx firebase deploy --only firestore:rules`); recent commits note rules changes are
  "repo only — needs a publish" until he deploys.
- Tests pin the catalog: `stickerCollections.test.ts` pins total 108, per-collection counts,
  rarity counts, unique displayOrder, every imageUrl resolving to a real file. Nine-plus
  test files hardcode `108`; the pack pattern (Chaos, Captain Clipboard) is 10 catalog
  entries + 10 rules IDs + a per-pack test pinning ids/imageUrls/rarities/rules whitelist.
- Dex UI: `/dex/stickers` renders `StickerMachine`, which iterates `COLLECTION_SHELF_ORDER`
  with live earned/total per shelf, locked art grayscale + blur + lock icon, detail modal
  with `unlockReason` and "Earned <date>". **There is no "Deck Collections" grouping and
  no nested shelf level.** The decks tab is the mission-deck shelf, not a sticker grouping.
- Celebration (Stage 5): nothing keys off collection. A new legendary automatically gets
  the full-screen modal (plus while-away catch-up). New commons/rares get toasts. No
  celebration changes needed. (One stale comment: `unseenLegendaryCatchUpDocs` says "at
  most 3 can ever match (only 3 legendaries exist)" — becomes 4 if Texas adds one.)
- Social: no social activity today is natively deck-scoped. Crews are global (no `deckId`).
  Votes/reactions are only deck-derivable by joining through `entryId`, and reactions have
  no trigger at all. Comments do not exist; shares write no record. The only deck-scoped
  social signal in existing data is "submitted an approved Texas proof as a crew member"
  (entry `deckId` + `crewContext`).

### 2.3 The supplied art (verified Nov 20)

ZIP `fieldtrip_texas_yall_10_transparent_pngs_71_sgor.zip`: all 10 files present, filenames
exactly as specified, 208-375 KB each, all RGBA with real transparency (alpha 0-255 on
every file), dimensions 335-610 px wide.

**Flag — edge bleed:** all 10 files have opaque pixels touching the frame border. Visual
check of 2 files confirms neighboring-sheet art bleeding in at the edges (a stray longhorn
horn intrudes on the right edge of `01_texas_yall_sign.png`; the sign post is cut off at
the bottom; `09_armadillo_after_hours.png` has a cream strip and a partial dark shape from
adjacent stickers at the top and left edges). Same class of issue as the Chaos pack's 4
trim-review files, but here it affects the set. Per the no-modify instruction, nothing was
trimmed. Decision needed (§5, decision 6): trim pass vs ship as-is.

## 3. Proposed design

### 3.1 Collection

New collection value `texas_yall` ("Texas Y'all") added to `StickerCollection`,
`COLLECTION_META`, and `COLLECTION_SHELF_ORDER`. The shelf then renders automatically in
the Dex stickers tab with live progress (e.g. 3/10), locked states, and the detail modal.
No UI code change.

On the requested path `Dex → Collections → Deck Collections → Texas Y'all`: that nested
grouping does not exist. The flat shelf is the natural integration (the existing structure
is flat shelves; the Dex opens on the stickers tab). A nested "Deck Collections" level is
new UI work and is deferred unless Zach wants it (decision 1).

### 3.2 Assets

Import the 10 PNGs unchanged into `public/assets/stickers/texas_yall/`, keeping filenames.
`imageUrl` per sticker: `/assets/stickers/texas_yall/<filename>`.

### 3.3 Deck-scoped evaluation (the one new mechanism)

Add optional `deckId?` to `StickerDefinition`. Extend the evaluator with deck-scoped rules
that reuse the existing trigger values (no new trigger strings, so the rules trigger list
is untouched — only the 10 new IDs join the whitelist):

- A definition with `deckId` only matches when the triggering event's mission/deck is that
  deck. For approval events, the deck comes from the approved entry's `deckId`
  (`getEntryMissionId` / entry `deckId` already available in the evaluator).
- Deck-count rules read `deckProgressById[deckId].approvedCount` from the existing snapshot
  (thresholds 1 / 3 / 5 / 15 as needed), with the same catch-up semantics as
  `archetype_milestone` (fire at >= threshold when not yet earned).
- Deck-set rule reuses `getCompletedNonStarterDecks` but filtered to the sticker's `deckId`,
  so a Texas completion sticker fires only for Texas completion (today `season_milestone`
  fires for any deck).

This is the reusable deck-pack pattern: any future deck pack is 10 catalog entries with
`deckId` set, plus rules IDs and a pack test. No per-pack evaluator code.

### 3.4 Proposed mapping (all 10 — for red pen)

Rarity split: **6 common / 3 rare / 1 legendary**. The legendary is deck completion only.
(Correction Nov 20, build: the design originally summarized this as 7/2/1, but the
§3.4 table itself is 6/3/1 — rares are 02, 04, and 09. The table governs; the
build implements the table exactly.)

| ID | Name | Rarity | Unlock condition (verified event) | Trigger + deck scope |
|---|---|---|---|---|
| `texas_yall_01` | Texas Y'all | common | First approved Texas Y'all proof | `first_approval`, deck `texas-get-it-yall` |
| `texas_yall_02` | Big Mood Longhorn | rare | Approve `texas-08` Longhorn Lookout | `challenge_approved`, deck-scoped, mission `texas-08` |
| `texas_yall_03` | These Boots | common | Approve `texas-03` Boots on the Ground | `challenge_approved`, deck-scoped, mission `texas-03` |
| `texas_yall_04` | Prickly Personality | rare | Approve `texas-13` Big Bend Blues | `challenge_approved`, deck-scoped, mission `texas-13` |
| `texas_yall_05` | Lone Star State | common | Approve `texas-10` Lone Star Flag | `challenge_approved`, deck-scoped, mission `texas-10` |
| `texas_yall_06` | Texas Gold | legendary | Complete the Texas Y'all deck (15/15 approved) | deck-set rule, deck `texas-get-it-yall` |
| `texas_yall_07` | Smoke Show | common | Approve `texas-06` Brisket Smoke | `challenge_approved`, deck-scoped, mission `texas-06` |
| `texas_yall_08` | Taco Detour | common | Approve `texas-02` Taco Truck Stop | `challenge_approved`, deck-scoped, mission `texas-02` |
| `texas_yall_09` | Armadillo After Hours | rare | Approve `texas-12` Friday Night Lights | `challenge_approved`, deck-scoped, mission `texas-12` |
| `texas_yall_10` | Lone Star Refreshment | common | Approve `texas-11` Swimming Hole | `challenge_approved`, deck-scoped, mission `texas-11` |

Draft descriptions (one line each, red-pen welcome):
- 01 Texas Y'all: "You showed up. Texas said y'all come back now."
- 02 Big Mood Longhorn: "Spotted the big mood himself, horns and all."
- 03 These Boots: "Made for walking Texas ground."
- 04 Prickly Personality: "Big Bend tough. Prickly, but make it charming."
- 05 Lone Star State: "One star, flown right."
- 06 Texas Gold: "All fifteen. The whole deck, struck gold."
- 07 Smoke Show: "Brisket smoke, certified show-stealer."
- 08 Taco Detour: "Every great Texas trip takes a taco detour."
- 09 Armadillo After Hours: "Friday night lights, armadillo approved."
- 10 Lone Star Refreshment: "Cooled off Texas-style."

Missions with no sticker in this mapping: `texas-01` Lone Star Sky, `texas-05` Y'all Means
All, `texas-07` Two-Step Floor, `texas-09` Whataburger Run, `texas-14` Kolache Run,
`texas-15` Don't Mess With Texas. (A second Texas pack could cover them; `texas-05` is
the obvious alternate home for 01 if 01 becomes the social sticker instead — see §4.)

Secret flags: none. Every unlock reason visible, so players can see what to do. (The
`secret` field exists in the type but no UI consumes it today.)

## 4. Gaps vs the suggested reward structure

| Suggested condition | Status in this design |
|---|---|
| First approved Texas proof | Covered (01). |
| Three approved Texas proofs | **Not covered.** Needs only the deck-count rule (threshold 3) — cheap once §3.3 exists. No sticker assigned; swap candidate is 10 (re-scope from Swimming Hole) or 04. |
| Five approved Texas proofs | **Not covered.** Same as above (threshold 5). Swap candidate is 10 or 04. |
| Completing specific Texas missions | Covered (02, 03, 04, 05, 07, 08, 09, 10 — eight missions). |
| Completing a qualifying deck challenge | Collapses to specific missions — no separate challenge entity exists. The two hard missions (`texas-12`, `texas-13`) are both in the set. |
| Deck-related social activity | **Not supported as-is.** No deck-scoped social trigger exists. Closest existing-data option is "approved Texas proof submitted as a crew member" (entry `deckId` + `crewContext`) — new evaluator logic, and a judgment call whether that is the right social condition. Swap candidate is 01 (the sign reads "Y'all Means All" — the togetherness sticker). |
| Completing the Texas Y'all deck | Covered (06, legendary). |

Count check: the suggested structure names 7 conditions, but 8 mission pairs + milestones +
completion + social = 13 candidate conditions for 10 stickers. Something has to give;
the mapping above prioritizes mission pairs (8) + first approval + completion. Decisions
2-4 below are where Zach picks the trade.

## 5. Decisions needed (all 9, approve as recommended or red-pen)

1. **Collection placement:** flat Texas Y'all shelf in the Dex stickers tab (renders
   automatically, zero UI change) vs nested "Deck Collections → Texas Y'all" grouping
   (new UI work). Recommended: flat shelf now; nested grouping later if more deck packs
   land and the shelf list gets long.
2. **Mapping:** approve the §3.4 table as-is, or red-pen any row. The open calls inside it:
   04 = Big Bend Blues vs Bluebonnet Patch (`texas-04`); 09 = Friday Night Lights vs the
   social slot; 10 = Swimming Hole vs Whataburger Run (`texas-09`); 01 = first approval
   vs the `texas-05` Y'all Means All mission.
3. **3rd / 5th Texas-approval milestones:** defer (current proposal) or swap in, and if so
   which stickers give up their mission pairs.
4. **Deck social sticker:** defer (current proposal) or scope 01 to crew-context Texas
   approval (new evaluator logic) and move first-approval elsewhere.
5. **Rarities:** 6 common / 3 rare / 1 legendary as proposed (corrected from 7/2/1 — the table is 6/3/1), or re-balance.
6. **Edge bleed:** trim pass on the 10 PNGs before import (recommended — the stray horn
   and cut sign post will be visible in the Dex at card size) vs ship as-is. A trim only
   touches transparent padding / neighboring-art slivers, not the sticker art itself.
7. **Evaluator mechanism:** `deckId` on the definition + deck-scoped rules reusing existing
   trigger values (recommended — no rules trigger-list change, reusable for future packs).
8. **Rules deploy:** Zach deploys from his Mac after the build
   (`npx firebase deploy --only firestore:rules`); until then the 10 new IDs are repo-only
   and live awards of them would fail rules validation.
9. **Live Firestore check:** the deck doc `decks/texas-get-it-yall` and published Texas
   cards are unverified from the repo (code only proves the id convention). Check live
   before the live test, or accept code-level verification and verify during the live check.

## 6. Build plan (after approval)

Status: **BUILT Nov 20, 2026 — uncommitted, awaiting independent verification.**
No commit, no deploy, no rules publish (Zach deploys rules from his Mac).

1. Import 10 PNGs to `public/assets/stickers/texas_yall/` (after decision 6). DONE
   earlier (trim per §9); files untouched by this build.
2. `src/data/stickers.ts`: add `deckId?` to `StickerDefinition`; add `texas_yall` to
   `StickerCollection`, `COLLECTION_META`, `COLLECTION_SHELF_ORDER`; add the 10 entries
   with `displayOrder` 1-10. DONE — plus `missionId?` on the definition (the
   per-mission scope the table needs; §3.3 described it as a "deck filter on the
   entry's mission" without naming the field) and `isDeckCollection?: boolean` on
   `StickerCollectionMeta` (the grouping flag for §3.1's nested UI).
3. `src/logic/stickerEvaluator.ts`: deck-scoped approval/count/set rules (§3.3). DONE —
   `getEntryDeckId` (entry `deckId`, else mission→pack lookup), deck/mission filtering
   inside `resolveEventStickers`, season_milestone filtered to the sticker's deck.
   No count rules were needed: the approved mapping has no 3/5 milestones.
4. `firestore.rules`: add the 10 IDs to `isKnownStickerId()`. DONE (repo only —
   needs Zach's `npx firebase deploy --only firestore:rules` before live awards work).
5. Tests: new `texasYallPack.test.ts` (ids, imageUrls resolve, rarities, rules whitelist,
   displayOrder); bump hardcoded `108` → `118` in the pinned-count tests; evaluator
   tests for deck-scoped first-approval / mission / count / completion rules, including
   that non-Texas approvals do NOT award Texas stickers and pending/rejected proofs do not
   count. DONE — evaluator tests live in `stickerEvaluator.test.ts` (8 new tests) and
   the pack test pins md5s/dimensions/rarities/rules/grouping-flag. The side-quests
   test also pinned the full shelf-order array and needed the new entry.
6. Verify: tsc clean, full suite, build clean. DONE — tsc clean;
   suite 969/971 with only the 2 known pre-existing failures
   (dataIntegrityAudit "proof existence…", tribunalSecurity "Firelight Tribunal…");
   `npm run build` succeeds.
7. Zach deploys rules from his Mac. PENDING.
8. Live check (browser, signed in): Dex shelf renders 0/10 with locked states; grant
   Texas stickers via admin to verify celebration + Dex; approve a real Texas proof on a
   test path and confirm the right sticker awards and nothing else fires; reload /
   re-login persistence; confirm existing collections unaffected. PENDING — includes
   confirming the nested "Deck Collections" grouping renders (no component test covers
   it: StickerMachine needs AppContext, so it is verified by inspection + live check).

Deviations from the plan (recorded honestly):
- Rarity arithmetic: the design's §3.4 summary line said 7 common / 2 rare / 1
  legendary, but the §3.4 table itself is 6 common / 3 rare / 1 legendary (rares
  are 02, 04, 09). The table governs; the build implements the table exactly.
  Catalog totals are now 78 common / 36 rare / 4 legendary (118 total). The §3.4
  line is corrected above.
- `unlockReason` carries both the condition and the drafted flavor line
  ("Earned when your first Texas Y'all proof is approved. You showed up. Texas
  said y'all come back now."). The catalog has no separate description field and
  the detail modal labels this text "How to unlock", so the condition comes first.
- "Only 3 exist" copy became stale with the 4th legendary: updated in
  `src/pages/AdminUsers.tsx` (2 spots) and its test to "only 4 exist", plus the
  `stickerCelebration.ts` catch-up comment. No behavior change.
- The Dex grouping renders the deck shelves under a "Deck Collections" heading
  only in the All view; selecting the Texas Y'all tab shows the shelf bare, like
  any other single-collection view.

## 7. Reusable deck-pack pattern (for future decks)

A future 10-sticker deck pack is, after this work: 10 PNGs in
`public/assets/stickers/<deck>/`, 10 catalog entries with `deckId` + `collection` set,
10 rules IDs, one pack test, and mapping rows that use only the deck-scoped rule shapes
(first approval, per-mission, deck-count thresholds, deck completion, crew-context
social). No new evaluator code, no new triggers, no UI change — the shelf renders from
the collection entry. The one thing that does NOT generalize yet: a nested "Deck
Collections" grouping, which would need the UI work in decision 1.

## 9. Trim report (done Nov 20, Zach-approved)

All 10 PNGs had neighboring-sheet bleed. Trimmed by connected-component analysis on the
alpha mask: removed every border-touching component that was not the sticker itself, plus
three targeted rectangle/color-gated erases for bridged fragments (01's top-right loop,
02's left-edge sign fragment and dark-red sliver, 02's bottom-right brown piece, 07's
bottom dome). Total foreign art removed: ~69,000 px (02 alone: 23,100 px — a whole boot).
The sticker art itself was not altered; erases were placed to spare the cream die-cut
outlines (verified visually file by file). Originals untouched in the ZIP and in
`/tmp/texas_yall/`; trimmed files live at `public/assets/stickers/texas_yall/`.
Post-trim verification: no border-touching foreign components remain in any file; the
only border pixels left are the stickers' own outlines. (Note: some image viewers render
this set's transparency as black, which can make empty regions look like black shapes —
verified numerically that those regions are fully transparent.)

## 8. Open items / risks

- `src/services/stickerAdminService.ts:94` still says "canonical registry (42 stickers)" —
  stale comment, unrelated to this pack, note for a cleanup pass.
- The `admin_grant` self-issue hole is still open (rules validate the trigger string, not
  the role). Texas stickers will be grantable via the admin UI like all others; grants are
  distinguishable only by ledger row + `adminLogs`.
- If any player already holds Texas approvals in their profile caches, deck-count stickers
  (01, 06) need catch-up semantics (>= threshold, as with `archetype_milestone`) or those
  players would never earn them. The build will use >= thresholds; live Texas approval
  state is unverified (see decision 9).
- Limited Edition collection is still empty (0 stickers) and its 11 rows still have no
  windows/dates; unrelated, but the shelf renders with empty-state copy today.
