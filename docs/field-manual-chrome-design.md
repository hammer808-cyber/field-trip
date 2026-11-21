# Field Manual chrome — design (Nov 21, 2026)

Zach's brief: make the UI resemble the three Field Manual mockups
(field journal + match scoreboard + active missions / Trevor's log)
more closely. The three progress pieces from those mocks (trail-map
levels, ticket deck meter, hatch grid + DONE stamp) are the Frankie
thread's build, already in flight — this doc covers the four
remaining pieces, built in this chat.

## Ground rules

- No new colour except through a skin token (`registry.ts`) or an
  `@theme` token in `index.css` (P2-1). Classic tokens: primary
  `#FF5C00`, secondary `#CCFF00`, accent `#00B7C7`, text `#111111`,
  surface `#FFFFFF`, surfaceMuted `#F2EEE8`, border `#111111`.
  Kit components read `var(--skin-*)` only.
- Text stays at the 12px floor, muted text at `/60` minimum
  (P2-3/P2-4 guards).
- The same fact is shown once per surface (Nov 20 lesson). This
  decides two designs below.
- Do NOT touch `Profile.tsx`, `Deck.tsx`,
  `src/components/missions/DeckProgressMeter.tsx`, or the Big Board
  token-race section — the Frankie thread owns those and has them
  dirty right now (checked Nov 21, 10:47 AM PST: uncommitted
  changes in all four files).

## Piece 1 — Journal chrome kit

The mocks reuse four pieces on every page; the app has tape and grid
texture in spots but no shared kit.

- `src/components/FieldTicket.tsx` — `FieldTicket({ label, tone })`.
  Perforated-edge ticket label: 2px ink border, dashed inner rule,
  mono uppercase text, slight rotate. Tones: orange (primary),
  lime (secondary), cyan (accent). Used for ACT II, ROUND ACTIVE,
  MISSION LOG, and the deck code chip.
- `src/components/FieldStamp.tsx` — `FieldStamp({ label, tone })`.
  Rotated rubber stamp: double border (outer + inner), mono
  uppercase, transparent middle so the paper shows through. Tones
  as Ticket. Used for DONE, VICTORY, 1ST, and the Trevor stamp.
  (Basecamp's existing `.basecamp-next-stamp` "Do this" stays as is;
  new stamps use the kit.)
- `src/components/FieldHeroTabs.tsx` — `FieldHeroTabs({ tabs,
  activeTab, onTabChange, variant })`. Folder tabs for
  `FieldPageHero`, replacing both of its tab render blocks
  (editorial ~line 177, card ~line 344) with one shared component.
  Active tab is raised, surface background, bold; inactive tabs are
  muted surface; locked tabs keep the lock icon and disabled state.
  Preserves `role="tablist"` / `role="tab"`, `aria-selected`, and
  disabled behavior exactly. The card variant keeps its bigger
  rounded-top shape via the `variant` prop.

## Piece 2 — Scoreboard table (Big Board standings)

Today the standings are a stack of player cards (`BigBoard.tsx`
~1018). The mock is a ruled table. New component
`src/components/BigBoardStandingsTable.tsx`, props `{ players,
currentUserId }`, rendered inside the existing GLOBAL_RANKINGS
section.

- Real `<table>`: columns RANK / SCOUT / LEVEL / STREAKS / SCORE.
  `overflow-x-auto` wrapper so the five columns scroll on phones
  instead of crushing.
- RANK: number; rank 1 gets the kit `FieldStamp` "1ST" (replaces
  the crown icon).
- SCOUT: avatar + name, "(YOU)" tag for the viewer.
- LEVEL: the player's level (`Level N` chip). Deviation from the
  mock, which shows BADGES: no per-player badge count exists in the
  ranking payload, and inventing one would be fake data. Level is
  the real per-player mark.
- STREAKS: the player's `approvalStreakDays` (server-maintained,
  the value behind the new streak chip). Above 0 shows the number
  with a flame; 0 shows "—".
- SCORE: weekly XP (the ranking's existing sort key).
- Leader row: lime fill (`var(--skin-secondary)`, dark text). The
  "me" row keeps its marker; when the leader is the viewer, both
  apply.

Wiring (LAST, after the Frankie thread commits `BigBoard.tsx`):
the `playerRankings` mapping gains `approvalStreakDays` in the
weekly branch (`Number(userProfile?.approvalStreakDays || 0)`, via
the existing `profilesById` lookup) and in the current-user
override; the fallback branch already spreads the profile, so the
field rides along. Then the `playerRankings.map` card block is
replaced by `<BigBoardStandingsTable players={playerRankings}
currentUserId={user?.uid} />`. No change to the ranking sort or
data sources.

## Piece 3 — Trevor's Log card (Basecamp)

The mock's right-hand page: a quote card with a stamp and a taped
polaroid. New component `src/components/basecamp/TrevorsLogCard.tsx`,
placed on Basecamp after the next-action / companion row.

- Header: "TREVOR'S LOG" + the kit stamp with Trevor's avatar
  (the bear in the mock is Trevor; the app's Trevor art is the
  stamp).
- Body: the player's latest approved proof as the log entry —
  taped polaroid (`entry.photoUrl`, captioned with the mission
  title + date) and the proof's field note (`entry.note`) in serif
  italic as the quote.
- Why the proof, not a Trevor line: the current guidance message
  already shows on Basecamp as the next-action description
  (`basecampViewModel.ts:316`, `description: guidance.flavorMessage`),
  so quoting it again on the same page would show one fact twice.
  The proof note is new information on the page.
- Empty state: no approved proof yet → "No entries logged yet —
  your first approved proof lands here." No fake photo, no fake
  quote.
- Data: Basecamp computes the latest approved entry from `entries`
  (status approved, newest by `createdAt`) and resolves the mission
  title with the same helper the Logbook uses.

## Piece 4 — Mission Log card (Basecamp)

Reframe `BasecampMissionSummary` (the right-hand column of the
next-action panel) as the mock's taped journal card:

- Header: kit `FieldTicket` "MISSION LOG".
- SECTOR line: `{deckCode} // {deckName}` (e.g. `FT-09 //
  Urban Recon`).
- Body: the mission's own description (`mission.description`)
  when a mission exists — today the card shows the deck subtitle
  instead, so this is new information, not a repeat. When no
  mission exists, the deck subtitle stays.
- Dedupe (Nov 8 rule, enforced by construction): the panel passes its
  own description as `panelDescription`; when the mission's
  description is the same sentence, the card falls back to the deck
  subtitle, so the panel never prints one fact twice. In production
  the flavor line is a short tagline (e.g. 'FIELD SIGNAL ACTIVE'),
  never the mission text — the fallback covers fixtures and any
  future guidance change that makes them collide.
- The guidance flavor message is NOT repeated here: it already
  shows as the panel's description on the left.
- Layout, art, and XP chip stay as they are.

## Verification

- Unit: kit renders (Ticket/Stamp/TabStrip shapes, tones, locked
  tabs), table renders (leader row lime, 1ST stamp, streaks values,
  table semantics), log card renders (photo + note + caption,
  empty state), mission log renders (ticket, sector, mission
  description).
- Guards: no new hex (P2-1), 12px floor + /60 cap (P2-3/P2-4).
- Live: browser check on Basecamp (both cards) and Big Board
  (table), phone check by Zach for the table scroll on a narrow
  screen.

## Build notes (Nov 21, 2026)

- The card variant's inactive hero tabs were a hard-coded hex;
  they now use `var(--skin-surface-muted)`, and the lock emoji is
  the Lock icon in both variants.
- The level-4 Big Board border reward keeps a visible effect on
  the table: an orange ring on that player's avatar.
- `approvalStreakDays` is read off the profile with the same
  `(profile as any)` cast `canonicalProgress.ts` uses — the shared
  `UserProfile` type does not declare the server-maintained field
  yet.
- `TrevorAvatar` is now exported from `TrevorGuideView.tsx` so the
  log card can stamp with it; the component itself is unchanged.

## Open items (Zach's calls)

- BADGES → LEVEL column swap (no per-player badge count exists).
- Trevor's Log shows the latest approved proof, not a Trevor line
  (the line already shows on Basecamp).

## Round 2 — Dex folder finish + stamps / pen-marks layer (Nov 21, 2026)

### Piece 5 — Dex as file folders

Round 1 did the tab strip; the strip floated — the hero's bottom
border plus the body's 20px top padding left a gap between the tabs
and the content panel, so nothing read as a folder. Now the Dex hero
passes `flushTabs` (new `FieldPageHero` prop, editorial only,
default off — every other page keeps its border) and the body uses
`.ft-dept-body--folder-tabs` (`padding-top: 0`, in
`departments.css`). The content panel is the folder body
(`data-testid="dex-folder-body"`): the active tab's bottom edge
meets the panel's top border directly. The active tab stays lime —
a coloured tab on a manila folder, not a same-paper tab. No back
panel peeking above the body was added: it would have covered the
bottom of the (interactive) tab strip.

### Piece 6 — FieldDoodles (`src/components/FieldDoodles.tsx`)

Shared decorative layer: FieldStamps + hand-drawn pen marks
(SVG only, no words), mounted on Basecamp, Dex, Profile, and Big
Board. Deterministic placement: positions/rotations come from a
tiny FNV-1a hash of the page key, never a random call at render.
Pen marks are graphical only — a hand-drawn circle around the
first stamp, a squiggle underline beneath the second, a checkmark
and an arrow in the margins pointing at the content column. They
circle/underline real content; they never invent words. No
handwriting font is used: with no words to set, the marks are pure
SVG paths; Kalam / Permanent Marker stay in the font stack for
future use.

Placement rule (no overlap with controls, by construction): the
layer is `hidden lg:block`, absolute over the page, `aria-hidden`
+ `pointer-events-none`, and holds only two clusters. (1) The stamp
cluster sits in the top-right corner (`right-3 top-3`): on all
four pages the hero's top-right holds only the faint background
icon (title left, back button left/in-flow, info card anchored to
the hero's bottom edge). (2) The margin pen marks sit in the empty
side gutters at mid-page (`hidden 2xl:block`): at 2xl every
mounting page has a centred content column, so the gutters are
>= 128px of empty paper and a ~24px mark cannot reach the content.
There are deliberately NO bottom-corner elements: no mounting page
guarantees empty bottom padding, so a bottom stamp could land on a
real button.

Stamps are passed in by the mounting page and must be true there:
Basecamp `MISSION LOG` + `TREVOR'S LOG` (both cards render on the
page); Dex `COLLECTED` (always >= 1 — the classic skin is unlocked
by default) + `FILED` (the folder's own stamp); Profile `SCOUT` +
`LEVEL n` (the real level, also in the info card — the kit's
stamp-duplicates-plain-text pattern, as with 1ST); Big Board
`RANKED` only when the board has anyone to rank, `1ST` only when
the viewer is actually rank 1. Big Board mounts the `chrome`
variant: dark hero, so pen strokes use `--skin-surface` and both
stamps stay primary orange (dark-ink text would vanish on dark
paper).

Mounting notes: the three shell pages pass `relative` through
`PlayerPageShell`'s `className` (per-page, no shared change);
Basecamp's root div gets `relative` the same way. Checked before
adding it: the four pages' own absolutely-positioned elements all
sit inside `relative` parents (Profile's avatar badge and stat
icons, Big Board's cards; Basecamp has none in its own source;
Dex's live inside its `relative` main), so nothing re-anchors —
except Big Board's `HibiscusDecor`, which is dead code (defined,
never rendered).

### Verification

- Unit: `src/__tests__/fieldManualChromeRound2.test.tsx` (16
  tests) — folder pins, seed/placement determinism and bounds, no
  random call, no hex (P2-1), layer aria-hidden + pointer-events-
  none + `hidden lg:block`, stamps reuse the kit, pen marks are
  four SVGs and the layer's only text is the stamp labels, margin
  marks gated to 2xl, chrome variant uses the surface token, all
  four mounts with their true labels.
- Live: browser + phone eyeball still owed — the layer is
  `hidden` below lg, so phones see no doodles by design; the
  desktop corner cluster and the Dex folder attach need eyes on.

