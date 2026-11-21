# Audit + design: Saved-missions list

Status: BUILT — Option A shipped Nov 20, 2026 (Zach picked A, "surface what exists").
Date: Nov 20, 2026.

## The one-line finding

A saved-missions list already exists in the code, and it is unreachable.
The Dex has a `missions` tab (`src/pages/Collection.tsx:285`) with an empty
state titled "No saved missions" — but there is no tab button for it, no
`/dex/missions` route, and nothing in the app links to it. The only way in
is typing `?tab=missions` by hand.

## What exists today

### 1. Saving already writes to Firestore

Two "Save for later" buttons both call
`updateMissionCardStatus(missionId, 'saved_for_later', { isActive: false })`:

- `src/pages/Deck.tsx:1333` — on the drawn card (the Missions page).
- `src/pages/MissionBriefing.tsx:41` — on the briefing, reached from a drawn card.

The write lands in `users/{uid}/drawnMissionCards/{missionId}` with
`status: 'saved_for_later'`. The status is a real enum value
(`src/types/game.ts:281`). The doc carries `missionId`, `deckId`,
`missionTitle`, `missionSummary`, `drawnAt`, `updatedAt` — everything a
list row needs, without a catalog lookup.

### 2. The list that renders them is the Dex Missions tab

`src/pages/Collection.tsx:285-360` renders `drawnMissionCards` from
`AppContext` (live subscription, `orderBy('drawnAt', 'desc')`, no limit).
Each row shows the mission card, a status chip, and a CTA: "Do This
Mission" for `drawn` / `saved_for_later`, "Resume Mission" for `active`,
"View Logbook" for `approved`.

### 3. The recovery path today is the Missions page, not the Dex

`src/logic/playerGuidance.ts:298` treats `saved_for_later` as `drawn`, so
a saved card surfaces on `/missions` as a poster with a "Do This Mission"
button. The recovery notice says exactly that: "Tap Do This Mission on
Missions when you are ready"
(`src/components/bottomNavPresentation.ts:86-89`).

## Gaps (audit)

1. **Unreachable.** The Dex hero tabs are Decks / Stickers / Zines /
   Memories only (`Collection.tsx:212-219`). `handleTabChange` has a path
   map for those four and none for `missions` or `crew_memories`. Routes
   in `src/App.tsx:616-622` cover `/dex`, `/dex/decks`, `/dex/stickers`,
   `/dex/zines`, `/dex/memories` — no `/dex/missions`. Zero links anywhere
   point at the tab. A player can save missions all day and never find
   where they went.
2. **Not a saved-only list.** The subscription has no status filter, so
   the tab mixes saved, in-progress, pending, approved, and rejected
   cards. It is a drawn-card history wearing a "No saved missions"
   empty state. The empty state only matches when nothing was ever drawn.
3. **No way to unsave.** There is no remove control anywhere. The only
   exits are starting the mission (status goes `active`) or an admin
   delete — rules allow delete only for admins (`firestore.rules:590`).
   Saved cards accumulate with no way to discard one.
4. **You can only save what you drew.** Save for later exists only on
   the drawn card and its briefing. The face-up browse ("See all cards")
   and the deck shelf have no save action, so a mission you merely
   spotted cannot be saved without drawing it first.
5. **Silent vanish.** A row looks the mission up in the deck catalog
   (`trips.find(t => t.id === card.missionId)`) and renders nothing when
   the mission is gone from the catalog. The doc still holds
   `missionTitle` / `missionSummary`, so the row could render from the
   doc instead.
6. **Dead import.** `src/components/DeckLibrary.tsx:10` imports
   `Bookmark` and never uses it. Cosmetic; clean it up with whichever
   option lands.

## What needs no work

- **Rules: nothing.** `drawnMissionCards` already allows owner read, and
  owner create/update when the doc has `uid`, `missionId`, `status`,
  `drawnAt` with a status in the enum. A reader UI and an unsave that
  flips a flag both pass the published rules. No rules publish is owed
  for options A or B.
- **Data model: nothing.** The doc already carries the row fields.
- **Freeze:** the Dex (`Collection.tsx`) is NOT frozen — P1-8 touched it
  Nov 20. The Missions page (`Deck.tsx`) IS frozen since Nov 18 with
  one-off lifts per fix, so anything that adds a save button to the
  deck, the browse view, or the briefing needs a lift for that change.
  `MissionBriefing.tsx` is part of the same draw flow; treat it as
  freeze-adjacent.

## Unsave mechanism (verified, no rules change)

The subscription already filters out `archived === true` cards
(`missionCardService.ts:86`), and `archived` is the established soft-hide
flag elsewhere in the codebase. Setting `archived: true` on a drawn card
via `updateDoc` passes the update rule (the resulting doc still has its
required keys and a valid status), and the subscription drops the row
immediately. No new status value, no rules publish, reversible by an
admin clearing the flag.

## Options

### A — Surface what exists (smallest)

- Add "Saved" to the Dex hero tabs, add the `/dex/missions` route and
  the `handleTabChange` path mapping.
- Filter the tab to `status === 'saved_for_later'` only. Done missions
  leave the list automatically when their status becomes `approved`
  (the Logbook already covers done ones).
- Add an unsave control per row (sets `archived: true`).
- Render rows from the doc's own `missionTitle` / `missionSummary`
  instead of dropping rows whose mission left the catalog.
- Remove the dead `Bookmark` import in `DeckLibrary.tsx`.

Touches: `Collection.tsx`, `App.tsx` (one route), nothing frozen, no
rules change. Does NOT let you save a mission you have not drawn.

### B — Real save-anywhere (medium)

Everything in A, plus a save action on the face-up browse cards and the
deck shelf, so a spotted mission can be saved without drawing it. A save
there writes a `drawnMissionCards` doc with `status: 'saved_for_later'`
and `drawnAt` set at save time (the create rule requires `drawnAt`;
there is no `savedAt` field — the timestamp would mean "saved at", which
is worth one line in the doc or a `savedAt` key on the doc, extra keys
are allowed). Starting a saved mission from the briefing works as today
(`setActiveMissionCard`).

Touches: A plus `Deck.tsx` (frozen — needs a lift) for the browse/shelf
save buttons. No rules change.

### C — A new home (bigger, only if the Dex is the wrong place)

Put the list on Basecamp (next-action panel area) or as a Profile tab
instead of, or in addition to, the Dex tab. More visible than the Dex,
but Basecamp is slim by design and Profile already has five tabs. Only
pick this if "come back to" should be visible without opening the Dex.

## Decisions for Zach

1. A, B, or C?
2. Saved-only list, or keep the mixed history (saved + in-progress +
   done) and just make it reachable?
3. Unsave: the `archived` flag (reversible, no rules change), or is
   there a behavior you want instead (e.g. a saved mission that is
   started stays saved until approved)?
4. If B: is a save button on the browse/shelf worth a Missions-page
   freeze lift, or should saving stay draw-only?

## Tests

- Dex missions tab renders only `saved_for_later` cards (A/B), with the
  empty state when there are none.
- Unsave removes the row and the card stays gone on reload (archived
  filter).
- Route `/dex/missions` loads the tab with the tab highlighted.
- No regression: Save for later on Deck + briefing still writes
  `saved_for_later`; starting a saved mission still goes `active`.
- (B) Saving from browse writes a `saved_for_later` doc that appears in
  the list without drawing.
