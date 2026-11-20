# Trevor pops up with next-deck suggestions on any deck finish

Status: **APPROVED Nov 20, 2026 — Zach picked B (short list of 3 next decks)**.
Ranking §3.2 stands as proposed (no objection when picking B). Build follows the
Texas Y'all pattern: design first, build, independent verification, commit, live check.

## 1. What Zach asked

When a user finishes the starter deck, Trevor should suggest the next deck based on
location and relevancy. Generalised: any deck finish causes Trevor to pop up with
deck suggestions.

## 2. Audit (Nov 20)

- Today only the starter has a completion moment. `resolvePlayerGuidance`
  (`src/logic/playerGuidance.ts`) has a `STARTER_COMPLETE` state (priority 750)
  that fires when the starter is complete AND `hasUnseenStarterUnlock` is true.
  `shouldAutoOpenTrevor` includes it, so Trevor pops open on his own. It is
  one-shot via `profile.trevorSettings.lastSeenApprovedCount`: TrevorGuide
  acknowledges it on auto-open (`acknowledgeStarterUnlockSeen`), so it never
  re-pops across sessions.
- But the starter-complete suggestion is hardcoded Heatwave, not ranked. Its copy
  says "Heatwave is open. Draw your next mission." and its destination is
  `/missions?pack=heatwave-receipts`, whatever the player's location. The
  snapshot's `deckId` comes from `preferredDrawableDeckId`, but the copy and
  destination ignore it.
- No completion moment exists for any other deck. Detection is possible from
  data that already exists: `CanonicalDeckProgress` carries `approvedCount`,
  `totalCards`, `eligibleCount`, `exhausted`. A deck is finished when
  `approvedCount >= totalCards` (Texas 15/15 = Texas Gold). Nothing today
  watches for that transition, and there is no per-deck "seen" store — only the
  starter's `lastSeenApprovedCount`.
- Trevor's panel shows ONE recommendation with one primary button. The live path
  is `usePlayerGuidance()` → `resolvePlayerGuidance()` →
  `buildTrevorRecommendationFromGuidance()` (the engine is test-only; found
  during the nearby-deck build). A list of several deck suggestions is new UI
  in the panel, not a rule addition.
- The nearby-deck work (commit a150de2) already gives Trevor location: the
  DRAW_MISSION branches prefer a nearby playable deck. But a deck finish does
  not land in DRAW_MISSION while STARTER_COMPLETE (or any completion state)
  outranks it — completion states are the moment this feature owns.

## 3. Design

### 3.1 One state: DECK_COMPLETE (starter included)

Generalise `STARTER_COMPLETE` into a `DECK_COMPLETE` state that fires when ANY
deck was just finished and not yet acknowledged. The starter is the first case,
not a special case: finishing the starter pops Trevor with the next deck, same
as finishing Texas or SoCal. The copy names the finished deck
("Texas Y'all complete — …") and the suggestion is the ranked next deck (§3.2).

- **Detection:** in `resolvePlayerGuidance`, a deck counts as just-finished
  when `approvedCount >= totalCards` for a non-starter deck (or the starter
  complete + unseen unlock, as today) AND its id is not in the seen set.
- **One-shot, per deck:** extend the profile's `trevorSettings` with a seen
  set of completed deck ids (same pattern as `acknowledgeStarterUnlockSeen`:
  TrevorGuide acknowledges on auto-open, so a finish pops once and never
  re-pops on later opens). Until acknowledged, the state stays DECK_COMPLETE;
  after acknowledgement it falls through to the normal rules.
- **Auto-open:** add DECK_COMPLETE to `shouldAutoOpenTrevor`, alongside
  REPAIR_PROOF, RETRY_REJECTED_PROOF, STARTER_COMPLETE. This is the "pop up".
- **Priority:** 750, same as STARTER_COMPLETE today — above the everyday
  suggestions, below repairs, onboarding, active missions, and voting.
- **What it does NOT do:** no change to the sticker season_milestone award
  (deck completion still awards Texas Gold etc. through the existing evaluator);
  no change to the deck-list sort or the Near you badge; no mission-level pick.

### 3.2 The ranking ("location and relevancy") — PROPOSED, needs Zach's call

The next deck is the first deck that qualifies, in this order:

1. **Nearby deck with missions left** — in the player's home region, accessible,
   not finished, with eligible missions. (In Texas: Texas Y'all. In LA: SoCal.)
2. **Active seasonal deck with missions left** — the current season's deck
   (Gobble & Glow now), if accessible and unfinished.
3. **Any accessible deck with missions left, not recently used** — rotation
   fallback, same pool `mission_discovery` draws from.
4. Tiebreak: deck sort order.

"Relevancy" in this proposal = nearby + in-season + has missions left + not
recently used. Excluded always: finished decks, locked decks, decks with no
eligible missions. If Zach wants a different relevancy (e.g. easiest deck
first, or decks matching the explorer type), say so and the ranking changes
before the build.

### 3.3 Single suggestion vs a short list — needs Zach's pick

- **A. Single best next deck (recommended for before Texas).** The panel shows
  one suggestion, same as every Trevor recommendation today, one button into
  that deck. No new UI. This is a guidance-state change + ranking + one-shot
  store, and it can land before the trip.
- **B. Short list of up to 3 next decks. — PICKED Nov 20.** The panel shows the
  ranked top 3 with a button per deck. New UI in the Trevor panel (list layout,
  per-deck actions), more testing, and the auto-open popup becomes a chooser.
  Realistically not before the trip.

Either way the ranking in §3.2 is the same; B only changes how many of the
ranked decks are shown.

### 3.4 The starter's Heatwave hardcoding goes away

STARTER_COMPLETE's Heatwave copy and destination are replaced by the ranked
next deck. Heatwave still wins the ranking whenever it is the seasonal deck or
the rotation pick, but it is no longer forced. If Zach wants Heatwave kept as
the forced next step after the starter specifically, say so — that is a
one-line exception in the ranking.

## 4. Build plan (once picked)

1. `src/logic/playerGuidance.ts`: add the DECK_COMPLETE state (generalising
   STARTER_COMPLETE), just-finished detection from `deckProgressById`, the
   ranked next-deck pick (§3.2), `shouldAutoOpenTrevor` gains DECK_COMPLETE.
   STARTER_COMPLETE is folded in or kept as an alias — build decides, design
   doc records it.
2. `src/services/starterUnlockAck.ts` (or a sibling): per-deck seen store on
   `profile.trevorSettings` + acknowledge call; `usePlayerGuidance` /
   TrevorGuide pass the seen set in and acknowledge on auto-open.
3. `src/services/trevorGuidanceAdapter.ts`: DECK_COMPLETE maps to a new
   message key (`deck_complete`) with the finished deck's name and the next
   deck's name in the copy; tone `celebration`; primary action
   `draw_recommended_mission` for the next deck.
4. `src/content/trevorDialogue.ts`: `deck_complete` copy.
5. Option B only: Trevor panel list UI for up to 3 deck buttons.
6. Tests: just-finished detection (starter + a non-starter deck), ranking
   order (nearby > seasonal > rotation), one-shot (acknowledged finish does
   not re-fire), urgent states still outrank DECK_COMPLETE, locked/finished
   decks never suggested.
7. Verify: tsc clean, full non-integration suite (only the 2 known failures),
   build clean. Commit own paths only, push.

## 5. Live check

Position-dependent, so Zach's phone again: finish a deck (or the starter, on a
fresh test account) and Trevor pops open with the ranked next deck. In Texas,
finishing a deck should suggest Texas Y'all if it still has missions left, or
the next ranked deck if Texas is the one just finished. Baseline the browser
can do: Trevor panel renders, no errors, and with no deck just finished the
suggestions are exactly as before.

## 6. Build notes (Nov 20, 2026 — option B, as built)

- STARTER_COMPLETE is folded into DECK_COMPLETE as specified; no reference
  to the old state remains in src. `starterUnlockAck.ts` was deleted —
  superseded by `deckCompleteAck.ts`, which also writes
  `lastSeenApprovedCount` for Starter decks, preserving the old one-shot.
- DECK_COMPLETE fires only when at least one ranked next deck exists. With
  every deck finished there is nothing to suggest, so it falls through to
  NO_URGENT_ACTION instead of celebrating into a dead end. (The
  "finished everything" celebration is a future feature, not this one.)
- Auto-open is keyed per deck finish (`state:finishedDeckId`), so two decks
  finished in one session each pop once.
- The accessible list + seasonal deck are threaded through
  `buildBasecampViewModel` (from Basecamp.tsx) so Basecamp's next action and
  Trevor agree on the next deck. Callers that omit them get the
  deckProgressById fallback order with no seasonal pick.
- One existing test changed to the new behavior, not just renamed: Basecamp
  "progress uses canonical XP and deck completion data". Its approved Heatwave
  entry makes Heatwave recently used, so the ranking demotes it and the
  active deck is SoCal Summer; the assertions now check SoCal's canonical
  counts (0/15) alongside XP/level/starter counts.
- The engine's `starter_complete_unlock` rule and dialogue key were left
  untouched — the engine is test-only and not on the live path.
- Seasonal rank coupling (parent's note, Nov 20): the rank-2 seasonal pick is
  `activeSeason?.id` passed as `seasonalDeckId`, which works today because the
  season id IS the deck pack id (`gobble-and-glow`). It is not the `isSeasonal`
  flag — three decks carry that flag, so it cannot identify the active
  season's deck. If a future season's id ever stops matching a deck pack id,
  rank 2 silently no-ops and the ranking falls through to rotation; the fix
  then is a real season→deck mapping, not the flag.
- Verification: tsc clean, build clean, full suite 1033/1035 (only the 2
  known pre-existing failures). Suite total fluctuates by ~12 between runs
  with identical source (1023 once, 1035 twice) — a pre-existing counting
  quirk, not this change.
