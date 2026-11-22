# Frankie quiet mode (Option B) — design

Zach's call, Nov 21, 2026: the Simple Words (Frankie) toggle should not
only fix the language, it should also reduce the amount of words on the
page, to cut clutter and visual stimulation.

## What the toggle does today (audit)

Frankie Mode ("Simple Words", `frankieMode` in ThemeContext, persisted in
`userPrefs`) is a 1:1 word swap plus calm styling:

- Plain titles/descriptions/directions from `PLAIN_CARD_COPY`
  (155 entries; rules: title ~4 words, description one sentence,
  directions 3 short steps) via `src/logic/frankieModeLogic.ts`, plus
  `fc(normal, frankie)` label swaps and plain difficulty/time/evidence
  labels. The page shows the same number of words, just easier ones.
- Calm: `.frankie-active` in `src/index.css` (white paper ground, no
  all-caps, display/serif fonts forced to sans, huge text capped) plus
  `MotionConfig reducedMotion="always"`.
- A few existing hides: PersonaQuiz drops extra headline bits, DeckLibrary
  swaps a couple of lines.

What it does NOT do: hide anything. Every panel, hint, subline, caption,
XP breakdown, and helper paragraph still renders.

## The fix (two halves)

### 1. FrankieQuiet — hide secondary text on the mission flow

New `src/components/FrankieQuiet.tsx`: renders its children only when
Frankie mode is OFF. Prop-based (`frankieMode: boolean`) so it is
trivially testable with `renderToStaticMarkup` and needs no provider;
every call site already has `frankieMode` in scope from `useTheme()`.

Rule for what hides: secondary text. Keep the title, the one-line
instruction, the steps, and the buttons. Hide helper lines, flavor,
meta, and breakdowns. Per surface:

- **MissionBriefing.tsx** (adds `useTheme()`; it has no Frankie wiring
  today): hide the "The Objective" box (the flavor description — the
  card already shows the plain one), the Lane/Reward tiles (the card
  shows the XP), the "Mission briefing" eyebrow and the "Field Ready"
  chip. Keep "Your mission", the card, the resolved-place line, and the
  three buttons. Hide the save-for-later hint line, keep its heading
  and button.
- **ChallengeCard.tsx** (the card itself): hide the "WHY IT'S FUN" box
  (pure flavor) and the "GAME DETAILS BOX" (WHERE IT GOES / Crew Feed
  meta). Keep title, deck line, WHAT TO HUNT (plain description),
  evidence labels, XP. Keep the locked-door line (functional gate).
- **FieldClipboard.tsx** (Capture submit): hide the helper sentences
  under the Find it / Snap it / Say why step titles (keep the titles)
  and the "Receipt Checklist" subline ("Three things to finish this
  mission."); hide the whole "Trevor's Take" block (optional advice);
  hide the applied-bonus description (keep its label); hide "Setting
  up this mission before the camera opens." (the button already says
  "Getting ready…"); hide "Tap one, or write your own. You can also
  skip." and the share-toggle helper ("Your photo can appear in the
  weekly vote."). Keep the "What to do" prompt, the hint button, the
  share toggle label + switch, the submit button, and error text.
- **MissionResultCard.tsx** (after submit): hide the MATH WIZARD
  BREAKDOWN receipt (the header already shows the big +XP total); hide
  the Evidence verification chips (meta labels — "Text Synthesis"
  etc.); hide the footer "PROOF_SENT" heading + "Waiting for approval"
  subline (the header already says it); hide "Prints just this card."
  and the TX REF / Total Field Tokens lines. Keep the title, the +XP,
  the photo, the field-note scrap, the status line, the rewards
  section, the primary button, and "Estimate — final at review".
- **DeckLibrary.tsx** (Missions archive): hide the Beta micro-label
  line entirely in Frankie mode. Keep filters, sort, and cards.
- **Deck.tsx / MissionDecodedCard.tsx / EntryCard.tsx** (catalogued at
  build time): Deck hides the hero subtitle and the three starter-state
  helper sentences (Rejected / More proof needed / Pending Review —
  headings + buttons carry the meaning); MissionDecodedCard hides the
  deck-subtitle line under the title; EntryCard hides the classified-XP
  teaser ("X XP remains classified"). No structural changes anywhere.

### 2. Collapsed, quieter Basecamp

In Frankie mode Basecamp renders only: the hero (subtitle hidden; the
season line is suppressed by the hero via a `hideSeasonLine` prop —
Basecamp keeps passing the literal
`seasonLine={headerSeasonLine ?? undefined}` prop so the Nov 21
one-fact-once test pin still holds, and the hero takes a prop instead
of reading useTheme because it renders bare in tests without a
provider), the streak chip (one line), the
next-action panel, and a single "More" button. Everything else — companion block, Trevor's Log,
active-deck row, attention panel, notifications, progress panel, crew
summary, quick links — sits behind "More". Tapping it reveals the full
normal Basecamp in the same order; tapping again ("Less") collapses.
State is local (`useState`, default collapsed); no data or ordering
changes, only rendering branches. The Mission Log card rides inside the
next-action panel, so it stays visible. The admin-only console button
is untouched.

## Freeze lifts

- The Missions render tree (Deck.tsx, MissionBriefing.tsx,
  DeckLibrary.tsx, DeckStack, MissionDecodedCard) is frozen with lifts
  only. This build is a Frankie-mode lift in the same spirit as the
  Nov 20 slim-row lift (the Simple Words switch itself). Recorded here
  and in the commit message.
- The type-scale freeze (`typeScaleMutedFonts.test.ts`) pins specific
  strings, not a ban on edits: Deck.tsx keeps the starter-complete
  'unlocked' line class and no old orange HEATWAVE line; FieldClipboard
  keeps the note-length color ternary and no `font-mono text-xs
  opacity-30`. Wrapping blocks in `<FrankieQuiet>` touches none of
  those. The suite confirms.

## Tests

- New `src/__tests__/frankieQuiet.test.ts`: `FrankieQuiet` renders
  children when off, renders nothing when on; plain-copy word caps
  (every plainDescription one sentence / ≤ 20 words, plainDirections ≤
  3 lines) so the short side stays short.
- Extended `src/__tests__/frankieMode.test.ts` (or the new file):
  wiring pins per surface (readFileSync + assert.match) — each hide
  listed above is pinned by name, so a later edit cannot silently
  re-show secondary text in Frankie mode.
- Existing pins must keep passing: plain-entry coverage (every card,
  no orphans), plain titles ≤ 6 words, the Missions slim row.

## Verification

- `tsc` clean, full suite exactly the 3 known failures, production build.
- Curl: live entry size matches local.
- Browser live check as ELONDRA: turn Simple Words ON in Settings,
  load Basecamp (collapsed: next action + More), open a briefing and
  the submit flow (secondary text gone), count words on/off to prove
  the reduction, then turn Simple Words back OFF and confirm the full
  pages return. The toggle write is reversible and the check restores
  it; say so plainly in the report.
