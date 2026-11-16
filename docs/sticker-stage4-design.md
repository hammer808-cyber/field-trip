# FIELDTRIP — Stage 4 Design: Admin Sticker Grants

- **Date:** 2026-11-16
- **Status:** BUILT Nov 16, 2026 — all 10 decisions in §9 approved as recommended; code left uncommitted for verification. Verified: 28/28 new tests pass, full non-integration suite 588/590 (2 failures pre-existing — `dataIntegrityAudit` "proof existence and migration state remain separate from Community visibility" and `tribunalSecurity` "Firelight Tribunal page covers locked, lobby, vote booth, waiting, and archive states"), tsc clean, `npm run build` succeeds. No rules change, so no rules deploy is needed. Live check still owed (grant as admin on Render, already-owned retry, history row, non-admin 403).
- **Build notes:** (1) The already-owned check is the transaction itself, not a separate pre-read — there is no user state to consult without an extra round trip, and the transaction re-checks sticker doc OR ledger row atomically. (2) Grant history uses a `where('action', '==', 'grant_sticker')` query with NO `orderBy` (a `where` + `orderBy` on different fields would need a composite index); rows are sorted newest-first client-side. (3) The client reason-length constant is duplicated in `stickerAdminService.ts` rather than imported from the server module, so the client bundle never pulls in `firebase-admin`; a test asserts the two values agree.
- **Scope:** Stage 4 per the audit (§10.4 step 7): `POST /api/admin/stickers/grant` + admin UI. The `stickerAwards` ledger already exists from Option A; this stage adds its first admin writer and the UI that calls it.
- **Companion docs:** `docs/sticker-system-audit.md` (§3.2, §10.4 step 7), `docs/sticker-server-awards-design.md` (Option A), `docs/sticker-stage3-design.md` (§8 — ledger rows for client canonical awards, revisited here in §5).

## Decisions already made (do not re-litigate)

- Rarity is 3 levels: common / rare / legendary.
- The 6 collections are Explorer, Adventure, Achievement, Social, Chaos, Limited Edition (Stage 3, Scheme A).
- Legacy awards go through `POST /api/stickers/award` (self-only, uid from the token); rules are live and closed to client self-grants of the legacy fields.
- The 25 new PNGs are a Stage 6 import. No new stickers, triggers, or rules changes in Stage 4.
- Canonical awards stay silent in Stage 4 (celebrations are Stage 5). A grant appears in the player's Dex; it does not pop a modal.
- The audit prescribes this endpoint explicitly (audit §10.4 step 7): admin-only, `admin_grant` trigger, `writeAdminAudit`, deterministic award ID `{userId}:{stickerId}`.

## 0. Current state (as found, post–Stage 3)

- **No grant path exists.** The `admin_grant` trigger is whitelisted in the rules (`firestore.rules:454`) and in the client trigger list (`stickerService.ts:138`), but **zero stickers in the registry carry it** (trigger distribution: starter_pack 18, first_approval 3, challenge_approved 3, weekly_winner 2, archetype/season milestone 2 each, the rest 1–2) and no code passes it. An admin grant today is impossible except by hand-editing Firestore.
- **The ledger exists and has two server writers.** `stickerAwards/{userId}:{stickerId}` — one row per sticker per user, ever — is written by `src/server/stickerAwards.ts` (legacy) and `src/server/canonicalStickerAwards.ts` (weekly winner). Row shape: `{ awardId, stickerId, userId, trigger, source, eventId, awardedAt, awardedBy: 'server', verifiedBy? }`. No client code reads or writes it.
- **The ledger has no rules entry.** `firestore.rules` contains no `match /stickerAwards/...` block, so clients get default-deny on both read and write. This matters twice: the grant-history view cannot read the ledger from the client (§3), and the client canonical path cannot write its own ledger rows (§5).
- **Admin auth is settled.** `checkIsAdmin` (`server.ts:8134`) — hammer808@gmail.com, two hardcoded UIDs, `admins/{uid}` doc, or `users/{uid}.role === 'admin'` — plus `requireAdminUser(req)` (`server.ts:8194`, throws on non-admin) and `writeAdminAudit(adminId, targetId, targetType, action, metadata)` (`server.ts:590`, appends to `adminLogs`). `adminLogs` rules: read/create admin-only, update/delete denied. Admin routes use `adminRateLimiter` (300/15 min) + `authenticate`.
- **Closest precedents.** `POST /api/admin/grant-starter-bypass` (`server.ts:8703`): admin-only, `targetUid` from the body, `reason` field (defaults when missing), 404 `USER_NOT_FOUND`, writes + an `adminRepairLogs` entry. `POST /api/admin/soft-reset-user` (`server.ts:4064`): admin-only, `confirmReset` gate, accepts targetUserId/email/username with 404s per lookup. `GET /api/admin/user-lookup` (`server.ts:3419`): admin-only, `?q=` over UID/email/username/display name, returns up to 10 serialized users — **exists server-side but has no UI calling it**.
- **The admin UI has no working player page.** `src/pages/AdminUsers.tsx` (52 lines) is a stub: three `ModuleCard`s ("Agent Search", "Role Management", "Manual XP Adjustment") with empty `onClick`s and an "Agent Roster Module Construction" placeholder. `AdminBoard.tsx` (`/admin`) is a live hub of `ModuleCard`s linking to `/admin/*` routes; "User Control Panel" already links to `/admin/users`. Admin client calls go through services wrapping `authenticatedFetch` (`adminOperationsService.ts`, `moderationService.ts`, `adminService.ts`) — the pattern to copy.
- **Rules shape for the sticker doc** (`firestore.rules:391-494`): owner create allowed only with the exact keys (`stickerId`, `unlockedAt`, `source` 1–200 chars, `trigger` from the 14-value list including `admin_grant`, `seen`/`equipped` false); admin create allowed unconditionally; admin read of any player's `users/{uid}/stickers` allowed (`allow read: if isSignedIn() && (uId == request.auth.uid || isAdmin())`); admin delete allowed. The Admin SDK bypasses rules anyway.
- **Player-side visibility.** `StickerMachine` loads unlocks one-shot on mount via `getUserUnlockedStickers(userId)` — no live listener on the stickers subcollection. A grant lands in the player's Dex on their next Dex load, shown as unseen (`seen: false`). No celebration wiring exists for canonical awards (Stage 5).
- **Known limit, stated plainly (audit §3.2):** the rules validate the `admin_grant` trigger *string*, not the caller's role. Any player can self-issue any whitelisted sticker with `trigger: 'admin_grant'` through the client create path today. Stage 4 does **not** close that hole — closing it means removing owner-create from the canonical subcollection, which would break the client canonical award path (`unlockStickersForUser`). What Stage 4 does is make real grants *distinguishable*: a genuine grant has a ledger row (`awardedBy: 'admin'`, `adminUid`, `reason`) plus an `adminLogs` entry; a self-issue has a sticker doc and nothing else. Closing the hole itself (moving canonical awards server-side) is a future stage, not this one.

## 1. The endpoint — `POST /api/admin/stickers/grant`

New extracted module `src/server/stickerGrants.ts` (same rule as Options A/Stage 3: no award logic inline in `server.ts`; dependency-injected store so unit tests run against an in-memory fake). Route only in `server.ts`, next to the other admin routes:

```
app.post("/api/admin/stickers/grant", adminRateLimiter, authenticate, createStickerGrantHandler(() => (dbAdmin ? createAdminStickerGrantStore(dbAdmin) : null)));
```

### Request

```json
{ "targetUid": "<uid>", "stickerId": "<registry id>", "reason": "<1-200 chars>" }
```

- `targetUid` comes from the body (unlike `/api/stickers/award`, where the uid comes from the token — an admin acts on *other* players). Uid-only, no email/username fallback: the UI resolves the player first via `/api/admin/user-lookup` and passes the uid. This matches `grant-starter-bypass`; `soft-reset-user`'s multi-field lookup is the exception, not the pattern.
- `stickerId` must be in the registry (`getStickerById`). Canonical 42 only (§9.7). The 25 Stage 6 stickers become grantable automatically when they land in the registry — no endpoint change — but only *after* Stage 6, since the Dex resolves stickers through the registry.
- `reason` is **required**, 1–200 chars, free text. The whole point of a grant is a human-readable audit trail; a defaulted reason (`grant-starter-bypass` defaults to "Admin Starter Signals bypass.") would defeat it. Examples: "Missed weekly_winner — finalize bug Nov 16", "Compensation for lost sticker after reset".

### Server logic (orchestrator `grantStickerServer`, in order)

1. **Admin check.** `requireAdminUser(req)` / `checkIsAdmin` — non-admin → 403 `ADMIN_ONLY`, even when the target is the caller's own uid. The endpoint is admin-only regardless of target.
2. **Validate the sticker** against the registry. Unknown id → 400 `UNKNOWN_STICKER_ID`. (No trigger check is needed: the grant *is* the trigger; the sticker's natural `awardTrigger` is irrelevant. No sticker in the registry carries `admin_grant` today — that is expected, not an error.)
3. **Target must exist.** `users/{targetUid}` read; missing → 404 `USER_NOT_FOUND`.
4. **Reason required.** Missing/blank/over 200 chars → 400 `MISSING_REASON` / `REASON_TOO_LONG`.
5. **Already-owned fast path** (transaction re-checks atomically): if the sticker doc or the ledger row already exists → 200 `{ awarded: false, alreadyUnlocked: true, sticker }`. Idempotent no-op, not an error (§9.6) — same shape as `/api/stickers/award`, so double-clicks and retried requests are safe.
6. **Starter gate: admin override — no gate.** A grant bypasses the starter gate by design (§9.2). The grant's main uses are fixing a missed award and rewarding out-of-band; gating it would make it useless for exactly those cases. The override is recorded, not hidden: the ledger row and `adminLogs` entry carry `adminUid` + `reason`, so any grant to a pre-starter player is visible in history.
7. **One Admin SDK transaction:** create `users/{targetUid}/stickers/{stickerId}` with the exact canonical shape — `{ stickerId, unlockedAt: serverTimestamp(), source: 'admin_grant', trigger: 'admin_grant', seen: false, equipped: false }` — plus the ledger row `stickerAwards/{targetUid}:{stickerId}`: `{ awardId, stickerId, userId: targetUid, trigger: 'admin_grant', source: 'admin_grant', eventId: null, awardedAt: serverTimestamp(), awardedBy: 'admin', adminUid, reason }`. No `verifiedBy` field: the other modules' `verifiedBy` (`server-state` | `client-claim`) describes trigger verification, which does not apply here — the admin's judgment *is* the verification, recorded as `adminUid` + `reason`.
8. **No XP, no group evaluation.** Canonical awards carry no XP (unlike legacy discovery groups, +50 XP). The grant awards only the sticker.
9. **`adminLogs` after the transaction commits.** The handler calls `writeAdminAudit(adminUid, targetUid, 'user', 'grant_sticker', { stickerId, reason })` on `awarded: true`. Best-effort: if the audit write throws, log server-side and still return success — the ledger row (written atomically with the award) is the source of truth; failing a completed grant over a logging failure would leave the sticker granted while the client reports failure, and a retry would then hit `alreadyUnlocked`. This matches the existing pattern (finalize-week audits after its awards).

### Response

- Success: `{ awarded: true, sticker: { id, name, collection, rarity }, alreadyUnlocked: false }`
- Already owned: `{ awarded: false, alreadyUnlocked: true, sticker }` (200)
- Errors: 401 `UNAUTHORIZED` (no token), 403 `ADMIN_ONLY`, 400 `MISSING_TARGET_UID` / `UNKNOWN_STICKER_ID` / `MISSING_REASON` / `REASON_TOO_LONG`, 404 `USER_NOT_FOUND`, 500 `DB_ADMIN_NOT_READY` / `STICKER_GRANT_FAILED`.

## 2. The ledger and the audit trail — what proves a grant is real

Three records, three jobs:

| Record | Writer | Job |
|---|---|---|
| Sticker doc `users/{uid}/stickers/{id}` | Grant transaction | What the player owns; what the Dex renders |
| Ledger row `stickerAwards/{uid}:{id}` | Grant transaction (atomic with the doc) | Machine-readable proof this award came from an admin: `awardedBy: 'admin'`, `adminUid`, `reason`, `awardedAt` |
| `adminLogs` entry (`grant_sticker`) | Handler, after commit | Human-readable history the admin UI displays |

Because the ledger is one row per sticker per user, a second grant of the same sticker can never create a second row — the already-owned check fires first. This is also why revoke is deferred (§4): revoke-then-regrant would have to decide whether to delete, overwrite, or version the single row, and that decision should not be made inside the grant build.

The ledger row is what lets a future audit distinguish a real grant from the §0 self-issue hole: sticker doc with `trigger: 'admin_grant'` **and** a ledger row with `awardedBy: 'admin'` = genuine; sticker doc alone = self-issued. The grant-history view (§3) reads `adminLogs`, not the ledger — the ledger is not client-readable (no rules entry) and is the machine record, not the display record.

## 3. Admin UI

**Home: `AdminUsers` (`/admin/users`), as its first working module (§9.5).** The grant flow is player-centric — pick a player, then a sticker — and AdminUsers is the player page; a separate `/admin/stickers` route would duplicate the player lookup, and the audit's alternative ("a section in AdminSettings/AdminDecks") fits worse. No new `AdminBoard` card is needed: "User Control Panel" already links to `/admin/users`. The page keeps the `AdminLayout` + `ModuleCard` shell; the grant module replaces the dead "Agent Search" card's empty `onClick`, and the other two stub cards ("Role Management", "Manual XP Adjustment") stay stubs.

**Flow (one page, four steps, then history):**

1. **Find the player.** Search box (UID, email, username, or display name) → `GET /api/admin/user-lookup?q=` through a service function (§3, client). Results list (up to 10, as the endpoint returns); selecting one renders a player card: name, email, uid, starter count, total XP, owned sticker count (`n / 42`, from step 2). No client-side users collection scan — the endpoint exists precisely for this.
2. **Show what they own.** `getUserUnlockedStickers(targetUid)` — a direct subcollection read, allowed for admins by the rules. Owned stickers render disabled with an "Owned" badge in the picker; per-collection owned counts (`n / m`) come from the same read, no extra queries.
3. **Pick the sticker.** Catalog grouped by collection shelves, in shelf order, reusing `COLLECTION_SHELF_ORDER`, `COLLECTION_META`, and `getStickersByCollection` — the same grouping the player sees in the Dex, so the admin and the player mean the same thing by a shelf. Search box filters by name or id (42 stickers now, 67 after Stage 6 — a flat list does not scale). Legendary stickers get a visual flag and a highlighted line on the confirm screen ("Legendary — only 3 exist"), but no extra gate: the confirm step is the gate.
4. **Reason + confirm.** Required reason field (1–200 chars, counter shown), then a confirm screen: player, sticker (name, collection, rarity), reason, and a Confirm button. Confirm is mandatory for every grant — there is no one-click grant from the picker. Result panel: success ("Granted — {sticker} to {player}"), already-owned ("{player} already owns this sticker — nothing changed"), or the error code with its message.
5. **Grant history, below the form.** Client query on `adminLogs` (`where('action', '==', 'grant_sticker')`, `orderBy('createdAt', 'desc')`, limit 50) — readable by admins under the rules, no new endpoint needed. Rows: time, granting admin, player, sticker, reason. This is why the history reads `adminLogs` and not the ledger: the ledger is not client-readable, and `adminLogs` is the human record by design.

**Service layer.** New `src/services/stickerAdminService.ts`: `lookupPlayers(query)`, `grantSticker({ targetUid, stickerId, reason })`, `getGrantHistory(limit)` — thin wrappers over `authenticatedFetch` / the Firestore query, following `moderationService.ts` / `adminOperationsService.ts`. No fetch calls inline in the page component.

**What the player sees.** Nothing in real time: no celebration in Stage 4, no live listener on the stickers subcollection. The granted sticker appears in their Dex on next load, marked unseen (`seen: false`) — the same "New" treatment any fresh award gets. If the player has the Dex open when the grant lands, they see it after navigating away and back. That is acceptable for an admin repair tool and is Stage 5's problem to improve, not Stage 4's.

## 4. Revoke — grant-only in Stage 4 (recommended)

Stage 4 is **grant-only** (§9.1). A wrong grant (wrong sticker, wrong player) cannot be undone through the UI in v1; the admin can delete the sticker doc directly in the Firebase console (rules allow admin delete) as the escape hatch. Reasons to defer revoke rather than build it now:

- **Ledger semantics are genuinely undecided.** The ledger is one row per sticker per user. Revoke must choose: delete the row (destroys the audit trail), keep the row (then a later re-grant looks already-owned unless the code treats "row exists but sticker doc deleted" as grantable), or add a revocation marker (new schema). Each choice changes the grant's already-owned check.
- **It doubles the UI surface** (un-grant affordance, its own confirm, history states for revoked grants) for a case that is, in practice, one admin correcting their own typo.
- **The console escape hatch exists** and is proportionate for a single-admin app.

**Revoke shape, defined now so it can be added without rework:** `POST /api/admin/stickers/revoke` (`{ targetUid, stickerId, reason }`, required), admin-only, deletes `users/{uid}/stickers/{stickerId}` in a transaction, keeps the ledger row (history) and writes `adminLogs` `revoke_sticker` with the reason; a later re-grant of the same sticker checks the sticker doc (absent → grantable) rather than the ledger row. That last clause is the design decision revoke forces — it is specified here, not built here.

## 5. The client-ledger question — Stage 3 §8, revisited

Stage 3 §8 said the client canonical path "gets its ledger write in Stage 4, in the same transaction as the unlock." That assumption does not survive contact with the rules and the trust model. **Recommendation: do not add ledger rows for client-side canonical awards in Stage 4** (option D below). The ledger stays the record of *server-side* awards (legacy endpoint, weekly winner, grants).

Why:

- **It cannot be written from the client as the rules stand.** `stickerAwards` has no rules entry (default deny). A client transaction that also writes a ledger row would fail with `PERMISSION_DENIED`. Allowing it needs a rules change: an owner-create rule on `stickerAwards/{uid}:{stickerId}` with a strict shape (awardId must equal `uid:stickerId`, `awardedBy: 'client'`, trigger matching the sticker doc). That is a new rules surface, a new emulator test, and a rules deploy — for a row whose content the client fully controls.
- **A client-written row proves nothing.** Anyone who can self-issue a sticker through the client create path (§0) can also write a ledger row claiming a legitimate trigger. The ledger's audit value comes entirely from server attestation. A client-written row adds a second record of the same untrusted claim.
- **The sticker doc is already the record.** For client awards, `users/{uid}/stickers/{id}` (with `trigger`, `source`, `unlockedAt`) is the durable fact; nothing in the app reads the ledger for display, and no server flow consumes client ledger rows.

Alternatives, if Zach wants full ledger coverage anyway:

- **A — Rules change for client ledger writes.** As above: owner-create on the ledger with shape validation (possibly a `get()` check that the sticker doc exists). Cost: rules + emulator test + deploy. Gain: a complete ledger. Risk: the rows are still client-attested, so the completeness is cosmetic for audit purposes.
- **B — Server-side ledger sync.** The client calls a new endpoint after unlocking (or a scheduled job reconciles sticker docs into ledger rows). The rows would be server-written, but the *event* is still client-claimed, and a reconciliation job adds a moving part for little gain.
- **C — Move canonical awards server-side.** The real fix for both the ledger and the §0 self-issue hole, but a different stage's scope (it is the Stage 3 evaluator's un-built half: every trusted event re-routed through a server endpoint). Not Stage 4.

If Zach picks A, it is a small, well-bounded addition to this stage (rules + test + deploy); B and C are separate stages. The recommendation stands: D.

## 6. Build sequence

1. **Server module + route + tests first, no UI.** `src/server/stickerGrants.ts` (orchestrator + Admin SDK store + Express handler), route in `server.ts`, `writeAdminAudit` call in the handler. Unit tests (§7) before the UI exists.
2. **Service layer.** `src/services/stickerAdminService.ts` (`lookupPlayers`, `grantSticker`, `getGrantHistory`).
3. **Admin UI.** Grant flow in `AdminUsers` (lookup → player card → picker → reason → confirm → result) + history view. Keep `AdminLayout`/`ModuleCard` patterns; leave the other two stub cards alone.
4. **Verify:** `tsc`, full non-integration suite (expect the same 2 pre-existing failures — `dataIntegrityAudit` `missing_crew_scope`, `tribunalSecurity` `/Tribunal Locked/` copy — confirmed on pristine tree in Stage 3), `npm run build`.
5. **Commit + push main** (own paths only, never `-A` — another chat works in this tree). No rules change, so no rules deploy is needed.
6. **Live check:** on Render, as admin, grant a common sticker to a test player; confirm the Dex shows it unseen on next load; grant the same sticker again → already-owned; check the history row and the `adminLogs` entry. Non-admin grant attempt from the console → 403.

## 7. Test plan

- **Module unit tests** (`src/__tests__/serverStickerGrants.test.ts`, in-memory fake store): unknown sticker → 400; missing/blank/overlong reason → 400; missing target → 400; unknown target user → 404; already-owned (sticker doc exists, and separately ledger row exists) → `awarded: false, alreadyUnlocked: true`, no second write; successful grant writes the sticker doc with the exact shape (`trigger: 'admin_grant'`, `source: 'admin_grant'`, `seen: false`, `equipped: false`) and the ledger row (`awardedBy: 'admin'`, `adminUid`, `reason`); grant to a starter-incomplete player succeeds (override); grant writes no XP and touches no legacy fields.
- **Endpoint tests:** 401 without a token; 403 for a non-admin caller (including a non-admin granting to themselves); route registered with `adminRateLimiter` + `authenticate`.
- **Client tests:** service functions map success/already-owned/error responses correctly; picker disables owned stickers; reason field blocks empty submit. (Page-component tests only where the repo's existing test setup supports them; otherwise the live check covers the UI.)
- **Regression:** existing sticker award tests unchanged; `stickerRules.integration.test.ts` untouched (no rules change).

## 8. What Stage 4 deliberately does NOT do

- **Celebrations** — Stage 5. Grants are silent; the player finds the sticker in the Dex.
- **The 25 import** — Stage 6. No new registry entries, triggers, windows, or secrets.
- **Revoke** — §4. Defined, not built; console delete is the escape hatch.
- **Bulk / multi-grant** — one sticker per grant, one reason per grant. A "grant a whole collection" action is a later option, not v1.
- **Global earned counts** in the picker (e.g. "12 players own this") — needs a server aggregation endpoint (audit §10.4); deferred to §9.8.
- **Legacy sticker grants.** The grant endpoint covers the canonical 42 only. Legacy stickers are exploration rewards awarded by the self endpoint; there is no admin path to grant one to another player, and none is designed here.
- **Client ledger rows** — §5, recommendation D.
- **Closing the canonical self-issue hole** (§0) — needs canonical awards moved server-side; a future stage.
- **Rules changes** — none. (Footnote: `mission_count_milestone` is in the client trigger enum but absent from the rules trigger list; harmless today since no sticker carries it, and Stage 6 must add it when it binds stickers to that trigger.)

## 9. Decisions needed from Zach

1. **Grant-only vs include revoke.** Recommended: grant-only (§4); revoke defined for later, console delete as the escape hatch.
2. **Starter-gate override.** Recommended: yes — an admin can grant any sticker to any player regardless of starter state, with the override recorded in the ledger + `adminLogs`.
3. **Reason required vs optional.** Recommended: required (1–200 chars); a grant without a reason is unauditable.
4. **Client canonical ledger rows.** Recommended: **D — none** (§5). The ledger stays server-attested; client awards are recorded by their sticker docs. Alternatives A (rules change), B (server sync), C (move canonical awards server-side, separate stage).
5. **UI home.** Recommended: `AdminUsers` (`/admin/users`) as its first working module. Alternative: a new `/admin/stickers` page + `AdminBoard` card.
6. **Already-owned.** Recommended: 200 no-op `{ awarded: false, alreadyUnlocked: true }`, same as `/api/stickers/award`. Alternative: 409 error.
7. **Scope.** Recommended: canonical 42 only. Alternative: also cover legacy stickers (would need a second grant path, since legacy awards live in different fields).
8. **Global earned counts in the picker.** Recommended: not in v1 — the picker shows only the target player's owned state. Alternative: add a server aggregation endpoint (`GET /api/admin/stickers/counts`) so each sticker shows how many players own it.
9. **Single grants only vs batch.** Recommended: one sticker per grant in v1. Alternative: allow multi-select with one shared reason.
10. **Acknowledge the self-issue limit (§0).** The grant endpoint does not stop a player self-issuing a sticker with `trigger: 'admin_grant'`; only the ledger + `adminLogs` distinguish a real grant. Closing that hole means moving canonical awards server-side — a future stage, not this one. No build fork; needs his eyes on it.
