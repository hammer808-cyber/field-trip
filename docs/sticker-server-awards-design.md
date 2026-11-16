# Server-side legacy sticker awards — design (Stage 2 unblocker)

- **Date:** 2026-11-15
- **Status:** DESIGN ONLY — no code changed, nothing committed. Build follows Zach's pick of Option A vs Option B (§5).
- **Goal:** move legacy sticker awards off the client so the held rules branch can ship.
- **Held branch:** `feature/stage2-legacy-spoof-hole` (commit `5d20fb5`, local only). It blocks non-admin writes to the five legacy `users/{uid}` sticker fields on update **and** create. It also blocks the app's own client-side legacy awards, which is why it is held. Sequence: awards move server-side first, then the branch gets its off-VM rules-test pass, then merge + deploy rules.
- **Zach's standing calls:** legacy page-visit stickers are KEPT as exploration rewards; rarity is 3 levels (common/rare/legendary); full-screen modal for legendary only; camera stickers held until the starter is done (option D, shipped in `a94d84f`/`556fc22`).

## 1. What exists today

### 1.1 The legacy award map — all 17 live keys

Single funnel: every legacy award goes through `AppContext.unlockDiscoverySticker` → `discoveryService.awardDiscoverySticker` (`src/services/discoveryService.ts:61`), which does one plain client `updateDoc` on `users/{uid}`. `PHASE_1_KEYS` (17 keys) is the allowlist; anything not in it returns null.

| discoveryKey | sticker id | Call site | What triggers it | Pre-starter? |
|---|---|---|---|---|
| `camera_ready` | `camera_ready` | `Capture.tsx:343` (viewfinder open), `:1068` (submit) | viewfinder open / first photo proof | HELD until starter done |
| `capture_start` | `camera-ready` | `Capture.tsx:342` | viewfinder open | HELD until starter done |
| `first_field_note` | `first_field_note` | `Capture.tsx:1074` (submit with note) | first note on a submission | HELD until starter done |
| `proof_returned` | `proof_returned` | `Capture.tsx:1232` (`needs_more_proof`) | proof returned for more evidence | HELD until starter done |
| `proof_pirate` | `proof_pirate` | `AppContext.tsx:2456` (submit with photo + note) | photo + note on one proof | **FIRES pre-starter** (starter submissions qualify) |
| `mission_draw` | `first-draw` | `Deck.tsx:597` (mission drawn) | first mission draw | **FIRES pre-starter** (Missions is open pre-starter) |
| `evidence_meter_bonus_seen` | `signal-fragment-missing` | `EvidenceMeter.tsx:34` (photo + note) | photo + note shown in meter | **FIRES pre-starter** (Capture is open pre-starter) |
| `starter_signal_1` | `starter_signal_1` | `AppContext.tsx:1825` (starter effect, count ≥ 1) | first starter approval | **FIRES pre-starter** (count 1 of 3) |
| `receipt_approved` | `receipt_approved` | `AppContext.tsx:1826` (starter effect, count ≥ 1) | first approved submission | **FIRES pre-starter** (count 1 of 3) |
| `starter_signal_3_complete` | `starter_signal_3_complete` | `AppContext.tsx:1829` (count ≥ 3) | all 3 starters approved | No — only at 3/3 |
| `crew_unlocked` | `crew_unlocked` | `AppContext.tsx:1830` (count ≥ 3) | Crew unlocks | No — only at 3/3 |
| `memories_unlocked` | `memories_unlocked` | `AppContext.tsx:1831` (count ≥ 3) | Memories unlock | No — only at 3/3 |
| `dex_open` | `first-flip` | `Collection.tsx:110` (Dex mount) | Dex opened | Unreachable pre-starter (Dex locked) |
| `dex_discovered` | `dex_discovered` | `Collection.tsx:111` (Dex mount) | Dex opened | Unreachable pre-starter |
| `sticker_collection_view` | `binder-goblin` | `Collection.tsx:151` (Stickers tab) | Stickers tab opened | Unreachable pre-starter |
| `locked_sticker_tap` | `empty-slot-syndrome` | `Collection.tsx:194` (tap a locked sticker) | tap locked slot | Unreachable pre-starter |
| `weekly_vote_cast` | `ballot-gremlin` | `AppContext.tsx:2653` (vote cast) | weekly vote cast | Unreachable pre-starter (Voting locked) |
| `first_vote` | `first_vote` | `AppContext.tsx:2654` (vote cast) | first vote | Unreachable pre-starter |

**Finding: the pre-starter modal problem is wider than the four held keys.** Five keys can still fire before the starter is done (`proof_pirate`, `mission_draw`, `evidence_meter_bonus_seen`, `starter_signal_1`, `receipt_approved`), and each one's `MAJOR_REVEAL` modal has the same "View in Dex" button into the locked Dex. The Nov 15 gating fix held only the four camera/note keys. Whichever option Zach picks, the server move is the place to fix this uniformly: one gate in one place, instead of a per-call-site `isOnboardingComplete` check that has already been missed twice (the submit-handler `camera_ready` at `Capture.tsx:1068` was missed by the first gating pass and caught during implementation).

### 1.2 Dead legacy stickers and dead calls (do not migrate these)

`src/constants/discoveryStickers.ts` defines 33 stickers; 16 have **no call site and are not in `PHASE_1_KEYS`**, so `awardDiscoverySticker` would return null for them anyway:

`basecamp-found` (`basecamp_visit`), `rival-spotted` (`rank_radar_open`), `signal-reader` (`weekly_catalyst_read`), `scoreboard-goblin` (`standings_open`), `public-evidence` (`proofs_tab_open`), `stat-rat` (`stats_open`) — the three BigBoard calls are commented out (`BigBoard.tsx:921-923`); `jury-duty` (`tribunal_open`), `field-judge` (`tribunal_vote_cast`), `verdict-viewer` (`results_open`), `votinghub-found` (`votinghub_open`), `tiny-applause` (`proof_like`), `red-string-energy` (`proof_detail_open`), `challenge-flag` (`call_it_out_use`), `photo-witness` (`first_photo_submitted`), `ink-witness` (`first_note_submitted`).

Also dead: `VotingHubPage.tsx:92` calls `unlockDiscoverySticker('tribunal_view', 'voting')`, but `tribunal_view` exists in **neither** `DISCOVERY_STICKERS` **nor** `PHASE_1_KEYS` — it awards nothing today. And there are **two** "Camera Ready" stickers (`camera_ready` achievement + `camera-ready` discovery, `Capture.tsx:342-343` fires both); de-dup was explicitly not approved, so the move carries both forward as-is.

### 1.3 What the legacy write actually does

`awardDiscoverySticker` writes, in one client `updateDoc`:
- `discoveryEvents.{key}: true`, `stickerUnlockHistory: arrayUnion(...)`, `earnedStickers: arrayUnion(structuredSticker)`, `unlockedRewards.stickers: arrayUnion(id)`, `updatedAt`.
- Group completion: two `DISCOVERY_GROUPS` (`dex-discovery`, `mission-basics`), each +50 XP via `increment` and `completedDiscoveryGroups: arrayUnion(groupId)` when the set completes. `mission-basics` = `first-draw`, `camera-ready`, `proof-pirate`, `signal-fragment-missing` — all four are awardable today.
- Idempotency is a client-side pre-check against the (possibly stale) profile: `discoveryEvents[key]` OR `unlockedRewards.stickers` OR `hasEarnedSticker`. A double-submit can double-write `earnedStickers`/`stickerUnlockHistory` (arrayUnion dedupes identical objects, but the history entry's timestamp differs, so it is not identical).
- `stickerService.awardSticker` / `awardStickerForTrigger` / `markEarnedStickersSeen` (the older legacy-field writers in `stickerService.ts`) have **zero call sites** — dead code, delete in either option.

### 1.4 The canonical path, for comparison

- Registry: 42 stickers in `src/data/stickers.ts` (`STICKER_DEFINITIONS`), archetype-based, with a 14-value `StickerAwardTrigger` enum. Rules whitelist (`firestore.rules:357-460`): exactly those 42 IDs and 14 triggers; owner create allowed only with the exact shape (`stickerId`, `unlockedAt == requestTime()`, `source` 1–200 chars, valid trigger, `seen`/`equipped` false); owner update only flips `seen`/`equipped`.
- Award: `unlockStickersForUser` (`stickerService.ts`) — transactional, idempotent (doc-exists check inside the transaction), writes `users/{uid}/stickers/{stickerId}`.
- Live bindings (`STICKER_EVENT_AWARD_IDS`, 8): first submission, first approval, field note, photo proof, weekly vote, crew created, crew joined, zine page. Call sites: `PersonaQuiz.tsx` (starter pack), `AppContext.tsx:2372-2410` (proof events), `crewService.ts` (crew), `proofService.ts` / `submissionService.ts` (first approval), `voteService.ts` (weekly vote), `zineService.ts` (zine page).
- **Canonical awards are silent today.** `runStickerAwardNonBlocking` fires and forgets; nothing calls `queueReward` for them. Only legacy awards celebrate.
- Triggers with **zero callers** in the canonical enum: `weekly_winner`, `challenge_approved`, `archetype_milestone`, `season_milestone`, `admin_grant` (9 registry stickers, including 2 of 3 legendaries, can never be earned today).
- Note: the canonical subcollection rules let an owner self-create any whitelisted sticker with a valid shape — the rules verify *shape*, not that the event happened. Canonical awards are "client-after-trusted-event," not server-verified. The spoof hole the held branch closes is specifically the legacy *fields* (arbitrary XP/field edits ride along in the same `updateDoc`), not the canonical subcollection.

### 1.5 The existing server surface

- **Runtime:** Express monolith, `server.ts` (10,760 lines), bundled by esbuild to `dist/server.cjs`, run on Render (`npm start` → `node dist/server.cjs`). Admin SDK via `src/server/firebaseAdmin.ts` (named database `ai-studio-6bdf91b5-28e9-46f3-ae49-89cf99e2d88a`, `applicationDefault()` credentials — Render-held).
- **Auth:** `authenticate` middleware (`server.ts:513`) — `Authorization: Bearer <ID token>` verified with `authAdmin.verifyIdToken`; optional App Check (`ENFORCE_APP_CHECK` env, off by default). `checkIsAdmin` (`server.ts:8083`) — `hammer808@gmail.com`, two hardcoded UIDs, `admins/{uid}` doc, or `users/{uid}.role === 'admin'`.
- **Rate limiting:** `authRateLimiter` 120 req / 15 min, `adminRateLimiter` 300 / 15 min (`express-rate-limit`).
- **Patterns to copy:** `/api/social/crew/*` (player endpoints: `authRateLimiter` + `authenticate`, uid taken from `req.user.uid`, never from the body); `/api/admin/*` (same + `checkIsAdmin` → 403 `ADMIN_ONLY`); `writeAdminAudit` for admin actions.
- **Closest existing server-side award flow:** `/api/admin/voting/finalize-week` (`server.ts:1553`) — admin-only, computes winners server-side, then `awardWeeklyPointsOnce` (`server.ts:600`) awards XP inside a transaction with a deterministic `eventId` (`weekly_award_{cycle}_{user}_{scope}_{crew}`) for idempotency. **It awards XP only — it never awards the `weekly_winner` stickers**, even though the server is the one place that knows who won. That gap is the template for what the new award path should also fix.
- **No sticker endpoints exist. No `stickerAwards` ledger exists.** `FIELDTRIP_GAME_LOGIC.md:35,321` prescribes both: a `stickerAwards/{awardId}` entity with deterministic IDs `{userId}:{stickerId}`, atomic/idempotent award writes, and "the client may animate an award after observing the persisted result."
- **Client call helper:** `authenticatedFetch` (`src/lib/api.ts:25`) — attaches ID token + App Check (5 s timeout, proceeds without it), 20 s default request timeout.
- **Testability constraint:** `server.ts` is one 10,760-line file and existing server tests mostly slice its source text. Any new award logic must live in an extracted module (e.g. `src/server/stickerAwards.ts`, imported by `server.ts`) or it cannot be unit-tested without booting the whole server.

### 1.6 Celebration and observation wiring

- Today the modal fires synchronously from the client write's return value: `unlockDiscoverySticker` → `awardDiscoverySticker` returns `{ sticker, completedGroups }` → `queueReward({ type: 'sticker', intensity: MAJOR_REVEAL, ... })` (`AppContext.tsx:1784-1800`). The "View in Dex" button is `RewardFeedback.tsx:154-159`.
- The profile is live-synced: `subscribeToProfile` is an `onSnapshot` listener on the user doc (`userService.ts:371`, wired in `AppContext.tsx:1081,1142`). A server-side award that writes the user doc **will** reach the client through this listener — the observe-then-animate pattern the game-logic doc prescribes is viable, but no code today diffs `earnedStickers` and queues a reward from it; that watcher would be new.
- The Dex still reads legacy fields in one place: `Collection.tsx:171` reads `profile.earnedStickers`. `StickerMachine` (mounted by Stage 1) reads the canonical subcollection.

## 2. The honest limit — what "server-side" can and cannot verify

For most legacy triggers the server **cannot independently verify the event**. "Opened the Dex" and "drew a mission" are client-observed facts; the server can only trust the client's claim that they happened. Moving the award server-side still buys real things — the client can no longer write arbitrary fields (no self-granted stickers, no XP/field edits in the same call), the allowlist is enforced in one place, already-earned and starter-gate checks run against fresh server reads, writes are atomic, and every award gets a ledger row — but it does **not** turn a page-view claim into a proven fact. Only triggers backed by server-visible state can be truly verified:

| Trigger | Server-verifiable? | How |
|---|---|---|
| `starter_signal_1`, `receipt_approved`, `starter_signal_3_complete`, `crew_unlocked`, `memories_unlocked` | Yes | Server reads `entries` (approved starter submissions) / `onboardingCompleted` |
| `first_vote`, `weekly_vote_cast` | Yes | Server reads `votes` / `weeklyVotes` for the uid |
| `first_field_note`, `proof_pirate`, `evidence_meter_bonus_seen` | Partially | Server reads `entries` for a submission with a note / photo+note |
| `proof_returned` | Yes | Server reads `proofReviews` for a `needs_more_proof` decision on the uid's proof |
| `camera_ready`, `capture_start` | No | Viewfinder open is client-only; server can only enforce the starter gate + rate limit |
| `mission_draw`, `dex_open`, `dex_discovered`, `sticker_collection_view`, `locked_sticker_tap` | No | Page/tab opens are client-only |

Any design that claims full verification for the "No" rows is overstating it. The endpoint should be presented as *write-path control + ledger*, with verification where the data exists.

## 3. Option A — new server endpoint, legacy fields stay the store

**Shape:** `POST /api/stickers/award` — `authRateLimiter` + `authenticate`, next to `/api/social/crew/*`. Body: `{ discoveryKey, sourcePage, eventId? }`. The uid always comes from `req.user.uid`, never the body.

**Server logic** (new module `src/server/stickerAwards.ts`, imported by `server.ts`):
1. Validate `discoveryKey` against a server-side copy of `PHASE_1_KEYS` (17 keys). Unknown key → 400. Dead keys stay rejected.
2. Enforce the starter gate server-side: the four held keys (`camera_ready`, `capture_start`, `first_field_note`, `proof_returned`) plus the five §1.1 pre-starter-firing keys return `held: true` (or 409 `STARTER_INCOMPLETE`) while `starterComplete` is false — this fixes the pre-starter modal gap in one place instead of per call site.
3. Verify the trigger against server-visible state where §2 says it is possible (entries / votes / proofReviews reads); for unverifiable keys, accept the claim but rate-limit.
4. Read the user doc; if already earned (`discoveryEvents[key]` or `unlockedRewards.stickers`), return `{ awarded: false, alreadyUnlocked: true }` — idempotent, no double-write.
5. One Admin SDK transaction/batch: the same legacy-field writes `discoveryService` does today (`discoveryEvents`, `stickerUnlockHistory`, `earnedStickers`, `unlockedRewards.stickers`), plus group-completion evaluation (`DISCOVERY_GROUPS`, +50 XP) and a `stickerAwards/{userId}:{stickerId}` ledger row (`{ awardId, stickerId, userId, trigger, source, eventId?, awardedAt, awardedBy: 'server' }`, per `FIELDTRIP_GAME_LOGIC.md:321`). Admin SDK bypasses Firestore rules, so the held branch does not affect it.
6. Return `{ awarded: true, sticker, completedGroups }` (same shape the client already consumes).

**Client change:** `unlockDiscoverySticker` in `AppContext.tsx` becomes a thin wrapper around `authenticatedFetch('/api/stickers/award', ...)`; on `awarded: true` it runs the existing `queueReward` block unchanged. All 17+ call sites keep working untouched. The in-flight dedup (`pendingUnlocksRef`) and local already-owns check stay as a fast path.

**Held rules branch:** ships unchanged after its off-VM test pass. Once live, the client physically cannot write the legacy fields, so the endpoint is the only writer (plus admins).

**Reuse:** the same server award function backs Stage 4's `POST /api/admin/stickers/grant` (admin-only, `admin_grant` trigger, `writeAdminAudit`) and the weekly-winner award from `finalize-week` — one function, three callers.

**Files:** `server.ts` (route only), new `src/server/stickerAwards.ts` (allowlist, gate, verification, transaction, ledger), `src/context/AppContext.tsx` (`unlockDiscoverySticker` repoint), delete dead `awardSticker`/`awardStickerForTrigger`/`markEarnedStickersSeen` from `stickerService.ts`, delete `discoveryService.awardDiscoverySticker` (or keep as the server-side write's field builder — decide in build). No registry, rules-whitelist, or Dex changes.

**Tests:** unit tests for `stickerAwards.ts` (allowlist rejection, already-earned idempotency, starter gate, group completion, ledger row written); endpoint tests (401 without token, 403/409 cases, non-admin cannot award for another uid); existing `stickerRules.integration.test.ts` (7 tests, on the held branch) still covers the rules side; emulator rules tests must pass off-VM as before.

## 4. Option B — migrate legacy awards into the canonical subcollection

**Shape:** delete the legacy award path; every legacy key maps to a canonical sticker awarded via the existing `unlockStickersForUser` (transactional, idempotent, rules-whitelisted). Legacy fields stop being written and become unread mirrors (or are dropped in a later cleanup).

**The mapping problem — this is the crux.** The canonical registry's 42 stickers are archetype achievements, not page-visit stickers. Mapping the 17 live legacy keys:

| Legacy key | Canonical target today | Notes |
|---|---|---|
| `first_vote`, `weekly_vote_cast` | `mascota_foam_finger` (`weekly_vote_cast`) | Already bound — no change |
| `first_field_note` | `captain_clipboard_pen_sparkle` (`field_note_added`) | Already bound via proof flow — but the legacy key also fires on *any* noted submission, the canonical one on first note only; same practical effect |
| `camera_ready` / `capture_start` | none | No "opened the camera" sticker in the 42 |
| `proof_returned` | none | No "proof returned" sticker in the 42 |
| `proof_pirate` | none | No photo+note sticker in the 42 |
| `mission_draw` | none | No "drew a mission" sticker in the 42 |
| `evidence_meter_bonus_seen` | none | No meter sticker in the 42 |
| `starter_signal_1`, `receipt_approved` | `captain_clipboard_checkmark_seal` etc. (`first_approval`) | Already bound, but per-archetype variants, not one sticker |
| `starter_signal_3_complete`, `crew_unlocked`, `memories_unlocked` | none as such | No "finished the starter" sticker in the 42 (starter-pack stickers are per-archetype) |
| `dex_open`, `dex_discovered`, `sticker_collection_view`, `locked_sticker_tap` | none | No Dex-visit stickers in the 42 |

So **~10 of the 17 live legacy stickers have no canonical home**. Option B therefore has three sub-variants, and Zach would need to pick one:
- **B1 — Add registry entries.** Add the missing stickers to `src/data/stickers.ts` (+ rules-whitelist IDs + triggers). The 42 becomes ~52. Keeps every legacy sticker, one store, one award path. Cost: registry + rules changes, and the new entries need archetype/collection decisions (the 25-import's cross-pack schema question applies here too).
- **B2 — Drop the homeless ones.** Page-visit stickers with no canonical equivalent stop existing. Directly contradicts the standing call that legacy stickers are KEPT, unless Zach explicitly re-decides for these ten.
- **B3 — Dual store.** Canonical for the mappable ones, legacy fields for the rest. Keeps everything, but the two stores and the spoof hole both survive for the legacy remainder — the held rules branch could not ship as written.

**Other B consequences:**
- **Celebration gap:** canonical awards are silent today (§1.4). Moving legacy awards into the canonical path without adding celebration wiring means the sticker modal disappears entirely — the loudest user-visible regression in this option. A watcher (diff `users/{uid}/stickers` or profile `earnedStickers` via the existing `subscribeToProfile` listener, queue the modal on a new unlock) must be built as part of B, including the legendary-only-modal vs toast split Zach already decided.
- **Group completions** (`dex-discovery`, `mission-basics`, +50 XP each) are legacy-field logic with no canonical equivalent; B must re-implement them as canonical set logic or drop the XP.
- **Starter gate:** the pre-starter modal gap is fixed differently — canonical awards pre-starter would need the same gate, either in `unlockStickerForUser` call sites or in the watcher (don't celebrate pre-starter awards).
- **Reads:** `Collection.tsx:171` (legacy `earnedStickers` read) and `StickerBook` must move to the subcollection; `hasEarnedSticker`'s legacy branches get deleted.
- **Held rules branch:** still ships (it protects the legacy fields, which nobody writes anymore). The create-path check stays valid.

**Files:** `src/data/stickers.ts` (B1: new entries), `src/services/stickerService.ts` (extend `STICKER_DEFINITIONS` / trigger map or add the legacy→canonical map), `src/context/AppContext.tsx` (repoint `unlockDiscoverySticker` → `unlockStickerForUser` + mapping), delete `src/services/discoveryService.ts`, `src/pages/Collection.tsx:171`, `StickerBook` read path, `firestore.rules` (held branch + B1 whitelist additions), new celebration watcher.

**Tests:** mapping test (every live legacy key resolves to exactly one canonical sticker, none dropped silently — B2 excepted by explicit decision); idempotency + already-unlocked tests (existing `unlockStickersForUser` tests); celebration watcher tests (modal fires once per new unlock, not on reload); rules tests as in A.

## 5. Tradeoffs — no pick made

| | Option A: server endpoint, legacy store stays | Option B: canonical migration |
|---|---|---|
| Legacy stickers kept | All 17, unchanged | Only with B1 (+10 registry entries); B2 drops ~10; B3 keeps the hole |
| Spoof hole closed | Yes, by the held rules branch, once the endpoint is the only writer | Yes, by the held rules branch, once nothing writes legacy fields |
| True server verification | Only where server-visible state exists (§2); page-view claims stay trusted | Same limit — canonical rules verify shape, not that the event happened |
| Celebration | Unchanged — existing `queueReward` path, same modal | Must be built — canonical awards are silent today |
| Ledger / audit trail | New `stickerAwards` rows, one per award | Same ledger can be written, but the subcollection doc already exists per award; ledger is additive either way |
| Client change | One function repointed (`unlockDiscoverySticker`) | One function repointed + mapping table + watcher + Dex read changes |
| Registry / rules churn | None (no new IDs) | B1: ~10 new registry IDs + whitelist; B2/B3: none / partial |
| Group completions (+50 XP) | Move the existing logic server-side, unchanged | Re-implement or drop |
| Weekly-winner stickers | Same server award function can be called from `finalize-week` | Same — the server function is needed either way for `weekly_winner` |
| Risk | New endpoint in a 10,760-line monolith; endpoint must be extracted to a testable module | Bigger blast radius: registry, reads, celebration, and the mapping decisions; easiest to silently drop a sticker |
| Future (Stages 3–6) | Leaves two award paths (server endpoint for legacy, client `unlockStickerForUser` for canonical) until Stage 3's evaluator unifies them | One award path sooner; the Stage 3 evaluator and the 25-import both build on the canonical registry directly |

## 6. Interaction with Stage 6 (the 25 new PNGs)

- The 25-import does **not** depend on this move and is not blocked by it: the 25 are canonical-registry stickers (`src/data/stickers.ts` + rules whitelist + `public/assets/stickers/...`), and their metadata draft is still awaiting Zach's red pen plus Limited Edition windows/dates.
- Under **A**, the 25's new triggers (9 need new events per the draft: `proof_returned`, `location_verified`, `chaos_modifier_applied`, `late_night_submission`, `mission_count_milestone`, `new_destination`, full-season evaluation, window check) would need server-side evaluation when they ship — that is Stage 3's rule engine, and the endpoint from A becomes one of its writers. No rework of A is needed, but A does not build the evaluator.
- Under **B**, the 25 import lands on the same single store the legacy migration just created, so the import and the migration share the registry/whitelist mechanics — slightly less total work, at the cost of B's bigger upfront scope.
- Either way, the 25-import's open items (Zach's red pen, Limited Edition dates, trim review of the 4 edge-bleed files, the cross-pack `archetype` schema question) are unchanged by this decision.

## 7. Build sequence, whichever option is picked

1. Kill the dead code first (both options): `awardSticker` / `awardStickerForTrigger` / `markEarnedStickersSeen` (zero call sites), the `tribunal_view` dead call (`VotingHubPage.tsx:92`), and confirm the two "Camera Ready" stickers stay two (already decided).
2. Build the chosen award path + `stickerAwards` ledger (deterministic `{userId}:{stickerId}` IDs).
3. Repoint `unlockDiscoverySticker`; verify every one of the 17 live keys still awards exactly once, and the 5 pre-starter-firing keys no longer produce a modal into the locked Dex.
4. Unit + endpoint/mapping tests; `tsc`; full suite.
5. Push the held rules branch to origin; Zach runs `stickerRules.integration.test.ts` (7 tests) under the emulator on his machine; on pass, merge the branch and deploy rules.
6. Live check on his phone: fresh award → modal → Dex shows the sticker; spoof attempt from the console fails.

## 8. Open questions for Zach

1. **A or B?** (And if B, then B1 / B2 / B3?)
2. Under A, is "write-path control + ledger" (with verification only where the data exists, §2) an acceptable meaning of "server-side," or does he want the page-view triggers dropped/changed so every award is verifiable?
3. Under B1, do the ~10 homeless legacy stickers get new canonical entries (making the registry ~52), or is that scope creep to decide separately?
4. The five pre-starter-firing keys (§1.1): hold their awards until the starter is done (like the camera keys), or let them award but suppress the modal until Dex unlocks?
