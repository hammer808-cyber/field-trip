# Deck Collections: Near You (option A)

Status: **APPROVED Nov 20, 2026 — Zach picked option A** (deck-level region, one-shot GPS).
Build follows the Texas Y'all pattern: design first, build, independent verification, commit, live check.

## 1. What Zach asked

"Wire the decks to be towards the top of the shelf when you're near that location
if it's location based and be suggested if a deck is easier to do based on time and
location."

Decision: build option A now (location float). The time-based "easier" ranking is
option B territory and stays deferred — no time model exists in the code (see §2).

## 2. Audit (Nov 20)

- Deck lists sort by fixed `sortOrder`, then `packName`, inside fixed sections
  (`featured-seasonal`, `always-on`, `travel`, `local-fieldtrips`, `starter-training`)
  via `getDeckCatalogSections()` in `src/data/deckPacks.ts`.
- Both deck surfaces share that function: the Dex Decks tab
  (`src/pages/Collection.tsx:371`) and the Missions deck picker
  (`src/components/DeckPackSelector.tsx`). One sort change covers both.
- `DeckPack` (`src/types/deckPacks.ts`) has NO location fields: no lat/lng, no
  place, no radius, no region. Decks carry `deckType: 'regional'`,
  `catalogSection: 'local-fieldtrips'`, `tags`, `sortOrder`.
- Missions have difficulty (easy/medium/hard) and XP (100/125/150) but NO time
  estimate field anywhere in the codebase. "Easier based on time" cannot be
  computed from existing data.
- Geolocation exists only at capture time (`ViewfinderCamera`, one-shot read,
  1.5s timeout) and at field-kit setup (`AppContext.requestLocation`, 5s timeout,
  records only a boolean `locationPermissionGranted`, keeps no coordinates).
  There is no continuous tracking and no "where am I now" service.
- Location scoring is location-agnostic (Nov 6 finding): the +25% location layer
  pays on any GPS capture at all, no geofence/radius/place check, and the Texas
  cards carry no coordinates. This feature is sorting only — it changes no points,
  no awards, no unlocks.
- Texas deck description says it is "photographable anywhere in the state" —
  a state-wide region is the honest shape for it.

## 3. Design

### 3.1 Region data (new optional field on DeckPack)

```ts
export interface DeckHomeRegion {
  /** Bounding box: a point inside it counts as "near". */
  minLat: number; maxLat: number; minLng: number; maxLng: number;
  /** Short label for the badge, e.g. "Texas", "SoCal coast". */
  label: string;
}
// on DeckPack:
homeRegion?: DeckHomeRegion;
```

Bounding box, not a circle: regions here are states/coasts, and a box is exact
for them. A circle around central Texas would wrongly exclude El Paso and the
Panhandle corners.

Regions in v1 (only these two decks get one):

| Deck | minLat | maxLat | minLng | maxLng | Label |
|---|---|---|---|---|---|
| texas-get-it-yall | 25.84 | 36.50 | -106.65 | -93.51 | Texas |
| socal-summer | 32.53 | 34.35 | -120.65 | -117.00 | SoCal coast |

Starter, Heatwave, Jet Setter, Errand, Holiday: no region, never boosted, order
unchanged. Texas box is the state boundary; SoCal box is San Diego to Santa
Barbara, inland to Riverside.

### 3.2 Sort rule

Boosted decks float to the top **of their own section**. Sections keep their fixed
order; within a section, boosted packs sort first (by sortOrder, then name among
themselves), then the rest as today. Texas and SoCal are both in
`local-fieldtrips`, so in Texas the Texas deck leads that section, in SoCal the
SoCal deck leads it. Locked decks can be boosted too (they still show locked).

### 3.3 Location read (one-shot, silent fallback)

- New hook `useNearbyDeckPackIds()` used by both deck surfaces. On mount it takes
  one `navigator.geolocation.getCurrentPosition` reading: 10s timeout,
  `enableHighAccuracy: false`, `maximumAge: 5 min`.
- In-memory cache only (module-level, survives tab switches within the session).
  Nothing persisted, no coordinates stored anywhere, no continuous tracking.
- On denial, timeout, or unsupported browser: fall back to the normal sort
  silently. No error, no nag, no re-prompt loop. The deck list works exactly as
  today.
- The field-kit setup permission is separate and untouched; this read happens at
  browse time because setup-time permission says nothing about where the user is
  now.

### 3.4 Presentation

Boosted deck cards get a "Near you" badge (both surfaces). No other visual change.
No new copy beyond the badge.

### 3.5 What this does NOT do

- No points, awards, unlocks, or scoring changes.
- No per-mission places or time estimates (option B).
- No continuous location tracking, no background location, no stored coordinates.
- No geofence locking: being outside a region never hides or locks a deck.

## 4. Build plan

1. `src/types/deckPacks.ts`: add `DeckHomeRegion` + optional `homeRegion` on `DeckPack`.
2. `src/data/deckPacks.ts`: add the two regions (Texas, SoCal). Add an optional
   `nearbyPackIds` parameter to `getDeckCatalogSections(packs, nearbyPackIds?)`
   that floats boosted packs to the top of their section.
3. `src/logic/nearbyDecks.ts` (new): pure helpers — `isPointInRegion(lat, lng,
   region)`, `getNearbyDeckPackIds(lat, lng, packs)` — no browser APIs, fully
   unit-testable.
4. `src/hooks/useNearbyDeckPackIds.ts` (new): one-shot geolocation read with the
   cache and silent fallback from §3.3; returns `ReadonlySet<string> | null`
   (null = not yet resolved / unavailable).
5. `src/pages/Collection.tsx` + `src/components/DeckPackSelector.tsx`: use the
   hook, pass its result into `getDeckCatalogSections`, render the "Near you"
   badge on boosted cards.
6. Tests: new `src/__tests__/nearbyDecks.test.ts` — region containment (inside,
   outside, edges), both regions, no-region decks never boosted, sort float
   within section, sections order unchanged, locked decks unaffected. Hook and
   geolocation are verified by the live check, not unit tests.
7. Verify: tsc clean, full non-integration suite (expect only the 2 known
   pre-existing failures), build clean. Commit own paths only, push.

## 5. Live check

Status: **BUILT + PUSHED Nov 20, 2026 — commit b3220c1 on main.**
Independent verification: tsc clean, build clean, suite 977/979 (only the 2 known
pre-existing failures). Live check Nov 20: site serving normally post-push, baseline
stable across reloads (Local Fieldtrips in normal order, no badge with no location
available), Missions page renders fine, no visible errors. One transient Dex render
crash at ~10:11 AM during the deploy window, recovered on retry, not recurred.

NOT verified live: the position-dependent behavior (Texas on top in Texas, SoCal on
top in SoCal, denied-permission fallback). The cloud browser cannot emulate GPS
(no DevTools/Sensors/CDP access) and the served bundle's hash differs from the
local build, so the bundle-string check could not be completed either. Phone check
Nov 20: Zach confirmed the Near you badge shows on mobile in LA (SoCal) — the
region check and live deploy are good. Texas side still pending Grand Prairie
Nov 21–24.
The Missions deck-picker badge is also unverified live (picker menu not opened;
badge only shows with a location anyway).

## 6. Deferred (option B)

Per-mission places + estimated minutes + a time-of-day aware "easiest near you"
ranking. Needs Zach to tag missions (or approve defaults) and a decision on what
"easier" means — shorter time, easy difficulty, or doable from exactly where
you're standing. Not in this build.
