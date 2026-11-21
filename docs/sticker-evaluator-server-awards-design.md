# Design: move evaluator sticker awards server-side (Option B)

Status: BUILT + LIVE Nov 20, 2026 — Zach said "Go" 4:47 PM PST; backfill
decided: all players. Server routes verified live via curl (both POSTs
401 unauthenticated; control 404 on a bogus path; live client chunk
contains `/api/stickers/evaluate`, which the old source never had).
Backfill itself is NOT run yet: it ships as a one-tap button on
/admin/users (commit c240ac0) because this VM has no admin credential
path — Zach taps "Run backfill" once the deploy lands. Date: Nov 20, 2026.

Related: `docs/sticker-server-awards-design.md` (Nov 15, the LEGACY
server-side move — Option A, shipped as `POST /api/stickers/award`).
This doc is the evaluator equivalent: the canonical awards that still
write from the client. Do not confuse the two.

## Problem

Every sticker the client-side evaluator awards lands in the Dex with no
notification. `unlockStickersForUser` (`src/services/stickerService.ts`)
writes only the sticker doc, and the client cannot write notification
docs — `firestore.rules` allows only reads on
`users/{uid}/notifications`. Only two server paths write
`sticker_awarded` notifications today: `POST /api/stickers/award`
(legacy discovery stickers) and the admin grant endpoint.

That covers the whole approval bundle, not just milestones:
`challenge_approved`, `archetype_milestone`, `mission_count_milestone`,
`season_milestone`, `approval_streak`, `level_up`, `repair_approved`,
`location_verified`, `desert_state_approval`, plus the one-shot events
(`first_submission`, `first_draw`, `field_note_added`,
`photo_proof_added`, `late_night_submission`, `crew_created`,
`crew_joined`, `crew_survived_week`, `weekly_vote_cast`,
`zine_page_added`). The player still gets the Stage 5 celebration
(toast/modal) from the snapshot watcher when online, but there is no
durable notification in Basecamp. Zach's account shows it directly: his
only sticker notification is the Texas Y'all admin grant; his other 13
earned stickers never notified.

## Decisions (Zach's pick, Nov 20, 2026)

- Option B: move evaluator awards server-side. The award and the
  notification happen in one server transaction. (Options A, a
  notify-only endpoint, and C, backfill-only, were offered and not
  picked.)
- Backfill: ALL players' missing `sticker_awarded` notifications (his
  pick, Nov 20, 2026 — tapped "All players' missing ones"). Derivable
  from each player's sticker docs (`unlockedAt` + `trigger`) and the
  registry; runs once, after B is live.

## Audit: what moves

11 client call sites in 7 files, all through
`evaluateStickerTriggers` / `evaluateAdminApprovalStickers`
(`src/logic/stickerEvaluator.ts`), all fire-and-forget via
`runStickerAwardNonBlocking` (which only logs failures — no call site
uses the results for celebrations; those come from the Stage 5
snapshot watcher, which keys off the sticker docs and keeps working
when the server writes them):

| Call site | Event(s) |
|---|---|
| `PlayerLevelUpFeedback.tsx` | `level_up` |
| `AppContext.tsx` (draw) | `first_draw` |
| `AppContext.tsx` (submit) | `first_submission`, `field_note_added`, `photo_proof_added`, `late_night_submission` |
| `AppContext.tsx` (immediate approval) | `first_approval` bundle (dead path in practice — `submitTripEntry` always returns `pending_review` — moved for consistency, not relied on) |
| `crewService.ts` | `crew_created`, `crew_joined`, `crew_survived_week` |
| `proofService.ts` + `submissionService.ts` | admin approval bundle (`first_approval` + milestones + repair) |
| `voteService.ts` | `weekly_vote_cast` (Voting parked — call site moves, trigger stays inert) |
| `zineService.ts` | `zine_page_added` (Zines parked — same) |

`POST /api/stickers/award` (legacy discovery) is untouched — it
already notifies.

## Portability: the evaluator can run on the server, with two import chains to break

- `stickerEvaluator.ts`, `canonicalProgress.ts`, `data/stickers`,
  `data/deckPacks`, `logic/*` import no Firebase at all. The evaluator
  is pure logic plus an injected `unlock` (already a test seam).
  `evaluateAdminApprovalStickers` builds its snapshot from the profile
  doc via `buildCanonicalProgress({ userId, profile })` — pure, so the
  server can do exactly this with the profile doc read via the Admin SDK.
- Chain 1: the evaluator imports `unlockStickersForUser`,
  `getStickerArchetypeForFieldType`, `STICKER_EVENT_AWARD_IDS` from
  `stickerService.ts`, which imports `firebase/firestore` and the
  client `db`. Fix: move the pure helpers and the trigger/result types
  into a pure module (no Firebase), and make `unlock` a REQUIRED
  parameter of the evaluator (no default client import). Client call
  sites pass nothing after the switch — they call the endpoint instead.
- Chain 2: `canonicalProgress.ts` value-imports `UserProfile` from
  `userService.ts` (line 7, not `import type`), and `userService.ts`
  imports `firebase/firestore`. Fix: change it to `import type`.
  Build step: grep the server's import closure for `firebase/` and add
  a server import smoke test so the chain cannot regress.

## Latent bug this move fixes (found during the build, Nov 20, 2026)

The client's `STICKER_AWARD_TRIGGERS` validation list in
`stickerService.ts` still has only 17 entries: the 6 triggers from
earn-audit fix #3 (`first_draw`, `location_verified`,
`late_night_submission`, `desert_state_approval`, `approval_streak`,
`crew_survived_week`) were added to the rules file (lines 534-539)
and to the evaluator's rule table, but never to the client validation
list. So `unlockStickersForUser` rejects every award with one of
those triggers ("Unknown sticker trigger") before it reaches
Firestore — Scene Starter, Outside Person, Night Owl / After Hours,
Desert Alien, On a Roll and Accomplice could never award in the live
build. The evaluator tests pass a fake unlock, so they never hit the
check, and the live checks were marker-based, so nobody noticed.
The server unlock validates against the full 23-trigger list
(`src/logic/stickerAwardCore.ts`), so these six start working the
day B goes live. The stale 17-entry list dies with the client unlock.

## Honest limit — what the server can and cannot verify

Same limit as the legacy doc (§2 there): the server can verify what it
can see. The approval bundle is fully verifiable — the entry, the
approval, and the counts all live server-side (profile approval
caches, `proofReviews`, entries). One-shot events are partial: the
server can confirm the underlying fact exists (an entry for
`first_submission`, a drawn card for `first_draw`), but the
`localHour` for Night Owl / After Hours stays client-claimed — the
rule is the submitting device's local hour and the server has no
device timezone; the hour only selects among hour-window stickers.
This endpoint is write-path control + ledger + notification, with
verification where the data exists. It does not turn a client-observed
fact into a proven one.

## Endpoint: `POST /api/stickers/evaluate`

One generic endpoint — the evaluator already dispatches on event type.

- Auth: `authenticate` + rate limiter, same as the other sticker
  endpoints. Body: `{ eventType, entryId?, source, localHour? }`.
  `source` is validated server-side (1–200 chars, same rule as the
  client normalizer, moved to the pure module).
- Awardee: the server loads the entry (when `entryId` is given); the
  awardee is the entry's owner. Without an entry, the awardee is the
  caller. If awardee !== caller, the caller must be an admin —
  `checkIsAdmin` (`server.ts:8083`: hammer808@gmail.com, two hardcoded
  UIDs, `admins/{uid}` doc, or `users/{uid}.role === 'admin'`).
  This is what lets the two admin-approval call sites keep working:
  they run in the admin's browser, awarding for the entry's owner.
- `wasRepair`: the server computes it with an Admin SDK read of
  `proofReviews` (same logic as `wasMissionSentBackForMoreProof`:
  equality filter on `userId`, limit 50, filter in code).
- Snapshot: the server reads the profile doc via the Admin SDK and
  builds it with `buildCanonicalProgress`. Ordering is the same as
  today: the admin services call the endpoint after their approval
  write returns, and the server maintains the profile's approval
  caches on every approval, so the snapshot is current.
- `fieldType`: entry's `fieldType` ?? profile's `fieldType`.
- Server unlock (`src/server/stickerEvalUnlock.ts`, Admin SDK):
  one transaction per award batch. For each sticker: if the sticker
  doc already exists, `already_unlocked`, nothing written. If new:
  set the sticker doc (same fields as the client write), set the
  ledger row, AND set the `sticker_awarded` notification doc (same
  shape as `stickerAwards.ts`: `type`, `stickerId`, `stickerName`,
  `stickerRarity`, `discoveryKey` = trigger, `read: false`,
  `createdAt` server timestamp). The notification is written ONLY
  when the sticker is newly unlocked in this transaction — that is
  what dedupes re-evaluation (the archetype catch-up rule fires on
  every approval after 5; the sticker already exists, so no second
  notification).
- Response: `{ awarded: StickerUnlockResult[] }` — same statuses as
  today (`unlocked`, `already_unlocked`, `failed`,
  `invalid_sticker`). Client call sites keep their signatures where
  they return results (the admin services return them to the admin
  UI); internally they POST instead of evaluating. Failures stay
  best-effort and logged, as today — a failed call is re-attempted
  naturally on the next approval for bundle rules; one-shot events
  have the same miss exposure as a failed client transaction today
  (accepted parity, not a regression).

## Client switch (same commit, same deploy)

- All 11 call sites POST to the endpoint (fire-and-forget through
  `runStickerAwardNonBlocking`, unchanged) instead of calling the
  evaluator. One Render deploy swaps client and server together, so
  there is no window where the client writes nothing or both paths
  write.
- Delete client `unlockStickersForUser` / `unlockStickerForUser`
  (and their tests) once no call site uses them. Verify with grep:
  no client file imports them for writes.

## Rules sequencing — the part that must NOT happen in this build

- This build does NOT touch `firestore.rules`. The rules-only hole fix
  (deny `admin_grant` on the owner-create path) is DONE and PUBLISHED:
  Zach added line 562 (`data.trigger != 'admin_grant' &&`, after line
  553 `isValidStickerTrigger(data.trigger) &&`) and published Nov 20,
  so the 1,257-line publish #2 is done. The Frankie chat owns that fix.
- Tightening the rules to admin-only for sticker writes is publish
  #3, AFTER this endpoint is live. Until #3, the client could still
  self-write (the hole stays open for non-`admin_grant` triggers),
  but no client code does it anymore, and the rules-only fix already
  blocks the scarce `admin_grant` ones. B closes the notification
  gap; the full hole close completes only at #3.
- Coordination: do not edit `firestore.rules` in this build, and do
  not fold the #3 tightening into the pending #2 publish — #2 must
  go out with the owner-create path intact, or the current client
  evaluator breaks before the server move is live.

## Open questions for Zach

1. Backfill: DECIDED Nov 20 — all players' missing notifications (see
   Decisions above). Runs once, after B is live.
2. Live verification of the endpoint needs a real award event. The
   build will propose the lightest one (e.g., a `first_submission`
   award on the Mascota test profile, or a staged admin approval)
   rather than touching his main account's stickers.

## Tests

- Server endpoint tests (existing `FakeDb` harness): unauthenticated
  401; non-admin awarding for someone else 403; newly unlocked
  writes sticker + ledger + notification in one transaction;
  already-unlocked writes nothing (no duplicate notification);
  missing entry 404; invalid event/source 400; repair path.
- Evaluator tests unchanged (pure + injected unlock).
- Guard test: no client file imports `unlockStickersForUser`.
- Server import smoke test: importing the endpoint module pulls in
  no `firebase/` client module.
- Full suite (2 known failures), `tsc`, `npm run build`, commit own
  paths only, push, live check per §7 Q2.
