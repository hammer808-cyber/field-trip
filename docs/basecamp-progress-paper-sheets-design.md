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

## Verification

tsc clean, full suite back to the 3 known failures, production build,
curl deploy check, read-only browser live check as ELONDRA (Basecamp
card: two distinct paper sheets with tape, trail and ticket each on
their own sheet, tiles unchanged). Zach's phone eyeball is the final
call on whether the separation reads.
