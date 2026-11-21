# Basecamp progress: paper sheets for separation

Zach, Nov 21, 2026, 11:54 AM PST (phone screenshot of the finished
trail + ticket card): the direction is right, but the card needs more
polish. Everything blends together — the trail, the level row, and the
ticket all sit directly on the same grid paper with nothing separating
them, so each component reads at the same weight and the card is hard
to follow. His fix, in his words: put each component on a piece of
paper, a sticky note, something, so they stop blending.

## What changes

`src/components/basecamp/BasecampProgressPanel.tsx` only, plus one CSS
rule. Each blended block gets its own paper sheet:

1. **Trail sheet:** the trail map (label, nodes, footer) moves onto a
   sheet, with a tape strip on its top edge.
2. **Ticket sheet:** the level row (Level 2 / Amateur Loiterer /
   314 XP) plus the ticket meter moves onto a second sheet, with its
   own tape strip on the opposite side, so the two sheets do not look
   stamped out identically.

The two stat tiles (Starter Signals, Active deck) already have their
own boxes (`basecamp-progress-stat`), so they are left alone. Header
and the Open Profile Progress button are unchanged.

## The sheet

New `.skin-basecamp .basecamp-sheet` rule in `src/pages/Basecamp.css`:
plain paper (`var(--skin-surface)`, no grid) so it reads against the
card's grid paper, 2px ink border, card radius, hard offset shadow
(`3px 3px 0 var(--skin-border)`), 16px padding, `position: relative`
so the tape can pin to it. Tape reuses the existing `.basecamp-tape`
class (trail sheet `--left`, ticket sheet `--right`, the way real
pinned notes alternate). The section's 24px gaps swallow the tape's
13px overhang.

Nothing inside the sheets changes: same trail, same ticket, same
numbers. This is separation only, no content or layout surgery.

## Guards

Skin tokens only, no hard-coded hex. The sheet rule is vars-only.
Tests: the panel renders exactly two `basecamp-sheet` sections (trail
sheet, ticket sheet), each with a tape strip; the CSS pin checks the
sheet rule carries the surface, border, and shadow tokens.

## Sticky-note variant (Nov 21, 2026, Zach's pick)

Zach picked the sticky note over notebook and construction paper.

- **Colour:** amber `var(--color-heat-yellow)` (`#FFB300`, a `:root`
  token, so the note stays amber on every skin — real stickies do not
  change colour with the board). `--color-paper` was NOT used: it is
  skin-dependent (cream by default, yellow only on Heatwave), so it
  would be invisible as a note on most skins.
- **No ink border** on the sticky variant: colour, shadow, and the
  curl carry the sheet, the way a real note has no printed border.
- **Soft lift shadow** instead of the hard offset shadow
  (`0 1px 2px` + `3px 6px 12px`, ink at low opacity via color-mix).
- **Slight tilt:** trail sheet -1deg, ticket sheet +1deg. The tape
  strips rotate with their sheets. Corners move ~3px, inside the
  24px section gaps.
- **Curled corner:** a `::after` triangle at the bottom-right, a
  darker shade of the note colour (ink mixed into the yellow), 26px.
- **Content untouched:** the lime fills stay. On amber the lime
  separates by hue, and every lime element already carries a 2px ink
  border, so the nodes, the ticket hatch, and the YOU ARE HERE tag
  keep their definition. The browser live check is the judge of
  whether the lime-on-amber reads clean.

## Verification

tsc clean, full suite back to the 3 known failures, production build,
curl deploy check (Basecamp JS chunk + Basecamp CSS byte-identical to
local), read-only browser live check as ELONDRA (sheets read as
sticky notes, lime content legible on amber, curl visible).
