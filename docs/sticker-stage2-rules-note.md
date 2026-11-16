# Stage 2 — Legacy sticker spoof hole: rules change (NOT SHIPPED)

**Status: UNVERIFIED, NOT on main, NOT deployed.**
Branch: `feature/stage2-legacy-spoof-hole` (local only, on this VM).
Nothing in this note has been pushed to `main` or deployed to Firebase.
Do not deploy until the rules test passes off this VM (see "Verification").

## The hole (audit §3.2)

`firestore.rules` protected XP/level/skins/role but **not** the legacy
`users/{uid}` sticker fields, so any signed-in owner could self-grant any
legacy-visible sticker from the browser console, e.g.
`updateDoc(userRef, {'unlockedRewards.stickers': arrayUnion('bigfoot_night_silhouette')})`,
and the live Dex (`Collection.tsx`) renders those fields as earned.

## Rule change (`firestore.rules`, users section)

1. **`isSystemProtected()` — update path.** New `isEditingLegacyStickers`
   check: blocks a non-admin owner update that touches
   `earnedStickers`, `discoveryEvents`, `stickerUnlockHistory`, or
   `completedDiscoveryGroups` (top-level `affectedKeys()`), or changes
   `unlockedRewards.stickers` (map-subfield comparison, mirroring the
   existing skins check — badges/skins are untouched). `completedDiscoveryGroups`
   is included because it is the fifth field in the audit §3.2 unprotected
   list and its only client writer is the same discoveryService call.
2. **New `hasSafeInitialLegacyStickerState()` — create path.** A
   self-create must have all five legacy fields empty/absent. Without
   this, the hole stays open via profile creation. The legitimate client
   create path (`userService.ts` newProfile) already creates these empty.
   Wired into the owner branch of `allow create` only; admin creates
   (and all server/Admin SDK writes, which bypass rules) are unaffected.
3. Canonical `users/{uid}/stickers` subcollection rules untouched.

## Test change (`src/__tests__/stickerRules.integration.test.ts`)

- Un-skipped `owners cannot self-grant legacy sticker fields on their own profile`.
  Now asserts all four legacy fields **plus** `completedDiscoveryGroups`
  are rejected on owner update.
- New `owners cannot create a profile pre-populated with legacy sticker fields`:
  control (clean self-create succeeds) + one `assertFails` per field on create.
  Total file: 7 tests (was 6, one skipped).

## Verification

- `tsc --noEmit`: clean.
- Non-integration unit suite: **537/539 pass**. The 2 failures are the known
  pre-existing set (`dataIntegrityAudit.test.ts` `missing_crew_scope`,
  `tribunalSecurity.test.ts` `/Tribunal Locked/` copy) — untouched by this change.
- Emulator attempt on this VM: **failed environmentally, not a test failure.**
  The Firestore emulator starts, but every test fails in `test.before` at
  `loadFirestoreRules` with
  `{"code":503,"message":"Network closed for unknown reason","status":"UNAVAILABLE"}`.
  No test body ever ran. This is the known VM issue (same failure for sticker
  and weekly-voting rules tests). **No local result counts as verification.**

## Off-VM verification route

There is **no CI** in this repo (no `.github/` directory at all), so there is
no workflow to watch. Verification must run on Zach's machine:

```bash
cd <repo>                                   # his local clone of field-trip
git fetch origin
git checkout feature/stage2-legacy-spoof-hole   # branch must be pushed to origin first (needs a go-ahead; it currently exists only on this VM)
java -version                               # needs Java 21+
npx firebase emulators:exec --only firestore "npx tsx --test --test-force-exit src/__tests__/stickerRules.integration.test.ts"
```

Expected: **7 pass, 0 fail.** Also worth running once there:

```bash
NODE_OPTIONS=--max-old-space-size=4096 npx tsc --noEmit
```

Only after that passes: merge the branch to `main` and deploy the rules
(`firebase deploy --only firestore:rules`, or paste via the Firebase console).

## Consequence to decide before shipping

Closing the hole also blocks the app's own client-side legacy awards:
`discoveryService.awardDiscoverySticker` (called via
`AppContext.unlockDiscoverySticker` from Capture, voting, BigBoard, starter
effects, EvidenceMeter) writes exactly these fields with `updateDoc`. After
this ships, those calls will fail (caught and logged, no crash — but the
sticker modal will not fire and no legacy award will land). The canonical
subcollection awards are unaffected. **Before merging, decide: move the legacy
awards server-side (or to the canonical subcollection) first, or accept that
legacy page-visit stickers stop awarding until that move happens.** Zach's
standing call is that legacy page-visit stickers are KEPT as exploration
rewards, so the server-side move is the consistent path — it is Stage 3/4
work, not part of this branch.
