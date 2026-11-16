# FIELDTRIP — Stage 5 Design: Celebrations

- **Date:** 2026-11-16
- **Status:** BUILT Nov 16, 2026 — all 8 decisions in §11 approved as recommended; code left uncommitted for verification, then verified independently: tsc clean, 11/11 new tests pass, full non-integration suite 645/647 (2 failures pre-existing — `dataIntegrityAudit` "proof existence and migration state remain separate from Community visibility" and `tribunalSecurity` "Firelight Tribunal page covers locked, lobby, vote booth, waiting, and archive states"), `npm run build` succeeds. No rules change, so no rules deploy is needed. Live check still owed (common toast, rare toast, legendary modal + View in Dex, while-away legendary catch-up, no re-fire on reload).
- **Build notes:** (1) Narrowing `RewardQueueItem.rarity` to 3 levels would have broken tsc at the badge celebration (`AppContext.tsx:1504`, `BadgeRarity` includes `'uncommon'`/`'bureau-secret'`), so the badge call site normalizes via `normalizeLegacyRarity` (`bureau-secret`→`rare`); behavior unchanged, badge intensity is set by `isFirstBadge`, not rarity. (2) The design said `redirectPath` already worked, but it only worked in the non-sticker branch; the sticker branch hardcoded `/dex/collection`. The build wires `reward.redirectPath ?? '/dex/collection'` into the sticker branch, so the legendary modal's `/dex/stickers` redirect takes effect (the button already read "View in Dex"). (3) The `onError` fallback shares a branch with the absent-`imageUrl` case and cannot fire under `renderToStaticMarkup`, so renderer tests cover img-render and absent-imageUrl only. (4) The watcher effect's `queueReward` closure captures the `sessionSeenRewards` set from the render at sign-in, so the session-limit `has()` check can read stale state for watcher-queued rewards; this cannot wrongly downgrade a sticker (distinct legendaries have distinct per-sticker keys, and repeats are already blocked by the baseline + `persistentKey`).
- **Scope:** Stage 5 per the audit (§10.4 step 6): wire canonical awards into celebrations, with real artwork, legendary-only full-screen modal. The celebration system itself already exists — this stage wires into it, it does not build a new one.
- **Companion docs:** `docs/sticker-system-audit.md` (§5, §10.4 step 6), `docs/sticker-stage3-design.md` (evaluator + weekly-winner wiring), `docs/sticker-stage4-design.md` (§0, §3 — grants are silent; "Stage 5's problem to improve").

## Decisions already made (do not re-litigate)

- Rarity is 3 levels: common / rare / legendary (26 / 13 / 3 across the 42).
- Full-screen celebration modal for legendary only; rare/common get a toast (Zach, Nov 15).
- The 25 new PNGs are a Stage 6 import. Stage 5 covers the canonical 42 only — but the wiring is rarity-driven through the registry, so the 25 get celebrations automatically when they land in Stage 6, with no Stage 5 rework.
- Canonical awards stay silent through Stage 4. Stage 5 is the first stage that celebrates them.
- The `rewardAnimationIntensity` preference (`full` / `reduced` / `minimal`) is respected as-is: `minimal` sends even major reveals to toasts. A legendary modal does not override a player's explicit preference.

## 0. Current state (as found, post–Stage 4)

- **The celebration system exists and is global.** `RewardFeedback` (`src/components/RewardFeedback.tsx`, mounted in `src/App.tsx:494`) reads `rewardQueue` from `AppContext`. `MAJOR_REVEAL` items render a full-screen modal (one at a time); everything else renders as toasts (MEDIUM auto-dismisses after 4s, MICRO after 2.5s). `queueReward` / `dismissReward` live in `AppContext.tsx:2585-2611`.
- **The queue already has the two mechanisms Stage 5 needs.** (1) `persistentKey`: if set and `localStorage[persistentKey] === 'true'`, the reward is never queued; `dismissReward` writes the key on dismiss. Once-ever-per-device, no server state, no rules change. One precedent exists: `STARTER_COMPLETION_REWARD_ACK_KEY` (`AppContext.tsx:1579`). (2) A session limit: the first `MAJOR_REVEAL` of a given `type` per session shows the modal; a second one of the same type is downgraded to MEDIUM (`AppContext.tsx:2590-2596`, tracked in `sessionSeenRewards`, `:346`). This matters for §7.
- **Only the legacy path celebrates — and it celebrates everything.** `unlockDiscoverySticker` (`AppContext.tsx:1765-1830`) queues `MAJOR_REVEAL` for every legacy sticker awarded, plus a second `MAJOR_REVEAL` on set completion. The canonical path queues nothing: `unlockStickersForUser` call sites (via `evaluateStickerTriggers`, called from `AppContext.tsx:2388-2422`, `proofService`, `submissionService`, `voteService`, `crewService`, `zineService`) and the two server-side writers (weekly winner via `finalize-week`, admin grants via Stage 4) produce no reward at all. The audit's word for this is "inverted" (§5): the least meaningful stickers (page visits) get the full-screen modal; the most meaningful (first approval, weekly vote, crew) earn in silence.
- **The modal and the toast show a generic icon, never the art.** Both `MajorReveal` and `RewardToast` render `reward.iconName` (a Lucide icon). There is no `<img>` / `imageUrl` in `RewardFeedback.tsx`. All 42 canonical `imageUrl`s were verified Nov 16 to resolve to real files under `public/assets/stickers/` (0 missing, script-checked) — the art is in the bundle, the celebration just doesn't show it. This is audit §5's "celebration is faked in the other direction."
- **No live listener on the stickers subcollection exists.** `StickerMachine` loads one-shot via `getUserUnlockedStickers(userId)` on mount. A grant or weekly win that lands while the player is in the app is invisible until they reload the Dex.
- **`seen` means "viewed in the Dex."** Sticker docs are created `seen: false` (`stickerService.ts:332`); `markStickerSeen` (`:375-400`) flips it when the player opens the sticker's detail modal (`StickerMachine.tsx:117-119`). The Dex "New" badge keys off it.
- **The rules forbid a Firestore "celebrated" marker without a rules change.** Owner update of a sticker doc is allowed only when the changed keys are a subset of `{seen, equipped}` and `seen` only goes `false → true` (`firestore.rules`, `isValidStickerPreferenceUpdate`). A `celebratedAt` field on the sticker doc would need a rules update, an emulator test, and a deploy. The design below avoids it entirely (persistentKey + `seen`, §1, §4).
- **The queue-item rarity type is stale.** `RewardQueueItem.rarity` (`src/types/feedback.ts:14`) is `'common' | 'uncommon' | 'rare' | 'bureau-secret'` — `uncommon` predates the 3-level collapse, `legendary` is missing, and `bureau-secret` is unused anywhere in `src/`. (`uncommon` still exists in the legacy `discoveryStickers.ts` and `rewardRegistry.ts` types; those are left alone — only the queue-item type is fixed, with legacy rarities mapped through the collapse: `uncommon → common`.)
- **The burst case is real.** The weekly winner awards two stickers at once: Confetti Burst (`rare`) + Victory Flag (`legendary`). Any design must sequence one modal + one toast, not two modals or a dropped award.

## 1. The watcher — one snapshot listener in AppContext (recommended)

New `useEffect` in `AppContext`, attached when a user signs in, detached on sign-out, listening to `users/{uid}/stickers` (`onSnapshot` on the subcollection — owner read is allowed by the rules).

On each snapshot, for every doc the watcher has not processed before:

1. Look the sticker up in the registry (`getStickerById`). Unknown id → skip (defensive; cannot happen while the rules whitelist matches the registry).
2. Queue a celebration (§2) with `persistentKey: 'sticker-celebration:{uid}:{stickerId}'`. `queueReward` itself enforces once-per-device: an already-dismissed celebration is never re-queued, so a reload, a listener re-attach, or a second device (after its own dismiss) can never re-fire it.
3. Never touch `seen`. The celebration is the moment; the Dex "New" badge survives until the player actually views the sticker. This keeps `seen` meaning exactly one thing.

**Baseline (the backlog problem).** At attach, the watcher records the set of owned sticker ids and does **not** celebrate them — except the legendary catch-up in §4. Without this, the first load after Stage 5 ships would fire a celebration for every sticker a player already owns (Zach's account alone holds 7, most unseen). Docs added after attach celebrate in the moment.

**Why a watcher, not return-value wiring at the award call sites.** There are 8+ client call sites across 6 files (`evaluateStickerTriggers` consumers + `unlockStickersForUser` callers), and two server-side writers (finalize-week weekly winner, Stage 4 admin grants) that no client call site can ever see. Wiring each call site would touch all of them and still miss every server-side award. One watcher covers every award source — present and future — with no per-call-site changes. The only cost is latency: the celebration fires on the Firestore write round-trip (typically well under a second), not synchronously with the awarding action. For a celebration, that is fine.

**Why not key the catch-up off `seen` alone.** The audit's Stage 5 note suggests "`seen` reconciliation on login for previously-unseen awards." That would celebrate every unseen sticker on login — including the whole pre-Stage-5 backlog — and it would need the celebration to mark `seen` to avoid re-firing, which would clear the Dex "New" badge for a sticker the player only glimpsed in a toast. The persistentKey mechanism gives once-per-device without touching `seen` or the rules, and §4 narrows the on-load catch-up to legendaries only.

## 2. Intensity mapping — rarity decides, everywhere

| Rarity | Reward | Treatment |
|---|---|---|
| legendary (3) | `MAJOR_REVEAL` | Full-screen modal, real artwork (§3) |
| rare (13) | `MEDIUM_REWARD` | Toast with thumbnail art, sticker name |
| common (26) | `MICRO_FEEDBACK` | Small toast pill with thumbnail art, sticker name |

The mapping is a single helper (`celebrationIntensityForRarity(rarity)`) used by the watcher **and** by the legacy path (§5), so the rule "legendary only gets the modal" holds for every sticker in the app, not just canonical ones. Non-sticker rewards (badges, ranks, milestones — the other `MAJOR_REVEAL` call sites in `AppContext.tsx:1479, 1499, 1572`) are untouched; this stage is about stickers.

**Fix the stale type.** `RewardQueueItem.rarity` becomes `'common' | 'rare' | 'legendary'`. `MajorReveal` / `RewardToast` render the rarity pill from it (legendary gets the orange pill, matching `StickerCard` / `StickerDetailModal`).

## 3. Real artwork in the celebration

- Add optional `imageUrl?: string` to `RewardQueueItem`. The watcher and the legacy path pass `sticker.imageUrl` from the registry.
- `MajorReveal` renders the art large (`object-contain` in the existing square frame convention) with the sticker name, collection, and rarity pill. `RewardToast` renders a small thumbnail next to the name.
- **Fallback, not failure:** if `imageUrl` is absent or the image errors (`onError`), render the Lucide icon as today. A missing file must never break the modal. (All 42 resolve today; the fallback is for Stage 6 regressions and stale registry entries.)
- No new art assets. Stage 5 uses the 42 existing files; the 25 Stage 6 PNGs are out of scope.

## 4. The legendary catch-up — awards that land while the player is away (recommended: legendary-only)

A weekly win or an admin grant usually lands while the player is not in the app. Under a strict in-the-moment-only watcher, the Victory Flag — one of only 3 legendaries — would never get its full-screen moment, because `finalize-week` runs server-side. The Dex "New" badge alone is a poor substitute for the rarest award in the game.

**Recommended (option C):** at listener attach, in addition to baselining, queue `MAJOR_REVEAL` modals for owned stickers that are (a) `legendary`, (b) `seen: false`, (c) not already celebrated on this device (enforced by `persistentKey` — the watcher queues them blindly and `queueReward` skips the dismissed ones). Common/rare stickers from while away get no on-load celebration; they show as "New" in the Dex. At most 3 modals can ever queue this way (only 3 legendaries exist), in `unlockedAt` order.

Alternatives:

- **A — In-the-moment only.** No on-load catch-up at all. Simplest, no edge cases. Cost: server-side legendaries never get a modal.
- **B — Catch up all rarities on load.** Every unseen sticker celebrates on next open. Cost: the first load after deploy fires a burst (up to 42 toasts/modals across players with backlogs), and every while-away award — including trivial ones — interrupts the next session.
- **C — Legendary-only catch-up (recommended).** The interruption budget is spent only where it matters.

**First-load-after-deploy behavior under C:** a player with an unseen legendary gets that modal once on their next open (desired — it is the catch-up). A player with only unseen commons/rares gets nothing new at load. No migration script, no seeding step.

## 5. The legacy demotion — fix the inversion

`unlockDiscoverySticker` currently queues `MAJOR_REVEAL` for every legacy sticker. Under §2 it queues by the legacy sticker's rarity instead (mapped through the collapse: `uncommon → common`). A page-visit sticker becomes a micro toast; a rare legacy sticker becomes a medium toast. The `queueReward` call already passes `rarity: sticker.rarity` — the change is the intensity argument, not the plumbing.

Set completions (`SET COMPLETE: {name}`, +50 XP) are the open question — see §11.3. They are milestones with XP, not stickers, and the recommendation is to keep them as `MAJOR_REVEAL`.

## 6. What the modal and the toast show

**Legendary modal:** sticker art (large), name, collection shelf, rarity pill, registry description. Two actions: "View in Dex" (dismisses and navigates to `/dex/stickers`) and Dismiss (X / tap outside). See §11.4.

**Rare toast (MEDIUM):** thumbnail art, sticker name, collection. Auto-dismiss 4s (existing).

**Common toast (MICRO):** thumbnail art, sticker name. Auto-dismiss 2.5s (existing).

The modal does **not** show how-to-earn / `unlockReason` — that stays in the Dex detail modal, which "View in Dex" leads to. The celebration is the moment; the Dex is the record.

## 7. Queue behavior — bursts, the session limit, interruption

- **Bursts.** The weekly-winner burst (rare toast + legendary modal) queues in `unlockedAt` order; `RewardFeedback` already shows one modal at a time and stacks toasts, so no new sequencing logic is needed. If a burst contains two legendaries (possible in principle from a single approval evaluation), both queue as modals in order.
- **The session limit vs. legendaries.** `queueReward` downgrades the second `MAJOR_REVEAL` of the same `type` in a session to MEDIUM. Every sticker reward has `type: 'sticker'`, so a second legendary in one session would lose its modal today. Recommendation: key the session limit by `type + stickerId` (from `metadata.stickerId`) instead of `type` alone. Each sticker is awarded once ever, so the limit can never fire for two *different* legendaries, and still guards against a repeated queue of the *same* sticker in one session. See §11.7.
- **Interruption.** The modal pops wherever the player is — including mid-capture — the moment the award lands. That is the existing queue behavior, and for a once-ever legendary it is the point. See §11.5 for the deferral alternative.
- **Preference.** `minimal` intensity sends legendaries to toasts, as today. No change.

## 8. Build sequence

1. **Types + renderers first.** Fix `RewardQueueItem.rarity` to the 3 levels; add `imageUrl`; render art (with icon fallback) in `MajorReveal` and `RewardToast`.
2. **Mapping helper + legacy demotion.** `celebrationIntensityForRarity`; rewire `unlockDiscoverySticker` to use it (sticker + set-completion handling per §11.3).
3. **Watcher.** `onSnapshot` listener in `AppContext` (attach on sign-in, detach on sign-out), baseline-at-attach, legendary catch-up (§4), persistentKey per sticker.
4. **Session-limit keying** per §11.7.
5. **Verify:** `tsc`, full non-integration suite (expect the same 2 pre-existing failures — `dataIntegrityAudit` "proof existence and migration state remain separate from Community visibility" and `tribunalSecurity` "Firelight Tribunal page covers locked, lobby, vote booth, waiting, and archive states"), `npm run build`.
6. **Commit + push main** (own paths only, never `-A` — another chat works in this tree). **No rules change, so no rules deploy is needed.**
7. **Live check:** on Render, earn a common sticker (toast, art thumbnail, no re-fire on reload), earn a rare sticker (medium toast), trigger a legendary (modal with art, "View in Dex" works), grant a legendary to a test player while they are away (modal on next open), grant a common while away (no modal, "New" in Dex). Confirm no celebration repeats after reload or re-login.

## 9. Test plan

- **Watcher unit tests** (pure diff function, no Firestore): new doc after baseline → celebrates by rarity; doc present at attach → skipped (except unseen legendary, §4); already-dismissed persistentKey → skipped; unknown sticker id → skipped; listener re-attach → no re-fire.
- **Mapping tests:** legendary → MAJOR_REVEAL, rare → MEDIUM, common → MICRO; legacy `uncommon` → MICRO.
- **Session-limit tests:** two distinct legendaries in one session both stay MAJOR_REVEAL; the same sticker queued twice in one session downgrades the second.
- **Renderer tests:** art `<img>` rendered when `imageUrl` present; icon fallback when absent or on error; rarity pill correct per level.
- **Legacy demotion tests:** `unlockDiscoverySticker` queues MICRO for a common legacy sticker (was MAJOR_REVEAL).
- **No-re-fire tests:** simulated reload (fresh baseline) after dismiss → nothing queued; simulated second device (fresh localStorage) → legendary queues once.
- **Regression:** existing reward/feedback tests unchanged; `stickerRules.integration.test.ts` untouched (no rules change).

## 10. What Stage 5 deliberately does NOT do

- **Stage 6 import** — no new registry entries, triggers, windows, or secrets. The 25 get celebrations free via the registry lookup.
- **Server-side canonical awards** — the `admin_grant` self-issue hole and the client canonical award path are untouched; the watcher only *observes* awards, it does not re-route them.
- **Rules changes** — none. The watcher reads (owner read allowed); celebrations write nothing to Firestore; `seen` is untouched by celebrations. (Footnote: a Firestore `celebratedAt` marker was considered and rejected — it would need a rules change for a record localStorage already provides.)
- **Dex changes** — `StickerMachine` / `StickerDetailModal` stay as-is; "View in Dex" only navigates.
- **New art assets** — the 42 existing files; no generated art in this stage.
- **Badge/rank/milestone celebrations** — non-sticker `MAJOR_REVEAL` call sites keep their current behavior, except the set-completion question in §11.3.
- **Revoke** — Stage 4's deferred item, unchanged.

## 11. Decisions needed from Zach

1. **Watcher: single snapshot watcher in AppContext (recommended)** vs return-value wiring at the 8+ award call sites vs hybrid (both). The watcher covers server-side awards (weekly winner, grants) that call-site wiring can never see; the cost is sub-second latency instead of synchronous celebration.
2. **While-away awards: C — legendary-only catch-up on next open (recommended)** vs A — in-the-moment only (server-side legendaries never get a modal) vs B — catch up all rarities on load (burst risk on first load after deploy).
3. **Set completions (+50 XP): keep `MAJOR_REVEAL` (recommended)** — they are milestones with XP, not stickers, and the "legendary only" rule is about stickers — vs demote to MEDIUM toast under a strict reading of "legendary only gets the modal."
4. **Legendary modal action: Dismiss + "View in Dex" (recommended)** vs Dismiss only.
5. **Interruption: modal pops immediately wherever the player is (recommended, existing queue behavior)** vs defer the modal until the next navigation (toasts still fire immediately). The deferral avoids popping over the camera mid-capture, but delays the moment.
6. **Toast split: rare → MEDIUM, common → MICRO (recommended)** vs all non-legendary → MEDIUM.
7. **Session limit: key by `type + stickerId` (recommended)** so two distinct legendaries in one session each get their modal, vs keep the current per-type downgrade (second legendary in a session becomes a toast).
8. **Acknowledge the limits (no fork; needs eyes).** Celebrations are client-side and per-device: a player who never opens the app never sees the modal (the Dex "New" badge is the fallback), and the once-per-device record lives in localStorage, so a second device shows a legendary modal once too. No rules change is needed precisely because nothing about celebrations is server-enforced.
