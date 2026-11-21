# Basecamp progress: trail map + stapled ticket meter

Zach, Nov 21, 2026, 11:20 AM PST (phone screenshot + the Field Manual
progress-bars mock): the Basecamp "Your Progress" box is boring. The circle
and the plain progress bar have to go. He wants mock Option 4 (the trail
map path) and Option 5 (the stapled ticket meter) to exist in that little
box on Basecamp. The two stat tiles (Starter Signals, Active deck) and the
"Open Profile Progress" button were not named, so they stay.

## What changes

`src/components/basecamp/BasecampProgressPanel.tsx` only. The header
("How you're doing" / "Your Progress" / "Level 2 · Amateur Loiterer") is
unchanged. The middle grid goes from dial + level row + plain track to:

1. **Trail map (Option 4), full width, replacing the circle.** A compact
   single-row trail: one node per authored level (15), on a dashed line.
   States come from the same `buildLevelTrail(xp)` the Profile trail map
   uses, so the numbers agree everywhere: passed nodes are lime-filled
   dots, the current node is a larger circle carrying the player's marker
   sticker with a "YOU ARE HERE" tag, the next node is a dashed outline
   with its level number, locked nodes are small paper dots. Footer line:
   "Next stop: {next title} · {xpToNext} XP to go" plus a
   "{xp} / {nextMinXp} XP" chip, the same footer the Profile trail uses.
   A small label above the trail reads "Level trail · Stage {level} of
   15" (the mock's "STAGE 04 / 08" shape). At level 15 the trail is done:
   every node stamped lime and a DONE stamp at the end.
2. **Level row, kept.** "Level {level}" / title / "{xp} XP", exactly as
   it is today.
3. **Stapled ticket meter (Option 5), replacing the plain track.** One
   long ticket: 2px ink border, side notches cut with the same mask
   technique DeckProgressMeter uses for stubs, a dashed perforation line
   near the right end, a hatched lime fill (crosshatch in skin tokens)
   up to the level-progress percent, and a small orange marker triangle
   at the fill edge. Label: "{percent}% COMPLETED" with the caption
   "{xpToNext} XP TO LEVEL {next}". At 100% a rotated DONE stamp sits
   on the ticket instead of a colour shift (the mock's rule).

No information is lost: the dial's percent now lives on the ticket
("18% COMPLETED" for Zach at 314 XP), the XP counts live in the level
row and the trail footer, and the "286 XP to level 3" line is the
ticket caption.

## Decisions

- **All 15 levels in one row, not a window.** Zach's words were "level
  one level two and then that circle progress": the trail shows the
  whole journey with the marker at his current spot. Nodes sit at
  4% + (i/14) * 92% so the end nodes never clip the card edge. The
  "YOU ARE HERE" tag clamps to the card edge when the current node is
  near either end (level 1 or 15).
- **Reuse, don't rebuild.** The trail reads `buildLevelTrail` from
  `src/logic/levelTrail.ts` (the Frankie thread's Profile trail logic);
  the ticket's side notches reuse DeckProgressMeter's mask technique.
  Nothing in `LevelTrailMap.tsx`, `DeckProgressMeter.tsx`, or Profile
  is touched. The full winding Profile trail stays where it is; the
  Basecamp version is a compact horizontal sibling, not a second copy
  of the same component.
- **Marker sticker threaded through.** The panel gains an optional
  `markerStickerId` prop; Basecamp.tsx passes
  `profile?.preferences?.selectedMarkerStickerId` (the same value
  Profile passes to LevelTrailMap). No marker set means the default
  scout footprint. The model itself is untouched.
- **Dead CSS goes.** `.basecamp-progress-dial` and
  `.basecamp-progress-track` (plus the mobile dial rule) are removed
  from `src/pages/Basecamp.css` once the markup is gone. The shared
  `.basecamp-progress` panel rule is untouched.
- **Guards.** Skin tokens only, no hard-coded hex anywhere (including
  comments). New text is text-xs minimum; the hatch uses
  `repeating-linear-gradient` with skin vars, the marker triangle is
  an SVG polygon in `var(--skin-primary)`. Both new visuals keep
  `role="progressbar"` with `aria-valuenow`, the same accessibility
  the dial and track had.

## Verification

- New `src/__tests__/basecampProgressTrailTicket.test.tsx`: trail renders
  15 nodes with passed/current/next/locked states and the next-stop
  footer; ticket meter fill width and DONE stamp at 100%; panel wiring
  (no dial, no track, trail + ticket present, tiles and CTA unchanged).
- Existing `basecampPresentation.test.tsx` keeps passing unchanged:
  its fixture (700 XP, level 3, 20%) still renders "700 XP", "3/3",
  "1 pending", and the CSS pins on the shared panel rule still hold.
- tsc clean, full suite back to the 3 known failures, production
  build, curl deploy check, read-only browser live check as ELONDRA
  (Basecamp card: trail with the marker on level 2, ticket at 18%).

## Fix (Nov 21, 2026, commit fc57ff9)

The first live check caught a real layout defect: the Next stop footer
was overlapped by the trail-node row. Cause: the trail container held
only absolutely positioned nodes, so it collapsed to its 28px top
padding and the nodes (top 28px, 32px tall) ran through the footer
underneath. Fix: the container now has an explicit 60px height (28px
tag zone + 32px node row), so the footer starts below the nodes. A
regression test pins the fixed height. The fix was verified live the
same way (curl chunk size, then a browser re-check of the trail and
footer only).
