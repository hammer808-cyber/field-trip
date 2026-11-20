# Trevor suggests the nearby deck (option A)

Status: **APPROVED Nov 20, 2026 — Zach picked A** (Trevor suggests the nearby deck).
Build follows the Texas Y'all pattern: design first, build, independent verification, commit, live check.

## 1. What Zach asked

The Near you badge works on mobile (confirmed on his phone in LA), but a badge is
passive: the user still has to open the deck list and notice it. Trevor should
suggest a deck based on location, guiding the user into an appropriate choice.

His one concern: decks without a location (Errands, seasonal ones like Heatwave)
would never be suggested if location were the only path. This design answers that
directly — the nearby rule is additive, never a replacement (§3.4).

## 2. Audit (Nov 20)

- Trevor already recommends decks. `src/services/trevorRecommendationEngine.ts`
  has a rule-based engine (`getTrevorRecommendation` picks the highest-priority
  non-cooling-down rule). Rule priorities today: proof_needs_more 1000, onboarding
  910–950, active_mission 850, voting 800, starter_complete_unlock 750,
  near_level 700, weekly_rank 650, crew_action 600, profile_incomplete 550,
  zine_gap 500, proof_variety 450, **mission_discovery 400** (suggests an
  accessible deck not recently used, reason `accessible_deck_not_recently_used`,
  18h cooldown, primary action `draw_recommended_mission` from
  `context.recommendedDeckId`), fallback_draw 100, fallback_standings 50.
- `TrevorContext` (`src/services/trevorContextService.ts`) carries
  `accessibleDeckIds`, `recentlyUsedDeckIds`, `recommendedDeckId` — but NO
  location input. Trevor's suggestions today are rotation-based, not place-based.
- Trevor renders globally: `<TrevorGuide />` in `App.tsx:502`. The panel
  auto-opens on guidance changes and has a launcher. No new UI surface is needed.
- CORRECTION Nov 20 (found during build — the audit above was wrong about the
  live path): `getTrevorRecommendation` is called nowhere in production code,
  only in tests. The live Trevor panel builds its recommendation from
  `usePlayerGuidance()` → `resolvePlayerGuidance()` →
  `buildTrevorRecommendationFromGuidance()`. The `mission_discovery` rule cited
  above is tested but never fires live. The build therefore implements the
  engine rule AND the minimal live wiring: `resolvePlayerGuidance`'s
  DRAW_MISSION branches prefer a nearby playable deck with eligible missions
  (flag `deckIdIsNearby`), and the adapter maps those snapshots to the
  `nearby_deck` line. Without the live wiring the feature would have been
  tested but dead on the phone.
- The nearby data already exists: `useNearbyDeckPackIds()` (option A, commit
  b3220c1) returns the set of deck ids whose home region contains the user, or
  null while unresolved. TrevorGuide is a component, so it can call the hook.
- `getRecommendedMissionAction` builds `{ id: 'draw_recommended_mission',
  params: { deckId, deckLabel } }` from `context.recommendedDeckId`. The nearby
  rule reuses the same action shape with the nearby deck id.
- Message copy lives behind `TrevorMessageKey` (union type in the engine) plus
  the matching copy/config — the build adds one key following the
  `mission_discovery` pattern.

## 3. Design

### 3.1 New rule: `nearby_deck`

Add one rule to `TREVOR_RULES`, between proof_variety (450) and
mission_discovery (400):

- **Priority: 425.** Above rotation (400) so location wins when both apply;
  below everything urgent or in-progress (repairs, onboarding, active mission,
  voting, progression, crew, profile, zine, proof variety).
- **Fires when:** there is a nearby deck (from `context.nearbyDeckIds`) that is
  accessible AND not in `context.recentlyUsedDeckIds`. Picks the first such
  deck (regions do not overlap today, so this is normally exactly one).
- **Returns null when:** no nearby deck, the nearby deck is not accessible, or
  the nearby deck was recently used. In all three cases the engine falls through
  to the existing rules unchanged.
- **Recommendation:** id `nearby_deck_<deckId>`, category `discovery`,
  messageKey `nearby_deck` (new), reason `nearby_accessible_deck`, primary
  action `draw_recommended_mission` for the nearby deck, secondary action
  `{ id: 'open_logbook' }` (same as mission_discovery), cooldown 18h. Rule id
  includes the deck id, so moving to a new region gets its own cooldown.
- **Copy (draft, Zach's red pen welcome):** "You're in Texas — Texas Y'all is
  right here. Want to start with it?" The deck name comes from the deck data,
  not hardcoded copy; the region label comes from the deck's `homeRegion.label`.

### 3.2 Context change

- `TrevorContext` gains `nearbyDeckIds: string[]` (empty when unknown or none).
- `buildTrevorContext` accepts a `nearbyDeckIds` input and passes it through.
- `TrevorGuide` calls `useNearbyDeckPackIds()` and passes the result (null →
  empty) into `buildTrevorContext`, adding it to the `useMemo` deps.

### 3.3 What the hook's null means

While the location read is unresolved, nearby is empty and Trevor behaves
exactly as today. No location prompt is added by Trevor — the hook already
reads silently with fallback, and Trevor never triggers a permission request.

### 3.4 The concern, answered: non-location decks are never starved

The nearby rule is one rule in a priority-ordered list, not a gate. The engine
evaluates every rule and takes the highest-priority one that fires:

- No nearby deck (at home, location off, deck without a region): nearby rule
  returns null, `mission_discovery` fires as today and suggests Errands,
  Heatwave, seasonal decks, or any accessible deck by rotation.
- Nearby deck exists but was recently used: nearby rule returns null,
  `mission_discovery` fires and suggests something else.
- Nearby deck on cooldown (suggested within 18h): the engine skips it and
  falls through to `mission_discovery`.
- Urgent work always wins: repairs, onboarding, active missions, and voting
  all outrank the nearby rule.

Non-location decks lose nothing. They only miss the location boost, which by
definition cannot apply to them.

### 3.5 What this does NOT do

- No new UI surface, no new panel, no new interaction flow (that is option C).
- No mission-level pick (that is option B: easiest remaining mission in the
  nearby deck).
- No time estimates, no indoor/outdoor tags, no per-mission places.
- No change to the deck-list sort or the Near you badge (option A stays as is).
- No change to any other Trevor rule, priority, or cooldown.

## 4. Build plan

1. `src/services/trevorContextService.ts`: add `nearbyDeckIds` to
   `TrevorContext` + `TrevorContextInput`, pass through in `buildTrevorContext`.
2. `src/services/trevorRecommendationEngine.ts`: add the `nearby_deck` rule
   (§3.1) and the `nearby_deck` message key; add the copy following the
   `mission_discovery` pattern.
3. `src/components/TrevorGuide.tsx`: call `useNearbyDeckPackIds()`, pass it into
   `buildTrevorContext` (null → `[]`), add to memo deps.
4. Tests: engine tests in `src/__tests__/trevorRecommendationEngine.test.ts`
   (or a new file following its pattern) — nearby deck fires above
   mission_discovery; no nearby → mission_discovery fires; recently-used
   nearby → mission_discovery fires; nearby on cooldown → falls through;
   non-accessible nearby → null; urgent rules still outrank nearby. Context
   test for the new input. Existing Trevor tests must stay green.
5. Verify: tsc clean, full non-integration suite (expect only the 2 known
   pre-existing failures), build clean. Commit own paths only, push.

## 5. Live check

Position-dependent, so it is Zach's phone again (cloud browser cannot emulate
GPS): in LA, Trevor's panel should suggest SoCal Summer; in Grand Prairie Nov
21–24, it should suggest Texas Y'all ("Get It, Y'all"). Baseline checks the
browser can do: Trevor panel still renders, no errors, and with no location
available the suggestions are exactly as before (rotation). The 18h cooldown
means a re-check of the same deck within a day will not re-fire — verify with a
fresh deck/region, not a repeat.

Live-path caveats (from the build): the engine rule's 18h cooldown does NOT
apply on the live path (no per-recommendation cooldown there) — the nearby
suggestion shows whenever Trevor is opened in a DRAW_MISSION state while in the
region, same as `fallback_draw` behaves today. And Trevor only auto-opens for
repair/retry/starter-complete states, so the nearby suggestion is visible when
the user opens Trevor, not as an unsolicited popup.

Baseline live check Nov 20 (~12:00 PM PST): deploy landed, Trevor panel renders
cleanly, no errors. Suggestion shown was "Finish The Park Oasis before drawing
another." — the active-mission rule (850), which correctly outranks nearby
(425) while he has an active mission. No location line, as expected with no
GPS in the cloud browser. Phone check needs a DRAW_MISSION state (no active
mission) for the nearby line to fire.
