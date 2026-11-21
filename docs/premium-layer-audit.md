# Premium layer audit — streaks, quiz art, print card (Nov 21, 2026)

Zach's brief: "Streaks, quiz art & a print card. Premium layer."
These are three named items from the Nov 19 product-design audit,
Phase 5 (P3 premium/marketing): P3-8 streaks, P3-5 quiz art, P3-9
print card. This doc records what exists today for each, and the spec
for building all three.

## One framing note

There is no premium tier, paywall, pricing, or subscription anywhere
in the app (audit §7 confirmed: no pricing/paywall/subscription copy
in `Welcome.tsx` or `Auth/*`). "Premium layer" here means
premium-feel features inside the free invite-only beta, not a paid
tier. A paywall is a separate decision and is NOT part of this build.

## 1. Streaks (P3-8)

### What exists

Two different streaks live in logic. Neither is displayed anywhere
in the UI (no streak render in any component or page).

**A. Daily approval streak — `approvalStreakDays`.**
Consecutive UTC calendar days each with at least one approved
mission. Maintained server-side on the profile at approve time
(`src/services/canonicalProgress.ts:83-89, 297-299`,
`src/server/stickerEvaluate.ts`). This is the streak behind the
On a Roll sticker (fires at 5 days, `stickerAwardCore.ts`). This is
the natural player-facing "daily streak": miss a day, it resets.

**B. Weekly pulse streak — `fieldPulse.pulseStreak`.**
Weekly cadence, maintained in `AppContext.tsx:1348-1373, 1816-1836`
with grace tokens. Drives the `proud-pulsator` decal
(`decalShelf.test.ts:30-46`). A weekly check-in streak, not a daily
play streak.

**Streak save / streak shield: copy only.** `weeklyBonuses.ts:39`
("+1 streak save this week") and `:127` ("streak shield" for 6-8 PM
approvals) exist as bonus copy only. No `streakSave` / `streakShield`
field, grant, or consumption logic exists anywhere in `src`. They do
nothing today. Making them real is extra scope, not part of this
build unless Zach asks.

### Spec (proposed)

- Surface streak A, the daily approval streak. Streak B stays
  as-is (decal only); surfacing both would read as two competing
  streaks.
- Display: a streak chip on Basecamp (next to the season countdown,
  the return-hook home) and on the Profile, showing the count and
  the flame state. Zero / no streak shows as "Start your streak"
  rather than a bare 0, so a new player is invited, not shamed.
- Source of truth stays `approvalStreakDays` on the profile; the
  chip reads it from `canonicalProgress` (already exposed). No new
  server field, no new write path, no rules change.
- Streak saves/shields stay copy-only. If Zach wants them real,
  that is a follow-up: a grant on the weekly bonus, a consume on a
  missed day, and a server-side check at approve time.

### Verification

- Unit: chip renders the profile value; 0 renders the invite copy.
- Live: Zach's own streak (whatever his current
  `approvalStreakDays` is) shows the same number on Basecamp and
  Profile; a fresh test profile shows the invite copy.

## 2. Quiz art (P3-5)

### What exists

The quiz sells the personas with stock photos and only reveals the
real art after classification (audit §7.4).

- Quiz data: `src/data/personaQuiz.ts` `PERSONAS` — all six
  personas carry an Unsplash image (lines 12, 22, 32, 42, 52, 62),
  e.g. a crowd photo for Mascota. Rendered by
  `src/components/onboarding/PersonaQuiz.tsx` and `FieldTypeCard.tsx`.
- Result screen: already wired to the real art
  (`src/constants/fieldTypes.ts:66-205`) — each of the six personas
  has `avatar.png`, `card.jpg`, `full.jpg`, `results.jpg` under
  `public/assets/characters/<persona>/`.
- Unclassified has no art of its own: all five image fields in
  `fieldTypes.ts:228-232` point at one shared Unsplash URL
  (`photo-1513475382585`), and the quiz entry in `personaQuiz.ts`
  uses a DiceBear pixel-art avatar. `FieldTypeResult.tsx:250-258`
  falls back to a big initial letter + "Portrait incoming" when the
  image fails.
- Out of scope: P2-14 image pipeline (the 56 MB characters folder
  → <10 MB, WebP + srcSet). The quiz swap uses the files as they
  are; the pipeline is a separate batch.

### Spec (proposed)

- Swap the six `PERSONAS` images in `personaQuiz.ts` to the local
  character art (each persona's `results.jpg`, the same image the
  result screen already shows, so the quiz and the result agree).
- Give Unclassified its own art: generate one new character image
  in the same style as the set, save it under
  `public/assets/characters/unclassified/` (results/card/avatar/full
  from the one generation, cropped as needed), and wire it into all
  five fields in `fieldTypes.ts` plus the quiz entry in
  `personaQuiz.ts`, replacing both the Unsplash URL and the DiceBear
  avatar.
- No registry, rules, or quiz-logic change: same six questions,
  same 3/1 weights, same classification.

### Verification

- Unit: no `images.unsplash.com` reference remains in
  `personaQuiz.ts` or the Unclassified entry in `fieldTypes.ts`;
  every persona image path resolves to a file in
  `public/assets/characters/`.
- Live: screenshot the quiz (each persona answer shows the real
  art) and the Unclassified result screen (real art, no "Portrait
  incoming", no DiceBear pixel avatar).

## 3. Print card (P3-9)

### What exists

`src/components/MissionResultCard.tsx:350` — a disabled button,
"Print card (coming soon)", with "Printing isn't available yet."
below it. The audit's call was: build it or remove the label.

The card renders only in `src/pages/Capture.tsx:1806` (the
post-submit result). It does NOT render inside the frozen
`Deck.tsx`, so this work does not touch the frozen Missions page
and needs no freeze lift.

Everything a keepsake card needs is already in the component's
props: the mission (`trip` — title, deck), the evidence photo +
field note, the score (`scoring.totalPoints`, `ftBonus`, total XP),
the review status, new rewards (stickers/badges), and total tokens.

### Spec (proposed)

- Enable the button: "Print card". Tap → `window.print()` with a
  `@media print` stylesheet that prints a keepsake card only —
  the evidence photo, mission title, deck, date, persona, XP,
  and any sticker earned — and hides the rest of the page (nav,
  buttons, background).
- One layout, paper-sized, black-on-paper friendly (no dark
  background flood). No PDF download and no image export in v1;
  the system print dialog covers Save as PDF on desktop.
- Mobile note: `window.print()` on iOS/Android goes through the
  system share/print sheet, which works but is clunkier than
  desktop. If Zach wants a tap-to-download image instead, that is
  P3-1 (shareable cards) territory and a separate build.
- The "coming soon" label and "Printing isn't available yet." copy
  are removed with the build.

### Verification

- Unit: button is enabled and calls print; print stylesheet hides
  non-card chrome (readFileSync + assert on the CSS / component).
- Live: print preview on desktop shows the keepsake card only;
  phone check (his) confirms the share/print sheet opens.

## Build order

1. Quiz art (lowest risk: data-only swap + one generated image).
2. Print card (one component + print CSS, isolated to Capture).
3. Streaks (one chip in two places, read-only on existing data).

Each ships behind its own tests; deploy verification by curl + a
browser live check per item, same discipline as the Urban Recon
build. No Firestore rules change in any of the three.

## Build notes (Nov 21, 2026) — BUILT

- **Quiz art:** all six `PERSONAS` images in `personaQuiz.ts`
  swapped to the local `results.jpg` art; Unclassified art generated
  (new character, clipboard with "?", HQ-station background, in the
  set's style) as `public/assets/characters/unclassified/` (avatar,
  card, full, results) and wired into all five `fieldTypes.ts`
  fields + the quiz entry. Deviation from the spec as written: the
  quiz questions carry no image slots (answers are text buttons,
  and `PERSONAS[].image` was never rendered anywhere), so the swap
  alone would have been invisible — each answer button now also
  shows its primary (weight-3) persona's avatar via a new pure
  helper `primaryPersonaForAnswer` in `personaQuiz.ts`. Tests:
  `src/__tests__/quizArt.test.ts` (5 tests).
- **Print card:** button enabled (`window.print()`), "coming soon"
  copy removed; print-only keepsake (photo, mission title, deck +
  mission id, persona, date, XP, sticker earned) with
  `@media print` in `index.css` showing only the keepsake.
  Tests: `src/__tests__/printCard.test.ts` (3 tests).
- **Streaks:** new `src/components/StreakChip.tsx` reading
  `canonicalProgress.approvalStreakDays`; chip on Basecamp (under
  the hero, by the season countdown) and in the Profile progress
  card. Zero renders "Start your streak", never a bare 0. Tests:
  `src/__tests__/streakChip.test.tsx` (3 tests).
- **Guard fixes caught by the suite:** the first full run failed
  P2-1 (`#fff` in the print CSS — changed to the `white` keyword)
  and P2-4 (`text-on-surface/40` on the idle flame — raised to
  `/60`). Final suite: only the 3 known failures.
- **Still open / phone checks:** quiz avatars on real answers,
  Unclassified result screen, print preview on desktop + the
  share/print sheet on his phone, streak chip showing his real
  `approvalStreakDays` on Basecamp and Profile. No rules change in
  any of the three.

## Open decisions (Zach's calls)

1. Streaks: daily approval streak as specced, or the weekly pulse
   streak too? Saves/shields real, or stay copy-only?
2. Quiz art: generate Unclassified art (as specced), or pick an
   existing image for it instead?
3. Print card: print-dialog keepsake as specced, or a downloadable
   image card instead?
4. "Premium layer" as a free-beta label, or is a paywall on the
   table at all?
