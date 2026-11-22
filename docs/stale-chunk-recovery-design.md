# Stale-chunk recovery (Option A) — design

Zach's pick, Nov 21, 2026. Fixes the "THIS PAGE DIDN'T LOAD" screen that
fires 5–10 times per session on his phone.

## The problem

Every page in the app is a lazy chunk (`React.lazy` in `src/App.tsx`,
~35 pages). The entry chunk loaded when the app opens holds the chunk
filenames from that build. Each deploy renames the chunks (content hash).
Nov 21 alone had 48 commits on main, so 48 deploys.

When Zach taps to a page whose chunk hasn't loaded since the last deploy,
the browser requests the old filename. Render answers a missing asset with
the SPA fallback (index.html as text/html), so the dynamic import throws.
The per-route `ErrorBoundary` in `AppLayout` (`src/App.tsx` ~line 487)
catches it and shows "THIS PAGE DIDN'T LOAD". Try Again is
`window.location.reload()`, which fetches fresh index.html with the new
chunk names, so it always works the second time. Until the next deploy.

Two gaps made this a mystery instead of a bug:
- No chunk-load handling anywhere in the code (no reload, no retry, no
  version check, no service worker).
- The boundary only logs to `console.error`, which is invisible on his
  phone. The actual error has never been seen by anyone.

Caveat, stated plainly: a genuine render bug shows the identical screen.
The capture half of this build is what tells stale chunks apart from a
real bug the next time one fires.

## The fix (two halves, both in this build)

### 1. Auto-reload on stale chunk

`src/logic/staleChunk.ts` (pure, tested):

- `isChunkLoadError(error)` matches the known signatures:
  - `Failed to fetch dynamically imported module` (Vite dynamic import,
    Chrome/Edge)
  - `Importing a module script failed` (Firefox/Safari)
  - `Loading chunk <id> failed` (webpack-style, kept for completeness)
  - `Unexpected token '<'` (SPA fallback HTML served as JS)
  - `error.name === 'ChunkLoadError'`
  - `null` / anything else is not a chunk error.
- `consumeStaleChunkReload(message, storage?)` is the loop guard. It
  keys on a djb2 hash of the error message (the message carries the chunk
  URL, so different stale chunks get different keys) under
  `fieldtrip:stale-chunk-reload:<hash>` in sessionStorage. First time a
  distinct message is seen it records the key and returns true (reload
  allowed); the same message again returns false, so the fallback screen
  shows instead of a reload loop. If sessionStorage is unavailable the
  guard returns false: never auto-reload without a guard.

`src/services/clientErrorService.ts` — `handleCaughtError(error)`:
- Classifies the error, fires the capture report, and when it is a chunk
  error and the guard allows, waits for the report with an 800ms race
  (fast path wins, slow path still reloads) and then
  `window.location.reload()`. The reload is injectable in tests.
- The report never blocks the reload past 800ms and never throws: a
  failed report just means that one occurrence goes unrecorded.

`src/components/ErrorBoundary.tsx` — `componentDidCatch` calls
`void handleCaughtError(error)`. Both boundaries (the global one and the
per-route one in `AppLayout`) get the behavior, since they share the
component. The fallback flashes briefly before the reload; that is
expected.

Assumption, written down: `window.location.reload()` revalidates
index.html against Render, so the fresh HTML references the new chunk
names. If Render ever served index.html with long cache headers, the
reload would fetch the same stale HTML and the guard would stop the
loop after one attempt, showing the fallback screen.

### 2. Capture the error

New endpoint `POST /api/client-errors` (`authRateLimiter`, `authenticate`,
same shape as the community-comments endpoint):

- Client: `reportClientError(error, kind)` in
  `src/services/clientErrorService.ts`, via the existing
  `authenticatedFetch` from `src/lib/api`. Fire-and-forget, never throws.
  Payload: `kind` ('chunk' | 'render'), `name`, `message`, `stack`,
  `route` (`window.location.pathname`), `userAgent`. Capped client-side
  (name 200, message 1000, stack 4000, route 300, userAgent 300).
- Server: `src/server/clientErrors.ts` — `createClientErrorHandler`
  factory + `createAdminClientErrorStore`, mirroring
  `voiceNoteTranscription.ts`. The server re-sanitizes everything
  (authoritative) and writes one doc per error to the `clientErrors`
  collection via the Admin SDK (`createdAt` server timestamp, `uid`
  from auth). No Firestore rules change: server writes bypass rules.
- No admin UI in this build. The records are read in the Firebase
  console (collection `clientErrors`, newest first). An admin page and
  any retention/cleanup are deferred; the collection is small (one doc
  per boundary catch).

Also: the per-route fallback in `App.tsx` now passes the error's
`name: message` into `ErrorStatePanel`'s collapsible "Technical details"
(the global fallback already did this). So when the screen does show,
Zach can read the actual error on his phone instead of a blank mystery.

## What this build does NOT include (Option B, deferred)

- A "new version available" prompt that polls index.html for a new entry
  chunk and offers a reload before the user walks into the error screen.
  That is the polished version of the same idea; A makes each deploy a
  quick silent reload instead.

## Tests

`src/__tests__/staleChunkRecovery.test.ts`:
- `isChunkLoadError`: true for each of the five signatures, false for
  ordinary render errors (undefined property read, invalid React child,
  "Objects are not valid as a React child") and for `null`.
- Guard: a fresh storage allows once, blocks the same message a second
  time, allows a different message; no storage means no reload.
- `sanitizeClientErrorReport` (client) and the server sanitizer: caps
  lengths, defaults kind to 'render', drops non-strings.
- Wiring pins (readFileSync + assert.match): `server.ts` registers
  `POST /api/client-errors` with `authRateLimiter` + `authenticate`;
  `ErrorBoundary.tsx` calls `handleCaughtError`; the per-route fallback
  in `App.tsx` passes `details`.

## Verification

- `tsc` clean, full suite exactly the 3 known failures, production build.
- Curl: `POST /api/client-errors` unauthenticated → 401 (route live);
  bogus path → 404. Live chunks contain the new strings.
- Browser live check: app loads, no regression. The auto-reload itself
  cannot be forced in a read-only check; the real proof is the next
  deploy while the app is open on his phone (tap to a page after a push:
  a quick reload instead of the error screen). Say that plainly in the
  report.
