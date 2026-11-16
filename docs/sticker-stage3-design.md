# FIELDTRIP — Stage 3 Design: Collections + Rule Evaluator + Weekly-Winner Wiring

- **Date:** 2026-11-16
- **Status:** BUILT Nov 16, 2026 — all 9 decisions in §9 approved as recommended; code committed on main. Verified: 28/28 new tests pass, full non-integration suite 560/562 (2 failures pre-existing, confirmed on pristine c917f67), tsc clean. No rules change. Live check (Render + phone) still owed.
- **Build notes:** (1) Design §5 as written could not work — ledger rows are one per sticker per user, so a row count can never reach 2 and the victory flag could never be awarded. Implemented per-win records in `users/{uid}/weeklyWins/{cycleId}` instead (re-finalize of the same cycle is a no-op by construction). (2) Admin approval paths (`proofService`/`submissionService`) have no progress snapshot, so count/set rules are skipped there and re-check on the player's next AppContext approval. (3) `archetype_milestone` fires only at exactly 5 approved — a player already past 5 when Stage 3 ships never crosses 5 again and never earns it (open question for Zach: fire at >= 5 when not yet earned).
- **Scope:** Stage 3 per the audit (§10.4 step 4): `collection` field + remap of the 42 canonical stickers, Dex grouping by collection, a rule evaluator for counts/milestones, and wiring `weekly_winner` from the server finalize path.
- **Companion docs:** `docs/sticker-system-audit.md` (§2, §4, §10.3), `docs/sticker-metadata-draft.md` (the 25-import draft — Stage 6, not redesigned here), `docs/sticker-server-awards-design.md` (Option A, shipped).

## Decisions already made (do not re-litigate)

- Rarity is 3 levels: common / rare / legendary. The 11 `uncommon` stickers fold into `common` (draft §4 list). Nobody loses a sticker; only the label changes. **Not yet in code** — `src/data/stickers.ts` still has 4-level `StickerRarity` and 11 `uncommon` entries. Stage 3 applies the fold as part of the same data edit.
- The 6 collections are Adventure, Achievement, Chaos, Social, Explorer, Limited Edition.
- Legacy page-visit stickers are KEPT. (Their awards now go through `POST /api/stickers/award`; the legacy fields are rules-protected. Stage 3 does not touch them.)
- Full-screen celebration modal is legendary-only (Stage 5 work, not this stage).
- Each explorer type gets its own sticker pack eventually. The 25 Stage 6 stickers are cross-pack collections, not explorer packs.
- The Gobbler has no stickers of its own (folded into Lost Camper). No change in Stage 3.
- Lost Camper is a distinct 7th roster member. Its 7 stickers stay.

## 0. Current state (as found, post–Stage 2)

- Canonical catalog: 42 stickers in `src/data/stickers.ts`, grouped only by archetype (6 personas × 7). No `collection` field exists anywhere in `src/data` or `src/logic`.
- Dex Stickers tab renders `StickerMachine`, which filters by **archetype only** (`StickerFilterTabs`: All + 6 personas). Header shows `N / 42 unlocked`, featured `N / 3`, unseen count. Detail modal shows rarity, archetype label, earned date, how-to-earn, feature toggle. No collection grouping, no per-collection progress.
- Canonical awards are 1:1 event → single hardcoded sticker (`STICKER_EVENT_AWARD_IDS`, 8 bindings), called from `AppContext` (submit/approve), `voteService`, `crewService`, `zineService`, `proofService`, `submissionService`, always wrapped in `runStickerAwardNonBlocking`. Canonical awards are still **silent** (no celebration — Stage 5).
- Dead triggers, unchanged since the audit: `challenge_approved` (3 stickers), `weekly_winner` (2), `archetype_milestone` (2), `season_milestone` (2), `admin_grant` (0 stickers, Stage 4). No count evaluation exists anywhere.
- Weekly finalize (`server.ts` `POST /api/admin/voting/finalize-week`, two paths: `cycleId`/ballot path and legacy `weeklySummaries` path) computes winners and awards XP idempotently via `awardWeeklyPointsOnce` (deterministic `eventId`, ledger via `awardTrustedXpInTransaction`) but **never awards the two `weekly_winner` stickers**.
- Rules: `firestore.rules` whitelists exactly the 42 IDs and 14 triggers. Rules validate **IDs and triggers only** — not rarity, not collection, not archetype. **Stage 3 needs no rules change and no rules redeploy.** (New triggers from the draft — `proof_returned`, `location_verified`, etc. — are Stage 6; adding them to the enum + whitelist is a Stage 6 step, not this one.)
- Counts the evaluator can already read without new queries: `CanonicalProgressSnapshot` (`src/services/canonicalProgress.ts`) — `approvedCompletedChallengeIds` (Set), per-deck `approvedCount`/`totalCards` via `getDeckProgress`, starter state. `AppContext` already builds this snapshot.

## 1. Schema — `collection` + the fields Stage 6 needs

```ts
export type StickerCollection =
  | 'adventure'
  | 'achievement'
  | 'chaos'
  | 'social'
  | 'explorer'
  | 'limited_edition';

export interface StickerDefinition {
  id: string;
  name: string;
  archetype?: StickerArchetype;   // CHANGED: optional (was required)
  collection: StickerCollection;  // NEW: exactly one per sticker
  imageUrl: string;
  rarity: 'common' | 'rare' | 'legendary';  // CHANGED: 'uncommon' removed
  awardTrigger: StickerAwardTrigger;
  unlockReason: string;
  tags: string[];
  displayOrder?: number;          // NEW: shelf order inside the collection
  secret?: boolean;               // NEW: hide name + how-to-earn until earned (Stage 6 use)
  availableFrom?: string;         // NEW: ISO date, window start (Stage 6 use)
  availableUntil?: string;        // NEW: ISO date, window end (Stage 6 use)
}
```

- **`collection` is required and single-valued.** One sticker, one collection. No multi-collection stickers — the mapping table in §2 is the whole decision.
- **`archetype` becomes optional.** Reason: the 25 Stage 6 stickers are cross-pack by Zach's call, and the draft flagged that `StickerDefinition` requiring an `archetype` would force a fake value at import. A sticker with no `archetype` is a cross-pack sticker. It appears under "All" and in its collection shelf, but under no archetype filter tab. `StickerDetailModal` shows a "Cross-pack" label (or no archetype line) when absent. The 42 keep their archetypes. Alternative (rejected in this design, Zach can override): add a 7th archetype value `'crossPack'` — it would pollute the filter tabs with a fake persona and break the "archetype = character" meaning.
- **`displayOrder`, `secret`, `availableFrom/Until` are added now, used later.** All 42 get `displayOrder` (shelf order inside their collection, §2 tables). `secret`/`availableFrom`/`availableUntil` are unused by the 42 (all `secret: false`, no windows) and are consumed by Stage 6 rules. Adding them now makes Stage 6 data-only for the schema.
- **Rarity fold (already decided):** `StickerRarity` drops `'uncommon'`; the 11 stickers in draft §4 become `common`. The legacy display registries (`src/constants/discoveryStickers.ts`, `src/data/rewardRegistry.ts`) keep their own `uncommon` values — they describe legacy stickers, not the canonical catalog, and are not the source of truth. Do not touch them in Stage 3.
- **New helpers:** `getStickersByCollection(collection)`, `COLLECTION_META` (label, shelf order, empty-state copy) in `src/data/stickers.ts`. No new files for the schema.

## 2. The mapping — all 42 into 6 collections

### Primary-collection rule (how every sticker was placed)

**Classify by the earning action, not by the art or the archetype.** A sticker of a mall-rat eating a snack and a sticker of Bigfoot holding a tray are both "first photo proof" stickers — they go in the same collection, because the player did the same thing to earn them. Archetype stays a separate, orthogonal axis (the filter tabs), so nothing is lost: the Mall Rat view is still one tap away.

- **Explorer** = identity. The starter packs: the 3 stickers that say which explorer you are.
- **Adventure** = doing fieldwork. Firsts in the field: first submission, field note, photo proof, zine page.
- **Achievement** = milestones and proof of excellence. First approval, challenge approvals, weekly wins, archetype and season milestones.
- **Social** = other people. Crew created/joined, weekly vote.
- **Chaos** = documented disorder (draft tone). None of the 42 fit — seeded by the 13 in Stage 6.
- **Limited Edition** = windowed/event-only. None of the 42 fit — seeded by the 12 in Stage 6.

### Scheme A (recommended): 6 collections

| Collection | Count | Stickers (id — trigger) |
|---|---|---|
| **Explorer** | 18 | Starter packs, all 6 archetypes × 3: `captain_clipboard_clipboard_character`, `captain_clipboard_checklist_badge`, `captain_clipboard_field_notes`, `mall_rat_shopping_bags`, `mall_rat_soda_cup`, `mall_rat_mall_map`, `mascota_pom_poms`, `mascota_megaphone`, `mascota_mascot_face`, `elondra_crown`, `elondra_compact_mirror`, `elondra_sparkle_burst`, `lost_camper_map`, `lost_camper_flashlight`, `lost_camper_backpack`, `bigfoot_footprint`, `bigfoot_pine_trees`, `bigfoot_night_silhouette` — all `starter_pack` |
| **Adventure** | 8 | `mall_rat_receipt_curl` (first_submission), `lost_camper_nervous_camper` (first_submission), `captain_clipboard_pen_sparkle` (field_note_added), `bigfoot_campfire_snack` (field_note_added), `mall_rat_food_court_tray` (photo_proof_added), `bigfoot_blurry_polaroid` (photo_proof_added), `captain_clipboard_flying_papers` (zine_page_added), `elondra_purse` (zine_page_added) |
| **Achievement** | 12 | `captain_clipboard_checkmark_seal` (first_approval), `elondra_glam_pose` (first_approval), `lost_camper_bandage` (first_approval), `mascota_mascot_jump` (challenge_approved), `elondra_glam_shoe` (challenge_approved), `lost_camper_compass` (challenge_approved), `mascota_confetti_burst` (weekly_winner), `mascota_victory_flag` (weekly_winner), `mall_rat_sunglasses` (archetype_milestone), `bigfoot_tree_hideout` (archetype_milestone), `mall_rat_escalator_pose` (season_milestone), `elondra_arrival_pose` (season_milestone) |
| **Social** | 4 | `mascota_foam_finger` (weekly_vote_cast), `captain_clipboard_whistle_lanyard` (crew_created), `lost_camper_trail_sign` (crew_joined), `bigfoot_peace_sign` (crew_joined) |
| **Chaos** | 0 | (seeded by the 13 in Stage 6) |
| **Limited Edition** | 0 | (seeded by the 12 in Stage 6) |

Total: 18 + 8 + 12 + 4 + 0 + 0 = **42**. ✓

### Edge cases (flagged, not hidden)

- **Zine → Adventure, not Achievement.** A zine page is field output, same family as a submission. Achievement is reserved for milestones, approvals, and wins. If Zach reads zines as "completed artifacts," move both zine stickers to Achievement — a 2-line data edit.
- **Weekly vote → Social, not Achievement.** Voting is a social act (you judge other people's proofs). The *win* is the Achievement; the *vote* is Social.
- **Crew-created legendary (`whistle_lanyard`) → Social.** It is about other people even though it is leadership-flavored. It stays the collection's only legendary until Stage 6.
- **Season/archetype milestones → Achievement by definition.** Milestones are achievements.
- **Starter packs → Explorer, not Adventure.** "Starting out" is adventure-flavored, but the packs *are* the explorer identity — and Zach's future per-explorer packs live in this collection. This is the load-bearing call: Explorer is 18/42 because identity is the catalog's largest theme.

### Scheme B (alternative, not recommended): 8 collections

Add `mall_rats` (all 7 `mallRat`) and `sasquatch` (all 7 `bigfoot`) as their own collections, as the audit §10.3 suggested. The remaining 28 map by trigger: Explorer 12 (the other 4 archetypes' starter packs), Adventure 4, Achievement 9, Social 3, Chaos 0, Limited Edition 0.

Why not recommended: it makes collection redundant with archetype for 14 stickers — the `mall_rats` shelf *is* the Mall Rat filter tab, and the `sasquatch` shelf *is* the Bigfoot filter tab. It also splits trigger families across collections (the three `first_approval` stickers would land in three different collections), which breaks the primary-collection rule. And it spends two of the six named collection slots on what the archetype axis already provides. The themed identity survives under Scheme A as the archetype filter and, later, as explorer packs.

### Thin / empty collections

- **Social is thin (4).** That is honest — the game has few social actions today. It fills out when social triggers grow (likes, tribunal, zine collaboration are all future triggers, not Stage 3 scope).
- **Chaos and Limited Edition are empty until Stage 6.** Recommendation: **show both shelves with an empty state** ("No stickers here yet — first drops land with Stage 6") rather than hiding them. Hiding-then-appearing reads as a bug; an empty shelf reads as a coming attraction. The shelf header still shows `0 / 0` — or, better, `0 / 13` and `0 / 12` once the Stage 6 counts are known (do not hardcode the 13/12 until the draft is approved; show `0` until then).

## 3. Dex grouping UI

### Current state

`Collection.tsx` renders `<StickerMachine />` in the `stickers` tab (Stage 1). `StickerMachine` has one filter row (archetype tabs), a flat grid, a header (`N / 42 unlocked`, `N / 3 featured`, unseen count), and a detail modal. The Dex hero "Collected" count blends stickers + badges + skins from the legacy `rewardRegistry` — leave it alone in Stage 3 (it is a separate wart; the Machine is the sticker source of truth).

### Design

- **Collection shelves are the primary grouping; archetype becomes the secondary filter.** Two filter rows in `StickerMachine`:
  1. **Collection tabs (primary):** All + 6 collections. Each tab label carries its live progress, e.g. `Adventure 3/8`, `Explorer 3/18`, `Chaos 0/0`. Selecting a collection scrolls to / filters to that shelf. Default view: All, rendered as **stacked shelves** — one section per collection with a header (collection name, `n/m` earned, short tagline) and its grid. This keeps the "browse the whole cabinet" feel while making per-collection progress visible without tapping.
  2. **Archetype chips (secondary):** All + 6 personas, as today. They filter *within* the visible shelves. A cross-pack sticker (no archetype, Stage 6) appears under "All" and in its collection shelf under every archetype chip — it is never hidden by the archetype filter.
- **Shelf order (proposed):** Explorer, Adventure, Achievement, Social, Chaos, Limited Edition. Explorer first because a new player owns 3 Explorer stickers immediately — the first shelf is never empty. (Alternative: Adventure first, "play order." Small call, §9.)
- **Per-collection progress** is computed from the same `unlocksById` map the Machine already loads — no new reads. Header keeps the overall `N / 42` (which becomes `N / 67` after Stage 6; the total is `ALL_STICKERS.length`, so it follows automatically).
- **`StickerDetailModal`:** add a collection chip next to the archetype label (and a "Cross-pack" label when `archetype` is absent). Earned date, how-to-earn, feature toggle unchanged.
- **`StickerCard` / `StickerGrid`:** unchanged (locked grayscale + lock icon, rarity pill, "New" badge). No visual redesign in Stage 3 — this stage is taxonomy + evaluation, not a reskin.
- **What happens to archetype grouping:** kept, demoted to secondary filter. It is the axis the future explorer packs reuse — a pack view later is the same filter with a different header. Nothing is deleted.
- **Empty shelves:** Chaos and Limited Edition render their header + the empty-state copy (§2). No special casing beyond that.

### Files

- `src/data/stickers.ts` — schema + mapping + `getStickersByCollection` + `COLLECTION_META`.
- `src/components/stickers/StickerMachine.tsx` — shelves, two-row filter, per-collection counts.
- `src/components/stickers/StickerFilterTabs.tsx` — generalize from archetype-only to support the collection row (or add a `StickerCollectionTabs` component; do not overload the archetype component with two jobs).
- `src/components/stickers/StickerDetailModal.tsx` — collection chip.
- `src/components/stickers/StickerGrid.tsx` — section wrapper (header + grid) or a `StickerCollectionSection` component; grid itself unchanged.
- `src/pages/Collection.tsx` — no change expected (it already mounts the Machine). If the hero count needs a sticker-only number, that is a follow-up, not Stage 3.

## 4. Rule evaluator

### Shape and home

- **Client evaluator:** new pure-ish module `src/logic/stickerEvaluator.ts`. Signature (proposed):
  ```ts
  evaluateStickerTriggers(input: {
    event: StickerEvent;          // { type, entry?, ... } — see rule kinds
    userId: string;
    snapshot: CanonicalProgressSnapshot;  // already built by AppContext
    fieldType?: string | null;    // player's archetype, for archetype-match
  }): Promise<StickerUnlockResult[]>
  ```
  It returns the same `StickerUnlockResult[]` the call sites already consume, and it calls the existing `unlockStickersForUser` transaction as its **only writer**. No new write path. No new Firestore reads on the client path — the snapshot (approved IDs, per-deck counts, starter state) plus the triggering event payload (entry with `missionId`/`challengeId`/`locationVerified`/`chaosModifierApplied`/timestamps) are the only inputs.
- **Server evaluator (weekly winner only):** new module `src/server/canonicalStickerAwards.ts` (extracted, unit-testable — same rule as `stickerAwards.ts`: no award logic inline in `server.ts`). See §5.
- **Rule table lives in the registry, not in the evaluator.** Each `StickerDefinition` already carries `awardTrigger`; the evaluator adds a small rule table keyed by trigger that says *how* to evaluate it (event / count / field / set / window) and its parameters (threshold, deck scope). The 1:1 `STICKER_EVENT_AWARD_IDS` map becomes the event rules' defaults (see archetype-match below) — it is not deleted, it is absorbed.
- **Evaluation timing (unchanged):** only after the trusted event, only triggers relevant to that event (`FIELDTRIP_GAME_LOGIC.md` §9). Never a full re-evaluation on Dex open. Re-evaluation is safe anyway — the transaction returns `already_unlocked` and the ledger (Stage 4) will add `eventId` dedupe — but it is not the trigger path.

### Rule kinds

| Kind | Evaluates | Inputs | Ships in Stage 3? |
|---|---|---|---|
| `event` | One event → sticker(s) | The event itself | Yes — the existing 8 bindings, via archetype-match (§4.1) |
| `count` | Approved-proof count crosses a threshold | `snapshot.approvedCompletedChallengeIds.size` | Yes — mechanism + `mission_count_milestone` (5 / 10). No canonical sticker carries it yet; awards nothing until Stage 6 binds stickers |
| `field` | A field on the approved entry | `entry.locationVerified`, `entry.chaosModifierApplied`, entry timestamp, entry location tags | Schema-ready only — rule kinds defined, stickers arrive in Stage 6 (`location_verified`, `chaos_modifier_applied`, `late_night_submission`, `new_destination`) |
| `set` | A set completes | `getDeckProgress` per deck (approvedCount === totalCards); season = all decks in a season | Yes — `season_milestone` (deck completion). Discovery-group sets stay server-side in the legacy module, untouched |
| `window` | Current date inside `availableFrom`–`availableUntil` | `StickerDefinition` window fields + current date | Schema-ready only — enforced by the evaluator from Stage 6 on; no windowed stickers exist yet |

### 4.1 The archetype-match rule (the important design decision)

Today one event awards one hardcoded sticker regardless of who the player is: a first approval always awards `captain_clipboard_checkmark_seal`, even to an Elondra player — while `elondra_glam_pose` (same trigger, Elondra's sticker) sits unearned forever. Three stickers share `first_approval`; two share `field_note_added`, `photo_proof_added`, `crew_joined`, `zine_page_added`, `archetype_milestone`, `season_milestone`; three share `challenge_approved`. The evaluator fixes this with one rule:

> **For trigger T and player archetype A: award the sticker(s) with `awardTrigger === T` and `archetype === A`. If none exists for A, award the trigger's existing default from `STICKER_EVENT_AWARD_IDS`. If several exist for A, apply the trigger's tier rule (only `weekly_winner` has this case — see §5).**

- Coverage check (from the registry): `first_submission` has variants for mallRat + lostCamper only; `weekly_vote_cast` and `crew_created` have a single sticker each (they *are* their own default); `challenge_approved` has mascota / elondra / lostCamper. Every trigger stays winnable for every archetype via the default fallback, and players now earn *their* archetype's variant when one exists.
- The starter pack is **not** evaluated — it is a grant at quiz time (`PersonaQuiz`), unchanged.

### 4.2 The dead triggers, defined (proposed semantics)

| Trigger | Stickers | Proposed definition (Stage 3) | Evaluated where |
|---|---|---|---|
| `challenge_approved` | `mascota_mascot_jump`, `elondra_glam_shoe`, `lost_camper_compass` | **Approval of a non-starter mission entry** — the approved entry's `missionId`/`challengeId` is not in `STARTER_SIGNAL_IDS`. Fires from the same approval call sites that fire `first_approval` today (`proofService.adminOverrideReview`, `submissionService` review path, `AppContext` immediate-approval path), evaluated with the entry in hand. Archetype-match picks which of the 3. | Client evaluator, on approval |
| `archetype_milestone` | `mall_rat_sunglasses`, `bigfoot_tree_hideout` | **5th approved proof while the player's field type is that archetype.** Count from `snapshot.approvedCompletedChallengeIds.size`. Threshold 5 is PROV (same number as the draft's 5th-approval Chaos row — one milestone, consistent). Awards the archetype's milestone sticker. **Gap: 4 archetypes have no milestone sticker** (captainClipboard, mascota, elondra, lostCamper) — those players never earn one. Accept the gap in Stage 3; adding 4 stickers is a Stage 6 data decision. | Client evaluator, on approval |
| `season_milestone` | `mall_rat_escalator_pose`, `elondra_arrival_pose` | **Completing a full non-starter deck** — `getDeckProgress(deckId).approvedCount === totalCards` (and `totalCards > 0`) for any deck other than `starter-signals`, evaluated on approval. Awards **both** season stickers (they are seasonal art, not persona art — see §9.5). Deck completion is re-checked on every approval, so a player who completed a deck before Stage 3 ships gets the stickers on their next approval (catch-up by re-evaluation, not backfill — the transaction dedupes). | Client evaluator, on approval |
| `mission_count_milestone` | none yet (Stage 6: Chaos 5th, Limited Edition 10th) | Count rule with thresholds as data: `{ threshold: 5 }`, `{ threshold: 10 }`. Evaluated on approval from the approved count. Awards nothing in Stage 3 (no sticker carries the trigger) — the mechanism is built and unit-tested now so Stage 6 is a data binding. | Client evaluator, on approval |
| `weekly_winner` | `mascota_confetti_burst`, `mascota_victory_flag` | Server-side, §5. | Server, in finalize-week |

### 4.3 What the evaluator does NOT evaluate (Stage 6)

`proof_returned`, `location_verified`, `chaos_modifier_applied`, `late_night_submission`, `new_destination` — the draft's shopping list. The `field`/`window` rule kinds are defined now so the evaluator's shape accepts them, but no rule rows are added until the stickers exist. The evaluator must not invent triggers: a rule with no sticker is dead code, and a sticker with no rule is an unwinnable sticker — Stage 6 adds both halves together, with the enum + rules-whitelist edit that entails.

### 4.4 Call-site migration

Replace the hardcoded `unlockStickerForUser(userId, STICKER_EVENT_AWARD_IDS.x, ...)` calls with `evaluateStickerTriggers(...)` at the same call sites, keeping the `runStickerAwardNonBlocking` wrapper and the same fire-and-forget posture (a sticker failure never blocks the flow):

- `AppContext.tsx` — submit success (first_submission / field_note / photo), immediate approval (first_approval + challenge_approved + count/milestone re-check).
- `proofService.ts:629` (`adminOverrideReview`) and `submissionService.ts:764` — approval path (first_approval + challenge_approved + count/milestone re-check). The existing double-fire (two clients firing the same award for one approval) stays harmless: the transaction returns `already_unlocked` for the second.
- `voteService.ts:44` — weekly vote (weekly_vote_cast).
- `crewService.ts` — crew created / joined.
- `zineService.ts:14` — zine page added.
- `PersonaQuiz.tsx:90` — **unchanged** (starter-pack grant, not evaluation).

## 5. Weekly-winner wiring (server)

### Current state

`POST /api/admin/voting/finalize-week` has two paths:

- **Cycle path** (`cycleId` given): iterates ballots; per ballot computes a ranked list and a `winner` (`winner.userId` from the ballot entry); writes `votingCycles/{cycle}/results/{ballot}` (`isFinal: true`) and the ballot `status: 'published'`; pushes an XP award request per winner (25 pts, deterministic `eventId` `weekly_award_{cycleId}_{userId}_{scope}_{crewId}`). Re-finalize: already-final ballots re-push their XP award requests (idempotent via the XP ledger `eventId`).
- **Legacy summary path** (`seasonId` + `weekNumber`): per `WEEKLY_VOTE_CATEGORIES` category, tallies `votes`, takes the top entry, writes `weeklySummaries/{summaryId}` with `voteWinners[category]` (`userId`, `entryId`, count) and `isLocked: true`, plus XP awards (25 pts winner, 20 pts consensus voters). Re-finalize: if locked, returns `{ alreadyFinalized: true }` **without awarding anything**.

Both paths end with `writeAdminAudit`. Neither awards stickers.

### Design

- **New module `src/server/canonicalStickerAwards.ts`** (extracted, unit-testable — same rule as `stickerAwards.ts`: no award logic inline in `server.ts`). One function:
  ```ts
  awardWeeklyWinnerStickers(db, input: {
    cycleId: string;            // cycleId OR summaryId — the finalize run id
    winners: Array<{ userId: string; entryId: string; scope: string }>;
  }): Promise<Array<{ userId: string; awarded: string[] }>>
  ```
  For each **distinct** winner `userId` (dedupe within the finalize run — one user winning two ballots counts as one win):
  1. Read the user's `stickerAwards` rows with `trigger == 'weekly_winner'` to count prior wins (one targeted query per winner; winners per finalize are few).
  2. In one Admin SDK transaction per winner: if `users/{uid}/stickers/mascota_confetti_burst` does not exist, create it (`{ stickerId, unlockedAt: serverTimestamp(), source: 'weekly_winner:{cycleId}', trigger: 'weekly_winner', seen: false, equipped: false }`) + ledger row `stickerAwards/{userId}:mascota_confetti_burst` (`{ awardId, stickerId, userId, trigger: 'weekly_winner', source, eventId, awardedAt, awardedBy: 'server' }`). If prior wins ≥ 2 (i.e. this is the 3rd cumulative win — threshold PROV, §9.6), do the same for `mascota_victory_flag`. The doc shape matches what `firestore.rules` expects and what `normalizeUnlockedSticker` validates, so the client reads it without changes.
  3. Idempotency: doc-exists + ledger-exists checks inside the transaction. Re-finalize re-runs the function and no-ops.
- **Wiring points in `finalize-week`:**
  - Cycle path: after the XP awards loop, call `awardWeeklyWinnerStickers` with the per-ballot winners (already collected as `winner.userId` + `ballot.scope`). Same loop position as the XP awards, same idempotency guarantees.
  - Legacy summary path: after the XP awards loop, call it with the per-category winners (`voteWinners[category].userId`). **And in the already-finalized early return, also call it** (idempotent, so re-running is safe) — otherwise a week finalized before Stage 3 ships never gets its stickers on a later re-finalize.
  - Response: include the sticker awards alongside the XP awards in the JSON response (`awards` already lists XP; add a `stickerAwards` array) so the admin UI / logs show what was granted.
- **No client changes for weekly winner.** The winner sees the stickers in the Dex (subcollection read) and, from Stage 5, the celebration. No client call site needs to know a win happened.
- **No rules change.** Both IDs and the `weekly_winner` trigger are already whitelisted. Admin SDK bypasses rules anyway; the shape match is for the client reader, not for rules.
- **Edge cases:** winner with no `userId` → skipped; ballot with zero votes → no winner, no award; same user winning multiple ballots in one finalize → one win counted, both stickers at most once; winner is an admin/test account → awarded like any player (same as XP today).
- **Retroactive awards: NO in Stage 3** (recommendation, §9.7). Past weeks' winners do not get stickers for wins that predate this wiring. A one-time backfill script (read past `results`/`weeklySummaries`, award to winners) is a separate, explicitly approved job if Zach wants it — it is not smuggled into Stage 3.

### Tier rule for the two weekly-winner stickers

- `mascota_confetti_burst` (rare): **any weekly win.** Every ballot/category win earns it.
- `mascota_victory_flag` (legendary): **3rd cumulative weekly win** (threshold PROV). "Landmark" needs a number, and 3 is the smallest number that reads as a landmark without being unreachable — the game has run weekly ballots since launch, so a player with 2 past wins gets the flag on their next one. Alternative tier definitions are in §9.6.

## 6. Build sequence

1. **Schema + data (no behavior change first).** `StickerDefinition`: add `collection`, `displayOrder`, `secret?`, `availableFrom?`, `availableUntil?`; make `archetype` optional; fold `uncommon` → `common` (draft §4 list); remap all 42 per §2; add `getStickersByCollection` + `COLLECTION_META`. Unit test: mapping integrity (every sticker has exactly one valid collection; per-collection counts match §2; no `uncommon` remains; every `imageUrl` resolves to a file under `public/` — new test, prevents a repeat of the dead-`src` bug).
2. **Evaluator (client).** `src/logic/stickerEvaluator.ts` + rule table; repoint the §4.4 call sites; archetype-match + count + set rules; `mission_count_milestone` mechanism with no bound stickers. Unit tests: trigger × archetype matrix; 5th-approval fires once (not on 4th/6th, not twice on re-evaluation); deck completion fires once; non-starter vs starter approval distinction for `challenge_approved`; evaluator returns no award for an unknown trigger.
3. **Weekly winner (server).** `src/server/canonicalStickerAwards.ts` + finalize-week wiring (both paths + already-finalized branch); response includes sticker awards. Unit tests with a fake store: confetti on any win; victory_flag on 3rd win only; re-finalize no-op; same user winning two ballots deduped; no-userId winner skipped. (Emulator-backed rules test: unchanged, still needs an off-VM run — environmental, same as Stage 2.)
4. **Dex UI.** Collection shelves + two-row filter + per-collection counts + modal collection chip. Manual check on Render: all 6 shelves render; Chaos/LE show the empty state; archetype filter narrows within shelves; locked/earned states, earned dates, featured max-3 all still work.
5. **Verify.** Full unit suite + `tsc` + build; push to main; verify Render serves the new bundle; Zach's phone check of the Dex.

## 7. Test plan (summary)

- Mapping integrity test (new): one collection per sticker; counts per §2; no `uncommon`; every `imageUrl` exists in `public/`.
- Evaluator unit tests (new, `src/__tests__/stickerEvaluator.test.ts`): event rules via archetype-match incl. default fallback; count thresholds; deck completion; starter vs non-starter approval; idempotent re-evaluation.
- Weekly-winner server tests (new, `src/__tests__/serverWeeklyWinnerStickers.test.ts`): tier logic, dedupe, re-finalize no-op, edge cases.
- Existing suites must stay green: `stickerAwards.test.ts`, `stickerMachine.test.ts`, `zineStickers.test.ts`, `serverStickerAwards.test.ts` (26 tests), plus the full non-integration suite (563/565 at last count, 2 known pre-existing failures).
- `stickerRules.integration.test.ts` (7 tests, now passing on Zach's Mac): **no changes needed** — no rules change in Stage 3. Re-run off-VM only if a rules file is touched (it is not).

## 8. What Stage 3 deliberately does NOT do

- **Admin grant endpoint** (`POST /api/admin/stickers/grant`) — Stage 4. The `admin_grant` trigger stays unwired.
- **Celebrations** — Stage 5. Canonical awards stay silent in Stage 3; the evaluator returns results the celebration layer will consume later. (The legacy modal path is untouched.)
- **The 25 import** — Stage 6. No new stickers, no new triggers in the enum or rules, no windows, no secrets, no trim review. The schema fields added here exist so Stage 6 is a data binding, not a second schema change.
- **Ledger rows for client canonical awards** — Stage 4. The weekly-winner server path writes ledger rows now (it is server-side already); the client canonical path gets its ledger write in Stage 4, in the same transaction as the unlock.
- **Gobbler stickers, Missions-vs-Decks, legacy registry cleanup, Dex hero blended count, StickerBook changes.** Out of scope; noted, not built.
- **Retroactive weekly-winner awards** for past weeks — separate decision (§9.7).

## 9. Decisions needed from Zach

1. **Scheme A vs Scheme B (§2).** 6 collections (recommended) or 8 with `mall_rats` + `sasquatch` as their own shelves?
2. **Shelf order + empty shelves.** Proposed order: Explorer, Adventure, Achievement, Social, Chaos, Limited Edition. Show Chaos / Limited Edition as empty shelves until Stage 6 (recommended) or hide them until they have stickers?
3. **`challenge_approved` definition (§4.2).** Proposed: approval of a non-starter mission entry. Alternative: Nth approval (e.g. 2nd approval). The definition decides which approvals earn the 3 stickers.
4. **`archetype_milestone` definition + threshold (§4.2).** Proposed: 5th approved proof while that archetype is your field type. Threshold 5 is PROV. And: accept that 4 archetypes have no milestone sticker (gap filled in Stage 6), or define the rule differently?
5. **`season_milestone` definition + award shape (§4.2).** Proposed: completing any full non-starter deck; award **both** season stickers. Alternative: archetype-match only (4 archetypes would never earn one).
6. **`victory_flag` tier (§5).** Proposed: 3rd cumulative weekly win. Alternatives: first crew-scoped ballot win; a different count (2nd? 5th?).
7. **Retroactive weekly winners?** Past weeks' winners get their stickers via a one-time backfill, or only wins after Stage 3 ships count (recommended: only new wins)?
8. **`archetype` optional vs `'crossPack'` value (§1).** Optional (recommended) or a 7th archetype value?
9. **Edge-case confirms (§2):** zine stickers in Adventure (vs Achievement); weekly vote in Social (vs Achievement). Confirm, or move them?
