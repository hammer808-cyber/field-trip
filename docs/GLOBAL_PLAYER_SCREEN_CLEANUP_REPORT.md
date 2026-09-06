# Fieldtrip Global Player Screen Cleanup Report

**Date:** 2026-09-05  
**Branch:** `cursor/global-player-screen-cleanup-eb8b`  
**Constraint:** Visual / UX consistency only. No scoring, proof approval, Starter, canonical progress, mission eligibility, unlock, or `resolvePlayerGuidance` architecture changes. No new Firestore collections.

Quality bar left mostly intact: Basecamp, Missions, Mission Briefing, Capture, Proof Submission / Result, Bottom Nav, Trevor.

---

## Design system extracted

Source of truth: Basecamp, Missions, Mission Briefing, Capture, and submission/result, plus `FieldPageHero` `variant="editorial"` and skin tokens (`--skin-*`).

### Typography

| Role | Treatment | Use |
| --- | --- | --- |
| DISPLAY | `font-display`, black, italic, uppercase, `clamp(2.75rem, 12vw, 5.5rem)` on editorial heroes | Page identity |
| SECTION | `font-display` 2xl–3xl, italic, uppercase | `FieldSection` titles |
| BODY | `font-sans` 14px bold for instructions; `font-serif` italic for flavor | What to do / supporting voice |
| MONO / SYSTEM | 9–10px black uppercase tracking | Eyebrows, metadata, status chips |

Important instructions never use tiny uppercase mono as the primary text.

### Spacing

| Token | Value |
| --- | --- |
| Page gutter | `--ft-page-gutter`: 16px / 24px from 640px |
| Section gap | `--ft-section-gap`: 28px / 36px |
| Card pad | `--ft-card-pad`: 16px / 20px |
| Body max width | 72rem, centered |
| Bottom nav clearance | unchanged app shell `pb-[calc(110px+env(safe-area-inset-bottom,20px))]` |
| Hero min height | editorial ~112–132px content, not a full first viewport |

### Materials / cards

| Family | Use |
| --- | --- |
| PAPER | Bulletin, missions, collector cabinet interiors |
| GLOSS | Progress / reward callouts (`ft-gloss-highlight`, lime/magenta stamps) |
| DARK / CHROME | Big Board + Frontlines + Tribunal heroes (`tone="chrome"`) |
| QUIET | Supporting info, settings groups, metadata |
| WARNING | Repair / rejected / banned / error (`ErrorStatePanel`, orange/red border) |

Department accents live in `src/components/player/departments.css` (Dex purple, Profile magenta, Logbook green, Crew orange, Board lime, Voting cyan, Lotería table, Settings muted).

### Buttons

`FieldButton` variants:

- PRIMARY — one next action (`--skin-primary`)
- SECONDARY — useful alternative (surface + shadow)
- TERTIARY — quiet / underline
- DESTRUCTIVE — white + error border (Sign out, banned)

Minimum tap target: 44px (`min-h-11`).

### Status

Canonical labels in `FIELD_STATUS_LABELS` / `getLogbookStatusPresentation`:

Here · Now · Locked · In progress · Pending · Approved · Needs more proof · Rejected · Complete

Chips add icon + color; labels remain readable without color alone.

### Headers

Major destinations use `FieldPageHero variant="editorial"`:

1. WHERE AM I? — DISPLAY title
2. WHAT IS THIS PAGE FOR? — body subtitle
3. WHAT MATTERS RIGHT NOW? — info card + optional scrollable tabs

Default giant hero is retained for any leftover consumers.

### Empty / locked / error / loading

| State | Component | Rule |
| --- | --- | --- |
| EMPTY | `EmptyStatePanel` | What it is + why empty + how it fills + one action |
| LOCKED | `GatedFeaturePanel` (Starter) or `LockedStatePanel` | Why locked + progress + one action |
| ERROR | `ErrorStatePanel` | Human title/body; technical details in `<details>` |
| LOADING | `FieldtripLoader` | Shared rotating copy, reduced-motion fallback |

No `FATAL_RUNTIME_FAILURE` / `SYSTEM_FAILURE // BUREAU_*` as primary player copy.

### Navigation

Bottom nav unchanged (Phase 4 Here/Now). Destination headers may include back labels. Tabs on Dex / Profile / Crew / Voting / Big Board scroll horizontally instead of wrapping into giant toolbars.

---

## Screen-by-screen changes

| SCREEN | BEFORE PROBLEM | NEW HIERARCHY | VISUAL IDENTITY | STATUS |
| --- | --- | --- | --- | --- |
| Welcome / Access / Sign Up / Login / Legal | Phase 4 already set the bar | Unchanged this pass | Onboarding paper | Retained |
| Classification / Explorer result / Field Kit | Phase 4 human copy | Unchanged this pass | Onboarding paper | Retained |
| Basecamp | Quality bar | Unchanged | Headquarters / bulletin | Retained |
| Missions / Briefing / Capture | Quality bar | Capture repair label → **Needs more proof** | Deck / assignment | Light polish |
| Proof submitted / result | Quality bar; bureau TX flavor | `TRANSMISSION COMPLETE` stays secondary; shell aligned | Receipt stamp | Light polish |
| Proof correction modal | `Mission Failure` / `BUREAU_FEEDBACK` | **Rejected** / **Needs more proof** | Warning paper | Done |
| Dex | Giant default hero, notebook rings, back-to-profile, mixed tabs | Editorial DEX + Collection / Stickers / Zines / Memories | Collector cabinet | Done |
| Profile | Duplicate identity/level cards, mixed chrome | Editorial PROFILE; identity dominant | Personal field record | Done |
| Logbook | Buried Profile tab, archive poetry empty | Editorial LOGBOOK; mission history dominant; canonical statuses | Receipts / history | Done |
| Settings | Same page as Profile, decorative competition | Editorial SETTINGS; grouped utility (`ft-settings-group`) | Backstage controls | Done |
| Field Identity | Sticky header, duplication with Profile | Editorial FIELD ID; Save look primary | Explorer look editor | Done (duplication flagged) |
| Crew | Loading jargon, dated empty; later `main` added a 1:1 people graph | Editorial CREW + `CrewPeopleHome`; named company is optional | People first, named company optional | Visual chrome + merge with #48 |
| Crew invite | Isolated white card | Editorial JOIN CREW + shared empty/error/loading | Clubhouse invite | Done |
| Big Board | Giant hero, rings, “Top Operatives”, stats noise | Chrome editorial BIG BOARD; live phase + rank; Top explorers | Public marquee | Done |
| Voting Hub | Rings, back-to-missions, mixed lock UI | Editorial VOTING; Ballot / Tribunal / Results; `VotingLockedPanel` → `GatedFeaturePanel` | Weekly ballot board | Done |
| Ballot | Custom locked booth copy | Editorial BALLOT + `GatedFeaturePanel` | Same voting family | Done |
| Tribunal / Council | Custom chrome / error codes | Chrome TRIBUNAL; shared empty/error/loading | Same voting family | Done |
| Awards / Results | Mixed wrappers | Editorial AWARDS; honors pending / released | Same voting family | Done |
| Lotería | Sticky custom header, fake auth id, tall grid | Editorial LOTERÍA; explorer type label; tighter board | Game table | Visual only |
| Settings (route) | `/settings` → Profile tab (unchanged) | Utility groups on Profile settings tab | Backstage | Done |
| Frontlines | Giant locked hero, bureau chrome, duplicate of Big Board | Chrome editorial FRONTLINES; locked panel + 50-pt progress; **not deleted** | Legacy scoreboard | Visual only; flagged |
| Banned | Cyberpunk `Access_Revoked` | Paper warning **Access revoked** | Utility / warning | Done |
| App error / profile missing / render fail | `FATAL_RUNTIME_FAILURE`, `BUREAU_PROFILE_NOT_FOUND`, `COMPONENT_RENDER_FAILURE` | `ErrorStatePanel` human copy; stack in Technical details | Warning paper | Done |
| Gated Dex / Voting / Big Board / Lotería / Crew | Phase 4 lock panel | Reused | Locked | Retained |

---

## Before / after screenshots

Authenticated emulator walkthrough (`LOCAL-DEV-PLAYER`, then an established fixture with 3 approved Starter missions).

### New player (locked / empty)

- Dex locked + Go do a mission: `dex_locked.webp`
- Voting / Big Board / Lotería locked: `voting_locked.webp`, `big_board_locked.webp`, `loteria_locked.webp`
- Crew empty clubhouse: `crew_empty.webp`
- Logbook empty: `logbook_empty.webp`
- Settings utility groups: `settings_utility.webp`
- Ballot locked with editorial header: `voting_ballot_locked.webp`
- Awards honors pending: `voting_awards.webp`

### Established (Starter complete)

- Dex collector cabinet: `established_dex.webp`
- Profile field record + Pending / Needs more proof / Approved: `established_profile.webp`
- Logbook mission history: `established_logbook.webp`
- Settings backstage: `established_settings.webp`
- Field ID: `established_field_id.webp`
- Frontlines chrome scoreboard (retained, flagged legacy): `established_frontlines.webp`
- Crew empty (still no crew): `established_crew.webp`
- Voting hub / Big Board / Lotería: `established_voting.webp`, `established_big_board.webp`, `established_loteria.webp`

### Mobile

- 320 Profile / Dex / Crew / Frontlines: `mobile_320_profile.webp`, `mobile_320_dex.webp`, `mobile_320_crew.webp`, `mobile_320_frontlines.webp`
- 375 / 390 / 430 Profile: `mobile_375_profile.webp`, `mobile_390_profile.webp`, `mobile_430_profile.webp`
- 430 Dex / Frontlines: `mobile_430_dex.webp`, `mobile_430_frontlines.webp`

---

## Components standardized

Introduced / reused (no mass rewrite):

| Piece | Where |
| --- | --- |
| `PlayerPageShell` / `PlayerPageBody` | All cleaned destinations |
| `departments.css` | Department accents, status chips, settings groups, 320px hero clamp |
| `FieldPageHero` editorial + `department` + `tone` | Shared header family |
| `FieldStatusChip` + `FIELD_STATUS_LABELS` | Dex / Profile / Logbook |
| `FieldButton` | Primary/secondary/tertiary/destructive |
| `FieldSection` | Dex medals and section titles |
| `EmptyStatePanel` (+ hint) | Empty destinations |
| `LockedStatePanel` | Non-starter locks (Frontlines 50 pts) |
| `ErrorStatePanel` | App, invite, tribunal |
| `GatedFeaturePanel` | Starter locks (Dex, Voting ballot/hub) |
| `FieldtripLoader` | Crew / invite / voting loading |

---

## Mobile results

| Width | Result |
| --- | --- |
| 320 | Profile / Dex / Crew / Frontlines: editorial titles clamp, tabs remain tappable, bottom nav readable. Trevor pill can cover lower identity content (existing guidance chrome). Field ID category labels truncate (`BACKGR`). |
| 375 | Profile hierarchy intact. |
| 390 | Primary capture width. Dex collector cabinet + Profile chips + Voting hub all readable. |
| 430 | Profile / Dex / Frontlines: no horizontal overflow observed. |

No first-viewport giant heroes on cleaned destinations. Primary CTAs (Create Crew, Save look, Vote now) appear without needing a full-page scroll past a decorative hero.

---

## Skin results

Current registry (`src/skins/registry.ts`) ships: `classic`, `arcade`, `journal` (Field Notebook), `clubhouse-wall`, `baja-bratz`.

| Skin | Result |
| --- | --- |
| Default `classic` | Verified on Dex, Profile, Logbook, Settings, Crew, Voting, Big Board, Lotería, Field ID, Frontlines. Hierarchy survives: DISPLAY title, subtitle, info card, one primary CTA. Nav Here/Now remain labeled, not color-only. |
| Baja `baja-bratz` | Present in Settings Field Kit chooser. Automated lock-in did not persist in this pass (preview vs apply). Baja still has dedicated ranking copy inside Frontlines content. |
| Diamond `slippery-diamond` | **Not in the current player skin registry.** Leftover `isDiamond` branches exist in Frontlines / Capture / ProofCorrection. Not live-testable until the skin is re-registered. |
| Heat `heatwave` | **Not in the current player skin registry.** Same leftover branches. Heatwave remains a deck/season id, not a visual skin. |

---

## Feature consolidation candidates

Do **not** remove in this branch.

| FEATURE | WHERE IT APPEARS | WHAT IT CURRENTLY DOES | WHY IT MAY BE REDUNDANT | WHAT COULD REPLACE / ABSORB IT | RISK OF REMOVAL |
| --- | --- | --- | --- | --- | --- |
| Frontlines | `/frontlines` | Legacy public ranking, field check, sabotage hub | Duplicates Big Board marquee + ranking | Redirect `/frontlines` → `/big-board` after inventorying Field Check / Sabotage | **High** — Field Check and SabotageHub still live here |
| Field Identity | `/field-id` | Avatar editor | Profile already owns identity + edit modal | Absorb into Profile overview “Edit look” | **Medium** — Profile save/updateAvatar still depends on this route |
| Dex missions / decks / badges tabs | `Collection.tsx` tab type, not in hero tabs | Hidden tab ids exist in code | Players cannot reach them from the Dex header | Drop dead tab types or expose under Collection | **Low–medium** — URL params may still deep-link |
| Profile Vault | Profile `vault` tab | Stickers / featured showcase | Overlaps Dex collection / stickers | Keep one collector surface (Dex) | **Medium** — players may bookmark Profile vault |
| Crew voting / memories / zine | Named Crew company tabs | Mini social copies of global Voting + Dex | #48 made 1:1 people the everyday social world; named company still owns zines/archives | Keep until zine/archive product is explicit | **High** if removed now |
| Quiet Crew Mode | Frontlines + Profile privacy | Filters visuals | Split across destinations | Settings-only privacy control | **Medium** |
| SabotageHub | Frontlines (and Big Board) | Social attack toys | Unclear if still product-intent | Product decision | **High** without design sign-off |

---

## Deferred gameplay

Explicitly **not** in this pass:

- Deck Store + My Decks
- Lotería Photo Board (approved mission cards → player photos)
- Voting 2.0

Social Privacy + Crew Foundation landed on `main` as #48 while this branch was open. The merge keeps that 1:1 people graph (`CrewPeopleHome`, `/players/:username`) and this branch’s editorial Crew chrome. Gameplay from #48 is unchanged.

---

## Tests

| Suite | Command | Result |
| --- | --- | --- |
| Guidance + Phase 4 + this pass | `npm run test:guidance` | pass (includes `globalPlayerScreenCleanup.test.ts`) |
| Starter | `npm run test:starter` | pass |
| Trevor | `npm run test:trevor` | pass |
| Beta blockers / routes | `npm run test:beta-blockers` | pass |
| Mission scoring | `npm run test:mission-scoring` | pass |
| Emulator guard | `npm run test:emulator-guard` | pass |
| Starter draw | `npm test` | pass |
| Physical memory / logbook | `npm run test:physical-memory` | pass |
| TypeScript | `npm run lint` (`tsc --noEmit`) | pass |
| Build | `npm run build` | pass |
| Firestore rules | `npm run test:firestore-rules` | pass (10/10) |

No gameplay rules were changed to make tests pass. Route unlock test now asserts Ballot uses `GatedFeaturePanel` instead of the old “Ballot booth locked” copy.

---

## Remaining visual debt

### HIGH

- Frontlines still contains a full second ranking UI under the new header. Consolidation needs a product decision (Field Check / Sabotage).
- Field Identity vs Profile identity editor duplication. New players cannot reach `/field-id` until Starter is complete (`onboardingCompleted` in AppContext is canonical Starter complete).
- RewardFeedback starter-unlock modal still leads with `DATA_STREAM_CONFIRMED` / `BUREAU_CREDIT_UNLOCKED` (not restyled in this pass; covers destinations until dismissed).
- `CrewPeopleHome` still uses its own giant `h1` (“Your people”) inside the editorial Crew page, so empty Crew can show two page titles.
- `PlayerPublicProfile` (`/players/:username`) shipped in #48 without the shared shell: `LOADING_PLAYER...` and no `FieldPageHero` / `PlayerPageShell`.

### MEDIUM

- Big Board standings still use some `GLOBAL_RANKINGS` mono stamps inside the marquee card.
- Awards category chips still use `CAT_n` flavor; keep secondary.
- Dex `missions` / `decks` / `badges` tab types exist in code but not in the header.
- Profile Vault vs Dex overlap.
- Field ID category tabs truncate at 320–390 (`BACKGR`).
- Diamond / Heatwave leftover `isDiamond` / `isHeat` branches in several pages, but those skins are not in `APP_SKINS`.
- Some Capture / Missions interior chrome is Phase 4 quality and was intentionally not restyled.
- Baja / Arcade live lock-in not fully captured after Starter unlock modal.

### OPTIONAL

- Welcome collage personality vs destination departments (already a different “door” on purpose).
- Skin-specific Frontlines ranking nicknames (Beach Babes, etc.) could move to a skin overlay later.
- `FieldButton` not yet swapped onto every legacy `bureau-btn` inside Crew populated tabs (upcoming Crew rebuild).
- Trevor “Draw another mission” pill can sit on top of Profile identity at 320px (existing guidance chrome).

---

## Hard constraints honored

- `resolvePlayerGuidance` untouched
- Canonical progress / Starter / proof lifecycle / scoring / AI review / deck eligibility / voting eligibility / feature unlock truth untouched
- No new Firestore collections
- No user data deleted
- Frontlines and Field Identity retained
- Crew social logic unchanged
- Lotería gameplay unchanged
- Voting mechanics unchanged
